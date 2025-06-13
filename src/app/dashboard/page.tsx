"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Users, 
  Gift, 
  Zap, 
  ShoppingCart, 
  Calendar,
  PlusCircle,
  Coffee,
  DollarSign,
  Clock,
  Star,
  ChevronRight,
  ChevronLeft,
  BarChart as BarChartIcon,
  Eye,
  Server,
  Ticket,
  Lightbulb,
  PowerOff,
  MessageSquare,
  Settings,
  Sparkles,
  CheckCircle,
  ChevronDown,
  Layers,
  LineChart,
  Percent,
  Inbox,
  Check as CheckIcon,
  Bell,
  AlertCircle,
  Minimize2,
  Maximize2,
  X,
  Bot,
  FileText,
  TrendingUp,
  Receipt,
  Headphones,
  Brain,
  BarChart3
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, where, Timestamp, onSnapshot } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { TapAiButton } from "@/components/tap-ai-button"
import { PageHeader } from "@/components/page-header"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { BasicRewardWizard } from "@/components/basic-reward-wizard"
import { CreateRewardSheet } from "@/components/create-reward-sheet"
import { IntroductoryRewardSheet } from "@/components/introductory-reward-sheet"
import { 
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  AtSign,
  Instagram as InstagramIcon,
  Mail,
  Search,
  SendHorizontal,
  Globe,
  Smartphone,
  XCircle
} from "lucide-react"
import Image from "next/image" // Add this import at the top of the file with other imports
import { getGmailMessages, getGmailMessage, GmailMessage, GmailFullMessage } from '@/lib/gmail-api'
import ReactMarkdown from 'react-markdown'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { TapAgentSheet } from "@/components/tap-agent-sheet"

// Add custom animation for the popup
const customAnimationStyles = `
  @keyframes slideInUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .animate-slideInUp {
    animation: slideInUp 0.3s ease-out forwards;
  }
`;

