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
  Sparkles
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

// Types
type RewardCategory = "all" | "individual" | "customer-specific" | "programs"
type SortField = "rewardName" | "type" | "pointsCost" | "redemptionCount" | "createdAt"
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
}

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

  useEffect(() => {
    const fetchRewards = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        console.log("Fetching rewards for user:", user.uid);
        
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const q = query(rewardsRef, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(q)
        
        console.log("Query snapshot size:", querySnapshot.size);
        const rewardsData: any[] = []
        
        querySnapshot.forEach(doc => {
          try {
            const data = doc.data()
            
            // Add debugging to see what's happening
            console.log("Document data:", {
              id: doc.id,
              createdAt: data.createdAt,
              createdAtType: typeof data.createdAt,
              hasToDate: typeof data.createdAt?.toDate === 'function'
            });
            
            // Handle different date formats
            let createdAt, updatedAt;
            
            try {
              // Use safelyGetDate to handle different date formats
              createdAt = safelyGetDate(data.createdAt);
              updatedAt = safelyGetDate(data.updatedAt || data.createdAt);
            } catch (dateError) {
              console.error("Error parsing date:", dateError);
              // Fallback to current date if parsing fails
              createdAt = new Date();
              updatedAt = new Date();
            }
            
            rewardsData.push({
              ...data,
              id: doc.id,
              createdAt,
              updatedAt
            });
          } catch (err) {
            console.error("Error processing document:", err, "Document ID:", doc.id);
          }
        });
        
        console.log("Processed rewards data:", rewardsData.length);
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

  // Filter and sort rewards
  const filteredRewards = rewards.filter(reward => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === '' || 
      (reward.rewardName && reward.rewardName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (reward.description && reward.description.toLowerCase().includes(searchQuery.toLowerCase()))
    
    // Filter by category
    const matchesCategory = 
      rewardCategory === "all" || 
      (rewardCategory === "programs" && reward.category === "program") ||
      (rewardCategory === "individual" && reward.category === "individual") ||
      (rewardCategory === "customer-specific" && reward.category === "customer-specific")
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // Sort by selected field
    let comparison = 0
    
    switch (sortField) {
      case "rewardName":
        // Handle undefined rewardName
        if (!a.rewardName && !b.rewardName) return 0;
        if (!a.rewardName) return 1; // undefined values go last
        if (!b.rewardName) return -1;
        comparison = a.rewardName.localeCompare(b.rewardName);
        break;
      case "type":
        // Handle undefined type
        if (!a.type && !b.type) return 0;
        if (!a.type) return 1;
        if (!b.type) return -1;
        comparison = a.type.localeCompare(b.type);
        break;
      case "pointsCost":
        // Handle undefined pointsCost
        const aPoints = a.pointsCost || 0;
        const bPoints = b.pointsCost || 0;
        comparison = aPoints - bPoints;
        break;
      case "redemptionCount":
        // Handle undefined redemptionCount
        const aCount = a.redemptionCount || 0;
        const bCount = b.redemptionCount || 0;
        comparison = aCount - bCount;
        break;
      case "createdAt":
        // Handle undefined createdAt
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      default:
        comparison = 0;
    }
    
    // Apply sort direction
    return sortDirection === "asc" ? comparison : -comparison;
  })

  console.log(`Filtered rewards: ${filteredRewards.length}`)

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const toggleRewardStatus = async (id: string, currentStatus: string) => {
    if (!user?.uid) return
    
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', id)
      await updateDoc(rewardRef, { 
        status: newStatus,
        updatedAt: new Date()
      })
      
      // Update local state
      setRewards(prev => prev.map(reward => 
        reward.id === id ? { ...reward, status: newStatus, updatedAt: new Date() } : reward
      ))
    } catch (error) {
      console.error("Error updating reward status:", error)
    }
  }

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

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case "item":
        return <Coffee className="h-4 w-4" />
      case "discount":
        return <Tag className="h-4 w-4" />
      case "experience":
        return <Ticket className="h-4 w-4" />
      default:
        return <Gift className="h-4 w-4" />
    }
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
                "bg-green-50 text-green-700 border-green-200"
              )}>
                {reward.isActive ? "active" : "draft"}
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
                className="h-9 rounded-md flex-1 bg-[#007AFF] hover:bg-[#0066CC]"
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rewards</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your rewards, programs, and special offers
            </p>
          </div>
          
          <Button 
            className="h-9 gap-2 rounded-md"
            onClick={() => router.push('/create')}
          >
            <Plus className="h-4 w-4" />
            Create Reward
          </Button>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(value) => setRewardCategory(value as RewardCategory)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9 rounded-md">
              <TabsTrigger value="all">All Rewards</TabsTrigger>
              <TabsTrigger value="individual">Individual</TabsTrigger>
              <TabsTrigger value="customer-specific">Customer-Specific</TabsTrigger>
              <TabsTrigger value="programs">Programs</TabsTrigger>
            </TabsList>
            
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
          </div>
          
          <TabsContent value="all" className="mt-0">
            <Card className="rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">
                        <SortButton field="rewardName">Reward Name</SortButton>
                      </TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="pointsCost">Points Cost</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="redemptionCount">Redemptions</SortButton>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <SortButton field="createdAt">Created</SortButton>
                      </TableHead>
                      <TableHead></TableHead>
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
                    ) : filteredRewards.length === 0 ? (
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
                      filteredRewards.map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center">
                                {reward.category === "program" 
                                  ? <Award className="h-5 w-5 text-amber-600" />
                                  : getRewardTypeIcon(reward.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate">{reward.rewardName}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{reward.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              reward.category !== "program" && reward.type === "item" && "bg-green-50 text-green-700 border-green-200",
                              reward.category !== "program" && reward.type === "discount" && "bg-blue-50 text-blue-700 border-blue-200",
                              reward.category !== "program" && reward.type === "experience" && "bg-purple-50 text-purple-700 border-purple-200",
                              reward.category === "program" && "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              <div className="flex items-center gap-1">
                                {reward.category === "program" 
                                  ? <Award className="h-4 w-4" />
                                  : getRewardTypeIcon(reward.type)}
                                <span>
                                  {reward.category === "program" 
                                    ? getProgramTypeLabel(reward.programtype) 
                                    : getRewardTypeLabel(reward.type)}
                                </span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              reward.category !== "program" && reward.type === "item" && "bg-green-50 text-green-700 border-green-200",
                              reward.category !== "program" && reward.type === "discount" && "bg-blue-50 text-blue-700 border-blue-200",
                              reward.category !== "program" && reward.type === "experience" && "bg-purple-50 text-purple-700 border-purple-200",
                              reward.category === "program" && "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              <div className="flex items-center gap-1">
                                {reward.category === "program" 
                                  ? <Award className="h-4 w-4" />
                                  : getRewardTypeIcon(reward.type)}
                                <span>
                                  {reward.category === "program" 
                                    ? getProgramTypeLabel(reward.programtype) 
                                    : getRewardTypeLabel(reward.type)}
                                </span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {reward.category === "program" ? (
                              <div className="flex items-center justify-end gap-1">
                                <Award className="h-4 w-4 text-amber-600" />
                                <span>{reward.punchCount || 10} punches</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <Zap className="h-4 w-4 text-blue-600" />
                                <span>{reward.pointsCost}</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{reward.redemptionCount}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              reward.status === "active" && "bg-green-50 text-green-700 border-green-200",
                              reward.status === "inactive" && "bg-gray-50 text-gray-700 border-gray-200",
                              reward.status === "draft" && "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {reward.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(reward.createdAt)}
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
                                  <DropdownMenuItem onClick={() => router.push(`/rewards/${reward.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/rewards/${reward.id}/edit`)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleRewardStatus(reward.id, reward.status)}>
                                    {reward.status === "active" ? (
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
          
          {/* Individual tabs for each reward category */}
          {["individual", "customer-specific", "programs"].map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full h-40 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  </div>
                ) : filteredRewards.length === 0 ? (
                  <div className="col-span-full h-40 flex flex-col items-center justify-center">
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
                ) : (
                  filteredRewards.map((reward) => (
                    <Card key={reward.id} className="rounded-lg overflow-hidden">
                      <CardHeader className="p-4 pb-0">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className={cn(
                            "rounded-md mb-2",
                            reward.category !== "program" && reward.type === "item" && "bg-green-50 text-green-700 border-green-200",
                            reward.category !== "program" && reward.type === "discount" && "bg-blue-50 text-blue-700 border-blue-200",
                            reward.category !== "program" && reward.type === "experience" && "bg-purple-50 text-purple-700 border-purple-200",
                            reward.category === "program" && "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            <div className="flex items-center gap-1">
                              {reward.category === "program" 
                                ? <Award className="h-4 w-4" />
                                : getRewardTypeIcon(reward.type)}
                              <span>
                                {reward.category === "program" 
                                  ? getProgramTypeLabel(reward.programtype) 
                                  : getRewardTypeLabel(reward.type)}
                              </span>
                            </div>
                          </Badge>
                          
                          <Badge variant="outline" className={cn(
                            "rounded-md",
                            reward.status === "active" && "bg-green-50 text-green-700 border-green-200",
                            reward.status === "inactive" && "bg-gray-50 text-gray-700 border-gray-200",
                            reward.status === "draft" && "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {reward.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{reward.rewardName}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {reward.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Points Cost</p>
                            <div className="flex items-center mt-1">
                              {reward.category === "program" ? (
                                <div className="flex items-center gap-1">
                                  <Award className="h-4 w-4 text-amber-600" />
                                  <span className="font-medium">{reward.punchCount || 10} punches</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <Zap className="h-4 w-4 text-blue-600" />
                                  <span className="font-medium">{reward.pointsCost}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Redemptions</p>
                            <p className="font-medium mt-1">{reward.redemptionCount}</p>
                          </div>
                        </div>
                        
                        {reward.category === "customer-specific" && reward.customerIds && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground mb-1">Available to {reward.customerIds.length} customers</p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button 
                          variant="outline" 
                          className="h-9 rounded-md"
                          onClick={() => router.push(`/rewards/${reward.id}`)}
                        >
                          View Details
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-md">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-md">
                            <DropdownMenuItem onClick={() => router.push(`/rewards/${reward.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleRewardStatus(reward.id, reward.status)}>
                              {reward.status === "active" ? (
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
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
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