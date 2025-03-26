"use client"

import { useState, useEffect } from "react"
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
  Server
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { TapAiButton } from "@/components/tap-ai-button"
import { PageTransition } from "@/components/page-transition"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type TimeframeType = "today" | "yesterday" | "7days" | "30days"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<TimeframeType>("today")
  const [loading, setLoading] = useState(true)
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [popularRewards, setPopularRewards] = useState<any[]>([])
  const [activeBanners, setActiveBanners] = useState<any[]>([])
  const [scheduledBanners, setScheduledBanners] = useState<any[]>([])
  const [metricsType, setMetricsType] = useState<"consumer" | "platform">("platform")
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
    customersWithRedeemableRewards: 0,
    customersWithoutRedeemableRewards: 0
  })
  const [histogramData, setHistogramData] = useState<any[]>([])
  const [chartTimeframe, setChartTimeframe] = useState<"7days" | "30days" | "90days">("30days")
  const [chartLoading, setChartLoading] = useState(false)
  const [chartReady, setChartReady] = useState(false)

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
        setLoading(true)
        
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
        setLoading(false)
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
        setLoading(true)
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
            name: data.name || 'Unnamed Reward',
            rewardName: data.rewardName || data.name || 'Unnamed Reward',
            redemptionCount: data.redemptionCount || 0,
            impressions: data.impressions || 0,
            pointsCost: data.pointsCost || 0,
            type: data.type || 'item',
            conversionRate: data.conversionRate || 0,
            lastRedeemedAt: data.lastRedeemedAt?.toDate() || null
          }
        })
        
        console.log('Fetched rewards data:', rewardsData)
        
        // If no rewards found and in development, use sample data
        if (rewardsData.length === 0 && process.env.NODE_ENV === 'development') {
          setPopularRewards([
            {
              id: "rew1",
              name: "Free Coffee",
              redemptionCount: 342,
              impressions: 1000,
              pointsCost: 100,
              type: "item",
              conversionRate: 0.78
            },
            {
              id: "rew2",
              name: "10% Off Next Purchase",
              redemptionCount: 215,
              impressions: 800,
              pointsCost: 200,
              type: "discount",
              conversionRate: 0.65
            },
            {
              id: "rew3",
              name: "Buy 10 Get 1 Free",
              redemptionCount: 187,
              impressions: 700,
              pointsCost: 0,
              type: "program",
              conversionRate: 0.92
            }
          ])
        } else {
          setPopularRewards(rewardsData)
        }
      } catch (error) {
        console.error('Error fetching popular rewards:', error)
        toast({
          title: "Error",
          description: "Failed to load popular rewards. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
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
        setLoading(true)
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
        
        // Fetch redemption rate
        const redemptionsQuery = query(
          collection(db, 'redemptions'),
          where('merchantId', '==', user.uid),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end)
        )
        const redemptionsSnapshot = await getDocs(redemptionsQuery)
        const totalRedemptions = redemptionsSnapshot.docs.length
        const redemptionRate = totalRedemptions / totalCustomers
        
        // Fetch average order value
        const totalAmount = transactionsSnapshot.docs.reduce((total, doc) => total + (doc.data().amount || 0), 0)
        const avgOrderValue = totalAmount / totalCustomers
        
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
        
        // Fetch banner impressions from the correct path
        const bannersRef = collection(db, 'merchants', user.uid, 'banners')
        const bannersQuery = query(bannersRef)
        const bannersSnapshot = await getDocs(bannersQuery)
        const totalBannerImpressions = bannersSnapshot.docs.reduce(
          (total, doc) => total + (doc.data().impressions || 0), 
          0
        )
        
        // Fetch store views
        const storeViewsRef = collection(db, 'analytics')
        const storeViewsQuery = query(
          storeViewsRef,
          where('merchantId', '==', user.uid),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          where('type', '==', 'storeView')
        )
        const storeViewsSnapshot = await getDocs(storeViewsQuery)
        const totalStoreViews = storeViewsSnapshot.docs.length
        
        // Update metrics state with all values
        setMetrics({
          totalCustomers,
          activeCustomers,
          customerGrowth,
          totalPointsIssued,
          redemptionRate,
          avgOrderValue,
          totalTransactions: transactionsSnapshot.docs.length,
          totalRedemptions,
          activeRewards,
          totalBannerImpressions,
          totalStoreViews,
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
        setLoading(false)
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

  // Format date for display
  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy")
  }
  
  // Format time ago
  const formatTimeAgo = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (loading) {
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
      <div className="container mx-auto p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Welcome Section with Timeframe Tabs */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Here's an overview of your business
                </p>
              </div>
              
              <Button 
                className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => router.push('/create')}
              >
                <PlusCircle className="h-4 w-4" />
                <span>New Reward</span>
              </Button>
            </div>

            {/* Update the tabs layout to be side-by-side with a separator */}
            <div className="flex items-center gap-4">
              {/* Metrics type tabs */}
              <Tabs 
                defaultValue="platform" 
                className="flex-shrink-0"
                onValueChange={(value) => setMetricsType(value)}
              >
                <TabsList>
                  <TabsTrigger value="platform" className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span>Platform Metrics</span>
                  </TabsTrigger>
                  <TabsTrigger value="consumer" className="flex items-center gap-2">
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
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                  <TabsTrigger value="7days">Last 7 Days</TabsTrigger>
                  <TabsTrigger value="30days">Last 30 Days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          
          {/* Chart and Metrics side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histogram Chart on the left - takes up 2/3 of the space */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden lg:col-span-2">
              <CardHeader className="py-4 px-6 bg-gray-50 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Activity Overview</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Transactions and redemptions over time</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">Show:</div>
                    <div className="flex rounded-md overflow-hidden border border-gray-200">
                      <button 
                        onClick={() => setChartTimeframe("7days")}
                        className={`px-2 py-1 text-xs transition-all duration-300 ease-in-out ${
                          chartTimeframe === "7days" 
                            ? "bg-blue-50 text-blue-600 font-medium" 
                            : "bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        7 Days
                      </button>
                      <button 
                        onClick={() => setChartTimeframe("30days")}
                        className={`px-2 py-1 text-xs ${chartTimeframe === "30days" 
                          ? "bg-blue-50 text-blue-600 font-medium" 
                          : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                        30 Days
                      </button>
                      <button 
                        onClick={() => setChartTimeframe("90days")}
                        className={`px-2 py-1 text-xs ${chartTimeframe === "90days" 
                          ? "bg-blue-50 text-blue-600 font-medium" 
                          : "bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                        90 Days
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {chartLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center text-sm text-gray-500">
                      Updating chart...
                    </div>
                  </div>
                ) : histogramData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                      <BarChartIcon className="h-12 w-12 mx-auto text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium">No data available</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Activity data will appear here as customers interact with your store
                      </p>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`h-80 transition-opacity duration-500 ease-in-out ${
                      chartReady ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={histogramData}
                        margin={{ top: 5, right: 10, left: -15, bottom: 30 }}
                        barGap={4}
                      >
                        <defs>
                          <linearGradient id="colorTransactions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                          </linearGradient>
                          <linearGradient id="colorRedemptions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          angle={-45} 
                          textAnchor="end" 
                          height={40}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                          tickLine={false}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickFormatter={(value) => value === 0 ? '0' : value}
                        />
                        <Tooltip 
                          formatter={(value, name, props) => {
                            // Debug the incoming name parameter
                            console.log("Tooltip formatter received name:", name);
                            
                            // Explicitly check the name parameter and return the correct display name
                            if (name === "transactions") {
                              return [value, "Transactions"];
                            } else if (name === "redemptions") {
                              return [value, "Redemptions"];
                            } else {
                              // Fallback for any other case
                              return [value, name];
                            }
                          }}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.03)',
                            border: 'none',
                            padding: '10px 14px',
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
                            fontSize: '13px',
                            fontWeight: 500,
                            letterSpacing: '-0.01em'
                          }}
                          itemStyle={{
                            padding: '4px 0',
                            color: '#374151'
                          }}
                          labelStyle={{
                            fontWeight: 600,
                            marginBottom: '6px',
                            color: '#111827',
                            fontSize: '13px'
                          }}
                          // This ensures all items in the payload are shown
                          itemSorter={() => 0}
                          isAnimationActive={false}
                          cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Legend 
                          wrapperStyle={{ 
                            paddingTop: 15,
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
                            fontSize: 14,  // Increased from 12
                            fontWeight: 500
                          }}
                          iconType="circle"
                          iconSize={10}  // Increased from 8
                          formatter={(value) => {
                            // Use SF Pro font and better styling with larger text
                            return (
                              <span style={{ 
                                color: value === "Transactions" ? "#3b82f6" : "#8b5cf6", 
                                padding: "0 12px",  // Increased from 8px
                                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif',
                                fontWeight: 500,
                                letterSpacing: '-0.01em',
                                fontSize: '14px'  // Explicitly set font size
                              }}>
                                {value}
                              </span>
                            );
                          }}
                          layout="horizontal"
                          verticalAlign="bottom"
                          align="center"
                        />
                        <Bar 
                          dataKey="transactions" 
                          name="Transactions" 
                          fill="url(#colorTransactions)" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                          animationDuration={1500}
                        />
                        <Bar 
                          dataKey="redemptions" 
                          name="Redemptions" 
                          fill="url(#colorRedemptions)" 
                          radius={[4, 4, 0, 0]} 
                          maxBarSize={30}
                          animationDuration={1500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Key Metrics on the right - takes up 1/3 of the space */}
            <div className="space-y-4">
            {metricsType === "consumer" ? (
              <>
                  {/* Consumer metrics - compact stacked layout */}
                  <div className="space-y-2">
                    {/* Active Customers */}
                <Card className="rounded-lg border border-gray-200">
                      <CardContent className="p-3">
                    <div className="flex justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-500">Active Customers</p>
                            <div className="text-lg font-semibold">{metrics.activeCustomers}</div>
                      </div>
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-500" />
                      </div>
                    </div>
                        <div className="mt-1 flex items-center text-xs">
                      <div className={cn(
                        "flex items-center",
                        metrics.customerGrowth > 0 ? "text-green-600" : "text-red-600"
                      )}>
                        {metrics.customerGrowth > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        <span>{Math.abs(metrics.customerGrowth)}%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                    {/* Total Transactions */}
                <Card className="rounded-lg border border-gray-200">
                      <CardContent className="p-3">
                    <div className="flex justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                            <div className="text-lg font-semibold">{metrics.totalTransactions || 0}</div>
                      </div>
                          <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                            <ShoppingCart className="h-4 w-4 text-amber-500" />
                      </div>
                    </div>
                        <div className="mt-1 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                            <span>8.7%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                    {/* Total Redemptions */}
                <Card className="rounded-lg border border-gray-200">
                      <CardContent className="p-3">
                    <div className="flex justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
                            <div className="text-lg font-semibold">{metrics.totalRedemptions}</div>
                      </div>
                          <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-purple-500" />
                      </div>
                    </div>
                        <div className="mt-1 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                            <span>7.3%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                    {/* Customers with Rewards */}
                <Card className="rounded-lg border border-gray-200">
                      <CardContent className="p-3">
                    <div className="flex justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-500">Customers with Rewards</p>
                            <div className="text-lg font-semibold">{metrics.customersWithRedeemableRewards}</div>
                      </div>
                          <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-purple-500" />
                      </div>
                    </div>
                        <div className="mt-1 flex items-center text-xs">
                          <div className="text-gray-600 flex items-center">
                            <span>{((metrics.customersWithRedeemableRewards / metrics.totalCustomers) * 100).toFixed(1)}%</span>
                      </div>
                          <span className="text-gray-500 ml-1.5">of total customers</span>
                    </div>
                  </CardContent>
                </Card>
                    
                    {/* Customers without Rewards */}
                <Card className="rounded-lg border border-gray-200">
                      <CardContent className="p-3">
                    <div className="flex justify-between">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium text-gray-500">Customers without Rewards</p>
                            <div className="text-lg font-semibold">{metrics.customersWithoutRedeemableRewards}</div>
                      </div>
                          <div className="h-8 w-8 rounded-full bg-red-50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-red-500" />
                      </div>
                    </div>
                        <div className="mt-1 flex items-center text-xs">
                          <div className="text-gray-600 flex items-center">
                            <span>{((metrics.customersWithoutRedeemableRewards / metrics.totalCustomers) * 100).toFixed(1)}%</span>
                      </div>
                          <span className="text-gray-500 ml-1.5">of total customers</span>
                    </div>
                  </CardContent>
                </Card>
                  </div>
                </>
              ) : (
                <>
                  {/* Platform metrics - stacked vertically */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Active Rewards</p>
                          <div className="text-2xl font-semibold">{metrics.activeRewards}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>8%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Banner Impressions</p>
                          <div className="text-2xl font-semibold">{metrics.totalBannerImpressions.toLocaleString()}</div>
                      </div>
                        <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                          <Eye className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                          <span>12%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-500">Store Views</p>
                          <div className="text-2xl font-semibold">{metrics.totalStoreViews.toLocaleString()}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                          <span>15%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            </div>
          </div>
          
          {/* Key Metrics Highlights - Smaller and more discrete */}
          <div className="flex gap-4 mt-4 mb-2">
            {/* Total Transactions Highlight */}
            <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Today's Transactions</p>
                <p className="text-lg font-semibold text-blue-700">
                  {loading ? "..." : metrics.totalTransactions || 0}
                </p>
              </div>
            </div>

            {/* Total Redemptions Highlight */}
            <div className="flex items-center gap-3 px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Gift className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Today's Redemptions</p>
                <p className="text-lg font-semibold text-purple-700">
                  {loading ? "..." : metrics.totalRedemptions || 0}
                </p>
              </div>
            </div>
          </div>
          
          {/* Recent Activity and Popular Rewards - Side by side */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Recent Activity - New Design */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden">
              <CardHeader className="py-3 px-6 bg-gray-50 border-b border-gray-100 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Recent Activity</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Latest customer transactions and redemptions</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 h-8 px-2 ml-auto"
                    asChild
                  >
                  <Link href="/store/activity" className="flex items-center gap-1">
                      View all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
              </CardHeader>
              <CardContent className="p-0">
                  {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                    </div>
                  ) : recentActivity.length === 0 ? (
                  <div className="py-6 text-center">
                    <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  ) : (
                  <div className="divide-y">
                      {recentActivity.map((activity) => (
                      <div key={activity.id} className="px-6 py-2.5 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {/* Left side - Customer Avatar */}
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {activity.customer?.profilePicture ? (
                                  <img 
                                    src={activity.customer.profilePicture} 
                                    alt={activity.customer.name}
                                    className="h-full w-full object-cover"
                                  onError={() => {/* error handling */}}
                                  />
                                ) : (
                                  <Users className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Right side - Activity Details - More Compact */}
                          <div className="flex-1 min-w-0 flex items-center justify-between">
                            <div>
                                  <p className="font-medium text-sm text-gray-900">{activity.customer.name}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {activity.type === "transaction" ? (
                                  <div className="flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>Purchase</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Gift className="h-3 w-3" />
                                    <span>Redeemed {activity.rewardName}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {activity.type === "transaction" 
                                  ? `$${activity.amount.toFixed(2)}` 
                                  : `${activity.points} pts`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(activity.timestamp)}
                              </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Popular Rewards */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden">
              <CardHeader className="py-3 px-6 bg-gray-50 border-b border-gray-100 flex flex-row justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Popular Rewards</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Most redeemed rewards by customers</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 h-8 px-2 ml-auto"
                    asChild
                  >
                    <Link href="/store/rewards" className="flex items-center gap-1">
                      View all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  </div>
                ) : popularRewards.length === 0 ? (
                  <div className="py-6 text-center">
                    <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No rewards data available</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {popularRewards.map((reward) => (
                      <div key={reward.id} className="px-6 py-2.5 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-purple-50 flex items-center justify-center">
                              <Gift className="h-4 w-4 text-purple-500" />
                          </div>
                            <div>
                              <p className="font-medium text-sm">{reward.name}</p>
                              <p className="text-xs text-gray-500">{reward.pointsCost} points</p>
                                </div>
                              </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{reward.redemptionCount} redeemed</p>
                            <div className="flex items-center justify-end gap-1 text-xs">
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

          {/* Live and Scheduled Banners Section */}
          {(activeBanners.length > 0 || scheduledBanners.length > 0) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium">Banners</h2>
                  <p className="text-sm text-gray-500">Your active and scheduled banners</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    onClick={() => router.push('/store/banner?tab=scheduled')}
                  >
                    <Clock className="h-4 w-4" />
                    View Schedule
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2"
                    asChild
                  >
                    <Link href="/store/banner">
                      Manage banners
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {/* Live Banners First */}
                {activeBanners.map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          Live
                        </div>
                        <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {banner.impressions || 0} views
                        </div>
                      </div>
                      
                      <div className="rounded-lg overflow-hidden shadow-sm">
                        <BannerPreview {...banner} />
                      </div>
                    </div>
                  </div>
                ))}

                {/* Then Scheduled Banners */}
                {scheduledBanners.map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10 flex gap-2">
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </div>
                        <div className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full flex items-center">
                          <Eye className="h-3 w-3 mr-1" />
                          {banner.impressions || 0} views
                        </div>
                      </div>
                      
                      <div className="rounded-lg overflow-hidden shadow-sm">
                        <BannerPreview {...banner} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
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

export function LightspeedCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState("Processing your Lightspeed connection...")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      if (!searchParams) return;
      
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')
      
      // Decide if this is the normal Lightspeed or the new Lightspeed API
      const storedState = localStorage.getItem('lightspeed_state') || localStorage.getItem('lightspeed_api_state')
      const merchantId = localStorage.getItem('merchant_id') || localStorage.getItem('merchant_api_id')

      // Clear them so we avoid re-running the logic
      localStorage.removeItem('lightspeed_state')
      localStorage.removeItem('merchant_id')
      localStorage.removeItem('lightspeed_api_state')
      localStorage.removeItem('merchant_api_id')

      if (errorParam) {
        const errorMessage = `Authorization failed: ${errorParam}`
        setStatus(errorMessage)
        setError(errorMessage)
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive"
        })
        setTimeout(() => router.push('/integrations'), 3000)
        return
      }

      if (!code || !state) {
        const errorMessage = "Missing authorization code or state"
        setStatus(errorMessage)
        setError(errorMessage)
        toast({
          title: "Connection Failed",
          description: errorMessage,
          variant: "destructive"
        })
        setTimeout(() => router.push('/integrations'), 3000)
        return
      }

      if (state !== storedState) {
        const errorMessage = "Invalid state parameter"
        setStatus(errorMessage)
        setError(errorMessage)
        toast({
          title: "Connection Failed",
          description: "Security validation failed. Please try again.",
          variant: "destructive"
        })
        setTimeout(() => router.push('/integrations'), 3000)
        return
      }

      if (!merchantId) {
        const errorMessage = "Merchant ID not found"
        setStatus(errorMessage)
        setError(errorMessage)
        toast({
          title: "Connection Failed",
          description: "Merchant ID not found. Please try again.",
          variant: "destructive"
        })
        setTimeout(() => router.push('/integrations'), 3000)
        return
      }

      try {
        setStatus("Exchanging authorization code for access token...")

        // Decide which token route to post to. If we were hooking up the new
        // "lightspeedApi" flow, use /api/lightspeedApi/token. Otherwise, use
        // /api/lightspeed/token. For simplicity, just assume the new route:
        const tokenRes = await fetch('/api/lightspeedApi/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, merchantId })
        })

        if (!tokenRes.ok) {
          const errData = await tokenRes.json()
          throw new Error(errData.error || 'Token exchange failed.')
        }

        const tokenData = await tokenRes.json()
        
        setStatus("All done! Your Lightspeed API integration is connected.")
        toast({
          title: "Connection Successful",
          description: "Your Lightspeed Retail API account is connected."
        })
        // redirect back
        setTimeout(() => router.push('/integrations'), 2000)
        
      } catch (err) {
        console.error("Error during Lightspeed OAuth flow:", err)
        const errorMessage = err instanceof Error ? err.message : String(err)
        setStatus("Failed to complete the connection")
        setError(errorMessage)
        toast({
          title: "Connection Failed",
          description: "Failed to complete the Lightspeed connection. Please try again.",
          variant: "destructive"
        })
        setTimeout(() => router.push('/integrations'), 3000)
      }
    }

    // Check if searchParams exists before using it
    if (searchParams && (searchParams.has('code') || searchParams.has('error'))) {
      handleOAuthCallback()
    }
  }, [router, searchParams])

  // If no OAuth parameters, show the dashboard
  if (!searchParams || (!searchParams.has('code') && !searchParams.has('error'))) {
    return null // Let the main dashboard component render
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-xl font-semibold mb-4">Lightspeed Integration</h1>
        <div className="flex items-center gap-2 mb-4">
          {error ? (
            <div className="text-red-500 mb-2">{error}</div>
          ) : (
            <>
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <p>{status}</p>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          You will be redirected back to the integrations page shortly.
        </p>
      </div>
    </div>
  )
} 