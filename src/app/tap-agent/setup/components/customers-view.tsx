"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, getDoc, doc as firestoreDoc } from "firebase/firestore"
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
  Calendar
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

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

export function CustomersList() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [hoveredCustomerId, setHoveredCustomerId] = useState<string | null>(null)

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
        const customersRef = collection(db, 'customers')
        const customersSnap = await getDocs(customersRef)
        
        if (customersSnap.empty) {
          setLoading(false)
          return
        }
        
        // Create an array of promises for fetching both customer data and profiles
        const customerPromises = customersSnap.docs.map(async (doc) => {
          const data = doc.data()
          const customerId = doc.id
          
          // Fetch customer profiles
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
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
              return dateB - dateA
            })
          
          // Build the customer object with all required fields
          const customer: Customer = {
            customerId,
            fullName: data.fullName || 'Unknown',
            pointsBalance: data.pointsBalance || 0,
            membershipTier: data.membershipTier || '',
            lifetimeTransactionCount: data.lifetimeTransactionCount || 0,
            totalLifetimeSpend: data.totalLifetimeSpend || 0,
            daysSinceLastVisit: data.daysSinceLastVisit || 0,
            daysSinceFirstPurchase: data.daysSinceFirstPurchase || 0,
            redemptionCount: data.redemptionCount || 0,
            firstTransactionDate: data.firstTransactionDate || null,
            lastTransactionDate: data.lastTransactionDate || null,
            highestTransactionAmount: data.highestTransactionAmount || 0,
            currentCohort: data.currentCohort || null,
            cohort: data.cohort || 'New Customer',
            customerProfiles: profilesData,
            // Calculate agent rewards and behaviors from data
            agentRewards: data.agentRewards || [],
            recentBehavior: data.recentBehavior || 'No recent behavior data available.'
          }
          
          return customer
        })
        
        // Wait for all customer data to be fetched
        const customersData = await Promise.all(customerPromises)
        
        // Set customers data state
        setCustomers(customersData)
        setFilteredCustomers(customersData)
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

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
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
    <div className="py-6 space-y-6">
      {!selectedCustomer ? (
        <>
          {/* Header with search */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-[#111827]">Customers</h2>
            <div className="relative w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#6B7280]" />
              <Input
                placeholder="Search customers..."
                className="pl-9 h-10 border-[#D1D5DB] rounded-md focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD] focus:ring-opacity-20 transition-all duration-150 ease-in-out"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-4 gap-6">
            <MetricCard 
              icon={<Users className="h-5 w-5 text-[#0D6EFD]" />}
              value={customers.length.toString()}
              label="Total Customers"
            />
            
            <MetricCard 
              icon={<Gift className="h-5 w-5 text-[#0D6EFD]" />}
              value={customers.reduce((total, customer) => total + (customer.agentRewards?.length || 0), 0).toString()}
              label="Total Rewards"
            />
            
            <MetricCard 
              icon={<CheckCircle className="h-5 w-5 text-[#0D6EFD]" />}
              value={(() => {
                const allRewards = customers.flatMap(c => c.agentRewards || [])
                const redeemedRewards = allRewards.filter(r => r.isRedeemed)
                return allRewards.length ? Math.round((redeemedRewards.length / allRewards.length) * 100) + "%" : "0%"
              })()}
              label="Redemption Rate"
            />
            
            <MetricCard 
              icon={<Zap className="h-5 w-5 text-[#0D6EFD]" />}
              value={customers.filter(c => c.cohort === "Active").length.toString()}
              label="Active Customers"
            />
          </div>

          {/* Customer table */}
          <div className="border border-[#E2E4E8] rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F6F6F7]">
                <TableRow className="border-b border-[#E2E4E8]">
                  <TableHead className="py-3 font-semibold text-[#111827]">Customer</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Cohort</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Last Visit</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Total Visits</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Rewards</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <TableRow 
                      key={customer.customerId} 
                      onClick={() => setSelectedCustomer(customer)} 
                      className="cursor-pointer hover:bg-[#F9FAFB] transition-colors duration-150 ease-in-out border-b border-[#E2E4E8]"
                    >
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-[#E2E4E8]">
                            {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                              <AvatarImage src={customer.profileData.profilePictureUrl} alt={customer.fullName} />
                            ) : (
                              <AvatarFallback className="bg-[#F0F2F4] text-[#6B7280]">
                                {customer.fullName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <div className="font-medium text-[#111827]">{customer.fullName}</div>
                            <div className="text-xs text-[#6B7280]">
                              Since {formatDate(customer.firstTransactionDate)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <CohortBadge cohort={customer.currentCohort?.name || customer.cohort} />
                      </TableCell>
                      <TableCell className="text-[#111827]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#6B7280]" />
                          <span>{customer.daysSinceLastVisit} days ago</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#111827]">{customer.lifetimeTransactionCount}</TableCell>
                      <TableCell className="text-[#111827]">{customer.agentRewards?.length || 0}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-[#6B7280]" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-[300px]">
                      <div className="flex flex-col items-center justify-center text-[#6B7280]">
                        <User className="h-12 w-12 mb-3 text-[#E2E4E8]" />
                        {searchQuery ? (
                          <p className="text-sm">No customers match your search</p>
                        ) : (
                          <p className="text-sm">No customers found</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Sticky action row */}
          <div className="sticky bottom-0 bg-white py-4 border-t border-[#E2E4E8] flex justify-end">
            <Button 
              variant="outline" 
              className="h-10 px-4 border-[#D1D5DB] text-[#111827] hover:bg-[#F0F2F4] transition-all duration-150 ease-in-out active:scale-[0.98]"
            >
              Export Customer Data
            </Button>
          </div>
        </>
      ) : (
        <CustomerDetail 
          customer={selectedCustomer} 
          onBack={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  )
}

function CustomerDetail({ customer, onBack }: { customer: Customer, onBack: () => void }) {
  const { user } = useAuth()
  const [rewards, setRewards] = useState<AgentReward[]>([])
  const [loadingRewards, setLoadingRewards] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")
  const [customerProfiles, setCustomerProfiles] = useState<Array<{
    profileId: string
    merchantId: string
    createdAt: any
    profileDescription: string
  }>>([])
  const [loadingProfiles, setLoadingProfiles] = useState(true)

  // Add useEffect to fetch customer rewards when component mounts
  useEffect(() => {
    async function fetchCustomerRewards() {
      if (!user?.uid || !customer.customerId) {
        setLoadingRewards(false)
        return
      }

      try {
        // Get rewards from the customer's rewards collection
        const rewardsRef = collection(db, 'customers', customer.customerId, 'rewards')
        const rewardsSnap = await getDocs(rewardsRef)
        
        const rewardsData: AgentReward[] = []
        
        // Process each reward document
        rewardsSnap.docs.forEach(doc => {
          const data = doc.data()
          
          // Only include rewards for this merchant
          if (data.merchantId === user.uid) {
            rewardsData.push({
              id: doc.id,
              rewardName: data.rewardName || 'Unnamed Reward',
              description: data.description || '',
              type: data.type || 'unknown',
              pointsCost: data.pointsCost || 0,
              status: data.status || 'active',
              createdAt: data.createdAt || null,
              generationReason: data.generationReason || '',
              reason: data.reason || '',
              reasoning: data.reasoning || '',
              merchantId: data.merchantId,
              basedOn: data.basedOn || [],
              isRedeemed: data.isRedeemed || false,
              redeemedDate: data.redeemedDate || null
            })
          }
        })
        
        // Sort rewards by creation date (newest first)
        rewardsData.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
          return dateB - dateA
        })
        
        setRewards(rewardsData)
      } catch (error) {
        console.error('Error fetching customer rewards:', error)
      } finally {
        setLoadingRewards(false)
      }
    }
    
    fetchCustomerRewards()
  }, [user?.uid, customer.customerId])

  // Add useEffect to fetch customer profiles
  useEffect(() => {
    async function fetchCustomerProfiles() {
      if (!user?.uid || !customer.customerId) {
        setLoadingProfiles(false)
        return
      }

      try {
        // Get profiles from the customer's profiles collection
        const profilesRef = collection(db, 'customers', customer.customerId, 'profiles')
        const profilesSnap = await getDocs(profilesRef)
        
        if (profilesSnap.empty) {
          setLoadingProfiles(false)
          return
        }

        const profilesData = profilesSnap.docs
          .map(doc => {
            const data = doc.data()
            return {
              profileId: doc.id,
              merchantId: data.merchantId || '',
              createdAt: data.createdAt || null,
              profileDescription: data.profileDescription || ''
            }
          })
          // Filter for profiles that match this merchant
          .filter(profile => profile.merchantId === user.uid)
          // Sort by createdAt (newest first)
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return dateB - dateA
          })
        
        setCustomerProfiles(profilesData)
      } catch (error) {
        console.error('Error fetching customer profiles:', error)
      } finally {
        setLoadingProfiles(false)
      }
    }
    
    fetchCustomerProfiles()
  }, [user?.uid, customer.customerId])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  // Function to get icon based on reward type with more distinct colors
  const getRewardTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'percentagediscount':
        return <div className="bg-blue-50 p-2 rounded-md border border-blue-100"><span className="text-blue-700 font-semibold text-lg">%</span></div>
      case 'fixeddiscount':
        return <div className="bg-green-50 p-2 rounded-md border border-green-100"><span className="text-green-700 font-semibold text-lg">$</span></div>
      case 'freeitem':
        return <div className="bg-purple-50 p-2 rounded-md border border-purple-100"><Gift className="h-4 w-4 text-purple-700" /></div>
      case 'buyxgety':
        return <div className="bg-amber-50 p-2 rounded-md border border-amber-100"><span className="text-amber-700 font-semibold text-sm">B1G1</span></div>
      default:
        return <div className="bg-gray-100 p-2 rounded-md border border-gray-200"><Gift className="h-4 w-4 text-gray-700" /></div>
    }
  }

  // Calculate customer statistics
  const daysActive = customer.daysSinceFirstPurchase || 0
  const visitFrequency = customer.lifetimeTransactionCount > 0 && daysActive > 0 
    ? Math.round(daysActive / customer.lifetimeTransactionCount) 
    : 0
  const avgSpend = customer.lifetimeTransactionCount > 0 
    ? Math.round((customer.totalLifetimeSpend || 0) / customer.lifetimeTransactionCount)
    : 0

  // Get the most recent profile that matches this merchant
  const latestProfile = customerProfiles.length > 0 ? customerProfiles[0] : null

  return (
    <div className="space-y-6">
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
        value={activeTab} 
        onValueChange={setActiveTab}
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
            value="rewards"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
          >
            Rewards
          </TabsTrigger>
          <TabsTrigger 
            value="transactions"
            className="rounded-sm px-4 py-1.5 text-sm data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
          >
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key metrics row */}
          <div className="grid grid-cols-4 gap-6">
            <MetricCard 
              icon={<Clock className="h-5 w-5 text-[#0D6EFD]" />}
              value={`${customer.daysSinceLastVisit} days ago`}
              label="Last Visit"
            />

            <MetricCard 
              icon={<BarChart3 className="h-5 w-5 text-[#0D6EFD]" />}
              value={customer.lifetimeTransactionCount.toString()}
              label="Total Visits"
            />

            <MetricCard 
              icon={<DollarSign className="h-5 w-5 text-[#0D6EFD]" />}
              value={`$${customer.totalLifetimeSpend || 0}`}
              label="Total Spend"
            />

            <MetricCard 
              icon={<Gift className="h-5 w-5 text-[#0D6EFD]" />}
              value={(customer.redemptionCount || 0).toString()}
              label="Rewards Used"
            />
          </div>

          {/* Profile summary */}
          {loadingProfiles ? (
            <div className="border border-[#E2E4E8] rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#111827] mb-4">Customer Profile</h3>
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#0D6EFD] border-opacity-30 border-t-[#0D6EFD]"></div>
              </div>
            </div>
          ) : latestProfile ? (
            <div className="border border-[#E2E4E8] rounded-lg p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold text-[#111827]">Customer Profile</h3>
                <span className="text-xs text-[#6B7280]">
                  Updated {formatTimeAgo(latestProfile.createdAt)}
                </span>
              </div>
              <p className="text-[#6B7280] text-sm leading-relaxed">{latestProfile.profileDescription}</p>
            </div>
          ) : (
            <div className="border border-[#E2E4E8] rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#111827] mb-4">Customer Profile</h3>
              <p className="text-[#6B7280] text-sm">No profile information available for this customer.</p>
            </div>
          )}

          {/* Analytics section */}
          <div className="grid grid-cols-2 gap-6">
            {/* Spending patterns */}
            <div className="border border-[#E2E4E8] rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#111827] mb-4">Spending Patterns</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs uppercase font-medium text-[#6B7280] mb-1">Avg. Transaction</div>
                  <div className="text-xl font-semibold text-[#111827]">${avgSpend}</div>
                </div>
                <div>
                  <div className="text-xs uppercase font-medium text-[#6B7280] mb-1">Visit Frequency</div>
                  <div className="text-xl font-semibold text-[#111827]">
                    {visitFrequency > 0 ? `${visitFrequency} days` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Points & rewards */}
            <div className="border border-[#E2E4E8] rounded-lg p-5">
              <h3 className="text-base font-semibold text-[#111827] mb-4">Loyalty Points</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-medium text-[#6B7280]">Current Balance</span>
                  <span className="text-xl font-semibold text-[#111827]">{customer.pointsBalance || 0}</span>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full bg-[#F3F4F6] rounded-full">
                    <div 
                      className="h-2 bg-[#0D6EFD] rounded-full" 
                      style={{ width: `${Math.min(100, Math.max(5, (customer.pointsBalance || 0) / 10))}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer behavior insights */}
          <div className="border border-[#E2E4E8] rounded-lg p-5">
            <h3 className="text-base font-semibold text-[#111827] mb-4">Behavior Insights</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed">{customer.recentBehavior}</p>
          </div>
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          {loadingRewards ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0D6EFD] border-opacity-30 border-t-[#0D6EFD]"></div>
            </div>
          ) : rewards.length > 0 ? (
            <div className="border border-[#E2E4E8] rounded-lg divide-y divide-[#E2E4E8]">
              {rewards.map(reward => (
                <div key={reward.id} className="p-4 hover:bg-[#F9FAFB] transition-colors duration-150 ease-in-out">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 flex-shrink-0">
                      {getRewardTypeIcon(reward.type)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-medium text-[#111827] truncate">{reward.rewardName}</h4>
                        {reward.isRedeemed ? (
                          <Badge className="rounded-full px-2.5 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-medium text-xs">
                            Redeemed
                          </Badge>
                        ) : (
                          <Badge className="rounded-full px-2.5 py-0.5 bg-[#EBF5FF] text-[#1E40AF] border border-[#BFDBFE] font-medium text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-[#6B7280] mb-2">{reward.description}</p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#6B7280]">
                          Created {formatTimeAgo(reward.createdAt)}
                        </span>
                        {reward.pointsCost > 0 && (
                          <span className="font-medium text-[#111827]">{reward.pointsCost} pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-[#E2E4E8] rounded-lg p-16 flex flex-col items-center justify-center">
              <Gift className="h-12 w-12 text-[#E2E4E8] mb-4" />
              <p className="text-[#6B7280] mb-1">No rewards available for this customer</p>
              <p className="text-xs text-[#6B7280]">Rewards will appear here once created</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <div className="border border-[#E2E4E8] rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[#F6F6F7]">
                <TableRow className="border-b border-[#E2E4E8]">
                  <TableHead className="py-3 font-semibold text-[#111827]">Date</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Amount</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Items</TableHead>
                  <TableHead className="py-3 font-semibold text-[#111827]">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={4} className="h-[300px]">
                    <div className="flex flex-col items-center justify-center text-[#6B7280]">
                      <Calendar className="h-12 w-12 text-[#E2E4E8] mb-4" />
                      <p className="text-[#6B7280] mb-1">Transaction history not available</p>
                      <p className="text-xs text-[#6B7280]">This is a demo view</p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </TabsContent>
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

// Reusable components to follow the design system
function MetricCard({ icon, value, label }: { icon: React.ReactNode, value: string, label: string }) {
  return (
    <div className="border border-[#E2E4E8] rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase font-medium text-[#6B7280]">{label}</span>
        <div className="h-8 w-8 rounded-md bg-[#F0F2F4] flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="text-xl font-semibold text-[#111827]">{value}</div>
    </div>
  )
}

function CohortBadge({ cohort }: { cohort?: string }) {
  switch (cohort?.toLowerCase()) {
    case 'new':
      return <Badge className="rounded-md bg-[#EBF5FF] text-[#1E40AF] border border-[#BFDBFE] font-medium">{cohort}</Badge>
    case 'active':
      return <Badge className="rounded-md bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] font-medium">{cohort}</Badge>
    case 'dormant':
      return <Badge className="rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-medium">{cohort}</Badge>
    case 'churned':
      return <Badge className="rounded-md bg-[#FEE2E2] text-[#991B1B] border border-[#FECACA] font-medium">{cohort}</Badge>
    default:
      return <Badge className="rounded-md bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB] font-medium">{cohort || 'Unknown'}</Badge>
  }
} 