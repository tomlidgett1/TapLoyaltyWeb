"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  ArrowDown, 
  ArrowUp, 
  Gift, 
  ShoppingCart, 
  Users,
  MoreHorizontal,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, limit, Timestamp, where, doc, getDoc } from "firebase/firestore"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// Define transaction type with Firestore timestamp
interface Transaction {
  id: string
  actualcreatedAt: Timestamp | string
  amount: number
  createdAt: Timestamp | string
  customerId: string
  day: string
  merchantId: string
  merchantName: string
  status: string
  type: string
}

// Add this interface for redemptions
interface Redemption {
  id: string
  customerId: string
  merchantId: string
  pointsUsed: number
  redemptionDate: any
  redemptionId: string
  rewardId: string
  rewardName: string
  status: string
}

// Add a customer interface
interface Customer {
  id: string
  fullName: string
}

// Add a combined activity type to handle both transactions and redemptions
interface CombinedActivity {
  id: string
  type: "transaction" | "redemption"
  date: any // This will store createdAt or redemptionDate
  customerId: string
  displayName: string // For transactions: type, for redemptions: rewardName
  amount: number | string // For transactions: dollar amount, for redemptions: points or "Free"
  status: string
  day?: string // Only for transactions
  originalData: Transaction | Redemption
}

type ActivityCategory = "all" | "transactions" | "redemptions"
type SortField = "createdAt" | "amount" | "status" | "type"
type SortDirection = "asc" | "desc"

