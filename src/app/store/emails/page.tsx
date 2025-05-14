"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getGmailMessages, getGmailMessage, GmailMessage, GmailFullMessage } from '@/lib/gmail-api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { formatDistance } from 'date-fns'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import {
  AlertCircle,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  Search,
  ExternalLink,
  MessageSquare,
  User,
  Bell,
  Loader2,
  LogOut,
  Bug,
  Code,
  Wrench,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { db } from '@/lib/firebase'
import { 
  doc, 
  getDoc, 
  collection, 
  writeBatch, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from 'next/navigation'

// Custom style for medium rounded cards
const mediumRoundedCard = "rounded-md overflow-hidden";

// Define the response tone options
const RESPONSE_TONES = [
  { id: 'professional', label: 'Professional', description: 'Formal and business-like' },
  { id: 'friendly', label: 'Friendly', description: 'Warm and approachable' },
  { id: 'concise', label: 'Concise', description: 'Brief and to the point' },
  { id: 'detailed', label: 'Detailed', description: 'Thorough and comprehensive' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and supportive' },
];

export default function EmailsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [emails, setEmails] = useState<GmailMessage[]>([])
  const [sentEmails, setSentEmails] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingSent, setLoadingSent] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null)
  const [emailContent, setEmailContent] = useState<GmailFullMessage | null>(null)
  const [emailSheetOpen, setEmailSheetOpen] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')
  const [readStatusMap, setReadStatusMap] = useState<Record<string, boolean>>({})
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastFetchTimeRef = useRef<number>(0)
  const lastSentFetchTimeRef = useRef<number>(0)
  
  // New state for customer inquiry detection and response generation
  const [customerInquiryMap, setCustomerInquiryMap] = useState<Record<string, boolean>>({})
  const [responseDialogOpen, setResponseDialogOpen] = useState(false)
  const [selectedTone, setSelectedTone] = useState<string>('professional')
  const [generatedResponse, setGeneratedResponse] = useState<string>('')
  const [generatingResponse, setGeneratingResponse] = useState(false)
  const [customToneDescription, setCustomToneDescription] = useState<string>('')
  const router = useRouter()
  const [showDebugger, setShowDebugger] = useState(false)
  const [debugData, setDebugData] = useState<any>(null)
  const [debugLoading, setDebugLoading] = useState(false)
  const [fixEmailLoading, setFixEmailLoading] = useState(false)
  const [fixEmailResult, setFixEmailResult] = useState<any>(null)
  const [testEmailLoading, setTestEmailLoading] = useState(false)
  const [testEmailResult, setTestEmailResult] = useState<any>(null)

  // Filter emails based on search query
  const filteredEmails = emails.filter(email => {
    const query = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    )
  })

  // Filter sent emails based on search query
  const filteredSentEmails = sentEmails.filter(email => {
    const query = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    )
  })

  // Function to detect if an email is likely a customer inquiry
  const detectCustomerInquiry = (email: GmailMessage): boolean => {
    // Simple heuristic: Check if the email subject or snippet contains keywords
    // related to customer inquiries
    const customerKeywords = [
      'inquiry', 'enquiry', 'question', 'help', 'support', 'purchase', 'order',
      'product', 'service', 'price', 'pricing', 'quote', 'information', 'interested',
      'customer', 'buying', 'availability'
    ];
    
    const content = `${email.subject} ${email.snippet}`.toLowerCase();
    
    // Check if any keyword is present in the content
    return customerKeywords.some(keyword => content.includes(keyword.toLowerCase()));
  };

  // Function to generate response based on selected tone
  const generateResponse = async () => {
    if (!selectedEmail || !emailContent) return;
    
    setGeneratingResponse(true);
    
    try {
      // In a real implementation, this would call an API to generate a response
      // For now, we'll simulate a response based on the selected tone
      
      // Wait for a simulated API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const emailSubject = selectedEmail.subject;
      const senderName = getSenderName(selectedEmail.from).split(' ')[0]; // Get first name
      
      let response = '';
      
      switch (selectedTone) {
        case 'professional':
          response = `Dear ${senderName},\n\nThank you for your email regarding "${emailSubject}". I appreciate you reaching out to us.\n\nWe have reviewed your inquiry and would like to provide you with the following information...\n\nIf you have any further questions, please don't hesitate to contact us.\n\nBest regards,\n[Your Name]\n[Your Company]`;
            break;
        case 'friendly':
          response = `Hi ${senderName}!\n\nThanks so much for getting in touch about "${emailSubject}"! I'm really glad you reached out to us.\n\nI wanted to let you know that...\n\nFeel free to ask if you have any other questions - I'm always happy to help!\n\nCheers,\n[Your Name]\n[Your Company]`;
            break;
        case 'concise':
          response = `Hi ${senderName},\n\nRegarding "${emailSubject}":\n\n- Point 1\n- Point 2\n- Point 3\n\nLet me know if you need anything else.\n\nRegards,\n[Your Name]\n[Your Company]`;
            break;
        case 'detailed':
          response = `Dear ${senderName},\n\nThank you for your email concerning "${emailSubject}". I would like to provide you with a comprehensive response to address all aspects of your inquiry.\n\nFirstly, regarding your main question...\n\nSecondly, you may also be interested to know that...\n\nAdditionally, I've taken the liberty of researching some related information that might be helpful to you...\n\nIf you would like to discuss this further, please don't hesitate to reply to this email or call us at [phone number]. Our support team is available Monday through Friday, 9am to 5pm.\n\nThank you for your interest in our products/services.\n\nSincerely,\n[Your Name]\n[Your Position]\n[Your Company]\n[Contact Information]`;
            break;
        case 'empathetic':
          response = `Dear ${senderName},\n\nI understand how important "${emailSubject}" is to you, and I want to thank you for sharing your concerns with us.\n\nI completely understand where you're coming from, and I want to assure you that...\n\nWe value your feedback and are committed to ensuring your satisfaction.\n\nPlease let me know if there's anything else I can help with.\n\nWarmly,\n[Your Name]\n[Your Company]`;
            break;
          default:
          response = `Dear ${senderName},\n\nThank you for your email regarding "${emailSubject}". We appreciate your interest.\n\n[Your response here]\n\nBest regards,\n[Your Name]\n[Your Company]`;
      }
      
      setGeneratedResponse(response);
    } catch (error) {
      console.error('Error generating response:', error);
        toast({
        title: "Error",
        description: "Failed to generate a response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setGeneratingResponse(false);
    }
  };

  // Function to handle copying the generated response to clipboard
  const copyResponseToClipboard = () => {
    navigator.clipboard.writeText(generatedResponse);
        toast({
      title: "Copied to clipboard",
      description: "Response has been copied to your clipboard.",
          variant: "default",
        });
  };

  // Fetch emails and save to Firestore - core function
  const fetchAndSaveEmails = useCallback(async (showToast = false) => {
    if (!user?.uid) return;

    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastFetchTimeRef.current < 5000) {
      console.log('Skipping fetch - throttled');
      return;
    }
    lastFetchTimeRef.current = now;

    if (showToast) setRefreshing(true);
    setLoading(true);

    try {
      console.log('Fetching inbox emails for user:', user.uid);
      
      // 1. Get the emails from Gmail API - use INBOX label
      const messages = await getGmailMessages(user.uid, 'INBOX', 50);
      console.log(`Retrieved ${messages.length} emails from Gmail API`);
      
      // 2. Update the state with the fetched emails
      setEmails(messages);
      
      // 3. Detect customer inquiries
      const inquiryMap: Record<string, boolean> = {};
      messages.forEach(email => {
        inquiryMap[email.id] = detectCustomerInquiry(email);
      });
      setCustomerInquiryMap(inquiryMap);
      
      // 4. Save the emails to Firestore
      if (messages.length > 0) {
        try {
          const batch = writeBatch(db);
          const emailsCollection = collection(db, 'merchants', user.uid, 'emails');
          
          // Get existing emails from Firestore to avoid duplicates
          const existingEmailsSet = new Set<string>();
          
          // Process in smaller batches to handle Firestore limitations
          for (let i = 0; i < messages.length; i += 10) {
            const chunk = messages.slice(i, i + 10);
            const chunkIds = chunk.map(email => email.id);
            
            const q = query(emailsCollection, where('id', 'in', chunkIds));
            const querySnapshot = await getDocs(q);
            
            querySnapshot.forEach(doc => {
              existingEmailsSet.add(doc.id);
            });
          }
          
          // Add new emails to batch
          let newEmailsCount = 0;
          
          for (const email of messages) {
            if (!existingEmailsSet.has(email.id)) {
              const emailDoc = doc(emailsCollection, email.id);
              batch.set(emailDoc, {
                id: email.id,
                threadId: email.threadId,
                from: email.from,
                subject: email.subject,
                snippet: email.snippet,
                date: email.date,
                hasAttachments: email.hasAttachments,
                savedAt: serverTimestamp(),
                read: false
              });
              newEmailsCount++;
            }
          }
          
          if (newEmailsCount > 0) {
            await batch.commit();
            console.log(`Successfully saved ${newEmailsCount} new emails to Firestore`);
          } else {
            console.log('No new emails to save to Firestore');
          }
          
          // After saving to Firestore, load read status for all emails
          await loadReadStatus(messages.map(m => m.id));
          
        } catch (firestoreError) {
          console.error('Error saving emails to Firestore:', firestoreError);
        }
      }
      
      if (showToast && messages.length > 0) {
        toast({
          title: "Emails Updated",
          description: `Successfully loaded ${messages.length} emails.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (showToast) {
      toast({
        title: "Error Loading Emails",
        description: `Failed to load emails: ${errorMessage}`,
        variant: "destructive",
      });
      }
      
      // Handle authentication errors
      if (errorMessage.includes('401')) {
        setConnectionError('Authentication failed. Please reconnect your Gmail account.');
        setIsConnected(false);
        clearRefreshInterval();
      }
    } finally {
      setLoading(false);
      if (showToast) setRefreshing(false);
    }
  }, [user, toast]);

  // Fetch sent emails and save to Firestore
  const fetchAndSaveSentEmails = useCallback(async (showToast = false) => {
    if (!user?.uid) return;

    // Prevent fetching too frequently
    const now = Date.now();
    if (now - lastSentFetchTimeRef.current < 5000) {
      console.log('Skipping sent emails fetch - throttled');
      return;
    }
    lastSentFetchTimeRef.current = now;

    if (showToast) setRefreshing(true);
    setLoadingSent(true);

    try {
      console.log('Fetching sent emails for user:', user.uid);
      
      // 1. Get the sent email IDs from Gmail API with SENT label
      const messages = await getGmailMessages(user.uid, 'SENT', 50);
      console.log(`Retrieved ${messages.length} sent email IDs from Gmail API`);
      
      // 2. Update the state with the basic email info
      setSentEmails(messages);
      
      // 3. Fetch full content for each sent email and save to Firestore
      if (messages.length > 0) {
        try {
          const sentEmailsCollection = collection(db, 'merchants', user.uid, 'sent_emails');
          
          // Get existing emails from Firestore to avoid duplicates
      const existingEmailsSet = new Set<string>();
      
          // Process in smaller batches to handle Firestore limitations
          for (let i = 0; i < messages.length; i += 10) {
            const chunk = messages.slice(i, i + 10);
            const chunkIds = chunk.map(email => email.id);
            
            const q = query(sentEmailsCollection, where('id', 'in', chunkIds));
        const querySnapshot = await getDocs(q);
            
        querySnapshot.forEach(doc => {
          existingEmailsSet.add(doc.id);
        });
      }
      
          // Add new emails to batch with full content
      let newEmailsCount = 0;
          let processedCount = 0;
          
          // Process emails in smaller batches to avoid rate limiting
          for (let i = 0; i < messages.length; i++) {
            const email = messages[i];
            processedCount++;
            
            // Only fetch full content for emails not already in Firestore
        if (!existingEmailsSet.has(email.id)) {
              try {
                // Fetch full email content
                console.log(`Fetching full content for sent email ${email.id} (${processedCount}/${messages.length})`);
                const fullEmail = await getGmailMessage(user.uid, email.id);
                
                // Save to Firestore with a new batch for each email to avoid memory issues
                const batch = writeBatch(db);
                const emailDoc = doc(sentEmailsCollection, email.id);
          batch.set(emailDoc, {
                  id: email.id,
                  threadId: email.threadId,
                  from: email.from,
                  to: fullEmail.to,
                  subject: email.subject,
                  snippet: email.snippet,
                  date: email.date,
                  hasAttachments: email.hasAttachments,
                  body: {
                    html: fullEmail.body.html,
                    plain: fullEmail.body.plain
                  },
                  attachments: fullEmail.attachments.map(att => ({
                    filename: att.filename,
                    mimeType: att.mimeType,
                    size: att.size,
                    attachmentId: att.attachmentId
                  })),
            savedAt: serverTimestamp(),
                  read: true // Sent emails are always read
          });
                
                await batch.commit();
          newEmailsCount++;
                console.log(`Saved full content for sent email ${email.id}`);
              } catch (emailError) {
                console.error(`Error fetching full content for email ${email.id}:`, emailError);
                // Continue with next email
              }
        }
      }
      
      if (newEmailsCount > 0) {
            console.log(`Successfully saved ${newEmailsCount} new sent emails with full content to Firestore`);
      } else {
            console.log('No new sent emails to save to Firestore');
          }
          
        } catch (firestoreError) {
          console.error('Error saving sent emails to Firestore:', firestoreError);
        }
      }
      
      if (showToast && messages.length > 0) {
        toast({
          title: "Sent Emails Updated",
          description: `Successfully loaded ${messages.length} sent emails.`,
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error fetching sent emails:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (showToast) {
        toast({
          title: "Error Loading Sent Emails",
          description: `Failed to load sent emails: ${errorMessage}`,
          variant: "destructive",
        });
      }
      
      // Handle authentication errors
      if (errorMessage.includes('401')) {
        setConnectionError('Authentication failed. Please reconnect your Gmail account.');
        setIsConnected(false);
        clearRefreshInterval();
      }
    } finally {
      setLoadingSent(false);
      if (showToast) setRefreshing(false);
    }
  }, [user, toast]);

  // Setup refresh interval
  const setupRefreshInterval = useCallback(() => {
    clearRefreshInterval();
    
    // Refresh every 5 minutes (300000 ms)
    refreshIntervalRef.current = setInterval(() => {
      console.log('Refreshing emails (5-minute interval)');
      fetchAndSaveEmails(false); // Don't show toast for background refreshes
      fetchAndSaveSentEmails(false); // Also refresh sent emails
    }, 300000);
    
    console.log('Email refresh interval set up');
  }, [fetchAndSaveEmails, fetchAndSaveSentEmails]);

  // Clear refresh interval
  const clearRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
      console.log('Email refresh interval cleared');
    }
  };

  // Check if Gmail is connected
  const checkGmailConnection = useCallback(async () => {
    if (!user?.uid) return false;
    
    try {
      console.log('Checking Gmail connection for user:', user.uid);
      const integrationRef = doc(db, 'merchants', user.uid, 'integrations', 'gmail');
      const integrationDoc = await getDoc(integrationRef);
      
      if (integrationDoc.exists() && integrationDoc.data().connected) {
        console.log('Gmail is connected');
        setIsConnected(true);
        setConnectionError(null);
        
        // Get the connected email address
        const emailAddress = integrationDoc.data().emailAddress;
        if (emailAddress) {
          console.log('Found email address in Firestore:', emailAddress);
          setConnectedEmail(emailAddress);
        } else {
          console.log('No email address found in Firestore, fetching from API...');
          // Fetch email address if not stored
          try {
            const response = await fetch(`/api/auth/gmail/email?merchantId=${user.uid}`);
            if (response.ok) {
              const data = await response.json();
              if (data.emailAddress) {
                setConnectedEmail(data.emailAddress);
                console.log('Email address fetched from API:', data.emailAddress);
              }
            } else {
              console.warn('Failed to fetch email address from API');
            }
          } catch (error) {
            console.error('Error fetching email address:', error);
          }
        }
        
        return true;
      } else {
        console.log('Gmail is not connected');
        setIsConnected(false);
        setConnectedEmail(null);
        
        if (integrationDoc.exists()) {
          setConnectionError('Gmail integration exists but is not properly connected');
        }
        return false;
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setIsConnected(false);
      setConnectedEmail(null);
      setConnectionError(`Error checking Gmail connection: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }, [user]);

  // Handle initial load and user login/logout
  useEffect(() => {
    // First effect runs on component mount and when user changes
    const initialize = async () => {
      // Clear any existing refresh interval first
      clearRefreshInterval();
      
      if (!user?.uid) {
        // User is logged out
        setIsConnected(false);
        return;
      }
      
      // User is logged in - check connection status
      const connected = await checkGmailConnection();
      
      if (connected) {
        console.log('User is logged in and Gmail is connected');
        
        // Immediately fetch emails when component mounts or user logs in
        fetchAndSaveEmails(false);
        fetchAndSaveSentEmails(false);
        
        // Set up regular refresh interval
        setupRefreshInterval();
      } else {
        console.log('User is logged in but Gmail is not connected');
      }
    };
    
    initialize();
    
    // Cleanup function
    return () => {
      clearRefreshInterval();
    };
  }, [user, checkGmailConnection, fetchAndSaveEmails, fetchAndSaveSentEmails, setupRefreshInterval]);

  // Check for query parameters on page load (for OAuth callback responses)
  useEffect(() => {
    const checkQueryParams = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const success = urlParams.get('success');
      
      // Handle success from OAuth flow
      if (success && user?.uid) {
        toast({
          title: "Gmail Connected",
          description: "Your Gmail account was successfully connected.",
          variant: "default",
        });
        
        // Clear the URL parameters
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url);
        
        // Check connection and fetch emails
        const connected = await checkGmailConnection();
        if (connected) {
          fetchAndSaveEmails(false);
          fetchAndSaveSentEmails(false);
          setupRefreshInterval();
        }
      }
      
      // Handle errors from OAuth flow
      if (error) {
        console.error('OAuth error:', error);
        let errorMessage = 'Failed to connect to Gmail';
        
        switch (error) {
          case 'auth_denied':
            errorMessage = 'You denied access to your Gmail account';
            break;
          case 'token_error':
            errorMessage = 'Failed to get access token from Google';
            break;
          case 'config_error':
            errorMessage = 'Server configuration error';
            break;
          case 'missing_params':
            errorMessage = 'Missing parameters in OAuth response';
            break;
          case 'invalid_tokens':
            errorMessage = 'Invalid tokens received from Google';
            break;
          case 'database_error':
            errorMessage = 'Failed to save connection to database';
            break;
          default:
            errorMessage = `Error connecting to Gmail: ${error}`;
        }
        
        toast({
          title: "Gmail Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        setConnectionError(errorMessage);
      }
    };
    
    checkQueryParams();
  }, [toast, user, checkGmailConnection, fetchAndSaveEmails, fetchAndSaveSentEmails, setupRefreshInterval]);

  // Function to load read status for emails
  const loadReadStatus = async (emailIds: string[]) => {
    if (!user?.uid || !emailIds.length) return;
    
    try {
      console.log('Loading read status for emails');
      const emailsCollection = collection(db, 'merchants', user.uid, 'emails');
      const status: Record<string, boolean> = {};
      
      // Process in chunks of 10 to avoid Firestore limitation on 'in' queries
      const emailIdsChunks = [];
      for (let i = 0; i < emailIds.length; i += 10) {
        emailIdsChunks.push(emailIds.slice(i, i + 10));
      }
      
      for (const chunk of emailIdsChunks) {
        const q = query(emailsCollection, where('id', 'in', chunk));
        const querySnapshot = await getDocs(q);
        
        querySnapshot.forEach(doc => {
          status[doc.id] = doc.data().read === true;
        });
      }
      
      // For emails not found in Firestore, set as unread
      emailIds.forEach(id => {
        if (status[id] === undefined) {
          status[id] = false;
        }
      });
      
      setReadStatusMap(status);
      console.log(`Loaded read status for ${Object.keys(status).length} emails`);
    } catch (error) {
      console.error('Error loading read status:', error);
      // Set all as unread in case of error
      const defaultStatus: Record<string, boolean> = {};
      emailIds.forEach(id => {
        defaultStatus[id] = false;
      });
      setReadStatusMap(defaultStatus);
    }
  };

  // Handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Load sent emails when switching to sent tab
    if (value === 'sent' && sentEmails.length === 0 && !loadingSent && isConnected) {
      fetchAndSaveSentEmails(false);
    }
  };

  // Function to manually refresh emails
  const handleRefresh = () => {
    if (activeTab === 'inbox') {
      fetchAndSaveEmails(true); // Pass true to show toast notifications
    } else if (activeTab === 'sent') {
      fetchAndSaveSentEmails(true);
    }
  };

  // Function to connect Gmail
  const connectGmail = () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to connect Gmail.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Connecting Gmail for user:', user.uid);
    window.location.href = `/api/auth/gmail/connect?merchantId=${user.uid}`;
  };

  // Function to view a single email with full content
  const viewEmail = async (email: GmailMessage) => {
    setSelectedEmail(email);
    setEmailSheetOpen(true);
    setLoadingEmail(true);
    
    // Mark as read in the UI immediately
    setReadStatusMap(prev => ({
      ...prev,
      [email.id]: true
    }));
    
    try {
      if (!user?.uid) return;
      
      // Check if this is a sent email (based on active tab)
      if (activeTab === 'sent') {
        console.log('Fetching sent email content from Firestore for:', email.id);
        
        // Try to get the full content from Firestore first
        const sentEmailDoc = doc(db, 'merchants', user.uid, 'sent_emails', email.id);
        const sentEmailSnap = await getDoc(sentEmailDoc);
        
        if (sentEmailSnap.exists() && sentEmailSnap.data().body) {
          // We have the full content in Firestore
          const data = sentEmailSnap.data();
          const fullEmail: GmailFullMessage = {
            id: data.id,
            threadId: data.threadId,
            snippet: data.snippet,
            from: data.from,
            to: data.to || '',
            subject: data.subject,
            date: data.date,
            body: data.body || { html: null, plain: null },
            hasAttachments: data.hasAttachments || false,
            attachments: data.attachments || []
          };
          
          console.log('Sent email content loaded from Firestore');
          setEmailContent(fullEmail);
        } else {
          // If not in Firestore with full content, fetch from Gmail API
          console.log('Sent email full content not found in Firestore, fetching from Gmail API');
          const fullEmail = await getGmailMessage(user.uid, email.id);
          console.log('Sent email content loaded from Gmail API');
          setEmailContent(fullEmail);
          
          // Save the full content to Firestore for future use
          try {
            await updateDoc(sentEmailDoc, {
              to: fullEmail.to,
              body: {
                html: fullEmail.body.html,
                plain: fullEmail.body.plain
              },
              attachments: fullEmail.attachments.map(att => ({
                filename: att.filename,
                mimeType: att.mimeType,
                size: att.size,
                attachmentId: att.attachmentId
              }))
            });
            console.log('Updated sent email in Firestore with full content');
          } catch (updateError) {
            console.error('Error updating sent email with full content:', updateError);
          }
        }
      } else {
        // Regular inbox email - fetch from Gmail API as before
      console.log('Fetching full email content for:', email.id);
      const fullEmail = await getGmailMessage(user.uid, email.id);
      console.log('Email content loaded:', fullEmail.body.html ? 'HTML' : 'Plain Text');
      setEmailContent(fullEmail);
      
      // Mark email as read in Firestore
      try {
        const emailDoc = doc(db, 'merchants', user.uid, 'emails', email.id);
        const docSnap = await getDoc(emailDoc);
        
        if (docSnap.exists() && !docSnap.data().read) {
          // Update the read status
          await updateDoc(emailDoc, {
            read: true,
            readAt: serverTimestamp()
          });
          console.log('Marked email as read in Firestore');
        }
      } catch (readError) {
        console.error('Error marking email as read:', readError);
        // Continue anyway, this is not critical
        }
      }
    } catch (error) {
      console.error('Error fetching full email:', error);
      toast({
        title: "Error",
        description: "Failed to load the complete email content.",
        variant: "destructive"
      });
    } finally {
      setLoadingEmail(false);
    }
  };

  // Function to format the date
  const formatEmailDate = (date: any) => {
    try {
      // Handle Firestore Timestamp
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return formatDistance(dateObj, new Date(), { addSuffix: true });
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date); // Return string representation as fallback
    }
  };

  // Function to get sender name from email
  const getSenderName = (from: string) => {
    // Extract name from "Name <email@example.com>" format
    const matches = from.match(/^([^<]+)/);
    if (matches && matches[1]) {
      return matches[1].trim();
    }
    return from;
  };

  // Create a sanitized HTML content renderer
  const createMarkup = (html: string) => {
    return { __html: html };
  };

  // Function to fetch debug data
  const fetchDebugData = async () => {
    if (!user?.uid) return;
    
    setDebugLoading(true);
    setDebugData(null);
    
    try {
      const response = await fetch(`/api/auth/gmail/debug?merchantId=${user.uid}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch debug data');
      }
      
      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      toast({
        title: "Debug Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setDebugLoading(false);
    }
  };
  
  // Function to fix missing email
  const fixMissingEmail = async () => {
    if (!user?.uid) return;
    
    setFixEmailLoading(true);
    setFixEmailResult(null);
    
    try {
      const response = await fetch(`/api/auth/gmail/fix-email?merchantId=${user.uid}`);
      const data = await response.json();
      
      setFixEmailResult(data);
      
      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: "Email address has been fixed and saved.",
          variant: "default"
        });
        
        // Update the UI with the new email
        if (data.emailAddress) {
          setConnectedEmail(data.emailAddress);
        }
        
        // Refresh debug data
        fetchDebugData();
      } else {
        throw new Error(data.error || data.message || 'Failed to fix email address');
      }
    } catch (error) {
      console.error('Error fixing email:', error);
      toast({
        title: "Fix Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setFixEmailLoading(false);
    }
  };
  
  // Function to test email fetching methods
  const testEmailFetching = async () => {
    if (!user?.uid) return;
    
    setTestEmailLoading(true);
    setTestEmailResult(null);
    
    try {
      const response = await fetch(`/api/auth/gmail/test-email?merchantId=${user.uid}`);
      const data = await response.json();
      
      setTestEmailResult(data);
      
      if (response.ok && data.success && data.results.bestEmail) {
        toast({
          title: "Email Found",
          description: `Found email: ${data.results.bestEmail}`,
          variant: "default"
        });
      } else {
        toast({
          title: "Email Test Results",
          description: "See the debugger for detailed results.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error testing email fetching:', error);
      toast({
        title: "Test Error",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
    } finally {
      setTestEmailLoading(false);
    }
  };
  
  // Initialize debugger when opened
  useEffect(() => {
    if (showDebugger && user?.uid && !debugData) {
      fetchDebugData();
    }
  }, [showDebugger, user?.uid, debugData]);
  
  // Add this after the connection error card
  const renderDebugger = () => {
    return (
      <Dialog open={showDebugger} onOpenChange={setShowDebugger}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Gmail Integration Debugger
            </DialogTitle>
            <DialogDescription>
              Diagnose and fix issues with your Gmail integration
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchDebugData}
                disabled={debugLoading}
                className="flex items-center gap-2"
              >
                {debugLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Debug Data
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fixMissingEmail}
                disabled={fixEmailLoading}
                className="flex items-center gap-2"
              >
                {fixEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                Fix Missing Email
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testEmailFetching}
                disabled={testEmailLoading}
                className="flex items-center gap-2"
              >
                {testEmailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code className="h-4 w-4" />}
                Test Email Fetching
              </Button>
            </div>
            
            {/* Integration Status */}
            {debugData && (
              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5 text-blue-500" />
                    Integration Status
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Connected:</span>
                          <span className="flex items-center">
                            {debugData.results?.integration?.connected ? 
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            }
                            {debugData.results?.integration?.connected ? 'Yes' : 'No'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Email Address:</span>
                          <span className="flex items-center">
                            {debugData.results?.integration?.hasEmailAddress ? 
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            }
                            {debugData.results?.integration?.emailAddress || 'Missing'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Access Token:</span>
                          <span className="flex items-center">
                            {debugData.results?.integration?.hasAccessToken ? 
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            }
                            {debugData.results?.integration?.hasAccessToken ? 'Present' : 'Missing'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Refresh Token:</span>
                          <span className="flex items-center">
                            {debugData.results?.integration?.hasRefreshToken ? 
                              <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                              <XCircle className="h-4 w-4 text-red-500 mr-1" />
                            }
                            {debugData.results?.integration?.hasRefreshToken ? 'Present' : 'Missing'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Token Expires In:</span>
                          <span>
                            {debugData.results?.integration?.expiresIn > 0 ? 
                              `${Math.floor(debugData.results.integration.expiresIn / 60)} minutes` : 
                              'Expired'
                            }
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Connected At:</span>
                          <span>{debugData.results?.integration?.connectedAt || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Last Updated:</span>
                          <span>{debugData.results?.integration?.lastUpdated || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Emails Count:</span>
                          <span>{debugData.results?.emails?.count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Email Tests Results */}
                {testEmailResult && (
                  <div className="border rounded-md p-4">
                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                      <Code className="h-5 w-5 text-purple-500" />
                      Email Test Results
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Stored Email:</span>
                        <span>
                          {testEmailResult.results.storedEmail || 'None'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Best Email:</span>
                        <span className="font-medium text-green-600">
                          {testEmailResult.results.bestEmail || 'None found'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(testEmailResult.results.methods || {}).map(([method, result]) => (
                          <div key={method} className="border rounded-md p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{method}:</span>
                              <span className="flex items-center">
                                {(result as any).success ? 
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                                }
                                {(result as any).success ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            {(result as any).success && (
                              <div className="text-sm">Email: {(result as any).email}</div>
                            )}
                            {!(result as any).success && (result as any).error && (
                              <div className="text-sm text-red-600">{(result as any).error}</div>
                            )}
                            {!(result as any).success && (result as any).reason && (
                              <div className="text-sm text-red-600">{(result as any).reason}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Fix Email Results */}
                {fixEmailResult && (
                  <div className={`border rounded-md p-4 ${fixEmailResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-blue-500" />
                      Fix Email Results
                    </h3>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <span className="flex items-center">
                          {fixEmailResult.success ? 
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : 
                            <XCircle className="h-4 w-4 text-red-500 mr-1" />
                          }
                          {fixEmailResult.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Message:</span>
                        <span>{fixEmailResult.message || fixEmailResult.error}</span>
                      </div>
                      
                      {fixEmailResult.emailAddress && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Email:</span>
                          <span className="font-medium">{fixEmailResult.emailAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Raw Debug Data */}
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                    <Code className="h-5 w-5 text-gray-500" />
                    Raw Debug Data
                  </h3>
                  
                  <pre className="bg-gray-100 p-3 rounded-md overflow-auto max-h-96 text-xs">
                    {JSON.stringify(debugData, null, 2)}
                  </pre>
                </div>
              </div>
            )}
            
            {/* Loading State */}
            {debugLoading && !debugData && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p>Loading debug data...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Inbox</h1>
          <p className="text-muted-foreground">
            {isConnected 
              ? connectedEmail 
                ? `Connected to ${connectedEmail}`
                : "Connected to Gmail" 
              : "Connect your Gmail account to manage customer emails"}
          </p>
        </div>
       
        {isConnected ? (
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search emails..." 
                className="pl-10 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              onClick={() => {
                if (!user?.uid) return;
                router.push('/store/emails/notifications');
              }}
            >
              <Bell className="h-4 w-4" />
              Setup Email Notifications
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
              onClick={() => setShowDebugger(true)}
            >
              <Bug className="h-4 w-4" />
              Debug
            </Button>
          </div>
        ) : (
          <div className="mt-4 md:mt-0">
            <Button onClick={connectGmail} className="gap-2">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </div>
        )}
      </header>

      {connectionError && (
        <Card className="mb-6 border-red-200 bg-red-50 rounded-md">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Connection Error</h3>
                <p className="text-red-700 text-sm mt-1">{connectionError}</p>
                <div className="flex gap-3 mt-3">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={connectGmail}
                  >
                    Reconnect Gmail
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDebugger(true)}
                  >
                    Debug Connection
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Render the debugger dialog */}
      {renderDebugger()}

      {!isConnected ? (
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Connect your Gmail account</CardTitle>
            <CardDescription>
              Connect your Gmail account to view and manage customer emails directly from the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Connecting your Gmail account allows you to:
            </p>
            <ul className="list-disc pl-5 mb-6 space-y-2">
              <li>View customer emails in one place</li>
              <li>Respond to inquiries faster</li>
              <li>Keep track of important communications</li>
              <li>Never miss a potential customer</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={connectGmail} className="gap-2">
              <Mail className="h-4 w-4" />
              Connect Gmail
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <div className="flex flex-col space-y-4">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="customer-inquiries">Customer Inquiries</TabsTrigger>
              <TabsTrigger value="important">Important</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Email List Column - Takes 1/3 of the space */}
              <div className="lg:col-span-1 border rounded-md overflow-hidden">
                <TabsContent value="inbox" className="m-0 h-full">
              {loading ? (
                    <div className="divide-y">
                  {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3">
                          <div className="flex justify-between mb-1">
                          <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-4 w-[60px]" />
                        </div>
                          <Skeleton className="h-4 w-[70%] mb-1" />
                        <Skeleton className="h-4 w-full" />
                        </div>
                  ))}
                </div>
              ) : filteredEmails.length > 0 ? (
                    <div className="divide-y max-h-[calc(100vh-250px)] overflow-y-auto">
                  {filteredEmails.map((email) => (
                        <div 
                      key={email.id} 
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors
                            ${selectedEmail?.id === email.id ? 'bg-gray-100' : ''}
                            ${!readStatusMap[email.id] ? 'border-l-4 border-l-primary pl-2' : ''}
                            ${customerInquiryMap[email.id] ? 'border-l-4 border-l-yellow-500 bg-yellow-50 pl-2' : ''}`} 
                      onClick={() => viewEmail(email)}
                    >
                          <div className="flex justify-between items-start">
                            <div className={`text-sm font-medium truncate ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                            {getSenderName(email.from)}
                              {customerInquiryMap[email.id] && (
                                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 text-xs">
                                  <User className="h-2 w-2 mr-1" />
                                  Customer
                                </Badge>
                              )}
                          </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatEmailDate(email.date)}</div>
                        </div>
                          <div className={`text-xs truncate ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {email.snippet}
                          {email.hasAttachments && (
                              <span className="inline-flex items-center ml-1">
                                <Paperclip className="h-3 w-3 inline" />
                              </span>
                          )}
                        </div>
                        </div>
                  ))}
                </div>
              ) : (
                    <div className="flex flex-col items-center justify-center p-6 h-[300px]">
                    <MailOpen className="h-12 w-12 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium mb-2">No emails found</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      {searchQuery 
                        ? `No emails matching "${searchQuery}" were found.` 
                        : "Your inbox is empty or we couldn't fetch your emails."}
                    </p>
                    {searchQuery ? (
                      <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                    ) : (
                      <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
                    )}
                    </div>
              )}
            </TabsContent>
            
                <TabsContent value="sent" className="m-0 h-full">
                  {loadingSent ? (
                    <div className="divide-y">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3">
                          <div className="flex justify-between mb-1">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-4 w-[60px]" />
                          </div>
                          <Skeleton className="h-4 w-[70%] mb-1" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredSentEmails.length > 0 ? (
                    <div className="divide-y max-h-[calc(100vh-250px)] overflow-y-auto">
                      {filteredSentEmails.map((email) => (
                        <div 
                          key={email.id} 
                          className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors
                            ${selectedEmail?.id === email.id ? 'bg-gray-100' : ''}`}
                          onClick={() => viewEmail(email)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="text-sm font-medium truncate">
                              To: {getSenderName(email.from)}
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatEmailDate(email.date)}</div>
                          </div>
                          <div className="text-xs truncate">
                            {email.subject}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {email.snippet}
                            {email.hasAttachments && (
                              <span className="inline-flex items-center ml-1">
                                <Paperclip className="h-3 w-3 inline" />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 h-[300px]">
                  <Mail className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">No sent emails found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {searchQuery 
                          ? `No sent emails matching "${searchQuery}" were found.` 
                          : "Your sent folder is empty or we couldn't fetch your sent emails."}
                      </p>
                      {searchQuery ? (
                        <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                      ) : (
                        <Button variant="outline" onClick={() => fetchAndSaveSentEmails(true)}>Refresh</Button>
                      )}
                    </div>
                  )}
            </TabsContent>
            
                <TabsContent value="customer-inquiries" className="m-0 h-full">
                  {loading ? (
                    <div className="divide-y">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-3">
                          <div className="flex justify-between mb-1">
                            <Skeleton className="h-4 w-[120px]" />
                            <Skeleton className="h-4 w-[60px]" />
                          </div>
                          <Skeleton className="h-4 w-[70%] mb-1" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : filteredEmails.filter(email => customerInquiryMap[email.id]).length > 0 ? (
                    <div className="divide-y max-h-[calc(100vh-250px)] overflow-y-auto">
                      {filteredEmails
                        .filter(email => customerInquiryMap[email.id])
                        .map((email) => (
                          <div 
                            key={email.id} 
                            className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors
                              ${selectedEmail?.id === email.id ? 'bg-gray-100' : ''}
                              ${!readStatusMap[email.id] ? 'border-l-4 border-l-primary pl-2' : ''}
                              border-l-4 border-l-yellow-500 bg-yellow-50 pl-2`} 
                            onClick={() => viewEmail(email)}
                          >
                            <div className="flex justify-between items-start">
                              <div className={`text-sm font-medium truncate ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                                {getSenderName(email.from)}
                                <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300 text-xs">
                                  <User className="h-2 w-2 mr-1" />
                                  Customer
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground whitespace-nowrap ml-2">{formatEmailDate(email.date)}</div>
                            </div>
                            <div className={`text-xs truncate ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                              {email.subject}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {email.snippet}
                              {email.hasAttachments && (
                                <span className="inline-flex items-center ml-1">
                                  <Paperclip className="h-3 w-3 inline" />
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 h-[300px]">
                      <User className="h-12 w-12 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium mb-2">No customer inquiries found</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        {searchQuery 
                          ? `No customer inquiries matching "${searchQuery}" were found.` 
                          : "No customer inquiries detected in your inbox."}
                      </p>
                      {searchQuery ? (
                        <Button variant="outline" onClick={() => setSearchQuery('')}>Clear Search</Button>
                      ) : (
                        <Button variant="outline" onClick={handleRefresh}>Refresh</Button>
                      )}
                    </div>
                  )}
                </TabsContent>
            
                <TabsContent value="important" className="m-0">
                  <div className="flex flex-col items-center justify-center p-6 h-[300px]">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Important emails</h3>
                  <p className="text-muted-foreground text-center">
                    This feature is coming soon.
                  </p>
                  </div>
            </TabsContent>
            
                <TabsContent value="archived" className="m-0">
                  <div className="flex flex-col items-center justify-center p-6 h-[300px]">
                  <Mail className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Archived emails</h3>
                  <p className="text-muted-foreground text-center">
                    This feature is coming soon.
                  </p>
                  </div>
            </TabsContent>
              </div>
              
              {/* Email Content Column - Takes 2/3 of the space */}
              <div className="lg:col-span-2 border rounded-md overflow-hidden">
                {selectedEmail ? (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b">
                      <h2 className="text-xl font-semibold mb-2 flex items-center">
                        {selectedEmail.subject}
                        {customerInquiryMap[selectedEmail.id] && (
                          <Badge variant="outline" className="ml-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300">
                            <User className="h-3 w-3 mr-1" />
                            Customer Inquiry
                          </Badge>
                        )}
                      </h2>
                      <div className="flex flex-col md:flex-row md:justify-between gap-2">
                      <div>
                          {activeTab === 'sent' ? (
                            <>
                              <div className="font-medium text-sm">To: {emailContent?.to || 'Loading recipient...'}</div>
                              <div className="text-xs text-muted-foreground">From: {getSenderName(selectedEmail.from)}</div>
                            </>
                          ) : (
                            <div className="font-medium text-sm">From: {getSenderName(selectedEmail.from)}</div>
                          )}
                          {emailContent?.to && activeTab !== 'sent' && (
                            <div className="text-xs text-muted-foreground">To: {emailContent.to}</div>
                          )}
                      </div>
                        <div className="text-sm text-muted-foreground">{formatEmailDate(selectedEmail.date)}</div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border hover:bg-gray-50"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500 font-medium">
                                Generate Response
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTone('professional');
                                setGeneratingResponse(true);
                                generateResponse().then(() => {
                                  setResponseDialogOpen(true);
                                });
                              }}
                              className="cursor-pointer"
                            >
                              Professional
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTone('friendly');
                                setGeneratingResponse(true);
                                generateResponse().then(() => {
                                  setResponseDialogOpen(true);
                                });
                              }}
                              className="cursor-pointer"
                            >
                              Friendly
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTone('concise');
                                setGeneratingResponse(true);
                                generateResponse().then(() => {
                                  setResponseDialogOpen(true);
                                });
                              }}
                              className="cursor-pointer"
                            >
                              Concise
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTone('detailed');
                                setGeneratingResponse(true);
                                generateResponse().then(() => {
                                  setResponseDialogOpen(true);
                                });
                              }}
                              className="cursor-pointer"
                            >
                              Detailed
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedTone('empathetic');
                                setGeneratingResponse(true);
                                generateResponse().then(() => {
                                  setResponseDialogOpen(true);
                                });
                              }}
                              className="cursor-pointer"
                            >
                              Empathetic
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-2">
                              <Input
                                placeholder="Enter custom tone and press Enter..."
                                className="text-sm h-8"
                                value={customToneDescription}
                                onChange={(e) => setCustomToneDescription(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && customToneDescription.trim()) {
                                    setSelectedTone('custom');
                                    setGeneratingResponse(true);
                                    generateResponse().then(() => {
                                      setResponseDialogOpen(true);
                                    });
                                  }
                                }}
                              />
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" asChild>
                          <a 
                            href={`https://mail.google.com/mail/u/0/#${activeTab === 'sent' ? 'sent' : 'inbox'}/${selectedEmail.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            Open in Gmail
                          </a>
                        </Button>
                        {activeTab !== 'sent' && (
                          <Button size="sm">
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-4 overflow-auto flex-grow" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                    {loadingEmail ? (
                      <div className="space-y-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%]" />
                        <Skeleton className="h-4 w-[80%]" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-4 w-[70%]" />
                        <Skeleton className="h-4 w-[60%]" />
                      </div>
                    ) : (
                      <div className="prose prose-sm max-w-none dark:prose-invert font-sf-pro">
                        {emailContent?.body.html ? (
                          <div dangerouslySetInnerHTML={createMarkup(emailContent.body.html)} />
                        ) : emailContent?.body.plain ? (
                          <div style={{ whiteSpace: 'pre-wrap' }}>{emailContent.body.plain}</div>
                        ) : (
                          <p className="text-muted-foreground">No content available for this email.</p>
                        )}
                        
                        {emailContent?.hasAttachments && emailContent.attachments.length > 0 && (
                          <div className="mt-6 border-t pt-4">
                            <h4 className="text-sm font-medium mb-2">Attachments ({emailContent.attachments.length})</h4>
                            <div className="flex flex-wrap gap-2">
                              {emailContent.attachments.map((attachment, index) => (
                                <Badge key={index} variant="outline" className="flex items-center gap-1 py-1.5">
                                  <Paperclip className="h-3 w-3" />
                                  <span className="max-w-[150px] truncate">{attachment.filename}</span>
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({Math.round(attachment.size / 1024)} KB)
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 h-[500px]">
                    <Mail className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium mb-2">No email selected</h3>
                    <p className="text-muted-foreground text-center">
                      Select an email from the list to view its contents.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Tabs>
          
          {/* Response generation dialog */}
          <Dialog open={responseDialogOpen} onOpenChange={setResponseDialogOpen}>
            <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedTone === 'custom' ? `Custom Response (${customToneDescription})` : 'Generated Email Response'}
                </DialogTitle>
                <DialogDescription>
                  {selectedTone === 'custom' 
                    ? 'Response generated with your custom tone'
                    : `Response generated with ${RESPONSE_TONES.find(t => t.id === selectedTone)?.label.toLowerCase()} tone`}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="response">
                    {selectedTone === 'custom' ? 'Your Custom Response' : 'Generated Response'}
                  </Label>
                  <Textarea
                    id="response"
                    rows={12}
                    value={generatedResponse}
                    onChange={(e) => setGeneratedResponse(e.target.value)}
                    placeholder="Your generated response will appear here..."
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setResponseDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={copyResponseToClipboard} 
                  disabled={!generatedResponse}
                  className="border hover:bg-gray-50"
                >
                  <span className={`bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500 font-medium ${!generatedResponse ? 'opacity-50' : ''}`}>
                    Copy to Clipboard
                  </span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
} 