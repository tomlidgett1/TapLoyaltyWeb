"use client"

import { SideNav } from "@/components/side-nav"
import { usePathname } from "next/navigation"
import { Bell, Search, Command, FileText, Check, X, ChevronDown, Sparkles, Award, Gift, PlusCircle, Image, MessageSquare, Zap, ShoppingCart, Coffee, Bot, BarChart, Target, Lightbulb, Brain, Cpu, Mic, Menu, Pencil, Loader2, ExternalLink, Plug, PanelRight, Send, Activity, Clock, Wrench, Code, Layers } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { TapAiButton } from "@/components/tap-ai-button"
import Link from "next/link"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreateRewardSheet } from "@/components/create-reward-sheet"
import { CreatePointsRuleSheet } from "@/components/create-points-rule-sheet"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import NextImage from "next/image"
import { collection, query, where, getDocs, Timestamp, orderBy, limit, getDoc, doc, onSnapshot, addDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { setDoc, writeBatch } from "firebase/firestore"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SendBroadcastSheet } from "@/components/send-broadcast-sheet"
import { IntroductoryRewardSheet } from "@/components/introductory-reward-sheet"
import { TapAgentSheet } from "@/components/tap-agent-sheet"
import { getFunctions, httpsCallable, HttpsCallableResult } from "firebase/functions"
import { useToast } from "@/components/ui/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { TypeAnimation } from 'react-type-animation'
import { motion, AnimatePresence } from 'framer-motion'
import { useMerchant } from "@/hooks/use-merchant"
import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from '@/components/ui/kibo-ui/ai/input'
import { AIResponse } from '@/components/ui/kibo-ui/ai/response'

