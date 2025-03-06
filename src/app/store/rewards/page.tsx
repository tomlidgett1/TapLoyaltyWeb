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
  Package
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format, formatDistanceToNow } from "date-fns"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
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

// Types
type RewardCategory = "all" | "individual" | "customer-specific" | "programs"
type SortField = "rewardName" | "type" | "pointsCost" | "redemptionCount" | "createdAt" | "lastRedeemed" | "isActive"
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

  useEffect(() => {
    const fetchRewards = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const q = query(rewardsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        const rewardsData: any[] = []
        
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
              impressions: data.impressions || 0
            });
          } catch (err) {
            console.error("Error processing document:", err, "Document ID:", doc.id);
          }
        });
        
        setRewards(rewardsData);
      } catch (error) {
        console.error("Error fetching rewards:", error);
        toast({
          title: "Error",
          description: "Failed to load rewards. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchRewards()
  }, [user])

  // Update the filtering logic to filter by category

  // First, let's modify the getFilteredRewards function
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

  // Then update the filteredRewards calculation in each tab
  // For the "all" tab, we use the existing filteredRewards variable

  // For the category tabs, we need to filter by category
  {["individual", "customer-specific", "programs"].map((category) => {
    // Filter rewards by category
    const categoryFilteredRewards = rewards
      .filter(reward => {
        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          return (
            (reward.rewardName || "").toLowerCase().includes(query) ||
            (reward.description || "").toLowerCase().includes(query)
          );
        }
        return true;
      })
      .filter(reward => {
        // Filter by specific category
        if (category === "individual") {
          return reward.category === "individual" || (!reward.programtype && !reward.category);
        } else if (category === "customer-specific") {
          return reward.category === "customer-specific";
        } else if (category === "programs") {
          return reward.category === "program" || !!reward.programtype;
        }
        return false;
      })
      .sort((a, b) => {
    // Sort by selected field
        if (sortField === "rewardName") {
          return sortDirection === "asc"
            ? (a.rewardName || "").localeCompare(b.rewardName || "")
            : (b.rewardName || "").localeCompare(a.rewardName || "");
        } else if (sortField === "pointsCost") {
          return sortDirection === "asc"
            ? (a.pointsCost || 0) - (b.pointsCost || 0)
            : (b.pointsCost || 0) - (a.pointsCost || 0);
        } else if (sortField === "redemptionCount") {
          return sortDirection === "asc"
            ? (a.redemptionCount || 0) - (b.redemptionCount || 0)
            : (b.redemptionCount || 0) - (a.redemptionCount || 0);
        } else if (sortField === "createdAt") {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return sortDirection === "asc"
            ? aTime - bTime
            : bTime - aTime;
        }
        return 0;
      });
      
    return (
      <TabsContent key={category} value={category} className="mt-0">
        <Card>
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
                          {category === "individual" ? (
                            <Gift className="h-6 w-6 text-muted-foreground" />
                          ) : category === "customer-specific" ? (
                            <Users className="h-6 w-6 text-muted-foreground" />
                          ) : (
                            <Award className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="mt-4 text-lg font-medium">
                          No {category === "individual" ? "individual" : 
                              category === "customer-specific" ? "customer-specific" : 
                              "program"} rewards found
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {searchQuery ? "Try adjusting your search query" : `Create your first ${
                            category === "individual" ? "individual" : 
                            category === "customer-specific" ? "customer-specific" : 
                            "program"} reward`}
                        </p>
                        {!searchQuery && (
                          <Button 
                            className="mt-4 h-9 gap-2 rounded-md"
                            onClick={() => router.push('/create')}
                          >
                            <Plus className="h-4 w-4" />
                            Create {category === "individual" ? "Individual Reward" : 
                                    category === "customer-specific" ? "Customer-Specific Reward" : 
                                    "Program"}
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
                      onClick={() => router.push(`/library/${reward.id}`)}
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
                              {reward.conditions?.find(c => c.type === 'maximumTransactions')?.value === 0 && (
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
                          variant={reward.isActive ? "success" : "destructive"}
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
                            <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}`)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}/edit`)}>
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

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

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

  const deleteReward = async (id: string) => {
    if (!user?.uid || !confirm("Are you sure you want to delete this reward? This action cannot be undone.")) return
    
    try {
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id)
      await deleteDoc(rewardRef)
      
      // Update local state
      setRewards(prev => prev.filter(reward => reward.id !== id))
    } catch (error) {
      console.error("Error deleting reward:", error)
    }
  }

  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy")
  }

  const getRewardTypeLabel = (type: string) => {
    switch (type) {
      case "item":
        return "Item"
      case "discount":
        return "Discount"
      case "experience":
        return "Experience"
      default:
        return "Reward"
    }
  }

  const getProgramTypeLabel = (programtype?: string) => {
    switch (programtype) {
      case "punch":
        return "Punch Card"
      case "tier":
        return "Tier Program"
      case "subscription":
        return "Subscription"
      default:
        return "Program"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "individual":
        return <Gift className="h-4 w-4" />
      case "customer-specific":
        return <User className="h-4 w-4" />
      case "program":
        return <Award className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "individual":
        return "Individual"
      case "customer-specific":
        return "Customer-Specific"
      case "program":
        return "Program"
      default:
        return "Reward"
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

  const processVoiceCommand = async (transcript: string) => {
    setProcessingVoiceCommand(true);
    
    try {
      // Show a processing toast
      toast({
        title: "Processing voice command",
        description: "Please wait while we process your request...",
      });
      
      // Get or create the assistant
      const assistant = await getOrCreateAssistant();
      
      // Create a new thread
      const thread = await createThread();
      
      // Add the user's message to the thread
      await addMessage(thread.id, transcript);
      
      // Run the assistant on the thread
      const response = await runAssistant(assistant.id, thread.id);
      
      // Log the entire response for debugging
      console.log("Full assistant response:", response);
      
      // Check if the response contains reward data
      if (response && response.includes('```json')) {
        // Extract JSON data from the response
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch && jsonMatch[1]) {
          try {
            const rewardData = JSON.parse(jsonMatch[1]);
            
            // Log the parsed JSON data
            console.log("Parsed reward JSON data:", rewardData);
            
            // Format the reward data for preview
            const previewData = {
              ...rewardData,
              // Keep conditions as an array if it already is one
              conditions: Array.isArray(rewardData.conditions) 
                ? rewardData.conditions 
                : [],
              // Keep limitations as an array if it already is one
              limitations: Array.isArray(rewardData.limitations) 
                ? rewardData.limitations 
                : []
            };
            
            // Set the preview data directly
            setPreviewReward(previewData);
            
            // Format the reward data for the create dialog
            const formattedRewardData = {
              rewardName: rewardData.rewardName || "",
              description: rewardData.description || "",
              type: rewardData.type || "standard",
              rewardVisibility: rewardData.rewardVisibility || "all",
              pin: rewardData.pin || "",
              pointsCost: rewardData.pointsCost?.toString() || "0",
              isActive: rewardData.isActive !== undefined ? rewardData.isActive : true,
              
              // Improved delayedVisibility handling
              delayedVisibility: !!rewardData.delayedVisibility,
              delayedVisibilityType: rewardData.delayedVisibility?.type || "transactions",
              delayedVisibilityTransactions: rewardData.delayedVisibility?.type === "transactions" 
                ? rewardData.delayedVisibility.value?.toString() || "" 
                : "",
              delayedVisibilitySpend: rewardData.delayedVisibility?.type === "totalLifetimeSpend" 
                ? rewardData.delayedVisibility.value?.toString() || "" 
                : "",
              
              // Other fields
              itemName: rewardData.itemName || "",
              voucherAmount: rewardData.voucherAmount?.toString() || "",
              spendThreshold: rewardData.spendThreshold?.toString() || "",
              
              // Process conditions array into the expected object format
              conditions: {
                useTransactionRequirements: false,
                useSpendingRequirements: false,
                useTimeRequirements: false,
                minimumTransactions: "",
                maximumTransactions: "",
                daysSinceJoined: "",
                daysSinceLastVisit: "",
                minimumLifetimeSpend: "",
                minimumPointsBalance: "",
                membershipLevel: "",
                newCustomer: false,
                
                // Map array conditions to object properties
                ...(Array.isArray(rewardData.conditions) 
                  ? rewardData.conditions.reduce((acc, condition) => {
                      if (condition.type === "minimumSpend") {
                        acc.useSpendingRequirements = true;
                        acc.minimumSpend = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "minimumLifetimeSpend") {
                        acc.useSpendingRequirements = true;
                        acc.minimumLifetimeSpend = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "minimumTransactions") {
                        acc.useTransactionRequirements = true;
                        acc.minimumTransactions = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "maximumTransactions") {
                        acc.useTransactionRequirements = true;
                        acc.maximumTransactions = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "daysSinceJoined") {
                        acc.useTimeRequirements = true;
                        acc.daysSinceJoined = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "daysSinceLastVisit") {
                        acc.useTimeRequirements = true;
                        acc.daysSinceLastVisit = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "minimumPointsBalance") {
                        acc.minimumPointsBalance = condition.amount?.toString() || condition.value?.toString() || "";
                      }
                      if (condition.type === "membershipLevel") {
                        acc.membershipLevel = condition.value?.toString() || "";
                      }
                      if (condition.type === "newCustomer") {
                        acc.newCustomer = true;
                      }
                      return acc;
                    }, {})
                  : {})
              },
              
              // Process limitations array into the expected object format
              limitations: {
                totalRedemptionLimit: "",
                perCustomerLimit: "",
                useTimeRestrictions: false,
                startTime: "",
                endTime: "",
                dayRestrictions: [],
                
                // Map array limitations to object properties
                ...(Array.isArray(rewardData.limitations) 
                  ? rewardData.limitations.reduce((acc, limitation) => {
                      if (limitation.type === "customerLimit") {
                        acc.perCustomerLimit = limitation.value?.toString() || "";
                      }
                      if (limitation.type === "totalRedemptionLimit") {
                        acc.totalRedemptionLimit = limitation.value?.toString() || "";
                      }
                      if (limitation.type === "daysOfWeek") {
                        acc.useTimeRestrictions = true;
                        acc.dayRestrictions = Array.isArray(limitation.value) ? limitation.value : [];
                      }
                      if (limitation.type === "timeOfDay" || limitation.type === "timeRestriction") {
                        acc.useTimeRestrictions = true;
                        if (typeof limitation.value === 'object') {
                          acc.startTime = limitation.value.startTime || "";
                          acc.endTime = limitation.value.endTime || "";
                        } else if (typeof limitation.startTime === 'string' && typeof limitation.endTime === 'string') {
                          // Handle case where startTime and endTime are direct properties
                          acc.startTime = limitation.startTime;
                          acc.endTime = limitation.endTime;
                        }
                      }
                      return acc;
                    }, {})
                  : {})
              },
              
              // Handle active period
              hasActivePeriod: false,
              activePeriod: {
                startDate: new Date().toISOString(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
              }
            };
            
            setCreateRewardData(formattedRewardData);
            
            toast({
              title: "Reward created",
              description: "Your voice command has been processed successfully.",
            });
          } catch (error) {
            console.error("Error parsing JSON:", error);
            toast({
              title: "Error",
              description: "Could not create reward from voice command.",
              variant: "destructive",
            });
          }
        } else {
          console.log("No JSON data found in response");
        }
      } else {
        // Handle text response
        setVoiceCommandResult(response);
        
        toast({
          title: "Command processed",
          description: "Your voice command has been processed.",
        });
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      toast({
        title: "Error",
        description: "Failed to process voice command. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingVoiceCommand(false);
    }
  };

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
          
          <div className="p-4">
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
      if (!typeFilters[type] && !typeFilters.other) {
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
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
            
            <Button 
              variant="default" 
              className="h-9 gap-2 rounded-md bg-[#0066ff] hover:bg-[#0052cc] text-white"
              onClick={() => router.push('/create')}
            >
              <Plus className="h-4 w-4" />
              Create Reward
            </Button>
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
                          onClick={() => router.push(`/library/${reward.id}`)}
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
                                  {reward.conditions?.find(c => c.type === 'maximumTransactions')?.value === 0 && (
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
                              variant={reward.isActive ? "success" : "destructive"}
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
                                <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}/edit`)}>
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
          
          {/* Individual tabs for each reward category */}
          {["individual", "customer-specific", "programs"].map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              <Card>
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
                              {category === "individual" ? (
                                <Gift className="h-6 w-6 text-muted-foreground" />
                              ) : category === "customer-specific" ? (
                                <Users className="h-6 w-6 text-muted-foreground" />
                              ) : (
                                <Award className="h-6 w-6 text-muted-foreground" />
                              )}
                            </div>
                            <h3 className="mt-4 text-lg font-medium">
                              No {category === "individual" ? "individual" : 
                                  category === "customer-specific" ? "customer-specific" : 
                                  "program"} rewards found
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchQuery ? "Try adjusting your search query" : `Create your first ${
                                category === "individual" ? "individual" : 
                                category === "customer-specific" ? "customer-specific" : 
                                "program"} reward`}
                            </p>
                            {!searchQuery && (
                              <Button 
                                className="mt-4 h-9 gap-2 rounded-md"
                                onClick={() => router.push('/create')}
                              >
                                <Plus className="h-4 w-4" />
                                Create {category === "individual" ? "Individual Reward" : 
                                        category === "customer-specific" ? "Customer-Specific Reward" : 
                                        "Program"}
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
                          onClick={() => router.push(`/library/${reward.id}`)}
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
                                  {reward.conditions?.find(c => c.type === 'maximumTransactions')?.value === 0 && (
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
                              variant={reward.isActive ? "success" : "destructive"}
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
                                <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/library/${reward.id}/edit`)}>
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
        ))}
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
  </div>
)
} 