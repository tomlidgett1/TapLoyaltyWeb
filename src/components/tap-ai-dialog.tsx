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
import { Sparkles, Send, Plus, Settings, MessageSquare, ChevronDown, ChevronUp, HelpCircle, CheckCircle, Edit, MoreHorizontal, Pencil, Trash2, Gift, Repeat, Sparkles as SparklesIcon, DollarSign, Calendar, Clock, Users, Award, History, Timer, Wallet, BadgeCheck, CalendarRange, UserCheck, Ban, Mic, MicOff, Eye, Coffee, PanelLeftClose, PanelLeftOpen, Loader2, Copy } from "lucide-react"
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
import { BannerPreview, BannerStyle, BannerVisibility } from "@/components/banner-preview"
import { CreateBannerDialog } from "@/components/create-banner-dialog"

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

// Enhance the debugging function to log more details
const debugJsonParsing = (content: string) => {
  console.log("Content to parse:", content);
  
  // Try to extract JSON objects with a simple regex
  const jsonRegex = /\{[\s\S]*?\}/g;
  const matches = content.match(jsonRegex);
  
  console.log("JSON matches found:", matches?.length || 0);
  
  if (matches) {
    matches.forEach((match, index) => {
      console.log(`Match ${index}:`, match);
      try {
        const parsed = JSON.parse(match);
        console.log(`Parsed object ${index}:`, parsed);
        console.log(`Has rewardName:`, !!parsed.rewardName);
        
        // Check if it has a rewards array
        if (parsed.rewards && Array.isArray(parsed.rewards)) {
          console.log(`Has rewards array with ${parsed.rewards.length} items`);
        }
      } catch (e) {
        console.log(`Failed to parse match ${index}:`, e);
      }
    });
  }
};

// Add this function after your other helper functions (like parseMessageContent)
const isBannerData = (data: any): boolean => {
  return data && 
    typeof data === 'object' && 
    data.bannerAction !== undefined && 
    data.title !== undefined;
};

