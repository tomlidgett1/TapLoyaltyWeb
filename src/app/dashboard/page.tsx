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
  ChevronRight
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month" | "year">("month")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading data
    const timer = setTimeout(() => {
      setLoading(false)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [])

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
      <div className="p-8 flex justify-center items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's what's happening with your loyalty program today
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-9 gap-2 rounded-md"
              onClick={() => router.push('/store')}
            >
              <Gift className="h-4 w-4" />
              <span>View My Store</span>
            </Button>
            
            <Button 
              className="h-9 gap-2 rounded-md"
              onClick={() => router.push('/create')}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create</span>
            </Button>
          </div>
        </div>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Customers"
            value="1,247"
            change={12.5}
            icon={Users}
            color="blue"
          />
          
          <MetricCard 
            title="Points Issued"
            value="45,892"
            change={23.7}
            icon={Zap}
            color="amber"
          />
          
          <MetricCard 
            title="Redemption Rate"
            value="32%"
            change={5.2}
            icon={Gift}
            color="purple"
          />
          
          <MetricCard 
            title="Avg. Order Value"
            value="$24.50"
            change={3.8}
            icon={ShoppingCart}
            color="green"
          />
        </div>
        
        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid grid-cols-3 h-10 rounded-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Recent Activity */}
            <Card className="rounded-lg overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle>Recent Activity</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 rounded-md"
                    asChild
                  >
                    <Link href="/analytics">
                      <span>View all</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0",
                          activity.type === "purchase" && "bg-green-100",
                          activity.type === "redemption" && "bg-purple-100",
                          activity.type === "signup" && "bg-blue-100"
                        )}>
                          {activity.type === "purchase" && <ShoppingCart className="h-5 w-5 text-green-600" />}
                          {activity.type === "redemption" && <Gift className="h-5 w-5 text-purple-600" />}
                          {activity.type === "signup" && <Users className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <Link 
                                href={`/customers/${activity.customer.id}`}
                                className="font-medium text-sm hover:underline"
                              >
                                {activity.customer.name}
                              </Link>
                              <p className="text-sm text-muted-foreground">
                                {activity.details}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                          {activity.points && (
                            <div className="mt-1">
                              <Badge variant="outline" className="rounded-md bg-blue-50 text-blue-700 border-blue-200">
                                {activity.type === "redemption" ? "-" : "+"}{activity.points} points
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Program Growth */}
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Program Growth</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium">New Customers</p>
                      <Badge variant="outline" className="rounded-md bg-green-50 text-green-700 border-green-200">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        15%
                      </Badge>
                    </div>
                    <Progress value={65} className="h-2 rounded-md" />
                    <p className="text-xs text-muted-foreground mt-2">
                      42 new customers this month
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-sm font-medium">Repeat Purchase Rate</p>
                      <Badge variant="outline" className="rounded-md bg-green-50 text-green-700 border-green-200">
                        <ArrowUp className="h-3 w-3 mr-1" />
                        8%
                      </Badge>
                    </div>
                    <Progress value={72} className="h-2 rounded-md" />
                    <p className="text-xs text-muted-foreground mt-2">
                      72% of customers made repeat purchases
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Popular Rewards */}
              <Card className="rounded-lg">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Popular Rewards</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 gap-1 rounded-md"
                      asChild
                    >
                      <Link href="/rewards">
                        <span>View all</span>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {popularRewards.map((reward) => (
                      <Link 
                        key={reward.id} 
                        href={`/rewards/${reward.id}`}
                        className="block p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0",
                            reward.type === "item" && "bg-purple-100",
                            reward.type === "discount" && "bg-green-100",
                            reward.type === "program" && "bg-amber-100"
                          )}>
                            {reward.type === "item" && <Gift className="h-5 w-5 text-purple-600" />}
                            {reward.type === "discount" && <DollarSign className="h-5 w-5 text-green-600" />}
                            {reward.type === "program" && <Coffee className="h-5 w-5 text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium text-sm">{reward.name}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {reward.pointsCost > 0 ? `${reward.pointsCost} points` : 'Punch card program'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-sm">{reward.redemptionCount}</p>
                                <p className="text-xs text-muted-foreground">redemptions</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4">
                  <Button 
                    variant="outline" 
                    className="w-full rounded-md h-9 gap-2"
                    onClick={() => router.push('/create')}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Create new reward
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card className="rounded-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Customer Segments</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 rounded-md"
                    asChild
                  >
                    <Link href="/customers">
                      <span>View all customers</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <CustomerSegmentCard 
                    title="Active Customers"
                    count={876}
                    percentage={70}
                    change={8.3}
                    description="Visited in last 30 days"
                    color="green"
                  />
                  
                  <CustomerSegmentCard 
                    title="At Risk"
                    count={124}
                    percentage={10}
                    change={-5.2}
                    description="No visit in 60-90 days"
                    color="amber"
                  />
                  
                  <CustomerSegmentCard 
                    title="VIP Customers"
                    count={93}
                    percentage={7.5}
                    change={12.8}
                    description="Top 10% by spend"
                    color="purple"
                  />
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <Button 
                  className="w-full rounded-md h-9 gap-2"
                  onClick={() => router.push('/customers')}
                >
                  <Users className="h-4 w-4" />
                  Manage Customers
                </Button>
              </CardFooter>
            </Card>
            
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Recent Signups</CardTitle>
                <CardDescription>New customers in the last 30 days</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentSignups.map((customer) => (
                    <Link 
                      key={customer.id} 
                      href={`/customers/${customer.id}`}
                      className="block p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex gap-3">
                        <div className="h-10 w-10 rounded-md bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-sm">{customer.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {customer.email}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(customer.signupDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-6">
            <Card className="rounded-lg">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Reward Performance</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 rounded-md"
                    asChild
                  >
                    <Link href="/rewards">
                      <span>View all rewards</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rewardPerformance.map((reward) => (
                    <div key={reward.id} className="p-4 border rounded-md">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0",
                            reward.type === "item" && "bg-purple-100",
                            reward.type === "discount" && "bg-green-100",
                            reward.type === "program" && "bg-amber-100"
                          )}>
                            {reward.type === "item" && <Gift className="h-4 w-4 text-purple-600" />}
                            {reward.type === "discount" && <DollarSign className="h-4 w-4 text-green-600" />}
                            {reward.type === "program" && <Coffee className="h-4 w-4 text-amber-600" />}
                          </div>
                          <h3 className="font-medium">{reward.name}</h3>
                        </div>
                        <Badge variant={reward.trend === "up" ? "outline" : "secondary"} className={cn(
                          "rounded-md",
                          reward.trend === "up" && "bg-green-50 text-green-700 border-green-200",
                          reward.trend === "down" && "bg-red-50 text-red-700 border-red-200"
                        )}>
                          {reward.trend === "up" ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                          {reward.changePercentage}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Redemptions</p>
                          <p className="text-lg font-medium">{reward.redemptionCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Conversion</p>
                          <p className="text-lg font-medium">{reward.conversionRate}%</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Points Cost</p>
                          <p className="text-lg font-medium">{reward.pointsCost}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <Button 
                  className="w-full rounded-md h-9 gap-2"
                  onClick={() => router.push('/create')}
                >
                  <PlusCircle className="h-4 w-4" />
                  Create New Reward
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// Component for metric cards
function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string
  value: string
  change: number
  icon: React.ElementType
  color: "blue" | "green" | "red" | "amber" | "purple" | "indigo"
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center",
            color === "blue" && "bg-blue-100",
            color === "green" && "bg-green-100",
            color === "red" && "bg-red-100",
            color === "amber" && "bg-amber-100",
            color === "purple" && "bg-purple-100",
            color === "indigo" && "bg-indigo-100"
          )}>
            <Icon className={cn(
              "h-5 w-5",
              color === "blue" && "text-blue-600",
              color === "green" && "text-green-600",
              color === "red" && "text-red-600",
              color === "amber" && "text-amber-600",
              color === "purple" && "text-purple-600",
              color === "indigo" && "text-indigo-600"
            )} />
          </div>
        </div>
        <div className="mt-4">
          <Badge variant="outline" className={cn(
            "rounded-md",
            change > 0 && "bg-green-50 text-green-700 border-green-200",
            change < 0 && "bg-red-50 text-red-700 border-red-200"
          )}>
            {change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
            {Math.abs(change)}%
          </Badge>
          <span className="text-xs text-muted-foreground ml-2">vs last month</span>
        </div>
      </CardContent>
    </Card>
  )
}

// Component for customer segment cards
function CustomerSegmentCard({
  title,
  count,
  percentage,
  change,
  description,
  color
}: {
  title: string
  count: number
  percentage: number
  change: number
  description: string
  color: "blue" | "green" | "red" | "amber" | "purple"
}) {
  return (
    <Card className="rounded-lg">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "h-8 w-8 rounded-md flex items-center justify-center",
            color === "blue" && "bg-blue-100",
            color === "green" && "bg-green-100",
            color === "red" && "bg-red-100",
            color === "amber" && "bg-amber-100",
            color === "purple" && "bg-purple-100"
          )}>
            <Users className={cn(
              "h-4 w-4",
              color === "blue" && "text-blue-600",
              color === "green" && "text-green-600",
              color === "red" && "text-red-600",
              color === "amber" && "text-amber-600",
              color === "purple" && "text-purple-600"
            )} />
          </div>
          <h3 className="font-medium">{title}</h3>
        </div>
        
        <div className="flex justify-between items-end mt-2">
          <div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-right">
            <Badge variant="outline" className={cn(
              "rounded-md",
              change > 0 && "bg-green-50 text-green-700 border-green-200",
              change < 0 && "bg-red-50 text-red-700 border-red-200"
            )}>
              {change > 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {Math.abs(change)}%
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">{percentage}% of total</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Sample data
const recentActivity = [
  {
    id: "act1",
    type: "redemption",
    customer: {
      name: "Sarah Johnson",
      id: "cust123"
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    details: "Redeemed Free Coffee reward",
    points: 100
  },
  {
    id: "act2",
    type: "purchase",
    customer: {
      name: "Michael Chen",
      id: "cust456"
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    details: "Purchased 3 items",
    amount: 32.50,
    points: 33
  },
  {
    id: "act3",
    type: "signup",
    customer: {
      name: "Emma Wilson",
      id: "cust789"
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    details: "Joined loyalty program"
  },
  {
    id: "act4",
    type: "purchase",
    customer: {
      name: "David Rodriguez",
      id: "cust101"
    },
    timestamp: new Date(Date.now() - 1000 * 60 * 240),
    details: "Purchased 2 items",
    amount: 18.75,
    points: 19
  }
]

const popularRewards = [
  {
    id: "rew1",
    name: "Free Coffee",
    redemptionCount: 342,
    pointsCost: 100,
    type: "item",
    conversionRate: 0.78
  },
  {
    id: "rew2",
    name: "10% Off Next Purchase",
    redemptionCount: 215,
    pointsCost: 200,
    type: "discount",
    conversionRate: 0.65
  },
  {
    id: "rew3",
    name: "Buy 10 Get 1 Free",
    redemptionCount: 187,
    pointsCost: 0,
    type: "program",
    conversionRate: 0.92
  }
]

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
      // Check if we have code and state parameters
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const errorParam = searchParams.get('error')
      
      console.log('OAuth callback received:', { code, state, error: errorParam })
      
      // Get the stored state and merchant ID from localStorage
      const storedState = localStorage.getItem('lightspeed_state')
      const merchantId = localStorage.getItem('merchant_id')
      
      console.log('Stored values:', { storedState, merchantId })
      
      // Clear the localStorage items
      localStorage.removeItem('lightspeed_state')
      localStorage.removeItem('merchant_id')
      
      // Check if there was an error or if the state doesn't match
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
        
        // Exchange the authorization code for an access token
        const tokenResponse = await fetch('/api/lightspeed/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            code,
            merchantId
          }),
        })
        
        const responseData = await tokenResponse.json()
        
        if (!tokenResponse.ok) {
          throw new Error(responseData.error || 'Failed to exchange code for token')
        }
        
        setStatus("Storing integration data...")
        
        // Store the integration data in Firestore
        await setDoc(doc(db, 'merchants', merchantId, 'integrations', 'lightspeed'), {
          connected: true,
          accessToken: responseData.access_token,
          refreshToken: responseData.refresh_token,
          expiresAt: new Date(Date.now() + responseData.expires_in * 1000),
          scope: responseData.scope,
          connectedAt: new Date()
        })
        
        setStatus("Successfully connected to Lightspeed!")
        toast({
          title: "Connection Successful",
          description: "Your Lightspeed account has been connected successfully.",
        })
        
        // Redirect back to the integrations page
        setTimeout(() => router.push('/integrations'), 2000)
      } catch (error) {
        console.error("Error during Lightspeed OAuth flow:", error)
        const errorMessage = error instanceof Error ? error.message : String(error)
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
    
    // Only run the callback handler if we have URL parameters
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