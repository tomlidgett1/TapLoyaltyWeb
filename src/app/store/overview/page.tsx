"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, getDocs, orderBy, limit, where, doc, getDoc, Timestamp } from "firebase/firestore"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useCustomers } from "@/hooks/use-customers"

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { RewardDetailSheet } from "@/components/reward-detail-sheet"
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { BannerScheduler } from "@/components/banner-scheduler"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { cn } from "@/lib/utils"
import { updateDoc, deleteDoc } from "firebase/firestore"

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
  Download,
  Coffee,
  Ticket,
  Award,
  Star,
  CreditCard,
  Globe,
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  ChevronUp,
  ChevronDown,
  HelpCircle,
  Percent,
  User,
  Trash2,
  Mail,
  ArrowLeft,
  Headphones,
  Inbox,
  Brain,
  BarChart3,
  Receipt,
  ShoppingCart,
  Calculator,
  FileText,
  X,
  ArrowUpRight
} from "lucide-react"

// Kibo Table Components
import {
  TableBody as KiboTableBody,
  TableCell as KiboTableCell,
  TableColumnHeader,
  TableHead as KiboTableHead,
  TableHeader as KiboTableHeader,
  TableHeaderGroup,
  TableProvider,
  TableRow as KiboTableRow,
} from '@/components/ui/kibo-ui/table'
import type { ColumnDef } from '@/components/ui/kibo-ui/table'

// Component interfaces
interface Reward {
  id: string;
  rewardName: string;
  name?: string;
  description: string;
  type: string;
  programtype?: string;
  programType?: string; // Add this field for the actual data
  category: "individual" | "customer-specific" | "program" | "agent";
  pointsCost: number;
  redemptionCount: number;
  status: string;
  createdAt: any;
  updatedAt: any;
  expiryDate?: any;
  imageUrl?: string;
  punchCount?: number;
  expiryDays?: number;
  customerIds?: string[];
  customers?: string[]; // Add this field for the actual data
  rewardVisibility?: string;
  conditions?: any[];
  limitations?: any[];
  hasActivePeriod: boolean;
  activePeriod: {
    startDate: string;
    endDate: string;
  };
  isActive: boolean;
  lastRedeemed?: Date | null;
  programName?: string;
  impressions: number;
  viewCount?: number;
  isAgentGenerated?: boolean;
  // Additional fields for program rewards
  uniqueCustomerIds?: string[];
  uniqueCustomersCount?: number;
  lastRedeemedAt?: any;
  rewardType?: string;
  voucherAmount?: number;
  rewardTypeDetails?: any;
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
  link?: string;
  color?: string;
  cssColor?: string;
  isActive: boolean;
  scheduleStartMinutes?: number;
  scheduleEndMinutes?: number;
  scheduleStartHour?: number;
  scheduleEndHour?: number;
  scheduled?: boolean;
  buttonText?: string;
  style?: string;
  merchantName?: string;
  visibilityType?: string;
  endsNextDay?: boolean;
  impressions?: number;
  impressioncustomercount?: number;
  bannerAction?: string;
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

// Activity interfaces
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

interface ActivityCustomer {
  id: string
  fullName: string
}

interface CombinedActivity {
  id: string
  type: "transaction" | "redemption"
  date: any
  customerId: string
  displayName: string
  amount: number | string
  status: string
  day?: string
  originalData: Transaction | Redemption
}

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

// Program Card Component
const ProgramCard = ({ 
  title, 
  description, 
  icon, 
  status,
  stats,
  onConfigure,
  onView
}: { 
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'inactive' | 'not-configured';
  stats?: { label: string; value: string | number }[];
  onConfigure?: () => void;
  onView?: () => void;
}) => {
  return (
    <div className="border border-gray-200 rounded-md p-6 flex flex-col bg-gray-50">
      <div className="flex items-start gap-4 mb-4">
        <div className="text-gray-600">
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {status === 'active' && (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
            {status === 'inactive' && (
              <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
                <XCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mb-4">{description}</p>
          
          {/* Stats section */}
          {stats && stats.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-white p-3 rounded-md border border-gray-200 text-xs">
                  <span className="font-medium block text-gray-700 mb-1">{stat.label}</span>
                  <span className="text-gray-900 font-mono">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-auto flex gap-2">
        {status === 'not-configured' ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onConfigure}
            className="flex-1 rounded-md"
          >
            Configure
            <ChevronRight size={14} className="ml-1 opacity-70" />
          </Button>
        ) : (
          <>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onView}
              className="flex-1 rounded-md"
            >
              View Details
              <ChevronRight size={14} className="ml-1 opacity-70" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onConfigure}
              className="rounded-md"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

const ProgramsTabContent = () => {
  const router = useRouter()
  const [activeProgramTab, setActiveProgramTab] = useState("coffee")
  
  // Sample data for top customers
  const getTopCustomers = (programType: string) => {
    const coffeeCustomers = [
      {
        id: 'top-1',
        name: 'Sarah Johnson',
        totalStamps: 47,
        totalSpent: 0,
        totalTransactions: 0,
        redeemed: 4,
        rank: 1
      },
      {
        id: 'top-2', 
        name: 'Emma Thompson',
        totalStamps: 32,
        totalSpent: 0,
        totalTransactions: 0,
        redeemed: 3,
        rank: 2
      },
      {
        id: 'top-3',
        name: 'Michael Chen',
        totalStamps: 28,
        totalSpent: 0,
        totalTransactions: 0,
        redeemed: 2,
        rank: 3
      },
      {
        id: 'top-4',
        name: 'Lisa Park',
        totalStamps: 21,
        totalSpent: 0,
        totalTransactions: 0,
        redeemed: 2,
        rank: 4
      },
      {
        id: 'top-5',
        name: 'David Kim',
        totalStamps: 18,
        totalSpent: 0,
        totalTransactions: 0,
        redeemed: 1,
        rank: 5
      }
    ]
    
    const voucherCustomers = [
      {
        id: 'top-6',
        name: 'David Wilson',
        totalStamps: 0,
        totalSpent: 1250,
        totalTransactions: 0,
        redeemed: 12,
        rank: 1
      },
      {
        id: 'top-7',
        name: 'Lisa Anderson',
        totalStamps: 0,
        totalSpent: 980,
        totalTransactions: 0,
        redeemed: 9,
        rank: 2
      },
      {
        id: 'top-8',
        name: 'James Roberts',
        totalStamps: 0,
        totalSpent: 750,
        totalTransactions: 0,
        redeemed: 7,
        rank: 3
      },
      {
        id: 'top-9',
        name: 'Maria Garcia',
        totalStamps: 0,
        totalSpent: 650,
        totalTransactions: 0,
        redeemed: 6,
        rank: 4
      },
      {
        id: 'top-10',
        name: 'Alex Turner',
        totalStamps: 0,
        totalSpent: 520,
        totalTransactions: 0,
        redeemed: 5,
        rank: 5
      }
    ]
    
    const transactionCustomers = [
    {
        id: 'top-11',
        name: 'John Brown',
        totalStamps: 0,
        totalSpent: 0,
        totalTransactions: 84,
        redeemed: 8,
        rank: 1
      },
      {
        id: 'top-12',
        name: 'Anna Martinez',
        totalStamps: 0,
        totalSpent: 0,
        totalTransactions: 67,
        redeemed: 6,
        rank: 2
      },
      {
        id: 'top-13',
        name: 'Chris Lee',
        totalStamps: 0,
        totalSpent: 0,
        totalTransactions: 52,
        redeemed: 5,
        rank: 3
      },
      {
        id: 'top-14',
        name: 'Sophie Chen',
        totalStamps: 0,
        totalSpent: 0,
        totalTransactions: 43,
        redeemed: 4,
        rank: 4
      },
      {
        id: 'top-15',
        name: 'Tom Wilson',
        totalStamps: 0,
        totalSpent: 0,
        totalTransactions: 38,
        redeemed: 3,
        rank: 5
      }
    ]
    
    switch(programType) {
      case 'coffee': return coffeeCustomers
      case 'voucher': return voucherCustomers  
      case 'transaction': return transactionCustomers
      default: return []
    }
  }
  
  // Sample data for recent transactions
  const getRecentTransactions = (programType: string) => {
    const coffeeTransactions = [
      {
        id: 'trans-1',
        customerName: 'Sarah Johnson',
        type: 'stamp_earned',
        description: 'Stamp earned - Large Latte',
        amount: 5.50,
        progress: '+1 stamp',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-2',
        customerName: 'Emma Thompson', 
        type: 'reward_redeemed',
        description: 'Free coffee redeemed',
        amount: 0,
        progress: 'Used 10 stamps',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
        status: 'completed'
    },
    {
        id: 'trans-3',
        customerName: 'Michael Chen',
        type: 'stamp_earned',
        description: 'Stamp earned - Cappuccino',
        amount: 4.75,
        progress: '+1 stamp',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-4',
        customerName: 'Lisa Park',
        type: 'stamp_earned',
        description: 'Stamp earned - Americano',
        amount: 3.25,
        progress: '+1 stamp',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-5',
        customerName: 'David Kim',
        type: 'reward_redeemed',
        description: 'Free coffee redeemed',
        amount: 0,
        progress: 'Used 10 stamps',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: 'completed'
      }
    ]
    
    const voucherTransactions = [
      {
        id: 'trans-6',
        customerName: 'David Wilson',
        type: 'progress_made',
        description: 'Purchase towards voucher',
        amount: 25.00,
        progress: '+$25 progress',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-7',
        customerName: 'Lisa Anderson',
        type: 'voucher_redeemed',
        description: '$10 voucher redeemed',
        amount: 45.00,
        progress: 'Used $100 spend',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-8',
        customerName: 'James Roberts',
        type: 'progress_made',
        description: 'Purchase towards voucher',
        amount: 15.75,
        progress: '+$15.75 progress',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-9',
        customerName: 'Maria Garcia',
        type: 'voucher_redeemed',
        description: '$10 voucher redeemed',
        amount: 32.50,
        progress: 'Used $100 spend',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'completed'
      }
    ]
    
    const transactionTransactions = [
      {
        id: 'trans-10',
        customerName: 'John Brown',
        type: 'transaction_counted',
        description: 'Transaction counted',
        amount: 12.50,
        progress: '+1 transaction',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: 'completed'
    },
    {
        id: 'trans-11',
        customerName: 'Anna Martinez',
        type: 'reward_earned',
        description: 'Transaction reward earned',
        amount: 0,
        progress: 'Completed 10 transactions',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-12',
        customerName: 'Chris Lee',
        type: 'transaction_counted',
        description: 'Transaction counted',
        amount: 18.75,
        progress: '+1 transaction',
        timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000),
        status: 'completed'
      },
      {
        id: 'trans-13',
        customerName: 'Sophie Chen',
        type: 'transaction_counted',
        description: 'Transaction counted',
        amount: 8.25,
        progress: '+1 transaction',
        timestamp: new Date(Date.now() - 14 * 60 * 60 * 1000),
        status: 'completed'
      }
    ]
    
    switch(programType) {
      case 'coffee': return coffeeTransactions
      case 'voucher': return voucherTransactions
      case 'transaction': return transactionTransactions
      default: return []
    }
  }
  
  // Column definitions for top customers table
  const topCustomersColumns: ColumnDef<ReturnType<typeof getTopCustomers>[number]>[] = [
    {
      accessorKey: 'rank',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Rank" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
            row.original.rank === 1 ? "bg-yellow-100 text-yellow-800" :
            row.original.rank === 2 ? "bg-gray-100 text-gray-800" :
            row.original.rank === 3 ? "bg-amber-100 text-amber-800" :
            "bg-blue-100 text-blue-800"
          )}>
            {row.original.rank}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="size-6">
            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
              {row.original.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium text-sm">{row.original.name}</div>
        </div>
      ),
    },
    {
      accessorKey: 'metric',
      header: ({ column }) => (
        <TableColumnHeader column={column} title={
          activeProgramTab === 'coffee' ? 'Stamps' :
          activeProgramTab === 'voucher' ? 'Spent' : 'Transactions'
        } />
      ),
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {activeProgramTab === 'coffee' ? row.original.totalStamps :
           activeProgramTab === 'voucher' ? `$${row.original.totalSpent}` :
           row.original.totalTransactions}
        </div>
      ),
    },
    {
      accessorKey: 'redeemed',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Redeemed" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Award className="h-3 w-3 text-amber-500" />
          <span className="text-sm font-medium">{row.original.redeemed}</span>
        </div>
      ),
    },
  ]
  
  // Column definitions for transactions table
  const transactionsColumns: ColumnDef<ReturnType<typeof getRecentTransactions>[number]>[] = [
    {
      accessorKey: 'customerName',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Customer" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-orange-100 text-orange-600">
              {row.original.customerName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium text-sm">{row.original.customerName}</div>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Transaction" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-sm">{row.original.description}</div>
          <div className="text-xs text-muted-foreground capitalize">{row.original.type.replace('_', ' ')}</div>
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Amount" />
      ),
      cell: ({ row }) => (
        <div className="text-sm font-medium">
          {row.original.amount > 0 ? `$${row.original.amount.toFixed(2)}` : 'Free'}
        </div>
      ),
    },
    {
      accessorKey: 'progress',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Progress" />
      ),
      cell: ({ row }) => (
        <Badge 
          variant="outline" 
          className={cn(
            "rounded-md",
            row.original.type.includes('earned') || row.original.type.includes('progress') 
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-purple-50 text-purple-700 border-purple-200"
          )}
        >
          {row.original.progress}
        </Badge>
      ),
    },
    {
      accessorKey: 'timestamp',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Time" />
      ),
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{format(row.original.timestamp, 'MMM d')}</div>
          <div className="text-xs text-muted-foreground">
            {format(row.original.timestamp, 'h:mm a')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium capitalize">{row.original.status}</span>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Small Tabs */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
        <button
          onClick={() => setActiveProgramTab("coffee")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeProgramTab === "coffee"
              ? "text-gray-800 bg-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200/70"
          )}
        >
          <Coffee className="h-3 w-3" />
          Coffee Program
        </button>
        <button
          onClick={() => setActiveProgramTab("voucher")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeProgramTab === "voucher"
              ? "text-gray-800 bg-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200/70"
          )}
        >
          <Percent className="h-3 w-3" />
          Recurring Voucher
        </button>
        <button
          onClick={() => setActiveProgramTab("transaction")}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
            activeProgramTab === "transaction"
              ? "text-gray-800 bg-white shadow-sm"
              : "text-gray-600 hover:bg-gray-200/70"
          )}
        >
          <ShoppingBag className="h-3 w-3" />
          Transaction Program
        </button>
        </div>

      {/* Tables Row - 2/3 + 1/3 Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left - Transactions Table (2/3) */}
        <div className="col-span-8">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
        <Button 
              size="sm" 
              variant="outline"
              className="rounded-md text-xs px-3 py-1 h-7"
              onClick={() => router.push('/programs')}
        >
              View All
              <ChevronRight size={14} className="ml-1 opacity-70" />
        </Button>
      </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <TableProvider columns={transactionsColumns} data={getRecentTransactions(activeProgramTab)}>
              <KiboTableHeader>
                {({ headerGroup }) => (
                  <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                    {({ header }) => <KiboTableHead key={header.id} header={header} />}
                  </TableHeaderGroup>
                )}
              </KiboTableHeader>
              <KiboTableBody>
                {({ row }) => (
                  <KiboTableRow key={row.id} row={row}>
                    {({ cell }) => <KiboTableCell key={cell.id} cell={cell} />}
                  </KiboTableRow>
                )}
              </KiboTableBody>
            </TableProvider>
          </div>
      </div>

        {/* Right - Top Customers Table (1/3) */}
        <div className="col-span-4">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Customers</h3>
            <Button 
              size="sm" 
              variant="outline"
              className="rounded-md text-xs px-3 py-1 h-7"
              onClick={() => router.push('/customers')}
            >
              View All
              <ChevronRight size={14} className="ml-1 opacity-70" />
            </Button>
          </div>
          
          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <TableProvider columns={topCustomersColumns} data={getTopCustomers(activeProgramTab)}>
              <KiboTableHeader>
                {({ headerGroup }) => (
                  <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                    {({ header }) => <KiboTableHead key={header.id} header={header} />}
                  </TableHeaderGroup>
                )}
              </KiboTableHeader>
              <KiboTableBody>
                {({ row }) => (
                  <KiboTableRow key={row.id} row={row}>
                    {({ cell }) => <KiboTableCell key={cell.id} cell={cell} />}
                  </KiboTableRow>
                )}
              </KiboTableBody>
            </TableProvider>
          </div>
        </div>
      </div>
    </div>
  )
}

