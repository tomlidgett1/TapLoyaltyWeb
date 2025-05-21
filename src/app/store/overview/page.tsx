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
import { Input } from "@/components/ui/input"

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
  Activity,
  Search,
  Loader2,
  Tag,
  Download
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
  programtype?: string;
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

// Add Square catalog object interface
interface SquareCatalogObject {
  type: string
  id: string
  updated_at: string
  version: number
  is_deleted: boolean
  present_at_all_locations: boolean
  category_data?: {
    name: string
  }
  item_data?: {
    name: string
    description?: string
    category_id?: string
    variations?: SquareCatalogObject[]
  }
  item_variation_data?: {
    item_id: string
    name: string
    price_money?: {
      amount: number
      currency: string
    }
    sku?: string
    ordinal?: number
    pricing_type?: string
    available?: boolean
  }
}

// Add interface for inventory count
interface InventoryCount {
  catalogObjectId: string;
  quantity: string;
  state: string;
  locationId: string;
  updatedAt: string;
}

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

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
  
  // Add state for inventory data
  const [inventoryItems, setInventoryItems] = useState<SquareCatalogObject[]>([])
  const [categories, setCategories] = useState<Record<string, string>>({})
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, InventoryCount>>({})
  const [inventorySearchQuery, setInventorySearchQuery] = useState("")
  const [isSquareConnected, setIsSquareConnected] = useState(false)
  const [refreshingInventory, setRefreshingInventory] = useState(false)
  const [loadingInventory, setLoadingInventory] = useState(true)
  
  // Fetch data on component mount
  useEffect(() => {
    if (user?.uid) {
      Promise.all([
        fetchRewards(),
        fetchBanners(),
        fetchPointsRules(),
        fetchMessages(),
        fetchNotifications(),
        fetchInventoryStatus(),
        fetchInventoryItems()
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
          isAgentGenerated: data.isAgentGenerated || false,
          programtype: data.programtype || ''
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
  
  // Add function to fetch inventory items from Square
  const fetchInventoryItems = async () => {
    if (!user?.uid) return
    
    // Set loading state
    if (refreshingInventory) {
      // If already refreshing, don't start another refresh
      return
    } else {
      setRefreshingInventory(true)
    }
    
    try {
      // Fetch Square integration status first
      const squareIntegrationRef = doc(db, 'merchants', user.uid, 'integrations', 'square')
      const squareIntegrationDoc = await getDoc(squareIntegrationRef)
      
      // Check if integration exists and is connected
      const isConnected = squareIntegrationDoc.exists() && squareIntegrationDoc.data().connected === true
      
      console.log('Square integration status:', { 
        exists: squareIntegrationDoc.exists(), 
        connected: squareIntegrationDoc.exists() ? squareIntegrationDoc.data().connected : false,
        isConnected
      })
      
      setIsSquareConnected(isConnected)
      
      if (!isConnected) {
        setLoadingInventory(false)
        setRefreshingInventory(false)
        return
      }
      
      // Fetch inventory items from Square API
      const response = await fetch(`/api/square/catalog?merchantId=${user.uid}`)
      const data = await response.json()
      
      // Log the structure of the response to help debugging
      console.log('Square API response structure:', {
        hasObjects: !!data?.objects,
        objectsCount: data?.objects?.length || 0,
        firstObjectType: data?.objects?.[0]?.type || 'none',
        keys: Object.keys(data || {})
      })
      
      // Check if we have data and objects array 
      if (data && data.objects) {
        // Process and organize the catalog data
        const items = data.objects || []
        const categoryObjects = items.filter((item: SquareCatalogObject) => item.type === 'CATEGORY')
        
        // Create a map of category IDs to names
        const categoryMap: Record<string, string> = {}
        
        categoryObjects.forEach((category: SquareCatalogObject) => {
          if (category.category_data?.name) {
            categoryMap[category.id] = category.category_data.name
          }
        })
        
        // Store categories and items
        setCategories(categoryMap)
        setInventoryItems(items)
        
        // Fetch inventory counts for all ITEM_VARIATION items
        const variationIds = items
          .filter((item: SquareCatalogObject) => item.type === 'ITEM_VARIATION')
          .map((item: SquareCatalogObject) => item.id)
        
        if (variationIds.length > 0) {
          await fetchInventoryCounts(variationIds)
        }
      } else {
        // Log the response structure to help debug
        console.error("Failed to fetch inventory items or no objects returned:", data)
      }
    } catch (error) {
      console.error("Error fetching inventory:", error)
    } finally {
      setLoadingInventory(false)
      setRefreshingInventory(false)
    }
  }
  
  // Add function to fetch inventory counts
  const fetchInventoryCounts = async (itemIds: string[]) => {
    if (!user?.uid || itemIds.length === 0) return
    
    try {
      // Call our API endpoint to get inventory counts
      const response = await fetch(`/api/square/inventory?merchantId=${user.uid}&catalogItemIds=${itemIds.join(',')}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory counts: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      // Process inventory counts
      const countsMap: Record<string, InventoryCount> = {}
      
      if (data.counts && Array.isArray(data.counts)) {
        data.counts.forEach((count: any) => {
          if (count.catalog_object_id && count.quantity) {
            countsMap[count.catalog_object_id] = {
              catalogObjectId: count.catalog_object_id,
              quantity: count.quantity,
              state: count.state || 'IN_STOCK',
              locationId: count.location_id || '',
              updatedAt: count.calculated_at || ''
            }
          }
        })
      }
      
      setInventoryCounts(countsMap)
    } catch (error) {
      console.error("Error fetching inventory counts:", error)
    }
  }
  
  // Format price from cents to dollars
  const formatPrice = (amount: number | undefined, currency: string = 'USD') => {
    if (amount === undefined) return 'N/A'
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100)
  }
  
  // Get category name from category ID
  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return 'Uncategorized'
    return categories[categoryId] || 'Unknown Category'
  }
  
  // Function to get stock quantity for an item
  const getStockQuantity = (item: SquareCatalogObject): string => {
    if (item.type === 'ITEM_VARIATION') {
      const count = inventoryCounts[item.id]
      if (count) {
        return count.quantity
      }
    }
    
    // For items with variations, check if any variations have inventory
    if (item.type === 'ITEM' && item.item_data?.variations && item.item_data.variations.length > 0) {
      let totalStock = 0
      let hasStock = false
      
      item.item_data.variations.forEach(variation => {
        const count = inventoryCounts[variation.id]
        if (count) {
          hasStock = true
          totalStock += parseFloat(count.quantity)
        }
      })
      
      if (hasStock) {
        return totalStock.toString()
      }
    }
    
    return "N/A"
  }
  
  // Filter inventory items based on search query
  const filteredInventoryItems = useMemo(() => {
    // Debug inventory counts
    console.log(`Inventory items count: ${inventoryItems.length}, Square connected: ${isSquareConnected}`);
    
    if (!inventorySearchQuery.trim()) {
      const filtered = inventoryItems.filter(item => 
        item.type === 'ITEM' || item.type === 'ITEM_VARIATION'
      );
      console.log(`Filtered inventory items (no search): ${filtered.length}`);
      return filtered;
    }
    
    const query = inventorySearchQuery.toLowerCase().trim();
    
    const filtered = inventoryItems.filter(item => {
      if (item.type === 'ITEM' && item.item_data) {
        return (
          (item.item_data.name?.toLowerCase().includes(query)) ||
          (item.item_data.description?.toLowerCase().includes(query))
        );
      }
      
      if (item.type === 'ITEM_VARIATION' && item.item_variation_data) {
        return (
          (item.item_variation_data.name?.toLowerCase().includes(query)) ||
          (item.item_variation_data.sku?.toLowerCase().includes(query))
        );
      }
      
      return false;
    });
    
    console.log(`Filtered inventory items (with search "${query}"): ${filtered.length}`);
    return filtered;
  }, [inventoryItems, inventorySearchQuery, isSquareConnected]);
  
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
        >
          <Button 
            className="gap-2 rounded-md"
            onClick={() => router.push('/create')}
          >
            <PlusCircle className="h-4 w-4" />
            Create New
          </Button>
        </PageHeader>
        
        <Tabs defaultValue="rewards" className="mt-6">
          <TabsList className="mb-4">
            <TabsTrigger value="rewards" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="marketing" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              Marketing
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="rewards">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div>
                      <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4 w-full grid grid-cols-2">
                          <TabsTrigger value="all">All Rewards</TabsTrigger>
                          <TabsTrigger value="agent">
                            <div className="flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" />
                              <span>Agent Rewards</span>
                            </div>
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="all">
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
                                        {reward.programtype === "agent" ? (
                                          <GradientText>{reward.rewardName}</GradientText>
                                        ) : (
                                          <span className="truncate max-w-[120px]">{reward.rewardName}</span>
                                        )}
                                        {reward.programtype === "agent" && (
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
                        </TabsContent>

                        <TabsContent value="agent">
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
                                {rewards.filter(r => r.programtype === "agent").length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                      <div className="flex flex-col items-center justify-center">
                                        <Sparkles className="h-8 w-8 mb-2 text-muted-foreground" />
                                        <p className="text-muted-foreground">No agent rewards found</p>
                                        <Button variant="outline" size="sm" className="mt-4 rounded-md" asChild>
                                          <Link href="/tap-agent/setup">Generate Agent Rewards</Link>
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  rewards.filter(r => r.programtype === "agent").map((reward) => (
                                    <TableRow key={reward.id}>
                                      <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                          <GradientText>{reward.rewardName}</GradientText>
                                          <Badge variant="outline" className="mt-1 w-fit text-xs bg-gray-100 text-gray-800">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI Generated
                                          </Badge>
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
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </ScrollArea>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Total: {rewards.filter(r => r.status === 'active').length} active rewards
                    {rewards.filter(r => r.programtype === "agent" && r.status === 'active').length > 0 && (
                      <span className="ml-2">
                        ({rewards.filter(r => r.programtype === "agent" && r.status === 'active').length} agent)
                      </span>
                    )}
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
            </div>
          </TabsContent>
          
          <TabsContent value="marketing">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Existing marketing content */}
            </div>
          </TabsContent>
          
          <TabsContent value="customers">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Existing customers content */}
            </div>
          </TabsContent>
          
          <TabsContent value="inventory">
            <div className="grid grid-cols-1 gap-6">
              <Card className="rounded-md shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Package className="h-5 w-5 mr-2 text-gray-600" />
                      Inventory Items
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1"
                        onClick={fetchInventoryItems}
                        disabled={refreshingInventory || loadingInventory}
                      >
                        {refreshingInventory ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span className="text-xs">Refreshing...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span className="text-xs">Refresh</span>
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 gap-1"
                        disabled={!isSquareConnected}
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span className="text-xs">Export</span>
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-8 gap-1"
                        disabled={!isSquareConnected || loadingInventory}
                        onClick={() => router.push('/tap-agent/setup')}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        <span className="text-xs">Add to Tap Agent</span>
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Products in your Square inventory</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading || loadingInventory ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : !isSquareConnected ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <Package className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground mb-2">Square integration required</p>
                      <Button variant="outline" size="sm" className="mt-2 rounded-md" asChild>
                        <Link href="/integrations">Connect Square</Link>
                      </Button>
                    </div>
                  ) : inventoryItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <Package className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">No inventory items found</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-3">
                        {isSquareConnected ? 
                          "Square is connected but no items were returned. Try refreshing." : 
                          "Please connect Square to view inventory."}
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-md"
                          onClick={fetchInventoryItems}
                          disabled={refreshingInventory}
                        >
                          {refreshingInventory ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 mr-2" />
                              Refresh Inventory
                            </>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-md" asChild>
                          <Link href="/store/inventory">Go to Inventory</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <div className="relative w-full max-w-sm">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Search inventory..."
                            className="pl-8 h-9"
                            value={inventorySearchQuery}
                            onChange={(e) => setInventorySearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                    
                      <ScrollArea className="h-[400px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[250px]">Name</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead className="text-right">Price</TableHead>
                              <TableHead>Stock</TableHead>
                              <TableHead className="text-right w-[50px]">Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredInventoryItems.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                  {inventorySearchQuery ? "No items found matching your search." : "No inventory items found."}
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredInventoryItems.map((item) => {
                                // Skip rendering categories in the table
                                if (item.type === 'CATEGORY') return null;
                                
                                // Item name to display
                                const itemName = item.type === 'ITEM' && item.item_data
                                  ? item.item_data.name
                                  : item.type === 'ITEM_VARIATION' && item.item_variation_data
                                    ? item.item_variation_data.name
                                    : 'Unknown Item';
                                
                                // Category name
                                const category = item.type === 'ITEM' && item.item_data?.category_id
                                  ? getCategoryName(item.item_data.category_id)
                                  : 'Uncategorized';
                                
                                // SKU
                                const sku = item.type === 'ITEM_VARIATION' && item.item_variation_data?.sku
                                  ? item.item_variation_data.sku
                                  : 'N/A';
                                
                                // Price
                                const price = item.type === 'ITEM_VARIATION' && item.item_variation_data?.price_money
                                  ? formatPrice(item.item_variation_data.price_money.amount, item.item_variation_data.price_money.currency)
                                  : item.type === 'ITEM' && item.item_data?.variations?.length
                                    ? 'Various'
                                    : 'N/A';
                                
                                // Description (for items with descriptions)
                                const description = item.type === 'ITEM' && item.item_data?.description;
                                
                                return (
                                  <TableRow key={item.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push('/store/inventory')}>
                                    <TableCell className="font-medium">
                                      {itemName}
                                      {description && (
                                        <p className="text-xs text-muted-foreground truncate max-w-xs">
                                          {description}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline" className={item.type === 'ITEM' 
                                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                                        : "bg-purple-50 text-purple-700 border-purple-200"}>
                                        {item.type === 'ITEM' ? 'Item' : 'Variation'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{category}</TableCell>
                                    <TableCell>{sku}</TableCell>
                                    <TableCell className="text-right">{price}</TableCell>
                                    <TableCell>
                                      <span className={`${getStockQuantity(item) === "0" ? "text-destructive" : getStockQuantity(item) === "N/A" ? "text-muted-foreground" : ""}`}>
                                        {getStockQuantity(item)}
                                      </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                        <Link href="/store/inventory">
                                          <Eye className="h-4 w-4" />
                                        </Link>
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    {isSquareConnected 
                      ? `Total: ${inventoryItems.filter(item => item.type === 'ITEM' || item.type === 'ITEM_VARIATION').length} items`
                      : 'Square integration required'}
                  </div>
                  <Button variant="link" size="sm" className="px-0" asChild>
                    <Link href="/store/inventory">View full inventory</Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Inventory Sync Card */}
              <Card className="rounded-md shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2 text-gray-600" />
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
} 