"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc } from "firebase/firestore"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Icons
import { 
  BarChart, 
  Gift, 
  Users, 
  PlusCircle,
  ShoppingBag,
  Clock,
  Settings,
  Sparkles,
  Image,
  MessageSquare,
  Zap,
  BellRing,
  Package,
  MoreVertical,
  Eye,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Calendar,
  ChevronRight,
  DollarSign,
  Activity
} from "lucide-react"

// Component interfaces
interface Reward {
  id: string;
  rewardName?: string;
  name?: string;
  description: string;
  pointsCost: number;
  status: string;
  createdAt: any;
  expiryDate?: any;
  redemptionCount?: number;
  viewCount?: number;
  isAgentGenerated?: boolean;
}

interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  status: string;
  createdAt: any;
  expiryDate?: any;
  clickCount?: number;
  viewCount?: number;
  isAgentGenerated?: boolean;
}

interface PointsRule {
  id: string;
  name: string;
  description?: string;
  pointsAmount: number;
  condition: string;
  status: string;
  createdAt: any;
  triggeredCount?: number;
}

interface Message {
  id: string;
  title: string;
  content: string;
  sent: boolean;
  sentAt?: any;
  recipients: number;
  openRate?: number;
}

interface Notification {
  id: string;
  title: string;
  body: string;
  sent: boolean;
  sentAt?: any;
  recipients: number;
  clickRate?: number;
}

interface InventorySync {
  lastSynced: any;
  source: string;
  totalItems: number;
  status: string;
}

