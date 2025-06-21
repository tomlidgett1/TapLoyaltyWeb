"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, limit, orderBy, updateDoc, where, deleteDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { formatDistanceToNow } from "date-fns"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { showToast } from "@/components/ui/use-toast"
import { CreateRewardDialog } from "@/components/create-reward-dialog"

import { 
  ArrowLeft, Calendar, Clock, Gift, Tag, Users, Zap, 
  ChevronRight, BarChart, Award, CheckCircle, AlertCircle, Edit, Eye, Copy, Trash, Star, CreditCard, Coffee, Globe
} from "lucide-react"
import { formatDate } from '@/lib/date-utils'
import { cn } from "@/lib/utils"

// Component to display customer badge with name
function CustomerBadge({ customerId }: { customerId: string }) {
  const [customerName, setCustomerName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCustomerName() {
      try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          const customerData = customerDoc.data();
          setCustomerName(customerData.firstName || customerData.name || customerData.fullName || 'Unknown');
        } else {
          setCustomerName('Unknown');
        }
      } catch (error) {
        console.error('Error fetching customer name:', error);
        setCustomerName('Unknown');
      } finally {
        setLoading(false);
      }
    }

    fetchCustomerName();
  }, [customerId]);

  if (loading) {
    return (
      <div className="px-2 py-1 bg-white border border-blue-200 rounded-sm text-xs animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <div className="px-2 py-1 bg-white border border-blue-200 rounded-sm text-xs">
      {customerName}
    </div>
  );
}

interface Condition {
  type: string
  value: number | string
  amount?: number
}

interface Limitation {
  type: string
  value: number | string | string[] | { 
    startTime?: string
    endTime?: string
    startDate?: string
    endDate?: string 
  }
}

interface RewardDetails {
  id: string
  rewardName: string
  description: string
  rewardType: string
  category: string
  pointsCost: string | number
  redemptionCount: number
  status: string
  isActive?: boolean
  startDate?: string
  endDate?: string
  createdAt: { seconds: number, nanoseconds: number } | string
  updatedAt: { seconds: number, nanoseconds: number } | string
  lastRedeemedAt: { seconds: number, nanoseconds: number } | string
  conditions?: Condition[]
  limitations?: Limitation[]
  impressions: number
  impressioncustomercount: number
  pin: string
  uniqueCustomersCount: number
  customers?: string[]
}

interface Redemption {
  id: string;
  customerId?: string;
  customerName?: string;
  profilePictureUrl?: string;
  redemptionDate?: any;
  status?: string;
  pointsUsed?: number;
}

interface RewardDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rewardId?: string;
}

