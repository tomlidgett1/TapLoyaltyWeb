"use client"

import { useState, useEffect } from 'react'
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
} from '@/components/ui/sheet'
import {
  AlertCircle,
  Mail,
  MailOpen,
  Paperclip,
  RefreshCw,
  Search,
  ExternalLink,
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

// Custom style for medium rounded cards
const mediumRoundedCard = "rounded-md overflow-hidden";

export default function EmailsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [emails, setEmails] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null)
  const [emailContent, setEmailContent] = useState<GmailFullMessage | null>(null)
  const [emailSheetOpen, setEmailSheetOpen] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [readStatusMap, setReadStatusMap] = useState<Record<string, boolean>>({})

  // Filter emails based on search query
  const filteredEmails = emails.filter(email => {
    const query = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(query) ||
      email.from.toLowerCase().includes(query) ||
      email.snippet.toLowerCase().includes(query)
    )
  })

  // Check for query parameters on page load (for OAuth callback responses)
  useEffect(() => {
    const checkQueryParams = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const success = urlParams.get('success');
      const details = urlParams.get('details');
      
      // Handle errors from OAuth flow
      if (error) {
        console.error('OAuth error:', error, details);
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
        
        if (details) {
          console.error('Error details:', details);
        }
        
        toast({
          title: "Gmail Connection Failed",
          description: errorMessage,
          variant: "destructive",
        });
        
        setConnectionError(errorMessage);
      }
      
      // Handle success from OAuth flow
      if (success) {
        toast({
          title: "Gmail Connected",
          description: "Your Gmail account was successfully connected.",
          variant: "default",
        });
        
        // Clear the URL parameters but keep the current URL path
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url);
        
        // Force a refresh of connection status
        checkGmailConnection();
      }
    };
    
    checkQueryParams();
  }, [toast]);

  // Check if Gmail is connected
  const checkGmailConnection = async () => {
    if (!user?.uid) return;
    
    try {
      console.log('Checking Gmail connection for user:', user.uid);
      const integrationRef = doc(db, 'merchants', user.uid, 'integrations', 'gmail');
      const integrationDoc = await getDoc(integrationRef);
      
      if (integrationDoc.exists() && integrationDoc.data().connected) {
        console.log('Gmail is connected');
        setIsConnected(true);
        setConnectionError(null);
        fetchEmails();
      } else {
        console.log('Gmail is not connected');
        setIsConnected(false);
        setLoading(false);
        
        if (integrationDoc.exists()) {
          // Integration exists but not connected
          setConnectionError('Gmail integration exists but is not properly connected');
        }
      }
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      setIsConnected(false);
      setLoading(false);
      setConnectionError(`Error checking Gmail connection: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // Call checkGmailConnection when user changes
  useEffect(() => {
    checkGmailConnection();
  }, [user]);

  // Function to fetch emails
  const fetchEmails = async () => {
    if (!user?.uid) return;
    
    try {
      setLoading(true);
      console.log('Fetching emails for user:', user.uid);
      const messages = await getGmailMessages(user.uid);
      console.log(`Retrieved ${messages.length} emails`);
      setEmails(messages);
      
      if (messages.length > 0) {
        toast({
          title: "Emails Loaded",
          description: `Successfully loaded ${messages.length} emails.`,
          variant: "default",
        });
        
        // Save emails to Firestore
        await saveEmailsToFirestore(messages);
        
        // Load read status for all emails
        await loadReadStatus(messages.map(m => m.id));
      }
    } catch (error) {
      console.error('Error fetching emails:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "Error Loading Emails",
        description: `Failed to load emails: ${errorMessage}`,
        variant: "destructive",
      });
      
      // If we get a 401 error, it's likely an authentication issue
      if (errorMessage.includes('401')) {
        setConnectionError('Authentication failed. Please reconnect your Gmail account.');
        setIsConnected(false);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Function to save emails to Firestore
  const saveEmailsToFirestore = async (emails: GmailMessage[]) => {
    if (!user?.uid || !emails.length) return;
    
    try {
      console.log('Saving emails to Firestore');
      const batch = writeBatch(db);
      const emailsCollection = collection(db, 'merchants', user.uid, 'emails');
      
      // Check which emails already exist to avoid duplicates
      const emailIds = emails.map(email => email.id);
      const emailIdsChunks = [];
      
      // Process in chunks of 10 to avoid Firestore limitation on 'in' queries
      for (let i = 0; i < emailIds.length; i += 10) {
        emailIdsChunks.push(emailIds.slice(i, i + 10));
      }
      
      const existingEmailsSet = new Set<string>();
      
      for (const chunk of emailIdsChunks) {
        const q = query(emailsCollection, where('id', 'in', chunk));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
          existingEmailsSet.add(doc.id);
        });
      }
      
      // Add new emails to batch
      let newEmailsCount = 0;
      
      for (const email of emails) {
        if (!existingEmailsSet.has(email.id)) {
          const emailDoc = doc(emailsCollection, email.id);
          batch.set(emailDoc, {
            ...email,
            // date is already a Timestamp from the getGmailMessages function
            savedAt: serverTimestamp(),
            read: false
          });
          newEmailsCount++;
        }
      }
      
      if (newEmailsCount > 0) {
        await batch.commit();
        console.log(`Saved ${newEmailsCount} new emails to Firestore`);
      } else {
        console.log('No new emails to save to Firestore');
      }
    } catch (error) {
      console.error('Error saving emails to Firestore:', error);
    }
  };

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

  // Function to refresh emails
  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmails();
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

  // Create a sanitized HTML content renderer
  const createMarkup = (html: string) => {
    return { __html: html };
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Email Inbox</h1>
          <p className="text-muted-foreground">
            Manage your customer emails and inquiries
          </p>
        </div>
        
        {isConnected && (
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
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="mt-3"
                  onClick={connectGmail}
                >
                  Reconnect Gmail
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <>
          <Tabs defaultValue="inbox" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="important">Important</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inbox" className="mt-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Card key={i} className="overflow-hidden rounded-md">
                      <CardHeader className="p-4">
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-[120px]" />
                          <Skeleton className="h-4 w-[100px]" />
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <Skeleton className="h-4 w-[70%] mb-2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-[90%] mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredEmails.length > 0 ? (
                <div className="space-y-3">
                  {filteredEmails.map((email) => (
                    <Card 
                      key={email.id} 
                      className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer rounded-md ${!readStatusMap[email.id] ? 'border-l-4 border-l-primary' : ''}`} 
                      onClick={() => viewEmail(email)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className={`font-medium ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                            {getSenderName(email.from)}
                          </div>
                          <div className="text-xs text-muted-foreground">{formatEmailDate(email.date)}</div>
                        </div>
                        <div className={`mb-1 truncate ${!readStatusMap[email.id] ? 'font-semibold' : ''}`}>
                          {email.subject}
                        </div>
                        <div className="text-sm text-muted-foreground line-clamp-2">{email.snippet}</div>
                        <div className="flex items-center gap-2 mt-2">
                          {email.hasAttachments && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3 mr-1" />
                              <span>Attachment</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="rounded-md">
                  <CardContent className="flex flex-col items-center justify-center p-6">
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
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="sent" className="mt-0">
              <Card className="rounded-md">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Mail className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Sent emails</h3>
                  <p className="text-muted-foreground text-center">
                    This feature is coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="important" className="mt-0">
              <Card className="rounded-md">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Important emails</h3>
                  <p className="text-muted-foreground text-center">
                    This feature is coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="archived" className="mt-0">
              <Card className="rounded-md">
                <CardContent className="flex flex-col items-center justify-center p-6">
                  <Mail className="h-12 w-12 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-medium mb-2">Archived emails</h3>
                  <p className="text-muted-foreground text-center">
                    This feature is coming soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Email view sheet with full content */}
          <Sheet open={emailSheetOpen} onOpenChange={setEmailSheetOpen}>
            <SheetContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl rounded-l-md">
              {selectedEmail && (
                <>
                  <SheetHeader>
                    <SheetTitle>{selectedEmail.subject}</SheetTitle>
                    <SheetDescription className="flex flex-col md:flex-row md:justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">From: {selectedEmail.from}</div>
                        {emailContent?.to && <div className="text-xs">To: {emailContent.to}</div>}
                      </div>
                      <div className="text-sm">{formatEmailDate(selectedEmail.date)}</div>
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-6 overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
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
                  
                  <SheetFooter className="mt-6 flex justify-between sm:justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEmailSheetOpen(false)}>
                        Close
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Open in Gmail
                        </a>
                      </Button>
                      <Button size="sm">
                        Reply
                      </Button>
                    </div>
                  </SheetFooter>
                </>
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
} 