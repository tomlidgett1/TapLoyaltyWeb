"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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
  CalendarIcon,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Loader2,
  Clock,
  CreditCard,
  ShoppingBag,
  User,
  X
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, limit, Timestamp, where, doc, getDoc } from "firebase/firestore"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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

// Add a new interface for Square sales data
interface SquareSale {
  id: string;
  orderId: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  totalAmount: number;
  currency: string;
  customerName: string;
  customerId: string | null;
  source: string;
  lineItems: {
    name: string;
    quantity: string;
    unitPrice: number;
    totalPrice: number;
  }[];
}

// Add an interface for Lightspeed sales
interface LightspeedSale {
  saleID: string;
  timeStamp: string;
  discountPercent: string;
  completed: string;
  archived: string;
  voided: string;
  ticketNumber: string;
  calcTotal: string;
  calcSubtotal: string;
  calcTaxable: string;
  calcNonTaxable?: string; // Add this property as optional
  calcTax1: string;
  calcTax2?: string; // Make tax2 optional as well
  total: string;
  displayableTotal: string;
  balance: string;
  customerID: string;
  employeeID: string;
  registerID: string;
  shopID: string;
  isWorkOrder?: string;
  customerName?: string;
  items?: Array<{
    itemID: string;
    description: string;
    unitPrice: string;
    quantity: string;
    extPrice: string;
    name: string;
  }>;
}

// Add interface for Lightspeed Account
interface LightspeedAccount {
  accountID: string;
  name: string;
}

// Add a new interface for daily sales data
interface ProcessedSale extends LightspeedSale {
  // ProcessedSale extends LightspeedSale with any additional fields
  // that might be added during processing
}

