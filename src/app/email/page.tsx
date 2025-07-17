"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import DOMPurify from 'dompurify';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search, 
  Archive, 
  Trash2, 
  Reply, 
  Forward, 
  MoreHorizontal,
  Paperclip,
  ReplyAll,
  ArrowLeft,
  Inbox,
  Edit3,
  Shield,
  Check,
  Plus,
  Send,
  RefreshCw,
  Bug,
  ChevronRight,
  Users,
  X,
  Eye,
  AlertCircle
} from "lucide-react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { formatMelbourneTime } from "@/lib/date-utils"

// Add custom CSS for discreet scrollbar
const customScrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 2px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }
  
  /* For Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
  }
  
  /* Prevent scroll chaining - stops scroll from bubbling to parent */
  .custom-scrollbar {
    overscroll-behavior: contain;
  }
`

// Utility functions for email processing
const decodeBase64Url = (input: string): string => {
  try {
    return decodeURIComponent(escape(window.atob(input.replace(/-/g, '+').replace(/_/g, '/'))));
  } catch (error) {
    console.warn('Failed to decode base64url:', error);
    return input; // Return original if decoding fails
  }
}

// Test decoder function similar to the provided Node.js version
const decodePart = (data: string): string => {
  try {
    // 1) Base64-URL → Base64
    let base64Data = data.replace(/-/g, '+').replace(/_/g, '/');
    // pad to multiple of 4
    while (base64Data.length % 4) base64Data += '=';

    // 2) Decode using browser's atob (equivalent to Buffer.from in Node.js)
    const decoded = atob(base64Data);
    
    // Convert to UTF-8 string (browser equivalent of .toString('utf8'))
    return decodeURIComponent(escape(decoded));
  } catch (error) {
    console.error('Failed to decode part:', error);
    return `Error decoding: ${error}`;
  }
}

// Enhanced email content processor for complex multipart emails
const processEmailContent = (emailData: any): { content: string; isHtml: boolean } => {
  console.log('🔧 Processing email content for:', emailData.messageId);
  
  // First check if we have payload.parts structure (PRIORITIZE THIS APPROACH)
  if (emailData.payload?.parts && Array.isArray(emailData.payload.parts)) {
    console.log('✅ Found payload.parts, processing multipart email');
    console.log('📦 Parts found:', emailData.payload.parts.map((p: any) => ({ mimeType: p.mimeType, hasData: !!p.body?.data })));
    
    let htmlContent = '';
    let textContent = '';
    
    // Process each part to find HTML and text content using the improved decoder
    for (const part of emailData.payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          const decoded = decodePart(part.body.data); // Use the improved decoder
          htmlContent = decoded;
          console.log('🌐 Found HTML part, length:', decoded.length);
          console.log('🌐 HTML preview (first 200 chars):', decoded.substring(0, 200));
          break; // Prefer HTML, so break once we find it
        } catch (error) {
          console.warn('❌ Failed to decode HTML part with decodePart:', error);
          // Fallback to old decoder
          try {
            const decoded = decodeBase64Url(part.body.data);
            htmlContent = decoded;
            console.log('🔄 HTML fallback decode successful');
          } catch (fallbackError) {
            console.warn('❌ HTML fallback decode also failed:', fallbackError);
          }
        }
      } else if (part.mimeType === 'text/plain' && part.body?.data) {
        try {
          const decoded = decodePart(part.body.data); // Use the improved decoder
          textContent = decoded;
          console.log('📝 Found text part, length:', decoded.length);
          console.log('📝 Text preview (first 200 chars):', decoded.substring(0, 200));
        } catch (error) {
          console.warn('❌ Failed to decode text part with decodePart:', error);
          // Fallback to old decoder
          try {
            const decoded = decodeBase64Url(part.body.data);
            textContent = decoded;
            console.log('🔄 Text fallback decode successful');
          } catch (fallbackError) {
            console.warn('❌ Text fallback decode also failed:', fallbackError);
          }
        }
      }
    }
    
    // Return HTML if we have it, otherwise text
    if (htmlContent) {
      console.log('✅ Using HTML content from payload.parts');
      return { content: htmlContent, isHtml: true };
    } else if (textContent) {
      console.log('✅ Using text content from payload.parts');
      return { content: textContent, isHtml: false };
    } else {
      console.log('⚠️ No decodable content found in payload.parts');
    }
  }
  
  // Check if we have direct payload content (secondary approach)
  if (emailData.payload?.body?.data) {
    try {
      const decoded = decodePart(emailData.payload.body.data); // Use improved decoder
      const isHtml = emailData.payload.mimeType === 'text/html';
      console.log('📄 Found direct payload content, isHtml:', isHtml);
      console.log('📄 Content preview (first 200 chars):', decoded.substring(0, 200));
      return { content: decoded, isHtml };
    } catch (error) {
      console.warn('❌ Failed to decode payload body with decodePart:', error);
      // Fallback to old decoder
      try {
        const decoded = decodeBase64Url(emailData.payload.body.data);
        const isHtml = emailData.payload.mimeType === 'text/html';
        console.log('🔄 Direct payload fallback decode successful, isHtml:', isHtml);
        return { content: decoded, isHtml };
      } catch (fallbackError) {
        console.warn('❌ Direct payload fallback decode also failed:', fallbackError);
      }
    }
  }
  
  // LAST RESORT: Fall back to messageText (deprecated approach)
  console.log('⚠️ FALLING BACK TO messageText - This should rarely happen with payload.parts approach');
  let content = emailData.messageText || "No content available";
  console.log('📝 messageText raw content:', content);
  
  // Try to decode messageText if it looks like base64
  if (content && typeof content === 'string' && content.length > 50 && !content.includes('<') && !content.includes(' ')) {
    try {
      content = decodePart(content); // Use improved decoder here too
      console.log('🔄 Decoded messageText with decodePart, preview (first 200 chars):', content.substring(0, 200));
    } catch (error) {
      console.warn('❌ decodePart failed on messageText, trying fallback decoder:', error);
      try {
        content = decodeBase64Url(content);
        console.log('🔄 Fallback decoder successful for messageText');
      } catch (fallbackError) {
        console.warn('❌ All decoders failed for messageText, using original content');
      }
    }
  }
  
  // Handle mixed plain text + HTML content (legacy handling)
  if (content.includes('<html') || content.includes('<body')) {
    console.log('🔀 Detected mixed plain text and HTML content in messageText');
    
    // Extract any plain text before the HTML starts
    const htmlStartIndex = content.search(/<html|<body|<div[^>]*>/i);
    let plainTextPrefix = '';
    let htmlContent = content;
    
    if (htmlStartIndex > 0) {
      plainTextPrefix = content.substring(0, htmlStartIndex).trim();
      htmlContent = content.substring(htmlStartIndex);
      console.log('📝 Plain text prefix:', plainTextPrefix.substring(0, 100));
      console.log('🏷️ HTML portion starts with:', htmlContent.substring(0, 100));
      
      // If we have meaningful plain text at the start, combine it with HTML
      if (plainTextPrefix.length > 10 && 
          !plainTextPrefix.startsWith('From:') && 
          !plainTextPrefix.includes('wrote:')) {
        console.log('✅ Found meaningful plain text prefix, combining with HTML');
        content = `<div style="margin-bottom: 10px;">${plainTextPrefix.replace(/\n/g, '<br>')}</div>${htmlContent}`;
      } else {
        content = htmlContent;
      }
    }
  }
  
  // Determine if content is HTML
  const isHtml = isHtmlContent(content);
  console.log('🔍 Using messageText fallback (DEPRECATED), isHtml:', isHtml);
  console.log('📄 Final content preview (first 200 chars):', content.substring(0, 200));
  console.log('🏷️ Content contains HTML tags:', ['<html', '<div', '<body'].map(tag => ({ tag, found: content.includes(tag) })));
  
  return { content, isHtml };
};

// Helper function to check if email is from current user
const isEmailFromCurrentUser = (emailAddress: string, userEmail: string, merchantEmail: string): boolean => {
  console.log("🔍 Checking if email is from current user:", { 
    emailAddress, 
    userEmail, 
    merchantEmail 
  });
  
  if (!emailAddress || (!userEmail && !merchantEmail)) {
    console.log("❌ No email address or user emails provided");
    return false;
  }
  
  const normalizedEmailAddress = emailAddress.toLowerCase().trim();
  const normalizedUserEmail = userEmail?.toLowerCase().trim() || '';
  const normalizedMerchantEmail = merchantEmail?.toLowerCase().trim() || '';
  
  const isMatch = normalizedEmailAddress === normalizedUserEmail || 
                  normalizedEmailAddress === normalizedMerchantEmail;
  
  console.log("🎯 Email comparison result:", { 
    normalizedEmailAddress, 
    normalizedUserEmail, 
    normalizedMerchantEmail, 
    isMatch 
  });
  
  return isMatch;
};

const isHtmlContent = (content: string): boolean => {
  if (!content) return false;
  
  // Check for common HTML tags
  const htmlTags = [
    '<html', '<div', '<p>', '<p ', '<br', '<span', '<strong', '<em', 
    '<a ', '<img', '<table', '<tr', '<td', '<th', '<ul', '<ol', '<li',
    '<h1', '<h2', '<h3', '<h4', '<h5', '<h6', '<b>', '<i>', '<u>'
  ];
  
  return htmlTags.some(tag => content.includes(tag));
};

const extractLatestFromPlainText = (content: string): string => {
  if (!content) return '';
  
  let text = content.trim();
  
  // Find the first occurrence of common email thread indicators
  const threadIndicators = [
    /Get Outlook for Mac\s*From:/i,
    /From:\s*.*?Date:\s*.*?To:\s*.*?Subject:/i,
    /On\s+\w+,?\s+\d+\s+\w+\s+\d+.*?wrote:/i,
    /-----Original Message-----/i,
    /________________________________/,
    /From:.*?<.*?>/i,
    /Sent from my/i
  ];
  
  // Find the earliest thread indicator
  let cutoffIndex = -1;
  for (const indicator of threadIndicators) {
    const match = text.search(indicator);
    if (match !== -1 && (cutoffIndex === -1 || match < cutoffIndex)) {
      cutoffIndex = match;
    }
  }
  
  // If we found a thread indicator, cut everything from there
  if (cutoffIndex !== -1) {
    text = text.substring(0, cutoffIndex);
  }
  
  return text.trim();
};

const cleanPlainTextContent = (content: string): string => {
  if (!content) return '';
  
  // First extract the latest message
  let cleaned = extractLatestFromPlainText(content);
  
  // Remove obvious code/log patterns
  cleaned = cleaned.replace(/_API_KEY[\s\S]*?return;\s*}/g, '');
  cleaned = cleaned.replace(/console\.log.*?;/g, '');
  cleaned = cleaned.replace(/response\.status.*?;/g, '');
  cleaned = cleaned.replace(/const.*?=.*?;/g, '');
  cleaned = cleaned.replace(/await fetch[\s\S]*?\);/g, '');
  cleaned = cleaned.replace(/if \(![\s\S]*?\)/g, '');
  cleaned = cleaned.replace(/process\.env\.[A-Z_]+/g, '');
  
  // Clean up remaining email artifacts
  cleaned = cleaned.replace(/Get Outlook for Mac/gi, '');
  cleaned = cleaned.replace(/Sent from my iPhone/gi, '');
  cleaned = cleaned.replace(/Sent from my Android/gi, '');
  cleaned = cleaned.replace(/Download Outlook for iOS/gi, '');
  cleaned = cleaned.replace(/Download Outlook for Android/gi, '');
  
  // Replace multiple spaces with single space
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Clean up extra whitespace
  cleaned = cleaned.trim();
  
  return cleaned;
};

const extractLatestMessage = (htmlContent: string): string => {
  console.log('🧹 extractLatestMessage input (first 300 chars):', htmlContent.substring(0, 300));
  
  if (typeof window === 'undefined') return htmlContent; // Server-side safety
  
  try {
    // First, sanitize the HTML
    const sanitized = DOMPurify.sanitize(htmlContent, {
      ADD_ATTR: ['target'],
      ALLOW_UNKNOWN_PROTOCOLS: false,
    });
    
    console.log('🧼 After DOMPurify sanitization (first 300 chars):', sanitized.substring(0, 300));

    // Parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(sanitized, 'text/html');

    // Before removing containers, let's see what we have
    console.log('🔍 Document body content (first 500 chars):', doc.body.textContent?.substring(0, 500));
    console.log('🔍 Document body HTML (first 500 chars):', doc.body.innerHTML?.substring(0, 500));
    
    // Check for mail-editor-reference-message-container specifically
    const mailEditorContainer = doc.querySelector('#mail-editor-reference-message-container');
    if (mailEditorContainer) {
      console.log('📧 Found mail-editor-reference-message-container');
      console.log('📧 Container text content:', mailEditorContainer.textContent?.substring(0, 200));
      
      // Instead of removing the whole container, extract meaningful content first
      const meaningfulContent: string[] = [];
      
      // Look for direct text content that's not in reply/quote sections
      mailEditorContainer.querySelectorAll('div').forEach(div => {
        const text = div.textContent?.trim() || '';
        const hasQuoteClass = div.className.includes('quote') || div.className.includes('reference-message');
        const isHeaderText = text.startsWith('From:') || text.startsWith('Date:') || 
                           text.startsWith('To:') || text.startsWith('Subject:') ||
                           text.startsWith('On ') || text.includes(' wrote:');
        const hasEmailAddress = text.includes('@') && text.includes('<') && text.includes('>');
        
        console.log(`📋 Checking div: "${text.substring(0, 50)}" | hasQuoteClass: ${hasQuoteClass} | isHeaderText: ${isHeaderText} | hasEmailAddress: ${hasEmailAddress}`);
        
        if (text && text.length > 2 && !hasQuoteClass && !isHeaderText && !hasEmailAddress) {
          meaningfulContent.push(div.outerHTML);
          console.log('📝 Found meaningful content:', text.substring(0, 100));
        }
      });
      
      // Also check direct text nodes in the container (not inside other divs)
      const walker = document.createTreeWalker(
        mailEditorContainer,
        NodeFilter.SHOW_TEXT,
        null
      );
      
      let textNode;
      while (textNode = walker.nextNode()) {
        const text = textNode.textContent?.trim() || '';
        if (text && text.length > 2 && textNode.parentElement === mailEditorContainer) {
          console.log('📝 Found direct text node:', text.substring(0, 100));
          meaningfulContent.push(`<div>${text}</div>`);
        }
      }
      
      // If we found meaningful content, replace the container with just that content
      if (meaningfulContent.length > 0) {
        const newContainer = doc.createElement('div');
        newContainer.innerHTML = meaningfulContent.join('');
        mailEditorContainer.replaceWith(newContainer);
        console.log('✅ Replaced mail-editor container with meaningful content');
      } else {
        // No meaningful content found, remove the container
        mailEditorContainer.remove();
        console.log('🗑️ Removed mail-editor container (no meaningful content)');
      }
    }

    // Remove other nested reply containers (less aggressive now)
    const nestedContainers = [
      '.gmail_quote',
      '.yahoo_quoted',
      '[id*="reference-message"]:not(#mail-editor-reference-message-container)',
      '[class*="quoted"]',
      '[class*="signature"]'
    ];

    nestedContainers.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => {
        console.log(`🗑️ Removing container: ${selector}, content: ${el.textContent?.substring(0, 100)}`);
        el.remove();
      });
    });

    // Remove code blocks that shouldn't be in emails
    doc.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      // Remove elements that contain obvious code patterns
      if (text.includes('_API_KEY') || 
          text.includes('console.log') || 
          text.includes('process.env') ||
          text.includes('await fetch') ||
          text.includes('response.status')) {
        el.remove();
      }
    });

    // Remove horizontal rules that typically separate replies
    doc.querySelectorAll('hr').forEach(hr => {
      const nextSibling = hr.nextElementSibling;
      if (nextSibling) {
        // Remove HR and everything after it
        let current: ChildNode | null = hr;
        while (current) {
          const next: ChildNode | null = current.nextSibling;
          current.remove();
          current = next;
        }
      }
    });

    // Remove divs with "From:" or "Sent:" that indicate forwarded/replied messages
    doc.querySelectorAll('div, p').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.match(/^(From:|Sent:|Date:|To:|Subject:)/i)) {
        // Remove this element and everything after it
        let current: ChildNode | null = el;
        while (current) {
          const next: ChildNode | null = current.nextSibling;
          current.remove();
          current = next;
        }
      }
    });

    // Remove known footers
    const footerSelectors = [
      'a[href*="aka.ms/GetOutlookForMac"]',
      'a[href*="outlook.com"]',
      'a[href*="gmail.com"]',
      '[class*="footer"]',
      '[id*="footer"]'
    ];

    footerSelectors.forEach(selector => {
      doc.querySelectorAll(selector).forEach(el => {
        const paragraph = el.closest('p');
        if (paragraph) paragraph.remove();
        else el.remove();
      });
    });

    // Remove elements that commonly appear in signatures
    doc.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.includes('Get Outlook for') || 
          text.includes('Sent from my') || 
          text.includes('Download') ||
          text.includes('Install') ||
          text.match(/^--+$/)) {
        el.remove();
      }
    });

    // If we have very little content left, try to extract just the first few paragraphs
    const remainingText = doc.body.textContent?.trim() || '';
    if (remainingText.length < 50) {
      // Parse original again and just take first 2 paragraphs
      const freshDoc = parser.parseFromString(sanitized, 'text/html');
      const paragraphs = freshDoc.querySelectorAll('p');
      const container = freshDoc.createElement('div');
      
      for (let i = 0; i < Math.min(2, paragraphs.length); i++) {
        container.appendChild(paragraphs[i].cloneNode(true));
      }
      
      return DOMPurify.sanitize(container.innerHTML);
    }

    const finalResult = DOMPurify.sanitize(doc.body.innerHTML);
    console.log('✅ extractLatestMessage final result (first 300 chars):', finalResult.substring(0, 300));
    console.log('📏 Final result length:', finalResult.length);
    return finalResult;
  } catch (error) {
    console.warn('Error extracting latest message:', error);
    const fallback = DOMPurify.sanitize(htmlContent);
    console.log('⚠️ Using fallback result (first 300 chars):', fallback.substring(0, 300));
    return fallback;
  }
}

interface ConnectedAccount {
  id: string
  emailAddress: string
  connected: boolean
  provider: 'gmail' | 'outlook'
}

export default function EmailPage() {
  const { user } = useAuth()
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [selectedThread, setSelectedThread] = useState<any>(null)
  const [replyMode, setReplyMode] = useState<{
    type: 'reply' | 'replyAll' | 'forward'
    originalEmail: any
    thread?: any
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState("")
  const [composeMode, setComposeMode] = useState<"none" | "reply" | "replyAll" | "forward">("none")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeContent, setComposeContent] = useState("")
  const [composeTo, setComposeTo] = useState("")
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchedEmails, setFetchedEmails] = useState<any[]>([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [debugDialogOpen, setDebugDialogOpen] = useState(false)
  const [debugResponse, setDebugResponse] = useState<any>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [merchantData, setMerchantData] = useState<any>(null)
  const [merchantEmail, setMerchantEmail] = useState("")
  const [decodeTestResults, setDecodeTestResults] = useState<any>(null)
  const [showDecodeResults, setShowDecodeResults] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Format time for preview display using Melbourne time
  const formatPreviewTime = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Unknown time'
    
    try {
      // Use the same Melbourne time formatting as formatMelbourneTime
      return formatMelbourneTime(timestamp, 'Invalid time')
    } catch (e) {
      console.error('Error formatting preview time:', timestamp, e)
      return 'Invalid time'
    }
  }

  // Use only fetched Gmail emails
  const allEmails = fetchedEmails
  
  // Group emails by threadId
  const groupEmailsByThread = (emails: any[]) => {
    const threads = new Map<string, any[]>()
    
    emails.forEach(email => {
      const threadId = email.threadId || email.id.toString()
      if (!threads.has(threadId)) {
        threads.set(threadId, [])
      }
      threads.get(threadId)!.push(email)
    })
    
    // Convert to array of thread objects with representative email (most recent)
    return Array.from(threads.entries()).map(([threadId, threadEmails]) => {
      // Sort emails in thread by time (most recent first)
      const sortedEmails = threadEmails.sort((a, b) => {
        const timeA = new Date(a.time || 0).getTime()
        const timeB = new Date(b.time || 0).getTime()
        return timeB - timeA
      })
      
      const representative = sortedEmails[0]
      const unreadCount = threadEmails.filter(e => !e.read).length
      
      return {
        threadId,
        emails: sortedEmails,
        representative,
        count: threadEmails.length,
        unreadCount,
        // Thread properties based on representative email
        ...representative,
        // Override with thread-specific data
        id: threadId,
        isThread: true,
        hasUnread: unreadCount > 0
      }
    })
  }
  
  const filteredEmails = allEmails.filter(email => {
    // First filter by folder
    let folderMatch = true
    if (selectedFolder === "inbox") folderMatch = email.folder === "inbox"
    else if (selectedFolder === "spam") folderMatch = email.folder === "spam"
    else if (selectedFolder === "trash") folderMatch = email.folder === "trash"
    else if (selectedFolder === "drafts") folderMatch = email.folder === "drafts"
    
    if (!folderMatch) return false
    
    // Then filter by search query
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    return (
      email.sender?.toLowerCase().includes(query) ||
      email.email?.toLowerCase().includes(query) ||
      email.subject?.toLowerCase().includes(query) ||
      email.preview?.toLowerCase().includes(query)
    )
  })

  // Group filtered emails into threads and sort by most recent
  const emailThreads = groupEmailsByThread(filteredEmails).sort((a, b) => {
    const timeA = new Date(a.representative.time || 0).getTime()
    const timeB = new Date(b.representative.time || 0).getTime()
    return timeB - timeA
  })



  const handleDecodeTest = () => {
    console.log('🧪 Starting decode test...');
    
    // Find an email with payload.parts structure
    const emailsWithParts = fetchedEmails.filter(email => 
      email.rawData?.payload?.parts && Array.isArray(email.rawData.payload.parts)
    );
    
    if (emailsWithParts.length === 0) {
      console.log('❌ No emails found with payload.parts structure');
      setDecodeTestResults({
        error: 'No emails found with payload.parts structure',
        emailsChecked: fetchedEmails.length
      });
      setShowDecodeResults(true);
      return;
    }
    
    const testEmail = emailsWithParts[0];
    console.log('🎯 Testing decode on email:', testEmail.id);
    console.log('📦 Parts found:', testEmail.rawData.payload.parts.length);
    
    const results: any = {
      emailId: testEmail.id,
      emailSubject: testEmail.subject,
      totalParts: testEmail.rawData.payload.parts.length,
      decodedParts: []
    };
    
    testEmail.rawData.payload.parts.forEach((part: any, index: number) => {
      console.log(`🔍 Part ${index}:`, { mimeType: part.mimeType, hasData: !!part.body?.data });
      
      if (part.body?.data) {
        try {
          const decoded = decodePart(part.body.data);
          console.log(`✅ Part ${index} decoded successfully`);
          console.log(`📝 Decoded content preview (first 200 chars):`, decoded.substring(0, 200));
          
          results.decodedParts.push({
            index,
            mimeType: part.mimeType,
            originalLength: part.body.data.length,
            decodedLength: decoded.length,
            preview: decoded.substring(0, 300),
            fullContent: decoded
          });
        } catch (error) {
          console.error(`❌ Failed to decode part ${index}:`, error);
          results.decodedParts.push({
            index,
            mimeType: part.mimeType,
            error: error?.toString() || 'Unknown error'
          });
        }
      } else {
        console.log(`⚠️ Part ${index} has no data`);
        results.decodedParts.push({
          index,
          mimeType: part.mimeType,
          warning: 'No data in body'
        });
      }
    });
    
    console.log('🎉 Decode test completed:', results);
    setDecodeTestResults(results);
    setShowDecodeResults(true);
  }

  const handleSend = () => {
    // Here you would typically send the email to your backend
    console.log("Sending email:", { to: composeTo, subject: composeSubject, content: composeContent })
    
    // Reset compose mode
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
  }

  // Fetch Gmail emails directly from Firestore
  const fetchGmailEmails = async () => {
    if (!user?.uid) return

    try {
      setEmailsLoading(true)
      console.log("Fetching Gmail emails from Firestore for merchant:", user.uid)
      
      // Query the fetchedemails collection
      const emailsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const emailsQuery = query(
        emailsRef,
        orderBy('messageTimestamp', 'desc'),
        limit(50) // Limit to most recent 50 emails
      )
      
      const querySnapshot = await getDocs(emailsQuery)
      console.log(`Found ${querySnapshot.size} emails in Firestore`)
      
      // Transform Firestore data to our format
      const transformedEmails = querySnapshot.docs.map((doc) => {
        const emailData = doc.data()
        console.log("Processing email:", doc.id, emailData)
        
        // Extract sender information from headers
        const headers = emailData.payload?.headers || []
        const fromHeader = headers.find((h: any) => h.name === 'From')
        const toHeader = headers.find((h: any) => h.name === 'To')
        const subjectHeader = headers.find((h: any) => h.name === 'Subject')
        const dateHeader = headers.find((h: any) => h.name === 'Date')
        
        // Parse sender name and email
        const fromValue = fromHeader?.value || "Unknown Sender"
        let senderName = fromValue
        let senderEmail = ""
        
        // Extract name and email from "Name <email@domain.com>" format
        const emailMatch = fromValue.match(/<([^>]+)>/)
        if (emailMatch) {
          senderEmail = emailMatch[1]
          senderName = fromValue.replace(/<[^>]+>/, '').trim()
        } else if (fromValue.includes('@')) {
          senderEmail = fromValue
          senderName = fromValue
        }
        
        // Extract preview text using processed content
        let preview = ""
        const { content: processedContent, isHtml } = processEmailContent(emailData);
        if (processedContent) {
          let textContent = processedContent;
          
          // If it's HTML, extract text content
          if (isHtml) {
            try {
              const tempDiv = typeof window !== 'undefined' ? document.createElement('div') : null;
              if (tempDiv) {
                tempDiv.innerHTML = DOMPurify.sanitize(processedContent);
                textContent = tempDiv.textContent || tempDiv.innerText || '';
              } else {
                // Fallback: strip HTML tags
                textContent = processedContent.replace(/<[^>]*>/g, ' ');
              }
            } catch (error) {
              // Fallback: strip HTML tags
              textContent = processedContent.replace(/<[^>]*>/g, ' ');
            }
          }
          
          // Clean and truncate for preview
          preview = textContent
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 150) + (textContent.length > 150 ? '...' : '');
        }
        
        // Keep raw timestamp for proper time formatting
        const rawTimestamp = emailData.messageTimestamp
        
        // Check if email is unread (has UNREAD label)
        const isUnread = emailData.labelIds?.includes('UNREAD') || false
        
        // Check for attachments
        const hasAttachment = emailData.attachmentList?.length > 0 || false
        
        const emailObj = {
          id: doc.id,
          threadId: emailData.threadId || doc.id, // Use threadId from Gmail data or fallback to message ID
          sender: senderName,
          email: senderEmail,
          subject: subjectHeader?.value || "No Subject",
          preview: preview || "No preview available",
          content: (() => {
            const { content } = processEmailContent(emailData);
            return content;
          })(),
          time: rawTimestamp, // Store raw timestamp
          read: !isUnread,
          hasAttachment: hasAttachment,
          folder: "inbox", // Default to inbox for Gmail emails
          isGmail: true,
          // Store original data for debugging
          rawData: emailData
        }
        
        console.log("📧 Processed email object:", {
          id: emailObj.id,
          sender: emailObj.sender,
          senderEmail: emailObj.email,
          isSent: emailData.labelIds?.includes('SENT'),
          subject: emailObj.subject
        });
        
        return emailObj;
      })
        
        console.log("Transformed emails:", transformedEmails)
        setFetchedEmails(transformedEmails)
      
      // Store debug response
      setDebugResponse({
        success: true,
        emailsFetched: transformedEmails.length,
        source: 'firestore',
        merchantId: user.uid
      })
      
    } catch (error) {
      console.error("Error fetching Gmail emails from Firestore:", error)
      setDebugResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'firestore',
        merchantId: user.uid
      })
    } finally {
      setEmailsLoading(false)
    }
  }

  // Sync emails by calling the Firebase function to fetch new emails
  const syncGmailEmails = async () => {
    if (!user?.uid) return

    try {
      setEmailsLoading(true)
      console.log("Syncing Gmail emails via Firebase function for merchant:", user.uid)
      
      const fetchGmailEmailsFunction = httpsCallable(functions, 'fetchGmailEmails')
      const result = await fetchGmailEmailsFunction({
        merchantId: user.uid
      })
      
      console.log("Gmail sync result:", result.data)
      
      // After syncing, refresh the local emails from Firestore
      await fetchGmailEmails()
      
    } catch (error) {
      console.error("Error syncing Gmail emails:", error)
    }
  }

  // Fetch connected Gmail accounts
  const fetchConnectedAccounts = async () => {
    if (!user?.uid) return

    try {
      setLoading(true)
      
      // Query Gmail integrations where connected = true
      const gmailIntegrationsRef = collection(db, 'merchants', user.uid, 'integrations')
      const gmailQuery = query(gmailIntegrationsRef, where('connected', '==', true))
      const querySnapshot = await getDocs(gmailQuery)
      
      const accounts: ConnectedAccount[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.emailAddress) {
          accounts.push({
            id: doc.id,
            emailAddress: data.emailAddress,
            connected: data.connected,
            provider: data.provider || 'gmail' // Default to gmail if provider not specified
          })
        }
      })
      
      setConnectedAccounts(accounts)
      
      // Set the first connected account as selected if none is selected
      if (accounts.length > 0 && !selectedAccount) {
        setSelectedAccount(accounts[0].emailAddress)
      }
      
    } catch (error) {
      console.error("Error fetching connected accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch connected accounts and Gmail emails on component mount
  // Use effect to fetch merchant data when component loads
  useEffect(() => {
    async function fetchMerchantData() {
      if (!user?.uid) return;
      
      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid));
        if (merchantDoc.exists()) {
          const data = merchantDoc.data();
          setMerchantData(data);
          
          // Get merchant email - try different possible field names
          const email = data.businessEmail || data.email || data.contactEmail || user.email || '';
          setMerchantEmail(email);
          
          console.log("🏢 Merchant data loaded:", { 
            hasLogo: !!data.logoUrl, 
            logoUrl: data.logoUrl, 
            merchantEmail: email,
            allMerchantData: data 
          });
          
          // Also log what fields are available
          console.log("📋 Available merchant data fields:", Object.keys(data));
        }
      } catch (error) {
        console.error("Error fetching merchant data:", error);
      }
    }
    
    fetchMerchantData();
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (user?.uid) {
      fetchConnectedAccounts()
      fetchGmailEmails()
      
      // Set up Firestore listener for real-time email updates
      const emailsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const emailsQuery = query(
        emailsRef,
        orderBy('messageTimestamp', 'desc'),
        limit(50)
      )
      
      console.log("Setting up Firestore listener for real-time email updates")
      const unsubscribe = onSnapshot(emailsQuery, (snapshot) => {
        console.log(`Firestore listener: ${snapshot.size} emails found, ${snapshot.docChanges().length} changes`)
        
        // Only refresh if there are actual changes (new emails, modifications, etc.)
        if (snapshot.docChanges().length > 0) {
          console.log("Email changes detected, refreshing email list")
      fetchGmailEmails()
        }
      }, (error) => {
        console.error("Error in Firestore listener:", error)
      })
      
      // Set up 2-minute refresh interval
      console.log("Setting up 2-minute refresh interval")
      const refreshInterval = setInterval(() => {
        console.log("Auto-refreshing emails (2-minute interval)")
        fetchGmailEmails()
      }, 2 * 60 * 1000) // 2 minutes in milliseconds
      
      // Cleanup function
      return () => {
        console.log("Cleaning up Firestore listener and refresh interval")
        unsubscribe()
        clearInterval(refreshInterval)
      }
    }
  }, [user?.uid])

  // Get current selected account details
  const getCurrentAccount = () => {
    return connectedAccounts.find(account => account.emailAddress === selectedAccount)
  }

  const handleCancelCompose = () => {
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
  }

  const handleArchive = () => {
    if (selectedEmail) {
      console.log("Archiving email:", selectedEmail.id)
      // Here you would typically update the email status in your backend
    }
  }

  const handleDelete = () => {
    if (selectedEmail) {
      console.log("Deleting email:", selectedEmail.id)
      // Here you would typically move the email to trash or delete it
      setSelectedEmail(null)
    }
  }

  const handleMarkAsSpam = () => {
    if (selectedEmail) {
      console.log("Marking as spam:", selectedEmail.id)
      // Here you would typically move the email to spam folder
      setSelectedEmail(null)
    }
  }

  const handleSync = () => {
    console.log("Syncing emails...")
    // Sync Gmail emails from API and refresh local cache
    syncGmailEmails()
  }

  const handleComposeNew = () => {
    setComposeMode("reply") // Use reply mode for new compose
    setComposeTo("")
    setComposeSubject("")
    setComposeContent("")
  }

  const toggleThread = (threadId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(threadId)) {
      newExpanded.delete(threadId)
    } else {
      newExpanded.add(threadId)
    }
    setExpandedThreads(newExpanded)
  }

  const handleEmailSelect = (email: any) => {
    setSelectedEmail(email)
    setSelectedThread(null) // Clear thread selection when selecting individual email
    
    // Mark email as read when selected and update local state
    email.read = true
    
    // Update local fetchedEmails state to mark this specific email as read
    setFetchedEmails(prev => prev.map(e => 
      e.id === email.id 
        ? { ...e, read: true }
        : e
    ))
  }

  const handleThreadSelect = async (thread: any) => {
    if (!user?.uid) return
    
    console.log("Thread selected:", thread)
    console.log("Thread has", thread.count, "emails")
    
    try {
      setSelectedThread(null) // Clear any selected thread
      
      // Close all other threads and expand only the current one (if it has multiple emails)
      if (thread.count > 1) {
        // Create a new Set with only the current thread
        const newExpanded = new Set([thread.threadId])
        setExpandedThreads(newExpanded)
        console.log("Expanding thread and closing others:", thread.threadId)
      } else {
        // If it's a single email thread, close all expanded threads
        setExpandedThreads(new Set())
        console.log("Closing all expanded threads for single email")
      }
      
      // Query Firestore to find the most recent email document with this threadId
      console.log("Querying Firestore for threadId:", thread.threadId)
      
      const emailsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const threadQuery = query(
        emailsRef,
        where('threadId', '==', thread.threadId),
        orderBy('messageTimestamp', 'desc'),
        limit(1) // Get only the most recent
      )
      
      const querySnapshot = await getDocs(threadQuery)
      
      if (querySnapshot.empty) {
        console.warn("No Firestore documents found for threadId:", thread.threadId)
        // Fallback to representative email
        setSelectedEmail(thread.representative)
        thread.representative.read = true
        
        // Update local state for this fallback
        setFetchedEmails(prev => prev.map(email => 
          email.threadId === thread.threadId 
            ? { ...email, read: true }
            : email
        ))
        return
      }
      
      // Get the most recent document (first in results due to desc order)
      const mostRecentDoc = querySnapshot.docs[0]
      const emailData = mostRecentDoc.data()
      
      console.log("Found most recent email document:", mostRecentDoc.id, "timestamp:", emailData.messageTimestamp)
      
      // Process the email content from the raw Firestore data
      const { content } = processEmailContent(emailData)
      
      // Extract sender information from headers
      const headers = emailData.payload?.headers || []
      const fromHeader = headers.find((h: any) => h.name === 'From')
      const subjectHeader = headers.find((h: any) => h.name === 'Subject')
      
      // Parse sender name and email
      const fromValue = fromHeader?.value || "Unknown Sender"
      let senderName = fromValue
      let senderEmail = ""
      
      // Extract name and email from "Name <email@domain.com>" format
      const emailMatch = fromValue.match(/<([^>]+)>/)
      if (emailMatch) {
        senderEmail = emailMatch[1]
        senderName = fromValue.replace(/<[^>]+>/, '').trim()
      } else if (fromValue.includes('@')) {
        senderEmail = fromValue
        senderName = fromValue
      }
      
      // Check if email is unread (has UNREAD label)
      const isUnread = emailData.labelIds?.includes('UNREAD') || false
      
      // Check for attachments
      const hasAttachment = emailData.attachmentList?.length > 0 || false
      
      // Create the complete email object with full thread history
      const completeThreadEmail = {
        id: mostRecentDoc.id,
        threadId: emailData.threadId || mostRecentDoc.id,
        sender: senderName,
        email: senderEmail,
        subject: subjectHeader?.value || "No Subject",
        content: content, // This should contain the full thread history
        time: emailData.messageTimestamp,
        read: !isUnread,
        hasAttachment: hasAttachment,
        folder: "inbox",
        isGmail: true,
        rawData: emailData // Store the complete raw data
      }
      
      console.log("Setting complete thread email with full history:", completeThreadEmail.id)
      setSelectedEmail(completeThreadEmail)
      
      // Mark as read and update local state
      completeThreadEmail.read = true
      
      // Update local fetchedEmails state to mark all emails in this thread as read
      setFetchedEmails(prev => prev.map(email => 
        email.threadId === thread.threadId 
          ? { ...email, read: true }
          : email
      ))
      
    } catch (error) {
      console.error("Error in handleThreadSelect:", error)
        // Ultimate fallback - use representative email
        setSelectedEmail(thread.representative)
        thread.representative.read = true
        
        // Update local state for fallback as well
        setFetchedEmails(prev => prev.map(email => 
          email.threadId === thread.threadId 
            ? { ...email, read: true }
            : email
        ))
      }
  }



  return (
    <div className="flex flex-col h-full overflow-hidden">
      <style dangerouslySetInnerHTML={{ 
        __html: `
          ${customScrollbarStyles}
        `
      }} />
      {/* Combined Header with folder dropdown, toolbar, and connected account */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* Folder Dropdown */}
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inbox">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                </div>
              </SelectItem>
              <SelectItem value="spam">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Spam</span>
                </div>
              </SelectItem>
              <SelectItem value="trash">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Trash</span>
                </div>
              </SelectItem>
              <SelectItem value="drafts">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  <span>Drafts</span>
        </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Toolbar Actions */}
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleComposeNew} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Email</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-gray-700 hover:bg-gray-200">
                    <Trash2 className="h-4 w-4" />
        </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleArchive} className="text-gray-700 hover:bg-gray-200">
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Archive</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleSync} className="text-gray-700 hover:bg-gray-200">
                    <RefreshCw className="h-4 w-4" />
                </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sync</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDecodeTest} className="text-gray-700 hover:bg-gray-200">
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Decode Test</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              
              <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
                <DialogTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-gray-200">
                        <Bug className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Debug Response</p>
                    </TooltipContent>
                  </Tooltip>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto animate-in fade-in duration-200 slide-in-from-bottom-4 zoom-in-95 ease-out">
                  <DialogHeader>
                    <DialogTitle>Gmail Email Fetch Debug</DialogTitle>
                    <DialogDescription>
                      Debug information from Gmail email fetching (Firestore + Firebase function)
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {debugResponse ? (
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-md p-4">
                          <h4 className="font-semibold mb-2 text-sm">Fetch Summary:</h4>
                          <div className="text-sm space-y-1">
                            <p><strong>Success:</strong> {debugResponse.success ? 'Yes' : 'No'}</p>
                            <p><strong>Email Count:</strong> {debugResponse.emailsFetched || 'Unknown'}</p>
                            <p><strong>Source:</strong> {debugResponse.source || 'Unknown'}</p>
                            <p><strong>Merchant ID:</strong> {debugResponse.merchantId || 'N/A'}</p>
                            {debugResponse.error && (
                              <p><strong>Error:</strong> <span className="text-red-600">{debugResponse.error}</span></p>
                            )}
                          </div>
                        </div>
                        
                        <div className="bg-gray-900 text-gray-100 rounded-md p-4 overflow-auto">
                          <h4 className="font-semibold mb-2 text-sm text-white">Debug Data JSON:</h4>
                          <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-96">
                            {JSON.stringify(debugResponse, null, 2)}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Bug className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No debug data available</p>
                        <p className="text-sm">Load or sync Gmail emails to see debug information</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Decode Test Results Dialog */}
              <Dialog open={showDecodeResults} onOpenChange={setShowDecodeResults}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Decode Test Results</DialogTitle>
                    <DialogDescription>
                      Base64 decoding test results for payload.parts.body.data
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {decodeTestResults ? (
                      <div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <p><strong>Email ID:</strong> {decodeTestResults.emailId}</p>
                          <p><strong>Subject:</strong> {decodeTestResults.emailSubject}</p>
                          <p><strong>Total Parts:</strong> {decodeTestResults.totalParts}</p>
                          <p><strong>Emails Checked:</strong> {decodeTestResults.emailsChecked}</p>
                        </div>

                        {decodeTestResults.error ? (
                          <div className="text-red-600 p-4 bg-red-50 rounded">
                            <strong>Error:</strong> {decodeTestResults.error}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {decodeTestResults.decodedParts?.map((part: any, index: number) => (
                              <div key={index} className="border rounded p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="font-semibold">Part {part.index}</h4>
                                  <span className="text-sm text-gray-500">{part.mimeType}</span>
                                </div>
                                
                                {part.error ? (
                                  <div className="text-red-600">
                                    <strong>Error:</strong> {part.error}
                                  </div>
                                ) : part.warning ? (
                                  <div className="text-yellow-600">
                                    <strong>Warning:</strong> {part.warning}
                                  </div>
                                ) : (
                                  <div>
                                    <div className="grid grid-cols-2 gap-4 mb-2 text-sm">
                                      <p><strong>Original Length:</strong> {part.originalLength} chars</p>
                                      <p><strong>Decoded Length:</strong> {part.decodedLength} chars</p>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <h5 className="font-medium">Preview (first 300 chars):</h5>
                                      <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap break-all">
                                        {part.preview}
                                      </div>
                                      
                                      <details className="space-y-2">
                                        <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800">
                                          Show Full Content
                                        </summary>
                                        <div className="bg-gray-50 p-3 rounded text-sm font-mono whitespace-pre-wrap break-all max-h-96 overflow-y-auto">
                                          {part.fullContent}
                                        </div>
                                      </details>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No decode test results available</p>
                        <p className="text-sm">Click the decode test button to test email content decoding</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </TooltipProvider>
              </div>

        <div className="flex items-center gap-2">
          {/* Connected Account Selector */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-64 h-8 text-sm">
              <SelectValue>
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                    <span className="text-sm text-gray-500">Loading accounts...</span>
                </div>
                ) : getCurrentAccount() ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex-shrink-0">
                      <Image 
                        src={getCurrentAccount()?.provider === "gmail" ? "/gmailnew.png" : "/outlook.png"}
                        alt={getCurrentAccount()?.provider === "gmail" ? "Gmail" : "Outlook"}
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                        </div>
                    <span className="text-sm text-gray-700">
                      {getCurrentAccount()?.emailAddress}
                    </span>
                      </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex-shrink-0">
                      <Plus className="h-4 w-4 text-gray-400" />
                        </div>
                    <span className="text-sm text-gray-500">No connected accounts</span>
                      </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {connectedAccounts.map((account) => (
                <SelectItem key={account.id} value={account.emailAddress}>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex-shrink-0">
                      <Image 
                        src={account.provider === "gmail" ? "/gmailnew.png" : "/outlook.png"}
                        alt={account.provider === "gmail" ? "Gmail" : "Outlook"}
                        width={24}
                        height={24}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span>{account.emailAddress}</span>
                  </div>
                </SelectItem>
                  ))}
              {connectedAccounts.length > 0 && <Separator className="my-1" />}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add New Account</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-9 px-2 text-gray-600 hover:bg-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
                </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Email List */}
        <div className="w-2/5 border-r border-gray-200 flex flex-col h-full">
          {/* Search Bar - Fixed at top */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search emails..."
                className="pl-10 pr-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              </div>
            </div>

          {/* Email list - Scrollable middle section */}
          <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
            {emailsLoading && (
              <div className="p-4 border-b border-gray-200 bg-blue-50">
                <div className="flex items-center gap-3 text-sm text-blue-600">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Fetching Gmail emails...</span>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {emailThreads.map((thread) => (
                <div key={thread.threadId}>
                  {/* Thread header */}
                  <div
                    className={`flex items-center gap-2 p-3 cursor-pointer transition-all duration-200 border-l-4 ${
                      selectedThread?.threadId === thread.threadId || selectedEmail?.id === thread.representative.id
                        ? 'bg-blue-100 border-l-blue-500 shadow-sm' 
                        : !thread.representative.read 
                          ? 'bg-blue-50 border-l-blue-300 hover:bg-blue-100' 
                          : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                    }`}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    {/* Expand/Collapse button or placeholder for alignment */}
                    <div className="w-3.5 h-3.5 flex items-center justify-center">
                      {thread.count > 1 ? (
                      <button 
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleThread(thread.threadId)
                        }}
                      >
                          <ChevronRight 
                            className={`h-3.5 w-3.5 transition-transform duration-200 ease-out ${
                              expandedThreads.has(thread.threadId) ? 'rotate-90' : 'rotate-0'
                            }`} 
                          />
                        </button>
                      ) : (
                        <div className="h-3.5 w-3.5"></div>
                      )}
                    </div>

                    {/* Thread content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm truncate ${!thread.representative.read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}`}>
                          {thread.representative.sender}
                        </span>
                        
                        {/* Thread count badge */}
                        {thread.count > 1 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                            <Users className="h-2.5 w-2.5" />
                            {thread.count}
                          </span>
                        )}
                        
                        {/* Unread count badge */}
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-blue-700 border border-blue-200 w-fit">
                            <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                            {thread.unreadCount}
                          </span>
                        )}
                        
                        {(thread.representative as any).isGmail && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                            <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                            Gmail
                          </span>
                        )}
                        {thread.representative.hasAttachment && (
                          <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        )}
                          <span className={`text-xs ml-auto ${!thread.representative.read ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{formatPreviewTime(thread.representative.time)}</span>
                      </div>
                        <div className={`text-sm truncate ${!thread.representative.read ? 'font-bold text-gray-900' : 'font-normal text-gray-700'}`}>
                        {thread.representative.subject}
                      </div>
                        <div className={`text-xs truncate ${!thread.representative.read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {thread.representative.preview}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!thread.representative.read && (
                      <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 shadow-sm unread-indicator"></div>
                    )}
                  </div>

                  {/* Expanded thread emails */}
                  {thread.count > 1 && (
                    <div 
                      className={`bg-gray-50 overflow-hidden transition-all duration-200 ease-out ${
                        expandedThreads.has(thread.threadId) 
                          ? 'max-h-screen opacity-100' 
                          : 'max-h-0 opacity-0'
                      }`}
                      style={{
                        transitionProperty: 'max-height, opacity',
                        maxHeight: expandedThreads.has(thread.threadId) ? '800px' : '0px'
                      }}
                    >
                      {thread.emails.slice(1).map((email: any, index: number) => (
                <div
                  key={email.id}
                          className={`flex items-center gap-2 p-2 pl-10 cursor-pointer transition-all duration-200 border-l-4 ${
                            selectedEmail?.id === email.id
                              ? 'bg-blue-100 border-l-blue-500 shadow-sm'
                              : !email.read 
                                ? 'bg-blue-50 border-l-blue-300 hover:bg-blue-100' 
                                : 'bg-gray-50 border-l-gray-300 hover:bg-gray-100'
                          }`}
                  onClick={() => handleEmailSelect(email)}
                >
                  {/* Placeholder for alignment with main threads */}
                  <div className="w-3.5 h-3.5"></div>

                  {/* Email content */}
                  <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs truncate ${!email.read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}`}>
                        {email.sender}
                      </span>
                      {email.hasAttachment && (
                                <Paperclip className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                      )}
                              <span className={`text-xs ml-auto ${!email.read ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{formatPreviewTime(email.time)}</span>
                    </div>
                            <div className={`text-xs truncate ${!email.read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                      {email.preview}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!email.read && (
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0 shadow-sm unread-indicator"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>


              </div>

        {/* Right Panel - Email Content */}
        <div className="flex-1 flex flex-col h-full">
          {replyMode ? (
            <EmailReplyView
              replyData={replyMode}
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              onSend={async (content: string, subject: string, recipients: string[]) => {
                try {
                  // TODO: Implement actual email sending logic here
                  console.log('Sending email:', { content, subject, recipients });
                  
                  // For now, just close the reply interface
                  setReplyMode(null);
                  
                  // You can add your email sending API call here
                  alert('Email sent successfully!');
                } catch (error) {
                  console.error('Error sending email:', error);
                  alert('Failed to send email');
                }
              }}
              onCancel={() => setReplyMode(null)}
            />
          ) : selectedThread ? (
            <EmailThreadViewer 
              thread={selectedThread} 
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              onReply={(email: any) => setReplyMode({ type: 'reply', originalEmail: email, thread: selectedThread })}
              onReplyAll={(email: any) => setReplyMode({ type: 'replyAll', originalEmail: email, thread: selectedThread })}
              onForward={(email: any) => setReplyMode({ type: 'forward', originalEmail: email, thread: selectedThread })}
            />
          ) : selectedEmail ? (
            <EmailViewer 
              email={selectedEmail} 
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              onReply={(email: any) => setReplyMode({ type: 'reply', originalEmail: email })}
              onReplyAll={(email: any) => setReplyMode({ type: 'replyAll', originalEmail: email })}
              onForward={(email: any) => setReplyMode({ type: 'forward', originalEmail: email })}
            />
          ) : (
            <EmptyEmailView />
          )}
        </div>
      </div>
    </div>
  )
} 

// Advanced HTML decoder component
const advancedDecodeHtml = (data: string): string => {
  try {
    console.log('🔧 Advanced HTML decoding started, input length:', data.length);
    
    // 1) Base64-URL → Base64 (advanced padding handling)
    let base64Data = data.replace(/-/g, '+').replace(/_/g, '/');
    
    // Calculate and add proper padding
    const remainder = base64Data.length % 4;
    if (remainder) {
      const padding = '='.repeat(4 - remainder);
      base64Data += padding;
      console.log('📦 Added padding:', padding.length, 'characters');
    }

    // 2) Decode using browser's native atob with error handling
    let decoded: string;
    try {
      const binaryString = atob(base64Data);
      console.log('✅ Base64 decode successful, binary length:', binaryString.length);
      
      // 3) Convert binary string to UTF-8 with advanced error handling
      try {
        // Method 1: Use TextDecoder for proper UTF-8 handling
        const uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
        const textDecoder = new TextDecoder('utf-8', { fatal: false });
        decoded = textDecoder.decode(uint8Array);
        console.log('🌐 UTF-8 decode with TextDecoder successful');
      } catch (textDecoderError) {
        console.warn('⚠️ TextDecoder failed, using fallback method:', textDecoderError);
        // Method 2: Fallback using decodeURIComponent + escape
        decoded = decodeURIComponent(escape(binaryString));
        console.log('🔄 Fallback UTF-8 decode successful');
      }
    } catch (base64Error) {
      console.error('❌ Base64 decode failed:', base64Error);
      const errorMessage = base64Error instanceof Error ? base64Error.message : String(base64Error);
      throw new Error(`Base64 decode failed: ${errorMessage}`);
    }

    console.log('🎉 Advanced HTML decode completed, output length:', decoded.length);
    console.log('📝 HTML content preview (first 200 chars):', decoded.substring(0, 200));
    
    return decoded;
  } catch (error) {
    console.error('💥 Advanced HTML decode error:', error);
    throw error;
  }
};

// Extract and decode HTML content from email parts
const extractHtmlContent = (emailData: any): string => {
  console.log('🔍 Extracting HTML content from email data');
  
  // Check for parts structure first
  if (emailData.payload?.parts && Array.isArray(emailData.payload.parts)) {
    console.log('📦 Found payload.parts, searching for HTML content');
    
    for (const part of emailData.payload.parts) {
      console.log(`🔍 Checking part: ${part.mimeType}, hasData: ${!!part.body?.data}`);
      
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          console.log('🌐 Found HTML part, decoding...');
          const htmlContent = advancedDecodeHtml(part.body.data);
          console.log('✅ HTML content decoded successfully');
          return htmlContent;
        } catch (error) {
          console.error('❌ Failed to decode HTML part:', error);
          continue; // Try next part
        }
      }
      
      // Check for nested multipart structures
      if (part.mimeType?.startsWith('multipart/') && part.parts) {
        for (const nestedPart of part.parts) {
          if (nestedPart.mimeType === 'text/html' && nestedPart.body?.data) {
            try {
              console.log('🌐 Found nested HTML part, decoding...');
              const htmlContent = advancedDecodeHtml(nestedPart.body.data);
              console.log('✅ Nested HTML content decoded successfully');
              return htmlContent;
            } catch (error) {
              console.error('❌ Failed to decode nested HTML part:', error);
              continue;
            }
          }
        }
      }
    }
  }
  
  // Fallback to direct payload body if it's HTML
  if (emailData.payload?.body?.data && emailData.payload?.mimeType === 'text/html') {
    try {
      console.log('📄 Found direct HTML payload, decoding...');
      const htmlContent = advancedDecodeHtml(emailData.payload.body.data);
      console.log('✅ Direct HTML payload decoded successfully');
      return htmlContent;
    } catch (error) {
      console.error('❌ Failed to decode direct HTML payload:', error);
    }
  }
  
  console.log('⚠️ No HTML content found in email data');
  return '';
};

// Advanced HTML sanitisation and rendering
const sanitiseAndRenderHtml = (htmlContent: string): string => {
  if (!htmlContent) return '';
  
  try {
    console.log('🧼 Advanced HTML sanitisation started');
    
    // Advanced DOMPurify configuration for email content
    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      // Allow most HTML tags needed for email
      ALLOWED_TAGS: [
        'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
        'a', 'img', 'hr', 'sub', 'sup', 'small', 'big', 'center',
        'font', 'style' // Some emails use these legacy tags
      ],
      // Allow necessary attributes
      ALLOWED_ATTR: [
        'href', 'src', 'alt', 'title', 'width', 'height', 'style', 'class',
        'target', 'rel', 'border', 'cellpadding', 'cellspacing', 'align',
        'valign', 'bgcolor', 'color', 'size', 'face' // Legacy email attributes
      ],
      // Allow data URIs for embedded images
      ALLOW_DATA_ATTR: false,
      // Keep relative URLs for images
      ALLOW_UNKNOWN_PROTOCOLS: false,
      // Process style attributes
      WHOLE_DOCUMENT: false,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
      // Custom configuration for email content
      ADD_ATTR: ['target'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick'],
      // Keep some email-specific styling
      ADD_TAGS: ['style'],
      KEEP_CONTENT: true
    });
    
    console.log('✅ HTML sanitisation completed');
    console.log('📏 Sanitised HTML length:', cleanHtml.length);
    
    return cleanHtml;
  } catch (error) {
    console.error('❌ HTML sanitisation failed:', error);
    // Return escaped HTML as fallback
    return htmlContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
};

// Empty state component
const EmptyEmailView = () => (
  <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
    <div className="text-center">
      <div className="w-24 h-24 mx-auto mb-4 rounded-md bg-gray-200 flex items-center justify-center">
        <Search className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No Email Selected</h3>
      <p className="text-gray-500 max-w-sm">
        Select an email from the list to view its content here.
      </p>
    </div>
  </div>
);

// Full-panel Email Reply View Component
const EmailReplyView = ({ 
  replyData,
  merchantData,
  userEmail,
  merchantEmail,
  onSend,
  onCancel
}: {
  replyData: { type: 'reply' | 'replyAll' | 'forward', originalEmail: any, thread?: any }
  merchantData: any
  userEmail: string
  merchantEmail: string
  onSend: (content: string, subject: string, recipients: string[]) => void
  onCancel: () => void
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);

  useEffect(() => {
    // Set default subject and recipients based on reply type
    if (replyData.type === 'reply') {
      setSubject(replyData.originalEmail.subject.startsWith('Re: ') ? replyData.originalEmail.subject : `Re: ${replyData.originalEmail.subject}`);
      setRecipients([replyData.originalEmail.email]);
    } else if (replyData.type === 'replyAll') {
      setSubject(replyData.originalEmail.subject.startsWith('Re: ') ? replyData.originalEmail.subject : `Re: ${replyData.originalEmail.subject}`);
      // Add logic to get all recipients (for now, just sender)
      setRecipients([replyData.originalEmail.email]);
    } else if (replyData.type === 'forward') {
      setSubject(replyData.originalEmail.subject.startsWith('Fwd: ') ? replyData.originalEmail.subject : `Fwd: ${replyData.originalEmail.subject}`);
      setRecipients([]);
    }
  }, [replyData]);

  const handleSend = () => {
    if (replyContent.trim()) {
      onSend(replyContent, subject, recipients);
    }
  };

  const getDisplayName = () => {
    switch (replyData.type) {
      case 'reply': return 'Reply'
      case 'replyAll': return 'Reply All'
      case 'forward': return 'Forward'
      default: return 'Compose'
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Reply className="h-5 w-5 text-gray-600" />
            <h1 className="text-base font-medium text-gray-900">{getDisplayName()}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Compose Form */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
              placeholder="Subject"
            />
          </div>
          
          {replyData.type === 'forward' ? (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">To</label>
              <Input
                value={recipients.join(', ')}
                onChange={(e) => setRecipients(e.target.value.split(',').map(r => r.trim()).filter(r => r))}
                className="text-sm"
                placeholder="Enter email addresses"
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">To</label>
              <div className="text-sm text-gray-600 py-2 px-3 bg-gray-50 rounded-md border border-gray-200">
                {recipients.join(', ')}
              </div>
            </div>
          )}

          {/* Compose Textarea */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Message</label>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSend}
              disabled={!replyContent.trim() || (replyData.type === 'forward' && recipients.length === 0)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>

      {/* Thread/Email History Below */}
      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <div className="p-6">
          <div className="text-sm text-gray-500 mb-4 border-b border-gray-200 pb-2">
            Previous messages
          </div>
          
          {replyData.thread ? (
            // Show thread messages
            <div className="space-y-4">
              {replyData.thread.emails.map((email: any, index: number) => (
                <div key={email.id || index} className="border border-gray-200 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{email.sender}</span>
                      <span className="text-xs text-gray-500">&lt;{email.email}&gt;</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatMelbourneTime(email.messageTimestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">{email.subject}</div>
                  <div className="text-sm text-gray-800 leading-relaxed">
                    {email.preview}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Show single email
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{replyData.originalEmail.sender}</span>
                  <span className="text-xs text-gray-500">&lt;{replyData.originalEmail.email}&gt;</span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatMelbourneTime(replyData.originalEmail.messageTimestamp)}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-2">{replyData.originalEmail.subject}</div>
              <div className="text-sm text-gray-800 leading-relaxed">
                {replyData.originalEmail.preview}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Email Reply Interface Component
const EmailReplyInterface = ({ 
  email, 
  replyType, 
  onSend, 
  onCancel,
  userEmail,
  merchantData 
}: {
  email: any;
  replyType: 'reply' | 'replyAll' | 'forward';
  onSend: (content: string, subject: string, recipients: string[]) => void;
  onCancel: () => void;
  userEmail: string;
  merchantData: any;
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [subject, setSubject] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);

  useEffect(() => {
    // Set default subject and recipients based on reply type
    if (replyType === 'reply') {
      setSubject(email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`);
      setRecipients([email.email]);
    } else if (replyType === 'replyAll') {
      setSubject(email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`);
      // Add logic to get all recipients (for now, just sender)
      setRecipients([email.email]);
    } else if (replyType === 'forward') {
      setSubject(email.subject.startsWith('Fwd: ') ? email.subject : `Fwd: ${email.subject}`);
      setRecipients([]);
    }
  }, [email, replyType]);

  const handleSend = () => {
    if (replyContent.trim()) {
      onSend(replyContent, subject, recipients);
    }
  };

  return (
    <div className="border-t border-gray-200 bg-gray-50">
      {/* Reply Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-gray-600" />
            <span className="font-medium text-gray-900 capitalize">{replyType === 'replyAll' ? 'Reply All' : replyType}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Reply Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
              placeholder="Subject"
            />
          </div>
          
          {replyType === 'forward' && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">To</label>
              <Input
                value={recipients.join(', ')}
                onChange={(e) => setRecipients(e.target.value.split(',').map(r => r.trim()).filter(r => r))}
                className="text-sm"
                placeholder="Enter email addresses"
              />
            </div>
          )}
          
          {replyType !== 'forward' && (
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">To</label>
              <div className="text-sm text-gray-600 py-2">{recipients.join(', ')}</div>
            </div>
          )}
        </div>
      </div>

      {/* Reply Content */}
      <div className="p-4">
        <Textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[150px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        
        {/* Reply Actions */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            onClick={handleSend}
            disabled={!replyContent.trim() || (replyType === 'forward' && recipients.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

// Single email viewer component
const EmailViewer = ({ email, merchantData, userEmail, merchantEmail, onReply, onReplyAll, onForward }: {
  email: any;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  onReply?: (email: any) => void;
  onReplyAll?: (email: any) => void;
  onForward?: (email: any) => void;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);

  useEffect(() => {
    const loadEmailContent = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (email.rawData) {
          // Extract and decode HTML content
          const extractedHtml = extractHtmlContent(email.rawData);
          if (extractedHtml) {
            const sanitisedHtml = sanitiseAndRenderHtml(extractedHtml);
            setHtmlContent(sanitisedHtml);
          } else {
            // Fallback to existing content
            setHtmlContent(email.content || 'No content available');
          }
        } else {
          setHtmlContent(email.content || 'No content available');
        }
      } catch (error) {
        console.error('Error loading email content:', error);
        setError('Failed to load email content');
        setHtmlContent(email.content || 'Error loading content');
      } finally {
        setLoading(false);
      }
    };

    loadEmailContent();
  }, [email]);

  const isFromCurrentUser = isEmailFromCurrentUser(email.email, userEmail, merchantEmail);

  const handleSendReply = async (content: string, subject: string, recipients: string[]) => {
    try {
      // TODO: Implement actual email sending logic here
      console.log('Sending reply:', { content, subject, recipients });
      
      // For now, just close the reply interface
      setReplyMode(null);
      
      // You can add your email sending API call here
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };

  const handleCancelReply = () => {
    setReplyMode(null);
  };

     return (
     <div className="flex flex-col h-full">
       {/* Email Header */}
       <div className="p-6 bg-white">
         <div className="flex items-center justify-between mb-4">
           <h1 className="text-base font-medium text-gray-900">{email.subject}</h1>
           <div className="flex items-center gap-2">
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 hover:bg-gray-100"
                     onClick={() => onReply?.(email)}
                   >
                     <Reply className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Reply</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
             
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 hover:bg-gray-100"
                     onClick={() => onReplyAll?.(email)}
                   >
                     <ReplyAll className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Reply All</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
             
             <TooltipProvider>
               <Tooltip>
                 <TooltipTrigger asChild>
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-8 w-8 p-0 hover:bg-gray-100"
                     onClick={() => onForward?.(email)}
                   >
                     <Forward className="h-4 w-4" />
                   </Button>
                 </TooltipTrigger>
                 <TooltipContent>
                   <p>Forward</p>
                 </TooltipContent>
               </Tooltip>
             </TooltipProvider>
           </div>
         </div>
         <div className="flex items-start justify-between">
           <div className="flex items-center gap-3">
             <Avatar className="h-8 w-8">
               <AvatarImage src={merchantData?.logoUrl} />
               <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-sm">
                 {email.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
               </AvatarFallback>
             </Avatar>
             <div>
               <div className="flex items-center gap-2">
                 <h2 className="font-medium text-gray-900 text-sm">{email.sender}</h2>
                 {isFromCurrentUser && (
                   <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                     <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                     You
                   </span>
                 )}
               </div>
               <p className="text-xs text-gray-600">{email.email}</p>
             </div>
           </div>
           <div className="text-right">
             <p className="text-sm text-gray-600">{formatMelbourneTime(email.time, 'Unknown time')}</p>
             {email.hasAttachment && (
               <div className="flex items-center gap-1 mt-1">
                 <Paperclip className="h-3 w-3 text-gray-400" />
                 <span className="text-xs text-gray-500">Attachment</span>
               </div>
             )}
           </div>
         </div>
       </div>

       {/* Email Content */}
       <div className="flex-1 overflow-auto p-6 pb-8 bg-white custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-600">Loading email content...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-md bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Error Loading Content</h3>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            <div 
              className="email-content"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                lineHeight: '1.5',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                fontSize: '15px'
              }}
            />
          </div>
        )}
      </div>

      {/* Reply Interface */}
      {replyMode && (
        <EmailReplyInterface
          email={email}
          replyType={replyMode}
          onSend={handleSendReply}
          onCancel={handleCancelReply}
          userEmail={userEmail}
          merchantData={merchantData}
        />
      )}
    </div>
  );
};

// Thread viewer component
const EmailThreadViewer = ({ thread, merchantData, userEmail, merchantEmail, onReply, onReplyAll, onForward }: {
  thread: any;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  onReply?: (email: any) => void;
  onReplyAll?: (email: any) => void;
  onForward?: (email: any) => void;
}) => {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set([thread.emails[0]?.id]));
  const [replyMode, setReplyMode] = useState<'reply' | 'replyAll' | 'forward' | null>(null);

  const toggleEmailExpansion = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const handleSendReply = async (content: string, subject: string, recipients: string[]) => {
    try {
      // TODO: Implement actual email sending logic here
      console.log('Sending thread reply:', { content, subject, recipients });
      
      // For now, just close the reply interface
      setReplyMode(null);
      
      // You can add your email sending API call here
      alert('Reply sent successfully!');
    } catch (error) {
      console.error('Error sending reply:', error);
      alert('Failed to send reply');
    }
  };

  const handleCancelReply = () => {
    setReplyMode(null);
  };

  // Get the most recent email for replying
  const mostRecentEmail = thread.emails[thread.emails.length - 1];

  return (
    <div className="flex flex-col h-full">
      {/* Thread Header */}
      <div className="border-b border-gray-200 p-6 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-semibold text-gray-900">{thread.representative.subject}</h1>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
              <Users className="h-3 w-3" />
              {thread.count} messages
            </span>
            
            {/* Thread Reply Actions */}
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => onReply?.(mostRecentEmail)}
                    >
                      <Reply className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reply</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => onReplyAll?.(mostRecentEmail)}
                    >
                      <ReplyAll className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reply All</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => onForward?.(mostRecentEmail)}
                    >
                      <Forward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Forward</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          Conversation with {thread.emails.map((e: any) => e.sender).filter((v: any, i: number, a: any[]) => a.indexOf(v) === i).join(', ')}
        </p>
      </div>

      {/* Thread Messages */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="divide-y divide-gray-200 pb-8">
          {thread.emails.map((email: any, index: number) => (
            <EmailInThread
              key={email.id}
              email={email}
              isExpanded={expandedEmails.has(email.id)}
              onToggleExpansion={() => toggleEmailExpansion(email.id)}
              merchantData={merchantData}
              userEmail={userEmail}
              merchantEmail={merchantEmail}
              isFirst={index === 0}
              isLast={index === thread.emails.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Thread Reply Interface */}
      {replyMode && (
        <EmailReplyInterface
          email={mostRecentEmail}
          replyType={replyMode}
          onSend={handleSendReply}
          onCancel={handleCancelReply}
          userEmail={userEmail}
          merchantData={merchantData}
        />
      )}
    </div>
  );
};

// Individual email in thread component
const EmailInThread = ({ email, isExpanded, onToggleExpansion, merchantData, userEmail, merchantEmail, isFirst, isLast }: {
  email: any;
  isExpanded: boolean;
  onToggleExpansion: () => void;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  isFirst: boolean;
  isLast: boolean;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const isFromCurrentUser = isEmailFromCurrentUser(email.email, userEmail, merchantEmail);

  useEffect(() => {
    if (isExpanded) {
      const loadEmailContent = async () => {
        try {
          setLoading(true);
          setError('');
          
          if (email.rawData) {
            // Extract and decode HTML content
            const extractedHtml = extractHtmlContent(email.rawData);
            if (extractedHtml) {
              const sanitisedHtml = sanitiseAndRenderHtml(extractedHtml);
              setHtmlContent(sanitisedHtml);
            } else {
              // Fallback to existing content
              setHtmlContent(email.content || 'No content available');
            }
          } else {
            setHtmlContent(email.content || 'No content available');
          }
        } catch (error) {
          console.error('Error loading email content:', error);
          setError('Failed to load email content');
          setHtmlContent(email.content || 'Error loading content');
        } finally {
          setLoading(false);
        }
      };

      loadEmailContent();
    }
  }, [isExpanded, email]);

  return (
    <div className={`${isFirst ? '' : 'border-t border-gray-200'}`}>
      {/* Email Header */}
      <div 
        className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200"
        onClick={onToggleExpansion}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-600">
            <ChevronRight 
              className={`h-4 w-4 transition-transform duration-200 ease-out ${
                isExpanded ? 'rotate-90' : 'rotate-0'
              }`} 
            />
          </button>
          
          <Avatar className="h-8 w-8">
            <AvatarImage src={merchantData?.logoUrl} />
            <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-sm">
              {email.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{email.sender}</span>
              {isFromCurrentUser && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                  <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                  You
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{email.email}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm text-gray-600">{formatMelbourneTime(email.time, 'Unknown time')}</p>
          {email.hasAttachment && (
            <div className="flex items-center gap-1 mt-1">
              <Paperclip className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">Attachment</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Email Content */}
      {isExpanded && (
        <div className="px-4 pb-6">
          <div className="bg-gray-50 rounded-md p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-gray-400 mr-2" />
                <span className="text-gray-600">Loading content...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="w-10 h-10 mx-auto mb-3 rounded-md bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
                         ) : (
               <div className="prose max-w-none">
                 <div 
                   className="email-content"
                   dangerouslySetInnerHTML={{ __html: htmlContent }}
                   style={{
                     lineHeight: '1.5',
                     fontFamily: 'system-ui, -apple-system, sans-serif',
                     wordWrap: 'break-word',
                     overflowWrap: 'break-word',
                     fontSize: '14px'
                   }}
                 />
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}; 