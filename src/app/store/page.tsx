"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  Gift, 
  Zap, 
  ArrowUpDown,
  ChevronDown,
  ArrowRight, 
  ArrowUp, 
  ArrowDown, 
  Users, 
  ShoppingCart, 
  Calendar,
  PlusCircle,
  Coffee,
  DollarSign,
  Clock,
  Star,
  ChevronRight
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"

interface StoreItem {
  id: string
  type: 'reward' | 'rule'
  name?: string
  rewardName?: string
  description?: string
  pointsCost?: number
  points?: number
  status?: string
  category?: string
  createdAt?: any
}

export default function StorePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [items, setItems] = useState<StoreItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [itemType, setItemType] = useState<'all' | 'reward' | 'rule'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest')
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    async function fetchItems() {
      if (!user) return
      
      try {
        setLoading(true)
        let fetchedItems: StoreItem[] = []
        
        // Always fetch both rewards and rules, then filter by type in the UI
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const rewardsSnapshot = await getDocs(rewardsRef)
        const fetchedRewards = rewardsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'reward' as const
        }))
        
        const rulesRef = collection(db, 'merchants', user.uid, 'pointsRules')
        const rulesSnapshot = await getDocs(rulesRef)
        const fetchedRules = rulesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          type: 'rule' as const
        }))
        
        fetchedItems = [...fetchedRewards, ...fetchedRules]
        setItems(fetchedItems)
      } catch (error) {
        console.error("Error fetching items:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchItems()
  }, [user, itemType])

  useEffect(() => {
    const fetchRecentTransactions = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(5))
        const querySnapshot = await getDocs(q)
        
        const transactionsData = []
        querySnapshot.forEach((doc) => {
          transactionsData.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        setTransactions(transactionsData)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRecentTransactions()
  }, [user])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const nameField = item.type === 'reward' ? (item.rewardName || item.name) : (item.name || '')
      const searchMatch = nameField?.toLowerCase().includes(searchQuery.toLowerCase())
      const typeMatch = itemType === 'all' || item.type === itemType
      return searchMatch && typeMatch
    }).sort((a, b) => {
      const nameA = a.type === 'reward' ? (a.rewardName || a.name) : (a.name || '')
      const nameB = b.type === 'reward' ? (b.rewardName || b.name) : (b.name || '')
      
      if (sortBy === 'newest') {
        return (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0)
      } else if (sortBy === 'oldest') {
        return (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0)
      } else {
        return (nameA || '').localeCompare(nameB || '')
      }
    })
  }, [items, searchQuery, itemType, sortBy])

  const getIcon = (type: string) => {
    return type === 'reward' ? Gift : Zap
  }

  const handleViewItem = (item: StoreItem) => {
    if (item.type === 'reward') {
      router.push(`/rewards/${item.id}`)
    } else {
      router.push(`/rules/${item.id}`)
    }
  }

  const getItemName = (item: StoreItem) => {
    return item.type === 'reward' ? (item.rewardName || item.name || 'Unnamed Reward') : (item.name || 'Unnamed Rule')
  }

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader
          title="My Store"
          subtitle="Manage your loyalty program and customer experience"
        >
          <Button 
            className="h-9 gap-2 rounded-md"
            onClick={() => router.push('/create')}
          >
            <Plus className="h-4 w-4" />
            Create Reward
          </Button>
        </PageHeader>
        
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Store</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your rewards and points rules
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => router.push('/create')}
                className="h-9 gap-2 rounded-md"
              >
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search..."
                  className="pl-8 h-9 rounded-md w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 gap-2 rounded-md">
                      <Filter className="h-4 w-4" />
                      <span>Filter</span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-md">
                    <DropdownMenuItem onClick={() => setItemType('all')}>
                      All Items
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setItemType('reward')}>
                      Rewards Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setItemType('rule')}>
                      Rules Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 gap-2 rounded-md">
                      <ArrowUpDown className="h-4 w-4" />
                      <span>Sort</span>
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-md">
                    <DropdownMenuItem onClick={() => setSortBy('newest')}>
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('oldest')}>
                      Oldest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>
                      Name (A-Z)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <Tabs defaultValue="grid" className="w-full">
              <div className="flex items-center justify-between">
                <TabsList className="h-9 rounded-md">
                  <TabsTrigger value="grid" className="rounded-sm">Grid</TabsTrigger>
                  <TabsTrigger value="list" className="rounded-sm">List</TabsTrigger>
                </TabsList>
                
                <div className="text-sm text-muted-foreground">
                  {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
                </div>
              </div>
              
              <div className="mt-4">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                      <p className="mt-2 text-sm text-muted-foreground">Loading items...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {filteredItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-lg">
                        <div className="text-center">
                          <p className="text-muted-foreground mb-4">No items found</p>
                          <Button 
                            onClick={() => router.push('/create')}
                            className="h-9 gap-2 rounded-md"
                          >
                            <Plus className="h-4 w-4" />
                            Create Item
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <TabsContent value="grid" className="mt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map((item) => {
                              const Icon = getIcon(item.type);
                              return (
                                <Card 
                                  key={item.id}
                                  className="overflow-hidden border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer rounded-lg"
                                  onClick={() => handleViewItem(item)}
                                >
                                  <div className="p-4 flex items-center gap-4">
                                    <div className={cn(
                                      "h-10 w-10 rounded-md flex items-center justify-center flex-shrink-0",
                                      item.type === 'reward' ? "bg-purple-50" : "bg-blue-50"
                                    )}>
                                      <Icon className={cn(
                                        "h-5 w-5",
                                        item.type === 'reward' ? "text-purple-500" : "text-blue-500"
                                      )} />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h3 className="font-medium truncate">
                                          {getItemName(item)}
                                        </h3>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "ml-2 rounded-md",
                                            item.status === 'active' 
                                              ? "bg-green-50 text-green-700 border-green-200" 
                                              : "bg-gray-50 text-gray-700 border-gray-200"
                                          )}
                                        >
                                          {item.status || 'Draft'}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground truncate mt-1">
                                        {item.description || 'No description'}
                                      </p>
                                      <div className="flex items-center mt-2 text-xs text-muted-foreground">
                                        <span>
                                          {item.type === 'reward' 
                                            ? `${item.pointsCost || 0} points` 
                                            : `${item.points || 0} points`}
                                        </span>
                                        <span className="mx-2">•</span>
                                        <span>{item.category || 'Uncategorized'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="list" className="mt-0">
                          <div className="border rounded-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[40px]"></TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Points</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Category</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredItems.map((item) => {
                                  const Icon = getIcon(item.type);
                                  return (
                                    <TableRow 
                                      key={item.id}
                                      className="cursor-pointer hover:bg-muted/50"
                                      onClick={() => handleViewItem(item)}
                                    >
                                      <TableCell>
                                        <div className={cn(
                                          "h-8 w-8 rounded-md flex items-center justify-center",
                                          item.type === 'reward' ? "bg-purple-50" : "bg-blue-50"
                                        )}>
                                          <Icon className={cn(
                                            "h-4 w-4",
                                            item.type === 'reward' ? "text-purple-500" : "text-blue-500"
                                          )} />
                                        </div>
                                      </TableCell>
                                      <TableCell className="font-medium">
                                        {getItemName(item)}
                                      </TableCell>
                                      <TableCell>
                                        {item.type === 'reward' ? 'Reward' : 'Rule'}
                                      </TableCell>
                                      <TableCell>
                                        {item.type === 'reward' 
                                          ? `${item.pointsCost || 0} points` 
                                          : `${item.points || 0} points`}
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant="outline" 
                                          className={cn(
                                            "rounded-md",
                                            item.status === 'active' 
                                              ? "bg-green-50 text-green-700 border-green-200" 
                                              : "bg-gray-50 text-gray-700 border-gray-200"
                                          )}
                                        >
                                          {item.status || 'Draft'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {item.category || 'Uncategorized'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </TabsContent>
                      </>
                    )}
                  </>
                )}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </PageTransition>
  );
} 