export function RewardDetailSheet({ open, onOpenChange, rewardId }: RewardDetailSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [reward, setReward] = useState<RewardDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [customerVisibility, setCustomerVisibility] = useState<Array<{
    id: string;
    name: string;
    email?: string;
    profilePictureUrl?: string;
    visibilityReason?: string;
    isVisible: boolean;
    redeemable: boolean;
    visible: boolean;
  }>>([]);
  const [visibilityLoading, setVisibilityLoading] = useState(false);

  // Helper functions
  const capitalize = (str?: string) => {
    if (!str) return 'Unknown';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    
    // If it's a Firestore timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
    }
    
    // If it's a date string
    if (typeof timestamp === 'string') {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    }
    
    // If it's seconds
    if (timestamp.seconds) {
      return formatDistanceToNow(new Date(timestamp.seconds * 1000), { addSuffix: true });
    }
    
    return 'Unknown';
  };

  // Fetch reward details
  useEffect(() => {
    async function fetchRewardDetails() {
      if (!user?.uid || !rewardId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
        const rewardDoc = await getDoc(rewardRef);

        if (!rewardDoc.exists()) {
          setError("Reward not found");
          setLoading(false);
          return;
        }

        const rewardData = {
          id: rewardDoc.id,
          ...rewardDoc.data()
        } as RewardDetails;

        setReward(rewardData);
      } catch (error) {
        console.error("Error fetching reward details:", error);
        setError("Failed to load reward details");
      } finally {
        setLoading(false);
      }
    }

    if (open && rewardId) {
      fetchRewardDetails();
    }
  }, [rewardId, user?.uid, open]);

  // Fetch redemptions
  useEffect(() => {
    async function fetchRedemptions() {
      if (!user?.uid || !rewardId) return;
      
      try {
        setRedemptionsLoading(true);
        
        // Fetch from top-level redemptions collection
        const redemptionsRef = collection(db, 'redemptions');
        const redemptionsQuery = query(
          redemptionsRef, 
          where('rewardId', '==', rewardId),
          orderBy('redemptionDate', 'desc'), 
          limit(10)
        );
        
        const redemptionsSnapshot = await getDocs(redemptionsQuery);
        const redemptionData = redemptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Fetch customer details for each redemption
        const enhancedRedemptions = await Promise.all(
          redemptionData.map(async (redemption: any) => {
            if (redemption.customerId) {
              try {
                const customerDoc = await getDoc(doc(db, 'customers', redemption.customerId));
                if (customerDoc.exists()) {
                  const customerData = customerDoc.data();
                  return {
                    ...redemption,
                    customerName: customerData.name || customerData.fullName || 'Unknown Customer',
                    profilePictureUrl: customerData.profilePictureUrl || null
                  };
                }
              } catch (error) {
                console.error("Error fetching customer data:", error);
              }
            }
            return redemption;
          })
        );
        
        setRedemptions(enhancedRedemptions as Redemption[]);
      } catch (error) {
        console.error("Error fetching redemptions:", error);
        setRedemptions([]);
      } finally {
        setRedemptionsLoading(false);
      }
    }
    
    if (reward) {
      fetchRedemptions();
    }
  }, [user?.uid, rewardId, reward]);

  // Fetch customer visibility
  useEffect(() => {
    async function fetchCustomerVisibility() {
      if (!user?.uid || !rewardId) return;
      
      try {
        setVisibilityLoading(true);
        
        // First, get all customers for this merchant
        const customersRef = collection(db, 'merchants', user.uid, 'customers');
        const customersSnapshot = await getDocs(customersRef);
        
        // For each customer, check their visibility status for this reward
        const visibilityPromises = customersSnapshot.docs.map(async (customerDoc) => {
          const customerData = customerDoc.data();
          const customerId = customerDoc.id;
          
          try {
            // Check if this customer has visibility data for this reward
            const customerRewardRef = doc(db, 'customers', customerId, 'rewards', rewardId);
            const customerRewardDoc = await getDoc(customerRewardRef);
            
            let visibilityReason = '';
            let isVisible = true; // Default to visible if no specific data
            let redeemable = false;
            let visible = false;
            
            if (customerRewardDoc.exists()) {
              const rewardData = customerRewardDoc.data();
              visibilityReason = rewardData.reason || '';
              // If there's a reason, it usually means it's hidden/restricted
              isVisible = !visibilityReason || visibilityReason === 'visible';
              redeemable = rewardData.redeemable || false;
              visible = rewardData.visible || false;
            }
            
            return {
              id: customerId,
              name: customerData.name || customerData.fullName || 'Unknown Customer',
              email: customerData.email || '',
              profilePictureUrl: customerData.profilePictureUrl || null,
              visibilityReason,
              isVisible,
              redeemable,
              visible
            };
          } catch (error) {
            console.error(`Error fetching visibility for customer ${customerId}:`, error);
            return {
              id: customerId,
              name: customerData.name || customerData.fullName || 'Unknown Customer',
              email: customerData.email || '',
              profilePictureUrl: customerData.profilePictureUrl || null,
              visibilityReason: 'Error loading',
              isVisible: false,
              redeemable: false,
              visible: false
            };
          }
        });
        
        const visibilityData = await Promise.all(visibilityPromises);
        setCustomerVisibility(visibilityData);
        
      } catch (error) {
        console.error("Error fetching customer visibility:", error);
      } finally {
        setVisibilityLoading(false);
      }
    }

    if (open && rewardId && activeTab === 'visibility') {
      fetchCustomerVisibility();
    }
  }, [rewardId, user?.uid, open, activeTab]);

  // Format the conditions and limitations for display
  const formatCondition = (condition: Condition) => {
    switch (condition.type) {
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`;
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`;
      case 'minimumLifetimeSpend':
        return `Minimum lifetime spend of $${condition.value}`;
      case 'minimumPointsBalance':
        return `Minimum balance of ${condition.value} points`;
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`;
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`;
      case 'membershipLevel':
        return `${capitalize(condition.value.toString())} membership required`;
      default:
        return JSON.stringify(condition);
    }
  };

  const formatLimitation = (limitation: Limitation) => {
    switch (limitation.type) {
      case 'activePeriod': {
        const value = limitation.value as { startDate: string, endDate: string };
        const startDate = new Date(value.startDate).toLocaleDateString();
        const endDate = new Date(value.endDate).toLocaleDateString();
        return `Active from ${startDate} to ${endDate}`;
      }
      case 'totalRedemptionLimit':
        return `Limited to ${limitation.value} total redemptions`;
      case 'customerLimit':
        return `${limitation.value} per customer`;
      case 'timeOfDay': {
        const value = limitation.value as { startTime: string, endTime: string };
        return `Available ${value.startTime} to ${value.endTime}`;
      }
      case 'daysOfWeek':
        const days = limitation.value as string[];
        return `Available on ${days.join(', ')}`;
      default:
        return JSON.stringify(limitation);
    }
  };

  const safeParseDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    
    try {
      // Try different date formats
      let date: Date | null = null;
      
      // Try as ISO string
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
      
      // Try as timestamp (seconds)
      if (typeof dateString === 'string' && /^\d+$/.test(dateString)) {
        date = new Date(parseInt(dateString) * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Try with Firestore timestamp format
      if (typeof dateString === 'object' && 'seconds' in dateString) {
        date = new Date((dateString as any).seconds * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // If all else fails, return a valid default date
      return new Date().toISOString();
    } catch (e) {
      console.error("Error parsing date:", e, dateString);
      // Return a valid default date instead of empty string
      return new Date().toISOString();
    }
  };

  // Prepare data for the edit dialog
  const createRewardDialogData = reward ? {
    rewardName: reward.rewardName || '',
    description: reward.description || '',
    type: reward.rewardType || reward.category || 'discount',
    rewardVisibility: reward.customers && reward.customers.length > 0 ? 'specific' : 'all',
    pin: reward.pin || '',
    pointsCost: reward.pointsCost?.toString() || '0',
    isActive: reward.status === 'active',
    delayedVisibility: false,
    delayedVisibilityType: 'transactions',
    delayedVisibilityTransactions: '',
    delayedVisibilitySpend: '',
    itemName: '',
    voucherAmount: '',
    spendThreshold: '',
    
    // Add customer-specific data
    specificCustomerIds: reward.customers || [],
    specificCustomerNames: [], // We don't have the names in the reward data
    
    // Map conditions array to object structure
    conditions: {
      useTransactionRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['minimumTransactions', 'maximumTransactions'].includes(c.type)),
      useSpendingRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['minimumLifetimeSpend', 'minimumPointsBalance'].includes(c.type)),
      useTimeRequirements: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => ['daysSinceJoined', 'daysSinceLastVisit'].includes(c.type)),
      minimumTransactions: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumTransactions')?.value?.toString() || '' : '',
      maximumTransactions: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'maximumTransactions')?.value?.toString() || '' : '',
      daysSinceJoined: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'daysSinceJoined')?.value?.toString() || '' : '',
      daysSinceLastVisit: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'daysSinceLastVisit')?.value?.toString() || '' : '',
      minimumLifetimeSpend: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumLifetimeSpend')?.value?.toString() || '' : '',
      minimumPointsBalance: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'minimumPointsBalance')?.value?.toString() || '' : '',
      membershipLevel: Array.isArray(reward.conditions) ? 
        reward.conditions.find(c => c.type === 'membershipLevel')?.value?.toString() || '' : '',
      newCustomer: Array.isArray(reward.conditions) && 
        reward.conditions.some(c => c.type === 'newCustomer'),
    },
    
    // Map limitations array to object structure
    limitations: {
      totalRedemptionLimit: Array.isArray(reward.limitations) ? 
        reward.limitations.find(l => l.type === 'totalRedemptionLimit')?.value?.toString() || '' : '',
      perCustomerLimit: Array.isArray(reward.limitations) ? 
        reward.limitations.find(l => l.type === 'customerLimit')?.value?.toString() || '' : '',
      useTimeRestrictions: Array.isArray(reward.limitations) && 
        reward.limitations.some(l => l.type === 'timeOfDay' || l.type === 'daysOfWeek'),
      startTime: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'timeOfDay') ? 
        (reward.limitations.find(l => l.type === 'timeOfDay')?.value as any)?.startTime || '' : '',
      endTime: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'timeOfDay') ? 
        (reward.limitations.find(l => l.type === 'timeOfDay')?.value as any)?.endTime || '' : '',
      dayRestrictions: Array.isArray(reward.limitations) && reward.limitations.find(l => l.type === 'daysOfWeek') ? 
        (reward.limitations.find(l => l.type === 'daysOfWeek')?.value as string[]) || [] : [],
    },
    
    // Add active period with proper date formatting
    hasActivePeriod: !!(reward.startDate || reward.endDate),
    activePeriod: {
      startDate: safeParseDate(reward.startDate),
      endDate: safeParseDate(reward.endDate)
    }
  } : null;

  // For loading state
  if (loading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-y-auto">
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!reward) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 overflow-y-auto">
        <div className="sticky top-0 z-20 bg-white border-b p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </SheetClose>
              <h2 className="text-lg font-semibold">{reward.rewardName}</h2>
              <Badge variant="outline" className={cn(
                "ml-2 rounded-sm",
                reward.status === 'active' ? "bg-green-50 text-green-600 border-green-200" : "bg-gray-100 text-gray-600"
              )}>
                {capitalize(reward.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={reward.isActive || false} 
                onCheckedChange={async (checked) => {
                  console.log("Switch toggled, new value:", checked);
                  if (!user?.uid || !rewardId) {
                    console.error("Missing user ID or reward ID", { userId: user?.uid, rewardId });
                    return;
                  }
                  try {
                    setIsToggling(true);
                    console.log("Updating reward isActive to:", checked);
                    
                    // Update the reward isActive in Firestore
                    const rewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
                    console.log("Updating merchant reward at path:", `merchants/${user.uid}/rewards/${rewardId}`);
                    
                    await updateDoc(rewardRef, {
                      isActive: checked,
                      updatedAt: new Date().toISOString()
                    });
                    
                    // Also update in top-level rewards collection
                    const globalRewardRef = doc(db, 'rewards', rewardId);
                    console.log("Updating global reward at path:", `rewards/${rewardId}`);
                    
                    await updateDoc(globalRewardRef, {
                      isActive: checked,
                      updatedAt: new Date().toISOString()
                    });
                    
                    // Update the local state
                    console.log("Updating local state");
                    setReward(prev => {
                      const newState = prev ? {...prev, isActive: checked} : null;
                      console.log("New reward state:", newState);
                      return newState;
                    });
                    
                    showToast({
                      title: "Success",
                      description: `Reward ${checked ? 'activated' : 'deactivated'} successfully.`,
                    });
                    console.log("Toast shown");
                  } catch (error) {
                    console.error("Error updating reward isActive:", error);
                    showToast({
                      title: "Error",
                      description: "Failed to update reward status. Please try again.",
                      variant: "destructive"
                    });
                  } finally {
                    setIsToggling(false);
                    console.log("Toggle state reset");
                  }
                }}
                disabled={isToggling}
                className="data-[state=checked]:bg-[#007AFF]"
              />
            </div>
          </div>
          
          {/* Tabs in header */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "overview"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("overview")}
            >
              <BarChart className="h-4 w-4" />
              Overview
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "details"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("details")}
            >
              <CheckCircle className="h-4 w-4" />
              Details
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "redemptions"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("redemptions")}
            >
              <Gift className="h-4 w-4" />
              Redemptions
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "visibility"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("visibility")}
            >
              <Eye className="h-4 w-4" />
              Visibility
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                activeTab === "debug"
                  ? "text-gray-800 bg-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-200/70"
              )}
              onClick={() => setActiveTab("debug")}
            >
              <Tag className="h-4 w-4" />
              Debug
            </button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="h-[calc(100vh-8rem)]">
            <div className="px-6 py-6">
              <TabsContent value="overview" className="mt-0 space-y-6">
                                {/* App Preview Card */}
                <div className="flex-shrink-0 w-fit">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Preview</div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-80">
                  <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {reward.rewardName}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {reward.description}
                        </p>
                        {(reward as any).isNetworkReward && (
                          <div className="flex items-center gap-1 mt-1 flex-nowrap">
                            <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                              ${(reward as any).discountValue || '10'} Off
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                              Min. spend: ${(reward as any).minimumSpend || '50'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div 
                        className={cn(
                          "flex items-center justify-center rounded-md px-2 py-1 ml-3",
                          (reward as any).isNetworkReward
                            ? "bg-gray-100 text-gray-700 rounded-lg"
                            : (reward as any).programType === 'coffeeprogramnew'
                              ? "text-white"
                              : ((reward as any).programType === 'voucher' || (reward as any).programType === 'voucherprogramnew')
                                ? "bg-orange-400 text-white"
                                : (reward.pointsCost === 0 || reward.pointsCost === '0') 
                                  ? "bg-green-500 text-white" 
                                  : "bg-blue-500 text-white"
                        )}
                        style={(reward as any).programType === 'coffeeprogramnew' && !(reward as any).isNetworkReward ? { backgroundColor: '#895129' } : {}}
                      >
                        {(reward as any).isNetworkReward ? (
                          <>
                            <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                              {(reward as any).networkPointsCost || reward.pointsCost || '100'}
                            </span>
                            <Globe className="w-3 h-3 ml-1" />
                          </>
                        ) : (reward as any).programType === 'coffeeprogramnew' ? (
                          <>
                            <Coffee className="w-3 h-3 mr-1 fill-white" />
                            <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                              Free Coffee
                            </span>
                          </>
                        ) : ((reward as any).programType === 'voucher' || (reward as any).programType === 'voucherprogramnew') ? (
                          <>
                            <CreditCard className="w-3 h-3 mr-1" />
                            <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                              ${(reward as any).voucherAmount || '0'} voucher
                            </span>
                          </>
                        ) : (reward.pointsCost === 0 || reward.pointsCost === '0') ? (
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
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Points Cost */}
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Points Cost</div>
                          <div className="font-medium">{reward.pointsCost || '0'}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Redemptions */}
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-gray-50 flex items-center justify-center">
                          <Gift className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Total Redemptions</div>
                          <div className="font-medium">{reward.redemptionCount || 0}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Impressions */}
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Impressions</div>
                          <div className="font-medium">{reward.impressions || 0}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Unique Customers */}
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-gray-100 flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Unique Customers</div>
                          <div className="font-medium">{reward.uniqueCustomersCount || 0}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Key Information */}
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium mb-3">Key Information</h3>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                      {/* Last Redeemed */}
                      <div>
                        <div className="text-xs text-gray-500">Last Redeemed</div>
                        <div className="font-medium">
                          {formatTimestamp(reward.lastRedeemedAt) || 'Never'}
                        </div>
                      </div>

                      {/* Status */}
                      <div>
                        <div className="text-xs text-gray-500">Status</div>
                        <div>
                          <Badge 
                            variant="outline" 
                            className={`rounded-sm ${
                              reward.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {capitalize(reward.status)}
                          </Badge>
                        </div>
                      </div>

                      {/* PIN */}
                      <div>
                        <div className="text-xs text-gray-500">PIN</div>
                        <div className="font-mono text-sm">{reward.pin || 'None'}</div>
                      </div>

                      {/* Created */}
                      <div>
                        <div className="text-xs text-gray-500">Created</div>
                        <div className="font-medium">
                          {formatTimestamp(reward.createdAt)}
                        </div>
                      </div>

                      {/* Date Range (if applicable) */}
                      {(reward.startDate || reward.endDate) && (
                        <div className="col-span-2">
                          <div className="text-xs text-gray-500">Active Period</div>
                          <div className="font-medium flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            {reward.startDate ? formatDate(reward.startDate) : 'No start date'} 
                            <span className="mx-1">-</span> 
                            {reward.endDate ? formatDate(reward.endDate) : 'No end date'}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Add Customer-specific section if applicable */}
                    {reward.customers && reward.customers.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-600" />
                          <h2 className="text-sm font-medium text-blue-800">Customer-Specific Reward</h2>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 rounded-md p-3">
                          <p className="text-xs text-blue-800 mb-2">
                            This reward is only visible to {reward.customers.length} specific customer{reward.customers.length !== 1 ? 's' : ''}:
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {reward.customers.slice(0, 3).map((customerId, index) => (
                              <CustomerBadge key={index} customerId={customerId} />
                            ))}
                            {reward.customers.length > 3 && (
                              <div className="px-2 py-1 bg-white border border-blue-200 rounded-sm text-xs">
                                +{reward.customers.length - 3} more
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="mt-0 space-y-6">
                {/* Requirements */}
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium">Requirements</h3>
                    </div>
                    <div className="space-y-2">
                      {Array.isArray(reward.conditions) && reward.conditions.map((condition, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 text-xs p-2 rounded-md bg-gray-50 border border-gray-100"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          <span className="text-gray-700">{formatCondition(condition)}</span>
                        </div>
                      ))}
                      {(!reward.conditions || !Array.isArray(reward.conditions) || reward.conditions.length === 0) && (
                        <div className="text-xs text-gray-500 italic">No special requirements</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Limitations */}
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium">Limitations</h3>
                    </div>
                    <div className="space-y-2">
                      {Array.isArray(reward.limitations) && reward.limitations.map((limitation, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-2 text-xs p-2 rounded-md bg-gray-50 border border-gray-100"
                        >
                          <div className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          <span className="text-gray-700">{formatLimitation(limitation)}</span>
                        </div>
                      ))}
                      {(!reward.limitations || !Array.isArray(reward.limitations) || reward.limitations.length === 0) && (
                        <div className="text-xs text-gray-500 italic">No limitations set</div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Reward Type Details */}
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium">Reward Type</h3>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className="capitalize bg-blue-50 text-blue-700 border-blue-200 rounded-sm">
                        {reward.rewardType || reward.category || 'Discount'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {reward.rewardType === 'discount' ? 'Gives customers a discount on purchases' : 
                         reward.rewardType === 'freeItem' ? 'Offers a free item with purchase' :
                         reward.rewardType === 'bundle' ? 'Bundle offer (buy X get Y)' :
                         reward.rewardType === 'mystery' ? 'Mystery reward revealed at checkout' :
                         reward.rewardType === 'custom' ? 'Custom reward with special terms' :
                         'General loyalty reward'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Options */}
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Award className="h-4 w-4 text-gray-600" />
                      <h3 className="text-sm font-medium">Advanced Options</h3>
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Visibility</span>
                        <Badge variant="outline" className="rounded-sm bg-gray-50 text-gray-700">
                          {reward.customers && reward.customers.length > 0 ? 'Selected Customers' : 'All Customers'}
                        </Badge>
                      </div>
                      
                      {reward.pin && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Redemption PIN</span>
                          <div className="font-mono bg-gray-50 px-2 py-0.5 rounded border text-gray-700">{reward.pin}</div>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Created</span>
                        <span className="text-gray-600">{formatTimestamp(reward.createdAt)}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Last Updated</span>
                        <span className="text-gray-600">{formatTimestamp(reward.updatedAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="redemptions" className="mt-0 space-y-6">
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-0">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-gray-600" />
                          <h3 className="text-sm font-medium">Redemption History</h3>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-sm">
                          {reward.redemptionCount || 0} total
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Date & Time</TableHead>
                            <TableHead className="text-xs">Customer</TableHead>
                            <TableHead className="text-xs">Points</TableHead>
                            <TableHead className="text-xs">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {redemptionsLoading ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                <div className="flex justify-center">
                                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : redemptions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={4} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6">
                                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Gift className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <h3 className="mt-3 text-sm font-medium">No redemptions yet</h3>
                                  <p className="text-xs text-gray-500 mt-1">
                                    This reward hasn't been redeemed by any customers
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            redemptions.map((redemption) => (
                              <TableRow 
                                key={redemption.id}
                                className="hover:bg-gray-50"
                              >
                                <TableCell className="text-xs py-2">
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {redemption.redemptionDate 
                                        ? new Date(
                                            typeof redemption.redemptionDate === 'string' 
                                              ? redemption.redemptionDate 
                                              : redemption.redemptionDate.seconds * 1000
                                          ).toLocaleDateString()
                                        : 'Unknown date'
                                      }
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {redemption.redemptionDate
                                        ? new Date(
                                            typeof redemption.redemptionDate === 'string' 
                                              ? redemption.redemptionDate 
                                              : redemption.redemptionDate.seconds * 1000
                                          ).toLocaleTimeString()
                                        : 'Unknown time'
                                      }
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <div className="flex items-center gap-2">
                                    {redemption.profilePictureUrl ? (
                                      <img 
                                        src={redemption.profilePictureUrl} 
                                        alt={redemption.customerName || 'Customer'} 
                                        className="h-6 w-6 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Users className="h-3 w-3 text-gray-400" />
                                      </div>
                                    )}
                                    <span className="truncate max-w-[100px]">{redemption.customerName || 'Unknown'}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <div className="inline-block px-2 py-1 rounded-md border border-slate-200 shadow-sm bg-white">
                                    <span className="text-indigo-600 font-medium text-xs">
                                      {(redemption.pointsUsed ?? reward.pointsCost ?? 0).toLocaleString()}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "rounded-sm text-xs",
                                      redemption.status === 'successful' || redemption.status === 'completed'
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : redemption.status === 'pending'
                                        ? "bg-blue-50 text-blue-600 border-blue-200"
                                        : "bg-gray-50 text-gray-500 border-gray-100"
                                    )}
                                  >
                                    {capitalize(redemption.status || 'unknown')}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Additional Stats and Information */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <BarChart className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Conversion Rate</div>
                          <div className="font-medium">
                            {reward.impressions && reward.impressions > 0 
                              ? `${((reward.redemptionCount || 0) / reward.impressions * 100).toFixed(1)}%` 
                              : '0%'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Last Redeemed</div>
                          <div className="font-medium text-xs">
                            {formatTimestamp(reward.lastRedeemedAt) || 'Never'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="visibility" className="mt-0 space-y-6">
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-0">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-gray-600" />
                          <h3 className="text-sm font-medium">Customer Visibility</h3>
                        </div>
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-sm">
                          {customerVisibility.length} customers
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Customer</TableHead>
                            <TableHead className="text-xs">Email</TableHead>
                            <TableHead className="text-xs">Redeemable</TableHead>
                            <TableHead className="text-xs">Visible</TableHead>
                            <TableHead className="text-xs">Reason</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibilityLoading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex justify-center">
                                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : customerVisibility.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center">
                                <div className="flex flex-col items-center justify-center py-6">
                                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-gray-400" />
                                  </div>
                                  <h3 className="mt-3 text-sm font-medium">No customers found</h3>
                                  <p className="text-xs text-gray-500 mt-1">
                                    No customers are registered for this merchant
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            customerVisibility.map((customer) => (
                              <TableRow 
                                key={customer.id}
                                className="hover:bg-gray-50"
                              >
                                <TableCell className="text-xs py-2">
                                  <div className="flex items-center gap-2">
                                    {customer.profilePictureUrl ? (
                                      <img 
                                        src={customer.profilePictureUrl} 
                                        alt={customer.name} 
                                        className="h-6 w-6 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                        <Users className="h-3 w-3 text-gray-400" />
                                      </div>
                                    )}
                                    <span className="truncate max-w-[120px] font-medium">{customer.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <span className="text-gray-600 truncate max-w-[150px]">
                                    {customer.email || 'No email'}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "rounded-sm text-xs",
                                      customer.redeemable
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-red-50 text-red-700 border-red-200"
                                    )}
                                  >
                                    {customer.redeemable ? 'true' : 'false'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <Badge 
                                    variant="outline" 
                                    className={cn(
                                      "rounded-sm text-xs",
                                      customer.visible
                                        ? "bg-green-50 text-green-700 border-green-200" 
                                        : "bg-red-50 text-red-700 border-red-200"
                                    )}
                                  >
                                    {customer.visible ? 'true' : 'false'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs py-2">
                                  <span className="text-gray-600 truncate max-w-[120px]">
                                    {customer.visibilityReason || 'No reason'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Visibility Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Can See</div>
                          <div className="font-medium">
                            {customerVisibility.filter(c => c.visible).length} customers
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-md shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-green-50 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Can Redeem</div>
                          <div className="font-medium">
                            {customerVisibility.filter(c => c.visible && c.redeemable).length} customers
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="debug" className="mt-0 space-y-6">
                <Card className="rounded-md shadow-sm">
                  <CardContent className="p-0">
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-gray-600" />
                        <h3 className="text-sm font-medium">Debug Information</h3>
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 rounded-sm">
                          Raw Data
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Complete reward document structure for debugging purposes
                      </p>
                    </div>
                    <div className="p-4">
                      <div className="bg-gray-50 rounded-md border p-4 font-mono text-xs overflow-auto max-h-96">
                        <pre className="whitespace-pre-wrap text-gray-800">
                          {JSON.stringify(reward, null, 2)}
                        </pre>
                      </div>
                      
                      {/* Additional Debug Info */}
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Debug Stats</h4>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Document ID:</span>
                            <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">{reward?.id || 'N/A'}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Collection Path:</span>
                            <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                              merchants/{user?.uid}/rewards/{reward?.id}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Object Keys Count:</span>
                            <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                              {reward ? Object.keys(reward).length : 0}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Data Size (approx):</span>
                            <div className="font-mono bg-gray-100 px-2 py-1 rounded mt-1">
                              {reward ? `${JSON.stringify(reward).length} chars` : 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Copy to Clipboard Button */}
                      <div className="mt-4 pt-4 border-t flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 rounded-md text-xs"
                          onClick={() => {
                            if (reward) {
                              navigator.clipboard.writeText(JSON.stringify(reward, null, 2));
                              showToast({
                                title: "Copied!",
                                description: "Reward JSON copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Copy className="h-3 w-3" />
                          Copy JSON
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 rounded-md text-xs"
                          onClick={() => {
                            if (reward) {
                              const debugInfo = {
                                documentId: reward.id,
                                collectionPath: `merchants/${user?.uid}/rewards/${reward.id}`,
                                keyCount: Object.keys(reward).length,
                                dataSize: JSON.stringify(reward).length,
                                timestamp: new Date().toISOString(),
                                reward: reward
                              };
                              navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
                              showToast({
                                title: "Debug Info Copied!",
                                description: "Complete debug information copied to clipboard",
                              });
                            }
                          }}
                        >
                          <Tag className="h-3 w-3" />
                          Copy Debug Info
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <div className="border-t sticky bottom-0 bg-white p-4 flex justify-between">
          <button 
            className="text-sm text-red-600 hover:text-red-700 hover:underline transition-colors" 
            onClick={() => setIsDeleteConfirmOpen(true)}
          >
            Delete reward
          </button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              className="gap-2 rounded-md" 
              onClick={() => setIsDuplicateModalOpen(true)}
            >
              <Copy className="h-4 w-4" />
              Duplicate
            </Button>
            <Button 
              variant="outline" 
              className="gap-2 rounded-md text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700" 
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </SheetContent>

      {/* Edit Reward Dialog */}
      <CreateRewardDialog 
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        defaultValues={createRewardDialogData}
        isEditing={true}
        rewardId={rewardId as string}
      />

      {/* Duplicate Reward Dialog */}
      <CreateRewardDialog 
        open={isDuplicateModalOpen}
        onOpenChange={setIsDuplicateModalOpen}
        defaultValues={{
          ...createRewardDialogData,
          rewardName: createRewardDialogData ? `${createRewardDialogData.rewardName} (Copy)` : '',
        }}
        isEditing={false}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reward? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-100 rounded-md p-4 text-sm text-red-800">
              <strong>Warning:</strong> Deleting this reward will:
              <ul className="list-disc ml-5 mt-2 space-y-1">
                <li>Remove it from all customer accounts</li>
                <li>Make it unavailable for future redemptions</li>
                <li>Delete all associated analytics data</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={async () => {
                if (!user?.uid || !rewardId) return;
                try {
                  // Delete from merchant's rewards subcollection
                  const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
                  await deleteDoc(merchantRewardRef);
                  
                  // Also delete from top-level rewards collection
                  const globalRewardRef = doc(db, 'rewards', rewardId);
                  await deleteDoc(globalRewardRef);
                  
                  showToast({
                    title: "Reward Deleted",
                    description: "The reward has been successfully deleted.",
                  });
                  
                  // Close the sheet
                  onOpenChange(false);
                  
                  // Navigate back to rewards list if we need to
                  router.refresh();
                } catch (error) {
                  console.error("Error deleting reward:", error);
                  showToast({
                    title: "Error",
                    description: "Failed to delete reward. Please try again.",
                    variant: "destructive"
                  });
                } finally {
                  setIsDeleteConfirmOpen(false);
                }
              }}
            >
              Delete Reward
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
} 