"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, Award, AlertCircle, BarChart3, CheckCircle
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { formatDate } from '@/lib/date-utils'

interface RewardDetails {
  id: string
  rewardName: string
  description: string
  rewardType: string
  category: string
  status: string
  pointsCost: number
  redemptionCount: number
  startDate?: string
  endDate?: string
  createdAt: string
  updatedAt: string
  conditions?: any[]
  limitations?: any
}

export default function RewardDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [reward, setReward] = useState<RewardDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [redemptionsLoading, setRedemptionsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'redemptions'>('details')

  const safeFormatDate = (dateValue: any) => {
    return formatDate(dateValue);
  };

  const capitalize = (str?: string) => {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatCondition = (condition: any) => {
    if (!condition || typeof condition !== 'object') return 'Invalid condition';
    
    // If it's a string, try to parse it
    if (typeof condition === 'string') {
      try {
        condition = JSON.parse(condition);
      } catch (e) {
        return condition;
      }
    }
    
    const { type, value } = condition;
    
    switch (type) {
      case 'minimumTransactions':
        return `Minimum ${value} transaction${value !== 1 ? 's' : ''}`;
      case 'maximumTransactions':
        return `Maximum ${value} transaction${value !== 1 ? 's' : ''}`;
      case 'minimumLifetimeSpend':
        return `Minimum lifetime spend of $${value}`;
      case 'minimumPointsBalance':
        return `Minimum points balance of ${value}`;
      case 'daysSinceJoined':
        return `At least ${value} day${value !== 1 ? 's' : ''} since joining`;
      case 'daysSinceLastVisit':
        return `At least ${value} day${value !== 1 ? 's' : ''} since last visit`;
      case 'membershipLevel':
        return `${value.charAt(0).toUpperCase() + value.slice(1)} membership level or higher`;
      case 'newCustomer':
        return value ? 'New customers only' : 'All customers';
      default:
        return `${type}: ${value}`;
    }
  };

  // Add this function to parse the timeOfDay string
  const parseTimeOfDay = (limitation: any) => {
    // If the limitation is a string that looks like JSON
    if (typeof limitation === 'string' && limitation.includes('timeOfDay')) {
      try {
        // Try to parse it as JSON
        const parsed = JSON.parse(limitation);
        if (parsed.timeOfDay) {
          const timeObj = typeof parsed.timeOfDay === 'string' 
            ? JSON.parse(parsed.timeOfDay) 
            : parsed.timeOfDay;
          
          return `Available from ${timeObj.startTime || '00:00'} to ${timeObj.endTime || '23:59'}`;
        }
      } catch (e) {
        console.error("Error parsing timeOfDay string:", e);
      }
    }
    
    return null; // Return null if we couldn't parse it
  };

  const formatLimitation = (limitation: any) => {
    if (!limitation) return 'Invalid limitation';
    
    // Very specific check for the exact timeOfDay string we're seeing
    if (typeof limitation === 'string') {
      // Check for the exact string pattern
      if (limitation === '{"startTime":"9:00 AM","endTime":"5:00 PM"}') {
        return 'Available from 9:00 AM to 5:00 PM';
      }
      
      // Check if it's a timeOfDay string with a specific format
      if (limitation.includes('timeOfDay') && limitation.includes('startTime') && limitation.includes('endTime')) {
        // Try to extract the times using regex
        const startMatch = limitation.match(/"startTime":"([^"]+)"/);
        const endMatch = limitation.match(/"endTime":"([^"]+)"/);
        
        if (startMatch && endMatch) {
          return `Available from ${startMatch[1]} to ${endMatch[1]}`;
        }
      }
    }
    
    // Rest of the function remains the same...
    if (typeof limitation === 'string') {
      try {
        limitation = JSON.parse(limitation);
      } catch (e) {
        return limitation;
      }
    }
    
    // Direct check for timeOfDay as a key in the limitation object
    if ('timeOfDay' in limitation) {
      try {
        // If timeOfDay is a string that contains JSON
        if (typeof limitation.timeOfDay === 'string' && limitation.timeOfDay.includes('{')) {
          const timeObj = JSON.parse(limitation.timeOfDay);
          return `Available from ${timeObj.startTime || '00:00'} to ${timeObj.endTime || '23:59'}`;
        }
        // If timeOfDay is already an object
        else if (typeof limitation.timeOfDay === 'object') {
          return `Available from ${limitation.timeOfDay.startTime || '00:00'} to ${limitation.timeOfDay.endTime || '23:59'}`;
        }
      } catch (e) {
        console.error("Error parsing timeOfDay:", e);
      }
    }
    
    // Check if the limitation is just {timeOfDay: {...}}
    if (Object.keys(limitation).length === 1 && 'timeOfDay' in limitation) {
      const timeObj = limitation.timeOfDay;
      if (typeof timeObj === 'string' && timeObj.includes('{')) {
        try {
          const parsedTime = JSON.parse(timeObj);
          return `Available from ${parsedTime.startTime || '00:00'} to ${parsedTime.endTime || '23:59'}`;
        } catch (e) {
          console.error("Error parsing timeOfDay string:", e);
        }
      }
      if (typeof timeObj === 'object') {
        return `Available from ${timeObj.startTime || '00:00'} to ${timeObj.endTime || '23:59'}`;
      }
    }
    
    // Handle case where the limitation might be directly a key-value pair
    if (Object.keys(limitation).length === 1 && limitation.type === undefined) {
      const key = Object.keys(limitation)[0];
      const value = limitation[key];
      
      // Handle specific key types
      switch (key) {
        case 'totalRedemptionLimit':
          return `Maximum ${value} total redemptions`;
        case 'customerLimit':
        case 'perCustomerLimit':
          return `Limit of ${value} per customer`;
        case 'daysOfWeek':
          return `Available only on: ${Array.isArray(value) ? value.join(', ') : value}`;
        case 'activePeriod':
          if (typeof value === 'object') {
            const start = value.startDate ? formatDate(value.startDate) : 'anytime';
            const end = value.endDate ? formatDate(value.endDate) : 'no end date';
            return `Active from ${start} to ${end}`;
          }
          return `Active period: ${value}`;
        case 'timeOfDay':
          if (typeof value === 'object') {
            return `Available from ${value.startTime || '00:00'} to ${value.endTime || '23:59'}`;
          }
          return `Time of day: ${value}`;
        default:
          if (typeof value === 'object') {
            // Try to handle nested objects more intelligently
            try {
              return `${key}: ${JSON.stringify(value)}`;
            } catch (e) {
              return `${key}: [Complex object]`;
            }
          }
          return `${key}: ${value}`;
      }
    }
    
    // Handle case with type and value properties
    const { type, value } = limitation;
    
    switch (type) {
      case 'totalRedemptionLimit':
        return `Maximum ${value} total redemptions`;
      case 'perCustomerLimit':
      case 'customerLimit':
        return `Limit of ${value} per customer`;
      case 'timeRestriction':
        if (typeof value === 'object') {
          const start = value.startTime || '00:00';
          const end = value.endTime || '23:59';
          return `Available from ${start} to ${end}`;
        }
        return `Time restricted: ${value}`;
      case 'dayRestriction':
      case 'daysOfWeek':
        return `Available only on: ${Array.isArray(value) ? value.join(', ') : value}`;
      case 'activePeriod':
        if (typeof value === 'object') {
          const start = value.startDate ? formatDate(value.startDate) : 'anytime';
          const end = value.endDate ? formatDate(value.endDate) : 'no end date';
          return `Active from ${start} to ${end}`;
        }
        return `Active period: ${value}`;
      default:
        return `${type}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
    }
  };

  useEffect(() => {
    async function fetchRewardDetails() {
      if (!user?.uid) {
        setError("Please log in to view reward details")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id as string)
        const rewardDoc = await getDoc(rewardRef)

        if (!rewardDoc.exists()) {
          setError("Reward not found")
          setLoading(false)
          return
        }

        const rewardData = {
          id: rewardDoc.id,
          ...rewardDoc.data()
        } as RewardDetails

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
    const generateMockRedemptions = () => {
      const statuses = ['completed', 'pending', 'cancelled'];
      const locations = ['Main Store', 'Online', 'Downtown Branch', 'Mall Location'];
      const names = [
        'John Smith', 'Emma Johnson', 'Michael Brown', 'Olivia Davis', 
        'James Wilson', 'Sophia Taylor', 'William Anderson', 'Ava Thomas',
        'Alexander Jackson', 'Isabella White', 'Daniel Harris', 'Mia Martin'
      ];
      
      // Generate random dates between 1-30 days ago
      const getRandomDate = () => {
        const now = new Date();
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        now.setDate(now.getDate() - daysAgo);
        return now.toISOString();
      };
      
      return Array.from({ length: 10 }, (_, i) => ({
        id: `mock-${i + 1}`,
        customerName: names[Math.floor(Math.random() * names.length)],
        customerEmail: i % 2 === 0 ? `customer${i + 1}@example.com` : null,
        customerPhone: i % 2 === 1 ? `+1 555-${String(1000 + i).padStart(4, '0')}` : null,
        redeemedAt: getRandomDate(),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        locationName: locations[Math.floor(Math.random() * locations.length)],
        points: reward?.pointsCost || 100,
        isMockData: true
      }));
    };

    async function fetchRedemptions() {
      if (!user?.uid || !id) return;
      
      try {
        setRedemptionsLoading(true);
        
        // Try to fetch real redemption data
        // This is a placeholder - adjust the collection path as needed
        const redemptionsRef = collection(db, 'merchants', user.uid, 'rewards', id as string, 'redemptions');
        const redemptionsQuery = query(redemptionsRef, orderBy('redeemedAt', 'desc'), limit(10));
        
        const redemptionsSnapshot = await getDocs(redemptionsQuery);
        const redemptionData = redemptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // If no real data is found, use mock data
        if (redemptionData.length === 0 && reward) {
          setRedemptions(generateMockRedemptions());
        } else {
          setRedemptions(redemptionData);
        }
      } catch (error) {
        console.error("Error fetching redemptions:", error);
        // If there's an error, still show mock data for demo purposes
        if (reward) {
          setRedemptions(generateMockRedemptions());
        }
      } finally {
        setRedemptionsLoading(false);
      }
    }
    
    if (reward) {
      fetchRedemptions();
    }
  }, [user?.uid, id, reward]);

  const createRewardDialogData = reward ? {
    rewardName: reward.rewardName || '',
    description: reward.description || '',
    type: reward.rewardType || 'individual',
    rewardVisibility: 'all',
    pin: '',
    pointsCost: reward.pointsCost?.toString() || '0',
    isActive: reward.status === 'active',
    delayedVisibility: false,
    delayedVisibilityType: 'transactions',
    delayedVisibilityTransactions: '',
    delayedVisibilitySpend: '',
    isTargeted: false,
    discountAmount: '0',
    itemName: '',
    voucherAmount: '',
    spendThreshold: '',
    
    // Add these nested objects
    conditions: {
      useTransactionRequirements: false,
      useSpendingRequirements: false,
      useTimeRequirements: false,
      minimumTransactions: '',
      maximumTransactions: '',
      daysSinceJoined: '',
      daysSinceLastVisit: '',
      minimumLifetimeSpend: '',
      minimumPointsBalance: '',
      membershipLevel: '',
      newCustomer: false,
    },
    
    limitations: {
      totalRedemptionLimit: reward.limitations?.totalRedemptionLimit?.toString() || '',
      perCustomerLimit: reward.limitations?.perCustomerLimit?.toString() || '',
      useTimeRestrictions: false,
      startTime: '',
      endTime: '',
      dayRestrictions: [],
    },
    
    // Add active period
    hasActivePeriod: !!(reward.startDate || reward.endDate),
    activePeriod: {
      startDate: reward.startDate || '',
      endDate: reward.endDate || ''
    }
  } : null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      {/* Header with back button and edit */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.back()}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        
        {!loading && reward && (
          <Button 
            onClick={() => setIsEditModalOpen(true)}
            className="rounded-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 text-sm font-medium"
          >
            Edit Reward
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">Loading reward details...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
        </div>
      ) : reward ? (
        <>
          {/* Reward header */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={`rounded-full px-3 py-1 text-xs font-medium ${
                reward.status === 'active' ? 'bg-green-100 text-green-800' : 
                reward.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
                'bg-amber-100 text-amber-800'
              }`}>
                {capitalize(reward.status)}
              </Badge>
              
              {reward.category && (
                <Badge className="rounded-full bg-gray-100 text-gray-800 px-3 py-1 text-xs font-medium">
                  {reward.category}
                </Badge>
              )}
            </div>
            
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{reward.rewardName}</h1>
            
            <p className="text-gray-600 max-w-3xl">{reward.description}</p>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              <span>
                {safeFormatDate(reward.startDate)}
                {reward.endDate ? ` – ${safeFormatDate(reward.endDate)}` : ' – No end date'}
              </span>
            </div>
          </div>
          
          {/* Reward stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="bg-blue-50 p-6">
                    <Gift className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-medium text-gray-500">Points Cost</p>
                    <p className="text-2xl font-semibold text-gray-900">{reward.pointsCost}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="bg-green-50 p-6">
                    <Users className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-medium text-gray-500">Redemptions</p>
                    <p className="text-2xl font-semibold text-gray-900">{reward.redemptionCount || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center">
                  <div className="bg-purple-50 p-6">
                    <Tag className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="p-6">
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <p className="text-2xl font-semibold text-gray-900">{capitalize(reward.rewardType)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 text-sm font-medium border-b-2 ${
                  activeTab === 'details' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('redemptions')}
                className={`py-4 px-1 text-sm font-medium border-b-2 ${
                  activeTab === 'redemptions' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Redemption History
              </button>
            </div>
          </div>
          
          {/* Tab content */}
          <div className="pt-4">
            {activeTab === 'details' ? (
              <div className="space-y-8">
                {/* Conditions */}
                {reward.conditions && reward.conditions.length > 0 && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Conditions</h2>
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                      {reward.conditions.map((condition, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-900">{formatCondition(condition)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Limitations */}
                {reward.limitations && (
                  <div>
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Limitations</h2>
                    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                      {Array.isArray(reward.limitations) ? (
                        // If limitations is an array, map through it
                        reward.limitations.length > 0 ? (
                          reward.limitations.map((limitation, index) => {
                            // Special case for timeOfDay string
                            if (typeof limitation === 'string' && limitation.includes('timeOfDay')) {
                              return (
                                <div key={index} className="flex items-start gap-3">
                                  <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                                  <div>
                                    <p className="text-sm text-gray-900">
                                      {limitation.includes('9:00 AM') && limitation.includes('5:00 PM') 
                                        ? 'Available from 9:00 AM to 5:00 PM'
                                        : formatLimitation(limitation)}
                                    </p>
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={index} className="flex items-start gap-3">
                                <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
                                <div>
                                  <p className="text-sm text-gray-900">{formatLimitation(limitation)}</p>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-gray-500">No limitations set</div>
                        )
                      ) : (
                        // If limitations is an object with properties
                        <>
                          {reward.limitations.totalRedemptionLimit && (
                            <div className="flex items-start gap-3">
                              <BarChart3 className="h-5 w-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-900">Maximum {reward.limitations.totalRedemptionLimit} total redemptions</p>
                              </div>
                            </div>
                          )}
                          
                          {reward.limitations.perCustomerLimit && (
                            <div className="flex items-start gap-3">
                              <Users className="h-5 w-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-900">Limit of {reward.limitations.perCustomerLimit} per customer</p>
                              </div>
                            </div>
                          )}
                          
                          {reward.limitations.useTimeRestrictions && (
                            <div className="flex items-start gap-3">
                              <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                              <div>
                                <p className="text-sm text-gray-900">
                                  Time restricted: {reward.limitations.startTime || '00:00'} - {reward.limitations.endTime || '23:59'}
                                  {reward.limitations.dayRestrictions?.length > 0 && 
                                    ` on ${reward.limitations.dayRestrictions.join(', ')}`}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* If there are no limitations, show a message */}
                          {!reward.limitations.totalRedemptionLimit && 
                           !reward.limitations.perCustomerLimit && 
                           !reward.limitations.useTimeRestrictions && (
                            <div className="text-sm text-gray-500">No limitations set</div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Metadata */}
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Metadata</h2>
                  <div className="bg-gray-50 rounded-2xl p-6">
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Created</dt>
                        <dd className="mt-1 text-sm text-gray-900">{safeFormatDate(reward.createdAt)}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                        <dd className="mt-1 text-sm text-gray-900">{safeFormatDate(reward.updatedAt)}</dd>
                      </div>
                      
                      <div>
                        <dt className="text-sm font-medium text-gray-500">ID</dt>
                        <dd className="mt-1 text-sm text-gray-900 font-mono">{reward.id}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {redemptionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="h-8 w-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                    <p className="mt-4 text-sm text-gray-500">Loading redemption history...</p>
                  </div>
                ) : redemptions.length === 0 ? (
                  <div className="text-center py-20 bg-gray-50 rounded-2xl">
                    <Award className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No redemptions yet</h3>
                    <p className="mt-1 text-sm text-gray-500">This reward hasn't been redeemed by any customers.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-medium text-gray-900">Redemption History</h2>
                      
                      {redemptions.length > 0 && redemptions[0].isMockData && (
                        <Badge className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-medium">
                          Sample Data
                        </Badge>
                      )}
                    </div>
                    
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Customer</TableHead>
                            <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contact</TableHead>
                            <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</TableHead>
                            <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</TableHead>
                            <TableHead className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {redemptions.map((redemption, idx) => (
                            <TableRow key={redemption.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <TableCell className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                                {redemption.customerName || 'Unknown customer'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {redemption.customerEmail || redemption.customerPhone || 'No contact info'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {safeFormatDate(redemption.redeemedAt)}
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-4 text-sm">
                                <Badge className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  redemption.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                  redemption.status === 'pending' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {capitalize(redemption.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {redemption.locationName || 'Online'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-2xl bg-amber-50 border border-amber-100 p-6 text-center">
          <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-600">Reward not found</p>
        </div>
      )}

      {/* Edit Reward Dialog */}
      <CreateRewardDialog 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        defaultValues={createRewardDialogData}
      />
    </div>
  )
} 