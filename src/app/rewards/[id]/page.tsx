"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, BarChart, Award, CheckCircle, AlertCircle,
  Edit, Trash2, Copy, MoreVertical, Star, Settings
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
      
      <div className="p-6">
        <div className="max-w-[1200px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-9 w-9 p-0 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-semibold">{reward.rewardName}</h1>
                  <Badge className={getStatusColor(reward.status)}>
                    {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                  </Badge>
                  {reward.programtype === 'coffee' && (
                    <Badge className="bg-amber-50 text-amber-700">Coffee Program</Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {reward.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-transparent border-b w-full justify-start h-10 p-0">
              <TabsTrigger 
                value="overview" 
                className="h-10 px-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="redemptions" 
                className="h-10 px-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Redemptions
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="h-10 px-4 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Analytics
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Details */}
                <Card className="md:col-span-2">
                  <CardContent className="p-6">
                    <h2 className="text-lg font-medium mb-4">Reward Details</h2>
                    
                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium mt-1">{reward.category || "Uncategorized"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium mt-1">{reward.rewardType || "Standard"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Points Cost</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="h-4 w-4 text-purple-500" />
                          <p className="font-medium">{reward.pointsCost?.toLocaleString() || '0'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Redemptions</p>
                        <div className="flex items-center gap-2 mt-1">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <p className="font-medium">{reward.redemptionCount || 0}</p>
                        </div>
                      </div>
                      {reward.startDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">Start Date</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <p className="font-medium">{formatDate(reward.startDate)}</p>
                          </div>
                        </div>
                      )}
                      {reward.endDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">End Date</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <p className="font-medium">{formatDate(reward.endDate)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Conditions and Limitations */}
                    {(reward.conditions?.length > 0 || (reward.limitations && (Array.isArray(reward.limitations) ? reward.limitations.length > 0 : Object.keys(reward.limitations).length > 0))) && (
                      <>
                        <Separator className="my-6" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Conditions Section */}
                          <div>
                            <h3 className="text-md font-medium mb-4">Conditions</h3>
                            {reward.conditions && reward.conditions.length > 0 ? (
                              <div className="space-y-3">
                                {reward.conditions.map((condition, index) => (
                                  <div key={index} className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-gray-400" />
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
                              <p className="text-sm text-muted-foreground">No conditions set</p>
                            )}
                          </div>
                          
                          {/* Limitations Section */}
                          <div>
                            <h3 className="text-md font-medium mb-4">Limitations</h3>
                            {reward.limitations && (Array.isArray(reward.limitations) ? reward.limitations.length > 0 : Object.keys(reward.limitations).length > 0) ? (
                              <div className="space-y-3">
                                {Array.isArray(reward.limitations) ? (
                                  // Handle array format
                                  reward.limitations.map((limitation, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <Settings className="h-4 w-4 text-gray-400" />
                                      <p className="text-sm">{formatLimitation(limitation)}</p>
                                    </div>
                                  ))
                                ) : (
                                  // Handle object format
                                  Object.entries(reward.limitations).map(([key, value]) => (
                                    <div key={key} className="flex items-center gap-2">
                                      <Settings className="h-4 w-4 text-gray-400" />
                                      <p className="text-sm">{formatLimitation({ type: key, value })}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No limitations set</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                
                {/* Stats Card */}
                <div className="space-y-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Quick Stats</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-green-50 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            </div>
                            <span className="text-sm">Redemption Rate</span>
                          </div>
                          <span className="font-medium">12.4%</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="text-sm">Unique Customers</span>
                          </div>
                          <span className="font-medium">28</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center">
                              <Zap className="h-4 w-4 text-purple-500" />
                            </div>
                            <span className="text-sm">Points Spent</span>
                          </div>
                          <span className="font-medium">{((reward.pointsCost || 0) * (reward.redemptionCount || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Created</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(reward.createdAt)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Clock className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Last Updated</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(reward.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="redemptions" className="pt-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium mb-4">Recent Redemptions</h2>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            No redemptions yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analytics" className="pt-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-lg font-medium mb-4">Analytics</h2>
                  
                  <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
                    <div className="text-center">
                      <BarChart className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">Analytics coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
} 