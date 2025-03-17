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
  Eye
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs, where } from "firebase/firestore"
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

  const getDateRange = (tf: TimeframeType): { start: Date; end: Date } => {
    const now = new Date()
    switch (tf) {
      case "today":
        return {
          start: new Date(now.setHours(0, 0, 0, 0)),
          end: new Date()
        }
      case "yesterday":
        const yesterday = new Date(now)
        yesterday.setDate(yesterday.getDate() - 1)
        return {
          start: new Date(yesterday.setHours(0, 0, 0, 0)),
          end: new Date(yesterday.setHours(23, 59, 59, 999))
        }
      case "7days":
        const sevenDaysAgo = new Date(now)
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        return {
          start: new Date(sevenDaysAgo.setHours(0, 0, 0, 0)),
          end: new Date()
        }
      case "30days":
        const thirtyDaysAgo = new Date(now)
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        return {
          start: new Date(thirtyDaysAgo.setHours(0, 0, 0, 0)),
          end: new Date()
        }
    }
    // Default to today
    return {
      start: new Date(now.setHours(0, 0, 0, 0)),
      end: new Date()
    }
  }

  useEffect(() => {
    // Fetch recent activity data
    const fetchRecentActivity = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const { start, end } = getDateRange(timeframe)
        
        const activityQuery = query(
          collection(db, 'merchants', user.uid, 'activity'),
          where('timestamp', '>=', start),
          where('timestamp', '<=', end),
          orderBy('timestamp', 'desc'),
          limit(10)
        )
        
        // Get the activity documents
        const activitySnapshot = await getDocs(activityQuery)
        
        // Map the documents to our activity format - match exactly with store/activity
        const activityData = activitySnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            type: data.type || 'unknown',
            customer: {
              id: data.customerId || 'unknown',
              name: data.customerName || 'Anonymous Customer',
              email: data.customerEmail || '',
              phone: data.customerPhone || ''
            },
            timestamp: data.timestamp?.toDate() || new Date(),
            details: data.details || '',
            amount: data.amount || 0,
            points: data.points || 0,
            rewardId: data.rewardId || null,
            rewardName: data.rewardName || null,
            transactionId: data.transactionId || null,
            source: data.source || 'manual'
          }
        })
        
        console.log('Fetched activity data:', activityData)
        
        // Add fallback data
        const fallbackActivity = [
          {
            id: "sample1",
            type: "purchase",
            customer: {
              id: "sample-cust-1",
              name: "Sarah Johnson",
              email: "sarah@example.com"
            },
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
            details: "Purchased 3 items",
            amount: 24.99,
            points: 25,
            source: "sample"
          },
          {
            id: "sample2",
            type: "redemption",
            customer: {
              id: "sample-cust-2",
              name: "Michael Chen",
              email: "michael@example.com"
            },
            timestamp: new Date(Date.now() - 1000 * 60 * 120),
            details: "Redeemed Free Coffee reward",
            points: 100,
            rewardId: "sample-reward-1",
            rewardName: "Free Coffee",
            source: "sample"
          }
        ]
        
        // In the useEffect, if no data is returned, use the fallback
        if (activityData.length === 0 && process.env.NODE_ENV === 'development') {
          console.log('No activity data found, using fallback data')
          setRecentActivity(fallbackActivity)
        } else {
          setRecentActivity(activityData)
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error)
        toast({
          title: "Error",
          description: "Failed to load recent activity. Please refresh the page.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchRecentActivity()
  }, [user, timeframe])

  useEffect(() => {
    // Fetch rewards data and sort by redemption count
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
    
    fetchPopularRewards()
  }, [user, timeframe])

  useEffect(() => {
    const fetchActiveBanners = async () => {
      if (!user?.uid) return
      
      try {
        const bannersQuery = query(
          collection(db, 'merchants', user.uid, 'banners'),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        )
        
        const bannersSnapshot = await getDocs(bannersQuery)
        
        // Map the data more explicitly to ensure we have all required fields
        const bannersData = bannersSnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Helper function to safely convert Firestore timestamp
          const getDate = (timestamp: any) => {
            if (!timestamp) return new Date()
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
              return timestamp.toDate()
            }
            if (timestamp instanceof Date) return timestamp
            return new Date(timestamp)
          }

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
            isActive: true,
            impressions: data.impressions || 0,
            updatedAt: getDate(data.updatedAt)
          }
        })
        
        // Debug final banners array
        console.log('Final banners array:', bannersData)
        
        setActiveBanners(bannersData)
      } catch (error) {
        console.error('Error fetching active banners:', error)
        toast({
          title: "Error",
          description: "Failed to load active banners. Please refresh the page.",
          variant: "destructive"
        })
      }
    }
    
    fetchActiveBanners()
  }, [user])

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

            <Tabs
              defaultValue="today"
              value={timeframe}
              onValueChange={(value) => setTimeframe(value as TimeframeType)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
                <TabsTrigger value="7days">Last 7 days</TabsTrigger>
                <TabsTrigger value="30days">Last 30 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Reduce space between tabs and metrics */}
          <div className="mt-6">
            {/* Key Metrics - Simplified */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-lg border border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-500">Total Customers</p>
                    <div className="mt-2 flex items-baseline">
                      <p className="text-2xl font-semibold">1,247</p>
                      <p className="ml-2 text-sm text-blue-600">+12.5%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-500">Points Issued</p>
                    <div className="mt-2 flex items-baseline">
                      <p className="text-2xl font-semibold">45,892</p>
                      <p className="ml-2 text-sm text-blue-600">+23.7%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-500">Redemption Rate</p>
                    <div className="mt-2 flex items-baseline">
                      <p className="text-2xl font-semibold">32%</p>
                      <p className="ml-2 text-sm text-blue-600">+5.2%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-lg border border-gray-200">
                <CardContent className="pt-6">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-gray-500">Avg. Order Value</p>
                    <div className="mt-2 flex items-baseline">
                      <p className="text-2xl font-semibold">$24.50</p>
                      <p className="ml-2 text-sm text-blue-600">+3.8%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Recent Activity - Simplified */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-lg border border-gray-200">
              <CardHeader className="border-b border-gray-100">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    asChild
                  >
                    <Link href="/store/activity">View all</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.customer.name}</p>
                          <p className="text-sm text-gray-500">{activity.details}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                          {activity.points && (
                            <p className={cn(
                              "text-sm font-medium",
                              activity.type === "redemption" ? "text-gray-600" : "text-blue-600"
                            )}>
                              {activity.type === "redemption" ? "-" : "+"}{activity.points} points
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Popular Rewards - Redesigned */}
            <Card className="rounded-lg border border-gray-200">
              <CardHeader className="py-4 px-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">Popular Rewards</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-600 hover:text-blue-700 h-8 px-2"
                    asChild
                  >
                    <Link href="/store/rewards">View all</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-4 text-center text-gray-500">Loading rewards...</div>
                ) : popularRewards.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No rewards found</div>
                ) : (
                  <div className="grid grid-cols-1 divide-y divide-gray-100">
                    {popularRewards.map((reward) => (
                      <Link 
                        key={reward.id} 
                        href={`/rewards/${reward.id}`}
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
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50">
                                  {reward.redemptionCount} redeemed
                                </Badge>
                                <Badge variant="outline" className="bg-gray-50 text-gray-600 hover:bg-gray-50">
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

          {/* Live Banners Section */}
          {activeBanners.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-medium">Live Banners</h2>
                  <p className="text-sm text-gray-500">Currently active banners in your store</p>
                </div>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeBanners.map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    {/* Banner Preview with status badges */}
                    <div className="relative">
                      {/* Status Badges */}
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
                      
                      {/* Banner preview */}
                      <div className="rounded-lg overflow-hidden shadow-sm">
                        <BannerPreview
                          title={banner.title}
                          description={banner.description}
                          color={banner.color}
                          styleType={
                            banner.style === "light" ? BannerStyle.LIGHT :
                            banner.style === "glass" ? BannerStyle.GLASS :
                            banner.style === "dark" ? BannerStyle.DARK :
                            BannerStyle.LIGHT
                          }
                          merchantName={banner.merchantName}
                          visibilityType={BannerVisibility.ALL}
                          isActive={banner.isActive}
                        />
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