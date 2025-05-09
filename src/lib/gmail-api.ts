import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';

// Interface for Gmail message
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  subject: string;
  date: Timestamp;
  hasAttachments: boolean;
}

// Interface for Gmail API message object
interface GmailApiMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: Array<{
      name: string;
      value: string;
    }>;
    parts?: Array<{
      filename?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  [key: string]: any;
}

// Interface for Gmail message list response
interface GmailMessagesListResponse {
  messages?: Array<{
    id: string;
    threadId: string;
  }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

// Interface for full email content
export interface GmailFullMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  date: Timestamp;
  body: {
    html: string | null;
    plain: string | null;
  };
  hasAttachments: boolean;
  attachments: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

// Function to convert date string to Firestore Timestamp
function convertToTimestamp(dateString: string): Timestamp {
  try {
    const date = new Date(dateString);
    return Timestamp.fromDate(date);
  } catch (error) {
    console.error('Error converting date to Timestamp:', error);
    // Return current time as fallback
    return Timestamp.now();
  }
}

// Base64 URL decode function
function base64UrlDecode(str: string): string {
  // Convert Base64URL to Base64
  let input = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Pad with '=' if needed
  const pad = input.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('Invalid base64url string');
    }
    input += new Array(5 - pad).join('=');
  }
  
  // Decode
  try {
    return decodeURIComponent(atob(input).split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''));
  } catch (e) {
    // Fallback for non-UTF-8 content
    return atob(input);
  }
}

// Function to find and extract message parts
function findMessageParts(payload: any): { html: string | null; plain: string | null; attachments: any[] } {
  const parts = payload.parts || [];
  let html: string | null = null;
  let plain: string | null = null;
  const attachments: any[] = [];
  
  // If the message is simple with no parts, check the body directly
  if (!parts.length && payload.body && payload.body.data) {
    if (payload.mimeType === 'text/html') {
      html = base64UrlDecode(payload.body.data);
    } else if (payload.mimeType === 'text/plain') {
      plain = base64UrlDecode(payload.body.data);
    }
    
    if (payload.filename) {
      attachments.push({
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.body.size || 0,
        attachmentId: payload.body.attachmentId
      });
    }
    
    return { html, plain, attachments };
  }
  
  // Function to process message parts recursively
  function processPart(part: any) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      html = base64UrlDecode(part.body.data);
    } else if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      plain = base64UrlDecode(part.body.data);
    } else if (part.mimeType === 'multipart/alternative' || part.mimeType === 'multipart/mixed' || part.mimeType === 'multipart/related') {
      if (part.parts) {
        part.parts.forEach(processPart);
      }
    } else if (part.filename && part.body) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId
      });
    }
  }
  
  // Process all parts
  parts.forEach(processPart);
  
  // If the main payload is a message and has body data but no parts were found
  if (!html && !plain && payload.body && payload.body.data) {
    if (payload.mimeType === 'text/html') {
      html = base64UrlDecode(payload.body.data);
    } else if (payload.mimeType === 'text/plain') {
      plain = base64UrlDecode(payload.body.data);
    }
  }
  
  return { html, plain, attachments };
}

// Function to refresh token if needed
async function refreshTokenIfNeeded(merchantId: string) {
  try {
    console.log('Checking Gmail token for merchant:', merchantId);
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationDoc = await getDoc(integrationRef);
    
    if (!integrationDoc.exists()) {
      console.error('Gmail integration not found for merchant:', merchantId);
      throw new Error('Gmail integration not found');
    }
    
    const integration = integrationDoc.data();
    console.log('Found Gmail integration, connected:', integration.connected);
    
    if (!integration.connected) {
      throw new Error('Gmail integration is not connected');
    }
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    const tokenExpiresIn = integration.expires_at - currentTime;
    console.log(`Token expires in ${tokenExpiresIn} seconds`);
    
    if (integration.expires_at <= currentTime) {
      console.log('Token is expired, refreshing...');
      // Token is expired, need to refresh
      const response = await fetch('/api/auth/gmail/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId,
          refresh_token: integration.refresh_token
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to refresh token:', response.status, errorText);
        throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
      }
      
      const refreshedData = await response.json();
      console.log('Token refreshed successfully');
      return refreshedData.access_token;
    }
    
    console.log('Using existing access token');
    return integration.access_token;
  } catch (error) {
    console.error('Error in refreshTokenIfNeeded:', error);
    throw error;
  }
}

