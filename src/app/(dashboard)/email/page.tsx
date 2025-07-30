"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import DOMPurify from 'dompurify';

// Function to generate a consistent color based on a string (name or email)
const getConsistentColor = (str: string): string => {
  if (!str) return 'bg-gray-200';
  
  // Generate a simple hash from the string
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Define a set of pleasant, accessible background colors
  const colors = [
    'bg-blue-100', 'bg-green-100', 'bg-yellow-100', 'bg-purple-100',
    'bg-pink-100', 'bg-indigo-100', 'bg-red-100', 'bg-orange-100',
    'bg-teal-100', 'bg-cyan-100', 'bg-lime-100', 'bg-emerald-100'
  ];
  
  // Use the hash to pick a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
};

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
  DialogPortal,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuContent,
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
  Briefcase,
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
  Smile,
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
  FileAudio,
  MailPlus,
  CheckCircle,
  Clock,
  Filter,
  NotebookPen,
  ClipboardCheck,
  AlignLeft,
  Code,
  XCircle,
  List,
  ArrowUp,
  ArrowDown
} from "lucide-react"
import { RiRobot3Line } from "react-icons/ri"
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import GradientText from "@/components/GradientText"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, onSnapshot, updateDoc, setDoc, addDoc, deleteDoc, Timestamp, QueryConstraint, startAfter } from "firebase/firestore"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { formatMelbourneTime } from "@/lib/date-utils"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import { useVirtualizer } from '@tanstack/react-virtual';
import * as ReactDOM from 'react-dom/client'
import AnimatedEmailResponse from "@/components/animated-email-response"

// Email Chip Component for displaying email addresses with light box
const EmailChip = ({ email, onRemove }: { email: string; onRemove?: (email: string) => void }) => {
  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-transparent text-gray-700 border border-gray-300">
      <span className="truncate max-w-32">{email}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(email)}
          className="ml-1 p-0.5 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="h-3 w-3 text-gray-500" />
        </button>
      )}
    </div>
  );
};

