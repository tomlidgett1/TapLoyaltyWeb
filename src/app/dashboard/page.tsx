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
  Server,
  Ticket,
  Lightbulb
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
  const [isRewardDialogOpen, setIsRewardDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<{id: string, name: string} | null>(null)

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

  useEffect(() => {
    const fetchTopViewingCustomers = async () => {
      if (!user?.uid) return
      
      try {
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
          
          if (!merchantId) {
            console.error('Missing merchant ID in localStorage')
            throw new Error('Missing merchant ID')
          }
          
          if (!codeVerifier) {
            console.error('Missing code verifier in localStorage')
            throw new Error('Missing code verifier')
          }
          
          console.log('Exchanging code for token...')
          // Exchange code for token
          const response = await fetch('/api/lightspeed/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              state,
              merchantId,
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
          } else {
            console.error('Lightspeed New connection failed:', data.error, data.details)
            throw new Error(data.error || 'Failed to connect Lightspeed account')
          }
          
          // Clear state from localStorage
          localStorage.removeItem('lightspeed_new_state')
          localStorage.removeItem('lightspeed_new_merchant_id')
          localStorage.removeItem('lightspeed_new_code_verifier')
          
          // Redirect to integrations page
          console.log('Redirecting to integrations page')
          router.push('/integrations')
        } catch (error) {
          console.error('Error handling Lightspeed New callback:', error)
          toast({
            title: "Connection Failed",
            description: "We couldn't connect your Lightspeed account. Please try again.",
            variant: "destructive"
          })
        }
      } else if (code && state) {
        // If we have code and state but no matching stored state, log this information
        console.log('OAuth callback received but no matching state found in localStorage', {
          availableLocalStorageKeys: Object.keys(localStorage),
          squareStateExists: !!localStorage.getItem('square_state'),
          lightspeedStateExists: !!localStorage.getItem('lightspeed_state'),
          lightspeedNewStateExists: !!localStorage.getItem('lightspeed_new_state')
        })
      }
      
      // Handle other OAuth providers like Lightspeed as needed...
    }
    
    // Only run the callback handler if we have query parameters that look like an OAuth callback
    if (searchParams && (searchParams.get('code') || searchParams.get('state'))) {
      console.log('OAuth callback parameters detected in URL')
      handleOAuthCallback()
    }
  }, [searchParams, user, router])

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
      <div className="p-6">
        <div className="space-y-8">
          {/* Welcome Section with Timeframe Tabs */}
          <div className="space-y-4">
            <PageHeader
              title="Welcome back"
              subtitle="Here's an overview of your business"
            />

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
                        <div className="text-lg font-semibold">{metrics.activeRewards}</div>
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
                        <div className="text-lg font-semibold">{metrics.totalRewardViews}</div>
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
                        <div className="text-lg font-semibold">{metrics.totalPointsIssued}</div>
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
                        <div className="text-lg font-semibold">{metrics.totalStoreViews}</div>
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
                        <div className="text-lg font-semibold">{metrics.activeCustomers}</div>
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
                        <div className="text-lg font-semibold">{metrics.totalTransactions}</div>
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
                        <div className="text-lg font-semibold">{metrics.totalRedemptions}</div>
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
                        <div className="text-lg font-semibold">${metrics.avgOrderValue}</div>
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
                {loading ? (
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

          {/* Top Viewing Customers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                {topViewingCustomers.length === 0 ? (
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

            {/* Popular Rewards */}
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
                {loading ? (
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
      <CreateRewardDialog
        open={isRewardDialogOpen}
        onOpenChange={setIsRewardDialogOpen}
        customerId={selectedCustomer?.id}
        customerName={selectedCustomer?.name}
      />
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