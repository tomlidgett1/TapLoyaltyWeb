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
  BarChart,
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
    customerGrowth: 0,
    totalPointsIssued: 0,
    redemptionRate: 0,
    avgOrderValue: 0
  })

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
          where('merchantId', '==', user.uid),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end)
        )
        const customersSnapshot = await getDocs(customersQuery)
        const totalCustomers = customersSnapshot.docs.length
        
        // Fetch total points issued
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(
          transactionsRef,
          where('merchantId', '==', user.uid),
          where('createdAt', '>=', start),
          where('createdAt', '<=', end)
        )
        const transactionsSnapshot = await getDocs(transactionsQuery)
        const totalPointsIssued = transactionsSnapshot.docs.reduce((total, doc) => total + (doc.data().amount || 0), 0)
        
        // Fetch redemption rate
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
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
        
        setMetrics({
          totalCustomers,
          customerGrowth,
          totalPointsIssued,
          redemptionRate,
          avgOrderValue
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
          
          {/* Metrics section - conditionally render based on metricsType */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {metricsType === "consumer" ? (
              <>
                {/* Consumer metrics */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Total Customers</p>
                        <div className="text-2xl font-semibold">{metrics.totalCustomers}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
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
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Average Spend</p>
                        <div className="text-2xl font-semibold">${metrics.avgOrderValue.toFixed(2)}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>5.2%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                        <div className="text-2xl font-semibold">{metrics.totalTransactions || 0}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-amber-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>8.7%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Total Redemptions</p>
                        <div className="text-2xl font-semibold">{metrics.totalRedemptions || 0}</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-purple-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>12.3%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Platform metrics */}
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">Active Merchants</p>
                        <div className="text-2xl font-semibold">127</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-purple-500" />
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
                        <p className="text-sm font-medium text-gray-500">Total Rewards</p>
                        <div className="text-2xl font-semibold">3,842</div>
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
                        <p className="text-sm font-medium text-gray-500">API Requests</p>
                        <div className="text-2xl font-semibold">1.2M</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>23%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-lg border border-gray-200">
                  <CardContent className="p-6">
                    <div className="flex justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">System Uptime</p>
                        <div className="text-2xl font-semibold">99.98%</div>
                      </div>
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                        <Server className="h-5 w-5 text-blue-500" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-xs">
                      <div className="text-green-600 flex items-center">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        <span>0.1%</span>
                      </div>
                      <span className="text-gray-500 ml-1.5">vs. previous period</span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          {/* Recent Activity and Popular Rewards - Side by side */}
          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Recent Activity - New Design */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden">
              <CardHeader className="py-4 px-6 bg-gray-50 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Recent Activity</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Latest customer transactions and redemptions</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 h-8 px-2"
                    asChild
                  >
                    <Link href="/customers" className="flex items-center gap-1">
                      View all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                <div className="divide-y divide-gray-100">
                  {loading ? (
                    <div className="p-4 text-center">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                      </div>
                    </div>
                  ) : recentActivity.length === 0 ? (
                    <div className="p-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <Zap className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="mt-2 text-sm font-medium">No recent activity</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Activity will appear here as customers interact
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                          <div className="flex items-start gap-3">
                            {/* Left side - Customer Avatar - Smaller */}
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                                {activity.customer?.profilePicture ? (
                                  <img 
                                    src={activity.customer.profilePicture} 
                                    alt={activity.customer.name}
                                    className="h-full w-full object-cover"
                                    onError={() => {
                                      setRecentActivity(prev => 
                                        prev.map(act => 
                                          act.id === activity.id 
                                            ? {
                                                ...act,
                                                customer: {
                                                  ...act.customer,
                                                  profilePicture: null
                                                }
                                              }
                                            : act
                                        )
                                      )
                                    }}
                                  />
                                ) : (
                                  <Users className="h-4 w-4 text-gray-400" />
                                )}
                              </div>
                            </div>

                            {/* Right side - Activity Details - More Compact */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm text-gray-900">{activity.customer.name}</p>
                                  <span className="text-gray-300">•</span>
                                  <span className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {activity.type === "transaction" ? (
                                    <div className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-xs font-medium">
                                      ${activity.amount}
                                    </div>
                                  ) : (
                                    <div className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                                      {activity.points} points
                                    </div>
                                  )}
                                  <Badge variant="outline" className={cn(
                                    "rounded-md px-2 py-0.5 text-xs",
                                    activity.status?.toLowerCase() === "completed" && "bg-green-50 text-green-700 border-green-200",
                                    activity.status?.toLowerCase() === "pending" && "bg-amber-50 text-amber-700 border-amber-200",
                                    activity.status?.toLowerCase() === "failed" && "bg-red-50 text-red-700 border-red-200"
                                  )}>
                                    {activity.status}
                                  </Badge>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                {activity.type === "transaction" ? (
                                  <div className="flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>Made a purchase</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <Gift className="h-3 w-3" />
                                    <span>
                                      Redeemed{' '}
                                      {console.log("Rendering redemption link for:", {
                                        rewardId: activity.rewardId,
                                        rewardName: activity.rewardName
                                      }) && (
                                        <Link 
                                          href={`/store/${activity.rewardId}`}
                                          className="text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                          {activity.rewardName}
                                        </Link>
                                      )}
                                      {activity.points > 0 && ` (${activity.points} points)`}
                                    </span>
                                  </div>
                                )}
                                <span className="text-gray-300">•</span>
                                <span>{formatTimeAgo(activity.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Popular Rewards */}
            <Card className="rounded-lg border border-gray-200 overflow-hidden">
              <CardHeader className="py-4 px-6 bg-gray-50 border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-base font-medium text-gray-900">Popular Rewards</CardTitle>
                    <p className="text-sm text-gray-500 mt-0.5">Most redeemed rewards by customers</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 h-8 px-2"
                    asChild
                  >
                    <Link href="/store/rewards" className="flex items-center gap-1">
                      View all
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 bg-white">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading rewards...</div>
                ) : popularRewards.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No rewards found</div>
                ) : (
                  <div className="grid grid-cols-1 divide-y divide-gray-100">
                    {popularRewards.map((reward) => (
                      <Link 
                        key={reward.id} 
                        href={`/store/${reward.id}`}
                        className="block hover:bg-gray-50 transition-colors"
                      >
                        <div className="px-6 py-3 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <p className="text-sm font-semibold text-blue-600">
                              #{popularRewards.indexOf(reward) + 1}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <div className="truncate">
                                <p className="text-sm font-medium truncate">
                                  {reward.rewardName || reward.name}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  <p className="text-xs text-gray-500">
                                    {reward.pointsCost > 0 ? `${reward.pointsCost} points` : 'Punch card'}
                                  </p>
                                  {reward.lastRedeemedAt && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <p className="text-xs text-gray-500">
                                        Last redeemed {formatDistanceToNow(reward.lastRedeemedAt, { addSuffix: true })}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border-blue-200">
                                  {reward.redemptionCount} redeemed
                                </Badge>
                                <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs bg-gray-50 text-gray-600 border-gray-200">
                                  {reward.impressions} views
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
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

    // If the URL has ?code= or ?error=, handle the callback
    if (searchParams.has('code') || searchParams.has('error')) {
      handleOAuthCallback()
    }
  }, [router, searchParams])

  // If no OAuth parameters, show the dashboard
  if (!searchParams.has('code') && !searchParams.has('error')) {
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