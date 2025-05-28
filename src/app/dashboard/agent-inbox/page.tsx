"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Mail, Package, AlertCircle, CheckCircle, XCircle, ChevronDown, Star, 
  Clock, Eye, Filter, Bot, User, ArrowDown, Pencil, Save, 
  MessageSquare, Send, Loader2, Info, Check, Archive, Settings,
  InboxIcon, LinkIcon
} from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, doc, updateDoc, Timestamp, getDoc, where, onSnapshot } from "firebase/firestore"
import { useRouter } from "next/navigation"

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
  conversationSummary?: string
  emailTitle?: string
  shortSummary?: string
  isOngoingConversation?: boolean
  completedAt?: Date
}

// Add a gradient text component for Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

// Add Apple-like smooth transition styles from the notes page
const transitionStyles = `
  .document-container {
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
    will-change: background-color, border-color, transform, box-shadow;
    border-width: 1px;
    margin-bottom: 6px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }
  
  .document-container:hover {
    background-color: rgba(246, 246, 246, 0.9);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }
  
  .document-container.selected {
    background-color: rgba(239, 246, 255, 0.8);
    border-color: rgba(191, 219, 254, 1);
    box-shadow: 0 2px 4px rgba(191, 219, 254, 0.3);
  }
  
  /* Pulse animation for processing documents */
  @keyframes pulseGlow {
    0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.1); }
    70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); }
    100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
  }
  
  .processing-pulse {
    animation: pulseGlow 1.5s infinite cubic-bezier(0.66, 0, 0, 1);
  }
`;