// Update the parseMessageContent function with better cleaning
const parseMessageContent = (content: string) => {
  // Remove any standalone array brackets with commas that might appear in the text
  const cleanContent = content.replace(/\[\s*,\s*,\s*\]/g, '').trim();
  
  try {
    // Check for JSON in code blocks (```json ... ```)
    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
    const codeBlockMatches = Array.from(cleanContent.matchAll(codeBlockRegex));
    
    if (codeBlockMatches.length > 0) {
      console.log("Found JSON code blocks:", codeBlockMatches.length);
      const jsonObjects = [];
      
      // Extract JSON from each code block
      for (const match of codeBlockMatches) {
        try {
          const jsonString = match[1].trim();
          const parsed = JSON.parse(jsonString);
          if (parsed && typeof parsed === 'object') {
            if (parsed.rewards && Array.isArray(parsed.rewards)) {
              console.log("Found rewards array with", parsed.rewards.length, "rewards");
            }
            jsonObjects.push(parsed);
          }
        } catch (e) {
          console.error("Failed to parse JSON from code block:", e);
        }
      }
      
      if (jsonObjects.length > 0) {
        // Split content by code blocks to get text before and after
        const parts = cleanContent.split(/```json[\s\S]*?```/);
        const beforeJson = parts[0].trim();
        const afterJson = parts.slice(1).join('').trim();
        
        // We'll add a more specific check for reward programs in the parseMessageContent function
        // This code should be placed immediately before the return statement in jsonObjects.length > 0 case

        // Special handling for programs with rewards arrays
        const programWithRewards = jsonObjects.find(obj => 
          obj.rewards && Array.isArray(obj.rewards) && obj.rewards.length > 0
        );

        if (programWithRewards) {
          console.log("Found program with rewards array:", programWithRewards.rewards.length);
          
          // Process this program specifically
          return {
            hasJson: true,
            beforeJson: cleanedContent,
            jsonData: programWithRewards,
            jsonObjects: [programWithRewards], // Just include this program
            multipleJson: false, // Handle it as a single special object
            isRewardProgram: true,
            afterJson: ''
          };
        }
        
        return {
          hasJson: true,
          beforeJson: beforeJson ? beforeJson.replace(/\[\s*,\s*,\s*\]/g, '').trim() : '',
          jsonData: jsonObjects[0], // For backward compatibility
          jsonObjects: jsonObjects,
          multipleJson: jsonObjects.length > 1,
          afterJson: afterJson ? afterJson.replace(/\[\s*,\s*,\s*\]/g, '').trim() : ''
        };
      }
    }
    
    // Try extracting JSON objects directly with a more comprehensive approach
    // Use a regex that can handle nested structures better
    const jsonObjectRegex = /\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\}))*\}))*\}/g;
    const matches = cleanContent.match(jsonObjectRegex);
    
    if (matches && matches.length > 0) {
      console.log("Found potential JSON objects:", matches.length);
      const jsonObjects = [];
      
      for (const match of matches) {
        try {
          const parsed = JSON.parse(match);
          if (parsed && typeof parsed === 'object') {
            if ((parsed.rewardName) || 
                (parsed.rewards && Array.isArray(parsed.rewards)) || 
                isBannerData(parsed)) {
              jsonObjects.push(parsed);
            }
          }
        } catch (e) {
          console.error("Failed to parse potential JSON:", e);
        }
      }
      
      if (jsonObjects.length > 0) {
        // More aggressive cleaning of JSON fragments
        let cleanedContent = cleanContent;
        
        // Replace complete JSON objects
        for (const match of matches) {
          cleanedContent = cleanedContent.replace(match, '');
        }
        
        // Clean up additional JSON fragments that might remain
        cleanedContent = cleanedContent
          .replace(/\{\s*"conversation":[^}]*"rewards"\s*:\s*\[\s*,\s*\]\s*\}/g, '')
          .replace(/\{\s*"conversation":[^}]*"rewards"\s*:\s*\[/g, '')
          .replace(/\{\s*"conversation":[^}]*\}/g, '')
          .replace(/\[\s*,\s*\]/g, '')
          .replace(/\{\s*"rewards"\s*:\s*\[\s*,\s*\]\s*\}/g, '')
          .replace(/\{\s*"rewards"\s*:\s*\[/g, '')
          .trim();
        
        return {
          hasJson: true,
          beforeJson: cleanedContent,
          jsonData: jsonObjects[0],
          jsonObjects: jsonObjects,
          multipleJson: jsonObjects.length > 1,
          afterJson: ''
        };
      }
    }
  } catch (error) {
    console.error("Error in parseMessageContent:", error);
  }
  
  // Default return if no JSON found
  return {
    hasJson: false,
    content: cleanContent // Use the cleaned content here too
  };
};

