"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { X, Users, Send, Bell, Store, MessageSquare, Clock, Award, DollarSign, AlertTriangle, UserPlus, Repeat, TrendingUp, AlertCircle, HelpCircle, Ban } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, getDocs, getDoc, doc, query, where, writeBatch, orderBy, limit, serverTimestamp } from "firebase/firestore"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"
import { useRouter } from "next/navigation"

interface SendBroadcastPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Define customer cohorts
const CUSTOMER_COHORTS = {
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

export function SendBroadcastPopup({ open, onOpenChange }: SendBroadcastPopupProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [selectedCohorts, setSelectedCohorts] = useState<string[]>([CUSTOMER_COHORTS.ACTIVE])
  const [loading, setLoading] = useState(false)
  const [notificationAction, setNotificationAction] = useState("showAnnouncement")
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
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
        [CUSTOMER_COHORTS.ACTIVE]: 0,
        [CUSTOMER_COHORTS.NEW]: 0,
        [CUSTOMER_COHORTS.RESURRECTED]: 0,
        [CUSTOMER_COHORTS.CHURNED]: 0,
        [CUSTOMER_COHORTS.DORMANT]: 0
      };
      
      // Customer collection path
      const customersCollectionPath = collection(db, 'merchants', user.uid, 'customers');
      
      // Get count for each cohort
      for (const cohort of Object.values(CUSTOMER_COHORTS)) {
        // Query the currentCohort.name field directly
        const cohortQuery = query(
          customersCollectionPath,
          where('currentCohort.name', '==', cohort.toLowerCase())
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

  // Handle cohort selection toggle
  const toggleCohortSelection = (cohort: string) => {
    setSelectedCohorts(prev => {
      if (prev.includes(cohort)) {
        return prev.filter(c => c !== cohort);
      } else {
        return [...prev, cohort];
      }
    });
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

    if (selectedCohorts.length === 0) {
      toast({
        title: "No cohorts selected",
        description: "Please select at least one customer cohort to send the broadcast to.",
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
    
    // Check if selected cohorts are available
    const unavailableCohorts = selectedCohorts.filter(cohort => !cohortAvailability[cohort]?.available);
    if (unavailableCohorts.length > 0) {
      const cohortNames = unavailableCohorts.map(getCohortDisplayName).join(', ');
      toast({
        title: "Cohorts unavailable",
        description: `You've already messaged these cohorts in the last 30 days: ${cohortNames}`,
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
      
      // Get customers based on the selected cohorts
      const customersCollectionPath = collection(db, 'merchants', user.uid, 'customers')
      
      // Get detailed breakdown for each cohort
      const cohortBreakdown: Record<string, number> = {};
      let totalRecipients = 0;
      
      // Query each cohort separately to get accurate counts
      for (const cohort of selectedCohorts) {
        const cohortQuery = query(
          customersCollectionPath,
          where('currentCohort.name', '==', cohort.toLowerCase())
        );
        
        const cohortSnapshot = await getDocs(cohortQuery);
        const cohortCount = cohortSnapshot.size;
        cohortBreakdown[cohort] = cohortCount;
        totalRecipients += cohortCount;
      }
      
      // Log the broadcast details
      console.log('📤 Broadcast Details:');
      console.log(`   Total Recipients: ${totalRecipients}`);
      console.log('   Cohort Breakdown:');
      selectedCohorts.forEach(cohort => {
        console.log(`     ${getCohortDisplayName(cohort)}: ${cohortBreakdown[cohort]} customers`);
      });
      
      // Create the broadcast document
      const broadcastData = {
        title,
        message,
        selectedCohorts,
        notificationAction,
        merchantId: user.uid,
        createdAt: Timestamp.now(),
        status: "active",
        // Add recipient tracking
        totalRecipients,
        cohortBreakdown,
        // Include announcement data if available and action is showAnnouncement
        ...(notificationAction === "showAnnouncement" && announcement 
          ? { announcementData: announcement } 
          : {})
      }
      
      // Save to Firestore
      const broadcastsRef = collection(db, 'merchants', user.uid, 'broadcasts')
      const docRef = await addDoc(broadcastsRef, broadcastData)
      
      // Record the cohort message in history for each selected cohort
      const cohortHistoryRef = collection(db, 'merchants', user.uid, 'cohortMessageHistory');
      const historyPromises = selectedCohorts.map(cohort => 
        addDoc(cohortHistoryRef, {
          cohort,
          broadcastId: docRef.id,
          sentAt: Timestamp.now()
        })
      );
      await Promise.all(historyPromises);
      
      // Query customers that belong to any of the selected cohorts for batch processing
      const customersQuery = query(
        customersCollectionPath, 
        where('currentCohort.name', 'in', selectedCohorts.map(cohort => cohort.toLowerCase()))
      );
      
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
      selectedCohorts.forEach(cohort => {
        updatedAvailability[cohort] = { 
          available: false, 
          lastSent: new Date() 
        };
      });
      setCohortAvailability(updatedAvailability);
      
      // Create detailed success message
      const cohortDetails = selectedCohorts.map(cohort => 
        `${getCohortDisplayName(cohort)}: ${cohortBreakdown[cohort]}`
      ).join(', ');
      
      toast({
        title: "Broadcast sent successfully",
        description: `Delivered to ${totalRecipients} customers (${cohortDetails})`,
      })
      
      // Reset form and close dialog
      setTitle("")
      setMessage("")
      setSelectedCohorts([CUSTOMER_COHORTS.ACTIVE])
      setNotificationAction("showAnnouncement")
      setAnnouncement(null)
      setShowConfirmation(false)
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
      case CUSTOMER_COHORTS.ACTIVE: return "Active customers";
      case CUSTOMER_COHORTS.NEW: return "New customers";
      case CUSTOMER_COHORTS.RESURRECTED: return "Resurrected customers";
      case CUSTOMER_COHORTS.CHURNED: return "Churned customers";
      case CUSTOMER_COHORTS.DORMANT: return "Dormant customers";
      default: return cohort;
    }
  };
  
  // Get description text for selected cohorts
  const getSelectedCohortsDescription = () => {
    if (selectedCohorts.length === 0) {
      return "No cohorts selected.";
    }
    if (selectedCohorts.length === 1) {
      const cohort = selectedCohorts[0];
      switch(cohort) {
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
    }
    const cohortNames = selectedCohorts.map(getCohortDisplayName).join(', ');
    return `This message will be sent to: ${cohortNames}.`;
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing
          setTitle("")
          setMessage("")
          setSelectedCohorts([CUSTOMER_COHORTS.ACTIVE])
          setNotificationAction("showAnnouncement")
          setAnnouncement(null)
          setShowConfirmation(false)
          setProfanityError(null)
        }
        onOpenChange(open)
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                <span className="text-blue-500">Broadcast</span> Message
              </h2>
              <p className="text-sm text-gray-600">
                Send a notification to your customers to keep them engaged
              </p>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={notificationAction === 'showAnnouncement' ? 'default' : 'outline'}
                        onClick={() => setNotificationAction('showAnnouncement')}
                        className="flex items-center gap-1"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Show Announcement</span>
                      </Button>
                      <Button
                        type="button"
                        variant={notificationAction === 'storeRedirect' ? 'default' : 'outline'}
                        onClick={() => setNotificationAction('storeRedirect')}
                        className="flex items-center gap-1"
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
                              className="h-8 text-xs"
                              onClick={() => setShowAnnouncementDesigner(true)}
                            >
                              Edit Announcement
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="h-8 text-xs"
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
                  <Label className="text-sm font-medium">Send To (Select Multiple Cohorts)</Label>
                  
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
                        const isSelected = selectedCohorts.includes(cohort);
                        
                        return (
                          <div 
                            key={cohort}
                            className={`relative flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all 
                              ${!isAvailable ? 'opacity-60 bg-gray-50' : isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                            onClick={() => isAvailable && toggleCohortSelection(cohort)}
                          >
                            <div className={`h-4 w-4 rounded-full flex items-center justify-center ${isSelected && isAvailable ? 'bg-blue-500' : 'border border-gray-300'}`}>
                              {isSelected && isAvailable && <div className="h-2 w-2 rounded-full bg-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{getCohortDisplayName(cohort)}</span>
                                <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-full text-gray-600">
                                  {count}
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
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 text-xs mt-2">
                    <p className="flex items-center gap-1.5 text-gray-700">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        {getSelectedCohortsDescription()}
                      </span>
                    </p>
                    
                    <p className="flex items-center gap-1.5 mt-1.5 text-gray-600">
                      <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>
                        You can only send one message to each cohort every 30 days.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t bg-white">
              <div className="flex justify-between items-center w-full">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSend}
                  disabled={loading || !title || !message || selectedCohorts.length === 0 || (notificationAction === "showAnnouncement" && !announcement) || selectedCohorts.some(cohort => !cohortAvailability[cohort]?.available)}
                  className="flex items-center gap-1 bg-[#007AFF] hover:bg-[#0071E3] text-white"
                >
                  <Send className="h-3.5 w-3.5" />
                  {loading ? "Sending..." : "Send Broadcast"}
                </Button>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
      
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
    </Dialog>
  )
} 