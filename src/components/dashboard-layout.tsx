"use client"

import { SideNav } from "@/components/side-nav"
import { usePathname } from "next/navigation"
import { Bell, Search, Command, FileText, Check, X, ChevronDown, Sparkles, Award, Gift, PlusCircle, Image, MessageSquare, Zap, ShoppingCart, Coffee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
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
import { SendBroadcastDialog } from "@/components/send-broadcast-dialog"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"

interface Notification {
  id: string
  title: string
  description: string
  timestamp: Date
  read: boolean
  type: "info" | "success" | "warning" | "error"
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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
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
  
  useEffect(() => {
    // Check if current path is onboarding
    setIsOnboarding(pathname?.includes('/onboarding') || false)
    
    // Mock notifications data
    const mockNotifications: Notification[] = [
      {
        id: "1",
        title: "New customer sign up",
        description: "Emma Wilson just joined your loyalty program",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        read: false,
        type: "info"
      },
      {
        id: "2",
        title: "Reward redeemed",
        description: "Free Coffee reward was redeemed 5 times today",
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        read: false,
        type: "success"
      },
      {
        id: "3",
        title: "Points rule update",
        description: "Your 'Purchase Points' rule was automatically updated",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        read: true,
        type: "warning"
      },
      {
        id: "4",
        title: "Integration connected",
        description: "Your POS system was successfully connected",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
        read: true,
        type: "success"
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

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
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
      case "success":
        return <Check className="h-4 w-4 text-green-500" />
      case "warning":
        return <Bell className="h-4 w-4 text-amber-500" />
      case "error":
        return <X className="h-4 w-4 text-red-500" />
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

  if (!pathname) {
    return null; // or a loading state
  }

  // Special layout for onboarding pages
  if (isOnboarding) {
    return (
      <div className="flex h-screen overflow-hidden">
        {/* Left sidebar for progress steps */}
        <div className="w-72 border-r border-gray-100 bg-white p-6">
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
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    )
  }

  // Regular layout for non-onboarding pages
  return (
    <div className="flex h-screen overflow-hidden">
      <SideNav />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-6">
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
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Add the metrics here */}
            {!isOnboarding && (
              <div className="flex items-center gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 h-9 bg-blue-50 rounded-md border border-blue-100 cursor-default">
                        <ShoppingCart className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                        <div className="flex items-center">
                          <p className="text-xs font-medium text-gray-500 mr-1.5">Transactions:</p>
                          <p className="text-sm font-semibold text-blue-700">
                            {metricsLoading ? "..." : metrics.totalTransactions}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Today</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 h-9 bg-purple-50 rounded-md border border-purple-100 cursor-default">
                        <Gift className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                        <div className="flex items-center">
                          <p className="text-xs font-medium text-gray-500 mr-1.5">Redemptions:</p>
                          <p className="text-sm font-semibold text-purple-700">
                            {metricsLoading ? "..." : metrics.totalRedemptions}
                          </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Today</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-8 pr-10 h-9 w-full cursor-pointer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => {
                  e.preventDefault()
                  // Simulate Command+K keypress
                  const event = new KeyboardEvent('keydown', {
                    key: 'k',
                    metaKey: true,
                    bubbles: true
                  })
                  document.dispatchEvent(event)
                }}
                readOnly // Make it read-only since we're using it as a button
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                <Command className="h-3 w-3" />
                K
              </div>
            </div>
            
            <div className="flex items-center gap-2">
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
              <DropdownMenuContent align="end" className="w-80 rounded-md">
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
                  {notifications.length === 0 ? (
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
                              <h4 className="text-sm font-medium">{notification.title}</h4>
                              <p className="text-xs text-muted-foreground">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.description}
                            </p>
                            {!notification.read && (
                              <Badge className="mt-2 rounded-md bg-blue-50 text-blue-700 border-blue-200">
                                New
                              </Badge>
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Add the dialogs */}
      <CreateBannerDialog 
        open={showBannerDialog} 
        onOpenChange={setShowBannerDialog}
      />
      <CreateRewardDialog 
        open={showRewardDialog} 
        onOpenChange={setShowRewardDialog}
      />
      <SendBroadcastDialog 
        open={showBroadcastDialog} 
        onOpenChange={setShowBroadcastDialog}
      />
      <CreatePointsRuleDialog 
        open={showPointsRuleDialog} 
        onOpenChange={setShowPointsRuleDialog}
      />
      <CreateRecurringRewardDialog
        open={showRecurringRewardDialog}
        onOpenChange={setShowRecurringRewardDialog}
      />
    </div>
  )
} 