// Add this helper function after the parseMessageContent function
const extractConversationFromReward = (jsonData) => {
  if (!jsonData || typeof jsonData !== 'object') return { conversationText: '', rewardData: jsonData, rewardsArray: null };
  
  // Create a copy of the object
  const rewardData = { ...jsonData };
  let conversationText = '';
  let rewardsArray = null;
  
  // Extract conversation field if present
  if ('conversation' in rewardData) {
    conversationText = rewardData.conversation;
    delete rewardData.conversation; // Remove from reward data
  }
  
  // Extract rewards array if present
  if ('rewards' in rewardData && Array.isArray(rewardData.rewards)) {
    rewardsArray = rewardData.rewards;
    delete rewardData.rewards; // Remove from the main object
  }
  
  return { conversationText, rewardData, rewardsArray };
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

// Update the BannerCard component to display banners left-aligned
const BannerCard = ({ banner }: { banner: any }) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const [merchantName, setMerchantName] = useState<string>("");
  const [createBannerOpen, setCreateBannerOpen] = useState(false);
  
  // Debug banner data on mount
  useEffect(() => {
    console.log("BannerCard mounted with data:", JSON.stringify(banner, null, 2));
  }, []);
  
  // Fetch merchant name on component mount
  useEffect(() => {
    const fetchMerchantName = async () => {
      if (user?.uid) {
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid));
          if (merchantDoc.exists()) {
            const data = merchantDoc.data();
            // Specifically use merchantName field first, then fall back to other fields
            const name = data.merchantName || data.businessName || data.storeName || data.name || 'Your Store';
            setMerchantName(name);
          }
        } catch (error) {
          console.error("Error fetching merchant name:", error);
        }
      }
    };
    
    fetchMerchantName();
  }, [user]);
  
  // Map visibility type string to enum
  const getVisibilityType = (visibilityString: string) => {
    if (visibilityString?.toLowerCase().includes('new')) {
      return BannerVisibility.NEW;
    }
    return BannerVisibility.ALL;
  };
  
  // Map style string to enum
  const getStyleType = (styleString: string) => {
    if (styleString?.toLowerCase() === 'dark') {
      return BannerStyle.DARK;
    } else if (styleString?.toLowerCase() === 'glass') {
      return BannerStyle.GLASS;
    }
    return BannerStyle.LIGHT;
  };

  // Log banner data for debugging
  useEffect(() => {
    if (createBannerOpen) {
      console.log("Dialog opened with banner data:", JSON.stringify(banner, null, 2));
    }
  }, [createBannerOpen, banner]);
  
  // Create a deep copy of the banner data for the dialog
  const getBannerDataForDialog = () => {
    try {
      // Create a deep copy to avoid reference issues
      const bannerCopy = JSON.parse(JSON.stringify(banner));
      console.log("Prepared banner data for dialog:", bannerCopy);
      return bannerCopy;
    } catch (error) {
      console.error("Error preparing banner data:", error);
      // Return a minimal valid object if parsing fails
      return {
        title: banner?.title || "Banner Title",
        description: banner?.description || "Banner Description",
        color: banner?.color || "#007AFF",
        style: banner?.style || "light",
        bannerAction: banner?.bannerAction || "Take to store page",
        visibilityType: banner?.visibilityType || "All customers",
        isActive: banner?.isActive !== undefined ? banner.isActive : true
      };
    }
  };

  // Handle opening the dialog
  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Opening banner dialog with raw data:", banner);
    console.log("Banner data type:", typeof banner);
    console.log("Banner data keys:", Object.keys(banner));
    setCreateBannerOpen(true);
  };

  // Handle saving the banner
  const handleSaveBanner = (bannerData: any) => {
    console.log("Banner saved with data:", bannerData);
    toast({
      title: "Banner saved",
      description: "Your banner has been saved successfully.",
    });
    setCreateBannerOpen(false);
  };

  return (
    <div className="mb-4">
      {/* Banner Preview */}
      <div className="w-full" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="relative" style={{ width: "350px", maxWidth: "100%" }}>
          <BannerPreview
            title={banner.title}
            description={banner.description}
            buttonText={banner.buttonText}
            color={banner.color}
            styleType={getStyleType(banner.style)}
            merchantName={merchantName || banner.merchantName || "Your Store"}
            visibilityType={getVisibilityType(banner.visibilityType)}
            isActive={banner.isActive}
          />
        </div>
      </div>
      
      {/* Expandable content - appears below the banner when clicked */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-100" style={{ width: "350px", maxWidth: "100%" }}>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">Banner Action:</div>
              <div className="text-sm">{banner.bannerAction}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">Visibility:</div>
              <div className="text-sm">{banner.visibilityType || "All customers"}</div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">Status:</div>
              <div className="text-sm">{banner.isActive ? "Active" : "Inactive"}</div>
            </div>
            
            <div className="flex justify-end gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                className="text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  // Copy banner data to clipboard
                  navigator.clipboard.writeText(JSON.stringify(banner, null, 2));
                  toast({
                    title: "Banner data copied",
                    description: "The banner data has been copied to your clipboard.",
                  });
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy JSON
              </Button>
              
              <Button 
                size="sm"
                className="bg-[#007AFF] hover:bg-[#0066CC] text-white text-xs"
                onClick={handleOpenDialog}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Create Banner
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* CreateBannerDialog component */}
      {createBannerOpen && (
        <CreateBannerDialog
          open={createBannerOpen}
          onOpenChange={(open) => {
            console.log("Dialog open state changing to:", open);
            setCreateBannerOpen(open);
          }}
          initialBannerData={getBannerDataForDialog()}
          onSave={handleSaveBanner}
        />
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
      // First, check for JSON array notation
      const jsonArrayRegex = /\[\s*\{[\s\S]*\}\s*\]/;
      const arrayMatch = content.match(jsonArrayRegex);
      
      if (arrayMatch) {
        return JSON.parse(arrayMatch[0]);
      }
      
      // Try finding multiple JSON objects in the content
      const jsonObjectRegex = /\{[\s\S]*?\}/g;
      const allMatches = Array.from(content.matchAll(jsonObjectRegex));
      const jsonObjects = [];
      
      // Extract JSON from each match
      for (const match of allMatches) {
        try {
          const obj = JSON.parse(match[0]);
          if (obj && typeof obj === 'object' && obj.rewardName) {
            jsonObjects.push(obj);
          }
        } catch (e) {
          console.error("Failed to parse individual JSON object:", e);
        }
      }
      
      if (jsonObjects.length > 0) {
        // Split content by JSON objects to get text before and after
        const cleanedContent = content.replace(/\{[\s\S]*?\}/g, '').trim()
          .replace(/\n{3,}/g, '\n\n'); // Clean up excessive newlines
        
        return {
          jsonObjects,
          cleanedContent
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error extracting JSON:", error);
      return null;
    }
  };

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
          // Handle the case where extraction returned an object with jsonObjects array
          if (extractedJson.jsonObjects && Array.isArray(extractedJson.jsonObjects)) {
            // Use the already cleaned content from the extractor
            const cleanedContent = extractedJson.cleanedContent || '';
            
            return (
              <>
                {cleanedContent && (
                  <div className="bg-gray-200 text-gray-900 p-3 rounded-lg mb-4 whitespace-pre-wrap">
                    {cleanedContent}
                  </div>
                )}
                <div className="space-y-4">
                  {extractedJson.jsonObjects.map((reward, idx) => {
                    // Determine if it's a reward or banner
                    if (reward.rewardName) {
                      return <RewardCard key={idx} reward={reward} />;
                    } else if (isBannerData(reward)) {
                      return <BannerCard key={idx} banner={reward} />;
                    } else {
                      // Fallback for other JSON objects
                      return (
                        <div key={idx} className="bg-gray-200 text-gray-900 p-3 rounded-lg">
                          <pre className="text-xs overflow-auto">{JSON.stringify(reward, null, 2)}</pre>
                        </div>
                      );
                    }
                  })}
                </div>
              </>
            );
          } 
          // Handle legacy cases (array or single object)
          else {
            const rewards = Array.isArray(extractedJson) ? extractedJson : [extractedJson];
            
            // Remove all JSON blocks from the content before displaying
            const cleanedContent = content
              .replace(/```json\n[\s\S]*?\n```/g, '')
              .replace(/(\{[\s\S]*?\})/g, '') // Remove JSON objects
              .replace(/\n{3,}/g, '\n\n')
              .trim();
            
            return (
              <>
                {cleanedContent && (
                  <div className="bg-gray-200 text-gray-900 p-3 rounded-lg mb-4 whitespace-pre-wrap">
                    {cleanedContent}
                  </div>
                )}
                <div className="space-y-4">
                  {rewards.map((reward, idx) => {
                    // Determine if it's a reward or banner
                    if (reward.rewardName) {
                      return <RewardCard key={idx} reward={reward} />;
                    } else if (isBannerData(reward)) {
                      return <BannerCard key={idx} banner={reward} />;
                    } else {
                      // Fallback for other JSON objects
                      return (
                        <div key={idx} className="bg-gray-200 text-gray-900 p-3 rounded-lg">
                          <pre className="text-xs overflow-auto">{JSON.stringify(reward, null, 2)}</pre>
                        </div>
                      );
                    }
                  })}
                </div>
              </>
            );
          }
        }
        
        // If no JSON, just render the content as is
        return <div className="whitespace-pre-wrap bg-gray-200 text-gray-900 p-3 rounded-lg">{content}</div>;
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
  // First, add a new state variable near the other state declarations
  const [adviceButtonActive, setAdviceButtonActive] = useState(false);

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

  useEffect(() => {
    scrollToBottom();
  }, [localMessages, isLoading]); // Scroll when messages change or loading state changes

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
      const initialMessage = "Hey, this is the initial message";
      
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

  // Add the StaggeredText component inside the main component
  const StaggeredText = ({ text }: { text: string }) => {
    // Split the text by spaces
    const words = text.split(" ");
    return (
      <>
        {words.map((word, idx) => (
          <span
            key={idx}
            className="staggered-fade"
            style={{ animationDelay: `${idx * 0.04}s` }}
          >
            {word}{" "}
          </span>
        ))}
      </>
    );
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
      <DialogContent 
        className="sm:max-w-[1400px] h-[90vh] flex flex-col p-0 border-0 rounded-xl overflow-hidden focus:outline-none focus-visible:outline-none focus-visible:ring-0"
      >
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
            <div className="flex-1 overflow-y-auto flex flex-col items-center">
              <div className="w-full max-w-4xl px-4 py-4 space-y-3">
                {localMessages.map((message, index) => {
                  // Add this line for debugging
                  if (message.role === 'assistant') {
                    debugJsonParsing(message.content);
                  }

                  const parsedContent = parseMessageContent(message.content);
                  console.log("Parsed content result:", parsedContent);

                  return (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} ${
                        message.role === 'assistant' ? 'fade-in' : ''
                      }`}
                    >
                      <div
                        className={`max-w-[90%] ${
                          message.role === 'user'
                            ? 'bg-gray-100 p-2.5 rounded-lg text-gray-800'  // Light gray box for user messages
                            : parsedContent.hasJson
                              ? 'bg-transparent'
                              : 'text-gray-900'  // No box for AI responses
                        }`}
                      >
                        {parsedContent.hasJson ? (
                          <div>
                            {message.role === 'assistant' ? (
                              <StaggeredText text={
                                // Clean any unwanted array brackets from the text
                                (parsedContent.beforeJson || '')
                                  .replace(/\[\s*,\s*,\s*\]/g, '')
                                  .replace(/\[\s*\]/g, '')
                                  .trim()
                              } />
                            ) : (
                              parsedContent.beforeJson
                            )}

                            {parsedContent.multipleJson ? (
                              <div className="space-y-4">
                                {parsedContent.jsonObjects.map((jsonObj, idx) => {
                                  // Check if this is a rewards container
                                  if (jsonObj.rewards && Array.isArray(jsonObj.rewards)) {
                                    const { conversationText, rewardsArray } = extractConversationFromReward(jsonObj);
                                    return (
                                      <div key={idx}>
                                        {conversationText && (
                                          <div className="text-gray-900 mb-4 whitespace-pre-wrap">
                                            <StaggeredText text={conversationText} />
                                          </div>
                                        )}
                                        <div className="space-y-4">
                                          {rewardsArray && rewardsArray.map((reward, rewardIdx) => (
                                            <RewardCard key={`${idx}-${rewardIdx}`} reward={reward} />
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  }
                                  // Determine if it's a reward or banner
                                  if (jsonObj.rewardName) {
                                    return <RewardCard key={idx} reward={jsonObj} />;
                                  } else if (isBannerData(jsonObj)) {
                                    return <BannerCard key={idx} banner={jsonObj} />;
                                  } else {
                                    // Fallback for other JSON objects
                                    return (
                                      <div key={idx} className="bg-gray-200 text-gray-900 p-3 rounded-lg">
                                        <pre className="text-xs overflow-auto">{JSON.stringify(jsonObj, null, 2)}</pre>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            ) : (
                              // Single JSON object
                              parsedContent.jsonData.rewardName ? (
                                <div>
                                  {/* Display conversation text if present */}
                                  {(() => {
                                    const { conversationText, rewardData, rewardsArray } = extractConversationFromReward(parsedContent.jsonData);
                                    
                                    return (
                                      <>
                                        {conversationText && (
                                          <div className="text-gray-900 mb-4 whitespace-pre-wrap">
                                            <StaggeredText text={conversationText} />
                                          </div>
                                        )}
                                        
                                        {/* If we have a rewards array, display each reward */}
                                        {rewardsArray && rewardsArray.length > 0 ? (
                                          <div className="space-y-4">
                                            {rewardsArray.map((reward, idx) => (
                                              <RewardCard key={idx} reward={reward} />
                                            ))}
                                          </div>
                                        ) : rewardData.rewardName ? (
                                          /* Otherwise just display the single reward */
                                          <RewardCard reward={rewardData} />
                                        ) : isBannerData(rewardData) ? (
                                          <BannerCard banner={rewardData} />
                                        ) : null}
                                      </>
                                    );
                                  })()}
                                </div>
                              ) : isBannerData(parsedContent.jsonData) ? (
                                <BannerCard banner={parsedContent.jsonData} />
                              ) : (
                                <div className="bg-gray-200 text-gray-900 p-3 rounded-lg">
                                  <pre className="text-xs overflow-auto">{JSON.stringify(parsedContent.jsonData, null, 2)}</pre>
                                </div>
                              )
                            )}

                            {parsedContent.afterJson && (
                              <div className="text-gray-900 mt-2 whitespace-pre-wrap">
                                {message.role === 'assistant' ? (
                                  <StaggeredText text={parsedContent.afterJson} />
                                ) : (
                                  parsedContent.afterJson
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {message.role === 'assistant' ? (
                              <StaggeredText text={message.content} />
                            ) : (
                              message.content
                            )}
                          </div>
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

                {/* Loading indicator - Updated position and added "Thinking..." text */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-900 p-2.5 rounded-lg flex items-center space-x-2 fade-in">
                      <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-gray-700 font-medium">Thinking...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Add this div at the end of your messages */}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 border-gray-100 max-w-3xl mx-auto w-full">
              <form onSubmit={handleSubmit} className="relative">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Message TapAi"
                  className="flex-1 min-h-[120px] resize-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-gray-300 pr-20 rounded-xl shadow-md border border-gray-200"
                  disabled={loading || isLoading}
                />
                <div className="absolute bottom-3 left-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`h-8 rounded-lg text-xs transition-colors ${
                      adviceButtonActive 
                        ? "bg-blue-200 text-blue-700 hover:bg-blue-200" 
                        : "bg-gray-100 hover:bg-blue-100"
                    }`}
                    onClick={() => setAdviceButtonActive(!adviceButtonActive)}
                    disabled={loading || isLoading}
                  >
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    Advice
                  </Button>
                </div>
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

<style jsx>{`
  .fade-in {
    animation: fadeIn 0.4s ease-in-out forwards;
  }
  @keyframes fadeIn {
    0% {
      opacity: 0;
      transform: translateY(5px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .staggered-fade {
    display: inline-block;
    opacity: 0;
    animation: staggeredFade 0.3s forwards ease;
  }
 
  @keyframes staggeredFade {
    from {
      opacity: 0;
      transform: translateY(3px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>