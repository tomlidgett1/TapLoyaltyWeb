"use client"

import { useState, useEffect } from "react"
import { Mail, Package, AlertCircle, CheckCircle, XCircle, ChevronDown, Star, Clock, Eye, Filter, Bot, User, ArrowDown, Pencil, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, doc, updateDoc, Timestamp, getDoc, where, onSnapshot } from "firebase/firestore"

// Define types for emails
interface EmailMessage {
  id: string
  threadId?: string
  from?: string
  to?: string
  subject?: string
  snippet?: string
  date?: Date
  body?: {
    html: string | null
    plain: string | null
  }
  hasAttachments?: boolean
  attachments?: EmailAttachment[]
  read?: boolean
  savedAt?: Timestamp
}

interface EmailAttachment {
  filename: string
  mimeType: string
  size: number
  attachmentId: string
}

interface EmailThread {
  messages: EmailMessage[]
  loading: boolean
}

// Define rejection reasons
interface RejectionReason {
  id: string
  label: string
}

const REJECTION_REASONS: RejectionReason[] = [
  { id: "not-cs-inquiry", label: "Not a customer service inquiry" },
  { id: "tone-issue", label: "Doesn't align with my tone" },
  { id: "policy-issue", label: "Doesn't align with our policies" },
  { id: "inaccurate", label: "Contains inaccurate information" },
  { id: "inappropriate", label: "Contains inappropriate content" },
  { id: "incomplete", label: "Response is incomplete" },
]

// Define types for agent actions
interface AgentAction {
  id: string
  type: "csemail" | "offer" | "program" | "other" 
  title: string
  description: string
  priority: "high" | "medium" | "low"
  timestamp: Date
  agent: "customer-service" | "marketing" | "loyalty" | "other"
  content: any
  status: "new" | "approved" | "rejected" | "declined"
  emailId?: string
  sourceResponseId?: string
  response?: string
  reasoning?: string
  classification?: Record<string, any>
  isCustomerInquiry?: boolean
  subject?: string | null
  sender?: string | null
  recipient?: string | null
  receivedAt?: Date | null
  createdAt: Date
  rejectionReason?: string[]
  rejectionComment?: string
  threadSummary?: string
  emailTitle?: string
  shortSummary?: string
  isOngoingConversation?: boolean
}

// Add a gradient text component for Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

