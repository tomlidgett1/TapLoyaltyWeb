"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, getDoc, doc as firestoreDoc, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { 
  Gift, 
  Search, 
  User, 
  Clock, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle, 
  Users, 
  Zap, 
  DollarSign,
  BarChart3,
  Calendar,
  Percent,
  Package,
  ShoppingBag,
  Award,
  Coffee,
  Tag,
  ShoppingCart,
  Brain,
  TrendingUp,
  Banknote,
  Repeat,
  Star,
  Megaphone,
  Bell,
  Activity,
  RefreshCw,
  Crown,
  Target,
  MessageSquare,
  CheckCircle2,
  X,
  HelpCircle,
  Image,
  Eye,
  MousePointerClick
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Format date helper function (global scope)
const formatDate = (timestamp: any) => {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

// Format time ago helper function (global scope)
const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return '';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown time';
  }
};

// Calculate customer score based on RFM model
const calculateCustomerScore = (customer: Customer) => {
  if (!customer) return 0;
  
  // Calculate recency score (0-5)
  // Lower days since last visit is better
  const recencyScore = customer.daysSinceLastVisit <= 7 ? 5 :
                      customer.daysSinceLastVisit <= 14 ? 4 :
                      customer.daysSinceLastVisit <= 30 ? 3 :
                      customer.daysSinceLastVisit <= 60 ? 2 :
                      customer.daysSinceLastVisit <= 90 ? 1 : 0;
  
  // Calculate frequency score (0-5)
  // Higher transaction count is better
  const frequencyScore = customer.lifetimeTransactionCount >= 20 ? 5 :
                        customer.lifetimeTransactionCount >= 10 ? 4 :
                        customer.lifetimeTransactionCount >= 5 ? 3 :
                        customer.lifetimeTransactionCount >= 3 ? 2 :
                        customer.lifetimeTransactionCount >= 1 ? 1 : 0;
                        
  // Calculate monetary score (0-5)
  // Higher lifetime spend is better
  const monetaryScore = customer.totalLifetimeSpend >= 500 ? 5 :
                       customer.totalLifetimeSpend >= 300 ? 4 :
                       customer.totalLifetimeSpend >= 200 ? 3 :
                       customer.totalLifetimeSpend >= 100 ? 2 :
                       customer.totalLifetimeSpend >= 50 ? 1 : 0;
  
  // Calculate weighted score - recency is most important
  const weightedScore = (recencyScore * 0.45) + (frequencyScore * 0.30) + (monetaryScore * 0.25);
  
  // Return score on scale of 1-10, rounded
  return Math.max(1, Math.round(weightedScore * 2));
};

// MetricCard component for displaying customer metrics
interface MetricCardProps {
  icon: React.ReactNode;
  value: string;
  label: string;
}

function MetricCard({ icon, value, label }: MetricCardProps) {
  return (
    <Card className="rounded-md bg-gray-50 border">
      <CardContent className="px-4 py-3 flex flex-col justify-center items-center text-center">
        <div className="mb-1">{icon}</div>
        <div className="font-medium">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </CardContent>
    </Card>
  );
}

interface RewardActivity {
  id: string;
  rewardName: string;
  rewardSummary: string;
  rewardType: string;
  pointsCost: number;
  merchantId: string;
  reasoning?: string;
  rewardReason?: string;
  expiryDate?: any;
  createdAt?: any;
  estrewardcost?: number;
  // Keep these for backward compatibility
  description?: string;
  type?: string;
  isActive?: boolean;
  hasBeenRedeemedByThisCustomer?: boolean;
  reason?: string;
}

interface BannerActivity {
  id: string;
  title: string;
  description: string;
  color: string;
  secondaryColor?: string;
  style: string;
  isActive: boolean;
  createdAt: any;
  expiresAt?: any;
  bannerAction?: string;
  buttonText?: string;
  merchantId?: string;
  merchantName?: string;
  type?: string;
  message?: string;
  // Keep these for backward compatibility
  bannerId?: string;
}

interface WeeklyAgentActivity {
  weekId: string;
  runDate?: string | Date;
  timestamp?: any;
  merchantId?: string;
  customerId?: string;
  customerName?: string;
  cohort?: string;
  segments?: string[];
  rewards?: RewardActivity[];
  banners?: BannerActivity[];
  rewardsCount?: number;
  bannersCount?: number;
  pushNotifications?: PushNotificationActivity[];
  createdAt?: any;
}

interface Customer {
  customerId: string
  fullName: string
  pointsBalance: number
  lifetimeTransactionCount: number
  totalLifetimeSpend: number
  lastTransactionDate: any
  firstTransactionDate: any
  daysSinceFirstPurchase: number
  daysSinceLastVisit: number
  highestTransactionAmount: number
  membershipTier: string | null
  redemptionCount: number | null
  profileData?: {
    profilePictureUrl?: string
    shareProfileWithMerchants?: boolean
  }
  // Fields for the agent-specific view
  cohort?: string
  agentRewards?: AgentReward[]
  recentBehavior?: string
  // New fields for cohort tracking
  cohortHistory?: Array<{
    days: number
    name: string
    since: any
  }>
  cohortViewCount?: number
  currentCohort?: {
    daysInCohort: number
    name: string
    since: any
  }
  // Add profiles data
  customerProfiles?: Array<{
    profileId: string
    merchantId: string
    createdAt: any
    profileDescription: string
  }>
  // Weekly agent activities
  weeklyAgentActivities?: WeeklyAgentActivity[]
}

interface AgentReward {
  id: string
  rewardName: string
  description: string
  type: string
  pointsCost: number
  status: string
  createdAt: any
  generationReason: string
  reason?: string
  reasoning?: string
  merchantId?: string
  basedOn: string[] 
  isRedeemed: boolean
  redeemedDate?: any
}

// Helper function to get appropriate icon for reward type
const getRewardTypeIcon = (type: string) => {
  switch (type?.toLowerCase()) {
    case 'percentage':
    case 'percentagediscount':
      return <Percent className="h-4 w-4 text-purple-600" />;
    case 'fixed':
    case 'fixeddiscount':
      return <Tag className="h-4 w-4 text-indigo-600" />;
    case 'freeitem':
      return <Gift className="h-4 w-4 text-pink-600" />;
    case 'buyxgety':
      return <ShoppingBag className="h-4 w-4 text-orange-600" />;
    case 'mystery':
    case 'mysterygift':
      return <Package className="h-4 w-4 text-amber-600" />;
    case 'coffee':
      return <Coffee className="h-4 w-4 text-blue-600" />;
    default:
      return <Award className="h-4 w-4 text-blue-600" />;
  }
};

