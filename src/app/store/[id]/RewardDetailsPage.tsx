"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc, where, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"
import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, BarChart, Award, CheckCircle, AlertCircle, Edit, Eye, Copy, Trash
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/use-toast"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate } from '@/lib/date-utils'
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Condition {
  type: string
  value: number | string
  amount?: number
}

interface Limitation {
  type: string
  value: number | string | string[] | { 
    startTime?: string
    endTime?: string
    startDate?: string
    endDate?: string 
  }
}

interface RewardDetails {
  id: string
  rewardName: string
  description: string
  rewardType: string
  category: string
  pointsCost: string | number
  redemptionCount: number
  status: string
  startDate?: string
  endDate?: string
  createdAt: { seconds: number, nanoseconds: number } | string
  updatedAt: { seconds: number, nanoseconds: number } | string
  lastRedeemedAt: { seconds: number, nanoseconds: number } | string
  conditions?: Condition[]
  limitations?: Limitation[]
  impressions: number
  impressioncustomercount: number
  pin: string
  uniqueCustomersCount: number
  customers?: string[]
}

interface Redemption {
  id: string;
  customerId?: string;
  customerName?: string;
  profilePictureUrl?: string;
  redemptionDate?: any; // Using any for now to handle different timestamp formats
  status?: string;
  pointsUsed?: number;
}

