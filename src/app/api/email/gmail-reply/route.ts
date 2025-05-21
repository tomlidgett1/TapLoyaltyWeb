import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, emailId, response, subject, fromName } = body;
    
    if (!merchantId || !emailId || !response) {
      return NextResponse.json(
        { error: 'Missing required fields: merchantId, emailId, response' },
        { status: 400 }
      );
    }

    // Get merchant's Gmail integration details
    const integrationRef = doc(db, 'merchants', merchantId, 'integrations', 'gmail');
    const integrationSnap = await getDoc(integrationRef);
    
    if (!integrationSnap.exists() || !integrationSnap.data().connected) {
      return NextResponse.json(
        { error: 'Gmail integration not found or not connected' },
        { status: 400 }
      );
    }
    
    const integration = integrationSnap.data();
    const accessToken = integration.access_token;
    const emailAddress = integration.emailAddress || '';
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token available' },
        { status: 401 }
      );
    }

    // Construct the email message
    const emailText = response;
    
    // First get the original message details to properly thread the reply
    const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${emailId}?format=metadata`;
    const messageResponse = await fetch(messageUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!messageResponse.ok) {
      const errorText = await messageResponse.text();
      return NextResponse.json(
        { error: `Failed to fetch original message: ${errorText}` },
        { status: 500 }
      );
    }
    
    const messageData = await messageResponse.json();
    
    // Extract headers for reply
    const headers = messageData.payload?.headers || [];
    const originalFrom = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'from')?.value || '';
    const originalSubject = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'subject')?.value || '';
    const messageId = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'message-id')?.value || '';
    const references = headers.find((h: { name: string; value: string }) => h.name.toLowerCase() === 'references')?.value || '';
    const threadId = messageData.threadId;
    
    // Format the subject line properly for a reply if not already provided
    const replySubject = subject || (originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`);
    
    // Build proper References header for threading (include previous References + current Message-ID)
    const updatedReferences = references ? `${references} ${messageId}` : messageId;
    
    // Format the sender name with the email address if provided
    const fromHeader = fromName && emailAddress 
      ? `From: ${fromName} <${emailAddress}>\r\n` 
      : '';
    
    // Prepare email content with proper threading headers and custom From name
    const emailContent = Buffer.from(
      `To: ${originalFrom}\r\n` +
      fromHeader +
      `Subject: ${replySubject}\r\n` +
      `In-Reply-To: ${messageId}\r\n` +
      `References: ${updatedReferences}\r\n` +
      `Thread-ID: ${threadId}\r\n` +
      'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
      `<div style="font-family: Arial, sans-serif; white-space: pre-wrap;">${response.replace(/\n/g, '<br>')}</div>`
    ).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    // Send the email via Gmail API with the threadId parameter
    const sendUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
    const sendResponse = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: emailContent,
        threadId: threadId
      })
    });
    
    if (!sendResponse.ok) {
      const errorText = await sendResponse.text();
      return NextResponse.json(
        { error: `Failed to send email: ${errorText}` },
        { status: 500 }
      );
    }
    
    const sendData = await sendResponse.json();
    
    return NextResponse.json({
      success: true,
      messageId: sendData.id,
      threadId: sendData.threadId
    });
    
  } catch (error: any) {
    console.error('Error sending Gmail reply:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to send email reply', 
        message: error.message || 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 