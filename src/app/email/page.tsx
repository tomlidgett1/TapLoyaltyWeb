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
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import {
  Search, 
  Mail, 
  Plus, 
  User, 
  Settings, 
  ChevronLeft, 
  Reply, 
  Forward, 
  MoreHorizontal,
  Paperclip,
  ReplyAll,
  ArrowLeft,
  ArrowRight,
  Inbox,
  Edit3,
  Shield,
  Check,
  Send,
  RefreshCw,
  Bug,
  ChevronRight,
  ChevronUp,
  Bell,
  ChevronDown,
  Users,
  X,
  Eye,
  AlertCircle,
  Palette,
  Lightbulb,
  Wand2,
  Sparkles,
  UploadCloud,
  Download,
  FilePlus,
  FileText,
  FileImage,
  Loader2,
  MessageSquare,
  WandSparkles,
  Info,
  Archive,
  Trash2,
  File,
  Image as ImageIcon,
  FileVideo,
  FileAudio
} from "lucide-react"
import React, { useState, useEffect, useRef } from "react"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import GradientText from "@/components/GradientText"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { formatMelbourneTime } from "@/lib/date-utils"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"

// Extract attachments from email data
const extractAttachments = (email: any): any[] => {
  try {
    // Check for attachments in rawData.payload.data.attachment_list
    if (email.rawData?.payload?.data?.attachment_list) {
      return email.rawData.payload.data.attachment_list;
    }
    
    // Check for attachments in payload.data.attachment_list (alternative structure)
    if (email.payload?.data?.attachment_list) {
      return email.payload.data.attachment_list;
    }
    
    // Check for attachments in direct attachment_list field
    if (email.attachment_list) {
      return email.attachment_list;
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting attachments:', error);
    return [];
  }
};

// Get appropriate icon for file type
const getFileIcon = (mimeType: string, filename: string) => {
  const lowerMimeType = mimeType.toLowerCase();
  const lowerFilename = filename.toLowerCase();
  
  // Image files
  if (lowerMimeType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4 text-gray-500" />;
  }
  
  // Video files
  if (lowerMimeType.startsWith('video/')) {
    return <FileVideo className="h-4 w-4 text-gray-500" />;
  }
  
  // Audio files
  if (lowerMimeType.startsWith('audio/')) {
    return <FileAudio className="h-4 w-4 text-gray-500" />;
  }
  
  // Document files (PDF, Word, etc.)
  if (lowerMimeType.includes('pdf') || 
      lowerMimeType.includes('word') || 
      lowerMimeType.includes('document') ||
      lowerFilename.endsWith('.pdf') ||
      lowerFilename.endsWith('.doc') ||
      lowerFilename.endsWith('.docx')) {
    return <FileText className="h-4 w-4 text-gray-500" />;
  }
  
  // Text files
  if (lowerMimeType.startsWith('text/') || 
      lowerFilename.endsWith('.txt') ||
      lowerFilename.endsWith('.csv')) {
    return <FileText className="h-4 w-4 text-gray-500" />;
  }
  
  // Default file icon
  return <File className="h-4 w-4 text-gray-500" />;
};

// Format file size
const formatFileSize = (sizeInBytes: number): string => {
  if (!sizeInBytes) return '';
  
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = sizeInBytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

// Simple Attachment Display for header
const CompactAttachmentList = ({ attachments }: { attachments: any[] }) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleAttachmentClick = (attachment: any) => {
    if (attachment.s3url) {
      // Open the s3url in a new tab
      window.open(attachment.s3url, '_blank');
    } else {
      console.warn('No s3url found for attachment:', attachment);
    }
  };
  
  return (
    <div className="mt-2 ml-4">
      {attachments.map((attachment, index) => (
        <button
          key={attachment.attachmentId || index}
          onClick={() => handleAttachmentClick(attachment)}
          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-600 transition-colors cursor-pointer mr-1"
          title={`Open ${attachment.filename || 'attachment'}`}
        >
          <Paperclip className="h-3 w-3" />
          <span>{attachment.filename || 'Unknown file'}</span>
        </button>
      ))}
    </div>
  );
};



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

// Utility function to convert files to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:mime/type;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

// Notification interface
interface Notification {
  id: string
  message: string
  type: string
  customerId?: string
  dateCreated?: Date
  idSuffix?: string
  timestamp: Date
  read: boolean
  customerFirstName?: string
  customerFullName?: string
  customerProfilePictureUrl?: string
}

// Utility function to create quoted reply content with HTML formatting
const createQuotedReplyContent = (originalEmail: any, replyType: 'reply' | 'replyAll' | 'forward') => {
  // Format date in Outlook style (e.g., "Saturday, 19 July 2025 at 10:41 am")
  const formatOutlookDate = (timestamp: any) => {
    try {
      let date: Date;
      if (timestamp && typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else {
        return 'Unknown time';
      }
      
      return date.toLocaleDateString('en-AU', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Melbourne'
      }).replace(' at ', ' at ');
    } catch (error) {
      return 'Unknown time';
    }
  };

  const dateStr = formatOutlookDate(originalEmail.repliedAt || originalEmail.receivedAt || originalEmail.time);
  
  // Preserve HTML content but clean it for quoting - use htmlMessage field
  let htmlContent = originalEmail.htmlMessage || originalEmail.content || '';
  
  // If content is not HTML, wrap it in paragraphs
  if (!htmlContent.includes('<') || !htmlContent.includes('>')) {
    // Plain text content - convert line breaks to paragraphs
    htmlContent = htmlContent.split('\n').filter((line: string) => line.trim()).map((line: string) => `<p>${line.trim()}</p>`).join('');
  }
  
  // Create HTML quoted content with Outlook-style header (4 lines)
  const quotedContent = `<div style="margin-top: 20px;">
<div style="padding-left: 15px; margin: 10px 0; color: #666;">
<div style="font-size: 16px; color: #888; margin-bottom: 15px; line-height: 1.4;">
<strong>From:</strong> ${originalEmail.sender} &lt;${originalEmail.email}&gt;<br>
<strong>Date:</strong> ${dateStr}<br>
<strong>To:</strong> ${originalEmail.to || 'Unknown Recipient'}<br>
<strong>Subject:</strong> ${originalEmail.subject || 'No Subject'}
</div>
${htmlContent}
</div>
</div>`;

  return quotedContent;
};

// IframeEmail component for safe HTML rendering
type IframeEmailProps = { html: string; className?: string };

const IframeEmail = ({ html, className = "" }: IframeEmailProps) => {
  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  return (
    <iframe
      className={`email-iframe border-0 w-full min-h-[200px] ${className}`}
      sandbox="allow-same-origin allow-top-navigation-by-user-activation allow-popups allow-popups-to-escape-sandbox"
      srcDoc={`<!doctype html>
        <html>
        <head>
          <base target="_blank">
          <style>
            body { 
              margin: 0; 
              padding: 16px;
              font-family: system-ui, -apple-system, sans-serif;
              line-height: 1.5;
              word-wrap: break-word;
              overflow-wrap: break-word;
              font-size: 15px;
            }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; }
            a { 
              color: #2563eb; 
              cursor: pointer;
              text-decoration: underline;
            }
            a:hover {
              color: #1d4ed8;
              text-decoration: underline;
            }
          </style>
        </head>
        <body>${clean}</body>
        </html>`}
      onLoad={(e) => {
        // Auto-resize iframe to content height
        const iframe = e.target as HTMLIFrameElement;
        if (iframe.contentDocument) {
          const height = iframe.contentDocument.documentElement.scrollHeight;
          iframe.style.height = `${Math.max(height, 200)}px`;
        }
      }}
    />
  );
};

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

// Format time for preview display using Melbourne time
const formatPreviewTime = (timestamp: any) => {
  if (!timestamp) return 'Unknown time'
  
  try {
    // Handle Firestore timestamp format
    let dateToFormat: string | Date
    
    if (timestamp && typeof timestamp.toDate === 'function') {
      // Firestore timestamp - convert to Date
      dateToFormat = timestamp.toDate()
    } else if (timestamp && typeof timestamp === 'string') {
      // String timestamp
      dateToFormat = timestamp
    } else if (timestamp instanceof Date) {
      // Already a Date object
      dateToFormat = timestamp
    } else {
      console.warn('Unknown timestamp format:', timestamp)
      return 'Invalid time'
    }
    
    // Use the same Melbourne time formatting as formatMelbourneTime
    return formatMelbourneTime(dateToFormat, 'Invalid time')
  } catch (e) {
    console.error('Error formatting preview time:', timestamp, e)
    return 'Invalid time'
  }
}

export default function EmailPage() {
  const { user } = useAuth()
  
  // Firebase function for generating email responses
  const generateEmailResponse = httpsCallable(functions, 'generateEmailResponse');
  
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

  const [merchantData, setMerchantData] = useState<any>(null)
  const [merchantEmail, setMerchantEmail] = useState("")
  const [decodeTestResults, setDecodeTestResults] = useState<any>(null)
  const [showDecodeResults, setShowDecodeResults] = useState(false)
  
  // Track which threads are expanded in the left panel to show individual emails
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  
  // Track if current selectedEmail was selected from dropdown (should highlight) vs auto-selected from thread (should not highlight)
  const [selectedEmailFromDropdown, setSelectedEmailFromDropdown] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  // Panel resizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(35) // Percentage
  const [isDragging, setIsDragging] = useState(false)
  
  // Panel resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    e.preventDefault()
  }
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    const container = document.querySelector('.main-panels-container')
    if (!container) return
    
    const containerRect = container.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    // Constrain between 20% and 80%
    const constrainedWidth = Math.min(Math.max(newLeftWidth, 20), 80)
    setLeftPanelWidth(constrainedWidth)
  }
  
  const handleMouseUp = () => {
    setIsDragging(false)
  }
  
  // Add mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = 'none'
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.userSelect = ''
      }
    }
  }, [isDragging])

  // Function to summarize email thread
  const summarizeThread = async (thread: any) => {
    if (!thread || !user?.uid) return;
    
    setIsSummarizing(true);
    try {
      // Prepare thread content for summarization
      const threadContent = thread.emails.map((email: any) => ({
        sender: email.sender,
        to: email.to,
        subject: email.subject,
        content: email.content || email.htmlMessage || 'No content',
        timestamp: email.time || email.receivedAt || email.repliedAt
      }));

      const summaryResponse = await generateEmailResponse({
        requestType: 'summarize',
        threadContent: threadContent,
        threadSubject: thread.representative.subject,
        merchantId: user.uid
      });

      if (summaryResponse.data && typeof summaryResponse.data === 'object' && 'summary' in summaryResponse.data) {
        setThreadSummary((summaryResponse.data as any).summary);
      }
    } catch (error) {
      console.error('Error summarizing thread:', error);
    } finally {
      setIsSummarizing(false);
    }
  };
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isComposing, setIsComposing] = useState(false)
  const [isEnablingTrigger, setIsEnablingTrigger] = useState(false)
  
  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)

  // Tap Agent state
  const [tapAgentMode, setTapAgentMode] = useState<'full-response' | 'instructions' | 'tone' | null>(null)
  const [tapAgentInstructions, setTapAgentInstructions] = useState('')
  const [emailRules, setEmailRules] = useState('')
  const [threadSummary, setThreadSummary] = useState('')
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [showEmailRulesDialog, setShowEmailRulesDialog] = useState(false)
  const [tempEmailRules, setTempEmailRules] = useState('')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Helper function to call generateEmailResponse with proper error handling
  const callGenerateEmailResponse = async (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => {
    if (!user?.uid) {
      console.error('User not authenticated');
      return;
    }

    const editorRef = replyEditor || { current: null };
    const currentEmailContent = editorRef.current?.innerHTML || '';
    if (!currentEmailContent.trim()) {
      console.error('No email content to improve');
      return;
    }

    setIsGenerating(true);
    
    // Show generating text in the compose area
    if (editorRef.current) {
      // Create and show generating indicator in the compose area
      const generatingDiv = document.createElement('div');
      generatingDiv.id = 'ai-generating-indicator';
      generatingDiv.className = 'absolute inset-0 bg-white/98 backdrop-blur-md flex items-center justify-center z-10 rounded-md border-2 border-blue-200';
      generatingDiv.innerHTML = `
        <div class="flex flex-col items-center gap-4 px-8 py-6 bg-white rounded-lg shadow-lg border border-gray-200" style="min-width: 280px;">
          <!-- Pulsing AI Icon -->
          <div class="relative">
            <div class="w-8 h-8 rounded-full" style="background: linear-gradient(45deg, #ff6b35, #4079ff); animation: gradient 2s linear infinite;"></div>
            <div class="absolute inset-0 w-8 h-8 rounded-full animate-ping" style="background: linear-gradient(45deg, #ff6b35, #4079ff); opacity: 0.4;"></div>
          </div>
          
          <!-- Animated Text -->
          <span style="background: linear-gradient(45deg, #ff6b35, #4079ff, #ff8500, #3b82f6, #ff6b35); background-size: 300% 100%; background-clip: text; -webkit-background-clip: text; color: transparent; animation: gradient 3s linear infinite; font-weight: 600; font-size: 16px; letter-spacing: 0.5px;">
            Generating response...
          </span>
          
          <!-- Skeleton Lines -->
          <div class="w-full space-y-2 mt-2">
            <div class="h-3 rounded-md animate-pulse" style="background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6); background-size: 200% 100%; animation: shimmer 2s infinite;"></div>
            <div class="h-3 rounded-md animate-pulse" style="background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6); background-size: 200% 100%; animation: shimmer 2s infinite; width: 80%;"></div>
            <div class="h-3 rounded-md animate-pulse" style="background: linear-gradient(90deg, #f3f4f6, #e5e7eb, #f3f4f6); background-size: 200% 100%; animation: shimmer 2s infinite; width: 60%;"></div>
          </div>
        </div>
      `;
      
      // Add to the parent container of the editor (so it overlays the compose area)
      const editorContainer = editorRef.current.parentElement;
      if (editorContainer) {
        // Make sure the container has relative positioning for absolute overlay
        editorContainer.style.position = 'relative';
        editorContainer.appendChild(generatingDiv);
        console.log('✨ Showing AI generating indicator in compose area');
      }
    }

    try {
      console.log('Calling generateEmailResponse with:', { requestType, tone, customInstructions });
      
      const response = await generateEmailResponse({
        merchantId: user.uid,
        requestType,
        tone: tone || null,
        customInstructions: customInstructions || null,
        emailRules: emailRules || null,
        email: currentEmailContent
      }) as { data?: { response?: string } };

      console.log('Generated response:', response.data);

      // Update only the reply compose area with the generated content
      if (editorRef.current && response.data?.response) {
        const replyEditor = editorRef.current;
        
        // Double-check we have the right element (should be contenteditable)
        if (replyEditor.getAttribute('contenteditable') === 'true' || replyEditor.isContentEditable) {
          console.log('Updating compose area with AI response - preserving email thread');
          
          // Get current content and find the separator between compose and quoted content
          const currentHTML = replyEditor.innerHTML;
          const hrIndex = currentHTML.indexOf('<hr');
          
          if (hrIndex !== -1) {
            // Preserve everything from the <hr> onwards (quoted email thread)
            const quotedContent = currentHTML.substring(hrIndex);
            
            // Create new content with AI response in compose area + preserved quoted content
            const newContent = `<div>${response.data.response}</div>${quotedContent}`;
            replyEditor.innerHTML = newContent;
            
            console.log('AI response applied to compose area only - quoted emails preserved');
          } else {
            // No quoted content found, safe to replace entire content
            replyEditor.innerHTML = `<div>${response.data.response}</div>`;
            console.log('AI response applied - no quoted content to preserve');
          }
          
          // Focus the editor and position cursor at the end of compose area (before quoted content)
          replyEditor.focus();
          
          // Find the first child (compose area) and set cursor there
          const firstChild = replyEditor.firstChild;
          if (firstChild) {
            const range = document.createRange();
            const selection = window.getSelection();
            
            // Set cursor at end of first div (compose area)
            if (firstChild.nodeType === Node.ELEMENT_NODE) {
              range.selectNodeContents(firstChild);
              range.collapse(false); // Collapse to end
            } else {
              range.setStart(firstChild, firstChild.textContent?.length || 0);
              range.collapse(true);
            }
            
            selection?.removeAllRanges();
            selection?.addRange(range);
          }
          
        } else {
          console.error('Invalid target element - not updating to prevent affecting email thread');
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error generating email response:', error);
      // You might want to show a user-friendly error message here
    } finally {
      setIsGenerating(false);
      
      // Remove generating indicator
      const generatingIndicator = document.getElementById('ai-generating-indicator');
      if (generatingIndicator) {
        generatingIndicator.remove();
        console.log('✅ Generating indicator removed');
      }
    }
  };

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Toggle thread expansion in left panel
  const toggleThreadExpansion = (threadId: string) => {
    setExpandedThreads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(threadId)) {
        newSet.delete(threadId);
      } else {
        newSet.add(threadId);
      }
      return newSet;
    });
  };

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
        let timeA: Date
        let timeB: Date
        
        // Handle different timestamp formats
        if (typeof a.time === 'string') {
          timeA = new Date(a.time)
        } else if (a.time && typeof a.time.toDate === 'function') {
          timeA = a.time.toDate()
        } else {
          timeA = new Date(a.time || 0)
        }
        
        if (typeof b.time === 'string') {
          timeB = new Date(b.time)
        } else if (b.time && typeof b.time.toDate === 'function') {
          timeB = b.time.toDate()
        } else {
          timeB = new Date(b.time || 0)
        }
        
        return timeB.getTime() - timeA.getTime()
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

  // Fetch Gmail threads from the new Firestore structure
  const fetchGmailEmails = async () => {
    if (!user?.uid) return

    try {
      setEmailsLoading(true)
      console.log("Fetching Gmail threads from new Firestore structure for merchant:", user.uid)
      
      // Query the thread documents from merchants/merchantId/fetchedemails/
      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      
      const threadsQuery = query(
        threadsRef,
        orderBy('updatedAt', 'desc'),
        limit(50) // Limit to 50 threads
      )
      
      console.log("🔍 Querying thread containers from:", `merchants/${user.uid}/fetchedemails`)
      
      const threadsSnapshot = await getDocs(threadsQuery)
      
      console.log(`📊 Found ${threadsSnapshot.size} threads in new Firestore structure`)
      console.log("🔍 Thread documents:", threadsSnapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })))
      
      // Transform thread documents into thread objects for the left panel
      const transformedThreads = await Promise.all(threadsSnapshot.docs.map(async (doc) => {
        const threadData = doc.data()
        console.log("Processing thread:", doc.id, threadData)
        
        // Use thread metadata for the list view
        const threadId = threadData.threadId || doc.id
        const subject = threadData.subject || "No Subject"
        const latestSender = threadData.latestSender || "Unknown Sender"
        const latestReceivedAt = threadData.latestReceivedAt
        
        // Query the chain subcollection to get actual message count and check for attachments
        let messageCount = 1;
        let hasAttachment = false;
        try {
          const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain')
          const chainSnapshot = await getDocs(chainRef)
          messageCount = chainSnapshot.size || 1
          
          // Check if any email in the chain has attachments
          hasAttachment = chainSnapshot.docs.some(doc => {
            const messageData = doc.data();
            return extractAttachments(messageData).length > 0;
          });
          
          console.log(`📊 Thread ${threadId}: Found ${messageCount} messages in chain subcollection, hasAttachment: ${hasAttachment}`)
        } catch (error) {
          console.error(`Error querying chain for thread ${threadId}:`, error)
          messageCount = 1 // Fallback to 1 if query fails
          hasAttachment = false // Fallback to false if query fails
        }
        
        // Parse latest sender name and email
        let senderName = latestSender
        let senderEmail = ""
        
        const emailMatch = latestSender.match(/<([^>]+)>/)
        if (emailMatch) {
          senderEmail = emailMatch[1]
          senderName = latestSender.replace(/<[^>]+>/, '').trim()
        } else if (latestSender.includes('@')) {
          senderEmail = latestSender
          senderName = latestSender
        }
        
        // Create thread object for left panel display
        const threadObj = {
          id: threadId,
          threadId: threadId,
          sender: senderName,
          email: senderEmail,
          subject: subject,
          preview: `Thread with ${messageCount} message${messageCount > 1 ? 's' : ''}`,
          content: "Click to view thread messages",
          time: latestReceivedAt,
          read: false, // All emails start as unread
          hasAttachment: hasAttachment,
          folder: "inbox",
          isThread: true,
          count: messageCount,
          unreadCount: 0, // Will be calculated when loading chain messages
          hasUnread: false,
          rawData: threadData
        }
        
        console.log("📧 Processed thread object:", {
          id: threadObj.id,
          threadId: threadObj.threadId,
          sender: threadObj.sender,
          subject: threadObj.subject,
          messageCount: messageCount
        });
        
        return threadObj;
      }))
        
            // Sort threads by latest activity (newest first)
      const sortedThreads = transformedThreads.sort((a, b) => {
        let timeA: Date
        let timeB: Date
        
        // Handle different timestamp formats
        if (typeof a.time === 'string') {
          timeA = new Date(a.time)
        } else if (a.time && typeof a.time.toDate === 'function') {
          timeA = a.time.toDate()
        } else {
          timeA = new Date(a.time || 0)
        }
        
        if (typeof b.time === 'string') {
          timeB = new Date(b.time)
        } else if (b.time && typeof b.time.toDate === 'function') {
          timeB = b.time.toDate()
        } else {
          timeB = new Date(b.time || 0)
        }
        
        return timeB.getTime() - timeA.getTime() // Newest first
      })
        
      console.log("All threads sorted by latest activity:", sortedThreads)
      setFetchedEmails(sortedThreads) // Using the same state variable for consistency
      
      // Store debug response
      setDebugResponse({
        success: true,
        threadsFetched: sortedThreads.length,
        source: 'firestore-threads',
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
      
      // Initial fetch of emails
      console.log("🚀 Initial fetch of Gmail threads on component mount")
      fetchGmailEmails()
      
      // Set up Firestore listener for real-time thread updates
      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const threadsQuery = query(
        threadsRef,
        orderBy('updatedAt', 'desc'),
        limit(50)
      )
      
      console.log("📡 Setting up Firestore listener for real-time thread updates")
      console.log("📡 Listener path:", `merchants/${user.uid}/fetchedemails`)
      const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
        console.log(`📡 Firestore listener: ${snapshot.size} threads found, ${snapshot.docChanges().length} changes`)
        
        // Log the changes for debugging
        snapshot.docChanges().forEach((change) => {
          console.log(`📡 Change type: ${change.type}, doc: ${change.doc.id}`)
        })
        
        // Only refresh if there are actual changes (new threads, modifications, etc.)
        if (snapshot.docChanges().length > 0) {
          console.log("📡 Thread changes detected, refreshing thread list")
          fetchGmailEmails()
        }
      }, (error) => {
        console.error("❌ Error in Firestore listener:", error)
      })
      
      // Cleanup function
      return () => {
        console.log("🧹 Cleaning up Firestore listener")
        unsubscribe()
      }
    }
  }, [user?.uid])

  // Fetch notifications from Firestore
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.uid) return
      
      try {
        setNotificationsLoading(true)
        
        // Create reference to merchant's notifications collection
        const notificationsRef = collection(db, 'merchants', user.uid, 'notifications')
        const notificationsQuery = query(
          notificationsRef,
          orderBy('dateCreated', 'desc'),
          limit(10)
        )
        
        const notificationsSnapshot = await getDocs(notificationsQuery)
        
        // Get notifications data
        const notificationsData = notificationsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            message: data.message || 'No message provided',
            type: data.type || 'INFO',
            customerId: data.customerId,
            dateCreated: data.dateCreated?.toDate(),
            timestamp: data.dateCreated?.toDate() || new Date(),
            read: data.read || false
          }
        })
        
        setNotifications(notificationsData)
        setUnreadCount(notificationsData.filter(n => !n.read).length)
      } catch (error) {
        console.error('Error fetching notifications:', error)
        // Set fallback notifications if there's an error
        const fallbackNotifications: Notification[] = [
          {
            id: "fallback-1",
            message: "Welcome to your email dashboard",
            timestamp: new Date(),
            read: false,
            type: "INFO"
          }
        ]
        setNotifications(fallbackNotifications)
        setUnreadCount(1)
      } finally {
        setNotificationsLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchNotifications()
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
    console.log("Refreshing emails from Firestore...")
    // Refresh email list from Firestore index
    fetchGmailEmails()
  }

  // Mark email as read in Firestore
  const markEmailAsRead = async (emailId: string, threadId?: string) => {
    if (!user?.uid) return

    // Skip marking sent messages as read (they're locally generated and don't exist in Firestore)
    if (emailId.startsWith('sent-')) {
      console.log("Skipping read status update for locally generated sent message:", emailId)
      return
    }

    try {
      let emailRef;
      
      if (threadId) {
        // Email is in a thread's chain subcollection
        emailRef = doc(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain', emailId)
        console.log("Marking thread email as read:", emailId, "in thread:", threadId)
      } else {
        // Email is in the main fetchedemails collection
        emailRef = doc(db, 'merchants', user.uid, 'fetchedemails', emailId)
        console.log("Marking individual email as read:", emailId)
      }
      
      await updateDoc(emailRef, {
        read: true
      })
      console.log("Successfully marked email as read:", emailId)
    } catch (error) {
      console.error("Error marking email as read:", error)
      console.error("Email ID:", emailId, "Thread ID:", threadId)
    }
  }

  const handleEnableGmailTrigger = async () => {
    if (!user?.uid) {
      alert('User not authenticated')
      return
    }

    try {
      setIsEnablingTrigger(true)
      console.log("Enabling Gmail trigger for merchant:", user.uid)
      
      // Use Firebase SDK to avoid CORS issues - data gets wrapped in req.body.data
      const enrollGmailTriggerFunction = httpsCallable(functions, 'enrollGmailTrigger')
      const result = await enrollGmailTriggerFunction({
        merchantId: user.uid
      })
      
      console.log("Gmail trigger enabled successfully:", result.data)
      setSuccessMessage('Gmail trigger enabled successfully! You will now receive real-time email notifications.')
      
    } catch (error) {
      console.error("Error enabling Gmail trigger:", error)
      
      let errorMessage = 'Failed to enable Gmail trigger'
      if (error instanceof Error) {
        if (error.message.includes('Gmail connection')) {
          errorMessage = 'Please check your Gmail connection in Settings > Integrations'
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication error. Please try signing in again.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsEnablingTrigger(false)
    }
  }

  const handleComposeNew = () => {
    // Clear any current selections and enter compose mode
    setSelectedEmail(null);
    setSelectedThread(null);
    setReplyMode(null);
    setIsComposing(true);
  }



  const handleEmailSelect = (email: any, fromDropdown: boolean = false) => {
    setSelectedEmail(email)
    setSelectedEmailFromDropdown(fromDropdown)
    
    if (!fromDropdown) {
      // Only clear thread selection if this email is NOT part of the current thread
      // This keeps the dropdown open when clicking emails from the dropdown
      if (!email.threadId || selectedThread?.threadId !== email.threadId) {
        // Clear expansion state for the current thread when switching away
        if (selectedThread) {
          setExpandedThreads(prev => {
            const newSet = new Set(prev);
            newSet.delete(selectedThread.threadId);
            return newSet;
          });
        }
        setSelectedThread(null)
      }
    }
    // Note: when fromDropdown is true, we keep selectedThread to keep dropdown open
    
    // Mark email as read when selected and update local state
    email.read = true
    
    // Update local fetchedEmails state to mark this specific email as read
    setFetchedEmails((prev: any[]) => prev.map(e => 
      e.id === email.id 
        ? { ...e, read: true }
        : e
    ))

    // If this email is part of a thread, also update the thread's emails
    if (selectedThread && email.threadId === selectedThread.threadId) {
      setSelectedThread((prev: any) => ({
        ...prev,
        emails: prev.emails.map((e: any) => 
          e.id === email.id 
            ? { ...e, read: true }
            : e
        ),
        unreadCount: prev.emails.filter((e: any) => e.id === email.id ? false : !e.read).length,
        hasUnread: prev.emails.some((e: any) => e.id === email.id ? false : !e.read)
      }))
    }

    // Mark as read in Firestore - pass threadId if this email is from a thread
    markEmailAsRead(email.id, email.threadId)
  }

  const handleThreadSelect = async (thread: any) => {
    if (!user?.uid) return
    
    console.log("Thread selected:", thread)
    console.log("Thread has", thread.count, "messages")
    
    try {
      setSelectedEmail(null) // Clear any selected email
      
      // Clear expansion state for previously selected threads
      if (selectedThread && selectedThread.threadId !== thread.threadId) {
        setExpandedThreads(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedThread.threadId);
          return newSet;
        });
      }
      
      // Query the chain subcollection for this thread
      console.log("🧵 Querying chain messages for threadId:", thread.threadId)
      console.log("🧵 Path:", `merchants/${user.uid}/fetchedemails/${thread.threadId}/chain`)
      
      const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', thread.threadId, 'chain')
      // Remove server-side ordering to handle both receivedAt and repliedAt timestamps client-side
      const chainQuery = query(chainRef)
      
      const chainSnapshot = await getDocs(chainQuery)
      
      console.log(`🧵 Thread query results: ${chainSnapshot.size} messages in chain`)
      console.log("🧵 Chain messages in thread:", chainSnapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id, 
          messageId: data.messageId,
          subject: data.subject,
          sender: data.sender,
          to: data.to,
          receivedAt: data.receivedAt,
          hasPayload: !!data.payload,
          hasMessageText: !!data.payload?.data?.message_text,
          messageTextLength: data.payload?.data?.message_text?.length || 0
        };
      }))
      
      if (chainSnapshot.size === 0) {
        console.warn("No chain messages found for threadId:", thread.threadId)
        // Fallback to thread view without messages
        setSelectedThread({
          threadId: thread.threadId,
          representative: thread,
          count: 0,
          emails: [],
          hasUnread: false
        })
        return
      }
      
      console.log(`Found ${chainSnapshot.size} messages in thread ${thread.threadId}`)
      console.log("🔍 Raw chain documents:", chainSnapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
      })))
      
      // Transform all chain messages in the thread
      const chainThreadEmails = chainSnapshot.docs.map((doc) => {
        const messageData = doc.data()
        
        // Use the stored fields directly
        const senderInfo = messageData.sender || "Unknown Sender"
        const toInfo = messageData.to || "Unknown Recipient"
        const subject = messageData.subject || "No Subject"
        const receivedAt = messageData.receivedAt || messageData.processedAt
        const messageText = messageData.message_text || ""
        
        console.log("📧 Chain message data:", {
          messageId: doc.id,
          sender: senderInfo,
          to: toInfo,
          subject: subject.substring(0, 50),
          hasPayload: !!messageData.payload,
          htmlMessageLength: messageData.htmlMessage?.length || 0,
          payloadMessageText: messageData.payload?.data?.message_text?.length || 0,
          directMessageText: messageText.length || 0
        })
        
        // Parse sender name and email from sender field
        let senderName = "Unknown"
        let senderEmail = ""
        
        if (senderInfo && senderInfo !== "Unknown Sender") {
          const emailMatch = senderInfo.match(/<([^>]+)>/)
          if (emailMatch) {
            senderEmail = emailMatch[1]
            senderName = senderInfo.replace(/<[^>]+>/, '').trim() || "Unknown"
          } else if (senderInfo.includes('@')) {
            senderEmail = senderInfo
            senderName = senderInfo
          } else {
            senderName = senderInfo
          }
        } else {
          senderName = "Unknown"
        }
        
        // Get content from htmlMessage (priority) or fallback to other sources
        let content = ""
        
        // Priority 1: htmlMessage field
        if (messageData.htmlMessage) {
          content = messageData.htmlMessage
          console.log("📝 Using content from htmlMessage field, length:", content.length)
        }
        // Priority 2: payload.data.message_text
        else if (messageData.payload?.data?.message_text) {
          content = messageData.payload.data.message_text
          console.log("📝 Using content from payload.data.message_text, length:", content.length)
        }
        // Priority 3: direct message_text field
        else if (messageText) {
          content = messageText
          console.log("📝 Using content from message_text field, length:", content.length)
        }
        // Priority 4: Extract from payload parts (existing logic)
        else if (messageData.payload) {
          try {
            const parts = messageData.payload?.data?.payload?.parts
            if (parts && Array.isArray(parts) && parts.length > 0) {
              const firstPart = parts[0]
              if (firstPart?.body?.data) {
                content = firstPart.body.data
                try {
                  content = decodePart(content)
                  console.log("📝 Using decoded content from payload parts, length:", content.length)
                } catch (error) {
                  console.warn("Failed to decode email content from part 1:", error)
                }
              }
            }
            
            // Fallback to payload.data.payload.body.data if no part 1 content
            if (!content) {
              const fallbackContent = messageData.payload?.data?.payload?.body?.data
              if (fallbackContent) {
                content = fallbackContent
                try {
                  content = decodePart(content)
                  console.log("📝 Using decoded content from payload body, length:", content.length)
                } catch (error) {
                  console.warn("Failed to decode email content from fallback:", error)
                }
              }
            }
          } catch (error) {
            console.warn("Error extracting email content:", error)
          }
        }
        
        // Handle both repliedAt and receivedAt timestamps properly
        const repliedAtField = messageData.repliedAt;
        const receivedAtField = messageData.receivedAt || messageData.processedAt;
        
        console.log(`🕐 Timestamp processing for message ${doc.id}:`, {
          rawRepliedAt: repliedAtField,
          rawReceivedAt: receivedAtField,
          repliedAtType: typeof repliedAtField,
          receivedAtType: typeof receivedAtField,
          hasToDateMethod: repliedAtField && typeof repliedAtField.toDate === 'function'
        });

        return {
          id: doc.id,
          threadId: thread.threadId,
          sender: senderName,
          email: senderEmail,
          to: toInfo, // Store recipient information
          subject: subject,
          content: content || "No content available",
          time: receivedAtField,
          receivedAt: receivedAtField, // Store receivedAt explicitly for sorting
          repliedAt: repliedAtField, // Store repliedAt as-is (could be Firestore Timestamp or null)
          read: false, // All emails start as unread
          hasAttachment: extractAttachments(messageData).length > 0,
          folder: "inbox",
          rawData: messageData
        }
      })
      
      console.log("📧 Transformed chain emails:", chainThreadEmails.map(email => ({
        id: email.id,
        sender: email.sender,
        to: email.to,
        subject: email.subject.substring(0, 30),
        contentLength: email.content?.length || 0,
        hasContent: !!email.content
      })))
      
      // Sort chain emails by timestamp (most recent first) - prioritize repliedAt or receivedAt
      const threadEmails = chainThreadEmails.sort((a, b) => {
        // Get the appropriate date field for each email - prioritize repliedAt or receivedAt
        const getEmailDate = (email: any) => {
          // Priority 1: repliedAt (for reply emails)
          // Priority 2: receivedAt (for original emails) 
          // Priority 3: time (fallback)
          const dateField = email.repliedAt || email.receivedAt || email.time;
          
          console.log(`📅 Email ${email.id} date extraction:`, {
            repliedAt: email.repliedAt,
            receivedAt: email.receivedAt,
            time: email.time,
            selectedField: dateField
          });
          
          if (typeof dateField === 'string') {
            return new Date(dateField);
          } else if (dateField && typeof dateField.toDate === 'function') {
            // Handle Firestore Timestamp objects
            return dateField.toDate();
          } else if (dateField instanceof Date) {
            return dateField;
          } else {
            console.warn(`Invalid date field for email ${email.id}:`, dateField);
            return new Date(0); // Default to epoch if invalid
          }
        };
        
        const timeA = getEmailDate(a);
        const timeB = getEmailDate(b);
        
        console.log(`📊 Sorting comparison:`, {
          emailA: a.id,
          emailB: b.id,
          timeA: timeA.toISOString(),
          timeB: timeB.toISOString(),
          result: timeB.getTime() - timeA.getTime()
        });
        
        // Sort newest first (descending order) - most recent at the top
        return timeB.getTime() - timeA.getTime();
      })
      
      console.log("📊 Sorted thread emails:", threadEmails.map(email => ({
        id: email.id,
        sender: email.sender,
        time: email.time,
        receivedAt: email.receivedAt,
        repliedAt: email.repliedAt
      })))
      
      // Create complete thread object with all emails
      const completeThread = {
          threadId: thread.threadId,
        representative: threadEmails[0], // Most recent email as representative
        count: threadEmails.length,
        unreadCount: threadEmails.filter((email: any) => !email.read).length,
        emails: threadEmails,
        hasUnread: threadEmails.some((email: any) => !email.read)
      }
      
      console.log("✅ Setting complete thread with", threadEmails.length, "emails")
      console.log("✅ Complete thread object:", {
        threadId: completeThread.threadId,
        count: completeThread.count,
        emailIds: completeThread.emails.map((e: any) => e.id)
      })
      
      // Set the thread for dropdown functionality
      setSelectedThread(completeThread)
      console.log("🎯 Selected thread set:", {
        threadId: completeThread.threadId,
        emailCount: completeThread.emails.length,
        threadCount: completeThread.count,
        willAutoExpand: threadEmails.length > 1,
        shouldShowDropdown: completeThread.emails.length > 1
      });
      
      // Automatically expand the thread dropdown if it has multiple emails
      if (threadEmails.length > 1) {
        setExpandedThreads(prev => {
          const newSet = new Set([...prev, thread.threadId]);
          console.log("📂 Auto-expanding thread:", thread.threadId, "Expanded threads now:", [...newSet]);
          return newSet;
        });
      }
      
      // Set the most recent email to show in the right panel
      const mostRecentEmail = threadEmails[0]; // Most recent is first after sorting
      setSelectedEmail(mostRecentEmail)
      setSelectedEmailFromDropdown(false) // This email was auto-selected, not clicked from dropdown
      
      // Don't automatically mark emails as read when viewing thread
      // They will be marked as read individually when clicked
      
    } catch (error) {
      console.error("❌ Error in handleThreadSelect:", error)
      console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace')
      console.error("❌ Thread data:", thread)
      console.error("❌ This error is causing fallback to single email view instead of thread view!")
      console.error("❌ Error message:", error instanceof Error ? error.message : String(error))
      
      // Create a minimal thread object instead of falling back to single email
      const fallbackThread = {
        threadId: thread.threadId,
        representative: thread.representative || thread,
        count: 1,
        unreadCount: 0,
        emails: [thread.representative || thread],
        hasUnread: false
      }
      
      console.log("🔄 Using fallback thread object:", fallbackThread)
      setSelectedThread(fallbackThread)
      
      // Automatically expand the thread dropdown if it has multiple emails (fallback shouldn't, but for consistency)
      if (fallbackThread.count > 1) {
        setExpandedThreads(prev => new Set([...prev, thread.threadId]))
      }
      
      // Set the representative email to show in the right panel
      setSelectedEmail(fallbackThread.representative)
      setSelectedEmailFromDropdown(false) // This email was auto-selected, not clicked from dropdown
      
      // Don't automatically mark fallback emails as read
      // They will be marked as read individually when clicked
    }
  }

  // Notification helper functions
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "SUCCESS":
      case "REWARD_REDEEMED":
      case "POINTS_AWARDED":
        return <Check className="h-4 w-4 text-green-500" />
      case "WARNING":
        return <Bell className="h-4 w-4 text-amber-500" />
      case "ERROR":
        return <X className="h-4 w-4 text-red-500" />
      case "AGENT_ACTION":
        return (
          <div className="h-4 w-4 flex items-center justify-center">
            <div className="h-4 w-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500">🤖</div>
          </div>
        )
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
      }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F5F5F5]">
      <style dangerouslySetInnerHTML={{ 
        __html: `
          ${customScrollbarStyles}
        `
      }} />
      {/* Top Bar - Combined Header with folder dropdown, toolbar, and connected account */}
      <div className="mx-3 mt-3 mb-3 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-between px-4 py-3 flex-shrink-0">
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
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSync} 
                    disabled={emailsLoading}
                    className="text-gray-700 hover:bg-gray-200 transition-all duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 transition-transform duration-300 ${emailsLoading ? 'animate-spin' : 'hover:rotate-180'}`} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                  <p>{emailsLoading ? 'Refreshing...' : 'Refresh'}</p>
                    </TooltipContent>
                  </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleEnableGmailTrigger}
                    disabled={isEnablingTrigger}
                    className="text-gray-700 hover:bg-gray-200"
                  >
                    {isEnablingTrigger ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
        </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isEnablingTrigger ? 'Enabling...' : 'Enable Gmail Trigger'}</p>
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

          {/* Notifications button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative h-8 w-8 p-0">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full text-white font-medium flex items-center justify-center min-w-3 text-[7px]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[450px] rounded-md">
              <div className="flex items-center justify-between px-4 py-2 border-b">
                <h3 className="font-medium">Notifications</h3>
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs rounded-md"
                    onClick={markAllAsRead}
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notificationsLoading ? (
                  <div className="py-6 text-center">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-6 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={cn(
                        "px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
                        !notification.read && "bg-blue-50/50"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 pt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-3">
                            <p className="text-sm font-medium flex-1">
                              {notification.type === "AGENT_ACTION" ? (
                                <>
                                  <span className="bg-gradient-to-r from-blue-500 to-orange-400 bg-clip-text text-transparent font-semibold">
                                    Agent Notification:
                                  </span>{' '}
                                  {notification.message}
                                </>
                              ) : (
                                notification.message
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatTimeAgo(notification.dateCreated || notification.timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center" asChild>
                <a href="/notifications" className="w-full text-center cursor-pointer">
                  View all notifications
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="h-9 px-2 text-gray-600 hover:bg-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
                </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0 px-3 pb-3 main-panels-container">
          {/* Left Panel - Email List Card */}
          <div 
            className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full mr-1"
            style={{ width: `${leftPanelWidth}%` }}
          >
          
          {/* Rest of left panel content... */}
          {/* Search Bar - Fixed at top */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white rounded-t-xl">
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
                    className={`flex items-center gap-2 py-3 pr-3 pl-2 transition-all duration-200 ${
                      selectedThread?.threadId === thread.threadId
                        ? 'bg-blue-100' 
                        : !thread.representative.read 
                          ? 'bg-gray-100 hover:bg-gray-200' 
                          : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    {/* Expand/Collapse Chevron - show when thread has 2+ documents in chain */}
                    <div className="w-6 flex justify-center items-center flex-shrink-0">
                      {thread.count > 1 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleThreadExpansion(thread.threadId);
                          }}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={expandedThreads.has(thread.threadId) ? "Collapse thread" : "Expand thread"}
                        >
                          <ChevronRight 
                            className={`h-3 w-3 text-gray-500 transition-transform duration-75 ease-in-out ${
                              expandedThreads.has(thread.threadId) ? 'rotate-90' : ''
                            }`} 
                          />
                        </button>
                      ) : (
                        /* Placeholder space for single emails to maintain alignment */
                        <div className="w-5 h-5"></div>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-gray-200 text-gray-700 text-xs font-medium">
                        {thread.representative.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Thread content - clickable to select thread */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleThreadSelect(thread)}
                    >
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

                  {/* Thread dropdown - show individual emails when expanded (only when 2+ documents in chain) */}
                  {(() => {
                    const hasMultipleEmails = selectedThread?.emails?.length > 1;
                    const isExpanded = expandedThreads.has(thread.threadId);
                    const isCurrentThread = selectedThread?.threadId === thread.threadId;
                    const shouldShow = hasMultipleEmails && isExpanded && isCurrentThread;
                    
                    if (isCurrentThread) {
                      console.log("🔽 Dropdown check for thread:", thread.threadId, {
                        emailsInSelectedThread: selectedThread?.emails?.length,
                        threadCount: thread.count,
                        hasMultipleEmails,
                        isExpanded,
                        isCurrentThread,
                        shouldShow
                      });
                    }
                    
                    return shouldShow;
                  })() && (
                    <div className="border-l-4 border-l-gray-200 bg-gray-50">
                      {selectedThread.emails
                        .slice()
                        .sort((a: any, b: any) => {
                          // Sort newest first for dropdown
                          const getEmailDate = (email: any) => {
                            const dateField = email.repliedAt || email.receivedAt || email.time;
                            if (typeof dateField === 'string') {
                              return new Date(dateField);
                            } else if (dateField && typeof dateField.toDate === 'function') {
                              return dateField.toDate();
                            } else if (dateField instanceof Date) {
                              return dateField;
                            } else {
                              return new Date(0);
                            }
                          };
                          const timeA = getEmailDate(a);
                          const timeB = getEmailDate(b);
                          return timeB.getTime() - timeA.getTime(); // Newest first
                        })
                        .map((email: any, index: number) => (
                        <div
                          key={email.id}
                                                       className={`flex items-center gap-2 p-3 pl-20 cursor-pointer transition-all duration-200 border-t border-t-gray-200 ${
                            selectedEmail?.id === email.id && selectedEmailFromDropdown
                              ? 'bg-blue-100'
                              : !email.read 
                                ? 'bg-gray-100 hover:bg-gray-200'
                                : 'bg-white hover:bg-gray-50'
                          }`}
                          onClick={() => handleEmailSelect(email, true)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs ${!email.read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'}`}>
                                {email.sender}
                              </span>
                              {email.hasAttachment && (
                                <Paperclip className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                              )}
                              <span className={`text-xs ml-auto ${!email.read ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                {(() => {
                                  // Get the appropriate timestamp with proper Firestore handling
                                  const timestamp = email.repliedAt || email.receivedAt || email.time;
                                  if (!timestamp) return 'Unknown time';
                                  
                                  // Handle Firestore Timestamp objects
                                  if (timestamp && typeof timestamp.toDate === 'function') {
                                    return formatPreviewTime(timestamp.toDate());
                                  }
                                  
                                  // Handle string or Date objects
                                  return formatPreviewTime(timestamp);
                                })()}
                              </span>
                            </div>
                            <div className={`text-xs truncate ${!email.read ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                              {(() => {
                                // Use htmlMessage first, fallback to content
                                const htmlContent = email.htmlMessage || email.content || '';
                                if (!htmlContent) return 'No preview available...';
                                
                                // Strip HTML tags and clean up text for preview
                                const cleanText = htmlContent
                                  .replace(/<[^>]+>/g, '') // Remove HTML tags
                                  .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
                                  .replace(/&amp;/g, '&') // Replace &amp; with &
                                  .replace(/&lt;/g, '<') // Replace &lt; with <
                                  .replace(/&gt;/g, '>') // Replace &gt; with >
                                  .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
                                  .trim();
                                
                                return cleanText.substring(0, 60) + (cleanText.length > 60 ? '...' : '');
                              })()}
                            </div>
                          </div>
                          {!email.read && (
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
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

        {/* Draggable Divider */}
        <div 
          className={`w-1 bg-transparent hover:bg-gray-200 cursor-col-resize transition-colors relative ${
            isDragging ? 'bg-blue-300' : ''
          }`}
          onMouseDown={handleMouseDown}
        >
        </div>

        {/* Right Panel - Email Content Card */}
        <div 
          className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden ml-1"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md mx-6 mt-4 mb-2 animate-in slide-in-from-top-2 duration-200 ease-out">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">✅ {successMessage}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuccessMessage('')}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
          
          {isComposing ? (
            <ComposeEmailView
              isSending={isSending}
              onCancel={() => setIsComposing(false)}
              onSend={async (to: string, subject: string, content: string) => {
                try {
                  setIsSending(true);
                  
                  if (!user?.uid) {
                    throw new Error('User not authenticated');
                  }
                  
                  // Use sendGmailEmail for new emails
                  const sendGmailEmail = httpsCallable(functions, 'sendGmailEmail');
                  const emailData = {
                    merchantId: user.uid,
                    body: content,
                    recipient_email: to,
                    subject: subject || '(No Subject)',
                    is_html: true,
                  };
                  
                  const response = await sendGmailEmail(emailData);
                  console.log('Email sent successfully:', response.data);
                  
                  // Show success message
                  setSuccessMessage(`Email sent successfully to: ${to}`);
                  
                  // Exit compose mode
                  setIsComposing(false);
                  
                } catch (error) {
                  console.error('Error sending email:', error);
                  
                  let errorMessage = 'Failed to send email';
                  if (error instanceof Error) {
                    if (error.message.includes('Gmail connection')) {
                      errorMessage = 'Please check your Gmail connection in Settings > Integrations';
                    } else if (error.message.includes('authentication')) {
                      errorMessage = 'Authentication error. Please try signing in again.';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  alert(errorMessage);
                } finally {
                  setIsSending(false);
                }
              }}
            />
          ) : selectedEmail ? (
            <EmailViewer 
              email={selectedEmail} 
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              selectedAccount={selectedAccount}
              replyMode={replyMode}
              isSending={isSending}
              onStartReply={(email: any) => setReplyMode({ type: 'reply', originalEmail: email })}
              onStartReplyAll={(email: any) => setReplyMode({ type: 'replyAll', originalEmail: email })}
              onStartForward={(email: any) => setReplyMode({ type: 'forward', originalEmail: email })}
              onSendReply={async (content: string, subject: string, recipients: string[], attachments: File[]) => {
                try {
                  setIsSending(true);
                  console.log('Handling reply/forward:', { type: replyMode?.type, content, subject, recipients, attachments: attachments.length });
                  
                  if (!user?.uid) {
                    throw new Error('User not authenticated');
                  }
                  
                  // Check if this is a forward operation
                  if (replyMode?.type === 'forward') {
                    // For forwarding, use the sendGmailEmail function with message history
                    const sendGmailEmail = httpsCallable(functions, 'sendGmailEmail');
                    
                    // Include original message history in the content
                    const originalEmail = replyMode.originalEmail;
                    const forwardContent = `
                      ${content}
                      
                      ---------- Forwarded message ----------
                      From: ${originalEmail.sender} <${originalEmail.email}>
                      Date: ${formatMelbourneTime(originalEmail.time, 'Unknown time')}
                      Subject: ${originalEmail.subject}
                      To: ${user?.email || merchantEmail}
                      
                      ${originalEmail.content}
                    `;
                    
                    const emailData: any = {
                      merchantId: user.uid,
                      body: forwardContent,
                      recipient_email: recipients[0], // Primary recipient
                      subject: subject,
                      is_html: true,
                      cc: recipients.length > 1 ? recipients.slice(1) : [], // Additional recipients as CC
                    };
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await sendGmailEmail(emailData);
                    
                    console.log('Email forwarded successfully:', response.data);
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Email forwarded successfully to: ${recipientList}`);
                    
                  } else {
                    // For reply/replyAll, use the replyToGmailThread function
                    const replyToGmailThread = httpsCallable(functions, 'replyToGmailThread');
                    
                    const replyData: any = {
                      merchantId: user.uid,
                      message_body: content,
                      html_message_body: content, // HTML format of the message body
                      recipient_email: recipients[0], // Primary recipient
                      thread_id: selectedThread.threadId,
                      is_html: true,
                    };
                    
                    // Add CC recipients if present
                    if (recipients.length > 1) {
                      replyData.cc = recipients.slice(1);
                    }
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await replyToGmailThread(replyData);
                    
                    console.log('Reply sent successfully:', response.data);
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Reply sent successfully to: ${recipientList}`);
                  }
                  
                  // Create the sent message object for UI
                  const sentMessage = {
                    id: `sent-${Date.now()}`,
                    threadId: selectedThread.threadId,
                    sender: merchantData?.businessName || user?.displayName || 'You',
                    email: user?.email || merchantEmail,
                    subject: subject,
                    content: content,
                    time: new Date().toISOString(),
                    messageTimestamp: new Date().toISOString(),
                    read: true,
                    hasAttachment: attachments.length > 0,
                    folder: "sent",
                    rawData: null
                  };
                  
                  // Add the sent message to the thread
                  const updatedThread = {
                    ...selectedThread,
                    emails: [...selectedThread.emails, sentMessage],
                    count: selectedThread.count + 1
                  };
                  
                  // Update the selected thread
                  setSelectedThread(updatedThread);
                  
                  // Close reply mode
                  setReplyMode(null);
                  
                } catch (error) {
                  console.error('Error sending email:', error);
                  
                  // Show specific error message if available
                  let errorMessage = 'Failed to send email';
                  if (error instanceof Error) {
                    if (error.message.includes('Gmail connection')) {
                      errorMessage = 'Please check your Gmail connection in Settings > Integrations';
                    } else if (error.message.includes('authentication')) {
                      errorMessage = 'Authentication error. Please try signing in again.';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  alert(errorMessage);
                } finally {
                  setIsSending(false);
                }
              }}
              onCancelReply={() => setReplyMode(null)}
              callGenerateEmailResponse={callGenerateEmailResponse}
              emailRules={emailRules}
              setEmailRules={setEmailRules}
              showEmailRulesDialog={showEmailRulesDialog}
              setShowEmailRulesDialog={setShowEmailRulesDialog}
              tempEmailRules={tempEmailRules}
              setTempEmailRules={setTempEmailRules}
            />
          ) : selectedEmail ? (
            <EmailViewer 
              email={selectedEmail} 
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              selectedAccount={selectedAccount}
              replyMode={replyMode}
              isSending={isSending}
              isGenerating={isGenerating}
              callGenerateEmailResponse={callGenerateEmailResponse}
              onStartReply={(email: any) => setReplyMode({ type: 'reply', originalEmail: email })}
              onStartReplyAll={(email: any) => setReplyMode({ type: 'replyAll', originalEmail: email })}
              onStartForward={(email: any) => setReplyMode({ type: 'forward', originalEmail: email })}
              onSendReply={async (content: string, subject: string, recipients: string[], attachments: File[]) => {
                try {
                  setIsSending(true);
                  console.log('Handling reply/forward:', { type: replyMode?.type, content, subject, recipients, attachments: attachments.length });
                  
                  if (!user?.uid) {
                    throw new Error('User not authenticated');
                  }
                  
                  // Check if this is a forward operation
                  if (replyMode?.type === 'forward') {
                    // For forwarding, use the sendGmailEmail function with message history
                    const sendGmailEmail = httpsCallable(functions, 'sendGmailEmail');
                    
                    // Include original message history in the content
                    const originalEmail = replyMode.originalEmail;
                    const forwardContent = `
                      ${content}
                      
                      ---------- Forwarded message ----------
                      From: ${originalEmail.sender} <${originalEmail.email}>
                      Date: ${formatMelbourneTime(originalEmail.time, 'Unknown time')}
                      Subject: ${originalEmail.subject}
                      To: ${user?.email || merchantEmail}
                      
                      ${originalEmail.content}
                    `;
                    
                    const emailData: any = {
                      merchantId: user.uid,
                      body: forwardContent,
                      recipient_email: recipients[0], // Primary recipient
                      subject: subject,
                      is_html: true,
                      cc: recipients.length > 1 ? recipients.slice(1) : [], // Additional recipients as CC
                    };
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await sendGmailEmail(emailData);
                    
                    console.log('Email forwarded successfully:', response.data);
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Email forwarded successfully to: ${recipientList}`);
                    
                  } else {
                    // For reply/replyAll, use the replyToGmailThread function
                    const replyToGmailThread = httpsCallable(functions, 'replyToGmailThread');
                    
                    const replyData: any = {
                      merchantId: user.uid,
                      message_body: content,
                      html_message_body: content, // HTML format of the message body
                      recipient_email: recipients[0], // Primary recipient
                      thread_id: selectedEmail.threadId || selectedEmail.id,
                      is_html: true,
                    };
                    
                    // Add CC recipients if present
                    if (recipients.length > 1) {
                      replyData.cc = recipients.slice(1);
                    }
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await replyToGmailThread(replyData);
                    
                    console.log('Reply sent successfully:', response.data);
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Reply sent successfully to: ${recipientList}`);
                  }
                  
                  // Create the sent message object for UI
                  const sentMessage = {
                    id: `sent-${Date.now()}`,
                    threadId: selectedEmail.threadId || selectedEmail.id,
                    sender: merchantData?.businessName || user?.displayName || 'You',
                    email: user?.email || merchantEmail,
                    subject: subject,
                    content: content,
                    time: new Date().toISOString(),
                    messageTimestamp: new Date().toISOString(),
                    read: true,
                    hasAttachment: attachments.length > 0,
                    folder: "sent",
                    rawData: null
                  };
                  
                  // Convert single email to thread with the reply
                  const newThread = {
                    threadId: selectedEmail.threadId || selectedEmail.id,
                    representative: selectedEmail,
                    count: 2,
                    unreadCount: 0,
                    emails: [selectedEmail, sentMessage]
                  };
                  
                  // Switch to thread view
                  setSelectedThread(newThread);
                  setSelectedEmail(null);
                  
                  // Close reply mode
                  setReplyMode(null);
                  
                } catch (error) {
                  console.error('Error sending email:', error);
                  
                  // Show specific error message if available
                  let errorMessage = 'Failed to send email';
                  if (error instanceof Error) {
                    if (error.message.includes('Gmail connection')) {
                      errorMessage = 'Please check your Gmail connection in Settings > Integrations';
                    } else if (error.message.includes('authentication')) {
                      errorMessage = 'Authentication error. Please try signing in again.';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  alert(errorMessage);
                } finally {
                  setIsSending(false);
                }
              }}
              onCancelReply={() => setReplyMode(null)}
            />
          ) : selectedThread ? (
            <EmailThreadViewer 
              thread={selectedThread} 
              merchantData={merchantData}
              userEmail={user?.email || ''}
              merchantEmail={merchantEmail}
              selectedAccount={selectedAccount}
              replyMode={replyMode}
              isSending={isSending}
              tapAgentMode={tapAgentMode}
              setTapAgentMode={setTapAgentMode}
              tapAgentInstructions={tapAgentInstructions}
              setTapAgentInstructions={setTapAgentInstructions}
              selectedTone={selectedTone}
              setSelectedTone={setSelectedTone}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
              emailRules={emailRules}
              setEmailRules={setEmailRules}
              threadSummary={threadSummary}
              isSummarizing={isSummarizing}
              onSummarizeThread={() => summarizeThread(selectedThread)}
              onStartReply={(email: any) => setReplyMode({ type: 'reply', originalEmail: email, thread: selectedThread })}
              onStartReplyAll={(email: any) => setReplyMode({ type: 'replyAll', originalEmail: email, thread: selectedThread })}
              onStartForward={(email: any) => setReplyMode({ type: 'forward', originalEmail: email, thread: selectedThread })}
              onSendReply={async (content: string, subject: string, recipients: string[], attachments: File[]) => {
                try {
                  setIsSending(true);
                  console.log('Handling reply/forward:', { type: replyMode?.type, content, subject, recipients, attachments: attachments.length });
                  
                  if (!user?.uid) {
                    throw new Error('User not authenticated');
                  }
                  
                  // Check if this is a forward operation
                  if (replyMode?.type === 'forward') {
                    // For forwarding, use the sendGmailEmail function with message history
                    const sendGmailEmail = httpsCallable(functions, 'sendGmailEmail');
                    
                    // Include original message history in the content
                    const originalEmail = replyMode.originalEmail;
                    const forwardContent = `
                      ${content}
                      
                      ---------- Forwarded message ----------
                      From: ${originalEmail.sender} <${originalEmail.email}>
                      Date: ${formatMelbourneTime(originalEmail.time, 'Unknown time')}
                      Subject: ${originalEmail.subject}
                      To: ${user?.email || merchantEmail}
                      
                      ${originalEmail.content}
                    `;
                    
                    const emailData: any = {
                      merchantId: user.uid,
                      body: forwardContent,
                      recipient_email: recipients[0], // Primary recipient
                      subject: subject,
                      is_html: true,
                      cc: recipients.length > 1 ? recipients.slice(1) : [], // Additional recipients as CC
                    };
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await sendGmailEmail(emailData);
                    console.log('Forward sent successfully:', response.data);
                    
                    // Show success message
                    setSuccessMessage(`Email forwarded successfully to: ${recipients.join(', ')}`);
                    
                  } else {
                    // For thread replies, use the thread reply function
                    const sendThreadReply = httpsCallable(functions, 'sendThreadReply');
                    
                    const replyData: any = {
                      merchantId: user.uid,
                      body: content,
                      recipient_email: recipients[0], // Primary recipient
                      thread_id: selectedThread.threadId,
                      subject: subject,
                      is_html: true,
                      cc: recipients.length > 1 ? recipients.slice(1) : [], // Additional recipients as CC
                    };
                    
                    // Note: Attachments require S3 upload workflow (not yet implemented)
                    if (attachments.length > 0) {
                      throw new Error('Attachments are not yet supported. The Composio API requires files to be uploaded to S3 first.');
                    }
                    
                    const response = await sendThreadReply(replyData);
                    console.log('Thread reply sent successfully:', response.data);
                    
                    // Show success message
                    setSuccessMessage(`Reply sent successfully to: ${recipients.join(', ')}`);
                    
                    // Create a sent message object for immediate UI update
                    const sentMessage = {
                      id: `sent-${Date.now()}`,
                      threadId: selectedThread.threadId,
                      sender: user?.email || merchantEmail,
                      email: user?.email || merchantEmail,
                      to: recipients[0],
                      subject: subject,
                      content: content,
                      time: new Date(),
                      read: true,
                      hasAttachment: attachments.length > 0,
                      folder: "sent",
                      repliedAt: new Date()
                    };
                    
                    // Update the thread with the new message
                    const updatedThread = {
                      ...selectedThread,
                      emails: [sentMessage, ...selectedThread.emails],
                      count: selectedThread.count + 1
                    };
                    
                    setSelectedThread(updatedThread);
                  }
                  
                  // Close reply mode
                  setReplyMode(null);
                  
                } catch (error) {
                  console.error('Error sending email:', error);
                  
                  // Show specific error message if available
                  let errorMessage = 'Failed to send email';
                  if (error instanceof Error) {
                    if (error.message.includes('Gmail connection')) {
                      errorMessage = 'Please check your Gmail connection in Settings > Integrations';
                    } else if (error.message.includes('authentication')) {
                      errorMessage = 'Authentication error. Please try signing in again.';
                    } else {
                      errorMessage = error.message;
                    }
                  }
                  
                  alert(errorMessage);
                } finally {
                  setIsSending(false);
                }
              }}
              onCancelReply={() => setReplyMode(null)}
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
  
  // First try the new structure: payload.data.payload.parts
  const newParts = emailData.payload?.data?.payload?.parts;
  if (newParts && Array.isArray(newParts)) {
    console.log('📦 Found new format payload.data.payload.parts, searching for HTML content');
    
    for (const part of newParts) {
      console.log(`🔍 Checking part: ${part.mimeType}, hasData: ${!!part.body?.data}`);
      
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          console.log('🌐 Found HTML part in new format, decoding...');
          const htmlContent = advancedDecodeHtml(part.body.data);
          console.log('✅ HTML content decoded successfully from new format');
          return htmlContent;
        } catch (error) {
          console.error('❌ Failed to decode HTML part from new format:', error);
          continue; // Try next part
        }
      }
    }
  }
  
  // Fallback to payload.data.payload.body.data if no parts found
  const directBodyData = emailData.payload?.data?.payload?.body?.data;
  if (directBodyData) {
    try {
      console.log('📄 Found fallback payload.data.payload.body.data, decoding...');
      const htmlContent = advancedDecodeHtml(directBodyData);
      console.log('✅ HTML content decoded successfully from fallback');
      return htmlContent;
    } catch (error) {
      console.error('❌ Failed to decode HTML from fallback:', error);
    }
  }
  
  // Fallback to old structure for backward compatibility
  if (emailData.payload?.parts && Array.isArray(emailData.payload.parts)) {
    console.log('📦 Found old format payload.parts, searching for HTML content');
    
    for (const part of emailData.payload.parts) {
      console.log(`🔍 Checking part: ${part.mimeType}, hasData: ${!!part.body?.data}`);
      
      if (part.mimeType === 'text/html' && part.body?.data) {
        try {
          console.log('🌐 Found HTML part in old format, decoding...');
          const htmlContent = advancedDecodeHtml(part.body.data);
          console.log('✅ HTML content decoded successfully from old format');
          return htmlContent;
        } catch (error) {
          console.error('❌ Failed to decode HTML part from old format:', error);
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

// Compose email component
const ComposeEmailView = ({ 
  onSend, 
  onCancel, 
  isSending 
}: { 
  onSend: (to: string, subject: string, content: string) => void;
  onCancel: () => void;
  isSending: boolean;
}) => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Compose Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-gray-900">New Email</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (to.trim() && content.trim()) {
                  onSend(to, subject, content);
                }
              }}
              disabled={!to.trim() || !content.trim() || isSending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isSending ? 'Sending...' : 'Send'}
            </Button>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSending}
              className="px-4 py-2"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Compose Form */}
        <div className="space-y-2">
          {/* To Field */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">To</label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full border-gray-300 focus:border-gray-400 focus:outline-none focus:ring-0 h-8 text-xs"
              placeholder="Enter recipient email address"
            />
          </div>

          {/* Subject Field */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Subject</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border-gray-300 focus:border-gray-400 focus:outline-none focus:ring-0 h-8 text-xs"
              placeholder="Enter subject"
            />
          </div>
        </div>
      </div>

      {/* Message Content */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full min-h-[300px] resize-none border-gray-300 focus:border-gray-400 focus:outline-none focus:ring-0"
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
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



// Single email viewer component with integrated reply
const EmailViewer = ({ 
  email, 
  merchantData, 
  userEmail, 
  merchantEmail, 
  selectedAccount,
  replyMode,
  onStartReply, 
  onStartReplyAll, 
  onStartForward,
  onSendReply,
  onCancelReply,
  isSending,
  isGenerating,
  callGenerateEmailResponse,
  emailRules,
  setEmailRules,
  showEmailRulesDialog,
  setShowEmailRulesDialog,
  tempEmailRules,
  setTempEmailRules
}: {
  email: any;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  selectedAccount: string;
  replyMode?: { type: 'reply' | 'replyAll' | 'forward', originalEmail: any, thread?: any } | null;
  onStartReply?: (email: any) => void;
  onStartReplyAll?: (email: any) => void;
  onStartForward?: (email: any) => void;
  onSendReply?: (content: string, subject: string, recipients: string[], attachments: File[]) => void;
  onCancelReply?: () => void;
  isSending?: boolean;
  isGenerating?: boolean;
  callGenerateEmailResponse?: (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => Promise<any>;
  emailRules?: string;
  setEmailRules?: (rules: string) => void;
  showEmailRulesDialog?: boolean;
  setShowEmailRulesDialog?: (show: boolean) => void;
  tempEmailRules?: string;
  setTempEmailRules?: (rules: string) => void;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [replyQuotedContent, setReplyQuotedContent] = useState('');
  const [replyRecipients, setReplyRecipients] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Local state for dialog
  const [localShowEmailRulesDialog, setLocalShowEmailRulesDialog] = useState(false);
  const [localTempEmailRules, setLocalTempEmailRules] = useState('');
  
  // Use passed props or fallback to local state
  const actualShowEmailRulesDialog = showEmailRulesDialog ?? localShowEmailRulesDialog;
  const actualSetShowEmailRulesDialog = setShowEmailRulesDialog ?? setLocalShowEmailRulesDialog;
  const actualTempEmailRules = tempEmailRules ?? localTempEmailRules;
  const actualSetTempEmailRules = setTempEmailRules ?? setLocalTempEmailRules;

  useEffect(() => {
    const loadEmailContent = async () => {
      try {
        setLoading(true);
        setError('');
        
        if (email.rawData) {
          // Extract and decode HTML content from raw email data
          const extractedHtml = extractHtmlContent(email.rawData);
          if (extractedHtml) {
            const sanitisedHtml = sanitiseAndRenderHtml(extractedHtml);
            setHtmlContent(sanitisedHtml);
          } else {
            // Fallback to existing content
            setHtmlContent(email.content || 'No content available');
          }
        } else if (email.content) {
          // Check if content contains HTML tags (for thread replies with HTML content)
          const containsHtml = /<[^>]*>/g.test(email.content);
          if (containsHtml) {
            // Sanitise HTML content for thread replies
            const sanitisedHtml = sanitiseAndRenderHtml(email.content);
            setHtmlContent(sanitisedHtml);
          } else {
            // Plain text content
            setHtmlContent(email.content);
          }
        } else {
          setHtmlContent('No content available');
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

  // Reset reply content when reply mode changes (only on mode change, not on every render)
  const [replyModeKey, setReplyModeKey] = useState<string>('');
  
  useEffect(() => {
    const newKey = replyMode ? `${replyMode.type}-${replyMode.originalEmail.id}` : '';
    
    // Only update if the mode actually changed (not just a re-render)
    if (newKey !== replyModeKey) {
      setReplyModeKey(newKey);
      
      if (replyMode) {
        // Auto-populate recipients based on reply type
        if (replyMode.type === 'reply') {
          setReplyRecipients(replyMode.originalEmail.email);
          setReplyCc('');
          // Pre-populate the editor with quoted content
          const quotedContent = createQuotedReplyContent(replyMode.originalEmail, replyMode.type);
          const fullContent = `<div><br><br></div><hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">${quotedContent}`;
          setReplyQuotedContent('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = fullContent;
            // Position cursor at the beginning
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStart(replyEditorRef.current.firstChild!, 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            replyEditorRef.current.focus();
          }
        } else if (replyMode.type === 'replyAll') {
          setReplyRecipients(replyMode.originalEmail.email);
          setReplyCc('');
          // Pre-populate the editor with quoted content
          const quotedContent = createQuotedReplyContent(replyMode.originalEmail, replyMode.type);
          const fullContent = `<div><br><br></div><hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">${quotedContent}`;
          setReplyQuotedContent('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = fullContent;
            // Position cursor at the beginning
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStart(replyEditorRef.current.firstChild!, 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            replyEditorRef.current.focus();
          }
        } else if (replyMode.type === 'forward') {
          setReplyRecipients('');
          setReplyCc('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = '';
          }
          setReplyQuotedContent('');
        }
      } else {
        setReplyContent('');
        if (replyEditorRef.current) {
          replyEditorRef.current.innerHTML = '';
        }
        setReplyQuotedContent('');
        setReplyRecipients('');
        setReplyCc('');
        setReplyAttachments([]);
      }
    }
  }, [replyMode, replyModeKey]);

  const isFromCurrentUser = isEmailFromCurrentUser(email.email, userEmail, merchantEmail);

  return (
    <div className="flex flex-col h-full email-viewer">
      {/* Email Header - Hidden when replying */}
      {!replyMode && (
        <div className="px-4 py-3 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-medium text-gray-900">{email.subject}</h1>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => onStartReply?.(email)}
                  >
                      <Reply className="h-3 w-3" />
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
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => onStartReplyAll?.(email)}
                  >
                      <ReplyAll className="h-3 w-3" />
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
                      className="h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => onStartForward?.(email)}
                  >
                      <Forward className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Forward</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

          {/* From Section */}
          <div className="flex items-center gap-2 mb-0">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold text-xs">
                {email.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{email.sender}</span>

                {email.hasAttachment && (
                  <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span><span className="font-bold">To:</span> {email.to}</span>
                <span>•</span>
                <span>{(() => {
                  // Get the appropriate timestamp with proper Firestore handling
                  const timestamp = email.repliedAt || email.receivedAt || email.time;
                  if (!timestamp) return 'Unknown time';
                  
                  // Handle Firestore Timestamp objects
                  if (timestamp && typeof timestamp.toDate === 'function') {
                    return formatMelbourneTime(timestamp.toDate(), 'Unknown time');
                  }
                  
                  // Handle string or Date objects
                  return formatMelbourneTime(timestamp, 'Unknown time');
                })()}</span>
              </div>
            </div>
          </div>
          
          {/* Compact Attachments - Right after header */}
          <div className="px-3 pb-1">
            <CompactAttachmentList attachments={extractAttachments(email)} />
            </div>
          </div>
        )}

      {/* Reply Compose Area - Raw in right panel */}
        {replyMode && (
        <div className="flex flex-col h-full bg-white">
            {/* From Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">From:</div>
            <div className="flex-1 text-xs text-gray-900">{selectedAccount}</div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const currentReplyContent = replyEditorRef.current?.innerHTML || '';
                  if (currentReplyContent.trim() && replyRecipients.trim()) {
                    const subject = replyMode.originalEmail.subject.startsWith('Re: ') ? replyMode.originalEmail.subject : `Re: ${replyMode.originalEmail.subject}`;
                    const recipients = [
                      ...replyRecipients.split(',').map(email => email.trim()).filter(Boolean),
                      ...replyCc.split(',').map(email => email.trim()).filter(Boolean)
                    ];
                    // Use the full HTML content from the editor (includes both user input and quoted content)
                    onSendReply?.(currentReplyContent, subject, recipients, replyAttachments);
                  }
                }}
                disabled={!replyRecipients.trim() || isSending}
                className="bg-blue-500 hover:bg-blue-600 text-white h-7 px-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isSending ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                {isSending ? 'Sending...' : 'Send'}
              </Button>
              <Button
                variant="ghost"
                onClick={onCancelReply}
                className="h-7 px-2 text-gray-600 hover:text-gray-900 text-xs"
              >
                Cancel
                </Button>
              </div>
            </div>

            {/* To Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">To:</div>
              <div className="flex-1">
                <Input
                  value={replyRecipients}
                  onChange={(e) => setReplyRecipients(e.target.value)}
                className="border-0 p-0 h-auto text-xs focus:ring-0 focus:outline-none shadow-none"
                  placeholder="Enter recipient email addresses"
                />
              </div>
            </div>

          {/* CC Field (if populated) */}
            {replyCc !== undefined && (
            <div className="flex items-center py-2 px-4 border-b border-gray-100">
              <div className="w-12 text-xs text-gray-600 font-medium">Cc:</div>
                <div className="flex-1">
                  <Input
                    value={replyCc}
                    onChange={(e) => setReplyCc(e.target.value)}
                  className="border-0 p-0 h-auto text-xs focus:ring-0 focus:outline-none shadow-none"
                    placeholder="Enter CC email addresses"
                  />
                </div>
              </div>
            )}

            {/* Subject Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">Subject:</div>
            <div className="flex-1 text-xs text-gray-900">
                {replyMode.type === 'forward' 
                  ? `Fwd: ${replyMode.originalEmail.subject}`
                : (replyMode.originalEmail.subject.startsWith('Re: ')
                    ? replyMode.originalEmail.subject 
                  : `Re: ${replyMode.originalEmail.subject}`)}
              </div>
            </div>

          {/* Tap Agent Section */}
          <div className="mx-3 my-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <WandSparkles className="h-4 w-4 text-blue-500" />
                    <GradientText
                      colors={["#ff6b35", "#4079ff", "#ff8500", "#3b82f6", "#ff6b35"]}
                      animationSpeed={3}
                      showBorder={false}
                      className="text-xs font-medium"
                        >
                      Tap Agent
                    </GradientText>
                        </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors">
                          <Sparkles className="h-3 w-3 text-gray-500" />
                          Generate
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'friendly', undefined, replyEditorRef)}>
                          <Lightbulb className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Friendly tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'professional', undefined, replyEditorRef)}>
                          <Users className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Professional tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'direct', undefined, replyEditorRef)}>
                          <ArrowRight className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Direct tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'casual', undefined, replyEditorRef)}>
                          <Eye className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Casual tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'formal', undefined, replyEditorRef)}>
                          <Shield className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Formal tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'persuasive', undefined, replyEditorRef)}>
                          <Wand2 className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Persuasive tone</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <MessageSquare className="h-3 w-3 text-gray-500" />
                      Instructions
                    </button>
                  </div>
                </div>
                
                {/* Tone Buttons on Right */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => callGenerateEmailResponse?.('tone', 'friendly', undefined, replyEditorRef)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Lightbulb className="h-3 w-3 text-gray-500" />
                    Friendly
                  </button>
                  <button
                    onClick={() => callGenerateEmailResponse?.('tone', 'professional', undefined, replyEditorRef)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Users className="h-3 w-3 text-gray-500" />
                    Professional
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors">
                        <Palette className="h-3 w-3 text-gray-500" />
                        More
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'direct', undefined, replyEditorRef)}>
                        <ArrowRight className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Direct</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'casual', undefined, replyEditorRef)}>
                        <Eye className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Casual</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'formal', undefined, replyEditorRef)}>
                        <Shield className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Formal</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'persuasive', undefined, replyEditorRef)}>
                        <Wand2 className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Persuasive</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Three-dot Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-2 py-1.5 rounded-md transition-colors">
                        <MoreHorizontal className="h-3 w-3 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        actualSetTempEmailRules(emailRules || '');
                        actualSetShowEmailRulesDialog(true);
                      }}>
                        <Shield className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Email Rules</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                    </div>
              </div>
            </div>
            
            {/* Instructions Dropdown - Now part of normal flow */}
            {showInstructions && (
              <div className="border-t border-gray-200 bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-3">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom Instructions
                      </label>
                      <textarea
                        ref={(el) => { if (el) el.id = 'instructions-textarea-1'; }}
                        placeholder="Enter specific instructions for how you'd like the AI to respond..."
                        className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                    
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowInstructions(false)}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isGenerating}
                onClick={() => {
                            const textarea = document.getElementById('instructions-textarea-1') as HTMLTextAreaElement;
                            const customInstructions = textarea?.value || '';
                            if (customInstructions.trim()) {
                              callGenerateEmailResponse?.('custom', undefined, customInstructions, replyEditorRef);
                            }
                            setShowInstructions(false);
                          }}
                          className={`text-xs px-3 py-1 rounded transition-all duration-300 ${
                            isGenerating 
                              ? 'text-white bg-blue-600 button-pulse cursor-not-allowed' 
                              : 'text-white bg-blue-500 hover:bg-blue-600 hover:shadow-md'
                          }`}
                        >
                          {isGenerating ? (
                            <div className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs text-white">
                                Applying...
                              </span>
                            </div>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            </div>

            {/* Message Content */}
          <div className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
              <div 
              ref={replyEditorRef}
                contentEditable
              className="w-full min-h-full text-sm outline-none"
              onBlur={() => {
                if (replyEditorRef.current) {
                  setReplyContent(replyEditorRef.current.innerHTML || '');
                }
              }}
              suppressContentEditableWarning={true}
            />
                  </div>
                </div>
              )}

      {/* Email Content - Hidden when replying */}
      {!replyMode && (
        <div className="flex-1 overflow-auto px-3 py-6 bg-white custom-scrollbar">
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
            <div className="prose max-w-none email-content" data-email-content>
            <IframeEmail html={htmlContent} />
          </div>
        )}
      </div>
      )}
      
      {/* Email Rules Modal */}
      {actualShowEmailRulesDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => actualSetShowEmailRulesDialog(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <h2 className="text-lg font-semibold">Email Rules</h2>
                </div>
                <button 
                  onClick={() => actualSetShowEmailRulesDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Set rules that the AI will follow when generating email responses. These rules will be applied to all AI-generated replies.
              </p>
              
              {/* Content */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rules for AI Responses
                  </label>
                  <textarea
                    value={actualTempEmailRules}
                    onChange={(e) => actualSetTempEmailRules(e.target.value)}
                    placeholder="Enter rules for AI to follow when replying (e.g., 'Always be concise', 'Include next steps', 'Use professional tone', 'Ask clarifying questions when needed')..."
                    className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>
                
                <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-md">
                  <div className="flex items-start gap-2">
                    <Info className="h-3 w-3 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Example Rules:</p>
                      <ul className="space-y-1 text-blue-800">
                        <li>• Keep responses under 100 words</li>
                        <li>• Always include a clear next step</li>
                        <li>• Use a friendly but professional tone</li>
                        <li>• Ask questions to clarify requirements</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="flex justify-end gap-3 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    actualSetTempEmailRules(emailRules || '');
                    actualSetShowEmailRulesDialog(false);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    setEmailRules?.(actualTempEmailRules);
                    actualSetShowEmailRulesDialog(false);
                  }}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  Save Rules
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Thread viewer component with integrated reply
const EmailThreadViewer = ({ 
  thread, 
  merchantData, 
  userEmail, 
  merchantEmail, 
  selectedAccount,
  replyMode,
  onStartReply, 
  onStartReplyAll, 
  onStartForward,
  onSendReply,
  onCancelReply,
  isSending,
  tapAgentMode,
  setTapAgentMode,
  tapAgentInstructions,
  setTapAgentInstructions,
  selectedTone,
  setSelectedTone,
  isGenerating,
  setIsGenerating,
  callGenerateEmailResponse,
  emailRules,
  setEmailRules,
  threadSummary,
  isSummarizing,
  onSummarizeThread,
  showEmailRulesDialog,
  setShowEmailRulesDialog,
  tempEmailRules,
  setTempEmailRules
}: {
  thread: any;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  selectedAccount: string;
  replyMode?: { type: 'reply' | 'replyAll' | 'forward', originalEmail: any, thread?: any } | null;
  onStartReply?: (email: any) => void;
  onStartReplyAll?: (email: any) => void;
  onStartForward?: (email: any) => void;
  onSendReply?: (content: string, subject: string, recipients: string[], attachments: File[]) => void;
  onCancelReply?: () => void;
  isSending?: boolean;
  tapAgentMode?: 'full-response' | 'instructions' | 'tone' | null;
  setTapAgentMode?: (mode: 'full-response' | 'instructions' | 'tone' | null) => void;
  tapAgentInstructions?: string;
  setTapAgentInstructions?: (instructions: string) => void;
  selectedTone?: string;
  setSelectedTone?: (tone: string) => void;
  isGenerating?: boolean;
  setIsGenerating?: (generating: boolean) => void;
  callGenerateEmailResponse?: (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => Promise<any>;
  emailRules?: string;
  setEmailRules?: (rules: string) => void;
  threadSummary?: string;
  isSummarizing?: boolean;
  onSummarizeThread?: () => void;
  showEmailRulesDialog?: boolean;
  setShowEmailRulesDialog?: (show: boolean) => void;
  tempEmailRules?: string;
  setTempEmailRules?: (rules: string) => void;
}) => {
  const [replyContent, setReplyContent] = useState('');
  const [replyQuotedContent, setReplyQuotedContent] = useState('');
  const [replyRecipients, setReplyRecipients] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Local state for dialog
  const [localShowEmailRulesDialog, setLocalShowEmailRulesDialog] = useState(false);
  const [localTempEmailRules, setLocalTempEmailRules] = useState('');
  
  // Use passed props or fallback to local state
  const actualShowEmailRulesDialog = showEmailRulesDialog ?? localShowEmailRulesDialog;
  const actualSetShowEmailRulesDialog = setShowEmailRulesDialog ?? setLocalShowEmailRulesDialog;
  const actualTempEmailRules = tempEmailRules ?? localTempEmailRules;
  const actualSetTempEmailRules = setTempEmailRules ?? setLocalTempEmailRules;

  // Initialize expanded emails when thread changes - most recent email should be expanded
  useEffect(() => {
    if (thread.emails && thread.emails.length > 0) {
      // Most recent email is at index 0 (sorted newest first)
      const mostRecentEmailId = thread.emails[0]?.id;
      if (mostRecentEmailId) {
        setExpandedEmails(new Set([mostRecentEmailId]));
      }
    }
  }, [thread.threadId]); // Re-run when thread changes

  const toggleEmailExpansion = (emailId: string) => {
    setExpandedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(emailId)) {
        newSet.delete(emailId);
      } else {
        newSet.add(emailId);
      }
      return newSet;
    });
  };

  // Auto-scroll to the bottom to show new messages
  useEffect(() => {
    if (thread.emails.length > 0) {
      const latestEmail = thread.emails[thread.emails.length - 1];
      if (latestEmail.folder === 'sent' || latestEmail.id?.startsWith('sent-')) {
        // Scroll to the bottom to show the new message
        setTimeout(() => {
          const threadMessagesContainer = document.querySelector('.thread-messages-container');
          if (threadMessagesContainer) {
            threadMessagesContainer.scrollTop = threadMessagesContainer.scrollHeight;
          }
        }, 100);
      }
    }
  }, [thread.emails]);

  // Reset reply content when reply mode changes (only on mode change, not on every render)
  const [replyModeKey, setReplyModeKey] = useState<string>('');
  
  useEffect(() => {
    const newKey = replyMode ? `${replyMode.type}-${replyMode.originalEmail.id}` : '';
    
    // Only update if the mode actually changed (not just a re-render)
    if (newKey !== replyModeKey) {
      setReplyModeKey(newKey);
      
      if (replyMode) {
        // Auto-populate recipients based on reply type
        const mostRecentEmail = thread.emails[thread.emails.length - 1];
        if (replyMode.type === 'reply') {
          setReplyRecipients(mostRecentEmail.email);
          setReplyCc('');
          // Pre-populate the editor with quoted content
          const quotedContent = createQuotedReplyContent(replyMode.originalEmail, replyMode.type);
          const fullContent = `<div><br><br></div><hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">${quotedContent}`;
          setReplyQuotedContent('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = fullContent;
            // Position cursor at the beginning
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStart(replyEditorRef.current.firstChild!, 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            replyEditorRef.current.focus();
          }
        } else if (replyMode.type === 'replyAll') {
          setReplyRecipients(mostRecentEmail.email);
          setReplyCc('');
          // Pre-populate the editor with quoted content
          const quotedContent = createQuotedReplyContent(replyMode.originalEmail, replyMode.type);
          const fullContent = `<div><br><br></div><hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">${quotedContent}`;
          setReplyQuotedContent('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = fullContent;
            // Position cursor at the beginning
            const range = document.createRange();
            const selection = window.getSelection();
            range.setStart(replyEditorRef.current.firstChild!, 0);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
            replyEditorRef.current.focus();
          }
        } else if (replyMode.type === 'forward') {
          setReplyRecipients('');
          setReplyCc('');
          setReplyContent('');
          if (replyEditorRef.current) {
            replyEditorRef.current.innerHTML = '';
          }
          setReplyQuotedContent('');
        }
      } else {
        setReplyContent('');
        if (replyEditorRef.current) {
          replyEditorRef.current.innerHTML = '';
        }
        setReplyQuotedContent('');
        setReplyRecipients('');
        setReplyCc('');
        setReplyAttachments([]);
      }
    }
  }, [replyMode, replyModeKey, thread.emails]);

  // Get the most recent email for replying
  const mostRecentEmail = thread.emails[thread.emails.length - 1];

  return (
    <div className="flex flex-col h-full email-thread-container">
      {/* Thread Header - Hidden when replying */}
      {!replyMode && (
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
                      onClick={() => onStartReply?.(mostRecentEmail)}
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
                      onClick={() => onStartReplyAll?.(mostRecentEmail)}
                    >
                      <ReplyAll className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reply All</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
                
                {/* Summarize Thread Button */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={onSummarizeThread}
                        disabled={isSummarizing}
                      >
                        {isSummarizing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MessageSquare className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{isSummarizing ? 'Summarising...' : 'Summarise Thread'}</p>
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
                      onClick={() => onStartForward?.(mostRecentEmail)}
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
            
            {/* Thread Summary Display */}
            {threadSummary && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Thread Summary</h4>
                    <p className="text-sm text-blue-800 leading-relaxed">{threadSummary}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reply Compose Area - Raw in right panel */}
              {replyMode && (
        <div className="flex flex-col h-full bg-white">
          {/* From Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">From:</div>
            <div className="flex-1 text-xs text-gray-900">{selectedAccount}</div>
            <div className="flex gap-2">
                <Button
                  onClick={() => {
                  const currentReplyContent = replyEditorRef.current?.innerHTML || '';
                  if (currentReplyContent.trim() && replyRecipients.trim()) {
                      const subject = replyMode.originalEmail.subject.startsWith('Re: ') ? replyMode.originalEmail.subject : `Re: ${replyMode.originalEmail.subject}`;
                      const recipients = [
                        ...replyRecipients.split(',').map(email => email.trim()).filter(Boolean),
                        ...replyCc.split(',').map(email => email.trim()).filter(Boolean)
                      ];
                    onSendReply?.(currentReplyContent, subject, recipients, replyAttachments);
                    }
                  }}
                  disabled={!replyRecipients.trim() || isSending}
                className="bg-blue-500 hover:bg-blue-600 text-white h-7 px-2 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                >
                  {isSending ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                  <Send className="h-3 w-3 mr-1" />
                  )}
                  {isSending ? 'Sending...' : 'Send'}
                </Button>
                <Button
                variant="ghost"
                  onClick={onCancelReply}
                className="h-7 px-2 text-gray-600 hover:text-gray-900 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>

            {/* To Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">To:</div>
              <div className="flex-1">
                <Input
                  value={replyRecipients}
                  onChange={(e) => setReplyRecipients(e.target.value)}
                className="border-0 p-0 h-auto text-xs focus:ring-0 focus:outline-none shadow-none"
                  placeholder="Enter recipient email addresses"
                />
              </div>
            </div>

          {/* CC Field (if populated) */}
            {replyCc !== undefined && (
            <div className="flex items-center py-2 px-4 border-b border-gray-100">
              <div className="w-12 text-xs text-gray-600 font-medium">Cc:</div>
                <div className="flex-1">
                  <Input
                    value={replyCc}
                    onChange={(e) => setReplyCc(e.target.value)}
                  className="border-0 p-0 h-auto text-xs focus:ring-0 focus:outline-none shadow-none"
                    placeholder="Enter CC email addresses"
                  />
                </div>
              </div>
            )}

            {/* Subject Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">Subject:</div>
            <div className="flex-1 text-xs text-gray-900">
                {replyMode.type === 'forward' 
                  ? `Fwd: ${replyMode.originalEmail.subject}`
                  : replyMode.originalEmail.subject.startsWith('Re: ') 
                    ? replyMode.originalEmail.subject 
                    : `Re: ${replyMode.originalEmail.subject}`
                }
              </div>
            </div>

          {/* Tap Agent Section */}
          <div className="mx-3 my-2">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <WandSparkles className="h-4 w-4 text-blue-500" />
                    <GradientText
                      colors={["#ff6b35", "#4079ff", "#ff8500", "#3b82f6", "#ff6b35"]}
                      animationSpeed={3}
                      showBorder={false}
                      className="text-xs font-medium"
                        >
                      Tap Agent
                    </GradientText>
                </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors">
                          <Sparkles className="h-3 w-3 text-gray-500" />
                          Generate
                          <ChevronDown className="h-3 w-3 text-gray-500" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'friendly', undefined, replyEditorRef)}>
                          <Lightbulb className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Friendly tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'professional', undefined, replyEditorRef)}>
                          <Users className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Professional tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'direct', undefined, replyEditorRef)}>
                          <ArrowRight className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Direct tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'casual', undefined, replyEditorRef)}>
                          <Eye className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Casual tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'formal', undefined, replyEditorRef)}>
                          <Shield className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Formal tone</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'persuasive', undefined, replyEditorRef)}>
                          <Wand2 className="h-3 w-3 text-gray-500 mr-2" />
                          <span className="text-xs">Persuasive tone</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <MessageSquare className="h-3 w-3 text-gray-500" />
                      Instructions
                    </button>
            </div>
          </div>
                
                {/* Tone Buttons on Right */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => callGenerateEmailResponse?.('tone', 'friendly', undefined, replyEditorRef)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Lightbulb className="h-3 w-3 text-gray-500" />
                    Friendly
                  </button>
                  <button
                    onClick={() => callGenerateEmailResponse?.('tone', 'professional', undefined, replyEditorRef)}
                    className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                  >
                    <Users className="h-3 w-3 text-gray-500" />
                    Professional
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors">
                        <Palette className="h-3 w-3 text-gray-500" />
                        More
                        <ChevronDown className="h-3 w-3 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'direct', undefined, replyEditorRef)}>
                        <ArrowRight className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Direct</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'casual', undefined, replyEditorRef)}>
                        <Eye className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Casual</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'formal', undefined, replyEditorRef)}>
                        <Shield className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Formal</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => callGenerateEmailResponse?.('tone', 'persuasive', undefined, replyEditorRef)}>
                        <Wand2 className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Persuasive</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Three-dot Options Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-2 py-1.5 rounded-md transition-colors">
                        <MoreHorizontal className="h-3 w-3 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => {
                        actualSetTempEmailRules(emailRules || '');
                        actualSetShowEmailRulesDialog(true);
                      }}>
                        <Shield className="h-3 w-3 text-gray-500 mr-2" />
                        <span className="text-xs">Email Rules</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onSummarizeThread} disabled={isSummarizing}>
                        {isSummarizing ? (
                          <Loader2 className="h-3 w-3 animate-spin text-gray-500 mr-2" />
                        ) : (
                          <MessageSquare className="h-3 w-3 text-gray-500 mr-2" />
                        )}
                        <span className="text-xs">{isSummarizing ? 'Summarising...' : 'Summarise Thread'}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
              </div>
              </div>
            </div>
            
            {/* Instructions Dropdown - Now part of normal flow */}
            {showInstructions && (
              <div className="border-t border-gray-200 bg-gray-50 animate-in slide-in-from-top-2 duration-200">
                <div className="p-3">
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Custom Instructions
                      </label>
                      <textarea
                        ref={(el) => { if (el) el.id = 'instructions-textarea-2'; }}
                        placeholder="Enter specific instructions for how you'd like the AI to respond..."
                        className="w-full text-xs border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                     
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowInstructions(false)}
                          className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          disabled={isGenerating}
                onClick={() => {
                            const textarea = document.getElementById('instructions-textarea-2') as HTMLTextAreaElement;
                            const customInstructions = textarea?.value || '';
                            if (customInstructions.trim()) {
                              callGenerateEmailResponse?.('custom', undefined, customInstructions, replyEditorRef);
                            }
                            setShowInstructions(false);
                          }}
                          className={`text-xs px-3 py-1 rounded transition-all duration-300 ${
                            isGenerating 
                              ? 'text-white bg-blue-600 button-pulse cursor-not-allowed' 
                              : 'text-white bg-blue-500 hover:bg-blue-600 hover:shadow-md'
                          }`}
                        >
                          {isGenerating ? (
                            <div className="flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span className="text-xs text-white">
                                Applying...
                              </span>
                            </div>
                          ) : (
                            'Apply'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Three-dot Options Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-2 py-1.5 rounded-md transition-colors">
                  <MoreHorizontal className="h-3 w-3 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {
                  actualSetTempEmailRules(emailRules || '');
                  actualSetShowEmailRulesDialog(true);
                }}>
                  <Shield className="h-3 w-3 text-gray-500 mr-2" />
                  <span className="text-xs">Email Rules</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSummarizeThread} disabled={isSummarizing}>
                  {isSummarizing ? (
                    <Loader2 className="h-3 w-3 animate-spin text-gray-500 mr-2" />
                  ) : (
                    <MessageSquare className="h-3 w-3 text-gray-500 mr-2" />
                  )}
                  <span className="text-xs">{isSummarizing ? 'Summarising...' : 'Summarise Thread'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
            </div>

            {/* Message Content */}
          <div className="flex-1 px-3 py-6 overflow-y-auto custom-scrollbar">
              <div 
              ref={replyEditorRef}
                contentEditable
              className="w-full min-h-full text-sm outline-none"
              onBlur={() => {
                if (replyEditorRef.current) {
                  setReplyContent(replyEditorRef.current.innerHTML || '');
                }
                }}
                suppressContentEditableWarning={true}
            />
                  </div>
                </div>
              )}

      {/* Thread Messages - Hidden when replying */}
      {!replyMode && (
      <div className="flex-1 overflow-auto custom-scrollbar thread-messages-container">
          <div className="space-y-6 pb-8 px-3">
          {(() => {
            console.log("🎬 EmailThreadViewer rendering thread emails:", {
              totalEmails: thread.emails.length,
              threadId: thread.threadId,
              emailDetails: thread.emails.map((e: any) => ({ 
                id: e.id, 
                sender: e.sender, 
                to: e.to,
                subject: e.subject?.substring(0, 30),
                contentLength: e.content?.length || 0
              }))
            });
            return thread.emails.slice();
          })()
            .sort((a: any, b: any) => {
              // Get the appropriate date field for each email - prioritize repliedAt or receivedAt
              const getEmailDate = (email: any) => {
                // Priority 1: repliedAt (for reply emails)
                  if (email.repliedAt) {
                    if (typeof email.repliedAt.toDate === 'function') {
                      return email.repliedAt.toDate();
                    }
                    return new Date(email.repliedAt);
                  }
                  
                  // Priority 2: receivedAt (for received emails)
                  if (email.receivedAt) {
                    if (typeof email.receivedAt.toDate === 'function') {
                      return email.receivedAt.toDate();
                    }
                    return new Date(email.receivedAt);
                  }
                  
                  // Priority 3: time (fallback)
                  if (email.time) {
                    if (typeof email.time.toDate === 'function') {
                      return email.time.toDate();
                    }
                    return new Date(email.time);
                  }
                  
                  // Fallback to epoch time if nothing available
                  return new Date(0);
              };
              
              const dateA = getEmailDate(a);
              const dateB = getEmailDate(b);
              
                // Sort chronologically (oldest first)
                return dateA.getTime() - dateB.getTime();
            })
            .map((email: any, index: number, filteredArray: any[]) => (
            <EmailInThread
              key={email.id}
              email={email}
              merchantData={merchantData}
              userEmail={userEmail}
              merchantEmail={merchantEmail}
              isFirst={index === 0}
              isLast={index === filteredArray.length - 1}
              isExpanded={expandedEmails.has(email.id)}
              onToggleExpansion={() => toggleEmailExpansion(email.id)}
            />
          ))}
        </div>
      </div>
      )}
    </div>
  );
};

