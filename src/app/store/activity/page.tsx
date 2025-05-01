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
  Zap,
  CalendarIcon
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, limit, Timestamp, where, doc, getDoc } from "firebase/firestore"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Calendar as UiCalendar } from "@/components/ui/calendar"

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
type SortField = "createdAt" | "amount" | "status" | "type" | "customerId" | "day"
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
  const [showFilters, setShowFilters] = useState(false)
  const [dateFilter, setDateFilter] = useState("all")
  const [statusFilters, setStatusFilters] = useState({
    completed: true,
    pending: true,
    failed: true
  })
  const [typeFilters, setTypeFilters] = useState({
    purchase: true,
    reward: true
  })
  const [amountRange, setAmountRange] = useState([0, 1000])
  const [customDateRange, setCustomDateRange] = useState<{start: Date | undefined, end: Date | undefined}>({
    start: undefined,
    end: undefined
  })
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)

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

  // Add a function to apply filters
  const applyFilters = (data: Transaction[] | Redemption[] | CombinedActivity[]) => {
    return data.filter(item => {
      // Apply status filter
      const status = item.status.toLowerCase()
      if (!statusFilters[status]) return false

      // Apply type filter for transactions
      if ('type' in item) {
        const type = item.type.toLowerCase()
        if (!typeFilters[type]) return false
      }

      // Apply date filter
      const date = 'date' in item ? item.date : 
                  'createdAt' in item ? item.createdAt : 
                  'redemptionDate' in item ? item.redemptionDate : null
      
      if (date) {
        const dateObj = typeof date === 'object' && 'seconds' in date ? 
          new Date(date.seconds * 1000) : 
          typeof date === 'string' ? new Date(date) : null
        
        if (!dateObj) return false
        
        if (dateFilter === "custom") {
          // Handle custom date range
          if (customDateRange.start && !customDateRange.end) {
            // If only start date is set, filter for items on or after start date
            return dateObj >= customDateRange.start
          } else if (!customDateRange.start && customDateRange.end) {
            // If only end date is set, filter for items on or before end date
            const endOfDay = new Date(customDateRange.end)
            endOfDay.setHours(23, 59, 59, 999)
            return dateObj <= endOfDay
          } else if (customDateRange.start && customDateRange.end) {
            // If both dates are set, filter for items between start and end dates
            const endOfDay = new Date(customDateRange.end)
            endOfDay.setHours(23, 59, 59, 999)
            return dateObj >= customDateRange.start && dateObj <= endOfDay
          }
          return true
        } else if (dateFilter !== "all") {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const thisWeekStart = new Date(today)
          thisWeekStart.setDate(today.getDate() - today.getDay())
          const lastWeekStart = new Date(thisWeekStart)
          lastWeekStart.setDate(lastWeekStart.getDate() - 7)
          const lastWeekEnd = new Date(thisWeekStart)
          lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          
          switch (dateFilter) {
            case "today":
              return dateObj >= today
            case "yesterday":
              return dateObj >= yesterday && dateObj < today
            case "thisWeek":
              return dateObj >= thisWeekStart
            case "lastWeek":
              return dateObj >= lastWeekStart && dateObj < thisWeekStart
            case "thisMonth":
              return dateObj >= thisMonthStart
            default:
              return true
          }
        }
      }

      // Apply amount filter
      const amount = 'amount' in item ? Number(item.amount) : 
                    'pointsUsed' in item ? item.pointsUsed : 0
      
      if (typeof amount === 'number' && (amount < amountRange[0] || amount > amountRange[1])) {
        return false
      }

      return true
    })
  }

  // Now define filteredTransactions AFTER applyFilters is defined
  const filteredTransactions = useMemo(() => {
    let filtered = transactions.filter(transaction => {
      const matchesSearch = !searchQuery ? true : (
        (transaction.customerId && transaction.customerId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (transaction.merchantName && transaction.merchantName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (transaction.type && transaction.type.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (transaction.status && transaction.status.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      const matchesCategory = 
        activityCategory === "all" || 
        (activityCategory === "transactions" && transaction.type.toLowerCase() === "purchase") ||
        (activityCategory === "redemptions" && transaction.type.toLowerCase() === "reward");
      
      return matchesSearch && matchesCategory;
    });
    
    // Apply additional filters
    filtered = applyFilters(filtered) as Transaction[];
    
    // Sort logic
    return filtered.sort((a, b) => {
      // Sort by selected field
      let comparison = 0;
      
      switch (sortField) {
        case "customerId":
          comparison = a.customerId.localeCompare(b.customerId);
          break;
        case "createdAt":
          const dateA = a.createdAt && typeof a.createdAt === 'object' && 'seconds' in a.createdAt 
            ? a.createdAt.seconds * 1000 
            : typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
          
          const dateB = b.createdAt && typeof b.createdAt === 'object' && 'seconds' in b.createdAt 
            ? b.createdAt.seconds * 1000 
            : typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
          
          comparison = dateA - dateB;
          break;
        case "amount":
          comparison = a.amount - b.amount;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "type":
          comparison = a.type.localeCompare(b.type);
          break;
        case "day":
          comparison = a.day ? a.day.localeCompare(b.day || "") : 0;
          break;
        default:
          comparison = 0;
      }
      
      // Apply sort direction
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [transactions, searchQuery, activityCategory, sortField, sortDirection, statusFilters, typeFilters, dateFilter, amountRange, customDateRange, showCustomDateRange]);

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

  // Completely revamped PDF export function
  const handleExportPDF = async () => {
    try {
      // First, dynamically import the necessary modules
      const jspdfModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      
      // Create a new document
      const doc = new jspdfModule.default();
      
      // Manually add the plugin to the document
      const autoTable = autoTableModule.default;
      
      // Add title
      doc.setFontSize(18);
      doc.text('Activity Report', 14, 22);
      
      // Add date generated
      doc.setFontSize(11);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 30);
      
      // Determine which data to export based on current tab
      let dataToExport = [];
      let title = '';
      
      if (activityCategory === 'all') {
        title = 'All Activity';
        dataToExport = combinedActivity.map(item => [
          formatDate(item.date),
          customers[item.customerId]?.fullName || 'Unknown Customer',
          item.displayName,
          typeof item.amount === 'number' ? `$${item.amount}` : item.amount,
          item.status
        ]);
      } else if (activityCategory === 'transactions') {
        title = 'Transactions';
        dataToExport = filteredTransactions.map(item => [
          formatDate(item.createdAt),
          customers[item.customerId]?.fullName || 'Unknown Customer',
          item.type,
          `$${item.amount}`,
          item.status
        ]);
      } else {
        title = 'Redemptions';
        dataToExport = filteredRedemptions.map(item => [
          formatDate(item.redemptionDate),
          customers[item.customerId]?.fullName || 'Unknown Customer',
          item.rewardName,
          item.pointsUsed === 0 ? 'Free' : `${item.pointsUsed} points`,
          item.status
        ]);
      }
      
      // Add subtitle with current view
      doc.setFontSize(14);
      doc.text(title, 14, 40);
      
      // Generate table using the imported autoTable function
      autoTable(doc, {
        startY: 45,
        head: [['Date', 'Customer', 'Type', 'Amount', 'Status']],
        body: dataToExport,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [66, 66, 66] }
      });
      
      // Save the PDF
      doc.save(`activity-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('There was an error generating the PDF. Please try again.');
    }
  };

  // Add a function to handle status filter changes
  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status.toLowerCase()]: checked
    }))
  }

  // Add a function to handle type filter changes
  const handleTypeFilterChange = (type: string, checked: boolean) => {
    setTypeFilters(prev => ({
      ...prev,
      [type.toLowerCase()]: checked
    }))
  }

  return (
    <div className="p-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track all transactions and redemptions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="h-9 gap-2 rounded-md"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" className="h-9 w-9 p-0 rounded-md">
              <Calendar className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActivityCategory(value as ActivityCategory)}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="all" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    All Activity
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="redemptions" className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    Redemptions
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2">
                  <div className="relative w-[250px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search activity..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Popover open={showFilters} onOpenChange={setShowFilters}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-1">
                        <Filter className="h-4 w-4" />
                        Filters
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-4" align="end">
                      <div className="space-y-4">
                        <h4 className="font-medium">Filter Activity</h4>
                        
                        <div className="space-y-2">
                          <Label>Date Range</Label>
                          <Select 
                            value={dateFilter} 
                            onValueChange={(value) => {
                              setDateFilter(value)
                              setShowCustomDateRange(value === "custom")
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select date range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Time</SelectItem>
                              <SelectItem value="today">Today</SelectItem>
                              <SelectItem value="yesterday">Yesterday</SelectItem>
                              <SelectItem value="thisWeek">This Week</SelectItem>
                              <SelectItem value="thisMonth">This Month</SelectItem>
                              <SelectItem value="custom">Custom Range</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {showCustomDateRange && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="grid gap-1">
                                <Label htmlFor="from">From</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="from"
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal px-4",
                                        !customDateRange.start && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {customDateRange.start ? format(customDateRange.start, "PP") : "Pick date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <UiCalendar
                                      mode="single"
                                      selected={customDateRange.start}
                                      onSelect={(date) => 
                                        setCustomDateRange(prev => ({ ...prev, start: date || undefined }))}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                              <div className="grid gap-1">
                                <Label htmlFor="to">To</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="to"
                                      variant={"outline"}
                                      className={cn(
                                        "w-full justify-start text-left font-normal px-4",
                                        !customDateRange.end && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {customDateRange.end ? format(customDateRange.end, "PP") : "Pick date"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <UiCalendar
                                      mode="single"
                                      selected={customDateRange.end}
                                      onSelect={(date) => 
                                        setCustomDateRange(prev => ({ ...prev, end: date || undefined }))}
                                      initialFocus
                                      disabled={(date) => 
                                        customDateRange.start ? date < customDateRange.start : false}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="status-completed" 
                                checked={statusFilters.completed}
                                onCheckedChange={(checked) => 
                                  handleStatusFilterChange('completed', checked as boolean)}
                              />
                              <Label htmlFor="status-completed" className="cursor-pointer">Completed</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="status-pending" 
                                checked={statusFilters.pending}
                                onCheckedChange={(checked) => 
                                  handleStatusFilterChange('pending', checked as boolean)}
                              />
                              <Label htmlFor="status-pending" className="cursor-pointer">Pending</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="status-failed" 
                                checked={statusFilters.failed}
                                onCheckedChange={(checked) => 
                                  handleStatusFilterChange('failed', checked as boolean)}
                              />
                              <Label htmlFor="status-failed" className="cursor-pointer">Failed</Label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="type-purchase" 
                                checked={typeFilters.purchase}
                                onCheckedChange={(checked) => 
                                  handleTypeFilterChange('purchase', checked as boolean)}
                              />
                              <Label htmlFor="type-purchase" className="cursor-pointer">Purchase</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="type-reward" 
                                checked={typeFilters.reward}
                                onCheckedChange={(checked) => 
                                  handleTypeFilterChange('reward', checked as boolean)}
                              />
                              <Label htmlFor="type-reward" className="cursor-pointer">Reward</Label>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Amount Range</Label>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="min-amount" className="text-xs">Min ($)</Label>
                              <Input
                                id="min-amount"
                                type="number"
                                min={0}
                                max={1000}
                                value={amountRange[0]}
                                onChange={(e) => setAmountRange([Number(e.target.value), amountRange[1]])}
                              />
                            </div>
                            <div>
                              <Label htmlFor="max-amount" className="text-xs">Max ($)</Label>
                              <Input
                                id="max-amount"
                                type="number"
                                min={0}
                                max={1000}
                                value={amountRange[1]}
                                onChange={(e) => setAmountRange([amountRange[0], Number(e.target.value)])}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setStatusFilters({ completed: true, pending: true, failed: true })
                              setTypeFilters({ purchase: true, reward: true })
                              setDateFilter("all")
                              setAmountRange([0, 1000])
                              setCustomDateRange({ start: undefined, end: undefined })
                              setShowCustomDateRange(false)
                            }}
                          >
                            Reset Filters
                          </Button>
                          <Button onClick={() => setShowFilters(false)}>Apply Filters</Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mb-4 border-b pb-4">
                <Button 
                  variant={dateFilter === "today" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("today")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "today" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Today
                </Button>
                <Button 
                  variant={dateFilter === "yesterday" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("yesterday")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "yesterday" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Yesterday
                </Button>
                <Button 
                  variant={dateFilter === "thisWeek" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("thisWeek")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "thisWeek" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  This Week
                </Button>
                <Button 
                  variant={dateFilter === "lastWeek" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("lastWeek")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "lastWeek" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Last Week
                </Button>
                <Button 
                  variant={dateFilter === "thisMonth" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("thisMonth")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "thisMonth" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  This Month
                </Button>
                <Button 
                  variant={dateFilter === "all" ? "default" : "outline"} 
                  size="sm"
                  onClick={() => setDateFilter("all")}
                  className={cn(
                    "rounded-full",
                    dateFilter === "all" && "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  All Time
                </Button>
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
                            <SortButton field="createdAt">
                              Date & Time
                            </SortButton>
                          </TableHead>
                          <TableHead className="w-[250px]">
                            <SortButton field="customerId">
                              Customer
                            </SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="type">
                              Type
                            </SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="amount">
                              Amount
                            </SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="status">
                              Status
                            </SortButton>
                          </TableHead>
                          <TableHead className="w-[50px]"></TableHead>
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
                                {activity.type === "transaction" ? (
                                  <div className="inline-block px-3 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                                    <span className={cn(
                                      activity.displayName.toLowerCase() === "purchase" 
                                        ? "text-emerald-600 font-medium" 
                                        : "text-rose-600 font-medium"
                                    )}>
                                      ${activity.amount}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="inline-block px-3 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                                    <span className={activity.amount === "Free" 
                                      ? "text-emerald-600 font-medium" 
                                      : "text-indigo-600 font-medium"}>
                                      {activity.amount === "Free" ? "Free" : `${activity.amount} points`}
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(activity.status)}
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
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("createdAt");
                                    setSortDirection(sortField === "createdAt" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Date & Time
                                  {sortField === "createdAt" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="w-[250px]">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("customerId");
                                    setSortDirection(sortField === "customerId" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Customer
                                  {sortField === "customerId" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("type");
                                    setSortDirection(sortField === "type" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Type
                                  {sortField === "type" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("amount");
                                    setSortDirection(sortField === "amount" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Amount
                                  {sortField === "amount" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("status");
                                    setSortDirection(sortField === "status" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Status
                                  {sortField === "status" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="w-[50px]"></TableHead>
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
                                  <div className="inline-block px-3 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                                      <span className={cn(
                                        transaction.type.toLowerCase() === "purchase" 
                                          ? "text-emerald-600 font-medium" 
                                          : "text-rose-600 font-medium"
                                      )}>
                                        ${transaction.amount}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                  {getStatusBadge(transaction.status)}
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
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("createdAt");
                                    setSortDirection(sortField === "createdAt" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Date & Time
                                  {sortField === "createdAt" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="w-[250px]">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("customerId");
                                    setSortDirection(sortField === "customerId" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Customer
                                  {sortField === "customerId" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("type");
                                    setSortDirection(sortField === "type" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Type
                                  {sortField === "type" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("amount");
                                    setSortDirection(sortField === "amount" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Amount
                                  {sortField === "amount" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead>
                                <Button 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSortField("status");
                                    setSortDirection(sortField === "status" && sortDirection === "asc" ? "desc" : "asc");
                                  }}
                                  className="flex items-center gap-1 px-0 font-medium"
                                >
                                  Status
                                  {sortField === "status" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableHead>
                              <TableHead className="w-[50px]"></TableHead>
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
                                    <div className="inline-block px-3 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                                      <span className={redemption.pointsUsed === 0 
                                        ? "text-emerald-600 font-medium" 
                                        : "text-indigo-600 font-medium"}>
                                        {redemption.pointsUsed === 0 ? "Free" : `${redemption.pointsUsed} points`}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(redemption.status)}
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
      </div>
    </div>
  )
} 