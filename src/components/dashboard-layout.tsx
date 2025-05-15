"use client"

import { SideNav } from "@/components/side-nav"
import { usePathname } from "next/navigation"
import { Bell, Search, Command, FileText, Check, X, ChevronDown, Sparkles, Award, Gift, PlusCircle, Image, MessageSquare, Zap, ShoppingCart, Coffee, Bot, BarChart, Target, Lightbulb, Brain, Cpu, Mic } from "lucide-react"
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
import { collection, query, where, getDocs, Timestamp, orderBy, limit, getDoc, doc } from "firebase/firestore"
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
import { getFunctions, httpsCallable } from "firebase/functions"
import { useToast } from "@/components/ui/use-toast"

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
  
  const { toast } = useToast()
  
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
        const customerData: Record<string, { fullName?: string }> = {};
        
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
                  
                  customerData[customerId] = { 
                    fullName: customerName
                  };
                }
              } catch (error) {
                console.error(`Error fetching customer ${customerId}:`, error);
              }
            })
          );
        }
        
        // Attach customer names to the notifications
        const notificationsWithCustomerNames = notificationsData.map(notification => {
          if (notification.customerId && customerData[notification.customerId]) {
            return {
              ...notification,
              customerFullName: customerData[notification.customerId].fullName
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
      default:
        return <Bell className="h-4 w-4 text-blue-500" />
    }
  }
  
  // Function to get the current page title based on pathname
  const getPageTitle = () => {
    const path = pathname?.split('/')[1]
    if (!path) return 'Dashboard'
    
    // Convert path to title case (e.g., "store" -> "Store")
    return path.charAt(0).toUpperCase() + path.slice(1)
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
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden bg-[#F5F5F5]">
        {/* Apply custom scrollbar styles */}
        <style jsx global>{scrollbarStyles}</style>
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="default"
                  size="sm"
                  className="h-9 gap-2 bg-[#007AFF] hover:bg-[#0066CC] text-white"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => setShowRewardDialog(true)}>
                  <Gift className="h-4 w-4 mr-2" />
                  New Reward
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowRecurringRewardDialog(true)}>
                  <Coffee className="h-4 w-4 mr-2" />
                  Create Program
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBannerDialog(true)}>
                  <Image className="h-4 w-4 mr-2" />
                  New Banner
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowBroadcastDialog(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  New Message
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowPointsRuleDialog(true)}>
                  <Zap className="h-4 w-4 mr-2" />
                  New Points Rule
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowIntroRewardSheet(true)}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Introductory Reward</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Voice Note button */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-white hover:bg-gray-50 border-transparent"
                onClick={handleVoiceNoteClick}
                disabled={audioProcessing}
              >
                {audioProcessing ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mr-1.5"></span>
                    Processing...
                  </>
                ) : recording ? (
                  <>
                    <Mic className="h-4 w-4 text-red-500 mr-1.5 animate-pulse" />
                    {formatDuration(recordingDuration)}
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 text-blue-500 mr-1.5" />
                    Voice Note
                  </>
                )}
              </Button>
              {/* Tap Agent button */}
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-white hover:bg-gray-50 border-transparent"
                onClick={() => setShowTapAgentSheet(true)}
              >
                <Bot className="h-4 w-4 text-blue-500 mr-1.5" />
                <div className="flex items-center">
                  <span className="font-bold text-blue-500">Tap</span>
                  <span className="ml-0.5 bg-gradient-to-r from-blue-500 to-orange-400 bg-clip-text text-transparent font-bold animate-gradient-x">
                    Agent
                  </span>
                </div>
              </Button>
              <TapAiButton
                variant="default"
                size="sm"
                className="h-9 w-[120px] bg-[#007AFF] hover:bg-[#0066CC] text-white"
                //initialPrompt="How can I help you today?"
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="h-9 gap-2"
                asChild
              >
                <Link href="/docs">
                  <FileText className="h-4 w-4" />
                  Docs
                </Link>
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 rounded-md">
                <div className="flex items-center justify-between px-4 py-2 border-b">
                  <h3 className="font-medium">Notifications</h3>
                  {unreadCount > 0 && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 text-xs rounded-md"
                      onClick={markAllAsRead}
                    >
                      Mark all as read
                    </Button>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notificationsLoading ? (
                    <div className="py-6 text-center">
                      <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading notifications...</p>
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="py-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div 
                        key={notification.id} 
                        className={cn(
                          "px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer",
                          !notification.read && "bg-blue-50/50"
                        )}
                        onClick={() => markAsRead(notification.id)}
                      >
                        <div className="flex gap-3">
                          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-medium">{notification.message}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.dateCreated || notification.timestamp)}
                              </p>
                            </div>
                            {notification.customerId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Customer: {notification.customerFullName || notification.customerId.substring(0, 8)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center" asChild>
                  <a href="/notifications" className="w-full text-center cursor-pointer">
                    View all notifications
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-auto px-2 pb-2">
          <div className="bg-white rounded-md h-full overflow-auto custom-scrollbar border border-gray-200">
            {children}
          </div>
        </main>
      </div>

      {/* Add the dialogs */}
      <CreateBannerDialog 
        open={showBannerDialog} 
        onOpenChange={setShowBannerDialog}
      />
      <CreateRewardSheet 
        open={showRewardDialog} 
        onOpenChange={setShowRewardDialog}
      />
      <CreatePointsRuleSheet 
        open={showPointsRuleDialog} 
        onOpenChange={setShowPointsRuleDialog}
      />
      <SendBroadcastSheet 
        open={showBroadcastDialog} 
        onOpenChange={setShowBroadcastDialog}
      />
      <CreateRecurringRewardDialog
        open={showRecurringRewardDialog}
        onOpenChange={setShowRecurringRewardDialog}
      />
      
      {/* Competitor Analysis Sheet */}
      <Sheet open={showCompetitorAnalysis} onOpenChange={setShowCompetitorAnalysis}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col">
          <div className="flex-none px-6 py-4 border-b">
            <SheetHeader className="mb-2">
              <SheetTitle className="text-xl font-bold flex items-center">
                <Target className="h-5 w-5 mr-3 text-blue-500" />
                <span className="bg-gradient-to-r from-blue-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">Competitor Intelligence</span>
              </SheetTitle>
              <SheetDescription>
                AI-powered analysis of your local market and competitors
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-auto p-6 pt-2">
            {competitorAnalysisLoading ? (
              <div className="h-full pt-0">
                <div className="mt-0 mb-1 text-left">
                  <h3 className="text-lg font-medium text-blue-600 animate-pulse">
                    Tap Agent is thinking<span className="animate-ellipsis">...</span>
                  </h3>
                </div>
                
                {/* Agent workflow animation - steps appear sequentially */}
                <div className="w-full space-y-2">
                  {/* Step 1 */}
                  <div id="step-1-container" className="w-full bg-white rounded-md p-3 border border-gray-800 shadow-sm">
                    <div className="flex items-center">
                      <div id="step-1-spinner" className="relative h-6 w-6 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-orange-400 rounded-full"></div>
                        </div>
                      </div>
                      <div id="step-1-check" className="h-6 w-6 mr-3 flex-shrink-0 text-green-500 hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-800">Looking up merchant information</p>
                        <p id="step-1-status" className="text-xs text-gray-600 mt-0.5 animate-pulse">Processing<span className="animate-ellipsis">...</span></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 2 */}
                  <div id="step-2-container" className="w-full bg-gray-50 rounded-md p-3 border border-gray-200 opacity-70">
                    <div className="flex items-center">
                      <div id="step-2-spinner" className="relative h-6 w-6 mr-3 flex-shrink-0 hidden">
                        <div className="absolute inset-0 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-orange-400 rounded-full"></div>
                        </div>
                      </div>
                      <div id="step-2-check" className="h-6 w-6 mr-3 flex-shrink-0 text-green-500 hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div id="step-2-number" className="h-6 w-6 mr-3 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-xs">2</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-600">Conducting competitor analysis</p>
                        <p id="step-2-status" className="text-xs text-gray-500 mt-0.5">Waiting...</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 3 */}
                  <div id="step-3-container" className="w-full bg-gray-50 rounded-md p-3 border border-gray-200 opacity-70">
                    <div className="flex items-center">
                      <div id="step-3-spinner" className="relative h-6 w-6 mr-3 flex-shrink-0 hidden">
                        <div className="absolute inset-0 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-orange-400 rounded-full"></div>
                        </div>
                      </div>
                      <div id="step-3-check" className="h-6 w-6 mr-3 flex-shrink-0 text-green-500 hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div id="step-3-number" className="h-6 w-6 mr-3 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-xs">3</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-600">Generating strategic insights</p>
                        <p id="step-3-status" className="text-xs text-gray-500 mt-0.5">Waiting...</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 4 */}
                  <div id="step-4-container" className="w-full bg-gray-50 rounded-md p-3 border border-gray-200 opacity-70">
                    <div className="flex items-center">
                      <div id="step-4-spinner" className="relative h-6 w-6 mr-3 flex-shrink-0 hidden">
                        <div className="absolute inset-0 rounded-full border-2 border-orange-400 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-1.5 w-1.5 bg-orange-400 rounded-full"></div>
                        </div>
                      </div>
                      <div id="step-4-check" className="h-6 w-6 mr-3 flex-shrink-0 text-green-500 hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div id="step-4-number" className="h-6 w-6 mr-3 flex-shrink-0 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-xs">4</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-600">Preparing recommendations</p>
                        <p id="step-4-status" className="text-xs text-gray-500 mt-0.5">Waiting...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : competitorAnalysisResults ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">Market Overview</h3>
                  <p className="text-gray-700">
                    Your business is positioned in a moderately competitive market with 8 direct competitors in a 5-mile radius.
                    The average customer satisfaction score in your area is 4.2/5, with your business currently at 4.5/5.
                  </p>
                </div>
                
                {/* This would be populated with actual data from the Firebase function */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Top Competitors</h3>
                  
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Competitor A</h4>
                        <p className="text-sm text-gray-500 mt-1">0.8 miles away • 4.7/5 rating</p>
                      </div>
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">
                        High Threat
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm">
                      <p className="text-gray-700">Strengths: Customer service, product variety</p>
                      <p className="text-gray-700">Weaknesses: Higher pricing, limited hours</p>
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">Competitor B</h4>
                        <p className="text-sm text-gray-500 mt-1">1.2 miles away • 4.3/5 rating</p>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
                        Medium Threat
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm">
                      <p className="text-gray-700">Strengths: Marketing, location</p>
                      <p className="text-gray-700">Weaknesses: Product quality, staff turnover</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Strategic Recommendations</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Highlight your superior customer satisfaction in marketing</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Your 4.5/5 rating exceeds the local average of 4.2/5
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Consider extending business hours</p>
                        <p className="text-sm text-gray-600 mt-1">
                          This would address a key weakness of your highest-rated competitor
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Implement a loyalty program</p>
                        <p className="text-sm text-gray-600 mt-1">
                          None of your top 3 competitors currently offer robust loyalty incentives
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="max-w-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-1">Competitor Intelligence</h3>
                    <p className="text-gray-500">
                      Analyze your local market and competitors to gain strategic insights and recommendations.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setCompetitorAnalysisLoading(true);
                      
                      // Sequential animation with 3 seconds per step
                      
                      // Step 1 is already active
                      
                      // After 3 seconds, complete step 1 and activate step 2
                      setTimeout(() => {
                        // Complete step 1
                        const step1Spinner = document.getElementById('step-1-spinner');
                        const step1Check = document.getElementById('step-1-check');
                        const step1Status = document.getElementById('step-1-status');
                        
                        if (step1Spinner) step1Spinner.classList.add('hidden');
                        if (step1Check) step1Check.classList.remove('hidden');
                        if (step1Status) step1Status.innerHTML = 'Complete';
                        
                        // Activate step 2
                        const step2Container = document.getElementById('step-2-container');
                        const step2Number = document.getElementById('step-2-number');
                        const step2Spinner = document.getElementById('step-2-spinner');
                        const step2Status = document.getElementById('step-2-status');
                        
                        if (step2Container) step2Container.className = 'w-full bg-white rounded-md p-3 border border-gray-200 shadow-sm';
                        if (step2Number) step2Number.classList.add('hidden');
                        if (step2Spinner) step2Spinner.classList.remove('hidden');
                        if (step2Status) step2Status.innerHTML = '<span class="animate-pulse">Generating insights<span class="animate-ellipsis">...</span></span>';
                      }, 3000);
                      
                      // After 6 seconds, complete step 2 and activate step 3
                      setTimeout(() => {
                        // Complete step 2
                        const step2Spinner = document.getElementById('step-2-spinner');
                        const step2Check = document.getElementById('step-2-check');
                        const step2Status = document.getElementById('step-2-status');
                        
                        if (step2Spinner) step2Spinner.classList.add('hidden');
                        if (step2Check) step2Check.classList.remove('hidden');
                        if (step2Status) step2Status.innerHTML = 'Complete';
                        
                        // Activate step 3
                        const step3Container = document.getElementById('step-3-container');
                        const step3Number = document.getElementById('step-3-number');
                        const step3Spinner = document.getElementById('step-3-spinner');
                        const step3Status = document.getElementById('step-3-status');
                        
                        if (step3Container) step3Container.className = 'w-full bg-white rounded-md p-3 border border-gray-200 shadow-sm';
                        if (step3Number) step3Number.classList.add('hidden');
                        if (step3Spinner) step3Spinner.classList.remove('hidden');
                        if (step3Status) step3Status.innerHTML = '<span class="animate-pulse">Analyzing opportunities<span class="animate-ellipsis">...</span></span>';
                      }, 6000);
                      
                      // After 9 seconds, complete step 3 and activate step 4
                      setTimeout(() => {
                        // Complete step 3
                        const step3Spinner = document.getElementById('step-3-spinner');
                        const step3Check = document.getElementById('step-3-check');
                        const step3Status = document.getElementById('step-3-status');
                        
                        if (step3Spinner) step3Spinner.classList.add('hidden');
                        if (step3Check) step3Check.classList.remove('hidden');
                        if (step3Status) step3Status.innerHTML = 'Complete';
                        
                        // Activate step 4
                        const step4Container = document.getElementById('step-4-container');
                        const step4Number = document.getElementById('step-4-number');
                        const step4Spinner = document.getElementById('step-4-spinner');
                        const step4Status = document.getElementById('step-4-status');
                        
                        if (step4Container) step4Container.className = 'w-full bg-white rounded-md p-3 border border-gray-200 shadow-sm';
                        if (step4Number) step4Number.classList.add('hidden');
                        if (step4Spinner) step4Spinner.classList.remove('hidden');
                        if (step4Status) step4Status.innerHTML = '<span class="animate-pulse">Creating report<span class="animate-ellipsis">...</span></span>';
                        
                        // After showing step 4 for 3 seconds, complete it and show results
                        setTimeout(() => {
                          // Complete step 4
                          const step4Spinner = document.getElementById('step-4-spinner');
                          const step4Check = document.getElementById('step-4-check');
                          const step4Status = document.getElementById('step-4-status');
                          
                          if (step4Spinner) step4Spinner.classList.add('hidden');
                          if (step4Check) step4Check.classList.remove('hidden');
                          if (step4Status) step4Status.innerHTML = 'Complete';
                          
                          // Show results after a brief pause
                          setTimeout(() => {
                            setCompetitorAnalysisLoading(false);
                            setCompetitorAnalysisResults({
                              // This would be populated with actual data from the Firebase function
                              marketOverview: {
                                competitorCount: 8,
                                averageRating: 4.2,
                                businessRating: 4.5
                              },
                              competitors: [
                                {
                                  name: "Competitor A",
                                  distance: 0.8,
                                  rating: 4.7,
                                  threatLevel: "high",
                                  strengths: ["Customer service", "product variety"],
                                  weaknesses: ["Higher pricing", "limited hours"]
                                },
                                {
                                  name: "Competitor B",
                                  distance: 1.2,
                                  rating: 4.3,
                                  threatLevel: "medium",
                                  strengths: ["Marketing", "location"],
                                  weaknesses: ["Product quality", "staff turnover"]
                                }
                              ],
                              recommendations: [
                                {
                                  title: "Highlight your superior customer satisfaction in marketing",
                                  description: "Your 4.5/5 rating exceeds the local average of 4.2/5"
                                },
                                {
                                  title: "Consider extending business hours",
                                  description: "This would address a key weakness of your highest-rated competitor"
                                },
                                {
                                  title: "Implement a loyalty program",
                                  description: "None of your top 3 competitors currently offer robust loyalty incentives"
                                }
                              ]
                            });
                          }, 1000);
                        }, 3000);
                      }, 9000);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Start Analysis
                  </Button>
                </div>
                
                <div className="flex items-center justify-center h-48">
                  <Target className="h-16 w-16 text-gray-200" />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-none px-6 py-4 border-t">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowCompetitorAnalysis(false)}
              >
                Close
              </Button>
              
              {competitorAnalysisResults && (
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-orange-400 hover:from-blue-600 hover:to-orange-500 text-white"
                >
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Sales Activity Analysis Sheet */}
      <Sheet open={showSalesAnalysis} onOpenChange={setShowSalesAnalysis}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col">
          <div className="flex-none px-6 py-4 border-b">
            <SheetHeader className="mb-2">
              <SheetTitle className="text-xl font-bold flex items-center">
                <BarChart className="h-5 w-5 mr-3 text-blue-500" />
                <span className="bg-gradient-to-r from-blue-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">Sales Activity Analysis</span>
              </SheetTitle>
              <SheetDescription>
                AI-powered analysis of your recent sales activities and customer engagement
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {salesAnalysisLoading ? (
              <div className="h-full">
                <div className="mb-8 text-center">
                  <h3 className="text-xl font-medium text-blue-600 animate-pulse">
                    Tap Agent is thinking<span className="animate-ellipsis">...</span>
                  </h3>
                </div>
                
                {/* Agent workflow animation - steps appear one after another */}
                <div className="w-full max-w-md mx-auto space-y-3">
                  {/* Step 1: Always visible from the start */}
                  <div 
                    id="sales-step-1-container"
                    className="bg-blue-50 rounded-lg p-4 border border-blue-100 transform transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">Processing transaction history</p>
                        <p className="text-sm text-blue-600 mt-1">Analyzing data<span className="animate-ellipsis">...</span></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 2: Hidden initially, appears with animation */}
                  <div 
                    id="sales-step-2-container"
                    className="bg-blue-50 rounded-lg p-4 border border-blue-100 opacity-0 transform translate-y-4 transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">Identifying sales patterns</p>
                        <p className="text-sm text-blue-600 mt-1">Discovering trends<span className="animate-ellipsis">...</span></p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 3: Hidden initially, appears with animation */}
                  <div 
                    id="sales-step-3-container"
                    className="bg-blue-50 rounded-lg p-4 border border-blue-100 opacity-0 transform translate-y-4 transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-blue-800">Analyzing customer engagement</p>
                        <p className="text-sm text-blue-600 mt-1">Creating report<span className="animate-ellipsis">...</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : salesAnalysisResults ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-orange-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-medium text-blue-800 mb-2">Performance Summary</h3>
                  <p className="text-gray-700">
                    Your sales have increased by 12% compared to last month, with customer engagement up by 8%.
                    Peak transaction times are between 11am-2pm and 5pm-7pm.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Top Performing Products</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-all">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Cappuccino</h4>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">
                          +18% ↑
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">42% of total coffee sales</p>
                    </div>
                    
                    <div className="border rounded-lg p-4 hover:bg-gray-50 transition-all">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Croissant</h4>
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-none">
                          +15% ↑
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">38% of total pastry sales</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Customer Engagement</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Loyalty program participation up 22%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          New customers are signing up at 2.3x the rate of last quarter
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Average transaction value increased</p>
                        <p className="text-sm text-gray-600 mt-1">
                          $8.75 per transaction, up from $7.20 last month
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Repeat customer rate at 68%</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Industry average is 42% - your customer retention is excellent
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="max-w-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-1">Sales Activity Analysis</h3>
                    <p className="text-gray-500">
                      Analyze your recent sales data to discover trends, top products, and customer engagement patterns.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setSalesAnalysisLoading(true);
                      
                      // Sequential loading animation - show steps one after another
                      const step1 = document.getElementById('sales-step-1-container');
                      const step2 = document.getElementById('sales-step-2-container');
                      const step3 = document.getElementById('sales-step-3-container');
                      
                      // Make sure step 1 is visible
                      if (step1) {
                        step1.classList.remove('opacity-0', 'translate-y-4');
                        step1.classList.add('opacity-100', 'translate-y-0');
                      }
                      
                      // After 1.5 seconds, show step 2
                      setTimeout(() => {
                        if (step2) {
                          step2.classList.remove('opacity-0', 'translate-y-4');
                          step2.classList.add('opacity-100', 'translate-y-0');
                        }
                      }, 1500);
                      
                      // After 3 seconds, show step 3
                      setTimeout(() => {
                        if (step3) {
                          step3.classList.remove('opacity-0', 'translate-y-4');
                          step3.classList.add('opacity-100', 'translate-y-0');
                        }
                        
                        // Complete the final step and show results after a short delay
                        setTimeout(() => {
                          setSalesAnalysisLoading(false);
                          setSalesAnalysisResults({
                            // This would be populated with actual data from a Firebase function
                            performanceSummary: {
                              salesIncrease: "12%",
                              engagementIncrease: "8%",
                              peakTimes: ["11am-2pm", "5pm-7pm"]
                            },
                            topProducts: [
                              {
                                name: "Cappuccino",
                                increase: "+18%",
                                percentageOfCategory: "42%"
                              },
                              {
                                name: "Croissant",
                                increase: "+15%",
                                percentageOfCategory: "38%"
                              }
                            ],
                            customerEngagement: [
                              {
                                metric: "Loyalty program participation",
                                value: "up 22%",
                                detail: "New customers are signing up at 2.3x the rate of last quarter"
                              },
                              {
                                metric: "Average transaction value",
                                value: "$8.75",
                                detail: "Up from $7.20 last month"
                              },
                              {
                                metric: "Repeat customer rate",
                                value: "68%",
                                detail: "Industry average is 42% - your customer retention is excellent"
                              }
                            ]
                          });
                        }, 1500);
                      }, 3000);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-orange-400 hover:from-blue-600 hover:to-orange-500 text-white"
                  >
                    Start Analysis
                  </Button>
                </div>
                
                <div className="flex items-center justify-center h-48">
                  <BarChart className="h-16 w-16 text-gray-200" />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-none px-6 py-4 border-t">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowSalesAnalysis(false)}
              >
                Close
              </Button>
              
              {salesAnalysisResults && (
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-orange-400 hover:from-blue-600 hover:to-orange-500 text-white"
                >
                  Export Report
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Random Reward Generator Sheet */}
      <Sheet open={showRewardGenerator} onOpenChange={setShowRewardGenerator}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-hidden p-0 flex flex-col">
          <div className="flex-none px-6 py-4 border-b">
            <SheetHeader className="mb-2">
              <SheetTitle className="text-2xl font-bold flex items-center">
                <Lightbulb className="h-6 w-6 mr-3 text-amber-500" />
                <span className="bg-gradient-to-r from-amber-500 to-orange-400 bg-clip-text text-transparent animate-gradient-x">Reward Generator</span>
              </SheetTitle>
              <SheetDescription>
                AI-powered reward ideas tailored to your business and customers
              </SheetDescription>
            </SheetHeader>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            {rewardGeneratorLoading ? (
              <div className="h-full">
                <div className="relative h-24 w-24 mx-auto mb-6">
                  {/* Pulsing circles */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-400 rounded-full opacity-20 animate-ping"></div>
                  <div className="absolute inset-2 bg-gradient-to-r from-amber-400 to-orange-300 rounded-full opacity-40 animate-pulse"></div>
                  <div className="absolute inset-4 bg-gradient-to-r from-amber-300 to-orange-200 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute inset-6 bg-gradient-to-r from-amber-200 to-orange-100 rounded-full opacity-80 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                  
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lightbulb className="h-8 w-8 text-amber-600" />
                  </div>
                </div>
                
                {/* Agent workflow animation - only one step visible at a time */}
                <div className="w-full max-w-md mx-auto">
                  {/* Step 1: Always visible from the start */}
                  <div 
                    id="reward-step-1-container"
                    className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-3 transform transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Analyzing customer preferences</p>
                        <p className="text-sm text-amber-600 mt-1">Evaluating purchase history and loyalty patterns...</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 2: Hidden initially, appears with animation */}
                  <div 
                    id="reward-step-2-container"
                    className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-3 hidden transform transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Evaluating market trends</p>
                        <p className="text-sm text-amber-600 mt-1">Identifying effective promotion strategies...</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Step 3: Hidden initially, appears with animation */}
                  <div 
                    id="reward-step-3-container"
                    className="bg-amber-50 rounded-lg p-4 border border-amber-100 hidden transform transition-all duration-500 ease-in-out"
                  >
                    <div className="flex items-center">
                      <div className="relative h-8 w-8 mr-3 flex-shrink-0">
                        <div className="absolute inset-0 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-amber-800">Creating personalized reward</p>
                        <p className="text-sm text-amber-600 mt-1">Designing an optimized incentive program...</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : generatedReward ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg border border-amber-100">
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-16 w-16 bg-gradient-to-r from-amber-500 to-orange-400 rounded-full flex items-center justify-center">
                      <Gift className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  <h3 className="font-bold text-xl text-center text-amber-800 mb-2">{generatedReward.name}</h3>
                  <p className="text-gray-700 text-center mb-4">
                    {generatedReward.description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <span className="block text-gray-500 mb-1">Points Cost</span>
                      <span className="font-medium">{generatedReward.pointsCost} points</span>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="block text-gray-500 mb-1">Estimated Value</span>
                      <span className="font-medium">${generatedReward.estimatedValue}</span>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="block text-gray-500 mb-1">Target Audience</span>
                      <span className="font-medium">{generatedReward.targetAudience}</span>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="block text-gray-500 mb-1">Duration</span>
                      <span className="font-medium">{generatedReward.duration}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium border-b pb-2">Implementation Tips</h3>
                  
                  <div className="space-y-3">
                    {generatedReward.tips.map((tip: string, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 text-white flex items-center justify-center flex-shrink-0 text-xs">
                          {index + 1}
                        </div>
                        <p className="text-gray-700">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button 
                    onClick={() => {
                      setGeneratedReward(null);
                      setRewardGeneratorLoading(true);
                      
                      // Sequential loading animation - show one step at a time
                      const step1 = document.getElementById('reward-step-1-container');
                      const step2 = document.getElementById('reward-step-2-container');
                      const step3 = document.getElementById('reward-step-3-container');
                      
                      // Make sure step 1 is visible and others are hidden
                      if (step1) step1.classList.remove('hidden');
                      if (step2) step2.classList.add('hidden');
                      if (step3) step3.classList.add('hidden');
                      
                      // After 1.5 seconds, hide step 1 and show step 2
                      setTimeout(() => {
                        if (step1) step1.classList.add('hidden');
                        if (step2) {
                          step2.classList.remove('hidden');
                          step2.classList.remove('opacity-0', 'translate-y-4');
                          step2.classList.add('opacity-100', 'translate-y-0');
                        }
                      }, 1500);
                      
                      // After 3 seconds, hide step 2 and show step 3
                      setTimeout(() => {
                        if (step2) step2.classList.add('hidden');
                        if (step3) {
                          step3.classList.remove('hidden');
                          step3.classList.remove('opacity-0', 'translate-y-4');
                          step3.classList.add('opacity-100', 'translate-y-0');
                        }
                        
                        // After 4.5 seconds, show the results
                        setTimeout(() => {
                          setRewardGeneratorLoading(false);
                          setGeneratedReward({
                            name: "Midweek Morning Special",
                            description: "Free pastry with any coffee purchase before 10am, Tuesday-Thursday. Designed to boost slower morning traffic.",
                            pointsCost: 100,
                            estimatedValue: "3.50",
                            targetAudience: "Morning commuters",
                            duration: "Ongoing",
                            tips: [
                              "Promote to customers who typically visit on weekends to encourage weekday visits",
                              "Display prominent signage during the morning rush hour",
                              "Consider adding a loyalty card element for repeat weekday visits",
                              "Track morning sales increases to measure effectiveness"
                            ]
                          });
                        }, 1500);
                      }, 3000);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white"
                  >
                    Generate Another Reward
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div className="max-w-md">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Reward Generator</h3>
                    <p className="text-gray-500">
                      Let AI create unique reward ideas tailored to your business and customer preferences.
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setRewardGeneratorLoading(true);
                      
                      // Sequential loading animation - show one step at a time
                      const step1 = document.getElementById('reward-step-1-container');
                      const step2 = document.getElementById('reward-step-2-container');
                      const step3 = document.getElementById('reward-step-3-container');
                      
                      // Make sure step 1 is visible and others are hidden
                      if (step1) step1.classList.remove('hidden');
                      if (step2) step2.classList.add('hidden');
                      if (step3) step3.classList.add('hidden');
                      
                      // After 1.5 seconds, hide step 1 and show step 2
                      setTimeout(() => {
                        if (step1) step1.classList.add('hidden');
                        if (step2) {
                          step2.classList.remove('hidden');
                          step2.classList.remove('opacity-0', 'translate-y-4');
                          step2.classList.add('opacity-100', 'translate-y-0');
                        }
                      }, 1500);
                      
                      // After 3 seconds, hide step 2 and show step 3
                      setTimeout(() => {
                        if (step2) step2.classList.add('hidden');
                        if (step3) {
                          step3.classList.remove('hidden');
                          step3.classList.remove('opacity-0', 'translate-y-4');
                          step3.classList.add('opacity-100', 'translate-y-0');
                        }
                        
                        // After 4.5 seconds, show the results
                        setTimeout(() => {
                          setRewardGeneratorLoading(false);
                          setGeneratedReward({
                            name: "Midweek Morning Special",
                            description: "Free pastry with any coffee purchase before 10am, Tuesday-Thursday. Designed to boost slower morning traffic.",
                            pointsCost: 100,
                            estimatedValue: "3.50",
                            targetAudience: "Morning commuters",
                            duration: "Ongoing",
                            tips: [
                              "Promote to customers who typically visit on weekends to encourage weekday visits",
                              "Display prominent signage during the morning rush hour",
                              "Consider adding a loyalty card element for repeat weekday visits",
                              "Track morning sales increases to measure effectiveness"
                            ]
                          });
                        }, 1500);
                      }, 3000);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white"
                  >
                    Generate Reward
                  </Button>
                </div>
                
                <div className="flex items-center justify-center h-64">
                  <Lightbulb className="h-16 w-16 text-gray-200" />
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-none px-6 py-4 border-t">
            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowRewardGenerator(false)}
              >
                Close
              </Button>
              
              {generatedReward && (
                <Button 
                  className="bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-600 hover:to-orange-500 text-white"
                  onClick={() => setShowRewardDialog(true)}
                >
                  Create This Reward
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
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
    </div>
  )
} 

// Add this useEffect to clean up the timer when the component unmounts
