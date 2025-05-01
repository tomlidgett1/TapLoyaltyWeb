"use client"

import { useState, useEffect } from "react"
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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Gift, 
  Coffee,
  Tag,
  Ticket,
  Award,
  Zap,
  Edit,
  Trash,
  Eye,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Users,
  Mic,
  MicOff,
  X,
  Sparkles,
  HelpCircle,
  Package,
  DollarSign
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { safelyGetDate } from "@/lib/utils"
import { TapAiDialog } from "@/components/tap-ai-dialog"
import { getAIResponse } from "@/lib/openai"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { Card as ShadcnCard } from "@/components/ui/card"
import { 
  getOrCreateAssistant, 
  createThread, 
  addMessage, 
  runAssistant 
} from "@/lib/assistant"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { IntroductoryRewardDialog } from "@/components/introductory-reward-dialog"

// Types
type RewardCategory = "all" | "individual" | "customer-specific" | "programs"
type SortField = "rewardName" | "type" | "pointsCost" | "redemptionCount" | "redeemableCustomers" | "impressions" | "createdAt" | "lastRedeemed" | "isActive"
type SortDirection = "asc" | "desc"

interface Reward {
  id: string
  rewardName: string
  description: string
  type: string
  programtype?: string
  category: "individual" | "customer-specific" | "program"
  pointsCost: number
  redemptionCount: number
  status: "active" | "inactive" | "draft"
  createdAt: Date
  updatedAt: Date
  imageUrl?: string
  punchCount?: number
  expiryDays?: number
  customerIds?: string[]
  rewardVisibility?: string
  conditions?: any[]
  limitations?: any[]
  hasActivePeriod: boolean
  activePeriod: {
    startDate: string
    endDate: string
  }
  isActive: boolean
  lastRedeemed?: Date | null
  programName?: string
  impressions?: number
  redeemableCustomers: number
}

// Add a nicer loading state to the rewards page

// First, let's create a skeleton loader component for the table view
const TableSkeleton = () => (
  <div className="animate-pulse animate-in fade-in duration-500">
    <div className="h-10 bg-gray-100 rounded-md mb-4 w-1/3"></div>
    <div className="border rounded-md overflow-hidden">
      <div className="bg-gray-50 p-4 flex space-x-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 bg-gray-100 rounded-md flex-1"></div>
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="border-t p-4">
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gray-100 rounded-md"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
            <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
            <div className="h-8 w-8 bg-gray-100 rounded-md"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Create a skeleton loader for the card view
const CardSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in duration-500">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
        <div className="p-4">
          <div className="flex justify-between items-start mb-4">
            <div className="h-6 w-24 bg-gray-100 rounded-md"></div>
            <div className="h-6 w-16 bg-gray-100 rounded-md"></div>
          </div>
          <div className="h-5 bg-gray-100 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-100 rounded w-2/3"></div>
        </div>
        <div className="border-t p-4">
          <div className="flex justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-20"></div>
              <div className="h-5 bg-gray-100 rounded w-16"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-100 rounded w-20"></div>
              <div className="h-5 bg-gray-100 rounded w-16"></div>
            </div>
          </div>
        </div>
        <div className="border-t p-4 flex justify-between">
          <div className="h-9 w-28 bg-gray-100 rounded-md"></div>
          <div className="h-9 w-9 bg-gray-100 rounded-md"></div>
        </div>
      </div>
    ))}
  </div>
);

// Helper function to get the appropriate icon for reward type
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

