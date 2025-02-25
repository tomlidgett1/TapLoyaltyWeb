"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, BarChart, Award, CheckCircle, AlertCircle
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { showToast } from "@/components/ui/use-toast"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  // Updated helper function to safely format dates with better type checking
  const safeFormatDate = (dateValue: any) => {
    return formatDate(dateValue);
  };

  // Add these helper functions at the top of your component
  const capitalize = (str?: string) => {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1);
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

  // Update the createRewardDialogData object with more complete data
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
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-8">
        <Button 
          variant="ghost" 
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors" 
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to Rewards</span>
        </Button>
        
        {!loading && reward && (
          <Button 
            onClick={() => setIsEditModalOpen(true)}
            className="bg-primary hover:bg-primary/90"
          >
            Edit Reward
          </Button>
        )}
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-muted-foreground">Loading reward details...</p>
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      ) : reward ? (
        <div className="space-y-8">
          {/* Hero section */}
          <Card className="overflow-hidden border-none shadow-md">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-8">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={
                      reward.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 
                      reward.status === 'inactive' ? 'bg-amber-100 text-amber-800 border-amber-200' : 
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }>
                      {capitalize(reward.status)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{reward.category}</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">{reward.rewardName}</h1>
                  <p className="text-muted-foreground max-w-2xl">{reward.description}</p>
                </div>
                
                <div className="flex items-center justify-center bg-white shadow-sm rounded-lg p-4 min-w-[140px]">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{reward.pointsCost}</div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Tabs for details and redemptions */}
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="details">Reward Details</TabsTrigger>
              <TabsTrigger value="redemptions">Redemption History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Stats cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Gift className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Reward Type</p>
                        <p className="text-lg font-semibold mt-1">
                          {reward.rewardType ? capitalize(reward.rewardType) : 'Unknown'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Redemptions</p>
                        <p className="text-lg font-semibold mt-1">
                          {reward.redemptionCount || 0} claimed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 p-3 rounded-full">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Active Period</p>
                        <div className="text-lg font-semibold mt-1">
                          {safeFormatDate(reward.startDate)}
                          {reward.endDate && (
                            <>
                              <span className="mx-2 text-muted-foreground">→</span>
                              {safeFormatDate(reward.endDate)}
                            </>
                          )}
                          {!reward.endDate && <span className="text-sm text-muted-foreground ml-2">(ongoing)</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Additional details */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    {reward.conditions && reward.conditions.length > 0 && (
                      <>
                        <dt className="text-sm font-medium text-muted-foreground">Conditions</dt>
                        <dd className="text-sm">
                          <ul className="list-disc pl-5 space-y-1">
                            {reward.conditions.map((condition, index) => (
                              <li key={index}>{condition.description || JSON.stringify(condition)}</li>
                            ))}
                          </ul>
                        </dd>
                      </>
                    )}
                    
                    {reward.limitations && Object.keys(reward.limitations).length > 0 && (
                      <>
                        <dt className="text-sm font-medium text-muted-foreground">Limitations</dt>
                        <dd className="text-sm">
                          <ul className="list-disc pl-5 space-y-1">
                            {reward.limitations.totalRedemptionLimit && (
                              <li>Maximum {reward.limitations.totalRedemptionLimit} total redemptions</li>
                            )}
                            {reward.limitations.perCustomerLimit && (
                              <li>Limit of {reward.limitations.perCustomerLimit} per customer</li>
                            )}
                          </ul>
                        </dd>
                      </>
                    )}
                    
                    <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                    <dd className="text-sm">{safeFormatDate(reward.createdAt)}</dd>
                    
                    <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                    <dd className="text-sm">{safeFormatDate(reward.updatedAt)}</dd>
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="redemptions">
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Redemption History</span>
                    {redemptions.length > 0 && redemptions[0].isMockData && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Mock Data
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    View all customer redemptions for this reward
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {redemptionsLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
                    </div>
                  ) : redemptions.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Award className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p>No redemptions found for this reward</p>
                    </div>
                  ) : (
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Location</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {redemptions.map((redemption) => (
                            <TableRow key={redemption.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium">
                                {redemption.customerName || 'Unknown customer'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {redemption.customerEmail || redemption.customerPhone || 'No contact info'}
                              </TableCell>
                              <TableCell>
                                {safeFormatDate(redemption.redeemedAt)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  redemption.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' : 
                                  redemption.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                  'bg-gray-50 text-gray-700 border-gray-200'
                                }>
                                  {capitalize(redemption.status)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {redemption.locationName || 'Online'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              <p>Reward not found</p>
            </div>
          </CardContent>
        </Card>
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