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
import { Sparkles, Send, Plus, Settings, MessageSquare, ChevronDown, ChevronUp, HelpCircle, CheckCircle, Edit, MoreHorizontal, Pencil, Trash2, Gift, Repeat, Sparkles as SparklesIcon, DollarSign, Calendar, Clock, Users, Award, History, Timer, Wallet, BadgeCheck, CalendarRange, UserCheck, Ban, Mic, MicOff, Eye, Coffee, PanelLeftClose, PanelLeftOpen, Loader2 } from "lucide-react"
import { getAIResponse } from "@/lib/openai"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  getOrCreateAssistant, 
  createThread, 
  addMessage, 
  runAssistant,
  getMessages,
  talkToAssistant
} from "@/lib/assistant"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, deleteDoc, writeBatch, Timestamp, where, updateDoc } from "firebase/firestore"
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
import { Textarea } from "@/components/ui/textarea"

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
  programtype: 'voucher' | 'points' | 'discount' | 'general'
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

// Add this near your other interfaces
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: (event: any) => void
  onerror: (event: any) => void
  onend: () => void
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

// Updated function to detect and parse JSON in messages
const parseMessageContent = (content: string) => {
  // Try different JSON formats
  
  // Format 1: ```json\n{...}\n```
  const jsonRegex1 = /```json\n([\s\S]*?)\n```/;
  // Format 2: ```\n{...}\n```
  const jsonRegex2 = /```\n([\s\S]*?)\n```/;
  // Format 3: ```{...}```
  const jsonRegex3 = /```([\s\S]*?)```/;
  // Format 4: Plain JSON with curly braces
  const jsonRegex4 = /(\{[\s\S]*?\})/;
  
  // Try each regex pattern in order
  for (const regex of [jsonRegex1, jsonRegex2, jsonRegex3, jsonRegex4]) {
    const match = content.match(regex);
    
    if (match && match[1]) {
      try {
        // Try to parse the potential JSON
        const jsonText = match[1].trim();
        const jsonData = JSON.parse(jsonText);
        
        // If it's valid JSON with required reward fields
        if (jsonData && typeof jsonData === 'object' && jsonData.rewardName) {
          // Split the message into parts
          const parts = content.split(match[0]);
          
          return {
            hasJson: true,
            beforeJson: parts[0]?.trim() || '',
            jsonData,
            afterJson: parts[1]?.trim() || ''
          };
        }
      } catch (error) {
        console.log(`Failed to parse JSON with regex ${regex}:`, error);
        // Continue to the next pattern
      }
    }
  }
  
  // If no JSON or parsing failed, return the original content
  return {
    hasJson: false,
    content
  };
};

