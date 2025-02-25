"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Gift, 
  Settings,
  MessageSquare,
  ImagePlus,
  Clock,
  CheckCircle2,
  XCircle,
  Archive,
  Eye,
  Edit,
  Copy,
  Trash2,
  Sparkles,
  Users,
  Coffee
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { formatDate } from '@/lib/date-utils'

// Update type definition for rewards
interface Reward {
  id: string
  rewardName: string
  description: string
  type: ItemType
  rewardType: RewardSubType
  category: string
  status: string
  pointsCost: number
  redemptionCount: number
  lastModified: string
  startDate?: string
  endDate?: string
  merchantId: string
  conditions?: any[]
  limitations?: any
  createdAt: string
  updatedAt: string
  programtype?: string
}

type ItemType = "reward" | "rule" | "message" | "banner"
type StatusType = "all" | "active" | "inactive" | "archived"
type RewardSubType = "all" | "individual" | "program" | "customer"

export default function StorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [itemType, setItemType] = useState<ItemType>("reward")
  const [status, setStatus] = useState<StatusType>("all")
  const [rewardSubType, setRewardSubType] = useState<RewardSubType>("individual")
  const [items, setItems] = useState<Reward[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRewards() {
      if (!user?.uid) {
        console.log('No user logged in')
        setError('Please log in to view rewards')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        console.log('Fetching rewards for merchant:', user.uid)
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const rewardsSnapshot = await getDocs(rewardsRef)
        
        console.log('Number of rewards:', rewardsSnapshot.size)

        const fetchedRewards = rewardsSnapshot.docs.map(doc => {
          const data = doc.data()
          console.log('Reward data:', data)
          return {
            id: doc.id,
            ...data,
            type: 'reward',
            lastModified: data.updatedAt,
          }
        }) as Reward[]

        console.log('Processed rewards:', fetchedRewards)
        setItems(fetchedRewards)
      } catch (error) {
        console.error('Error fetching rewards:', error)
        setError(error instanceof Error ? error.message : 'Failed to fetch rewards')
      } finally {
        setLoading(false)
      }
    }

    fetchRewards()
  }, [user?.uid])

  const getIcon = (type: string) => {
    switch (type) {
      case "reward":
        return Gift
      case "rule":
        return Settings
      case "message":
        return MessageSquare
      case "banner":
        return ImagePlus
      default:
        return Gift
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-50"
      case "inactive":
        return "text-gray-600 bg-gray-100"
      case "archived":
        return "text-amber-600 bg-amber-50"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getProgramCards = (items: Reward[]) => {
    console.log('Checking for coffee programs...');
    const coffeeRewards = items.filter(item => item.programtype === 'coffee');
    console.log('Coffee rewards found:', coffeeRewards);
    
    const hasCoffeeProgram = coffeeRewards.length > 0;
    console.log('Has coffee program:', hasCoffeeProgram);
    
    const programs = {
      coffee: hasCoffeeProgram,
    };

    return programs;
  };

  const filteredItems = items.filter(item => {
    console.log('Filtering item:', item);
    if (item.type !== itemType) {
      console.log('Wrong type');
      return false;
    }
    if (itemType === "reward") {
      console.log('Reward subtype:', rewardSubType);
      if (rewardSubType === "program") {
        // Show only program rewards
        return item.programtype === 'coffee';
      } else if (rewardSubType === "individual") {
        // Show only non-program rewards
        return !item.programtype;
      } else if (rewardSubType !== "all") {
        return false;
      }
    }
    if (status !== "all" && item.status !== status) return false;
    if (searchQuery && !item.rewardName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleViewReward = (rewardId: string) => {
    router.push(`/rewards/${rewardId}`)
  }

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">My Store</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage all your loyalty program content in one place
              </p>
            </div>
          </div>
        </div>

        <Tabs 
          defaultValue="reward" 
          value={itemType}
          onValueChange={(value) => setItemType(value as ItemType)}
          className="w-[600px]"
        >
          <TabsList className="bg-[#F5F5F7] p-1 rounded-lg w-full">
            <TabsTrigger value="reward" className="flex-1">
              <Gift className="h-4 w-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="rule" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="message" className="flex-1">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="banner" className="flex-1">
              <ImagePlus className="h-4 w-4 mr-2" />
              Banners
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <div className="p-4 border-b space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search content..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {itemType === "reward" && (
                <Tabs 
                  defaultValue="all" 
                  value={rewardSubType}
                  onValueChange={(value) => setRewardSubType(value as RewardSubType)}
                  className="flex-1 max-w-[600px]"
                >
                  <TabsList className="bg-[#F5F5F7] p-1 rounded-lg w-full">
                    <TabsTrigger value="all" className="flex-1">
                      <Gift className="h-4 w-4 mr-2" />
                      All Rewards
                    </TabsTrigger>
                    <TabsTrigger value="individual" className="flex-1">
                      <Gift className="h-4 w-4 mr-2" />
                      Individual
                    </TabsTrigger>
                    <TabsTrigger value="program" className="flex-1">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Programs
                    </TabsTrigger>
                    <TabsTrigger value="customer" className="flex-1">
                      <Users className="h-4 w-4 mr-2" />
                      Customer
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              <div className="w-px h-8 bg-gray-200 mx-2" />

              <Tabs 
                defaultValue="all" 
                value={status}
                onValueChange={(value) => setStatus(value as StatusType)}
                className="min-w-[300px]"
              >
                <TabsList className="bg-[#F5F5F7] p-1 rounded-lg w-full">
                  <TabsTrigger value="all" className="flex-1">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="active" className="flex-1">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Active
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="flex-1">
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                    Inactive
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="flex-1">
                    <Archive className="h-3.5 w-3.5 mr-1.5" />
                    Archived
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">
                Loading rewards...
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-500">
                Error: {error}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery || status !== 'all' 
                  ? 'No matching items found'
                  : 'No rewards created yet'}
              </div>
            ) : (
              <>
                {rewardSubType === "program" ? (
                  <div className="divide-y">
                    {items.some(item => item.programtype === 'coffee') ? (
                      <div className="p-6">
                        <Card className="overflow-hidden">
                          <div className="flex items-start p-6 gap-6">
                            <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                              <Coffee className="h-6 w-6 text-amber-600" />
                            </div>

                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-medium">Coffee Program</h3>
                                  <p className="text-sm text-gray-500 mt-1">
                                    Buy X coffees, get one free
                                  </p>
                                </div>
                                <Badge variant="secondary" className="bg-green-50 text-green-700">
                                  Active
                                </Badge>
                              </div>

                              <div className="flex gap-6 mt-4 pt-4 border-t">
                                <div>
                                  <p className="text-sm font-medium">
                                    {items.filter(item => item.programtype === 'coffee').length}
                                  </p>
                                  <p className="text-xs text-gray-500">Rewards</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">142</p>
                                  <p className="text-xs text-gray-500">Customers</p>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">89</p>
                                  <p className="text-xs text-gray-500">Redemptions</p>
                                </div>
                              </div>
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {/* Handle manage */}}
                            >
                              Manage
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                        <h3 className="text-sm font-medium">No Programs Yet</h3>
                        <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
                          Create your first loyalty program
                        </p>
                        <Button 
                          variant="outline"
                          className="mt-4"
                          onClick={() => {/* Handle create */}}
                        >
                          Create Program
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const Icon = getIcon(item.type)
                    return (
                      <div 
                        key={item.id}
                        className="p-4 flex items-center gap-4 hover:bg-gray-50/50 group cursor-pointer"
                        onClick={() => handleViewReward(item.id)}
                      >
                        <div className="h-10 w-10 rounded-lg bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="h-5 w-5 text-[#007AFF]" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium">{item.rewardName}</h3>
                            {item.status && (
                              <span className={cn(
                                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                                getStatusColor(item.status)
                              )}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                              </span>
                            )}
                            {item.category && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-full">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1">
                            {item.description && (
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                            {item.pointsCost !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {item.pointsCost.toLocaleString()} points
                              </span>
                            )}
                            {item.redemptionCount !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {item.redemptionCount.toLocaleString()} redemptions
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1.5">
                            {item.lastModified && (
                              <span className="text-[10px] text-muted-foreground">
                                Last modified {formatDate(item.lastModified)}
                              </span>
                            )}
                            {item.startDate && (
                              <span className="text-[10px] text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDate(item.startDate)}
                                {item.endDate ? ` - ${formatDate(item.endDate)}` : ' - Ongoing'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReward(item.id);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
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
                    )
                  })
                )}
              </>
            )}
          </div>
        </Card>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>Debug Info:</div>
          <div>User ID: {user?.uid || 'Not logged in'}</div>
          <div>Total Items: {items.length}</div>
          <div>Filtered Items: {filteredItems.length}</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
          <div>Error: {error || 'None'}</div>
        </div>
      </div>
    </div>
  )
} 