// Component to display customer names list
function CustomerNamesList({ customerIds }: { customerIds: string[] }) {
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomerNames() {
      console.log('👥 CustomerNamesList: Fetching names for customerIds:', customerIds);
      const names: Record<string, string> = {};
      
      for (const customerId of customerIds.slice(0, 5)) { // Limit to first 5
        try {
          const customerDoc = await getDoc(doc(db, 'customers', customerId));
          if (customerDoc.exists()) {
            const customerData = customerDoc.data();
            names[customerId] = customerData.fullName || customerData.firstName || customerData.name || 'Unknown';
          } else {
            names[customerId] = 'Unknown';
          }
        } catch (error) {
          console.error('Error fetching customer name:', error);
          names[customerId] = 'Unknown';
        }
      }
      
      console.log('👥 CustomerNamesList: Fetched names:', names);
      setCustomerNames(names);
      setLoading(false);
    }

    fetchCustomerNames();
  }, [customerIds]);

  if (loading) {
    console.log('👥 CustomerNamesList: Loading...');
    return <span>Loading...</span>;
  }

  const displayNames = customerIds.slice(0, 3).map(id => customerNames[id] || 'Unknown');
  const displayText = displayNames.join(', ');
  const moreCount = customerIds.length > 3 ? customerIds.length - 3 : 0;

  console.log('👥 CustomerNamesList: Rendering with displayText:', displayText);

  return (
    <span>
      {displayText}
      {moreCount > 0 && ` +${moreCount} more`}
    </span>
  );
}

// Full Rewards Tab Component
const RewardPreviewCard = ({ reward }: { reward: Reward }) => {
  // Check if this is a network reward
  if ((reward as any).isNetworkReward) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-72">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {reward.rewardName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {reward.description}
            </p>
            <div className="flex items-center gap-1 mt-1 flex-nowrap">
              <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                ${(reward as any).discountValue || '10'} Off
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Min. spend: ${(reward as any).minimumSpend || '50'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg px-2 py-1 ml-3">
            <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {(reward as any).networkPointsCost || reward.pointsCost || '100'}
            </span>
            <Globe className="w-3 h-3 ml-1" />
          </div>
        </div>
      </div>
    );
  }

  // Regular reward preview
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-72">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            {reward.rewardName}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
            {reward.description}
          </p>
        </div>
        <div 
          className={cn(
            "flex items-center justify-center rounded-md px-2 py-1 ml-3",
            reward.programType === 'coffeeprogramnew'
              ? "text-white"
              : (reward.programType === 'voucher' || reward.programType === 'voucherprogramnew')
                ? "bg-orange-400 text-white"
                : (reward.pointsCost === 0) 
                  ? "bg-green-500 text-white" 
                  : "bg-blue-500 text-white"
          )}
          style={reward.programType === 'coffeeprogramnew' ? { backgroundColor: '#895129' } : {}}
        >
          {reward.programType === 'coffeeprogramnew' ? (
            <>
              <Coffee className="w-3 h-3 mr-1 fill-white" />
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Free Coffee
              </span>
            </>
          ) : (reward.programType === 'voucher' || reward.programType === 'voucherprogramnew') ? (
            <>
              <CreditCard className="w-3 h-3 mr-1" />
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                ${(reward as any).voucherAmount || '0'} voucher
              </span>
            </>
          ) : (reward.pointsCost === 0) ? (
            <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              Free
            </span>
          ) : (
            <>
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {reward.pointsCost}
              </span>
              <Star className="w-3 h-3 ml-1 fill-white" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const VisibilityStats = ({ rewardId }: { rewardId: string }) => {
  const { user } = useAuth()
  const [visibilityData, setVisibilityData] = useState<{ canSee: number; canRedeem: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchVisibilityStats() {
      if (!user?.uid || !rewardId) return
      
      try {
        setLoading(true)
        
        // Get all customers for this merchant
        const customersRef = collection(db, 'merchants', user.uid, 'customers')
        const customersSnapshot = await getDocs(customersRef)
        
        // For each customer, check their visibility status for this reward
        const visibilityPromises = customersSnapshot.docs.map(async (customerDoc) => {
          const customerId = customerDoc.id
          
          try {
            // Check if this customer has visibility data for this reward
            const customerRewardRef = doc(db, 'customers', customerId, 'rewards', rewardId)
            const customerRewardDoc = await getDoc(customerRewardRef)
            
            let visible = false
            let redeemable = false
            
            if (customerRewardDoc.exists()) {
              const rewardData = customerRewardDoc.data()
              visible = rewardData.visible || false
              redeemable = rewardData.redeemable || false
            }
            
            return { visible, redeemable }
          } catch (error) {
            console.error(`Error fetching visibility for customer ${customerId}:`, error)
            return { visible: false, redeemable: false }
          }
        })
        
        const results = await Promise.all(visibilityPromises)
        const canSee = results.filter(r => r.visible).length
        const canRedeem = results.filter(r => r.visible && r.redeemable).length
        
        setVisibilityData({ canSee, canRedeem })
      } catch (error) {
        console.error("Error fetching visibility stats:", error)
        setVisibilityData({ canSee: 0, canRedeem: 0 })
      } finally {
        setLoading(false)
      }
    }

    fetchVisibilityStats()
  }, [rewardId, user?.uid])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-12 mx-auto mb-1"></div>
        <div className="h-3 bg-gray-200 rounded w-16 mx-auto"></div>
      </div>
    )
  }

  if (!visibilityData) {
    return (
      <div className="text-xs text-gray-400">
        Error loading
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 justify-center">
        <Eye className="h-3 w-3 text-blue-600" />
        <span className="font-medium text-blue-600 text-xs">{visibilityData.canSee}</span>
      </div>
      <div className="flex items-center gap-1 justify-center">
        <CheckCircle className="h-3 w-3 text-green-600" />
        <span className="font-medium text-green-600 text-xs">{visibilityData.canRedeem}</span>
      </div>
    </div>
  )
}

const RewardsTabContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [rewardsData, setRewardsData] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [rewardCategory, setRewardCategory] = useState<"all" | "individual" | "customer-specific" | "programs" | "agent">("all")
  const [sortField, setSortField] = useState<"rewardName" | "type" | "programType" | "pointsCost" | "redemptionCount" | "impressions" | "createdAt" | "lastRedeemed" | "isActive">("rewardName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loadingRewards, setLoadingRewards] = useState(true)
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null)
  const [isRewardDetailOpen, setIsRewardDetailOpen] = useState(false)
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({})
  const [customerNames, setCustomerNames] = useState<Record<string, string>>({})
  const [isSearchOpen, setIsSearchOpen] = useState(false)

    // Function to get customer name by ID from top-level customers collection
  const getCustomerName = async (customerId: string): Promise<string> => {
    if (customerNames[customerId]) {
      return customerNames[customerId]
    }
    
    try {
      const customerRef = doc(db, 'customers', customerId)
      const customerSnap = await getDoc(customerRef)
      
      if (customerSnap.exists()) {
        const customerData = customerSnap.data()
        const fullName = customerData.fullName || customerData.firstName || customerData.name || 'Unknown'
        
        // Cache the name
        setCustomerNames(prev => ({
          ...prev,
          [customerId]: fullName
        }))
        
        return fullName
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
    
    return 'Unknown Customer'
  }

  // Load customer names for program rewards only (no preloading of eligible customers)
  useEffect(() => {
    const loadCustomerNames = async () => {
      if (!user?.uid || rewardsData.length === 0) return
      
      // Only load customer names for program rewards (existing functionality)
      const programRewards = rewardsData.filter(reward => 
        reward.programType && (
          reward.programType === "coffeeprogramnew" || 
          reward.programType === "voucherprogramnew" || 
          reward.programType === "transactionrewardsnew"
        )
      )
      
      const customerIds = new Set<string>()
      programRewards.forEach(reward => {
        if (reward.customers) {
          reward.customers.forEach(customerId => customerIds.add(customerId))
        }
      })
      
      // Fetch customer names in batches
      for (const customerId of customerIds) {
        getCustomerName(customerId)
      }
    }
    
    loadCustomerNames()
  }, [rewardsData, user?.uid])

  // Fetch rewards data
  useEffect(() => {
    const fetchRewardsData = async () => {
      if (!user?.uid) return
      
      try {
        setLoadingRewards(true)
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const q = query(rewardsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const fetchedRewards: Reward[] = []
        
        querySnapshot.forEach(doc => {
          try {
            const data = doc.data()
            
            // Debug logging for customer data
            if (data.programType && (
              data.programType === "coffeeprogramnew" || 
              data.programType === "voucherprogramnew" || 
              data.programType === "transactionrewardsnew"
            )) {
              console.log('🔍 Found program reward:', {
                id: doc.id,
                rewardName: data.rewardName,
                programType: data.programType,
                customers: data.customers,
                uniqueCustomerIds: data.uniqueCustomerIds
              });
            }
            
            let createdAt, updatedAt, lastRedeemed;
            try {
              createdAt = data.createdAt?.toDate() || new Date();
              updatedAt = data.updatedAt?.toDate() || data.createdAt?.toDate() || new Date();
              lastRedeemed = data.lastRedeemed ? data.lastRedeemed.toDate() : null;
            } catch (dateError) {
              createdAt = new Date();
              updatedAt = new Date();
              lastRedeemed = null;
            }
            
            fetchedRewards.push({
              ...data,
              id: doc.id,
              rewardName: data.rewardName || data.name || 'Unnamed Reward',
              description: data.description || '',
              type: data.type || 'gift',
              programtype: data.programtype || '',
              programType: data.programType || '', // Include programType
              category: data.category || 'individual',
              pointsCost: data.pointsCost || 0,
              redemptionCount: data.redemptionCount || 0,
              status: data.status || 'active',
              createdAt,
              updatedAt,
              lastRedeemed,
              isActive: !!data.isActive,
              impressions: data.impressions || 0,

              hasActivePeriod: !!data.hasActivePeriod,
              activePeriod: data.activePeriod || { startDate: '', endDate: '' },
              customers: data.customers || [], // Include customers array
              uniqueCustomerIds: data.uniqueCustomerIds || [], // Include uniqueCustomerIds as fallback
            } as Reward);
          } catch (err) {
            console.error("Error processing reward document:", err, "Document ID:", doc.id);
          }
        });
        
        setRewardsData(fetchedRewards)
      } catch (error) {
        console.error("Error fetching rewards:", error)
      } finally {
        setLoadingRewards(false);
      }
    }
    
    fetchRewardsData()
  }, [user])

  // Helper functions
  const getRewardTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'coffee':
        return <Coffee className="h-5 w-5 text-blue-600" />;
      case 'ticket':
        return <Ticket className="h-5 w-5 text-blue-600" />;
      case 'discount':
        return <Tag className="h-5 w-5 text-blue-600" />;
      case 'gift':
        return <Gift className="h-5 w-5 text-blue-600" />;
      default:
        return <Gift className="h-5 w-5 text-blue-600" />;
    }
  };

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }



  const getFilteredRewards = () => {
    console.log('🔍 getFilteredRewards called');
    console.log('📊 rewardCategory:', rewardCategory);
    console.log('🔍 searchQuery:', searchQuery);
    console.log('📋 rewardsData length:', rewardsData.length);
    
    let filtered = [...rewardsData]
    console.log('🔄 Starting with rewards:', filtered.length);
      
      // Apply search filter
    if (searchQuery) {
      console.log('🔍 Applying search filter for:', searchQuery);
      filtered = filtered.filter(reward => 
        reward.rewardName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reward.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
      console.log('🔍 After search filter:', filtered.length);
    }

      // Apply category filter
    if (rewardCategory !== "all") {
      console.log('🏷️ Applying category filter for:', rewardCategory);
      console.log('🏷️ Sample reward programTypes:', rewardsData.slice(0, 5).map(r => ({ name: r.rewardName, category: r.category, programType: r.programType })));
      
      filtered = filtered.filter(reward => {
        if (rewardCategory === "programs") {
          // Check for program types
          const isProgram = reward.programType && (
            reward.programType === "coffeeprogramnew" || 
            reward.programType === "voucherprogramnew" || 
            reward.programType === "transactionrewardsnew"
          );
          if (isProgram) {
            console.log('✅ Program reward passed filter:', {
              name: reward.rewardName,
              programType: reward.programType,
              customers: reward.customers,
              hasCustomers: !!(reward.customers && reward.customers.length > 0)
            });
          }
          return isProgram;
        }
        return reward.category === rewardCategory
      })
      console.log('🏷️ After category filter:', filtered.length);
    }

    console.log('✅ Final filtered rewards:', filtered.length);
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "rewardName":
          comparison = (a.rewardName || "").localeCompare(b.rewardName || "");
          break;
        case "type":
          comparison = (a.type || "").localeCompare(b.type || "");
          break;
        case "programType":
          comparison = (a.programType || "").localeCompare(b.programType || "");
          break;
        case "pointsCost":
          comparison = (a.pointsCost || 0) - (b.pointsCost || 0);
          break;
        case "redemptionCount":
          comparison = (a.redemptionCount || 0) - (b.redemptionCount || 0);
          break;
        case "impressions":
          comparison = (a.impressions || 0) - (b.impressions || 0);
          break;
        case "createdAt":
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          comparison = aTime - bTime;
          break;
        case "lastRedeemed":
          const aRedeemed = a.lastRedeemed ? a.lastRedeemed.getTime() : 0;
          const bRedeemed = b.lastRedeemed ? b.lastRedeemed.getTime() : 0;
          comparison = aRedeemed - bRedeemed;
          break;
        case "isActive":
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    })
  }

  const toggleRewardStatus = async (rewardId: string, currentStatus: boolean) => {
    if (!user?.uid) return;
    
    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
      
      await updateDoc(rewardRef, { 
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      setRewardsData(rewardsData.map(reward => 
        reward.id === rewardId 
          ? { ...reward, isActive: !currentStatus } 
          : reward
      ));
      
    } catch (error) {
      console.error("Error toggling reward status:", error);
    }
  };

  const deleteReward = (id: string) => {
    setRewardToDelete(id)
  }

  const confirmDelete = async () => {
    if (!rewardToDelete || !user) return
    
    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardToDelete)
      await deleteDoc(rewardRef)
      
      setRewardsData(prev => prev.filter(reward => reward.id !== rewardToDelete))
    } catch (error) {
      console.error("Error deleting reward:", error)
    } finally {
      setRewardToDelete(null)
    }
  }

  const handleViewReward = (rewardId: string) => {
    setSelectedRewardId(rewardId);
    setIsRewardDetailOpen(true);
  };

  const handleExportPDF = async () => {
    try {
      const jspdfModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      
      const doc = new jspdfModule.default();
      const autoTable = autoTableModule.default;
      
      doc.setFontSize(18);
      doc.text('Rewards Report', 14, 22);
      
      doc.setFontSize(11);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 30);
      
      const dataToExport = getFilteredRewards().map(reward => [
        reward.rewardName,
        reward.description || '',
        reward.pointsCost || 0,
        reward.isActive ? 'Active' : 'Inactive',
        reward.type || '',
        reward.redemptionCount || 0,
        reward.createdAt ? format(reward.createdAt, 'MMM d, yyyy') : ''
      ]);
      
      autoTable(doc, {
        head: [['Name', 'Description', 'Points Cost', 'Status', 'Type', 'Redemptions', 'Created Date']],
        body: dataToExport,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [0, 102, 255], textColor: 255 }
      });
      
      doc.save('rewards-report.pdf');
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

    const [eligibleCustomers, setEligibleCustomers] = useState<Record<string, Array<{
    id: string, 
    fullName: string,
    currentCohort?: { name: string },
    daysSinceLastVisit?: number,
    lifetimeTransactionCount?: number
  }>>>({})

  const getEligibleCustomers = async (rewardId: string): Promise<Array<{
    id: string, 
    fullName: string,
    currentCohort?: { name: string },
    daysSinceLastVisit?: number,
    lifetimeTransactionCount?: number
  }>> => {
    console.log('🔍 getEligibleCustomers called for rewardId:', rewardId)
    console.log('👤 User UID:', user?.uid)
    
    if (!user?.uid) {
      console.log('❌ No user UID found')
      return []
    }
    
    // Check if we already have this data cached
    if (eligibleCustomers[rewardId]) {
      console.log('✅ Using cached data for reward:', rewardId, eligibleCustomers[rewardId])
      return eligibleCustomers[rewardId]
    }

    try {
      console.log('🏪 Fetching customers from merchants/', user.uid, '/customers')
      
      // Get all customers from merchant's customer collection
      const merchantCustomersRef = collection(db, 'merchants', user.uid, 'customers')
      const merchantCustomersSnapshot = await getDocs(merchantCustomersRef)
      
      console.log('👥 Found', merchantCustomersSnapshot.docs.length, 'merchant customers')
      
      const eligible: Array<{
        id: string, 
        fullName: string,
        currentCohort?: { name: string },
        daysSinceLastVisit?: number,
        lifetimeTransactionCount?: number
      }> = []
      
      // Check each customer to see if they can redeem this reward
      for (const customerDoc of merchantCustomersSnapshot.docs) {
        const customerId = customerDoc.id
        const customerData = customerDoc.data()
        
        console.log('🔍 Checking customer:', customerId, 'Name:', customerData.fullName || customerData.firstName)
        console.log('📊 Customer metrics:', {
          currentCohort: customerData.currentCohort,
          daysSinceLastVisit: customerData.daysSinceLastVisit,
          lifetimeTransactionCount: customerData.lifetimeTransactionCount
        })
        
        try {
          // Check the customer's rewards subcollection for this specific reward
          const customerRewardRef = doc(db, 'customers', customerId, 'rewards', rewardId)
          const customerRewardSnapshot = await getDoc(customerRewardRef)
          
          console.log('🎁 Customer reward path: customers/', customerId, '/rewards/', rewardId)
          console.log('📄 Document exists:', customerRewardSnapshot.exists())
          
          if (customerRewardSnapshot.exists()) {
            const rewardData = customerRewardSnapshot.data()
            console.log('📊 Reward data:', rewardData)
            
            // Check if both visible and redeemable are true (handle various data types)
            const isVisible = rewardData.visible === true || rewardData.visible === 'true' || rewardData.visible === 1
            const isRedeemable = rewardData.redeemable === true || rewardData.redeemable === 'true' || rewardData.redeemable === 1
            
            console.log('👁️ isVisible:', isVisible, '(raw value:', rewardData.visible, ')')
            console.log('🎯 isRedeemable:', isRedeemable, '(raw value:', rewardData.redeemable, ')')
            
            if (isVisible && isRedeemable) {
              console.log('✅ Customer eligible:', customerId, customerData.fullName || customerData.firstName)
              eligible.push({
                id: customerId,
                fullName: customerData.fullName || customerData.firstName || 'Unknown Customer',
                currentCohort: customerData.currentCohort,
                daysSinceLastVisit: customerData.daysSinceLastVisit,
                lifetimeTransactionCount: customerData.lifetimeTransactionCount
              })
            } else {
              console.log('❌ Customer not eligible:', customerId, 'visible:', rewardData.visible, 'redeemable:', rewardData.redeemable)
            }
          } else {
            console.log('📭 No reward document found for customer:', customerId)
          }
        } catch (error) {
          console.error(`❌ Error checking reward ${rewardId} for customer ${customerId}:`, error)
        }
      }
      
      console.log('🎯 Final eligible customers count:', eligible.length)
      console.log('📋 Eligible customers:', eligible)
      
      // Cache the results
      setEligibleCustomers(prev => ({
        ...prev,
        [rewardId]: eligible
      }))
      
      return eligible
    } catch (error) {
      console.error('❌ Error fetching eligible customers:', error)
      return []
    }
  }

  const EligibleCustomersDropdown = ({ rewardId }: { rewardId: string }) => {
    const [customers, setCustomers] = useState<Array<{
      id: string, 
      fullName: string,
      currentCohort?: { name: string },
      daysSinceLastVisit?: number,
      lifetimeTransactionCount?: number
    }>>([])
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    
    console.log('🎨 EligibleCustomersDropdown rendered for rewardId:', rewardId, 'customers:', customers.length)

    const loadCustomers = async () => {
      if (customers.length > 0) {
        console.log('✅ Already have customers, skipping load')
        return // Already loaded
      }
      
      console.log('🚀 Loading customers on demand for reward:', rewardId)
      setLoading(true)
      try {
        const eligible = await getEligibleCustomers(rewardId)
        console.log('📥 Got eligible customers:', eligible)
        setCustomers(eligible)
      } catch (error) {
        console.error('❌ Error loading customers:', error)
      } finally {
        setLoading(false)
      }
    }

          return (
        <Popover open={isOpen} onOpenChange={(open) => {
          setIsOpen(open)
          if (open) {
            loadCustomers()
          }
        }}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="h-7 gap-2 rounded-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Users className="h-3 w-3" />
              {loading ? '...' : customers.length}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-80 p-0">
            <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b">
              Eligible Customers
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-4 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading customers...
                </div>
              ) : customers.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">
                  No eligible customers
                </div>
              ) : (
              customers.map((customer) => (
                <div 
                  key={customer.id}
                  className="px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  title={`Customer ID: ${customer.id}`}
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <span className="font-medium text-sm truncate">
                        {customer.fullName}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 rounded-md text-xs px-1.5 py-0.5">
                              {customer.currentCohort?.name ? customer.currentCohort.name.charAt(0).toUpperCase() + customer.currentCohort.name.slice(1) : 'None'}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Customer Cohort</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>{customer.daysSinceLastVisit || 0}d</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Days since last visit</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Receipt className="h-3 w-3" />
                              <span>{customer.lifetimeTransactionCount || 0}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Lifetime transactions</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div>
      <Tabs defaultValue="all" onValueChange={(value) => setRewardCategory(value as typeof rewardCategory)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
            <button
              onClick={() => setRewardCategory("all")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                rewardCategory === "all"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Package className="h-3 w-3" />
              All Rewards
            </button>
            <button
              onClick={() => setRewardCategory("individual")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                rewardCategory === "individual"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Gift className="h-3 w-3" />
              Individual
            </button>
            <button
              onClick={() => setRewardCategory("customer-specific")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                rewardCategory === "customer-specific"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Users className="h-3 w-3" />
              Customer-Specific
            </button>
            <button
              onClick={() => setRewardCategory("programs")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                rewardCategory === "programs"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Award className="h-3 w-3" />
              Programs
            </button>
            <button
              onClick={() => setRewardCategory("agent")}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                rewardCategory === "agent"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500">
                Agent
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative w-[250px] h-9">
              {/* Search Icon Button */}
              <Button
                variant="outline"
                size="icon"
                className={cn(
                  "absolute right-0 top-0 h-9 w-9 rounded-md transition-all duration-150 ease-out",
                  isSearchOpen ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
                )}
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
              
              {/* Search Input */}
              <div 
                className={cn(
                  "absolute right-0 top-0 transition-all duration-150 ease-out",
                  isSearchOpen 
                    ? "w-full opacity-100 scale-100" 
                    : "w-9 opacity-0 scale-95 pointer-events-none"
                )}
              >
                <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search rewards..." 
                    className="w-full pl-9 h-9 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (!searchQuery) {
                        setTimeout(() => setIsSearchOpen(false), 100)
                      }
                    }}
                    autoFocus={isSearchOpen}
              />
            </div>
                      </div>
                      </div>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-0">
          {rewardCategory === "programs" ? (
            <ProgramRewardsTable />
          ) : (
          <Card className="rounded-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[320px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("rewardName")}
                        className="flex items-center gap-1 px-0 font-medium"
                      >
                        Preview
                        {sortField === "rewardName" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("type")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Type
                        {sortField === "type" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("pointsCost")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Points
                        {sortField === "pointsCost" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("redemptionCount")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Redemptions
                        {sortField === "redemptionCount" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>

                    <TableHead className="text-center">
                      <div className="flex items-center gap-1 px-0 font-medium mx-auto">
                        <Eye className="h-4 w-4" />
                        Visibility
                      </div>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("createdAt")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Created
                        {sortField === "createdAt" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-center">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("isActive")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Active
                        {sortField === "isActive" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRewards ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredRewards().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                            <Gift className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 text-lg font-medium">No rewards found</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery ? "Try adjusting your search query" : "Create your first reward to get started"}
                          </p>
                          {!searchQuery && (
                            <Button 
                              className="mt-4 h-9 gap-2 rounded-md"
                              onClick={() => router.push('/create')}
                            >
                              <Plus className="h-4 w-4" />
                              Create Reward
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredRewards().map((reward) => (
                      <TableRow 
                        key={reward.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewReward(reward.id)}
                      >
                        <TableCell className="font-medium py-2 px-4">
                          <RewardPreviewCard reward={reward} />
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.programType === "agent" ? (
                            <div className="font-medium">
                              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500">
                                Agent
                              </span>
                            </div>
                          ) : reward.programType ? (
                            <div className="font-medium text-gray-700">
                              {reward.programType === "coffeeprogramnew" ? "Coffee Program" :
                               reward.programType === "voucherprogramnew" ? "Voucher Program" :
                               reward.programType === "transactionrewardsnew" ? "Transaction Rewards" :
                               reward.programType.charAt(0).toUpperCase() + reward.programType.slice(1)}
                            </div>
                          ) : (
                            <div className="font-medium text-gray-700">
                              {reward.programtype 
                                ? reward.programtype.charAt(0).toUpperCase() + reward.programtype.slice(1)
                                : "Individual Reward"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                            {reward.pointsCost > 0 ? `${reward.pointsCost} pts` : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium" style={{ color: '#007AFF' }}>
                            {reward.redemptionCount || 0}
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <VisibilityStats rewardId={reward.id} />
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={reward.isActive}
                              onCheckedChange={() => toggleRewardStatus(reward.id, reward.isActive)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent 
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem onClick={() => handleViewReward(reward.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/store/${reward.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleRewardStatus(reward.id, reward.isActive)}>
                                {reward.isActive ? (
                                  <>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteReward(reward.id)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        {/* Add other tab contents for individual, customer-specific, programs, agent */}
        <TabsContent value="individual" className="mt-0">
          <Card className="rounded-md overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Reward Name</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Redemptions</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingRewards ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredRewards().filter(r => r.category === "individual").length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Gift className="h-8 w-8 mb-2 text-muted-foreground" />
                          <p className="text-muted-foreground">No individual rewards found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    getFilteredRewards().filter(r => r.category === "individual").map((reward) => (
                      <TableRow 
                        key={reward.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleViewReward(reward.id)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center">
                              {getRewardTypeIcon(reward.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate">{reward.rewardName}</div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {reward.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-gray-700">
                            {reward.type?.charAt(0).toUpperCase() + reward.type?.slice(1) || "Gift"}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                            {reward.pointsCost > 0 ? `${reward.pointsCost} pts` : 'Free'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium" style={{ color: '#007AFF' }}>
                            {reward.redemptionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={reward.isActive}
                              onCheckedChange={() => toggleRewardStatus(reward.id, reward.isActive)}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewReward(reward.id)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/store/${reward.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleRewardStatus(reward.id, reward.isActive)}>
                                {reward.isActive ? (
                                  <>
                                    <Clock className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <Zap className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteReward(reward.id)}
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Similar structure for other tabs... */}
        <TabsContent value="customer-specific" className="mt-0">
          <Card className="rounded-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Customer-Specific Rewards</h3>
                <p className="text-muted-foreground mb-4">
                  {getFilteredRewards().filter(r => r.category === "customer-specific").length} customer-specific rewards
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="programs" className="mt-0">
          <ProgramRewardsTable />
        </TabsContent>

        <TabsContent value="agent" className="mt-0">
          <Card className="rounded-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                <h3 className="text-lg font-medium mb-2">
                  <GradientText>Agent Rewards</GradientText>
                </h3>
                <p className="text-muted-foreground mb-4">
                  {getFilteredRewards().filter(r => r.programtype === "agent").length} AI-generated rewards
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!rewardToDelete} onOpenChange={() => setRewardToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Reward</DialogTitle>
            <DialogDescription className="text-red-500">
              Are you sure you want to delete this reward? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-5">
            <Button variant="outline" onClick={() => setRewardToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward Detail Sheet */}
      {selectedRewardId && (
        <RewardDetailSheet
          open={isRewardDetailOpen}
          onOpenChange={setIsRewardDetailOpen}
          rewardId={selectedRewardId}
        />
      )}
    </div>
  );
};

// Full Customers Tab Component
const CustomersTabContent = () => {
  const router = useRouter()
  const { customers, loading } = useCustomers()
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<'fullName' | 'lastTransactionDate' | 'totalLifetimeSpend' | 'redemptionCount' | 'pointsBalance' | 'lifetimeTransactionCount'>('lastTransactionDate')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [cohort, setCohort] = useState<'all' | 'active' | 'engaged' | 'at-risk' | 'dormant' | 'new' | 'loyal' | 'vip'>('all')

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

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortButton = ({ field, children }: { field: typeof sortField, children: React.ReactNode }) => (
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

  // Check if any filters are active
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
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
          <button
            onClick={() => setCohort("all")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              cohort === "all"
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
          >
            <Users className="h-3 w-3" />
            All Customers
          </button>
          <button
            onClick={() => setCohort("active")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              cohort === "active"
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
          >
            <CheckCircle className="h-3 w-3" />
            Active
          </button>
          <button
            onClick={() => setCohort("at-risk")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              cohort === "at-risk"
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
          >
            <Clock className="h-3 w-3" />
            At Risk
          </button>
          <button
            onClick={() => setCohort("dormant")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
              cohort === "dormant"
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
          >
            <XCircle className="h-3 w-3" />
            Dormant
          </button>
        </div>
        
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
                <ArrowRight className="h-4 w-4 rotate-90" />
                Sort
                {sortField !== 'lastTransactionDate' && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({sortField.replace(/([A-Z])/g, ' $1').toLowerCase()})
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-md">
              <Label className="px-2 py-1.5 text-sm font-medium">Sort by</Label>
              <Separator />
              <div className="p-1">
                <button
                  onClick={() => {
                    setSortField('fullName')
                    setSortDirection('asc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'fullName' && sortDirection === 'asc' && "bg-accent"
                  )}
                >
                  Name (A to Z)
                </button>
                <button
                  onClick={() => {
                    setSortField('fullName')
                    setSortDirection('desc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'fullName' && sortDirection === 'desc' && "bg-accent"
                  )}
                >
                  Name (Z to A)
                </button>
                <Separator className="my-1" />
                <button
                  onClick={() => {
                    setSortField('lastTransactionDate')
                    setSortDirection('desc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'lastTransactionDate' && sortDirection === 'desc' && "bg-accent"
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Most Recent Visit
                </button>
                <button
                  onClick={() => {
                    setSortField('totalLifetimeSpend')
                    setSortDirection('desc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'totalLifetimeSpend' && sortDirection === 'desc' && "bg-accent"
                  )}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Highest Spend
                </button>
                <button
                  onClick={() => {
                    setSortField('lifetimeTransactionCount')
                    setSortDirection('desc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'lifetimeTransactionCount' && sortDirection === 'desc' && "bg-accent"
                  )}
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Most Transactions
                </button>
                <button
                  onClick={() => {
                    setSortField('pointsBalance')
                    setSortDirection('desc')
                  }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    sortField === 'pointsBalance' && sortDirection === 'desc' && "bg-accent"
                  )}
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Highest Points
                </button>
              </div>
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
              <Label className="px-2 py-1.5 text-sm font-medium">Customer Cohorts</Label>
              <Separator />
              <div className="p-1">
                <button
                  onClick={() => setCohort('all')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'all' && "bg-accent"
                  )}
                >
                  <Users className="mr-2 h-4 w-4" />
                  All Customers
                </button>
                <button
                  onClick={() => setCohort('active')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'active' && "bg-accent"
                  )}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Active (30d)
                </button>
                <button
                  onClick={() => setCohort('engaged')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'engaged' && "bg-accent"
                  )}
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Engaged (90d)
                </button>
                <button
                  onClick={() => setCohort('at-risk')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'at-risk' && "bg-accent"
                  )}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  At Risk (90-180d)
                </button>
                <button
                  onClick={() => setCohort('dormant')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'dormant' && "bg-accent"
                  )}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Dormant (180d+)
                </button>
                <Separator className="my-1" />
                <button
                  onClick={() => setCohort('new')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'new' && "bg-accent"
                  )}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Customers
                </button>
                <button
                  onClick={() => setCohort('loyal')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'loyal' && "bg-accent"
                  )}
                >
                  <Award className="mr-2 h-4 w-4" />
                  Loyal (10+ visits)
                </button>
                <button
                  onClick={() => setCohort('vip')}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground",
                    cohort === 'vip' && "bg-accent"
                  )}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  VIP (Top 10%)
                </button>
              </div>
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
              <XCircle className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
      
      <Card className="rounded-md overflow-hidden">
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
                         `No ${cohort === "all" ? "" : cohort + " "}customers available`}
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
                        <Gift className="h-4 w-4 text-blue-600" />
                        <span>{customer.pointsBalance.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
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
                              <MoreVertical className="h-4 w-4" />
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
                              <XCircle className="h-4 w-4 mr-2" />
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
    </div>
  );
};

// Full Banners Tab Component
const BannersTabContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [banners, setBanners] = useState<Banner[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilters, setStatusFilters] = useState({
    active: true,
    draft: true,
    expired: true
  })
  const [dateFilter, setDateFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [bannerToDelete, setBannerToDelete] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  // Fetch banners from Firestore
  useEffect(() => {
    const fetchBanners = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        
        const bannersRef = collection(db, 'merchants', user.uid, 'banners')
        const bannersQuery = query(bannersRef, orderBy('createdAt', 'desc'))
        const bannersSnapshot = await getDocs(bannersQuery)
        
        const bannersData: Banner[] = []
        bannersSnapshot.forEach((doc) => {
          const data = doc.data();
          
          bannersData.push({
            id: doc.id,
            ...data as Omit<Banner, 'id'>,
            // Use the actual isActive field if it exists, otherwise derive from status
            isActive: data.isActive !== undefined ? data.isActive : data.status === "active"
          })
        })
        
        setBanners(bannersData)
      } catch (error) {
        console.error("Error fetching banners:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBanners()
  }, [user])

  // Filtering function
  const filteredBanners = banners.filter(banner => {
    const matchesSearch = !searchQuery
      ? true
      : banner.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (banner.description && banner.description.toLowerCase().includes(searchQuery.toLowerCase()))

    // Handle undefined or null status values
    const status = banner.status?.toLowerCase() || 'unknown';
    const matchesStatus = statusFilters[status as keyof typeof statusFilters] || 
                          (status === 'unknown' && statusFilters.draft);

    // For demonstration only (no custom start/end date range here)
    if (dateFilter === "all") {
      return matchesSearch && matchesStatus
    }

    // Example: filter only today's banners
    if (dateFilter === "today") {
      const bannerDate = banner.createdAt ? 
        (typeof banner.createdAt === 'object' && 'seconds' in banner.createdAt) ? 
          new Date(banner.createdAt.seconds * 1000) : 
          new Date(banner.createdAt) : 
        new Date();
        
      const now = new Date()
      const isToday =
        bannerDate.getDate() === now.getDate() &&
        bannerDate.getMonth() === now.getMonth() &&
        bannerDate.getFullYear() === now.getFullYear()
      return matchesSearch && matchesStatus && isToday
    }

    return matchesSearch && matchesStatus
  })

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

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status.toLowerCase()]: checked
    }))
  }

  const handleToggleActive = async (bannerId: string, newActiveState: boolean) => {
    try {
      if (!user?.uid) return;
      
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
      await updateDoc(bannerRef, {
        isActive: newActiveState,
        updatedAt: new Date()
      });
      
      // Update local state
      setBanners(prev => prev.map(banner => 
        banner.id === bannerId 
          ? {...banner, isActive: newActiveState} 
          : banner
      ));
      
    } catch (error) {
      console.error("Error toggling banner active state:", error);
    }
  };

  const handleBannerScheduleUpdate = async (bannerId: string, updates: any) => {
    try {
      if (!user?.uid) return;
      
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerId);
      
      // If we're setting scheduled to false, also set isActive to false
      if (updates.scheduled === false) {
        updates.isActive = false;
      }
      
      await updateDoc(bannerRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Update local state
      setBanners(prev => prev.map(banner => 
        banner.id === bannerId 
          ? {...banner, ...updates} 
          : banner
      ));
      
    } catch (error) {
      console.error("Error updating banner:", error);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    const period = hours < 12 ? 'AM' : 'PM'
    const displayHours = hours === 0 || hours === 12 ? 12 : hours % 12
    
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`
  }

  // Add a delete function to handle banner deletion
  const handleDeleteBanner = (bannerId: string) => {
    setBannerToDelete(bannerId);
  };

  // Add a function to handle the actual deletion when confirmed
  const confirmDeleteBanner = async () => {
    if (!bannerToDelete || !user?.uid) {
      setBannerToDelete(null);
      return;
    }
    
    try {
      const bannerRef = doc(db, 'merchants', user.uid, 'banners', bannerToDelete);
      await deleteDoc(bannerRef);
      
      setBanners(prev => prev.filter(banner => banner.id !== bannerToDelete));
    } catch (error) {
      console.error("Error deleting banner:", error);
    } finally {
      setBannerToDelete(null);
    }
  };

  const handleScheduleBanner = (bannerId: string) => {
    // Check if there are already 4 scheduled banners
    const scheduledCount = banners.filter((b: Banner) => b.scheduled).length
    if (scheduledCount >= 4) {
      return
    }

    // Simple scheduling - could be enhanced with conflict detection
    const startMinutes = 0; // Start of day
    const endMinutes = 240; // 4 hours
    
    handleBannerScheduleUpdate(bannerId, {
      scheduled: true,
      scheduleStartMinutes: startMinutes,
      scheduleEndMinutes: endMinutes
    })
  };

  const handleExportPDF = () => {
    // Mock PDF export functionality
    console.log("Exporting banners to PDF");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "all"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("all")}
            >
              <Image className="h-3 w-3" />
              All Banners
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "active"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("active")}
            >
              <Eye className="h-3 w-3" />
              Active
            </button>
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "inactive"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("inactive")}
            >
              <Eye className="h-3 w-3 opacity-50" />
              Inactive
            </button>
          </div>
          
          {/* Vertical divider */}
          <div className="h-8 w-px bg-gray-200 mx-2"></div>
          
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
            <button
              className={cn(
                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                activeTab === "schedule"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("schedule")}
            >
              <Clock className="h-3 w-3" />
              Schedule
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search banners..."
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
            <PopoverContent className="w-72 p-4" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Filter Banners</h4>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="thisWeek">This Week</option>
                    <option value="thisMonth">This Month</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="status-active" 
                        checked={statusFilters.active}
                        onCheckedChange={(checked) => handleStatusFilterChange("active", !!checked)}
                      />
                      <Label htmlFor="status-active" className="cursor-pointer">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="status-draft" 
                        checked={statusFilters.draft}
                        onCheckedChange={(checked) => handleStatusFilterChange("draft", !!checked)}
                      />
                      <Label htmlFor="status-draft" className="cursor-pointer">Draft</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="status-expired" 
                        checked={statusFilters.expired}
                        onCheckedChange={(checked) => handleStatusFilterChange("expired", !!checked)}
                      />
                      <Label htmlFor="status-expired" className="cursor-pointer">Expired</Label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDateFilter("all")
                      setStatusFilters({ active: true, draft: true, expired: true })
                    }}
                  >
                    Reset
                  </Button>
                  <Button onClick={() => setShowFilters(false)}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button 
            variant="outline" 
            className="h-9 gap-2 rounded-lg"
            onClick={handleExportPDF}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          
          <Button 
            onClick={() => router.push('/store/banner/create')}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Create Banner
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "all" && (
        <>
          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
            </div>
          ) : filteredBanners.length === 0 ? (
            <div className="h-24 flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <BellRing className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No banners found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Create your first banner to get started"}
              </p>
              <Button
                variant="default"
                className="mt-2 gap-2"
                onClick={() => router.push("/store/banner/create")}
              >
                <Plus className="h-4 w-4" />
                Create Banner
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners.map((banner) => (
                <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                  {/* Banner Preview with status badges */}
                  <div className="relative">
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2 z-10 flex space-x-2">
                      {banner.isActive && (
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                          Live
                        </div>
                      )}
                      {banner.scheduled && (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </div>
                      )}
                    </div>
                    
                    {/* Banner preview */}
                    <div className="rounded-t-lg overflow-hidden shadow-sm">
                      <BannerPreview
                        title={banner.title}
                        description={banner.description}
                        color={banner.color ?? "#0ea5e9"}
                        styleType={
                          banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                          banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                          banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                          BannerStyle.LIGHT
                        }
                        merchantName={banner.merchantName ?? "My Store"}
                        visibilityType={BannerVisibility.ALL}
                        isActive={banner.isActive}
                      />
                    </div>
                  </div>
                  
                  {/* Content section */}
                  <div className="p-4">
                    {/* Banner title and description */}
                    <h4 className="font-medium text-sm mb-1">{banner.title}</h4>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{banner.description}</p>
                    
                    {/* Stats in a row format */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                      <div className="flex items-center text-xs text-gray-600">
                        <BarChart className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="font-medium">{banner.impressions || 0}</span>
                        <span className="text-gray-400 ml-1">views</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <Users className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="font-medium">{banner.impressioncustomercount || 0}</span>
                        <span className="text-gray-400 ml-1">customers</span>
                      </div>
                    </div>
                    
                    {/* Schedule information */}
                    <div className="flex items-center gap-1 mb-3 text-xs">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {banner.scheduled ? (
                        <span className="text-blue-600">
                          {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                            <>
                              {banner.isActive ? "Showing: " : "Scheduled: "}
                              {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                              {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                            </>
                          ) : (
                            banner.isActive ? "Showing all day" : "Scheduled all day"
                          )}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Not currently scheduled</span>
                      )}
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => router.push(`/store/banner/${banner.id}/edit`)}
                      >
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Edit
                      </Button>
                      
                      {banner.scheduled ? (
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            handleBannerScheduleUpdate(banner.id, {
                              scheduled: false
                            })
                          }}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                      ) : (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleScheduleBanner(banner.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Schedule
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => handleDeleteBanner(banner.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "active" && (
        <div className="space-y-8">
          {/* Currently Live section */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Eye className="h-5 w-5 mr-2 text-green-500" />
              Currently Live
              <Badge variant="outline" className="ml-2">
                {filteredBanners.filter(banner => banner.scheduled && banner.isActive).length}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These banners are currently visible to customers based on their schedule.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners
                .filter(banner => banner.scheduled && banner.isActive)
                .map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    {/* Banner content similar to above */}
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10 flex space-x-2">
                        <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse"></span>
                          Live
                        </div>
                      </div>
                      
                      <div className="rounded-t-lg overflow-hidden shadow-sm">
                        <BannerPreview
                          title={banner.title}
                          description={banner.description}
                          color={banner.color ?? "#0ea5e9"}
                          styleType={
                            banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                            banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                            banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                            BannerStyle.LIGHT
                          }
                          merchantName={banner.merchantName ?? "My Store"}
                          visibilityType={BannerVisibility.ALL}
                          isActive={banner.isActive}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-sm mb-1">{banner.title}</h4>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{banner.description}</p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <BarChart className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressions || 0}</span>
                          <span className="text-gray-400 ml-1">views</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressioncustomercount || 0}</span>
                          <span className="text-gray-400 ml-1">customers</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-3 text-xs">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-blue-600">
                          {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                            <>
                              Showing: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                              {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                            </>
                          ) : (
                            "Showing all day"
                          )}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/store/banner/${banner.id}/edit`)}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleBannerScheduleUpdate(banner.id, { scheduled: false })}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteBanner(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Scheduled for Later section */}
          <div className="mt-8">
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-blue-500" />
              Scheduled for Later
              <Badge variant="outline" className="ml-2">
                {filteredBanners.filter(banner => banner.scheduled && !banner.isActive).length}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These banners are scheduled but not currently active.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners
                .filter(banner => banner.scheduled && !banner.isActive)
                .map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    {/* Similar banner content */}
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </div>
                      </div>
                      
                      <div className="rounded-t-lg overflow-hidden shadow-sm">
                        <BannerPreview
                          title={banner.title}
                          description={banner.description}
                          color={banner.color ?? "#0ea5e9"}
                          styleType={
                            banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                            banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                            banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                            BannerStyle.LIGHT
                          }
                          merchantName={banner.merchantName ?? "My Store"}
                          visibilityType={BannerVisibility.ALL}
                          isActive={banner.isActive}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-sm mb-1">{banner.title}</h4>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{banner.description}</p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <BarChart className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressions || 0}</span>
                          <span className="text-gray-400 ml-1">views</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressioncustomercount || 0}</span>
                          <span className="text-gray-400 ml-1">customers</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-3 text-xs">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-blue-600">
                          {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                            <>
                              Scheduled: {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                              {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                            </>
                          ) : (
                            "Scheduled all day"
                          )}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/store/banner/${banner.id}/edit`)}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleBannerScheduleUpdate(banner.id, { scheduled: false })}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                          Remove
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteBanner(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "inactive" && (
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <XCircle className="h-5 w-5 mr-2 text-gray-500" />
              Unscheduled Banners
              <Badge variant="outline" className="ml-2">
                {filteredBanners.filter(banner => !banner.scheduled).length}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              These banners are not scheduled. Schedule them to make them available for display.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners
                .filter(banner => !banner.scheduled)
                .map((banner) => (
                  <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unscheduled
                        </div>
                      </div>
                      
                      <div className="rounded-t-lg overflow-hidden shadow-sm">
                        <BannerPreview
                          title={banner.title}
                          description={banner.description}
                          color={banner.color ?? "#0ea5e9"}
                          styleType={
                            banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                            banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                            banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                            BannerStyle.LIGHT
                          }
                          merchantName={banner.merchantName ?? "My Store"}
                          visibilityType={BannerVisibility.ALL}
                          isActive={banner.isActive}
                        />
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <h4 className="font-medium text-sm mb-1">{banner.title}</h4>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{banner.description}</p>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <BarChart className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressions || 0}</span>
                          <span className="text-gray-400 ml-1">views</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600">
                          <Users className="h-3 w-3 mr-1 text-gray-400" />
                          <span className="font-medium">{banner.impressioncustomercount || 0}</span>
                          <span className="text-gray-400 ml-1">customers</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-3 text-xs">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-amber-600 font-medium">Not currently scheduled</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => router.push(`/store/banner/${banner.id}/edit`)}>
                          <Edit className="h-3.5 w-3.5 mr-1.5" />
                          Edit
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleScheduleBanner(banner.id)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Schedule
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 text-red-600 hover:bg-red-50 border-red-200"
                          onClick={() => handleDeleteBanner(banner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="space-y-8">
          {/* Banner Scheduler Component */}
          <BannerScheduler 
            banners={banners} 
            onBannerUpdate={handleBannerScheduleUpdate} 
          />
          
          {/* Banner Library Section */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-medium flex items-center">
                <Package className="h-5 w-5 mr-2 text-gray-500" />
                Banner Library
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBanners.map((banner) => (
                <div key={banner.id} className="flex flex-col bg-gray-50 rounded-lg overflow-hidden">
                  <div className="relative">
                    <div className="absolute top-2 right-2 z-10">
                      {banner.scheduled ? (
                        <div className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </div>
                      ) : (
                        <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full flex items-center">
                          <XCircle className="h-3 w-3 mr-1" />
                          Unscheduled
                        </div>
                      )}
                    </div>
                    
                    <div className="rounded-t-lg overflow-hidden shadow-sm">
                      <BannerPreview
                        title={banner.title}
                        description={banner.description}
                        color={banner.color ?? "#0ea5e9"}
                        styleType={
                          banner.style?.toLowerCase() === "light" ? BannerStyle.LIGHT :
                          banner.style?.toLowerCase() === "glass" ? BannerStyle.GLASS :
                          banner.style?.toLowerCase() === "dark" ? BannerStyle.DARK :
                          BannerStyle.LIGHT
                        }
                        merchantName={banner.merchantName ?? "My Store"}
                        visibilityType={BannerVisibility.ALL}
                        isActive={banner.isActive}
                      />
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h4 className="font-medium text-sm mb-1">{banner.title}</h4>
                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{banner.description}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 mb-3">
                      <div className="flex items-center text-xs text-gray-600">
                        <BarChart className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="font-medium">{banner.impressions || 0}</span>
                        <span className="text-gray-400 ml-1">views</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-600">
                        <Users className="h-3 w-3 mr-1 text-gray-400" />
                        <span className="font-medium">{banner.impressioncustomercount || 0}</span>
                        <span className="text-gray-400 ml-1">customers</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 mb-3 text-xs">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {banner.scheduled ? (
                        <span className="text-blue-600">
                          {banner.scheduleStartMinutes !== undefined && banner.scheduleEndMinutes !== undefined ? (
                            <>
                              {banner.isActive ? "Showing: " : "Scheduled: "}
                              {formatTime(banner.scheduleStartMinutes)} - {formatTime(banner.scheduleEndMinutes % (24 * 60))}
                              {banner.endsNextDay && <span className="ml-1 text-xs bg-blue-100 px-1 py-0.5 rounded">Next day</span>}
                            </>
                          ) : (
                            banner.isActive ? "Showing all day" : "Scheduled all day"
                          )}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium">Not currently scheduled</span>
                      )}
                    </div>
                    
                    {banner.scheduled ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:bg-red-50 border-red-200"
                        onClick={() => handleBannerScheduleUpdate(banner.id, { scheduled: false })}
                      >
                        <Clock className="h-3.5 w-3.5 mr-1.5" />
                        Remove from Schedule
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleScheduleBanner(banner.id)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Add to Schedule
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!bannerToDelete} onOpenChange={() => setBannerToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Delete Banner</DialogTitle>
            <DialogDescription className="text-red-500">
              Are you sure you want to delete this banner? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-5">
            <Button variant="outline" onClick={() => setBannerToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteBanner}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Activity Tab Component  
const ActivityTabContent = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity</h2>
          <p className="text-muted-foreground">View all transactions and redemptions</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/store/activity">
            Open Full Activity Page
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Sub-Tab Container */}
      <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-800 bg-white shadow-sm"
        >
          <Calendar className="h-3 w-3" />
          All Activity
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-200/70"
        >
          <ShoppingCart className="h-3 w-3" />
          Transactions
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-200/70"
        >
          <Gift className="h-3 w-3" />
          Redemptions
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-200/70"
        >
          <DollarSign className="h-3 w-3" />
          Square Sales
        </button>
        <button
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-600 hover:bg-gray-200/70"
        >
          <DollarSign className="h-3 w-3" />
          Lightspeed Sales
        </button>
             </div>

      <Card className="rounded-md border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            All Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">Click "Open Full Activity Page" to view detailed activity data with all functionality</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Program Rewards Table Component
const ProgramRewardsTable = () => {
  console.log('🔍 ProgramRewardsTable component rendering')
  
  const router = useRouter()
  const { user } = useAuth()
  const [programRewards, setProgramRewards] = useState<(Reward & { customerName?: string })[]>([])
  const [activePrograms, setActivePrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [programRewardCounts, setProgramRewardCounts] = useState<Record<string, number>>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedProgramType, setSelectedProgramType] = useState<'coffee' | 'discount' | 'transaction'>('coffee')
  const [showRewardDetail, setShowRewardDetail] = useState(false)
  const [selectedRewardId, setSelectedRewardId] = useState<string | undefined>(undefined)
  
  console.log('🔍 ProgramRewardsTable state:', {
    user: user?.uid,
    programRewardsCount: programRewards.length,
    activeProgramsCount: activePrograms.length,
    loading
  })

    // Fetch program rewards and customer names
  useEffect(() => {
    const fetchProgramRewards = async () => {
      if (!user?.uid) {
        console.log('🔍 No user UID found')
        return
      }
      
      try {
        setLoading(true)
        console.log('🔍 Starting to fetch program rewards for merchant:', user.uid)
        
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const rewardsQuery = query(rewardsRef, orderBy('createdAt', 'desc'))
        const rewardsSnapshot = await getDocs(rewardsQuery)
        
        console.log('🔍 Total rewards found:', rewardsSnapshot.docs.length)
        
        const programRewardsData: (Reward & { customerName?: string })[] = []
        
        for (const rewardDoc of rewardsSnapshot.docs) {
          const data = rewardDoc.data()
          
          console.log('🔍 Checking reward:', {
            id: rewardDoc.id,
            rewardName: data.rewardName,
            programType: data.programType,
            type: data.type,
            category: data.category
          })
          
          // Filter for program-related rewards
          if (data.programType === "coffeeprogramnew" || 
              data.programType === "voucherprogramnew" || 
              data.programType === "transactionrewardsnew") {
            
            console.log('✅ Found program reward:', {
              id: rewardDoc.id,
              rewardName: data.rewardName,
              programType: data.programType
            })
            
            let customerNames: string[] = []
            
             // Get customer names and profile pictures from the customers array (from top-level customers collection)
             const customerIds = data.customers || data.uniqueCustomerIds || []
             let customerProfilePicture = null
             if (customerIds.length > 0) {
               for (const customerId of customerIds.slice(0, 5)) { // Limit to first 5 customers
                 try {
                   const customerRef = doc(db, 'customers', customerId)
                   const customerSnapshot = await getDoc(customerRef)
                   if (customerSnapshot.exists()) {
                     const customerData = customerSnapshot.data() as any
                     const fullName = customerData.fullName || customerData.firstName || customerData.name || 'Unknown'
                     customerNames.push(fullName)
                     
                     // Get profile picture from the first customer
                     if (!customerProfilePicture && customerData.profilePictureUrl) {
                       customerProfilePicture = customerData.profilePictureUrl
                     }
                   }
                 } catch (error) {
                   console.error("Error fetching customer from top-level collection:", error)
                 }
               }
             }
            
            const customerDisplayText = customerNames.length > 0 
              ? customerNames.length > 3 
                ? `${customerNames.slice(0, 3).join(', ')} +${customerNames.length - 3} more`
                : customerNames.join(', ')
              : 'No customers'
            
            programRewardsData.push({
              id: rewardDoc.id,
              rewardName: data.rewardName || 'Unnamed Reward',
              description: data.description || '',
              type: data.rewardType || data.type || 'gift',
              programtype: data.programType || '',
              programType: data.programType || '', // Add programType for badge logic
              category: 'program',
              pointsCost: data.pointsCost || 0,
              redemptionCount: data.redemptionCount || 0,
              status: data.status || 'active',
              createdAt: data.createdAt,
              updatedAt: data.updatedAt || data.createdAt,
              isActive: !!data.isActive,
              lastRedeemed: data.lastRedeemedAt ? data.lastRedeemedAt.toDate() : null,
              impressions: data.impressions || 0,
              redeemableCustomers: data.uniqueCustomersCount || 0,
              hasActivePeriod: false,
              activePeriod: { startDate: '', endDate: '' },
              customerName: customerDisplayText,
              customerProfilePicture: customerProfilePicture, // Add profile picture
              voucherAmount: data.voucherAmount || 0, // Add voucherAmount field
              rewardTypeDetails: data.rewardTypeDetails || {} // Add rewardTypeDetails field
            } as Reward & { customerName: string; customerProfilePicture: string | null })
          }
        }
        
        console.log('🔍 Final program rewards data:', {
          totalProgramRewards: programRewardsData.length,
          rewards: programRewardsData.map(r => ({
            id: r.id,
            rewardName: r.rewardName,
            programType: r.programtype,
            customerName: r.customerName
          }))
        })
        
        setProgramRewards(programRewardsData)
        
        // Count unredeemed rewards by program type
        const counts = {
          coffee: 0,
          voucher: 0,
          transaction: 0
        }
        
        programRewardsData.forEach(reward => {
          if (reward.redemptionCount === 0) {
            if (reward.programtype === 'coffeeprogramnew') {
              counts.coffee++
            } else if (reward.programtype === 'voucherprogramnew') {
              counts.voucher++
            } else if (reward.programtype === 'transactionrewardsnew') {
              counts.transaction++
            }
          }
        })
        
        setProgramRewardCounts(counts)
      } catch (error) {
        console.error("❌ Error fetching program rewards:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProgramRewards()
  }, [user])

  // Fetch active programs from merchant document
  useEffect(() => {
    const fetchActivePrograms = async () => {
      if (!user?.uid) return

      try {
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantSnapshot = await getDoc(merchantRef)
        
        if (merchantSnapshot.exists()) {
          const merchantData = merchantSnapshot.data()
          const programs: any[] = []
          
          // Check coffeePrograms array
          if (merchantData.coffeePrograms && Array.isArray(merchantData.coffeePrograms)) {
            merchantData.coffeePrograms.forEach((program: any, index: number) => {
              programs.push({ ...program, type: 'coffee', originalIndex: index })
            })
          }
          
          // Check voucherPrograms array
          if (merchantData.voucherPrograms && Array.isArray(merchantData.voucherPrograms)) {
            merchantData.voucherPrograms.forEach((program: any, index: number) => {
              programs.push({ ...program, type: 'voucher', originalIndex: index })
            })
          }
          
          // Check transactionRewards array
          if (merchantData.transactionRewards && Array.isArray(merchantData.transactionRewards)) {
            merchantData.transactionRewards.forEach((program: any, index: number) => {
              programs.push({ ...program, type: 'transaction', originalIndex: index })
            })
          }
          
          console.log('🔍 Active programs found:', programs)
          setActivePrograms(programs)
        }
      } catch (error) {
        console.error("Error fetching active programs:", error)
      }
    }

    fetchActivePrograms()
  }, [user])

  // Toggle program active status
  const toggleProgramActive = async (programIndex: number, programType: 'coffee' | 'voucher' | 'transaction') => {
    if (!user?.uid) return

    try {
      const merchantRef = doc(db, 'merchants', user.uid)
      const merchantSnapshot = await getDoc(merchantRef)
      
      if (merchantSnapshot.exists()) {
        const merchantData = merchantSnapshot.data()
        let arrayName = ''
        
        if (programType === 'coffee') arrayName = 'coffeePrograms'
        else if (programType === 'voucher') arrayName = 'voucherPrograms'
        else if (programType === 'transaction') arrayName = 'transactionRewards'
        
        const programs = [...(merchantData[arrayName] || [])]
        if (programs[programIndex]) {
          programs[programIndex].active = !programs[programIndex].active
          
          await updateDoc(merchantRef, {
            [arrayName]: programs
          })
          
          // Update local state
          setActivePrograms(prev => 
            prev.map(program => 
              program.type === programType && program.originalIndex === programIndex
                ? { ...program, active: !program.active }
                : program
            )
          )
        }
      }
    } catch (error) {
      console.error("Error toggling program status:", error)
    }
  }

  // Handle edit program
  const handleEditProgram = (programType: 'coffee' | 'voucher' | 'transaction') => {
    let dialogType: 'coffee' | 'discount' | 'transaction' = 'coffee'
    
    if (programType === 'voucher') {
      dialogType = 'discount'
    } else if (programType === 'transaction') {
      dialogType = 'transaction'
    } else {
      dialogType = 'coffee'
    }
    
    setSelectedProgramType(dialogType)
    setShowCreateDialog(true)
  }

  // Get program type display name
  const getProgramTypeDisplay = (programType: string) => {
    switch (programType) {
      case 'coffeeprogramnew':
        return 'Coffee Program'
      case 'voucherprogramnew':
        return 'Voucher Program'
      case 'transactionrewardsnew':
        return 'Transaction Rewards'
      default:
        return programType
    }
  }

  // Get program type icon (blue only)
  const getProgramTypeIcon = (programType: string) => {
    switch (programType) {
      case 'coffeeprogramnew':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      case 'voucherprogramnew':
        return <Percent className="h-4 w-4 text-blue-600" />
      case 'transactionrewardsnew':
        return <ShoppingBag className="h-4 w-4 text-blue-600" />
      default:
        return <Award className="h-4 w-4 text-blue-600" />
    }
  }

  // Get program type icon for active programs display
  const getActiveeProgramIcon = (type: string) => {
    switch (type) {
      case 'coffee':
        return <Coffee className="h-4 w-4 text-blue-600" />
      case 'voucher':
        return <DollarSign className="h-4 w-4 text-blue-600" />
      case 'transaction':
        return <ShoppingBag className="h-4 w-4 text-blue-600" />
      default:
        return <Award className="h-4 w-4 text-blue-600" />
    }
  }

  // Handle reward click to open detail sheet
  const handleRewardClick = (rewardId: string) => {
    setSelectedRewardId(rewardId)
    setShowRewardDetail(true)
  }

  // Toggle reward active status
  const toggleRewardActive = async (rewardId: string, currentStatus: boolean) => {
    if (!user?.uid) return

    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId)
      await updateDoc(rewardRef, {
        isActive: !currentStatus,
        updatedAt: new Date()
      })

      // Update local state
      setProgramRewards(prev => 
        prev.map(reward => 
          reward.id === rewardId 
            ? { ...reward, isActive: !currentStatus }
            : reward
        )
      )
    } catch (error) {
      console.error('Error toggling reward status:', error)
    }
  }

  return (
    <div>
      {/* Programs Section */}
      {activePrograms.length > 0 && (
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3">Programs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activePrograms.map((program, index) => {
              const rewardCount = programRewardCounts[program.type] || 0
              return (
                <div key={index} className="bg-white border rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getActiveeProgramIcon(program.type)}
                      <span className="font-medium text-sm capitalize">{program.type} Program</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditProgram(program.type)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <Switch
                        checked={program.active}
                        onCheckedChange={() => toggleProgramActive(program.originalIndex, program.type)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{program.name || 'Unnamed Program'}</p>
                  <div className="flex items-center justify-between">
                    <div className={`text-xs font-medium ${program.active ? 'text-green-600' : 'text-gray-500'}`}>
                      {program.active ? 'Active' : 'Inactive'}
                    </div>
                    {rewardCount > 0 && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-gray-500 cursor-help">
                              <Award className="h-3 w-3" />
                              <span className="text-xs font-medium">{rewardCount}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p className="text-xs">Unredeemed rewards available for customers</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>

                </div>
              )
            })}
          </div>
        </div>
      )}

      <Card className="rounded-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[320px]">Preview</TableHead>
                <TableHead className="text-center">Program Type</TableHead>
                <TableHead className="text-center">Customer</TableHead>
                <TableHead className="text-center">Value</TableHead>
                <TableHead className="text-center">Impressions</TableHead>
                <TableHead className="text-center">Created</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead className="text-center">Redemption Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex justify-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : programRewards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Award className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No program rewards found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Program rewards will appear here when customers earn them
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                programRewards.map((reward) => (
                  <TableRow 
                    key={reward.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleRewardClick(reward.id)}
                  >
                    <TableCell className="font-medium py-2 px-4">
                      <RewardPreviewCard reward={reward} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="font-medium text-gray-700">
                        {getProgramTypeDisplay(reward.programtype || '')}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Avatar className="size-6">
                          {(reward as any).customerProfilePicture ? (
                            <AvatarImage 
                              src={(reward as any).customerProfilePicture} 
                              alt={reward.customerName || 'Customer'} 
                            />
                          ) : null}
                          <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                            {reward.customerName?.split(' ').map(n => n[0]).join('') || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{reward.customerName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        console.log('🔍 Badge logic for reward:', {
                          id: reward.id,
                          programType: reward.programType,
                          voucherAmount: reward.voucherAmount,
                          rewardTypeDetails: reward.rewardTypeDetails,
                          pointsCost: reward.pointsCost
                        })
                        
                        if (reward.programType === 'coffeeprogramnew') {
                          return (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                              Free Coffee
                            </Badge>
                          )
                        } else if (reward.programType === 'voucherprogramnew') {
                          return (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                              ${reward.voucherAmount || 0} Voucher
                            </Badge>
                          )
                        } else if (reward.programType === 'transactionrewardsnew') {
                          return (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                              {reward.rewardTypeDetails?.itemName || 'Item'}
                            </Badge>
                          )
                        } else {
                          return (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 rounded-md">
                              {reward.pointsCost > 0 ? `${reward.pointsCost} pts` : 'Free'}
                            </Badge>
                          )
                        }
                      })()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className="font-medium" style={{ color: '#007AFF' }}>
                          {reward.impressions || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(reward as any).impressioncustomercount || 0} {((reward as any).impressioncustomercount || 0) === 1 ? 'customer' : 'customers'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {reward.createdAt ? formatDistanceToNow(reward.createdAt.toDate(), { addSuffix: true }) : "Unknown"}
                    </TableCell>
                    <TableCell className="text-center">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Switch
                          checked={reward.isActive}
                          onCheckedChange={() => toggleRewardActive(reward.id, reward.isActive)}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {reward.redemptionCount > 0 ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-green-700">Redeemed</span>
                          </>
                        ) : (
                          <span className="font-medium text-gray-600">Not Redeemed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent 
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem onClick={() => handleRewardClick(reward.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/customers/id?customerId=${reward.customers?.[0] || reward.uniqueCustomerIds?.[0]}`)}>
                            <User className="h-4 w-4 mr-2" />
                            View Customer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reward Detail Sheet */}
      <RewardDetailSheet
        open={showRewardDetail}
        onOpenChange={setShowRewardDetail}
        rewardId={selectedRewardId}
      />

      {/* Create Recurring Reward Dialog */}
      <CreateRecurringRewardDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        programType={selectedProgramType}
      />
    </div>
  )
}

export default function StoreOverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("rewards")
  
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
          type: data.type || 'gift',
          programtype: data.programtype || '',
          category: data.category || 'individual',
          pointsCost: data.pointsCost || 0,
          redemptionCount: data.redemptionCount || 0,
          status: data.status || 'active',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt || data.createdAt,
          expiryDate: data.expiryDate,
          imageUrl: data.imageUrl,
          punchCount: data.punchCount,
          expiryDays: data.expiryDays,
          customerIds: data.customerIds,
          rewardVisibility: data.rewardVisibility,
          conditions: data.conditions,
          limitations: data.limitations,
          hasActivePeriod: !!data.hasActivePeriod,
          activePeriod: data.activePeriod || { startDate: '', endDate: '' },
          isActive: !!data.isActive,
          lastRedeemed: data.lastRedeemed ? data.lastRedeemed.toDate() : null,
          programName: data.programName,
          impressions: data.impressions || 0,
  
          viewCount: data.viewCount || 0,
          isAgentGenerated: data.isAgentGenerated || false
        } as Reward
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
          isAgentGenerated: data.isAgentGenerated || false,
          link: data.link,
          color: data.color,
          cssColor: data.cssColor,
          isActive: data.isActive,
          scheduleStartMinutes: data.scheduleStartMinutes,
          scheduleEndMinutes: data.scheduleEndMinutes,
          scheduleStartHour: data.scheduleStartHour,
          scheduleEndHour: data.scheduleEndHour,
          scheduled: data.scheduled,
          buttonText: data.buttonText,
          style: data.style,
          merchantName: data.merchantName,
          visibilityType: data.visibilityType,
          endsNextDay: data.endsNextDay,
          impressioncustomercount: data.impressioncustomercount,
          bannerAction: data.bannerAction
        } as Banner
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
  
  // Helper function to combine messages and notifications for the table
  const getAllMessages = (): Array<{
    id: string;
    title: string;
    content: string;
    sent: boolean;
    sentAt?: any;
    recipients: number;
    openRate?: number;
    type: 'email' | 'push';
    status: 'sent' | 'draft';
    engagement: number;
    body?: string;
    clickRate?: number;
  }> => {
    // Add sample data for demonstration
    const sampleMessages = [
      {
        id: 'msg-1',
        title: 'Welcome to Our Store!',
        content: 'Thank you for joining our loyalty program. Here\'s a special 10% discount code: WELCOME10',
        sent: true,
        sentAt: { toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        recipients: 245,
        openRate: 68.5,
        type: 'email' as const,
        status: 'sent' as const,
        engagement: 68.5
      },
      {
        id: 'msg-2',
        title: 'Weekend Sale - 30% Off',
        content: 'Don\'t miss our weekend flash sale! 30% off all items. Valid until Sunday midnight.',
        sent: true,
        sentAt: { toDate: () => new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        recipients: 892,
        openRate: 45.2,
        type: 'email' as const,
        status: 'sent' as const,
        engagement: 45.2
      },
      {
        id: 'msg-3',
        title: 'Monthly Newsletter Draft',
        content: 'Our monthly newsletter featuring new products, customer stories, and upcoming events.',
        sent: false,
        sentAt: null,
        recipients: 1200,
        openRate: 0,
        type: 'email' as const,
        status: 'draft' as const,
        engagement: 0
      }
    ]

    const sampleNotifications = [
      {
        id: 'notif-1',
        title: 'Flash Sale Alert!',
        body: 'Your favourite items are now 25% off! Limited time only.',
        sent: true,
        sentAt: { toDate: () => new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        recipients: 567,
        clickRate: 12.8,
        type: 'push' as const,
        content: 'Your favourite items are now 25% off! Limited time only.',
        status: 'sent' as const,
        engagement: 12.8
      },
      {
        id: 'notif-2',
        title: 'New Loyalty Points Earned',
        body: 'You\'ve earned 150 new loyalty points! Check out your rewards.',
        sent: true,
        sentAt: { toDate: () => new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        recipients: 1034,
        clickRate: 8.9,
        type: 'push' as const,
        content: 'You\'ve earned 150 new loyalty points! Check out your rewards.',
        status: 'sent' as const,
        engagement: 8.9
      },
      {
        id: 'notif-3',
        title: 'Order Ready for Pickup',
        body: 'Your order #12345 is ready for pickup at our Collins Street location.',
        sent: false,
        sentAt: null,
        recipients: 1,
        clickRate: 0,
        type: 'push' as const,
        content: 'Your order #12345 is ready for pickup at our Collins Street location.',
        status: 'draft' as const,
        engagement: 0
      }
    ]

    // Combine actual data with sample data
    const allMessages = [
      ...messages.map(msg => ({
        ...msg,
        type: 'email' as const,
        content: msg.content,
        status: msg.sent ? 'sent' as const : 'draft' as const,
        engagement: msg.openRate || 0
      })),
      ...notifications.map(notif => ({
        ...notif,
        type: 'push' as const,
        content: notif.body,
        title: notif.title,
        status: notif.sent ? 'sent' as const : 'draft' as const,
        engagement: notif.clickRate || 0,
        openRate: notif.clickRate
      })),
      ...sampleMessages,
      ...sampleNotifications
    ].sort((a, b) => {
      const aTime = a.sentAt ? (a.sentAt.toDate ? a.sentAt.toDate().getTime() : new Date(a.sentAt).getTime()) : 0
      const bTime = b.sentAt ? (b.sentAt.toDate ? b.sentAt.toDate().getTime() : new Date(b.sentAt).getTime()) : 0
      return bTime - aTime
    })
    
    return allMessages
  }

  // Define table columns for messages
  const messageColumns: ColumnDef<ReturnType<typeof getAllMessages>[number]>[] = [
    {
      accessorKey: 'title',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Message" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="size-8">
              <AvatarFallback className={
                row.original.type === 'email' 
                  ? "bg-blue-100 text-blue-600" 
                  : "bg-orange-100 text-orange-600"
              }>
                {row.original.type === 'email' ? (
                  <Mail className="h-4 w-4" />
                ) : (
                  <BellRing className="h-4 w-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div
              className="absolute right-0 bottom-0 h-2 w-2 rounded-full ring-2 ring-background"
              style={{
                backgroundColor: row.original.status === 'sent' ? '#10B981' : '#6B7280',
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm">{row.original.title}</div>
            <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
              {row.original.content}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Type" />
      ),
      cell: ({ row }) => (
        <Badge 
          variant="outline" 
          className={cn(
            "capitalize rounded-md",
            row.original.type === 'email' 
              ? "bg-blue-50 text-blue-700 border-blue-200" 
              : "bg-orange-50 text-orange-700 border-orange-200"
          )}
        >
          {row.original.type === 'email' ? 'Email' : 'Push Notification'}
        </Badge>
      ),
    },
    {
      accessorKey: 'recipients',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Recipients" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{row.original.recipients.toLocaleString()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ 
              backgroundColor: row.original.status === 'sent' ? '#10B981' : '#6B7280' 
            }}
          />
          <span className="text-sm font-medium capitalize">{row.original.status}</span>
        </div>
      ),
    },
    {
      accessorKey: 'sentAt',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Sent Date" />
      ),
      cell: ({ row }) => {
        if (!row.original.sentAt) {
          return <span className="text-sm text-muted-foreground">Not sent</span>
        }
        
        const date = row.original.sentAt.toDate ? row.original.sentAt.toDate() : new Date(row.original.sentAt)
        return (
          <div className="text-sm">
            <div>{format(date, 'MMM d, yyyy')}</div>
            <div className="text-xs text-muted-foreground">{format(date, 'h:mm a')}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'engagement',
      header: ({ column }) => (
        <TableColumnHeader column={column} title="Engagement" />
      ),
      cell: ({ row }) => {
        if (row.original.status !== 'sent') {
          return <span className="text-sm text-muted-foreground">-</span>
        }
        
        const rate = row.original.engagement || 0
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <BarChart className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{rate.toFixed(1)}%</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {row.original.type === 'email' ? 'open' : 'click'} rate
            </span>
          </div>
        )
      },
    },
  ]
  
  return (
    <PageTransition>
      <div className="p-6 py-4">
        <div className="flex items-center justify-between">
          {/* Top Navigation Tabs */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "rewards"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("rewards")}
            >
              <Gift size={15} />
              Rewards
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "programs"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("programs")}
            >
              <Sparkles size={15} />
              Programs
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "customers"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("customers")}
            >
              <Users size={15} />
              Customers
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "messages"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("messages")}
            >
              <MessageSquare size={15} />
              Messages
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "banners"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("banners")}
            >
              <Image size={15} />
              Banners
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "activity"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("activity")}
            >
              <Activity size={15} />
              Activity
            </button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
          {/* TabsList hidden since we have navigation tabs in header */}
          
          <TabsContent value="rewards">
            {/* Full Rewards Page Content */}
            <RewardsTabContent />
          </TabsContent>
          
          <TabsContent value="programs">
            <ProgramsTabContent />
          </TabsContent>
          
          <TabsContent value="customers">
            <CustomersTabContent />
          </TabsContent>
          
          <TabsContent value="messages">
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
            ) : getAllMessages().length === 0 ? (
              <div className="border border-gray-200 rounded-md bg-white p-8">
                <div className="flex flex-col items-center justify-center text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Mail className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No messages found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                    Create your first message or notification to get started
                      </p>
                    </div>
                                </div>
            ) : (
              <div className="border border-gray-200 rounded-md bg-white">
                <TableProvider columns={messageColumns} data={getAllMessages()}>
                  <KiboTableHeader>
                    {({ headerGroup }) => (
                      <TableHeaderGroup key={headerGroup.id} headerGroup={headerGroup}>
                        {({ header }) => <KiboTableHead key={header.id} header={header} />}
                      </TableHeaderGroup>
                    )}
                  </KiboTableHeader>
                  <KiboTableBody>
                    {({ row }) => (
                      <KiboTableRow key={row.id} row={row}>
                        {({ cell }) => <KiboTableCell key={cell.id} cell={cell} />}
                      </KiboTableRow>
                    )}
                  </KiboTableBody>
                </TableProvider>
                                </div>
            )}
          </TabsContent>
          
          <TabsContent value="banners">
            <BannersTabContent />
          </TabsContent>
          
          <TabsContent value="activity">
            <ActivityTabContent />
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