// Get Gmail messages
export async function getGmailMessages(merchantId: string, maxResults: number = 20): Promise<GmailMessage[]> {
  try {
    console.log('Getting Gmail messages for merchant:', merchantId);
    // Get access token
    const accessToken = await refreshTokenIfNeeded(merchantId);
    
    if (!accessToken) {
      throw new Error('No access token available');
    }
    
    console.log('Using access token (first 10 chars):', accessToken.substring(0, 10) + '...');
    
    // Get list of messages
    const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
    console.log('Fetching messages list from:', listUrl);
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('Failed to fetch messages list:', listResponse.status, errorText);
      throw new Error(`Failed to fetch messages list: ${listResponse.status} ${errorText}`);
    }
    
    const listData: GmailMessagesListResponse = await listResponse.json();
    console.log('Received messages count:', listData.messages?.length || 0);
    
    if (!listData.messages || listData.messages.length === 0) {
      console.log('No messages found');
      return [];
    }
    
    const messageIds = listData.messages.map((msg: { id: string }) => msg.id);
    
    // Get message details in parallel
    const messagePromises = messageIds.map(async (id: string) => {
      const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata`;
      console.log('Fetching message details for ID:', id);
      
      const messageResponse = await fetch(messageUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!messageResponse.ok) {
        console.error(`Failed to fetch message ${id}:`, messageResponse.status);
        return null;
      }
      
      const messageData: GmailApiMessage = await messageResponse.json();
      
      // Extract headers
      const headers = messageData.payload?.headers || [];
      const subject = headers.find((h: { name: string; value: string }) => 
        h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
      const from = headers.find((h: { name: string; value: string }) => 
        h.name.toLowerCase() === 'from')?.value || '';
      const dateString = headers.find((h: { name: string; value: string }) => 
        h.name.toLowerCase() === 'date')?.value || '';
      
      // Convert date string to Firestore Timestamp
      const date = convertToTimestamp(dateString);
      
      // Check for attachments
      const hasAttachments = messageData.payload?.parts?.some((part: { filename?: string }) => 
        part.filename && part.filename.length > 0
      ) || false;
      
      return {
        id: messageData.id,
        threadId: messageData.threadId,
        snippet: messageData.snippet || '',
        from,
        subject,
        date,
        hasAttachments
      };
    });
    
    const messages = await Promise.all(messagePromises);
    return messages.filter(Boolean) as GmailMessage[];
    
  } catch (error) {
    console.error('Error fetching Gmail messages:', error);
    throw error;
  }
}

// Get a single Gmail message with full details
export async function getGmailMessage(merchantId: string, messageId: string): Promise<GmailFullMessage> {
  try {
    // Get access token
    const accessToken = await refreshTokenIfNeeded(merchantId);
    
    // Get message details - with full format to get the body content
    const messageResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      throw new Error(`Failed to fetch message details: ${messageResponse.status} ${errorText}`);
    }
    
    const messageData: GmailApiMessage = await messageResponse.json();
    
    // Extract headers
    const headers = messageData.payload?.headers || [];
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || '';
    const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
    const dateString = headers.find(h => h.name.toLowerCase() === 'date')?.value || '';
    
    // Convert date string to Firestore Timestamp
    const date = convertToTimestamp(dateString);
    
    // Process message parts
    const { html, plain, attachments } = findMessageParts(messageData.payload || {});
    
    return {
      id: messageData.id,
      threadId: messageData.threadId,
      snippet: messageData.snippet || '',
      from,
      to,
      subject,
      date,
      body: {
        html,
        plain
      },
      hasAttachments: attachments.length > 0,
      attachments
    };
  } catch (error) {
    console.error('Error fetching Gmail message:', error);
    throw error;
  }
} 