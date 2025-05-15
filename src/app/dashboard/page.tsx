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
  X
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
import { PageTransition } from "@/components/page-transition"
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
  const [metricsType, setMetricsType] = useState<"consumer" | "platform">("platform")
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
      <PageTransition>
        <div className="container mx-auto p-4">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Empty state instead of spinner */}
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <style dangerouslySetInnerHTML={{ __html: customAnimationStyles }} />
      <div className="p-6 py-4">
        <div className="space-y-6">
          {/* Welcome Section with Timeframe Tabs */}
          <div>
            <style jsx>{`
              .full-width-divider {
                width: 100vw;
                position: relative;
                left: 50%;
                right: 50%;
                margin-left: -50vw;
                margin-right: -50vw;
                height: 1px;
                background-color: rgb(229, 231, 235);
              }
            `}</style>
            <PageHeader
              title="Welcome back"
            >
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 gap-1 border-[#007AFF] hover:bg-[#007AFF]/5 text-xs px-2 py-0"
                  onClick={fetchDailySummaries}
                  disabled={isDailySummaryLoading}
                >
                  {isDailySummaryLoading ? (
                    <>
                      <div className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      <GradientText>Processing...</GradientText>
                    </>
                  ) : (
                    <>
                      <Calendar className="h-3 w-3 text-blue-500" />
                      <GradientText>Daily Summary</GradientText>
                    </>
                  )}
                </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 text-xs px-2 py-0"
                onClick={() => setIsSetupWizardOpen(true)}
              >
                <PlusCircle className="h-3 w-3" />
                Setup Wizard
              </Button>
              </div>
            </PageHeader>

            {/* Update the tabs layout to be side-by-side with a separator */}
            <div className="flex items-center gap-4">
              {/* Metrics type tabs */}
              <Tabs 
                defaultValue="platform" 
                className="flex-shrink-0"
                onValueChange={(value) => setMetricsType(value as "consumer" | "platform")}
              >
                <TabsList>
                  <TabsTrigger value="platform" className="flex items-center gap-2 data-[state=active]:text-blue-600">
                    <Server className="h-4 w-4" />
                    <span>Platform Metrics</span>
                  </TabsTrigger>
                  <TabsTrigger value="consumer" className="flex items-center gap-2 data-[state=active]:text-blue-600">
                    <Users className="h-4 w-4" />
                    <span>Consumer Metrics</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Vertical separator */}
              <div className="h-8 w-px bg-gray-200"></div>
              
              {/* Date range tabs */}
              <Tabs 
                defaultValue="today"
                value={timeframe}
                onValueChange={(value) => setTimeframe(value as TimeframeType)}
              >
                <TabsList>
                  <TabsTrigger value="today" className="data-[state=active]:text-blue-600">Today</TabsTrigger>
                  <TabsTrigger value="yesterday" className="data-[state=active]:text-blue-600">Yesterday</TabsTrigger>
                  <TabsTrigger value="7days" className="data-[state=active]:text-blue-600">Last 7 Days</TabsTrigger>
                  <TabsTrigger value="30days" className="data-[state=active]:text-blue-600">Last 30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Tap Agent Button - Removed */}

          {/* Gmail Query Response */}
          {gmailQueryResponse && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Gmail Response</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                  >
                    {showDebugInfo ? "Hide Debug" : "Show Debug"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setGmailQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      // Also remove the Gmail integration from selected integrations
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "gmail"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                {(() => {
                  // Process the response first
                  const processedResponse = processApiResponse(gmailQueryResponse);
                  
                  // Check if the processed response is HTML
                  if (typeof processedResponse === 'string' && 
                      processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                    return renderHtml(processedResponse);
                  } 
                  
                  // Otherwise render as Markdown
                  return (
                    <ReactMarkdown 
                      className="prose prose-slate 
                        prose-p:text-gray-700 prose-p:mb-4
                        prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-[#007AFF] prose-h1:to-[#00C6FF] prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4
                        prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-[#007AFF] prose-h2:to-[#00C6FF] prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                        prose-h3:text-transparent prose-h3:bg-clip-text prose-h3:bg-gradient-to-r prose-h3:from-[#007AFF] prose-h3:to-[#00C6FF] prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                        prose-a:text-[#007AFF] 
                        prose-strong:font-semibold prose-strong:text-gray-900 
                        prose-ul:my-4 prose-ul:pl-5 prose-ul:space-y-2 
                        prose-ol:my-4 prose-ol:pl-5 prose-ol:space-y-2
                        prose-li:my-0.5 prose-li:pl-1.5
                        prose-hr:border-gray-200 prose-hr:my-4 prose-hr:border-dashed
                        font-sf-pro [&_.html-content_h1]:text-transparent [&_.html-content_h1]:bg-clip-text [&_.html-content_h1]:bg-gradient-to-r [&_.html-content_h1]:from-[#007AFF] [&_.html-content_h1]:to-[#00C6FF] [&_.html-content_h1]:text-2xl [&_.html-content_h1]:font-bold [&_.html-content_h1]:mt-6 [&_.html-content_h1]:mb-4
                        [&_.html-content_h2]:text-transparent [&_.html-content_h2]:bg-clip-text [&_.html-content_h2]:bg-gradient-to-r [&_.html-content_h2]:from-[#007AFF] [&_.html-content_h2]:to-[#00C6FF] [&_.html-content_h2]:text-xl [&_.html-content_h2]:font-bold [&_.html-content_h2]:mt-5 [&_.html-content_h2]:mb-3
                        [&_.html-content_h3]:text-transparent [&_.html-content_h3]:bg-clip-text [&_.html-content_h3]:bg-gradient-to-r [&_.html-content_h3]:from-[#007AFF] [&_.html-content_h3]:to-[#00C6FF] [&_.html-content_h3]:text-lg [&_.html-content_h3]:font-semibold [&_.html-content_h3]:mt-4 [&_.html-content_h3]:mb-2
                        [&_.html-content_p]:text-gray-700 [&_.html-content_p]:mb-4
                        [&_.html-content_a]:text-[#007AFF]
                        [&_.html-content_ul]:my-4 [&_.html-content_ul]:pl-5 [&_.html-content_ul]:space-y-2
                        [&_.html-content_ol]:my-4 [&_.html-content_ol]:pl-5 [&_.html-content_ol]:space-y-2
                        [&_.html-content_li]:my-0.5 [&_.html-content_li]:pl-1.5"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        hr: () => <div className="my-5 border-t border-gray-100" />,
                        table: ({ children }) => <table className="border-collapse w-full my-4">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
                        pre: ({ children }) => <pre className="bg-gray-50 p-3 rounded-md overflow-auto text-sm my-4">{children}</pre>,
                        code: ({ children }) => <code className="bg-gray-50 p-1 rounded text-sm font-mono text-purple-600">{children}</code>
                      }}
                    >
                      {processedResponse}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              
              {/* Show debug response */}
              {showDebugInfo && debugResponse && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Response:</h4>
                    <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {debugResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Show debug response */}
          {showDebugInfo && debugResponse && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="bg-gray-50 p-3 rounded-md">
                <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Response:</h4>
                <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {debugResponse}
                </pre>
              </div>
            </div>
          )}
          
          {/* Gmail Query Loading */}
          {gmailQueryLoading && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                  <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Processing Gmail Query</h3>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-500">Analyzing your emails...</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Lightspeed Query Response */}
          {lightspeedQueryResponse && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Lightspeed Response</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                  >
                    {showDebugInfo ? "Hide Debug" : "Show Debug"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setLightspeedQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      // Also remove the Lightspeed integration from selected integrations
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "lightspeed"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                {(() => {
                  // Process the response first
                  const processedResponse = processApiResponse(lightspeedQueryResponse);
                  
                  // Check if the processed response is HTML
                  if (typeof processedResponse === 'string' && 
                      processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                    return renderHtml(processedResponse);
                  } 
                  
                  // Otherwise render as Markdown
                  return (
                    <ReactMarkdown 
                      className="prose prose-slate 
                        prose-p:text-gray-700 prose-p:mb-4
                        prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-[#007AFF] prose-h1:to-[#00C6FF] prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4
                        prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-[#007AFF] prose-h2:to-[#00C6FF] prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                        prose-h3:text-transparent prose-h3:bg-clip-text prose-h3:bg-gradient-to-r prose-h3:from-[#007AFF] prose-h3:to-[#00C6FF] prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                        prose-a:text-[#007AFF] 
                        prose-strong:font-semibold prose-strong:text-gray-900 
                        prose-ul:my-4 prose-ul:pl-5 prose-ul:space-y-2 
                        prose-ol:my-4 prose-ol:pl-5 prose-ol:space-y-2
                        prose-li:my-0.5 prose-li:pl-1.5
                        prose-hr:border-gray-200 prose-hr:my-4 prose-hr:border-dashed
                        font-sf-pro [&_.html-content_h1]:text-transparent [&_.html-content_h1]:bg-clip-text [&_.html-content_h1]:bg-gradient-to-r [&_.html-content_h1]:from-[#007AFF] [&_.html-content_h1]:to-[#00C6FF] [&_.html-content_h1]:text-2xl [&_.html-content_h1]:font-bold [&_.html-content_h1]:mt-6 [&_.html-content_h1]:mb-4
                        [&_.html-content_h2]:text-transparent [&_.html-content_h2]:bg-clip-text [&_.html-content_h2]:bg-gradient-to-r [&_.html-content_h2]:from-[#007AFF] [&_.html-content_h2]:to-[#00C6FF] [&_.html-content_h2]:text-xl [&_.html-content_h2]:font-bold [&_.html-content_h2]:mt-5 [&_.html-content_h2]:mb-3
                        [&_.html-content_h3]:text-transparent [&_.html-content_h3]:bg-clip-text [&_.html-content_h3]:bg-gradient-to-r [&_.html-content_h3]:from-[#007AFF] [&_.html-content_h3]:to-[#00C6FF] [&_.html-content_h3]:text-lg [&_.html-content_h3]:font-semibold [&_.html-content_h3]:mt-4 [&_.html-content_h3]:mb-2
                        [&_.html-content_p]:text-gray-700 [&_.html-content_p]:mb-4
                        [&_.html-content_a]:text-[#007AFF]
                        [&_.html-content_ul]:my-4 [&_.html-content_ul]:pl-5 [&_.html-content_ul]:space-y-2
                        [&_.html-content_ol]:my-4 [&_.html-content_ol]:pl-5 [&_.html-content_ol]:space-y-2
                        [&_.html-content_li]:my-0.5 [&_.html-content_li]:pl-1.5"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        hr: () => <div className="my-5 border-t border-gray-100" />,
                        table: ({ children }) => <table className="border-collapse w-full my-4">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
                        pre: ({ children }) => <pre className="bg-gray-50 p-3 rounded-md overflow-auto text-sm my-4">{children}</pre>,
                        code: ({ children }) => <code className="bg-gray-50 p-1 rounded text-sm font-mono text-purple-600">{children}</code>
                      }}
                    >
                      {processedResponse}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              
              {/* Show debug response */}
              {showDebugInfo && debugResponse && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Response:</h4>
                    <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {debugResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Lightspeed Query Loading */}
          {lightspeedQueryLoading && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                  <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Processing Lightspeed Query</h3>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-500">Analyzing your data...</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Tap Loyalty Query Response */}
          {tapQueryResponse && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Tap Loyalty Response</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                  >
                    {showDebugInfo ? "Hide Debug" : "Show Debug"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setTapQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      // Also remove the Tap Loyalty integration from selected integrations
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "tap"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                {(() => {
                  // Process the response first
                  const processedResponse = processApiResponse(tapQueryResponse);
                  
                  // Check if the processed response is HTML
                  if (typeof processedResponse === 'string' && 
                      processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                    return renderHtml(processedResponse);
                  } 
                  
                  // Otherwise render as Markdown
                  return (
                    <ReactMarkdown 
                      className="prose prose-slate 
                        prose-p:text-gray-700 prose-p:mb-4
                        prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-[#007AFF] prose-h1:to-[#00C6FF] prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4
                        prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-[#007AFF] prose-h2:to-[#00C6FF] prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                        prose-h3:text-transparent prose-h3:bg-clip-text prose-h3:bg-gradient-to-r prose-h3:from-[#007AFF] prose-h3:to-[#00C6FF] prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                        prose-a:text-[#007AFF] 
                        prose-strong:font-semibold prose-strong:text-gray-900 
                        prose-ul:my-4 prose-ul:pl-5 prose-ul:space-y-2 
                        prose-ol:my-4 prose-ol:pl-5 prose-ol:space-y-2
                        prose-li:my-0.5 prose-li:pl-1.5
                        prose-hr:border-gray-200 prose-hr:my-4 prose-hr:border-dashed
                        font-sf-pro [&_.html-content_h1]:text-transparent [&_.html-content_h1]:bg-clip-text [&_.html-content_h1]:bg-gradient-to-r [&_.html-content_h1]:from-[#007AFF] [&_.html-content_h1]:to-[#00C6FF] [&_.html-content_h1]:text-2xl [&_.html-content_h1]:font-bold [&_.html-content_h1]:mt-6 [&_.html-content_h1]:mb-4
                        [&_.html-content_h2]:text-transparent [&_.html-content_h2]:bg-clip-text [&_.html-content_h2]:bg-gradient-to-r [&_.html-content_h2]:from-[#007AFF] [&_.html-content_h2]:to-[#00C6FF] [&_.html-content_h2]:text-xl [&_.html-content_h2]:font-bold [&_.html-content_h2]:mt-5 [&_.html-content_h2]:mb-3
                        [&_.html-content_h3]:text-transparent [&_.html-content_h3]:bg-clip-text [&_.html-content_h3]:bg-gradient-to-r [&_.html-content_h3]:from-[#007AFF] [&_.html-content_h3]:to-[#00C6FF] [&_.html-content_h3]:text-lg [&_.html-content_h3]:font-semibold [&_.html-content_h3]:mt-4 [&_.html-content_h3]:mb-2
                        [&_.html-content_p]:text-gray-700 [&_.html-content_p]:mb-4
                        [&_.html-content_a]:text-[#007AFF]
                        [&_.html-content_ul]:my-4 [&_.html-content_ul]:pl-5 [&_.html-content_ul]:space-y-2
                        [&_.html-content_ol]:my-4 [&_.html-content_ol]:pl-5 [&_.html-content_ol]:space-y-2
                        [&_.html-content_li]:my-0.5 [&_.html-content_li]:pl-1.5"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        hr: () => <div className="my-5 border-t border-gray-100" />,
                        table: ({ children }) => <table className="border-collapse w-full my-4">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
                        pre: ({ children }) => <pre className="bg-gray-50 p-3 rounded-md overflow-auto text-sm my-4">{children}</pre>,
                        code: ({ children }) => <code className="bg-gray-50 p-1 rounded text-sm font-mono text-purple-600">{children}</code>
                      }}
                    >
                      {processedResponse}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              
              {/* Show debug response */}
              {showDebugInfo && debugResponse && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Response:</h4>
                    <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {debugResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Tap Loyalty Query Loading */}
          {tapQueryLoading && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                  <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Processing Tap Loyalty Query</h3>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-500">Analyzing your query...</p>
                </div>
              </div>
            </div>
          )}
          
          {/* AI Assistant Response */}
          {assistantResponse && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                  >
                    {showDebugInfo ? "Hide Debug" : "Show Debug"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setAssistantResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                {(() => {
                  // Process the response first
                  const processedResponse = processApiResponse(assistantResponse);
                  
                  // Check if the processed response is HTML
                  if (typeof processedResponse === 'string' && 
                      processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                    return renderHtml(processedResponse);
                  } 
                  
                  // Otherwise render as Markdown
                  return (
                    <ReactMarkdown 
                      className="prose prose-slate 
                        prose-p:text-gray-700 prose-p:mb-4
                        prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-[#007AFF] prose-h1:to-[#00C6FF] prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4
                        prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-[#007AFF] prose-h2:to-[#00C6FF] prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                        prose-h3:text-transparent prose-h3:bg-clip-text prose-h3:bg-gradient-to-r prose-h3:from-[#007AFF] prose-h3:to-[#00C6FF] prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                        prose-a:text-[#007AFF] 
                        prose-strong:font-semibold prose-strong:text-gray-900 
                        prose-ul:my-4 prose-ul:pl-5 prose-ul:space-y-2 
                        prose-ol:my-4 prose-ol:pl-5 prose-ol:space-y-2
                        prose-li:my-0.5 prose-li:pl-1.5
                        prose-hr:border-gray-200 prose-hr:my-4 prose-hr:border-dashed
                        font-sf-pro [&_.html-content_h1]:text-transparent [&_.html-content_h1]:bg-clip-text [&_.html-content_h1]:bg-gradient-to-r [&_.html-content_h1]:from-[#007AFF] [&_.html-content_h1]:to-[#00C6FF] [&_.html-content_h1]:text-2xl [&_.html-content_h1]:font-bold [&_.html-content_h1]:mt-6 [&_.html-content_h1]:mb-4
                        [&_.html-content_h2]:text-transparent [&_.html-content_h2]:bg-clip-text [&_.html-content_h2]:bg-gradient-to-r [&_.html-content_h2]:from-[#007AFF] [&_.html-content_h2]:to-[#00C6FF] [&_.html-content_h2]:text-xl [&_.html-content_h2]:font-bold [&_.html-content_h2]:mt-5 [&_.html-content_h2]:mb-3
                        [&_.html-content_h3]:text-transparent [&_.html-content_h3]:bg-clip-text [&_.html-content_h3]:bg-gradient-to-r [&_.html-content_h3]:from-[#007AFF] [&_.html-content_h3]:to-[#00C6FF] [&_.html-content_h3]:text-lg [&_.html-content_h3]:font-semibold [&_.html-content_h3]:mt-4 [&_.html-content_h3]:mb-2
                        [&_.html-content_p]:text-gray-700 [&_.html-content_p]:mb-4
                        [&_.html-content_a]:text-[#007AFF]
                        [&_.html-content_ul]:my-4 [&_.html-content_ul]:pl-5 [&_.html-content_ul]:space-y-2
                        [&_.html-content_ol]:my-4 [&_.html-content_ol]:pl-5 [&_.html-content_ol]:space-y-2
                        [&_.html-content_li]:my-0.5 [&_.html-content_li]:pl-1.5"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        hr: () => <div className="my-5 border-t border-gray-100" />,
                        table: ({ children }) => <table className="border-collapse w-full my-4">{children}</table>,
                        th: ({ children }) => <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">{children}</th>,
                        td: ({ children }) => <td className="border border-gray-200 px-3 py-2">{children}</td>,
                        pre: ({ children }) => <pre className="bg-gray-50 p-3 rounded-md overflow-auto text-sm my-4">{children}</pre>,
                        code: ({ children }) => <code className="bg-gray-50 p-1 rounded text-sm font-mono text-purple-600">{children}</code>
                      }}
                    >
                      {processedResponse}
                    </ReactMarkdown>
                  );
                })()}
              </div>
              
              {/* Show debug response */}
              {showDebugInfo && debugResponse && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="text-xs font-medium text-gray-700 mb-1">Raw Response:</h4>
                    <pre className="text-xs overflow-auto bg-gray-100 p-2 rounded whitespace-pre-wrap">
                      {debugResponse}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* AI Assistant Loading */}
          {assistantLoading && (
            <div className="mt-3 bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-100">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-medium text-gray-900">AI Assistant Processing</h3>
                    <div className="h-4 w-4 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin"></div>
                  </div>
                  <p className="text-sm text-gray-500">Thinking about your question...</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Metrics section - wrapped in proper Tabs component */}
          <Tabs defaultValue="platform" value={metricsType as string}>
            <TabsContent value="platform" className="mt-0">
              <div className="grid grid-cols-4 gap-4">
                {/* First card: Active Rewards */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Active Rewards</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.activeRewards}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Gift className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Second card: Total Reward Views */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Total Reward Views</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.totalRewardViews}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Third card: Total Points Issued */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Total Points Issued</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.totalPointsIssued}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Fourth card: Store Views */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Store Views</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.totalStoreViews}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Eye className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="consumer" className="mt-0">
              <div className="grid grid-cols-4 gap-4">
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Active Customers</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.activeCustomers}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.totalTransactions}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">{metrics.totalRedemptions}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <Gift className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-3">
                    <div className="flex justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                        {metricsLoading ? (
                          <div className="h-6 w-12 bg-gray-200 animate-pulse rounded"></div>
                        ) : (
                          <div className="text-lg font-semibold">${metrics.avgOrderValue}</div>
                        )}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          {/* Activity Overview and Recent Activity in a side-by-side layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Activity Overview Graph - Takes slightly less width */}
            <Card className="col-span-7 rounded-lg border border-gray-200 overflow-hidden">
              <CardHeader className="py-3 px-6 bg-gray-50 border-b border-gray-100 flex flex-row justify-between items-center rounded-t-lg">
                <div>
                  <CardTitle className="text-base font-medium text-gray-900">Activity Overview</CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Transactions and redemptions over time</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-8 text-xs",
                      chartTimeframe === "7days" && "bg-blue-50 text-blue-600 border-blue-200"
                    )}
                    onClick={() => setChartTimeframe("7days")}
                  >
                    7 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-8 text-xs",
                      chartTimeframe === "30days" && "bg-blue-50 text-blue-600 border-blue-200"
                    )}
                    onClick={() => setChartTimeframe("30days")}
                  >
                    30 Days
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className={cn(
                      "h-8 text-xs",
                      chartTimeframe === "90days" && "bg-blue-50 text-blue-600 border-blue-200"
                    )}
                    onClick={() => setChartTimeframe("90days")}
                  >
                    90 Days
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {chartLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : chartReady ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogramData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 12, fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }} 
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' }} 
                          tickLine={false}
                          axisLine={{ stroke: '#E5E7EB' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend content={<CustomLegend />} />
                        <Bar dataKey="transactions" name="Transactions" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="redemptions" name="Redemptions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-center">
                    <BarChartIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No activity data available</p>
                    <p className="text-sm text-muted-foreground mt-1">Start recording transactions to see data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity - Takes slightly more width */}
            <Card className="col-span-5 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <CardHeader className="py-4 px-6 bg-gradient-to-r from-blue-50 to-white border-b border-gray-100 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Recent Activity
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Latest transactions and redemptions</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 h-8 px-3 ml-auto border-blue-200"
                  asChild
                >
                  <Link href="/store/activity" className="flex items-center gap-1">
                    View all
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {activityLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                      <Clock className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No recent activity</p>
                    <p className="text-xs text-gray-500 mt-1">Transactions and redemptions will appear here</p>
                  </div>
                ) : (
                  <div>
                    {recentActivity.map((activity, index) => (
                      <div 
                        key={activity.id} 
                        className={`px-6 py-3.5 hover:bg-blue-50/30 transition-colors ${
                          index !== recentActivity.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          {/* Left side - Customer Avatar */}
                          <div className="flex-shrink-0">
                            <div className={`h-10 w-10 rounded-full ${
                              activity.type === "transaction" ? 'bg-blue-50' : 'bg-purple-50'
                            } flex items-center justify-center overflow-hidden shadow-sm`}>
                              {activity.customer?.profilePicture ? (
                                <img 
                                  src={activity.customer.profilePicture} 
                                  alt={activity.customer.name}
                                  className="h-full w-full object-cover"
                                  onError={() => {/* error handling */}}
                                />
                              ) : activity.type === "transaction" ? (
                                <ShoppingCart className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Gift className="h-5 w-5 text-purple-500" />
                              )}
                            </div>
                          </div>

                          {/* Right side - Activity Details - More Compact */}
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-gray-900">{activity.customer.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                {activity.type === "transaction" ? (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 flex items-center">
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Purchase
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100 flex items-center">
                                    <Gift className="h-3 w-3 mr-1" />
                                    Redemption
                                  </span>
                                )}
                                <span className="text-gray-400">&bull;</span>
                                <span>{formatTimeAgo(activity.timestamp)}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                activity.type === "transaction" ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                                {activity.type === "transaction" 
                                  ? `$${activity.amount.toFixed(2)}` 
                                  : `${activity.points} pts`}
                              </p>
                              {activity.type !== "transaction" && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {activity.rewardName}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Viewing Customers and Popular Rewards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Viewing Customers card */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <CardHeader className="py-4 px-6 bg-gradient-to-r from-indigo-50 to-white border-b border-gray-100 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    Top Store Visitors
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Customers who view your store most frequently</p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {topCustomersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : topViewingCustomers.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No visitor data available</p>
                    <p className="text-xs text-gray-500 mt-1">Customer visits will appear here</p>
                  </div>
                ) : (
                  <div>
                    {topViewingCustomers.map((customer, index) => (
                      <div 
                        key={customer.id} 
                        className={`px-6 py-3.5 hover:bg-indigo-50/30 transition-colors ${
                          index !== topViewingCustomers.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shadow-sm">
                              <Users className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="font-medium text-sm text-gray-900">{customer.name}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {customer.viewCount} views
                                </span>
                                <span className="text-gray-400">&bull;</span>
                                <span>Last visit: {formatDistanceToNow(customer.lastView, { addSuffix: true })}</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800"
                            onClick={() => {
                              setSelectedCustomer({
                                id: customer.id,
                                name: customer.name
                              })
                              setIsRewardDialogOpen(true)
                            }}
                          >
                            <Gift className="h-3.5 w-3.5" />
                            Create Reward
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Popular Rewards card */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <CardHeader className="py-4 px-6 bg-gradient-to-r from-purple-50 to-white border-b border-gray-100 flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-base font-medium text-gray-900 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-purple-500" />
                    Popular Rewards
                  </CardTitle>
                  <p className="text-sm text-gray-500 mt-0.5">Most redeemed rewards by customers</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-purple-600 hover:text-purple-700 hover:bg-purple-50/50 h-8 px-3 ml-auto border-purple-200"
                  asChild
                >
                  <Link href="/store/rewards" className="flex items-center gap-1">
                    View all
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {rewardsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : popularRewards.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                      <Gift className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">No rewards data available</p>
                    <p className="text-xs text-gray-500 mt-1">Popular rewards will appear here</p>
                  </div>
                ) : (
                  <div>
                    {popularRewards.map((reward, index) => (
                      <div 
                        key={reward.id} 
                        className={`px-6 py-3.5 hover:bg-purple-50/30 transition-colors ${
                          index !== popularRewards.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm
                              ${reward.programtype === 'coffee' ? 'bg-blue-50' : 
                                reward.programtype === 'voucher' ? 'bg-green-50' : 'bg-purple-50'}`}>
                              {reward.programtype === 'coffee' ? (
                                <Coffee className="h-5 w-5 text-blue-600" />
                              ) : reward.programtype === 'voucher' ? (
                                <Ticket className="h-5 w-5 text-green-600" />
                              ) : (
                                <Gift className="h-5 w-5 text-purple-500" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-gray-900">{reward.rewardName}</p>
                                {reward.programtype === 'coffee' && (
                                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-100 flex items-center">
                                    <Coffee className="h-3 w-3 mr-1" />
                                    Coffee Card
                                  </span>
                                )}
                                {reward.programtype === 'voucher' && (
                                  <span className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded-full border border-green-100 flex items-center">
                                    <Ticket className="h-3 w-3 mr-1" />
                                    Voucher
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                <span className="px-1.5 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full border border-purple-100">
                                  {reward.pointsCost} points
                                </span>
                                <span className="text-gray-400">&bull;</span>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3 text-gray-400" />
                                  <span>{reward.impressions || 0}</span>
                                </div>
                                {reward.lastRedeemedAt && (
                                  <>
                                    <span className="text-gray-400">&bull;</span>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3 text-gray-400" />
                                      <span>{formatDistanceToNow(reward.lastRedeemedAt, { addSuffix: true })}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-purple-600">{reward.redemptionCount} redeemed</p>
                            <div className="flex items-center justify-end gap-1 text-xs mt-0.5">
                              {reward.trend === "up" ? (
                                <ArrowUp className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-red-500" />
                              )}
                              <span className={reward.trend === "up" ? "text-green-500" : "text-red-500"}>
                                {reward.changePercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Tap Agent Summary Section */}
          <Separator className="my-6" />
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
                    Tap Agent
                  </span> 
                  Summary
                </h2>
                <p className="text-sm text-gray-500">Intelligent loyalty assistant performance</p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                  asChild
                >
                  <Link href="/tap-agent/setup">
                    <ArrowRight className="h-4 w-4" />
                    Manage Tap Agent
                  </Link>
                </Button>
              </div>
            </div>
            
            <Card className="border-gray-200 overflow-hidden">
              <CardContent className="p-6">
                {tapAgentMetrics.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : !tapAgentMetrics.lastRun ? (
                  <div className="py-6 text-center">
                    <div className="bg-gray-50 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-3">
                      <Zap className="h-8 w-8 text-gray-300" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">Tap Agent not configured</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">Configure your intelligent assistant to automate reward creation</p>
                    <Button asChild>
                      <Link href="/tap-agent/setup">Configure Tap Agent</Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-orange-500 flex items-center justify-center text-white">
                          <Zap className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-medium">Tap Agent Status</h3>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            Last active: {formatDistanceToNow(tapAgentMetrics.lastRun, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Content Creation */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-500">Content Creation</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <Gift className="h-4 w-4 text-blue-500" />
                              </div>
                              <span className="text-sm">Rewards Created</span>
                            </div>
                            <span className="font-medium">{tapAgentMetrics.rewardsCreated}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                                <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                                </svg>
                              </div>
                              <span className="text-sm">Banners Created</span>
                            </div>
                            <span className="font-medium">{tapAgentMetrics.bannersCreated}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Engagement */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-500">Engagement</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                                <Eye className="h-4 w-4 text-purple-500" />
                              </div>
                              <span className="text-sm">Total Impressions</span>
                            </div>
                            <span className="font-medium">{tapAgentMetrics.impressions}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                                <ArrowRight className="h-4 w-4 text-purple-500" />
                              </div>
                              <span className="text-sm">Total Clicks</span>
                            </div>
                            <span className="font-medium">{tapAgentMetrics.clicks}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Conversions */}
                      <div className="space-y-4">
                        <h4 className="text-sm font-medium text-gray-500">Conversions</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                <Gift className="h-4 w-4 text-green-500" />
                              </div>
                              <span className="text-sm">Reward Redemptions</span>
                            </div>
                            <span className="font-medium">{tapAgentMetrics.redemptions}</span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                                <ArrowUp className="h-4 w-4 text-green-500" />
                              </div>
                              <span className="text-sm">Conversion Rate</span>
                            </div>
                            <span className="font-medium">
                              {tapAgentMetrics.impressions > 0 
                                ? Math.round((tapAgentMetrics.redemptions / tapAgentMetrics.impressions) * 100) 
                                : 0}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Live and Scheduled Banners Section */}
          {(activeBanners.length > 0 || scheduledBanners.length > 0) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <svg className="h-5 w-5 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                    Banners
                  </h2>
                  <p className="text-sm text-gray-500">Your active and scheduled banners</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                    onClick={() => router.push('/store/banner?tab=scheduled')}
                  >
                    <Clock className="h-4 w-4" />
                    View Schedule
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                    asChild
                  >
                    <Link href="/store/banner">
                      Manage banners
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Live Banners First */}
                {activeBanners.map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative">
                      <div className="absolute top-3 right-3 z-10 flex gap-2">
                        <div className="bg-green-100 text-green-800 text-xs px-2.5 py-1 rounded-full flex items-center shadow-sm">
                          <Eye className="h-3 w-3 mr-1" />
                          Live
                        </div>
                        <div className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full flex items-center shadow-sm">
                          <Eye className="h-3 w-3 mr-1" />
                          {banner.impressions || 0} views
                        </div>
                      </div>
                      
                      <div className="rounded-lg overflow-hidden">
                        <BannerPreview {...banner} />
                      </div>
                      
                      <div className="p-3 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100">
                        <h3 className="font-medium text-sm truncate">{banner.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">{banner.description}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Then Scheduled Banners */}
                {scheduledBanners.map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-white rounded-lg overflow-hidden border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                    <div className="relative">
                      <div className="absolute top-3 right-3 z-10 flex gap-2">
                        <div className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full flex items-center shadow-sm">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </div>
                        <div className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full flex items-center shadow-sm">
                          <Eye className="h-3 w-3 mr-1" />
                          {banner.impressions || 0} views
                        </div>
                      </div>
                      
                      <div className="rounded-lg overflow-hidden">
                        <BannerPreview {...banner} />
                      </div>
                      
                      <div className="p-3 bg-gradient-to-b from-white to-gray-50 border-t border-gray-100">
                        <h3 className="font-medium text-sm truncate">{banner.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 truncate">{banner.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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

              {/* Banner Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="banner-checkbox" 
                      checked={setupChecklist.banner} 
                      onCheckedChange={() => handleChecklistChange('banner')}
                    />
                    <label htmlFor="banner-checkbox" className="text-base font-medium cursor-pointer">
                      Create a Banner
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/store/banner">Create</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Banners allow you to promote special offers, events, or announcements to your customers 
                    when they visit your digital storefront.
                  </p>
                </div>
              </div>

              {/* Membership Levels Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="membership-levels-checkbox" 
                      checked={setupChecklist.membershipLevels} 
                      onCheckedChange={() => handleChecklistChange('membershipLevels')}
                    />
                    <label htmlFor="membership-levels-checkbox" className="text-base font-medium cursor-pointer">
                      Set Membership Levels
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/store/membership">Set up</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Create tiered membership levels to reward your most loyal customers with exclusive benefits 
                    and encourage customers to increase their engagement with your business.
                  </p>
                </div>
              </div>

              {/* Points Rule Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="points-rule-checkbox" 
                      checked={setupChecklist.pointsRule} 
                      onCheckedChange={() => handleChecklistChange('pointsRule')}
                    />
                    <label htmlFor="points-rule-checkbox" className="text-base font-medium cursor-pointer">
                      Create Points Rule
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/store/points">Create</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Define how customers earn points with your business. Set point values for purchases, 
                    referrals, social media engagement, and more.
                  </p>
                </div>
              </div>

              {/* POS Integration Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="pos-integration-checkbox" 
                      checked={setupChecklist.posIntegration} 
                      onCheckedChange={() => handleChecklistChange('posIntegration')}
                    />
                    <label htmlFor="pos-integration-checkbox" className="text-base font-medium cursor-pointer">
                      Integrate POS System
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/integrations">Connect</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Connect your Square or Lightspeed point-of-sale system to automatically track customer 
                    purchases and award points for transactions.
                  </p>
                </div>
              </div>

              {/* Open Banking Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="open-banking-checkbox" 
                      checked={setupChecklist.openBanking} 
                      onCheckedChange={() => handleChecklistChange('openBanking')}
                    />
                    <label htmlFor="open-banking-checkbox" className="text-base font-medium cursor-pointer">
                      Set up Open Banking
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/integrations/banking">Connect</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Connect your financial accounts to get deep financial analytics and insights about your 
                    business performance and customer behavior.
                  </p>
                </div>
              </div>

              {/* Introductory Reward Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="introductory-reward-checkbox" 
                      checked={setupChecklist.introductoryReward} 
                      onCheckedChange={() => handleChecklistChange('introductoryReward')}
                    />
                    <label htmlFor="introductory-reward-checkbox" className="text-base font-medium cursor-pointer">
                      Create Introductory Reward
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="#" onClick={(e) => {
                      e.preventDefault();
                      setIsSetupWizardOpen(false);
                      // Use a small timeout to allow the setup wizard to close first
                      setTimeout(() => {
                        setIsIntroductoryRewardSheetOpen(true);
                      }, 100);
                    }}>Create</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Offer a special welcome gift to first-time customers, funded by Tap Loyalty. This helps attract new customers to your business.
                  </p>
                </div>
              </div>

              {/* Custom Reward Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="custom-reward-checkbox" 
                      checked={setupChecklist.customReward} 
                      onCheckedChange={() => handleChecklistChange('customReward')}
                    />
                    <label htmlFor="custom-reward-checkbox" className="text-base font-medium cursor-pointer">
                      Create Custom Reward
                    </label>
                  </div>
                  <Button variant="link" size="sm" asChild>
                    <Link href="/store/rewards/new">Create</Link>
                  </Button>
                </div>
                <div className="pl-6">
                  <p className="text-sm text-muted-foreground">
                    Design personalized rewards that resonate with your customers and align with your brand. 
                    Custom rewards can increase redemption rates and customer satisfaction.
                  </p>
                </div>
              </div>
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

      {/* Alternative to Dialog - Simple conditional rendering */}
      {insightDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Business Insights
              </h2>
              <button 
                onClick={() => setInsightDialogOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              AI-powered analysis of your business performance
            </p>
            
            {insightLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4"></div>
                <p className="text-sm text-muted-foreground">Analyzing your business data...</p>
              </div>
            ) : insightError ? (
              <div className="py-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <p className="text-red-800 text-sm">{insightError}</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => fetchMerchantInsights()} 
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            ) : insightData ? (
              <div className="space-y-4 py-2">
                {/* Summary */}
                {insightData.summary && (
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                    <h3 className="font-medium text-blue-800 mb-1">Summary</h3>
                    <p className="text-sm text-blue-700">{insightData.summary}</p>
                  </div>
                )}
                
                {/* Insights List */}
                {insightData.insights && Array.isArray(insightData.insights) && insightData.insights.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Key Insights</h3>
                    <div className="space-y-2">
                      {insightData.insights.map((insight: string, index: number) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-green-700 text-xs font-medium">{index + 1}</span>
                          </div>
                          <p className="text-sm">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* If insights is a string instead of an array */}
                {insightData.insights && typeof insightData.insights === 'string' && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Key Insights</h3>
                    <div className="bg-green-50 border border-green-100 rounded-md p-4">
                      <p className="text-sm text-green-700">{insightData.insights}</p>
                    </div>
                  </div>
                )}
                
                {/* Recommendations - also add Array check */}
                {insightData.recommendations && Array.isArray(insightData.recommendations) && insightData.recommendations.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Recommendations</h3>
                    <div className="space-y-2">
                      {insightData.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex gap-2 items-start">
                          <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Star className="h-3 w-3 text-amber-600" />
                          </div>
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* If recommendations is a string instead of an array */}
                {insightData.recommendations && typeof insightData.recommendations === 'string' && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Recommendations</h3>
                    <div className="bg-amber-50 border border-amber-100 rounded-md p-4">
                      <p className="text-sm text-amber-700">{insightData.recommendations}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">No insights available</p>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Summarize Inbox Sheet */}
      <Sheet open={isSummarizeInboxSheetOpen} onOpenChange={setIsSummarizeInboxSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full overflow-y-auto flex flex-col">
          <div className="flex-none">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-xl flex items-center gap-2">
                <Inbox className="h-5 w-5 text-indigo-500" />
                Summarize Inbox
              </SheetTitle>
              <SheetDescription>
                Get an AI-powered summary of your email inbox
              </SheetDescription>
            </SheetHeader>
            <Separator className="my-4" />
          </div>

          <div className="flex-grow">
            {!inboxSummaryLoading && !inboxSummaryResult ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">Select time range</h3>
                  <div className="flex gap-3">
                    <Button
                      variant={inboxSummaryTimeframe === "1day" ? "default" : "outline"}
                      className={inboxSummaryTimeframe === "1day" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                      onClick={() => setInboxSummaryTimeframe("1day")}
                    >
                      1 Day
                    </Button>
                    <Button
                      variant={inboxSummaryTimeframe === "3day" ? "default" : "outline"}
                      className={inboxSummaryTimeframe === "3day" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                      onClick={() => setInboxSummaryTimeframe("3day")}
                    >
                      3 Days
                    </Button>
                    <Button
                      variant={inboxSummaryTimeframe === "7day" ? "default" : "outline"}
                      className={inboxSummaryTimeframe === "7day" ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                      onClick={() => setInboxSummaryTimeframe("7day")}
                    >
                      7 Days
                    </Button>
                  </div>
                </div>

                <div className={`p-4 border-b border-gray-100 ${isPopupExpanded ? 'px-6' : ''}`}>
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-indigo-800">
                      <p className="font-medium mb-1">How it works</p>
                      <p className="text-indigo-700">
                        This feature uses AI to analyze your recent emails and provide a concise summary of important messages, trends, and actions required. Select a time range to begin.
                      </p>
                    </div>
                  </div>
                </div>

                {inboxSummaryError && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="flex items-start gap-3">
                      <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-red-800">
                        <p className="font-medium mb-1">Error</p>
                        <p className="text-red-700">{inboxSummaryError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleSummarizeSubmit} className="bg-[#007AFF] hover:bg-[#0062CC]">
                    Generate Summary
                  </Button>
                </div>
              </div>
            ) : inboxSummaryLoading ? (
              <div className="flex flex-col">
                <div className="flex items-start mb-8">
                  <div className="relative mr-3">
                    <div className="h-5 w-5 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin"></div>
                  </div>
                  
                  <div className="h-5 flex items-center">
                    {loadingStage === "processing" && (
                      <p className="text-sm text-gray-500 animate-pulse">
                        Processing...
                      </p>
                    )}
                    
                    {loadingStage === "finding" && (
                      <p className="text-sm text-[#007AFF] animate-pulse">
                        Searching emails...
                      </p>
                    )}
                    
                    {loadingStage === "generating" && (
                      <p className="text-sm text-[#007AFF] animate-pulse">
                        Generating summary...
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 min-h-[300px] flex items-center justify-center text-sm text-gray-400">
                  <p>Preparing your inbox summary...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Email Summary</h3>
                    <div className="text-xs text-gray-500">
                      powered by <GradientText>Tap Agent</GradientText>
                    </div>
                  </div>
                  <div className="prose prose-sm max-w-none font-sf-pro">
                    {inboxSummaryResult && (
                      <div>
                        {/* Process the content to enhance numbered sections */}
                        {inboxSummaryResult?.split('\n').map((line, index) => {
                          // Match lines that start with a number followed by a period
                          const headerMatch = line.match(/^(\d+)\.\s+(.+)$/);
                          
                          if (headerMatch) {
                            // This is a numbered section header - style it prominently
                            return (
                              <div 
                                key={index} 
                                className="mt-8 mb-4 first:mt-2 pb-1 border-b border-gray-100"
                              >
                                <h3 className="text-xl font-bold bg-gradient-to-r from-[#007AFF] to-[#00C6FF] bg-clip-text text-transparent">
                                  {line}
                                </h3>
                              </div>
                            );
                          }
                          
                          // Regular content - render with ReactMarkdown
                          return (
                            <div key={index} className="mb-4">
                              <ReactMarkdown 
                                className="prose prose-slate 
                                prose-p:text-gray-700 prose-p:mb-4
                                prose-h1:text-transparent prose-h1:bg-clip-text prose-h1:bg-gradient-to-r prose-h1:from-[#007AFF] prose-h1:to-[#00C6FF] prose-h1:text-2xl prose-h1:font-bold prose-h1:mt-6 prose-h1:mb-4
                                prose-h2:text-transparent prose-h2:bg-clip-text prose-h2:bg-gradient-to-r prose-h2:from-[#007AFF] prose-h2:to-[#00C6FF] prose-h2:text-xl prose-h2:font-bold prose-h2:mt-5 prose-h2:mb-3
                                prose-h3:text-transparent prose-h3:bg-clip-text prose-h3:bg-gradient-to-r prose-h3:from-[#007AFF] prose-h3:to-[#00C6FF] prose-h3:text-lg prose-h3:font-semibold prose-h3:mt-4 prose-h3:mb-2
                                prose-a:text-[#007AFF] 
                                prose-strong:font-semibold prose-strong:text-gray-900 
                                prose-ul:my-4 prose-ul:pl-5 prose-ul:space-y-2 
                                prose-ol:my-4 prose-ol:pl-5 prose-ol:space-y-2
                                prose-li:my-0.5 prose-li:pl-1.5
                                prose-hr:border-gray-200 prose-hr:my-4 prose-hr:border-dashed
                                font-sf-pro [&_.html-content_h1]:text-transparent [&_.html-content_h1]:bg-clip-text [&_.html-content_h1]:bg-gradient-to-r [&_.html-content_h1]:from-[#007AFF] [&_.html-content_h1]:to-[#00C6FF] [&_.html-content_h1]:text-2xl [&_.html-content_h1]:font-bold [&_.html-content_h1]:mt-6 [&_.html-content_h1]:mb-4
                                [&_.html-content_h2]:text-transparent [&_.html-content_h2]:bg-clip-text [&_.html-content_h2]:bg-gradient-to-r [&_.html-content_h2]:from-[#007AFF] [&_.html-content_h2]:to-[#00C6FF] [&_.html-content_h2]:text-xl [&_.html-content_h2]:font-bold [&_.html-content_h2]:mt-5 [&_.html-content_h2]:mb-3
                                [&_.html-content_h3]:text-transparent [&_.html-content_h3]:bg-clip-text [&_.html-content_h3]:bg-gradient-to-r [&_.html-content_h3]:from-[#007AFF] [&_.html-content_h3]:to-[#00C6FF] [&_.html-content_h3]:text-lg [&_.html-content_h3]:font-semibold [&_.html-content_h3]:mt-4 [&_.html-content_h3]:mb-2
                                [&_.html-content_p]:text-gray-700 [&_.html-content_p]:mb-4
                                [&_.html-content_a]:text-[#007AFF]
                                [&_.html-content_ul]:my-4 [&_.html-content_ul]:pl-5 [&_.html-content_ul]:space-y-2
                                [&_.html-content_ol]:my-4 [&_.html-content_ol]:pl-5 [&_.html-content_ol]:space-y-2
                                [&_.html-content_li]:my-0.5 [&_.html-content_li]:pl-1.5"
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                components={{
                                  pre: ({ children }) => (
                                    <pre className="bg-gray-50 p-3 rounded-md overflow-auto text-sm my-4">{children}</pre>
                                  ),
                                  code: ({ children }) => (
                                    <code className="bg-gray-50 p-1 rounded text-sm font-mono text-purple-600">{children}</code>
                                  )
                                }}
                              >
                                {processApiResponse(line)}
                              </ReactMarkdown>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* For debugging - show full API response */}
                {debugResponse && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">API Response (Debug)</h4>
                    <pre className="text-xs overflow-auto bg-gray-100 p-3 rounded">
                      {debugResponse}
                    </pre>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setInboxSummaryResult(null)
                      setInboxSummaryError(null)
                    }}
                  >
                    Generate New Summary
                  </Button>
                  <Button 
                    variant="default"
                    className="bg-[#007AFF] hover:bg-[#0062CC]"
                    onClick={() => setIsSummarizeInboxSheetOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Tap Agent Sheet - Without daily summary functionality */}
      <TapAgentSheet 
        open={isTapAgentSheetOpen}
        onOpenChange={setIsTapAgentSheetOpen}
      />

      {/* Daily Summary Popup */}
      {showDailySummaryPopup && (dailySummaryGmailResponse || dailySummaryLightspeedResponse) && (
        <div className={`fixed ${isPopupExpanded ? 'top-0 bottom-0 right-0 w-[35%] rounded-l-lg rounded-r-none border-r-0 h-full' : 'bottom-6 right-6 w-96 rounded-lg h-auto'} z-50 bg-white shadow-xl border border-gray-200 overflow-hidden animate-slideInUp transition-all duration-300 ease-in-out flex flex-col`}>
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white flex-shrink-0">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <GradientText>Daily Summary</GradientText>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5 ml-6">Powered by Tap Agent</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-full hover:bg-white/50"
                onClick={() => setIsPopupExpanded(!isPopupExpanded)}
                title={isPopupExpanded ? "Collapse" : "Expand"}
              >
                {isPopupExpanded ? (
                  <Minimize2 className="h-4 w-4 text-gray-500" />
                ) : (
                  <Maximize2 className="h-4 w-4 text-gray-500" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 rounded-full hover:bg-white/50"
                onClick={() => setShowDailySummaryPopup(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className={`overflow-y-auto ${isPopupExpanded ? 'max-h-[calc(100vh-120px)]' : 'max-h-[70vh]'} flex-grow`}>
            {dailySummaryGmailResponse && (
              <div className={`p-4 border-b border-gray-100 ${isPopupExpanded ? 'px-6' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Email Summary</h4>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 text-sm space-y-4 mt-2">
                  {processApiResponse(dailySummaryGmailResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                    renderHtml(processApiResponse(dailySummaryGmailResponse)) :
                    <ReactMarkdown 
                      className="text-gray-700 text-sm leading-relaxed space-y-4"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({children}) => <p className="my-3">{children}</p>,
                        ul: ({children}) => <ul className="my-3 list-disc pl-5">{children}</ul>,
                        ol: ({children}) => <ol className="my-3 list-decimal pl-5">{children}</ol>,
                        li: ({children}) => <li className="my-1">{children}</li>,
                        h3: ({children}) => <h3 className="text-base font-semibold my-3">{children}</h3>,
                        h4: ({children}) => <h4 className="text-sm font-semibold my-2">{children}</h4>
                      }}
                    >
                      {processApiResponse(dailySummaryGmailResponse) || ""}
                    </ReactMarkdown>
                  }
                </div>
              </div>
            )}
            
            {dailySummaryLightspeedResponse && (
              <div className={`p-4 ${isPopupExpanded ? 'px-6' : ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">Sales Summary</h4>
                </div>
                <div className="prose prose-sm max-w-none text-gray-700 text-sm space-y-4 mt-2">
                  {processApiResponse(dailySummaryLightspeedResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                    renderHtml(processApiResponse(dailySummaryLightspeedResponse)) :
                    <ReactMarkdown 
                      className="text-gray-700 text-sm leading-relaxed space-y-4"
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        p: ({children}) => <p className="my-3">{children}</p>,
                        ul: ({children}) => <ul className="my-3 list-disc pl-5">{children}</ul>,
                        ol: ({children}) => <ol className="my-3 list-decimal pl-5">{children}</ol>,
                        li: ({children}) => <li className="my-1">{children}</li>,
                        h3: ({children}) => <h3 className="text-base font-semibold my-3">{children}</h3>,
                        h4: ({children}) => <h4 className="text-sm font-semibold my-2">{children}</h4>
                      }}
                    >
                      {processApiResponse(dailySummaryLightspeedResponse) || ""}
                    </ReactMarkdown>
                  }
                </div>
              </div>
            )}
          </div>
          <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowDailySummaryPopup(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </PageTransition>
  )
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