export default function ActivityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activityCategory, setActivityCategory] = useState<ActivityCategory>("all")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [customers, setCustomers] = useState<Record<string, Customer>>({})

  useEffect(() => {
    const fetchActivity = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        
        // Fetch transactions (existing code)
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(transactionsRef, limit(100))
        const transactionsSnapshot = await getDocs(transactionsQuery)
        
        const transactionsData: Transaction[] = []
        transactionsSnapshot.forEach((doc) => {
          transactionsData.push({
            id: doc.id,
            ...doc.data() as Omit<Transaction, 'id'>
          })
        })
        
        setTransactions(transactionsData)
        
        // Fetch redemptions
        const redemptionsRef = collection(db, 'redemptions')
        const redemptionsQuery = query(
          redemptionsRef,
          where('merchantId', '==', user.uid),
          orderBy('redemptionDate', 'desc'),
          limit(100)
        )
        
        const redemptionsSnapshot = await getDocs(redemptionsQuery)
        const redemptionsData: Redemption[] = []
        
        redemptionsSnapshot.forEach((doc) => {
          redemptionsData.push({
            id: doc.id,
            ...doc.data() as Omit<Redemption, 'id'>
          })
        })
        
        setRedemptions(redemptionsData)
        
        // Get unique customer IDs from both transactions and redemptions
        const customerIds = new Set([
          ...transactionsData.map(t => t.customerId),
          ...redemptionsData.map(r => r.customerId)
        ])
        
        // Fetch customer data for each unique customer ID
        const customersData: Record<string, Customer> = {}
        
        for (const customerId of customerIds) {
          if (customerId) {
            const customerRef = doc(db, 'merchants', user.uid, 'customers', customerId)
            const customerSnap = await getDoc(customerRef)
            
            if (customerSnap.exists()) {
              const data = customerSnap.data()
              customersData[customerId] = {
                id: customerId,
                fullName: data.fullName || 'Unknown Customer'
              }
            } else {
              customersData[customerId] = {
                id: customerId,
                fullName: 'Unknown Customer'
              }
            }
          }
        }
        
        setCustomers(customersData)
      } catch (error) {
        console.error("Error fetching activity:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchActivity()
  }, [user])

  // Filter transactions based on search query and category
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by search query
    const matchesSearch = !searchQuery ? true : (
      (transaction.customerId && transaction.customerId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.merchantName && transaction.merchantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.type && transaction.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (transaction.status && transaction.status.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    
    // Filter by category
    const matchesCategory = 
      activityCategory === "all" || 
      (activityCategory === "transactions" && transaction.type.toLowerCase() === "purchase") ||
      (activityCategory === "redemptions" && transaction.type.toLowerCase() === "reward")
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // Sort by selected field
    let comparison = 0
    
    switch (sortField) {
      case "createdAt":
        const dateA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
          ? a.createdAt.seconds * 1000 
          : typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0
        
        const dateB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
          ? b.createdAt.seconds * 1000 
          : typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0
        
        comparison = dateA - dateB
        break
      case "amount":
        comparison = a.amount - b.amount
        break
      case "status":
        comparison = a.status.localeCompare(b.status)
        break
      case "type":
        comparison = a.type.localeCompare(b.type)
        break
      default:
        comparison = 0
    }
    
    // Apply sort direction
    return sortDirection === "asc" ? comparison : -comparison
  })

  // Add a function to filter redemptions based on search and other criteria
  const filteredRedemptions = useMemo(() => {
    if (!redemptions) return []
    
    let result = [...redemptions]
    
    // Apply search filter if any
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(redemption => 
        redemption.rewardName.toLowerCase().includes(query) ||
        redemption.customerId.toLowerCase().includes(query) ||
        redemption.status.toLowerCase().includes(query)
      )
    }
    
    // Apply category filter
    if (activityCategory !== 'all' && activityCategory !== 'redemptions') {
      return []
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'createdAt':
          // For redemptions, use redemptionDate instead of createdAt
          const dateA = a.redemptionDate?.seconds || 0
          const dateB = b.redemptionDate?.seconds || 0
          comparison = dateB - dateA // Default to newest first
          break
        case 'amount':
          // For redemptions, use pointsUsed instead of amount
          comparison = b.pointsUsed - a.pointsUsed
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        default:
          comparison = 0
      }
      
      return sortDirection === 'asc' ? -comparison : comparison
    })
    
    return result
  }, [redemptions, searchQuery, activityCategory, sortField, sortDirection])

  // Format date for display - handle both string dates and Firestore timestamps
  const formatDate = (dateValue: Timestamp | string | undefined) => {
    if (!dateValue) return "N/A"
    
    try {
      // Handle Firestore Timestamp
      if (typeof dateValue === 'object' && 'seconds' in dateValue) {
        const date = new Date(dateValue.seconds * 1000)
        return format(date, 'MMM d, yyyy h:mm a')
      }
      
      // Handle string date
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue)
        return format(date, 'MMM d, yyyy h:mm a')
      }
      
      return "Invalid date"
    } catch (e) {
      console.error("Error formatting date:", e)
      return "Invalid date"
    }
  }

  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'purchase':
        return <ShoppingCart className="h-4 w-4" />
      case 'reward':
        return <Gift className="h-4 w-4" />
      default:
        return <ArrowUp className="h-4 w-4" />
    }
  }

  // Get transaction status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-md">Completed</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-md">Pending</Badge>
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 rounded-md">Failed</Badge>
      default:
        return <Badge variant="outline" className="rounded-md">{status}</Badge>
    }
  }

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {children}
      {sortField === field && (
        sortDirection === "desc" ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronUp className="h-4 w-4" />
      )}
    </button>
  )

  // Add the combined filtered activity
  const combinedActivity = useMemo(() => {
    if (activityCategory !== "all") return []
    
    // Convert transactions to combined format
    const transactionItems: CombinedActivity[] = filteredTransactions.map(transaction => ({
      id: transaction.id,
      type: "transaction",
      date: transaction.createdAt,
      customerId: transaction.customerId,
      displayName: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      day: transaction.day,
      originalData: transaction
    }))
    
    // Convert redemptions to combined format
    const redemptionItems: CombinedActivity[] = filteredRedemptions.map(redemption => ({
      id: redemption.id,
      type: "redemption",
      date: redemption.redemptionDate,
      customerId: redemption.customerId,
      displayName: redemption.rewardName,
      amount: redemption.pointsUsed === 0 ? "Free" : redemption.pointsUsed,
      status: redemption.status,
      originalData: redemption
    }))
    
    // Combine and sort
    const combined = [...transactionItems, ...redemptionItems]
    
    // Sort by date
    combined.sort((a, b) => {
      const dateA = a.date?.seconds || 0
      const dateB = b.date?.seconds || 0
      return sortDirection === "asc" ? dateA - dateB : dateB - dateA
    })
    
    return combined
  }, [filteredTransactions, filteredRedemptions, activityCategory, sortDirection])

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all transactions and redemptions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 gap-2 rounded-md">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="h-9 w-9 p-0 rounded-md">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(value) => setActivityCategory(value as ActivityCategory)}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="w-auto grid grid-cols-3 h-10 rounded-md">
              <TabsTrigger value="all" className="rounded-sm px-4">All Activity</TabsTrigger>
              <TabsTrigger value="transactions" className="rounded-sm px-4">Transactions</TabsTrigger>
              <TabsTrigger value="redemptions" className="rounded-sm px-4">Redemptions</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="relative max-w-md w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search activity..."
                  className="pl-8 h-10 rounded-md"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <Button variant="outline" className="h-10 gap-2 rounded-md">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
          
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle>All Activity</CardTitle>
                <CardDescription>
                  View all transactions and redemptions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <SortButton field="createdAt">Date</SortButton>
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>
                        <SortButton field="type">Type</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="amount">Amount</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="status">Status</SortButton>
                      </TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : combinedActivity.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Zap className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium">
                              No activity found
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchQuery ? "Try adjusting your search query" : 
                               "No activity records available"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      combinedActivity.map((activity) => (
                        <TableRow key={`${activity.type}-${activity.id}`} className="hover:bg-muted/50">
                          <TableCell>
                            {formatDate(activity.date)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <span>{customers[activity.customerId]?.fullName || 'Unknown Customer'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {activity.type === "transaction" ? (
                              <Badge variant="outline" className={cn(
                                "rounded-md",
                                activity.displayName.toLowerCase() === "purchase" && "bg-green-50 text-green-700 border-green-200",
                                activity.displayName.toLowerCase() === "reward" && "bg-purple-50 text-purple-700 border-purple-200"
                              )}>
                                <div className="flex items-center gap-1">
                                  {getTransactionIcon(activity.displayName)}
                                  <span className="capitalize">{activity.displayName}</span>
                                </div>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded-md">
                                <div className="flex items-center gap-1">
                                  <Gift className="h-4 w-4" />
                                  <span>{activity.displayName}</span>
                                </div>
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {activity.type === "transaction" ? (
                                <>
                                  {(activity.originalData as Transaction).type.toLowerCase() === "purchase" ? (
                                    <ArrowUp className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <ArrowDown className="h-4 w-4 text-red-500" />
                                  )}
                                  <span>${activity.amount}</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="h-4 w-4 text-red-500" />
                                  <span>
                                    {activity.amount === "Free" ? (
                                      <span className="text-green-600 font-medium">Free</span>
                                    ) : (
                                      `${activity.amount} points`
                                    )}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(activity.status)}
                          </TableCell>
                          <TableCell>
                            {activity.type === "transaction" ? (
                              <span className="capitalize">{activity.day}</span>
                            ) : (
                              <span>-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-md">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-md">
                                  <DropdownMenuItem onClick={() => 
                                    router.push(activity.type === "transaction" 
                                      ? `/transactions/${activity.id}` 
                                      : `/redemptions/${(activity.originalData as Redemption).redemptionId}`)
                                  }>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="py-4">
                    <CardTitle>Transactions</CardTitle>
                <CardDescription>
                      View all customer transactions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <SortButton field="createdAt">Date</SortButton>
                          </TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>
                            <SortButton field="type">Type</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="amount">Amount</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="status">Status</SortButton>
                          </TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                      {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                              </div>
                            </TableCell>
                          </TableRow>
                      ) : filteredTransactions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-medium">
                            No transactions found
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {searchQuery ? "Try adjusting your search query" : 
                                   "No transaction records available"}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                      ) : (
                        filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id} className="hover:bg-muted/50">
                              <TableCell>
                              {formatDate(transaction.createdAt)}
                              </TableCell>
                              <TableCell>
                              <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <span>{customers[transaction.customerId]?.fullName || 'Unknown Customer'}</span>
                              </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={cn(
                                  "rounded-md",
                                  transaction.type.toLowerCase() === "purchase" && "bg-green-50 text-green-700 border-green-200",
                                  transaction.type.toLowerCase() === "reward" && "bg-purple-50 text-purple-700 border-purple-200"
                                )}>
                                  <div className="flex items-center gap-1">
                                {getTransactionIcon(transaction.type)}
                                <span className="capitalize">{transaction.type}</span>
                              </div>
                                </Badge>
                              </TableCell>
                              <TableCell>
                              <div className="flex items-center gap-1">
                                  {transaction.type.toLowerCase() === "purchase" ? (
                                  <ArrowUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <ArrowDown className="h-4 w-4 text-red-500" />
                                )}
                                <span>${transaction.amount}</span>
                              </div>
                              </TableCell>
                              <TableCell>
                              {getStatusBadge(transaction.status)}
                              </TableCell>
                              <TableCell>
                              <span className="capitalize">{transaction.day}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-md">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-md">
                                      <DropdownMenuItem onClick={() => router.push(`/transactions/${transaction.id}`)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
              <TabsContent value="redemptions" className="space-y-4">
            <Card>
                  <CardHeader className="py-4">
                    <CardTitle>Redemptions</CardTitle>
                <CardDescription>
                      View all rewards redeemed by your customers
                </CardDescription>
              </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <SortButton field="createdAt">Date</SortButton>
                          </TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>
                            <SortButton field="type">Type</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="amount">Amount</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="status">Status</SortButton>
                          </TableHead>
                          <TableHead>Day</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex justify-center">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : filteredRedemptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <Gift className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-medium">
                                  No redemptions found
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {searchQuery ? "Try adjusting your search query" : 
                                   "No redemption records available"}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredRedemptions.map((redemption) => (
                            <TableRow key={redemption.id} className="hover:bg-muted/50">
                              <TableCell>
                                {formatDate(redemption.redemptionDate)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                  <span>{customers[redemption.customerId]?.fullName || 'Unknown Customer'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 rounded-md">
                                  <div className="flex items-center gap-1">
                                    <Gift className="h-4 w-4" />
                                    <span>{redemption.rewardName}</span>
                                  </div>
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <ArrowDown className="h-4 w-4 text-red-500" />
                                  <span>
                                    {redemption.pointsUsed === 0 ? (
                                      <span className="text-green-600 font-medium">Free</span>
                                    ) : (
                                      `${redemption.pointsUsed} points`
                                    )}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(redemption.status)}
                              </TableCell>
                              <TableCell>
                                <span>-</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-md">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-md">
                                      <DropdownMenuItem onClick={() => router.push(`/redemptions/${redemption.redemptionId}`)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 