// Add a function to count redeemable rewards by customers
const fetchRedeemableCount = async (rewardId: string, merchantId: string) => {
  console.log(`Fetching redeemable count for reward ${rewardId}`);
  
  try {
    // Step 1: Get all customers for this merchant
    const merchantCustomersRef = collection(db, 'merchants', merchantId, 'customers');
    const merchantCustomersSnapshot = await getDocs(merchantCustomersRef);
    
    console.log(`Found ${merchantCustomersSnapshot.size} merchant customers`);
    
    // Keep track of customers with redeemable status
    let redeemableCount = 0;
    let processedCustomers = 0;
    
    // Step 2: For each customer, check if they have this reward as redeemable
    for (const customerDoc of merchantCustomersSnapshot.docs) {
      const customerId = customerDoc.id;
      processedCustomers++;
      
      // Step 3: Check the redeemable status in the top-level customer rewards collection
      const customerRewardRef = doc(db, 'customers', customerId, 'rewards', rewardId);
      const customerRewardSnap = await getDoc(customerRewardRef);
      
      if (customerRewardSnap.exists()) {
        const rewardData = customerRewardSnap.data();
        if (rewardData.redeemable === true) {
          redeemableCount++;
          console.log(`Customer ${customerId} has reward ${rewardId} redeemable`);
        }
      }
      
      // Add debug logging for every 10 customers
      if (processedCustomers % 10 === 0) {
        console.log(`Processed ${processedCustomers}/${merchantCustomersSnapshot.size} customers, found ${redeemableCount} redeemable`);
      }
    }
    
    console.log(`Total redeemable count for reward ${rewardId}: ${redeemableCount}`);
    return redeemableCount;
  } catch (error) {
    console.error(`Error fetching redeemable count for reward ${rewardId}:`, error);
    return 0;
  }
};