export function CustomersList() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false)
  const [hoveredCustomerId, setHoveredCustomerId] = useState<string | null>(null)
  const [customerProfiles, setCustomerProfiles] = useState<any[]>([])
  const [customerRewards, setCustomerRewards] = useState<any[]>([])
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([])
  const [customerRedemptions, setCustomerRedemptions] = useState<any[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [weeklyAgentActivities, setWeeklyAgentActivities] = useState<WeeklyAgentActivity[]>([])
  const [loadingAgentActivities, setLoadingAgentActivities] = useState(false)

  // Update search handler
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)
    
    if (query.trim() === "") {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer => 
        customer.fullName.toLowerCase().includes(query) ||
        customer.cohort?.toLowerCase().includes(query) ||
        customer.currentCohort?.name?.toLowerCase().includes(query) ||
        customer.membershipTier?.toLowerCase().includes(query)
      )
      setFilteredCustomers(filtered)
    }
  }, [customers])

  // Reset search when customers data changes
  useEffect(() => {
    setFilteredCustomers(customers)
  }, [customers])

  // Fetch customers data
  useEffect(() => {
    async function fetchCustomers() {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      
      try {
        // Step 1: Fetch merchant-specific customer data
        const merchantCustomersRef = collection(db, 'merchants', user.uid, 'customers')
        const merchantCustomersSnap = await getDocs(merchantCustomersRef)
        
        if (merchantCustomersSnap.empty) {
          setLoading(false)
          return
        }
        
        // Step 2: Create an array of promises to fetch each customer's data and profiles
        const customerPromises = merchantCustomersSnap.docs.map(async (doc) => {
          const merchantCustomerData = doc.data()
          const customerId = doc.id
          
          // Step 3: Fetch additional customer data from top-level customers collection
          const customerProfileRef = firestoreDoc(db, 'customers', customerId)
          const customerProfileSnap = await getDoc(customerProfileRef)
          const profileData = customerProfileSnap.exists() ? customerProfileSnap.data() : {}
          
          // Step 4: Fetch customer AI profiles
          const profilesRef = collection(db, 'customers', customerId, 'profiles')
          const profilesSnap = await getDocs(profilesRef)
          
          // Filter profiles for this merchant and sort by creation date
          const profilesData = profilesSnap.docs
            .map(profileDoc => {
              const profileData = profileDoc.data()
              return {
                profileId: profileDoc.id,
                merchantId: profileData.merchantId || '',
                createdAt: profileData.createdAt || null,
                profileDescription: profileData.profileDescription || ''
              }
            })
            .filter(profile => profile.merchantId === user.uid)
            .sort((a, b) => {
              const dateA = a.createdAt ? (a.createdAt.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime()) : 0
              const dateB = b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime()) : 0
              return dateB - dateA
            })
          
          // Step 5: Fetch customer agent rewards
          const rewardsRef = collection(db, 'customers', customerId, 'rewards')
          const rewardsQuery = query(rewardsRef, where('merchantId', '==', user.uid))
          const rewardsSnap = await getDocs(rewardsQuery)
          
          // Map rewards data
          const agentRewards = rewardsSnap.docs.map(rewardDoc => {
            const rewardData = rewardDoc.data()
            return {
              id: rewardDoc.id,
              rewardName: rewardData.rewardName || 'Unnamed Reward',
              description: rewardData.description || '',
              type: rewardData.type || 'unknown',
              pointsCost: rewardData.pointsCost || 0,
              status: rewardData.status || 'active',
              createdAt: rewardData.createdAt || null,
              generationReason: rewardData.generationReason || '',
              reason: rewardData.reason || '',
              reasoning: rewardData.reasoning || '',
              merchantId: rewardData.merchantId,
              basedOn: rewardData.basedOn || [],
              isRedeemed: rewardData.isRedeemed || false,
              redeemedDate: rewardData.redeemedDate || null
            }
          })
          
          // Build the customer object by merging merchant-specific metrics with profile data
          const customer: Customer = {
            customerId,
            fullName: profileData.fullName || merchantCustomerData.fullName || 'Unknown',
            pointsBalance: merchantCustomerData.pointsBalance || 0,
            membershipTier: merchantCustomerData.membershipTier || '',
            lifetimeTransactionCount: merchantCustomerData.lifetimeTransactionCount || 0,
            totalLifetimeSpend: merchantCustomerData.totalLifetimeSpend || 0,
            daysSinceLastVisit: merchantCustomerData.daysSinceLastVisit || 0,
            daysSinceFirstPurchase: merchantCustomerData.daysSinceFirstPurchase || 0,
            redemptionCount: merchantCustomerData.redemptionCount || 0,
            firstTransactionDate: merchantCustomerData.firstTransactionDate || null,
            lastTransactionDate: merchantCustomerData.lastTransactionDate || null,
            highestTransactionAmount: merchantCustomerData.highestTransactionAmount || 0,
            currentCohort: merchantCustomerData.currentCohort || null,
            cohort: merchantCustomerData.cohort || determineCustomerCohort(
              merchantCustomerData.daysSinceLastVisit || 0,
              merchantCustomerData.lifetimeTransactionCount || 0,
              merchantCustomerData.daysSinceFirstPurchase || 0
            ),
            customerProfiles: profilesData,
            agentRewards: agentRewards.length > 0 ? agentRewards : mockAgentRewards(
              merchantCustomerData.daysSinceLastVisit || 0,
              merchantCustomerData.lifetimeTransactionCount || 0
            ),
            recentBehavior: merchantCustomerData.recentBehavior || generateBehaviorSummary({
              daysSinceLastVisit: merchantCustomerData.daysSinceLastVisit || 0,
              lifetimeTransactionCount: merchantCustomerData.lifetimeTransactionCount || 0,
              daysSinceFirstPurchase: merchantCustomerData.daysSinceFirstPurchase || 0,
              highestTransactionAmount: merchantCustomerData.highestTransactionAmount || 0
            }),
            // Add profile data for avatar, etc.
            profileData: {
              profilePictureUrl: profileData.profilePictureUrl,
              shareProfileWithMerchants: profileData.shareProfileWithMerchants
            }
          }
          
          return customer
        })
        
        // Wait for all customer data to be fetched
        const customersData = await Promise.all(customerPromises)
        
        // Set customers data state
        setCustomers(customersData)
        setFilteredCustomers(customersData)

        // Set mock transaction and redemption data
        const mockTransactions = [
          {
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            items: [{ name: 'Cappuccino' }, { name: 'Croissant' }],
            amount: 15.75,
            pointsEarned: 16
          },
          {
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            items: [{ name: 'Latte' }, { name: 'Blueberry Muffin' }],
            amount: 12.50,
            pointsEarned: 13
          },
          {
            timestamp: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000),
            items: [{ name: 'Cold Brew Coffee' }],
            amount: 5.95,
            pointsEarned: 6
          }
        ];
        
        const mockRedemptions = [
          {
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            rewardName: 'Free Coffee',
            status: 'completed',
            pointsCost: 100
          },
          {
            timestamp: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            rewardName: '10% Off Next Purchase',
            status: 'completed',
            pointsCost: 50
          }
        ];
        
        setCustomerTransactions(mockTransactions);
        setCustomerRedemptions(mockRedemptions);
      } catch (error) {
        console.error('Error fetching customers:', error)
        setCustomers([])
        setFilteredCustomers([])
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomers()
  }, [user?.uid])

  // Helper function to determine customer cohort
  function determineCustomerCohort(daysSinceLastVisit: number, transactionCount: number, daysSinceFirstPurchase: number): string {
    if (transactionCount <= 2 && daysSinceFirstPurchase <= 30) {
      return "New"
    } else if (daysSinceLastVisit <= 30) {
      return "Active"
    } else if (daysSinceLastVisit > 30 && daysSinceLastVisit <= 90) {
      return "Dormant"
    } else if (daysSinceLastVisit > 90) {
      return "Churned"
    } else {
      return "Unknown"
    }
  }

  // Helper function to generate behavior summary
  function generateBehaviorSummary(customerData: any): string {
    if (customerData.daysSinceLastVisit <= 7 && customerData.lifetimeTransactionCount > 5) {
      return "Frequent visitor, typically visits every week"
    } else if (customerData.daysSinceLastVisit <= 30 && customerData.lifetimeTransactionCount > 10) {
      return "Regular customer, consistent spending patterns"
    } else if (customerData.daysSinceLastVisit > 60 && customerData.lifetimeTransactionCount > 0) {
      return "Declining engagement, was previously active"
    } else if (customerData.daysSinceFirstPurchase <= 14 && customerData.lifetimeTransactionCount <= 2) {
      return "New customer, still exploring offerings"
    } else if (customerData.highestTransactionAmount > 100) {
      return "High-value customer, occasional large purchases"
    } else {
      return "Moderate engagement, irregular visit pattern"
    }
  }

  // Helper function to mock agent rewards
  function mockAgentRewards(daysSinceLastVisit: number, transactionCount: number): AgentReward[] {
    const rewards: AgentReward[] = []

    // For a new or active customer
    if (daysSinceLastVisit <= 30 || transactionCount <= 2) {
      rewards.push({
        id: `reward-${Math.random().toString(36).substring(7)}`,
        rewardName: "First Time Welcome Discount",
        description: "25% off your next purchase as a welcome gift",
        type: "percentageDiscount",
        pointsCost: 0,
        status: "active",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        generationReason: "New customer acquisition",
        basedOn: ["First visit", "Customer cohort: New"],
        isRedeemed: false
      })
    }

    // For loyal customers
    if (transactionCount > 10) {
      rewards.push({
        id: `reward-${Math.random().toString(36).substring(7)}`,
        rewardName: "Loyalty Appreciation",
        description: "Free item with purchase over $30",
        type: "freeItem",
        pointsCost: 200,
        status: "active",
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        generationReason: "Customer retention and appreciation",
        basedOn: ["Transaction count > 10", "Customer cohort: Active"],
        isRedeemed: Math.random() > 0.5,
        redeemedDate: Math.random() > 0.5 ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : undefined
      })
    }

    // For dormant customers
    if (daysSinceLastVisit > 30 && daysSinceLastVisit <= 90) {
      rewards.push({
        id: `reward-${Math.random().toString(36).substring(7)}`,
        rewardName: "We Miss You - Special Offer",
        description: "$10 off your next purchase",
        type: "fixedDiscount",
        pointsCost: 0,
        status: "active",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        generationReason: "Re-engagement of dormant customer",
        basedOn: ["Days since last visit > 30", "Customer cohort: Dormant"],
        isRedeemed: false
      })
    }

    // For churned customers
    if (daysSinceLastVisit > 90) {
      rewards.push({
        id: `reward-${Math.random().toString(36).substring(7)}`,
        rewardName: "Comeback Special",
        description: "50% off your next purchase when you come back",
        type: "percentageDiscount",
        pointsCost: 0,
        status: "active",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        generationReason: "Attempt to recover churned customer",
        basedOn: ["Days since last visit > 90", "Customer cohort: Churned"],
        isRedeemed: false
      })
    }

    return rewards
  }

  // Function to get cohort badge style
  const getCohortBadgeStyle = (cohort: string | undefined) => {
    switch (cohort?.toLowerCase()) {
      case 'new':
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case 'active':
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case 'dormant':
        return "bg-amber-100 text-amber-800 hover:bg-amber-200"
      case 'churned':
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // Helper function to open customer details in sheet
  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsCustomerSheetOpen(true)
  }

  if (loading) {
    return (
      <div className="py-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-[180px]" />
          <Skeleton className="h-10 w-[250px]" />
        </div>
        <div className="grid grid-cols-4 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    )
  }

  return (
        <>
          {/* Header with search */}
      <div className="pb-3 pt-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Customers</h1>
          <div className="w-full max-w-xs relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
              className="pl-8 h-9"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>
          </div>

      {/* Customers table */}
      <div className="pb-6">
        <div className="rounded-md overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[250px]">Customer</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Spend</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {searchQuery ? (
                        <div className="flex flex-col items-center justify-center py-4">
                          <Users className="h-10 w-10 text-gray-300 mb-2" />
                          <p className="text-sm text-muted-foreground">No customers found matching your search.</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <Users className="h-10 w-10 text-gray-300 mb-2" />
                          <p className="text-sm text-muted-foreground">No customers found.</p>
                          <p className="text-xs text-muted-foreground mt-1">Customers will appear here once they interact with your store.</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map(customer => (
                    <TableRow 
                      key={customer.customerId} 
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredCustomerId(customer.customerId)}
                      onMouseLeave={() => setHoveredCustomerId(null)}
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-full border bg-gray-50">
                            {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                              <AvatarImage 
                                src={customer.profileData.profilePictureUrl} 
                                alt={customer.fullName} 
                              />
                            ) : (
                              <AvatarFallback className="bg-blue-50 text-blue-500">
                                {customer.fullName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium">{customer.fullName}</div>
                            <div className="text-xs text-muted-foreground">
                              {customer.customerProfiles && customer.customerProfiles.length > 0 ? (
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle className="h-3 w-3" />
                                  Profiled
                                </span>
                              ) : (
                                <span className="text-gray-400">No profile</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CohortBadge cohort={customer.currentCohort?.name || customer.cohort} />
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">${customer.totalLifetimeSpend}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{customer.pointsBalance}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {customer.lastTransactionDate ? formatTimeAgo(customer.lastTransactionDate) : 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className={`h-8 w-8 rounded-md ${hoveredCustomerId === customer.customerId ? 'opacity-100' : 'opacity-0'}`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Customer Details Sheet */}
      <Sheet open={isCustomerSheetOpen} onOpenChange={setIsCustomerSheetOpen}>
        <SheetContent className="sm:max-w-lg w-full border-l overflow-y-auto p-0">
          {selectedCustomer && (
            <div className="flex flex-col h-full">
              <SheetHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-full border bg-gray-50">
                      {selectedCustomer.profileData?.shareProfileWithMerchants && selectedCustomer.profileData?.profilePictureUrl ? (
                        <AvatarImage 
                          src={selectedCustomer.profileData.profilePictureUrl} 
                          alt={selectedCustomer.fullName} 
                        />
                      ) : (
                        <AvatarFallback className="bg-blue-50 text-blue-500 text-xl">
                          {selectedCustomer.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <SheetTitle className="text-xl font-semibold tracking-tight text-left">
                        {selectedCustomer.fullName}
                      </SheetTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <CohortBadge cohort={selectedCustomer.currentCohort?.name || selectedCustomer.cohort} />
                        {selectedCustomer.membershipTier && (
                          <Badge variant="outline" className="bg-slate-50 text-slate-700">
                            {selectedCustomer.membershipTier}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <SheetClose className="rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-gray-100">
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </SheetClose>
                </div>
              </SheetHeader>

              <Tabs defaultValue="overview" className="flex-grow flex flex-col">
                <div className="px-6 pt-4 pb-2 border-b">
                  <TabsList className="border border-[#E2E4E8] p-0.5 bg-[#F6F6F7] rounded-md">
                    <TabsTrigger 
                      value="overview"
                      className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
                    >
                      Overview
                    </TabsTrigger>
                    <TabsTrigger 
                      value="transactions"
                      className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
                    >
                      Transactions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="redemptions"
                      className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
                    >
                      Redemptions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="agent"
                      className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-transparent data-[state=active]:bg-clip-text data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500 transition-all duration-150 ease-in-out"
                    >
                      Agent
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <ScrollArea className="flex-grow">
                  <TabsContent value="overview" className="pt-4 pb-20 px-6 data-[state=active]:block">
                    {/* Customer Score Section */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">Customer Value Score</h3>
                      <div className="rounded-md border p-4 bg-gray-50">
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="font-medium">RFM Score</p>
                            <p className="text-sm text-gray-500">Based on recency, frequency & monetary value</p>
                          </div>
                          <div className="text-2xl font-bold">{calculateCustomerScore(selectedCustomer)}/10</div>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Recency</span>
                              <span className="font-medium">
                                {selectedCustomer.daysSinceLastVisit < 7 ? 'Excellent' : 
                                 selectedCustomer.daysSinceLastVisit < 30 ? 'Good' : 
                                 selectedCustomer.daysSinceLastVisit < 90 ? 'Average' : 'Poor'}
                              </span>
                            </div>
                            <Progress 
                              value={Math.max(0, 100 - (selectedCustomer.daysSinceLastVisit / 90 * 100))} 
                              className="h-2 rounded-sm" 
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Frequency</span>
                              <span className="font-medium">
                                {selectedCustomer.lifetimeTransactionCount > 10 ? 'Excellent' : 
                                 selectedCustomer.lifetimeTransactionCount > 5 ? 'Good' : 
                                 selectedCustomer.lifetimeTransactionCount > 2 ? 'Average' : 'Poor'}
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(100, selectedCustomer.lifetimeTransactionCount * 10)} 
                              className="h-2 rounded-sm" 
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Monetary</span>
                              <span className="font-medium">
                                {selectedCustomer.totalLifetimeSpend > 300 ? 'Excellent' : 
                                 selectedCustomer.totalLifetimeSpend > 150 ? 'Good' : 
                                 selectedCustomer.totalLifetimeSpend > 50 ? 'Average' : 'Poor'}
                              </span>
                            </div>
                            <Progress 
                              value={Math.min(100, selectedCustomer.totalLifetimeSpend / 3)} 
                              className="h-2 rounded-sm" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Customer Metrics Grid */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3">Customer Metrics</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <MetricCard 
                          icon={<Clock className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.daysSinceLastVisit.toString()}
                          label="Days Since Visit"
                        />
                        <MetricCard 
                          icon={<Calendar className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.daysSinceFirstPurchase.toString()}
                          label="Days as Customer"
                        />
                        <MetricCard 
                          icon={<DollarSign className="h-4 w-4 text-blue-500" />}
                          value={`$${(selectedCustomer.totalLifetimeSpend / selectedCustomer.lifetimeTransactionCount || 0).toFixed(2)}`}
                          label="Average Order Value"
                        />
                        <MetricCard 
                          icon={<Repeat className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.lifetimeTransactionCount.toString()}
                          label="Total Transactions"
                        />
                        <MetricCard 
                          icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
                          value={`$${selectedCustomer.highestTransactionAmount.toFixed(2)}`}
                          label="Highest Transaction"
                        />
                        <MetricCard 
                          icon={<Star className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.membershipTier || "None"}
                          label="Membership Tier"
                        />
                        <MetricCard 
                          icon={<Banknote className="h-4 w-4 text-blue-500" />}
                          value={`$${selectedCustomer.totalLifetimeSpend.toFixed(2)}`}
                          label="Lifetime Spend"
                        />
                        <MetricCard 
                          icon={<Tag className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.pointsBalance.toString()}
                          label="Points Balance"
                        />
                        <MetricCard 
                          icon={<Gift className="h-4 w-4 text-blue-500" />}
                          value={selectedCustomer.redemptionCount?.toString() || "0"}
                          label="Redemptions"
                        />
                      </div>
                    </div>

                    {/* Customer Profiles */}
                    <div>
                      <h3 className="text-sm font-medium mb-3">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500">Tap Agent</span> Profile
                      </h3>
                      {selectedCustomer.customerProfiles && selectedCustomer.customerProfiles.length > 0 ? (
                        <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                                    <Brain className="h-4 w-4" />
                                  </div>
                                  <h4 className="font-medium text-sm">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500">Tap Agent</span> Profile
                                  </h4>
                                  {selectedCustomer.customerProfiles[0].createdAt && (
                                    <span className="text-xs text-gray-500">
                                      {formatTimeAgo(selectedCustomer.customerProfiles[0].createdAt)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="mt-2 text-sm">{selectedCustomer.customerProfiles[0].profileDescription}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 border border-dashed rounded">
                          <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No profile information yet</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="transactions" className="pt-4 pb-20 px-6 data-[state=active]:block">
                    <Card className="rounded-md border shadow-none">
                      <CardHeader className="px-4 py-3 border-b bg-gray-50 rounded-t-md">
                        <CardTitle className="text-sm font-medium">Transaction History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {customerTransactions.length > 0 ? (
                          <Table>
                            <TableHeader className="bg-gray-50">
                  <TableRow>
                                <TableHead className="w-[120px] font-medium">Date</TableHead>
                                <TableHead className="font-medium">Items</TableHead>
                                <TableHead className="text-right font-medium">Amount</TableHead>
                                <TableHead className="text-right w-[100px] font-medium">Points</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerTransactions.map((transaction, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-sm py-3">
                                    {transaction.timestamp ? (
                                      <div>
                                        <div>{formatDate(transaction.timestamp)}</div>
                                        <div className="text-xs text-gray-500">{formatTimeAgo(transaction.timestamp)}</div>
                                      </div>
                                    ) : (
                                      'N/A'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm py-3">
                                    {transaction.items ? (
                                      <div>
                                        <div>{transaction.items[0]?.name || 'Unknown item'}</div>
                                        {transaction.items.length > 1 && (
                                          <div className="text-xs text-gray-500">+{transaction.items.length - 1} more items</div>
                        )}
                      </div>
                                    ) : (
                                      'N/A'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right text-sm py-3">
                                    ${transaction.amount.toFixed(2)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm py-3">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded">
                                      +{transaction.pointsEarned || 0}
                                    </Badge>
                    </TableCell>
                  </TableRow>
                              ))}
              </TableBody>
            </Table>
                        ) : (
                          <div className="text-center py-8">
                            <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No transaction history</p>
          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="redemptions" className="pt-4 pb-20 px-6 data-[state=active]:block">
                    <Card className="rounded-md border shadow-none">
                      <CardHeader className="px-4 py-3 border-b bg-gray-50 rounded-t-md">
                        <CardTitle className="text-sm font-medium">Redemption History</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {customerRedemptions.length > 0 ? (
                          <Table>
                            <TableHeader className="bg-gray-50">
                              <TableRow>
                                <TableHead className="w-[120px] font-medium">Date</TableHead>
                                <TableHead className="font-medium">Reward</TableHead>
                                <TableHead className="text-right font-medium">Status</TableHead>
                                <TableHead className="text-right w-[100px] font-medium">Points</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {customerRedemptions.map((redemption, index) => (
                                <TableRow key={index}>
                                  <TableCell className="text-sm py-3">
                                    {redemption.timestamp ? (
                                      <div>
                                        <div>{formatDate(redemption.timestamp)}</div>
                                        <div className="text-xs text-gray-500">{formatTimeAgo(redemption.timestamp)}</div>
          </div>
                                    ) : (
                                      'N/A'
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm py-3">
                                    {redemption.rewardName || 'Unknown reward'}
                                  </TableCell>
                                  <TableCell className="text-right text-sm py-3">
                                    <Badge variant="outline" 
                                      className={`rounded ${
                                        redemption.status === 'completed'
                                          ? 'bg-green-50 text-green-700 border-green-200'
                                          : redemption.status === 'pending'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : 'bg-gray-50 text-gray-700 border-gray-200'
                                      }`}
                                    >
                                      {redemption.status || 'Unknown'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right text-sm py-3">
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded">
                                      -{redemption.pointsCost || 0}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center py-8">
                            <Gift className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">No redemption history</p>
    </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="agent" className="pt-4 pb-20 px-6 data-[state=active]:block">
                    <AgentTab 
                      customer={selectedCustomer} 
                      weeklyAgentActivities={weeklyAgentActivities} 
                      loading={loadingAgentActivities} 
                    />
                  </TabsContent>
                </ScrollArea>
              </Tabs>

              <div className="border-t p-4 flex justify-between mt-auto">
                <Button variant="outline" onClick={() => setIsCustomerSheetOpen(false)}>
                  Close
                </Button>
                <Button>
                  <Gift className="mr-2 h-4 w-4" />
                  Create Reward
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function CustomerDetail({ customer, onBack }: { customer: Customer, onBack: () => void }) {
  const { user } = useAuth()
  const [rewards, setRewards] = useState<any[]>([])
  const [loadingRewards, setLoadingRewards] = useState(false)
  const [customerProfiles, setCustomerProfiles] = useState<any[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [customerTransactions, setCustomerTransactions] = useState<any[]>([])
  const [customerRedemptions, setCustomerRedemptions] = useState<any[]>([])
  const [weeklyAgentActivities, setWeeklyAgentActivities] = useState<WeeklyAgentActivity[]>([])
  const [loadingAgentActivities, setLoadingAgentActivities] = useState(false)
  const [avgSpend, setAvgSpend] = useState(
    customer.totalLifetimeSpend && customer.lifetimeTransactionCount 
      ? (customer.totalLifetimeSpend / customer.lifetimeTransactionCount).toFixed(2) 
      : '0.00'
  )
  const [visitFrequency, setVisitFrequency] = useState(
    customer.daysSinceFirstPurchase && customer.lifetimeTransactionCount && customer.lifetimeTransactionCount > 1
      ? Math.round(customer.daysSinceFirstPurchase / (customer.lifetimeTransactionCount - 1))
      : 0
  )

  // Add useEffect to fetch customer rewards when component mounts
  useEffect(() => {
    async function fetchCustomerRewards() {
      if (!user?.uid || !customer.customerId) return

      try {
        setLoadingRewards(true)
        // Fetch rewards from the customer's rewards subcollection
        const rewardsRef = collection(db, 'customers', customer.customerId, 'rewards')
        const rewardsQuery = query(rewardsRef, where('merchantId', '==', user.uid))
        const rewardsSnap = await getDocs(rewardsQuery)
        
        if (rewardsSnap.empty) {
          setRewards([])
          setLoadingRewards(false)
          return
        }
        
        // Map the rewards data
        const rewardsData = rewardsSnap.docs.map(doc => {
          const data = doc.data()
          return {
              id: doc.id,
            ...data
          }
        })
        
        setRewards(rewardsData)
      } catch (error) {
        console.error('Error fetching customer rewards:', error)
        setRewards([])
      } finally {
        setLoadingRewards(false)
      }
    }
    
    fetchCustomerRewards()
  }, [user?.uid, customer.customerId])

  // Add useEffect to fetch customer profiles when component mounts
  useEffect(() => {
    async function fetchCustomerProfiles() {
      if (!user?.uid || !customer.customerId) return

      try {
        setLoadingProfiles(true)
        // Fetch profiles from the customer's profiles subcollection
        const profilesRef = collection(db, 'customers', customer.customerId, 'profiles')
        const profilesQuery = query(profilesRef, where('merchantId', '==', user.uid))
        const profilesSnap = await getDocs(profilesQuery)
        
        if (profilesSnap.empty) {
          setCustomerProfiles([])
          setLoadingProfiles(false)
          return
        }

        // Map the profiles data
        const profilesData = profilesSnap.docs.map(doc => {
            const data = doc.data()
            return {
              profileId: doc.id,
              merchantId: data.merchantId || '',
              createdAt: data.createdAt || null,
              profileDescription: data.profileDescription || ''
            }
          })
        
        setCustomerProfiles(profilesData)
      } catch (error) {
        console.error('Error fetching customer profiles:', error)
        setCustomerProfiles([])
      } finally {
        setLoadingProfiles(false)
      }
    }
    
    fetchCustomerProfiles()
  }, [user?.uid, customer.customerId])

  // Add useEffect to fetch weekly agent activities
  useEffect(() => {
    async function fetchWeeklyAgentActivities() {
      if (!user?.uid || !customer.customerId) {
        console.log("Missing user ID or customer ID", { userId: user?.uid, customerId: customer.customerId });
        return;
      }
      
      setLoadingAgentActivities(true);
      
      try {
        console.log("Fetching weekly agent activities with path:", {
          merchantId: user.uid,
          customerId: customer.customerId,
          path: `merchants/${user.uid}/customerAgentActivity/${customer.customerId}/weeks`
        });
        
        // Try direct fetch of the example document
        try {
          // Example path: /merchants/fxOAb7aPMXPVRPjOvyqaeevydnZ2/customerAgentActivity/ZU6nlhrznNgyR3E3OvBOiMXgXur2/weeks/2025-05-05
          const exampleDocRef = firestoreDoc(db, 'merchants', 'fxOAb7aPMXPVRPjOvyqaeevydnZ2', 'customerAgentActivity', 'ZU6nlhrznNgyR3E3OvBOiMXgXur2', 'weeks', '2025-05-05');
          const exampleDocSnap = await getDoc(exampleDocRef);
          
          console.log("Example document check:", {
            exists: exampleDocSnap.exists(),
            data: exampleDocSnap.exists() ? exampleDocSnap.data() : null
          });
        } catch (exampleError) {
          console.error("Error fetching example document:", exampleError);
        }
        
        // Fetch weekly agent activities from the new Firestore path: merchants/{merchantId}/customerAgentActivity/{customerId}/weeks
        const weeklyActivitiesRef = collection(db, 'merchants', user.uid, 'customerAgentActivity', customer.customerId, 'weeks');
        const weeklyActivitiesSnap = await getDocs(weeklyActivitiesRef);
        
        console.log("Weekly activities query result:", {
          empty: weeklyActivitiesSnap.empty,
          size: weeklyActivitiesSnap.size,
          docs: weeklyActivitiesSnap.docs.map(doc => doc.id)
        });
        
        if (weeklyActivitiesSnap.empty) {
          console.log("No weekly activities found");
          setWeeklyAgentActivities([]);
          setLoadingAgentActivities(false);
          return;
        }
        
        // Map the weekly activities data
        const activitiesData = weeklyActivitiesSnap.docs.map(doc => {
          const data = doc.data();
          console.log(`Data for week ${doc.id}:`, data);
          return {
            weekId: doc.id,
            ...data
          } as WeeklyAgentActivity;
        }).sort((a, b) => {
          // Sort by weekId in descending order (most recent first)
          return b.weekId.localeCompare(a.weekId);
        });
        
        console.log("Weekly agent activities processed:", activitiesData);
        setWeeklyAgentActivities(activitiesData);
      } catch (error) {
        console.error('Error fetching weekly agent activities:', error);
        setWeeklyAgentActivities([]);
      } finally {
        setLoadingAgentActivities(false);
      }
    }
    
    fetchWeeklyAgentActivities();
  }, [user?.uid, customer.customerId]);

  // Calculate customer statistics
  const daysActive = customer.daysSinceFirstPurchase || 0

  // Get the most recent profile that matches this merchant
  const latestProfile = customerProfiles.length > 0 ? customerProfiles[0] : null

  return (
    <div className="space-y-8">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button 
          onClick={onBack}
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md border-[#E2E4E8] hover:bg-[#F0F2F4] text-[#6B7280] transition-all duration-150 ease-in-out active:scale-[0.98]"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Avatar className="h-10 w-10 rounded-full border bg-gray-50">
          {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
            <AvatarImage 
              src={customer.profileData.profilePictureUrl} 
              alt={customer.fullName} 
            />
          ) : (
            <AvatarFallback className="bg-blue-50 text-blue-500">
              {customer.fullName.charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        
        <h2 className="text-xl font-semibold text-[#111827]">{customer.fullName}</h2>
        <CohortBadge cohort={customer.currentCohort?.name || customer.cohort} />
        {customer.membershipTier && (
          <Badge variant="outline" className="rounded-md border-[#E2E4E8] text-[#6B7280] font-normal">
            {customer.membershipTier}
          </Badge>
        )}
        <span className="text-sm text-[#6B7280] ml-auto">
          Customer since {formatDate(customer.firstTransactionDate)}
        </span>
      </div>

      {/* OpenAI-style tabs */}
      <Tabs 
        defaultValue="overview" 
        className="mt-4"
      >
        <TabsList className="border border-[#E2E4E8] p-0.5 bg-[#F6F6F7] rounded-md mb-6">
          <TabsTrigger 
            value="overview"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="transactions"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
          >
            Transactions
          </TabsTrigger>
          <TabsTrigger 
            value="redemptions"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
          >
            Redemptions
          </TabsTrigger>
          <TabsTrigger 
            value="agent"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-transparent data-[state=active]:bg-clip-text data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-orange-500 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500 transition-all duration-150 ease-in-out"
          >
            Agent
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-grow">
          {/* Overview Tab */}
          <TabsContent value="overview" className="pt-4 pb-20 px-6 data-[state=active]:block">
            {/* Customer Score Section */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Customer Value Score</h3>
              <div className="rounded-md border p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <p className="font-medium">RFM Score</p>
                    <p className="text-sm text-gray-500">Based on recency, frequency & monetary value</p>
                  </div>
                  <div className="text-2xl font-bold">{calculateCustomerScore(customer)}/10</div>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Recency</span>
                      <span className="font-medium">
                        {customer.daysSinceLastVisit < 7 ? 'Excellent' : 
                         customer.daysSinceLastVisit < 30 ? 'Good' : 
                         customer.daysSinceLastVisit < 90 ? 'Average' : 'Poor'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.max(0, 100 - (customer.daysSinceLastVisit / 90 * 100))} 
                      className="h-2 rounded-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Frequency</span>
                      <span className="font-medium">
                        {customer.lifetimeTransactionCount > 10 ? 'Excellent' : 
                         customer.lifetimeTransactionCount > 5 ? 'Good' : 
                         customer.lifetimeTransactionCount > 2 ? 'Average' : 'Poor'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, customer.lifetimeTransactionCount * 10)} 
                      className="h-2 rounded-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Monetary</span>
                      <span className="font-medium">
                        {customer.totalLifetimeSpend > 300 ? 'Excellent' : 
                         customer.totalLifetimeSpend > 150 ? 'Good' : 
                         customer.totalLifetimeSpend > 50 ? 'Average' : 'Poor'}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, customer.totalLifetimeSpend / 3)} 
                      className="h-2 rounded-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Metrics Grid */}
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-3">Customer Metrics</h3>
              <div className="grid grid-cols-3 gap-3">
                <MetricCard 
                  icon={<Clock className="h-4 w-4 text-blue-500" />}
                  value={customer.daysSinceLastVisit.toString()}
                  label="Days Since Visit"
                />
                <MetricCard 
                  icon={<Calendar className="h-4 w-4 text-blue-500" />}
                  value={customer.daysSinceFirstPurchase.toString()}
                  label="Days as Customer"
                />
                <MetricCard 
                  icon={<DollarSign className="h-4 w-4 text-blue-500" />}
                  value={`$${(customer.totalLifetimeSpend / customer.lifetimeTransactionCount || 0).toFixed(2)}`}
                  label="Average Order Value"
                />
                <MetricCard 
                  icon={<Repeat className="h-4 w-4 text-blue-500" />}
                  value={customer.lifetimeTransactionCount.toString()}
                  label="Total Transactions"
                />
                <MetricCard 
                  icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
                  value={`$${customer.highestTransactionAmount.toFixed(2)}`}
                  label="Highest Transaction"
                />
                <MetricCard 
                  icon={<Star className="h-4 w-4 text-blue-500" />}
                  value={customer.membershipTier || "None"}
                  label="Membership Tier"
                />
                <MetricCard 
                  icon={<Banknote className="h-4 w-4 text-blue-500" />}
                  value={`$${customer.totalLifetimeSpend.toFixed(2)}`}
                  label="Lifetime Spend"
                />
                <MetricCard 
                  icon={<Tag className="h-4 w-4 text-blue-500" />}
                  value={customer.pointsBalance.toString()}
                  label="Points Balance"
                />
                <MetricCard 
                  icon={<Gift className="h-4 w-4 text-blue-500" />}
                  value={customer.redemptionCount?.toString() || "0"}
                  label="Redemptions"
                />
              </div>
            </div>

            {/* Customer Profiles */}
            <div>
              <h3 className="text-sm font-medium mb-3">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500">Tap Agent</span> Profile
              </h3>
              {customer.customerProfiles && customer.customerProfiles.length > 0 ? (
                <div className="border rounded-md p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                            <Brain className="h-4 w-4" />
                          </div>
                          <h4 className="font-medium text-sm">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-orange-500">Tap Agent</span> Profile
                          </h4>
                          {customer.customerProfiles[0].createdAt && (
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(customer.customerProfiles[0].createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-2 text-sm">{customer.customerProfiles[0].profileDescription}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed rounded">
                  <Brain className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No profile information yet</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="pt-4 pb-20 px-6 data-[state=active]:block">
            {/* Existing transactions content */}
          </TabsContent>

          {/* Redemptions Tab */}
          <TabsContent value="redemptions" className="pt-4 pb-20 px-6 data-[state=active]:block">
            {/* Existing redemptions content */}
          </TabsContent>

          {/* Agent Tab */}
          <TabsContent value="agent" className="pt-4 pb-20 px-6 data-[state=active]:block">
            <AgentTab 
              customer={customer} 
              weeklyAgentActivities={weeklyAgentActivities} 
              loading={loadingAgentActivities} 
            />
          </TabsContent>
        </ScrollArea>
      </Tabs>

      {/* Sticky action row */}
      <div className="sticky bottom-0 bg-white py-4 border-t border-[#E2E4E8] flex justify-end gap-3">
        <Button 
          variant="outline" 
          className="h-10 px-4 border-[#D1D5DB] text-[#111827] hover:bg-[#F0F2F4] transition-all duration-150 ease-in-out active:scale-[0.98]"
        >
          Edit Customer
        </Button>
        <Button 
          className="h-10 px-4 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white transition-all duration-150 ease-in-out active:scale-[0.98]"
        >
          Create Reward
        </Button>
      </div>
    </div>
  )
}

function CohortBadge({ cohort }: { cohort?: string }) {
  if (!cohort) return null
  
  // Capitalize the first letter of the cohort
  const capitalizedCohort = cohort.charAt(0).toUpperCase() + cohort.slice(1)
  
  const getColor = () => {
    const lowerCohort = cohort.toLowerCase()
    if (lowerCohort.includes('loyal') || lowerCohort.includes('regular')) return 'bg-green-50 text-green-700 border-green-200'
    if (lowerCohort.includes('new')) return 'bg-gray-50 text-gray-700 border-gray-200'
    if (lowerCohort.includes('risk') || lowerCohort.includes('churn')) return 'bg-orange-50 text-orange-700 border-orange-200'
    if (lowerCohort.includes('lost') || lowerCohort.includes('inactive')) return 'bg-red-50 text-red-700 border-red-200'
    if (lowerCohort.includes('vip') || lowerCohort.includes('premium')) return 'bg-purple-50 text-purple-700 border-purple-200'
    return 'bg-gray-50 text-gray-700 border-gray-200'
  }
  
  return (
    <Badge variant="outline" className={`rounded ${getColor()}`}>
      {capitalizedCohort}
    </Badge>
  )
}

interface PushNotificationActivity {
  content?: string;
  timestamp?: any;
  sent?: boolean;
  type?: 'push' | 'in-app';
  clicked?: boolean;
}

interface AgentTabProps {
  customer: Customer | null;
  weeklyAgentActivities: WeeklyAgentActivity[];
  loading: boolean;
}

function AgentTab({ customer, weeklyAgentActivities, loading }: AgentTabProps) {
  const { user } = useAuth();
  const [activeWeekTab, setActiveWeekTab] = useState<string>('');
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [customerData, setCustomerData] = useState<any>(null);
  const [expandedReasonings, setExpandedReasonings] = useState<{[key: string]: boolean}>({});
  const [availableWeeks, setAvailableWeeks] = useState<Array<{weekId: string, label: string}>>([]);
  const [redemptions, setRedemptions] = useState<{[rewardId: string]: {redemptionId: string, redemptionDate: any}}>({});
  const [bannerStats, setBannerStats] = useState<{[bannerId: string]: {impressions: number, clicks: number}}>({});

  // Toggle reasoning visibility
  const toggleReasoning = (rewardId: string) => {
    setExpandedReasonings(prev => ({
      ...prev,
      [rewardId]: !prev[rewardId]
    }));
  };

  // Function to format week ID for display
  const formatWeekLabel = (weekId: string) => {
    try {
      const [year, month, day] = weekId.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return weekId; // Return as is if not a valid date format
      }
      const date = new Date(year, month - 1, day);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return weekId;
    }
  };

  // Handle week change
  const handleWeekChange = (weekId: string) => {
    setActiveWeekTab(weekId);
    
    // Find the data for the selected week
    const selectedWeekData = weeklyAgentActivities.find(week => week.weekId === weekId);
    
    if (selectedWeekData) {
      setCustomerData(selectedWeekData);
    }
  };

  // Function to fetch redemptions for rewards
  const fetchRedemptions = async () => {
    if (!user?.uid) return;

    try {
      // Query redemptions collection for this merchant
      const redemptionsRef = collection(db, 'merchants', user.uid, 'redemptions');
      const redemptionsSnap = await getDocs(redemptionsRef);
      
      if (redemptionsSnap.empty) return;
      
      // Create a mapping of rewardId to redemption data
      const redemptionsMap: {[rewardId: string]: {redemptionId: string, redemptionDate: any}} = {};
      
      redemptionsSnap.docs.forEach(doc => {
        const redemptionData = doc.data();
        if (redemptionData.rewardId && redemptionData.customerId === customer?.customerId) {
          redemptionsMap[redemptionData.rewardId] = {
            redemptionId: doc.id,
            redemptionDate: redemptionData.redemptionDate || redemptionData.createdAt
          };
        }
      });
      
      console.log("Redemptions found:", redemptionsMap);
      setRedemptions(redemptionsMap);
    } catch (error) {
      console.error("Error fetching redemptions:", error);
    }
  };

  // Function to fetch banner stats (impressions and clicks)
  const fetchBannerStats = async () => {
    if (!customer?.customerId) return;

    try {
      // Create a map to store banner stats
      const statsMap: {[bannerId: string]: {impressions: number, clicks: number}} = {};
      
      // Check if customer data has banners
      if (customerData?.banners && customerData.banners.length > 0) {
        // For each banner, fetch stats
        for (const banner of customerData.banners) {
          if (banner.id) {
            try {
              const bannerRef = firestoreDoc(db, 'customers', customer.customerId, 'banners', banner.id);
              const bannerSnap = await getDoc(bannerRef);
              
              if (bannerSnap.exists()) {
                const bannerData = bannerSnap.data();
                statsMap[banner.id] = {
                  impressions: bannerData.impressions || 0,
                  clicks: bannerData.clicks || 0
                };
              }
            } catch (err) {
              console.error(`Error fetching stats for banner ${banner.id}:`, err);
            }
          }
        }
      }
      
      console.log("Banner stats found:", statsMap);
      setBannerStats(statsMap);
    } catch (error) {
      console.error("Error fetching banner stats:", error);
    }
  };

  console.log("AgentTab render:", {
    loading,
    customer: customer?.customerId,
    weeklyActivitiesCount: weeklyAgentActivities?.length,
    weeklyActivities: weeklyAgentActivities
  });

  // Function to fetch data for the specific customer
  const fetchCustomerData = async () => {
    setIsFetchingData(true);
    
    try {
      if (!user?.uid || !customer?.customerId) {
        console.log("Missing user ID or customer ID", { userId: user?.uid, customerId: customer?.customerId });
        throw new Error("Missing user ID or customer ID");
      }
      
      console.log("Fetching customer-specific data with path:", {
        merchantId: user.uid,
        customerId: customer.customerId,
        path: `merchants/${user.uid}/customerAgentActivity/${customer.customerId}/weeks`
      });
      
      // Fetch weekly agent activities from the customer-specific path
      const weeklyActivitiesRef = collection(db, 'merchants', user.uid, 'customerAgentActivity', customer.customerId, 'weeks');
      const weeklyActivitiesSnap = await getDocs(weeklyActivitiesRef);
      
      console.log("Customer data query result:", {
        empty: weeklyActivitiesSnap.empty,
        size: weeklyActivitiesSnap.size,
        docs: weeklyActivitiesSnap.docs.map(doc => doc.id)
      });
      
      if (weeklyActivitiesSnap.empty) {
        console.log("No customer-specific data found");
        setCustomerData(null);
        return;
      }
      
      // Map the weekly activities data
      const activitiesData = weeklyActivitiesSnap.docs.map(doc => {
        const data = doc.data();
        console.log(`Data for week ${doc.id}:`, data);
        return {
          weekId: doc.id,
          ...data
        };
      }).sort((a, b) => {
        // Sort by weekId in descending order (most recent first)
        return b.weekId.localeCompare(a.weekId);
      });
      
      console.log("Customer data processed:", activitiesData);
      
      if (activitiesData.length > 0) {
        // Set available weeks for selection
        const weeks = activitiesData.map(week => ({
          weekId: week.weekId,
          label: formatWeekLabel(week.weekId)
        }));
        
        setAvailableWeeks(weeks);
        setCustomerData(activitiesData[0]); // Use the most recent week
        setActiveWeekTab(activitiesData[0].weekId);
        
        // Fetch redemptions and banner stats after setting customer data
        await fetchRedemptions();
        await fetchBannerStats();
      } else {
        console.log("No valid customer data found");
        setCustomerData(null);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setCustomerData(null);
    } finally {
      setIsFetchingData(false);
    }
  };

  // Effect to fetch banner stats when customer data changes
  useEffect(() => {
    if (customerData?.banners && customerData.banners.length > 0) {
      fetchBannerStats();
    }
  }, [customerData]);

  // Fetch data on component mount
  useEffect(() => {
    fetchCustomerData();
  }, [customer?.customerId, user?.uid]);

  // Handle loading state
  if (loading || isFetchingData) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-b-transparent border-gray-900"></div>
        <p className="mt-2 text-xs text-gray-500">Loading agent activity...</p>
      </div>
    );
  }

  // If data was fetched, display it
  if (customerData) {
    return (
      <div>
        {/* Week selector */}
        {availableWeeks.length > 1 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <h3 className="text-xs font-medium text-gray-700">Week</h3>
            </div>
            
            <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {availableWeeks.map((week) => (
                <Button
                  key={week.weekId}
                  variant={activeWeekTab === week.weekId ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleWeekChange(week.weekId)}
                  className={`whitespace-nowrap text-xs h-7 px-2.5 ${
                    activeWeekTab === week.weekId
                      ? "bg-gray-700 hover:bg-gray-800"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {week.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Customer cohort information */}
        <div className="mb-4 p-3 bg-gray-50 rounded-md border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-medium text-gray-800">Customer Cohort</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {customerData.cohort || customer?.cohort || "No cohort information"}
              </p>
            </div>
            <CohortBadge cohort={customerData.cohort || customer?.cohort} />
          </div>
        </div>
        
        {/* Show generation date */}
        <div className="text-xs text-gray-500 mb-4">
          Generated {customerData.runDate ? (typeof customerData.runDate === 'string' ? customerData.runDate : format(new Date(customerData.runDate), 'MMM d, yyyy')) : 'N/A'}
        </div>

        {/* Rewards Section */}
        {customerData.rewards && customerData.rewards.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-xs font-medium mb-3 text-gray-800 flex items-center gap-1.5">
              <Gift className="h-4 w-4 text-gray-600" />
              Rewards ({customerData.rewardsCount || customerData.rewards.length})
            </h3>
            
            <div className="space-y-3">
              {customerData.rewards.map((reward: any, index: number) => {
                const rewardId = reward.id || `reward-${index}`;
                const isRedeemed = !!redemptions[rewardId];
                const redemptionData = redemptions[rewardId];
                
                return (
                  <div 
                    key={rewardId} 
                    className={`rounded-md border p-3 bg-white shadow-sm ${isRedeemed ? 'border-green-200' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`p-2 rounded-md ${isRedeemed ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'} mt-0.5`}>
                        {isRedeemed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          getRewardTypeIcon(reward.rewardType || 'generic')
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-sm font-medium">{reward.rewardName}</h4>
                            {isRedeemed && (
                              <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">Redeemed</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-normal text-xs">
                            {reward.pointsCost} points
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-600 my-1">{reward.rewardSummary}</p>
                        
                        {/* Redemption date if redeemed */}
                        {isRedeemed && redemptionData?.redemptionDate && (
                          <div className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Redeemed on {format(new Date(redemptionData.redemptionDate.seconds * 1000), 'MMM d, yyyy')}
                          </div>
                        )}
                        
                        {reward.reasoning && (
                          <div className="mt-1.5 text-xs">
                            <button 
                              onClick={() => toggleReasoning(rewardId)}
                              className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-800 transition-colors"
                            >
                              {expandedReasonings[rewardId] ? (
                                <>
                                  <ChevronLeft className="h-3 w-3" />
                                  Hide reasoning
                                </>
                              ) : (
                                <>
                                  <HelpCircle className="h-3 w-3" />
                                  Why this reward?
                                </>
                              )}
                            </button>
                            
                            {expandedReasonings[rewardId] && (
                              <div className="mt-1.5 pl-2 border-l-2 border-gray-200 text-gray-500 text-[11px]">
                                {reward.reasoning}
                              </div>
                            )}
                          </div>
                        )}

                        {reward.expiryDate && (
                          <div className="mt-1.5 text-[10px] text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="h-2.5 w-2.5" />
                              Expires: {format(new Date(reward.expiryDate.seconds * 1000), 'MMM d, yyyy')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 border border-dashed rounded-md text-center">
            <Gift className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs text-gray-500">No rewards found</p>
          </div>
        )}

        {/* Banners Section */}
        {customerData.banners && customerData.banners.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-xs font-medium mb-3 text-gray-800 flex items-center gap-1.5">
              <Image className="h-4 w-4 text-gray-600" />
              App Banners ({customerData.bannersCount || customerData.banners.length})
            </h3>
            
            <div className="space-y-3">
              {customerData.banners.map((banner: any, index: number) => {
                const bannerId = banner.id || banner.bannerId || `banner-${index}`;
                const stats = bannerStats[bannerId] || { impressions: 0, clicks: 0 };
                const clickRate = stats.impressions > 0 
                  ? Math.round((stats.clicks / stats.impressions) * 100) 
                  : 0;
                
                return (
                  <div key={bannerId} className="rounded-md border p-3 bg-white shadow-sm">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="text-sm font-medium">{banner.title}</h4>
                        <p className="text-xs text-gray-600 mt-0.5">{banner.description}</p>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={banner.isActive ? "default" : "outline"} className="h-fit text-xs">
                          {banner.isActive ? "Active" : "Inactive"}
                        </Badge>
                        
                        <div className="flex flex-col items-end">
                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Eye className="h-2.5 w-2.5" />
                            {stats.impressions} {stats.impressions === 1 ? 'impression' : 'impressions'}
                          </div>
                          
                          <div className="text-[10px] text-gray-500 flex items-center gap-1">
                            <MousePointerClick className="h-2.5 w-2.5" />
                            {stats.clicks} {stats.clicks === 1 ? 'click' : 'clicks'} 
                            {stats.impressions > 0 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-blue-600 ml-0.5 cursor-help">({clickRate}%)</span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-[220px] text-xs">
                                    <p>Click-through rate (CTR): The percentage of impressions that resulted in clicks.</p>
                                    <p className="mt-1">A higher CTR indicates a more effective banner at engaging customers.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {banner.expiresAt && (
                      <div className="mt-1.5 text-[10px] text-gray-500 pt-1.5 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          Expires: {format(new Date(banner.expiresAt.seconds * 1000), 'MMM d, yyyy')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 border border-dashed rounded-md text-center">
            <Image className="h-6 w-6 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs text-gray-500">No banners found</p>
          </div>
        )}
      </div>
    );
  }

  // If no data was found
  return (
    <div className="py-10 text-center">
      <Activity className="h-10 w-10 text-gray-300 mx-auto mb-2" />
      <h3 className="text-sm font-medium text-gray-800 mb-1">No Agent Activity Available</h3>
      <p className="text-xs text-gray-500 max-w-sm mx-auto">
        We couldn't retrieve the agent activity data for this customer.
      </p>
      
      <div className="mt-4">
        <Button 
          onClick={fetchCustomerData}
          disabled={isFetchingData}
          className="text-xs h-8"
        >
          {isFetchingData ? (
            <>
              <div className="animate-spin mr-1.5 h-3 w-3 border-2 border-b-transparent border-white rounded-full"></div>
              Loading Data...
            </>
          ) : (
            <>Retry Loading Data</>
          )}
        </Button>
      </div>
    </div>
  );
}

// Helper function to capitalize first letter (add if doesn't exist)
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
} 