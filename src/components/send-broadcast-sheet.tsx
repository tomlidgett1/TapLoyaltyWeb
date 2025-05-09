"use client"

import React, { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Users, Send, Bell, Store, MessageSquare, Clock, Award, DollarSign, AlertTriangle, UserPlus, Repeat, TrendingUp, AlertCircle, HelpCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp, getDocs, getDoc, doc, query, where, writeBatch } from "firebase/firestore"
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

export function SendBroadcastSheet({ open, onOpenChange }: SendBroadcastSheetProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState("all")
  const [loading, setLoading] = useState(false)
  const [notificationAction, setNotificationAction] = useState("showAnnouncement")
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [instantClose, setInstantClose] = useState(false)
  const router = useRouter()
  
  // Reset instantClose when sheet is closed
  useEffect(() => {
    if (!open && instantClose) {
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);
  
  const toTitleCase = (str: string) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
    
    if (!user?.uid) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to send broadcasts.",
        variant: "destructive"
      })
      return
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
      
      // Get customers based on the selected audience
      let customersQuery;
      
      // Customer collection path
      const customersCollectionPath = collection(db, 'merchants', user.uid, 'customers')
      
      // Create query based on audience selection
      if (audience === 'all') {
        // Get all customers
        customersQuery = query(customersCollectionPath)
      } else if (audience === 'active') {
        // Get customers with 'active' in their cohorts array
        customersQuery = query(customersCollectionPath, where('cohorts', 'array-contains', 'active'))
      } else if (audience === 'inactive') {
        // Get customers with 'churned' in their cohorts array
        customersQuery = query(customersCollectionPath, where('cohorts', 'array-contains', 'churned'))
      } else if (audience === 'newCustomer') {
        // Get customers with 'newCustomer' in their cohorts array
        customersQuery = query(customersCollectionPath, where('cohorts', 'array-contains', 'newCustomer'))
      } else {
        // Default fallback - use all customers if audience value is unexpected
        customersQuery = query(customersCollectionPath)
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
      
      toast({
        title: "Broadcast sent",
        description: `Your message has been delivered to ${customersSnapshot.size} customers.`,
      })
      
      // Reset form and close dialog
      setTitle("")
      setMessage("")
      setAudience("all")
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
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="sm:max-w-[600px] p-0 overflow-auto h-screen rounded-md"
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
        
        <ScrollArea className="flex-1 px-6 py-4">
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
              <Tabs defaultValue="showAnnouncement" onValueChange={setNotificationAction} value={notificationAction}>
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="showAnnouncement" className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>Show Announcement</span>
                  </TabsTrigger>
                  <TabsTrigger value="storeRedirect" className="flex items-center gap-1">
                    <Store className="h-3.5 w-3.5" />
                    <span>Go to Store</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="showAnnouncement" className="pt-3">
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
                </TabsContent>
                
                <TabsContent value="storeRedirect" className="pt-3">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-xs text-gray-600">
                      When customers tap this notification, they will be taken directly to your store page.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">Send To</Label>
              
              <div className="grid grid-cols-2 gap-2">
                <div 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${audience === 'all' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setAudience('all')}
                >
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === 'all' ? 'bg-blue-500' : 'border border-gray-300'}`}>
                    {audience === 'all' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">All customers</span>
                </div>
                
                <div 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${audience === 'active' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setAudience('active')}
                >
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === 'active' ? 'bg-blue-500' : 'border border-gray-300'}`}>
                    {audience === 'active' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">Active customers</span>
                </div>
                
                <div 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${audience === 'inactive' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setAudience('inactive')}
                >
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === 'inactive' ? 'bg-blue-500' : 'border border-gray-300'}`}>
                    {audience === 'inactive' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">Inactive customers</span>
                </div>
                
                <div 
                  className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${audience === 'newCustomer' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setAudience('newCustomer')}
                >
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === 'newCustomer' ? 'bg-blue-500' : 'border border-gray-300'}`}>
                    {audience === 'newCustomer' && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  <span className="text-sm">New customers</span>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5 text-xs text-blue-800 mt-2">
                <p className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>
                    {audience === "all" && "This message will be sent to all of your customers."}
                    {audience === "active" && "This message will be sent to customers with the 'active' cohort."}
                    {audience === "inactive" && "This message will be sent to customers with the 'churned' cohort."}
                    {audience === "newCustomer" && "This message will be sent to customers with the 'newCustomer' cohort."}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        <div className="flex-none px-6 py-4 border-t">
          <div className="flex justify-between items-center w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend}
              disabled={loading || !title || !message || (notificationAction === "showAnnouncement" && !announcement)}
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