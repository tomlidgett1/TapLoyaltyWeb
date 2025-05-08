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
  Image
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

interface BannerActivity {
  bannerId: string | undefined;
  title: string | undefined;
  description: string | undefined;
  color: string | undefined;
  secondaryColor?: string;
  style: string | undefined;
  isActive: boolean | undefined;
  createdAt: any;
  bannerAction?: string;
  buttonText?: string;
  merchantId?: string;
  merchantName?: string;
  type?: string;
}

interface WeeklyAgentActivity {
  weekId: string;
  runDate?: string | Date;
  timestamp?: any;
  merchantId?: string;
  customerId?: string;
  customerName?: string;
  cohort?: string;
  rewards?: RewardActivity[];
  banners?: BannerActivity[];
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
      if (!user?.uid || !customer.customerId) return;
      
      setLoadingAgentActivities(true);
      
      try {
        // Fetch weekly agent activities from the Firestore path: merchants/{merchantId}/customers/{customerId}/weeklyAgentActivity
        const weeklyActivitiesRef = collection(db, 'merchants', user.uid, 'customers', customer.customerId, 'weeklyAgentActivity');
        const weeklyActivitiesSnap = await getDocs(weeklyActivitiesRef);
        
        if (weeklyActivitiesSnap.empty) {
          setWeeklyAgentActivities([]);
          setLoadingAgentActivities(false);
          return;
        }
        
        // Map the weekly activities data
        const activitiesData = weeklyActivitiesSnap.docs.map(doc => {
          const data = doc.data();
          return {
            weekId: doc.id,
            ...data
          } as WeeklyAgentActivity;
        }).sort((a, b) => {
          // Sort by weekId in descending order (most recent first)
          return b.weekId.localeCompare(a.weekId);
        });
        
        console.log("Weekly agent activities fetched:", activitiesData);
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
    if (lowerCohort.includes('new')) return 'bg-blue-50 text-blue-700 border-blue-200'
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

interface RewardActivity {
  rewardId: string;
  rewardName: string;
  description: string;
  type: string;
  pointsCost: number;
  isActive: boolean;
  hasBeenRedeemedByThisCustomer: boolean;
  reason?: string; // Adding optional reason property to fix linter errors
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
  const [activeWeekTab, setActiveWeekTab] = useState<'current' | 'previous'>('current');

  // Handle loading state
  if (loading) {
    return (
      <div className="py-10 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-b-transparent border-gray-900"></div>
        <p className="mt-2 text-gray-500">Loading agent activity...</p>
      </div>
    );
  }

  // Determine customer cohort and strategy
  const customerCohort = customer?.currentCohort?.name || customer?.cohort || 'Unknown';
  const cohortLower = customerCohort.toLowerCase();
  
  // Define strategy based on cohort
  const getCustomerStrategy = () => {
    if (cohortLower.includes('new')) {
      return {
        title: 'New Customer Strategy',
        description: 'Focus on welcoming and demonstrating value',
        steps: [
          'Offer welcome rewards to encourage repeat visits',
          'Personalize communications based on first purchases',
          'Showcase core product/service value'
        ]
      };
    }
    if (cohortLower.includes('loyal') || cohortLower.includes('active')) {
      return {
        title: 'Active Customer Strategy',
        description: 'Maintain engagement and increase value',
        steps: [
          'Reward consistent patronage with exclusive offers',
          'Encourage exploration of premium products/services',
          'Recognize and appreciate loyalty'
        ]
      };
    }
    if (cohortLower.includes('risk') || cohortLower.includes('dormant')) {
      return {
        title: 'Re-engagement Strategy',
        description: 'Bring this customer back before they churn',
        steps: [
          'Offer high-value incentives to return',
          'Re-establish value proposition',
          'Create easy pathways to re-engage'
        ]
      };
    }
    if (cohortLower.includes('churn') || cohortLower.includes('lost')) {
      return {
        title: 'Win-back Strategy',
        description: 'Reconnect with this previous customer',
        steps: [
          'Provide significant "win-back" incentives',
          'Communicate improvements since last visit',
          'Remind of previous positive experiences'
        ]
      };
    }
    // Default strategy
    return {
      title: 'Customer Strategy',
      description: 'Personalized engagement approach',
      steps: [
        'Offer targeted rewards based on behavior',
        'Maintain relevant communications',
        'Track engagement to refine approach'
      ]
    };
  };
  
  const strategy = getCustomerStrategy();

  // Sample data for demonstration purposes
  const dummyCurrentWeek = {
    weekId: 'current-week',
    runDate: new Date(),
    cohort: customer?.cohort || 'Active',
    rewards: [
      {
        rewardId: 'reward-1',
        rewardName: 'Weekend Special Discount',
        description: '20% off your next purchase this weekend',
        type: 'percentageDiscount',
        pointsCost: 0,
        isActive: true,
        hasBeenRedeemedByThisCustomer: false,
        reason: "Based on your recent purchasing patterns, we think you'd enjoy this weekend offer. Your last several visits were on weekends."
      },
      {
        rewardId: 'reward-2',
        rewardName: 'Free Coffee with Breakfast',
        description: 'Buy any breakfast item and get a free coffee',
        type: 'freeItem',
        pointsCost: 0,
        isActive: true,
        hasBeenRedeemedByThisCustomer: true,
        reason: "You've ordered breakfast items frequently but rarely with coffee. This offer encourages trying our coffee selection."
      }
    ],
    banners: [
      {
        bannerId: 'banner-1',
        title: 'Spring Collection Launch',
        description: 'Check out our new spring items',
        color: '#4CAF50',
        secondaryColor: '#E8F5E9',
        style: 'light',
        isActive: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        bannerId: 'banner-2',
        title: 'Loyalty Program Update',
        description: "We've improved our rewards system",
        color: '#2196F3',
        secondaryColor: '#E3F2FD',
        style: 'dark',
        isActive: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ],
    pushNotifications: [
      {
        content: 'Your reward is waiting! Come claim your free item today.',
        timestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        sent: false,
        type: 'push',
        clicked: false
      },
      {
        content: 'Thank you for your recent purchase! How was your experience?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        sent: true,
        type: 'in-app',
        clicked: true
      }
    ]
  };

  const dummyPreviousWeek = {
    weekId: 'previous-week',
    runDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    cohort: customer?.cohort || 'Active',
    rewards: [
      {
        rewardId: 'prev-reward-1',
        rewardName: 'Happy Hour Discount',
        description: '15% off drinks between 3-6pm',
        type: 'percentageDiscount',
        pointsCost: 0,
        isActive: false,
        hasBeenRedeemedByThisCustomer: true,
        reason: "You've visited during afternoon hours several times. This promotion aligns with your typical visit pattern."
      }
    ],
    banners: [
      {
        bannerId: 'prev-banner-1',
        title: 'Weekend Flash Sale',
        description: 'Up to 40% off select items',
        color: '#FF9800',
        secondaryColor: '#FFF3E0',
        style: 'light',
        isActive: false,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
      }
    ],
    pushNotifications: [
      {
        content: "Don't miss our weekend promotion! Ends Sunday.",
        timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        sent: true,
        type: 'push',
        clicked: false
      }
    ]
  };

  // Use provided data or fallback to dummy data
  const currentWeekActivity = weeklyAgentActivities && weeklyAgentActivities.length > 0 
    ? weeklyAgentActivities[0] 
    : dummyCurrentWeek;
    
  const previousWeekActivity = weeklyAgentActivities && weeklyAgentActivities.length > 1 
    ? weeklyAgentActivities[1] 
    : dummyPreviousWeek;
  
  // Get the active week data based on selected tab
  const activeWeekData = activeWeekTab === 'current' 
    ? currentWeekActivity 
    : previousWeekActivity;

  // Check if there's any agent activity
  const hasAgentActivity = (
    (activeWeekData.rewards && activeWeekData.rewards.length > 0) ||
    (activeWeekData.banners && activeWeekData.banners.length > 0) ||
    (activeWeekData.pushNotifications && activeWeekData.pushNotifications.length > 0)
  );

  // If no activity at all, show empty state
  if (!hasAgentActivity) {
    return (
      <div className="py-16 text-center">
        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-800 mb-1">No Agent Activity Yet</h3>
        <p className="text-gray-500 max-w-sm mx-auto">
          Agent activity will appear here once strategies are created for this customer.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Strategy Section */}
      <div className="mb-8">
        <div className="rounded-md border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-800">{strategy.title}</h3>
              <CohortBadge cohort={customerCohort} />
            </div>
            <Badge variant="outline" className="bg-gray-50 text-gray-600 font-normal">
              <Target className="h-3.5 w-3.5 mr-1.5" />
              Tailored Strategy
            </Badge>
          </div>
          
          <p className="text-gray-600 mb-4 text-sm">{strategy.description}</p>
          
          <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
            <div className="flex items-center gap-1.5 mb-2.5 text-sm font-medium text-gray-700">
              <Users className="h-4 w-4" />
              Recommended Actions
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {strategy.steps.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="h-5 w-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 text-xs">
                    {index + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Week selector tabs */}
      <div className="mb-6 border-b">
        <div className="flex">
          <button
            onClick={() => setActiveWeekTab('current')}
            className={`px-4 py-2 text-sm ${
              activeWeekTab === 'current'
                ? 'border-b-2 border-blue-500 text-blue-700 font-medium'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Current Week
          </button>
          <button
            onClick={() => setActiveWeekTab('previous')}
            className={`px-4 py-2 text-sm ${
              activeWeekTab === 'previous'
                ? 'border-b-2 border-blue-500 text-blue-700 font-medium'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Previous Week
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-6">
        Generated {activeWeekData.runDate ? format(new Date(activeWeekData.runDate), 'MMM d, yyyy') : 'N/A'}
      </div>

      {/* Rewards Section */}
      {activeWeekData.rewards && activeWeekData.rewards.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-4 text-gray-800 flex items-center gap-2">
            <Gift className="h-5 w-5 text-gray-600" />
            Rewards
          </h3>
          
          <div className="space-y-5">
            {activeWeekData.rewards.map((reward, index) => (
              <div key={reward.rewardId || index} className="rounded-md border p-4 bg-white shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-md bg-blue-50 text-blue-600 mt-0.5">
                    {getRewardTypeIcon(reward.type || 'generic')}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{reward.rewardName}</h4>
                      {reward.hasBeenRedeemedByThisCustomer ? (
                        <Badge className="bg-green-50 text-green-700 border-none font-normal">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Redeemed
                        </Badge>
                      ) : reward.isActive ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-normal">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-500 border-gray-200 font-normal">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 my-1.5">{reward.description}</p>
                    
                    {reward.reason && (
                      <div className="mt-2 text-sm text-gray-500 border-t pt-2">
                        <div className="flex items-center gap-1 text-xs mb-1 text-gray-400">
                          <HelpCircle className="h-3 w-3" />
                          Why this reward:
                        </div>
                        {reward.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Banners Section */}
      {activeWeekData.banners && activeWeekData.banners.length > 0 && (
        <div className="mb-8">
          <h3 className="font-medium mb-4 text-gray-800 flex items-center gap-2">
            <Image className="h-5 w-5 text-gray-600" />
            App Banners
          </h3>
          
          <div className="space-y-3">
            {activeWeekData.banners.map((banner, index) => (
              <div key={banner.bannerId || index} className="rounded-md border p-4 bg-white shadow-sm">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium">{banner.title}</h4>
                    <p className="text-gray-600 mt-1">{banner.description}</p>
                  </div>
                  
                  <Badge variant={banner.isActive ? "default" : "outline"} className="h-fit">
                    {banner.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Push Notifications - updated design with clearer sent/scheduled status */}
      {activeWeekData.pushNotifications && activeWeekData.pushNotifications.length > 0 && (
        <div>
          <h3 className="font-medium mb-4 text-gray-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600" />
            Customer Communications
          </h3>
          
          <div className="space-y-3">
            {activeWeekData.pushNotifications.map((notification, index) => (
              <div key={index} className={`rounded-md border bg-white shadow-sm ${notification.sent ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-amber-400'}`}>
                <div className="flex items-center gap-2 border-b px-4 py-2 bg-gray-50">
                  {/* Message type */}
                  {notification.type === 'push' ? (
                    <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-700 font-normal">
                      <Bell className="h-3.5 w-3.5 mr-1.5" />
                      Push Notification
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-purple-50 border-purple-100 text-purple-700 font-normal">
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      In-App Message
                    </Badge>
                  )}
                  
                  {/* Sent/Scheduled status */}
                  {notification.sent ? (
                    <Badge className="bg-green-50 text-green-700 border-none">
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Sent
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-50 text-amber-700 border-none">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Scheduled
                    </Badge>
                  )}
                  
                  {/* Date information */}
                  <div className="text-xs text-gray-500 ml-auto">
                    {notification.sent 
                      ? `Sent on ${notification.timestamp ? format(new Date(notification.timestamp), 'MMM d, yyyy') : 'N/A'}`
                      : `Scheduled for ${notification.timestamp ? format(new Date(notification.timestamp), 'MMM d, yyyy') : 'N/A'}`
                    }
                  </div>
                </div>
                
                <div className="p-4">
                  <p className="text-gray-800 text-base">{notification.content}</p>
                  
                  {/* Customer interaction status - only show for sent messages */}
                  {notification.sent && (
                    <div className="mt-2 pt-2 border-t text-sm">
                      <div className="flex items-center gap-1">
                        {notification.clicked ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            <span className="font-medium">Customer clicked</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <X className="h-4 w-4 mr-1.5" />
                            <span>No customer interaction</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to capitalize first letter (add if doesn't exist)
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
} 