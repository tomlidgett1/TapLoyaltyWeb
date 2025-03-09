"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Users, Send, Bell, Store, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"

interface SendBroadcastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SendBroadcastDialog({ open, onOpenChange }: SendBroadcastDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState("all")
  const [loading, setLoading] = useState(false)
  const [notificationAction, setNotificationAction] = useState("showAnnouncement")
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  
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
    
    try {
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
      
      toast({
        title: "Broadcast created",
        description: "Your message has been scheduled for delivery to customers.",
      })
      
      // Reset form and close dialog
      setTitle("")
      setMessage("")
      setAudience("all")
      setNotificationAction("showAnnouncement")
      setAnnouncement(null)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "There was an error creating your broadcast.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#007AFF]" />
            <span>Send Broadcast Message</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 py-2">
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
              rows={3}
            />
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
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${audience === 'segment' ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                onClick={() => setAudience('segment')}
              >
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${audience === 'segment' ? 'bg-blue-500' : 'border border-gray-300'}`}>
                  {audience === 'segment' && <div className="h-2 w-2 rounded-full bg-white" />}
                </div>
                <span className="text-sm">Specific segment</span>
              </div>
            </div>
            
            {audience === "segment" && (
              <div className="mt-2">
                <Select>
                  <SelectTrigger className="h-9 bg-white">
                    <SelectValue placeholder="Choose a customer segment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New customers (last 30 days)</SelectItem>
                    <SelectItem value="loyal">Loyal customers (5+ purchases)</SelectItem>
                    <SelectItem value="high-value">High-value customers</SelectItem>
                    <SelectItem value="at-risk">At-risk customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-100 rounded-md p-2.5 text-xs text-blue-800 mt-2">
              <p className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {audience === "all" && "This message will be sent to all of your customers."}
                  {audience === "active" && "This message will be sent to customers who have been active in the last 90 days."}
                  {audience === "inactive" && "This message will be sent to customers who haven't been active in the last 90 days."}
                  {audience === "segment" && "This message will be sent to customers in the selected segment."}
                </span>
              </p>
            </div>
          </div>
        </div>
        
        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSend}
            disabled={loading || !title || !message || (notificationAction === "showAnnouncement" && !announcement)}
            className="flex items-center gap-1"
            size="sm"
          >
            <Send className="h-3.5 w-3.5" />
            {loading ? "Sending..." : "Send Broadcast"}
          </Button>
        </DialogFooter>
      </DialogContent>
      
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