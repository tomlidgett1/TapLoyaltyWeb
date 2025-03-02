"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Plus, Settings, MessageSquare, ChevronDown, ChevronUp, HelpCircle, CheckCircle, Edit, MoreHorizontal, Pencil, Trash2, Gift, Repeat, Sparkles as SparklesIcon, DollarSign, Calendar, Clock, Users, Award, History, Timer, Wallet, BadgeCheck, CalendarRange, UserCheck, Ban, Mic, MicOff, Eye, Coffee, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { getAIResponse } from "@/lib/openai"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  getOrCreateAssistant, 
  createThread, 
  addMessage, 
  runAssistant 
} from "@/lib/assistant"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, deleteDoc, writeBatch, Timestamp } from "firebase/firestore"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { useCustomers } from '@/hooks/use-customers'
import { Command, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface Conversation {
  id: string
  threadId: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RewardData {
  rewardName: string
  description: string
  programtype: 'voucher' | 'points' | 'discount'
  isActive: boolean
  pointsCost: number
  rewardVisibility: string
  voucherAmount: number
  delayedVisibility?: {
    type: string
    value: number
  }
  conditions: Array<{
    type: string
    amount?: number
    value?: number | string
  }>
  limitations: Array<{
    type: string
    value: number | string[] | { startTime?: string; endTime?: string; startDate?: string; endDate?: string }
  }>
}

const isJsonString = (str: string) => {
  if (typeof str !== 'string') return false;
  try {
    const result = JSON.parse(str);
    return typeof result === 'object' && result !== null;
  } catch (e) {
    return false;
  }
};

function RewardCard({ 
  reward, 
  setSavingReward, 
  setPinDialogOpen 
}: { 
  reward: RewardData; 
  setSavingReward: (reward: any) => void;
  setPinDialogOpen: (open: boolean) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isUsed, setIsUsed] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const formatCondition = (condition: { type: string; amount?: number; value?: number | string }) => {
    switch (condition.type) {
      case 'minimumSpend':
        return `Minimum spend of $${condition.amount}`
      case 'minimumLifetimeSpend':
        return `Total lifetime spend of $${condition.value}`
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`
      case 'minimumPointsBalance':
        return `Minimum ${condition.value} points balance`
      case 'membershipLevel':
        return `${condition.value} membership level required`
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`
      default:
        return condition.type
    }
  }

  const formatLimitation = (limitation: { 
    type: string; 
    value: number | string[] | { startTime?: string; endTime?: string; startDate?: string; endDate?: string } 
  }) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'totalRedemptionLimit':
        return `${limitation.value} total available`
      case 'daysOfWeek':
        return `Available on ${(limitation.value as string[]).join(', ')}`
      case 'timeOfDay':
        const timeValue = limitation.value as { startTime: string; endTime: string }
        return `Available ${timeValue.startTime} - ${timeValue.endTime}`
      case 'activePeriod':
        const dateValue = limitation.value as { startDate: string; endDate: string }
        return `Valid ${new Date(dateValue.startDate).toLocaleDateString()} - ${new Date(dateValue.endDate).toLocaleDateString()}`
      default:
        return `${limitation.type}: ${limitation.value}`
    }
  }

  const formatDelayedVisibility = (visibility: { type: string; value: number }) => {
    switch (visibility.type) {
      case 'totalLifetimeSpend':
        return `Visible after $${visibility.value} total spend`
      case 'minimumTransactions':
        return `Visible after ${visibility.value} transactions`
      case 'daysSinceJoined':
        return `Visible after ${visibility.value} days of membership`
      default:
        return `Visible after ${visibility.type}: ${visibility.value}`
    }
  }

  const createRewardData = {
    rewardName: reward.rewardName,
    description: reward.description,
    type: reward.programtype,
    rewardVisibility: reward.rewardVisibility,
    pin: "",
    pointsCost: reward.pointsCost,
    isActive: reward.isActive,
    delayedVisibility: !!reward.delayedVisibility,
    isTargeted: false,
    discountAmount: 0,
    itemName: "",
    voucherAmount: reward.voucherAmount,
    conditions: {
      newCustomer: false,
      minimumTransactions: 0,
      maximumTransactions: 0,
      daysSinceJoined: 0,
      daysSinceLastVisit: 0,
      minimumLifetimeSpend: reward.conditions.find(c => c.type === 'minimumSpend')?.amount || 0,
      minimumPointsBalance: 0,
      membershipLevel: ""
    },
    limitations: {
      totalRedemptionLimit: reward.limitations.find(l => l.type === 'totalRedemptionLimit')?.value || 0,
      perCustomerLimit: reward.limitations.find(l => l.type === 'customerLimit')?.value || 0,
      dayRestrictions: [],
      startTime: "",
      endTime: "",
      startDate: null,
      endDate: null
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Map the reward data to the format expected by CreateRewardDialog
    const editFormData = {
      rewardName: reward.rewardName,
      description: reward.description,
      type: reward.programtype, 
      rewardVisibility: reward.rewardVisibility || 'global',
      pin: "",
      pointsCost: reward.pointsCost,
      isActive: reward.isActive,
      delayedVisibility: !!reward.delayedVisibility,
      isTargeted: false,
      discountAmount: 0,
      itemName: "",
      voucherAmount: reward.voucherAmount,
      
      // Map conditions
      conditions: {
        newCustomer: false,
        minimumTransactions: reward.conditions?.find(c => c.type === 'minimumTransactions')?.value?.toString() || "",
        maximumTransactions: reward.conditions?.find(c => c.type === 'maximumTransactions')?.value?.toString() || "",
        daysSinceJoined: reward.conditions?.find(c => c.type === 'daysSinceJoined')?.value?.toString() || "",
        daysSinceLastVisit: reward.conditions?.find(c => c.type === 'daysSinceLastVisit')?.value?.toString() || "",
        minimumLifetimeSpend: reward.conditions?.find(c => c.type === 'minimumLifetimeSpend')?.value?.toString() || "",
        minimumPointsBalance: reward.conditions?.find(c => c.type === 'minimumPointsBalance')?.value?.toString() || "",
        membershipLevel: reward.conditions?.find(c => c.type === 'membershipLevel')?.value?.toString() || "",
        
        // Add flags for condition sections
        useTransactionRequirements: !!(
          reward.conditions?.find(c => c.type === 'minimumTransactions')?.value ||
          reward.conditions?.find(c => c.type === 'maximumTransactions')?.value
        ),
        useTimeRequirements: !!(
          reward.conditions?.find(c => c.type === 'daysSinceJoined')?.value ||
          reward.conditions?.find(c => c.type === 'daysSinceLastVisit')?.value
        ),
        useSpendingRequirements: !!(
          reward.conditions?.find(c => c.type === 'minimumLifetimeSpend')?.value ||
          reward.conditions?.find(c => c.type === 'minimumPointsBalance')?.value
        )
      },
      
      // Map limitations
      limitations: {
        totalRedemptionLimit: reward.limitations?.find(l => l.type === 'totalRedemptionLimit')?.value?.toString() || "",
        perCustomerLimit: reward.limitations?.find(l => l.type === 'customerLimit')?.value?.toString() || "",
        
        // Handle day restrictions
        dayRestrictions: reward.limitations?.find(l => l.type === 'daysOfWeek')?.value as string[] || [],
        
        // Handle time of day
        startTime: reward.limitations?.find(l => l.type === 'timeOfDay')?.value?.startTime || "",
        endTime: reward.limitations?.find(l => l.type === 'timeOfDay')?.value?.endTime || "",
        
        // Handle active period
        startDate: reward.limitations?.find(l => l.type === 'activePeriod')?.value?.startDate || null,
        endDate: reward.limitations?.find(l => l.type === 'activePeriod')?.value?.endDate || null,
        
        // Add flags for limitation sections
        useTimeRestrictions: !!reward.limitations?.find(l => l.type === 'timeOfDay'),
        useDayRestrictions: !!reward.limitations?.find(l => l.type === 'daysOfWeek'),
      },
      
      // Handle delayed visibility settings
      delayedVisibilityType: reward.delayedVisibility?.type === 'totalLifetimeSpend' ? 'spend' : 
                            reward.delayedVisibility?.type === 'minimumTransactions' ? 'transactions' : '',
      delayedVisibilitySpend: reward.delayedVisibility?.type === 'totalLifetimeSpend' ? reward.delayedVisibility.value.toString() : '',
      delayedVisibilityTransactions: reward.delayedVisibility?.type === 'minimumTransactions' ? reward.delayedVisibility.value.toString() : '',
      
      // Handle active period flag
      hasActivePeriod: !!reward.limitations?.find(l => l.type === 'activePeriod'),
      activePeriod: {
        startDate: reward.limitations?.find(l => l.type === 'activePeriod')?.value?.startDate || '',
        endDate: reward.limitations?.find(l => l.type === 'activePeriod')?.value?.endDate || ''
      }
    }
    
    setCreateRewardData(editFormData)
    setEditDialogOpen(true)
  }

  const handleUseTemplate = async (e: React.MouseEvent, reward: any) => {
    e.stopPropagation()
    
    if (!user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save rewards",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setSaving(true)
    setSavingReward(reward)
    setPinDialogOpen(true)
  }

  const handleSaveWithPin = async (status: 'draft' | 'live') => {
    if (!pin.trim() || !user?.uid) {
      console.log("Missing required data:", { 
        pin: !!pin.trim(), 
        userId: !!user?.uid 
      });
      return;
    }

    try {
      setSaving(true);
      const now = Timestamp.now();
      const batch = writeBatch(db);
      
      // Check if we have program data in the ref
      const programData = fullProgramDataRef.current;
      console.log("Using data from ref:", programData);
      
      if (programData && programData.isProgram && Array.isArray(programData.rewards)) {
        console.log(`Program detected with ${programData.rewards.length} rewards`);
        console.log("Full rewards array:", JSON.stringify(programData.rewards));
        
        // Create a program ID to link all rewards
        const programId = `program-${Date.now()}`;
        console.log("Created program ID:", programId);
        
        // Get program name from the programData
        const programName = programData.programName || programData.rewardName || "Loyalty Program";
        
        // Create an array to store all the reward IDs we're creating
        const createdRewardIds = [];
        
        // Make sure we're iterating through the rewards array correctly
        const rewardsArray = Array.isArray(programData.rewards) ? programData.rewards : [];
        console.log(`Processing ${rewardsArray.length} rewards`);
        
        // Process each reward
        for (let i = 0; i < rewardsArray.length; i++) {
          const reward = rewardsArray[i];
          console.log(`Processing reward ${i+1}/${rewardsArray.length}:`, {
            name: reward.rewardName,
            description: reward.description,
            pointsCost: reward.pointsCost
          });
          
          // Generate a truly unique ID for each reward
          const uniqueTimestamp = Date.now() + i; // Add index to ensure uniqueness
          const randomSuffix = Math.floor(Math.random() * 10000);
          const rewardId = `${programId}-reward-${uniqueTimestamp}-${randomSuffix}`;
          
          console.log(`Created unique ID for reward ${i+1}:`, rewardId);
          
          const rewardData = {
            ...reward,
            pin: pin.trim(),
            createdAt: now,
            status: status,
            isActive: status === 'live',
            id: rewardId,
            merchantId: user.uid,
            updatedAt: now,
            programId: programId,
            programName: programName, // Add the program name to each reward
            category: 'individual'
          };
          
          // Save individual reward
          console.log(`Saving reward ${i+1} to Firestore:`, rewardData);
          
          const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
          batch.set(merchantRewardRef, rewardData);
          
          const globalRewardRef = doc(db, 'rewards', rewardId);
          batch.set(globalRewardRef, rewardData);
          
          const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId);
          batch.set(tapAiRewardRef, rewardData);
          
          createdRewardIds.push(rewardId);
          console.log(`Reward ${i+1} added to batch`);
        }
        
        console.log(`All ${rewardsArray.length} rewards processed. Created IDs:`, createdRewardIds);
      } else if (savingReward) {
        // Handle single reward (existing code)
        console.log("Processing single reward");
        const rewardId = Date.now().toString();
        const rewardData = {
          ...savingReward,
          pin: pin.trim(),
          createdAt: now,
          status: status,
          isActive: status === 'live',
          id: rewardId,
          merchantId: user.uid,
          updatedAt: now,
          category: 'individual'
        };
        
        const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
        batch.set(merchantRewardRef, rewardData);
        
        const globalRewardRef = doc(db, 'rewards', rewardId);
        batch.set(globalRewardRef, rewardData);
        
        const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId);
        batch.set(tapAiRewardRef, rewardData);
      } else {
        console.error("No reward data found");
        return;
      }
      
      // Commit all writes
      console.log("Committing batch to Firestore...");
      await batch.commit();
      console.log("Batch committed successfully");

      toast({
        title: "Success",
        description: savingReward ? `Reward ${status === 'draft' ? 'saved as draft' : 'published live'}` : `Program with ${programData?.rewards?.length || 0} rewards ${status === 'draft' ? 'saved as draft' : 'published live'}`,
      });
      setPinDialogOpen(false);
      setPin('');
      setSavingRewardOriginal(null);
      // Reset the ref after successful save
      fullProgramDataRef.current = null;
    } catch (error) {
      console.error('Error saving reward:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to save reward: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className={cn(
        "border rounded-lg overflow-hidden bg-white shadow-sm transition-shadow w-full",
        isUsed ? "opacity-75" : "hover:shadow-md"
      )}>
        <div 
          className={cn(
            "p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50"
          )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{reward.rewardName}</h3>
            <div className="flex items-center gap-3">
                {isUsed ? (
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Used
                  </span>
                ) : (
                  <>
              <span className="text-sm font-medium text-[#007AFF]">
                      {reward.pointsCost > 0 ? `${reward.pointsCost.toLocaleString()} points` : 'Free'}
              </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={handleEdit}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </>
              )}
            </div>
          </div>
            <p className="text-sm text-gray-600">{reward.description}</p>
        </div>
      </div>

      {isExpanded && (
          <div className="p-4 border-t bg-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <p className="text-sm font-medium text-gray-500">Program Type</p>
                <p className="text-sm text-gray-900 capitalize">{reward.programtype}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Points Cost</p>
              <p className="text-sm font-semibold text-[#007AFF]">
                  {reward.pointsCost > 0 ? reward.pointsCost.toLocaleString() : 'Free'}
              </p>
            </div>
            </div>

            {reward.delayedVisibility && (
            <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Visibility Rule</p>
                <p className="text-sm text-gray-600">
                  {formatDelayedVisibility(reward.delayedVisibility)}
              </p>
            </div>
            )}

            {reward.conditions?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  Conditions
                  <div className="h-px flex-1 bg-gray-100"></div>
          </div>
                <div className="grid grid-cols-1 gap-2">
                  {reward.conditions.map((condition, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-100/50"
                    >
                      {condition.type === 'minimumSpend' && <DollarSign className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumLifetimeSpend' && <History className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumTransactions' && <Repeat className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'maximumTransactions' && <Ban className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumPointsBalance' && <Award className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'membershipLevel' && <BadgeCheck className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'daysSinceJoined' && <UserCheck className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'daysSinceLastVisit' && <Timer className="h-4 w-4 text-[#007AFF]" />}
                      <span className="text-sm text-gray-700">{formatCondition(condition)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reward.limitations?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  Limitations
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {reward.limitations.map((limitation, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-orange-50/50 rounded-lg border border-orange-100/50"
                    >
                      {limitation.type === 'customerLimit' && <Users className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'totalRedemptionLimit' && <Award className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'daysOfWeek' && <Calendar className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'timeOfDay' && <Clock className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'activePeriod' && <CalendarRange className="h-4 w-4 text-orange-500" />}
                      <span className="text-sm text-gray-700">{formatLimitation(limitation)}</span>
                    </div>
                  ))}
                </div>
            </div>
          )}

            {!isUsed && (
          <div className="flex gap-2">
          <Button
              onClick={(e) => handleUseTemplate(e, reward)}
              disabled={saving || isUsed}
              className="flex-1 bg-[#007AFF] hover:bg-[#0066CC] text-white"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                  Use Template
              </>
            )}
          </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Customize
          </Button>
        </div>
      )}
    </div>
      )}
    </div>

      <CreateRewardDialog 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        defaultValues={createRewardData}
      />
    </>
  )
}

function ProgramCard({ 
  program, 
  rewards, 
  setSavingReward, 
  setPinDialogOpen,
  onEdit,
  fullProgramDataRef  // Add this prop
}: { 
  program: any;
  rewards: any[];
  setSavingReward: (reward: any) => void;
  setPinDialogOpen: (open: boolean) => void;
  onEdit: (reward: any) => void;
  fullProgramDataRef: React.RefObject<any>;  // Add this type
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedRewards, setExpandedRewards] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Get program type and format it for display
  const programType = program.programtype || rewards[0]?.programtype || 'points';
  const formattedProgramType = programType.charAt(0).toUpperCase() + programType.slice(1);
  
  // Get a count of rewards in the program
  const rewardCount = rewards.length;
  
  // Calculate total points cost across all rewards
  const totalPointsCost = rewards.reduce((sum, reward) => sum + (reward.pointsCost || 0), 0);
  
  const toggleRewardExpansion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRewards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };
  
  const formatCondition = (condition: { type: string; amount?: number; value?: number | string }) => {
    switch (condition.type) {
      case 'minimumSpend':
        return `Minimum spend of $${condition.amount}`
      case 'minimumLifetimeSpend':
        return `Total lifetime spend of $${condition.value}`
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`
      case 'minimumPointsBalance':
        return `Minimum ${condition.value} points balance`
      case 'membershipLevel':
        return `${condition.value} membership level required`
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`
      default:
        return condition.type
    }
  };

  const formatLimitation = (limitation: { 
    type: string; 
    value: number | string[] | { startTime?: string; endTime?: string; startDate?: string; endDate?: string } 
  }) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'totalRedemptionLimit':
        return `${limitation.value} total available`
      case 'daysOfWeek':
        return `Available on ${(limitation.value as string[]).join(', ')}`
      case 'timeOfDay':
        const timeValue = limitation.value as { startTime: string; endTime: string }
        return `Available ${timeValue.startTime} - ${timeValue.endTime}`
      case 'activePeriod':
        const dateValue = limitation.value as { startDate: string; endDate: string }
        return `Valid ${new Date(dateValue.startDate).toLocaleDateString()} - ${new Date(dateValue.endDate).toLocaleDateString()}`
      default:
        return `${limitation.type}: ${limitation.value}`
    }
  };
  
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md w-full">
      {/* Program Header */}
      <div 
        className="p-4 cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
              {programType === 'coffee' ? (
                <Coffee className="h-5 w-5 text-blue-600" />
              ) : programType === 'voucher' ? (
                <DollarSign className="h-5 w-5 text-green-600" />
              ) : programType === 'points' ? (
                <Award className="h-5 w-5 text-purple-600" />
              ) : (
                <Gift className="h-5 w-5 text-indigo-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold">{program.programName || `${formattedProgramType} Program`}</h3>
              <p className="text-sm text-gray-600">{program.description || `A ${programType} rewards program with ${rewardCount} rewards`}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-500">{rewardCount} Rewards</div>
              <div className="text-sm font-semibold text-blue-600">{totalPointsCost} Total Points</div>
            </div>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Program Description */}
          {program.longDescription && (
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-700">{program.longDescription}</p>
            </div>
          )}
          
          {/* Rewards List */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-500" />
              Program Rewards
            </h4>
            
            <div className="grid grid-cols-1 gap-3">
              {rewards.map((reward, index) => (
                <div key={index} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div 
                    className="p-3 flex items-center justify-between border-b border-gray-100 cursor-pointer"
                    onClick={(e) => toggleRewardExpansion(index, e)}
                  >
                    <div>
                      <h5 className="font-medium">{reward.rewardName}</h5>
                      <p className="text-sm text-gray-600">{reward.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-sm font-semibold text-blue-600">{reward.pointsCost || 0} points</span>
                      </div>
                      {expandedRewards.has(index) ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </div>
                  </div>
                  
                  {/* Expanded reward details */}
                  {expandedRewards.has(index) && (
                    <div className="p-3 bg-gray-50 border-b border-gray-100">
                      {/* Conditions */}
                      {Array.isArray(reward.conditions) && reward.conditions.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-xs font-semibold text-gray-700 mb-1">Conditions</h6>
                          <ul className="space-y-1">
                            {reward.conditions.map((condition, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                                {formatCondition(condition)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Limitations */}
                      {Array.isArray(reward.limitations) && reward.limitations.length > 0 && (
                        <div>
                          <h6 className="text-xs font-semibold text-gray-700 mb-1">Limitations</h6>
                          <ul className="space-y-1">
                            {reward.limitations.map((limitation, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-center gap-1">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                                {formatLimitation(limitation)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="p-3 bg-gray-50 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-md"
                      onClick={() => onEdit(reward)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    
                    <Button
                      size="sm"
                      className="h-8 rounded-md bg-[#007AFF] hover:bg-[#0066CC] text-white"
                      onClick={() => {
                        if (!user?.uid) {
                          toast({
                            title: "Authentication Required",
                            description: "Please sign in to save rewards",
                            variant: "destructive"
                          });
                          router.push('/login');
                          return;
                        }
                        
                        setSavingReward(reward);
                        setPinDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Use
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Program Actions */}
          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => onEdit(program)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Program
            </Button>
            
            <Button
              className="rounded-md bg-[#007AFF] hover:bg-[#0066CC] text-white"
              onClick={(e) => {
                e.stopPropagation();
                
                if (!user?.uid) {
                  toast({
                    title: "Authentication Required",
                    description: "Please sign in to save rewards",
                    variant: "destructive"
                  });
                  router.push('/login');
                  return;
                }
                
                // Create a combined program object with the rewards array
                const programWithRewards = JSON.parse(JSON.stringify({
                  programName: program.programName,
                  description: program.description,
                  programtype: program.programtype,
                  rewards: rewards,
                  isProgram: true
                }));
                
                console.log("Creating program with rewards:", programWithRewards);
                console.log("Rewards array length:", programWithRewards.rewards.length);
                
                // Store the program data in the ref
                fullProgramDataRef.current = programWithRewards;
                
                // Open the PIN dialog directly
                setPinDialogOpen(true);
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Use Entire Program
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageContent({ 
  content, 
  user,
  onEdit,
  onUseTemplate,
  className,
  fullProgramDataRef  // Add this prop
}: { 
  content: string
  user: any
  onEdit: (reward: any) => void
  onUseTemplate: (reward: any) => void
  className?: string
  fullProgramDataRef?: React.RefObject<any>  // Add this type
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [expandedRewards, setExpandedRewards] = useState<Set<string>>(new Set())
  
  const formatCondition = (condition: { type: string; amount?: number; value?: number | string }) => {
    switch (condition.type) {
      case 'minimumSpend':
        return `Minimum spend of $${condition.amount}`
      case 'minimumLifetimeSpend':
        return `Total lifetime spend of $${condition.value}`
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`
      case 'minimumPointsBalance':
        return `Minimum ${condition.value} points balance`
      case 'membershipLevel':
        return `${condition.value} membership level required`
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`
      default:
        return condition.type
    }
  }

  const formatLimitation = (limitation: { 
    type: string; 
    value: any 
  }) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'totalRedemptionLimit':
        return `${limitation.value} total available`
      case 'daysOfWeek':
        return `Available on ${(limitation.value as string[]).join(', ')}`
      case 'timeOfDay':
        const timeValue = limitation.value as { startTime: string; endTime: string }
        return `Available ${timeValue.startTime} - ${timeValue.endTime}`
      case 'activePeriod':
        const dateValue = limitation.value as { startDate: string; endDate: string }
        return `Valid ${new Date(dateValue.startDate).toLocaleDateString()} - ${new Date(dateValue.endDate).toLocaleDateString()}`
      default:
        return `${limitation.type}: ${limitation.value}`
    }
  }

  const formatDelayedVisibility = (visibility: { type: string; value: number }) => {
    switch (visibility.type) {
      case 'totalLifetimeSpend':
        return `Visible after $${visibility.value} total spend`
      case 'minimumTransactions':
        return `Visible after ${visibility.value} transactions`
      case 'daysSinceJoined':
        return `Visible after ${visibility.value} days of membership`
      default:
        return `Visible after ${visibility.type}: ${visibility.value}`
    }
  }

  const extractJsonFromContent = (content: string) => {
    try {
      // First, try to find JSON between ```json and ``` markers
      const jsonRegex = /```json\n([\s\S]*?)\n```/;
      const match = content.match(jsonRegex);
      
      if (match && match[1]) {
        // Trim any whitespace and try to parse
        const jsonString = match[1].trim();
        return JSON.parse(jsonString);
      }
      
      // If no match with ```json, try to find any JSON array or object in the content
      const possibleJson = content.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (possibleJson && possibleJson[1]) {
        // Find the start and end of what looks like valid JSON
        const jsonCandidate = possibleJson[1].trim();
        return JSON.parse(jsonCandidate);
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing JSON:", error);
      console.log("Content that failed to parse:", content);
      
      // Try a more lenient approach for malformed JSON
      try {
        // Sometimes the JSON might have extra text after it
        // Try to find the last closing bracket/brace and parse up to that point
        const lastClosingBracket = content.lastIndexOf(']');
        const lastClosingBrace = content.lastIndexOf('}');
        const lastClosing = Math.max(lastClosingBracket, lastClosingBrace);
        
        if (lastClosing > 0) {
          const firstOpeningBracket = content.indexOf('[');
          const firstOpeningBrace = content.indexOf('{');
          const firstOpening = Math.min(
            firstOpeningBracket !== -1 ? firstOpeningBracket : Infinity,
            firstOpeningBrace !== -1 ? firstOpeningBrace : Infinity
          );
          
          if (firstOpening !== Infinity && firstOpening < lastClosing) {
            const jsonSubstring = content.substring(firstOpening, lastClosing + 1);
            return JSON.parse(jsonSubstring);
          }
        }
      } catch (secondError) {
        console.error("Second attempt at parsing JSON failed:", secondError);
      }
      
      return null;
    }
  }

  const toggleRewardExpansion = (rewardId: string) => {
    setExpandedRewards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rewardId)) {
        newSet.delete(rewardId)
      } else {
        newSet.add(rewardId)
      }
      return newSet
    })
  }

  const renderReward = (reward: any, width: string, rewardId: string) => {
    const isExpanded = expandedRewards.has(rewardId);
    
    if (!reward.programtype) {
      if (reward.voucherAmount && reward.voucherAmount > 0) {
        reward.programtype = 'voucher';
      } else {
        reward.programtype = 'points';
      }
    }
    
    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit(reward);
    };
    
    const handleUseTemplate = (e: React.MouseEvent) => {
      e.stopPropagation();
      
      if (!user?.uid) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to save rewards",
          variant: "destructive"
        });
        router.push('/login');
        return;
      }
      
      // Set the savingReward state before opening the PIN dialog
      onUseTemplate(reward);
    };

    return (
      <div className={`border rounded-lg overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md ${width}`}>
        <div 
          className="p-4 border-b cursor-pointer"
          onClick={() => toggleRewardExpansion(rewardId)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{reward.rewardName}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                reward.programtype === 'points' ? "bg-blue-50 text-blue-700 border-blue-200" :
                reward.programtype === 'voucher' ? "bg-green-50 text-green-700 border-green-200" :
                "bg-purple-50 text-purple-700 border-purple-200"
              )}>
                <div className="flex items-center gap-1">
                  {reward.programtype === 'points' ? (
                    <Award className="h-3 w-3" />
                  ) : reward.programtype === 'voucher' ? (
                    <DollarSign className="h-3 w-3" />
                  ) : (
                    <BadgeCheck className="h-3 w-3" />
                  )}
                  <span className="capitalize">{reward.programtype}</span>
                </div>
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">{reward.description}</p>
        </div>
        
        {isExpanded && (
          <>
            <div className="p-4 bg-gray-50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Award className="h-4 w-4 text-gray-500" />
                    Points Cost
                  </h4>
                  <p className="text-lg font-semibold">{reward.pointsCost}</p>
                </div>
                
                {reward.programtype === 'voucher' && reward.voucherAmount && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      Voucher Value
                    </h4>
                    <p className="text-lg font-semibold">${reward.voucherAmount}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Eye className="h-4 w-4 text-gray-500" />
                    Visibility
                  </h4>
                  <p className="text-sm font-medium capitalize">{reward.rewardVisibility}</p>
                  {reward.delayedVisibility && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDelayedVisibility(reward.delayedVisibility)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {(reward.conditions?.length > 0 || reward.limitations?.length > 0) && (
              <div className="p-4 border-t">
                {reward.conditions?.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-gray-500" />
                      Conditions
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {reward.conditions.map((condition, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-3 py-2 rounded-lg shadow-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>{formatCondition(condition)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {reward.limitations?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <Ban className="h-4 w-4 text-gray-500" />
                      Limitations
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {reward.limitations.map((limitation, i) => (
                        <div 
                          key={i}
                          className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-3 py-2 rounded-lg shadow-sm"
                        >
                          <Ban className="h-4 w-4 text-red-500" />
                          <span>{formatLimitation(limitation)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-md"
                onClick={handleEdit}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              
              <Button
                size="sm"
                className="h-9 rounded-md bg-[#007AFF] hover:bg-[#0066CC]"
                onClick={handleUseTemplate}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Use Template
              </Button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className={className}>
      {(() => {
        const extractedJson = extractJsonFromContent(content);
        
        if (extractedJson) {
          const rewards = Array.isArray(extractedJson) ? extractedJson : [extractedJson];
          
          // Remove all JSON blocks from the content before displaying
          const cleanedContent = content
            .replace(/```json\n[\s\S]*?\n```/g, '')
            // Remove excessive newlines (more than 2 consecutive)
            .replace(/\n{3,}/g, '\n\n')
            // Trim whitespace
            .trim();
          
          // Check if this is a program (multiple rewards with same programtype)
          const isProgram = rewards.length > 1 && 
            rewards.every(r => r.programtype) && 
            rewards[0].programtype === rewards[1].programtype;
          
          // If it's a program, find or create a program object
          let programObject = rewards.find(r => r.isProgram);
          
          if (isProgram && !programObject) {
            const programType = rewards[0].programtype || 'points';
            const formattedType = programType.charAt(0).toUpperCase() + programType.slice(1);
            
            programObject = {
              programName: `${formattedType} Program`,
              description: `A collection of ${rewards.length} rewards for your ${programType} program`,
              programtype: programType
            };
          }
          
          return (
            <div>
              {cleanedContent && (
                <p className="whitespace-pre-wrap leading-relaxed mb-4">
                  {cleanedContent}
                </p>
              )}
              
              <div className="space-y-4">
                {isProgram ? (
                  <ProgramCard
                    program={programObject}
                    rewards={rewards}
                    setSavingReward={onUseTemplate}
                    setPinDialogOpen={(open) => {
                      // Just use onUseTemplate to handle the reward
                      if (open) {
                        onUseTemplate(programObject);
                      }
                    }}
                    onEdit={onEdit}
                    fullProgramDataRef={fullProgramDataRef}  // Pass the ref here
                  />
                ) : (
                  rewards.map((reward, index) => {
                    const rewardId = reward.id || `reward-${index}`;
                    return (
                      <div key={rewardId}>
                        {renderReward(
                          reward, 
                          rewards.length === 1 ? "w-[500px]" : "w-[400px]",
                          rewardId
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        } else {
          return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
        }
      })()}
    </div>
  );
}

export function TapAiDialog({
  open,
  onOpenChange,
  initialPrompt = ""
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialPrompt?: string
}) {
  const { toast } = useToast()
  const [assistant, setAssistant] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [merchantName, setMerchantName] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const { customers, loading: customersLoading } = useCustomers()
  const inputRef = useRef<HTMLInputElement>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [mentionQuery, setMentionQuery] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [savingReward, setSavingRewardOriginal] = useState<any>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [createRewardData, setCreateRewardData] = useState<any>(null)
  // Add a ref to store the full program data with rewards
  const fullProgramDataRef = useRef<any>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true)

  const currentMessages = conversations.find(c => c.id === currentConversation)?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages, loading])

  useEffect(() => {
    if (open && !assistant) {
      const initializeAssistant = async () => {
        try {
          const assistantData = await getOrCreateAssistant()
          setAssistant(assistantData)
        } catch (error) {
          console.error('Error initializing assistant:', error)
          toast({
            title: "Error",
            description: "Failed to initialize AI assistant. Please try again.",
            variant: "destructive"
          })
        }
      }

      initializeAssistant()
    }
  }, [open, assistant, toast])

  useEffect(() => {
    const loadSavedConversations = async () => {
      if (!user?.uid || !assistant) return

      try {
        const chatsRef = collection(db, 'merchants', user.uid, 'chats')
        const chatsSnap = await getDocs(query(chatsRef, orderBy('updatedAt', 'desc')))
        
        const savedConversations = chatsSnap.docs.map(doc => ({
          id: doc.id,
          threadId: doc.data().threadId,
          title: doc.data().title,
          messages: doc.data().messages || [],
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt
        })) as Conversation[]

        if (savedConversations.length > 0) {
          setConversations(savedConversations)
          setCurrentConversation(savedConversations[0].id)
        } else {
          const thread = await createThread()
          const newId = Date.now().toString()
          
          const welcomeMessage = merchantName 
            ? `Hi ${merchantName}! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?`
            : "Hi! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?"
          
          const newConversation: Conversation = {
            id: newId,
            threadId: thread.id,
            title: 'New chat',
            messages: [{
              role: 'assistant',
              content: welcomeMessage
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await setDoc(
            doc(db, 'merchants', user.uid, 'chats', newId),
            newConversation
          )
          
          setConversations([newConversation])
          setCurrentConversation(newId)
        }
        } catch (error) {
        console.error('Error loading conversations:', error)
          toast({
            title: "Error",
          description: "Failed to load conversations",
            variant: "destructive"
          })
        }
      }

    if (open && user?.uid && assistant) {
      loadSavedConversations()
    }
  }, [open, user?.uid, assistant, merchantName])

  useEffect(() => {
    const fetchMerchantName = async () => {
      if (user?.uid) {
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          if (merchantDoc.exists()) {
            const data = merchantDoc.data()
            const name = data.businessName || data.storeName || data.name || ''
            console.log('Fetched merchant name:', name)
            setMerchantName(name)
          }
        } catch (error) {
          console.error('Error fetching merchant name:', error)
        }
      }
    }
    
    fetchMerchantName()
  }, [user?.uid])

  useEffect(() => {
    if (initialPrompt && open) {
      setInput(initialPrompt)
      // Optionally auto-submit the prompt
      if (initialPrompt.length > 10) {
        handleSubmit(new Event('submit') as any)
      }
    }
  }, [initialPrompt, open])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    
    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)

    const lastAtSymbol = value.lastIndexOf('@', cursorPos)
    if (lastAtSymbol !== -1 && lastAtSymbol < cursorPos) {
      const query = value.slice(lastAtSymbol + 1, cursorPos)
      setMentionQuery(query)
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
    }
  }

  const handleCustomerSelect = (customer: { id: string; fullName: string }) => {
    if (!inputRef.current) return

    const beforeMention = input.slice(0, cursorPosition)
    const afterMention = input.slice(cursorPosition)
    
    const newValue = beforeMention.slice(0, -1) + `@${customer.fullName} ` + afterMention
    setInput(newValue)
    setMentionOpen(false)

    inputRef.current.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !assistant || !currentConversation || !user?.uid) return

    const userMessage = input.trim()
    setInput('')
    setSelectedQuickAction(null)
    
    const conversation = conversations.find(c => c.id === currentConversation)
    if (!conversation) return

    const updatedMessages = [
      ...conversation.messages,
      { role: 'user', content: userMessage }
    ]

    setConversations(prev => prev.map(conv => 
      conv.id === currentConversation 
        ? {
            ...conv,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          }
        : conv
    ))
    
    try {
    setLoading(true)
      const { response, threadId } = await addMessage(conversation.threadId, userMessage)
      
      if (threadId !== conversation.threadId) {
        conversation.threadId = threadId
      }

      const aiResponse = await runAssistant(assistant.id, threadId)
      
      const finalMessages = [
        ...updatedMessages,
        { role: 'assistant', content: aiResponse }
      ]

      const updatedConversation = {
        ...conversation,
        messages: finalMessages,
        updatedAt: new Date().toISOString()
      }

      await setDoc(
        doc(db, 'merchants', user.uid, 'chats', currentConversation),
        updatedConversation,
        { merge: true }
      )
      
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation
          ? updatedConversation
          : conv
      ))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      })
      console.error('AI chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!user?.uid) return

    try {
      const updatedConversation = conversations.find(c => c.id === convId)
      if (!updatedConversation) return

      const conversationRef = doc(db, 'merchants', user.uid, 'chats', convId)
      await setDoc(conversationRef, {
        ...updatedConversation,
        title: newTitle,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, title: newTitle }
          : conv
      ))

      toast({
        title: "Success",
        description: "Conversation renamed successfully"
      })
    } catch (error) {
      console.error('Error renaming conversation:', error)
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive"
      })
    }
  }

  const handleDeleteConversation = async (convId: string) => {
    if (!user?.uid) return

    try {
      await deleteDoc(doc(db, 'merchants', user.uid, 'chats', convId))
      
      setConversations(prev => prev.filter(conv => conv.id !== convId))
      if (currentConversation === convId) {
        const remaining = conversations.filter(conv => conv.id !== convId)
        setCurrentConversation(remaining.length > 0 ? remaining[0].id : null)
        if (remaining.length === 0) {
          handleNewChat()
        }
      }

      toast({
        title: "Success",
        description: "Conversation deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      })
    }
  }

  const handleNewChat = async () => {
    if (!user?.uid || !assistant) return

    try {
      const thread = await createThread()
      const newId = Date.now().toString()
      
      const welcomeMessage = merchantName 
        ? `Hi ${merchantName}! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?`
        : "Hi! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?"
      
      const newConversation: Conversation = {
        id: newId,
        threadId: thread.id,
        title: 'New chat',
        messages: [{
          role: 'assistant',
          content: welcomeMessage
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(
        doc(db, 'merchants', user.uid, 'chats', newId),
        newConversation
      )
      
      setConversations(prev => [...prev, newConversation])
      setCurrentConversation(newId)
    } catch (error) {
      console.error('Error creating new chat:', error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      })
    }
  }

  const handleSpeechToText = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome.",
        variant: "destructive"
      })
      return
    }

    try {
      if (!recognitionRef.current) {
        const SpeechRecognition = window.webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = 'en-US'
        
        recognitionRef.current.onstart = () => {
          setIsRecording(true)
        }
        
        recognitionRef.current.onresult = (event) => {
          const lastResult = Array.from(event.results).pop()
          if (lastResult) {
            const transcript = lastResult[0].transcript
            if (lastResult.isFinal) {
              const cleanTranscript = transcript.trim()
              setInput(prev => {
                const prevClean = prev.trim()
                return prevClean ? `${prevClean} ${cleanTranscript}` : cleanTranscript
              })
            }
          }
        }
        
        recognitionRef.current.onend = () => {
          if (isRecording) {
            recognitionRef.current?.start()
          } else {
            setIsRecording(false)
          }
        }
      }

      if (isRecording) {
        setIsRecording(false)
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
      }

    } catch (error) {
      console.error('Speech recognition setup error:', error)
      toast({
        title: "Error",
        description: "Failed to initialize speech recognition.",
        variant: "destructive"
      })
      setIsRecording(false)
    }
  }

  const handleSaveWithPin = async (status: 'draft' | 'live') => {
    if (!pin.trim() || !user?.uid) {
      console.log("Missing required data:", { 
        pin: !!pin.trim(), 
        userId: !!user?.uid 
      });
      return;
    }

    try {
      setSaving(true);
      const now = Timestamp.now();
      const batch = writeBatch(db);
      
      // Check if we have program data in the ref
      const programData = fullProgramDataRef.current;
      console.log("Using data from ref:", programData);
      
      if (programData && programData.isProgram && Array.isArray(programData.rewards)) {
        console.log(`Program detected with ${programData.rewards.length} rewards`);
        console.log("Full rewards array:", JSON.stringify(programData.rewards));
        
        // Create a program ID to link all rewards
        const programId = `program-${Date.now()}`;
        console.log("Created program ID:", programId);
        
        // Get program name from the programData
        const programName = programData.programName || programData.rewardName || "Loyalty Program";
        
        // Create an array to store all the reward IDs we're creating
        const createdRewardIds = [];
        
        // Make sure we're iterating through the rewards array correctly
        const rewardsArray = Array.isArray(programData.rewards) ? programData.rewards : [];
        console.log(`Processing ${rewardsArray.length} rewards`);
        
        // Process each reward
        for (let i = 0; i < rewardsArray.length; i++) {
          const reward = rewardsArray[i];
          console.log(`Processing reward ${i+1}/${rewardsArray.length}:`, {
            name: reward.rewardName,
            description: reward.description,
            pointsCost: reward.pointsCost
          });
          
          // Generate a truly unique ID for each reward
          const uniqueTimestamp = Date.now() + i; // Add index to ensure uniqueness
          const randomSuffix = Math.floor(Math.random() * 10000);
          const rewardId = `${programId}-reward-${uniqueTimestamp}-${randomSuffix}`;
          
          console.log(`Created unique ID for reward ${i+1}:`, rewardId);
          
          const rewardData = {
            ...reward,
            pin: pin.trim(),
            createdAt: now,
            status: status,
            isActive: status === 'live',
            id: rewardId,
            merchantId: user.uid,
            updatedAt: now,
            programId: programId,
            programName: programName, // Add the program name to each reward
            category: 'individual'
          };
          
          // Save individual reward
          console.log(`Saving reward ${i+1} to Firestore:`, rewardData);
          
          const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
          batch.set(merchantRewardRef, rewardData);
          
          const globalRewardRef = doc(db, 'rewards', rewardId);
          batch.set(globalRewardRef, rewardData);
          
          const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId);
          batch.set(tapAiRewardRef, rewardData);
          
          createdRewardIds.push(rewardId);
          console.log(`Reward ${i+1} added to batch`);
        }
        
        console.log(`All ${rewardsArray.length} rewards processed. Created IDs:`, createdRewardIds);
      } else if (savingReward) {
        // Handle single reward (existing code)
        console.log("Processing single reward");
        const rewardId = Date.now().toString();
        const rewardData = {
          ...savingReward,
          pin: pin.trim(),
          createdAt: now,
          status: status,
          isActive: status === 'live',
          id: rewardId,
          merchantId: user.uid,
          updatedAt: now,
          category: 'individual'
        };
        
        const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
        batch.set(merchantRewardRef, rewardData);
        
        const globalRewardRef = doc(db, 'rewards', rewardId);
        batch.set(globalRewardRef, rewardData);
        
        const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId);
        batch.set(tapAiRewardRef, rewardData);
      } else {
        console.error("No reward data found");
        return;
      }
      
      // Commit all writes
      console.log("Committing batch to Firestore...");
      await batch.commit();
      console.log("Batch committed successfully");

      toast({
        title: "Success",
        description: savingReward ? `Reward ${status === 'draft' ? 'saved as draft' : 'published live'}` : `Program with ${programData?.rewards?.length || 0} rewards ${status === 'draft' ? 'saved as draft' : 'published live'}`,
      });
      setPinDialogOpen(false);
      setPin('');
      setSavingRewardOriginal(null);
      // Reset the ref after successful save
      fullProgramDataRef.current = null;
    } catch (error) {
      console.error('Error saving reward:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to save reward: ${(error as Error).message}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const formatConversationDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return format(date, 'h:mm a');
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return format(date, 'EEEE');
    } else {
      return format(date, 'MMM d');
    }
  };

  const handleEditReward = (reward: any) => {
    console.log("Editing reward:", reward);
    
    // Ensure conditions and limitations are arrays
    const conditions = Array.isArray(reward.conditions) ? reward.conditions : [];
    const limitations = Array.isArray(reward.limitations) ? reward.limitations : [];
    
    // Map the reward data to the format expected by CreateRewardDialog
    const editFormData = {
      rewardName: reward.rewardName || '',
      description: reward.description || '',
      type: reward.programtype || 'points', 
      rewardVisibility: reward.rewardVisibility || 'global',
      pin: '',
      pointsCost: reward.pointsCost?.toString() || '0',
      isActive: reward.isActive !== false,
      delayedVisibility: !!reward.delayedVisibility,
      delayedVisibilityType: 'transactions',
      delayedVisibilityTransactions: '',
      delayedVisibilitySpend: '',
      isTargeted: false,
      discountAmount: '0',
      itemName: '',
      voucherAmount: reward.voucherAmount?.toString() || '',
      spendThreshold: '',
      
      conditions: {
        useTransactionRequirements: false,
        useSpendingRequirements: false,
        useTimeRequirements: false,
        newCustomer: false,
        minimumTransactions: '',
        maximumTransactions: '',
        daysSinceJoined: '',
        daysSinceLastVisit: '',
        minimumLifetimeSpend: conditions.find(c => c.type === 'minimumSpend')?.amount?.toString() || '',
        minimumPointsBalance: '',
        membershipLevel: ''
      },
      
      limitations: {
        totalRedemptionLimit: limitations.find(l => l.type === 'totalRedemptionLimit')?.value?.toString() || '',
        perCustomerLimit: limitations.find(l => l.type === 'customerLimit')?.value?.toString() || '',
        useTimeRestrictions: false,
        startTime: '',
        endTime: '',
        useDayRestrictions: false,
        dayRestrictions: [],
      },
      
      hasActivePeriod: false,
      activePeriod: {
        startDate: '',
        endDate: ''
      }
    };
    
    setCreateRewardData(editFormData);
    setEditDialogOpen(true);
  };

  // Create a wrapper function that preserves program data
  const setSavingReward = (reward: any) => {
    console.log("setSavingReward called with:", JSON.stringify(reward));
    
    // Check if this is a program with rewards
    if (reward && reward.isProgram && Array.isArray(reward.rewards)) {
      console.log("Preserving program with rewards");
      
      // Create a deep copy using JSON.stringify/parse
      const rewardCopy = JSON.parse(JSON.stringify(reward));
      
      console.log("Deep copied program with rewards:", JSON.stringify(rewardCopy));
      console.log("Rewards count:", rewardCopy.rewards.length);
      
      // Set the state with the deep copy
      setSavingRewardOriginal(rewardCopy);
    } else {
      // For normal rewards, just pass it through
      setSavingRewardOriginal(reward);
    }
  };

  if (authLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] h-[90vh] flex flex-col p-0 border-0 rounded-xl overflow-hidden">
        <div className="flex h-full">
          {/* Conversations sidebar with conditional rendering based on visibility */}
          {sidebarVisible && (
            <div className="w-72 bg-gray-100 text-gray-900 p-4 flex flex-col gap-4 border-r border-gray-200">
              <Button 
                onClick={handleNewChat}
                variant="outline" 
                className="w-full justify-start gap-2 bg-white hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                New chat
              </Button>
              
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                        currentConversation === conversation.id 
                          ? "bg-gray-200" 
                          : "hover:bg-gray-100"
                      )}
                      onClick={() => setCurrentConversation(conversation.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {conversation.title || "New conversation"}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          {formatConversationDate(conversation.updatedAt)}
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 rounded-md"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40 rounded-md">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedConversation(conversation.id)
                                setNewTitle(conversation.title)
                                setRenameDialogOpen(true)
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedConversation(conversation.id)
                                setDeleteDialogOpen(true)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          )}
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col h-full relative">
            {/* Remove the absolute positioned button here */}
            
            <DialogHeader className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 mr-2"
                    onClick={() => setSidebarVisible(!sidebarVisible)}
                    title={sidebarVisible ? "Hide conversations" : "Show conversations"}
                  >
                    {sidebarVisible ? 
                      <PanelLeftClose className="h-4 w-4" /> : 
                      <PanelLeftOpen className="h-4 w-4" />
                    }
                  </Button>
                  <Sparkles className="h-4 w-4 mr-2 text-[#007AFF]" />
                  <span className="font-extrabold text-[#007AFF]">Tap</span>
                  <span>AI</span>
                  <span className="ml-1 font-normal">Assistant</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mr-8 h-7 text-xs"
                  onClick={() => window.open('https://docs.taployalty.dev/ai-assistant', '_blank')}
                >
                  <HelpCircle className="h-3 w-3" />
                  Help Guide
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-3 max-w-4xl mx-auto">
                {currentMessages.map((message, i) => (
                  <div key={i} className={cn(
                    "py-2 px-4 flex flex-col",
                    message.role === 'assistant' 
                      ? "items-start"
                      : "items-end"
                  )}>
                    <MessageContent 
                      content={message.content} 
                      user={user} 
                      onEdit={handleEditReward}
                      onUseTemplate={(reward) => {
                        console.log("onUseTemplate called with:", JSON.stringify(reward));
                        
                        // Create a deep copy to ensure we don't lose any data
                        let rewardCopy;
                        
                        if (reward && reward.isProgram && Array.isArray(reward.rewards)) {
                          console.log(`Program detected with ${reward.rewards.length} rewards`);
                          console.log("Original rewards array:", JSON.stringify(reward.rewards));
                          
                          // Create a deep copy of the rewards array
                          const rewardsDeepCopy = reward.rewards.map(r => ({...r}));
                          
                          console.log("Deep copied rewards array:", JSON.stringify(rewardsDeepCopy));
                          console.log("Deep copied rewards array length:", rewardsDeepCopy.length);
                          
                          // Create a new program object with the deep copied rewards
                          rewardCopy = {
                            ...reward,
                            rewards: rewardsDeepCopy,
                            isProgram: true
                          };
                          
                          console.log("Final program object to save:", JSON.stringify(rewardCopy));
                          
                          // Store in ref instead of state for programs
                          if (fullProgramDataRef) {
                            fullProgramDataRef.current = rewardCopy;
                          }
                        } else {
                          // For single rewards
                          rewardCopy = {...reward};
                          console.log("Single reward to save:", JSON.stringify(rewardCopy));
                        }
                        
                        // Set the reward to be saved
                        setSavingReward(rewardCopy);
                        setPinDialogOpen(true);
                      }}
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl",
                        message.role === 'user' 
                          ? "bg-[#007AFF] text-white"
                          : "bg-gray-50 text-gray-700"
                      )}
                      fullProgramDataRef={fullProgramDataRef}  // Pass the ref here
                    />
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="relative h-6 w-12">
                      <div className="absolute left-0 h-2 w-2 bg-[#007AFF] rounded-full animate-typing1" />
                      <div className="absolute left-4 h-2 w-2 bg-[#007AFF] rounded-full animate-typing2" />
                      <div className="absolute left-8 h-2 w-2 bg-[#007AFF] rounded-full animate-typing3" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="px-4 py-6 border-t border-gray-100 max-w-4xl mx-auto w-full">
              <form onSubmit={handleSubmit}>
                <div className="flex-1 relative">
                  <div className="relative h-32 bg-[#F3F3F3] rounded-2xl">
                    <textarea
                      ref={inputRef as any}
                  placeholder="Message TapAI..."
                  value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e as any)
                        }
                      }}
                      className="w-full h-full pl-4 pr-24 pt-4 pb-16 bg-transparent border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-200 text-gray-900 placeholder:text-gray-500 transition-all"
                    />
                    
                    {isRecording && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-[#007AFF]">
                        <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
                        <span className="text-xs font-medium">Listening...</span>
                      </div>
                    )}

                    {mentionOpen && (
                      <div className="absolute bottom-20 left-4 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                        {customers.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No customers found
                          </div>
                        ) : (
                          customers
                            .filter(customer => 
                              customer.fullName.toLowerCase().includes(mentionQuery.toLowerCase())
                            )
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="w-6 h-6 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] text-xs font-medium">
                                  {customer.fullName.charAt(0)}
                                </div>
                                <span>{customer.fullName}</span>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    <div className="absolute left-4 bottom-4 flex items-center gap-2">
                <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'individual' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create an individual reward")
                          setSelectedQuickAction('individual')
                        }}
                      >
                        <Gift className="h-4 w-4" />
                        <span className="text-sm">Individual</span>
                </Button>
                  <Button
                        type="button"
                        variant="ghost"
                    size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'recurring' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create a recurring reward")
                          setSelectedQuickAction('recurring')
                        }}
                      >
                        <Repeat className="h-4 w-4" />
                        <span className="text-sm">Recurring</span>
                  </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'any' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create any type of reward")
                          setSelectedQuickAction('any')
                        }}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        <span className="text-sm">Any</span>
                      </Button>
              </div>

                    <div className="absolute right-2 bottom-4 flex items-center gap-2">
                      <Button 
                        type="button"
                        onClick={handleSpeechToText}
                        className={cn(
                          "rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all duration-200",
                          isRecording 
                            ? "bg-[#007AFF] hover:bg-[#0066CC] text-white"
                            : "bg-[#F3F3F3] hover:bg-gray-200 text-gray-700"
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                        className="bg-[#F3F3F3] hover:bg-gray-200 rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                >
                        <Send className="h-4 w-4 text-gray-700" />
                </Button>
            </div>
          </div>
        </div>
              </form>
            </div>
          </div>
        </div>

        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Rename conversation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new name"
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
                  <Button
                    variant="outline"
                onClick={() => setRenameDialogOpen(false)}
                  >
                Cancel
                  </Button>
              <Button
                onClick={() => {
                  if (selectedConversation && newTitle.trim()) {
                    handleRenameConversation(selectedConversation, newTitle.trim())
                    setRenameDialogOpen(false)
                    setNewTitle("")
                    setSelectedConversation(null)
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this conversation. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedConversation) {
                    handleDeleteConversation(selectedConversation)
                    setDeleteDialogOpen(false)
                    setSelectedConversation(null)
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Enter PIN Code</DialogTitle>
              <DialogDescription>
                This PIN will be required when customers redeem the reward.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                type="number"
                maxLength={4}
                className="mt-2"
                autoFocus
              />
              </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setPinDialogOpen(false)
                  setPin('')
                  setSavingReward(null)
                }}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSaveWithPin('draft')}
                  disabled={!pin.trim() || saving}
                  className="flex-1"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Saving...
            </div>
                  ) : (
                    'Save as Draft'
                  )}
                </Button>
                <Button
                  onClick={() => handleSaveWithPin('live')}
                  disabled={!pin.trim() || saving}
                  className="flex-1 bg-[#007AFF] hover:bg-[#0066CC]"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publishing...
          </div>
                  ) : (
                    'Go Live Now'
                  )}
                </Button>
        </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CreateRewardDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          defaultValues={createRewardData}
        />
      </DialogContent>
    </Dialog>
  )
} 