type TimeframeType = "today" | "yesterday" | "7days" | "30days"

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<TimeframeType>("today")
  const [initialLoading, setInitialLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [activityLoading, setActivityLoading] = useState(false)
  const [rewardsLoading, setRewardsLoading] = useState(false)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [popularRewards, setPopularRewards] = useState<any[]>([])
  const [activeBanners, setActiveBanners] = useState<any[]>([])
  const [scheduledBanners, setScheduledBanners] = useState<any[]>([])
  const [metricsType, setMetricsType] = useState<"loyalty" | "merchant">("loyalty")
  const [tapAgentMetrics, setTapAgentMetrics] = useState({
    lastRun: null as Date | null,
    rewardsCreated: 0,
    bannersCreated: 0,
    impressions: 0,
    clicks: 0,
    redemptions: 0,
    loading: true
  })
  const [metrics, setMetrics] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    customerGrowth: 0,
    totalPointsIssued: 0,
    redemptionRate: 0,
    avgOrderValue: 0,
    totalTransactions: 0,
    totalRedemptions: 0,
    activeRewards: 0,
    totalBannerImpressions: 0,
    totalStoreViews: 0,
    totalRewardViews: 0,
    customersWithRedeemableRewards: 0,
    customersWithoutRedeemableRewards: 0
  })
  const [histogramData, setHistogramData] = useState<any[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<"7days" | "30days" | "90days">("30days")
  const [chartLoading, setChartLoading] = useState(false)
  const [chartReady, setChartReady] = useState(false)
  const [insightDialogOpen, setInsightDialogOpen] = useState(false)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightData, setInsightData] = useState<any>(null)
  const [insightError, setInsightError] = useState<string | null>(null)
  const [topViewingCustomers, setTopViewingCustomers] = useState<any[]>([])
  const [topCustomersLoading, setTopCustomersLoading] = useState(false)
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false)
  const [showRewardDialog, setShowRewardDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null)
  const [isSetupWizardOpen, setIsSetupWizardOpen] = useState(false)
  const [isIntroductoryRewardSheetOpen, setIsIntroductoryRewardSheetOpen] = useState(false)
  const [setupChecklist, setSetupChecklist] = useState({
    tapAgent: false,
    banner: false,
    membershipLevels: false,
    pointsRule: false,
    posIntegration: false,
    openBanking: false,
    customReward: false,
    introductoryReward: false
  })
  const [commandInput, setCommandInput] = useState("")
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [selectedIntegrations, setSelectedIntegrations] = useState<{id: string, name: string, icon: React.ReactNode}[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isTapAgentSheetOpen, setIsTapAgentSheetOpen] = useState(false)
  const [runDailySummary, setRunDailySummary] = useState(false)
  
  // New states for Daily Summary functionality
  const [isDailySummaryLoading, setIsDailySummaryLoading] = useState(false)
  const [dailySummaryGmailResponse, setDailySummaryGmailResponse] = useState<string | null>(null)
  const [dailySummaryLightspeedResponse, setDailySummaryLightspeedResponse] = useState<string | null>(null)
  const [showDailySummaryPopup, setShowDailySummaryPopup] = useState(false)
  const [isPopupExpanded, setIsPopupExpanded] = useState(false)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowIntegrations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowIntegrations]);
  
  // Add a new state for processing status
  const [processingIntegrations, setProcessingIntegrations] = useState<Record<string, boolean>>({})
  const [isSummarizeInboxSheetOpen, setIsSummarizeInboxSheetOpen] = useState(false)
  const [inboxSummaryTimeframe, setInboxSummaryTimeframe] = useState<"1day" | "2day" | "3day" | "7day">("1day")
  const [inboxSummaryLoading, setInboxSummaryLoading] = useState(false)
  const [inboxSummaryResult, setInboxSummaryResult] = useState<string | null>(null)
  const [inboxSummaryError, setInboxSummaryError] = useState<string | null>(null)
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
  const [gmailQueryResponse, setGmailQueryResponse] = useState<string | null>(null)
  const [gmailQueryLoading, setGmailQueryLoading] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  
  // Lightspeed integration states
  const [lightspeedQueryResponse, setLightspeedQueryResponse] = useState<string | null>(null)
  const [lightspeedQueryLoading, setLightspeedQueryLoading] = useState(false)
  
  // Define a type for loading stages
  type LoadingStageType = "processing" | "finding" | "generating";
  
  const [loadingStage, setLoadingStage] = useState<LoadingStageType>("processing")
  const [debugResponse, setDebugResponse] = useState<string | null>(null)
  
  // Use refs for the timeouts to be able to clear them when needed
  const findingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const generatingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add Tap Loyalty state variables
  const [tapQueryResponse, setTapQueryResponse] = useState<string | null>(null)
  const [tapQueryLoading, setTapQueryLoading] = useState(false)

  // Add state variable for the AI assistant response
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null)
  const [assistantLoading, setAssistantLoading] = useState(false)
  const [activeAgents, setActiveAgents] = useState<any[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)

  // Add integrations state
  const [integrations, setIntegrations] = useState({
    square: { connected: false, data: null },
    clover: { connected: false, data: null },
    shopify: { connected: false, data: null },
    lightspeed_new: { connected: false, data: null },
    gmail: { connected: false, data: null },
    google_calendar: { connected: false, data: null },
    google_docs: { connected: false, data: null },
    google_sheets: { connected: false, data: null },
    hubspot: { connected: false, data: null },
    outlook: { connected: false, data: null }
  })
  const [integrationsLoading, setIntegrationsLoading] = useState(false)

  // Agents carousel state

  // Define available agents
  const availableAgents: Array<{
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    status: 'active' | 'coming-soon';
    color: string;
    features: string[];
    customisable?: boolean;
    frequencies?: string[];
  }> = [
    {
      id: 'customer-service',
      name: 'Customer Service Agent',
      description: 'Handle customer inquiries and support requests automatically',
      icon: <Headphones className="h-8 w-8 text-blue-500" />,
      status: 'active',
      color: 'blue',
      features: ['24/7 Support', 'Auto-responses', 'Ticket routing']
    },
    {
      id: 'email-summary',
      name: 'Email Summary Agent',
      description: 'Summarise and analyse your email communications',
      icon: <Inbox className="h-8 w-8 text-purple-500" />,
      status: 'active',
      color: 'purple',
      features: ['Daily summaries', 'Priority detection', 'Action items']
    },
    {
      id: 'insights',
      name: 'Insights Agent',
      description: 'Generate business insights from your data',
      icon: <Brain className="h-8 w-8 text-green-500" />,
      status: 'active',
      color: 'green',
      features: ['Data analysis', 'Trend detection', 'Recommendations']
    },
    {
      id: 'sales-analysis',
      name: 'Sales Analysis Agent',
      description: 'Analyse sales performance with customisable reporting',
      icon: <BarChart3 className="h-8 w-8 text-orange-500" />,
      status: 'active',
      color: 'orange',
      features: ['Daily reports', 'Weekly summaries', 'Monthly analysis'],
      customisable: true,
      frequencies: ['Daily', 'Weekly', 'Monthly']
    },
    {
      id: 'invoice-xero',
      name: 'Invoice Agent with Xero',
      description: 'Automate invoice processing and Xero integration',
      icon: <Receipt className="h-8 w-8 text-indigo-500" />,
      status: 'coming-soon',
      color: 'indigo',
      features: ['Auto-invoicing', 'Xero sync', 'Payment tracking']
    }
  ]

  // Carousel navigation functions



  const getDateRange = (tf: TimeframeType): { start: Date; end: Date } => {
    const now = new Date()
    const end = new Date(now) // Create a copy of now for end date
    
    switch (tf) {
      case "today":
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        return { start, end }
        
      case "yesterday":
        const yesterdayStart = new Date(now)
        yesterdayStart.setDate(yesterdayStart.getDate() - 1)
        yesterdayStart.setHours(0, 0, 0, 0)
        
        const yesterdayEnd = new Date(yesterdayStart)
        yesterdayEnd.setHours(23, 59, 59, 999)
        
        return { start: yesterdayStart, end: yesterdayEnd }
        
      case "7days":
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - 7)
        weekStart.setHours(0, 0, 0, 0)
        return { start: weekStart, end }
        
      case "30days":
        const monthStart = new Date(now)
        monthStart.setDate(monthStart.getDate() - 30)
        monthStart.setHours(0, 0, 0, 0)
        return { start: monthStart, end }
        
      default:
        // Default to today
        const defaultStart = new Date(now)
        defaultStart.setHours(0, 0, 0, 0)
        return { start: defaultStart, end }
    }
  }

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user?.uid) return
      
      try {
        setActivityLoading(true)
        
        // Debug transactions query
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(
          transactionsRef,
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        console.log('Fetching transactions from:', `merchants/${user.uid}/transactions`)
        
        // Update redemptions query to use top-level collection
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
          where('merchantId', '==', user.uid),
          orderBy('redemptionDate', 'desc'),
          limit(5)
        )
        
        console.log('Fetching redemptions for merchant:', user.uid)
        
        const [transactionsSnapshot, redemptionsSnapshot] = await Promise.all([
          getDocs(transactionsQuery),
          getDocs(redemptionsQuery)
        ])
        
        // Log raw redemptions data
        console.log('Raw redemptions data:', redemptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data()
        })))
        
        // Get unique customer IDs from both transactions and redemptions
        const customerIds = new Set([
          ...transactionsSnapshot.docs.map(doc => {
            const data = doc.data()
            return data.customerId
          }),
          ...redemptionsSnapshot.docs.map(doc => {
            const data = doc.data()
            return data.customerId
          })
        ])
        
        // Fetch customer data for each unique customer ID
        const customerData: Record<string, { name: string, profilePicture?: string }> = {}
        await Promise.all(
          Array.from(customerIds).map(async (customerId) => {
            if (customerId) {
              // Change to top-level customers collection
              const customerDoc = await getDoc(doc(db, 'customers', customerId))
              console.log('Raw customer data:', customerDoc.data())
              if (customerDoc.exists()) {
                const data = customerDoc.data()
                customerData[customerId] = {
                  name: data.fullName || 'Unknown Customer',
                  // Use the correct field from customers collection
                  profilePicture: data.profilePictureUrl || null
                }
                console.log('Processed customer:', customerId, customerData[customerId])
              }
            }
          })
        )
        
        // Convert transactions to activity format with type safety
        const transactionActivity = transactionsSnapshot.docs.map(doc => {
          const data = doc.data() as {
            type?: string
            customerId?: string
            createdAt?: { toDate(): Date }
            amount?: number
            status?: string
          }
          
          return {
            id: doc.id,
            type: "transaction",
            displayName: data.type || "purchase",
            customer: {
              id: data.customerId || '',
              name: customerData[data.customerId || '']?.name || "Unknown Customer",
              profilePicture: customerData[data.customerId || '']?.profilePicture
            },
            timestamp: data.createdAt?.toDate() || new Date(),
            amount: data.amount || 0,
            status: data.status || "completed"
          }
        })
        
        // Convert redemptions to activity format with type safety
        const redemptionActivity = redemptionsSnapshot.docs.map(doc => {
          const data = doc.data() as {
            customerId?: string
            merchantId: string
            pointsUsed: number
            redemptionDate: { toDate(): Date }
            redemptionId: string
            rewardId: string
            rewardName: string
            status: string
          }
          
          return {
            id: doc.id,
            type: "redemption",
            displayName: data.rewardName || "Unknown Reward",
            customer: {
              id: data.customerId || '',
              name: customerData[data.customerId || '']?.name || "Unknown Customer",
              profilePicture: customerData[data.customerId || '']?.profilePicture
            },
            timestamp: data.redemptionDate?.toDate() || new Date(),
            points: data.pointsUsed || 0,
            status: data.status || "completed",
            rewardName: data.rewardName,
            rewardId: data.rewardId,
          }
        })
        
        // Log processed redemption activity
        console.log('Processed redemption activity:', redemptionActivity)
        
        // Combine and sort by timestamp
        const combinedActivity = [...transactionActivity, ...redemptionActivity]
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 5) // Keep only the 5 most recent activities
        
        console.log('Final combined activity:', combinedActivity)
        
        setRecentActivity(combinedActivity)
        
      } catch (error) {
        console.error('Error in fetchRecentActivity:', error)
        toast({
          title: "Error",
          description: "Failed to load recent activity. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setActivityLoading(false)
        setInitialLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchRecentActivity()
    }
  }, [user?.uid])

  useEffect(() => {
    const fetchPopularRewards = async () => {
      if (!user?.uid) return
      
      try {
        setRewardsLoading(true)
        const { start, end } = getDateRange(timeframe)
        
        // Create a query to get all rewards for the merchant
        const rewardsQuery = query(
          collection(db, 'merchants', user.uid, 'rewards'),
          orderBy('redemptionCount', 'desc'),
          where('lastRedeemedAt', '>=', start),
          where('lastRedeemedAt', '<=', end),
          limit(3)
        )
        
        // Get the rewards documents
        const rewardsSnapshot = await getDocs(rewardsQuery)
        
        // Map the documents to our rewards format
        const rewardsData = rewardsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.rewardName || 'Unnamed Reward',
            rewardName: data.rewardName || 'Unnamed Reward',
            redemptionCount: data.redemptionCount || 0,
            impressions: data.impressions || 0,
            pointsCost: data.pointsCost || 0,
            type: data.type || 'item',
            programtype: data.programtype || null,
            conversionRate: data.conversionRate || 0,
            lastRedeemedAt: data.lastRedeemedAt?.toDate() || null
          }
        })
        
        console.log('Fetched rewards data:', rewardsData)
        
        // Set the rewards data directly, without using dummy data
        setPopularRewards(rewardsData)
        
      } catch (error) {
        console.error('Error fetching popular rewards:', error)
        toast({
          title: "Error",
          description: "Failed to load popular rewards. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setRewardsLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchPopularRewards()
    }
  }, [user?.uid, timeframe])

  useEffect(() => {
    const fetchBanners = async () => {
      if (!user?.uid) return
      
      try {
        // Fetch active and scheduled banners
        const activeBannersQuery = query(
          collection(db, 'merchants', user.uid, 'banners'),
          where('scheduled', '==', true),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        )
        
        // Fetch scheduled but not yet active banners
        const scheduledBannersQuery = query(
          collection(db, 'merchants', user.uid, 'banners'),
          where('scheduled', '==', true),
          where('isActive', '==', false),
          orderBy('createdAt', 'desc')
        )
        
        const [activeBannersSnapshot, scheduledBannersSnapshot] = await Promise.all([
          getDocs(activeBannersQuery),
          getDocs(scheduledBannersQuery)
        ])
        
        // Process banners with the same mapping function
        const processBannerData = (doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            buttonText: data.buttonText,
            color: data.color ?? "#0ea5e9",
            style: data.style?.toLowerCase() || 'light',
            styleType: data.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                       data.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                       data.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                       BannerStyle.LIGHT,
            merchantName: data.merchantName ?? "My Store",
            visibilityType: BannerVisibility.ALL,
            isActive: data.isActive,
            impressions: data.impressions || 0
          }
        }

        setActiveBanners(activeBannersSnapshot.docs.map(processBannerData))
        setScheduledBanners(scheduledBannersSnapshot.docs.map(processBannerData))
        
      } catch (error) {
        console.error('Error fetching banners:', error)
        toast({
          title: "Error",
          description: "Failed to load banners. Please refresh the page.",
          variant: "destructive"
        })
      }
    }
    
    if (user?.uid) {
      fetchBanners()
    }
  }, [user?.uid])

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user?.uid) return
      
      try {
        setMetricsLoading(true)
        const { start, end } = getDateRange(timeframe)
        
        // Fetch total customers
        const customersRef = collection(db, 'customers')
        const customersQuery = query(
          customersRef,
          where('merchantId', '==', user.uid)
        )
        const customersSnapshot = await getDocs(customersQuery)
        const totalCustomers = customersSnapshot.docs.length
        
        // Calculate active customers (had a transaction in the last 30 days)
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        
        // Get all transactions in the last 30 days
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const recentTransactionsQuery = query(
          transactionsRef,
          where('createdAt', '>=', thirtyDaysAgo)
        )
        const recentTransactionsSnapshot = await getDocs(recentTransactionsQuery)
        
        // Get unique customer IDs from recent transactions
        const activeCustomerIds = new Set()
        recentTransactionsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.customerId) {
            activeCustomerIds.add(data.customerId)
          }
        })
        const activeCustomers = activeCustomerIds.size
        
        // Calculate customers with redeemable rewards (customers with points >= minimum reward threshold)
        const minPointsForReward = 100 // Adjust this based on your reward system
        let customersWithRedeemableRewards = 0
        let customersWithoutRedeemableRewards = 0
        
        customersSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.points && data.points >= minPointsForReward) {
            customersWithRedeemableRewards++
          } else {
            customersWithoutRedeemableRewards++
          }
        })
        
        // Fetch total points issued
        const transactionsQuery = query(
          transactionsRef,
          where('merchantId', '==', user.uid),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end)
        )
        const transactionsSnapshot = await getDocs(transactionsQuery)
        const totalPointsIssued = transactionsSnapshot.docs.reduce((total, doc) => total + (doc.data().amount || 0), 0)
        
        // Fetch store views
        const storeViewsRef = collection(db, 'merchants', user.uid, 'storeViews')
        const storeViewsQuery = query(storeViewsRef)
        const storeViewsSnapshot = await getDocs(storeViewsQuery)
        const totalStoreViews = storeViewsSnapshot.docs.length
        
        // Calculate customer growth
        const customersRef2 = collection(db, 'customers')
        const customersQuery2 = query(
          customersRef2,
          where('merchantId', '==', user.uid),
          where('createdAt', '<', start)
        )
        const customersSnapshot2 = await getDocs(customersQuery2)
        const previousTotalCustomers = customersSnapshot2.docs.length
        const customerGrowth = ((totalCustomers - previousTotalCustomers) / previousTotalCustomers) * 100
        
        // Fetch active rewards from the correct path
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const activeRewardsQuery = query(
          rewardsRef,
          where('isActive', '==', true)
        )
        const activeRewardsSnapshot = await getDocs(activeRewardsQuery)
        const activeRewards = activeRewardsSnapshot.docs.length
        
        // Calculate total reward views by summing impressions from all rewards
        const allRewardsQuery = query(rewardsRef)
        const allRewardsSnapshot = await getDocs(allRewardsQuery)
        const totalRewardViews = allRewardsSnapshot.docs.reduce(
          (total, doc) => total + (doc.data().impressions || 0), 
          0
        )
        
        // Fetch banner impressions from the correct path
        const bannersRef = collection(db, 'merchants', user.uid, 'banners')
        const bannersQuery = query(bannersRef)
        const bannersSnapshot = await getDocs(bannersQuery)
        const totalBannerImpressions = bannersSnapshot.docs.reduce(
          (total, doc) => total + (doc.data().impressions || 0), 
          0
        )
        
        // Fetch average order value
        const totalAmount = transactionsSnapshot.docs.reduce((total, doc) => total + (doc.data().amount || 0), 0)
        const avgOrderValue = totalAmount / totalCustomers
        
        // Fetch redemptions data
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
          where('merchantId', '==', user.uid)
        )
        const redemptionsSnapshot = await getDocs(redemptionsQuery)
        const totalRedemptions = redemptionsSnapshot.docs.length
        
        // Update metrics state with all values
        setMetrics({
          totalCustomers,
          activeCustomers,
          customerGrowth,
          totalPointsIssued,
          totalStoreViews,
          avgOrderValue,
          totalTransactions: transactionsSnapshot.docs.length,
          totalRedemptions,
          redemptionRate: 0,
          activeRewards,
          totalBannerImpressions,
          totalRewardViews,
          customersWithRedeemableRewards,
          customersWithoutRedeemableRewards
        })
      } catch (error) {
        console.error('Error fetching metrics:', error)
        toast({
          title: "Error",
          description: "Failed to load metrics. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setMetricsLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchMetrics()
    }
  }, [user?.uid, timeframe])

  useEffect(() => {
    const fetchHistogramData = async () => {
      if (!user?.uid) return
      
      try {
        // Set chart loading to true and chart ready to false
        setChartLoading(true)
        setChartReady(false)
        
        // Get date range based on selected timeframe
        const end = new Date()
        const start = new Date()
        
        // Set the start date based on the selected timeframe
        if (chartTimeframe === "7days") {
          start.setDate(start.getDate() - 7)
        } else if (chartTimeframe === "30days") {
          start.setDate(start.getDate() - 30)
        } else if (chartTimeframe === "90days") {
          start.setDate(start.getDate() - 90)
        }
        
        // Create an array of all dates in the selected timeframe
        const days = chartTimeframe === "7days" ? 7 : chartTimeframe === "30days" ? 30 : 90;
        const dateArray = Array.from({ length: days }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (days - 1) + i)
          return {
            date: format(date, 'MMM dd'),
            fullDate: date,
            transactions: 0,
            redemptions: 0
          }
        })
        
        // Fetch transactions for the selected timeframe
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(
          transactionsRef,
          where('createdAt', '>=', start),
          where('createdAt', '<=', end),
          orderBy('createdAt', 'asc')
        )
        
        // Fetch redemptions for the selected timeframe
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
          where('merchantId', '==', user.uid),
          where('redemptionDate', '>=', start),
          where('redemptionDate', '<=', end),
          orderBy('redemptionDate', 'asc')
        )
        
        const [transactionsSnapshot, redemptionsSnapshot] = await Promise.all([
          getDocs(transactionsQuery),
          getDocs(redemptionsQuery)
        ])
        
        console.log(`Found ${transactionsSnapshot.docs.length} transactions and ${redemptionsSnapshot.docs.length} redemptions`);
        
        // Process transactions data
        transactionsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.createdAt) {
            const transactionDate = data.createdAt.toDate()
            const dateStr = format(transactionDate, 'MMM dd')
            
            // Find the matching date in our array and increment the transactions count
            const dateEntry = dateArray.find(d => d.date === dateStr)
            if (dateEntry) {
              dateEntry.transactions += 1
            }
          }
        })
        
        // Process redemptions data
        redemptionsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.redemptionDate) {
            const redemptionDate = data.redemptionDate.toDate()
            const dateStr = format(redemptionDate, 'MMM dd')
            
            // Find the matching date in our array and increment the redemptions count
            const dateEntry = dateArray.find(d => d.date === dateStr)
            if (dateEntry) {
              dateEntry.redemptions += 1
            }
          }
        })
        
        // Set the histogram data
        setHistogramData(dateArray)
        
        // Short delay before showing the chart to ensure smooth transition
        setTimeout(() => {
          setChartLoading(false)
          setChartReady(true)
        }, 300)
        
      } catch (error) {
        console.error('Error fetching histogram data:', error)
        toast({
          title: "Error",
          description: "Failed to load chart data. Please refresh the page.",
          variant: "destructive"
        })
        setChartLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchHistogramData()
    }
    
    // Reset chart ready state when timeframe changes
    return () => {
      setChartReady(false)
    }
  }, [user?.uid, chartTimeframe])

  useEffect(() => {
    const fetchTopViewingCustomers = async () => {
      if (!user?.uid) return
      
      try {
        setTopCustomersLoading(true)
        // Fetch store views
        const storeViewsRef = collection(db, 'merchants', user.uid, 'storeViews')
        const storeViewsQuery = query(storeViewsRef, orderBy('timestamp', 'desc'), limit(20))
        const storeViewsSnapshot = await getDocs(storeViewsQuery)
        
        // Count views by customer
        const customerViewCounts: Record<string, {count: number, lastView: Date}> = {}
        
        storeViewsSnapshot.docs.forEach(doc => {
          const data = doc.data()
          if (data.customerId) {
            if (!customerViewCounts[data.customerId]) {
              customerViewCounts[data.customerId] = {
                count: 0,
                lastView: data.timestamp?.toDate() || new Date()
              }
            }
            customerViewCounts[data.customerId].count++
          }
        })
        
        // Convert to array and sort by count
        const sortedCustomers = Object.entries(customerViewCounts)
          .map(([customerId, data]) => ({
            id: customerId,
            viewCount: data.count,
            lastView: data.lastView,
            name: 'Loading...',
            email: '',
            pointsBalance: 0
          }))
          .sort((a, b) => b.viewCount - a.viewCount)
          .slice(0, 5)
        
        // Fetch customer details
        const enhancedCustomers = await Promise.all(
          sortedCustomers.map(async (customer) => {
            try {
              const customerDoc = await getDoc(doc(db, 'customers', customer.id))
              if (customerDoc.exists()) {
                const data = customerDoc.data()
                return {
                  ...customer,
                  name: data.fullName || data.name || 'Unknown Customer',
                  email: data.email || '',
                  pointsBalance: data.pointsBalance || 0
                }
              }
              return customer
            } catch (error) {
              console.error('Error fetching customer details:', error)
              return customer
            }
          })
        )
        
        setTopViewingCustomers(enhancedCustomers)
        
      } catch (error) {
        console.error('Error fetching top viewing customers:', error)
      } finally {
        setTopCustomersLoading(false)
      }
    }
    
    if (user?.uid) {
      fetchTopViewingCustomers()
    }
  }, [user?.uid, timeframe])

  const fetchMerchantInsights = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User ID not found. Please log in again.",
        variant: "destructive"
      })
      return
    }

    console.log("Fetching merchant insights for user:", user.uid);
    
    try {
      setInsightLoading(true);
      setInsightError(null);
      setInsightDialogOpen(true);
      console.log("Dialog opened:", insightDialogOpen);

      // Call the actual Cloud Function URL
      const response = await fetch('https://merchantinsightanalysis-galv2k5a4q-uc.a.run.app', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantId: user.uid }),
      });

      console.log("Response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Failed to fetch insights: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      console.log("Data type:", typeof data);
      console.log("Insights type:", data.insights ? typeof data.insights : "undefined");
      console.log("Recommendations type:", data.recommendations ? typeof data.recommendations : "undefined");
      setInsightData(data);
      setInsightLoading(false);
      
    } catch (error) {
      console.error('Error fetching merchant insights:', error);
      setInsightError(error instanceof Error ? error.message : 'An unknown error occurred');
      toast({
        title: "Error",
        description: "Failed to fetch merchant insights. Please try again.",
        variant: "destructive"
      });
      setInsightLoading(false);
    }
  }

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy")
  }
  
  // Format time ago
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  // Safely render HTML content
  const renderHtml = (htmlContent: string | null) => {
    if (!htmlContent) return null;
    
    try {
      // Sanitize the HTML content to prevent XSS attacks
      // Note: In a production environment, you should use a proper HTML sanitizer library
      
      // Add additional spacing to HTML elements to improve readability
      const enhancedHtmlContent = htmlContent
        .replace(/<p>/g, '<p class="my-3">')
        .replace(/<ul>/g, '<ul class="my-3 list-disc pl-5">')
        .replace(/<ol>/g, '<ol class="my-3 list-decimal pl-5">')
        .replace(/<li>/g, '<li class="my-1">')
        .replace(/<h3>/g, '<h3 class="text-base font-semibold my-3">')
        .replace(/<h4>/g, '<h4 class="text-sm font-semibold my-2">');
      
      return (
        <div 
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h3:font-bold prose-p:my-3 prose-p:leading-relaxed prose-li:my-1 prose-li:leading-relaxed prose-table:border-collapse prose-th:bg-gray-50 prose-th:p-2 prose-th:font-semibold prose-td:p-2 prose-td:border prose-td:border-gray-200 space-y-4"
          dangerouslySetInnerHTML={{ __html: enhancedHtmlContent }} 
        />
      );
    } catch (error) {
      console.error('Error rendering HTML:', error);
      return (
        <div className="p-4 border border-red-200 rounded bg-red-50 text-red-800">
          <p className="font-medium">Error rendering content</p>
          <p className="text-sm mt-1">There was a problem displaying this content.</p>
        </div>
      );
    }
  };
  
  // Process API responses to handle both Markdown and HTML content
  const processApiResponse = (response: string | null) => {
    if (!response) return null;
    
    try {
      // Check if the response is a JSON string containing HTML in an "answer" field
      if (response.includes('"answer":')) {
        try {
          const jsonResponse = JSON.parse(response);
          if (jsonResponse.answer && typeof jsonResponse.answer === 'string') {
            // If the answer field contains HTML, return it directly
            return jsonResponse.answer;
          }
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          // Continue with other checks if JSON parsing fails
        }
      }
      
      // Check if the response is wrapped in code blocks and remove them
      if (response.includes('```')) {
        // Handle code blocks with language specifiers
        if (response.includes('```html')) {
          // This is explicitly marked as HTML
          return response.replace(/```html\n/g, '').replace(/```$/g, '');
        } else if (response.includes('```markdown')) {
          // This is explicitly marked as Markdown
          return response.replace(/```markdown\n/g, '').replace(/```$/g, '');
        } else {
          // Generic code block
          return response.replace(/```\w*\n/g, '').replace(/```$/g, '');
        }
      }
      
      // Check if the response is HTML by looking for common HTML tags
      const htmlPattern = /<(html|body|div|h[1-6]|p|ul|ol|li|table|tr|th|td|a|img|span|strong|em|b)[\s>]/i;
      if (htmlPattern.test(response.trim().substring(0, 100))) {
        // It's likely HTML content
        return response;
      }
      
      // Default - just return the response as is
      return response;
    } catch (error) {
      console.error('Error processing API response:', error);
      // Return the original response if there's an error
      return response;
    }
  }

  // Custom tooltip component for the chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm" style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 text-sm">
              <div 
                className="h-3 w-3 rounded-sm" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium">{entry.name}:</span>
              <span>{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div className="flex justify-center gap-6 mt-2" style={{ fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }}>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-1.5">
            <div 
              className="h-3 w-3 rounded-sm" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  // Handle OAuth callbacks
  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (!searchParams) return
      
      // Get parameters from URL
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      
      console.log('OAuth callback detected:', { hasCode: !!code, hasState: !!state, hasUser: !!user })
      console.log('URL parameters:', { code: code?.substring(0, 20) + '...', state })
      console.log('Current path:', window.location.pathname)
      
      if (!code || !state || !user) return
      
      // Check if it's a Square callback
      const storedSquareState = localStorage.getItem('square_state')
      console.log('Checking Square state:', { storedState: storedSquareState, urlState: state, match: state === storedSquareState })
      
      if (state === storedSquareState) {
        console.log('Square OAuth callback confirmed')
        try {
          // Get merchant ID from localStorage
          const merchantId = localStorage.getItem('merchant_id')
          console.log('Merchant ID from localStorage:', merchantId)
          
          if (!merchantId) {
            console.error('Missing merchant ID in localStorage')
            throw new Error('Missing merchant ID')
          }
          
          console.log('Exchanging code for token...')
          // Exchange code for token
          const response = await fetch('/api/oauth/square', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              state,
              merchantId
            })
          })
          
          console.log('Token exchange response status:', response.status)
          const data = await response.json()
          console.log('Token exchange response data:', data)
          
          if (data.success) {
            console.log('Square connection successful')
            toast({
              title: "Success!",
              description: "Your Square account has been connected.",
            })
          } else {
            console.error('Square connection failed:', data.error, data.details)
            throw new Error(data.error || 'Failed to connect Square account')
          }
          
          // Clear state from localStorage
          localStorage.removeItem('square_state')
          localStorage.removeItem('merchant_id')
          
          // Redirect to integrations page
          console.log('Redirecting to integrations page')
          router.push('/integrations')
        } catch (error) {
          console.error('Error handling Square callback:', error)
          toast({
            title: "Connection Failed",
            description: "We couldn't connect your Square account. Please try again.",
            variant: "destructive"
          })
        }
      } 
      // Check if it's a Lightspeed New callback
      else if (state === localStorage.getItem('lightspeed_new_state')) {
        console.log('Lightspeed New OAuth callback confirmed')
        try {
          // Get merchant ID and code verifier from localStorage
          const merchantId = localStorage.getItem('lightspeed_new_merchant_id')
          const codeVerifier = localStorage.getItem('lightspeed_new_code_verifier')
          
          console.log('Merchant ID from localStorage:', merchantId)
          console.log('Code verifier exists:', !!codeVerifier)
          console.log('Code verifier length:', codeVerifier ? codeVerifier.length : 0)
          
          if (!merchantId) {
            console.error('Missing merchant ID in localStorage')
            throw new Error('Missing merchant ID')
          }
          
          if (!codeVerifier) {
            console.error('Missing code verifier in localStorage')
            throw new Error('Missing code verifier')
          }
          
          console.log('Exchanging code for token...')
          // Exchange code for token - POST method for more reliable handling
          const response = await fetch('/api/lightspeed/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              merchantId,
              state,
              codeVerifier
            })
          })
          
          console.log('Token exchange response status:', response.status)
          const data = await response.json()
          console.log('Token exchange response data:', data)
          
          if (data.success) {
            console.log('Lightspeed New connection successful')
            toast({
              title: "Success!",
              description: "Your Lightspeed account has been connected.",
            })
            
            // Refresh the page or update the state to show the connected status
            // This ensures the UI shows the updated connection status
            setTimeout(() => {
              window.location.href = '/integrations';
            }, 1500)
          } else {
            console.error('Lightspeed New connection failed:', data.error, data.details)
            throw new Error(data.error || 'Failed to connect Lightspeed account')
          }
          
          // Clear state from localStorage
          localStorage.removeItem('lightspeed_new_state')
          localStorage.removeItem('lightspeed_new_merchant_id')
          localStorage.removeItem('lightspeed_new_code_verifier')
        } catch (error) {
          console.error('Error handling Lightspeed New callback:', error)
          toast({
            title: "Connection Failed",
            description: "We couldn't connect your Lightspeed account. Please try again.",
            variant: "destructive"
          })
          
          // Clear state from localStorage even on error
          localStorage.removeItem('lightspeed_new_state')
          localStorage.removeItem('lightspeed_new_merchant_id')
          localStorage.removeItem('lightspeed_new_code_verifier')
          
          // Redirect to integrations page even on error
          setTimeout(() => {
            window.location.href = '/integrations';
          }, 2000)
        }
      } else if (code && state) {
        // If we have code and state but no matching stored state, log this information
        console.log('OAuth callback received but no matching state found in localStorage', {
          availableLocalStorageKeys: Object.keys(localStorage),
          squareStateExists: !!localStorage.getItem('square_state'),
          lightspeedNewStateExists: !!localStorage.getItem('lightspeed_new_state'),
          lightspeedNewState: localStorage.getItem('lightspeed_new_state')
        })
      }
    }
    
    // Only run the callback handler if we have query parameters that look like an OAuth callback
    if (searchParams && (searchParams.get('code') || searchParams.get('state'))) {
      console.log('OAuth callback parameters detected in URL')
      handleOAuthCallback()
    }
  }, [searchParams, user, router])

  // Add function to fetch setup status
  useEffect(() => {
    const fetchSetupStatus = async () => {
      if (!user?.uid) return
      
      try {
        // Check Tap Agent setup
        const tapAgentRef = doc(db, 'agents', user.uid)
        const tapAgentDoc = await getDoc(tapAgentRef)
        
        // Check banner creation
        const bannersRef = collection(db, 'merchants', user.uid, 'banners')
        const bannersSnapshot = await getDocs(bannersRef)
        
        // Check membership levels
        const membershipLevelsRef = collection(db, 'merchants', user.uid, 'membershipLevels')
        const membershipLevelsSnapshot = await getDocs(membershipLevelsRef)
        
        // Check points rules
        const pointsRulesRef = collection(db, 'merchants', user.uid, 'pointsRules')
        const pointsRulesSnapshot = await getDocs(pointsRulesRef)
        
        // Check POS integration
        const integrationsRef = doc(db, 'merchants', user.uid, 'integrations', 'square')
        const integrationsDoc = await getDoc(integrationsRef)
        
        // Check open banking
        const openBankingRef = doc(db, 'merchants', user.uid, 'integrations', 'openBanking')
        const openBankingDoc = await getDoc(openBankingRef)
        
        // Check custom rewards
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const rewardsSnapshot = await getDocs(rewardsRef)
        
        // Check introductory reward
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantDoc = await getDoc(merchantRef)
        const merchantData = merchantDoc.data()
        
        setSetupChecklist({
          tapAgent: tapAgentDoc.exists(),
          banner: bannersSnapshot.docs.length > 0,
          membershipLevels: membershipLevelsSnapshot.docs.length > 0,
          pointsRule: pointsRulesSnapshot.docs.length > 0,
          posIntegration: integrationsDoc.exists() && integrationsDoc.data()?.connected === true,
          openBanking: openBankingDoc.exists() && openBankingDoc.data()?.connected === true,
          customReward: rewardsSnapshot.docs.length > 0,
          introductoryReward: merchantData?.hasIntroductoryReward === true
        })
        
      } catch (error) {
        console.error('Error fetching setup status:', error)
      }
    }
    
    if (user?.uid && isSetupWizardOpen) {
      fetchSetupStatus()
    }
  }, [user?.uid, isSetupWizardOpen])

  // Add function to handle checkbox changes
  const handleChecklistChange = (key: keyof typeof setupChecklist) => {
    setSetupChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Add a new function to fetch Tap Agent metrics
  useEffect(() => {
    const fetchTapAgentMetrics = async () => {
      if (!user?.uid) return;
      
      try {
        setTapAgentMetrics(prev => ({ ...prev, loading: true }));
        
        // Check if the agent is configured
        const agentDocRef = doc(db, 'agents', user.uid);
        const agentDoc = await getDoc(agentDocRef);
        
        if (!agentDoc.exists()) {
          setTapAgentMetrics(prev => ({ 
            ...prev, 
            loading: false,
            lastRun: null
          }));
          return;
        }
        
        const agentData = agentDoc.data();
        
        // Get rewards created by Tap Agent
        const agentRewardsQuery = query(
          collection(db, 'merchants', user.uid, 'rewards'),
          where('createdBy', '==', 'tapAgent')
        );
        const agentRewardsSnapshot = await getDocs(agentRewardsQuery);
        
        // Get banners created by Tap Agent
        const agentBannersQuery = query(
          collection(db, 'merchants', user.uid, 'banners'),
          where('createdBy', '==', 'tapAgent')
        );
        const agentBannersSnapshot = await getDocs(agentBannersQuery);
        
        // Get redemptions for agent-created rewards
        const agentRewardIds = agentRewardsSnapshot.docs.map(doc => doc.id);
        
        let totalRedemptions = 0;
        let totalImpressions = 0;
        let totalClicks = 0;
        
        // Sum up metrics from agent-created rewards
        agentRewardsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          totalRedemptions += data.redemptionCount || 0;
          totalImpressions += data.impressions || 0;
          totalClicks += data.clicks || 0;
        });
        
        // Sum up metrics from agent-created banners
        agentBannersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          totalImpressions += data.impressions || 0;
          totalClicks += data.clicks || 0;
        });
        
        setTapAgentMetrics({
          lastRun: agentData.lastActive?.toDate() || new Date(),
          rewardsCreated: agentRewardsSnapshot.docs.length,
          bannersCreated: agentBannersSnapshot.docs.length,
          impressions: totalImpressions,
          clicks: totalClicks,
          redemptions: totalRedemptions,
          loading: false
        });
        
      } catch (error) {
        console.error('Error fetching Tap Agent metrics:', error);
        setTapAgentMetrics(prev => ({ ...prev, loading: false }));
      }
    };
    
    if (user?.uid) {
      fetchTapAgentMetrics();
    }
  }, [user?.uid]);

  // Fetch active agents and integrations
  useEffect(() => {
    const fetchActiveAgents = async () => {
      if (!user?.uid) return
      
      setAgentsLoading(true)
      try {
        // Fetch custom agents from Firestore
        const agentsRef = collection(db, 'merchants', user.uid, 'agents')
        const agentsQuery = query(agentsRef, orderBy('createdAt', 'desc'))
        const agentsSnapshot = await getDocs(agentsQuery)
        
        const customAgents = agentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'custom'
        }))
        
        // Add built-in agents that are "active" (you can customize this logic)
        const builtInAgents = availableAgents
          .filter(agent => agent.status === 'active')
          .map(agent => ({
            ...agent,
            type: 'built-in',
            lastRun: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random last run within 7 days
          }))
        
        // Combine and limit to show most recent/relevant agents
        const allAgents = [...customAgents, ...builtInAgents].slice(0, 6)
        
        setActiveAgents(allAgents)
      } catch (error) {
        console.error('Error fetching active agents:', error)
      } finally {
        setAgentsLoading(false)
      }
    }

    // Function to fetch integrations status
    const fetchIntegrations = async () => {
      if (!user?.uid) return
      
      setIntegrationsLoading(true)
      try {
        // Check all integrations
        const integrationChecks = [
          { key: 'square', path: 'square' },
          { key: 'lightspeed_new', path: 'lightspeed_new' },
          { key: 'gmail', path: 'gmail' },
          { key: 'google_calendar', path: 'google_calendar' },
          { key: 'google_docs', path: 'google_docs' },
          { key: 'google_sheets', path: 'google_sheets' },
          { key: 'hubspot', path: 'hubspot' },
          { key: 'outlook', path: 'outlook' }
        ]

        const integrationResults: any = {}

        for (const integration of integrationChecks) {
          try {
            const integrationDoc = await getDoc(doc(db, 'merchants', user.uid, 'integrations', integration.path))
            integrationResults[integration.key] = {
              connected: integrationDoc.exists() && integrationDoc.data()?.connected === true,
              data: integrationDoc.exists() ? integrationDoc.data() : null
            }
          } catch (error) {
            console.error(`Error checking ${integration.key} integration:`, error)
            integrationResults[integration.key] = { connected: false, data: null }
          }
        }

        setIntegrations(prev => ({
          ...prev,
          ...integrationResults
        }))
      } catch (error) {
        console.error('Error fetching integrations:', error)
      } finally {
        setIntegrationsLoading(false)
      }
    }

    if (user?.uid) {
      fetchActiveAgents()
      fetchIntegrations()
    }
  }, [user?.uid]);

  // Available integrations for the command box
  const availableIntegrations = [
    { id: "mailchimp", name: "MailChimp", icon: <Mail className="h-4 w-4 text-red-500" /> },
    { id: "instagram", name: "Instagram", icon: <Image src="/insta.webp" width={16} height={16} alt="Instagram" className="h-4 w-4 object-contain" /> },
    { id: "google", name: "Google", icon: <Globe className="h-4 w-4 text-blue-500" /> },
    { id: "gmail", name: "Gmail", icon: <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" /> },
    { id: "lightspeed", name: "Lightspeed", icon: <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" /> },
    { id: "tap", name: "Tap Loyalty", icon: <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" /> },
  ]

  // Handle selecting an integration from the dropdown
  const handleSelectIntegration = (integration: typeof availableIntegrations[0]) => {
    setSelectedIntegrations([...selectedIntegrations, integration])
    
    // Replace the @ symbol and any text after it up to cursor position with nothing
    const atIndex = commandInput.lastIndexOf('@', cursorPosition)
    if (atIndex !== -1) {
      const newInput = 
        commandInput.substring(0, atIndex) + 
        commandInput.substring(cursorPosition)
      setCommandInput(newInput)
    }
    
    setShowIntegrations(false)
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)
  }

  // Handle input changes for the command box
  const handleCommandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setCommandInput(value)
    setCursorPosition(e.target.selectionStart || 0)
    
    // Check if we should show the integrations dropdown
    const lastAtIndex = value.lastIndexOf('@', e.target.selectionStart || 0)
    const hasAtBeforeCursor = lastAtIndex !== -1
    const nextCharAfterAt = lastAtIndex < value.length - 1 ? value[lastAtIndex + 1] : null
    
    // Only show dropdown if @ is the last character or followed by text (not space)
    if (hasAtBeforeCursor && (!nextCharAfterAt || nextCharAfterAt !== ' ')) {
      const textAfterAt = value.substring(lastAtIndex + 1, e.target.selectionStart || value.length)
      
      // If there's no text after @ or the text after @ doesn't contain spaces, show integrations
      if (!textAfterAt.includes(' ')) {
        setShowIntegrations(true)
      } else {
        setShowIntegrations(false)
      }
    } else {
      setShowIntegrations(false)
    }
  }

  // Handle removing a selected integration
  const removeIntegration = (id: string) => {
    setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== id))
  }

  // Handle sending the command
  const handleSendCommand = async () => {
    if (commandInput.trim() || selectedIntegrations.length > 0) {
      console.log("Sending command:", {
        text: commandInput,
        integrations: selectedIntegrations
      })
      
      // Set processing state for all selected integrations
      const newProcessingState: Record<string, boolean> = {}
      selectedIntegrations.forEach(integration => {
        newProcessingState[integration.id] = true
      })
      setProcessingIntegrations(newProcessingState)
      
      // Check if Gmail is one of the selected integrations
      const gmailIntegration = selectedIntegrations.find(integration => integration.id === "gmail")
      // Check if Lightspeed is one of the selected integrations
      const lightspeedIntegration = selectedIntegrations.find(integration => integration.id === "lightspeed")
      // Check if Tap Loyalty is one of the selected integrations
      const tapIntegration = selectedIntegrations.find(integration => integration.id === "tap")
      
      // If there are no selected integrations but we have command input, use the default AI assistant
      if (selectedIntegrations.length === 0 && commandInput.trim()) {
        try {
          setAssistantLoading(true)
          
          // Make API call to chatMerchant function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/chatMerchant`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw AI Assistant response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("AI Assistant response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.answer) {
              // This is the expected format from chatMerchant: {"answer":"response text"}
              setAssistantResponse(data.answer);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.success && data?.summary) {
              setAssistantResponse(data.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              setAssistantResponse(data.answer);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              setAssistantResponse(data.result.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.summary) {
              setAssistantResponse(data.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.error) {
              toast({
                title: "AI Assistant Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setAssistantResponse(`The AI Assistant returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing AI Assistant response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the AI Assistant response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying AI Assistant:", error);
          toast({
            title: "AI Assistant Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setAssistantLoading(false);
        }
      }
      
      if (gmailIntegration && commandInput.trim()) {
        try {
          setGmailQueryLoading(true)
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [gmailIntegration.id]: false
          }))
          
          // Make API call to questionGmailHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionGmailHttp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Gmail API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Gmail API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setGmailQueryResponse(data.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setGmailQueryResponse(data.answer);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setGmailQueryResponse(data.result.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setGmailQueryResponse(data.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Gmail Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setGmailQueryResponse(`The Gmail API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Gmail API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Gmail query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Gmail:", error);
          toast({
            title: "Gmail Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setGmailQueryLoading(false);
          // Immediately remove the "processing..." indicator for Gmail
          if (gmailIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [gmailIntegration.id]: false
            }));
          }
        }
      }
      
      // Handle Lightspeed integration
      if (lightspeedIntegration && commandInput.trim()) {
        try {
          setLightspeedQueryLoading(true);
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [lightspeedIntegration.id]: false
          }))
          
          // Make API call to questionLsHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionLsHttp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim(),
              days: 30 // Default to 30 days of data
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Lightspeed API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Lightspeed API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setLightspeedQueryResponse(data.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setLightspeedQueryResponse(data.answer);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setLightspeedQueryResponse(data.result.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setLightspeedQueryResponse(data.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Lightspeed Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setLightspeedQueryResponse(`The Lightspeed API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Lightspeed API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Lightspeed query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Lightspeed:", error);
          toast({
            title: "Lightspeed Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setLightspeedQueryLoading(false);
          // Immediately remove the "processing..." indicator for Lightspeed
          if (lightspeedIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [lightspeedIntegration.id]: false
            }));
          }
        }
      }
      
      // Handle Tap Loyalty integration
      if (tapIntegration && commandInput.trim()) {
        try {
          setTapQueryLoading(true);
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [tapIntegration.id]: false
          }))
          
          // Make API call to questionTapHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionTap`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Tap Loyalty API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Tap Loyalty API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setTapQueryResponse(data.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setTapQueryResponse(data.answer);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setTapQueryResponse(data.result.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setTapQueryResponse(data.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Tap Loyalty Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setTapQueryResponse(`The Tap Loyalty API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Tap Loyalty API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Tap Loyalty query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Tap Loyalty:", error);
          toast({
            title: "Tap Loyalty Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setTapQueryLoading(false);
          // Immediately remove the "processing..." indicator for Tap Loyalty
          if (tapIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [tapIntegration.id]: false
            }));
          }
        }
      }
      
      // Process other integrations
      selectedIntegrations.forEach(integration => {
        if (integration.id !== "gmail" && integration.id !== "lightspeed" && integration.id !== "tap") { // Skip integrations we already handled
          // Random timeout for other integrations
          const timeout = 4000 + Math.random() * 3000
        
          setTimeout(() => {
            setProcessingIntegrations(prev => ({
              ...prev,
              [integration.id]: false
            }))
            
            toast({
              title: `${integration.name} workflow complete`,
              description: "The integration task has finished successfully",
            })
          }, timeout)
        }
      })
      
      // Reset input field immediately after sending
      setCommandInput("")
      
      // After all processing is done, reset the integrations
      // Keep the integrations that need to show responses
      if (!gmailIntegration && !lightspeedIntegration && !tapIntegration) {
        const maxProcessingTime = 7500 
      setTimeout(() => {
        setSelectedIntegrations([])
        setProcessingIntegrations({})
      }, maxProcessingTime)
      }
    }
  }

  // Function to call Firebase function for email summary
  const summarizeEmails = async (days: number) => {
    // Clear any previous timeouts
    if (findingTimeoutRef.current) clearTimeout(findingTimeoutRef.current);
    if (generatingTimeoutRef.current) clearTimeout(generatingTimeoutRef.current);
    
    setInboxSummaryLoading(true);
    setInboxSummaryResult(null);
    setInboxSummaryError(null);
    setLoadingStage("processing");
    
    try {
      console.log(`Summarizing emails for the last ${days} days`);
      
      // Set timeouts for the loading stages
      findingTimeoutRef.current = setTimeout(() => {
        console.log("Changing loading stage to finding");
        setLoadingStage("finding");
      }, 4000); // 4 seconds
      
      generatingTimeoutRef.current = setTimeout(() => {
        console.log("Changing loading stage to generating");
        setLoadingStage("generating");
      }, 8000); // 8 seconds
      
      // Call the API to summarize emails with correct parameter format
      const response = await fetch(
        `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/summarizeEmailsHttp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          merchantId: user?.uid,
          days: days
        }),
      });
      
      // Save the raw response for debugging
      const rawResponse = await response.text();
      setDebugResponse(rawResponse);
      
      // Parse the response
      let data;
      try {
        data = JSON.parse(rawResponse);
        console.log("API response:", data);
      } catch (e) {
        console.error("Error parsing API response:", e);
        throw new Error(`Invalid response format: ${rawResponse}`);
      }
      
      // Extract the summary from the response
      if (data?.result?.summary) {
        setInboxSummaryResult(data.result.summary);
      } else {
        throw new Error("No summary found in the response");
      }
    } catch (error) {
      console.error("Error summarizing emails:", error);
      setInboxSummaryError(`Failed to summarize emails: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      // Clear any pending timeouts
      if (findingTimeoutRef.current) clearTimeout(findingTimeoutRef.current);
      if (generatingTimeoutRef.current) clearTimeout(generatingTimeoutRef.current);
      
      setInboxSummaryLoading(false);
    }
  };

  // Function to handle summarize button click
  const handleSummarizeInbox = () => {
    setIsSummarizeInboxSheetOpen(true)
  }

  // Function to handle summary timeframe selection and submit
  const handleSummarizeSubmit = () => {
    let days = 1
    if (inboxSummaryTimeframe === '3day') days = 3
    if (inboxSummaryTimeframe === '7day') days = 7
    
    summarizeEmails(days)
  }

  // Add notification listener
  useEffect(() => {
    if (!user?.uid) return;
    
    // Create a reference to the merchant's notifications collection
    const notifsRef = collection(db, 'merchants', user.uid, 'notifs');
    
    // Create a query to get the latest notifications
    const notifsQuery = query(notifsRef, orderBy('createdAt', 'desc'));
    
    // Set up the real-time listener
    const unsubscribe = onSnapshot(notifsQuery, (snapshot) => {
      // Check for added documents
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          // Get the notification data
          const notifData = change.doc.data();
          
          // Check if this is a new notification (created in the last 10 seconds)
          const notifTime = notifData.createdAt?.toDate() || new Date();
          const isRecent = (new Date().getTime() - notifTime.getTime()) < 10000; // 10 seconds
          
          // Only show toast for new notifications
          if (isRecent) {
            // Get notification type prefix
            let prefix = "📣 ";
            switch(notifData.type) {
              case 'success':
                prefix = "✅ ";
                break;
              case 'error':
                prefix = "⚠️ ";
                break;
              case 'reward':
                prefix = "🎁 ";
                break;
              case 'transaction':
                prefix = "🛒 ";
                break;
              case 'insight':
                prefix = "💡 ";
                break;
            }
            
            // Display the notification using toast
            toast({
              title: `${prefix}${notifData.title || "New Notification"}`,
              description: notifData.description || "",
              variant: notifData.type === "error" ? "destructive" : 
                      notifData.type === "success" ? "default" : 
                      "default",
              duration: 5000, // 5 seconds
              action: notifData.link ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    router.push(notifData.link);
                  }}
                >
                  View
                </Button>
              ) : undefined
            });
            
            // Play a sound if notification has high priority
            if (notifData.priority === 'high') {
              const audio = new Audio('/notification-sound.mp3');
              audio.play().catch(err => console.error('Error playing notification sound:', err));
            }
          }
        }
      });
    }, (error) => {
      console.error("Error listening to notifications:", error);
    });
    
    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, [user?.uid, router]);

  // Function to fetch daily summaries
  const fetchDailySummaries = async () => {
    setIsDailySummaryLoading(true);
    setDailySummaryGmailResponse(null);
    setDailySummaryLightspeedResponse(null);
    
    try {
      // Fetch Gmail summary
      const gmailPrompt = "Summarize my emails from the past day";
      const gmailResponse = await fetch(
        `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionGmailHttp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: user?.uid,
          prompt: gmailPrompt
        }),
      });
      
      // Process Gmail response
      const gmailRawResponse = await gmailResponse.text();
      let gmailSummary = null;
      try {
        const gmailData = JSON.parse(gmailRawResponse);
        if (gmailData?.success && gmailData?.summary) {
          gmailSummary = gmailData.summary;
        } else if (gmailData?.success && gmailData?.answer) {
          gmailSummary = gmailData.answer;
        } else if (gmailData?.result?.summary) {
          gmailSummary = gmailData.result.summary;
        } else if (gmailData?.summary) {
          gmailSummary = gmailData.summary;
        }
      } catch (error) {
        console.error("Error parsing Gmail API response:", error);
      }
      
      // Fetch Lightspeed summary
      const lightspeedPrompt = "Analyze yesterday's sales data and provide a summary";
      const lightspeedResponse = await fetch(
        `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionLsHttp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: user?.uid,
          prompt: lightspeedPrompt,
          days: 30
        }),
      });
      
      // Process Lightspeed response
      const lightspeedRawResponse = await lightspeedResponse.text();
      let lightspeedSummary = null;
      try {
        const lightspeedData = JSON.parse(lightspeedRawResponse);
        if (lightspeedData?.success && lightspeedData?.summary) {
          lightspeedSummary = lightspeedData.summary;
        } else if (lightspeedData?.success && lightspeedData?.answer) {
          lightspeedSummary = lightspeedData.answer;
        } else if (lightspeedData?.result?.summary) {
          lightspeedSummary = lightspeedData.result.summary;
        } else if (lightspeedData?.summary) {
          lightspeedSummary = lightspeedData.summary;
        }
      } catch (error) {
        console.error("Error parsing Lightspeed API response:", error);
      }
      
      // Update state with responses
      setDailySummaryGmailResponse(gmailSummary);
      setDailySummaryLightspeedResponse(lightspeedSummary);
      
      // Show popup with results
      setShowDailySummaryPopup(true);
      
      // Remove success toast notification
    } catch (error) {
      console.error("Error fetching daily summaries:", error);
      toast({
        title: "Error",
        description: "Failed to fetch daily summaries. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDailySummaryLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Empty state instead of spinner */}
        </div>
      </div>
    )
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: customAnimationStyles }} />
      <div className="flex flex-col h-full max-w-full">
        {/* Header Section */}
        <div className="px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              {/* Metrics type tabs moved to the left */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
                <button
                  onClick={() => setMetricsType("loyalty")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    metricsType === "loyalty"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                >
                  <Gift className="h-4 w-4" />
                  <span>Loyalty</span>
                </button>
                <button
                  onClick={() => setMetricsType("merchant")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    metricsType === "merchant"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                >
                  <Bot className="h-4 w-4" />
                  <span>Merchant</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="px-6 pt-6 pb-14 flex-1 overflow-y-auto bg-white">
          {/* Content based on selected tab */}
          {metricsType === "loyalty" && (
            <>
              {/* Setup Section for Loyalty */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">Essential Setup</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">1/4</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Recurring Program */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Gift className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Recurring Program</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          5 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Set up automatic loyalty rewards for your customers.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs"
                      asChild
                    >
                      <Link href="/dashboard/rewards">Setup Now</Link>
                    </Button>
                  </div>

                  {/* Individual Reward */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Star className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Individual Reward</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          2 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Create custom rewards for specific customers.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs"
                      onClick={() => setShowRewardDialog(true)}
                    >
                      Setup Now
                    </Button>
                  </div>

                  {/* Banner */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Banner</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          3 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Display promotional banners to customers.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs text-green-600 border-green-200 hover:bg-green-50"
                      asChild
                    >
                      <Link href="/dashboard/banners" className="flex items-center gap-2">
                        <CheckIcon className="h-3 w-3" />
                        Configured
                      </Link>
                    </Button>
                  </div>

                  {/* Intro Reward */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Intro Reward</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          4 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Welcome new customers with special rewards.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs"
                      onClick={() => setIsIntroductoryRewardSheetOpen(true)}
                    >
                      Setup Now
                    </Button>
                  </div>
                </div>
              </div>

              {/* Loyalty Metrics Section */}
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Loyalty Metrics</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                  <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-900">Active Rewards</h3>
                      </div>
                      {metricsLoading ? (
                        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-md"></div>
                      ) : (
                        <div className="text-2xl font-semibold text-gray-900">{metrics.activeRewards}</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Currently available rewards</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-900">Points Issued</h3>
                      </div>
                      {metricsLoading ? (
                        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-md"></div>
                      ) : (
                        <div className="text-2xl font-semibold text-gray-900">{metrics.totalPointsIssued}</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Total loyalty points awarded</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Gift className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-900">Redemptions</h3>
                      </div>
                      {metricsLoading ? (
                        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-md"></div>
                      ) : (
                        <div className="text-2xl font-semibold text-gray-900">{metrics.totalRedemptions}</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Total rewards redeemed</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-5 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <h3 className="text-sm font-medium text-gray-900">Active Customers</h3>
                      </div>
                      {metricsLoading ? (
                        <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-md"></div>
                      ) : (
                        <div className="text-2xl font-semibold text-gray-900">{metrics.activeCustomers}</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-600">Customers with recent activity</p>
                  </div>
                </div>
              </div>

              {/* Activity and Analytics Section for Loyalty */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="border border-gray-200 rounded-md bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-semibold mb-1">Recent Activity</h3>
                        <p className="text-sm text-gray-600">Latest transactions and redemptions</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-md"
                        asChild
                      >
                        <Link href="/store/activity" className="flex items-center gap-1">
                          View all
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                      </div>
                    ) : recentActivity.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                          <Clock className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">No recent activity</p>
                        <p className="text-xs text-gray-500 mt-1">Transactions will appear here</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentActivity.slice(0, 5).map((activity, index) => (
                          <div key={activity.id} className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded-md ${
                              activity.type === "transaction" ? 'bg-blue-100' : 'bg-purple-100'
                            } flex items-center justify-center`}>
                              {activity.type === "transaction" ? (
                                <ShoppingCart className="h-4 w-4 text-blue-600" />
                              ) : (
                                <Gift className="h-4 w-4 text-purple-600" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{activity.customer.name}</p>
                              <p className="text-xs text-gray-500">
                                {activity.type === "transaction" ? "Purchase" : "Redemption"} • {formatTimeAgo(activity.timestamp)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {activity.type === "transaction" 
                                  ? `$${activity.amount.toFixed(2)}` 
                                  : `${activity.points} pts`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Popular Rewards */}
                <div className="border border-gray-200 rounded-md bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-semibold mb-1">Popular Rewards</h3>
                        <p className="text-sm text-gray-600">Most viewed and redeemed rewards</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-md"
                        asChild
                      >
                        <Link href="/store/rewards" className="flex items-center gap-1">
                          View all
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {rewardsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                      </div>
                    ) : popularRewards.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                          <Gift className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">No rewards yet</p>
                        <p className="text-xs text-gray-500 mt-1">Create rewards to see analytics</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {popularRewards.slice(0, 5).map((reward, index) => (
                          <div key={reward.id} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-green-100 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{reward.name}</p>
                              <p className="text-xs text-gray-500">{reward.pointsCost} points</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">{reward.views || 0}</p>
                              <p className="text-xs text-gray-500">views</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Platform Metrics */}
                <div className="border border-gray-200 rounded-md bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-semibold mb-1">Platform Metrics</h3>
                        <p className="text-sm text-gray-600">Store performance overview</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Store Views</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{metrics.totalStoreViews}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Reward Views</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{metrics.totalRewardViews}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Transactions</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{metrics.totalTransactions}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900">Avg Order Value</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">${metrics.avgOrderValue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {metricsType === "merchant" && (
            <>
              {/* Setup Section for Merchant */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">Essential Setup</h2>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-md">0/2</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {/* Integrations */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Integrations</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          10 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Connect your business tools and services.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs"
                      asChild
                    >
                      <Link href="/dashboard/integrations">Setup Now</Link>
                    </Button>
                  </div>

                  {/* Agent Creation */}
                  <div className="border border-gray-200 rounded-md p-5 flex flex-col bg-gray-50 hover:bg-gray-100 transition-colors w-72">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Bot className="h-4 w-4 text-blue-500" />
                        <h3 className="text-sm font-semibold text-gray-900">Agent Creation</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                          7 min
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4 leading-relaxed">Create AI agents for business automation.</p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full rounded-md mt-auto text-xs"
                      asChild
                    >
                      <Link href="/dashboard/agents">Setup Now</Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Connected Integrations Section */}
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Connected Integrations</h2>
                <div className="border border-gray-200 rounded-md bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-semibold mb-1">Active Connections</h3>
                        <p className="text-sm text-gray-600">Your connected business tools and services</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-md"
                        asChild
                      >
                        <Link href="/dashboard/integrations" className="flex items-center gap-1">
                          Manage all
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {integrationsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                      </div>
                    ) : (() => {
                      const connectedIntegrations = Object.entries(integrations).filter(([key, integration]) => integration.connected)
                      
                      if (connectedIntegrations.length === 0) {
                        return (
                          <div className="py-8 text-center">
                            <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                              <Settings className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-sm font-medium text-gray-700">No integrations connected</p>
                            <p className="text-xs text-gray-500 mt-1">Connect your business tools to see them here</p>
                          </div>
                        )
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {connectedIntegrations.map(([key, integration]) => {
                            const getIntegrationIcon = (integrationKey: string) => {
                              switch (integrationKey) {
                                case 'gmail':
                                  return <img src="/gmailpro.png" alt="Gmail" className="h-5 w-5 object-contain" />
                                case 'google_calendar':
                                  return <img src="/cal.svg" alt="Google Calendar" className="h-5 w-5 object-contain" />
                                case 'google_docs':
                                  return <img src="/docspro.png" alt="Google Docs" className="h-5 w-5 object-contain" />
                                case 'google_sheets':
                                  return <img src="/sheetspro.png" alt="Google Sheets" className="h-5 w-5 object-contain" />
                                case 'square':
                                  return <img src="/squarepro.png" alt="Square" className="h-5 w-5 object-contain" />
                                case 'lightspeed_new':
                                  return <img src="/lslogo.png" alt="Lightspeed" className="h-5 w-5 object-contain" />
                                case 'hubspot':
                                  return <img src="/hubspot.png" alt="HubSpot" className="h-5 w-5 object-contain" />
                                case 'outlook':
                                  return <img src="/outlook.png" alt="Outlook" className="h-5 w-5 object-contain" />
                                default:
                                  return <Settings className="h-5 w-5 text-gray-500" />
                              }
                            }

                            const getIntegrationName = (integrationKey: string) => {
                              switch (integrationKey) {
                                case 'gmail': return 'Gmail'
                                case 'google_calendar': return 'Google Calendar'
                                case 'google_docs': return 'Google Docs'
                                case 'google_sheets': return 'Google Sheets'
                                case 'square': return 'Square'
                                case 'lightspeed_new': return 'Lightspeed Retail'
                                case 'hubspot': return 'HubSpot'
                                case 'outlook': return 'Microsoft Outlook'
                                default: return integrationKey
                              }
                            }

                            const getIntegrationDescription = (integrationKey: string) => {
                              switch (integrationKey) {
                                case 'gmail': return 'Email Integration'
                                case 'google_calendar': return 'Calendar Integration'
                                case 'google_docs': return 'Document Management'
                                case 'google_sheets': return 'Spreadsheet Integration'
                                case 'square': return 'Point of Sale'
                                case 'lightspeed_new': return 'Point of Sale'
                                case 'hubspot': return 'CRM Integration'
                                case 'outlook': return 'Email Integration'
                                default: return 'Business Tool'
                              }
                            }

                            return (
                              <div key={key} className="border border-gray-200 rounded-md p-4 bg-white">
                                <div className="flex items-start gap-3">
                                  <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    {getIntegrationIcon(key)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-medium text-gray-900 truncate">{getIntegrationName(key)}</h4>
                                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{getIntegrationDescription(key)}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-green-600 font-medium">Connected</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* Active Agents Section for Merchant */}
              <div className="mb-8">
                <h2 className="text-lg font-medium mb-4">Active Agents</h2>
                <div className="border border-gray-200 rounded-md bg-gray-50">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-md font-semibold mb-1">Currently Running AI Agents</h3>
                        <p className="text-sm text-gray-600">Manage and monitor your automated agents</p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="rounded-md"
                        asChild
                      >
                        <Link href="/dashboard/agents" className="flex items-center gap-1">
                          View all
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {agentsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                      </div>
                    ) : activeAgents.length === 0 ? (
                      <div className="py-8 text-center">
                        <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                          <Bot className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">No active agents</p>
                        <p className="text-xs text-gray-500 mt-1">Connect agents to see them here</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeAgents.map((agent, index) => {
                          // Function to get tool logo based on tool name
                          const getToolLogo = (toolName: string) => {
                            const lowerToolName = toolName.toLowerCase();
                            
                            // Gmail/Google tools
                            if (lowerToolName.includes('gmail') || lowerToolName.includes('google mail')) {
                              return <Image src="/gmailnew.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Xero tools
                            if (lowerToolName.includes('xero')) {
                              return <Image src="/xero.png" width={16} height={16} alt="Xero" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Square tools
                            if (lowerToolName.includes('square')) {
                              return <Image src="/square.png" width={16} height={16} alt="Square" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Lightspeed tools
                            if (lowerToolName.includes('lightspeed')) {
                              return <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />;
                            }
                            
                            // MailChimp tools
                            if (lowerToolName.includes('mailchimp') || lowerToolName.includes('mail chimp')) {
                              return <Image src="/mailchimp.png" width={16} height={16} alt="MailChimp" className="h-4 w-4 object-contain" />;
                            }
                            
                            // HubSpot tools
                            if (lowerToolName.includes('hubspot') || lowerToolName.includes('hub spot')) {
                              return <Image src="/hubspot.png" width={16} height={16} alt="HubSpot" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Outlook tools
                            if (lowerToolName.includes('outlook') || lowerToolName.includes('microsoft')) {
                              return <Image src="/outlook.png" width={16} height={16} alt="Outlook" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Google Sheets tools
                            if (lowerToolName.includes('sheets') || lowerToolName.includes('google sheets')) {
                              return <Image src="/sheetspro.png" width={16} height={16} alt="Google Sheets" className="h-4 w-4 object-contain" />;
                            }
                            
                            // Default fallback
                            return <Bot className="h-4 w-4 text-gray-500" />;
                          };

                          // Function to get the appropriate icon for each agent
                          const getAgentIcon = (agent: any) => {
                            // Built-in agents
                            switch (agent.id) {
                              case 'customer-service':
                              case 'email-summary':
                              case 'email-executive':
                                return <Image src="/gmailnew.png" width={20} height={20} alt="Gmail" className="h-5 w-5 object-contain" />;
                            }
                            
                            // Custom agents - check their tools
                            if (agent.type === 'custom' && (agent.tools || agent.selectedTools)) {
                              const tools = agent.tools || agent.selectedTools || [];
                              
                              // If agent has tools, use the first tool's icon
                              if (tools.length > 0) {
                                const firstTool = tools[0];
                                const toolName = typeof firstTool === 'string' ? firstTool : (firstTool.name || firstTool.tool || firstTool.app);
                                if (toolName) {
                                  return getToolLogo(toolName);
                                }
                              }
                            }
                            
                            // Default fallback
                            return <Bot className="h-5 w-5 text-gray-500" />;
                          };

                          return (
                            <div key={agent.id} className="border border-gray-200 rounded-md p-4 bg-white">
                              <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
                                  {getAgentIcon(agent)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900 truncate">{agent.name}</h4>
                                  <p className="text-xs text-gray-500 mt-1">{agent.description}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <div className="flex items-center gap-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-gray-500">Active</span>
                                    </div>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-500">
                                      {agent.lastRun ? `Last run ${formatTimeAgo(agent.lastRun)}` : 'Never run'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}


        </div>
      </div>

      {/* Setup Wizard Sheet */}
      <Sheet open={isSetupWizardOpen} onOpenChange={setIsSetupWizardOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto flex flex-col">
          <div className="flex-none">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-xl">
                Setup Wizard
              </SheetTitle>
              <SheetDescription>
                Complete these steps to get the most out of your loyalty platform
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
          </div>
          
          <ScrollArea className="flex-grow pr-4">
            <div className="space-y-6">
              {/* Tap Agent Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="tap-agent-checkbox" 
                      checked={setupChecklist.tapAgent} 
                      onCheckedChange={() => handleChecklistChange('tapAgent')}
                    />
                    <label htmlFor="tap-agent-checkbox" className="text-base font-medium cursor-pointer">
                      Set up <GradientText>Tap Agent</GradientText>
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/tap-agent">Set up</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Tap Agent uses AI to create personalized rewards for your customers based on their preferences and purchase history. 
                    It automatically manages your loyalty program, increasing customer engagement and retention.
                  </p>
                </div>
              </div>

              {/* Other checklist items... */}
            </div>
          </ScrollArea>
          
          <div className="flex-none pt-4 mt-4 border-t">
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setIsSetupWizardOpen(false)}>
                Close
              </Button>
              <Button 
                variant="default"
                disabled={!Object.values(setupChecklist).every(Boolean)}
              >
                {Object.values(setupChecklist).every(Boolean) ? 
                  "All steps completed!" : 
                  `${Object.values(setupChecklist).filter(Boolean).length}/${Object.values(setupChecklist).length} completed`}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Reward Dialog */}
      <CreateRewardSheet
        open={isRewardDialogOpen}
        onOpenChange={setIsRewardDialogOpen}
        customerId={selectedCustomer?.id}
        customerName={selectedCustomer?.name}
      />

      {/* Introductory Reward Sheet */}
      <IntroductoryRewardSheet
        open={isIntroductoryRewardSheetOpen}
        onOpenChange={setIsIntroductoryRewardSheetOpen}
      />

      {/* Tap Agent Sheet */}
      <TapAgentSheet 
        open={isTapAgentSheetOpen}
        onOpenChange={setIsTapAgentSheetOpen}
      />

      {/* Daily Summary Popup */}
      {showDailySummaryPopup && (dailySummaryGmailResponse || dailySummaryLightspeedResponse) && (
        <div className={`fixed ${isPopupExpanded ? 'top-0 bottom-0 right-0 w-[35%] rounded-l-lg rounded-r-none border-r-0 h-full' : 'bottom-6 right-6 w-96 rounded-lg h-auto'} z-50 bg-white shadow-xl border border-gray-200 overflow-hidden animate-slideInUp transition-all duration-300 ease-in-out flex flex-col`}>
          {/* Popup content */}
        </div>
      )}

      {/* Business Insights Dialog */}
      <Dialog open={insightDialogOpen} onOpenChange={setInsightDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Business Insights</DialogTitle>
            <DialogDescription>
              AI-powered insights about your business performance and recommendations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {insightLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                <span className="ml-2 text-sm text-gray-600">Generating insights...</span>
              </div>
            ) : insightError ? (
              <div className="text-center py-8">
                <div className="bg-red-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <p className="text-sm font-medium text-red-700">Error generating insights</p>
                <p className="text-xs text-red-600 mt-1">{insightError}</p>
              </div>
            ) : insightData ? (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-md p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Key Insights</h4>
                  <p className="text-sm text-blue-800">{insightData.summary}</p>
                </div>
                {insightData.recommendations && (
                  <div className="bg-green-50 rounded-md p-4">
                    <h4 className="font-medium text-green-900 mb-2">Recommendations</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      {insightData.recommendations.map((rec: string, index: number) => (
                        <li key={index}>• {rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-gray-100 rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-3">
                  <BarChartIcon className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-700">No insights available</p>
                <p className="text-xs text-gray-500 mt-1">Generate insights to see recommendations</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Sample data
const recentSignups = [
  {
    id: "cust1",
    name: "Emma Wilson",
    email: "emma.wilson@example.com",
    signupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2)
  },
  {
    id: "cust2",
    name: "James Miller",
    email: "james.miller@example.com",
    signupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5)
  },
  {
    id: "cust3",
    name: "Olivia Davis",
    email: "olivia.davis@example.com",
    signupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
  },
  {
    id: "cust4",
    name: "Noah Garcia",
    email: "noah.garcia@example.com",
    signupDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10)
  }
]

const rewardPerformance = [
  {
    id: "rew1",
    name: "Free Coffee",
    redemptionCount: 342,
    pointsCost: 100,
    type: "item",
    conversionRate: 78,
    trend: "up",
    changePercentage: 12
  },
  {
    id: "rew2",
    name: "10% Off Next Purchase",
    redemptionCount: 215,
    pointsCost: 200,
    type: "discount",
    conversionRate: 65,
    trend: "down",
    changePercentage: 3
  },
  {
    id: "rew3",
    name: "Buy 10 Get 1 Free",
    redemptionCount: 187,
    pointsCost: 0,
    type: "program",
    conversionRate: 92,
    trend: "up",
    changePercentage: 8
  }
] 