export default function AgentInboxPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>("inbox")
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null)
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingActionId, setApprovingActionId] = useState<string | null>(null)
  const [completedActions, setCompletedActions] = useState<AgentAction[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  // New state for type filter
  const [typeFilter, setTypeFilter] = useState<string | null>(null)
  
  // Define available integrations
  const availableIntegrations = [
    { id: 'xero', name: 'Xero', description: 'Accounting and bookkeeping', logo: 'xero.png', status: 'active' },
    { id: 'square', name: 'Square', description: 'Point of sale system', logo: 'square.png', status: 'active' },
    { id: 'lightspeed', name: 'Lightspeed', description: 'Retail POS system', logo: 'lslogo.png', status: 'active' },
    { id: 'gmail', name: 'Gmail', description: 'Email communication', logo: 'gmail.png', status: 'active' },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing', logo: 'mailchimp.png', status: 'active' },
    { id: 'shopify', name: 'Shopify', description: 'E-commerce platform', logo: 'square.png', status: 'coming-soon' },
    { id: 'stripe', name: 'Stripe', description: 'Payment processing', logo: 'square.png', status: 'coming-soon' },
    { id: 'quickbooks', name: 'QuickBooks', description: 'Accounting software', logo: 'xero.png', status: 'coming-soon' },
    { id: 'hubspot', name: 'HubSpot', description: 'CRM and marketing', logo: 'mailchimp.png', status: 'coming-soon' },
    { id: 'salesforce', name: 'Salesforce', description: 'Customer relationship management', logo: 'square.png', status: 'coming-soon' },
  ]
  
  // Function to handle integration connection
  const handleIntegrationConnect = (integration: typeof availableIntegrations[0]) => {
    if (integration.status === 'active') {
      toast({
        title: `${integration.name} Connected`,
        description: `Successfully connected to ${integration.name}!`
      })
    } else {
      toast({
        title: `${integration.name}`,
        description: `${integration.name} integration coming soon!`
      })
    }
    setShowIntegrationsPopup(false)
  }
  
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
  
  // State for integrations popup
  const [showIntegrationsPopup, setShowIntegrationsPopup] = useState(false)
  
  // Track which actions have been viewed
  const [viewedActions, setViewedActions] = useState<Record<string, boolean>>({})
  
  // Add state for response editing
  const [isEditingResponse, setIsEditingResponse] = useState(false)
  const [editedResponse, setEditedResponse] = useState("")

  // New useEffect to handle textarea resize
  useEffect(() => {
    if (isEditingResponse && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.max(200, textarea.scrollHeight)}px`;
    }
  }, [isEditingResponse, editedResponse]);

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
        setCompletedActions([])
        setLoading(false)
        return
      }
      
      console.log(`Found ${snapshot.size} agent inbox tasks`)
      const actions: AgentAction[] = []
      const completed: AgentAction[] = []
      
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
          conversationSummary: data.conversationSummary || null,
          emailTitle: data.emailTitle || null,
          shortSummary: data.shortSummary || null,
          isOngoingConversation: data.isOngoingConversation || false,
          completedAt: data.completedAt?.toDate() || data.updatedAt?.toDate() || null,
          rejectionReason: data.rejectionReason || [],
          rejectionComment: data.rejectionComment || "",
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
        
        // Sort actions based on status
        if (data.status === "approved" || data.status === "rejected") {
          completed.push(action)
        } else {
          actions.push(action)
        }
      })
      
      setPendingActions(actions)
      setCompletedActions(completed)
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

  // Filter actions based on active tab and type filter
  const filteredActions = pendingActions.filter(action => {
    // Only show actions with status "new"
    if (action.status !== "new") return false
    
    // Apply type filter if set
    if (typeFilter && action.type !== typeFilter) return false
    
    if (activeTab === "inbox") return true
    return false
  })

  // Handle action approval
  const handleApprove = async (actionId: string) => {
    if (!user) return
    
    try {
      // Set loading state for this specific action
      setApprovingActionId(actionId)
      
      const action = pendingActions.find(a => a.id === actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      // Update in Firestore
      const actionRef = doc(db, `merchants/${user.uid}/agentinbox/${actionId}`)
      await updateDoc(actionRef, {
        status: "approved",
        updatedAt: Timestamp.now()
      })
      
      // If this is an email response, send the email directly
      if (action.type === "csemail" && action.emailId) {
        try {
          const response = action.response || action.content?.suggestedResponse || "";
          const subject = action.subject || `Re: ${action.content?.subject || 'Your inquiry'}`;
          
          // Get the merchant's store name from Firestore
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
          
          // Use our custom Gmail reply endpoint that bypasses Mailchimp
          const result = await fetch('/api/email/gmail-reply', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user.uid,
              emailId: action.emailId,
              response: response,
              subject: subject,
              fromName: businessName
            }),
          });
          
          if (!result.ok) {
            const errorData = await result.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to send email: ${result.status}`);
          }
          
          const data = await result.json().catch(() => ({}));
          
          // Log the sent email in Firestore
          if (data.messageId) {
            await updateDoc(actionRef, {
              sentEmailId: data.messageId,
              sentEmailThreadId: data.threadId,
              sentAt: Timestamp.now(),
              sentBy: user.uid
            });
          }
          
          toast({
            title: "Email Sent",
            description: "Your response has been sent to the customer.",
            variant: "default",
          });
        } catch (error) {
          console.error("Error sending email:", error);
          toast({
            title: "Error Sending Email",
            description: "The action was approved but we couldn't send the email. Please try again.",
            variant: "destructive",
          });
          
          // Reset loading state if the email sending fails
          setApprovingActionId(null);
          return;
        }
      }
      
      // Move to completed section - update both states
      setPendingActions(prev => 
        prev.filter(action => action.id !== actionId)
      );
      
      // Add to completed actions with current timestamp
      const completedAction: AgentAction = {
        ...action,
        status: "approved",
        completedAt: new Date()
      };
      setCompletedActions(prev => [completedAction, ...prev]);
      
      // If this was the selected action, clear the selection
      if (selectedAction?.id === actionId) {
        setSelectedAction(null);
      }
      
      toast({
        title: "Action Approved",
        description: "The agent action has been completed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error approving agent action:", error);
      toast({
        title: "Error",
        description: "Failed to approve the action. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Clear loading state
      setApprovingActionId(null);
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
    <div className="h-screen flex flex-col bg-white">
      <style dangerouslySetInnerHTML={{ __html: transitionStyles }} />
      <div className="flex-1 flex min-h-0 h-[calc(100vh-5rem)]">
        {/* Left Column - Agent Requests List */}
        <div className="w-full lg:w-[45%] 2xl:w-[40%] border-r flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* GitHub-style pill navigation */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
                <button
                  onClick={() => setActiveTab("inbox")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "inbox"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                >
                  <InboxIcon className="h-4 w-4" />
                  <span>Inbox</span>
                  {pendingActions.filter(a => a.status === "new").length > 0 && (
                    <Badge 
                      variant="outline" 
                      className="bg-blue-50 text-blue-600 border-blue-200 rounded-full h-5 min-w-[20px] ml-1 flex items-center justify-center px-1"
                    >
                      {pendingActions.filter(a => a.status === "new").length}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("completed")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "completed"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                >
                  <Archive className="h-4 w-4" />
                  <span>Completed</span>
                </button>
              </div>
              
              {/* Type Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="rounded-md flex items-center h-8 bg-white border-gray-200 text-gray-700 gap-1.5"
                  >
                    <Filter className="h-3.5 w-3.5" />
                    <span className="text-xs">
                      {typeFilter ? 
                        typeFilter === "csemail" ? "Email" : 
                        typeFilter === "offer" ? "Offers" : 
                        typeFilter === "program" ? "Programs" : "Filter" 
                        : "Filter"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-md">
                  <DropdownMenuItem onClick={() => setTypeFilter(null)} className="cursor-pointer">
                    All types
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter("csemail")} className="cursor-pointer flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>Email</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("offer")} className="cursor-pointer flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    <span>Offers</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter("program")} className="cursor-pointer flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-500" />
                    <span>Programs</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
      
          <div className="flex-grow overflow-y-auto h-full min-h-0 scrollbar-thin bg-white">
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
            `}</style>
            
            {loading ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 p-4 border rounded-md">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === "completed" ? (
              // Completed actions view
              completedActions.length > 0 ? (
                <div className="py-2">
                  {completedActions.map((action) => (
                    <div 
                      key={action.id}
                      className={cn(
                        "p-3 cursor-pointer border bg-white rounded-md document-container transition-colors mx-2 my-2",
                        selectedAction?.id === action.id ? "selected border-blue-300 shadow-sm" : "border-gray-200",
                        action.status === "approved" ? "border-l-4 border-l-green-400" : "border-l-4 border-l-red-400"
                      )}
                      onClick={() => viewActionDetails(action)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {action.status === "approved" ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {action.emailTitle || action.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {action.shortSummary || action.description}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 rounded-full",
                                action.status === "approved" 
                                  ? "bg-green-50 text-green-600 border-green-100" 
                                  : "bg-red-50 text-red-600 border-red-100"
                              )}
                            >
                              {action.status === "approved" ? "Approved" : "Declined"}
                            </Badge>
                            
                            <Badge 
                              variant="outline" 
                              className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0 h-4 rounded-full flex items-center gap-1"
                            >
                              <Bot className="h-2 w-2" />
                              <span>
                                {action.agent === "customer-service" ? "CS Agent" : 
                                 action.agent === "marketing" ? "Marketing" : 
                                 action.agent === "loyalty" ? "Loyalty" : "AI Agent"}
                              </span>
                            </Badge>
                            
                            <span className="text-[10px] text-gray-400">
                              {action.completedAt ? formatTimeAgo(action.completedAt) : formatTimeAgo(action.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="bg-gray-50 rounded-full p-6 mb-4">
                    <Archive className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No completed actions</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Actions will appear here once you've approved them.
                  </p>
                </div>
              )
            ) : filteredActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="bg-gray-50 rounded-full p-6 mb-4">
                  <Clock className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No pending actions</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  There are no pending agent actions that match your current filter. Check back later or try a different filter.
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredActions.map((action) => (
                  <div 
                    key={action.id}
                    className={cn(
                      "p-3 cursor-pointer border bg-white rounded-md document-container transition-colors mx-2 my-2",
                      selectedAction?.id === action.id ? "selected border-blue-300 shadow-sm" : "border-gray-200",
                      action.type === "csemail" ? "border-l-4 border-l-blue-400" : 
                      action.type === "offer" ? "border-l-4 border-l-purple-400" : 
                      action.type === "program" ? "border-l-4 border-l-amber-400" : "border-l-4 border-l-gray-400",
                      approvingActionId === action.id ? "processing-pulse" : "",
                      !viewedActions[action.id] && "bg-gray-50"
                    )}
                    onClick={() => viewActionDetails(action)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {action.type === "csemail" ? (
                          <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        ) : action.type === "offer" ? (
                          <Package className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        ) : action.type === "program" ? (
                          <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Bot className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {action.emailTitle || action.title}
                        </h3>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {action.shortSummary || action.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-4 rounded-full",
                              getPriorityColor(action.priority)
                            )}
                          >
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </Badge>
                          
                          <Badge 
                            variant="outline" 
                            className="bg-gray-50 text-gray-600 border-gray-200 text-[10px] px-1.5 py-0 h-4 rounded-full flex items-center gap-1"
                          >
                            <Bot className="h-2 w-2" />
                            <span>
                              {action.agent === "customer-service" ? "CS Agent" : 
                               action.agent === "marketing" ? "Marketing" : 
                               action.agent === "loyalty" ? "Loyalty" : "AI Agent"}
                            </span>
                          </Badge>
                          
                          {action.isOngoingConversation && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 text-[10px] rounded-full px-1.5 py-0 h-4">
                              Thread
                            </Badge>
                          )}
                          
                          <span className="text-[10px] text-gray-400">
                            {formatTimeAgo(action.timestamp)}
                          </span>
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
        <div className="hidden lg:flex lg:w-[55%] 2xl:w-[60%] flex-col h-full min-h-0 bg-white">
          {selectedAction ? (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    {getActionIcon(selectedAction.type)}
                    <h2 className="text-lg font-medium">
                      {selectedAction.title}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                    {getAgentName(selectedAction.agent)} • {formatTimeAgo(selectedAction.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAction.status === "approved" ? (
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="h-9 gap-1 rounded-md bg-green-50 text-green-600 hover:text-green-700 hover:bg-green-100 border-green-100"
                      disabled={true}
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Completed</span>
                    </Button>
                  ) : (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-9 gap-1 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
                        onClick={() => openRejectDialog(selectedAction.id)}
                        disabled={selectedAction.status !== "new" || approvingActionId === selectedAction.id}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Decline</span>
                      </Button>
                      <Button 
                        size="sm"
                        className="h-9 gap-1 rounded-md"
                        onClick={() => handleApprove(selectedAction.id)}
                        disabled={selectedAction.status !== "new" || approvingActionId === selectedAction.id}
                      >
                        {approvingActionId === selectedAction.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve</span>
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto scrollbar-thin p-6">
                {/* Selected action content based on type */}
                {selectedAction.type === "csemail" && (
                  <div className="space-y-6">
                    {/* Email Information Card */}
                    <div>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-600" />
                        Email Information
                      </h4>
                      <Card className="rounded-md shadow-sm overflow-hidden border-gray-200">
                        <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                          {selectedAction.content.customerName && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-xs mb-1">From:</span>
                              <span className="font-medium">{selectedAction.content.customerName}</span>
                            </div>
                          )}
                          {selectedAction.content.customerEmail && (
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-xs mb-1">Email:</span>
                              <span className="font-medium">{selectedAction.content.customerEmail}</span>
                            </div>
                          )}
                          {selectedAction.content.subject && (
                            <div className="flex flex-col col-span-2">
                              <span className="text-muted-foreground text-xs mb-1">Subject:</span>
                              <span className="font-medium">{selectedAction.content.subject}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Thread/Conversation Summary Card */}
                    {(selectedAction.threadSummary || selectedAction.content.threadSummary || 
                      selectedAction.conversationSummary || selectedAction.content.conversationSummary) && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-medium flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              Conversation Summary
                            </h4>
                            {(selectedAction.threadSummary || selectedAction.content.threadSummary) && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs rounded-md">
                                Thread
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Card className="rounded-md shadow-sm overflow-hidden border-gray-200">
                          <CardContent className="p-4">
                            <div className="whitespace-pre-wrap text-sm font-sans">
                              {selectedAction.threadSummary || 
                               selectedAction.content.threadSummary || 
                               selectedAction.conversationSummary || 
                               selectedAction.content.conversationSummary}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {/* Suggested Response Card */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                          <Send className="h-4 w-4 text-blue-600" />
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
                              className="h-7 px-2 text-xs rounded-md flex items-center gap-1"
                              onClick={saveEditedResponse}
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                      <Card 
                        className="rounded-md shadow-sm overflow-hidden bg-gray-50 border border-gray-200" 
                      >
                        <CardContent className="p-4">
                          {isEditingResponse ? (
                            <Textarea 
                              ref={textareaRef}
                              value={editedResponse}
                              onChange={(e) => setEditedResponse(e.target.value)}
                              className="min-h-[200px] w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md resize-none"
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
                    
                    {/* Email Thread Section */}
                    {(emailThread.messages.length > 0 || emailThread.loading) && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            Email Thread
                          </h4>
                          {emailThread.loading && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading...
                            </div>
                          )}
                        </div>
                        
                        {emailThread.loading ? (
                          <div className="space-y-4">
                            <Skeleton className="h-24 w-full rounded-md" />
                            <Skeleton className="h-24 w-full rounded-md" />
                          </div>
                        ) : emailThread.messages.length > 0 ? (
                          <div className="space-y-4">
                            {emailThread.messages.map((message, index) => (
                              <Card key={index} className="rounded-md shadow-sm border-gray-200 overflow-hidden">
                                <CardHeader className="py-3 px-4 bg-gray-50 border-b border-gray-100">
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
                                <CardContent className="p-4">
                                  <div className="max-h-[250px] overflow-y-auto rounded-md scrollbar-thin">
                                    {message.body?.html ? (
                                      <div 
                                        className="text-sm email-content prose prose-sm max-w-none"
                                        dangerouslySetInnerHTML={{ __html: message.body.html }}
                                      />
                                    ) : message.body?.plain ? (
                                      <div className="text-sm whitespace-pre-line prose prose-sm">
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
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                            
                            {/* Visual indicator of the flow */}
                            {emailThread.messages.length > 1 && (
                              <div className="flex justify-center my-2 text-gray-300">
                                <ArrowDown className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    )}
                    
                    {/* Agent Reasoning Collapsible */}
                    <div className="rounded-md overflow-hidden border">
                      <Collapsible>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 text-sm hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-blue-500" />
                              <span className="font-medium">Agent reasoning</span>
                            </div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="p-4 text-sm bg-gray-50 border-t">
                            <p className="text-muted-foreground">
                              {selectedAction.classification?.reasoning || selectedAction.reasoning || "No reasoning provided by the agent."}
                            </p>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </div>
                )}
                
                {/* Display for other action types would be here */}
                {/* ... keep existing code for other action types ... */}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-gray-100 rounded-full p-6 mb-6">
                <Bot className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">No action selected</h3>
              <p className="text-muted-foreground max-w-md">
                Select an action from the list to view its details and take appropriate action.
              </p>
              <p className="text-xs text-muted-foreground mt-6 max-w-sm">
                The Agent Inbox contains all actions proposed by your AI agents that need your review and approval.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle>Decline Action</DialogTitle>
            <DialogDescription>
              Please select the reason(s) for declining this agent action.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              {REJECTION_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2 py-1">
                  <Checkbox 
                    id={reason.id} 
                    checked={selectedReasons.includes(reason.id)}
                    onCheckedChange={() => toggleReason(reason.id)}
                    className="rounded-sm"
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
                className="resize-none rounded-md"
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
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={selectedReasons.length === 0 && !otherReason.trim()}
              className="rounded-md"
            >
              Decline Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integrations Dialog */}
      <Dialog open={showIntegrationsPopup} onOpenChange={setShowIntegrationsPopup}>
        <DialogContent className="max-w-xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Available Integrations</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            {availableIntegrations.map((integration) => (
              <div key={integration.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                    <img
                      src={`/${integration.logo}`}
                      alt={integration.name}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{integration.name}</h3>
                    <p className="text-xs text-gray-600">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={integration.status === 'active' ? 'default' : 'outline'}
                    disabled={integration.status === 'coming-soon'}
                    onClick={() => handleIntegrationConnect(integration)}
                    className="rounded-md text-xs px-3 py-1"
                  >
                    {integration.status === 'active' ? 'Connect' : 'Coming Soon'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 