// Streaming Markdown Component using kibo-ui AIResponse
const StreamingMarkdown = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.slice(0, currentIndex + 1))
        setCurrentIndex(prev => prev + 1)
      }, 20) // Adjust speed as needed (20ms = 50 chars/second)
      
      return () => clearTimeout(timer)
    }
  }, [text, currentIndex])
  
  // Reset when text changes (new message)
  useEffect(() => {
    setCurrentIndex(0)
    setDisplayText('')
  }, [text])
  
  return (
    <div className="relative">
      <AIResponse className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-800">
        {displayText}
      </AIResponse>
      {currentIndex < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </div>
  )
}

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
  
  /* Agent Notification Gradient Text */
  .agent-notification-gradient {
    background: linear-gradient(to right, #3b82f6, #f97316);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-weight: 600;
  }
  /* Hide scrollbars for sidebar */
  .hide-scrollbar {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none;  /* IE 10+ */
    overflow: hidden !important;
  }
  .hide-scrollbar::-webkit-scrollbar {
    display: none; /* Chrome/Safari/Webkit */
  }
  
  /* Visible scrollbar for main content */
  .main-content-scrollbar::-webkit-scrollbar {
    width: 0px;
    background: transparent;
  }
  .main-content-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .main-content-scrollbar::-webkit-scrollbar-thumb {
    background: transparent;
  }
  .main-content-scrollbar::-webkit-scrollbar-thumb:hover {
    background: transparent;
  }
  .main-content-scrollbar {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
`;

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

interface RewardConfig {
  id: string
  name: string
  type: string
  industry: string
  isNewCustomer: boolean
  pointsCost: number
  description: string
  rewardName?: string
  conditions?: any[]
  limitations?: any[]
  programtype?: string
  voucherAmount?: number
  coffeeConfig?: {
    pin: string
    freeRewardTiming: 'before' | 'after'
    frequency: number
    levels: number
  }
}

// Add this interface near the top of the file with the other interfaces
interface ProcessThoughtResult {
  title?: string;
  summary?: string;
  tags?: string[];
  status?: string;
  reason?: string;
  areaTitle?: string;
  categoryTitle?: string;
  [key: string]: any; // Allow for other properties
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const router = useRouter()
  
  const [selectedRewards, setSelectedRewards] = useState<RewardConfig[]>([])
  const [showRewardDetails, setShowRewardDetails] = useState(false)
  
  // Add state for onboarding detection
  const [isOnboarding, setIsOnboarding] = useState(false)
  
  // Add state for each dialog
  const [showBannerDialog, setShowBannerDialog] = useState(false)
  const [showRewardDialog, setShowRewardDialog] = useState(false)
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false)
  const [showPointsRuleDialog, setShowPointsRuleDialog] = useState(false)
  
  // Add state for the recurring reward dialog
  const [showRecurringRewardDialog, setShowRecurringRewardDialog] = useState(false)
  
  // Add these states for the metrics
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    totalRedemptions: 0
  })
  const [metricsLoading, setMetricsLoading] = useState(true)
  const { user } = useAuth()
  const { merchant } = useMerchant()
  
  // Add state for the competitor analysis sheet
  const [showCompetitorAnalysis, setShowCompetitorAnalysis] = useState(false)
  const [competitorAnalysisLoading, setCompetitorAnalysisLoading] = useState(false)
  const [competitorAnalysisResults, setCompetitorAnalysisResults] = useState<any>(null)
  
  // Add state for sales activity analysis
  const [showSalesAnalysis, setShowSalesAnalysis] = useState(false)
  const [salesAnalysisLoading, setSalesAnalysisLoading] = useState(false)
  const [salesAnalysisResults, setSalesAnalysisResults] = useState<any>(null)
  
  // Add state for random reward generation
  const [showRewardGenerator, setShowRewardGenerator] = useState(false)
  const [rewardGeneratorLoading, setRewardGeneratorLoading] = useState(false)
  const [generatedReward, setGeneratedReward] = useState<any>(null)
  
  const [showIntroRewardSheet, setShowIntroRewardSheet] = useState(false)
  
  // Add state for TapAgentSheet
  const [showTapAgentSheet, setShowTapAgentSheet] = useState(false)
  
  const [recording, setRecording] = useState(false)
  const [audioProcessing, setAudioProcessing] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  
  // Add state for quick note dropdown and input
  const [quickNoteOpen, setQuickNoteOpen] = useState(false)
  const [showQuickNoteInput, setShowQuickNoteInput] = useState(false)
  const [quickNoteText, setQuickNoteText] = useState("")
  const [isSavingQuickNote, setIsSavingQuickNote] = useState(false)
  const quickNoteInputRef = useRef<HTMLTextAreaElement | null>(null)
  const quickNoteContainerRef = useRef<HTMLDivElement | null>(null)
  
  const { toast } = useToast()
  
  // Add state for mobile navigation
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  
  // Add search placeholder rotations
  const searchPlaceholders = [
    "Tell me about my sales over the last 24 hours?",
    "Create me a reward for new customers only",
    "Analyse my top-performing products this month",
    "How many new customers signed up yesterday?",
    "What's my best-selling coffee this week?",
    "Show me customer retention stats for loyalty members",
    "Draft an email campaign for inactive customers",
    "Compare sales to this time last month"
  ]
  
  // Add state to track search box focus
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  // Add state to track if animation should be shown (initially true)
  const [showAnimation, setShowAnimation] = useState(true)
  // Add search state
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchPopup, setShowSearchPopup] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const searchPopupRef = useRef<HTMLDivElement>(null)
  
  // Add effect to stop animation after 60 seconds
  useEffect(() => {
    // Only set up timer if animation is showing
    if (showAnimation) {
      const timer = setTimeout(() => {
        setShowAnimation(false);
      }, 60000); // 60 seconds
      
      // Clean up timer on unmount
      return () => clearTimeout(timer);
    }
  }, [showAnimation]);
  
  // Add click outside handler for search popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchPopupRef.current && 
        !searchPopupRef.current.contains(event.target as Node) &&
        showSearchPopup
      ) {
        setShowSearchPopup(false)
        setSearchQuery('')
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSearchPopup])
  
  // Add search handler function
  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    
    // Open chat panel if not already open
    if (!showChatbotPanel) {
      setShowChatbotPanel(true)
    }
    
    // Ensure we have a conversation ID
    let currentConversationId = conversationId
    if (!currentConversationId) {
      currentConversationId = await createNewConversation()
      setConversationId(currentConversationId)
    }
    
    // Clear search first
    setSearchQuery('')
    
    // Set the user input to the query and add it to chat messages
    setUserInput(query.trim())
    setChatMessages(prev => [...prev, {role: 'user', content: query.trim()}])
    
    // Wait a moment for the chat panel to open and state to update, then send the message
    setTimeout(() => {
      // Manually trigger the send message logic since handleSendMessage expects userInput to be set
      if (currentConversationId) {
        handleSendMessageWithQuery(query.trim(), currentConversationId)
      }
    }, 150)
  }
  
  // Helper function to send message with a specific query
  const handleSendMessageWithQuery = async (query: string, currentConversationId: string) => {
    // Clear previous responses and streaming state
    setToolResponse(null)
    setStreamingStatus('')
    setStreamingStep('')
    setStreamingSteps([])
    setStreamingProgress(null)
    setShowTypewriter(false)
    setTypewriterText('')
    
    // Clear the user input since we've already added the message to chat
    setUserInput('')
    
    // Start streaming
    setIsStreaming(true)
    setIsTyping(true)
    
    try {
      // Prepare the request payload
      const merchantId = user?.uid
      console.log('Starting SSE stream for:', { merchantId, conversationId: currentConversationId, userPrompt: query })
      
      const payload = {
        prompt: query,
        merchantId: merchantId || 'default',
        apps: [],
        params: {},
        entityId: merchantId || 'default',
        conversationId: currentConversationId,
        stream: 'true'
      }
      
      // Create SSE connection
      const functionUrl = 'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/processMultiStepRequest';
      
      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      console.log('Making request to:', functionUrl)
      console.log('Request method: POST')
      console.log('Request payload:', payload)
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload)
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('HTTP error response:', errorText)
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`)
      }
      
      // Check if response is actually SSE
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream')) {
        // Fallback to regular JSON response
        const result = await response.json()
        console.log('Received regular JSON response:', result)
        setToolResponse(result)
        
        if (result && result.text) {
          setChatMessages(prev => [...prev, {role: 'assistant', content: result.text}])
        }
        return
      }
      
      // Handle SSE stream - same logic as handleSendMessage
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Failed to get response reader')
      }
      
      let buffer = ''
      let finalResponse = null
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('SSE stream completed')
          break
        }
        
        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            
            if (data === '[DONE]') {
              console.log('Stream completed with [DONE]')
              break
            }
            
            try {
              if (!data || data.trim() === '') {
                continue
              }
              
              const parsed = JSON.parse(data)
              console.log('SSE Event:', parsed)
              
              if (!parsed || typeof parsed !== 'object') {
                console.warn('Invalid SSE event structure:', parsed)
                continue
              }
              
              // Handle different event types
              switch (parsed.type) {
                case 'status':
                  if (parsed.data && parsed.data.message) {
                    setStreamingStatus(parsed.data.message)
                  }
                  break
                  
                case 'tool_selected':
                  if (parsed.data && parsed.data.tool) {
                    setChatMessages(prev => [...prev, {
                      role: 'tool_selection', 
                      content: '', 
                      toolNames: [parsed.data.toolDisplayName || parsed.data.tool],
                      toolCompleted: false,
                      toolId: parsed.data.id
                    }])
                    setStreamingStatus(parsed.data.message || `Using ${parsed.data.toolDisplayName || parsed.data.tool}`)
                  }
                  break
                  
                case 'tool_complete':
                  if (parsed.data && parsed.data.tool) {
                    setChatMessages(prev => {
                      const messages = [...prev]
                      for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'tool_selection' && 
                            messages[i].toolNames?.includes(parsed.data.toolDisplayName || parsed.data.tool)) {
                          messages[i] = { 
                            ...messages[i], 
                            toolCompleted: true,
                            toolSuccess: true
                          }
                          break
                        }
                      }
                      return messages
                    })
                    setStreamingStatus(`✅ ${parsed.data.message}`)
                  }
                  break
                  
                case 'ai_message_chunk':
                  if (parsed.data && parsed.data.delta) {
                    setTypewriterText(prev => prev + parsed.data.delta)
                    if (!showTypewriter) {
                      setShowTypewriter(true)
                    }
                  }
                  break
                  
                case 'ai_message':
                  if (parsed.data && parsed.data.message) {
                    setChatMessages(prev => [...prev, {
                      role: 'assistant', 
                      content: parsed.data.message
                    }])
                  }
                  break
                  
                case 'done':
                  finalResponse = parsed.data
                  setStreamingStatus('✅ Task completed!')
                  break
                  
                case 'error':
                  setStreamingStatus(`❌ ${parsed.data.message}`)
                  setChatMessages(prev => [...prev, {
                    role: 'assistant', 
                    content: `Sorry, I encountered an error: ${parsed.data.message}`
                  }])
                  break
                  
                default:
                  console.log('Unknown SSE event type:', parsed.type, parsed.data)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', {
                rawData: data,
                dataLength: data?.length,
                error: e instanceof Error ? e.message : String(e),
                errorType: typeof e
              })
            }
          }
        }
      }
      
      // Process final response
      if (finalResponse) {
        console.log('Final response received:', finalResponse)
        setToolResponse(finalResponse)
        
        if (finalResponse.text) {
          setChatMessages(prev => [...prev, {role: 'assistant', content: finalResponse.text}])
        }
      }
      
    } catch (error) {
      console.error('Error in SSE streaming:', error)
      
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      setStreamingStatus(`❌ Error: ${errorMessage}`)
      setChatMessages(prev => [...prev, {
        role: 'assistant', 
        content: `Sorry, I encountered an error while processing your request: ${errorMessage}\n\nPlease try again.`
      }])
    } finally {
      setIsStreaming(false)
      setIsTyping(false)
      
      // Clean up streaming state after a delay
      setTimeout(() => {
        setStreamingStatus('')
        setStreamingStep('')
        setStreamingProgress(null)
      }, 3000)
    }
  }
  
  useEffect(() => {
    // Check if current path is onboarding
    setIsOnboarding(pathname?.includes('/onboarding') || false)
    
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: "1",
        message: "New customer sign up",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        type: "INFO"
      },
      {
        id: "2",
        message: "Reward redeemed",
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        read: false,
        type: "REWARD_REDEEMED"
      },
      {
        id: "3",
        message: "Points rule update",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        type: "WARNING"
      },
      {
        id: "4",
        message: "Integration connected",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true,
        type: "POINTS_AWARDED"
      }
    ]
    
    setNotifications(mockNotifications)
    setUnreadCount(mockNotifications.filter(n => !n.read).length)
    
    // Mock selected rewards data
    const mockSelectedRewards: RewardConfig[] = [
      {
        id: "cafe-program",
        name: "Traditional Coffee Program",
        type: "program",
        industry: "cafe",
        isNewCustomer: false,
        pointsCost: 0,
        description: "Loyalty program with multiple rewards",
        rewardName: "Traditional Coffee Program",
        programtype: "coffee",
        coffeeConfig: {
          pin: "1234",
          freeRewardTiming: "after",
          frequency: 5,
          levels: 10
        }
      },
      {
        id: "cafe-individual",
        name: "Free Coffee",
        type: "individual",
        industry: "cafe",
        isNewCustomer: true,
        pointsCost: 100,
        description: "Reward for loyal customers",
        rewardName: "Free Coffee"
      }
    ]
    
    setSelectedRewards(mockSelectedRewards)
  }, [pathname])

  // Add this useEffect to fetch the metrics
  useEffect(() => {
    const fetchTodayMetrics = async () => {
      if (!user?.uid) return
      
      try {
        setMetricsLoading(true)
        
        // Get today's start and end
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        // Fetch today's transactions
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(
          transactionsRef,
          where('createdAt', '>=', today),
          where('createdAt', '<', tomorrow)
        )
        
        // Fetch today's redemptions
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
          where('merchantId', '==', user.uid),
          where('redemptionDate', '>=', today),
          where('redemptionDate', '<', tomorrow)
        )
        
        const [transactionsSnapshot, redemptionsSnapshot] = await Promise.all([
          getDocs(transactionsQuery),
          getDocs(redemptionsQuery)
        ])
        
        setMetrics({
          totalTransactions: transactionsSnapshot.docs.length,
          totalRedemptions: redemptionsSnapshot.docs.length
        })
      } catch (error) {
        console.error('Error fetching today metrics:', error)
      } finally {
        setMetricsLoading(false)
      }
    }
    
    if (user?.uid && !isOnboarding) {
      fetchTodayMetrics()
    }
  }, [user?.uid, isOnboarding])

  // Add useEffect to fetch notifications from Firestore
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.uid || isOnboarding) return
      
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
            idSuffix: data.idSuffix,
            dateCreated: data.dateCreated?.toDate(),
            timestamp: data.dateCreated?.toDate() || new Date(),
            read: data.read || false
          }
        })

        // Fetch customer data for all notifications that have a customerId
        const customerIds = notificationsData
          .filter(n => n.customerId)
          .map(n => n.customerId as string);
        
        // Create a map to hold customer data
        const customerData: Record<string, { fullName?: string, profilePictureUrl?: string }> = {};
        
        // Only fetch customer data if there are customerIds
        if (customerIds.length > 0) {
          // Fetch customer data in parallel
          await Promise.all(
            customerIds.map(async (customerId) => {
              try {
                // Go to top-level customers collection and get the customer document
                const customerDoc = await getDoc(doc(db, 'customers', customerId));
                if (customerDoc.exists()) {
                  const data = customerDoc.data();
                  
                  // Extract fullName as the primary identifier 
                  let customerName = data.fullName || null;
                  
                  // If no fullName, try to construct it from firstName and lastName
                  if (!customerName && (data.firstName || data.lastName)) {
                    customerName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
                  }
                  
                  // If still no name, try alternative name fields
                  if (!customerName) {
                    customerName = data.name || data.nickname || data.displayName;
                  }
                  
                  // Never use tier values as names - if we detect a tier value or have no name, use a generic customer ID
                  if (!customerName || customerName.toLowerCase() === 'bronze' || customerName.toLowerCase() === 'silver' 
                      || customerName.toLowerCase() === 'gold' || customerName.toLowerCase() === 'platinum') {
                    customerName = `Customer ${customerId.substring(0, 4)}`;
                  }
                  
                  // Handle profile picture following memory rules
                  let profilePictureUrl = null;
                  console.log(`Customer ${customerId} data:`, {
                    shareProfileWithMerchants: data.shareProfileWithMerchants,
                    profilePictureUrl: data.profilePictureUrl
                  });
                  
                  if (data.shareProfileWithMerchants === true && data.profilePictureUrl) {
                    profilePictureUrl = data.profilePictureUrl;
                    console.log(`Setting profile picture for customer ${customerId}:`, profilePictureUrl);
                  }
                  
                  customerData[customerId] = { 
                    fullName: customerName,
                    profilePictureUrl: profilePictureUrl
                  };
                }
              } catch (error) {
                console.error(`Error fetching customer ${customerId}:`, error);
              }
            })
          );
        }
        
        // Attach customer names and profile pictures to the notifications
        const notificationsWithCustomerNames = notificationsData.map(notification => {
          if (notification.customerId && customerData[notification.customerId]) {
            const customerInfo = customerData[notification.customerId];
            console.log(`Attaching customer data for notification ${notification.id}:`, {
              customerId: notification.customerId,
              customerFullName: customerInfo.fullName,
              customerProfilePictureUrl: customerInfo.profilePictureUrl
            });
            
            return {
              ...notification,
              customerFullName: customerInfo.fullName,
              customerProfilePictureUrl: customerInfo.profilePictureUrl
            };
          }
          return notification;
        });
        
        setNotifications(notificationsWithCustomerNames);
        setUnreadCount(notificationsWithCustomerNames.filter(n => !n.read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error)
        // Set fallback notifications if there's an error
        const fallbackNotifications: Notification[] = [
          {
            id: "fallback-1",
            message: "Welcome to your loyalty dashboard",
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
  }, [user?.uid, isOnboarding])

  // Add listener for agent inbox notifications
  useEffect(() => {
    if (!user?.uid || isOnboarding) return

    // Track if this is the initial snapshot to avoid showing notifications for existing documents
    let isInitialSnapshot = true

    // Set up real-time listener for agent inbox
    const agentInboxRef = collection(db, 'merchants', user.uid, 'agentinbox')
    const agentInboxQuery = query(
      agentInboxRef,
      orderBy('createdAt', 'desc'),
      limit(10)
    )

    const unsubscribe = onSnapshot(agentInboxQuery, (snapshot) => {
      // Check for added documents
      const addedDocs = snapshot.docChanges().filter(change => change.type === 'added')
      
      if (addedDocs.length > 0 && !isInitialSnapshot) {
        // Only process if not the initial load
        // Create a notification for each new agent inbox item
        addedDocs.forEach(change => {
          const docData = change.doc.data()
          const actionType = docData.type || 'task'
          let actionDescription = 'new task'
          
          if (docData.type === 'csemail') {
            actionDescription = 'email response'
          } else if (docData.type === 'offer') {
            actionDescription = 'discount offer'
          } else if (docData.type === 'program') {
            actionDescription = 'program recommendation'
          }
          
          // Show toast notification with blue-orange gradient title
          toast({
            title: "Agent Notification",
            description: `New ${actionDescription} requires your approval`,
            variant: "default",
            action: (
              <Button 
                onClick={() => router.push('/dashboard/agent-inbox')}
                variant="outline" 
                className="h-8 gap-1.5 rounded-md"
                size="sm"
              >
                View
              </Button>
            )
          })
          
          // Add to notifications array with proper styling
          const newNotification: Notification = {
            id: change.doc.id,
            message: `New ${actionDescription} requires your approval`,
            type: "AGENT_ACTION",
            timestamp: docData.createdAt?.toDate() || new Date(),
            read: false
          }
          
          setNotifications(prev => [newNotification, ...prev])
        })
        
        // Update unread count
        setUnreadCount(prev => prev + addedDocs.length)
      }
      
      // After first snapshot, set flag to false so future changes show notifications
      if (isInitialSnapshot) {
        isInitialSnapshot = false
      }
    }, (error) => {
      console.error('Error listening to agent inbox updates:', error)
    })

    // Clean up listener on unmount
    return () => unsubscribe()
  }, [user?.uid, isOnboarding, toast, router])

  const markAsRead = async (id: string) => {
    // Update the notification in Firestore
    try {
      if (user?.uid) {
        await setDoc(doc(db, 'merchants', user.uid, 'notifications', id), {
          read: true
        }, { merge: true })
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
    
    // Update local state
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
    // Update all notifications in Firestore
    try {
      if (user?.uid) {
        const batch = writeBatch(db)
        notifications.forEach(notification => {
          if (!notification.read) {
            const notificationRef = doc(db, 'merchants', user.uid, 'notifications', notification.id)
            batch.update(notificationRef, { read: true })
          }
        })
        await batch.commit()
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
    
    // Update local state
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    )
    setUnreadCount(0)
  }

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
      case "MEMBERSHIP_TIER_UPGRADE":
        return <Award className="h-4 w-4 text-purple-500" />
      case "AGENT_ACTION":
        return (
          <div className="h-4 w-4 flex items-center justify-center">
            <Bot className="h-4 w-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500" />
          </div>
        )
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }
  
  // Function to get the current page title based on pathname
  const getPageTitle = () => {
    const segments = pathname?.split('/').filter(Boolean) // Remove empty segments
    if (!segments || segments.length === 0) return 'Dashboard'
    
    // Get the last segment instead of the first
    const lastSegment = segments[segments.length - 1]
    
    // Handle specific cases for proper capitalization
    if (lastSegment === 'agent-inbox') {
      return 'Agent Inbox'
    }
    
    // Convert path to title case (e.g., "agents" -> "Agents")
    return lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1)
  }
  
  // Function to get the appropriate icon for a tool name
  const getToolIcon = (toolName: string) => {
    const lowerToolName = toolName.toLowerCase()
    
    if (lowerToolName.includes('gmail') || lowerToolName.includes('email')) {
      return '/gmail.png'
    }
    
    // Add more tool icons as needed
    if (lowerToolName.includes('calendar')) {
      return '/gmail.png' // Using Gmail icon for Google Calendar for now
    }
    
    // Default icon for unknown tools
    return null
  }
  
  const handleVoiceNoteClick = () => {
    if (recording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop()
        setRecording(false)
        setAudioProcessing(true)
        
        // Clear the recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
          recordingTimerRef.current = null
        }
      }
    } else {
      // Start recording
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []
            
            // Reset recording duration
            setRecordingDuration(0)
            
            // Start a timer to update recording duration
            recordingTimerRef.current = setInterval(() => {
              setRecordingDuration(prev => prev + 1)
            }, 1000)
            
            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data)
              }
            }
            
            mediaRecorder.onstop = async () => {
              try {
                // Convert audio chunks to base64
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
                console.log('Audio blob size:', audioBlob.size, 'bytes')
                
                const reader = new FileReader()
                
                reader.onloadend = async () => {
                  try {
                    const base64Audio = (reader.result as string).split(',')[1]
                    console.log('Base64 audio length:', base64Audio.length, 'characters')
                    console.log('Base64 audio preview (first 100 chars):', base64Audio.substring(0, 100))
                    
                    // Use the specific customerId instead of the user's ID
                    const customerId = 'ZU6nlhrznNgyR3E3OvBOiMXgXur2'
                    console.log('Sending data to processThought1 function:')
                    console.log('- customerId:', customerId)
                    console.log('- audioBase64 length:', base64Audio.length)
                    
                    // Call the Firebase function as an HTTP endpoint
                    const region = 'us-central1'; // Make sure this matches the region in your function definition
                    const projectId = 'tap-loyalty-fb6d0';
                    const url = `https://${region}-${projectId}.cloudfunctions.net/processThought`;
                    
                    const response = await fetch(url, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        data: {
                          customerId: customerId,
                          audioBase64: base64Audio
                        }
                      })
                    });
                    
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const responseData = await response.json();
                    console.log('Voice note processed result:', responseData);
                    
                    // Display more detailed information about the result
                    const thoughtResult = responseData as ProcessThoughtResult;
                    if (thoughtResult) {
                      console.log('Result structure:', Object.keys(thoughtResult))
                      
                      // If there's a title field, log it
                      if (thoughtResult.title) {
                        console.log('Thought title:', thoughtResult.title)
                      }
                      
                      // If there's a summary field, log it
                      if (thoughtResult.summary) {
                        console.log('Thought summary:', thoughtResult.summary)
                      }
                      
                      // If there are tags, log them
                      if (thoughtResult.tags) {
                        console.log('Thought tags:', thoughtResult.tags)
                      }
                    }
                    
                    // Show success notification with more details if available
                    toast({
                      title: "Voice Note Processed",
                      description: thoughtResult?.title 
                        ? `"${thoughtResult.title}" has been saved.` 
                        : thoughtResult?.status === 'ignored'
                          ? `Note was too short to process: ${thoughtResult.reason}`
                          : "Your voice note has been processed successfully.",
                      duration: 5000,
                    })
                  } catch (error) {
                    console.error('Error processing voice note:', error)
                    toast({
                      title: "Error",
                      description: "Failed to process voice note: " + (error instanceof Error ? error.message : String(error)),
                      variant: "destructive",
                    })
                  } finally {
                    setAudioProcessing(false)
                  }
                }
                
                reader.readAsDataURL(audioBlob)
              } catch (error) {
                console.error('Error handling audio data:', error)
                setAudioProcessing(false)
                toast({
                  title: "Error",
                  description: "Failed to process audio data: " + (error instanceof Error ? error.message : String(error)),
                  variant: "destructive",
                })
              }
              
              // Stop all tracks in the stream
              if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
              }
            }
            
            // Start recording
            mediaRecorder.start()
            setRecording(true)
          })
          .catch(error => {
            console.error('Error accessing microphone:', error)
            toast({
              title: "Microphone Error",
              description: "Could not access your microphone: " + (error instanceof Error ? error.message : String(error)),
              variant: "destructive",
            })
          })
      } else {
        console.error('Media devices not supported')
        toast({
          title: "Not Supported",
          description: "Voice recording is not supported in your browser.",
          variant: "destructive",
        })
      }
    }
  }
  
  // Format the recording duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  // Add cleanup effect for recording
  useEffect(() => {
    // Cleanup function to stop the timer and recording if component unmounts
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
      
      // Also stop any ongoing recording
      if (mediaRecorderRef.current && recording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [recording]);

  useEffect(() => {
    // Focus quick note input when it appears
    if (showQuickNoteInput && quickNoteInputRef.current) {
      quickNoteInputRef.current.focus()
      
      // Set up auto-resize functionality
      const autoResizeTextarea = () => {
        const textarea = quickNoteInputRef.current
        if (!textarea) return
        
        // Reset height to auto so it can shrink if needed
        textarea.style.height = 'auto'
        
        // Set to scrollHeight to fit content, but enforce min/max height
        const newHeight = Math.min(Math.max(80, textarea.scrollHeight), 200)
        textarea.style.height = `${newHeight}px`
      }
      
      // Initial resize
      autoResizeTextarea()
      
      // Set up event listener
      const handleInput = () => autoResizeTextarea()
      quickNoteInputRef.current.addEventListener('input', handleInput)
      
      // Clean up event listener
      return () => {
        if (quickNoteInputRef.current) {
          quickNoteInputRef.current.removeEventListener('input', handleInput)
        }
      }
    }
    
    // Add click outside handler for quick note input
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickNoteContainerRef.current && 
        !quickNoteContainerRef.current.contains(event.target as Node) &&
        showQuickNoteInput
      ) {
        // Close the quick note input if clicking outside
        setShowQuickNoteInput(false)
        setQuickNoteText("")
      }
    }
    
    // Add event listener
    document.addEventListener("mousedown", handleClickOutside)
    
    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showQuickNoteInput])
  
  // Add a function to save quick notes to Firestore
  const saveQuickNote = async () => {
    if (!quickNoteText.trim() || !user?.uid || quickNoteText.length > 500) {
      setShowQuickNoteInput(false)
      setQuickNoteText("")
      return
    }
    
    setIsSavingQuickNote(true)
    
    try {
      // Create note data
      const noteData = {
        title: quickNoteText.trim().slice(0, 40) + (quickNoteText.length > 40 ? '...' : ''),
        summary: quickNoteText,
        rawText: quickNoteText,
        content: `<p>${quickNoteText}</p>`,
        tags: [],
        areaId: "documents", 
        areaTitle: "Documents", 
        categoryId: "notes", 
        categoryTitle: "Notes",
        createdAt: serverTimestamp(), 
        type: "note" as const,
        origin: "quick_note",
        fileType: "txt",
        contentType: "text/html",
        pinned: false
      }
      
      // Save to Firestore
      const docRef = await addDoc(collection(db, `merchants/${user.uid}/files`), noteData)
      
      // Update with document ID
      await updateDoc(docRef, {
        fileName: docRef.id,
        fileId: docRef.id
      })
      
      toast({
        title: "Quick note saved",
        description: "Your note has been saved to Documents"
      })
      
      // Reset the form
      setQuickNoteText("")
      setShowQuickNoteInput(false)
    } catch (error) {
      console.error('Error saving quick note:', error)
      toast({
        title: "Error",
        description: "Failed to save your note",
        variant: "destructive"
      })
    } finally {
      setIsSavingQuickNote(false)
    }
  }
  
  // Handle quick note input key presses (Enter to save, Escape to cancel)
  const handleQuickNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveQuickNote()
    } else if (e.key === 'Escape') {
      setShowQuickNoteInput(false)
      setQuickNoteText("")
    }
  }
  
  // Add state for chatbot panel
  const [showChatbotPanel, setShowChatbotPanel] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string, content: string, toolNames?: string[], toolCompleted?: boolean, toolId?: string, toolSuccess?: boolean}[]>([])
  const [userInput, setUserInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [toolResponse, setToolResponse] = useState<any>(null)
  
  // Add state for logs panel
  const [showLogsPanel, setShowLogsPanel] = useState(false)
  const [selectedLogData, setSelectedLogData] = useState<any>(null)
  const [logsLoading, setLogsLoading] = useState(false)
  
  const [conversationId, setConversationId] = useState<string | null>(null)
  
  // Add state for real conversations from Firestore
  const [conversations, setConversations] = useState<{
    id: string
    title: string
    lastMessage: string
    timestamp: Date
    messageCount: number
  }[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  
  // Add state for SSE streaming
  const [streamingStatus, setStreamingStatus] = useState<string>('')
  const [streamingStep, setStreamingStep] = useState<string>('')
  const [streamingSteps, setStreamingSteps] = useState<any[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingProgress, setStreamingProgress] = useState<{
    currentStep: number
    totalSteps: number
    stepName: string
    message: string
  } | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Add state for selected tools
  const [selectedTools, setSelectedTools] = useState<any[]>([])
  
  // Add state for tool selection display
  const [showToolSelection, setShowToolSelection] = useState(false)
  const [selectedToolNames, setSelectedToolNames] = useState<string[]>([])
  const [toolSelectionMessage, setToolSelectionMessage] = useState<string>('')
  const [toolCompleted, setToolCompleted] = useState(false)
  
  // Add state for typewriter animation
  const [typewriterText, setTypewriterText] = useState<string>('')
  const [showTypewriter, setShowTypewriter] = useState(false)
  
  // Add state for confirmation dialog
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false)
  const [confirmationData, setConfirmationData] = useState<any>(null)
  
  // Add state for integrations dropdown
  const [showIntegrationsDropdown, setShowIntegrationsDropdown] = useState(false)
  
  // Add state for Deep Thought button
  const [deepThoughtActive, setDeepThoughtActive] = useState(false)
  
  // Add state for integrations popup
  const [showIntegrationsPopup, setShowIntegrationsPopup] = useState(false)
  
  // Add state for integrations panel (replacing popup)
  const [showIntegrationsPanel, setShowIntegrationsPanel] = useState(false)
  
  // Define available integrations
  const availableIntegrations = [
    { id: 'square', name: 'Square', description: 'Point of sale system', logo: 'squarepro.png', status: 'active' },
    { id: 'lightspeed_new', name: 'Lightspeed Retail', description: 'Retail POS system', logo: 'lslogo.png', status: 'active' },
    { id: 'gmail', name: 'Gmail', description: 'Email communication', logo: 'gmailpro.png', status: 'active' },
    { id: 'google_calendar', name: 'Google Calendar', description: 'Calendar Integration', logo: 'cal.svg', status: 'active' },
    { id: 'google_docs', name: 'Google Docs', description: 'Document Management', logo: 'docspro.png', status: 'active' },
    { id: 'google_sheets', name: 'Google Sheets', description: 'Spreadsheet Integration', logo: 'sheetspro.png', status: 'active' },
    { id: 'hubspot', name: 'HubSpot', description: 'CRM Integration', logo: 'hubspot.png', status: 'active' },
    { id: 'outlook', name: 'Microsoft Outlook', description: 'Email Integration', logo: 'outlook.png', status: 'active' },
    { id: 'xero', name: 'Xero', description: 'Accounting and bookkeeping', logo: 'xero.png', status: 'coming-soon' },
    { id: 'mailchimp', name: 'Mailchimp', description: 'Email marketing', logo: 'mailchimp.png', status: 'coming-soon' },
    { id: 'shopify', name: 'Shopify', description: 'E-commerce platform', logo: 'shopify.png', status: 'coming-soon' },
    { id: 'twilio', name: 'Twilio', description: 'SMS & Voice', logo: 'twilio.png', status: 'coming-soon' },
  ]
  
  // Function to handle integration connection
  const handleIntegrationConnect = (integration: typeof availableIntegrations[0]) => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to connect integrations",
        variant: "destructive"
      });
      return;
    }

    if (integration.status === 'coming-soon') {
      toast({
        title: `${integration.name}`,
        description: `${integration.name} integration coming soon!`
      });
      return;
    }

    // Redirect to the integrations page
    window.location.href = `/dashboard/integrations`;
  }
  
  // Add state for sidebar collapse
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Auto-collapse sidebar when chat panel opens/closes
  useEffect(() => {
    setSidebarCollapsed(showChatbotPanel || showLogsPanel)
    // Close integrations panel when chat panel or logs panel opens
    if ((showChatbotPanel || showLogsPanel) && showIntegrationsPanel) {
      setShowIntegrationsPanel(false)
    }
    // Close chat panel when logs panel opens and vice versa
    if (showChatbotPanel && showLogsPanel) {
      setShowChatbotPanel(false)
    }
  }, [showChatbotPanel, showLogsPanel, showIntegrationsPanel])
  
  // Fetch integrations status from Firestore (to be dynamically updated later)
  const [integrationsStatus, setIntegrationsStatus] = useState<{[key: string]: boolean}>({
    square: false,
    lightspeed_new: false,
    gmail: false,
    google_calendar: false,
    google_docs: false,
    google_sheets: false,
    hubspot: false,
    outlook: false
  });

  // Fetch integration status when user changes
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      if (!user?.uid) return;
      
      try {
        // Check each integration
        const status: {[key: string]: boolean} = {};
        
        for (const integration of availableIntegrations) {
          if (integration.status === 'active') {
            const docRef = doc(db, `merchants/${user.uid}/integrations/${integration.id}`);
            const docSnap = await getDoc(docRef);
            status[integration.id] = docSnap.exists() && docSnap.data()?.connected === true;
          }
        }
        
        setIntegrationsStatus(status);
      } catch (error) {
        console.error("Error fetching integration status:", error);
      }
    };
    
    if (user?.uid) {
      fetchIntegrationStatus();
    }
  }, [user?.uid]);
  
  // Remove hardcoded integrations array since we're using integrationsStatus
  
  // Scroll to show new messages after animation completes
  useEffect(() => {
    if (chatContainerRef.current && chatMessages.length > 0) {
      const container = chatContainerRef.current
      
      // Delay scroll to allow the slide animation to be visible first
      setTimeout(() => {
        // Find the last user message to scroll to it specifically
        const lastUserMessageIndex = chatMessages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i !== -1).pop()
        
        if (lastUserMessageIndex !== undefined) {
          // Scroll to position the user message near the top with some padding
          requestAnimationFrame(() => {
            const userMessageElement = container.querySelector(`[data-message-index="${lastUserMessageIndex}"]`)
            
            if (userMessageElement && userMessageElement instanceof HTMLElement) {
              const containerRect = container.getBoundingClientRect()
              const elementRect = userMessageElement.getBoundingClientRect()
              const headerHeight = 60 // Chat header height
              const padding = 20 // Padding from top
              
              // Calculate scroll position to place message near top
              const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - headerHeight - padding
              
              container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'smooth'
              })
            }
          })
        }
      }, 400) // Wait for animation to be visible (400ms matches our spring animation duration)
    }
  }, [chatMessages])
  
  // Auto-resize is now handled by the kibo-ui AIInputTextarea component
  
  // Create conversation when chat panel is first opened
  useEffect(() => {
    if (showChatbotPanel && !conversationId) {
      createNewConversation().then(newConversationId => {
        setConversationId(newConversationId)
      })
    }
  }, [showChatbotPanel, conversationId])
  
  // Fetch conversations when chat panel opens
  useEffect(() => {
    if (showChatbotPanel && user?.uid) {
      fetchConversations()
    }
  }, [showChatbotPanel, user?.uid])
  
  // Cleanup EventSource when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])
  
  // Close EventSource when chat panel is closed
  useEffect(() => {
    if (!showChatbotPanel && eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
      setIsStreaming(false)
      setStreamingStatus('')
      setStreamingStep('')
      setStreamingProgress(null)
    }
  }, [showChatbotPanel])
  
  // Expose handleLogClick function globally
  useEffect(() => {
    (window as any).handleLogClick = handleLogClick
    return () => {
      delete (window as any).handleLogClick
    }
  }, [])
  
  // Handle typewriter animation completion
  useEffect(() => {
    if (showTypewriter && typewriterText) {
      // Calculate duration based on text length and streaming speed (20ms per char)
      const estimatedDuration = typewriterText.length * 20 + 1000 // 20ms per char + 1 second buffer
      
      const timer = setTimeout(() => {
        // Add the message to chat history and clean up
        setChatMessages(prev => [...prev, {role: 'assistant', content: typewriterText}])
        setShowTypewriter(false)
        setTypewriterText('')
      }, estimatedDuration)
      
      return () => clearTimeout(timer)
    }
  }, [showTypewriter, typewriterText])
  
  // Function to create a new conversation
  const createNewConversation = async () => {
    try {
      const merchantId = user?.uid
      if (!merchantId) {
        console.error('No merchant ID available')
        return null
      }
      
      // Generate a unique conversation ID
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Create conversation via API endpoint
      const response = await fetch(`/api/merchants/${merchantId}/agent/history/conversations/${newConversationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: newConversationId,
          merchantId: merchantId,
          createdAt: new Date().toISOString(),
          status: 'active'
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.status}`)
      }
      
      const conversationData = await response.json()
      console.log('Created new conversation:', conversationData)
      
      return newConversationId
    } catch (error) {
      console.error('Error creating new conversation:', error)
      // Return a fallback conversation ID even if API fails
      return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }
  
  
  // Add function to handle sending messages to the chatbot with SSE streaming
  const handleSendMessage = async () => {
    if (!userInput.trim()) return
    
    // Clear previous responses and streaming state
    setToolResponse(null)
    setStreamingStatus('')
    setStreamingStep('')
    setStreamingSteps([])
    setStreamingProgress(null)
    setShowTypewriter(false)
    setTypewriterText('')
    
    // Ensure we have a conversation ID
    let currentConversationId = conversationId
    if (!currentConversationId) {
      currentConversationId = await createNewConversation()
      setConversationId(currentConversationId)
    }
    
    // Add user message to chat
    const newMessage = {role: 'user', content: userInput.trim()}
    setChatMessages(prev => [...prev, newMessage])
    const userPrompt = userInput.trim()
    setUserInput('')
    
    // Textarea height is now handled by the kibo-ui component
    
    // Start streaming
    setIsStreaming(true)
    setIsTyping(true)
    
    try {
      // Prepare the request payload
      const merchantId = user?.uid
      console.log('Starting SSE stream for:', { merchantId, conversationId: currentConversationId, userPrompt })
      
      const payload = {
        prompt: userPrompt,           // ✅ Changed from 'useCase' to 'prompt'
        merchantId: merchantId || 'default',  // ✅ Added merchantId field
        apps: [],
        params: {},
        entityId: merchantId || 'default',
        conversationId: currentConversationId,
        stream: 'true' // Enable streaming
      }
      
      // Create SSE connection
      const functionUrl = 'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/processMultiStepRequest';
      const queryParams = new URLSearchParams({
        merchantId: merchantId || 'default',
        conversationId: currentConversationId || '',
        stream: 'true'
      })
      
      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      
      // Use POST with SSE by sending the payload as form data
      console.log('Making request to:', functionUrl)
      console.log('Request method: POST')
      console.log('Request payload:', payload)
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(payload)
      })
      
      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('HTTP error response:', errorText)
        throw new Error(`HTTP error! Status: ${response.status} - ${errorText}`)
      }
      
      // Check if response is actually SSE
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/event-stream')) {
        // Fallback to regular JSON response
        const result = await response.json()
        console.log('Received regular JSON response:', result)
        setToolResponse(result)
        
        if (result && result.text) {
          setChatMessages(prev => [...prev, {role: 'assistant', content: result.text}])
        }
        return
      }
      
      // Handle SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Failed to get response reader')
      }
      
      let buffer = ''
      let finalResponse = null
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          console.log('SSE stream completed')
          break
        }
        
        // Decode the chunk and add to buffer
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6) // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              console.log('Stream completed with [DONE]')
              break
            }
            
            try {
              // Skip empty data
              if (!data || data.trim() === '') {
                continue
              }
              
              const parsed = JSON.parse(data)
              console.log('SSE Event:', parsed)
              
              // Validate parsed data structure
              if (!parsed || typeof parsed !== 'object') {
                console.warn('Invalid SSE event structure:', parsed)
                continue
              }
              
              // Handle different event types based on the new SSE structure
              switch (parsed.type) {
                case 'status':
                  // Handle status updates (app detection, tool loading, etc.)
                  if (parsed.data && parsed.data.message) {
                    setStreamingStatus(parsed.data.message)
                  }
                  break
                  
                case 'tool_selected':
                  // Handle tool selection - add to conversation with loading state
                  if (parsed.data && parsed.data.tool) {
                    setChatMessages(prev => [...prev, {
                      role: 'tool_selection', 
                      content: '', 
                      toolNames: [parsed.data.toolDisplayName || parsed.data.tool],
                      toolCompleted: false,
                      toolId: parsed.data.id
                    }])
                    setStreamingStatus(parsed.data.message || `Using ${parsed.data.toolDisplayName || parsed.data.tool}`)
                  }
                  break
                  
                case 'tool_complete':
                  // Handle tool completion - update the corresponding tool selection message
                  if (parsed.data && parsed.data.tool) {
                    setChatMessages(prev => {
                      const messages = [...prev]
                      // Find the tool_selection message with matching tool name
                      for (let i = messages.length - 1; i >= 0; i--) {
                        if (messages[i].role === 'tool_selection' && 
                            messages[i].toolNames?.includes(parsed.data.toolDisplayName || parsed.data.tool)) {
                          // If we found a matching tool, it means it was successfully executed
                          messages[i] = { 
                            ...messages[i], 
                            toolCompleted: true,
                            toolSuccess: true  // Success because we found the matching tool
                          }
                          break
                        }
                      }
                      return messages
                    })
                    setStreamingStatus(`✅ ${parsed.data.message}`)
                  }
                  break
                  
                case 'ai_message_chunk':
                  // Handle streaming AI response chunks
                  if (parsed.data && parsed.data.delta) {
                    setTypewriterText(prev => prev + parsed.data.delta)
                    if (!showTypewriter) {
                      setShowTypewriter(true)
                    }
                  }
                  break
                  
                case 'ai_message':
                  // Handle final AI message
                  if (parsed.data && parsed.data.message) {
                    setChatMessages(prev => [...prev, {
                      role: 'assistant', 
                      content: parsed.data.message
                    }])
                  }
                  break
                  
                case 'done':
                  // Handle final completion
                  finalResponse = parsed.data
                  setStreamingStatus('✅ Task completed!')
                  
                  // Add completion summary if tools were used
                  if (parsed.data && parsed.data.toolsUsed && parsed.data.toolsUsed.length > 0) {
                    let successMessage = "## 🛠️ Tools Used:\n\n"
                    parsed.data.toolsUsed.forEach((tool: any) => {
                      const status = tool.successful ? '✅' : '❌'
                      successMessage += `- ${status} **${tool.toolDisplayName || tool.tool}**\n`
                    })
                    
                    setChatMessages(prev => [...prev, {
                      role: 'assistant', 
                      content: successMessage
                    }])
                  }
                  break
                  
                case 'error':
                  setStreamingStatus(`❌ ${parsed.data.message}`)
                  setChatMessages(prev => [...prev, {
                    role: 'assistant', 
                    content: `Sorry, I encountered an error: ${parsed.data.message}`
                  }])
                  break
                  
                // Legacy event types for backwards compatibility  
                case 'step':
                  setStreamingStatus(`Step ${parsed.data.turn}: ${parsed.data.action}`)
                  break
                  
                default:
                  console.log('Unknown SSE event type:', parsed.type, parsed.data)
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', {
                rawData: data,
                dataLength: data?.length,
                error: e instanceof Error ? e.message : String(e),
                errorType: typeof e
              })
              // Don't break the stream for parsing errors, just log and continue
            }
          }
        }
      }
      
      // Process final response
      if (finalResponse) {
        console.log('Final response received:', finalResponse)
        setToolResponse(finalResponse)
        
        if (finalResponse.text) {
          setChatMessages(prev => [...prev, {role: 'assistant', content: finalResponse.text}])
        }
      }
      
    } catch (error) {
      console.error('Error in SSE streaming:', error)
      
      // More detailed error handling
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        })
      }
      
      setStreamingStatus(`❌ Error: ${errorMessage}`)
      setChatMessages(prev => [...prev, {
        role: 'assistant', 
        content: `Sorry, I encountered an error while processing your request: ${errorMessage}\n\nPlease try again.`
      }])
    } finally {
      setIsStreaming(false)
      setIsTyping(false)
      
      // Clean up streaming state after a delay
      setTimeout(() => {
        setStreamingStatus('')
        setStreamingStep('')
        setStreamingProgress(null)
        // Tool selection is now part of message history, no need to clear
      }, 3000)
    }
  }
  
  // Function to fetch conversations from Firestore/API
  const fetchConversations = async () => {
    if (!user?.uid || conversationsLoading) return
    
    setConversationsLoading(true)
    try {
      const conversationsRef = collection(db, 'merchants', user.uid, 'conversations')
      const conversationsQuery = query(conversationsRef, orderBy('updatedAt', 'desc'), limit(10))
      const querySnapshot = await getDocs(conversationsQuery)
      
      const conversations = querySnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          lastMessage: data.lastMessage || '',
          timestamp: data.updatedAt?.toDate() || new Date(),
          messageCount: data.messageCount || 0
        }
      })
      
      setConversations(conversations)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setConversationsLoading(false)
    }
  }

  // Add function to handle logs panel
  const handleLogClick = async (executionId: string, merchantId: string) => {
    setShowLogsPanel(true)
    setLogsLoading(true)
    setSelectedLogData(null)
    
    try {
      const logRef = doc(db, 'agentlogs', merchantId, 'executions', executionId)
      const logSnapshot = await getDoc(logRef)
      
      if (logSnapshot.exists()) {
        const logData = {
          id: logSnapshot.id,
          ...logSnapshot.data()
        }
        setSelectedLogData(logData)
      } else {
        toast({
          title: "Log Not Found",
          description: "The selected log execution could not be found.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error fetching log details:', error)
      toast({
        title: "Error Loading Log",
        description: "Failed to load log execution details. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLogsLoading(false)
    }
  }
  
  if (!pathname) {
    return null; // or a loading state
  }

  // Special layout for onboarding pages
  if (isOnboarding) {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Left sidebar for progress steps */}
        <div className="w-72 bg-white p-6">
          <div className="flex flex-col h-full">
            <div className="mb-8">
              <h3 className="text-lg font-medium">Your details</h3>
              <p className="text-sm text-gray-500">Complete all steps to get started</p>
            </div>
            
            <div className="space-y-1 flex-1">
              {/* Steps with vertical connector line */}
              <div className="relative ml-3 space-y-8 pl-6 before:absolute before:left-0 before:top-1 before:h-full before:border-l-2 before:border-gray-200">
                {/* Step 1 */}
                <div className="relative -left-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center">
                      <span className="text-xs">1</span>
                    </div>
                    <p className="text-sm font-medium text-blue-500">Your details</p>
                  </div>
                  <p className="mt-1 ml-8 text-xs text-gray-500">Provide an email and password</p>
                </div>
                
                {/* Step 2 */}
                <div className="relative -left-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center">
                      <span className="text-xs">2</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Verify your email</p>
                  </div>
                  <p className="mt-1 ml-8 text-xs text-gray-500">Enter your verification code</p>
                </div>
                
                {/* Step 3 */}
                <div className="relative -left-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center">
                      <span className="text-xs">3</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Invite your team</p>
                  </div>
                  <p className="mt-1 ml-8 text-xs text-gray-500">Start collaborating with your team</p>
                </div>
                
                {/* Step 4 */}
                <div className="relative -left-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full border-2 border-gray-300 text-gray-400 flex items-center justify-center">
                      <span className="text-xs">4</span>
                    </div>
                    <p className="text-sm font-medium text-gray-500">Welcome to Untitled!</p>
                  </div>
                  <p className="mt-1 ml-8 text-xs text-gray-500">Get up and running in 3 minutes</p>
                </div>
              </div>
            </div>
            
            <div className="mt-auto pt-6">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => router.push('/dashboard')}
              >
                <ChevronDown className="h-4 w-4 mr-2 rotate-90" />
                Back to home
              </Button>
            </div>
          </div>
        </div>
        
        {/* Main content - wider for onboarding */}
        <div className="flex-1 overflow-auto bg-[#F5F5F5] p-2">
          <div className="bg-white rounded-md h-full overflow-auto border border-gray-200">
            {children}
          </div>
        </div>
      </div>
    )
  }

  // Regular layout for non-onboarding pages
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile menu button - only visible on small screens */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white shadow-md border border-gray-200"
        onClick={() => setMobileNavOpen(!mobileNavOpen)}
      >
        {mobileNavOpen ? (
          <X className="h-5 w-5 text-gray-600" />
        ) : (
          <Menu className="h-5 w-5 text-gray-600" />
        )}
      </button>
      
      {/* SideNav - hidden on mobile until menu button is clicked */}
      <div className={`${mobileNavOpen ? 'fixed inset-0 z-40 block' : 'hidden'} lg:relative lg:block lg:z-auto`}>
        {/* Backdrop for mobile menu */}
        <div 
          className={`fixed inset-0 bg-gray-600 bg-opacity-50 lg:hidden ${mobileNavOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}
          onClick={() => setMobileNavOpen(false)}
        ></div>
        {/* Side navigation */}
        <div className={`relative h-full z-50 ${mobileNavOpen ? 'block' : 'hidden'} lg:block max-w-[80vw] lg:max-w-none overflow-hidden hide-scrollbar`}>
          <SideNav onCollapseChange={setSidebarCollapsed} collapsed={sidebarCollapsed} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F5]">
        {/* Apply custom scrollbar styles */}
        <style jsx global>{scrollbarStyles}</style>
        
        {/* Main Content with Chatbot Panel */}
        <main className="flex-1 overflow-hidden pr-2 pt-2 pb-2 relative">
          <div className="flex h-full">
            {/* Main content area - no width animation, just translate */}
            <div 
              className={`bg-white rounded-md overflow-hidden flex flex-col flex-1 ${
                pathname?.includes('/email') ? '' : 'border border-gray-200'
              }`}
              style={{
                marginRight: showChatbotPanel ? '488px' : showLogsPanel ? '488px' : showIntegrationsPanel ? '408px' : '0', // Chat/Logs: 480px + 8px gap, Integrations: 400px + 8px gap
                transition: 'margin-right 0.4s ease-in-out'
              }}
            >
              {/* Header Section - Only show on non-email pages */}
              {!pathname?.includes('/email') && (
                <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold text-gray-900">{getPageTitle()}</h1>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Get Started Button */}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-sm"
                      onClick={() => setShowTapAgentSheet(true)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Get Started
                    </Button>
                    
                    {/* Quick Note Button */}
                    <div className="relative" ref={quickNoteContainerRef}>
                      <DropdownMenu open={quickNoteOpen} onOpenChange={setQuickNoteOpen}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-sm"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Note
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80 p-0">
                          <div className="p-4">
                            <div className="mb-3">
                              <h4 className="font-medium text-sm">Quick Note</h4>
                              <p className="text-xs text-gray-500 mt-1">Jot down something important</p>
                            </div>
                            <Textarea
                              ref={quickNoteInputRef}
                              value={quickNoteText}
                              onChange={(e) => setQuickNoteText(e.target.value)}
                              placeholder="Write your note here..."
                              className="min-h-[100px] text-sm"
                              onKeyDown={handleQuickNoteKeyDown}
                            />
                            <div className="flex justify-between items-center mt-3">
                              <div className="text-xs text-gray-400">
                                Press Cmd+Enter to save
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setQuickNoteText('')
                                    setQuickNoteOpen(false)
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={saveQuickNote}
                                  disabled={!quickNoteText.trim() || isSavingQuickNote}
                                >
                                  {isSavingQuickNote && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                                  Save
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    {/* Notifications */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="relative">
                          <Bell className="h-4 w-4" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                              {unreadCount}
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-80">
                        <div className="p-3 border-b">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Notifications</h4>
                            {unreadCount > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-xs h-6 px-2"
                                onClick={markAllAsRead}
                              >
                                Mark all read
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {notifications.length > 0 ? (
                            notifications.map((notification) => (
                              <div 
                                key={notification.id}
                                className={`p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors ${
                                  !notification.read ? 'bg-blue-50' : ''
                                }`}
                                onClick={() => markAsRead(notification.id)}
                              >
                                <div className="flex items-start gap-3">
                                  {/* Customer Avatar or Notification Icon */}
                                  <div className="flex-shrink-0">
                                    {notification.customerProfilePictureUrl ? (
                                      <img 
                                        src={notification.customerProfilePictureUrl} 
                                        alt={notification.customerFullName || 'Customer'}
                                        className="h-8 w-8 rounded-full object-cover border border-gray-200"
                                      />
                                    ) : notification.customerFullName ? (
                                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium border border-gray-200 bg-gray-100 text-gray-600">
                                        {notification.customerFullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                    ) : (
                                      <div className="h-8 w-8 rounded-full flex items-center justify-center border border-gray-200 bg-gray-100">
                                        {getNotificationIcon(notification.type)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Notification Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {notification.customerFullName && (
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {notification.customerFullName}
                                        </p>
                                      )}
                                      {notification.type === "AGENT_ACTION" && (
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-blue-500 to-orange-500 text-white">
                                          <Bot className="h-3 w-3" />
                                          Agent
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-800 mb-1">
                                      {notification.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs text-gray-500">
                                        {formatTimeAgo(notification.timestamp)}
                                      </p>
                                      {notification.idSuffix && (
                                        <span className="text-xs text-gray-400">
                                          #{notification.idSuffix}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Unread Indicator */}
                                  {!notification.read && (
                                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-6 text-center text-gray-500 text-sm">
                              No notifications yet
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              
              {/* Page content */}
              <div className="flex-1 overflow-auto main-content-scrollbar">
                {children}
              </div>
            </div>

            {/* Chatbot Panel - positioned absolutely with transform animation */}
            <div 
              className="absolute right-2 top-2 bottom-2 bg-white rounded-md border border-gray-200 overflow-hidden flex flex-col"
              style={{
                width: '480px',
                transform: showChatbotPanel ? 'translateX(0)' : 'translateX(calc(100% + 8px))',
                opacity: showChatbotPanel ? 1 : 0,
                transition: 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out'
              }}
            >
              {/* Chat header */}
              <div className="h-14 px-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm bg-gradient-to-r from-blue-500 to-orange-400 bg-clip-text text-transparent">
                    Tap Agent
                  </div>
                </div>
                
                {/* Rest of header content */}
                <div className="flex items-center gap-1">
                  {/* Debug button - show when there's a tool response */}
                  {toolResponse && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                          title="Debug Response"
                        >
                          <span className="text-xs font-mono text-yellow-600">🐛</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-96 rounded-md">
                        <div className="p-3">
                          <div className="text-xs font-semibold text-yellow-800 mb-2">
                            🐛 Debug: Full Function Response
                          </div>
                          <div className="text-xs text-yellow-700 font-mono bg-yellow-100 p-2 rounded border max-h-60 overflow-y-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {JSON.stringify(toolResponse, null, 2)}
                            </pre>
                          </div>
                          <div className="mt-2 text-xs text-yellow-600">
                            <strong>Response Type:</strong> {typeof toolResponse}<br/>
                            <strong>Has text:</strong> {toolResponse?.text ? 'Yes' : 'No'}<br/>
                            <strong>Has step:</strong> {toolResponse?.step ? 'Yes' : 'No'}<br/>
                            <strong>Has action:</strong> {toolResponse?.action ? 'Yes' : 'No'}<br/>
                            <strong>Has result.action:</strong> {toolResponse?.result?.action ? 'Yes' : 'No'}<br/>
                            <strong>Has actionUsed:</strong> {toolResponse?.actionUsed ? 'Yes' : 'No'}<br/>
                            <strong>Has tool:</strong> {toolResponse?.tool ? 'Yes' : 'No'}<br/>
                            <strong>Result Type:</strong> {typeof toolResponse?.result}<br/>
                            <strong>All Keys:</strong> {Object.keys(toolResponse || {}).join(', ')}
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  
                  {/* New conversation button - plus icon */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                    onClick={async () => {
                      // Create a new conversation
                      const newConversationId = await createNewConversation()
                      setConversationId(newConversationId)
                      
                      // Reset chat state
                      setChatMessages([])
                      setUserInput('')
                      setIsTyping(false)
                      setToolResponse(null) // Clear debug response
                      setShowTypewriter(false)
                      setTypewriterText('')
                    }}
                  >
                    <PlusCircle className="h-3 w-3 text-gray-500" />
                  </Button>
                  
                  {/* Integrations dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                        title="Integrations"
                      >
                        <Plug className="h-3 w-3 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-md">
                      <DropdownMenuLabel className="text-xs font-medium text-gray-500 px-2 pt-1.5 pb-1.5 border-b">
                        Integrations
                      </DropdownMenuLabel>
                      {availableIntegrations.map((integration, index) => (
                        <DropdownMenuItem key={index} className="py-1.5 px-2">
                          <div className="flex items-center justify-between w-full text-xs">
                            <div className="flex items-center space-x-2" title={integration.description}>
                              <div className="h-4 w-4 flex-shrink-0">
                                <NextImage
                                  src={`/${integration.logo}`}
                                  alt={integration.name}
                                  width={16}
                                  height={16}
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-sm truncate">{integration.name}</span>
                            </div>
                            <div className="flex items-center">
                              {integration.status === 'active' && integrationsStatus[integration.id] ? (
                                <span className="text-xs text-green-600">Connected</span>
                              ) : integration.status === 'coming-soon' ? (
                                <span className="text-xs text-gray-400">Soon</span>
                              ) : (
                                <span className="text-xs text-gray-500">Available</span>
                              )}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        className="py-1.5 px-2 text-xs text-blue-500" 
                        onSelect={() => window.location.href = '/dashboard/integrations'}
                      >
                        Manage integrations
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Stop button - show when streaming or typing */}
                  {(isStreaming || isTyping) && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                      onClick={() => {
                        // Stop streaming
                        if (eventSourceRef.current) {
                          eventSourceRef.current.close()
                        }
                        setIsStreaming(false)
                        setIsTyping(false)
                        setStreamingStatus('')
                        setStreamingStep('')
                        setStreamingProgress(null)
                      }}
                      title="Stop"
                    >
                      <X className="h-3 w-3 text-gray-500" />
                    </Button>
                  )}
                  
                  {/* Close button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                    onClick={() => setShowChatbotPanel(false)}
                    title="Close chat"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              </div>
              
              {/* Chat messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
              >
                <div className="space-y-4">
                  {/* Display all messages with smooth transitions */}
                  {chatMessages.map((msg, index) => {
                    const isLastUserMessage = msg.role === 'user' && index === chatMessages.length - 1
                    const isLastAssistantMessage = msg.role === 'assistant' && index === chatMessages.length - 1
                    
                    if (msg.role === 'tool_selection') {
                      // Tool selection message
                      return (
                        <motion.div 
                          key={`tool-${index}`}
                          className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 mb-3 text-sm"
                          initial={{ 
                            opacity: 0, 
                            y: 20,
                            scale: 0.95
                          }}
                          animate={{ 
                            opacity: 1, 
                            y: 0,
                            scale: 1
                          }}
                          transition={{ 
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                            duration: 0.4
                          }}
                        >
                          {/* Loading animation, success tick, or failure cross */}
                          {msg.toolCompleted ? (
                            msg.toolSuccess ? (
                              <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                            ) : (
                              <X className="h-3 w-3 text-red-600 flex-shrink-0" />
                            )
                          ) : (
                            <div className="h-3 w-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin flex-shrink-0"></div>
                          )}
                          
                          <span className="text-gray-700 font-medium text-xs">
                            {msg.toolCompleted ? (msg.toolSuccess ? 'Completed:' : 'Failed:') : 'Using:'}
                          </span>
                          
                          {/* Tool icons and names */}
                          <div className="flex items-center gap-1.5">
                            {msg.toolNames?.map((toolName, toolIndex) => {
                              const toolIcon = getToolIcon(toolName)
                              return (
                                <div key={toolIndex} className="flex items-center gap-1">
                                  {toolIcon && (
                                    <img 
                                      src={toolIcon} 
                                      alt={`${toolName} icon`}
                                      className="w-3 h-3 object-contain"
                                    />
                                  )}
                                  <span className={`text-xs font-medium ${
                                    msg.toolCompleted 
                                      ? (msg.toolSuccess ? 'text-green-700' : 'text-red-700')
                                      : 'text-gray-600'
                                  }`}>
                                    {toolName}
                                  </span>
                                  {toolIndex < (msg.toolNames?.length || 0) - 1 && <span className="text-gray-400">,</span>}
                                </div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )
                    } else if (msg.role === 'user') {
                      // User messages - show in gray box when it's the last message and streaming, otherwise show normally
                      if (isLastUserMessage && (isStreaming || streamingStatus)) {
                        return (
                          <motion.div 
                            key={`user-${index}`} 
                            data-message-index={index}
                            className="bg-gray-100 border border-gray-200 rounded-md p-2 relative min-h-fit flex items-start gap-2"
                            initial={{ 
                              opacity: 0,
                              y: 60,
                              scale: 0.95
                            }}
                            animate={{ 
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              height: "auto"
                            }}
                            transition={{ 
                              type: "spring",
                              damping: 25,
                              stiffness: 300,
                              duration: 0.6
                            }}
                          >
                            {/* Merchant logo in top-left corner - fixed position */}
                            {merchant?.logoUrl && (
                              <div className="flex-shrink-0 mt-0.5">
                                <img 
                                  src={merchant.logoUrl} 
                                  alt="Merchant logo"
                                  className="w-5 h-5 rounded-md object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="text-sm text-gray-800 leading-relaxed flex-1 pb-8 pt-0 flex items-center min-h-[20px]">
                              {msg.content}
                            </div>
                  
                            {/* SSE updates in bottom left corner */}
                            <div className="absolute bottom-2 left-2">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                                <span 
                                  key={streamingStatus} 
                                  className="text-xs text-gray-600 font-medium animate-in fade-in duration-300"
                                >
                                  {streamingStatus || 'Processing...'}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )
                      } else {
                        // Regular user message display - collapsed state after streaming
                        return (
                          <motion.div 
                            key={`user-${index}`} 
                            data-message-index={index}
                            className="bg-gray-100 border border-gray-200 rounded-md p-2 min-h-fit flex items-start gap-2"
                            initial={{ 
                              opacity: 0,
                              y: 60,
                              scale: 0.95
                            }}
                            animate={{ 
                              opacity: 1,
                              y: 0,
                              scale: 1,
                              height: "auto"
                            }}
                            transition={{ 
                              type: "spring",
                              damping: 25,
                              stiffness: 300,
                              duration: 0.6
                            }}
                            layout
                          >
                            {/* Merchant logo in top-left corner - fixed position */}
                            {merchant?.logoUrl && (
                              <div className="flex-shrink-0 mt-0.5">
                                <img 
                                  src={merchant.logoUrl} 
                                  alt="Merchant logo"
                                  className="w-5 h-5 rounded-md object-cover"
                                />
                              </div>
                            )}
                            
                            <div className="text-sm text-gray-800 leading-relaxed flex-1 pt-0 flex items-center min-h-[20px]">
                              {msg.content}
                            </div>
                          </motion.div>
                        )
                      }
                    } else {
                      // Assistant messages - show using kibo-ui AIResponse component
                      return (
                        <motion.div 
                          key={`assistant-${index}`} 
                          className="text-sm text-gray-800 leading-relaxed"
                          initial={{ 
                            opacity: 0,
                            y: 20,
                            scale: 0.98
                          }}
                          animate={{ 
                            opacity: 1,
                            y: 0,
                            scale: 1
                          }}
                          transition={{ 
                            type: "spring",
                            damping: 20,
                            stiffness: 300,
                            duration: 0.5
                          }}
                        >
                          <AIResponse className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-800">
                            {msg.content}
                          </AIResponse>
                        </motion.div>
                      )
                    }
                  })}
                  
                  {/* Typewriter Animation - show when done event is received */}
                  {showTypewriter && typewriterText && (
                    <motion.div 
                      className="text-sm text-gray-800 leading-relaxed"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        type: "tween",
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                      <StreamingMarkdown text={typewriterText} />
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Chat input at bottom - fixed position */}
              <div className="p-4 bg-white">
                <AIInput onSubmit={(e: React.FormEvent) => {
                  e.preventDefault()
                  if (!isStreaming && userInput.trim()) {
                    handleSendMessage()
                  }
                }}>
                  <AIInputTextarea
                    value={userInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserInput(e.target.value)}
                    placeholder={isStreaming ? "Processing..." : isTyping ? "" : "Ask something..."}
                    disabled={isStreaming}
                    minHeight={56}
                    maxHeight={164}
                  />
                  <AIInputToolbar>
                    <AIInputTools>
                      <AIInputButton
                        className={`transition-all duration-200 ${
                          deepThoughtActive 
                            ? 'bg-white text-gray-700 border border-gray-300 shadow-sm' 
                            : 'text-gray-500 hover:bg-white hover:text-gray-700 hover:shadow-sm'
                        }`}
                        onClick={() => {
                          setDeepThoughtActive(!deepThoughtActive)
                          console.log('Deep Thought clicked', !deepThoughtActive)
                        }}
                      >
                        <Brain className="h-3 w-3" />
                        <span>Deep Thought</span>
                      </AIInputButton>
                    </AIInputTools>
                    <AIInputSubmit disabled={isStreaming || !userInput.trim()}>
                      <Send className="h-4 w-4" />
                    </AIInputSubmit>
                  </AIInputToolbar>
                </AIInput>
              </div>
            </div>
            
            {/* NEW Integrations Panel - positioned with higher z-index to appear over chat */}
            <div 
              className="absolute right-2 top-2 bottom-2 bg-white rounded-md border border-gray-200 overflow-hidden flex flex-col"
              style={{
                width: '400px',
                transform: showIntegrationsPanel ? 'translateX(0)' : 'translateX(calc(100% + 8px))',
                opacity: showIntegrationsPanel ? 1 : 0,
                transition: 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out',
                zIndex: 35,
                pointerEvents: showIntegrationsPanel ? 'auto' : 'none'
              }}
            >
              {/* Integrations header */}
              <div className="h-16 px-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm text-gray-800">
                    Integrations
                  </div>
                </div>
                
                {/* Header controls */}
                <div className="flex items-center gap-1">
                  {/* Close button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                    onClick={() => setShowIntegrationsPanel(false)}
                    title="Close integrations"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              </div>
              
              {/* Integrations content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600 mb-4">
                    Connect your tools and services to unlock powerful automation capabilities.
                  </div>
                  
                  {availableIntegrations.map((integration) => (
                    <div key={integration.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3" title={integration.description}>
                        <div className="w-8 h-8 bg-white rounded-md border border-gray-200 shadow-sm flex items-center justify-center">
                          <NextImage
                            src={`/${integration.logo}`}
                            alt={integration.name}
                            width={20}
                            height={20}
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 text-sm">{integration.name}</h3>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={integration.status === 'active' 
                            ? (integrationsStatus[integration.id] ? 'outline' : 'default')
                            : 'outline'}
                          disabled={integration.status === 'coming-soon'}
                          onClick={() => {
                            handleIntegrationConnect(integration)
                            setShowIntegrationsPanel(false)
                          }}
                          className={`rounded-md text-xs px-3 py-1 ${
                            integration.status === 'active' && integrationsStatus[integration.id]
                              ? 'text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200'
                              : ''
                          }`}
                        >
                          {integration.status === 'active' 
                            ? (integrationsStatus[integration.id] ? 'Connected' : 'Connect') 
                            : 'Coming Soon'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Logs Panel - positioned with transform animation */}
            <div 
              className="absolute right-2 top-2 bottom-2 bg-white rounded-md border border-gray-200 overflow-hidden flex flex-col"
              style={{
                width: '480px',
                transform: showLogsPanel ? 'translateX(0)' : 'translateX(calc(100% + 8px))',
                opacity: showLogsPanel ? 1 : 0,
                transition: 'transform 0.4s ease-in-out, opacity 0.4s ease-in-out',
                zIndex: 30
              }}
            >
              {/* Logs header */}
              <div className="h-16 px-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm text-gray-800">
                    Agent Execution Log
                  </div>
                </div>
                
                {/* Header controls */}
                <div className="flex items-center gap-1">
                  {/* Close button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 p-0 rounded-md hover:bg-gray-200"
                    onClick={() => setShowLogsPanel(false)}
                    title="Close logs"
                  >
                    <X className="h-3 w-3 text-gray-500" />
                  </Button>
                </div>
              </div>
              
              {/* Logs content */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {logsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading log details...</span>
                  </div>
                ) : selectedLogData ? (
                  <div className="space-y-6">
                    {/* Execution Summary */}
                    <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center justify-center w-9 h-9 bg-gray-100 rounded-md">
                          <Activity className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">Execution Summary</h3>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {selectedLogData.executedAt ? 
                              new Intl.DateTimeFormat('en-AU', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(selectedLogData.executedAt.toDate ? selectedLogData.executedAt.toDate() : new Date(selectedLogData.executedAt))
                              : 'Unknown'
                            }
                          </div>
                        </div>
                        <div className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          selectedLogData.status === 'success' 
                            ? 'bg-gray-100 text-green-700' 
                            : selectedLogData.status === 'failed' 
                              ? 'bg-gray-100 text-red-700' 
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: selectedLogData.status === 'success' ? '#10B981' : selectedLogData.status === 'failed' ? '#EF4444' : '#6B7280' }}
                            />
                            <span className="capitalize">{selectedLogData.status || 'Unknown'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-gray-100 rounded-md p-2.5 text-center">
                          <div className="text-base font-medium text-gray-900">{selectedLogData.toolsExecuted || 0}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Tools Executed</div>
                        </div>
                        <div className="bg-gray-100 rounded-md p-2.5 text-center">
                          <div className="text-base font-medium text-gray-900">{selectedLogData.successfulTools || 0}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Successful</div>
                        </div>
                        <div className="bg-gray-100 rounded-md p-2.5 text-center">
                          <div className="text-base font-medium text-gray-900">{selectedLogData.failedTools || 0}</div>
                          <div className="text-xs text-gray-500 mt-0.5">Failed</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-xs text-gray-600">{selectedLogData.details?.duration || selectedLogData.duration || 'N/A'} seconds</span>
                        </div>
                        <div className="text-xs font-medium text-gray-700">{selectedLogData.agentname || 'Unknown Agent'}</div>
                      </div>
                    </div>

                    {/* Tools Called */}
                    {selectedLogData.details?.toolsCalled && selectedLogData.details.toolsCalled.length > 0 && (
                      <div className="bg-white border border-gray-200 rounded-md shadow-sm">
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-3.5 w-3.5 text-gray-500" />
                            <h4 className="text-sm font-medium text-gray-900">Tools Called</h4>
                          </div>
                          <div className="bg-gray-100 rounded-md px-2 py-0.5 text-xs font-medium text-gray-700">
                            {selectedLogData.details.toolsCalled.length} tools
                          </div>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {selectedLogData.details.toolsCalled.map((tool: any, index: number) => (
                            <div key={index} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  <Code className="h-3 w-3 text-gray-600" />
                                </div>
                                <span className="text-xs font-medium text-gray-800">{tool.name}</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {tool.timestamp ? new Date(tool.timestamp).toLocaleTimeString('en-AU') : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">No log selected</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Add the IntroductoryRewardSheet component */}
      <IntroductoryRewardSheet
        open={showIntroRewardSheet}
        onOpenChange={setShowIntroRewardSheet}
      />
      
      {/* Add TapAgentSheet */}
      <TapAgentSheet 
        open={showTapAgentSheet} 
        onOpenChange={setShowTapAgentSheet}
      />
      
      {/* Add missing dialog components for Create button dropdown */}
      <CreateBannerDialog
        open={showBannerDialog}
        onOpenChange={setShowBannerDialog}
      />
      
      <CreateRewardDialog
        open={showRewardDialog}
        onOpenChange={setShowRewardDialog}
      />
      
      <CreateRewardSheet
        open={showRewardDialog}
        onOpenChange={setShowRewardDialog}
      />
      
      <CreatePointsRuleSheet
        open={showPointsRuleDialog}
        onOpenChange={setShowPointsRuleDialog}
      />
      
      <CreateRecurringRewardDialog
        open={showRecurringRewardDialog}
        onOpenChange={setShowRecurringRewardDialog}
      />
      
      <SendBroadcastSheet
        open={showBroadcastDialog}
        onOpenChange={setShowBroadcastDialog}
      />
      
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
                    <NextImage
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

// Add this useEffect to clean up the timer when the component unmounts
