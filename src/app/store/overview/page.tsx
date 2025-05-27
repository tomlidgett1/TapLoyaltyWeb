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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RewardDetailSheet } from "@/components/reward-detail-sheet"
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
  Plus,
  Filter,
  MoreHorizontal,
  Edit,
  Trash,
  ChevronUp,
  ChevronDown,
  HelpCircle
} from "lucide-react"

// Component interfaces
interface Reward {
  id: string;
  rewardName: string;
  name?: string;
  description: string;
  type: string;
  programtype?: string;
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
  redeemableCustomers: number;
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

// Full Rewards Tab Component
const RewardsTabContent = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [rewardsData, setRewardsData] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [rewardCategory, setRewardCategory] = useState<"all" | "individual" | "customer-specific" | "programs" | "agent">("all")
  const [sortField, setSortField] = useState<"rewardName" | "type" | "pointsCost" | "redemptionCount" | "redeemableCustomers" | "impressions" | "createdAt" | "lastRedeemed" | "isActive">("rewardName")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [loadingRewards, setLoadingRewards] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilters, setStatusFilters] = useState({
    active: true,
    inactive: true
  })
  const [typeFilters, setTypeFilters] = useState({
    coffee: true,
    discount: true,
    gift: true,
    ticket: true,
    other: true
  })
  const [pointsCostRange, setPointsCostRange] = useState([0, 500])
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null)
  const [isRewardDetailOpen, setIsRewardDetailOpen] = useState(false)
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({})

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
              category: data.category || 'individual',
              pointsCost: data.pointsCost || 0,
              redemptionCount: data.redemptionCount || 0,
              status: data.status || 'active',
              createdAt,
              updatedAt,
              lastRedeemed,
              isActive: !!data.isActive,
              impressions: data.impressions || 0,
              redeemableCustomers: data.redeemableCustomers || 0,
              hasActivePeriod: !!data.hasActivePeriod,
              activePeriod: data.activePeriod || { startDate: '', endDate: '' }
            } as Reward);
          } catch (err) {
            console.error("Error processing reward document:", err, "Document ID:", doc.id);
          }
        });
        
        setRewardsData(fetchedRewards);
      } catch (error) {
        console.error("Error fetching rewards:", error);
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
        return <Coffee className="h-5 w-5 text-amber-600" />;
      case 'ticket':
        return <Ticket className="h-5 w-5 text-purple-600" />;
      case 'discount':
        return <Tag className="h-5 w-5 text-green-600" />;
      case 'gift':
        return <Gift className="h-5 w-5 text-red-600" />;
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

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    setStatusFilters(prev => ({
      ...prev,
      [status.toLowerCase()]: checked
    }))
  }

  const handleTypeFilterChange = (type: string, checked: boolean) => {
    setTypeFilters(prev => ({
      ...prev,
      [type.toLowerCase()]: checked
    }))
  }

  const applyFilters = (data: Reward[]) => {
    return data.filter(reward => {
      // Apply status filter
      const isActive = reward.isActive
      if ((isActive && !statusFilters.active) || (!isActive && !statusFilters.inactive)) {
        return false
      }

      // Apply type filter
      const type = reward.type?.toLowerCase() || 'other'
      if (!typeFilters[type as keyof typeof typeFilters] && !typeFilters.other) {
        return false
      }

      // Apply points cost filter
      if (reward.pointsCost < pointsCostRange[0] || reward.pointsCost > pointsCostRange[1]) {
        return false
      }

      return true
    })
  }

  const getFilteredRewards = () => {
    let filtered = rewardsData.filter(reward => {
      // Apply category filter
      if (rewardCategory !== "all" && reward.category !== rewardCategory) {
        return false
      }
      
      // Apply search filter
      if (searchQuery && !reward.rewardName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      return true
    })
    
    // Apply additional filters
    filtered = applyFilters(filtered)
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "rewardName":
          comparison = (a.rewardName || "").localeCompare(b.rewardName || "");
          break;
        case "type":
          comparison = (a.type || "").localeCompare(b.type || "");
          break;
        case "pointsCost":
          comparison = (a.pointsCost || 0) - (b.pointsCost || 0);
          break;
        case "redemptionCount":
          comparison = (a.redemptionCount || 0) - (b.redemptionCount || 0);
          break;
        case "redeemableCustomers":
          comparison = (a.redeemableCustomers || 0) - (b.redeemableCustomers || 0);
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
    });
  };

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

  return (
    <div>
      <Tabs defaultValue="all" onValueChange={(value) => setRewardCategory(value as typeof rewardCategory)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
            <button
              onClick={() => setRewardCategory("all")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                rewardCategory === "all"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Package className="h-4 w-4" />
              All Rewards
            </button>
            <button
              onClick={() => setRewardCategory("individual")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                rewardCategory === "individual"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Gift className="h-4 w-4" />
              Individual
            </button>
            <button
              onClick={() => setRewardCategory("customer-specific")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                rewardCategory === "customer-specific"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Users className="h-4 w-4" />
              Customer-Specific
            </button>
            <button
              onClick={() => setRewardCategory("programs")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                rewardCategory === "programs"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Award className="h-4 w-4" />
              Programs
            </button>
            <button
              onClick={() => setRewardCategory("agent")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                rewardCategory === "agent"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
            >
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500">
                Agent
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search rewards..." 
                className="w-[250px] pl-9 h-9 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="h-9 gap-2 rounded-md"
                  onClick={() => setShowFilters(true)}
                >
                  <Filter className="h-4 w-4" />
                  Filter
                  {(Object.values(statusFilters).some(v => !v) || 
                    Object.values(typeFilters).some(v => !v)) && (
                    <Badge className="ml-1 bg-primary h-5 w-5 p-0 flex items-center justify-center">
                      <span className="text-xs">!</span>
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-4">
                <div className="space-y-4">
                  <h4 className="font-medium">Filter Rewards</h4>
                  
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status-active" 
                          checked={statusFilters.active}
                          onCheckedChange={(checked) => 
                            handleStatusFilterChange('active', checked as boolean)}
                        />
                        <Label htmlFor="status-active" className="cursor-pointer">Active</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="status-inactive" 
                          checked={statusFilters.inactive}
                          onCheckedChange={(checked) => 
                            handleStatusFilterChange('inactive', checked as boolean)}
                        />
                        <Label htmlFor="status-inactive" className="cursor-pointer">Inactive</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <div className="flex flex-col gap-2">
                      {['coffee', 'discount', 'gift', 'ticket', 'other'].map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`type-${type}`}
                            checked={typeFilters[type as keyof typeof typeFilters]}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange(type, checked as boolean)}
                          />
                          <Label htmlFor={`type-${type}`} className="cursor-pointer capitalize">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Points Cost Range</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="min-points" className="text-xs">Min</Label>
                        <Input
                          id="min-points"
                          type="number"
                          min={0}
                          max={500}
                          value={pointsCostRange[0]}
                          onChange={(e) => setPointsCostRange([Number(e.target.value), pointsCostRange[1]])}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-points" className="text-xs">Max</Label>
                        <Input
                          id="max-points"
                          type="number"
                          min={0}
                          max={500}
                          value={pointsCostRange[1]}
                          onChange={(e) => setPointsCostRange([pointsCostRange[0], Number(e.target.value)])}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between pt-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setStatusFilters({ active: true, inactive: true })
                        setTypeFilters({ 
                          coffee: true, 
                          discount: true, 
                          gift: true, 
                          ticket: true, 
                          other: true 
                        })
                        setPointsCostRange([0, 500])
                      }}
                    >
                      Reset Filters
                    </Button>
                    <Button onClick={() => setShowFilters(false)}>Apply Filters</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="outline" 
              className="gap-2 rounded-md"
              onClick={handleExportPDF}
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        
        <TabsContent value="all" className="mt-0">
          <Card className="rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("rewardName")}
                        className="flex items-center gap-1 px-0 font-medium"
                      >
                        Reward Name
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
                      <Button 
                        variant="ghost" 
                        onClick={() => handleSort("redeemableCustomers")}
                        className="flex items-center gap-1 px-0 font-medium mx-auto"
                      >
                        Redeemable
                        {sortField === "redeemableCustomers" && (
                          sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                        <HelpCircle className="h-3 w-3 text-muted-foreground ml-1" />
                      </Button>
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
                        Status
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
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex justify-center">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : getFilteredRewards().length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
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
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center">
                              {reward.category === "program" 
                                ? <Award className="h-5 w-5 text-amber-600" />
                                : getRewardTypeIcon(reward.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate flex items-center gap-1">
                                {reward.rewardName}
                                {Array.isArray(reward.conditions) && 
                                  reward.conditions.find(c => c.type === 'maximumTransactions')?.value === 0 && (
                                  <Badge variant="outline" className="ml-1 py-0 h-4 text-[10px] px-1.5 bg-teal-50 text-teal-700 border-teal-200">
                                    New Customers
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1">
                                {reward.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.programtype === "agent" ? (
                            <div className="font-medium">
                              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-orange-500">
                                Agent
                              </span>
                            </div>
                          ) : (
                            <div className={cn(
                              "font-medium",
                              reward.programtype === "voucher" && "text-purple-700",
                              reward.programtype === "points" && "text-blue-700",
                              reward.programtype === "coffee" && "text-amber-700",
                              reward.programtype === "discount" && "text-emerald-700",
                              !reward.programtype && "text-gray-700"
                            )}>
                              {reward.programtype 
                                ? reward.programtype.charAt(0).toUpperCase() + reward.programtype.slice(1)
                                : "Individual Reward"}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-blue-700">
                            {reward.pointsCost}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-green-700">
                            {reward.redemptionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-blue-700">
                            {reward.redeemableCustomers || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "font-medium",
                            reward.isActive ? "text-green-700" : "text-red-700"
                          )}>
                            {reward.isActive ? "Live" : "Inactive"}
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
        </TabsContent>

        {/* Add other tab contents for individual, customer-specific, programs, agent */}
        <TabsContent value="individual" className="mt-0">
          <Card className="rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Reward Name</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Points</TableHead>
                    <TableHead className="text-center">Redemptions</TableHead>
                    <TableHead className="text-center">Created</TableHead>
                    <TableHead className="text-center">Status</TableHead>
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
                          <div className="font-medium text-blue-700">
                            {reward.pointsCost}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-medium text-green-700">
                            {reward.redemptionCount || 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className={cn(
                            "font-medium",
                            reward.isActive ? "text-green-700" : "text-red-700"
                          )}>
                            {reward.isActive ? "Live" : "Inactive"}
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
          <Card className="rounded-lg overflow-hidden">
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
          <Card className="rounded-lg overflow-hidden">
            <CardContent className="p-0">
              <div className="p-8 text-center">
                <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Program Rewards</h3>
                                 <p className="text-muted-foreground mb-4">
                   {getFilteredRewards().filter(r => r.category === "program").length} program rewards
                 </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="mt-0">
          <Card className="rounded-lg overflow-hidden">
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
          redeemableCustomers: data.redeemableCustomers || 0,
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
          </div>
          
          <Button 
            className="gap-2 rounded-md"
            onClick={() => router.push('/create')}
          >
            <PlusCircle className="h-4 w-4" />
            Create New
          </Button>
        </div>
        
        <Tabs defaultValue="rewards" className="mt-6">
          {/* TabsList hidden since we have navigation tabs in header */}
          
          <TabsContent value="rewards">
            {/* Full Rewards Page Content */}
            <RewardsTabContent />
          </TabsContent>
          
          <TabsContent value="programs">
            <div className="space-y-6">
              <Card className="rounded-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Sparkles className="h-5 w-5 mr-2 text-gray-600" />
                      Loyalty Programs
                    </CardTitle>
                    <Button 
                      className="gap-2 rounded-md"
                      onClick={() => router.push('/create')}
                    >
                      <Plus className="h-4 w-4" />
                      Create Program
                    </Button>
                  </div>
                  <CardDescription>Manage your loyalty and rewards programs</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : rewards.filter(r => r.category === "program").length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Sparkles className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No programs found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first loyalty program to get started
                      </p>
                      <Button 
                        className="mt-4 h-9 gap-2 rounded-md"
                        onClick={() => router.push('/create')}
                      >
                        <Plus className="h-4 w-4" />
                        Create Program
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Program Name</TableHead>
                          <TableHead className="text-center">Type</TableHead>
                          <TableHead className="text-center">Rewards</TableHead>
                          <TableHead className="text-center">Active Users</TableHead>
                          <TableHead className="text-center">Created</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rewards.filter(r => r.category === "program").map((program) => (
                          <TableRow 
                            key={program.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => router.push(`/store/programs/${program.id}`)}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center">
                                  <Award className="h-5 w-5 text-amber-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate">{program.rewardName}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">
                                    {program.description}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium text-amber-700">
                                {program.programtype?.charAt(0).toUpperCase() + program.programtype?.slice(1) || "Program"}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium text-blue-700">
                                {program.redemptionCount || 0}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="font-medium text-green-700">
                                {program.redeemableCustomers || 0}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {program.createdAt ? formatDistanceToNow(program.createdAt, { addSuffix: true }) : "Unknown"}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className={cn(
                                "font-medium",
                                program.isActive ? "text-green-700" : "text-red-700"
                              )}>
                                {program.isActive ? "Live" : "Inactive"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/store/programs/${program.id}`);
                                }}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Total: {rewards.filter(r => r.category === "program").length} programs
                  </div>
                  <Button variant="link" size="sm" className="px-0" asChild>
                    <Link href="/store/programs">View all programs</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="customers">
            <div className="space-y-6">
              <Card className="rounded-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Users className="h-5 w-5 mr-2 text-gray-600" />
                      Customer Management
                    </CardTitle>
                    <Button 
                      className="gap-2 rounded-md"
                      onClick={() => router.push('/customers')}
                    >
                      <Users className="h-4 w-4" />
                      View All Customers
                    </Button>
                  </div>
                  <CardDescription>Overview of your customer base and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="flex flex-col space-y-1.5">
                      <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
                      <div className="text-2xl font-bold">2,847</div>
                      <div className="text-xs text-green-600">+12% from last month</div>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <h3 className="text-sm font-medium text-muted-foreground">Active This Month</h3>
                      <div className="text-2xl font-bold">1,234</div>
                      <div className="text-xs text-green-600">+8% from last month</div>
                    </div>
                    <div className="flex flex-col space-y-1.5">
                      <h3 className="text-sm font-medium text-muted-foreground">Avg. Points Balance</h3>
                      <div className="text-2xl font-bold">156</div>
                      <div className="text-xs text-blue-600">+5% from last month</div>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Recent Customer Activity</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Sarah Johnson", action: "Redeemed 50 points", time: "2 minutes ago", avatar: "SJ" },
                        { name: "Mike Chen", action: "Earned 25 points", time: "15 minutes ago", avatar: "MC" },
                        { name: "Emma Wilson", action: "Joined loyalty program", time: "1 hour ago", avatar: "EW" },
                        { name: "David Brown", action: "Redeemed free coffee", time: "2 hours ago", avatar: "DB" },
                        { name: "Lisa Garcia", action: "Earned 15 points", time: "3 hours ago", avatar: "LG" }
                      ].map((activity, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 rounded-md bg-gray-50">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{activity.avatar}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{activity.name}</div>
                            <div className="text-xs text-muted-foreground">{activity.action}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{activity.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Last updated: {format(new Date(), 'MMM d, yyyy h:mm a')}
                  </div>
                  <Button variant="link" size="sm" className="px-0" asChild>
                    <Link href="/customers">View all customers</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="messages">
            <div className="space-y-6">
              <Card className="rounded-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2 text-gray-600" />
                      Messages & Notifications
                    </CardTitle>
                    <Button 
                      className="gap-2 rounded-md"
                      onClick={() => router.push('/store/messages')}
                    >
                      <Plus className="h-4 w-4" />
                      Create Message
                    </Button>
                  </div>
                  <CardDescription>Manage customer communications and push notifications</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 && notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No messages found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first message to engage with customers
                      </p>
                      <Button 
                        className="mt-4 h-9 gap-2 rounded-md"
                        onClick={() => router.push('/store/messages')}
                      >
                        <Plus className="h-4 w-4" />
                        Create Message
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Messages Section */}
                      {messages.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Recent Messages
                          </h4>
                          <div className="space-y-3">
                            {messages.slice(0, 3).map((message) => (
                              <div key={message.id} className="flex items-center gap-3 p-3 rounded-md bg-gray-50">
                                <div className="h-8 w-8 rounded-md bg-blue-100 flex items-center justify-center">
                                  <MessageSquare className="h-4 w-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{message.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">{message.content}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {message.sent ? `Sent to ${message.recipients}` : 'Draft'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {message.sentAt ? getTimeAgo(message.sentAt) : 'Not sent'}
                                  </div>
                                </div>
                                {message.sent && (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded-md">
                                    Sent
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Notifications Section */}
                      {notifications.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <BellRing className="h-4 w-4" />
                            Push Notifications
                          </h4>
                          <div className="space-y-3">
                            {notifications.slice(0, 3).map((notification) => (
                              <div key={notification.id} className="flex items-center gap-3 p-3 rounded-md bg-gray-50">
                                <div className="h-8 w-8 rounded-md bg-orange-100 flex items-center justify-center">
                                  <BellRing className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{notification.title}</div>
                                  <div className="text-xs text-muted-foreground line-clamp-1">{notification.body}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-muted-foreground">
                                    {notification.sent ? `Sent to ${notification.recipients}` : 'Draft'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {notification.sentAt ? getTimeAgo(notification.sentAt) : 'Not sent'}
                                  </div>
                                </div>
                                {notification.sent && (
                                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100 rounded-md">
                                    Sent
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    {messages.length} messages, {notifications.length} notifications
                  </div>
                  <Button variant="link" size="sm" className="px-0" asChild>
                    <Link href="/store/messages">View all messages</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="banners">
            <div className="space-y-6">
              <Card className="rounded-lg overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center">
                      <Image className="h-5 w-5 mr-2 text-gray-600" />
                      Marketing Banners
                    </CardTitle>
                    <Button 
                      className="gap-2 rounded-md"
                      onClick={() => router.push('/store/banners')}
                    >
                      <Plus className="h-4 w-4" />
                      Create Banner
                    </Button>
                  </div>
                  <CardDescription>Manage promotional banners and marketing content</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center h-48">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : banners.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-medium">No banners found</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create your first marketing banner to promote offers
                      </p>
                      <Button 
                        className="mt-4 h-9 gap-2 rounded-md"
                        onClick={() => router.push('/store/banners')}
                      >
                        <Plus className="h-4 w-4" />
                        Create Banner
                      </Button>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[300px]">Banner Title</TableHead>
                          <TableHead className="text-center">Views</TableHead>
                          <TableHead className="text-center">Clicks</TableHead>
                          <TableHead className="text-center">CTR</TableHead>
                          <TableHead className="text-center">Created</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {banners.slice(0, 5).map((banner) => {
                          const ctr = banner.viewCount && banner.viewCount > 0 
                            ? ((banner.clickCount || 0) / banner.viewCount * 100).toFixed(1)
                            : '0.0';
                          
                          return (
                            <TableRow 
                              key={banner.id}
                              className="cursor-pointer hover:bg-gray-50"
                              onClick={() => router.push(`/store/banners/${banner.id}`)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center overflow-hidden">
                                    {banner.imageUrl ? (
                                      <img 
                                        src={banner.imageUrl} 
                                        alt={banner.title}
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <Image className="h-5 w-5 text-muted-foreground" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate flex items-center gap-1">
                                      {banner.title}
                                      {banner.isAgentGenerated && (
                                        <Badge variant="outline" className="ml-1 py-0 h-4 text-[10px] px-1.5 bg-gradient-to-r from-blue-50 to-orange-50 text-blue-700 border-blue-200">
                                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                                          Agent
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-1">
                                      {banner.description}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="font-medium text-blue-700">
                                  {(banner.viewCount || 0).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="font-medium text-green-700">
                                  {(banner.clickCount || 0).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="font-medium text-purple-700">
                                  {ctr}%
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {banner.createdAt ? formatDistanceToNow(banner.createdAt.toDate(), { addSuffix: true }) : "Unknown"}
                              </TableCell>
                              <TableCell className="text-center">
                                {getStatusBadge(banner.status)}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  className="h-8 w-8 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/store/banners/${banner.id}`);
                                  }}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between pt-2">
                  <div className="text-xs text-muted-foreground">
                    Total: {banners.length} banners
                    {hasAiBanners && (
                      <span className="ml-2 text-blue-600">
                        • {banners.filter(b => b.isAgentGenerated).length} AI-generated
                      </span>
                    )}
                  </div>
                  <Button variant="link" size="sm" className="px-0" asChild>
                    <Link href="/store/banners">View all banners</Link>
                  </Button>
                </CardFooter>
              </Card>
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