export default function RewardsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [rewards, setRewards] = useState<Reward[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [rewardCategory, setRewardCategory] = useState<RewardCategory>("all")
  const [sortField, setSortField] = useState<SortField>("rewardName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [loading, setLoading] = useState(true)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [voiceCommandResult, setVoiceCommandResult] = useState<any>(null)
  const [createRewardDialogOpen, setCreateRewardDialogOpen] = useState(false)
  const [createRewardData, setCreateRewardData] = useState<any>(null)
  const [previewReward, setPreviewReward] = useState<any>(null)
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
  const [dateFilter, setDateFilter] = useState("all")
  const [customDateRange, setCustomDateRange] = useState<{start: Date | undefined, end: Date | undefined}>({
    start: undefined,
    end: undefined
  })
  const [showCustomDateRange, setShowCustomDateRange] = useState(false)
  const [rewardToDelete, setRewardToDelete] = useState<string | null>(null)
  const [isIntroRewardDialogOpen, setIsIntroRewardDialogOpen] = useState(false)
  const [hasIntroReward, setHasIntroReward] = useState(false)
  const [isConfirmDeleteProgramOpen, setIsConfirmDeleteProgramOpen] = useState(false)
  const [programToDelete, setProgramToDelete] = useState<string | null>(null)
  // Add a state to track expanded program cards
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchRewards = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const q = query(rewardsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const rewardsData: any[] = []
        
        // First pass to get basic reward data
        querySnapshot.forEach(doc => {
          try {
            const data = doc.data()
            
            let createdAt, updatedAt, lastRedeemed;
            try {
              createdAt = safelyGetDate(data.createdAt);
              updatedAt = safelyGetDate(data.updatedAt || data.createdAt);
              lastRedeemed = data.lastRedeemed ? safelyGetDate(data.lastRedeemed) : null;
            } catch (dateError) {
              createdAt = new Date();
              updatedAt = new Date();
              lastRedeemed = null;
            }
            
            rewardsData.push({
              ...data,
              id: doc.id,
              createdAt,
              updatedAt,
              lastRedeemed,
              isActive: !!data.isActive,
              impressions: data.impressions || 0,
              redeemableCustomers: 0 // Initialize with 0
            });
          } catch (err) {
            console.error("Error processing document:", err, "Document ID:", doc.id);
          }
        });
        
        // Set initial data
        setRewards(rewardsData);
        setLoading(false);
        
        // Then fetch redeemable counts in background
        const updateRedeemableCounts = async () => {
          console.log("Fetching redeemable counts for all rewards");
          const updatedRewardsData = [...rewardsData];
          
          // Process in batches to avoid overwhelming Firestore
          const batchSize = 5;
          for (let i = 0; i < updatedRewardsData.length; i += batchSize) {
            const batch = updatedRewardsData.slice(i, i + batchSize);
            await Promise.all(
              batch.map(async (reward, index) => {
                const redeemableCount = await fetchRedeemableCount(reward.id, user.uid);
                updatedRewardsData[i + index].redeemableCustomers = redeemableCount;
              })
            );
            // Update state after each batch
            setRewards([...updatedRewardsData]);
            console.log(`Processed batch ${i / batchSize + 1}/${Math.ceil(updatedRewardsData.length / batchSize)}`);
          }
        };
        
        updateRedeemableCounts();
        
      } catch (error) {
        console.error("Error fetching rewards:", error);
        toast({
          title: "Error",
          description: "Failed to load rewards. Please try again.",
          variant: "destructive"
        });
        setLoading(false);
      }
    }
    
    fetchRewards()
  }, [user])

  useEffect(() => {
    const checkIntroReward = async () => {
      if (!user?.uid) return
      
      try {
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantDoc = await getDoc(merchantRef)
        const merchantData = merchantDoc.data()
        
        setHasIntroReward(!!merchantData?.hasIntroductoryReward)
      } catch (error) {
        console.error("Error checking introductory reward status:", error)
      }
    }
    
    checkIntroReward()
  }, [user?.uid])

  // Add handleSort function before getFilteredRewards
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Move the applyFilters function before getFilteredRewards
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

      // Apply date filter
      if (dateFilter !== "all") {
        const dateObj = reward.createdAt
        
        if (!dateObj) return false
        
        if (dateFilter === "custom") {
          // Handle custom date range
          if (customDateRange.start && !customDateRange.end) {
            return dateObj >= customDateRange.start
          } else if (!customDateRange.start && customDateRange.end) {
            const endOfDay = new Date(customDateRange.end)
            endOfDay.setHours(23, 59, 59, 999)
            return dateObj <= endOfDay
          } else if (customDateRange.start && customDateRange.end) {
            const endOfDay = new Date(customDateRange.end)
            endOfDay.setHours(23, 59, 59, 999)
            return dateObj >= customDateRange.start && dateObj <= endOfDay
          }
          return true
        } else {
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          const yesterday = new Date(today)
          yesterday.setDate(yesterday.getDate() - 1)
          const thisWeekStart = new Date(today)
          thisWeekStart.setDate(today.getDate() - today.getDay())
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          
          switch (dateFilter) {
            case "today":
              return dateObj >= today
            case "yesterday":
              return dateObj >= yesterday && dateObj < today
            case "thisWeek":
              return dateObj >= thisWeekStart
            case "thisMonth":
              return dateObj >= thisMonthStart
            default:
              return true
          }
        }
      }

      return true
    })
  }

  // Fix the missing closing parenthesis in getFilteredRewards
  const getFilteredRewards = () => {
    let filtered = rewards.filter(reward => {
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
      // Sort by selected field
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

  // Add a helper function to toggle program expansion
  const toggleProgramExpansion = (programType: string) => {
    setExpandedPrograms(prev => ({
      ...prev,
      [programType]: !prev[programType]
    }));
  };

  // Then update the filteredRewards calculation in each tab
  // For the "all" tab, we use the existing filteredRewards variable

  // For the category tabs, we need to filter by category
  {["individual", "customer-specific", "programs"].map((category) => {
    // Filter rewards by category
    const categoryFilteredRewards = rewards
      .filter(reward => {
        return reward.category === category;
      });

    return (
      <TabsContent value={category} className="mt-0">
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
                      onClick={() => handleSort("impressions")}
                      className="flex items-center gap-1 px-0 font-medium mx-auto"
                    >
                      Impressions
                      {sortField === "impressions" && (
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
                      onClick={() => handleSort("lastRedeemed")}
                      className="flex items-center gap-1 px-0 font-medium mx-auto"
                    >
                      Last Redeemed
                      {sortField === "lastRedeemed" && (
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : categoryFilteredRewards.length === 0 ? (
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
                  categoryFilteredRewards.map((reward) => (
                    <TableRow 
                      key={reward.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/store/${reward.id}`)}
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs text-muted-foreground line-clamp-1 cursor-help">
                                    {reward.description}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    {reward.programtype === "points" && "Customers redeem their points for this reward"}
                                    {reward.programtype === "coffee" && "Part of a buy-X-get-one-free program"}
                                    {reward.programtype === "voucher" && "A monetary voucher customers can redeem"}
                                    {reward.programtype === "discount" && "A percentage discount on purchases"}
                                    {!reward.programtype || reward.programtype === "individual" && "Standard individual reward"}
                                    {reward.programName && <span className="block mt-1 font-medium">{reward.programName}</span>}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "rounded-md",
                                  reward.programtype ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-purple-50 text-purple-700 border-purple-200"
                                )}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {reward.programtype 
                                    ? <Award className="h-4 w-4" />
                                    : <Gift className="h-4 w-4" />}
                                  <span>
                                    {reward.programtype 
                                      ? "Program" 
                                      : "Individual Reward"}
                                  </span>
                                </div>
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">
                                {reward.programtype === "points" && "Customers redeem their points for this reward"}
                                {reward.programtype === "coffee" && "Part of a buy-X-get-one-free program"}
                                {reward.programtype === "voucher" && "A monetary voucher customers can redeem"}
                                {reward.programtype === "discount" && "A percentage discount on purchases"}
                                {!reward.programtype || reward.programtype === "individual" && "Standard individual reward"}
                                {reward.programName && <span className="block mt-1 font-medium">{reward.programName}</span>}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {reward.pointsCost}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {reward.redemptionCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                {reward.redeemableCustomers || 0}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <p className="text-xs">Number of customers who can redeem this reward</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {reward.impressions || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                      </TableCell>
                      <TableCell className="text-center">
                        {reward.lastRedeemed 
                          ? formatDistanceToNow(reward.lastRedeemed, { addSuffix: true })
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline"
                          className={cn(
                            reward.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {reward.isActive ? "Live" : "Inactive"}
                        </Badge>
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
                            <DropdownMenuItem onClick={() => router.push(`/store/${reward.id}`)}>
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
    );
  })}

  // Add other required functions
  const toggleRewardStatus = async (rewardId: string, currentStatus: boolean) => {
    if (!user?.uid) return;
    
    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
      
      // Only update the isActive field
      await updateDoc(rewardRef, { 
        isActive: !currentStatus,
        updatedAt: new Date()
      });
      
      // Update the local state
      setRewards(rewards.map(reward => 
        reward.id === rewardId 
          ? { ...reward, isActive: !currentStatus } 
          : reward
      ));
      
      toast({
        title: !currentStatus ? "Reward activated" : "Reward deactivated",
        description: `The reward has been ${!currentStatus ? "activated" : "deactivated"} successfully.`
      });
    } catch (error) {
      console.error("Error toggling reward status:", error);
      toast({
        title: "Error",
        description: "Failed to update reward status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const deleteReward = (id: string) => {
    // Instead of immediately confirming, set the reward to delete
    setRewardToDelete(id)
  }

  const confirmDelete = async () => {
    if (!rewardToDelete || !user) return
    
    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardToDelete)
      await deleteDoc(rewardRef)
      
      // Update local state
      setRewards(prev => prev.filter(reward => reward.id !== rewardToDelete))
      
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting reward:", error)
      toast({
        title: "Error",
        description: "Failed to delete reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      // Clear the reward to delete
      setRewardToDelete(null)
    }
  }

  // Add RewardPreview component back
  const RewardPreview = ({ reward, onClose }: { reward: any, onClose: () => void }) => {
    const [showConditions, setShowConditions] = useState(false);
    const [showLimitations, setShowLimitations] = useState(false);
    
    // Format the reward data for display
    const formattedReward = {
      ...reward,
      // Ensure conditions is an array
      conditions: Array.isArray(reward.conditions) 
        ? reward.conditions 
        : Object.entries(reward.conditions || {})
            .filter(([key, value]) => value && !key.startsWith('use'))
            .map(([key, value]) => ({ type: key, value })),
      
      // Ensure limitations is an array
      limitations: Array.isArray(reward.limitations)
        ? reward.limitations
        : Object.entries(reward.limitations || {})
            .filter(([key, value]) => value && !key.startsWith('use'))
            .map(([key, value]) => ({ type: key, value }))
    };
    
    // Helper function to format condition display text
    const formatCondition = (condition: any) => {
      switch (condition.type) {
        case 'minimumSpend':
          return `Minimum spend: $${condition.amount || condition.value}`;
        case 'minimumLifetimeSpend':
          return `Minimum lifetime spend: $${condition.amount || condition.value}`;
        case 'minimumTransactions':
          return `Minimum transactions: ${condition.amount || condition.value}`;
        case 'maximumTransactions':
          return `Maximum transactions: ${condition.amount || condition.value}`;
        case 'daysSinceJoined':
          return `Days since joined: ${condition.amount || condition.value}`;
        case 'daysSinceLastVisit':
          return `Days since last visit: ${condition.amount || condition.value}`;
        case 'minimumPointsBalance':
          return `Minimum points balance: ${condition.amount || condition.value}`;
        case 'membershipLevel':
          return `Membership level: ${condition.amount || condition.value}`;
        default:
          return `${condition.type}: ${condition.amount || condition.value}`;
      }
    };
    
    // Helper function to format limitation display text
    const formatLimitation = (limitation: any) => {
      switch (limitation.type) {
        case 'customerLimit':
          return `Limit per customer: ${limitation.value}`;
        case 'totalRedemptionLimit':
          return `Total redemption limit: ${limitation.value}`;
        case 'daysOfWeek':
          return `Available on: ${Array.isArray(limitation.value) ? limitation.value.join(', ') : limitation.value}`;
        case 'timeOfDay':
          if (typeof limitation.value === 'object') {
            return `Available from ${limitation.value.startTime || '00:00'} to ${limitation.value.endTime || '23:59'}`;
          }
          return `Time restricted: ${limitation.value}`;
        case 'activePeriod':
          if (typeof limitation.value === 'object') {
            const start = limitation.value.startDate ? new Date(limitation.value.startDate).toLocaleDateString() : 'anytime';
            const end = limitation.value.endDate ? new Date(limitation.value.endDate).toLocaleDateString() : 'no end date';
            return `Active from ${start} to ${end}`;
          }
          return `Active period: ${limitation.value}`;
        default:
          return `${limitation.type}: ${typeof limitation.value === 'object' ? JSON.stringify(limitation.value) : limitation.value}`;
      }
    };
    
    return (
      <div className="fixed top-24 right-8 z-50 w-96 shadow-xl animate-fadeIn">
        <ShadcnCard className="rounded-lg overflow-hidden border-2 border-[#007AFF]">
          <div className="bg-[#007AFF] text-white p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              <h3 className="font-medium">New Reward Created</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-white hover:bg-blue-600"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-start mb-3">
              <Badge variant="outline" className={cn(
                "rounded-md",
                "bg-green-50 text-green-700 border-green-200"
              )}>
                {reward.type || "standard"}
              </Badge>
              
              <Badge variant="outline" className={cn(
                "rounded-md",
                reward.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
              )}>
                {reward.isActive ? "Live" : "Inactive"}
              </Badge>
            </div>
            
            <h4 className="text-lg font-medium mb-1">{reward.rewardName}</h4>
            <p className="text-sm text-muted-foreground mb-4">
              {reward.description}
            </p>
            
            <div className="flex justify-between items-center mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Points Cost</p>
                <div className="flex items-center mt-1">
                  <Zap className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="font-medium">{reward.pointsCost}</span>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Visibility</p>
                <p className="font-medium mt-1">{reward.rewardVisibility || "global"}</p>
              </div>
            </div>
            
            {/* Conditions Dropdown */}
            <div className="mb-3 border rounded-md overflow-hidden">
              <button 
                onClick={() => setShowConditions(!showConditions)}
                className="w-full p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-sm">Conditions</span>
                {showConditions ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showConditions && (
                <div className="p-3 text-sm">
                  {formattedReward.conditions.length > 0 ? (
                    <ul className="space-y-2">
                      {formattedReward.conditions.map((condition: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="h-4 w-4 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                          </div>
                          <span>{formatCondition(condition)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No conditions specified</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Limitations Dropdown */}
            <div className="mb-4 border rounded-md overflow-hidden">
              <button 
                onClick={() => setShowLimitations(!showLimitations)}
                className="w-full p-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="font-medium text-sm">Limitations</span>
                {showLimitations ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              
              {showLimitations && (
                <div className="p-3 text-sm">
                  {formattedReward.limitations.length > 0 ? (
                    <ul className="space-y-2">
                      {formattedReward.limitations.map((limitation: any, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                          </div>
                          <span>{formatLimitation(limitation)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">No limitations specified</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="h-9 rounded-md flex-1"
                onClick={onClose}
              >
                Dismiss
              </Button>
              <Button 
                className="h-9 rounded-md flex-1 bg-[#0066ff] hover:bg-[#0052cc] text-white"
                onClick={() => {
                  onClose();
                  setCreateRewardDialogOpen(true);
                }}
              >
                Create Reward
              </Button>
            </div>
          </div>
        </ShadcnCard>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your rewards, programs, and special offers
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="h-9 gap-2 rounded-md"
              onClick={() => {
                // Open help guide or documentation
                window.open('/help/rewards', '_blank');
              }}
            >
              <HelpCircle className="h-4 w-4" />
              Help Guide
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="default" 
                className="h-9 gap-2 rounded-md bg-[#0066ff] hover:bg-[#0052cc] text-white"
                onClick={() => router.push('/create')}
              >
                <Plus className="h-4 w-4" />
                Create Reward
              </Button>
              
              {!hasIntroReward && (
                <Button 
                  variant="outline" 
                  className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                  onClick={() => setIsIntroRewardDialogOpen(true)}
                >
                  <Sparkles className="h-4 w-4" />
                  Create Introductory Reward
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(value) => setRewardCategory(value as RewardCategory)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9 rounded-md">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                All Rewards
              </TabsTrigger>
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Individual
              </TabsTrigger>
              <TabsTrigger value="customer-specific" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer-Specific
              </TabsTrigger>
              <TabsTrigger value="programs" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Programs
              </TabsTrigger>
            </TabsList>
            
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
                      Object.values(typeFilters).some(v => !v) || 
                      dateFilter !== "all") && (
                      <Badge className="ml-1 bg-primary h-5 w-5 p-0 flex items-center justify-center">
                        <span className="text-xs">!</span>
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-96 p-4" align="end">
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
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="type-coffee" 
                            checked={typeFilters.coffee}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange('coffee', checked as boolean)}
                          />
                          <Label htmlFor="type-coffee" className="cursor-pointer">Coffee</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="type-discount" 
                            checked={typeFilters.discount}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange('discount', checked as boolean)}
                          />
                          <Label htmlFor="type-discount" className="cursor-pointer">Discount</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="type-gift" 
                            checked={typeFilters.gift}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange('gift', checked as boolean)}
                          />
                          <Label htmlFor="type-gift" className="cursor-pointer">Gift</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="type-ticket" 
                            checked={typeFilters.ticket}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange('ticket', checked as boolean)}
                          />
                          <Label htmlFor="type-ticket" className="cursor-pointer">Ticket</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="type-other" 
                            checked={typeFilters.other}
                            onCheckedChange={(checked) => 
                              handleTypeFilterChange('other', checked as boolean)}
                          />
                          <Label htmlFor="type-other" className="cursor-pointer">Other</Label>
                        </div>
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
                          setDateFilter("all")
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
                          onClick={() => handleSort("impressions")}
                          className="flex items-center gap-1 px-0 font-medium mx-auto"
                        >
                          Impressions
                          {sortField === "impressions" && (
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
                          onClick={() => handleSort("lastRedeemed")}
                          className="flex items-center gap-1 px-0 font-medium mx-auto"
                        >
                          Last Redeemed
                          {sortField === "lastRedeemed" && (
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
                    {loading ? (
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
                          onClick={() => router.push(`/store/${reward.id}`)}
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
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="text-xs text-muted-foreground line-clamp-1 cursor-help">
                                        {reward.description}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs">
                                        {reward.programtype === "points" && "Customers redeem their points for this reward"}
                                        {reward.programtype === "coffee" && "Part of a buy-X-get-one-free program"}
                                        {reward.programtype === "voucher" && "A monetary voucher customers can redeem"}
                                        {reward.programtype === "discount" && "A percentage discount on purchases"}
                                        {!reward.programtype || reward.programtype === "individual" && "Standard individual reward"}
                                        {reward.programName && <span className="block mt-1 font-medium">{reward.programName}</span>}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "rounded-md",
                                      reward.programtype ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-purple-50 text-purple-700 border-purple-200"
                                    )}
                                  >
                                    <div className="flex items-center justify-center gap-1">
                                      {reward.programtype 
                                        ? <Award className="h-4 w-4" />
                                        : <Gift className="h-4 w-4" />}
                                      <span>
                                        {reward.programtype 
                                          ? "Program" 
                                          : "Individual Reward"}
                                      </span>
                                    </div>
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    {reward.programtype === "points" && "Customers redeem their points for this reward"}
                                    {reward.programtype === "coffee" && "Part of a buy-X-get-one-free program"}
                                    {reward.programtype === "voucher" && "A monetary voucher customers can redeem"}
                                    {reward.programtype === "discount" && "A percentage discount on purchases"}
                                    {!reward.programtype || reward.programtype === "individual" && "Standard individual reward"}
                                    {reward.programName && <span className="block mt-1 font-medium">{reward.programName}</span>}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {reward.pointsCost}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {reward.redemptionCount || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {reward.redeemableCustomers || 0}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">Number of customers who can redeem this reward</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {reward.impressions || 0}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {reward.createdAt ? formatDistanceToNow(reward.createdAt, { addSuffix: true }) : "Unknown"}
                          </TableCell>
                          <TableCell className="text-center">
                            {reward.lastRedeemed 
                              ? formatDistanceToNow(reward.lastRedeemed, { addSuffix: true })
                              : "Never"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline"
                              className={cn(
                                reward.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                              )}
                            >
                              {reward.isActive ? "Live" : "Inactive"}
                            </Badge>
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
                                <DropdownMenuItem onClick={() => router.push(`/store/${reward.id}`)}>
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
          
          {/* In the TabsContent for programs - look for "programs" tab and replace the entire content */}
          <TabsContent value="programs" className="mt-0">
            {loading ? (
              <CardSkeleton />
            ) : (
              <>
                {/* First check if there are any program rewards at all */}
                {rewards.filter(reward => !!reward.programtype && reward.programtype !== "points").length === 0 ? (
                  <Card>
                    <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="rounded-full bg-blue-50 p-3 mb-4">
                        <Award className="h-8 w-8 text-blue-500" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">No Program Rewards Created</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        Program rewards help you create structured loyalty programs like coffee cards, transaction-based rewards, and recurring vouchers.
                      </p>
                      <Button 
                        onClick={() => router.push('/store/rewards/create')}
                        className="bg-[#007AFF] hover:bg-[#0063CC] text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Program Reward
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Program types grid layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(new Set(rewards.filter(r => !!r.programtype && r.programtype !== "points").map(r => r.programtype))).map(programType => {
                        if (!programType) return null;
                        
                        // Get all rewards of this program type
                        const programRewards = rewards.filter(r => r.programtype === programType);
                        if (programRewards.length === 0) return null;
                        
                        // Count metrics
                        const totalRedemptions = programRewards.reduce((sum, r) => sum + (r.redemptionCount || 0), 0);
                        const totalRedeemableCustomers = programRewards.reduce((sum, r) => sum + (r.redeemableCustomers || 0), 0);
                        
                        return (
                          <Card key={programType} className="overflow-hidden flex flex-col h-full">
                            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b pb-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    {programType === 'coffee' ? (
                                      <Coffee className="h-6 w-6 text-amber-600" />
                                    ) : programType === 'dollar_voucher' ? (
                                      <DollarSign className="h-6 w-6 text-green-600" />
                                    ) : programType === 'recurring_reward' ? (
                                      <Zap className="h-6 w-6 text-purple-600" />
                                    ) : (
                                      <Award className="h-6 w-6 text-blue-600" />
                                    )}
                                  </div>
                                  <div>
                                    <CardTitle className="text-lg">
                                      {programType === 'coffee' ? "Coffee Program" : 
                                       programType === 'dollar_voucher' ? "Recurring Voucher Program" : 
                                       programType === 'recurring_reward' ? "Recurring Transaction Program" : 
                                       "Loyalty Program"}
                                    </CardTitle>
                                    <CardDescription>
                                      {programType === 'coffee' ? "Buy X get one free coffee program." : 
                                       programType === 'dollar_voucher' ? "Recurring monetary vouchers for loyal customers." : 
                                       programType === 'recurring_reward' ? "Transaction frequency program." : 
                                       "Loyalty program rewards."}
                                    </CardDescription>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      onClick={() => {
                                        setProgramToDelete(programType);
                                        setIsConfirmDeleteProgramOpen(true);
                                      }}
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete Program
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-4 flex-grow">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-md p-3 text-center">
                                  <p className="text-xs text-blue-600 font-medium mb-1">Rewards</p>
                                  <p className="text-2xl font-semibold text-blue-700">{programRewards.length}</p>
                                </div>
                                <div className="bg-green-50 rounded-md p-3 text-center">
                                  <p className="text-xs text-green-600 font-medium mb-1">Redemptions</p>
                                  <p className="text-2xl font-semibold text-green-700">{totalRedemptions}</p>
                                </div>
                              </div>
                              
                              {programRewards.length > 0 && (
                                <div className="mt-4 flex justify-between items-center">
                                  <p className="text-sm text-gray-500">
                                    {programRewards.length} rewards in this program
                                  </p>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => toggleProgramExpansion(programType)}
                                    className="flex items-center gap-1"
                                  >
                                    {expandedPrograms[programType] ? (
                                      <>
                                        <ChevronUp className="h-4 w-4" />
                                        Hide Rewards
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4" />
                                        Show Rewards
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                            
                            {/* Expandable rewards section */}
                            {expandedPrograms[programType] && (
                              <div className="border-t">
                                <div className="max-h-60 overflow-y-auto">
                                  {programRewards.map(reward => (
                                    <div 
                                      key={reward.id} 
                                      className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                                      onClick={() => router.push(`/store/${reward.id}`)}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 min-w-[32px] rounded-md bg-muted flex items-center justify-center">
                                          {getRewardTypeIcon(reward.type)}
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm">{reward.rewardName}</div>
                                          <div className="text-xs text-gray-500 max-w-xs truncate">{reward.description}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                          {reward.pointsCost} points
                                        </Badge>
                                        <Badge 
                                          variant="outline"
                                          className={cn(
                                            "text-xs",
                                            reward.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"
                                          )}
                                        >
                                          {reward.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="p-3 bg-gray-50 flex justify-center">
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    onClick={() => router.push('/store/rewards/create')}
                                    className="w-full"
                                  >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add New Reward to Program
                                  </Button>
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Confirmation dialog for deleting a program */}
                <Dialog open={isConfirmDeleteProgramOpen} onOpenChange={setIsConfirmDeleteProgramOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Delete Program</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete all rewards in the {programToDelete === 'coffee' ? "Coffee Program" : 
                          programToDelete === 'dollar_voucher' ? "Recurring Voucher Program" : 
                          programToDelete === 'recurring_reward' ? "Recurring Transaction Program" : 
                          "program"}? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsConfirmDeleteProgramOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={async () => {
                          if (!programToDelete || !user?.uid) return;
                          
                          try {
                            // Find all rewards with this program type
                            const rewardsToDelete = rewards.filter(reward => 
                              reward.programtype === programToDelete && reward.programtype !== "points"
                            );
                            
                            // Delete each reward
                            const deletePromises = rewardsToDelete.map(reward => {
                              const rewardRef = doc(db, 'merchants', user.uid, 'rewards', reward.id);
                              return deleteDoc(rewardRef);
                            });
                            
                            await Promise.all(deletePromises);
                            
                            // Update local state
                            setRewards(prev => prev.filter(reward => reward.programtype !== programToDelete));
                            
                            toast({
                              title: "Success",
                              description: "Program rewards deleted successfully",
                            });
                          } catch (error) {
                            console.error("Error deleting program rewards:", error);
                            toast({
                              title: "Error",
                              description: "Failed to delete program rewards. Please try again.",
                              variant: "destructive"
                            });
                          } finally {
                            setIsConfirmDeleteProgramOpen(false);
                            setProgramToDelete(null);
                          }
                        }}
                      >
                        Delete Program
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Reward preview card */}
      {previewReward && (
        <RewardPreview 
          reward={previewReward} 
          onClose={() => setPreviewReward(null)} 
        />
      )}
      
      {/* Create Reward Dialog */}
      <CreateRewardDialog
        open={createRewardDialogOpen}
        onOpenChange={setCreateRewardDialogOpen}
        defaultValues={createRewardData}
      />
      
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
      
      {/* Introductory Reward Dialog */}
      <IntroductoryRewardDialog 
        open={isIntroRewardDialogOpen} 
        onOpenChange={setIsIntroRewardDialogOpen} 
      />
    </div>
  )
} 