// Email Input Component with chips
const EmailInputWithChips = ({ 
  value, 
  onChange, 
  placeholder, 
  className = "",
  user
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  className?: string;
  user?: any;
}) => {
  const [inputValue, setInputValue] = useState('');
  const [contactEmails, setContactEmails] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const emails = value.split(',').map(e => e.trim()).filter(Boolean);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    
    return contactEmails
      .filter(email => 
        email.toLowerCase().includes(inputValue.toLowerCase()) &&
        !emails.includes(email)
      )
      .slice(0, 8);
  }, [inputValue, contactEmails, emails]);

  // Fetch contact emails from Firestore
  useEffect(() => {
    const fetchContactEmails = async () => {
      if (!user?.uid) return;
      
      try {
        const contactEmailsRef = collection(db, 'merchants', user.uid, 'contactemails');
        const querySnapshot = await getDocs(contactEmailsRef);
        const emails = querySnapshot.docs.map(doc => doc.data().email).filter(Boolean);
        // Remove duplicates and sort
        const uniqueEmails = [...new Set(emails)].sort();
        setContactEmails(uniqueEmails);
      } catch (error) {
        console.error('Error fetching contact emails:', error);
      }
    };

    fetchContactEmails();
  }, [user?.uid]);

  // Update showSuggestions based on filtered results
  useEffect(() => {
    setShowSuggestions(filteredSuggestions.length > 0);
  }, [filteredSuggestions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        // Select the highlighted suggestion
        const selectedEmail = filteredSuggestions[selectedIndex];
        handleSuggestionSelect(selectedEmail);
      } else {
        // Add the typed email
        const newEmail = inputValue.trim();
        if (newEmail && !emails.includes(newEmail)) {
          const newEmails = [...emails, newEmail];
          onChange(newEmails.join(', '));
          setInputValue('');
        }
      }
    } else if (e.key === ',') {
      e.preventDefault();
      const newEmail = inputValue.trim();
      if (newEmail && !emails.includes(newEmail)) {
        const newEmails = [...emails, newEmail];
        onChange(newEmails.join(', '));
        setInputValue('');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
        // Select the highlighted suggestion with Tab
        const selectedEmail = filteredSuggestions[selectedIndex];
        handleSuggestionSelect(selectedEmail);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Backspace' && inputValue === '' && emails.length > 0) {
      // Remove last email on backspace when input is empty
      const newEmails = emails.slice(0, -1);
      onChange(newEmails.join(', '));
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const newEmails = emails.filter(email => email !== emailToRemove);
    onChange(newEmails.join(', '));
  };

  const handleBlur = () => {
    const newEmail = inputValue.trim();
    if (newEmail && !emails.includes(newEmail)) {
      const newEmails = [...emails, newEmail];
      onChange(newEmails.join(', '));
      setInputValue('');
    }
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 100);
  };

  const handleSuggestionClick = (email: string) => {
    if (!emails.includes(email)) {
      const newEmails = [...emails, email];
      onChange(newEmails.join(', '));
    }
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleSuggestionSelect = (email: string) => {
    // Add the selected email as a chip
    if (!emails.includes(email)) {
      const newEmails = [...emails, email];
      onChange(newEmails.join(', '));
    }
    // Clear the input and close suggestions
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return (
    <div className="relative">
      <div className={`flex flex-wrap items-center gap-1.5 min-h-8 px-2 py-1 bg-transparent border-none outline-none focus:ring-0 text-gray-900 ${className}`}>
        {emails.map((email, index) => (
          <EmailChip 
            key={index} 
            email={email} 
            onRemove={handleRemoveEmail}
          />
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onBlur={handleBlur}

          className="flex-1 min-w-32 text-xs bg-transparent border-none outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
          placeholder={emails.length === 0 ? placeholder : ''}
        />
      </div>
      
      {/* Autocomplete Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div 
          className="absolute top-full left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto w-96"
          onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking dropdown
        >
          {filteredSuggestions.map((email: string, index: number) => (
            <div
              key={email}
              className={`px-3 py-1.5 text-xs cursor-pointer ${
                index === selectedIndex ? 'bg-blue-100 text-gray-700 font-medium' : 'text-gray-700 hover:bg-blue-100'
              }`}
              onClick={() => handleSuggestionSelect(email)}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking items
            >
              {email}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
    width: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.2);
    border-radius: 1.5px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.4);
  }
  
  /* For Firefox */
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.2) transparent;
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
  let htmlContent = '';
  const rawContent = originalEmail.htmlMessage || originalEmail.content || '';
  
  try {
    // Create a temporary container to properly sanitize HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawContent;
    
    // Remove all style tags completely to prevent CSS leakage
    const styleTags = tempDiv.querySelectorAll('style');
    styleTags.forEach(style => style.remove());
    
    // Remove all script tags for security
    const scriptTags = tempDiv.querySelectorAll('script');
    scriptTags.forEach(script => script.remove());
    
    // Get the sanitized content
    htmlContent = tempDiv.innerHTML;
    
    // If we have a body tag, just use its contents
    const bodyContent = tempDiv.querySelector('body');
    if (bodyContent) {
      htmlContent = bodyContent.innerHTML;
    }
  } catch (error) {
    console.error('Error sanitizing HTML content:', error);
    // Fallback to the original content if DOM manipulation fails
    htmlContent = rawContent;
  }
  
  // If content is not HTML, wrap it in paragraphs
  if (!htmlContent.includes('<') || !htmlContent.includes('>')) {
    // Plain text content - convert line breaks to paragraphs
    htmlContent = htmlContent.split('\n').filter((line: string) => line.trim()).map((line: string) => `<p>${line.trim()}</p>`).join('');
  }
  
  // Create HTML quoted content with Outlook-style header (4-5 lines including CC if present)
  const ccRecipients = extractCcRecipients(originalEmail);
  const ccLine = ccRecipients ? `<strong>Cc:</strong> ${ccRecipients}<br>` : '';
  
  const quotedContent = `<div style="margin-top: 20px;">
<div style="padding-left: 0px; margin: 10px 0; color: #666;">
<div style="font-size: 16px; color: #888; margin-bottom: 15px; line-height: 1.4;">
<strong>From:</strong> ${originalEmail.sender} &lt;${originalEmail.email}&gt;<br>
<strong>Date:</strong> ${dateStr}<br>
<strong>To:</strong> ${originalEmail.to || 'Unknown Recipient'}<br>
${ccLine}<strong>Subject:</strong> ${originalEmail.subject || 'No Subject'}
</div>
${htmlContent}
</div>
</div>`;

  return quotedContent;
};

// IframeEmail component for safe HTML rendering
type IframeEmailProps = { html: string; className?: string };

const IframeEmail = ({ html, className = "" }: IframeEmailProps) => {
  // Use more aggressive sanitization settings to prevent CSS/style leakage
  const clean = DOMPurify.sanitize(html, { 
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style'],
    WHOLE_DOCUMENT: false,
    SANITIZE_DOM: true
  });
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
  if (!input) return '';
  
  try {
    // Convert base64url to base64
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    // Decode base64 to binary
    const binary = window.atob(base64);
    
    try {
      // Convert binary to UTF-8 string
      return decodeURIComponent(escape(binary));
    } catch (uriError) {
      // Handle malformed URI error by returning the raw binary
      console.warn('URIError in decodeURIComponent:', uriError);
      return binary;
    }
  } catch (error) {
    console.warn('Failed to decode base64url:', error);
    return input; // Return original if decoding fails
  }
}

// Test decoder function similar to the provided Node.js version
const decodePart = (data: string): string => {
  if (!data) return '';
  
  try {
    // 1) Base64-URL → Base64
    let base64Data = data.replace(/-/g, '+').replace(/_/g, '/');
    // pad to multiple of 4
    while (base64Data.length % 4) base64Data += '=';

    // 2) Decode using browser's atob (equivalent to Buffer.from in Node.js)
    const decoded = atob(base64Data);
    
    try {
      // Convert to UTF-8 string (browser equivalent of .toString('utf8'))
      return decodeURIComponent(escape(decoded));
    } catch (uriError) {
      // Handle malformed URI error by returning the raw decoded string
      console.warn('URIError in decodeURIComponent:', uriError);
      return decoded;
    }
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
  
  // No content available from any source
  console.log('❌ No content available from any source');
  return { content: "No content available", isHtml: false };
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

// Helper function to extract CC recipients from email payload
const extractCcRecipients = (emailData: any): string => {
  console.log("🔍 Extracting CC recipients from Firestore email document");
  
  try {
    // First try: Look in rawData (Firestore document) at payload.data.payload.headers
    let headers = emailData.rawData?.payload?.data?.payload?.headers;
    
    // Second try: Look directly in payload.data.payload.headers (for direct Firestore structure)
    if (!headers || !Array.isArray(headers)) {
      headers = emailData.payload?.data?.payload?.headers;
    }
    
    if (headers && Array.isArray(headers)) {
      console.log("📋 Found headers, length:", headers.length);
      console.log("📋 All header names:", headers.map(h => h.name));
      
      // Look for CC header (case-insensitive)
      const ccHeader = headers.find((header: any) => 
        header.name && (header.name.toLowerCase() === 'cc' || header.name === 'CC')
      );
      
      if (ccHeader && ccHeader.value) {
        console.log("✅ Found CC header in Firestore document:", ccHeader.value);
        return ccHeader.value;
      } else {
        console.log("ℹ️ No CC header found in headers array");
      }
    } else {
      console.log("❌ No headers array found");
      console.log("📊 Email document structure:", {
        hasRawData: !!emailData.rawData,
        hasPayload: !!emailData.payload,
        hasPayloadData: !!emailData.payload?.data,
        hasPayloadDataPayload: !!emailData.payload?.data?.payload,
        payloadDataPayloadKeys: emailData.payload?.data?.payload ? Object.keys(emailData.payload.data.payload) : []
      });
    }
    
    return '';
  } catch (error) {
    console.error("❌ Error extracting CC recipients from Firestore document:", error);
    return '';
  }
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

// Detailed date/time formatting for the right panel email viewer
const formatDetailedDateTime = (timestamp: any) => {
  if (!timestamp) return 'Unknown time';
  
  try {
    let dateToFormat: Date;
    
    if (timestamp && typeof timestamp.toDate === 'function') {
      // Firestore timestamp - convert to Date
      dateToFormat = timestamp.toDate();
    } else if (timestamp && typeof timestamp === 'string') {
      // String timestamp
      dateToFormat = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      // Already a Date object
      dateToFormat = timestamp;
    } else {
      console.warn('Unknown timestamp format:', timestamp);
      return 'Invalid time';
    }
    
    if (isNaN(dateToFormat.getTime())) {
      console.warn('Invalid date:', timestamp);
      return 'Invalid time';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const emailDate = new Date(dateToFormat.getFullYear(), dateToFormat.getMonth(), dateToFormat.getDate());
    
    // Format time consistently
    const timeStr = dateToFormat.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    if (emailDate.getTime() === today.getTime()) {
      return `Today at ${timeStr}`;
    } else if (emailDate.getTime() === yesterday.getTime()) {
      return `Yesterday at ${timeStr}`;
    } else {
      // For older dates, show the date and time
      const dateStr = dateToFormat.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return `${dateStr} at ${timeStr}`;
    }
  } catch (e) {
    console.error('Error formatting detailed date time:', timestamp, e);
    return 'Invalid time';
  }
}

export default function EmailPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  
  // Firebase function for generating email responses
  const generateEmailResponse = httpsCallable(functions, 'generateEmailResponse');
  
  // Request queue and debouncing utilities
  const [isProcessing, setIsProcessing] = useState(false);
  const queue = useRef<Array<() => Promise<any>>>([]);
  
  // Agent tab states
  const [agentTasks, setAgentTasks] = useState<any[]>([])
  const [selectedAgentTask, setSelectedAgentTask] = useState<any>(null)
  const [agentTasksLoading, setAgentTasksLoading] = useState(false)
  const [agentSearchQuery, setAgentSearchQuery] = useState("")
  const [isSendingAgentResponse, setIsSendingAgentResponse] = useState(false)
  const [agentResponseSuccess, setAgentResponseSuccess] = useState<string | null>(null)
  const [agentTaskStatusFilter, setAgentTaskStatusFilter] = useState<"pending" | "completed" | "rejected">("pending")
  const [activeTab, setActiveTab] = useState<"response" | "details">("response")
  const [tabChanging, setTabChanging] = useState(false)
  const [isEditingResponse, setIsEditingResponse] = useState(false)
  const [editedResponse, setEditedResponse] = useState("")
  const [editPrompt, setEditPrompt] = useState("")
  const [isUsingAiEdit, setIsUsingAiEdit] = useState(false)
  const [isGeneratingEdit, setIsGeneratingEdit] = useState(false)
  
  // Filter agent tasks based on search query
  const filteredAgentTasks = useMemo(() => {
    return agentTasks.filter(task => 
      agentSearchQuery === "" || 
      task.emailTitle?.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
      task.shortSummary?.toLowerCase().includes(agentSearchQuery.toLowerCase()) ||
      task.conversationSummary?.toLowerCase().includes(agentSearchQuery.toLowerCase())
    );
  }, [agentTasks, agentSearchQuery]);
  
  // Fetch agent tasks from Firestore
  const fetchAgentTasks = async (statusFilter: "pending" | "completed" | "rejected" = agentTaskStatusFilter) => {
    if (!user?.uid) return;
    
    try {
      setAgentTasksLoading(true);
      console.log("Fetching agent tasks from Firestore for merchant:", user.uid, "with status filter:", statusFilter);
      
      const agentTasksRef = collection(db, 'merchants', user.uid, 'agentinbox');
      
      // Create query constraints based on status filter
      let constraints: QueryConstraint[] = [
        limit(50) // Limit to 50 tasks
      ];
      
      // Add agentinbox filter to only show tasks with agentinbox = true
      constraints.push(where('agentinbox', '==', true));
      
      if (statusFilter === "pending") {
        // For the Inbox tab, we want to show all tasks that aren't completed or rejected
        // But we can't directly check for != "approved" in Firestore
        // So we'll fetch all tasks and filter client-side
        // No additional constraint needed for inbox view
      } else if (statusFilter === "completed") {
        // Completed: Show only approved/sent tasks
        constraints.push(where('status', '==', "approved"));
      } else if (statusFilter === "rejected") {
        // Rejected: Show only rejected tasks
        constraints.push(where('status', '==', "rejected"));
      }
      
      const agentTasksQuery = query(agentTasksRef, ...constraints);
      const agentTasksSnapshot = await getDocs(agentTasksQuery);
      console.log(`📊 Found ${agentTasksSnapshot.size} agent tasks with status: ${statusFilter} and agentinbox: true`);
      
      let tasks = agentTasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Ensure status is defined for filtering
        status: doc.data().status || "pending"
      }));
      
      // Apply client-side filtering for inbox tab
      if (statusFilter === "pending") {
        // For inbox tab, show all tasks that aren't approved/completed or rejected
        tasks = tasks.filter(task => task.status !== "approved" && task.status !== "rejected");
        console.log(`📊 Filtered to ${tasks.length} pending tasks for inbox tab`);
      }
      
      // Sort tasks by timestamp (handle both timestamp and createdAt fields)
      tasks.sort((a, b) => {
        const getDate = (task: any) => {
          if (task.timestamp) {
            return task.timestamp.__time__ ? new Date(task.timestamp.__time__) : task.timestamp.toDate();
          }
          if (task.createdAt) {
            return task.createdAt.__time__ ? new Date(task.createdAt.__time__) : task.createdAt.toDate();
          }
          return new Date(0); // Fallback for tasks without timestamp
        };
        
        const dateA = getDate(a);
        const dateB = getDate(b);
        return dateB.getTime() - dateA.getTime(); // Sort newest first
      });
      
      setAgentTasks(tasks);
      setAgentTaskStatusFilter(statusFilter);
    } catch (error) {
      console.error("Error fetching agent tasks:", error);
    } finally {
      setAgentTasksLoading(false);
    }
  };
  
  // Handle agent task selection
  const handleAgentTaskSelect = (task: any) => {
    console.log("Selected agent task:", task.id);
    setSelectedAgentTask(task);
    setActiveTab("response"); // Default to response tab when selecting a task
  };
  
  // Handle tab change with animation
  const handleTabChange = (tab: "response" | "details") => {
    if (tab === activeTab) return;
    
    setTabChanging(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => {
        setTabChanging(false);
      }, 50);
    }, 150);
  };
  
  // Handle sending agent response
  const handleAcknowledgeAgentTask = async () => {
    if (!user?.uid || !selectedAgentTask) return;
    
    try {
      setIsSendingAgentResponse(true);
      
      // Update the agent task in Firestore to mark it as acknowledged
      const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
      await updateDoc(agentTaskRef, {
        status: "approved",
        acknowledgedAt: Timestamp.now(),
        acknowledgedBy: user.uid
      });
      
      // Show success message
      toast({
        title: "Task Acknowledged",
        description: "The task has been marked as completed",
      });
      
      // Refresh the current view to update the task list
      fetchAgentTasks(agentTaskStatusFilter);
      
      // Clear selected task
      setSelectedAgentTask(null);
      
    } catch (error) {
      console.error("Error acknowledging agent task:", error);
      
      toast({
        title: "Error",
        description: "Failed to acknowledge task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingAgentResponse(false);
    }
  };

  const handleRejectAgentTask = async () => {
    if (!user?.uid || !selectedAgentTask) return;
    
    try {
      setIsSendingAgentResponse(true);
      
      // Update the agent task in Firestore to mark it as rejected
      const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
      await updateDoc(agentTaskRef, {
        status: "rejected",
        rejectedAt: Timestamp.now(),
        rejectedBy: user.uid
      });
      
      // Show success message
      toast({
        title: "Task Rejected",
        description: "The task has been marked as rejected",
      });
      
      // Refresh the current view to update the task list
      fetchAgentTasks(agentTaskStatusFilter);
      
      // Clear selected task
      setSelectedAgentTask(null);
      
    } catch (error) {
      console.error("Error rejecting agent task:", error);
      
      toast({
        title: "Error",
        description: "Failed to reject task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingAgentResponse(false);
    }
  };

  const handleSendAgentResponse = async () => {
    if (!user?.uid || !selectedAgentTask || !selectedAgentTask.response) return;
    
    try {
      setIsSendingAgentResponse(true);
      
      // Get the necessary data from the selected agent task
      const threadId = selectedAgentTask.threadId;
      const response = selectedAgentTask.response;
      
      // Use senderEmail field from the agent task document (fallback to sender if not available)
      const recipient = selectedAgentTask.senderEmail || selectedAgentTask.sender || "customer@example.com";
      console.log("Using recipient email:", recipient, "from fields:", {
        senderEmail: selectedAgentTask.senderEmail,
        sender: selectedAgentTask.sender
      });
      
      // Get the merchant's store name from Firestore for the email signature
      let businessName = "Customer Support";
      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid));
        if (merchantDoc.exists()) {
          // Prioritize merchantName field, falling back to businessName or storeName
          const name = merchantDoc.data().merchantName || 
                      merchantDoc.data().businessName || 
                      merchantDoc.data().storeName || 
                      "Customer Support";
          businessName = `${name} Inquiry`;
        }
      } catch (storeNameError) {
        console.error("Error fetching store name:", storeNameError);
        // Continue with default name
        businessName = "Customer Support Inquiry";
      }
      
      // Call the same replyToGmailThread function used in the email tab
      const replyToGmailThread = httpsCallable(functions, 'replyToGmailThread');
      
      const replyData: any = {
        merchantId: user.uid,
        message_body: response,
        html_message_body: response, // HTML format of the message body
        recipient_email: recipient,
        thread_id: threadId,
        is_html: true,
        fromName: businessName
      };
      
      const result = await replyToGmailThread(replyData);
      
      console.log('Agent response sent successfully to', recipient, ':', result.data);
      
      // Update the agent task in Firestore to mark it as sent
      const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
      await updateDoc(agentTaskRef, {
        status: "approved",
        sentAt: Timestamp.now(),
        sentBy: user.uid,
        acknowledgedAt: Timestamp.now(), // Add acknowledgedAt for customerservice tasks
        acknowledgedBy: user.uid
      });
      
      // Show success message
      toast({
        title: "Response Sent",
        description: "Response sent successfully!",
      });
      
      // Refresh the current view to update the task list
      fetchAgentTasks(agentTaskStatusFilter);
      
      // Clear selected task
      setSelectedAgentTask(null);
      
    } catch (error) {
      console.error("Error sending agent response:", error);
      
      // Show specific error message if available
      let errorMessage = 'Failed to send response';
      if (error instanceof Error) {
        if (error.message.includes('Gmail connection')) {
          errorMessage = 'Please check your Gmail connection in Settings > Integrations';
        } else if (error.message.includes('authentication')) {
          errorMessage = 'Authentication error. Please try signing in again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingAgentResponse(false);
    }
  };
  
  const addToQueue = useCallback((request: () => Promise<any>) => {
    queue.current.push(request);
    processQueue();
  }, []);
  
  const processQueue = useCallback(async () => {
    if (isProcessing || queue.current.length === 0) return;
    
    setIsProcessing(true);
    
    try {
      // Process requests in batches of 5 to avoid overwhelming Firestore
      const batchSize = 5;
      const batch = queue.current.splice(0, batchSize);
      
      // Execute batch with a small delay between requests
      for (let i = 0; i < batch.length; i++) {
        try {
          await batch[i]();
          // Add a small delay between requests to avoid rate limiting
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error('Request in batch failed:', error);
        }
      }
    } finally {
      setIsProcessing(false);
      
      // Process next batch if there are more requests
      if (queue.current.length > 0) {
        setTimeout(processQueue, 200);
      }
    }
  }, [isProcessing]);
  

  
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedEmail, setSelectedEmail] = useState<any>(null)
  const [selectedThread, setSelectedThread] = useState<any>(null)
  // Thread data cache to avoid redundant Firestore queries
  const [threadCache, setThreadCache] = useState<Map<string, any>>(new Map())
  const [replyMode, setReplyMode] = useState<{
    type: 'reply' | 'replyAll' | 'forward'
    originalEmail: any
    thread?: any
  } | null>(null)
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("customer-service")
  
  // Agent modal states
  const [isCustomerServiceModalOpen, setIsCustomerServiceModalOpen] = useState(false)
  const [isEmailSummaryModalOpen, setIsEmailSummaryModalOpen] = useState(false)
  const [isEmailExecutiveModalOpen, setIsEmailExecutiveModalOpen] = useState(false)
  
  // Connect email loading state
  const [isConnectingEmail, setIsConnectingEmail] = useState(false)

  // Function to log contact emails to Firestore
  const logContactEmails = async (emailAddresses: string[], type: 'sent' | 'received', context?: string) => {
    if (!user?.uid || !emailAddresses.length) return;
    
    try {
      const contactEmailsRef = collection(db, 'merchants', user.uid, 'contactemails');
      
      // Process each email address
      for (const email of emailAddresses) {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes('@')) continue;
        
        // Check if this email already exists
        const emailQuery = query(contactEmailsRef, where('email', '==', cleanEmail));
        const existingDoc = await getDocs(emailQuery);
        
        if (existingDoc.empty) {
          // Create new contact email document
          await addDoc(contactEmailsRef, {
            email: cleanEmail,
            firstSeen: new Date(),
            lastSeen: new Date(),
            sentCount: type === 'sent' ? 1 : 0,
            receivedCount: type === 'received' ? 1 : 0,
            contexts: [context || 'email'],
            lastContext: context || 'email'
          });
          console.log(`📧 Logged new contact email: ${cleanEmail} (${type})`);
        } else {
          // Update existing contact email document
          const existingDocRef = existingDoc.docs[0].ref;
          const existingData = existingDoc.docs[0].data();
          
          await updateDoc(existingDocRef, {
            lastSeen: new Date(),
            sentCount: existingData.sentCount + (type === 'sent' ? 1 : 0),
            receivedCount: existingData.receivedCount + (type === 'received' ? 1 : 0),
            contexts: existingData.contexts?.includes(context || 'email') 
              ? existingData.contexts 
              : [...(existingData.contexts || []), context || 'email'],
            lastContext: context || 'email'
          });
          console.log(`📧 Updated contact email: ${cleanEmail} (${type})`);
        }
      }
    } catch (error) {
      console.error('Error logging contact emails:', error);
    }
  };
  const [composeMode, setComposeMode] = useState<"none" | "reply" | "replyAll" | "forward">("none")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeContent, setComposeContent] = useState("")
  const [composeTo, setComposeTo] = useState("")
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [gmailProfileData, setGmailProfileData] = useState<any>(null)
  const [fetchedEmails, setFetchedEmails] = useState<any[]>([])
  const [gmailEmailAddress, setGmailEmailAddress] = useState<string | null>(null)
  const [emailsLoading, setEmailsLoading] = useState(false)
  
  // ✅ PAGINATION: Email pagination state
  const [lastEmailDoc, setLastEmailDoc] = useState<any>(null)
  const [hasMoreEmails, setHasMoreEmails] = useState(true)
  const [loadingMoreEmails, setLoadingMoreEmails] = useState(false)
  const [newEmailIds, setNewEmailIds] = useState<Set<string>>(new Set())
  const [deletingThreadIds, setDeletingThreadIds] = useState<Set<string>>(new Set())
  const [showAttachmentsPopup, setShowAttachmentsPopup] = useState(false)
  const [allAttachments, setAllAttachments] = useState<any[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [sortColumn, setSortColumn] = useState<string>('emailDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [emailFilter, setEmailFilter] = useState<'all' | 'unread'>('all')
  const [debugDialogOpen, setDebugDialogOpen] = useState(false)
  const [debugResponse, setDebugResponse] = useState<any>(null)
  const [isExtractingWritingStyle, setIsExtractingWritingStyle] = useState(false)
  const [composeAnimating, setComposeAnimating] = useState(false)
  const [composeClosing, setComposeClosing] = useState(false)
  
  const [merchantData, setMerchantData] = useState<any>(null)
  const [merchantEmail, setMerchantEmail] = useState("")
  const [decodeTestResults, setDecodeTestResults] = useState<any>(null)
  const [showDecodeResults, setShowDecodeResults] = useState(false)
  
  // Track which threads are expanded in the left panel to show individual emails
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  

  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  
  // Custom filters state
  const [customFilters, setCustomFilters] = useState<Array<{id: string, name: string, keywords: string, color: string}>>([])
  const [showAddCustomDialog, setShowAddCustomDialog] = useState(false)
  const [customDialogClosing, setCustomDialogClosing] = useState(false)
  const [newCustomName, setNewCustomName] = useState("")
  const [newCustomKeywords, setNewCustomKeywords] = useState("")
  const [newCustomColor, setNewCustomColor] = useState("blue")
  
  // Panel resizing state
  const [leftPanelWidth, setLeftPanelWidth] = useState(35) // Percentage for email tab
  const [agentPanelWidth, setAgentPanelWidth] = useState(25) // Percentage for agent tab (smaller width)
  const [isDragging, setIsDragging] = useState(false)
  const [currentPanel, setCurrentPanel] = useState<'email' | 'agent'>('email')
  
  // Panel resize handlers
  const handleMouseDown = (e: React.MouseEvent, panelType: 'email' | 'agent' = 'email') => {
    setIsDragging(true)
    setCurrentPanel(panelType)
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
    
    if (currentPanel === 'email') {
      setLeftPanelWidth(constrainedWidth)
    } else {
      setAgentPanelWidth(constrainedWidth)
    }
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
  const summarizeEmailOrThread = async (emailOrThread: any) => {
    if (!emailOrThread || !user?.uid) return;
    
    setIsSummarizing(true);
    try {
      let contentToSummarize = '';
      
      // Check if it's a thread (has emails array) or single email
      if (emailOrThread.emails && Array.isArray(emailOrThread.emails)) {
        // It's a thread - combine all emails
        contentToSummarize = emailOrThread.emails.map((email: any) => {
          const content = email.content || email.htmlMessage || 'No content';
          return `From: ${email.sender}
To: ${email.to || 'Unknown'}
Subject: ${email.subject || 'No Subject'}
Date: ${email.time || email.receivedAt || email.repliedAt || 'Unknown time'}

${content}

---`;
        }).join('\n\n');
      } else {
        // It's a single email
        const content = emailOrThread.content || emailOrThread.htmlMessage || 'No content';
        contentToSummarize = `From: ${emailOrThread.sender}
To: ${emailOrThread.to || 'Unknown'}
Subject: ${emailOrThread.subject || 'No Subject'}
Date: ${emailOrThread.time || emailOrThread.receivedAt || emailOrThread.repliedAt || 'Unknown time'}

${content}`;
      }

      const summaryResponse = await generateEmailResponse({
        merchantId: user.uid,
        summarise: contentToSummarize, // Content to summarise
        email: contentToSummarize // Required field for summarise mode
      }) as { data?: { summary?: string } };

      if (summaryResponse.data?.summary) {
        setThreadSummary(summaryResponse.data.summary);
        setShowSummaryDropdown(true);
      }
    } catch (error) {
      console.error('Error summarizing email/thread:', error);
      // Show error in dropdown
      setThreadSummary('Error generating summary. Please try again.');
      setShowSummaryDropdown(true);
    } finally {
      setIsSummarizing(false);
    }
  };

  const summarizeThread = async (thread: any) => {
    await summarizeEmailOrThread(thread);
  };
  
  // Helper function to close summary dropdown with animation
  const closeSummaryDropdownWithAnimation = () => {
    setSummaryClosing(true);
    setTimeout(() => {
      setShowSummaryDropdown(false);
      setSummaryClosing(false);
    }, 300);
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
  const [rulesDialogClosing, setRulesDialogClosing] = useState(false)
  const [tempEmailRules, setTempEmailRules] = useState('')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructionsClosing, setInstructionsClosing] = useState(false)
  const [showSummaryDropdown, setShowSummaryDropdown] = useState(false)
  const [summaryClosing, setSummaryClosing] = useState(false)
  const [currentView, setCurrentView] = useState<'email' | 'agent'>('email')
  
  // Email Rules state
  const [emailRulesList, setEmailRulesList] = useState<Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}>>([]); // Added type field
  const [newRuleText, setNewRuleText] = useState('');
  const [newRuleType, setNewRuleType] = useState<'reply' | 'new' | 'both'>('both'); // New state for rule type
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingRuleText, setEditingRuleText] = useState('');
  const [editingRuleType, setEditingRuleType] = useState<'reply' | 'new' | 'both'>('both'); // New state for editing rule type
  
  // Local state for dialog
  const [localShowEmailRulesDialog, setLocalShowEmailRulesDialog] = useState(false);
  const [localTempEmailRules, setLocalTempEmailRules] = useState('');
  
  // Use passed props or fallback to local state
  const actualShowEmailRulesDialog = showEmailRulesDialog ?? localShowEmailRulesDialog;
  const actualSetShowEmailRulesDialog = setShowEmailRulesDialog ?? setLocalShowEmailRulesDialog;
  const actualTempEmailRules = tempEmailRules ?? localTempEmailRules;
  const actualSetTempEmailRules = setTempEmailRules ?? setLocalTempEmailRules;



  // Helper function to call generateEmailResponse with proper error handling
  const callGenerateEmailResponse = async (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => {
    if (!user?.uid) {
      console.error('User not authenticated');
      return;
    }

    const editorRef = replyEditor || { current: null };
    const currentEmailContent = editorRef.current?.innerHTML || '';
    
    // Skip content check for 'createemail' request type since we're generating new content
    if (requestType !== 'createemail' && !currentEmailContent.trim()) {
      console.error('No email content to improve');
      return;
    }

    setIsGenerating(true);
    
    // Show skeleton loading in the compose area
    if (editorRef.current) {
      const replyEditor = editorRef.current;
      
      // Store original content
      const originalContent = replyEditor.innerHTML;
      replyEditor.setAttribute('data-original-content', originalContent);
      
      // For 'createemail', always show skeleton in entire area since we're generating from scratch
      if (requestType === 'createemail') {
        replyEditor.innerHTML = `
          <div class="space-y-3 animate-pulse">
            <div class="h-4 bg-gray-200 rounded-md"></div>
            <div class="h-4 bg-gray-200 rounded-md w-5/6"></div>
            <div class="h-4 bg-gray-200 rounded-md w-4/6"></div>
          </div>
        `;
      } else {
        // Find the separator between compose and quoted content
        const hrIndex = originalContent.indexOf('<hr');
        
        if (hrIndex !== -1) {
          // Preserve everything from the <hr> onwards (quoted email thread)
          const quotedContent = originalContent.substring(hrIndex);
          
          // Show skeleton only in compose area, preserve quoted content
          replyEditor.innerHTML = `
            <div class="space-y-3 animate-pulse mb-4">
              <div class="h-4 bg-gray-200 rounded-md"></div>
              <div class="h-4 bg-gray-200 rounded-md w-5/6"></div>
              <div class="h-4 bg-gray-200 rounded-md w-4/6"></div>
            </div>
            ${quotedContent}
          `;
        } else {
          // No quoted content found, safe to show skeleton in entire area
          replyEditor.innerHTML = `
            <div class="space-y-3 animate-pulse">
              <div class="h-4 bg-gray-200 rounded-md"></div>
              <div class="h-4 bg-gray-200 rounded-md w-5/6"></div>
              <div class="h-4 bg-gray-200 rounded-md w-4/6"></div>
            </div>
          `;
        }
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
        email: requestType === 'createemail' ? '' : currentEmailContent
      }) as { data?: { response?: string } };

      console.log('Generated response:', response.data);

      // Update only the reply compose area with the generated content
      if (editorRef.current && response.data?.response) {
        const replyEditor = editorRef.current;
        
        // Double-check we have the right element (should be contenteditable)
        if (replyEditor.getAttribute('contenteditable') === 'true' || replyEditor.isContentEditable) {
          
          // Create a unique ID for the animated response container
          const animatedResponseId = `animated-response-${Date.now()}`;
          
          if (requestType === 'createemail') {
            // For creating new emails, replace entire content with animated response component
            replyEditor.innerHTML = `<div id="${animatedResponseId}"></div>`;
            
            // Render the animated response component into the container
            const container = document.getElementById(animatedResponseId);
            if (container) {
              // Render the animated component with HTML content
              const root = ReactDOM.createRoot(container);
              root.render(
                <AnimatedEmailResponse html={response.data.response} />
              );
              
              console.log('Animated AI response applied for new email creation');
            } else {
              // Fallback if container not found
              replyEditor.innerHTML = `<div>${response.data.response}</div>`;
            }
          } else {
            console.log('Updating compose area with AI response - preserving email thread');
            
            // Get current content and find the separator between compose and quoted content
            const currentHTML = replyEditor.innerHTML;
            const hrIndex = currentHTML.indexOf('<hr');
            
            if (hrIndex !== -1) {
              try {
                // Preserve everything from the <hr> onwards (quoted email thread)
                const quotedContent = currentHTML.substring(hrIndex);
                
                // Create a temporary container to sanitize the quoted content
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = quotedContent;
                
                // Remove any style tags from the quoted content
                const styleTags = tempDiv.querySelectorAll('style');
                styleTags.forEach(style => style.remove());
                
                // Get the sanitized quoted content
                const sanitizedQuotedContent = tempDiv.innerHTML;
                
                // Create container for animated response + preserved quoted content
                replyEditor.innerHTML = `<div id="${animatedResponseId}"></div>${sanitizedQuotedContent}`;
              } catch (error) {
                console.error('Error sanitizing quoted content:', error);
                // Fallback to the original approach if DOM manipulation fails
                const fallbackQuotedContent = currentHTML.substring(hrIndex);
                replyEditor.innerHTML = `<div id="${animatedResponseId}"></div>${fallbackQuotedContent}`;
              }
              
              // Render the animated response component into the container
              const container = document.getElementById(animatedResponseId);
              if (container) {
                // Render the animated component with HTML content
                const root = ReactDOM.createRoot(container);
                root.render(
                  <AnimatedEmailResponse html={response.data.response} />
                );
                
                console.log('Animated AI response applied to compose area - quoted emails preserved');
              } else {
                // Fallback if container not found
                replyEditor.innerHTML = `<div>${response.data.response}</div>${currentHTML.substring(hrIndex)}`;
              }
            } else {
              // No quoted content found, safe to replace entire content with animated response
              replyEditor.innerHTML = `<div id="${animatedResponseId}"></div>`;
              
              // Render the animated response component into the container
              const container = document.getElementById(animatedResponseId);
              if (container) {
                // Render the animated component with HTML content
                const root = ReactDOM.createRoot(container);
                root.render(
                  <AnimatedEmailResponse html={response.data.response} />
                );
                
                console.log('Animated AI response applied - no quoted content to preserve');
              } else {
                // Fallback if container not found
                replyEditor.innerHTML = `<div>${response.data.response}</div>`;
              }
            }
          }
          
          // Focus the editor and position cursor at the end of compose area (before quoted content)
          setTimeout(() => {
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
          }, 2000); // Delay to allow animation to complete
          
        } else {
          console.error('Invalid target element - not updating to prevent affecting email thread');
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('Error generating email response:', error);
      
      // Restore original content if there was an error
      if (editorRef.current) {
        const originalContent = editorRef.current.getAttribute('data-original-content');
        if (originalContent) {
          editorRef.current.innerHTML = originalContent;
          editorRef.current.removeAttribute('data-original-content');
        }
      }
      
      // You might want to show a user-friendly error message here
    } finally {
      setIsGenerating(false);
      
      // Clean up stored original content
      if (editorRef.current) {
        editorRef.current.removeAttribute('data-original-content');
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

  // ✅ SEARCH MODE: Use search results when searching, otherwise use fetched emails
  const allEmails = isSearchMode ? searchResults : fetchedEmails
  
  // Debug: Log current state
  console.log("📊 Current state:", { 
    isSearchMode, 
    searchResultsCount: searchResults.length, 
    fetchedEmailsCount: fetchedEmails.length,
    allEmailsCount: allEmails.length,
    searchQuery: searchQuery
  })
  
  // Memoized email grouping function to prevent expensive recalculations
  const groupEmailsByThread = useCallback((emails: any[]) => {
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
  }, [])
  
  // Function to categorize emails based on content
  const categorizeEmail = (email: any): string => {
    const subject = (email.subject || '').toLowerCase()
    const content = (email.content || '').toLowerCase()
    const preview = (email.preview || '').toLowerCase()
    const combined = `${subject} ${content} ${preview}`
    
    // Check custom filters first
    for (const filter of customFilters) {
      const keywords = filter.keywords.toLowerCase().split(',').map(k => k.trim()).filter(Boolean)
      if (keywords.some(keyword => combined.includes(keyword))) {
        return filter.id
      }
    }
    
    // Customer Service keywords
    if (combined.match(/\b(support|help|issue|problem|complaint|refund|return|cancel|dispute|inquiry|assistance|service|ticket)\b/)) {
      return 'customer-service'
    }
    
    // Invoice keywords
    if (combined.match(/\b(invoice|bill|payment|receipt|charge|due|outstanding|account|statement)\b/)) {
      return 'invoices'
    }
    
    // Promo keywords
    if (combined.match(/\b(sale|discount|offer|promo|deal|coupon|special|limited|save|free|bonus|gift)\b/)) {
      return 'promo'
    }
    
    return 'general'
  }

  const filteredEmails = allEmails.filter(email => {
    // First filter by folder
    let folderMatch = true
    if (selectedFolder === "inbox") folderMatch = email.folder === "inbox"
    else if (selectedFolder === "spam") folderMatch = email.folder === "spam"
    else if (selectedFolder === "trash") folderMatch = email.folder === "trash"
    else if (selectedFolder === "drafts") folderMatch = email.folder === "drafts"
    else if (selectedFolder === "sent") folderMatch = email.folder === "sent"
    
    if (!folderMatch) return false
    
    // Then filter by read/unread status
    if (emailFilter === 'unread') {
      if (email.read) return false
    }
    
    // Then filter by category
    if (selectedFilter !== 'all') {
      const emailCategory = categorizeEmail(email)
      if (emailCategory !== selectedFilter) return false
    }
    
    // Finally filter by search query
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    return (
      email.sender?.toLowerCase().includes(query) ||
      email.email?.toLowerCase().includes(query) ||
      email.subject?.toLowerCase().includes(query) ||
      email.preview?.toLowerCase().includes(query)
    )
  })

  // Memoized email threads calculation to improve performance
  const emailThreads = useMemo(() => {
    return groupEmailsByThread(filteredEmails).sort((a, b) => {
      const timeA = new Date(a.representative.time || 0).getTime()
      const timeB = new Date(b.representative.time || 0).getTime()
      return timeB - timeA
    })
  }, [filteredEmails, groupEmailsByThread])



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

  // Upload file to Firebase Storage
  const uploadFileToStorage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!user?.uid) {
        reject(new Error('User not authenticated'));
        return;
      }
      
      const storage = getStorage();
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      // Use the same path structure as notes page for proper permissions
      const storageRef = ref(storage, `merchants/${user.uid}/email-attachments/${fileName}`);
      
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          // Handle progress if needed
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log(`Upload progress: ${progress}%`);
        },
        (error) => {
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            console.error('Error getting download URL:', error);
            reject(error);
          }
        }
      );
    });
  };

  const handleSend = () => {
    // Here you would typically send the email to your backend
    console.log("Sending email:", { to: composeTo, subject: composeSubject, content: composeContent })
    
    // Reset compose mode
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
  }

  // Fetch sent emails from Firestore
  const fetchSentEmails = async () => {
    if (!user?.uid) return []

    try {
      console.log("Fetching sent emails from Firestore for merchant:", user.uid)
      
      // Query sentemails collection
      const sentEmailsRef = collection(db, 'merchants', user.uid, 'sentemails')
      const sentSnapshot = await getDocs(sentEmailsRef)
      
      console.log("📤 Found", sentSnapshot.size, "sent emails")
      
      if (sentSnapshot.size === 0) {
        console.log("No sent emails found")
        return []
      }
      
      const sentEmails = sentSnapshot.docs.map((doc) => {
        const sentData = doc.data()
        console.log("📤 Processing sent email:", doc.id, sentData)
        
        // Transform sent email to match inbox email format
        return {
          id: doc.id,
          threadId: sentData.threadId || doc.id,
          sender: merchantData?.businessName || user?.displayName || "You",
          email: user?.email || merchantEmail,
          to: sentData.recipient_email || "Unknown Recipient",
          cc: sentData.cc || "",
          bcc: sentData.bcc || "",
          subject: sentData.subject || "No Subject",
          content: sentData.body || "No content available",
          time: sentData.sentAt || new Date().toISOString(),
          sentAt: sentData.sentAt,
          read: true, // Sent emails are always "read"
          hasAttachment: false, // TODO: Add attachment support for sent emails
          folder: "sent",
          isThread: false,
          count: 1,
          rawData: sentData,
          // Create representative object for consistency
          representative: {
            id: doc.id,
            threadId: sentData.threadId || doc.id,
            sender: merchantData?.businessName || user?.displayName || "You",
            email: user?.email || merchantEmail,
            to: sentData.recipient_email || "Unknown Recipient",
            subject: sentData.subject || "No Subject",
            content: sentData.body || "No content available",
            time: sentData.sentAt || new Date().toISOString(),
            read: true,
            hasAttachment: false
          }
        }
      })
      
      // Sort by sentAt timestamp, newest first
      return sentEmails.sort((a, b) => {
        const timeA = new Date(a.sentAt || 0).getTime()
        const timeB = new Date(b.sentAt || 0).getTime()
        return timeB - timeA
      })
      
    } catch (error) {
      console.error("Error fetching sent emails:", error)
      return []
    }
  }

  // Fetch Gmail threads from the new Firestore structure
  const fetchGmailEmails = async (loadMore: boolean = false) => {
    if (!user?.uid) return

    // Prevent multiple simultaneous calls
    if (emailsLoading || (loadMore && loadingMoreEmails)) {
      console.log("Already loading emails, skipping duplicate request")
      return
    }

    try {
      if (loadMore) {
        setLoadingMoreEmails(true)
      } else {
        setEmailsLoading(true)
        // Reset pagination state for new fetch
        setLastEmailDoc(null)
        setHasMoreEmails(true)
      }
      
      if (selectedFolder === "sent") {
        // Fetch sent emails
        const sentEmails = await fetchSentEmails()
        setFetchedEmails(sentEmails)
        if (loadMore) {
          setLoadingMoreEmails(false)
        } else {
          setEmailsLoading(false)
        }
        return
      }
      
      // Query the thread documents from merchants/merchantId/fetchedemails/
      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      
      let threadsQuery
      if (loadMore && lastEmailDoc) {
        // ✅ PAGINATION: Load more starting after the last document
        threadsQuery = query(
          threadsRef,
          orderBy('updatedAt', 'desc'),
          startAfter(lastEmailDoc),
          limit(20)
        )
      } else {
        // Initial load
        threadsQuery = query(
          threadsRef,
          orderBy('updatedAt', 'desc'),
          limit(20)
        )
      }
      
      const threadsSnapshot = await getDocs(threadsQuery)
      
      // ✅ PAGINATION: Update hasMoreEmails based on results
      setHasMoreEmails(threadsSnapshot.docs.length === 20)
      
      // ✅ PAGINATION: Store last document for next page
      if (threadsSnapshot.docs.length > 0) {
        setLastEmailDoc(threadsSnapshot.docs[threadsSnapshot.docs.length - 1])
      }
      
      // Transform thread documents into thread objects for the left panel
      // ✅ PERFORMANCE: Parallelize chain queries instead of sequential processing
      const transformedThreads = await Promise.all(threadsSnapshot.docs.map(async (doc) => {
        const threadData = doc.data()
        
        // Use thread metadata for the list view
        const threadId = threadData.threadId || doc.id
        // Use payload.data.preview.subject if available, otherwise fallback to threadData.subject
        const subject = threadData.payload?.data?.preview?.subject || threadData.subject || "No Subject"
        const latestSender = threadData.latestSender || "Unknown Sender"
        const latestReceivedAt = threadData.latestReceivedAt
        
        // ✅ PERFORMANCE: Optimized chain subcollection query
        let messageCount = 1;
        let hasAttachment = false;
        let mostRecentEmailRead = false;
        let mostRecentContent = '';
        try {
          const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain')
          const chainSnapshot = await getDocs(chainRef)
          messageCount = chainSnapshot.size || 1
          
          // Process all docs in one pass for efficiency
          const chainDocs = chainSnapshot.docs.map(doc => ({
            id: doc.id,
            data: doc.data(),
            timestamp: doc.data().receivedAt || doc.data().repliedAt || doc.data().processedAt
          }));
          
          // Check for attachments
          hasAttachment = chainDocs.some(doc => extractAttachments(doc.data).length > 0);
          
          // Find the most recent email's read status and content
          if (chainDocs.length > 0) {
            // Sort already processed emails by timestamp
            const sortedEmails = chainDocs.sort((a, b) => {
              const getTime = (timestamp: any) => {
                if (typeof timestamp === 'string') {
                  return new Date(timestamp).getTime();
                } else if (timestamp && typeof timestamp.toDate === 'function') {
                  return timestamp.toDate().getTime();
                } else if (timestamp instanceof Date) {
                  return timestamp.getTime();
                } else {
                  return 0;
                }
              };
              return getTime(b.timestamp) - getTime(a.timestamp); // Newest first
            });
            
            // Get read status and content from the most recent email
            const mostRecentEmail = sortedEmails[0];
            mostRecentEmailRead = mostRecentEmail?.data?.read === true;
            
            // Extract content from the most recent email - ALWAYS use payload.data.preview.body from chain
            const messageData = mostRecentEmail?.data;
            if (messageData) {
              // Always prioritize payload.data.preview.body from the chain subcollection
              if (messageData.payload?.data?.preview?.body) {
                mostRecentContent = messageData.payload.data.preview.body;
              } else if (messageData.htmlMessage) {
                mostRecentContent = messageData.htmlMessage;
              } else if (messageData.payload) {
                try {
                  const parts = messageData.payload?.data?.payload?.parts;
                  if (parts && Array.isArray(parts) && parts.length > 0) {
                    const firstPart = parts[0];
                    if (firstPart?.body?.data) {
                      mostRecentContent = decodePart(firstPart.body.data);
                    }
                  }
                  if (!mostRecentContent) {
                    const fallbackContent = messageData.payload?.data?.payload?.body?.data;
                    if (fallbackContent) {
                      mostRecentContent = decodePart(fallbackContent);
                    }
                  }
                } catch (error) {
                  console.warn("Error extracting email content for preview:", error);
                }
              }
            }
          }
          
          // ✅ PERFORMANCE: Removed verbose logging for faster processing
        } catch (error) {
          console.error(`Error querying chain for thread ${threadId}:`, error)
          messageCount = 1 // Fallback to 1 if query fails
          hasAttachment = false // Fallback to false if query fails
          mostRecentEmailRead = false // Fallback to false if query fails
          mostRecentContent = '' // Fallback to empty if query fails
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
        
        // Create preview text - ALWAYS use content from chain subcollection, never thread-level data
        const previewText = createPreviewText(mostRecentContent);
        
        // Create thread object for left panel display
        const threadObj = {
          id: threadId,
          threadId: threadId,
          sender: senderName,
          email: senderEmail,
          subject: subject,
          preview: previewText,
          time: latestReceivedAt,
          read: mostRecentEmailRead, // Use actual read status from most recent email
          hasAttachment: hasAttachment,
          folder: "inbox",
          isThread: true,
          count: messageCount,
          unreadCount: 0, // Will be calculated when loading chain messages
          hasUnread: false,
          rawData: threadData,
          // Create representative object with all the thread properties
          representative: {
            id: threadId, // This will be the representative email's actual ID when thread is loaded
            threadId: threadId,
            sender: senderName,
            email: senderEmail,
            subject: subject,
            preview: previewText,
            time: latestReceivedAt,
            read: mostRecentEmailRead,
            hasAttachment: hasAttachment
          }
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
      
      // ✅ PAGINATION: Handle emails based on load type
      setFetchedEmails(prevEmails => {
        if (loadMore) {
          // Append new emails to existing list
          const existingThreadIds = new Set(prevEmails.map(email => email.threadId))
          const newThreads = sortedThreads.filter(thread => !existingThreadIds.has(thread.threadId))
          return [...prevEmails, ...newThreads]
        } else {
          // Replace all emails (initial load)
          const prevThreadIds = new Set(prevEmails.map(email => email.threadId))
          const newThreadIds = new Set<string>()
          
          // Identify new threads for animation
          sortedThreads.forEach(thread => {
            if (!prevThreadIds.has(thread.threadId)) {
              newThreadIds.add(thread.threadId)
            }
          })
          
          // Set new email IDs for animation
          if (newThreadIds.size > 0) {
            setNewEmailIds(newThreadIds)
            
            // Clear the animation after 3 seconds
            setTimeout(() => {
              setNewEmailIds(new Set())
            }, 3000)
          }
          
          return sortedThreads
        }
      })
      
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
      if (loadMore) {
        setLoadingMoreEmails(false)
      } else {
        setEmailsLoading(false)
      }
    }
  }

  // ✅ PAGINATION: Load more emails function
  const loadMoreEmails = async () => {
    if (!hasMoreEmails || loadingMoreEmails) return
    if (isSearchMode) {
      await searchEmails(searchQuery, true)
    } else {
      await fetchGmailEmails(true)
    }
  }

  // ✅ BACKEND SEARCH: Search all emails in database
  const searchEmails = async (searchTerm: string, loadMore: boolean = false) => {
    console.log("🔍 searchEmails called with:", { searchTerm, loadMore, userUid: !!user?.uid })
    
    if (!user?.uid || !searchTerm.trim()) {
      console.log("❌ Search aborted - no user or empty search term")
      // If no query, exit search mode and load regular emails
      setIsSearchMode(false)
      setSearchResults([])
      if (!fetchedEmails.length) {
        await fetchGmailEmails()
      }
      return
    }

          console.log("✅ Starting search process...")

      try {
        // Simple test: just filter current fetched emails first to see if that works
        if (searchTerm === "test") {
          console.log("🧪 Running simple test search")
          setIsSearchMode(true)
          setSearchResults(fetchedEmails.slice(0, 3)) // Just return first 3 emails as test
          setIsSearching(false)
          return
        }
      if (loadMore) {
        setLoadingMoreEmails(true)
      } else {
        setIsSearching(true)
        setIsSearchMode(true)
        setLastEmailDoc(null)
        setHasMoreEmails(true)
      }

      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      
      // Since Firestore doesn't have great full-text search, we'll fetch all and filter
      // In a production app, you'd use Algolia or similar for better search
      let threadsQuery
      if (loadMore && lastEmailDoc) {
        threadsQuery = query(
          threadsRef,
          orderBy('updatedAt', 'desc'),
          startAfter(lastEmailDoc),
          limit(50) // Load more for search to have better results
        )
      } else {
        threadsQuery = query(
          threadsRef,
          orderBy('updatedAt', 'desc'),
          limit(50) // Initial search load more to find matches
        )
      }

      const threadsSnapshot = await getDocs(threadsQuery)
      console.log("📊 Found", threadsSnapshot.docs.length, "threads to search through")
      
      const searchQuery = searchTerm.toLowerCase().trim()
      console.log("🔍 Searching for:", searchQuery)

      // Process threads and check for search matches
      const searchMatches = await Promise.all(
        threadsSnapshot.docs.map(async (doc) => {
          const threadData = doc.data() as any
          const threadId = threadData.threadId || doc.id
          const subject = threadData.payload?.data?.preview?.subject || threadData.subject || ""
          const latestSender = threadData.latestSender || ""

          // Check if thread metadata matches
          const metadataMatch = 
            subject.toLowerCase().includes(searchQuery) ||
            latestSender.toLowerCase().includes(searchQuery)

          if (metadataMatch) {
            // Build thread object similar to fetchGmailEmails
            return {
              id: threadId,
              threadId: threadId,
              subject: subject,
              sender: latestSender,
              time: threadData.latestReceivedAt,
              representative: {
                id: threadId,
                subject: subject,
                sender: latestSender,
                time: threadData.latestReceivedAt,
                read: false // We'll update this from chain if needed
              }
            }
          }

          // If metadata doesn't match, check chain subcollection for content matches
          try {
            const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain')
            const chainSnapshot = await getDocs(chainRef)
            
            for (const chainDoc of chainSnapshot.docs) {
              const messageData = chainDoc.data()
              const content = messageData.payload?.data?.preview?.body || messageData.htmlMessage || ""
              const messageSender = messageData.from || ""
              
              if (
                content.toLowerCase().includes(searchQuery) ||
                messageSender.toLowerCase().includes(searchQuery)
              ) {
                // Found match in chain, return thread
                return {
                  id: threadId,
                  threadId: threadId,
                  subject: subject,
                  sender: latestSender,
                  time: threadData.latestReceivedAt,
                  representative: {
                    id: threadId,
                    subject: subject,
                    sender: latestSender,
                    time: threadData.latestReceivedAt,
                    read: messageData.read || false
                  }
                }
              }
            }
          } catch (error) {
            console.error("Error searching chain for thread:", threadId, error)
          }

          return null // No match found
        })
      )

      // Filter out null results and sort
      const validMatches = searchMatches.filter(match => match !== null)
      console.log("🎯 Found", validMatches.length, "matches out of", searchMatches.length, "processed threads")
      
      const sortedMatches = validMatches.sort((a, b) => {
        const timeA = a.time?.toDate?.() || a.time || new Date(0)
        const timeB = b.time?.toDate?.() || b.time || new Date(0)
        return timeB.getTime() - timeA.getTime()
      })
      
      console.log("📋 Sorted matches:", sortedMatches.map(m => ({ id: m.id, subject: m.subject })))

      // Update pagination state
      setHasMoreEmails(threadsSnapshot.docs.length === 50 && sortedMatches.length > 0)
      if (threadsSnapshot.docs.length > 0) {
        setLastEmailDoc(threadsSnapshot.docs[threadsSnapshot.docs.length - 1])
      }

      // Update search results
      if (loadMore) {
        console.log("📝 Appending", sortedMatches.length, "more results to existing search results")
        setSearchResults(prev => [...prev, ...sortedMatches])
      } else {
        console.log("📝 Setting", sortedMatches.length, "search results")
        setSearchResults(sortedMatches)
      }

    } catch (error) {
      console.error("❌ Error searching emails:", error)
      // Reset search mode on error
      setIsSearchMode(false)
      setSearchResults([])
    } finally {
      if (loadMore) {
        setLoadingMoreEmails(false)
      } else {
        setIsSearching(false)
      }
    }
  }

  // ✅ DEBOUNCED SEARCH: Trigger search when query changes
  useEffect(() => {
    console.log("🔍 Search effect triggered - searchQuery:", searchQuery, "isSearchMode:", isSearchMode)
    
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        console.log("🚀 Triggering search for:", searchQuery)
        searchEmails(searchQuery)
      } else if (isSearchMode) {
        console.log("🧹 Clearing search mode")
        // Clear search mode when query is empty
        setIsSearchMode(false)
        setSearchResults([])
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

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
      
      // First, fetch the Gmail integration data specifically
      const gmailIntegrationDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'gmail'))
      
      if (gmailIntegrationDoc.exists()) {
        const gmailData = gmailIntegrationDoc.data()
        console.log('Gmail integration data:', gmailData)
        console.log('Gmail integration data keys:', Object.keys(gmailData))
        
        // Debug the profile structure
        if (gmailData.profile) {
          console.log('Profile exists:', gmailData.profile)
          console.log('Profile keys:', Object.keys(gmailData.profile))
          if (gmailData.profile.data) {
            console.log('Profile.data exists:', gmailData.profile.data)
            console.log('Profile.data keys:', Object.keys(gmailData.profile.data))
            if (gmailData.profile.data.response_data) {
              console.log('Profile.data.response_data exists:', gmailData.profile.data.response_data)
              console.log('Profile.data.response_data keys:', Object.keys(gmailData.profile.data.response_data))
            }
          }
        }
        
        // Extract email address from profile.data.response_data.emailAddress
        let gmailEmailAddress = null
        if (gmailData.profile?.data?.response_data?.emailAddress) {
          gmailEmailAddress = gmailData.profile.data.response_data.emailAddress
          console.log('Found Gmail email address from profile:', gmailEmailAddress)
        } else if (gmailData.emailAddress) {
          gmailEmailAddress = gmailData.emailAddress
          console.log('Found Gmail email address from top level:', gmailEmailAddress)
        } else {
          console.log('No email address found in Gmail integration data')
        }
        
        // Set the email address state for the listener
        setGmailEmailAddress(gmailEmailAddress)
        
        // Store the profile data for use in the UI
        setGmailProfileData(gmailData)
        
        // Create accounts array with Gmail account if email address is available
        const accounts: ConnectedAccount[] = []
        if (gmailEmailAddress) {
          accounts.push({
            id: 'gmail',
            emailAddress: gmailEmailAddress,
            connected: gmailData.connected || false,
            provider: 'gmail'
          })
          
          // Set as selected account if none is selected
          if (!selectedAccount) {
            setSelectedAccount(gmailEmailAddress)
          }
          
          console.log('Added Gmail account to connected accounts:', gmailEmailAddress)
        } else if (gmailData.connected && !gmailEmailAddress) {
          // Gmail integration exists but missing email address
          console.log('Gmail integration found but missing email address, triggering gmailIntegrationTrigger')
          await handleGmailIntegrationTrigger()
        }
        
        setConnectedAccounts(accounts)
        
        // ✅ FETCH EMAILS: Trigger email fetch after accounts are set up
        if (selectedFolder !== "sent") {
          console.log("🚀 ACCOUNTS READY: Triggering fetchGmailEmails after account setup");
          fetchGmailEmails();
        }
      } else {
        console.log('No Gmail integration found')
        setConnectedAccounts([])
      }
      
    } catch (error) {
      console.error("Error fetching connected accounts:", error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch connected accounts and Gmail emails on component mount
  // Combined critical data fetching for better performance
  useEffect(() => {
    const fetchCriticalEmailData = async () => {
      if (!user?.uid) return;
      
      try {
        // Set all loading states
        setAgentTasksLoading(true);
        setNotificationsLoading(true);
        setEmailsLoading(true);
        
        // Prepare all critical queries in parallel
        const merchantDocPromise = getDoc(doc(db, 'merchants', user.uid));
        
        const agentTasksQuery = query(
          collection(db, 'merchants', user?.uid || '', 'agentinbox'),
          where('status', '==', agentTaskStatusFilter),
          orderBy('dateCreated', 'desc'),
          limit(10) // Reduced limit for faster loading
        );
        
        const notificationsQuery = query(
          collection(db, 'merchants', user?.uid || '', 'notifications'),
          orderBy('dateCreated', 'desc'),
          limit(5) // Reduced limit for faster loading
        );
        
        // Execute all critical queries in parallel
        const [
          merchantDoc,
          agentTasksSnapshot,
          notificationsSnapshot
        ] = await Promise.all([
          merchantDocPromise,
          getDocs(agentTasksQuery),
          getDocs(notificationsQuery)
        ]);
        
        // Process merchant data
        if (merchantDoc.exists()) {
          const data = merchantDoc.data();
          setMerchantData(data);
          const email = data.businessEmail || data.email || data.contactEmail || user.email || '';
          setMerchantEmail(email);
        }
        
        // Process agent tasks
        const agentTasksData = agentTasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setAgentTasks(agentTasksData);
        
        // Process notifications
        const notificationsData = notificationsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            message: data.message || 'No message provided',
            type: data.type || 'INFO',
            customerId: data.customerId,
            dateCreated: data.dateCreated?.toDate(),
            timestamp: data.dateCreated?.toDate() || new Date(),
            read: data.read || false
          };
        });
        setNotifications(notificationsData);
        setUnreadCount(notificationsData.filter(n => !n.read).length);
        
      } catch (error) {
        console.error('Error fetching critical email data:', error);
      } finally {
        // Complete all loading states
        setAgentTasksLoading(false);
        setNotificationsLoading(false);
        setEmailsLoading(false);
      }
    };
    
    if (user?.uid) {
      fetchCriticalEmailData();
    }
  }, [user?.uid, agentTaskStatusFilter]);

  useEffect(() => {
    if (!user?.uid) return;
    
    // ✅ IMMEDIATE ACCOUNT FETCH: Fetch connected accounts immediately for email loading
    fetchConnectedAccounts();
    
    // Check if we need to trigger Gmail integration setup
    const checkAndTriggerGmailIntegration = async () => {
      try {
        const gmailIntegrationDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', 'gmail'))
        if (!gmailIntegrationDoc.exists()) {
          console.log('No Gmail integration found, triggering gmailIntegrationCall')
          await handleGmailIntegrationTrigger()
        } else {
          const gmailData = gmailIntegrationDoc.data()
          const hasEmailAddress = gmailData.profile?.data?.response_data?.emailAddress || gmailData.emailAddress
          if (!hasEmailAddress) {
            console.log('Gmail integration exists but no email address, triggering gmailIntegrationCall')
            await handleGmailIntegrationTrigger()
          }
        }
      } catch (error) {
        console.error('Error checking Gmail integration status:', error)
      }
    }
    
    // Call this after a short delay to ensure other data is loaded first
    setTimeout(checkAndTriggerGmailIntegration, 1000)
    
    // Set up listener for Gmail integration changes
    const gmailIntegrationRef = doc(db, 'merchants', user.uid, 'integrations', 'gmail')
    const gmailUnsubscribe = onSnapshot(gmailIntegrationRef, (doc) => {
      if (doc.exists()) {
        const gmailData = doc.data()
        console.log('Gmail integration updated:', gmailData)
        
        // Extract email address from profile.data.response_data.emailAddress
        let emailAddress = null
        if (gmailData.profile?.data?.response_data?.emailAddress) {
          emailAddress = gmailData.profile.data.response_data.emailAddress
          console.log('Email address updated from listener:', emailAddress)
        } else if (gmailData.emailAddress) {
          emailAddress = gmailData.emailAddress
          console.log('Email address updated from listener (top level):', emailAddress)
        }
        
        setGmailEmailAddress(emailAddress)
        setGmailProfileData(gmailData)
        
        // Update connected accounts if email address is available
        if (emailAddress) {
          const accounts: ConnectedAccount[] = [{
            id: 'gmail',
            emailAddress: emailAddress,
            connected: gmailData.connected || false,
            provider: 'gmail'
          }]
          setConnectedAccounts(accounts)
          
          // Set as selected account if none is selected
          if (!selectedAccount) {
            setSelectedAccount(emailAddress)
          }
        } else {
          setConnectedAccounts([])
        }
              } else {
          console.log('Gmail integration document does not exist')
          setGmailEmailAddress(null)
          setGmailProfileData(null)
          setConnectedAccounts([])
          
          // Trigger Gmail integration setup if document doesn't exist
          handleGmailIntegrationTrigger()
        }
    }, (error) => {
      console.error('Error listening to Gmail integration:', error)
    })
    
    // ✅ EMAILS WILL BE FETCHED: After fetchConnectedAccounts() completes

    // Set up Firestore listener for real-time thread updates (only for inbox)
    let threadsUnsubscribe: (() => void) | undefined
    if (user?.uid && selectedFolder !== "sent") {
      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const threadsQuery = query(
        threadsRef,
        orderBy('updatedAt', 'desc'),
        limit(20) // Reduced from 50 to 20 for faster loading
      )
      
      console.log("📡 Setting up Firestore listener for real-time thread updates")
      console.log("📡 Listener path:", `merchants/${user.uid}/fetchedemails`)
      threadsUnsubscribe = onSnapshot(threadsQuery, (snapshot) => {
        console.log(`📡 Firestore listener: ${snapshot.size} threads found, ${snapshot.docChanges().length} changes`)
        
        // Log the changes for debugging
        snapshot.docChanges().forEach((change) => {
          console.log(`📡 Change type: ${change.type}, doc: ${change.doc.id}`)
        })
        
        // Only refresh if there are actual changes (new threads, modifications, etc.)
        if (snapshot.docChanges().length > 0 && selectedFolder !== "sent") {
          console.log("📡 Thread changes detected, refreshing thread list")
          // Add delay to prevent rapid successive calls
          setTimeout(() => {
            fetchGmailEmails()
          }, 1000)
        }
      }, (error) => {
        console.error("❌ Error in Firestore listener:", error)
      })
    }


    
    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up listeners")
      gmailUnsubscribe()
      if (threadsUnsubscribe) {
        threadsUnsubscribe()
      }
    }
  }, [user?.uid, selectedFolder])

  // Set up email read status listeners when emails are fetched
  useEffect(() => {
    if (!user?.uid || selectedFolder === "sent" || fetchedEmails.length === 0) return

    console.log("📡 Setting up email read status listeners for", fetchedEmails.length, "threads")
    
    const emailReadListeners: (() => void)[] = []
    
    fetchedEmails.forEach(thread => {
      const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', thread.threadId, 'chain')
      const chainQuery = query(chainRef)
      
      const unsubscribe = onSnapshot(chainQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const messageData = change.doc.data()
            const isRead = messageData.read === true
            
            console.log(`📧 Email read status changed: ${change.doc.id}, read: ${isRead}`)
            
            // Update the fetchedEmails state to reflect the read status change
            setFetchedEmails(prev => prev.map(item => {
              if (item.threadId === thread.threadId) {
                // If this is the representative email, update its read status
                if (item.representative?.id === change.doc.id) {
                  return {
                    ...item,
                    representative: {
                      ...item.representative,
                      read: isRead
                    }
                  }
                }
                
                // Also update the thread's overall read status if needed
                return {
                  ...item,
                  representative: {
                    ...item.representative,
                    read: isRead
                  }
                }
              }
              return item
            }))
          }
        })
      }, (error) => {
        console.error(`❌ Error in email read listener for thread ${thread.threadId}:`, error)
      })
      
      emailReadListeners.push(unsubscribe)
    })
    
    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up email read listeners")
      emailReadListeners.forEach(unsubscribe => unsubscribe())
    }
  }, [user?.uid, selectedFolder, fetchedEmails])

  // DISABLED: Notifications now fetched in combined function for better performance
  useEffect(() => {
    // Skip - handled in fetchCriticalEmailData
  }, [user?.uid])
  
  // Set up real-time listener for agent inbox tasks
  useEffect(() => {
    if (!user?.uid) return;
    
    console.log("📡 Setting up Firestore listener for real-time agent task updates");
    
    // Set up Firestore listener for real-time agent task updates
    const agentTasksRef = collection(db, 'merchants', user.uid, 'agentinbox');
    
    // Create query constraints based on status filter and agentinbox flag
    let constraints: QueryConstraint[] = [
      where('agentinbox', '==', true),
      limit(10) // Reduced limit for better performance
    ];
    
    if (agentTaskStatusFilter === "completed") {
      // Completed: Show only approved/sent tasks
      constraints.push(where('status', '==', "approved"));
    } else if (agentTaskStatusFilter === "rejected") {
      // Rejected: Show only rejected tasks
      constraints.push(where('status', '==', "rejected"));
    }
    
    const agentTasksQuery = query(agentTasksRef, ...constraints);
    console.log("📡 Listener path:", `merchants/${user.uid}/agentinbox`);
    
    const agentTasksUnsubscribe = onSnapshot(agentTasksQuery, (snapshot) => {
      console.log(`📡 Firestore listener: ${snapshot.size} agent tasks found, ${snapshot.docChanges().length} changes`);
      
      // Log the changes for debugging
      snapshot.docChanges().forEach((change) => {
        console.log(`📡 Change type: ${change.type}, doc: ${change.doc.id}`);
      });
      
      // Only refresh if there are actual changes (new tasks, modifications, etc.)
      if (snapshot.docChanges().length > 0) {
        console.log("📡 Agent task changes detected, refreshing task list");
        
        // Get all tasks from the snapshot
        let tasks = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Ensure status is defined for filtering
          status: doc.data().status || "pending"
        }));
        
        // Apply client-side filtering for inbox tab
        if (agentTaskStatusFilter === "pending") {
          // For inbox tab, show all tasks that aren't approved/completed or rejected
          tasks = tasks.filter(task => task.status !== "approved" && task.status !== "rejected");
          console.log(`📊 Filtered to ${tasks.length} pending tasks for inbox tab`);
        }
        
        // Sort tasks by timestamp (handle both timestamp and createdAt fields)
        tasks.sort((a, b) => {
          const getDate = (task: any) => {
            if (task.timestamp) {
              return task.timestamp.__time__ ? new Date(task.timestamp.__time__) : task.timestamp.toDate();
            }
            if (task.createdAt) {
              return task.createdAt.__time__ ? new Date(task.createdAt.__time__) : task.createdAt.toDate();
            }
            return new Date(0); // Fallback for tasks without timestamp
          };
          
          const dateA = getDate(a);
          const dateB = getDate(b);
          return dateB.getTime() - dateA.getTime(); // Sort newest first
        });
        
        // Update the agent tasks state
        setAgentTasks(tasks);
      }
    }, (error) => {
      console.error("❌ Error in Firestore listener for agent tasks:", error);
    });
    
    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up agent tasks listener");
      agentTasksUnsubscribe();
    };
  }, [user?.uid, agentTaskStatusFilter]);

  // Load email rules from Firestore
  useEffect(() => {
    const loadRulesFromFirestore = async () => {
      if (!user?.uid) return;
      
      try {
        // Load reply rules from instructions
        const replyRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
        const replyRulesSnap = await getDoc(replyRulesRef);
        
        // Load new email rules from instructions-new
        const newEmailRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions-new');
        const newEmailRulesSnap = await getDoc(newEmailRulesRef);
        
        // Combine rules from both locations
        let combinedRules: Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}> = [];
        
        // Add reply rules
        if (replyRulesSnap.exists()) {
          const replyData = replyRulesSnap.data();
          if (replyData.rules && Array.isArray(replyData.rules)) {
            // Mark rules from instructions as 'reply' or 'both'
            const replyRules = replyData.rules.map((rule: any) => {
              // If rule already has a type, keep it, otherwise set to 'reply'
              return {
                ...rule,
                type: rule.type || 'reply'
              };
            });
            combinedRules = [...combinedRules, ...replyRules];
          }
        }
        
        // Add new email rules
        if (newEmailRulesSnap.exists()) {
          const newEmailData = newEmailRulesSnap.data();
          if (newEmailData.rules && Array.isArray(newEmailData.rules)) {
            // Mark rules from instructions-new as 'new' or 'both'
            const newEmailRules = newEmailData.rules.map((rule: any) => {
              // If rule already has a type, keep it, otherwise set to 'new'
              return {
                ...rule,
                type: rule.type || 'new'
              };
            });
            
            // Merge with existing rules - avoid duplicates for 'both' type rules
            newEmailRules.forEach((newRule: any) => {
              // Check if this rule is already in combinedRules (for 'both' type rules)
              const existingRuleIndex = combinedRules.findIndex(r => 
                r.content === newRule.content && (r.type === 'both' || newRule.type === 'both')
              );
              
              if (existingRuleIndex >= 0) {
                // Rule exists and one is 'both' - mark as 'both'
                combinedRules[existingRuleIndex].type = 'both';
              } else {
                // New rule - add to list
                combinedRules.push(newRule);
              }
            });
          }
        }
        
        setEmailRulesList(combinedRules);
      } catch (error) {
        console.error('Error loading rules from Firestore:', error);
        setEmailRulesList([]);
      }
    };

    if (user?.uid) {
      loadRulesFromFirestore();
    }
  }, [user?.uid]);

  // Load custom filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('emailCustomFilters')
      if (saved) {
        setCustomFilters(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading custom filters:', error)
    }
  }, [])

  // Save custom filters to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('emailCustomFilters', JSON.stringify(customFilters))
    } catch (error) {
      console.error('Error saving custom filters:', error)
    }
  }, [customFilters])

  // Get current selected account details
  const getCurrentAccount = () => {
    console.log('getCurrentAccount called - selectedAccount:', selectedAccount)
    console.log('gmailProfileData:', gmailProfileData)
    console.log('connectedAccounts:', connectedAccounts)
    
    // If we have Gmail profile data and it matches the selected account, return it
    if (gmailProfileData && gmailProfileData.profile?.data?.response_data?.emailAddress === selectedAccount) {
      console.log('Returning Gmail account from profile data')
      return {
        id: 'gmail',
        emailAddress: gmailProfileData.profile.data.response_data.emailAddress,
        connected: gmailProfileData.connected || false,
        provider: 'gmail'
      }
    }
    
    // Fallback to connected accounts array
    console.log('Falling back to connected accounts array')
    const foundAccount = connectedAccounts.find(account => account.emailAddress === selectedAccount)
    console.log('Found account in connected accounts:', foundAccount)
    return foundAccount
  }

  const handleCancelCompose = () => {
    // No need for animation when closing
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
    setIsComposing(false)
    setComposeAnimating(false)
  }

  const handleArchive = () => {
    if (selectedEmail) {
      console.log("Archiving email:", selectedEmail.id)
      // Here you would typically update the email status in your backend
    }
  }

  const handleDelete = async () => {
    if (!selectedEmail || !user?.uid) {
      console.log("No email selected or user not authenticated")
      return
    }

    // Show confirmation dialog
    if (!confirm("Are you sure you want to permanently delete this email? This action cannot be undone.")) {
      return
    }

    const threadId = selectedEmail.threadId || selectedEmail.id

    try {
      console.log("Deleting email:", selectedEmail.id)
      
      // Skip deleting sent messages (they're locally generated and don't exist in Firestore)
      if (selectedEmail.id.startsWith('sent-')) {
        console.log("Skipping delete for locally generated sent message:", selectedEmail.id)
        setSelectedEmail(null)
        return
      }

      // Start the delete animation
      setDeletingThreadIds(prev => new Set(prev).add(threadId))
      
      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 300))

      // Check if this is the only email in the thread
      const threadRef = doc(db, 'merchants', user.uid, 'fetchedemails', threadId)
      const threadDoc = await getDoc(threadRef)
      
      if (threadDoc.exists()) {
        const threadData = threadDoc.data()
        const chainCollection = collection(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain')
        const chainQuery = query(chainCollection)
        const chainDocs = await getDocs(chainQuery)
        
        if (chainDocs.size === 1) {
          // Only one email in thread - delete the entire thread document
          console.log("Deleting entire thread as it contains only one email:", threadId)
          await deleteDoc(threadRef)
        } else {
          // Multiple emails in thread - delete only the specific email
          console.log("Deleting individual email from thread:", selectedEmail.id)
          const emailRef = doc(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain', selectedEmail.id)
          await deleteDoc(emailRef)
        }
      } else {
        // Thread doesn't exist, try to delete the email directly
        console.log("Thread not found, attempting to delete email directly:", selectedEmail.id)
        const emailRef = doc(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain', selectedEmail.id)
        await deleteDoc(emailRef)
      }
      
      console.log("Successfully deleted email:", selectedEmail.id)
      toast({
        title: "Email deleted",
        description: "The email has been permanently deleted.",
      })
      
      // Clear the selected email
      setSelectedEmail(null)
      
      // Remove the deleted thread from the fetched emails immediately
      setFetchedEmails(prev => prev.filter(email => email.threadId !== threadId))
      
      // Remove from deleting state
      setDeletingThreadIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(threadId)
        return newSet
      })
      
      // Refresh the email list in the background to sync with Firestore
      setTimeout(() => {
        fetchGmailEmails()
      }, 500)
      
    } catch (error) {
      console.error("Error deleting email:", error)
      // Remove from deleting state if there was an error
      setDeletingThreadIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(threadId)
        return newSet
      })
      toast({
        title: "Error",
        description: "Failed to delete the email. Please try again.",
        variant: "destructive",
      })
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

    // Add to queue to prevent overwhelming Firestore
    addToQueue(async () => {
      try {
        // All emails are now in the chain subcollection structure
        const emailRef = doc(db, 'merchants', user.uid, 'fetchedemails', threadId || emailId, 'chain', emailId)
        console.log("Marking email as read:", emailId, "in thread:", threadId || emailId)
        
        await updateDoc(emailRef, {
          read: true
        })
        console.log("Successfully marked email as read:", emailId)
      } catch (error) {
        console.error("Error marking email as read:", error)
        console.error("Email ID:", emailId, "Thread ID:", threadId || emailId)
      }
    })
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

  const handleExtractWritingStyle = async () => {
    if (!user?.uid) {
      alert('You must be logged in to extract writing style');
      return;
    }

    setIsExtractingWritingStyle(true);
    try {
      const extractWritingStyle = httpsCallable(functions, 'extractWritingStyle');
      const result = await extractWritingStyle({ merchantId: user.uid });
      
      console.log('Writing style extraction result:', result);
      
      setSuccessMessage('Writing style extracted successfully! Check your profile for the analysis.');
    } catch (error) {
      console.error('Error extracting writing style:', error);
      alert('Failed to extract writing style. Please try again.');
    } finally {
      setIsExtractingWritingStyle(false);
    }
  }

  const handleGmailIntegrationTrigger = async () => {
    if (!user?.uid) {
      console.log('User not authenticated, skipping Gmail integration trigger');
      return;
    }

    try {
      console.log('Calling gmailIntegrationTrigger for merchant:', user.uid);
      const gmailIntegrationTrigger = httpsCallable(functions, 'gmailIntegrationCall');
      const result = await gmailIntegrationTrigger({ merchantId: user.uid });
      
      console.log('Gmail integration trigger result:', result);
    } catch (error) {
      console.error('Error calling gmailIntegrationTrigger:', error);
    }
  }

  const handleConnectEmail = async () => {
    setIsConnectingEmail(true);
    
    // Show loading animation for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Redirect to integrations page to connect Gmail
    window.location.href = '/dashboard/integrations';
  }

  const handleAgentSelection = (agentId: string) => {
    if (agentId === 'customer-service') {
      setIsCustomerServiceModalOpen(true)
    } else if (agentId === 'categorising') {
      setIsEmailExecutiveModalOpen(true)
    } else if (agentId === 'summary') {
      setIsEmailSummaryModalOpen(true)
    }
  }

  const handleComposeNew = () => {
    // Clear any current selections and enter compose mode
    setSelectedEmail(null);
    setSelectedThread(null);
    setReplyMode(null);
    
    // Start animation before showing the compose view
    setComposeAnimating(true);
    setIsComposing(true);
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const filteredAndSortedEmails = useMemo(() => {
    if (!fetchedEmails.length) return []
    
    // First filter by read/unread status
    let filtered = fetchedEmails
    if (emailFilter === 'unread') {
      filtered = fetchedEmails.filter(email => !email.read)
    }
    
    // Then sort by date (newest first)
    return filtered.sort((a, b) => {
      const aDate = a.receivedAt?.toDate?.() || a.receivedAt || new Date(0)
      const bDate = b.receivedAt?.toDate?.() || b.receivedAt || new Date(0)
      return bDate.getTime() - aDate.getTime()
    })
  }, [fetchedEmails, emailFilter])

  const sortedAttachments = useMemo(() => {
    if (!allAttachments.length) return []
    
    return [...allAttachments].sort((a, b) => {
      let aValue = a[sortColumn]
      let bValue = b[sortColumn]
      
      // Handle different data types
      if (sortColumn === 'emailDate') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      } else if (sortColumn === 'fileSize') {
        aValue = aValue || 0
        bValue = bValue || 0
      } else {
        aValue = String(aValue || '').toLowerCase()
        bValue = String(bValue || '').toLowerCase()
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [allAttachments, sortColumn, sortDirection])

  const handleViewAttachments = async () => {
    if (!user?.uid) return
    
    setAttachmentsLoading(true)
    setShowAttachmentsPopup(true)
    
    try {
      const attachments: any[] = []
      
      // Query all threads in fetchedemails collection
      const threadsRef = collection(db, 'merchants', user.uid, 'fetchedemails')
      const threadsSnapshot = await getDocs(threadsRef)
      
      for (const threadDoc of threadsSnapshot.docs) {
        const threadId = threadDoc.id
        
        // Query chain subcollection for each thread
        const chainRef = collection(db, 'merchants', user.uid, 'fetchedemails', threadId, 'chain')
        const chainSnapshot = await getDocs(chainRef)
        
        for (const messageDoc of chainSnapshot.docs) {
          const messageData = messageDoc.data()
          
          // Check if message has payload.data.attachment_list
          if (messageData.payload?.data?.attachment_list && Array.isArray(messageData.payload.data.attachment_list)) {
            for (const attachment of messageData.payload.data.attachment_list) {
              if (attachment.s3url) {
                attachments.push({
                  id: `${threadId}_${messageDoc.id}_${attachment.filename || 'unknown'}`,
                  threadId,
                  messageId: messageDoc.id,
                  filename: attachment.filename || 'Unknown File',
                  s3url: attachment.s3url,
                  mimeType: attachment.mimeType || attachment.mimetype || 'application/octet-stream',
                  extractedAt: attachment.extractedAt,
                  extractedFileName: attachment.extractedFileName,
                  extractionStatus: attachment.extractionStatus,
                  fileSize: attachment.fileSize,
                  // Email context
                  emailSubject: messageData.subject || 'No Subject',
                  emailSender: messageData.sender || messageData.from || 'Unknown Sender',
                  emailDate: messageData.receivedAt?.toDate?.() || messageData.receivedAt
                })
              }
            }
          }
        }
      }
      
      console.log(`Found ${attachments.length} attachments across all emails`)
      setAllAttachments(attachments)
      
    } catch (error) {
      console.error('Error fetching attachments:', error)
      toast({
        title: "Error",
        description: "Failed to load attachments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setAttachmentsLoading(false)
    }
  }



  const handleEmailSelect = useCallback((email: any) => {
    console.log("📧 Email selected:", email.id, email.sender)
    console.log("🎯 Previous selectedEmail:", selectedEmail?.id)
    console.log("🎯 Setting selectedEmail to:", email.id)
    
    // Batch state updates for better performance
    setSelectedEmail(email)
    setReplyMode(null)
    
    // Mark email as read when clicked (async operation in background)
    if (!email.read) {
      markEmailAsReadAndUpdateUI(email)
    }
  }, [selectedEmail?.id])

  // Helper function to clean HTML and create preview text
  const createPreviewText = (htmlContent: string, maxLength: number = 80): string => {
    if (!htmlContent) return 'No preview available';
    
    // Strip HTML tags and clean up text for preview
    const cleanText = htmlContent
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with spaces
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'") // Replace &#39; with '
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .trim();
    
    if (!cleanText) return 'No preview available';
    
    return cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + '...'
      : cleanText;
  };

  // Memoized helper function to determine if a thread representative should be highlighted
  const isThreadRepresentativeHighlighted = useCallback((thread: any) => {
    if (!selectedEmail) return false
    
    // If this is a single email thread, highlight if the selected email belongs to this thread
    if (thread.count === 1) {
      const shouldHighlight = selectedEmail.threadId === thread.threadId || selectedEmail.id === thread.threadId
      if (shouldHighlight) {
        console.log("🎯 Highlighting single email thread:", thread.threadId)
      }
      return shouldHighlight
    }
    
    // For multi-email threads, highlight the representative if:
    // 1. This is the selected thread
    // 2. AND the representative is selected (not a sub-email)
    if (selectedThread?.threadId === thread.threadId && selectedThread.emails?.length > 0) {
      const isRepresentativeSelected = selectedEmail.id === selectedThread.emails[0]?.id
      const isSubEmailSelected = selectedThread.emails.slice(1).some((email: any) => email.id === selectedEmail.id)
      
      // Only highlight the main thread item when the representative itself is selected
      // Do NOT highlight the main thread when a sub-email is selected
      const shouldHighlight = isRepresentativeSelected && !isSubEmailSelected
      
      if (shouldHighlight) {
        console.log("🎯 Highlighting thread representative:", thread.threadId, "selectedEmail:", selectedEmail.id)
      }
      return shouldHighlight
    }
    
    return false
  }, [selectedEmail, selectedThread])

  // Simplified function to mark email as read and update all relevant UI state
  const markEmailAsReadAndUpdateUI = (email: any) => {
    console.log("📖 Marking email as read:", email.id)
    
    // Mark the email object as read immediately
    email.read = true
    
    // Update thread list: mark thread representative as read if this email is the most recent
    setFetchedEmails((prev: any[]) => prev.map(thread => {
      if (thread.threadId === email.threadId || thread.id === email.threadId) {
        // Update the representative if this email is the most recent one
        if (thread.representative?.id === email.id) {
          return {
            ...thread,
            read: true,
            representative: { ...thread.representative, read: true }
          }
        }
      }
      return thread
    }))

    // Update selected thread state if applicable
    if (selectedThread && selectedThread.threadId === email.threadId) {
      setSelectedThread((prev: any) => ({
        ...prev,
        emails: prev.emails.map((e: any) => 
          e.id === email.id ? { ...e, read: true } : e
        ),
        representative: prev.representative?.id === email.id 
          ? { ...prev.representative, read: true }
          : prev.representative,
        unreadCount: prev.emails.filter((e: any) => e.id === email.id ? false : !e.read).length,
        hasUnread: prev.emails.some((e: any) => e.id === email.id ? false : !e.read)
      }))
    }

    // Mark as read in Firestore
    markEmailAsRead(email.id, email.threadId)
  }

  const handleThreadSelect = async (thread: any) => {
    if (!user?.uid) return
    
    console.log("Thread selected:", thread)
    console.log("Thread has", thread.count, "messages")
    
    // Check if this thread is already selected and expanded - if so, collapse it
    if (selectedThread?.threadId === thread.threadId && expandedThreads.has(thread.threadId)) {
      console.log("🔽 Collapsing already expanded thread:", thread.threadId)
      setExpandedThreads(prev => {
        const newSet = new Set(prev);
        newSet.delete(thread.threadId);
        return newSet;
      });
      return; // Exit early to just collapse, don't reload
    }
    
    // Optimistic update: show the thread immediately for instant feedback
    setSelectedEmail(thread.representative)
    setReplyMode(null)
    
    // Check cache first to avoid redundant queries
    const cachedThread = threadCache.get(thread.threadId)
    if (cachedThread) {
      console.log("📋 Using cached thread data for:", thread.threadId)
      setSelectedThread(cachedThread)
      
      // Clear expansion state for previously selected threads
      if (selectedThread && selectedThread.threadId !== thread.threadId) {
        setExpandedThreads(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedThread.threadId);
          return newSet;
        });
      }
      
      return
    }
    
    try {
      
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
      const chainQuery = query(chainRef)
      
      const chainSnapshot = await getDocs(chainQuery)
      
      console.log(`🧵 Found ${chainSnapshot.size} messages in chain`)
      
      if (chainSnapshot.size === 0) {
        console.warn("No chain messages found for threadId:", thread.threadId)
        return
      }
      
      // Transform all chain messages in the thread
      const chainThreadEmails = chainSnapshot.docs.map((doc) => {
        const messageData = doc.data()
        
        // Use the stored fields directly
        const senderInfo = messageData.sender || "Unknown Sender"
        const toInfo = messageData.to || "Unknown Recipient"
        const subject = messageData.subject || "No Subject"
        
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
        
        // We only care about htmlMessage, not content
        // This ensures we don't show preview text in the email viewer

        // Create preview text from payload.data.preview.body if available
                  const previewText = messageData.payload?.data?.preview?.body 
            ? createPreviewText(messageData.payload.data.preview.body)
            : createPreviewText(messageData.htmlMessage || "");
          
        // Skip emails that don't have htmlMessage - this ensures consistent data
        if (!messageData.htmlMessage) {
          console.warn(`Email ${doc.id} missing htmlMessage, skipping`);
          return null;
        }
        
        return {
          id: doc.id,
          threadId: thread.threadId,
          sender: senderName,
          email: senderEmail,
          to: toInfo,
          subject: subject,
          htmlMessage: messageData.htmlMessage,
          preview: previewText,
          receivedAt: messageData.receivedAt,
          repliedAt: messageData.repliedAt,
          time: messageData.receivedAt || messageData.repliedAt || messageData.processedAt,
          read: messageData.read === true, // Explicitly check for true, default to false (unread)
          hasAttachment: extractAttachments(messageData).length > 0,
          folder: "inbox",
          rawData: messageData,
          payload: messageData.payload // Include payload for access to preview data
        }
      })
      
      // Filter out null emails (those without htmlMessage)
      const validThreadEmails = chainThreadEmails.filter(email => email !== null);
      
      // If no valid emails with htmlMessage, show an error
      if (validThreadEmails.length === 0) {
        console.error("No valid emails with htmlMessage found in thread:", thread.threadId);
        return;
      }
      
      // Sort emails by timestamp - consider both receivedAt and repliedAt
      const threadEmails = validThreadEmails.sort((a, b) => {
        const getEmailDate = (email: any) => {
          // Use repliedAt if available, otherwise use receivedAt, fallback to time
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
        
        // Sort newest first (most recent at top)
        return timeB.getTime() - timeA.getTime();
      })
      
      console.log("📊 Sorted thread emails:", threadEmails.map(email => ({
        id: email.id,
        sender: email.sender,
        read: email.read,
        receivedAt: email.receivedAt,
        repliedAt: email.repliedAt
      })))
      
      // Log all sender email addresses from incoming emails
      const senderEmails = threadEmails
        .map(email => email.email)
        .filter(email => email && email.includes('@') && !isEmailFromCurrentUser(email, user?.email || '', merchantEmail))
        .filter((email, index, arr) => arr.indexOf(email) === index); // Remove duplicates
      
      if (senderEmails.length > 0) {
        await logContactEmails(senderEmails, 'received', 'email_inbox');
      }
      
      // IMPORTANT: Check if there's only 1 email in chain
      if (threadEmails.length === 1) {
        // Single email - no dropdown needed, just show the email
        console.log("📧 Single email in chain - no dropdown needed")
        const singleEmail = threadEmails[0]
        handleEmailSelect(singleEmail)
        
        // Don't set selectedThread for single emails
        return
      }
      
      // Multiple emails - create thread with dropdown
      const completeThread = {
        threadId: thread.threadId,
        representative: threadEmails[0], // Most recent email as main button
        count: threadEmails.length,
        unreadCount: threadEmails.filter((email: any) => !email.read).length,
        emails: threadEmails,
        hasUnread: threadEmails.some((email: any) => !email.read)
      }
      
      // Also update the thread representative in the left panel to ensure it has the same htmlMessage
      // This ensures clicking the main thread item uses the same data as clicking from the dropdown
      setFetchedEmails(prev => prev.map(item => {
        if (item.threadId === thread.threadId) {
          // Check if this thread has new emails (count increased)
          const hasNewEmails = threadEmails.length > item.count
          
          if (hasNewEmails) {
            // Add animation for new emails in existing thread
            setNewEmailIds(prevIds => {
              const newIds = new Set(prevIds)
              newIds.add(thread.threadId)
              
              // Clear the animation after 3 seconds
              setTimeout(() => {
                setNewEmailIds(prev => {
                  const updated = new Set(prev)
                  updated.delete(thread.threadId)
                  return updated
                })
              }, 3000)
              
              return newIds
            })
          }
          
          return {
            ...item,
            count: threadEmails.length,
            unreadCount: threadEmails.filter((email: any) => !email.read).length,
            hasUnread: threadEmails.some((email: any) => !email.read),
            representative: {
              ...item.representative,
              htmlMessage: threadEmails[0].htmlMessage
            }
          };
        }
        return item;
      }))
      
      console.log("✅ Multiple emails in thread - setting up dropdown with", threadEmails.length, "emails")
      
      // Set the thread for dropdown functionality
      setSelectedThread(completeThread)
      
      // Cache the thread data for future use to avoid redundant queries
      setThreadCache(prev => new Map(prev).set(thread.threadId, completeThread))
      
      // Automatically expand the dropdown for multiple emails
      setExpandedThreads(prev => new Set([...prev, thread.threadId]))
      
      // Set the most recent email (main button) to show in the right panel
      // Use a direct state update rather than going through handleEmailSelect for better performance
      const mostRecentEmail = threadEmails[0]
      setSelectedEmail(mostRecentEmail)
      
      // Mark as read if needed
      if (!mostRecentEmail.read) {
        markEmailAsReadAndUpdateUI(mostRecentEmail)
      }
      
    } catch (error) {
      console.error("❌ Error in handleThreadSelect:", error)
      
      // Don't set selectedEmail as fallback - this forces proper data loading
      // Show an error toast instead
      toast({
        title: "Error loading email",
        description: "Could not load email content. Please try again.",
        variant: "destructive",
      })
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

  // Helper function to close instructions with animation
  const closeInstructionsWithAnimation = () => {
    setInstructionsClosing(true);
    setTimeout(() => {
      setShowInstructions(false);
      setInstructionsClosing(false);
    }, 200); // Match the animation duration
  };

  // Helper function to close rules dialog with animation
  const closeRulesDialogWithAnimation = () => {
    setRulesDialogClosing(true);
    setTimeout(() => {
      setShowEmailRulesDialog(false);
      setRulesDialogClosing(false);
    }, 300); // Match the animation duration
  };

  // Helper function to close custom dialog with animation
  const closeCustomDialogWithAnimation = () => {
    setCustomDialogClosing(true);
    setTimeout(() => {
      setShowAddCustomDialog(false);
      setCustomDialogClosing(false);
      setNewCustomName('');
      setNewCustomKeywords('');
      setNewCustomColor('blue');
    }, 300); // Match the animation duration
  };

  // Email Rules Functions
  const addNewRule = () => {
    if (newRuleText.trim()) {
      const newRule = {
        id: Date.now().toString(),
        title: newRuleText.length > 50 ? newRuleText.substring(0, 50) + '...' : newRuleText,
        content: newRuleText.trim(),
        type: newRuleType // Include the selected rule type
      };
      setEmailRulesList(prev => [...prev, newRule]);
      setNewRuleText('');
    }
  };

  const removeRule = (ruleId: string) => {
    const ruleToRemove = emailRulesList.find(rule => rule.id === ruleId);
    if (ruleToRemove) {
      console.log('Removing rule:', ruleToRemove.title);
      setEmailRulesList(prev => prev.filter(rule => rule.id !== ruleId));
    }
    
    // Close expanded rule if it's being removed
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      newSet.delete(ruleId);
      return newSet;
    });
  };

  // Note: Rules will be automatically saved to separate Firestore locations when saveRulesToFirestore is called on Save button click
  const toggleRuleExpansion = (ruleId: string) => {
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  };

  const startEditingRule = (rule: {id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}) => {
    setEditingRuleId(rule.id);
    setEditingRuleText(rule.content);
    setEditingRuleType(rule.type);
  };

  const saveEditingRule = () => {
    if (editingRuleId && editingRuleText.trim()) {
      setEmailRulesList(prev => prev.map(rule =>
        rule.id === editingRuleId
          ? {
              ...rule,
              content: editingRuleText.trim(),
              title: editingRuleText.trim().length > 50 ? editingRuleText.trim().substring(0, 50) + '...' : editingRuleText.trim(),
              type: editingRuleType // Update rule type
            }
          : rule
      ));
      setEditingRuleId(null);
      setEditingRuleText('');
      setEditingRuleType('both'); // Reset editing type
    }
  };

  const cancelEditingRule = () => {
    setEditingRuleId(null);
    setEditingRuleText('');
    setEditingRuleType('both'); // Reset editing type
  };

  const rulesToString = (rules: Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}>) => {
    if (rules.length === 0) return '';
    
    // Group rules by type
    const replyRules = rules.filter(rule => rule.type === 'reply' || rule.type === 'both').map(rule => rule.content);
    const newEmailRules = rules.filter(rule => rule.type === 'new' || rule.type === 'both').map(rule => rule.content);
    
    let result = '';
    if (replyRules.length > 0) {
      result += 'Reply Rules:\n' + replyRules.map(rule => `- ${rule}`).join('\n');
    }
    if (newEmailRules.length > 0) {
      if (result) result += '\n\n';
      result += 'New Email Rules:\n' + newEmailRules.map(rule => `- ${rule}`).join('\n');
    }
    
    return result;
  };

  const stringToRules = (rulesString: string) => {
    if (!rulesString.trim()) return [];
    
    const rules: Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}> = [];
    
    // Split by sections
    const lines = rulesString.split('\n');
    let currentType: 'reply' | 'new' | 'both' = 'both';
    let ruleCounter = 1;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine.toLowerCase().includes('reply rules:')) {
        currentType = 'reply';
        continue;
      } else if (trimmedLine.toLowerCase().includes('new email rules:')) {
        currentType = 'new';
        continue;
      }
      
      if (trimmedLine.startsWith('- ')) {
        const content = trimmedLine.substring(2).trim();
        if (content) {
          const rule = {
            id: `imported-${ruleCounter++}`,
            title: content.length > 50 ? content.substring(0, 50) + '...' : content,
            content: content,
            type: currentType
          };
          rules.push(rule);
        }
      }
    }
    
    return rules;
  };

  const saveRulesToFirestore = async (rules: Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}>) => {
    if (!user?.uid) return;
    
    try {
      // Group rules by type
      const replyRules = rules.filter(rule => rule.type === 'reply' || rule.type === 'both');
      const newEmailRules = rules.filter(rule => rule.type === 'new' || rule.type === 'both');
      
      // Save reply rules to instructions document
      const replyRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
      await setDoc(replyRulesRef, { 
        rules: replyRules,
        lastUpdated: new Date()
      }, { merge: true });
      
      // Save new email rules to instructions-new document
      const newEmailRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions-new');
      await setDoc(newEmailRulesRef, { 
        rules: newEmailRules,
        lastUpdated: new Date()
      }, { merge: true });
      
      console.log('Rules saved successfully to Firestore');
    } catch (error) {
      console.error('Error saving rules to Firestore:', error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F5F5F5]">
      <style dangerouslySetInnerHTML={{ 
        __html: `
          ${customScrollbarStyles}
        `
      }} />
      
      {/* Top Bar - Combined Header with folder dropdown, toolbar, and connected account */}
      <div className="mx-3 mb-3 bg-white rounded-xl shadow-lg border border-gray-100 flex items-center justify-between px-4 py-3 flex-shrink-0">
        {currentView === 'email' ? (
          <>
            {/* Left Side: Folder dropdown and toolbar actions */}
            <div className="flex items-center gap-4">
              {/* Main Tab Container */}
              <TooltipProvider>
                <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mr-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-center h-7 w-9 rounded-md transition-colors",
                          String(currentView) === 'email'
                            ? "text-gray-800 bg-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/70"
                        )}
                        onClick={() => {
                          const view = 'email';
                          setCurrentView(view as any);
                          // Fetch emails when switching to inbox tab
                          if (user?.uid) {
                            fetchGmailEmails();
                          }
                        }}
                      >
                        <Mail size={15} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Inbox</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center justify-center h-7 w-9 rounded-md transition-colors",
                          String(currentView) === 'agent'
                            ? "text-gray-800 bg-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/70"
                        )}
                        onClick={() => {
                          const view = 'agent';
                          setCurrentView(view as any);
                          // Fetch agent tasks when switching to agent view
                          if (user?.uid) {
                            fetchAgentTasks();
                          }
                        }}
                      >
                        <RiRobot3Line size={15} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Agent Inbox</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>

              {/* Email Title */}
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-black">Email</h1>
              </div>

              {/* Minimalist Toolbar Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleComposeNew} 
                  size="sm" 
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium"
                >
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  New Email
                </Button>
                <Button 
                  onClick={handleViewAttachments} 
                  size="sm" 
                  variant="outline"
                  className="px-3 py-1.5 rounded-md text-xs font-medium"
                >
                  <Paperclip className="h-3.5 w-3.5 mr-1" />
                  View Attachments
                </Button>
              </div>
            </div>

            {/* Right Side: Consolidated Tools and Account Selector */}
            <div className="flex items-center gap-1">
              {/* Refresh Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSync} 
                      disabled={emailsLoading}
                      className="text-gray-600 hover:bg-gray-100 p-1.5"
                    >
                      <RefreshCw className={`h-4 w-4 ${emailsLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{emailsLoading ? 'Refreshing...' : 'Refresh'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Combined Tools Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 px-2 flex items-center gap-1 text-gray-600 hover:bg-gray-100">
                    <Settings className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-xl border border-gray-200 shadow-md">
                  <DropdownMenuLabel className="text-xs font-medium text-gray-500 px-3 py-2">Agents</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleAgentSelection('customer-service')} className="rounded-lg">
                    <MessageSquare className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Customer Service</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgentSelection('categorising')} className="rounded-lg">
                    <Filter className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Categorising</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAgentSelection('summary')} className="rounded-lg">
                    <FileText className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Summary</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs font-medium text-gray-500 px-3 py-2">Tools</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setShowEmailRulesDialog(true)} className="rounded-lg">
                    <Shield className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Email Rules</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEnableGmailTrigger} className="rounded-lg">
                    <Bell className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Triggers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExtractWritingStyle} className="rounded-lg">
                    <Palette className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Writing Style</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/email/attachments')} className="rounded-lg">
                    <Paperclip className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm">Attachments</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Minimalist Account Selector */}
              {gmailEmailAddress ? (
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger className="w-8 h-8 p-0 border-gray-200 hover:border-gray-300 [&>span]:flex [&>span]:w-full [&>span]:justify-center [&>svg]:hidden">
                    <SelectValue>
                      {loading ? (
                        <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                      ) : getCurrentAccount() ? (
                        <div className="w-5 h-5 flex items-center justify-center">
                          {(() => {
                            const account = getCurrentAccount();
                            const isGmail = account?.provider === "gmail";
                            return (
                              <Image 
                                src={isGmail ? "/gmailnew.png" : "/outlook.png"}
                                alt={isGmail ? "Gmail" : "Outlook"}
                                width={16}
                                height={16}
                                className="w-4 h-4 object-scale-down"
                              />
                            );
                          })()}
                        </div>
                      ) : (
                        <Plus className="h-4 w-4 text-gray-400" />
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {connectedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.emailAddress}>
                        <div className="flex items-center gap-2">
                          <Image 
                            src={account.provider === "gmail" ? "/gmailnew.png" : "/outlook.png"}
                            alt={account.provider === "gmail" ? "Gmail" : "Outlook"}
                            width={16}
                            height={16}
                            className="w-4 h-4 object-scale-down"
                          />
                          <span className="text-sm">{account.emailAddress}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {connectedAccounts.length > 0 && <Separator className="my-1" />}
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="text-sm">Add Account</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Button 
                  onClick={handleConnectEmail}
                  disabled={loading || isConnectingEmail}
                  size="sm"
                  className="h-8 px-3 bg-blue-500 hover:bg-blue-600 text-white text-xs"
                >
                  {(loading || isConnectingEmail) ? (
                    <>
                      <div className="h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isConnectingEmail ? "Connecting..." : ""}
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-1" />
                      Connect
                    </>
                  )}
                </Button>
              )}
            </div>
            </>
          ) : (
            /* Agent Inbox Top Bar */
            <>
              <div className="flex items-center justify-between w-full">
                {/* Left Side - Tabs and Title */}
                <div className="flex items-center gap-4">
                  {/* Main Tab Container */}
                  <TooltipProvider>
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mr-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              "flex items-center justify-center h-7 w-9 rounded-md transition-colors",
                              String(currentView) === 'email'
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                            onClick={() => {
                              const view = 'email';
                              setCurrentView(view as any);
                              // Fetch emails when switching to inbox tab
                              if (user?.uid) {
                                fetchGmailEmails();
                              }
                            }}
                          >
                            <Mail size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Inbox</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              "flex items-center justify-center h-7 w-9 rounded-md transition-colors",
                              String(currentView) === 'agent'
                                ? "text-gray-800 bg-white shadow-sm"
                                : "text-gray-600 hover:bg-gray-200/70"
                            )}
                            onClick={() => {
                              const view = 'agent';
                              setCurrentView(view as any);
                            }}
                          >
                            <RiRobot3Line size={15} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Agent Inbox</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>

                  {/* Agent Inbox Title */}
                  <div className="flex items-center">
                    <h1 className="text-lg font-medium text-black">Agent Inbox</h1>
                  </div>
                </div>

                {/* Right Side - New Agent Button */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push('/dashboard/agents')}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Agent
                  </Button>
                </div>
              </div>
            </>
          )}
                </div>

        {/* Main Content */}
        {currentView === 'email' ? (
          <div className="flex flex-1 min-h-0 px-3 pb-3 main-panels-container">
          {/* Left Panel - Email List Card */}
          <div 
            className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full mr-1"
            style={{ width: `${leftPanelWidth}%` }}
          >
          
          {/* Rest of left panel content... */}
          {/* Search Bar - Fixed at top, hidden when summary panel is visible */}
          {(!showSummaryDropdown || summaryClosing) && (
            <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white rounded-t-xl">
              {/* Folder Selection and Read/Unread Filter */}
              <div className="flex items-center gap-2 mb-3">
                <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                  <SelectTrigger className="h-9 text-sm border-gray-200 hover:border-gray-300 px-2 w-24">
                    <SelectValue>
                      <div className="flex items-center">
                        {selectedFolder === 'inbox' && <Inbox className="h-4 w-4 mr-2" />}
                        {selectedFolder === 'sent' && <Send className="h-4 w-4 mr-2" />}
                        {selectedFolder === 'drafts' && <Edit3 className="h-4 w-4 mr-2" />}
                        {selectedFolder === 'spam' && <Shield className="h-4 w-4 mr-2" />}
                        {selectedFolder === 'trash' && <Trash2 className="h-4 w-4 mr-2" />}
                        <span>{selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1)}</span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbox">
                      <div className="flex items-center gap-2">
                        <Inbox className="h-4 w-4" />
                        <span>Inbox</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="sent">
                      <div className="flex items-center gap-2">
                        <Send className="h-4 w-4" />
                        <span>Sent</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="drafts">
                      <div className="flex items-center gap-2">
                        <Edit3 className="h-4 w-4" />
                        <span>Drafts</span>
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
                  </SelectContent>
                </Select>
                
                {/* Read/Unread Filter Switch */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
                  <button
                    onClick={() => setEmailFilter('all')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      emailFilter === 'all'
                        ? 'text-gray-800 bg-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200/70'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setEmailFilter('unread')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      emailFilter === 'unread'
                        ? 'text-gray-800 bg-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200/70'
                    }`}
                  >
                    Unread
                  </button>
                </div>
                
                <div className="relative flex-1">
                  {isSearching ? (
                    <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  )}
                  <Input
                    placeholder={isSearchMode ? `Search results (${searchResults.length} found)` : "Search emails..."}
                    className="pl-10 pr-8"
                    value={searchQuery}
                    onChange={(e) => {
                      console.log("🔤 Search input changed:", e.target.value)
                      setSearchQuery(e.target.value)
                    }}
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
              
              {/* Filter Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedFilter('all')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors w-fit ${
                    selectedFilter === 'all'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedFilter('customer-service')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors w-fit ${
                    selectedFilter === 'customer-service'
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    selectedFilter === 'customer-service' ? 'bg-green-500' : 'bg-green-500'
                  }`}></div>
                  Customer Service
                </button>
                <button
                  onClick={() => setSelectedFilter('invoices')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors w-fit ${
                    selectedFilter === 'invoices'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    selectedFilter === 'invoices' ? 'bg-purple-500' : 'bg-purple-500'
                  }`}></div>
                  Invoices
                </button>
                <button
                  onClick={() => setSelectedFilter('promo')}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors w-fit ${
                    selectedFilter === 'promo'
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                    selectedFilter === 'promo' ? 'bg-orange-500' : 'bg-orange-500'
                  }`}></div>
                  Promo
                </button>
                
                {/* Custom Filters */}
                {customFilters.map((filter) => {
                  const colorMap: Record<string, {bg: string, text: string, border: string, dot: string}> = {
                    blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
                    green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
                    purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
                    orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
                    red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
                    pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
                    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' },
                    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' }
                  }
                  const colors = colorMap[filter.color] || colorMap.blue
                  
                  return (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors w-fit ${
                        selectedFilter === filter.id
                          ? `${colors.bg} ${colors.text} ${colors.border}`
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`h-1.5 w-1.5 ${colors.dot} rounded-full flex-shrink-0`}></div>
                      {filter.name}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setCustomFilters(prev => prev.filter(f => f.id !== filter.id))
                          if (selectedFilter === filter.id) {
                            setSelectedFilter('all')
                          }
                        }}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  )
                })}
                
                {/* Add Custom Button */}
                <button
                  onClick={() => setShowAddCustomDialog(true)}
                  className="inline-flex items-center justify-center px-2 py-1.5 rounded-md text-xs font-medium border border-gray-300 border-dashed text-gray-600 hover:text-gray-800 hover:border-gray-400 transition-colors w-fit"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
          {/* Summary Panel - Shows at top of left panel */}
          {(showSummaryDropdown || summaryClosing) && (
            <div className={`flex-1 min-h-0 border-b border-gray-200 bg-gray-50 transition-all duration-300 ease-out ${
              summaryClosing 
                ? 'animate-out fade-out-0 slide-out-to-top-1 duration-300' 
                : 'animate-in fade-in-0 slide-in-from-top-1 duration-300'
            }`}>
              <div className="p-3 h-full flex flex-col" style={{ background: 'linear-gradient(white, white) padding-box, linear-gradient(to right, #f97316, #3b82f6) border-box', border: '2px solid transparent', borderRadius: '0.5rem' }}>
                <div className="flex items-start justify-between mb-2 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-medium bg-gradient-to-r from-orange-500 to-blue-500 bg-clip-text text-transparent">
                      Thread Summary
                      {selectedThread && ` (${selectedThread.count} message${selectedThread.count > 1 ? 's' : ''})`}
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={closeSummaryDropdownWithAnimation}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {isSummarizing ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                    <span className="text-xs text-gray-600">Generating summary...</span>
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 custom-scrollbar min-h-0">
                    {threadSummary ? (
                      <AnimatedEmailResponse 
                        html={DOMPurify.sanitize(threadSummary)} 
                        className="text-sm text-gray-700 leading-relaxed"
                      />
                    ) : (
                      <div className="text-sm text-gray-700 leading-relaxed">
                        No summary available.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email list - Scrollable middle section - Hidden when summary is shown */}
          {!(showSummaryDropdown && !summaryClosing) && (
            <div className={`flex-1 overflow-y-auto min-h-0 custom-scrollbar rounded-bl-xl transition-all duration-300 ease-out ${
              summaryClosing ? 'animate-in fade-in-0 slide-in-from-top-1 duration-300' : ''
            }`} style={{ height: 'auto' }}>

            
            <div className="divide-y divide-gray-200">
              {/* ✅ SEARCH EMPTY STATE */}
              {isSearchMode && searchResults.length === 0 && !isSearching && (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Search className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No emails found</h3>
                  <p className="text-sm text-gray-500 text-center max-w-sm">
                    No emails match your search for "{searchQuery}". Try adjusting your search terms.
                  </p>
                </div>
              )}
              
              {emailThreads.map((thread) => (
                <div 
                  key={thread.threadId}
                  className={`transition-all duration-300 ease-out ${
                    newEmailIds.has(thread.threadId) 
                      ? 'animate-in slide-in-from-top-4 fade-in-0 bg-blue-50 border-l-4 border-l-blue-500' 
                      : deletingThreadIds.has(thread.threadId)
                      ? 'transform -translate-x-full opacity-0 bg-red-50 border-l-4 border-l-red-500'
                      : ''
                  }`}
                >
                  {/* Main email button - always shown */}
                  <div
                    className={`flex items-start gap-1.5 py-2 pr-2 pl-1.5 cursor-pointer ${
                      isThreadRepresentativeHighlighted(thread)
                        ? 'bg-blue-100' 
                        : thread.representative?.read === true
                          ? 'bg-white hover:bg-gray-50'
                          : 'bg-gray-100 hover:bg-gray-200' 
                    }`}
                    onClick={() => handleThreadSelect(thread)}
                  >
                    {/* Dropdown chevron - only show for multiple emails */}
                    <div className="w-5 flex justify-center items-start flex-shrink-0 pt-0.5">
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
                        <div className="w-4 h-4"></div>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                      <AvatarFallback className={`${getConsistentColor(thread.representative?.sender || '')} text-gray-700 text-sm font-medium`}>
                        {thread.representative?.sender ? thread.representative.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '??'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Thread content - clickable to select thread */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleThreadSelect(thread)}
                    >
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm truncate transition-all duration-300 ${
                            !thread.representative?.read ? 'font-bold text-gray-900' : 'font-normal text-gray-600'
                          } ${
                            newEmailIds.has(thread.threadId) ? 'text-blue-700' : ''
                          }`}>
                          {thread.representative?.sender || 'Unknown Sender'}
                        </span>
                        
                        {/* Thread count badge */}
                        {thread.count > 1 && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit transition-all duration-300 ${
                            newEmailIds.has(thread.threadId) ? 'scale-110 bg-blue-50 border-blue-200' : ''
                          }`}>
                            <Users className="h-2.5 w-2.5" />
                            {thread.count}
                          </span>
                        )}
                        
                        {/* Unread count badge */}
                        {thread.unreadCount > 0 && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-white text-blue-700 border border-blue-200 w-fit transition-all duration-300 ${
                            newEmailIds.has(thread.threadId) ? 'scale-110 bg-blue-50' : ''
                          }`}>
                            <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                            {thread.unreadCount}
                          </span>
                        )}
                        

                        {thread.representative?.hasAttachment && (
                          <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        )}
                          <span className={`text-xs ml-auto ${!thread.representative?.read ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>{formatPreviewTime(thread.representative?.time)}</span>
                      </div>
                        <div className={`text-sm truncate transition-all duration-300 ${
                          !thread.representative?.read ? 'font-bold text-gray-900' : 'font-normal text-gray-700'
                        } ${
                          newEmailIds.has(thread.threadId) ? 'text-blue-800' : ''
                        }`}>
                        {thread.representative?.subject || 'No Subject'}
                      </div>
                        <div className={`text-xs truncate transition-all duration-300 ${
                          !thread.representative?.read ? 'text-gray-700 font-medium' : 'text-gray-500'
                        } ${
                          newEmailIds.has(thread.threadId) ? 'text-blue-600' : ''
                        }`}>
                        {thread.representative?.preview || 'No preview available'}
                      </div>
                    </div>

                    {/* Unread indicator */}
                    {!thread.representative?.read && (
                      <div className={`h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 shadow-sm unread-indicator ${
                        newEmailIds.has(thread.threadId) ? 'animate-pulse' : ''
                      }`}></div>
                    )}
                  </div>

                  {/* Thread dropdown - show individual emails when expanded (only when 2+ documents in chain) */}
                  {/* Dropdown - only show for multiple emails when expanded */}
                  {selectedThread?.threadId === thread.threadId && 
                   selectedThread?.emails?.length > 1 && 
                   expandedThreads.has(thread.threadId) && (
                    <div className="border-l-4 border-l-gray-200 bg-gray-50">
                      {selectedThread.emails
                        .slice(1) // Skip the first email (it's shown as the main button)
                        .sort((a: any, b: any) => {
                          // Sort newest first for dropdown (after main email)
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
                          return timeB.getTime() - timeA.getTime();
                        })
                        .map((email: any, index: number) => {
                          // Only highlight dropdown emails if the dropdown is expanded and this specific email is selected
                          const isDropdownEmailHighlighted = selectedEmail?.id === email.id && expandedThreads.has(thread.threadId)
                          
                          return (
                            <div
                              key={email.id}
                              className={`flex items-center gap-1.5 p-2 pl-16 cursor-pointer border-t border-t-gray-200 ${
                                isDropdownEmailHighlighted
                                  ? 'bg-blue-100'
                                  : email.read === true
                                    ? 'bg-white hover:bg-gray-50'
                                    : 'bg-gray-100 hover:bg-gray-200'
                              }`}
                              onClick={() => handleEmailSelect(email)}
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
                                // First try to use payload.data.preview.body if available
                                if (email.payload?.data?.preview?.body) {
                                  return createPreviewText(email.payload.data.preview.body, 60);
                                }
                                
                                // Otherwise use htmlMessage or content
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
                          )
                        })}
                    </div>
                  )}
                </div>
              ))}
              
              {/* ✅ PAGINATION: Load More Button */}
              {hasMoreEmails && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={loadMoreEmails}
                    disabled={loadingMoreEmails}
                    className="w-full text-sm py-2 px-4 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    {loadingMoreEmails ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading more emails...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Load More Emails
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Draggable Divider */}
        <div 
          className={`w-1 bg-transparent hover:bg-gray-200 cursor-col-resize transition-colors relative ${
            isDragging ? 'bg-blue-300' : ''
          }`}
          onMouseDown={(e) => handleMouseDown(e, 'email')}
        >
        </div>

        {/* Right Panel - Email Content Card */}
        <div 
          className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden ml-1"
          style={{ width: `${100 - leftPanelWidth}%` }}
        >
          {/* Success Message */}
          {successMessage && (
            <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-md animate-in slide-in-from-top-2 duration-200 ease-out">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  <span className="text-sm font-medium">{successMessage}</span>
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
              onCancel={handleCancelCompose}
              selectedAccount={selectedAccount}
              callGenerateEmailResponse={callGenerateEmailResponse}
              setShowEmailRulesDialog={setShowEmailRulesDialog}
              user={user}
              isClosing={composeClosing}
              onSend={async (to: string, subject: string, content: string, cc?: string, bcc?: string, attachments?: File[]) => {
                try {
                  setIsSending(true);
                  
                  if (!user?.uid) {
                    throw new Error('User not authenticated');
                  }
                  
                  // Handle attachments if provided
                  let attachmentUrls: string[] = [];
                  if (attachments && attachments.length > 0) {
                    try {
                      // Upload all attachments to Firebase Storage
                      const uploadPromises = attachments.map(file => uploadFileToStorage(file));
                      attachmentUrls = await Promise.all(uploadPromises);
                      console.log('Attachments uploaded successfully:', attachmentUrls);
                    } catch (uploadError: any) {
                      console.error('Error uploading attachments:', uploadError);
                      const errorMessage = uploadError?.message || 'Unknown upload error';
                      throw new Error(`Failed to upload attachments: ${errorMessage}`);
                    }
                  }
                  
                  // Use sendGmailEmail for new emails
                  const sendGmailEmail = httpsCallable(functions, 'sendGmailEmail');
                  
                  // Split the 'to' field to handle multiple recipients
                  const toEmails = to.split(',').map(email => email.trim()).filter(Boolean);
                  const primaryRecipient = toEmails[0]; // First email is the primary recipient
                  const extraRecipients = toEmails.slice(1); // Rest go to extra_recipients
                  
                  const emailData: any = {
                    merchantId: user.uid,
                    body: content,
                    recipient_email: primaryRecipient,
                    subject: subject || '(No Subject)',
                    is_html: true,
                    attachmentUrls: attachmentUrls, // Add attachment URLs
                  };
                  
                  // Add extra recipients if there are multiple emails in 'to' field
                  if (extraRecipients.length > 0) {
                    emailData.extra_recipients = extraRecipients;
                  }
                  
                  // Add CC and BCC if provided
                  if (cc && cc.trim()) {
                    emailData.cc = cc.split(',').map(email => email.trim()).filter(Boolean);
                  }
                  if (bcc && bcc.trim()) {
                    emailData.bcc = bcc.split(',').map(email => email.trim()).filter(Boolean);
                  }
                  
                  const response = await sendGmailEmail(emailData);
                  console.log('Email sent successfully:', response.data);
                  
                  // Log all email addresses to contactemails collection
                  const allRecipients = [...toEmails];
                  if (cc && cc.trim()) allRecipients.push(...cc.split(',').map(email => email.trim()).filter(Boolean));
                  if (bcc && bcc.trim()) allRecipients.push(...bcc.split(',').map(email => email.trim()).filter(Boolean));
                  
                  // Log as sent emails
                  await logContactEmails(allRecipients, 'sent', 'email_compose');
                  
                  // Show success message with all recipients
                  let recipients = [to];
                  if (cc && cc.trim()) recipients.push(...cc.split(',').map(email => email.trim()).filter(Boolean));
                  if (bcc && bcc.trim()) recipients.push(...bcc.split(',').map(email => email.trim()).filter(Boolean));
                  setSuccessMessage(`Message sent to ${recipients.join(', ')}`);
                  
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
              emailsLoading={emailsLoading}
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
                    
                    // Handle attachments if provided
                    let attachmentUrls: string[] = [];
                    if (attachments.length > 0) {
                      try {
                        // Upload all attachments to Firebase Storage
                        const uploadPromises = attachments.map(file => uploadFileToStorage(file));
                        attachmentUrls = await Promise.all(uploadPromises);
                        console.log('Forward attachments uploaded successfully:', attachmentUrls);
                        emailData.attachmentUrls = attachmentUrls;
                      } catch (uploadError: any) {
                        console.error('Error uploading forward attachments:', uploadError);
                        const errorMessage = uploadError?.message || 'Unknown upload error';
                        throw new Error(`Failed to upload attachments: ${errorMessage}`);
                      }
                    }
                    
                    const response = await sendGmailEmail(emailData);
                    
                    console.log('Email forwarded successfully:', response.data);
                    
                    // Log all email addresses to contactemails collection
                    await logContactEmails(recipients, 'sent', 'email_forward');
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Message forwarded to ${recipientList}`);
                    
                  } else {
                    // For reply/replyAll, use the replyToGmailThread function
                    const replyToGmailThread = httpsCallable(functions, 'replyToGmailThread');
                    
                    const replyData: any = {
                      merchantId: user.uid,
                      message_body: content,
                      html_message_body: content, // HTML format of the message body
                      recipient_email: recipients[0], // Primary recipient
                      thread_id: selectedThread?.threadId || replyMode?.originalEmail.threadId || replyMode?.originalEmail.id,
                      is_html: true,
                    };
                    
                    // Add CC recipients if present
                    if (recipients.length > 1) {
                      replyData.cc = recipients.slice(1);
                    }
                    
                    // Handle attachments if provided
                    let attachmentUrls: string[] = [];
                    if (attachments.length > 0) {
                      try {
                        // Upload all attachments to Firebase Storage
                        const uploadPromises = attachments.map(file => uploadFileToStorage(file));
                        attachmentUrls = await Promise.all(uploadPromises);
                        console.log('Reply attachments uploaded successfully:', attachmentUrls);
                        replyData.attachmentUrls = attachmentUrls;
                      } catch (uploadError: any) {
                        console.error('Error uploading reply attachments:', uploadError);
                        const errorMessage = uploadError?.message || 'Unknown upload error';
                        throw new Error(`Failed to upload attachments: ${errorMessage}`);
                      }
                    }
                    
                    const response = await replyToGmailThread(replyData);
                    
                    console.log('Reply sent successfully:', response.data);
                    
                    // Log all email addresses to contactemails collection
                    await logContactEmails(recipients, 'sent', 'email_reply');
                    
                    // Show success message
                    const recipientList = recipients.join(', ');
                    setSuccessMessage(`Reply sent to ${recipientList}`);
                  }
                  
                  // Create the sent message object for UI
                  const sentMessage = {
                    id: `sent-${Date.now()}`,
                    threadId: selectedThread?.threadId || replyMode?.originalEmail.threadId || replyMode?.originalEmail.id,
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
                  
                  // Add the sent message to the thread (only if selectedThread exists)
                  if (selectedThread) {
                    const updatedThread = {
                      ...selectedThread,
                      emails: [...selectedThread.emails, sentMessage],
                      count: selectedThread.count + 1
                    };
                    
                    // Update the selected thread
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
              callGenerateEmailResponse={callGenerateEmailResponse}
              emailRules={emailRules}
              setEmailRules={setEmailRules}
              showEmailRulesDialog={showEmailRulesDialog}
              setShowEmailRulesDialog={setShowEmailRulesDialog}
              tempEmailRules={tempEmailRules}
              setTempEmailRules={setTempEmailRules}
              onSummariseThread={() => {
                if (selectedThread) {
                  summarizeEmailOrThread(selectedThread);
                } else if (selectedEmail) {
                  summarizeEmailOrThread(selectedEmail);
                }
              }}
              selectedThread={selectedThread}
              user={user}
              showSummaryDropdown={showSummaryDropdown}
              setSummaryClosing={setSummaryClosing}
              summaryClosing={summaryClosing}
              threadSummary={threadSummary}
              isSummarizing={isSummarizing}
              closeSummaryDropdownWithAnimation={closeSummaryDropdownWithAnimation}
              onDelete={handleDelete}
            />
          ) : (
            <EmptyEmailView />
          )}
        </div>
      </div>
        ) : (
          /* Agent Inbox View */
          <div className="flex flex-1 min-h-0 px-3 pb-3 main-panels-container">
            {/* Agent Inbox Left Panel */}
            <div 
              className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full mr-1"
              style={{ width: `${Math.max(agentPanelWidth, 30)}%` }}
            >
              {/* Search Bar */}
              <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-white rounded-t-xl">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search agent tasks..."
                    className="pl-10 pr-8"
                    value={agentSearchQuery}
                    onChange={(e) => setAgentSearchQuery(e.target.value)}
                  />
                  {agentSearchQuery && (
                    <button
                      onClick={() => setAgentSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {/* Standard Tab Design */}
                <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                  <button
                    onClick={() => fetchAgentTasks("pending")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      agentTaskStatusFilter === "pending"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <Inbox size={15} />
                    Inbox
                  </button>
                  <button
                    onClick={() => fetchAgentTasks("completed")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      agentTaskStatusFilter === "completed"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <CheckCircle size={15} />
                    Completed
                  </button>
                  <button
                    onClick={() => fetchAgentTasks("rejected")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      agentTaskStatusFilter === "rejected"
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                  >
                    <XCircle size={15} />
                    Rejected
                  </button>
                </div>
              </div>
              
              {/* Agent Tasks List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {agentTasksLoading ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500 mt-2">Loading agent tasks...</p>
                  </div>
                ) : agentTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <RiRobot3Line className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700">No Agent Tasks</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">
                      Agent tasks will appear here when your email agents process incoming messages.
                    </p>
                  </div>
                ) : filteredAgentTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Search className="h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-700">No Matching Tasks</h3>
                    <p className="text-sm text-gray-500 max-w-xs mt-1">
                      No agent tasks match your search query. Try a different search term.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAgentTasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-center gap-1.5 py-2 pr-2 pl-1.5 cursor-pointer ${
                          selectedAgentTask?.id === task.id
                            ? 'bg-blue-100' 
                            : 'bg-white hover:bg-gray-50'
                        }`}
                        onClick={() => handleAgentTaskSelect(task)}
                      >
                        <div className="w-5 flex justify-center items-center flex-shrink-0 mt-1.5">
                          <div className="flex flex-col items-center gap-1">
                            {task.type === 'agent' ? (
                              <div className={`h-2 w-2 rounded-full flex-shrink-0 shadow-sm ${
                                agentTaskStatusFilter === "completed" ? 'bg-green-500' : 
                                agentTaskStatusFilter === "rejected" ? 'bg-red-500' : 
                                'bg-blue-500'
                              }`}></div>
                            ) : task.type === 'customerservice' ? (
                              <div className={`h-2 w-2 rounded-full flex-shrink-0 shadow-sm ${
                                agentTaskStatusFilter === "completed" ? 'bg-green-500' : 
                                agentTaskStatusFilter === "rejected" ? 'bg-red-500' : 
                                'bg-blue-500'
                              }`}></div>
                            ) : (
                              <div className={`h-2 w-2 rounded-full flex-shrink-0 shadow-sm ${
                                agentTaskStatusFilter === "completed" ? 'bg-green-500' : 
                                agentTaskStatusFilter === "rejected" ? 'bg-red-500' : 
                                'bg-blue-500'
                              }`}></div>
                            )}
                            {task.isOngoingConversation && (
                              <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 shadow-sm"></div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm truncate font-medium text-gray-900">
                              {task.agentname || task.emailTitle || "Agent Task"}
                            </span>
                            {task.isOngoingConversation && (
                              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                                Thread
                              </span>
                            )}
                            <div className="flex flex-col items-end ml-auto">
                              {agentTaskStatusFilter === "completed" && (task.acknowledgedAt || task.status === 'approved') ? (
                                <>
                                  <span className="text-xs text-green-600 font-medium whitespace-nowrap flex items-center">
                                    <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                    Completed
                              </span>
                                  <span className="text-xs text-gray-500 whitespace-nowrap">
                                    {task.acknowledgedAt ? 
                                      formatPreviewTime(task.acknowledgedAt.__time__ ? new Date(task.acknowledgedAt.__time__) : task.acknowledgedAt.toDate()) :
                                      task.sentAt ?
                                        formatPreviewTime(task.sentAt.__time__ ? new Date(task.sentAt.__time__) : task.sentAt.toDate()) :
                                        formatPreviewTime(task.createdAt.__time__ ? new Date(task.createdAt.__time__) : task.createdAt.toDate())
                                    }
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                              {task.createdAt && formatPreviewTime(task.createdAt.__time__ ? new Date(task.createdAt.__time__) : task.createdAt.toDate())}
                            </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm truncate text-gray-700 flex items-center gap-1.5">
                                                          {task.type === 'agent' ? (
                              <span className="h-4 w-4 flex-shrink-0 mt-1">
                                <RiRobot3Line className="h-3.5 w-3.5 text-gray-900" />
                              </span>
                                                          ) : task.type === 'customerservice' ? (
                              <span className="relative h-4 w-4 flex-shrink-0 mt-1">
                                <Image 
                                  src="/gmailnew.png" 
                                  alt="Gmail" 
                                  width={16} 
                                  height={16} 
                                  className="object-contain"
                                />
                              </span>
                            ) : task.classification?.isCustomerInquiry && (
                              <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                            )}
                            <span>
                              {task.type === 'agent' 
                                ? "Merchant Agent Task"
                                : task.type === 'customerservice'
                                ? "Customer Service Agent"
                                : task.classification?.isCustomerInquiry 
                                ? (task.senderEmail || task.sender || "Unknown sender")
                                : ""
                              }
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {task.priority && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium w-fit ${
                                task.priority === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                                task.priority === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                                task.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                'bg-green-50 text-green-700 border border-green-200'
                              }`}>
                                <div className={`h-1.5 w-1.5 rounded-sm flex-shrink-0 ${
                                  task.priority === 'critical' ? 'bg-red-500' :
                                  task.priority === 'high' ? 'bg-orange-500' :
                                  task.priority === 'medium' ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}></div>
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                              </span>
                            )}
                            {task.inquiryType && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200 w-fit">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                {task.inquiryType}
                              </span>
                            )}
                            {task.isOngoingConversation && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                                <div className="h-1 w-1 bg-purple-500 rounded-full flex-shrink-0"></div>
                                Thread
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Draggable Divider */}
            <div 
              className={`w-1 bg-transparent hover:bg-gray-200 cursor-col-resize transition-colors relative ${
                isDragging ? 'bg-blue-300' : ''
              }`}
              onMouseDown={(e) => handleMouseDown(e, 'agent')}
            >
            </div>

            {/* Agent Inbox Right Panel */}
            <div 
              className="bg-white rounded-xl shadow-lg border border-gray-100 flex flex-col h-full overflow-hidden ml-1"
              style={{ width: `${100 - agentPanelWidth}%` }}
            >
              {selectedAgentTask ? (
                <div className="h-full flex flex-col">
                  {/* Header */}
                  <div className="p-4 border-b">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">
                      {selectedAgentTask.agentname || selectedAgentTask.emailTitle || "Agent Task"}
                        </h2>
                        
                        {/* Acknowledge/Reject buttons moved outside of the badges section */}
                        {selectedAgentTask.type === 'agent' && agentTaskStatusFilter === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-green-200 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md"
                              onClick={handleAcknowledgeAgentTask}
                              disabled={isSendingAgentResponse}
                            >
                              {isSendingAgentResponse ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3 mr-1" />
                              )}
                              Acknowledge
                            </Button>
                          </div>
                        )}
                        
                        {selectedAgentTask.type === 'customerservice' && agentTaskStatusFilter === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-transparent rounded-md p-0 mr-3"
                              onClick={handleRejectAgentTask}
                              disabled={isSendingAgentResponse}
                            >
                              {isSendingAgentResponse ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <>Reject</>
                              )}
                            </Button>
                            <Button 
                              size="sm" 
                              className="h-7 text-xs bg-blue-500 hover:bg-blue-600 rounded-md"
                              onClick={handleSendAgentResponse}
                              disabled={isSendingAgentResponse || !(selectedAgentTask?.finalMessage || selectedAgentTask?.agentResponse || selectedAgentTask?.response)}
                            >
                              {isSendingAgentResponse ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3 mr-1" />
                                  Send Response
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* All badges moved below the title */}
                      <div className="flex flex-wrap gap-2 mb-1">
                      {selectedAgentTask.classification?.isCustomerInquiry && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200 w-fit">
                            <div className="h-1 w-1 bg-gray-500 rounded-full flex-shrink-0"></div>
                          Customer Inquiry
                        </span>
                      )}
                        {selectedAgentTask.priority && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium w-fit ${
                            selectedAgentTask.priority === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                            selectedAgentTask.priority === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                            selectedAgentTask.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                            'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-sm flex-shrink-0 ${
                              selectedAgentTask.priority === 'critical' ? 'bg-red-500' :
                              selectedAgentTask.priority === 'high' ? 'bg-orange-500' :
                              selectedAgentTask.priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            {selectedAgentTask.priority.charAt(0).toUpperCase() + selectedAgentTask.priority.slice(1)} Priority
                          </span>
                        )}
                      {selectedAgentTask.isOngoingConversation && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 w-fit">
                            <div className="h-1 w-1 bg-purple-500 rounded-full flex-shrink-0"></div>
                          Ongoing Thread
                          </span>
                      )}
                      {agentTaskStatusFilter === "completed" && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-green-50 text-green-700 border border-green-200 w-fit">
                            <div className="h-1 w-1 bg-green-500 rounded-full flex-shrink-0"></div>
                          Completed
                        </span>
                      )}
                      {agentTaskStatusFilter === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-red-50 text-red-700 border border-red-200 w-fit">
                            <div className="h-1 w-1 bg-red-500 rounded-full flex-shrink-0"></div>
                          Rejected
                        </span>
                      )}
                                            </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        {selectedAgentTask.createdAt && (() => {
                          const date = selectedAgentTask.createdAt.__time__ 
                              ? new Date(selectedAgentTask.createdAt.__time__) 
                            : selectedAgentTask.createdAt.toDate();
                          
                          const now = new Date();
                          const isToday = date.toDateString() === now.toDateString();
                          const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
                          
                          if (isToday) {
                            return `Today ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                          } else if (isYesterday) {
                            return `Yesterday ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                          } else {
                            return date.toLocaleDateString('en-AU', { 
                              day: 'numeric', 
                              month: 'short', 
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                          }
                        })()}
                      </div>
                      {selectedAgentTask.senderEmail && !selectedAgentTask.type && (
                        <div className="text-sm text-blue-600 font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                          {selectedAgentTask.senderEmail}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Content with Tabs */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Tabs */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-xl w-fit">
                        <button
                          onClick={() => handleTabChange("response")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                            activeTab === "response"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <MessageSquare size={15} />
                          {selectedAgentTask.agentResponse ? "Information" : "Response"}
                        </button>
                        <button
                          onClick={() => handleTabChange("details")}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                            activeTab === "details"
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <AlignLeft size={15} />
                          Details
                        </button>
                      </div>
                    </div>
                    
                    {/* Tab Content */}
                    <div className="flex-1 overflow-y-auto p-4 pt-2">
                                            {/* Response Tab with Original Email Side by Side */}
                      {activeTab === "response" && (
                        <div 
                          className={`transition-opacity duration-300 ${tabChanging ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {/* Layout for response and original email - conditional based on task type */}
                          <div className={`${selectedAgentTask.type === 'agent' ? '' : 'grid grid-cols-1 md:grid-cols-2'} gap-4`}>
                            {/* Agent Response Column */}
                            {(selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response) && (
                              <div 
                                className={`rounded-xl h-full relative ${selectedAgentTask.type === 'customerservice' ? 'p-0.5' : ''}`}
                                style={{ 
                                  boxShadow: selectedAgentTask.type === 'agent' 
                                    ? 'none'
                                    : '0 2px 8px -1px rgba(0, 0, 0, 0.1), 0 1px 4px -1px rgba(0, 0, 0, 0.06)',
                                  background: selectedAgentTask.type === 'customerservice' 
                                    ? 'linear-gradient(90deg, #f97316 0%, #3b82f6 100%)'
                                    : 'transparent'
                                }}
                              >
                                <div 
                                  className={`p-4 h-full flex flex-col ${selectedAgentTask.type === 'customerservice' ? 'rounded-[11px] bg-white' : 'rounded-xl'}`}
                                  style={{
                                    border: selectedAgentTask.type === 'agent' ? '1px solid #e5e7eb' : 'none',
                                    background: 'white'
                                  }}
                                >
                                  {selectedAgentTask.type === 'agent' || selectedAgentTask.type === 'customerservice' ? (
                                    <div className="mb-4">
                                      <h3 className="text-base font-semibold text-gray-800 mb-2">Agent Response</h3>
                                      {selectedAgentTask.status === 'approved' && agentTaskStatusFilter === "completed" && (
                                        <div className="flex items-center gap-2 mb-2 text-green-600 text-sm">
                                          <CheckCircle className="h-4 w-4" />
                                          <span>This task has been completed</span>
                                        </div>
                                      )}
                                      <div className="h-px bg-gray-200 w-[calc(100%+2rem)] -mx-4 my-3"></div>
                                    </div>
                                  ) : (
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center">
                                      <MessageSquare className="h-4 w-4 text-purple-600 mr-2" />
                                      <h3 className="text-sm font-medium">
                                        {isEditingResponse && !isUsingAiEdit ? "Editing Response" : selectedAgentTask.agentResponse ? "Response" : "Agent Response"}
                                      </h3>
                                      {agentTaskStatusFilter === "completed" && (
                                        <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                                          Sent
                                        </span>
                                      )}
                                    </div>
                                    {!isEditingResponse && agentTaskStatusFilter === "pending" && (
                                      <div className="flex items-center gap-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl"
                                          onClick={() => {
                                            setEditedResponse(selectedAgentTask.response);
                                            setIsEditingResponse(true);
                                            setIsUsingAiEdit(false);
                                          }}
                                        >
                                          <Edit3 className="h-3 w-3 mr-1" />
                                          Modify
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl"
                                          onClick={() => {
                                            setEditedResponse(selectedAgentTask.response);
                                            setIsEditingResponse(true);
                                            setIsUsingAiEdit(true);
                                          }}
                                        >
                                          <Sparkles className="h-3 w-3 mr-1" />
                                          AI Edit
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                  )}
                                  
                                  <div className="flex-1 overflow-auto">
                                    {isEditingResponse && isUsingAiEdit ? (
                                      <>
                                        {/* AI Edit Instructions (at the top) */}
                                        <div className="bg-white transition-all duration-200 ease-out animate-in slide-in-from-top-2 mb-3">
                                          <div className="relative border border-gray-200 rounded-md overflow-hidden">
                                            <textarea
                                              value={editPrompt}
                                              onChange={(e) => setEditPrompt(e.target.value)}
                                              placeholder="Enter specific instructions for how you'd like the AI to modify the response..."
                                              className="w-full text-xs bg-gray-50 px-3 py-2 focus:outline-none resize-none placeholder-gray-500 border-none"
                                              rows={3}
                                            />
                                            <div className="flex justify-between items-center bg-gray-50 border-t border-gray-200 px-3 py-2">
                                              <button
                                                onClick={() => {
                                                  setIsEditingResponse(false);
                                                  setIsUsingAiEdit(false);
                                                  setEditPrompt("");
                                                }}
                                                className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800"
                                              >
                                                <X className="h-3 w-3" strokeWidth="2" />
                                                Cancel
                                              </button>
                                              
                                              <button
                                                disabled={!editPrompt.trim() || isGeneratingEdit}
                                                onClick={async () => {
                                                  setIsGeneratingEdit(true);
                                                  try {
                                                    // Simulate AI editing with a timeout
                                                    await new Promise(resolve => setTimeout(resolve, 1500));
                                                    
                                                    // Create a modified response with the instructions
                                                    // In a real implementation, this would call an AI service
                                                    // For now, we'll create a more visible change to demonstrate the functionality
                                                    const aiModifiedResponse = `<div style="color: #1e40af; font-weight: 500; margin-bottom: 8px;">
                                                      AI has modified this response based on your instructions: "${editPrompt}"
                                                    </div>
                                                    ${selectedAgentTask.agentResponse || selectedAgentTask.response}
                                                    <div style="border-top: 1px solid #e5e7eb; margin-top: 12px; padding-top: 8px; color: #4b5563; font-style: italic;">
                                                      Additional information added by AI based on your instructions.
                                                    </div>`;
                                                    
                                                    // Update the edited response
                                                    setEditedResponse(aiModifiedResponse);
                                                    
                                                    // Update the selectedAgentTask with the edited response
                                                    const aiUpdatedTask = {
                                                      ...selectedAgentTask,
                                                      response: aiModifiedResponse
                                                    };
                                                    
                                                    // Update in state
                                                    setSelectedAgentTask(aiUpdatedTask);
                                                    
                                                    // Update in the agentTasks array
                                                    setAgentTasks(prev => 
                                                      prev.map(task => 
                                                        task.id === selectedAgentTask.id ? aiUpdatedTask : task
                                                      )
                                                    );
                                                    
                                                    // Update in Firestore
                                                    if (user?.uid) {
                                                      const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
                                                      await updateDoc(agentTaskRef, { response: aiModifiedResponse });
                                                    }
                                                    
                                                    toast({
                                                      title: "AI edit applied",
                                                      description: "The response has been successfully modified and saved.",
                                                    });
                                                    
                                                    setIsEditingResponse(false);
                                                    setIsUsingAiEdit(false);
                                                  } catch (error) {
                                                    console.error("Error applying AI edit:", error);
                                                    toast({
                                                      variant: "destructive",
                                                      title: "AI edit failed",
                                                      description: "Failed to apply AI modifications. Please try again.",
                                                    });
                                                  } finally {
                                                    setIsGeneratingEdit(false);
                                                  }
                                                }}
                                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-md transition-colors ${
                                                  isGeneratingEdit || !editPrompt.trim()
                                                    ? 'text-gray-400 cursor-not-allowed' 
                                                    : 'text-blue-600 hover:text-blue-700'
                                                }`}
                                              >
                                                {isGeneratingEdit ? (
                                                  <>
                                                    <Loader2 className="h-3 w-3 animate-spin" strokeWidth="2" />
                                                    Generating...
                                                  </>
                                                ) : (
                                                  <>
                                                    <Sparkles className="h-3 w-3" strokeWidth="2" />
                                                    Apply
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* View-only response for AI edit mode */}
                                        <div 
                                          className="text-sm text-gray-600 email-content prose prose-sm max-w-none"
                                          dangerouslySetInnerHTML={{ 
                                            __html: DOMPurify.sanitize(selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response) 
                                          }}
                                        />
                                      </>
                                    ) : isEditingResponse && !isUsingAiEdit ? (
                                      <>
                                        {/* Direct editing of the response */}
                                        <div className="relative">
                                          <div 
                                            className="text-sm text-gray-600 email-content prose prose-sm max-w-none focus:outline-none"
                                            contentEditable
                                            suppressContentEditableWarning={true}
                                            onBlur={(e) => setEditedResponse(e.currentTarget.innerHTML)}
                                            dangerouslySetInnerHTML={{ 
                                              __html: editedResponse 
                                            }}
                                          />
                                          
                                          {/* Action buttons for manual edit */}
                                          <div className="flex justify-end gap-2 mt-3">
                                            <button
                                              onClick={() => {
                                                setIsEditingResponse(false);
                                                setIsUsingAiEdit(false);
                                                setEditPrompt("");
                                              }}
                                              className="flex items-center gap-1.5 text-xs font-normal text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                                            >
                                              <X className="h-3 w-3 text-gray-500" strokeWidth="2" />
                                              Cancel
                                            </button>
                                            
                                            <button
                                              disabled={!editedResponse.trim()}
                                              onClick={() => {
                                                // Update the selectedAgentTask with the edited response
                                                const updatedTask = {
                                                  ...selectedAgentTask,
                                                  response: editedResponse
                                                };
                                                
                                                // Update in state
                                                setSelectedAgentTask(updatedTask);
                                                
                                                // Update in the agentTasks array
                                                setAgentTasks(prev => 
                                                  prev.map(task => 
                                                    task.id === selectedAgentTask.id ? updatedTask : task
                                                  )
                                                );
                                                
                                                // Update in Firestore
                                                const agentTaskRef = doc(db, `merchants/${user?.uid}/agentinbox/${selectedAgentTask.id}`);
                                                updateDoc(agentTaskRef, { response: editedResponse })
                                                  .then(() => {
                                                    toast({
                                                      title: "Response updated",
                                                      description: "The response has been successfully saved and will be used when sending.",
                                                    });
                                                  })
                                                  .catch(error => {
                                                    console.error("Error updating response:", error);
                                                    toast({
                                                      variant: "destructive",
                                                      title: "Update failed",
                                                      description: "Failed to save the response. Please try again.",
                                                    });
                                                  });
                                                
                                                setIsEditingResponse(false);
                                                setIsUsingAiEdit(false);
                                                setEditPrompt("");
                                              }}
                                              className={`flex items-center gap-1.5 text-xs font-normal px-3 py-1.5 rounded-md transition-colors ${
                                                !editedResponse.trim()
                                                  ? 'text-white bg-blue-400 cursor-not-allowed' 
                                                  : 'text-white bg-blue-500 hover:bg-blue-600'
                                              }`}
                                            >
                                              <Check className="h-3 w-3 text-white" strokeWidth="2" />
                                              Save Changes
                                            </button>
                                          </div>
                                        </div>
                                      </>
                                    ) : (
                                      // Display the response
                                      isHtmlContent(selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response) ? (
                                        <div 
                                          className="text-sm text-gray-600 email-content prose prose-sm max-w-none"
                                          dangerouslySetInnerHTML={{ 
                                            __html: DOMPurify.sanitize(selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response) 
                                          }}
                                        />
                                      ) : (
                                        <div className="whitespace-pre-wrap text-sm text-gray-600">
                                          {selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Original Email Column - only show for customerservice type tasks */}
                            {selectedAgentTask.originalEmail?.htmlContent && selectedAgentTask.type !== 'agent' && (
                              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
                                {selectedAgentTask.type === 'customerservice' ? (
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <h3 className="text-base font-semibold text-gray-800">Original Email</h3>
                                      {selectedAgentTask.senderEmail && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                          <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                                          <Mail className="h-3.5 w-3.5 text-gray-500 flex-shrink-0" />
                                          {selectedAgentTask.senderEmail}
                                        </span>
                                      )}
                                    </div>
                                    <div className="h-px bg-gray-200 w-[calc(100%+2rem)] -mx-4 my-3"></div>
                                  </div>
                                ) : (
                                <div className="flex items-center mb-2">
                                  <Mail className="h-4 w-4 text-gray-600 mr-2" />
                                  <h3 className="text-sm font-medium">Original Email</h3>
                                  {selectedAgentTask.senderEmail && (
                                    <div className="text-sm text-blue-600 font-medium flex items-center gap-1.5 ml-3">
                                      <Mail className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                                      {selectedAgentTask.senderEmail}
                                </div>
                                  )}
                                </div>
                                )}
                                <div 
                                  className="text-sm text-gray-600 email-content prose prose-sm max-w-none overflow-auto"
                                  dangerouslySetInnerHTML={{ 
                                    __html: DOMPurify.sanitize(selectedAgentTask.originalEmail.htmlContent) 
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Details Tab */}
                      {activeTab === "details" && (
                        <div 
                          className={`transition-opacity duration-300 ${tabChanging ? 'opacity-0' : 'opacity-100'}`}
                        >
                          {/* Task Details */}
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                            <div className="flex items-center mb-3">
                              <Info className="h-4 w-4 text-gray-600 mr-2" />
                              <h3 className="text-sm font-medium">Task Details</h3>
                            </div>
                            <div className="space-y-3">
                              {selectedAgentTask.threadId && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Thread ID</span>
                                  <span className="text-sm text-gray-700">{selectedAgentTask.threadId}</span>
                                </div>
                              )}
                              {selectedAgentTask.messageId && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Message ID</span>
                                  <span className="text-sm text-gray-700">{selectedAgentTask.messageId}</span>
                                </div>
                              )}
                              {selectedAgentTask.createdAt && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Created</span>
                                  <span className="text-sm text-gray-700">
                                    {formatMelbourneTime(
                                      selectedAgentTask.createdAt.__time__ 
                                        ? new Date(selectedAgentTask.createdAt.__time__) 
                                        : selectedAgentTask.createdAt.toDate()
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedAgentTask.executedAt && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Executed</span>
                                  <span className="text-sm text-gray-700">
                                    {formatMelbourneTime(
                                      selectedAgentTask.executedAt.__time__ 
                                        ? new Date(selectedAgentTask.executedAt.__time__) 
                                        : selectedAgentTask.executedAt.toDate()
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedAgentTask.agentId && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Agent ID</span>
                                  <span className="text-sm text-gray-700">{selectedAgentTask.agentId}</span>
                                </div>
                              )}
                              {selectedAgentTask.agentname && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Agent Name</span>
                                  <span className="text-sm text-gray-700">{selectedAgentTask.agentname}</span>
                                </div>
                              )}
                              {selectedAgentTask.status && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Status</span>
                                  <span className="text-sm text-gray-700 capitalize">{selectedAgentTask.status}</span>
                                </div>
                              )}
                              {selectedAgentTask.status === 'approved' && (selectedAgentTask.acknowledgedAt || selectedAgentTask.sentAt) && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Completed</span>
                                  <span className="text-sm text-gray-700">
                                    {(() => {
                                      const date = selectedAgentTask.acknowledgedAt 
                                        ? (selectedAgentTask.acknowledgedAt.__time__ 
                                          ? new Date(selectedAgentTask.acknowledgedAt.__time__) 
                                          : selectedAgentTask.acknowledgedAt.toDate())
                                        : (selectedAgentTask.sentAt.__time__
                                          ? new Date(selectedAgentTask.sentAt.__time__)
                                          : selectedAgentTask.sentAt.toDate());
                                      
                                      const now = new Date();
                                      const isToday = date.toDateString() === now.toDateString();
                                      const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
                                      
                                      if (isToday) {
                                        return `Today ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                                      } else if (isYesterday) {
                                        return `Yesterday ${date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })}`;
                                      } else {
                                        return date.toLocaleDateString('en-AU', { 
                                          day: 'numeric', 
                                          month: 'short', 
                                          year: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        });
                                      }
                                    })()}
                                  </span>
                                </div>
                              )}
                              {selectedAgentTask.expectedToolsTotal && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Tools</span>
                                  <span className="text-sm text-gray-700">
                                    {selectedAgentTask.toolsExecuted || selectedAgentTask.successfulTools || 0} / {selectedAgentTask.expectedToolsTotal} executed
                                    {selectedAgentTask.failedTools > 0 && (
                                      <span className="text-red-600 ml-1">({selectedAgentTask.failedTools} failed)</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedAgentTask.sentAt && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Sent</span>
                                  <span className="text-sm text-gray-700">
                                    {formatMelbourneTime(
                                      selectedAgentTask.sentAt.__time__ 
                                        ? new Date(selectedAgentTask.sentAt.__time__) 
                                        : selectedAgentTask.sentAt.toDate()
                                    )}
                                  </span>
                                </div>
                              )}
                              {selectedAgentTask.rejectedAt && (
                                <div className="flex flex-col">
                                  <span className="text-xs font-medium text-gray-500">Rejected</span>
                                  <span className="text-sm text-gray-700">
                                    {formatMelbourneTime(
                                      selectedAgentTask.rejectedAt.__time__ 
                                        ? new Date(selectedAgentTask.rejectedAt.__time__) 
                                        : selectedAgentTask.rejectedAt.toDate()
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Summary Section */}
                          {(selectedAgentTask.shortSummary || selectedAgentTask.conversationSummary) && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                              <div className="flex items-center mb-3">
                                <AlignLeft className="h-4 w-4 text-gray-600 mr-2" />
                                <h3 className="text-sm font-medium">Summary</h3>
                              </div>
                              {selectedAgentTask.shortSummary && (
                                <div className="mb-3">
                                  <p className="text-sm text-gray-600">{selectedAgentTask.shortSummary}</p>
                                </div>
                              )}
                              {selectedAgentTask.conversationSummary && (
                                <div>
                                  <p className="text-sm text-gray-600">{selectedAgentTask.conversationSummary}</p>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Final Message Section */}
                          {selectedAgentTask.finalMessage && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-4">
                              <div className="flex items-center mb-3">
                                <MessageSquare className="h-4 w-4 text-gray-600 mr-2" />
                                <h3 className="text-sm font-medium">Final Message</h3>
                              </div>
                              <div className="text-sm text-gray-600">
                                {isHtmlContent(selectedAgentTask.finalMessage) ? (
                                  <div 
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{ 
                                      __html: DOMPurify.sanitize(selectedAgentTask.finalMessage) 
                                    }}
                                  />
                                ) : (
                                  <div className="whitespace-pre-wrap">
                                    {selectedAgentTask.finalMessage}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Thread History */}
                          {selectedAgentTask.isOngoingConversation && selectedAgentTask.threadSummary && (
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-4">
                              <div className="flex items-center mb-3">
                                <MessageSquare className="h-4 w-4 text-blue-600 mr-2" />
                                <h3 className="text-sm font-medium text-blue-700">Thread History</h3>
                              </div>
                              <p className="text-sm text-blue-700">
                                {selectedAgentTask.threadSummary}
                              </p>
                            </div>
                          )}
                          
                          {/* Classification */}
                          {selectedAgentTask.classification && (
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              <div className="flex items-center mb-3">
                                <ClipboardCheck className="h-4 w-4 text-gray-600 mr-2" />
                                <h3 className="text-sm font-medium">Classification</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Customer Inquiry:</span>
                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                  <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                                    selectedAgentTask.classification.isCustomerInquiry ? "bg-green-500" : "bg-gray-400"
                                  }`}></div>
                                  {selectedAgentTask.classification.isCustomerInquiry ? "Yes" : "No"}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="p-3 border-t flex justify-between gap-2">
                    {/* Only show action buttons for pending tasks that are not agent or customerservice type */}
                    {agentTaskStatusFilter === "pending" && selectedAgentTask.type !== 'agent' && selectedAgentTask.type !== 'customerservice' ? (
                      <>
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              if (selectedAgentTask && user?.uid) {
                                const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
                                updateDoc(agentTaskRef, {
                                  status: "rejected",
                                  rejectedAt: Timestamp.now(),
                                  rejectedBy: user.uid
                                }).then(() => {
                                  toast({
                                    title: "Task rejected",
                                    description: "The task has been marked as rejected",
                                  });
                                  // Refresh the current view
                                  fetchAgentTasks(agentTaskStatusFilter);
                                });
                              }
                            }}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSendAgentResponse}
                            disabled={isSendingAgentResponse || !(selectedAgentTask?.finalMessage || selectedAgentTask?.agentResponse || selectedAgentTask?.response)}
                          >
                            {isSendingAgentResponse ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                {selectedAgentTask.agentResponse ? "Acknowledging..." : "Sending..."}
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3 mr-1" />
                                {selectedAgentTask.agentResponse ? "Acknowledge" : "Send Response"}
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    ) : agentTaskStatusFilter === "rejected" ? (
                      <>
                        <div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              if (selectedAgentTask && user?.uid) {
                                const agentTaskRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAgentTask.id}`);
                                updateDoc(agentTaskRef, {
                                  status: "pending",
                                  rejectedAt: null
                                }).then(() => {
                                  toast({
                                    title: "Task restored",
                                    description: "The task has been moved back to pending",
                                  });
                                  // Refresh the current view
                                  fetchAgentTasks(agentTaskStatusFilter);
                                });
                              }
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Restore to Pending
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full flex justify-center">
                        <span className="text-xs text-gray-500 flex items-center">
                          <CheckCircle className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                          {selectedAgentTask.sentAt && agentTaskStatusFilter === "completed" ? (
                            <>
                              Completed on {formatMelbourneTime(
                                selectedAgentTask.sentAt.__time__ 
                                  ? new Date(selectedAgentTask.sentAt.__time__) 
                                  : selectedAgentTask.sentAt.toDate()
                              )}
                            </>
                          ) : agentTaskStatusFilter === "completed" ? (
                            <>This task has been completed</>
                          ) : (
                            <>Task pending</>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {agentResponseSuccess && (
                    <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-green-100 text-green-800 px-4 py-2 rounded-md text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {agentResponseSuccess}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700">No Task Selected</h3>
                  <p className="text-sm text-gray-500 max-w-xs mt-1">
                    Select a task from the list to view details and agent responses.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      {/* Email Rules Modal */}
      {(showEmailRulesDialog || rulesDialogClosing) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${
          rulesDialogClosing 
            ? 'animate-out fade-out duration-300' 
            : 'animate-in fade-in duration-200'
        }`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/50 ${
              rulesDialogClosing 
                ? 'animate-out fade-out duration-300' 
                : 'animate-in fade-in duration-200'
            }`} 
            onClick={closeRulesDialogWithAnimation}
          />
          
          {/* Modal Content */}
          <div className={`relative bg-white rounded-md shadow-lg max-w-4xl w-full mx-4 h-[80vh] overflow-hidden ${
            rulesDialogClosing 
              ? 'animate-out slide-out-to-bottom-4 zoom-out-95 duration-300 ease-in' 
              : 'animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out'
          }`}>
            <div className="flex flex-col h-full">
              {/* Header with full-width line */}
              <div className="p-4 pb-0">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <h2 className="text-base font-medium text-gray-700">Email Rules</h2>
                  </div>
                  <button 
                    onClick={closeRulesDialogWithAnimation}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 pt-3 flex flex-col h-full overflow-hidden">
                <p className="text-xs text-gray-500 mb-3">
                  Create and manage rules that the AI will follow when generating email responses. You can specify if a rule applies to new emails, replies, or both.
                </p>
                
                {/* Add New Rule Section */}
                <div className="space-y-3 mb-6">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newRuleText}
                        onChange={(e) => setNewRuleText(e.target.value)}
                        placeholder="Add a new rule (e.g., Always be concise and professional)"
                        className="flex-1 text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addNewRule();
                          }
                        }}
                      />
                      <Button
                        onClick={addNewRule}
                        disabled={!newRuleText.trim()}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Rule Type Selector */}
                    <div className="flex items-center justify-start gap-4 text-sm">
                      <p className="text-xs font-medium text-gray-700">Apply this rule to:</p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="ruleType"
                            checked={newRuleType === 'both'}
                            onChange={() => setNewRuleType('both')}
                            className="h-3.5 w-3.5 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs">Both</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="ruleType"
                            checked={newRuleType === 'reply'}
                            onChange={() => setNewRuleType('reply')}
                            className="h-3.5 w-3.5 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs">Replies Only</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="ruleType"
                            checked={newRuleType === 'new'}
                            onChange={() => setNewRuleType('new')}
                            className="h-3.5 w-3.5 text-blue-500 focus:ring-blue-500"
                          />
                          <span className="text-xs">New Emails Only</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rules List */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-gray-700">
                      Current Rules ({emailRulesList.length})
                    </h3>
                    {emailRulesList.length > 0 && (
                      <span className="text-xs text-gray-400">Click rule to expand</span>
                    )}
                  </div>
                  
                  {emailRulesList.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center py-6 text-gray-500">
                      <div>
                        <Shield className="h-6 w-6 mx-auto mb-1 text-gray-300" />
                        <p className="text-xs">No rules yet</p>
                        <p className="text-xs text-gray-400">Add your first rule above</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                      {emailRulesList.map((rule) => (
                        <div key={rule.id} className="border border-gray-200 rounded-md bg-gray-50/50">
                          {editingRuleId === rule.id ? (
                            <div className="p-2.5 space-y-1.5">
                              <textarea
                                value={editingRuleText}
                                onChange={(e) => setEditingRuleText(e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={3}
                                placeholder="Edit your rule..."
                              />
                              
                              {/* Rule Type Selector for Editing */}
                              <div className="flex flex-col justify-start gap-1 text-xs">
                                <p className="text-[10px] font-medium text-gray-600">Apply this rule to:</p>
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="editRuleType"
                                      checked={editingRuleType === 'both'}
                                      onChange={() => setEditingRuleType('both')}
                                      className="h-3 w-3 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px]">Both</span>
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="editRuleType"
                                      checked={editingRuleType === 'reply'}
                                      onChange={() => setEditingRuleType('reply')}
                                      className="h-3 w-3 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px]">Replies Only</span>
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="editRuleType"
                                      checked={editingRuleType === 'new'}
                                      onChange={() => setEditingRuleType('new')}
                                      className="h-3 w-3 text-blue-500 focus:ring-blue-500"
                                    />
                                    <span className="text-[10px]">New Emails Only</span>
                                  </label>
                                </div>
                              </div>
                              
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={cancelEditingRule}
                                  className="text-[10px] px-1.5 py-0.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-sm hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={saveEditingRule}
                                  disabled={!editingRuleText.trim()}
                                  className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between p-2.5">
                              <p className="text-xs text-gray-600 whitespace-pre-wrap flex-1 pr-2">
                                {rule.content}
                              </p>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`text-[10px] px-1 py-0.5 rounded-sm flex-shrink-0 ${
                                  rule.type === 'reply' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  rule.type === 'new' ? 'bg-green-50 text-green-700 border border-green-100' :
                                  'bg-gray-50 text-gray-700 border border-gray-100'
                                }`}>
                                  {rule.type === 'reply' ? 'Reply' : 
                                   rule.type === 'new' ? 'New' : 'Both'}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => startEditingRule(rule)}
                                    className="text-gray-400 hover:text-blue-500 p-0.5 rounded-sm hover:bg-blue-50"
                                    title="Edit rule"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={() => removeRule(rule.id)}
                                    className="text-gray-400 hover:text-red-500 p-0.5 rounded-sm hover:bg-red-50"
                                    title="Delete rule"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs rounded-sm"
                    onClick={() => {
                      // Reset to original state from Firestore
                      if (user?.uid) {
                        const loadOriginalRules = async () => {
                          try {
                            // Load reply rules from instructions
                            const replyRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
                            const replyRulesSnap = await getDoc(replyRulesRef);
                            
                            // Load new email rules from instructions-new
                            const newEmailRulesRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions-new');
                            const newEmailRulesSnap = await getDoc(newEmailRulesRef);
                            
                            // Combine rules from both locations
                            let combinedRules: Array<{id: string, title: string, content: string, type: 'reply' | 'new' | 'both'}> = [];
                            
                            // Add reply rules
                            if (replyRulesSnap.exists()) {
                              const replyData = replyRulesSnap.data();
                              if (replyData.rules && Array.isArray(replyData.rules)) {
                                // Mark rules from instructions as 'reply' or 'both'
                                const replyRules = replyData.rules.map((rule: any) => {
                                  // If rule already has a type, keep it, otherwise set to 'reply'
                                  return {
                                    ...rule,
                                    type: rule.type || 'reply'
                                  };
                                });
                                combinedRules = [...combinedRules, ...replyRules];
                              }
                            }
                            
                            // Add new email rules
                            if (newEmailRulesSnap.exists()) {
                              const newEmailData = newEmailRulesSnap.data();
                              if (newEmailData.rules && Array.isArray(newEmailData.rules)) {
                                // Mark rules from instructions-new as 'new' or 'both'
                                const newEmailRules = newEmailData.rules.map((rule: any) => {
                                  // If rule already has a type, keep it, otherwise set to 'new'
                                  return {
                                    ...rule,
                                    type: rule.type || 'new'
                                  };
                                });
                                
                                // Merge with existing rules - avoid duplicates for 'both' type rules
                                newEmailRules.forEach((newRule: any) => {
                                  // Check if this rule is already in combinedRules (for 'both' type rules)
                                  const existingRuleIndex = combinedRules.findIndex(r => 
                                    r.content === newRule.content && (r.type === 'both' || newRule.type === 'both')
                                  );
                                  
                                  if (existingRuleIndex >= 0) {
                                    // Rule exists and one is 'both' - mark as 'both'
                                    combinedRules[existingRuleIndex].type = 'both';
                                  } else {
                                    // New rule - add to list
                                    combinedRules.push(newRule);
                                  }
                                });
                              }
                            }
                            
                            setEmailRulesList(combinedRules);
                          } catch (error) {
                            console.error('Error loading original rules:', error);
                            setEmailRulesList([]);
                          }
                        };
                        loadOriginalRules();
                      } else {
                        setEmailRulesList([]);
                      }
                      setNewRuleText('');
                      setNewRuleType('both');
                      setExpandedRules(new Set());
                      setEditingRuleId(null);
                      setEditingRuleText('');
                      setEditingRuleType('both');
                      closeRulesDialogWithAnimation();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={async () => {
                      await saveRulesToFirestore(emailRulesList);
                      const rulesString = rulesToString(emailRulesList);
                      if (setEmailRules) {
                        setEmailRules(rulesString);
                      }
                      closeRulesDialogWithAnimation();
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-xs h-7 rounded-sm"
                  >
                    Save Rules
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Filter Dialog */}
      {(showAddCustomDialog || customDialogClosing) && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${
          customDialogClosing 
            ? 'animate-out fade-out duration-300' 
            : 'animate-in fade-in duration-200'
        }`}>
          {/* Backdrop */}
          <div 
            className={`absolute inset-0 bg-black/50 ${
              customDialogClosing 
                ? 'animate-out fade-out duration-300' 
                : 'animate-in fade-in duration-200'
            }`} 
            onClick={closeCustomDialogWithAnimation}
          />
          
          {/* Modal Content */}
          <div className={`relative bg-white rounded-md shadow-lg max-w-md w-full mx-4 ${
            customDialogClosing 
              ? 'animate-out slide-out-to-bottom-4 zoom-out-95 duration-300 ease-in' 
              : 'animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out'
          }`}>
            <div className="flex flex-col">
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <h2 className="text-lg font-semibold">Add Custom Filter</h2>
                  <button 
                    onClick={closeCustomDialogWithAnimation}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 pt-4">
                <div className="space-y-4">
                  {/* Filter Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter Name
                    </label>
                    <input
                      type="text"
                      value={newCustomName}
                      onChange={(e) => setNewCustomName(e.target.value)}
                      placeholder="e.g., Shipping Updates"
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Keywords (comma separated)
                    </label>
                    <textarea
                      value={newCustomKeywords}
                      onChange={(e) => setNewCustomKeywords(e.target.value)}
                      placeholder="e.g., shipped, tracking, delivery, package, fedex, ups"
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Emails containing any of these keywords will be categorised into this filter
                    </p>
                  </div>
                  
                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Badge Color
                    </label>
                    <div className="flex items-center gap-2">
                      {[
                        { name: 'blue', bg: 'bg-blue-500' },
                        { name: 'green', bg: 'bg-green-500' },
                        { name: 'purple', bg: 'bg-purple-500' },
                        { name: 'orange', bg: 'bg-orange-500' },
                        { name: 'red', bg: 'bg-red-500' },
                        { name: 'pink', bg: 'bg-pink-500' },
                        { name: 'yellow', bg: 'bg-yellow-500' },
                        { name: 'indigo', bg: 'bg-indigo-500' }
                      ].map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setNewCustomColor(color.name)}
                          className={`w-6 h-6 rounded-full border-2 transition-all ${color.bg} ${
                            newCustomColor === color.name 
                              ? 'border-gray-400 scale-110' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <Button 
                    variant="outline" 
                    onClick={closeCustomDialogWithAnimation}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (newCustomName.trim() && newCustomKeywords.trim()) {
                        const newFilter = {
                          id: `custom-${Date.now()}`,
                          name: newCustomName.trim(),
                          keywords: newCustomKeywords.trim(),
                          color: newCustomColor
                        }
                        setCustomFilters(prev => [...prev, newFilter])
                        closeCustomDialogWithAnimation()
                      }
                    }}
                    disabled={!newCustomName.trim() || !newCustomKeywords.trim()}
                    className="bg-blue-500 hover:bg-blue-600"
                  >
                    Add Filter
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent Modals */}
      
      {/* Customer Service Agent Modal */}
      <Dialog open={isCustomerServiceModalOpen} onOpenChange={setIsCustomerServiceModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Customer Service Agent</DialogTitle>
              <DialogDescription>
                Handles customer inquiries and support requests automatically.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>Receives and analyses incoming emails to determine if they're customer inquiries</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>Generates appropriate responses using your business context</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>Sends responses for review or automatically replies to customers</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCustomerServiceModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setIsCustomerServiceModalOpen(false)}>
                  Connect Agent
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Email Summary Agent Modal */}
      <Dialog open={isEmailSummaryModalOpen} onOpenChange={setIsEmailSummaryModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Summary Agent</DialogTitle>
              <DialogDescription>
                Creates concise summaries of email threads and conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>Analyses email threads to extract key information</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>Creates concise summaries highlighting important points</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>Provides quick overviews for busy professionals</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEmailSummaryModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setIsEmailSummaryModalOpen(false)}>
                  Connect Agent
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Email Executive Agent Modal */}
      <Dialog open={isEmailExecutiveModalOpen} onOpenChange={setIsEmailExecutiveModalOpen}>
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">Categorising Agent</DialogTitle>
              <DialogDescription>
                Organises and tags emails by type and priority for better management.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 leading-relaxed space-y-2">
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">1.</span>
                  <span>Analyses email content to determine category and priority</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">2.</span>
                  <span>Automatically tags emails with appropriate labels</span>
                </div>
                <div className="flex gap-3">
                  <span className="font-medium text-gray-900">3.</span>
                  <span>Helps organise your inbox for better productivity</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEmailExecutiveModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setIsEmailExecutiveModalOpen(false)}>
                  Connect Agent
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>

      {/* Attachments Popup */}
      <Dialog open={showAttachmentsPopup} onOpenChange={setShowAttachmentsPopup}>
        <DialogContent className="max-w-6xl h-[85vh] overflow-hidden animate-in fade-in duration-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              All Email Attachments
              {!attachmentsLoading && (
                <Badge variant="secondary" className="ml-2">
                  {allAttachments.length} files
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col h-full flex-1 min-h-0">
            {attachmentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-600">Loading attachments...</span>
              </div>
            ) : allAttachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Paperclip className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium text-gray-700">No Attachments Found</h3>
                <p className="text-sm text-gray-500 max-w-sm mt-1">
                  No email attachments have been processed yet. Attachments will appear here after emails are processed.
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('filename')}
                      >
                        <div className="flex items-center gap-1">
                          File
                          {sortColumn === 'filename' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('emailSender')}
                      >
                        <div className="flex items-center gap-1">
                          From
                          {sortColumn === 'emailSender' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('emailSubject')}
                      >
                        <div className="flex items-center gap-1">
                          Email Subject
                          {sortColumn === 'emailSubject' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('emailDate')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          {sortColumn === 'emailDate' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('fileSize')}
                      >
                        <div className="flex items-center gap-1">
                          Size
                          {sortColumn === 'fileSize' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th 
                        className="text-left py-2 px-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort('extractionStatus')}
                      >
                        <div className="flex items-center gap-1">
                          Status
                          {sortColumn === 'extractionStatus' && (
                            sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          )}
                        </div>
                      </th>
                      <th className="text-left py-2 px-3 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedAttachments.map((attachment) => (
                      <tr
                        key={attachment.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {/* File column with icon and name */}
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                              {attachment.mimeType?.startsWith('image/') ? (
                                <FileImage className="h-4 w-4 text-blue-500" />
                              ) : attachment.filename?.toLowerCase().endsWith('.pdf') ? (
                                <FileText className="h-4 w-4 text-red-500" />
                              ) : attachment.mimeType?.startsWith('video/') ? (
                                <FileVideo className="h-4 w-4 text-purple-500" />
                              ) : attachment.mimeType?.startsWith('audio/') ? (
                                <FileAudio className="h-4 w-4 text-green-500" />
                              ) : (
                                <File className="h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            <span className="font-medium text-gray-900 truncate max-w-[200px]" title={attachment.filename}>
                              {attachment.filename}
                            </span>
                          </div>
                        </td>
                        
                        {/* From column */}
                        <td className="py-2 px-3 text-gray-600 max-w-[180px] truncate" title={attachment.emailSender}>
                          {attachment.emailSender}
                        </td>
                        
                        {/* Email Subject column */}
                        <td className="py-2 px-3 text-gray-600 max-w-[250px] truncate" title={attachment.emailSubject}>
                          {attachment.emailSubject}
                        </td>
                        
                        {/* Date column */}
                        <td className="py-2 px-3 text-gray-500">
                          {attachment.emailDate ? 
                            new Date(attachment.emailDate).toLocaleDateString('en-AU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            }) : 
                            '—'
                          }
                        </td>
                        
                        {/* Size column */}
                        <td className="py-2 px-3 text-gray-500">
                          {attachment.fileSize ? 
                            `${(attachment.fileSize / 1024 / 1024).toFixed(1)} MB` : 
                            '—'
                          }
                        </td>
                        
                        {/* Status column */}
                        <td className="py-2 px-3">
                          {attachment.extractionStatus ? (
                            <div className="flex items-center gap-1.5">
                              <div className={`h-2 w-2 rounded-full ${
                                attachment.extractionStatus === 'completed' 
                                  ? 'bg-green-500' 
                                  : 'bg-yellow-500'
                              }`}></div>
                              <span className="text-xs text-gray-600 capitalize">
                                {attachment.extractionStatus}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        
                        {/* Actions column */}
                        <td className="py-2 px-3">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-gray-100"
                                  onClick={() => window.open(attachment.s3url, '_blank')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
  isSending,
  selectedAccount,
  callGenerateEmailResponse,
  setShowEmailRulesDialog,
  user,
  isClosing = false
}: { 
  onSend: (to: string, subject: string, content: string, cc?: string, bcc?: string, attachments?: File[]) => void;
  onCancel: () => void;
  isSending: boolean;
  selectedAccount?: string;
  callGenerateEmailResponse?: (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => Promise<any>;
  setShowEmailRulesDialog?: (show: boolean) => void;
  user?: any;
  isClosing?: boolean;
}) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsClosing, setInstructionsClosing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [instructionTone, setInstructionTone] = useState('professional');
  const [customInstructionPrompt, setCustomInstructionPrompt] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composeEditorRef = useRef<HTMLDivElement>(null);

  // Check if content is truly empty (ignoring HTML tags and whitespace)
  const isContentEmpty = (htmlContent: string) => {
    if (!htmlContent) return true;
    // Remove HTML tags and check if there's actual text content
    const textOnly = htmlContent.replace(/<[^>]*>/g, '').trim();
    return textOnly === '';
  };

  // Check if reply content is truly empty (ignoring HTML tags and whitespace)
  const isReplyContentEmpty = (htmlContent: string) => {
    if (!htmlContent) return true;
    // Remove HTML tags and check if there's actual text content
    const textOnly = htmlContent.replace(/<[^>]*>/g, '').trim();
    return textOnly === '';
  };

  // Update content when the contentEditable div changes
  const handleContentChange = () => {
    if (composeEditorRef.current) {
      // Get HTML content for rich text support
      setContent(composeEditorRef.current.innerHTML || '');
    }
  };

  // Close instructions with animation
  const closeInstructionsWithAnimation = () => {
    setInstructionsClosing(true);
    setTimeout(() => {
      setShowInstructions(false);
      setInstructionsClosing(false);
    }, 200);
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments(prev => [...prev, ...files]);
    // Reset the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Handle compose AI generation
  const handleComposeAI = async (requestType: string, tone?: string) => {
    if (!callGenerateEmailResponse || !composeEditorRef.current) return;
    
    setIsGenerating(true);
    try {
      let customInstructions;
      if (requestType === 'instruct') {
        const textarea = document.getElementById('instructions-textarea-compose') as HTMLTextAreaElement;
        customInstructions = textarea?.value || '';
        // Use 'createemail' request type for compose instructions
        await callGenerateEmailResponse('createemail', undefined, customInstructions, composeEditorRef);
      } else {
        await callGenerateEmailResponse(requestType, tone, undefined, composeEditorRef);
      }
      
      // Update content state after AI generation
      if (composeEditorRef.current) {
        setContent(composeEditorRef.current.innerHTML || '');
      }
    } catch (error) {
      console.error('Error in compose AI generation:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Add useEffect to handle animation and auto-focus
  useEffect(() => {
    // Only auto-focus when opening, not when closing
    if (!isClosing) {
      // Auto-focus the 'to' field when component mounts
      const toInput = document.querySelector('.compose-to-field input');
      if (toInput) {
        (toInput as HTMLInputElement).focus();
      }
    }
  }, [isClosing]);
  
  // Add useEffect to handle content changes from the editor
  useEffect(() => {
    const handleMutations = () => {
      if (composeEditorRef.current) {
        setContent(composeEditorRef.current.innerHTML || '');
      }
    };
    
    // Set up MutationObserver to watch for changes to the editor content
    if (composeEditorRef.current) {
      const observer = new MutationObserver(handleMutations);
      observer.observe(composeEditorRef.current, { 
        childList: true, 
        subtree: true, 
        characterData: true,
        attributes: false 
      });
      
      return () => {
        observer.disconnect();
      };
    }
  }, []);

  return (
    <div 
      className="flex flex-col h-full bg-white shadow-lg rounded-t-lg"
    >
      {/* From Field */}
      <div className="flex items-center py-2 px-4 border-b border-gray-100">
        <span className="text-xs text-gray-600 font-medium w-14">From:</span>
        <div className="flex-1 text-xs text-gray-900">{selectedAccount || 'Your Account'}</div>
        <div className="flex items-center gap-2">
          {/* Discreet Tap Agent Section - Only shown when not generating */}
          {!isGenerating && (
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-7 px-2 text-xs hover:bg-blue-50 rounded-2xl flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3 text-blue-500" />
                    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-medium">
                      Tap Agent
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                  <DropdownMenuItem 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                    onClick={() => {
                      setShowInstructions(true);
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                    <span>Custom Instructions</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-gray-500">Select Tone</DropdownMenuLabel>
                  <DropdownMenuItem 
                    className={`flex items-center gap-2 ${isContentEmpty(content) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"}`}
                    onClick={() => !isContentEmpty(content) && handleComposeAI('tone', 'professional')}
                    disabled={isContentEmpty(content)}
                  >
                    <Briefcase className="h-3.5 w-3.5 text-gray-500" />
                    <span className={isContentEmpty(content) ? "text-gray-400" : ""}>Professional</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center gap-2 ${isContentEmpty(content) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"}`}
                    onClick={() => !isContentEmpty(content) && handleComposeAI('tone', 'friendly')}
                    disabled={isContentEmpty(content)}
                  >
                    <Smile className="h-3.5 w-3.5 text-gray-500" />
                    <span className={isContentEmpty(content) ? "text-gray-400" : ""}>Friendly</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center gap-2 ${isContentEmpty(content) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"}`}
                    onClick={() => !isContentEmpty(content) && handleComposeAI('tone', 'direct')}
                    disabled={isContentEmpty(content)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                    <span className={isContentEmpty(content) ? "text-gray-400" : ""}>Direct</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center gap-2 ${isContentEmpty(content) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"}`}
                    onClick={() => !isContentEmpty(content) && handleComposeAI('tone', 'formal')}
                    disabled={isContentEmpty(content)}
                  >
                    <Shield className="h-3.5 w-3.5 text-gray-500" />
                    <span className={isContentEmpty(content) ? "text-gray-400" : ""}>Formal</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className={`flex items-center gap-2 ${isContentEmpty(content) ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50 focus:bg-gray-50"}`}
                    onClick={() => !isContentEmpty(content) && handleComposeAI('tone', 'persuasive')}
                    disabled={isContentEmpty(content)}
                  >
                    <Wand2 className="h-3.5 w-3.5 text-gray-500" />
                    <span className={isContentEmpty(content) ? "text-gray-400" : ""}>Persuasive</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                    onClick={() => setShowEmailRulesDialog && setShowEmailRulesDialog(true)}
                  >
                    <Shield className="h-3.5 w-3.5 text-gray-500" />
                    <span>Email Rules</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Custom Instructions Input */}
              {(showInstructions || instructionsClosing) && (
                <div className={`absolute top-full right-0 mt-2 w-96 z-50 ${
                  instructionsClosing 
                    ? 'animate-out fade-out slide-out-to-top-2 duration-200' 
                    : 'animate-in fade-in-from-top-2 duration-300'
                }`}>
                  <div className="relative">
                    <textarea
                      value={customInstructionPrompt}
                      onChange={(e) => setCustomInstructionPrompt(e.target.value)}
                      placeholder="What do you want your email to be about?"
                      className="w-full text-xs bg-white border border-gray-200 rounded-2xl px-3 py-2 pr-16 focus:outline-none resize-none placeholder-gray-500 shadow-md"
                      rows={4}
                      autoFocus
                    />
                    
                    {/* Action buttons inside the input */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => closeInstructionsWithAnimation()}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3 w-3 text-gray-500" strokeWidth="2" />
                      </button>
                      
                      <button
                        disabled={!customInstructionPrompt.trim() || isGenerating}
                        onClick={async () => {
                          if (!customInstructionPrompt.trim()) return;
                          
                          // Immediately close instructions without animation for Apply
                          setShowInstructions(false);
                          setInstructionsClosing(false);
                          setIsGenerating(true);
                          try {
                            await callGenerateEmailResponse?.('createemail', instructionTone, customInstructionPrompt, composeEditorRef);
                            // Update content state after AI generation
                            if (composeEditorRef.current) {
                              setContent(composeEditorRef.current.innerHTML || '');
                            }
                            setCustomInstructionPrompt('');
                          } catch (error) {
                            console.error('Error in compose AI generation:', error);
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          !customInstructionPrompt.trim() || isGenerating
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title="Apply"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth="2" />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth="2" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isGenerating ? (
            <div className="flex items-center">
              {/* Generating Response Text */}
              <div className="animate-pulse flex items-center h-7 px-3 text-xs text-blue-600 font-medium">
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin text-blue-500" />
                <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">
                  Generating content...
                </span>
              </div>
            </div>
          ) : (
            <>
              <Button
                onClick={() => {
                  if (to.trim() && content.trim()) {
                    onSend(to, subject, content, cc, bcc, attachments);
                  }
                }}
                disabled={!to.trim() || !content.trim() || isSending}
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
                onClick={onCancel}
                className="h-7 px-2 text-gray-600 hover:text-gray-900 text-xs"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* To Field */}
      <div className="flex items-center py-2 px-4 border-b border-gray-100">
        <span className="text-xs text-gray-600 font-medium w-12">To:</span>
        <div className="flex-1 compose-to-field">
          <EmailInputWithChips
            value={to}
            onChange={setTo}
            placeholder="Enter recipient email address"
            className="w-full"
            user={user}
          />
        </div>
        <div className="flex items-center gap-2 ml-3">
          <button
            onClick={() => setShowCc(!showCc)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showCc 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Cc
          </button>
          <button
            onClick={() => setShowBcc(!showBcc)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showBcc 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            Bcc
          </button>
        </div>
      </div>

      {/* CC Field */}
      {showCc && (
        <div className="flex items-center py-2 px-4 border-b border-gray-100">
          <span className="text-xs text-gray-600 font-medium w-12">Cc:</span>
          <div className="flex-1">
            <EmailInputWithChips
              value={cc}
              onChange={setCc}
              placeholder="Enter CC email addresses"
              className="w-full"
              user={user}
            />
          </div>
        </div>
      )}

      {/* BCC Field */}
      {showBcc && (
        <div className="flex items-center py-2 px-4 border-b border-gray-100">
          <span className="text-xs text-gray-600 font-medium w-12">Bcc:</span>
          <div className="flex-1">
            <EmailInputWithChips
              value={bcc}
              onChange={setBcc}
              placeholder="Enter BCC email addresses"
              className="w-full"
              user={user}
            />
          </div>
        </div>
      )}

      {/* Subject Field */}
      <div className="flex items-center py-2 px-4 border-b border-gray-100">
        <span className="text-xs text-gray-600 font-medium w-12">Subject:</span>
        <div className="flex-1">
          <div className="min-h-8 px-2 py-0.5 bg-transparent border-none outline-none focus:ring-0 text-gray-900">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 text-gray-900 placeholder-gray-500"
              placeholder="Enter subject"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-2 py-1 rounded transition-colors"
          >
            <Paperclip className="h-3 w-3 text-gray-500" strokeWidth="2" />
            Attach
          </button>
        </div>
      </div>

      {/* Compact Attachment List */}
      {attachments.length > 0 && (
        <div className="px-4 py-1 border-b border-gray-100">
          <div className="flex flex-wrap gap-1">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs">
                <File className="h-3 w-3 text-gray-500 flex-shrink-0" />
                <span className="text-gray-700 truncate max-w-32">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="p-0.5 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="h-2.5 w-2.5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      

      {/* Message Content - matches reply module */}
      <div className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
        <style dangerouslySetInnerHTML={{
          __html: `
            [contenteditable][data-placeholder]:empty:before {
              content: attr(data-placeholder);
              color: #9CA3AF;
              pointer-events: none;
              display: block;
            }
          `
        }} />
        <div 
          ref={composeEditorRef}
          contentEditable
          className="w-full min-h-full text-sm outline-none"
          onBlur={handleContentChange}
          onInput={handleContentChange}
          onKeyUp={handleContentChange}
          suppressContentEditableWarning={true}
          style={{ minHeight: '200px' }}
          data-placeholder="Type your message..."
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
  emailsLoading,
  callGenerateEmailResponse,
  emailRules,
  setEmailRules,
  showEmailRulesDialog,
  setShowEmailRulesDialog,
  tempEmailRules,
  setTempEmailRules,
  onSummariseThread,
  selectedThread,
  user,
  showSummaryDropdown,
  setSummaryClosing,
  summaryClosing,
  threadSummary,
  isSummarizing,
  closeSummaryDropdownWithAnimation,
  onDelete
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
  emailsLoading?: boolean;
  callGenerateEmailResponse?: (requestType: string, tone?: string, customInstructions?: string, replyEditor?: React.RefObject<HTMLDivElement | null>) => Promise<any>;
  emailRules?: string;
  setEmailRules?: (rules: string) => void;
  showEmailRulesDialog?: boolean;
  setShowEmailRulesDialog?: (show: boolean) => void;
  tempEmailRules?: string;
  setTempEmailRules?: (rules: string) => void;
  onSummariseThread?: () => void;
  selectedThread?: any;
  user?: any;
  showSummaryDropdown?: boolean;
  setSummaryClosing?: (closing: boolean) => void;
  summaryClosing?: boolean;
  threadSummary?: string;
  isSummarizing?: boolean;
  closeSummaryDropdownWithAnimation?: () => void;
  onDelete?: (email: any) => void;
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [replyQuotedContent, setReplyQuotedContent] = useState('');
  const [replyRecipients, setReplyRecipients] = useState('');
  const [replyCc, setReplyCc] = useState('');
  const replyEditorRef = useRef<HTMLDivElement>(null);
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructionsClosing, setInstructionsClosing] = useState(false);
  const [instructionTone, setInstructionTone] = useState('professional');
  const [showQuickReplyInstructions, setShowQuickReplyInstructions] = useState(false);
  const [quickReplyInstructionsClosing, setQuickReplyInstructionsClosing] = useState(false);
  const [quickReplyPrompt, setQuickReplyPrompt] = useState('');
  const [localIsGenerating, setLocalIsGenerating] = useState(false);
  
  // Local state for dialog
  const [localShowEmailRulesDialog, setLocalShowEmailRulesDialog] = useState(false);
  const [localTempEmailRules, setLocalTempEmailRules] = useState('');
  
  // Use passed props or fallback to local state
  const actualShowEmailRulesDialog = showEmailRulesDialog ?? localShowEmailRulesDialog;
  const actualSetShowEmailRulesDialog = setShowEmailRulesDialog ?? setLocalShowEmailRulesDialog;
  const actualTempEmailRules = tempEmailRules ?? localTempEmailRules;
  const actualSetTempEmailRules = setTempEmailRules ?? setLocalTempEmailRules;
  
  // Combine local and passed generating states
  const actualIsGenerating = localIsGenerating || isGenerating;

  // Check if reply content is truly empty (ignoring HTML tags and whitespace)
  const isReplyContentEmpty = (htmlContent: string) => {
    if (!htmlContent) return true;
    
    // For reply mode, we need to check only the new content, not the quoted email chain
    // The quoted content is separated by an <hr> tag
    const parts = htmlContent.split('<hr');
    const newContent = parts[0]; // Everything before the <hr (the new reply)
    
    // Remove HTML tags and check if there's actual text content in the new reply
    const textOnly = newContent.replace(/<[^>]*>/g, '').trim();
    return textOnly === '';
  };

  // Close instructions with animation
  const closeInstructionsWithAnimation = () => {
    setInstructionsClosing(true);
    setTimeout(() => {
      setShowInstructions(false);
      setInstructionsClosing(false);
    }, 200);
  };
  
  // Close quick reply instructions with animation
  const closeQuickReplyInstructionsWithAnimation = () => {
    setQuickReplyInstructionsClosing(true);
    setTimeout(() => {
      setShowQuickReplyInstructions(false);
      setQuickReplyInstructionsClosing(false);
    }, 200);
  };

  // Update HTML content when email changes - only use htmlMessage, no fallbacks
  useEffect(() => {
    // Only use htmlMessage - no fallbacks
    if (email?.htmlMessage) {
      setHtmlContent(email.htmlMessage);
    } else {
      // If htmlMessage is not available, show empty content
      // This forces proper data loading from the source
      setHtmlContent('');
      console.warn('Email missing htmlMessage:', email?.id);
    }
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
          // For forward, leave the recipients field empty
          setReplyRecipients('');
          setReplyCc('');
          
          // Pre-populate the editor with quoted content (same as reply)
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
      {/* SVG Gradient Definition for icons */}
      <svg width="0" height="0" className="hidden">
        <defs>
          <linearGradient id="orange-blue-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>
      </svg>
      
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
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                      className="h-6 w-6 p-0 hover:bg-gray-100 hover:text-red-600"
                    onClick={() => onDelete?.(email)}
                  >
                      <Trash2 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="relative">
              {!actualIsGenerating ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-7 px-2 text-xs hover:bg-blue-50 rounded-2xl flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3 text-blue-500" />
                      <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-medium">
                        Quick Reply
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => {
                        setShowQuickReplyInstructions(true);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                      <span>Custom Instructions</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-gray-500">Select Tone</DropdownMenuLabel>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => {
                        setLocalIsGenerating(true);
                        onStartReply?.(email);
                        setTimeout(() => {
                          if (callGenerateEmailResponse && replyEditorRef.current) {
                            callGenerateEmailResponse('tone', 'professional', undefined, replyEditorRef)
                              .finally(() => {
                                setLocalIsGenerating(false); // Reset loading state when done
                              });
                          } else {
                            setLocalIsGenerating(false); // Reset if something went wrong
                          }
                        }, 100);
                      }}
                    >
                      <Briefcase className="h-3.5 w-3.5 text-gray-500" />
                      <span>Professional</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => {
                        setLocalIsGenerating(true);
                        onStartReply?.(email);
                        setTimeout(() => {
                          if (callGenerateEmailResponse && replyEditorRef.current) {
                            callGenerateEmailResponse('tone', 'friendly', undefined, replyEditorRef)
                              .finally(() => {
                                setLocalIsGenerating(false); // Reset loading state when done
                              });
                          } else {
                            setLocalIsGenerating(false); // Reset if something went wrong
                          }
                        }, 100);
                      }}
                    >
                      <Smile className="h-3.5 w-3.5 text-gray-500" />
                      <span>Friendly</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => {
                        setLocalIsGenerating(true);
                        onStartReply?.(email);
                        setTimeout(() => {
                          if (callGenerateEmailResponse && replyEditorRef.current) {
                            callGenerateEmailResponse('tone', 'direct', undefined, replyEditorRef)
                              .finally(() => {
                                setLocalIsGenerating(false); // Reset loading state when done
                              });
                          } else {
                            setLocalIsGenerating(false); // Reset if something went wrong
                          }
                        }, 100);
                      }}
                    >
                      <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                      <span>Direct</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                      onClick={() => {
                        setLocalIsGenerating(true);
                        onStartReply?.(email);
                        setTimeout(() => {
                          if (callGenerateEmailResponse && replyEditorRef.current) {
                            callGenerateEmailResponse('tone', 'concise', undefined, replyEditorRef)
                              .finally(() => {
                                setLocalIsGenerating(false); // Reset loading state when done
                              });
                          } else {
                            setLocalIsGenerating(false); // Reset if something went wrong
                          }
                        }, 100);
                      }}
                    >
                      <FileText className="h-3.5 w-3.5 text-gray-500" />
                      <span>Concise</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
              
              {/* Quick Reply Instructions Input */}
              {(showQuickReplyInstructions || quickReplyInstructionsClosing) && (
                <div className={`absolute top-full right-0 mt-2 w-96 z-50 ${
                  quickReplyInstructionsClosing 
                    ? 'animate-out fade-out slide-out-to-top-2 duration-200' 
                    : 'animate-in fade-in slide-in-from-top-2 duration-300'
                }`}>
                  <div className="relative">
                    <textarea
                      value={quickReplyPrompt}
                      onChange={(e) => setQuickReplyPrompt(e.target.value)}
                      placeholder="Enter specific instructions for how you'd like the AI to respond..."
                      className="w-full text-xs bg-white border border-gray-200 rounded-2xl px-3 py-2 pr-16 focus:outline-none resize-none placeholder-gray-500 shadow-md"
                      rows={4}
                      autoFocus
                    />
                    
                    {/* Action buttons inside the input */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => closeQuickReplyInstructionsWithAnimation()}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3 w-3 text-gray-500" strokeWidth="2" />
                      </button>
                      
                      <button
                        disabled={!quickReplyPrompt.trim() || actualIsGenerating}
                        onClick={async () => {
                          if (!quickReplyPrompt.trim()) return;
                          
                          // First start reply mode
                          onStartReply?.(email);
                          
                          // Wait for reply mode to initialize
                          setLocalIsGenerating(true);
                          setTimeout(async () => {
                            if (!callGenerateEmailResponse || !replyEditorRef.current) return;
                            
                            try {
                              await callGenerateEmailResponse('custom', undefined, quickReplyPrompt, replyEditorRef);
                              closeQuickReplyInstructionsWithAnimation();
                              setQuickReplyPrompt('');
                            } catch (error) {
                              console.error('Error in quick reply AI generation:', error);
                            } finally {
                              setLocalIsGenerating(false);
                            }
                          }, 100);
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          !quickReplyPrompt.trim() || actualIsGenerating
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title="Apply"
                      >
                        {actualIsGenerating ? (
                          <Loader2 className="h-3 w-3 animate-spin" strokeWidth="2" />
                        ) : (
                          <Check className="h-3 w-3" strokeWidth="2" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Summarise Button - Available for all emails */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 hover:bg-gray-100"
                    onClick={() => onSummariseThread?.()}
                    disabled={isSummarizing}
                  >
                    {/* SVG gradient definition for blue/orange gradient */}
                    <svg width="0" height="0" className="absolute">
                      <linearGradient id="blue-orange-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </svg>
                    
                    {isSummarizing ? (
                      <Loader2 
                        className="h-3 w-3 animate-spin" 
                        style={{
                          stroke: 'url(#blue-orange-gradient)',
                          strokeWidth: 2
                        }}
                      />
                    ) : (
                      <NotebookPen 
                        className="h-3 w-3" 
                        style={{
                          stroke: 'url(#blue-orange-gradient)',
                          strokeWidth: 2
                        }}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isSummarizing ? 'Generating Summary...' : `Summarise ${selectedThread && selectedThread.count > 1 ? `Thread (${selectedThread.count} messages)` : 'Email'}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

          {/* From Section */}
          <div className="flex items-center gap-2 mb-0">
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`${getConsistentColor(email.sender || '')} text-gray-700 font-semibold text-xs`}>
                {email.sender ? email.sender.split(' ').map((n: string) => n[0]).join('').toUpperCase() : '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{email.sender}</span>

                  {email.hasAttachment && (
                    <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-gray-600">{(() => {
                  // Get the appropriate timestamp with proper Firestore handling
                  const timestamp = email.repliedAt || email.receivedAt || email.time;
                  return formatDetailedDateTime(timestamp);
                })()}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>
                  <span className="font-bold">To:</span>{" "}
                  {(() => {
                    // Safety check for email object
                    if (!email) {
                      return <span className="text-gray-500">No email data</span>;
                    }
                    // Helper function to extract display names from email addresses
                    const extractDisplayNames = (emailStr: string | undefined) => {
                      if (!emailStr) return [];
                      
                      return emailStr.split(',').map(email => {
                        const match = email.trim().match(/(.*?)\s*<(.+?)>/);
                        return {
                          displayName: match ? match[1].trim() : email.trim().split('@')[0],
                          fullEmail: email.trim()
                        };
                      });
                    };
                    
                    const recipients = extractDisplayNames(email.to);
                    
                    if (recipients.length === 0) {
                      return <span className="text-gray-500"></span>;
                    }
                    
                    return (
                      <span className="inline-flex flex-wrap gap-x-1">
                        {recipients.map((recipient, index) => (
                          <span key={recipient.fullEmail} className="group relative cursor-default">
                            {recipient.displayName}
                            {index < recipients.length - 1 ? "," : ""}
                            <span className="invisible absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs text-white group-hover:visible">
                              {recipient.fullEmail}
                            </span>
                          </span>
                        ))}
                      </span>
                    );
                  })()}
                </span>
                {(() => {
                  const ccRecipients = extractCcRecipients(email);
                  if (ccRecipients) {
                    // Helper function to extract display names from email addresses
                    const extractDisplayNames = (emailStr: string | undefined) => {
                      if (!emailStr) return [];
                      
                      return emailStr.split(',').map(email => {
                        const match = email.trim().match(/(.*?)\s*<(.+?)>/);
                        return {
                          displayName: match ? match[1].trim() : email.trim().split('@')[0],
                          fullEmail: email.trim()
                        };
                      });
                    };
                    
                    const ccList = extractDisplayNames(ccRecipients);
                    
                    if (ccList.length === 0) {
                      return null;
                    }
                    
                    return (
                      <>
                        <span>•</span>
                        <span>
                          <span className="font-bold">Cc:</span>{" "}
                          <span className="inline-flex flex-wrap gap-x-1">
                            {ccList.map((recipient, index) => (
                              <span key={recipient.fullEmail} className="group relative cursor-default">
                                {recipient.displayName}
                                {index < ccList.length - 1 ? "," : ""}
                                <span className="invisible absolute left-0 top-full z-10 mt-1 whitespace-nowrap rounded-md bg-gray-800 px-2 py-1 text-xs text-white group-hover:visible">
                                  {recipient.fullEmail}
                                </span>
                              </span>
                            ))}
                          </span>
                        </span>
                      </>
                    );
                  }
                  return null;
                })()}
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
        <div className="flex flex-col h-full bg-white shadow-lg rounded-t-lg"
             style={{ 
               overflow: 'hidden', 
               transformOrigin: 'center bottom',
               animationDuration: '300ms' 
             }}>
            {/* From Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-14 text-xs text-gray-600 font-medium">From:</div>
            <div className="flex-1 text-xs text-gray-900">{selectedAccount}</div>
            <div className="flex items-center gap-2">
              
              {localIsGenerating ? (
                <div className="flex items-center">
                  {/* Generating Response Text */}
                  <div className="animate-pulse flex items-center h-7 px-3 text-xs text-blue-600 font-medium">
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin text-blue-500" />
                    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">
                      Generating response...
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {!localIsGenerating && !isGenerating && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs hover:bg-blue-50 rounded-2xl flex items-center gap-1 mr-2"
                        >
                          <Sparkles className="h-3 w-3 text-blue-500" />
                          <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-medium">
                             Quick Reply
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56 rounded-2xl border border-gray-200 shadow-md overflow-hidden">
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                          onClick={() => {
                            setShowQuickReplyInstructions(true);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-gray-500" />
                          <span>Custom Instructions</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-gray-500">Select Tone</DropdownMenuLabel>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                          onClick={() => {
                            setLocalIsGenerating(true);
                            callGenerateEmailResponse?.('tone', 'professional', undefined, replyEditorRef)
                              .finally(() => setLocalIsGenerating(false));
                          }}
                        >
                          <Briefcase className="h-3.5 w-3.5 text-gray-500" />
                          <span>Professional</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                          onClick={() => {
                            setLocalIsGenerating(true);
                            callGenerateEmailResponse?.('tone', 'friendly', undefined, replyEditorRef)
                              .finally(() => setLocalIsGenerating(false));
                          }}
                        >
                          <Smile className="h-3.5 w-3.5 text-gray-500" />
                          <span>Friendly</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                          onClick={() => {
                            setLocalIsGenerating(true);
                            callGenerateEmailResponse?.('tone', 'direct', undefined, replyEditorRef)
                              .finally(() => setLocalIsGenerating(false));
                          }}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-gray-500" />
                          <span>Direct</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 focus:bg-gray-50"
                          onClick={() => {
                            setLocalIsGenerating(true);
                            callGenerateEmailResponse?.('tone', 'concise', undefined, replyEditorRef)
                              .finally(() => setLocalIsGenerating(false));
                          }}
                        >
                          <FileText className="h-3.5 w-3.5 text-gray-500" />
                          <span>Concise</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button
                    onClick={() => {
                      const currentReplyContent = replyEditorRef.current?.innerHTML || '';
                      if (currentReplyContent.trim() && (replyMode.type === 'forward' || replyRecipients.trim())) {
                        // For reply/replyAll, add "Re:" prefix; for forward, add "Fwd:" prefix
                        let subject;
                        if (replyMode.type === 'forward') {
                          subject = replyMode.originalEmail.subject.startsWith('Fwd: ') ? replyMode.originalEmail.subject : `Fwd: ${replyMode.originalEmail.subject}`;
                        } else {
                          subject = replyMode.originalEmail.subject.startsWith('Re: ') ? replyMode.originalEmail.subject : `Re: ${replyMode.originalEmail.subject}`;
                        }
                        
                        const recipients = [
                          ...replyRecipients.split(',').map(email => email.trim()).filter(Boolean),
                          ...replyCc.split(',').map(email => email.trim()).filter(Boolean)
                        ];
                        // Use the full HTML content from the editor (includes both user input and quoted content)
                        onSendReply?.(currentReplyContent, subject, recipients, replyAttachments);
                      }
                    }}
                    disabled={(replyMode.type !== 'forward' && !replyRecipients.trim()) || isSending}
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
                </>
              )}
              </div>
            </div>

            {/* To Field */}
          <div className="flex items-center py-2 px-4 border-b border-gray-100">
            <div className="w-12 text-xs text-gray-600 font-medium">To:</div>
            <EmailInputWithChips
              value={replyRecipients}
              onChange={setReplyRecipients}
              placeholder="Enter recipient email addresses"
              className="flex-1"
              user={user}
            />
          </div>

          {/* CC Field (if populated) */}
            {replyCc !== undefined && (
            <div className="flex items-center py-2 px-4 border-b border-gray-100">
              <div className="w-12 text-xs text-gray-600 font-medium">Cc:</div>
              <EmailInputWithChips
                value={replyCc}
                onChange={setReplyCc}
                placeholder="Enter CC email addresses"
                className="flex-1"
                user={user}
              />
            </div>
            )}

            {/* Subject Field */}
          <div className="flex items-center py-4 px-4 border-b border-gray-100">
            <div className="w-14 text-xs text-gray-600 font-medium">Subject:</div>
            <div className="flex-1 text-xs text-gray-900">
                {replyMode.type === 'forward' 
                  ? `Fwd: ${replyMode.originalEmail.subject}`
                : (replyMode.originalEmail.subject.startsWith('Re: ')
                    ? replyMode.originalEmail.subject 
                  : `Re: ${replyMode.originalEmail.subject}`)}
              </div>
            </div>

          {/* Instructions Panel - Only shown when instructions are open */}
          {(showInstructions || instructionsClosing) && !actualIsGenerating && (
            <div className="mx-3 my-2">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-xs font-medium text-gray-700">Custom Instructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        actualSetTempEmailRules(emailRules || '');
                        actualSetShowEmailRulesDialog(true);
                      }}
                      className="flex items-center gap-1.5 text-xs font-normal text-gray-600 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <Shield className="h-3 w-3 text-gray-500" />
                      Rules
                    </button>
                    <button
                      onClick={closeInstructionsWithAnimation}
                      className="flex items-center gap-1.5 text-xs font-normal text-gray-600 hover:text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md transition-colors"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                      Cancel
                    </button>
                    <button
                      disabled={actualIsGenerating}
                      onClick={async () => {
                        const textarea = document.getElementById('instructions-textarea-reply') as HTMLTextAreaElement;
                        const customInstructions = textarea?.value || '';
                        if (customInstructions.trim()) {
                          // Immediately close instructions without animation for Apply
                          setShowInstructions(false);
                          setInstructionsClosing(false);
                          setLocalIsGenerating(true);
                          try {
                            await callGenerateEmailResponse?.('custom', instructionTone, customInstructions, replyEditorRef);
                          } catch (error) {
                            console.error('Error in reply AI generation:', error);
                          } finally {
                            setLocalIsGenerating(false);
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 text-xs font-normal px-3 py-1.5 rounded-md transition-colors ${
                        actualIsGenerating 
                          ? 'text-white bg-blue-600 cursor-not-allowed' 
                          : 'text-white bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {actualIsGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 text-white animate-spin" />
                          <span className="text-xs font-normal text-white">
                            Applying...
                          </span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3 w-3 text-white" />
                          Apply
                        </>
                      )}
                    </button>
                  </div>
                </div>
              
              {/* Instructions Input */}
              {!actualIsGenerating && (showInstructions || instructionsClosing) && (
                <div className={`absolute top-full left-0 mt-2 w-96 z-50 ${
                  instructionsClosing 
                    ? 'animate-out fade-out slide-out-to-top-2 duration-200' 
                    : 'animate-in fade-in slide-in-from-top-2 duration-300'
                }`}>
                  <div className="relative">
                    <textarea
                      ref={(el) => { if (el) el.id = 'instructions-textarea-reply'; }}
                      placeholder="Enter specific instructions for how you'd like the AI to respond..."
                      className="w-full text-sm bg-white border border-gray-200 rounded-2xl px-3 py-2 pr-16 focus:outline-none resize-none placeholder-gray-500 shadow-md"
                      rows={4}
                    />
                    
                    {/* Action buttons inside the input */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <button
                        onClick={() => closeInstructionsWithAnimation()}
                        className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                        title="Cancel"
                      >
                        <X className="h-3 w-3 text-gray-500" strokeWidth="2" />
                      </button>
                      
                      <button
                        onClick={async () => {
                          const textarea = document.getElementById('instructions-textarea-reply') as HTMLTextAreaElement;
                          const customInstructions = textarea?.value || '';
                          if (!customInstructions.trim()) return;
                          
                          closeInstructionsWithAnimation();
                          setLocalIsGenerating(true);
                          try {
                            await callGenerateEmailResponse?.('custom', instructionTone, customInstructions, replyEditorRef);
                            textarea.value = '';
                          } catch (error) {
                            console.error('Error in reply AI generation:', error);
                          } finally {
                            setLocalIsGenerating(false);
                          }
                        }}
                        className="p-1 rounded-md transition-colors text-green-600 hover:bg-green-50"
                        title="Apply"
                      >
                        <Check className="h-3 w-3" strokeWidth="2" />
                      </button>
                    </div>
                  </div>
                </div>
              )}


              

              </div>
            </div>
          )}

            {/* Message Content */}
          <div className="flex-1 px-5 py-6 overflow-y-auto custom-scrollbar">
              <div 
              ref={replyEditorRef}
                contentEditable
              className="w-full min-h-full text-sm outline-none"
              onBlur={() => {
                if (replyEditorRef.current) {
                  setReplyContent(replyEditorRef.current.innerHTML || '');
                }
              }}
              onInput={() => {
                if (replyEditorRef.current) {
                  setReplyContent(replyEditorRef.current.innerHTML || '');
                }
              }}
              onKeyUp={() => {
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
        <div className="flex-1 overflow-auto px-1 py-2 bg-white custom-scrollbar">
          <div className="prose max-w-none email-content" data-email-content>
            <IframeEmail html={htmlContent || email.htmlMessage || ""} />
          </div>
        </div>
      )}

    </div>
  );
};