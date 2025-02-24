"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Search, 
  Filter, 
  MoreVertical, 
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
  X
} from "lucide-react"
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
import { useCustomers } from "@/hooks/use-customers"
import { formatDistanceToNow } from 'date-fns'
import { cn } from "@/lib/utils"
import Link from "next/link"
import { SortField, SortDirection, CustomerCohort } from "@/lib/types"

export default function CustomersPage() {
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

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track your customer base
            </p>
          </div>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search customers..." 
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    Sort
                    {sortField !== 'lastTransactionDate' && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({sortField.replace(/([A-Z])/g, ' $1').toLowerCase()})
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                  <Button variant="outline" className="h-9">
                    <Filter className="h-4 w-4 mr-2" />
                    {cohort === 'all' ? 'All Customers' : cohort}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                  className="h-9 px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setSortField('lastTransactionDate')
                    setSortDirection('desc')
                    setCohort('all')
                    setSearch('')
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className="divide-y">
            <div className="px-4 py-2 bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="w-10" /> {/* Avatar space */}
                <div className="flex-1 grid grid-cols-5 gap-4 text-sm text-muted-foreground">
                  <div>Customer</div>
                  <div>Points</div>
                  <div>Transactions</div>
                  <div>Lifetime Spend</div>
                  <div>Last Visit</div>
                </div>
                <div className="w-8" /> {/* Actions space */}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No customers found</div>
            ) : (
              filteredCustomers.map((customer) => (
                <Link 
                  key={customer.customerId}
                  href={`/customers/${customer.customerId}`}
                  className="block"
                >
                  <div className="p-4 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                    <div className="h-10 w-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-medium">{customer.fullName}</h3>
                        {customer.membershipTier && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#007AFF]/10 text-[#007AFF]">
                            {customer.membershipTier}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {customer.pointsBalance.toLocaleString()} points
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {customer.lifetimeTransactionCount} transactions
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ${customer.totalLifetimeSpend} lifetime spend
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Last visit: {formatDate(customer.lastTransactionDate)}
                        </span>
                      </div>
                    </div>

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
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Edit Customer
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
} 