export default function AgentInboxPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null)
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)
  
  // State for email thread
  const [emailThread, setEmailThread] = useState<EmailThread>({
    messages: [],
    loading: false
  })
  
  // State for rejection dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectingActionId, setRejectingActionId] = useState<string | null>(null)
  const [selectedReasons, setSelectedReasons] = useState<string[]>([])
  const [otherReason, setOtherReason] = useState("")
  
  // Track which actions have been viewed
  const [viewedActions, setViewedActions] = useState<Record<string, boolean>>({})
  
  // Add state for response editing
  const [isEditingResponse, setIsEditingResponse] = useState(false)
  const [editedResponse, setEditedResponse] = useState("")

  // Fetch agent actions from Firestore with real-time updates
  useEffect(() => {
    if (!user) return
    
    setLoading(true)
    
    console.log("Setting up real-time listener for agent inbox tasks for merchant:", user.uid)
    const agentInboxRef = collection(db, `merchants/${user.uid}/agentinbox`)
    const q = query(agentInboxRef, orderBy("createdAt", "desc"))
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        console.log("No agent inbox tasks found")
        setPendingActions([])
        setLoading(false)
        return
      }
      
      console.log(`Found ${snapshot.size} agent inbox tasks`)
      const actions: AgentAction[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        
        // Map Firestore data to AgentAction format
        const action: AgentAction = {
          id: doc.id,
          type: data.type || "other",
          title: data.type === "csemail" ? "Email Response to Customer Inquiry" : "Agent Task",
          description: data.reasoning || "The agent has created a task that requires your review.",
          // Set priority based on task type or other factors
          priority: data.isCustomerInquiry ? "high" : "medium",
          timestamp: data.createdAt?.toDate() || new Date(),
          agent: data.type === "csemail" ? "customer-service" : "other",
          content: {},
          status: data.status || "new",
          emailId: data.emailId,
          sourceResponseId: data.sourceResponseId,
          response: data.response,
          reasoning: data.reasoning,
          classification: data.classification,
          isCustomerInquiry: data.isCustomerInquiry,
          subject: data.subject,
          sender: data.sender,
          recipient: data.recipient,
          receivedAt: data.receivedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          threadSummary: data.threadSummary || null,
          emailTitle: data.emailTitle || null,
          shortSummary: data.shortSummary || null,
          isOngoingConversation: data.isOngoingConversation || false,
        }
        
        // Add content based on task type
        if (data.type === "csemail") {
          action.content = {
            customerEmail: data.sender || "customer@example.com",
            customerName: data.sender?.split('@')[0] || "Customer",
            subject: data.subject || "Customer Inquiry",
            inquiry: data.classification?.customerInquiry || "This is a customer inquiry.",
            suggestedResponse: data.response || ""
          }
        }
        
        actions.push(action)
      })
      
      setPendingActions(actions)
      setLoading(false)
    }, (error) => {
      console.error("Error setting up agent inbox listener:", error)
      toast({
        title: "Error",
        description: "Failed to load agent tasks. Please try again.",
        variant: "destructive",
      })
      setLoading(false)
    })
    
    // Clean up listener on unmount
    return () => unsubscribe()
  }, [user, toast])

  // Function to fetch email thread details
  const fetchEmailThread = async (emailId: string) => {
    if (!user || !emailId) return
    
    setEmailThread(prev => ({ ...prev, loading: true, messages: [] }))
    
    try {
      // First check if the email exists in pushemails collection
      console.log("Fetching email thread for:", emailId)
      const pushEmailsRef = collection(db, `merchants/${user.uid}/pushemails`)
      const q = query(pushEmailsRef, where("emailId", "==", emailId))
      const snapshot = await getDocs(q)
      
      if (snapshot.empty) {
        console.log("No push emails found with this emailId, trying direct lookup")
        // Try direct lookup by document ID
        const directEmailRef = doc(db, `merchants/${user.uid}/pushemails`, emailId)
        const directEmailSnap = await getDoc(directEmailRef)
        
        if (directEmailSnap.exists()) {
          // We found the email directly
          const emailData = directEmailSnap.data()
          const emailMessage: EmailMessage = {
            id: emailId,
            subject: emailData.subject || "No Subject",
            from: emailData.sender || "Unknown Sender",
            to: emailData.recipient || "Unknown Recipient",
            body: {
              html: emailData.html || null,
              plain: emailData.text || emailData.body || null
            },
            date: emailData.receivedAt?.toDate() || emailData.createdAt?.toDate() || new Date(),
            snippet: emailData.snippet || ""
          }
          
          setEmailThread({
            messages: [emailMessage],
            loading: false
          })
          return
        }
        
        // If still not found, look in the emails collection
        console.log("No direct push email found, checking emails collection")
        const emailsRef = doc(db, `merchants/${user.uid}/emails`, emailId)
        const emailsSnap = await getDoc(emailsRef)
        
        if (emailsSnap.exists()) {
          const emailData = emailsSnap.data()
          const emailMessage: EmailMessage = {
            id: emailId,
            subject: emailData.subject || "No Subject",
            from: emailData.from || "Unknown Sender",
            to: emailData.to || "Unknown Recipient",
            snippet: emailData.snippet || "",
            date: emailData.date instanceof Timestamp ? emailData.date.toDate() : new Date(),
            body: emailData.body || { html: null, plain: null }
          }
          
          setEmailThread({
            messages: [emailMessage],
            loading: false
          })
          return
        }
        
        // If still not found, set empty thread
        console.log("No email found with this ID in any collection")
        setEmailThread({
          messages: [],
          loading: false
        })
        
      } else {
        // We found related emails
        console.log(`Found ${snapshot.size} related emails`)
        const threadMessages: EmailMessage[] = []
        
        snapshot.forEach(doc => {
          const data = doc.data()
          const emailMessage: EmailMessage = {
            id: doc.id,
            subject: data.subject || "No Subject",
            from: data.sender || "Unknown Sender",
            to: data.recipient || "Unknown Recipient",
            body: {
              html: data.html || null,
              plain: data.text || data.body || null
            },
            date: data.receivedAt?.toDate() || data.createdAt?.toDate() || new Date(),
            snippet: data.snippet || data.text?.substring(0, 100) || ""
          }
          
          threadMessages.push(emailMessage)
        })
        
        // Sort by date, most recent last
        threadMessages.sort((a, b) => {
          const dateA = a.date || new Date(0)
          const dateB = b.date || new Date(0)
          return dateA.getTime() - dateB.getTime()
        })
        
        setEmailThread({
          messages: threadMessages,
          loading: false
        })
      }
      
    } catch (error) {
      console.error("Error fetching email thread:", error)
      toast({
        title: "Error",
        description: "Failed to load email thread. Please try again.",
        variant: "destructive"
      })
      setEmailThread({
        messages: [],
        loading: false
      })
    }
  }

  // Filter actions based on active tab
  const filteredActions = pendingActions.filter(action => {
    // Don't show rejected actions
    if (action.status === "rejected") return false
    
    if (activeTab === "all") return true
    if (activeTab === "high") return action.priority === "high"
    if (activeTab === "email") return action.type === "csemail"
    if (activeTab === "offer") return action.type === "offer"
    if (activeTab === "program") return action.type === "program"
    return false
  })

  // Handle action approval
  const handleApprove = async (actionId: string) => {
    if (!user) return
    
    try {
      // Update in Firestore
      const actionRef = doc(db, `merchants/${user.uid}/agentinbox/${actionId}`)
      await updateDoc(actionRef, {
        status: "approved",
        updatedAt: Timestamp.now()
      })
      
      // Update local state
    setPendingActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { ...action, status: "approved" }
          : action
      )
    )
    
    toast({
      title: "Action Approved",
      description: "The agent will now implement this action.",
      variant: "default",
    })
    } catch (error) {
      console.error("Error approving agent action:", error)
      toast({
        title: "Error",
        description: "Failed to approve the action. Please try again.",
        variant: "destructive",
      })
    }
  }
  
  // Open rejection dialog
  const openRejectDialog = (actionId: string) => {
    setRejectingActionId(actionId)
    setSelectedReasons([])
    setOtherReason("")
    setShowRejectDialog(true)
  }
  
  // Handle rejection confirmation
  const handleRejectConfirm = async () => {
    if (!user || !rejectingActionId) return
    
    try {
      const reasons = [...selectedReasons]
      let comment = ""
      
      if (otherReason.trim()) {
        reasons.push("other")
        comment = otherReason.trim()
      }
      
      // Update in Firestore
      const actionRef = doc(db, `merchants/${user.uid}/agentinbox/${rejectingActionId}`)
      await updateDoc(actionRef, {
        status: "rejected",
        rejectionReason: reasons,
        rejectionComment: comment,
        updatedAt: Timestamp.now()
      })
      
      // Update local state
    setPendingActions(prev => 
      prev.map(action => 
          action.id === rejectingActionId 
            ? { 
                ...action, 
                status: "rejected", 
                rejectionReason: reasons,
                rejectionComment: comment 
              }
          : action
      )
    )
      
      // Clear selected action if it was rejected
      if (selectedAction?.id === rejectingActionId) {
        setSelectedAction(null)
      }
    
    toast({
      title: "Action Declined",
        description: "The agent action has been rejected.",
        variant: "default",
      })
      
      // Close the dialog
      setShowRejectDialog(false)
      setRejectingActionId(null)
    } catch (error) {
      console.error("Error rejecting agent action:", error)
      toast({
        title: "Error",
        description: "Failed to reject the action. Please try again.",
      variant: "destructive",
    })
    }
  }
  
  // Toggle rejection reason selection
  const toggleReason = (reasonId: string) => {
    setSelectedReasons(prev => 
      prev.includes(reasonId)
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
    )
  }
  
  // Show action details
  const viewActionDetails = (action: AgentAction) => {
    setSelectedAction(action)
    
    // Mark this action as viewed
    if (!viewedActions[action.id]) {
      setViewedActions(prev => ({
        ...prev,
        [action.id]: true
      }))
    }
    
    // Clear any existing email thread data
    setEmailThread({
      messages: [],
      loading: false
    })
    
    // If this is a customer service email task, fetch the email thread
    if (action.type === "csemail" && action.emailId) {
      fetchEmailThread(action.emailId)
    }
  }
  
  // Format relative time
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    let interval = Math.floor(seconds / 31536000)
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 2592000)
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 86400)
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 3600)
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 60)
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`
    
    if (seconds < 10) return 'just now'
    
    return `${Math.floor(seconds)} second${Math.floor(seconds) === 1 ? '' : 's'} ago`
  }
  
  // Get icon for action type
  const getActionIcon = (type: string) => {
    switch (type) {
      case "csemail":
        return <Mail className="h-5 w-5 text-blue-500" />
      case "offer":
        return <Package className="h-5 w-5 text-purple-500" />
      case "program":
        return <Star className="h-5 w-5 text-amber-500" />
      default:
        return <Bot className="h-5 w-5 text-gray-500" />
    }
  }
  
  // Get color for priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-50 text-red-700 border-red-200"
      case "medium":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }
  
  // Get formatted agent name
  const getAgentName = (agent: string) => {
    switch (agent) {
      case "customer-service":
        return "Customer Service Agent"
      case "marketing":
        return "Marketing Agent"
      case "loyalty":
        return "Loyalty Program Agent"
      default:
        return "AI Agent"
    }
  }

  // Format date for emails
  const formatEmailDate = (date: Date | undefined) => {
    if (!date) return "Unknown date"
    
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const emailDate = new Date(date)
    
    // Today, show time only
    if (emailDate.toDateString() === now.toDateString()) {
      return emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    // Yesterday, show "Yesterday" + time
    if (emailDate.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // Within the last 7 days, show day of week + time
    if ((now.getTime() - emailDate.getTime()) < 7 * 24 * 60 * 60 * 1000) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return `${dayNames[emailDate.getDay()]}, ${emailDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    }
    
    // Otherwise, show date
    return emailDate.toLocaleDateString()
  }
  
  // Function to get sender name from email
  const getSenderName = (from: string) => {
    // Extract name from "Name <email@example.com>" format
    const matches = from.match(/^([^<]+)/)
    if (matches && matches[1]) {
      return matches[1].trim()
    }
    return from
  }

  // Add function to save edited response
  const saveEditedResponse = async () => {
    if (!user || !selectedAction) return
    
    try {
      // Update in Firestore
      const actionRef = doc(db, `merchants/${user.uid}/agentinbox/${selectedAction.id}`)
      await updateDoc(actionRef, {
        response: editedResponse,
        updatedAt: Timestamp.now()
      })
      
      // Update local state
      setSelectedAction(prev => 
        prev ? { ...prev, response: editedResponse } : null
      )
      
      setIsEditingResponse(false)
      
      toast({
        title: "Response Updated",
        description: "Your edits to the response have been saved.",
        variant: "default",
      })
    } catch (error) {
      console.error("Error updating response:", error)
      toast({
        title: "Error",
        description: "Failed to save your edits. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap flex items-center gap-2">
              <GradientText>Agent</GradientText> Inbox
            </h1>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="h-8 gap-2 rounded-md">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filter</span>
            </Button>
            <Button className="h-8 gap-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span>Approve All</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t flex-1 min-h-0 h-[calc(100vh-9rem)]">
        {/* Left Column - Agent Requests List */}
        <div className="lg:col-span-1 border-r flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="high" className="flex items-center justify-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>High Priority</span>
                </TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="offer">Offers</TabsTrigger>
                <TabsTrigger value="program">Programs</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
      
          <div className="flex-grow overflow-y-auto h-[calc(100%-8rem)] min-h-0 scrollbar-thin">
            <style jsx global>{`
              .scrollbar-thin {
                scrollbar-width: thin;
                scrollbar-color: rgba(203, 213, 225, 0.5) transparent;
              }
              .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
              }
              .scrollbar-thin::-webkit-scrollbar-track {
                background: transparent;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb {
                background-color: rgba(203, 213, 225, 0.5);
                border-radius: 20px;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background-color: rgba(148, 163, 184, 0.7);
              }
              
              /* Email content styles */
              .email-content {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 
                  'Open Sans', 'Helvetica Neue', sans-serif;
              }
              .email-content img {
                max-width: 100%;
                height: auto;
              }
              .email-content a {
                color: #3b82f6;
                text-decoration: underline;
              }
              .email-content table {
                max-width: 100%;
                border-collapse: collapse;
              }
              .email-content td, .email-content th {
                padding: 4px;
                border: 1px solid #e5e7eb;
              }
              
              /* Email prose styles */
              .prose {
                color: #374151;
                max-width: 65ch;
                font-size: 0.875rem;
                line-height: 1.5;
              }
              .prose a {
                color: #3b82f6;
                text-decoration: underline;
                font-weight: 500;
              }
              .prose strong {
                font-weight: 600;
                color: #111827;
              }
              .prose ol {
                counter-reset: list-counter;
                margin-top: 1.25em;
                margin-bottom: 1.25em;
                padding-left: 1.625em;
              }
              .prose ol > li {
                position: relative;
                counter-increment: list-counter;
                padding-left: 1.75em;
              }
              .prose ol > li::before {
                content: counter(list-counter) ".";
                position: absolute;
                left: 0;
                font-weight: 500;
                color: #6b7280;
              }
              .prose ul {
                margin-top: 1.25em;
                margin-bottom: 1.25em;
                padding-left: 1.625em;
                list-style-type: disc;
              }
              .prose ul > li {
                position: relative;
                padding-left: 0.375em;
              }
              .prose p {
                margin-top: 1.25em;
                margin-bottom: 1.25em;
              }
              .prose blockquote {
                font-weight: 500;
                font-style: italic;
                color: #111827;
                border-left-width: 0.25rem;
                border-left-color: #e5e7eb;
                margin-top: 1.6em;
                margin-bottom: 1.6em;
                padding-left: 1em;
              }
              .prose h1, .prose h2, .prose h3, .prose h4 {
                color: #111827;
                font-weight: 600;
                margin-top: 2em;
                margin-bottom: 1em;
                line-height: 1.25;
              }
              .prose-sm {
                font-size: 0.875rem;
              }
              .prose-sm p {
                margin-top: 1em;
                margin-bottom: 1em;
              }
            `}</style>
            
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start gap-3 p-3">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <div className="flex flex-col items-end">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">No agent actions found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no pending agent actions that match your current filter.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredActions.map((action) => (
                  <div 
                    key={action.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedAction?.id === action.id && "bg-muted",
                      action.priority === "high" && "border-l-4 border-l-red-500",
                      !viewedActions[action.id] && "bg-gray-50"
                    )}
                    onClick={() => viewActionDetails(action)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-shrink">
                        {getActionIcon(action.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-sm truncate">
                              {action.emailTitle || action.title}
                            </h3>
                            {action.isOngoingConversation && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs whitespace-nowrap">
                                Thread
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {action.shortSummary || action.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge 
                              variant="outline" 
                              className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-1.5 py-0 h-5 rounded-md flex items-center gap-1"
                            >
                              <Bot className="h-3 w-3 text-blue-400" />
                              <span>
                                {action.agent === "customer-service" ? "CS Agent" : 
                                 action.agent === "marketing" ? "Marketing" : 
                                 action.agent === "loyalty" ? "Loyalty" : "AI Agent"}
                              </span>
                            </Badge>
                            {action.sender && (
                              <span className="text-xs text-muted-foreground">
                                From: {action.sender.split('@')[0]}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="outline" className={`text-xs whitespace-nowrap px-2 py-0 h-5 font-medium rounded-md ${getPriorityColor(action.priority)}`}>
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(action.timestamp)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
                      
        {/* Right Column - Action Detail */}
        <div className="lg:col-span-1 flex flex-col min-h-0 p-0">
          {selectedAction ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-medium">
                    {selectedAction.title}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {getAgentName(selectedAction.agent)} • {formatTimeAgo(selectedAction.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 gap-1 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openRejectDialog(selectedAction.id)}
                    disabled={selectedAction.status !== "new"}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Decline</span>
                  </Button>
                  <Button 
                    size="sm"
                    className="h-8 gap-1 rounded-md"
                    onClick={() => handleApprove(selectedAction.id)}
                    disabled={selectedAction.status !== "new"}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </Button>
                </div>
              </div>

              <div className="px-6 py-6 flex-grow overflow-y-auto">
                <div className="space-y-6">
                  {/* Different content based on action type */}
                  {selectedAction.type === "csemail" && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Email Information</h4>
                        <Card className="rounded-md shadow-sm overflow-hidden">
                          <CardContent className="py-3">
                          <div className="space-y-2">
                              {selectedAction.content.customerName && (
                            <div className="flex justify-between">
                                  <span className="text-sm font-medium">From:</span>
                              <span className="text-sm">{selectedAction.content.customerName}</span>
                            </div>
                              )}
                              {selectedAction.content.customerEmail && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Email:</span>
                              <span className="text-sm">{selectedAction.content.customerEmail}</span>
                            </div>
                              )}
                              {selectedAction.content.subject && (
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Subject:</span>
                              <span className="text-sm">{selectedAction.content.subject}</span>
                            </div>
                              )}
                              {selectedAction.emailId && (
                                <div className="flex justify-between">
                                  <span className="text-sm font-medium">Email ID:</span>
                                  <span className="text-sm break-all">{selectedAction.emailId}</span>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                      </div>
                      
                      {/* Thread Summary - Enhanced to show multi-email context */}
                      {(selectedAction.threadSummary || selectedAction.content.threadSummary) && (
                      <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="text-sm font-medium">Conversation Summary</h4>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              Multiple Emails
                            </Badge>
                          </div>
                          <Card className="rounded-md shadow-sm overflow-hidden">
                          <CardContent className="p-4">
                              <div className="flex items-start gap-2 mb-2 text-xs text-muted-foreground">
                                <Mail className="h-4 w-4 mt-0.5 text-blue-400" />
                                <span>This is a summary of a multi-email conversation thread</span>
                              </div>
                              <div className="whitespace-pre-wrap text-sm font-sans">
                                {selectedAction.threadSummary || selectedAction.content.threadSummary}
                              </div>
                          </CardContent>
                        </Card>
                      </div>
                      )}
                      
                      {/* Suggested Response */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">
                            Suggested Response
                          </h4>
                          {!isEditingResponse ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="h-7 px-2 text-xs rounded-md flex items-center gap-1"
                              onClick={() => {
                                setEditedResponse(selectedAction?.response || selectedAction?.content?.suggestedResponse || "");
                                setIsEditingResponse(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-7 px-2 text-xs rounded-md"
                                onClick={() => setIsEditingResponse(false)}
                              >
                                Cancel
                              </Button>
                              <Button 
                                variant="default" 
                                size="sm"
                                className="h-7 px-2 text-xs rounded-md flex items-center gap-1 bg-gradient-to-r from-blue-500 to-orange-500"
                                onClick={saveEditedResponse}
                              >
                                <Save className="h-3 w-3" />
                                Save
                              </Button>
                            </div>
                          )}
                        </div>
                        <Card 
                          className="rounded-md shadow-sm overflow-hidden border-0" 
                          style={{
                            background: 'linear-gradient(#f9f9f9, #f9f9f9) padding-box, linear-gradient(to right, #3b82f6, #f97316) border-box',
                            border: '1px solid transparent',
                            borderRadius: '0.375rem',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1), 0 4px 12px rgba(249, 115, 22, 0.05)'
                          }}
                        >
                          <CardContent className="p-4">
                            {isEditingResponse ? (
                        <Textarea 
                                value={editedResponse}
                                onChange={(e) => setEditedResponse(e.target.value)}
                                className="min-h-[150px] w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                placeholder="Edit the suggested response..."
                              />
                            ) : (
                              <div className="whitespace-pre-wrap text-sm font-sans">
                                {selectedAction?.response || selectedAction?.content?.suggestedResponse || ""}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Email Thread */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-medium">Email Thread</h4>
                          {emailThread.loading && (
                            <div className="text-xs text-muted-foreground">Loading thread...</div>
                          )}
                        </div>
                        
                        {emailThread.loading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-24 w-full rounded-md" />
                            <Skeleton className="h-24 w-full rounded-md" />
                          </div>
                        ) : emailThread.messages.length > 0 ? (
                          <div className="space-y-4 mb-6">
                            {emailThread.messages.map((message, index) => (
                              <Card key={index} className="rounded-md shadow-sm border-gray-200">
                                <CardHeader className="pb-2 pt-3 bg-gray-50 border-b border-gray-100">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm font-medium">
                                          {message.from ? getSenderName(message.from) : "Unknown Sender"}
                                        </span>
                                      </div>
                                      {message.subject && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Subject: {message.subject}
                                        </p>
                                      )}
                      </div>
                                    <div className="text-xs text-muted-foreground">
                                      {formatEmailDate(message.date)}
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent className="pt-3 px-4">
                                  {message.body?.html ? (
                                    <div 
                                      className="text-sm email-content max-h-[200px] overflow-y-auto prose prose-sm max-w-none"
                                      dangerouslySetInnerHTML={{ __html: message.body.html }}
                                    />
                                  ) : message.body?.plain ? (
                                    <div className="text-sm whitespace-pre-line max-h-[200px] overflow-y-auto prose prose-sm">
                                      {message.body.plain}
                                    </div>
                                  ) : message.snippet ? (
                                    <div className="text-sm whitespace-pre-line">
                                      {message.snippet}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-muted-foreground italic">
                                      No message content available
                                    </div>
                                  )}
                          </CardContent>
                        </Card>
                            ))}
                            
                            {/* Visual indicator of the flow */}
                            {emailThread.messages.length > 1 && (
                              <div className="flex justify-center my-4">
                                <div className="flex flex-col items-center">
                                  <ArrowDown className="h-6 w-6 text-gray-300" />
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-8 border rounded-md bg-gray-50">
                            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-base font-medium mb-1">No email thread found</h3>
                            <p className="text-sm text-muted-foreground text-center max-w-md px-4">
                              We couldn't find the associated email thread. The email may have been deleted or is not accessible.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Reasoning Dropdown */}
                      <div className="border rounded-md overflow-hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="w-full">
                            <div className="flex items-center justify-between p-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-gray-500" />
                                <span className="font-medium">Why this was generated</span>
                              </div>
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[350px] p-0 rounded-md">
                            <div className="p-3 text-sm bg-gray-50">
                              <div className="font-medium mb-1 text-gray-800">Agent Reasoning</div>
                              <p className="text-gray-700 text-sm">
                                {selectedAction.classification?.reasoning || selectedAction.reasoning || "No reasoning provided by the agent."}
                              </p>
                            </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                  
                  {selectedAction.type === "offer" && (
                    <div className="space-y-6">
                      <Card className="rounded-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Customer:</span>
                              <span className="text-sm">{selectedAction.content.customerName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Email:</span>
                              <span className="text-sm">{selectedAction.content.customerEmail}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm font-medium">Last Purchase:</span>
                              <span className="text-sm">{formatTimeAgo(selectedAction.content.lastPurchaseDate)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-2">Purchase History:</h4>
                        <Card className="rounded-md">
                          <CardContent className="p-4">
                            <div className="space-y-4">
                              {selectedAction.content.purchaseHistory?.map((purchase: any, index: number) => (
                                <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium">{purchase.date}</span>
                                    <span className="text-green-600">${purchase.amount.toFixed(2)}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {purchase.items.join(", ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <Card className="rounded-md border-gray-200">
                        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-3">
                          <CardTitle className="text-base text-gray-800">Suggested Offer</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Discount:</span>
                            <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-none">
                              {selectedAction.content.suggestedOffer?.discountAmount}% Off
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Expires:</span>
                            <span className="text-sm">In {selectedAction.content.suggestedOffer?.expirationDays} days</span>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium mb-1">Message to Customer:</h5>
                            <p className="text-sm p-2 bg-gray-50 rounded-md border">
                              {selectedAction.content.suggestedOffer?.message}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {selectedAction.reasoning && (
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                        <p className="text-sm text-blue-700">
                            {selectedAction.reasoning}
                        </p>
                      </div>
                      )}
                    </div>
                  )}
                  
                  {selectedAction.type === "program" && (
                    <div className="space-y-6">
                      <Card className="rounded-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Program Recommendation</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-4">{selectedAction.content.analysis}</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="bg-gray-50 p-3 rounded-md border">
                              <h5 className="text-xs font-medium text-gray-500 mb-1">CUSTOMER SEGMENT</h5>
                              <p className="text-sm font-medium">{selectedAction.content.customerSegmentSize}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-md border">
                              <h5 className="text-xs font-medium text-gray-500 mb-1">AVERAGE MONTHLY SPEND</h5>
                              <p className="text-sm font-medium">{selectedAction.content.averageSpend}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="rounded-md border-gray-200">
                        <CardHeader className="bg-gray-50 border-b border-gray-100 pb-3">
                          <CardTitle className="text-base text-gray-800">
                            Recommendation Details
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <h5 className="text-sm font-medium mb-2">Qualification Criteria:</h5>
                            <p className="text-sm p-2 bg-gray-50 rounded-md border">
                              {selectedAction.content.recommendation?.qualifications}
                            </p>
                          </div>
                          
                          <div>
                            <h5 className="text-sm font-medium mb-2">Benefits:</h5>
                            <ul className="space-y-1">
                              {selectedAction.content.recommendation?.benefits?.map((benefit: string, index: number) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {selectedAction.reasoning && (
                        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                          <p className="text-sm text-blue-700">
                            {selectedAction.reasoning}
                          </p>
                            </div>
                      )}
                            </div>
                  )}
                  
                  {/* Generic display for other action types */}
                  {(selectedAction.type !== "csemail" && selectedAction.type !== "offer" && selectedAction.type !== "program") && (
                    <div className="space-y-6">
                      <Card className="rounded-md">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Agent Task Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-4">{selectedAction.description}</p>
                        </CardContent>
                      </Card>
                      
                      {selectedAction.response && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Agent Response:</h4>
                          <Textarea 
                            className="font-mono text-sm min-h-[200px]"
                            value={selectedAction.response}
                            readOnly
                          />
                        </div>
                      )}
                      
                      {selectedAction.reasoning && (
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                        <p className="text-sm text-blue-700">
                            {selectedAction.reasoning}
                        </p>
                      </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No action selected</h3>
                <p className="text-muted-foreground">
                  Select an action from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Action</DialogTitle>
            <DialogDescription>
              Please select the reason(s) for declining this agent action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={reason.id} 
                    checked={selectedReasons.includes(reason.id)}
                    onCheckedChange={() => toggleReason(reason.id)}
                  />
                  <Label htmlFor={reason.id} className="text-sm font-normal cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="otherReason" className="text-sm">Other reason (optional)</Label>
              <Textarea
                id="otherReason"
                placeholder="Please specify any other reason for declining this action..."
                className="resize-none"
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRejectDialog(false)
                setRejectingActionId(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={selectedReasons.length === 0 && !otherReason.trim()}
            >
              Decline Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 