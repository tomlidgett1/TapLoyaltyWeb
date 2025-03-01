"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, BarChart, Award, CheckCircle, AlertCircle,
  Edit, Trash2, Copy, MoreVertical, Star, Settings, Key
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate } from '@/lib/date-utils'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { cn } from "@/lib/utils"

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
  programtype?: string
  pin?: string
}

export default function RewardDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [reward, setReward] = useState<RewardDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [editDialogOpen, setEditDialogOpen] = useState(false)

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

  // Prepare reward data for the edit dialog
  const prepareRewardForEdit = () => {
    if (!reward) return null
    
    return {
      id: reward.id,
      rewardName: reward.rewardName,
      description: reward.description,
      pointsCost: reward.pointsCost?.toString() || '0',
      pin: reward.pin || '',
      isActive: reward.status === 'active',
      rewardType: reward.rewardType || 'standard',
      category: reward.category || 'general',
      rewardVisibility: 'all',
      hasActivePeriod: !!(reward.startDate && reward.endDate),
      activePeriod: {
        startDate: reward.startDate || new Date().toISOString(),
        endDate: reward.endDate || new Date().toISOString(),
      },
      conditions: {
        daysSinceJoined: '',
        daysSinceLastVisit: '',
      },
      limitations: {
        totalRedemptions: reward.limitations?.totalRedemptions || '',
        perCustomerLimit: reward.limitations?.perCustomerLimit || '',
        useTimeRestrictions: !!reward.limitations?.timeRestrictions,
        timeRestrictions: reward.limitations?.timeRestrictions || {
          startTime: '',
          endTime: '',
        },
        useDayRestrictions: !!(reward.limitations?.dayRestrictions?.length > 0),
        dayRestrictions: reward.limitations?.dayRestrictions || [],
      }
    }
  }

  const formatLimitation = (limitation: any) => {
    if (!limitation) return null;
    
    // Handle the case where limitation is an object with type and value properties
    if (limitation.type && (limitation.value !== undefined || typeof limitation.value === 'object')) {
      const { type, value } = limitation;
      
      switch (type) {
        case 'totalRedemptionLimit':
          return `Maximum ${value} total redemptions`;
        case 'perCustomerLimit':
        case 'customerLimit':
          return `Limit of ${value} per customer`;
        case 'timeOfDay':
        case 'timeRestriction':
          if (typeof value === 'object') {
            const start = value.startTime || '00:00';
            const end = value.endTime || '23:59';
            return `Available from ${start} to ${end}`;
          }
          return `Time restricted: ${value}`;
        case 'dayRestriction':
        case 'daysOfWeek':
          if (Array.isArray(value)) {
            return `Available only on: ${value.join(', ')}`;
          }
          return `Day restricted: ${value}`;
        case 'activePeriod':
          if (typeof value === 'object') {
            const start = value.startDate ? formatDate(value.startDate) : 'anytime';
            const end = value.endDate ? formatDate(value.endDate) : 'no end date';
            return `Active from ${start} to ${end}`;
          }
          return `Active period: ${value}`;
        default:
          return `${type}: ${JSON.stringify(value)}`;
      }
    }
    
    // Handle the case where limitation is a direct key-value pair
    return `${limitation}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-600 bg-green-50"
      case "inactive": return "text-gray-600 bg-gray-100"
      case "archived": return "text-amber-600 bg-amber-50"
      default: return "text-gray-600 bg-gray-100"
    }
  }

  const handleEditComplete = () => {
    // Refresh the reward data after edit
    if (user?.uid && id) {
      const fetchReward = async () => {
        try {
          const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id as string)
          const rewardDoc = await getDoc(rewardRef)
          
          if (rewardDoc.exists()) {
            setReward({
              id: rewardDoc.id,
              ...rewardDoc.data()
            } as RewardDetails)
          }
        } catch (error) {
          console.error("Error refreshing reward data:", error)
        }
      }
      
      fetchReward()
    }
  }

  const handleToggleStatus = () => {
    if (user?.uid && id && reward) {
      const updatedStatus = reward.status === "active" ? "inactive" : "active"
      const updatedReward = {
        ...reward,
        status: updatedStatus
      }

      const updateReward = async () => {
        try {
          const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id as string)
          await updateDoc(rewardRef, updatedReward)
          setReward(updatedReward)
        } catch (error) {
          console.error("Error updating reward status:", error)
        }
      }

      updateReward()
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (error || !reward) {
    return (
      <div className="p-8 text-center min-h-[60vh] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-semibold text-red-800">Error</h2>
        <p className="text-red-600 mt-2">{error || "Failed to load reward details"}</p>
        <Button 
          variant="outline" 
          className="mt-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <>
      <CreateRewardDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        defaultValues={prepareRewardForEdit()}
      />
      
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-[1200px] mx-auto">
          {/* Back button and actions */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              className="gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Rewards</span>
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="gap-1"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
              
              <Button 
                variant={reward.status === "active" ? "destructive" : "default"}
                className="gap-1"
                onClick={() => handleToggleStatus()}
              >
                {reward.status === "active" ? (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Deactivate</span>
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    <span>Activate</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header card */}
              <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge className={cn(
                        "mb-3",
                        reward.status === "active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600",
                        "text-white border-none"
                      )}>
                        {reward.status === "active" ? "Live" : "Inactive"}
                      </Badge>
                      <h1 className="text-2xl font-bold text-white mb-2">{reward.rewardName}</h1>
                      <p className="text-blue-100 max-w-xl">{reward.description}</p>
                    </div>
                    
                    <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                      {reward.programtype ? (
                        <Award className="h-8 w-8 text-white" />
                      ) : (
                        <Gift className="h-8 w-8 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Points Cost</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <p className="text-xl font-semibold">{reward.pointsCost || 0}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="text-lg font-medium mt-1">
                        {reward.programtype ? "Program" : "Individual Reward"}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="text-lg font-medium mt-1">{formatDate(reward.createdAt)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Redemptions</p>
                      <p className="text-lg font-medium mt-1">{reward.redemptionCount || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Conditions and Limitations */}
              {(reward.conditions?.length > 0 || (reward.limitations && (Array.isArray(reward.limitations) ? reward.limitations.length > 0 : Object.keys(reward.limitations).length > 0))) && (
                <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Conditions Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-medium">Conditions</h3>
                        </div>
                        
                        {reward.conditions && reward.conditions.length > 0 ? (
                          <div className="space-y-3 bg-blue-50 rounded-lg p-4">
                            {reward.conditions.map((condition, index) => (
                              <div key={index} className="flex items-start gap-3 p-2 bg-white rounded-md shadow-sm">
                                <div className="mt-0.5">
                                  <Users className="h-4 w-4 text-gray-500" />
                                </div>
                                <p className="text-sm">
                                  {condition.type === 'minimumSpend' && `Minimum spend of $${condition.value || condition.amount}`}
                                  {condition.type === 'minimumLifetimeSpend' && `Total lifetime spend of $${condition.value}`}
                                  {condition.type === 'minimumTransactions' && `Minimum ${condition.value} transactions`}
                                  {condition.type === 'maximumTransactions' && `Maximum ${condition.value} transactions`}
                                  {condition.type === 'minimumPointsBalance' && `Minimum ${condition.value} points balance`}
                                  {condition.type === 'membershipLevel' && `${condition.value} membership level required`}
                                  {condition.type === 'daysSinceJoined' && `Account age: ${condition.value} days`}
                                  {condition.type === 'daysSinceLastVisit' && `${condition.value} days since last visit`}
                                  {condition.type === 'newCustomer' && 'New customers only'}
                                  {!['minimumSpend', 'minimumLifetimeSpend', 'minimumTransactions', 'maximumTransactions', 
                                     'minimumPointsBalance', 'membershipLevel', 'daysSinceJoined', 'daysSinceLastVisit', 'newCustomer'].includes(condition.type) && 
                                     `${condition.type}: ${JSON.stringify(condition.value || condition.amount)}`}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">No conditions set</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Limitations Section */}
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                            <Settings className="h-4 w-4 text-blue-600" />
                          </div>
                          <h3 className="text-lg font-medium">Limitations</h3>
                        </div>
                        
                        {reward.limitations && (Array.isArray(reward.limitations) ? reward.limitations.length > 0 : Object.keys(reward.limitations).length > 0) ? (
                          <div className="space-y-3 bg-blue-50 rounded-lg p-4">
                            {Array.isArray(reward.limitations) ? (
                              reward.limitations.map((limitation, index) => (
                                <div key={index} className="flex items-start gap-3 p-2 bg-white rounded-md shadow-sm">
                                  <div className="mt-0.5">
                                    <Settings className="h-4 w-4 text-gray-500" />
                                  </div>
                                  <p className="text-sm">{formatLimitation(limitation)}</p>
                                </div>
                              ))
                            ) : (
                              Object.entries(reward.limitations).map(([key, value]) => (
                                <div key={key} className="flex items-start gap-3 p-2 bg-white rounded-md shadow-sm">
                                  <div className="mt-0.5">
                                    <Settings className="h-4 w-4 text-gray-500" />
                                  </div>
                                  <p className="text-sm">{formatLimitation({ type: key, value })}</p>
                                </div>
                              ))
                            )}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4 text-center">
                            <p className="text-sm text-muted-foreground">No limitations set</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Recent Redemptions */}
              <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle>Recent Redemptions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <Table>
                    <TableHeader className="bg-blue-50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reward.redemptionCount > 0 ? (
                        Array.from({ length: Math.min(5, reward.redemptionCount) }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>{formatDate(new Date(Date.now() - i * 86400000).toString())}</TableCell>
                            <TableCell>Customer #{i+1}</TableCell>
                            <TableCell>{reward.pointsCost}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-50 text-green-700">Completed</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                            No redemptions yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
            
            {/* Right column - Stats and details */}
            <div className="space-y-6">
              {/* Stats Card */}
              <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Performance</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm">Redemption Rate</span>
                      </div>
                      <span className="font-medium">12.4%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm">Customer Engagement</span>
                      </div>
                      <span className="font-medium">High</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                          <BarChart className="h-4 w-4 text-blue-600" />
                        </div>
                        <span className="text-sm">Popularity Rank</span>
                      </div>
                      <span className="font-medium">#3</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Details Card */}
              <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(reward.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Last Updated</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(reward.updatedAt)}
                        </p>
                      </div>
                    </div>
                    
                    {reward.pin && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Key className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Redemption PIN</p>
                          <p className="text-xs text-muted-foreground">
                            {reward.pin}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {reward.startDate && reward.endDate && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Active Period</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(reward.startDate)} - {formatDate(reward.endDate)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              {/* Actions Card */}
              <Card className="rounded-lg overflow-hidden border-none shadow-sm">
                <CardHeader className="pb-0">
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                    
                    <Button className="w-full justify-start" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Visibility
                    </Button>
                    
                    <Button className="w-full justify-start text-red-600" variant="outline">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Reward
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 