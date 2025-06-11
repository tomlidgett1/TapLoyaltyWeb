"use client"

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetDescription, SheetOverlay } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Users, Send, Bell, Store, MessageSquare, Clock, Award, DollarSign, AlertTriangle, UserPlus, Repeat, TrendingUp, AlertCircle, HelpCircle, Ban } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, getDocs, getDoc, doc, query, where, writeBatch, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { httpsCallable } from "firebase/functions"

interface SendBroadcastSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Define customer cohorts
const CUSTOMER_COHORTS = {
  ALL: 'all',
  ACTIVE: 'active',
  NEW: 'new',
  RESURRECTED: 'resurrected',
  CHURNED: 'churned',
  DORMANT: 'dormant'
};

// List of inappropriate words to filter
const PROFANITY_LIST = [
  'ass', 'asshole', 'bastard', 'bitch', 'bollocks', 'bullshit',
  'cock', 'crap', 'cunt', 'damn', 'dick', 'douche', 'fag',
  'fuck', 'fucked', 'fucking', 'motherfucker', 'nigga', 'nigger', 
  'piss', 'pussy', 'shit', 'slut', 'twat', 'wanker', 'whore'
];

export function SendBroadcastSheet({ open, onOpenChange }: SendBroadcastSheetProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState(CUSTOMER_COHORTS.ALL)
  const [loading, setLoading] = useState(false)
  const [notificationAction, setNotificationAction] = useState("showAnnouncement")
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [instantClose, setInstantClose] = useState(false)
  const [profanityError, setProfanityError] = useState<string | null>(null)
  const [cohortAvailability, setCohortAvailability] = useState<Record<string, { available: boolean, lastSent?: Date }>>({})
  const [loadingCohorts, setLoadingCohorts] = useState(true)
  const [cohortCounts, setCohortCounts] = useState<Record<string, number>>({})
  const router = useRouter()
  
  // Fetch cohort availability when component mounts or when the sheet opens
  useEffect(() => {
    if (open && user?.uid) {
      checkCohortAvailability();
      fetchCohortCounts();
    }
  }, [open, user?.uid]);
  
  // Fetch the number of customers in each cohort
  const fetchCohortCounts = async () => {
    if (!user?.uid) return;
    
    try {
      const counts: Record<string, number> = {
        [CUSTOMER_COHORTS.ALL]: 0,
        [CUSTOMER_COHORTS.ACTIVE]: 0,
        [CUSTOMER_COHORTS.NEW]: 0,
        [CUSTOMER_COHORTS.RESURRECTED]: 0,
        [CUSTOMER_COHORTS.CHURNED]: 0,
        [CUSTOMER_COHORTS.DORMANT]: 0
      };
      
      // Customer collection path
      const customersCollectionPath = collection(db, 'merchants', user.uid, 'customers');
      
      // Get total count
      const totalSnapshot = await getDocs(query(customersCollectionPath));
      counts[CUSTOMER_COHORTS.ALL] = totalSnapshot.size;
      
      // Get count for each cohort
      for (const cohort of Object.values(CUSTOMER_COHORTS)) {
        if (cohort === CUSTOMER_COHORTS.ALL) continue;
        
        // Use lowercase cohort name for the query
        const cohortQuery = query(
          customersCollectionPath,
          where(`currentCohort.name.${cohort.toLowerCase()}`, '==', true)
        );
        
        const cohortSnapshot = await getDocs(cohortQuery);
        counts[cohort] = cohortSnapshot.size;
      }
      
      setCohortCounts(counts);
    } catch (error) {
      console.error("Error fetching cohort counts:", error);
    }
  };
  
  // Check if cohorts have been messaged in the last 30 days
  const checkCohortAvailability = async () => {
    if (!user?.uid) return;
    
    setLoadingCohorts(true);
    
    try {
      const cohortHistory: Record<string, { available: boolean, lastSent?: Date }> = {
        [CUSTOMER_COHORTS.ALL]: { available: true },
        [CUSTOMER_COHORTS.ACTIVE]: { available: true },
        [CUSTOMER_COHORTS.NEW]: { available: true },
        [CUSTOMER_COHORTS.RESURRECTED]: { available: true },
        [CUSTOMER_COHORTS.CHURNED]: { available: true },
        [CUSTOMER_COHORTS.DORMANT]: { available: true }
      };
      
      // Get cohort messaging history from Firestore
      const cohortHistoryRef = collection(db, 'merchants', user.uid, 'cohortMessageHistory');
      
      // Check each cohort
      for (const cohort of Object.values(CUSTOMER_COHORTS)) {
        const cohortQuery = query(
          cohortHistoryRef,
          where('cohort', '==', cohort),
          orderBy('sentAt', 'desc'),
          limit(1)
        );
        
        const snapshot = await getDocs(cohortQuery);
        
        if (!snapshot.empty) {
          const lastMessage = snapshot.docs[0].data();
          const lastSentDate = lastMessage.sentAt.toDate();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          // Check if last message was sent within the last 30 days
          if (lastSentDate > thirtyDaysAgo) {
            cohortHistory[cohort] = { 
              available: false, 
              lastSent: lastSentDate 
            };
          }
        }
      }
      
      setCohortAvailability(cohortHistory);
    } catch (error) {
      console.error("Error checking cohort availability:", error);
      toast({
        title: "Error",
        description: "Could not check cohort availability. Some information may be inaccurate.",
        variant: "destructive"
      });
    } finally {
      setLoadingCohorts(false);
    }
  };
  
  // Format date for display
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Calculate when a cohort will be available again
  const getAvailableAgainDate = (lastSent?: Date) => {
    if (!lastSent) return '';
    
    const availableAgain = new Date(lastSent);
    availableAgain.setDate(availableAgain.getDate() + 30);
    
    return formatDate(availableAgain);
  };
  
  // Reset instantClose when sheet is closed
  useEffect(() => {
    if (!open && instantClose) {
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);
  
  // Reset profanity error when title or message changes
  useEffect(() => {
    if (profanityError) {
      setProfanityError(null);
    }
  }, [title, message]);
  
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Check for profanity in a string
  const containsProfanity = (text: string): string | null => {
    if (!text) return null;
    
    const lowerText = text.toLowerCase();
    
    // Check for exact matches (with word boundaries)
    for (const word of PROFANITY_LIST) {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      if (regex.test(lowerText)) {
        return word;
      }
    }
    
    // Check for words containing profanity (to catch attempts to bypass)
    for (const word of PROFANITY_LIST) {
      if (lowerText.includes(word)) {
        return word;
      }
    }
    
    return null;
  };
  
  const handleSend = async () => {
    if (!title || !message) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and message for your broadcast.",
        variant: "destructive"
      })
      return
    }
    
    // Check for profanity in title and message
    const titleProfanity = containsProfanity(title);
    const messageProfanity = containsProfanity(message);
    
    if (titleProfanity || messageProfanity) {
      const offendingWord = titleProfanity || messageProfanity;
      setProfanityError(`Your message contains inappropriate language: "${offendingWord}". Please revise your content.`);
      toast({
        title: "Inappropriate content",
        description: "Your broadcast contains language that violates our content policy. Please remove any inappropriate words.",
        variant: "destructive"
      })
      return;
    }
    
    if (!user?.uid) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to send broadcasts.",
        variant: "destructive"
      })
      return
    }
    
    // Check if selected cohort is available
    if (!cohortAvailability[audience]?.available) {
      const availableAgain = getAvailableAgainDate(cohortAvailability[audience]?.lastSent);
      toast({
        title: "Cohort unavailable",
        description: `You've already messaged this cohort in the last 30 days. You can message them again after ${availableAgain}.`,
        variant: "destructive"
      })
      return;
    }
    
    setLoading(true)
    setShowConfirmation(true)
    
    try {
      // Get merchant data to access the merchant name
      const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
      if (!merchantDoc.exists()) {
        throw new Error("Merchant data not found")
      }
      
      const merchantData = merchantDoc.data()
      const merchantName = merchantData.merchantName || merchantData.tradingName || merchantData.legalName || "Unknown Merchant"
      
      // Create the broadcast document
      const broadcastData = {
        title,
        message,
        audience,
        notificationAction,
        merchantId: user.uid,
        createdAt: Timestamp.now(),
        status: "active",
        // Include announcement data if available and action is showAnnouncement
        ...(notificationAction === "showAnnouncement" && announcement 
          ? { announcementData: announcement } 
          : {})
      }
      
      // Save to Firestore
      const broadcastsRef = collection(db, 'merchants', user.uid, 'broadcasts')
      const docRef = await addDoc(broadcastsRef, broadcastData)
      
      // Record the cohort message in history
      const cohortHistoryRef = collection(db, 'merchants', user.uid, 'cohortMessageHistory');
      await addDoc(cohortHistoryRef, {
        cohort: audience,
        broadcastId: docRef.id,
        sentAt: Timestamp.now()
      });
      
      // Get customers based on the selected audience
      let customersQuery;
      
      // Customer collection path
      const customersCollectionPath = collection(db, 'merchants', user.uid, 'customers')
      
      // Create query based on audience selection
      if (audience === CUSTOMER_COHORTS.ALL) {
        // For "All customers", we need to exclude customers from cohorts that have been messaged recently
        const unavailableCohorts = Object.entries(cohortAvailability)
          .filter(([cohort, status]) => cohort !== CUSTOMER_COHORTS.ALL && !status.available)
          .map(([cohort]) => cohort);
        
        if (unavailableCohorts.length > 0) {
          // Create a compound query to exclude customers in unavailable cohorts
          let baseQuery = query(customersCollectionPath);
          
          // For each unavailable cohort, add a where clause to exclude it
          for (const cohort of unavailableCohorts) {
            baseQuery = query(
              baseQuery,
              where(`currentCohort.name.${cohort}`, '!=', true)
            );
          }
          
          customersQuery = baseQuery;
        } else {
          // If all cohorts are available, get all customers
          customersQuery = query(customersCollectionPath);
        }
      } else {
        // Query based on currentCohort.name field
        customersQuery = query(
          customersCollectionPath, 
          where(`currentCohort.name.${audience}`, '==', true)
        );
      }
      
      const customersSnapshot = await getDocs(customersQuery)
      
      // For efficiency with large sets of customers, use batched writes
      const MAX_BATCH_SIZE = 500; // Firestore limit
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;
      
      // Loop through customers and add notification to each customer's subcollection
      customersSnapshot.forEach((customerDoc) => {
        const customerId = customerDoc.id;
        
        // Create notification object
        const notification = {
          title,
          message,
          createdAt: Timestamp.now(),
          merchantId: user.uid,
          merchantName: merchantName,
          read: false,
          isRead: false,
          broadcastId: docRef.id,
          type: 'merchantmessage',
          // Include action and announcement if applicable
          notificationAction,
          ...(notificationAction === "showAnnouncement" && announcement 
            ? { announcementData: announcement } 
            : {})
        };
        
        // Reference to the notification document to create
        const notificationRef = doc(
          collection(db, 'customers', customerId, 'notifications')
        );
        
        // Add notification to batch
        batch.set(notificationRef, notification);
        operationCount++;
        
        // If batch reaches limit, add it to batches array and create a new batch
        if (operationCount === MAX_BATCH_SIZE) {
          batches.push(batch);
          batch = writeBatch(db);
          operationCount = 0;
        }
      });
      
      // Add the last batch if it has operations
      if (operationCount > 0) {
        batches.push(batch);
      }
      
      // Commit all batches
      await Promise.all(batches.map(batch => batch.commit()));
      
      // Update cohort availability after successful send
      const updatedAvailability = {...cohortAvailability};
      updatedAvailability[audience] = { 
        available: false, 
        lastSent: new Date() 
      };
      setCohortAvailability(updatedAvailability);
      
      toast({
        title: "Broadcast sent",
        description: `Your message has been delivered to ${customersSnapshot.size} customers.`,
      })
      
      // Reset form and close dialog
      setTitle("")
      setMessage("")
      setAudience(CUSTOMER_COHORTS.ALL)
      setNotificationAction("showAnnouncement")
      setAnnouncement(null)
      setShowConfirmation(false)
      setInstantClose(true)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "There was an error sending your broadcast.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  // Get the display name for a cohort
  const getCohortDisplayName = (cohort: string) => {
    switch(cohort) {
      case CUSTOMER_COHORTS.ALL: return "All customers";
      case CUSTOMER_COHORTS.ACTIVE: return "Active customers";
      case CUSTOMER_COHORTS.NEW: return "New customers";
      case CUSTOMER_COHORTS.RESURRECTED: return "Resurrected customers";
      case CUSTOMER_COHORTS.CHURNED: return "Churned customers";
      case CUSTOMER_COHORTS.DORMANT: return "Dormant customers";
      default: return cohort;
    }
  };
  
  // Get description text for a cohort
  const getCohortDescription = (cohort: string) => {
    switch(cohort) {
      case CUSTOMER_COHORTS.ALL: 
        return "This message will be sent to all of your customers.";
      case CUSTOMER_COHORTS.ACTIVE: 
        return "This message will be sent to customers with an 'active' status.";
      case CUSTOMER_COHORTS.NEW: 
        return "This message will be sent to customers who recently joined.";
      case CUSTOMER_COHORTS.RESURRECTED: 
        return "This message will be sent to customers who have returned after being inactive.";
      case CUSTOMER_COHORTS.CHURNED: 
        return "This message will be sent to customers who have stopped engaging with your business.";
      case CUSTOMER_COHORTS.DORMANT: 
        return "This message will be sent to customers who haven't engaged in a while.";
      default: 
        return "This message will be sent to selected customers.";
    }
  };
  
  // Check if a cohort was messaged in the last 30 days
  const isCohortAvailable = async (cohort: string): Promise<boolean> => {
    if (!user?.uid) return false;
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const logsCollectionPath = collection(db, 'merchants', user.uid, 'broadcastLogs');
      const logsQuery = query(
        logsCollectionPath,
        where('cohort', '==', cohort),
        where('sentAt', '>=', thirtyDaysAgo),
        orderBy('sentAt', 'desc'),
        limit(1)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      
      return logsSnapshot.empty;
    } catch (error) {
      console.error("Error checking cohort availability:", error);
      return false;
    }
  };

  // Get cohorts that were messaged in the last 30 days
  const getRecentlyMessagedCohorts = async (): Promise<string[]> => {
    if (!user?.uid) return [];
    
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const logsCollectionPath = collection(db, 'merchants', user.uid, 'broadcastLogs');
      const logsQuery = query(
        logsCollectionPath,
        where('sentAt', '>=', thirtyDaysAgo)
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      const recentCohorts = logsSnapshot.docs.map(doc => doc.data().cohort);
      
      // Filter out duplicates
      return [...new Set(recentCohorts)];
    } catch (error) {
      console.error("Error getting recently messaged cohorts:", error);
      return [];
    }
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetOverlay className="bg-black/30" />
      <SheetContent
        className="sm:max-w-[600px] p-0 overflow-hidden h-screen flex flex-col rounded-md"
        onInteractOutside={(e) => e.preventDefault()}
        data-instant-close={instantClose ? "true" : "false"}
      >
        <div className="flex-none px-6 py-3 border-b">
          <SheetHeader className="mb-1">
            <SheetTitle className="text-lg">
              <span className="text-blue-500">Broadcast</span> Message
            </SheetTitle>
            <SheetDescription className="text-sm">
              Send a notification to your customers to keep them engaged
            </SheetDescription>
          </SheetHeader>
        </div>
        
        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Message Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => {
                  setTitle(toTitleCase(e.target.value));
                }}
                placeholder="E.g., Special Weekend Offer"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter the message you want to send to your customers..."
                rows={4}
                className="focus-visible:ring-[#007AFF] focus-visible:ring-offset-0"
              />
            </div>
            
            {profanityError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-red-800">Content Policy Violation</h4>
                    <p className="text-xs text-red-600 mt-1">{profanityError}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
              <h3 className="text-sm font-medium mb-2">Broadcast Preview</h3>
              <div className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <Bell className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-sm">{title || "Message Title"}</h4>
                    <p className="text-xs text-gray-500 mt-1">{message || "Your message content will appear here..."}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label>Action When Tapped</Label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={notificationAction === 'showAnnouncement' ? 'default' : 'outline'}
                    onClick={() => setNotificationAction('showAnnouncement')}
                    className="flex-grow flex items-center gap-1"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Show Announcement</span>
                  </Button>
                  <Button
                    type="button"
                    variant={notificationAction === 'storeRedirect' ? 'default' : 'outline'}
                    onClick={() => setNotificationAction('storeRedirect')}
                    className="flex-grow flex items-center gap-1"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Go to Store</span>
                  </Button>
                </div>
                
                {notificationAction === 'showAnnouncement' && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-600 mb-2">
                      Create a detailed announcement that will be shown when customers tap on this notification.
                    </p>
                    
                    {announcement ? (
                      <div className="space-y-2">
                        <div className="bg-white p-2 rounded border">
                          <h4 className="font-medium text-sm">{announcement.title || title}</h4>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{announcement.content || "Announcement content"}</p>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full h-8 text-xs"
                          onClick={() => setShowAnnouncementDesigner(true)}
                        >
                          Edit Announcement
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full h-8 text-xs"
                        onClick={() => setShowAnnouncementDesigner(true)}
                      >
                        Create Announcement
                      </Button>
                    )}
                  </div>
                )}
                
                {notificationAction === 'storeRedirect' && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-600">
                      When customers tap this notification, they will be taken directly to your store page.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Send To</Label>
              
              <div className="grid grid-cols-2 gap-2">
                {loadingCohorts ? (
                  <div className="col-span-2 flex justify-center py-4">
                    <div className="animate-pulse flex space-x-2">
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                    </div>
                  </div>
                ) : (
                  Object.values(CUSTOMER_COHORTS).map(cohort => {
                    const isAvailable = cohortAvailability[cohort]?.available;
                    const lastSent = cohortAvailability[cohort]?.lastSent;
                    const count = cohortCounts[cohort] || 0;
                    
                    // For "All" cohort, we need to recalculate the available count
                    // by excluding customers in unavailable cohorts
                    let displayCount = count;
                    if (cohort === CUSTOMER_COHORTS.ALL) {
                      const unavailableCohorts = Object.entries(cohortAvailability)
                        .filter(([c, status]) => c !== CUSTOMER_COHORTS.ALL && !status.available)
                        .map(([c]) => c);
                      
                      // Subtract counts of unavailable cohorts
                      displayCount = count;
                      for (const unavailableCohort of unavailableCohorts) {
                        displayCount -= cohortCounts[unavailableCohort] || 0;
                      }
                      
                      // Ensure we don't show negative numbers
                      displayCount = Math.max(0, displayCount);
                    }
                    
                    return (
                      <div 
                        key={cohort}
                        className={`relative flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all 
                          ${!isAvailable ? 'opacity-60 bg-gray-50' : audience === cohort ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                        onClick={() => isAvailable && setAudience(cohort)}
                      >
                        <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === cohort && isAvailable ? 'bg-blue-500' : 'border border-gray-300'}`}>
                          {audience === cohort && isAvailable && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">{getCohortDisplayName(cohort)}</span>
                            <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-600">
                              {displayCount}
                            </span>
                          </div>
                        </div>
                        
                        {!isAvailable && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                              <Clock className="h-3 w-3" />
                              <span>Available {getAvailableAgainDate(lastSent)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5 text-xs text-blue-800 mt-2">
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {getCohortDescription(audience)}
                  </span>
                </p>
                
                <p className="flex items-center gap-1.5 mt-1.5 text-amber-700">
                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    You can only send one message to each cohort every 30 days.
                  </span>
                </p>
              </div>
            </div>
            
            {/* Add some bottom padding to ensure content doesn't get hidden behind the fixed footer */}
            <div className="h-16"></div>
          </div>
        </ScrollArea>
        
        <div className="flex-none px-6 py-4 border-t bg-white shadow-md">
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={loading || !title || !message || (notificationAction === "showAnnouncement" && !announcement) || !cohortAvailability[audience]?.available}
              className="flex items-center gap-1 bg-[#007AFF] hover:bg-[#0071E3] text-white"
            >
              <Send className="h-3.5 w-3.5" />
              {loading ? "Sending..." : "Send Broadcast"}
            </Button>
          </div>
        </div>
      </SheetContent>
      
      {/* Announcement Designer Dialog */}
      <AnnouncementDesignerDialog
        open={showAnnouncementDesigner}
        onOpenChange={setShowAnnouncementDesigner}
        onSave={(newAnnouncement) => {
          setAnnouncement(newAnnouncement)
          setShowAnnouncementDesigner(false)
        }}
        initialAnnouncement={announcement}
      />
    </Sheet>
  )
} 