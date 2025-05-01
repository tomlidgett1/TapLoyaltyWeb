"use client"

import { useState, useMemo } from "react"
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
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  User, 
  ChevronUp, 
  ChevronDown,
  ArrowUpDown,
  AlignStartHorizontal,
  AlignEndHorizontal,
  Clock,
  DollarSign,
  ShoppingCart,
  Award,
  Users,
  UserCheck,
  UserMinus,
  UserX,
  UserPlus,
  BadgeCheck,
  Crown,
  X,
  Plus,
  Eye,
  Edit,
  Trash
} from "lucide-react"
import { useCustomers } from "@/hooks/use-customers"
import { formatDistanceToNow } from 'date-fns'
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { SortField, SortDirection, CustomerCohort } from "@/lib/types"
import { PageTransition } from "@/components/page-transition"

export default function CustomersPage() {
  const router = useRouter()
  const { customers, loading } = useCustomers()
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>('lastTransactionDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [cohort, setCohort] = useState<CustomerCohort>('all')

  // Filter and sort customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers]

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(customer => 
        customer.fullName.toLowerCase().includes(searchLower)
      )
    }

    // Cohort filter
    switch (cohort) {
      case 'active':
        result = result.filter(c => c.daysSinceLastVisit <= 30)
        break
      case 'engaged':
        result = result.filter(c => c.daysSinceLastVisit <= 90)
        break
      case 'at-risk':
        result = result.filter(c => 
          c.daysSinceLastVisit > 90 && c.daysSinceLastVisit <= 180
        )
        break
      case 'dormant':
        result = result.filter(c => c.daysSinceLastVisit > 180)
        break
      case 'new':
        result = result.filter(c => c.daysSinceFirstPurchase <= 30)
        break
      case 'loyal':
        result = result.filter(c => c.lifetimeTransactionCount >= 10)
        break
      case 'vip':
        // Get top 10% by spend
        const sortedBySpend = [...customers].sort((a, b) => 
          b.totalLifetimeSpend - a.totalLifetimeSpend
        )
        const topCount = Math.max(1, Math.ceil(customers.length * 0.1))
        const threshold = sortedBySpend[topCount - 1]?.totalLifetimeSpend
        result = result.filter(c => c.totalLifetimeSpend >= threshold)
        break
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName)
          break
        case 'lastTransactionDate':
          comparison = b.lastTransactionDate - a.lastTransactionDate
          break
        case 'totalLifetimeSpend':
          comparison = b.totalLifetimeSpend - a.totalLifetimeSpend
          break
        case 'redemptionCount':
          comparison = (b.redemptionCount || 0) - (a.redemptionCount || 0)
          break
        case 'pointsBalance':
          comparison = b.pointsBalance - a.pointsBalance
          break
        case 'lifetimeTransactionCount':
          comparison = b.lifetimeTransactionCount - a.lifetimeTransactionCount
          break
      }
      return sortDirection === 'desc' ? comparison : -comparison
    })

    return result
  }, [customers, search, sortField, sortDirection, cohort])

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronUp className="h-4 w-4" />
      )}
    </button>
  )

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  // First, add a function to check if any filters are active
  const hasActiveFilters = () => {
    return sortField !== 'lastTransactionDate' || 
           sortDirection !== 'desc' || 
           cohort !== 'all' ||
           search.length > 0
  }

  // Get cohort badge color
  const getCohortBadge = (customer: any) => {
    if (customer.daysSinceLastVisit <= 30) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 rounded-md">Active</Badge>
    } else if (customer.daysSinceLastVisit <= 90) {
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-md">Engaged</Badge>
    } else if (customer.daysSinceLastVisit <= 180) {
      return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 rounded-md">At Risk</Badge>
    } else {
      return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">Dormant</Badge>
    }
  }

  return (
    <PageTransition>
      <div className="p-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track your customer base
              </p>
            </div>
            
            <Button 
              className="h-9 gap-2 rounded-md"
              onClick={() => router.push('/customers/invite')}
            >
              <Users className="h-4 w-4" />
              Invite Customers
            </Button>
          </div>
          
          <Tabs defaultValue="all" onValueChange={(value) => setCohort(value as CustomerCohort)}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <TabsList className="h-9 rounded-md">
                <TabsTrigger value="all" className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  All Customers
                </TabsTrigger>
                <TabsTrigger value="active" className="flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="at-risk" className="flex items-center gap-1.5">
                  <UserMinus className="h-4 w-4" />
                  At Risk
                </TabsTrigger>
                <TabsTrigger value="dormant" className="flex items-center gap-1.5">
                  <UserX className="h-4 w-4" />
                  Dormant
                </TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="search" 
                    placeholder="Search customers..." 
                    className="pl-9 h-9 w-[250px] rounded-md"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 gap-2 rounded-md">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort
                      {sortField !== 'lastTransactionDate' && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          ({sortField.replace(/([A-Z])/g, ' $1').toLowerCase()})
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-md">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup 
                      value={`${sortField}-${sortDirection}`}
                      onValueChange={(value) => {
                        const [field, direction] = value.split('-')
                        setSortField(field as SortField)
                        setSortDirection(direction as SortDirection)
                      }}
                    >
                      <DropdownMenuRadioItem value="fullName-asc" className="flex items-center">
                        <AlignStartHorizontal className="mr-2 h-4 w-4" />
                        Name (A to Z)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="fullName-desc" className="flex items-center">
                        <AlignEndHorizontal className="mr-2 h-4 w-4" />
                        Name (Z to A)
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="lastTransactionDate-desc" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Most Recent Visit
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="lastTransactionDate-asc" className="flex items-center">
                        <Clock className="mr-2 h-4 w-4" />
                        Oldest Visit
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="totalLifetimeSpend-desc" className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Highest Spend
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="totalLifetimeSpend-asc" className="flex items-center">
                        <DollarSign className="mr-2 h-4 w-4" />
                        Lowest Spend
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="lifetimeTransactionCount-desc" className="flex items-center">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Most Transactions
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="lifetimeTransactionCount-asc" className="flex items-center">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Least Transactions
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="pointsBalance-desc" className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Highest Points
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="pointsBalance-asc" className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Lowest Points
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 gap-2 rounded-md">
                      <Filter className="h-4 w-4" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-md">
                    <DropdownMenuLabel>Customer Cohorts</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={cohort} onValueChange={(v) => setCohort(v as CustomerCohort)}>
                      <DropdownMenuRadioItem value="all" className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        All Customers
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="active" className="flex items-center">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Active (30d)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="engaged" className="flex items-center">
                        <BadgeCheck className="mr-2 h-4 w-4" />
                        Engaged (90d)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="at-risk" className="flex items-center">
                        <UserMinus className="mr-2 h-4 w-4" />
                        At Risk (90-180d)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dormant" className="flex items-center">
                        <UserX className="mr-2 h-4 w-4" />
                        Dormant (180d+)
                      </DropdownMenuRadioItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioItem value="new" className="flex items-center">
                        <UserPlus className="mr-2 h-4 w-4" />
                        New Customers
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="loyal" className="flex items-center">
                        <Award className="mr-2 h-4 w-4" />
                        Loyal (10+ visits)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="vip" className="flex items-center">
                        <Crown className="mr-2 h-4 w-4" />
                        VIP (Top 10%)
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {hasActiveFilters() && (
                  <Button 
                    variant="ghost" 
                    className="h-9 gap-2 rounded-md px-3 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSortField('lastTransactionDate')
                      setSortDirection('desc')
                      setCohort('all')
                      setSearch('')
                    }}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            {["all", "active", "at-risk", "dormant", "new", "loyal", "vip"].map((category) => (
              <TabsContent key={category} value={category} className="mt-0">
                <Card className="rounded-lg overflow-hidden">
                  <CardHeader className="py-4">
                    <CardTitle>
                      {category === "all" ? "All Customers" : 
                       category === "active" ? "Active Customers" : 
                       category === "at-risk" ? "At-Risk Customers" :
                       category === "dormant" ? "Dormant Customers" :
                       category === "new" ? "New Customers" :
                       category === "loyal" ? "Loyal Customers" :
                       "VIP Customers"}
                    </CardTitle>
                    <CardDescription>
                      {category === "all" ? "View and manage all your customers" : 
                       category === "active" ? "Customers who visited in the last 30 days" : 
                       category === "at-risk" ? "Customers who haven't visited in 90-180 days" :
                       category === "dormant" ? "Customers who haven't visited in over 180 days" :
                       category === "new" ? "Customers who joined in the last 30 days" :
                       category === "loyal" ? "Customers with 10+ transactions" :
                       "Your top 10% of customers by spend"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <SortButton field="fullName">Customer</SortButton>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>
                            <SortButton field="pointsBalance">Points</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="lifetimeTransactionCount">Transactions</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="totalLifetimeSpend">Lifetime Spend</SortButton>
                          </TableHead>
                          <TableHead>
                            <SortButton field="lastTransactionDate">Last Visit</SortButton>
                          </TableHead>
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
                        ) : filteredCustomers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center">
                                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                  <Users className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <h3 className="mt-4 text-lg font-medium">
                                  No customers found
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {search ? "Try adjusting your search query" : 
                                   `No ${category === "all" ? "" : category + " "}customers available`}
                                </p>
                                {!search && (
                                  <Button 
                                    className="mt-4 h-9 gap-2 rounded-md"
                                    onClick={() => router.push('/customers/invite')}
                                  >
                                    <Users className="h-4 w-4" />
                                    Invite Customers
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCustomers.map((customer) => (
                            <TableRow 
                              key={customer.customerId} 
                              className="hover:bg-muted/50 cursor-pointer"
                              onClick={() => router.push(`/customers/id?customerId=${customer.customerId}`)}
                            >
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                                      <img 
                                        src={customer.profileData.profilePictureUrl} 
                                        alt={customer.fullName}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <User className="h-5 w-5 text-[#007AFF]" />
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium">{customer.fullName}</div>
                                    {customer.membershipTier && (
                                      <div className="text-xs text-muted-foreground">
                                        {customer.membershipTier}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getCohortBadge(customer)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Award className="h-4 w-4 text-blue-600" />
                                  <span>{customer.pointsBalance.toLocaleString()}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                                  <span>{customer.lifetimeTransactionCount}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-4 w-4 text-green-600" />
                                  <span>${customer.totalLifetimeSpend}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {formatDate(customer.lastTransactionDate)}
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
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/customers/id?customerId=${customer.customerId}`);
                                      }}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        className="text-red-600"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Handle delete
                                        }}
                                      >
                                        <Trash className="h-4 w-4 mr-2" />
                                        Delete Customer
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
            ))}
          </Tabs>
        </div>
      </div>
    </PageTransition>
  )
} 