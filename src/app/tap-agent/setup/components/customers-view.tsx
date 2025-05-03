"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, getDoc, doc as firestoreDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Gift, Search, User, Clock, ChevronRight, CheckCircle, Users, Zap, DollarSign } from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    async function fetchCustomers() {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        const customersRef = collection(db, 'merchants', user.uid, 'customers')
        const customersSnap = await getDocs(query(customersRef))
        
        const customersPromises = customersSnap.docs.map(async (doc) => {
          const data = doc.data()
          
          // Fetch customer profile data
          const profileRef = firestoreDoc(db, 'customers', doc.id)
          const profileSnap = await getDoc(profileRef)
          const profileData = profileSnap.exists() ? profileSnap.data() : undefined

          // Mock agent-generated rewards for each customer
          // In a real implementation, these would come from the Firestore database
          const agentRewards = mockAgentRewards(data.daysSinceLastVisit, data.lifetimeTransactionCount)
          
          // Determine customer cohort based on visit behavior
          const cohort = determineCustomerCohort(data.daysSinceLastVisit, data.lifetimeTransactionCount, data.daysSinceFirstPurchase)
          
          // Generate a behavior summary
          const recentBehavior = generateBehaviorSummary(data)

          return {
            customerId: doc.id,
            fullName: data.fullName || 'Unknown Customer',
            pointsBalance: data.pointsBalance || 0,
            lifetimeTransactionCount: data.lifetimeTransactionCount || 0,
            totalLifetimeSpend: data.totalLifetimeSpend || 0,
            lastTransactionDate: data.lastTransactionDate || null,
            firstTransactionDate: data.firstTransactionDate || null,
            daysSinceFirstPurchase: data.daysSinceFirstPurchase || 0,
            daysSinceLastVisit: data.daysSinceLastVisit || 0,
            highestTransactionAmount: data.highestTransactionAmount || 0,
            membershipTier: data.membershipTier || null,
            redemptionCount: data.redemptionCount || 0,
            profileData: profileData ? {
              profilePictureUrl: profileData.profilePictureUrl,
              shareProfileWithMerchants: profileData.shareProfileWithMerchants
            } : undefined,
            // Add agent-specific fields
            cohort,
            agentRewards,
            recentBehavior,
            // Add cohort tracking information
            cohortHistory: data.cohortHistory || [
              { days: 0, name: cohort, since: new Date() }
            ],
            cohortViewCount: data.cohortViewCount || 1,
            currentCohort: data.currentCohort || {
              daysInCohort: 0,
              name: cohort,
              since: new Date()
            }
          }
        })

        const customersData = await Promise.all(customersPromises)
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

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCustomers(customers)
    } else {
      const filtered = customers.filter(customer => 
        customer.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.cohort && customer.cohort.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredCustomers(filtered)
    }
  }, [searchTerm, customers])

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
      <div className="space-y-4">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-9 w-[250px]" />
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold mb-1">Customer Insights</h2>
          <p className="text-sm text-muted-foreground">
            View detailed customer information and agent-generated rewards.
          </p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            className="pl-8 w-full border-slate-200"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Add metrics section */}
      {!selectedCustomer && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white border border-slate-200 rounded-md py-2 px-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Rewards</span>
              <Gift className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mt-1">
              {customers.reduce((total, customer) => total + (customer.agentRewards?.length || 0), 0)}
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-md py-2 px-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Redemption Rate</span>
              <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mt-1">
              {(() => {
                const allRewards = customers.flatMap(c => c.agentRewards || [])
                const redeemedRewards = allRewards.filter(r => r.isRedeemed)
                return allRewards.length ? Math.round((redeemedRewards.length / allRewards.length) * 100) : 0
              })()}%
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-md py-2 px-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active Customers</span>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mt-1">
              {customers.filter(c => c.cohort === "Active").length}
            </p>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-md py-2 px-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Re-engagement</span>
              <Zap className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mt-1">
              {(() => {
                const dormantCustomers = customers.filter(c => c.cohort === "Dormant" || c.cohort === "Churned")
                if (!dormantCustomers.length) return "0%"
                
                const reengagedCount = dormantCustomers.filter(c => {
                  const rewards = c.agentRewards || []
                  return rewards.some(r => r.isRedeemed)
                }).length
                
                return Math.round((reengagedCount / dormantCustomers.length) * 100) + "%"
              })()}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {selectedCustomer ? (
          <CustomerDetail 
            customer={selectedCustomer} 
            onBack={() => setSelectedCustomer(null)}
          />
        ) : (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <h3 className="text-base font-medium mb-3">Your Customers</h3>
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Cohort</TableHead>
                    <TableHead>Last Visit</TableHead>
                    <TableHead>Total Visits</TableHead>
                    <TableHead>Agent Rewards</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                      <TableRow key={customer.customerId} onClick={() => setSelectedCustomer(customer)} className="cursor-pointer hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 border border-slate-100">
                              {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                                <AvatarImage src={customer.profileData.profilePictureUrl} alt={customer.fullName} />
                              ) : (
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {customer.fullName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <div>
                              <div className="font-medium">{customer.fullName}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTimeAgo(customer.firstTransactionDate)} first visit
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.currentCohort?.name ? (
                            <Badge className={`${getCohortBadgeStyle(customer.currentCohort.name)} font-normal rounded-md`}>
                              {customer.currentCohort.name}
                            </Badge>
                          ) : customer.cohort ? (
                            <Badge className={`${getCohortBadgeStyle(customer.cohort)} font-normal rounded-md`}>
                              {customer.cohort}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800 font-normal rounded-md">
                              Unknown
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span>{customer.daysSinceLastVisit} days ago</span>
                          </div>
                        </TableCell>
                        <TableCell>{customer.lifetimeTransactionCount}</TableCell>
                        <TableCell>{customer.agentRewards?.length || 0}</TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <User className="h-10 w-10 mb-2 text-slate-300" />
                          {searchTerm ? (
                            <p>No customers match your search.</p>
                          ) : (
                            <p>No customers found.</p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CustomerDetail({ customer, onBack }: { customer: Customer, onBack: () => void }) {
  const { user } = useAuth()
  const [rewards, setRewards] = useState<AgentReward[]>([])
  const [loadingRewards, setLoadingRewards] = useState(true)

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

  return (
    <div className="space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-md">
      {/* Header with back button and profile summary */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="rounded-full p-2 hover:bg-blue-50 text-blue-600 transition-colors border border-transparent hover:border-blue-100"
          >
            <ChevronRight className="h-5 w-5 transform rotate-180" />
          </button>
          <Avatar className="h-12 w-12 border-2 border-blue-100">
            {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
              <AvatarImage src={customer.profileData.profilePictureUrl} alt={customer.fullName} />
            ) : (
              <AvatarFallback className="bg-blue-50 text-blue-600 text-lg">
                {customer.fullName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold">{customer.fullName}</h2>
            <div className="flex items-center space-x-2">
              <Badge className={`${getCohortBadgeStyle(customer.currentCohort?.name)} font-medium rounded-md`}>
                {customer.currentCohort?.name || customer.cohort || 'Unknown'}
              </Badge>
              {customer.membershipTier && (
                <Badge variant="outline" className="font-normal rounded-md border-slate-200">
                  {customer.membershipTier}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Customer since</div>
          <div className="font-medium">{formatDate(customer.firstTransactionDate)}</div>
        </div>
      </div>

      {/* Customer Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="bg-blue-50 p-2 rounded-full text-blue-600 border border-blue-100">
              <Clock className="h-5 w-5" />
            </div>
            <span className="text-xs uppercase text-slate-500 font-medium">Last Visit</span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{customer.daysSinceLastVisit}</p>
            <p className="text-sm text-slate-500">days ago</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="bg-indigo-50 p-2 rounded-full text-indigo-600 border border-indigo-100">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs uppercase text-slate-500 font-medium">Total Visits</span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{customer.lifetimeTransactionCount}</p>
            <p className="text-sm text-slate-500">transactions</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="bg-green-50 p-2 rounded-full text-green-600 border border-green-100">
              <DollarSign className="h-5 w-5" />
            </div>
            <span className="text-xs uppercase text-slate-500 font-medium">Total Spend</span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">${customer.totalLifetimeSpend || 0}</p>
            <p className="text-sm text-slate-500">lifetime value</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="bg-amber-50 p-2 rounded-full text-amber-600 border border-amber-100">
              <Gift className="h-5 w-5" />
            </div>
            <span className="text-xs uppercase text-slate-500 font-medium">Rewards Used</span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold">{customer.redemptionCount || 0}</p>
            <p className="text-sm text-slate-500">redemptions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Profile & Behavior */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-slate-800">Customer Profile</h3>
              <div className="bg-blue-50 h-7 w-7 rounded-full flex items-center justify-center text-blue-600 border border-blue-100">
                <User className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Avg. Spend</div>
                  <div className="text-base font-semibold">${avgSpend}</div>
                  <div className="text-xs text-slate-500">per transaction</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium uppercase">Visit Frequency</div>
                  <div className="text-base font-semibold">{visitFrequency > 0 ? `Every ${visitFrequency} days` : 'N/A'}</div>
                  <div className="text-xs text-slate-500">average</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-sm font-medium mb-1 text-slate-800">Recent Behavior Pattern</div>
                <div className="text-sm text-slate-600">{customer.recentBehavior}</div>
              </div>

              <div className="bg-gray-100 rounded-md p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-slate-800">Points Balance</div>
                  <div className="text-xs text-slate-500">Current</div>
                </div>
                <div className="text-2xl font-bold text-blue-600">{customer.pointsBalance || 0}</div>
                <div className="h-2 w-full bg-slate-200 rounded-full mt-2">
                  <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Math.max(5, (customer.pointsBalance || 0) / 10))}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Cohort Information */}
          <div className="bg-white rounded-lg shadow-sm p-5 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-medium text-slate-800">Cohort Tracking</h3>
              <div className="bg-indigo-50 h-7 w-7 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-4">
              {/* Current Cohort */}
              <div className="bg-gray-100 rounded-md p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-slate-800">Current Cohort</div>
                  <Badge className={`${getCohortBadgeStyle(customer.currentCohort?.name)} font-medium`}>
                    {customer.currentCohort?.name || customer.cohort}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Since</span>
                  <span className="text-slate-800">{formatDate(customer.currentCohort?.since || new Date())}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-800">{customer.currentCohort?.daysInCohort || 0} days</span>
                </div>
              </div>

              {/* Cohort History */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium text-slate-800">Cohort History</div>
                  <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-100">
                    {customer.cohortViewCount || 1} views
                  </span>
                </div>
                
                <div className="space-y-2">
                  {customer.cohortHistory && customer.cohortHistory.length > 0 ? (
                    customer.cohortHistory.map((entry, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs text-slate-500">
                          {index}
                        </div>
                        <div className="flex-1 bg-gray-100 rounded-md p-2 border border-slate-200">
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className={`${getCohortBadgeStyle(entry.name)} font-normal border-slate-200`}>
                              {entry.name}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {entry.days} days
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(entry.since)}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-sm text-slate-500 py-2 bg-gray-100 border border-slate-200 rounded-md">
                      No cohort history available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent-Generated Rewards Card - Spans 2 columns for better visibility */}
        <div className="bg-white rounded-lg shadow-sm p-5 md:col-span-2 border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-medium text-slate-800">Agent-Generated Rewards</h3>
            <div className="bg-amber-50 h-7 w-7 rounded-full flex items-center justify-center text-amber-600 border border-amber-100">
              <Gift className="h-4 w-4" />
            </div>
          </div>
          
          {loadingRewards ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : rewards.length > 0 ? (
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div key={reward.id} className="border border-slate-200 rounded-md p-4 transition-shadow hover:shadow-md bg-white hover:border-blue-200">
                  <div className="flex items-start gap-4">
                    {/* Left: Reward icon */}
                    {getRewardTypeIcon(reward.type)}
                    
                    {/* Middle: Reward details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-base text-slate-800">{reward.rewardName}</h4>
                          <p className="text-sm text-slate-600">{reward.description}</p>
                        </div>
                        <Badge 
                          variant={reward.isRedeemed ? "default" : "outline"} 
                          className={`rounded-full px-3 ${reward.isRedeemed ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' : 'border-slate-200'}`}
                        >
                          {reward.isRedeemed ? 'Redeemed' : 'Active'}
                        </Badge>
                      </div>
                      
                      <div className="bg-gray-100 rounded-md p-3 mb-2 border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">Agent Reasoning</div>
                        <p className="text-sm text-slate-700">{reward.reasoning || reward.reason || reward.generationReason}</p>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs text-slate-500 mt-3">
                        <div className="flex items-center">
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          Created {formatTimeAgo(reward.createdAt)}
                        </div>
                        {reward.pointsCost > 0 && (
                          <div className="font-medium text-blue-600">{reward.pointsCost} points required</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Factors that influenced this reward */}
                  {reward.basedOn && reward.basedOn.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <div className="text-xs text-slate-500 mb-2">Based on:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {reward.basedOn.map((reason, index) => (
                          <Badge key={index} variant="secondary" className="font-normal text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Redemption info if applicable */}
                  {reward.isRedeemed && reward.redeemedDate && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-1.5 text-xs text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Redeemed {formatTimeAgo(reward.redeemedDate)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed rounded-md bg-gray-100 border-slate-200">
              <Gift className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-medium mb-1 text-slate-700">No rewards found</h3>
              <p className="text-sm text-slate-500">
                Tap Agent hasn't created any rewards for this customer yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper function to get cohort badge style
function getCohortBadgeStyle(cohort: string | undefined) {
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