// Now, let's create a component to render the reward card
const RewardCard = ({ reward }: { reward: any }) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Helper function to format condition text
  const formatCondition = (condition: any) => {
    switch (condition.type) {
      case 'visitCount':
        return `After ${condition.value} visits`;
      case 'spendAmount':
        return `After spending $${condition.amount || condition.value}`;
      case 'pointsBalance':
        return `When customer has ${condition.value} points`;
      case 'birthday':
        return 'On customer birthday';
      case 'firstVisit':
        return 'On first visit';
      case 'specificProduct':
        return `When purchasing ${condition.value}`;
      case 'specificCategory':
        return `When purchasing from ${condition.value} category`;
      case 'timeOfDay':
        return `During ${condition.value} hours`;
      case 'minimumSpend':
        return `Minimum spend of $${condition.amount || condition.value}`;
      case 'minimumLifetimeSpend':
        return `Total lifetime spend of $${condition.value}`;
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`;
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`;
      case 'minimumPointsBalance':
        return `Minimum ${condition.value} points balance`;
      case 'membershipLevel':
        return `${condition.value} membership level required`;
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`;
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`;
      default:
        return `${condition.type}: ${condition.value || condition.amount || 'enabled'}`;
    }
  };
  
  // Helper function to format limitation text
  const formatLimitation = (limitation: any) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `Limited to ${limitation.value} per customer`;
      case 'totalRedemptionLimit':
        return `Limited to ${limitation.value} total redemptions`;
      case 'expiryDate':
        return `Expires on ${new Date(limitation.value).toLocaleDateString()}`;
      case 'daysOfWeek':
        return `Available on ${Array.isArray(limitation.value) ? limitation.value.join(', ') : limitation.value}`;
      case 'timeOfDay':
        const times = limitation.value as any;
        return `Available from ${times.startTime || '00:00'} to ${times.endTime || '23:59'}`;
      case 'activePeriod':
        const dates = limitation.value as any;
        const startDate = dates.startDate ? new Date(dates.startDate).toLocaleDateString() : 'now';
        const endDate = dates.endDate ? new Date(dates.endDate).toLocaleDateString() : 'forever';
        return `Valid from ${startDate} to ${endDate}`;
      default:
        // Handle complex objects better
        if (typeof limitation.value === 'object' && limitation.value !== null) {
          try {
            // Try to format the object in a more readable way
            const formattedParts = [];
            for (const [key, value] of Object.entries(limitation.value)) {
              if (key.includes('Date') && typeof value === 'string') {
                // Format dates
                formattedParts.push(`${key}: ${new Date(value).toLocaleDateString()}`);
              } else if (key.includes('Time') && typeof value === 'string') {
                // Format times
                formattedParts.push(`${key}: ${value}`);
              } else {
                formattedParts.push(`${key}: ${value}`);
              }
            }
            return `${limitation.type}: ${formattedParts.join(', ')}`;
          } catch (e) {
            return `${limitation.type}: ${JSON.stringify(limitation.value)}`;
          }
        }
        return `${limitation.type}: ${limitation.value}`;
    }
  };

  // Get the appropriate icon based on program type
  const getProgramIcon = () => {
    switch (reward.programtype) {
      case 'coffee':
        return <Coffee className="h-5 w-5" />;
      case 'points':
        return <Award className="h-5 w-5" />;
      case 'voucher':
        return <Gift className="h-5 w-5" />;
      case 'discount':
        return <DollarSign className="h-5 w-5" />;
      case 'general':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  // Count conditions and limitations
  const conditionsCount = reward.conditions?.length || 0;
  const limitationsCount = reward.limitations?.length || 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header - Clickable to expand/collapse */}
      <div 
        className="p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF]">
              {getProgramIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{reward.rewardName}</h3>
              <p className="text-sm text-gray-500">{reward.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-[#007AFF]">
              {reward.pointsCost} points
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
      </div>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          {/* Reward details summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {reward.voucherAmount && (
              <div className="bg-white rounded-lg p-3 flex items-center shadow-sm">
                <Gift className="h-4 w-4 text-[#007AFF] mr-2" />
                <div>
                  <div className="text-xs text-gray-500">Voucher Amount</div>
                  <div className="font-medium">${reward.voucherAmount}</div>
                </div>
              </div>
            )}

            {reward.delayedVisibility && (
              <div className="bg-white rounded-lg p-3 flex items-center shadow-sm">
                <Clock className="h-4 w-4 text-[#007AFF] mr-2" />
                <div>
                  <div className="text-xs text-gray-500">Delayed Visibility</div>
                  <div className="font-medium">{reward.delayedVisibility.value} {reward.delayedVisibility.type}</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Conditions */}
          {conditionsCount > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Conditions ({conditionsCount})
              </h4>
              <div className="space-y-2">
                {reward.conditions.map((condition: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-3 flex items-start shadow-sm">
                    <div className="h-5 w-5 flex items-center justify-center mr-2 text-[#007AFF]">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-gray-700">{formatCondition(condition)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {limitationsCount > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Limitations ({limitationsCount})
              </h4>
              <div className="space-y-2">
                {reward.limitations.map((limitation: any, index: number) => (
                  <div key={index} className="bg-white rounded-lg p-3 flex items-start shadow-sm">
                    <div className="h-5 w-5 flex items-center justify-center mr-2 text-amber-500">
                      <Ban className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-gray-700">{formatLimitation(limitation)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(JSON.stringify(reward, null, 2));
                toast({
                  title: "Copied to clipboard",
                  description: "Reward JSON copied to clipboard",
                  duration: 3000
                });
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Copy JSON
            </Button>
            <Button
              size="sm"
              className="bg-[#007AFF] hover:bg-[#0066CC] text-white text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setCreateRewardData(reward);
                setEditDialogOpen(true);
              }}
            >
              <Gift className="h-3 w-3 mr-1" />
              Use This Reward
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

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
  // Add or ensure these state variables are defined
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [recognitionInstance, setRecognitionInstance] = useState<SpeechRecognition | null>(null)
  // First, let's define a simpler state for messages
  const [localMessages, setLocalMessages] = useState<Array<{role: string, content: string}>>([]);

  const currentMessages = conversations.find(c => c.id === currentConversation)?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages, loading])

  useEffect(() => {
    if (open) {
      // Initialize the conversation when the dialog opens
      initializeConversation();
    }
  }, [open]);

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

  useEffect(() => {
    if (open && user) {
      loadConversations();
    }
  }, [open, user]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

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

  const handleSendMessageWithFallback = async (content: string) => {
    try {
      await handleSendMessage(content);
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Add a fallback message if the API call fails
      const userMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: { value: content } }],
        created_at: Date.now()
      };
      
      const fallbackMessage = {
        id: `fallback-${Date.now()}`,
        role: 'assistant',
        content: [{ 
          type: 'text', 
          text: { 
            value: "I'm sorry, I'm having trouble connecting to the server. Please try again in a moment." 
          } 
        }],
        created_at: Date.now() + 1000
      };
      
      setMessages(prev => [...prev, userMessage, fallbackMessage]);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit called with input:', input);
    
    if (input.trim() && !isLoading) {
    const message = input.trim();
    setInput('');
      sendMessageToAPI(message);
    }
  };

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

  const handleDeleteConversation = async (conversationId: string) => {
    console.log('Deleting conversation:', conversationId);
    
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'conversations', conversationId));
      
      // Update local state
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // If the deleted conversation was the current one, reset the state
      if (currentConversation === conversationId) {
        setCurrentConversation(null);
        setThreadId(null);
        setLocalMessages([]);
        
        // If there are other conversations, load the most recent one
        if (conversations.length > 1) {
          const nextConversation = conversations.find(conv => conv.id !== conversationId);
          if (nextConversation) {
            loadConversation(nextConversation.id);
          }
        }
      }

      toast({
        title: "Conversation deleted",
        description: "The conversation has been permanently deleted.",
        duration: 3000
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
        duration: 3000
      });
    }
  };

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

  const initializeConversation = async () => {
    console.log('initializeConversation called');
    
    try {
      // If we already have a threadId, use it
      if (threadId) {
        console.log('Current threadId:', threadId);
      return;
    }
    
      console.log('No threadId, creating new thread');
      
      // Create a simple first message to initialize the thread
      const initialMessage = "Hello, I'm ready to help with your loyalty program.";
      
      // Use talkToAssistant to create a thread and get initial response
      const response = await talkToAssistant(initialMessage);
      
      console.log('Initial conversation created with threadId:', response.threadId);
      
      // Set the threadId for future messages
      if (response.threadId) {
        setThreadId(response.threadId);
      }
      
      // Add the initial messages to the UI
      setLocalMessages([
        { role: 'assistant', content: response.content }
      ]);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setError('Failed to initialize conversation. Please try again.');
    }
  };

  const loadMessages = async () => {
    if (!threadId) {
      console.log('loadMessages: No threadId, cannot load messages');
      return;
    }
    
    console.log('loadMessages: Loading messages for threadId', threadId);
    setIsLoading(true);
    
    try {
      // Try to get messages from the imported function
      const messagesData = await getMessages(threadId);
      console.log('loadMessages: Loaded messages', messagesData.length);
      setMessages(messagesData);
    } catch (error) {
      console.error("Error loading messages:", error);
      setError("Failed to load messages. Please try again.");
      
      // Fallback to localStorage if the imported function fails
      try {
        const storageKey = `thread_${threadId}_messages`;
        const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
        console.log('loadMessages: Fallback to localStorage, found messages:', storedMessages.length);
        setMessages(storedMessages);
      } catch (e) {
        console.error('loadMessages: Fallback to localStorage failed', e);
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    console.log('handleSendMessage called with:', content);
    console.log('Current threadId:', threadId);
    
    if (!threadId || !content.trim()) {
      console.log('Cannot send message: threadId or content missing');
      return;
    }
    
    setIsLoading(true);
    setInput("");
    
    try {
      console.log('Adding user message to UI');
      // Add the user message to the UI immediately
      const userMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: { value: content } }],
        created_at: Date.now()
      };
      
      setMessages(prev => {
        console.log('Previous messages:', prev);
        return [...prev, userMessage];
      });
      
      console.log('Sending message to API');
      // Send the message to the API
      const { run, assistantMessage } = await addMessage(threadId, content);
      console.log('Message sent, run created:', run);
      console.log('Assistant message:', assistantMessage);
      
      // Add the assistant's response to the UI
      if (assistantMessage) {
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // If no assistant message, load messages from storage
        await loadMessages();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
      
      // Add a fallback message if the API call fails
      const fallbackMessage = {
        id: `fallback-${Date.now()}`,
        role: 'assistant',
        content: [{ 
          type: 'text', 
          text: { 
            value: "I'm sorry, I'm having trouble connecting to the server. Please try again in a moment." 
          } 
        }],
        created_at: Date.now()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Add this function to your component
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  // Add this function to your component
  const getMessages = async (threadId: string) => {
    console.log('getMessages: Getting messages from thread', threadId);
    
    try {
      // Try to get messages from localStorage
      const storageKey = `thread_${threadId}_messages`;
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      if (storedMessages.length > 0) {
        console.log('getMessages: Retrieved messages from localStorage', storedMessages.length);
        return storedMessages;
      }
      
      // If no messages in localStorage, return an empty array
      console.log('getMessages: No messages found for thread');
      return [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  };

  // Add this near your debug button
  const debugLocalStorage = () => {
    try {
      if (!threadId) {
        console.log('No threadId to check localStorage');
        return;
      }
      
      const storageKey = `thread_${threadId}_messages`;
      const storedMessages = JSON.parse(localStorage.getItem(storageKey) || '[]');
      console.log('Messages in localStorage:', storedMessages);
      
      // Check all localStorage keys
      const allKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
      }
      console.log('All localStorage keys:', allKeys);
      
      // Check if there are any thread-related keys
      const threadKeys = allKeys.filter(key => key?.startsWith('thread_'));
      console.log('Thread-related localStorage keys:', threadKeys);
      
      // Log the content of each thread key
      threadKeys.forEach(key => {
        try {
          const content = JSON.parse(localStorage.getItem(key) || '[]');
          console.log(`Content of ${key}:`, content);
        } catch (e) {
          console.error(`Error parsing content of ${key}:`, e);
        }
      });
    } catch (e) {
      console.error('Error debugging localStorage:', e);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          console.log("Speech recognition stopped")
        } catch (error) {
          console.error("Error stopping speech recognition:", error)
        }
      }
      setIsRecording(false)
    } else {
      // Start recording
      if (!recognitionRef.current) {
        // Initialize speech recognition if not already done
        // @ts-ignore
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRecognition) {
          console.error("Speech recognition not supported in this browser")
          toast({
            title: "Not Supported",
            description: "Speech recognition is not supported in your browser.",
            variant: "destructive"
          })
          return
        }
        
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = true
        
        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('')
          
          console.log("Transcript:", transcript)
          setInput(transcript)
        }
        
        recognition.onend = () => {
          console.log("Speech recognition ended")
          setIsRecording(false)
        }
        
        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error)
          setIsRecording(false)
          toast({
            title: "Error",
            description: `Speech recognition error: ${event.error}`,
            variant: "destructive"
          })
        }
        
        recognitionRef.current = recognition
      }
      
      // Start the recognition
      try {
        recognitionRef.current.start()
        console.log("Speech recognition started")
        setIsRecording(true)
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        toast({
          title: "Error",
          description: "Failed to start speech recognition. Please try again.",
          variant: "destructive"
        })
      }
    }
  }

  // Add this useEffect
  useEffect(() => {
    return () => {
      // Clean up speech recognition on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.error("Error stopping speech recognition on unmount:", e)
        }
      }
    }
  }, [])

  // Add this function near your other functions in the component
  const sendMessageToAPI = async (message: string) => {
    console.log('sendMessageToAPI: Starting with message:', message);
    setIsLoading(true);
    
    // Add user message to local state immediately
    const updatedMessages = [...localMessages, { role: 'user', content: message }];
    setLocalMessages(updatedMessages);
    
    try {
      // Use the talkToAssistant function
      const response = await talkToAssistant(message, threadId);
      
      console.log('API response:', response);
      
      // Save the threadId for future messages
      if (response.threadId) {
        setThreadId(response.threadId);
      }
      
      // Add AI response to local messages
      const finalMessages = [...updatedMessages, { role: 'assistant', content: response.content }];
      setLocalMessages(finalMessages);
      
      // If we have a current conversation, update it in Firestore
      if (currentConversation) {
        await updateConversationInFirestore(currentConversation, finalMessages, response.threadId);
      } else {
        // Create a new conversation if we don't have one
        await createNewConversationWithMessages(finalMessages, response.threadId);
      }
    } catch (error) {
      console.error('Error:', error);
      
      // Add error message to local state
      const errorMessages = [...updatedMessages, { 
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.' 
      }];
      setLocalMessages(errorMessages);
      
      // Still update Firestore with the error message
      if (currentConversation) {
        await updateConversationInFirestore(currentConversation, errorMessages, threadId);
      }
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  // Update any other event handlers that might be sending messages
  // For example, if there's a quick action button:

  const handleQuickAction = (action: string) => {
    if (isLoading) return;
    
    console.log('handleQuickAction called with:', action);
    sendMessageToAPI(action);
  };

  // Add these functions to handle conversation management with Firestore

  // Create a new conversation
  const createNewConversation = async () => {
    console.log('Creating new conversation');
    setIsLoading(true);
    
    try {
      // Reset the local state
      setLocalMessages([]);
      setThreadId(null);
      
      // Create a new thread via the assistant API
      const initialMessage = "Hello, I'm ready to help with your loyalty program.";
      const response = await talkToAssistant(initialMessage);
      
      if (!response.threadId) {
        throw new Error('Failed to create thread');
      }
      
      // Create a new conversation document in Firestore
      const newConversationId = `conv_${Date.now()}`;
      const newConversation = {
        id: newConversationId,
        threadId: response.threadId,
        title: 'New Conversation',
        messages: [
          { role: 'assistant', content: response.content }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.uid
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'conversations', newConversationId), newConversation);
      
      // Update local state
      setThreadId(response.threadId);
      setCurrentConversation(newConversationId);
      setLocalMessages([{ role: 'assistant', content: response.content }]);
      
      // Update conversations list
      setConversations(prev => [newConversation, ...prev]);
      
      console.log('New conversation created:', newConversationId);
    } catch (error) {
      console.error('Error creating new conversation:', error);
      setError('Failed to create new conversation');
    } finally {
      setIsLoading(false);
    }
  };

  // Load conversations from Firestore
  const loadConversations = async () => {
    console.log('Loading conversations from Firestore');
    
    if (!user) {
      console.log('No user, cannot load conversations');
      return;
    }
    
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef, 
        where('userId', '==', user.uid),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const loadedConversations: Conversation[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Conversation;
        loadedConversations.push(data);
      });
      
      console.log('Loaded conversations:', loadedConversations.length);
      setConversations(loadedConversations);
      
      // If there are conversations, select the most recent one
      if (loadedConversations.length > 0) {
        setCurrentConversation(loadedConversations[0].id);
        setThreadId(loadedConversations[0].threadId);
        setLocalMessages(loadedConversations[0].messages);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  // Load a specific conversation
  const loadConversation = async (conversationId: string) => {
    console.log('Loading conversation:', conversationId);
    setIsLoading(true);
    
    try {
      const conversationDoc = await getDoc(doc(db, 'conversations', conversationId));
      
      if (conversationDoc.exists()) {
        const conversationData = conversationDoc.data() as Conversation;
        setCurrentConversation(conversationId);
        setThreadId(conversationData.threadId);
        setLocalMessages(conversationData.messages);
      } else {
        console.error('Conversation not found:', conversationId);
        setError('Conversation not found');
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      setError('Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update a conversation in Firestore
  const updateConversationInFirestore = async (
    conversationId: string, 
    messages: any[], 
    threadId: string | null
  ) => {
    try {
      // Get the first few words of the first user message for the title
      let title = 'New Conversation';
      const userMessage = messages.find(m => m.role === 'user');
      if (userMessage) {
        const words = userMessage.content.split(' ').slice(0, 5).join(' ');
        title = words + (words.length < userMessage.content.length ? '...' : '');
      }
      
      // Update the conversation in Firestore
      await setDoc(doc(db, 'conversations', conversationId), {
        id: conversationId,
        threadId: threadId,
        title: title,
        messages: messages,
        updatedAt: new Date().toISOString(),
        userId: user?.uid
      }, { merge: true });
      
      // Update the conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { 
                ...conv, 
                messages, 
                title, 
                updatedAt: new Date().toISOString() 
              } 
            : conv
        )
      );
    } catch (error) {
      console.error('Error updating conversation in Firestore:', error);
    }
  };

  // Helper function to create a new conversation with messages
  const createNewConversationWithMessages = async (messages: any[], threadId: string | null) => {
    try {
      // Get the first few words of the first user message for the title
      let title = 'New Conversation';
      const userMessage = messages.find(m => m.role === 'user');
      if (userMessage) {
        const words = userMessage.content.split(' ').slice(0, 5).join(' ');
        title = words + (words.length < userMessage.content.length ? '...' : '');
      }
      
      // Create a new conversation ID
      const newConversationId = `conv_${Date.now()}`;
      
      // Create the conversation document
      const newConversation = {
        id: newConversationId,
        threadId: threadId,
        title: title,
        messages: messages,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: user?.uid
      };
      
      // Save to Firestore
      await setDoc(doc(db, 'conversations', newConversationId), newConversation);
      
      // Update local state
      setCurrentConversation(newConversationId);
      
      // Update conversations list
      setConversations(prev => [newConversation, ...prev]);
      
      console.log('New conversation created with messages:', newConversationId);
    } catch (error) {
      console.error('Error creating new conversation with messages:', error);
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
          {/* Conversations sidebar */}
          {sidebarVisible && (
            <div className="w-64 border-r border-gray-200 h-full flex flex-col">
              <div className="p-3 border-b border-gray-200">
              <Button 
                  onClick={createNewConversation} 
                  className="w-full justify-start gap-2 bg-[#007AFF] hover:bg-[#0066CC] text-white"
                  disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                  New Chat
              </Button>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                  {conversations.map((conversation) => (
                    <div key={conversation.id} className="relative group">
                      <Button
                        variant={currentConversation === conversation.id ? "secondary" : "ghost"}
                        className="w-full justify-start text-left truncate h-auto py-2 pr-8"
                        onClick={() => loadConversation(conversation.id)}
                      >
                        <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{conversation.title}</span>
                      </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                            <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                              onClick={(e) => {
                              e.stopPropagation();
                              setSelectedConversation(conversation.id);
                              handleDeleteConversation(conversation.id);
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  ))}
                  
                  {conversations.length === 0 && (
                    <div className="text-center text-gray-500 p-4">
                      No conversations yet
                    </div>
                  )}
                </div>
              </ScrollArea>
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

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Remove this debug information block */}
              {/* <div className="text-xs text-gray-400 mb-2">
                Local messages count: {localMessages.length}
              </div> */}
              
              {/* Display local messages */}
              {localMessages.map((message, index) => {
                const parsedContent = parseMessageContent(message.content);
                
                return (
                  <div 
                    key={index} 
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] ${
                        message.role === 'user' 
                          ? 'bg-blue-500 text-white p-3 rounded-lg' 
                          : parsedContent.hasJson 
                            ? 'bg-transparent' 
                            : 'bg-gray-200 text-gray-900 p-3 rounded-lg'
                      }`}
                    >
                      {parsedContent.hasJson ? (
                        <div>
                          {parsedContent.beforeJson && (
                            <div className="bg-gray-200 text-gray-900 p-3 rounded-lg mb-2 whitespace-pre-wrap">
                              {parsedContent.beforeJson}
                          </div>
                          )}
                          
                          <RewardCard reward={parsedContent.jsonData} />
                          
                          {parsedContent.afterJson && (
                            <div className="bg-gray-200 text-gray-900 p-3 rounded-lg mt-2 whitespace-pre-wrap">
                              {parsedContent.afterJson}
                  </div>
                          )}
                </div>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Show a message if there are no messages */}
              {localMessages.length === 0 && !isLoading && (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center text-gray-500">
                    <p>No messages yet. Start a conversation!</p>
                  </div>
                </div>
              )}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-center">
                  <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 border-t border-gray-100 max-w-4xl mx-auto w-full">
              <form onSubmit={handleSubmit} className="relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[80px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-gray-300 pr-20"
                  disabled={loading || isLoading}
                />
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={toggleRecording}
                    className={cn(
                      "h-8 w-8 rounded-full transition-all duration-200",
                      isRecording 
                        ? "bg-blue-100 text-blue-500" 
                        : "hover:bg-gray-100"
                    )}
                    disabled={loading || isLoading}
                  >
                    <Mic className={cn(
                      "h-4 w-4",
                      isRecording && "animate-[pulse_2s_ease-in-out_infinite]"
                    )} />
                  </Button>
                  <Button 
                    type="submit" 
                    size="icon"
                    className="h-8 w-8"
                    disabled={!input.trim() || loading || isLoading}
                  >
                    {loading || isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
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