export default function StoreOverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  
  // State for different data sections
  const [rewards, setRewards] = useState<Reward[]>([])
  const [banners, setBanners] = useState<Banner[]>([])
  const [pointsRules, setPointsRules] = useState<PointsRule[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [inventorySync, setInventorySync] = useState<InventorySync | null>(null)
  
  // Fetch data on component mount
  useEffect(() => {
    if (user?.uid) {
      Promise.all([
        fetchRewards(),
        fetchBanners(),
        fetchPointsRules(),
        fetchMessages(),
        fetchNotifications(),
        fetchInventoryStatus()
      ]).finally(() => {
        setLoading(false)
      })
    }
  }, [user])
  
  // Data fetching functions
  const fetchRewards = async () => {
    if (!user?.uid) return
    
    try {
      const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const rewardsQuery = query(rewardsRef, orderBy('createdAt', 'desc'))
      const rewardsSnapshot = await getDocs(rewardsQuery)
      
      const fetchedRewards = rewardsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          rewardName: data.rewardName || data.name || 'Unnamed Reward',
          description: data.description || '',
          pointsCost: data.pointsCost || 0,
          status: data.status || 'active',
          createdAt: data.createdAt,
          expiryDate: data.expiryDate,
          redemptionCount: data.redemptionCount || 0,
          viewCount: data.viewCount || 0,
          isAgentGenerated: data.isAgentGenerated || false
        }
      })
      
      setRewards(fetchedRewards)
    } catch (error) {
      console.error("Error fetching rewards:", error)
    }
  }
  
  const fetchBanners = async () => {
    if (!user?.uid) return
    
    try {
      const bannersRef = collection(db, 'merchants', user.uid, 'banners')
      const bannersQuery = query(bannersRef, orderBy('createdAt', 'desc'))
      const bannersSnapshot = await getDocs(bannersQuery)
      
      const fetchedBanners = bannersSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'Unnamed Banner',
          description: data.description || '',
          imageUrl: data.imageUrl || '',
          status: data.status || 'active',
          createdAt: data.createdAt,
          expiryDate: data.expiryDate,
          clickCount: data.clickCount || 0,
          viewCount: data.viewCount || 0,
          isAgentGenerated: data.isAgentGenerated || false
        }
      })
      
      setBanners(fetchedBanners)
    } catch (error) {
      console.error("Error fetching banners:", error)
    }
  }
  
  const fetchPointsRules = async () => {
    if (!user?.uid) return
    
    try {
      const rulesRef = collection(db, 'merchants', user.uid, 'pointsRules')
      const rulesQuery = query(rulesRef, orderBy('createdAt', 'desc'))
      const rulesSnapshot = await getDocs(rulesQuery)
      
      const fetchedRules = rulesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          name: data.name || 'Unnamed Rule',
          description: data.description || '',
          pointsAmount: data.pointsAmount || 0,
          condition: data.condition || '',
          status: data.status || 'active',
          createdAt: data.createdAt,
          triggeredCount: data.triggeredCount || 0
        }
      })
      
      setPointsRules(fetchedRules)
    } catch (error) {
      console.error("Error fetching points rules:", error)
    }
  }
  
  const fetchMessages = async () => {
    if (!user?.uid) return
    
    try {
      const messagesRef = collection(db, 'merchants', user.uid, 'messages')
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'desc'), limit(5))
      const messagesSnapshot = await getDocs(messagesQuery)
      
      const fetchedMessages = messagesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'Unnamed Message',
          content: data.content || '',
          sent: data.sent || false,
          sentAt: data.sentAt,
          recipients: data.recipients || 0,
          openRate: data.openRate || 0
        }
      })
      
      setMessages(fetchedMessages)
    } catch (error) {
      console.error("Error fetching messages:", error)
    }
  }
  
  const fetchNotifications = async () => {
    if (!user?.uid) return
    
    try {
      const notificationsRef = collection(db, 'merchants', user.uid, 'notifications')
      const notificationsQuery = query(notificationsRef, orderBy('createdAt', 'desc'), limit(5))
      const notificationsSnapshot = await getDocs(notificationsQuery)
      
      const fetchedNotifications = notificationsSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || 'Unnamed Notification',
          body: data.body || '',
          sent: data.sent || false,
          sentAt: data.sentAt,
          recipients: data.recipients || 0,
          clickRate: data.clickRate || 0
        }
      })
      
      setNotifications(fetchedNotifications)
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }
  
  const fetchInventoryStatus = async () => {
    if (!user?.uid) return
    
    try {
      const inventoryStatusRef = doc(db, 'merchants', user.uid, 'settings', 'inventory')
      const inventoryStatusSnapshot = await getDoc(inventoryStatusRef)
      
      if (inventoryStatusSnapshot.exists()) {
        const data = inventoryStatusSnapshot.data()
        setInventorySync({
          lastSynced: data.lastSynced,
          source: data.source || 'manual',
          totalItems: data.totalItems || 0,
          status: data.status || 'idle'
        })
      }
    } catch (error) {
      console.error("Error fetching inventory status:", error)
    }
  }
  
  // Helper function to format dates
  const formatDate = (date: any) => {
    if (!date) return 'N/A'
    
    try {
      if (date.toDate) {
        return format(date.toDate(), 'MMM d, yyyy')
      } else if (date.seconds) {
        return format(new Date(date.seconds * 1000), 'MMM d, yyyy')
      } else {
        return format(new Date(date), 'MMM d, yyyy')
      }
    } catch (error) {
      return 'Invalid date'
    }
  }
  
  // Helper function to get time ago
  const getTimeAgo = (date: any) => {
    if (!date) return 'N/A'
    
    try {
      if (date.toDate) {
        return formatDistanceToNow(date.toDate(), { addSuffix: true })
      } else if (date.seconds) {
        return formatDistanceToNow(new Date(date.seconds * 1000), { addSuffix: true })
      } else {
        return formatDistanceToNow(new Date(date), { addSuffix: true })
      }
    } catch (error) {
      return 'Unknown'
    }
  }
  
  // Helper function to get status badge
  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded-md font-normal">Active</Badge>
    } else if (status === 'inactive' || status === 'disabled') {
      return <Badge variant="outline" className="text-gray-500 rounded-md font-normal">Inactive</Badge>
    } else if (status === 'scheduled') {
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 rounded-md font-normal">Scheduled</Badge>
    } else if (status === 'expired') {
      return <Badge variant="outline" className="text-red-500 rounded-md font-normal">Expired</Badge>
    } else {
      return <Badge variant="outline" className="rounded-md font-normal">{status}</Badge>
    }
  }

  // Helper function to check if there are any AI-generated rewards
  const hasAiRewards = useMemo(() => {
    return rewards.some(reward => reward.isAgentGenerated === true);
  }, [rewards]);

  // Helper function to check if there are any AI-generated banners
  const hasAiBanners = useMemo(() => {
    return banners.some(banner => banner.isAgentGenerated === true);
  }, [banners]);
  
  return (
    <PageTransition>
      <div className="p-6 py-4">
        <PageHeader
          title="Store Overview"
          subtitle="Complete overview of your store's loyalty program and marketing activities"
        >
          <Button 
            className="h-9 gap-2 rounded-md"
            onClick={() => router.push('/create')}
          >
            <PlusCircle className="h-4 w-4" />
            Create New
          </Button>
        </PageHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Tap Agent Section */}
          <Card className="rounded-md shadow-sm md:col-span-2 border-0 bg-gradient-to-r from-gray-50 to-gray-100">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-gray-600" />
                  Tap Agent Overview
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/tap-agent/intro">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>AI-powered rewards and promotions for your store</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-white rounded-md p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Gift className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">AI-Generated Rewards</h3>
                        <p className="text-xs text-muted-foreground mt-1">Smart rewards created by Tap Agent</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-md font-normal">
                      {rewards.filter(r => r.isAgentGenerated).length} Rewards
                    </Badge>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !hasAiRewards ? (
                    <div className="flex flex-col items-center justify-center h-24 text-center">
                      <p className="text-sm text-muted-foreground">No AI rewards yet</p>
                      <Button variant="outline" size="sm" className="mt-3 rounded-md" asChild>
                        <Link href="/tap-agent/setup">Generate Rewards</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rewards.filter(r => r.isAgentGenerated).slice(0, 3).map((reward) => (
                        <div key={reward.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{reward.rewardName}</p>
                            <div className="flex items-center mt-1">
                              <Zap className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{reward.pointsCost} points</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {getStatusBadge(reward.status)}
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" asChild>
                              <Link href={`/rewards/${reward.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button variant="ghost" size="sm" className="w-full mt-3 rounded-md" asChild>
                    <Link href="/tap-agent/setup">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Manage AI Rewards
                    </Link>
                  </Button>
                </div>
                
                <div className="bg-white rounded-md p-4 border border-gray-100">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Image className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">AI-Generated Banners</h3>
                        <p className="text-xs text-muted-foreground mt-1">Smart banners created by Tap Agent</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-md font-normal">
                      {banners.filter(b => b.isAgentGenerated).length} Banners
                    </Badge>
                  </div>
                  
                  {loading ? (
                    <div className="flex items-center justify-center h-24">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !hasAiBanners ? (
                    <div className="flex flex-col items-center justify-center h-24 text-center">
                      <p className="text-sm text-muted-foreground">No AI banners yet</p>
                      <Button variant="outline" size="sm" className="mt-3 rounded-md" asChild>
                        <Link href="/tap-agent/setup">Generate Banners</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {banners.filter(b => b.isAgentGenerated).slice(0, 3).map((banner) => (
                        <div key={banner.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{banner.title}</p>
                            <div className="flex items-center mt-1">
                              <Eye className="h-3 w-3 mr-1 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{banner.viewCount || 0} views</span>
                            </div>
                          </div>
                          <div className="flex items-center">
                            {getStatusBadge(banner.status)}
                            <Button variant="ghost" size="icon" className="h-7 w-7 ml-2" asChild>
                              <Link href={`/store/banners/${banner.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button variant="ghost" size="sm" className="w-full mt-3 rounded-md" asChild>
                    <Link href="/tap-agent/setup">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Manage AI Banners
                    </Link>
                  </Button>
                </div>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button className="gap-2 rounded-md" asChild>
                  <Link href="/tap-agent/intro">
                    Explore Tap Agent
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Active Rewards Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Gift className="h-5 w-5 mr-2 text-gray-600" />
                  Active Rewards
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/rewards">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>All active rewards available to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : rewards.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Gift className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No rewards found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/create">Create Reward</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Reward</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rewards.slice(0, 5).map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[120px]">{reward.rewardName}</span>
                              {reward.isAgentGenerated && (
                                <Badge variant="outline" className="mt-1 w-fit text-xs bg-gray-100 text-gray-800">
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  AI Generated
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{reward.pointsCost}</TableCell>
                          <TableCell>{getStatusBadge(reward.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link href={`/rewards/${reward.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Total: {rewards.filter(r => r.status === 'active').length} active rewards
              </div>
              {rewards.length > 0 && (
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/store/rewards">View all rewards</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Active Banners Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Image className="h-5 w-5 mr-2 text-gray-600" />
                  Banners
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/banners">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Marketing banners displayed to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : banners.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Image className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No banners found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/store/banners">Create Banner</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="grid grid-cols-1 gap-4">
                    {banners.slice(0, 3).map((banner) => (
                      <Card key={banner.id} className="overflow-hidden rounded-md shadow-sm">
                        <div className="relative h-24 bg-gray-100">
                          {banner.imageUrl ? (
                            <div 
                              className="w-full h-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${banner.imageUrl})` }}
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Image className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2">
                            {getStatusBadge(banner.status)}
                          </div>
                          {banner.isAgentGenerated && (
                            <Badge variant="outline" className="absolute bottom-2 left-2 bg-gray-100 text-gray-800 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-sm truncate max-w-[160px]">{banner.title}</h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <div className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {banner.viewCount || 0}
                                </div>
                                <div className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {formatDate(banner.expiryDate)}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link href={`/store/banners/${banner.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Total: {banners.filter(b => b.status === 'active').length} active banners
              </div>
              {banners.length > 0 && (
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/store/banners">View all banners</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Points Rules Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-gray-600" />
                  Points Rules
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/points-rules">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Rules for customers to earn points</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : pointsRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Zap className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No points rules found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/store/points-rules">Create Points Rule</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pointsRules.slice(0, 5).map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            <span className="truncate max-w-[120px] block">{rule.name}</span>
                          </TableCell>
                          <TableCell>{rule.pointsAmount}</TableCell>
                          <TableCell>{getStatusBadge(rule.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <Link href={`/store/points-rules/${rule.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Total: {pointsRules.filter(r => r.status === 'active').length} active rules
              </div>
              {pointsRules.length > 0 && (
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/store/points-rules">View all rules</Link>
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {/* Recent Messages Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <MessageSquare className="h-5 w-5 mr-2 text-gray-600" />
                  Recent Messages
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/messages">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Messages sent to customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <MessageSquare className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No messages found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/store/messages">Create Message</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div key={message.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                        <div className="bg-gray-100 rounded-full p-2 flex-shrink-0">
                          <MessageSquare className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium truncate max-w-[160px]">{message.title}</h3>
                            <Badge 
                              variant={message.sent ? "default" : "outline"} 
                              className={message.sent ? "bg-green-500 rounded-md" : "text-gray-500 rounded-md"}
                            >
                              {message.sent ? "Sent" : "Draft"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{message.content}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            {message.sent && (
                              <>
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {message.recipients || 0} recipients
                                </div>
                                <div className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1" />
                                  {message.openRate || 0}% open rate
                                </div>
                              </>
                            )}
                            {message.sentAt && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {getTimeAgo(message.sentAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {messages.filter(m => m.sent).length} messages sent
              </div>
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link href="/store/messages">View all messages</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Push Notifications Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <BellRing className="h-5 w-5 mr-2 text-gray-600" />
                  Push Notifications
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/notifications">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Notifications sent to customer devices</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <BellRing className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No notifications found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/store/notifications">Create Notification</Link>
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-0">
                        <div className="bg-gray-100 rounded-full p-2 flex-shrink-0">
                          <BellRing className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium truncate max-w-[160px]">{notification.title}</h3>
                            <Badge 
                              variant={notification.sent ? "default" : "outline"} 
                              className={notification.sent ? "bg-green-500 rounded-md" : "text-gray-500 rounded-md"}
                            >
                              {notification.sent ? "Sent" : "Draft"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{notification.body}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            {notification.sent && (
                              <>
                                <div className="flex items-center">
                                  <Users className="h-3 w-3 mr-1" />
                                  {notification.recipients || 0} recipients
                                </div>
                                <div className="flex items-center">
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  {notification.clickRate || 0}% click rate
                                </div>
                              </>
                            )}
                            {notification.sentAt && (
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {getTimeAgo(notification.sentAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
            <CardFooter className="flex justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                {notifications.filter(n => n.sent).length} notifications sent
              </div>
              <Button variant="link" size="sm" className="px-0" asChild>
                <Link href="/store/notifications">View all notifications</Link>
              </Button>
            </CardFooter>
          </Card>
          
          {/* Inventory Sync Card */}
          <Card className="rounded-md shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Package className="h-5 w-5 mr-2 text-gray-600" />
                  Inventory Status
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/store/inventory">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Product inventory synchronization</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : !inventorySync ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <Package className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No inventory data found</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                    <Link href="/store/inventory">Set Up Inventory</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 pt-4">
                  <div className="flex flex-col space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium">Last Synchronized</h3>
                      <Badge 
                        variant={inventorySync.status === 'synced' ? "default" : "outline"}
                        className={inventorySync.status === 'synced' ? "bg-green-500 rounded-md" : inventorySync.status === 'syncing' ? "bg-blue-500 rounded-md" : "text-gray-500 rounded-md"}
                      >
                        {inventorySync.status === 'synced' ? 'Synced' : 
                         inventorySync.status === 'syncing' ? 'Syncing' : 
                         inventorySync.status === 'error' ? 'Error' : 'Idle'}
                      </Badge>
                    </div>
                    {inventorySync.lastSynced ? (
                      <div className="flex items-center text-xl font-semibold">
                        {getTimeAgo(inventorySync.lastSynced)}
                      </div>
                    ) : (
                      <div className="text-xl font-semibold text-muted-foreground">Never</div>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-1.5">
                      <h3 className="text-sm font-medium">Total Items</h3>
                      <div className="flex items-center text-xl font-semibold">
                        {inventorySync.totalItems.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-1.5">
                      <h3 className="text-sm font-medium">Source</h3>
                      <div className="flex items-center text-xl font-semibold">
                        {inventorySync.source === 'square' ? 'Square' : 
                         inventorySync.source === 'shopify' ? 'Shopify' : 
                         inventorySync.source === 'lightspeed' ? 'Lightspeed' : 
                         'Manual'}
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="/store/inventory">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Inventory
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
            {inventorySync && (
              <CardFooter className="flex justify-between pt-2">
                <div className="text-xs text-muted-foreground">
                  Source: {inventorySync.source === 'square' ? 'Square' : 
                          inventorySync.source === 'shopify' ? 'Shopify' : 
                          inventorySync.source === 'lightspeed' ? 'Lightspeed' : 
                          'Manual'}
                </div>
                <Button variant="link" size="sm" className="px-0" asChild>
                  <Link href="/integrations">Manage Integration</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
          
          {/* Store Analytics Overview Card */}
          <Card className="rounded-md shadow-sm md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-gray-600" />
                  Store Performance Overview
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                  <Link href="/dashboard">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Key performance metrics for your loyalty program</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                <Card className="rounded-md shadow-sm border-gray-100">
                  <CardContent className="pt-6">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Gift className="h-4 w-4 mr-1" />
                        Reward Redemptions
                      </div>
                      <div className="text-2xl font-bold">
                        {rewards.reduce((sum, reward) => sum + (reward.redemptionCount || 0), 0)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-md shadow-sm border-gray-100">
                  <CardContent className="pt-6">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Users className="h-4 w-4 mr-1" />
                        Total Customers
                      </div>
                      <div className="text-2xl font-bold">
                        {/* Placeholder for customer count */}
                        345
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">All time</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-md shadow-sm border-gray-100">
                  <CardContent className="pt-6">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <Zap className="h-4 w-4 mr-1" />
                        Points Issued
                      </div>
                      <div className="text-2xl font-bold">
                        {pointsRules.reduce((sum, rule) => sum + ((rule.triggeredCount || 0) * (rule.pointsAmount || 0)), 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="rounded-md shadow-sm border-gray-100">
                  <CardContent className="pt-6">
                    <div className="flex flex-col">
                      <div className="flex items-center text-sm text-muted-foreground mb-1">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Sales Value
                      </div>
                      <div className="text-2xl font-bold">
                        {/* Placeholder for sales value */}
                        $12,450
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Last 30 days</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-6 flex justify-center">
                <Button className="gap-2 rounded-md" asChild>
                  <Link href="/dashboard">
                    View Full Analytics
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
} 