export function RewardDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const { user } = useAuth()
  const [reward, setReward] = useState<RewardDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [redemptionsLoading, setRedemptionsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  console.log("RewardDetailsPage rendering with:", {
    params,
    id,
    userId: user?.uid
  })

  // Updated helper function to safely format dates with better type checking
  const safeFormatDate = (dateValue: any) => {
    return formatDate(dateValue);
  };

  // Add these helper functions at the top of your component
  const capitalize = (str?: string) => {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  // Add a helper function to safely format dates
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    
    // If it's a Firestore timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true })
    }
    
    // If it's a date string
    if (typeof timestamp === 'string') {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    }
    
    // If it's seconds
    if (timestamp.seconds) {
      return formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true })
    }
    
    return 'Unknown'
  }

  // Add these helper functions at the top of your component
  const formatCondition = (condition: Condition) => {
    switch (condition.type) {
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`
      case 'minimumLifetimeSpend':
        return `Minimum lifetime spend of $${condition.value}`
      case 'minimumPointsBalance':
        return `Minimum balance of ${condition.value} points`
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`
      case 'membershipLevel':
        return `${capitalize(condition.value.toString())} membership required`
      default:
        return JSON.stringify(condition)
    }
  }

  const formatLimitation = (limitation: Limitation) => {
    switch (limitation.type) {
      case 'activePeriod': {
        const value = limitation.value as { startDate: string, endDate: string }
        const startDate = new Date(value.startDate).toLocaleDateString()
        const endDate = new Date(value.endDate).toLocaleDateString()
        return `Active from ${startDate} to ${endDate}`
      }
      case 'totalRedemptionLimit':
        return `Limited to ${limitation.value} total redemptions`
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'timeOfDay': {
        const value = limitation.value as { startTime: string, endTime: string }
        return `Available ${value.startTime} to ${value.endTime}`
      }
      case 'daysOfWeek':
        const days = limitation.value as string[]
        return `Available on ${days.join(', ')}`
      default:
        return JSON.stringify(limitation)
    }
  }

  useEffect(() => {
    async function fetchRewardDetails() {
      if (!user?.uid) {
        console.log("No user ID found")
        setError("Please log in to view reward details")
        setLoading(false)
        return
      }

      if (!id) {
        console.log("No reward ID found")
        setError("Reward ID is missing")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        console.log("Fetching reward details:", {
          merchantId: user.uid,
          rewardId: id
        })
        
        const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id)
        const rewardDoc = await getDoc(rewardRef)

        console.log("Reward doc exists:", rewardDoc.exists())
        if (rewardDoc.exists()) {
          console.log("Reward data:", rewardDoc.data())
        }

        if (!rewardDoc.exists()) {
          setError("Reward not found")
          setLoading(false)
          return
        }

        const rewardData = {
          id: rewardDoc.id,
          ...rewardDoc.data()
        } as RewardDetails

        console.log("Setting reward data:", rewardData)
        setReward(rewardData)
      } catch (error) {
        console.error("Error fetching reward details:", error)
        setError("Failed to load reward details")
      } finally {
        setLoading(false)
      }
    }

    fetchRewardDetails()
  }, [id, user?.uid])

  useEffect(() => {
    async function fetchRedemptions() {
      if (!user?.uid || !id) return;
      
      try {
        setRedemptionsLoading(true);
        
        // Fetch from top-level redemptions collection
        const redemptionsRef = collection(db, 'redemptions');
        const redemptionsQuery = query(
          redemptionsRef, 
          where('rewardId', '==', id),
          orderBy('redemptionDate', 'desc'), 
          limit(10)
        );
        
        const redemptionsSnapshot = await getDocs(redemptionsQuery);
        const redemptionData = redemptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch customer details for each redemption
        const enhancedRedemptions = await Promise.all(
          redemptionData.map(async (redemption: any) => {
            if (redemption.customerId) {
              try {
                const customerDoc = await getDoc(doc(db, 'customers', redemption.customerId));
                if (customerDoc.exists()) {
                  const customerData = customerDoc.data();
                  return {
                    ...redemption,
                    customerName: customerData.name || customerData.fullName || 'Unknown Customer',
                    profilePictureUrl: customerData.profilePictureUrl || null
                  };
                }
              } catch (error) {
                console.error("Error fetching customer data:", error);
              }
            }
            return redemption;
          })
        );
        
        setRedemptions(enhancedRedemptions as Redemption[]);
      } catch (error) {
        console.error("Error fetching redemptions:", error);
        setRedemptions([]);
      } finally {
        setRedemptionsLoading(false);
      }
    }
    
    if (reward) {
      fetchRedemptions();
    }
  }, [user?.uid, id, reward]);

  // Update the safeParseDate function to be even more robust
  const safeParseDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    
    try {
      // Try different date formats
      let date: Date | null = null;
      
      // Try as ISO string
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // Try as timestamp (seconds)
      if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
        date = new Date(parseInt(dateString) * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try with Firestore timestamp format
      if (typeof dateString === 'object' && 'seconds' in dateString) {
        date = new Date((dateString as any).seconds * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // If all else fails, return a valid default date
      return new Date().toISOString();
    } catch (e) {
      console.error("Error parsing date:", e, dateString);
      // Return a valid default date instead of empty string
      return new Date().toISOString();
    }
  };

  // Update the createRewardDialogData object to properly map the reward type
  const createRewardDialogData = reward ? {
    rewardName: reward.rewardName || '',
    description: reward.description || '',
    type: reward.rewardType || reward.category || 'discount',
    rewardVisibility: reward.customers && reward.customers.length > 0 ? 'specific' : 'all',
    pin: reward.pin || '',
    pointsCost: reward.pointsCost?.toString() || '0',
    isActive: reward.status === 'active',
    delayedVisibility: false,
    delayedVisibilityType: 'transactions',
    delayedVisibilityTransactions: '',
    delayedVisibilitySpend: '',
    itemName: '',
    voucherAmount: '',
    spendThreshold: '',
    
    // Add customer-specific data
    specificCustomerIds: reward.customers || [],
    specificCustomerNames: [], // We don't have the names in the reward data
    
    // Map conditions array to object structure
    conditions: {
      useTransactionRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['minimumTransactions', 'maximumTransactions'].includes(c.type)),
      useSpendingRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['minimumLifetimeSpend', 'minimumPointsBalance'].includes(c.type)),
      useTimeRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['daysSinceJoined', 'daysSinceLastVisit'].includes(c.type)),
      minimumTransactions: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumTransactions')?.value?.toString() || '' : '',
      maximumTransactions: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'maximumTransactions')?.value?.toString() || '' : '',
      daysSinceJoined: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'daysSinceJoined')?.value?.toString() || '' : '',
      daysSinceLastVisit: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'daysSinceLastVisit')?.value?.toString() || '' : '',
      minimumLifetimeSpend: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumLifetimeSpend')?.value?.toString() || '' : '',
      minimumPointsBalance: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumPointsBalance')?.value?.toString() || '' : '',
      membershipLevel: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'membershipLevel')?.value?.toString() || '' : '',
      newCustomer: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => c.type === 'newCustomer'),
    },
    
    // Map limitations array to object structure
    limitations: {
      totalRedemptionLimit: Array.isArray(reward.limitations) ? 
        reward.limitations.find(l => l.type === 'totalRedemptionLimit')?.value?.toString() || '' : '',
      perCustomerLimit: Array.isArray(reward.limitations) ? 
        reward.limitations.find(l => l.type === 'customerLimit')?.value?.toString() || '' : '',
      useTimeRestrictions: Array.isArray(reward.limitations) && 
        reward.limitations.some(l => l.type === 'timeOfDay' || l.type === 'daysOfWeek'),
      startTime: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'timeOfDay') ? 
        (reward.limitations.find(l => l.type === 'timeOfDay')?.value as any)?.startTime || '' : '',
      endTime: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'timeOfDay') ? 
        (reward.limitations.find(l => l.type === 'timeOfDay')?.value as any)?.endTime || '' : '',
      dayRestrictions: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'daysOfWeek') ? 
        (reward.limitations.find(l => l.type === 'daysOfWeek')?.value as string[]) || [] : [],
    },
    
    // Add active period with proper date formatting
    hasActivePeriod: !!(reward.startDate || reward.endDate),
    activePeriod: {
      startDate: safeParseDate(reward.startDate),
      endDate: safeParseDate(reward.endDate)
    }
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!reward) return null

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navigation */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              className="gap-2" 
              onClick={() => router.push('/store')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rewards
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center mr-2">
                <span className="mr-2 text-sm text-gray-600">Active</span>
                <Switch 
                  checked={reward.status === 'active'} 
                  onCheckedChange={async (checked) => {
                    if (!user?.uid || !id) return;
                    try {
                      setIsToggling(true);
                      // Update the reward status in Firestore
                      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id);
                      await updateDoc(rewardRef, {
                        status: checked ? 'active' : 'inactive',
                        updatedAt: new Date().toISOString()
                      });
                      
                      // Also update in top-level rewards collection
                      const globalRewardRef = doc(db, 'rewards', id);
                      await updateDoc(globalRewardRef, {
                        status: checked ? 'active' : 'inactive',
                        updatedAt: new Date().toISOString()
                      });
                      
                      // Update the local state
                      setReward(prev => prev ? {...prev, status: checked ? 'active' : 'inactive'} : null);
                      
                      showToast({
                        title: "Success",
                        description: `Reward ${checked ? 'activated' : 'deactivated'} successfully.`,
                      });
                    } catch (error) {
                      console.error("Error updating reward status:", error);
                      showToast({
                        title: "Error",
                        description: "Failed to update reward status. Please try again.",
                        variant: "destructive"
                      });
                    } finally {
                      setIsToggling(false);
                    }
                  }}
                  disabled={isToggling}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-2" 
                onClick={() => setIsDuplicateModalOpen(true)}
              >
                <Copy className="h-4 w-4" />
                Duplicate
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700" 
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" 
                onClick={() => setIsDeleteConfirmOpen(true)}
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="py-8 space-y-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white rounded-md border shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold">{reward.rewardName}</h1>
                {reward.customers && reward.customers.length > 0 && (
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200">
                    Customer Specific
                  </Badge>
                )}
              </div>
              <p className="text-gray-500">{reward.description}</p>
            </div>
            <div className="bg-primary/5 px-6 py-3 rounded-md text-center">
              <div className="text-2xl font-bold text-primary">{reward.pointsCost}</div>
              <div className="text-sm text-gray-500">points</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Points Cost */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-blue-50 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Points Cost</div>
                  <div className="font-medium">{reward.pointsCost || '0'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redemptions */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-gray-50 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Redemptions</div>
                  <div className="font-medium">{reward.redemptionCount || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Impressions */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-blue-50 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Impressions</div>
                  <div className="font-medium">{reward.impressions || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unique Customers */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Unique Customers</div>
                  <div className="font-medium">{reward.uniqueCustomersCount || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details Card */}
        <Card className="rounded-md">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {/* Last Redeemed */}
              <div>
                <div className="text-sm text-gray-500">Last Redeemed</div>
                <div className="font-medium mt-1">
                  {formatTimestamp(reward.lastRedeemedAt) || 'Never'}
                </div>
              </div>

              {/* Status */}
              <div>
                <div className="text-sm text-gray-500">Status</div>
                <div className="mt-1">
                  <Badge 
                    variant="outline" 
                    className={`rounded-md ${
                      reward.status === 'live' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}
                  >
                    {capitalize(reward.status)}
                  </Badge>
                </div>
              </div>

              {/* PIN */}
              <div>
                <div className="text-sm text-gray-500">PIN</div>
                <div className="font-mono text-sm mt-1">{reward.pin || 'None'}</div>
              </div>

              {/* Created */}
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="font-medium mt-1">
                  {formatTimestamp(reward.createdAt)}
                </div>
              </div>
            </div>
            
            {/* Add Customer-specific section if applicable */}
            {reward.customers && reward.customers.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-purple-600" />
                  <h2 className="font-medium text-purple-800">Customer-Specific Reward</h2>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-md p-4">
                  <p className="text-sm text-purple-800 mb-2">
                    This reward is only visible to {reward.customers.length} specific customer{reward.customers.length !== 1 ? 's' : ''}:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {reward.customers.map((customerId, index) => (
                      <div key={index} className="px-3 py-1 bg-white border border-purple-200 rounded-md text-sm">
                        {customerId}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requirements & Limitations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Conditions */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-gray-600" />
                <h2 className="font-medium">Requirements</h2>
              </div>
              <div className="space-y-2">
                {Array.isArray(reward.conditions) && reward.conditions.map((condition, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm p-3 rounded-md bg-gray-50 border border-gray-100"
                  >
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-gray-700">{formatCondition(condition)}</span>
                  </div>
                ))}
                {(!reward.conditions || !Array.isArray(reward.conditions) || reward.conditions.length === 0) && (
                  <div className="text-sm text-gray-500">No special requirements</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card className="rounded-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-gray-600" />
                <h2 className="font-medium">Limitations</h2>
              </div>
              <div className="space-y-2">
                {Array.isArray(reward.limitations) && reward.limitations.map((limitation, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-2 text-sm p-3 rounded-md bg-gray-50 border border-gray-100"
                  >
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span className="text-gray-700">{formatLimitation(limitation)}</span>
                  </div>
                ))}
                {(!reward.limitations || !Array.isArray(reward.limitations) || reward.limitations.length === 0) && (
                  <div className="text-sm text-gray-500">No limitations set</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Update the Redemption History section */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Redemption History</CardTitle>
                <CardDescription>
                  {redemptions.length} total redemptions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border-t">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="w-[250px]">Customer</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptionsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : redemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Zap className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 text-lg font-medium">No redemptions yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            This reward hasn't been redeemed by any customers
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    redemptions.map((redemption) => (
                      <TableRow 
                        key={redemption.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {redemption.redemptionDate 
                                ? new Date(
                                    typeof redemption.redemptionDate === 'string' 
                                      ? redemption.redemptionDate 
                                      : redemption.redemptionDate.seconds * 1000
                                  ).toLocaleDateString()
                                : 'Unknown date'
                              }
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {redemption.redemptionDate
                                ? new Date(
                                    typeof redemption.redemptionDate === 'string' 
                                      ? redemption.redemptionDate 
                                      : redemption.redemptionDate.seconds * 1000
                                  ).toLocaleTimeString()
                                : 'Unknown time'
                              }
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {redemption.profilePictureUrl ? (
                              <img 
                                src={redemption.profilePictureUrl} 
                                alt={redemption.customerName || 'Customer'} 
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <span>{redemption.customerName || 'Unknown Customer'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="inline-block px-3 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                            <span className="text-indigo-600 font-medium">
                              {(redemption.pointsUsed ?? redemption.pointsUsed ?? 0).toLocaleString()} points
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-md px-2 py-1",
                              redemption.status === 'successful' || redemption.status === 'completed'
                                ? "bg-blue-50 text-blue-700 border-blue-200" 
                                : redemption.status === 'pending'
                                ? "bg-gray-100 text-gray-600 border-gray-200"
                                : "bg-gray-50 text-gray-500 border-gray-100"
                            )}
                          >
                            {capitalize(redemption.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Reward Dialog */}
      <CreateRewardDialog 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        defaultValues={createRewardDialogData}
        isEditing={true}
        rewardId={id as string}
      />

      {/* Duplicate Reward Dialog */}
      <CreateRewardDialog 
        open={isDuplicateModalOpen}
        onOpenChange={setIsDuplicateModalOpen}
        defaultValues={{
          ...createRewardDialogData,
          rewardName: createRewardDialogData ? `${createRewardDialogData.rewardName} (Copy)` : '',
        }}
        isEditing={false}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reward? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-100 rounded-md p-4 text-sm text-red-800">
              <strong>Warning:</strong> Deleting this reward will:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Remove it from all customer accounts</li>
                <li>Make it unavailable for future redemptions</li>
                <li>Delete all associated analytics data</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                if (!user?.uid || !id) return;
                try {
                  // Delete from merchant's rewards subcollection
                  const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', id);
                  await deleteDoc(merchantRewardRef);
                  
                  // Also delete from top-level rewards collection
                  const globalRewardRef = doc(db, 'rewards', id);
                  await deleteDoc(globalRewardRef);
                  
                  showToast({
                    title: "Reward Deleted",
                    description: "The reward has been successfully deleted.",
                  });
                  
                  // Navigate back to rewards list
                  router.push('/store');
                } catch (error) {
                  console.error("Error deleting reward:", error);
                  showToast({
                    title: "Error",
                    description: "Failed to delete reward. Please try again.",
                    variant: "destructive"
                  });
                } finally {
                  setIsDeleteConfirmOpen(false);
                }
              }}
            >
              Delete Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 