// Individual email in thread component - traditional email style
const EmailInThread = ({ 
  email, 
  merchantData, 
  userEmail, 
  merchantEmail, 
  isFirst, 
  isLast, 
  isExpanded, 
  onToggleExpansion 
}: {
  email: any;
  merchantData: any;
  userEmail: string;
  merchantEmail: string;
  isFirst: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpansion: () => void;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const isFromCurrentUser = isEmailFromCurrentUser(email.email, userEmail, merchantEmail);
  const isSentMessage = email.folder === 'sent' || email.id?.startsWith('sent-');

  console.log("🎨 Rendering EmailInThread:", {
    id: email.id,
    sender: email.sender,
    to: email.to,
    contentLength: email.content?.length || 0,
    htmlMessageLength: email.htmlMessage?.length || 0,
    hasRawData: !!email.rawData,
    isFirst,
    isLast
  });

  useEffect(() => {
    const loadEmailContent = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Priority 1: Use htmlMessage if available
        if (email.htmlMessage) {
          const sanitisedHtml = sanitiseAndRenderHtml(email.htmlMessage);
          setHtmlContent(sanitisedHtml);
        }
        // Priority 2: Extract from raw data
        else if (email.rawData) {
          // Extract and decode HTML content from raw email data
          const extractedHtml = extractHtmlContent(email.rawData);
          if (extractedHtml) {
            const sanitisedHtml = sanitiseAndRenderHtml(extractedHtml);
            setHtmlContent(sanitisedHtml);
          } else {
            // Fallback to existing content
            setHtmlContent(email.content || 'No content available');
          }
        } 
        // Priority 3: Use content field
        else if (email.content) {
          // Check if content contains HTML tags (for thread replies with HTML content)
          const containsHtml = /<[^>]*>/g.test(email.content);
          if (containsHtml) {
            // Sanitise HTML content for thread replies
            const sanitisedHtml = sanitiseAndRenderHtml(email.content);
            setHtmlContent(sanitisedHtml);
          } else {
            // Plain text content
            setHtmlContent(email.content);
          }
        } else {
          setHtmlContent('No content available');
        }
      } catch (error) {
        console.error('Error loading email content:', error);
        setError('Failed to load email content');
        setHtmlContent(email.htmlMessage || email.content || 'Error loading content');
      } finally {
        setLoading(false);
      }
    };

    loadEmailContent();
  }, [email]);

  // Only show merchant logo if the email sender matches the current user's email
  const shouldShowMerchantLogo = email.email === userEmail || email.email === merchantEmail;

  // Create a preview of the email content for collapsed state
  const getEmailPreview = () => {
    // Use htmlMessage first, fallback to content
    const htmlContent = email.htmlMessage || email.content || '';
    if (htmlContent) {
      // Strip HTML tags and clean up text for preview
      const textContent = htmlContent
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
        .replace(/&amp;/g, '&') // Replace &amp; with &
        .replace(/&lt;/g, '<') // Replace &lt; with <
        .replace(/&gt;/g, '>') // Replace &gt; with >
        .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
        .trim();
      return textContent.length > 100 ? textContent.substring(0, 100) + '...' : textContent;
    }
    return 'No content available';
  };

  return (
    <div className={`border-b border-gray-100 pb-6 last:border-b-0 ${isFirst ? 'pt-4' : ''}`}>
      {/* Email Header - Clickable for collapsed emails */}
      <div 
        className={`flex items-start gap-3 mb-4 ${!isExpanded ? 'cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-md' : ''}`}
        onClick={!isExpanded ? onToggleExpansion : undefined}
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          {shouldShowMerchantLogo && <AvatarImage src={merchantData?.logoUrl} />}
          <AvatarFallback className={`font-semibold text-sm ${
            isSentMessage ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
          }`}>
            {email.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{email.sender}</span>
            <span className="text-sm text-gray-600">&lt;{email.email}&gt;</span>
            {isSentMessage && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                Sent
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-1">
            <span><span className="font-bold">To:</span> {email.to || "Unknown Recipient"}</span>
            <span>{(() => {
              // Get the appropriate timestamp with proper Firestore handling
              const timestamp = email.repliedAt || email.receivedAt || email.time;
              if (!timestamp) return 'Unknown time';
              
              // Handle Firestore Timestamp objects
              if (timestamp && typeof timestamp.toDate === 'function') {
                return formatPreviewTime(timestamp.toDate());
              }
              
              // Handle string or Date objects
              return formatPreviewTime(timestamp);
            })()}</span>
            {email.hasAttachment && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                <span>Attachment</span>
              </div>
            )}
          </div>
          
          {/* Content Preview for Collapsed State */}
          {!isExpanded && (
            <div className="text-sm text-gray-600 mt-2 line-clamp-2">
              {getEmailPreview()}
            </div>
          )}
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 ml-2">
          {isExpanded ? (
            <button
              onClick={onToggleExpansion}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              title="Collapse email"
            >
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </button>
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {/* Email Content - Only show when expanded */}
      {isExpanded && (
        <div className="ml-13">
          {/* Compact Attachments - Right after header in thread */}
          <div className="mb-1">
            <CompactAttachmentList attachments={extractAttachments(email)} />
          </div>
          
          {loading ? (
            <div className="flex items-center py-8">
              <RefreshCw className="h-4 w-4 animate-spin mr-2 text-gray-400" />
              <span className="text-gray-600">Loading content...</span>
            </div>
          ) : error ? (
            <div className="py-8">
              <div className="flex items-center mb-2">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-red-600">{error}</span>
              </div>
            </div>
          ) : (
            <div className="prose max-w-none">
              {isSentMessage && !htmlContent ? (
                // For sent messages with no HTML content, display plain text
                <div 
                  className="email-content whitespace-pre-wrap text-gray-900"
                  style={{
                    lineHeight: '1.6',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    fontSize: '14px'
                  }}
                >
                  {email.content}
                </div>
              ) : (
                // For all messages with HTML content (including thread replies), display HTML
                <div className="email-content" data-email-content>
                <IframeEmail html={htmlContent || email.content || 'No content available'} className="text-sm" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 