type ActivityCategory = "all" | "transactions" | "redemptions" | "sales" | "lightspeed_sales"
type SortField = "createdAt" | "amount" | "status" | "type" | "customerId" | "day" | "saleID" | "timeStamp" | "ticketNumber" | "calcSubtotal" | "calcTax1" | "calcTax2" | "total" | "completed"
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
  const [squareSales, setSquareSales] = useState<SquareSale[]>([])
  const [loadingSales, setLoadingSales] = useState(false)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [lightspeedSales, setLightspeedSales] = useState<LightspeedSale[]>([])
  const [loadingLightspeedSales, setLoadingLightspeedSales] = useState(false)
  const [lightspeedError, setLightspeedError] = useState<string | null>(null)
  const [lightspeedAccountInfo, setLightspeedAccountInfo] = useState<LightspeedAccount | null>(null)
  const [selectedLightspeedSale, setSelectedLightspeedSale] = useState<LightspeedSale | null>(null)
  const [isLightspeedDrawerOpen, setIsLightspeedDrawerOpen] = useState(false)
  // Add pagination state variables for Lightspeed sales
  const [hasMoreLightspeedSales, setHasMoreLightspeedSales] = useState(true)
  const [lightspeedPage, setLightspeedPage] = useState(1)
  const [fetchingMoreSales, setFetchingMoreSales] = useState(false)
  const salesListRef = useRef<HTMLDivElement>(null)
  
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
      if (status in statusFilters && !statusFilters[status as keyof typeof statusFilters]) return false

      // Apply type filter for transactions
      if ('type' in item) {
        const type = item.type.toLowerCase()
        if (type in typeFilters && !typeFilters[type as keyof typeof typeFilters]) return false
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

  // Add a function to fetch Square sales
  const fetchSquareSales = async () => {
    if (!user?.uid) return
    
    try {
      setLoadingSales(true)
      setSalesError(null)
      
      const response = await fetch(`/api/square/orders?merchantId=${user.uid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales data')
      }
      
      if (data.success && Array.isArray(data.orders)) {
        setSquareSales(data.orders)
      } else {
        setSquareSales([])
      }
    } catch (error) {
      console.error('Error fetching Square orders:', error)
      setSalesError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      setLoadingSales(false)
    }
  }

  // Call fetchSquareSales when the selected tab is "sales"
  useEffect(() => {
    if (activityCategory === 'sales' && user?.uid) {
      fetchSquareSales()
    }
  }, [activityCategory, user?.uid])

  // Add function to fetch Lightspeed account info
  const fetchLightspeedAccountInfo = async () => {
    if (!user?.uid) return
    
    try {
      setLoadingLightspeedSales(true)
      setLightspeedError(null)
      
      // Fetch account info
      const response = await fetch(`/api/lightspeed/account?merchantId=${user.uid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Lightspeed account information')
      }
      
      if (data.success && data.account) {
        setLightspeedAccountInfo(data.account)
        
        // Now fetch the sales data with the account ID
        if (data.account.accountID) {
          fetchLightspeedSales(data.account.accountID)
        }
      } else {
        setLightspeedAccountInfo(null)
        setLightspeedError('No Lightspeed account found or API returned no data')
      }
    } catch (error) {
      console.error('Error fetching Lightspeed account:', error)
      setLightspeedError(error instanceof Error ? error.message : 'An unknown error occurred')
      setLoadingLightspeedSales(false)
    }
  }
  
  // Update the fetchLightspeedSales function to support pagination
  const fetchLightspeedSales = async (accountId: string, isLoadingMore = false) => {
    if (!user?.uid || !accountId) return
    
    try {
      if (!isLoadingMore) {
        setLoadingLightspeedSales(true)
      } else {
        setFetchingMoreSales(true)
      }
      
      // Add page parameter
      const page = isLoadingMore ? lightspeedPage + 1 : 1
      
      // Fetch sales data with pagination
      const response = await fetch(`/api/lightspeed/sales?merchantId=${user.uid}&accountId=${accountId}&pages=${page}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch Lightspeed sales data')
      }
      
      if (data.success && Array.isArray(data.sales)) {
        // Always trim to the 10 most-recent sales returned by the API
        const limitedSales = data.sales.slice(0, 10)

        if (isLoadingMore) {
          // When we are already loading more, merge but still respect the 10-item cap
          const combined = [...lightspeedSales, ...limitedSales].slice(0, 10)
          setLightspeedSales(combined)
          setLightspeedPage(page)
        } else {
          // Initial load – just keep the 10 most recent
          setLightspeedSales(limitedSales)
          setLightspeedPage(1)
        }

        // We've deliberately capped to 10 items, so don't request further pages
        setHasMoreLightspeedSales(false)
      } else {
        if (!isLoadingMore) {
          setLightspeedSales([])
        }
        setHasMoreLightspeedSales(false)
      }
    } catch (error) {
      console.error('Error fetching Lightspeed sales:', error)
      setLightspeedError(error instanceof Error ? error.message : 'An unknown error occurred')
    } finally {
      if (!isLoadingMore) {
        setLoadingLightspeedSales(false)
      } else {
        setFetchingMoreSales(false)
      }
    }
  }
  
  // Call fetchLightspeedAccountInfo when the selected tab is "lightspeed_sales"
  useEffect(() => {
    if (activityCategory === 'lightspeed_sales' && user?.uid) {
      fetchLightspeedAccountInfo()
    }
  }, [activityCategory, user?.uid])

  // Add function to handle opening the sale details drawer
  const handleViewLightspeedSale = (sale: LightspeedSale) => {
    setSelectedLightspeedSale(sale)
    setIsLightspeedDrawerOpen(true)
  }

  // Add function to handle Lightspeed Sales sorting
  const handleLightspeedSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field as SortField)
      setSortDirection("desc")
    }
  }

  // Add filter functions to apply the date filters to Lightspeed sales
  const applyLightspeedFilters = useMemo(() => {
    if (!lightspeedSales || lightspeedSales.length === 0) return [];
    
    return lightspeedSales.filter(sale => {
      const saleDate = new Date(sale.timeStamp);
      
      // Apply date filters
      if (dateFilter !== "all") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
        
        const endOfLastWeek = new Date(startOfWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() - 1);
        
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        
        switch (dateFilter) {
          case 'today':
            if (saleDate < today || saleDate >= new Date(today.getTime() + 86400000)) return false;
            break;
          case 'yesterday':
            if (saleDate < yesterday || saleDate >= today) return false;
            break;
          case 'thisWeek':
            if (saleDate < startOfWeek) return false;
            break;
          case 'lastWeek':
            if (saleDate < startOfLastWeek || saleDate >= startOfWeek) return false;
            break;
          case 'thisMonth':
            if (saleDate < startOfMonth) return false;
            break;
          case 'lastMonth':
            if (saleDate < startOfLastMonth || saleDate >= startOfMonth) return false;
            break;
          case 'custom':
            if (customDateRange.start && saleDate < customDateRange.start) return false;
            if (customDateRange.end) {
              const endDateWithTime = new Date(customDateRange.end);
              endDateWithTime.setHours(23, 59, 59, 999);
              if (saleDate > endDateWithTime) return false;
            }
            break;
        }
      }
      
      // Apply search query if present
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          sale.saleID.toLowerCase().includes(query) ||
          sale.ticketNumber.toLowerCase().includes(query) ||
          (sale.customerName && sale.customerName.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [lightspeedSales, dateFilter, customDateRange.start, customDateRange.end, searchQuery]);

  // Add sorting function for Lightspeed sales
  const sortedLightspeedSales = useMemo(() => {
    if (!applyLightspeedFilters || applyLightspeedFilters.length === 0) return [];
    
    return [...applyLightspeedFilters].sort((a, b) => {
      let valA, valB;
      
      switch (sortField) {
        case 'saleID':
          valA = a.saleID;
          valB = b.saleID;
          break;
        case 'timeStamp':
          valA = new Date(a.timeStamp).getTime();
          valB = new Date(b.timeStamp).getTime();
          break;
        case 'ticketNumber':
          valA = a.ticketNumber;
          valB = b.ticketNumber;
          break;
        case 'total':
          valA = parseFloat(a.total);
          valB = parseFloat(b.total);
          break;
        case 'calcSubtotal':
          valA = parseFloat(a.calcSubtotal);
          valB = parseFloat(b.calcSubtotal);
          break;
        case 'calcTax1':
          valA = parseFloat(a.calcTax1);
          valB = parseFloat(b.calcTax1);
          break;
        case 'completed':
          valA = a.completed === 'true' ? 1 : 0;
          valB = b.completed === 'true' ? 1 : 0;
          break;
        default:
          valA = new Date(a.timeStamp).getTime();
          valB = new Date(b.timeStamp).getTime();
      }
      
      if (sortDirection === 'asc') {
        return valA > valB ? 1 : -1;
      } else {
        return valA < valB ? 1 : -1;
      }
    });
  }, [applyLightspeedFilters, sortField, sortDirection]);

  // Add scroll handler for infinite scrolling
  const handleScroll = useCallback(() => {
    if (
      salesListRef.current &&
      window.innerHeight + window.scrollY >= salesListRef.current.offsetTop + salesListRef.current.clientHeight - 300 &&
      hasMoreLightspeedSales &&
      !fetchingMoreSales &&
      !loadingLightspeedSales &&
      activityCategory === 'lightspeed_sales' &&
      lightspeedAccountInfo?.accountID
    ) {
      fetchLightspeedSales(lightspeedAccountInfo.accountID, true)
    }
  }, [fetchingMoreSales, hasMoreLightspeedSales, lightspeedAccountInfo, loadingLightspeedSales, activityCategory])

  // Add effect for scroll handling
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <PageTransition>
      <div className="p-6 py-4">
        <PageHeader
          title="Activity"
        >
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </PageHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" className="w-full" onValueChange={(value) => setActivityCategory(value as ActivityCategory)}>
              <TabsList className="mx-auto mb-4">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
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
                <TabsTrigger value="sales" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Square Sales
                </TabsTrigger>
                <TabsTrigger value="lightspeed_sales" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Lightspeed Sales
                </TabsTrigger>
              </TabsList>
              
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant={dateFilter === "today" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("today")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Today
                  </Button>
                  <Button 
                    variant={dateFilter === "yesterday" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("yesterday")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Yesterday
                  </Button>
                  <Button 
                    variant={dateFilter === "thisWeek" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("thisWeek")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    This Week
                  </Button>
                  <Button 
                    variant={dateFilter === "lastWeek" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("lastWeek")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Last Week
                  </Button>
                  <Button 
                    variant={dateFilter === "thisMonth" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("thisMonth")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    This Month
                  </Button>
                  <Button 
                    variant={dateFilter === "all" ? "secondary" : "outline"} 
                    size="sm"
                    onClick={() => setDateFilter("all")}
                    className="rounded-md"
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    All Time
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 mt-2 md:mt-0">
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
              
              <TabsContent value="all" className="space-y-4">
                <Card className="rounded-lg border border-gray-200">
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
                <Card className="rounded-lg border border-gray-200">
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
                <Card className="rounded-lg border border-gray-200">
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

              <TabsContent value="sales" className="space-y-4">
                <Card className="rounded-lg border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle>Square Sales</CardTitle>
                    <CardDescription>
                      Sales data from your connected Square account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingSales ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      </div>
                    ) : salesError ? (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                        <p className="text-red-800 mb-2">Failed to load sales data</p>
                        <p className="text-sm text-red-600">{salesError}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={fetchSquareSales} 
                          className="mt-2"
                        >
                          Try Again
                        </Button>
                      </div>
                    ) : squareSales.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No sales data available</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {user?.uid ? 'Connect your Square account to see sales data' : 'Please log in to view sales data'}
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Order ID</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Customer</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {squareSales.map((sale) => (
                              <TableRow key={sale.id}>
                                <TableCell className="font-mono text-xs">{sale.orderId.substring(0, 8)}...</TableCell>
                                <TableCell>{formatDate(sale.createdAt)}</TableCell>
                                <TableCell>{sale.customerName}</TableCell>
                                <TableCell className="font-medium">
                                  {new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: sale.currency
                                  }).format(sale.totalAmount)}
                                </TableCell>
                                <TableCell>{sale.source}</TableCell>
                                <TableCell>
                                  <Badge variant="default">
                                    {sale.state}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => console.log('View details', sale)}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
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

              <TabsContent value="lightspeed_sales" className="space-y-4">
                <Card className="rounded-lg border border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle>Lightspeed Sales</CardTitle>
                    <CardDescription>
                      Sales data from your connected Lightspeed account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingLightspeedSales ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                      </div>
                    ) : lightspeedError ? (
                      <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <p className="text-red-800 mb-2">Failed to load Lightspeed sales data</p>
                        <p className="text-sm text-red-600">{lightspeedError}</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={fetchLightspeedAccountInfo} 
                          className="mt-2"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Try Again
                        </Button>
                      </div>
                    ) : lightspeedSales.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No Lightspeed sales data available</p>
                        <p className="text-sm text-gray-400 mt-1">
                          {lightspeedAccountInfo ? 'No sales records found in your Lightspeed account' : 'Connect your Lightspeed account to see sales data'}
                        </p>
                        {lightspeedAccountInfo && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchLightspeedAccountInfo} 
                            className="mt-4"
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Refresh Data
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        {lightspeedAccountInfo && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                            <p className="text-sm text-blue-700">
                              <span className="font-medium">Account:</span> {lightspeedAccountInfo.name} 
                              <span className="ml-3 font-medium">ID:</span> {lightspeedAccountInfo.accountID}
                            </p>
                          </div>
                        )}
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('saleID')}
                                >
                                  Sale ID
                                  {sortField === "saleID" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead>
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('timeStamp')}
                                >
                                  Date & Time
                                  {sortField === "timeStamp" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="hidden md:table-cell">Items</TableHead>
                              <TableHead>
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('ticketNumber')}
                                >
                                  Ticket Number
                                  {sortField === "ticketNumber" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="hidden md:table-cell">
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('calcSubtotal')}
                                >
                                  Subtotal
                                  {sortField === "calcSubtotal" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead className="hidden md:table-cell">
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('calcTax1')}
                                >
                                  Tax
                                  {sortField === "calcTax1" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead>
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('total')}
                                >
                                  Total
                                  {sortField === "total" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead>
                                <button 
                                  className="flex items-center hover:text-primary transition-colors"
                                  onClick={() => handleLightspeedSort('completed')}
                                >
                                  Status
                                  {sortField === "completed" && (
                                    sortDirection === "asc" ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                                  )}
                                </button>
                              </TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sortedLightspeedSales.map((sale) => (
                              <TableRow 
                                key={sale.saleID} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleViewLightspeedSale(sale)}
                              >
                                <TableCell className="font-mono text-xs">{sale.saleID}</TableCell>
                                <TableCell>{formatDate(sale.timeStamp)}</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {sale.items && sale.items.length > 0 ? (
                                    <div>
                                      <span className="font-medium">{sale.items[0].name || 'Unnamed Item'}</span>
                                      {sale.items.length > 1 && <span className="text-xs text-muted-foreground ml-2">+{sale.items.length - 1} more</span>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">No items</span>
                                  )}
                                </TableCell>
                                <TableCell>{sale.ticketNumber}</TableCell>
                                <TableCell className="hidden md:table-cell">${parseFloat(sale.calcSubtotal).toFixed(2)}</TableCell>
                                <TableCell className="hidden md:table-cell">${(parseFloat(sale.calcTax1) + parseFloat(sale.calcTax2 || '0')).toFixed(2)}</TableCell>
                                <TableCell className="font-medium">${parseFloat(sale.total).toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={sale.completed === "true" ? "default" : "outline"}
                                    className={cn(
                                      sale.voided === "true" ? "bg-red-100 text-red-700 border-red-200" : "",
                                      sale.isWorkOrder === "true" ? "bg-blue-100 text-blue-700 border-blue-200" : ""
                                    )}
                                  >
                                    {sale.isWorkOrder === "true" ? "Work Order" : 
                                     sale.voided === "true" ? "Voided" : 
                                     sale.completed === "true" ? "Completed" : "Pending"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                                    e.stopPropagation(); // Prevent row click from triggering
                                    handleViewLightspeedSale(sale);
                                  }}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
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
        </div>
      </div>

      {/* Add the slide-out drawer for Lightspeed sale details */}
      <Sheet open={isLightspeedDrawerOpen} onOpenChange={setIsLightspeedDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center">
              {selectedLightspeedSale?.isWorkOrder === "true" ? (
                <span className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-blue-500" />
                  Work Order #{selectedLightspeedSale?.ticketNumber || selectedLightspeedSale?.saleID}
                </span>
              ) : (
                <span className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-primary" />
                  Sale #{selectedLightspeedSale?.ticketNumber || selectedLightspeedSale?.saleID}
                </span>
              )}
            </SheetTitle>
            <SheetDescription>
              {selectedLightspeedSale ? formatDate(selectedLightspeedSale.timeStamp) : ''}
            </SheetDescription>
          </SheetHeader>
          <Separator />
          
          {selectedLightspeedSale && (
            <ScrollArea className="h-[calc(100vh-8rem)] py-4">
              <div className="space-y-6">
                {/* Sale Summary section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Sale Summary</h3>
                  <p className="text-sm text-muted-foreground mb-3">Overview of transaction details</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4 bg-primary/5">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <p className="text-2xl font-bold text-primary">${parseFloat(selectedLightspeedSale.total).toFixed(2)}</p>
                    </div>
                    <div className="border rounded-lg p-4 bg-muted/30">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <div className="mt-2">
                        <Badge 
                          variant={selectedLightspeedSale.completed === "true" ? "default" : "outline"}
                          className={cn(
                            selectedLightspeedSale.voided === "true" ? "bg-red-100 text-red-700 border-red-200" : "",
                            selectedLightspeedSale.isWorkOrder === "true" ? "bg-blue-100 text-blue-700 border-blue-200" : ""
                          )}
                        >
                          {selectedLightspeedSale.isWorkOrder === "true" ? "Work Order" : 
                           selectedLightspeedSale.voided === "true" ? "Voided" : 
                           selectedLightspeedSale.completed === "true" ? "Completed" : "Pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Subtotal</h4>
                      <p className="text-sm font-medium">${parseFloat(selectedLightspeedSale.calcSubtotal).toFixed(2)}</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Tax</h4>
                      <p className="text-sm font-medium">
                        ${(parseFloat(selectedLightspeedSale.calcTax1) + parseFloat(selectedLightspeedSale.calcTax2 || '0')).toFixed(2)}
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Discount</h4>
                      <p className="text-sm font-medium">
                        {parseFloat(selectedLightspeedSale.discountPercent) > 0 
                          ? `${selectedLightspeedSale.discountPercent}%` 
                          : "None"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Customer Information */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Customer</h3>
                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary/80" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedLightspeedSale.customerName || 'No customer assigned'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Customer ID: {selectedLightspeedSale.customerID !== "0" ? selectedLightspeedSale.customerID : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Sale Items section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Items</h3>
                  <p className="text-sm text-muted-foreground mb-3">Products and services in this sale</p>
                  
                  {selectedLightspeedSale.items && selectedLightspeedSale.items.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item Name</TableHead>
                            <TableHead className="hidden sm:table-cell">Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedLightspeedSale.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.name || 'Unnamed Item'}</TableCell>
                              <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                                {item.description || 'No description'}
                              </TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell className="text-right">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                              <TableCell className="text-right font-medium">${parseFloat(item.extPrice).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center p-6 border rounded-md bg-muted/5">
                      <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/60" />
                      <p className="mt-2 text-muted-foreground">No item details available</p>
                    </div>
                  )}
                </div>
                
                <Separator />
                
                {/* Sale Details section */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Additional Details</h3>
                  <p className="text-sm text-muted-foreground mb-3">Reference information</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Sale ID</h4>
                        <p className="text-sm font-mono bg-muted/20 p-1 rounded">{selectedLightspeedSale.saleID}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Ticket Number</h4>
                        <p className="text-sm">{selectedLightspeedSale.ticketNumber}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Date & Time</h4>
                        <p className="text-sm">{formatDate(selectedLightspeedSale.timeStamp)}</p>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4 space-y-3">
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Employee ID</h4>
                        <p className="text-sm">{selectedLightspeedSale.employeeID}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Register ID</h4>
                        <p className="text-sm">{selectedLightspeedSale.registerID}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">Shop ID</h4>
                        <p className="text-sm">{selectedLightspeedSale.shopID}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Completed</h4>
                      <p className="text-sm">
                        {selectedLightspeedSale.completed === "true" ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Voided</h4>
                      <p className="text-sm">
                        {selectedLightspeedSale.voided === "true" ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <h4 className="text-xs font-medium text-muted-foreground mb-1">Archived</h4>
                      <p className="text-sm">
                        {selectedLightspeedSale.archived === "true" ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="pt-4 mt-2 border-t sticky bottom-0 bg-background z-10">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setIsLightspeedDrawerOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      variant="default" 
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
      {/* Add loading indicator for infinite scrolling */}
      {fetchingMoreSales && (
        <div className="py-4 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading more sales...</p>
        </div>
      )}

      {/* Add the ref for the sales list container */}
      <div ref={salesListRef} className="h-4"></div>
    </PageTransition>
  )
} 