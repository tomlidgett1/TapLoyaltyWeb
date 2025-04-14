"use client"

// This file exists only to satisfy Tailwind's content scanning
// The actual onboarding functionality is in src/app/onboarding/page.tsx 

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db, functions } from "@/lib/firebase"
import { doc, updateDoc, writeBatch, collection, Timestamp, setDoc, getDocs, getDoc } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { ArrowRight, CheckCircle, Coffee, Gift, Store, Users, Upload, Sparkles, Award, BarChart, Image, Utensils, Percent, Cake, Wine, UtensilsCrossed, Check, X, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Ban, Calendar, ChevronLeft, Clock, Package, Plus, DollarSign, HelpCircle, Crown, ArrowUp, Eye } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"
import { httpsCallable } from "firebase/functions"
// Import the new component
import { CoffeeProgramDisplay } from "@/components/coffee-program-display"
import { Badge } from "@/components/ui/badge"
import { BannerPreview } from "@/components/banner-preview"
import { BannerStyle } from "@/types/banner-style"

// Helper function to format a UNIX timestamp (in seconds) into hh:mm AM/PM
function formatTimestamp(seconds: number) {
  const date = new Date(seconds * 1000);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes} ${ampm}`;
}

/**
 * Extracts only the time (HH:MM AM/PM) from a string like:
 * "December 11, 2024 at 7:00:00 AM UTC+11"
 *
 * Returns something like "7am" or "12:30pm".
 * If parsing fails, returns the original string.
 */
function formatShortAmPm(dateString: string) {
  // Remove " at " so JavaScript can parse the date
  const sanitized = dateString.replace(" at ", " ");
  const date = new Date(sanitized);
  if (isNaN(date.getTime())) {
    return dateString; // fallback if parsing fails
  }
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12 || 12;
  // if minutes are zero, omit them for a simpler look
  return minutes === 0
    ? `${hours}${ampm}`
    : `${hours}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

// Define interfaces for your reward types
interface BaseReward {
  id: string;
  name: string;
  type: string;
  industry: string;
  isNewCustomer: boolean;
  pointsCost: number;
  description: string;
  rewardName?: string;
  conditions?: any[];
  limitations?: Limitation[];
  programtype?: string;
  coffeeConfig?: CoffeeConfig;
  voucherAmount?: number;
}

interface Limitation {
  type: string;
  value: number | string[] | Period;
}

interface Period {
  startDate: string;
  endDate: string;
}

interface TimeOfDay {
  startTime: string;
  endTime: string;
}

interface CoffeeConfig {
  pin: string;
  freeRewardTiming: "before" | "after";
  frequency: number;
  levels: number;
}

// Add this debugging helper function with proper types
const logObjectDetails = (obj: any, label: string) => {
  console.log(`=== ${label} ===`);
  console.log(`Type: ${typeof obj}`);
  console.log(`Is null/undefined: ${obj === null || obj === undefined}`);
  // Add more debugging info as needed
};

// Update your businessData state type
interface BusinessData {
  hasSetupReward: boolean;
  selectedRewards: BaseReward[];
  hasSetupBanner: boolean;
  bannerDetails: { name: string, type: string } | null;
  pointsRuleDetails?: { name: string };
}

/**
 * A new card component specifically for points rules:
 */
function PointsRuleCard({
  id,
  name,
  description,
  icon: Icon,
  conditions,
  pointsmultiplier,
  isSelected,
  onSelect,
  isPointsRule = true, // Add this new prop with default true
}: {
  id: string
  name: string
  description: string
  icon: LucideIcon
  conditions: { type: string; [key: string]: any }[]
  pointsmultiplier?: number
  isSelected: boolean
  onSelect: () => void
  isPointsRule?: boolean // New optional prop
}) {
  // Basic expand/collapse state if you need it:
  const [expanded, setExpanded] = useState(false)

  // Convert numeric multiplier to something like "1.5x"
  const multiplierLabel =
    pointsmultiplier && pointsmultiplier > 1
      ? `${pointsmultiplier}x`
      : (pointsmultiplier === 1 ? '1x' : null)

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white transition-all ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
      }`}
    >
      {/* Main clickable header */}
      <div
        className={`flex items-start gap-3 p-4 cursor-pointer transition-all ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            {/* Rule name + multiplier */}
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{name}</h3>
              {multiplierLabel && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px]"
                >
                  {multiplierLabel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Selected
                </span>
              )}
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {/* Collapsible details section */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="space-y-4">
            {/* We show "Conditions" here */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Conditions:</h4>
              {conditions.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No conditions</div>
               ) : (
                <div className="space-y-3">
                  {conditions.map((cond, i) => {
                    if (cond.type === 'timeOfDay') {
                      // Here we only show the short time (e.g. '7am') 
                      const startLabel = formatShortAmPm(cond.startTime || '')
                      const endLabel = formatShortAmPm(cond.endTime || '')
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <Clock className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Time Window:</span>
                            <span className="text-sm text-gray-600 ml-1">{startLabel} - {endLabel}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'minimumSpend') {
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <DollarSign className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Minimum Spend:</span>
                            <span className="text-sm text-gray-600 ml-1">${cond.amount}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'daysOfWeek') {
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Days:</span>
                            <span className="text-sm text-gray-600 ml-1">{cond.days.join(', ')}</span>
                          </div>
                        </div>
                      )
                    }
                    // show others if needed
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                        <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {cond.type}: {JSON.stringify(cond)}
                        </div>
                      </div>
                    )
                  })}
                </div>
               )}
            </div>

            {/* "Select" button at bottom */}
            <div className="pt-2">
              <Button
                size="sm"
                variant={isSelected ? 'outline' : 'default'}
                className={
                  isSelected
                    ? 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                onClick={(e) => {
                  e.stopPropagation()
                  onSelect()
                }}
              >
                {isSelected ? 'Remove Selection' : 'Select Rule'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Add these helper functions before the RewardCard component

// Helper function to format condition objects into readable text
function formatCondition(condition: { type: string; [key: string]: any }) {
  if (condition.type === 'timeOfDay') {
    const startLabel = formatShortAmPm(condition.startTime || '');
    const endLabel = formatShortAmPm(condition.endTime || '');
    return `Valid between ${startLabel} - ${endLabel}`;
  } else if (condition.type === 'minimumSpend') {
    return `Minimum spend of $${condition.amount || condition.value}`;
  } else if (condition.type === 'daysOfWeek') {
    const days = condition.days || (Array.isArray(condition.value) ? condition.value : []);
    return `Valid on ${days.join(', ')}`;
  } else if (condition.type === 'maximumTransactions') {
    return `Limited to ${condition.value} transaction${condition.value !== 1 ? 's' : ''}`;
  } else if (condition.type === 'minimumTransactions') {
    return `Requires at least ${condition.value} transaction${condition.value !== 1 ? 's' : ''}`;
  } else if (condition.type === 'totalLifetimeSpend') {
    return `Total lifetime spend of $${condition.value}`;
  } else if (condition.type === 'minimumLifetimeSpend') {
    return `Minimum lifetime spend of $${condition.value}`;
  }
  return `${condition.type}: ${JSON.stringify(condition.value || condition)}`;
}

// Helper function to format limitation objects into readable text
function formatLimitation(limitation: { type: string; value: any }) {
  if (limitation.type === 'customerLimit') {
    return `Limited to ${limitation.value} per customer`;
  } else if (limitation.type === 'totalRedemptionLimit') {
    return `Limited to ${limitation.value} total redemptions`;
  } else if (limitation.type === 'daysOfWeek') {
    const days = Array.isArray(limitation.value) ? limitation.value.join(', ') : limitation.value;
    return `Only valid on ${days}`;
  }
  return `${limitation.type}: ${JSON.stringify(limitation.value)}`;
}

// Add this new RewardCard component definition that doesn't include the Points Rule badge

function RewardCard({
  id,
  name,
  description,
  icon: Icon,
  conditions,
  limitations,
  isSelected,
  onSelect,
  pointsmultiplier,
}: {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  conditions: { type: string; [key: string]: any }[];
  limitations: { type: string; value: any }[];
  isSelected: boolean;
  onSelect: () => void;
  pointsmultiplier?: number;
}) {
  const [expanded, setExpanded] = useState(false);

  // Convert numeric multiplier to something like "1.5x"
  const multiplierLabel =
    pointsmultiplier && pointsmultiplier > 1
      ? `${pointsmultiplier}x`
      : (pointsmultiplier === 1 ? '1x' : null);

  return (
    <div
      className={`border rounded-lg overflow-hidden bg-white transition-all ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'
      }`}
    >
      {/* Main clickable header */}
      <div
        className={`flex items-start gap-3 p-4 cursor-pointer transition-all ${
          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
        }`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            {/* Rule name + multiplier */}
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{name}</h3>
              {multiplierLabel && (
                <Badge 
                  variant="secondary" 
                  className="text-[10px]"
                >
                  {multiplierLabel}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isSelected && (
                <span className="text-sm text-blue-600 flex items-center gap-1">
                  <Check className="h-4 w-4" />
                  Selected
                </span>
              )}
              <ChevronDown
                className={`h-5 w-5 text-gray-500 transition-transform ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
      </div>

      {/* Collapsible details section */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="space-y-5">
            {/* Conditions section - improved styling */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Conditions:</h4>
              {conditions.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No conditions</div>
              ) : (
                <div className="space-y-2">
                  {conditions.map((cond, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                      <div className="h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3 w-3 text-blue-600" />
                      </div>
                      <p className="text-sm text-gray-700 font-medium">
                        {formatCondition(cond)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Limitations section - improved styling */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Limitations:</h4>
              {limitations.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No limitations</div>
              ) : (
                <div className="space-y-2">
                  {limitations.map((limit, i) => (
                    <div key={i} className="flex items-start gap-2 bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                      <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Ban className="h-3 w-3 text-red-600" />
                      </div>
                      <p className="text-sm text-gray-700 font-medium">
                        {formatLimitation(limit)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Select button */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className={isSelected ? 
            "w-full bg-green-600 hover:bg-green-700 text-white" : 
            "w-full"
          }
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected ? (
            <>
              <Check className="mr-1 h-4 w-4" /> Selected
            </>
          ) : (
            "Select"
          )}
        </Button>
      </div>
    </div>
  );
}

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    hasSetupReward: false,
    selectedRewards: [] as BaseReward[],
    hasSetupBanner: false,
    bannerDetails: null as { name: string, type: string } | null,
    pointsRuleDetails: undefined
  })
  
  // Add this state variable for the merchant name
  const [fetchedMerchantName, setFetchedMerchantName] = useState<string>("")
  
  // Move these state declarations up here, before they're used
  const [selectedPointsRules, setSelectedPointsRules] = useState<string[]>([])
  const [bannerData, setBannerData] = useState<any>(null)
  const [showBannerDialog, setShowBannerDialog] = useState(false)
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcementData, setAnnouncementData] = useState<any>(null)
  
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  // Add this useEffect to fetch the merchant name
  useEffect(() => {
    async function fetchMerchantName() {
      if (user?.uid) {
        try {
          const merchantRef = doc(db, "merchants", user.uid)
          const docSnap = await getDoc(merchantRef)
          if (docSnap.exists()) {
            setFetchedMerchantName(docSnap.data().merchantName || "Your Store")
          }
        } catch (error) {
          console.error("Error fetching merchant name:", error)
          setFetchedMerchantName("Your Store")
        }
      }
    }
    fetchMerchantName()
  }, [user])
  
  // First, let's update the totalSteps variable to include the info step
  const totalSteps = 4; // Now includes: 1) Info, 2) Rewards, 3) Points Rules, 4) Banner
  
  const [customerCategoryStep, setCustomerCategoryStep] = useState<'new' | 'existing' | 'loyal' | null>(null)
  
  const handleNext = () => {
    if (step === 1) {
      // When moving from About Tap Loyalty to Rewards, reset wizard sub-steps
      setStep(2);
      setWizardStep(1); // Reset to first sub-step (business type selection)
      return;
    }
    
    // If we're in Step 2 (Create First Reward)
    if (step === 2) {
      // Handle the wizard sub-steps
      if (wizardStep === 1) {
        // From Industry Selection to Reward Selection
        if (selectedIndustry) {
          setWizardStep(2);
          setCustomerCategoryStep('new'); // Start with new customers
          return;
        } else {
          toast({
            title: "Please select an industry",
            description: "You need to select your business type to continue.",
            variant: "destructive"
          });
          return;
        }
      } else if (wizardStep === 2) {
        // From Reward Selection to next category or Program Selection
        if (customerCategoryStep === 'new') {
          // Check if at least one reward is selected for new customers
          if (wizardSelectedRewards.filter(r => r.includes('new-')).length > 0) {
            setCustomerCategoryStep('existing');
            return;
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for new customers.",
              variant: "destructive"
            });
            return;
          }
        } else if (customerCategoryStep === 'existing') {
          // Check if at least one reward is selected for existing customers
          if (wizardSelectedRewards.filter(r => r.includes('existing-')).length > 0) {
            setCustomerCategoryStep('loyal');
            return;
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for existing customers.",
              variant: "destructive"
            });
            return;
          }
        } else if (customerCategoryStep === 'loyal') {
          // Check if at least one reward is selected for loyal customers
          if (wizardSelectedRewards.filter(r => r.includes('loyal-')).length > 0) {
            setWizardStep(3); // Move to program selection
            setCustomerCategoryStep(null);
            return;
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for loyal customers.",
              variant: "destructive"
            });
            return;
          }
        }
      } else if (wizardStep === 3) {
        // From Program Selection directly to next main step (skip confirmation)
        if (selectedProgramType) {
          // Add the selected rewards to the businessData
          const individualReward = {
            id: `${selectedIndustry}-individual`,
            name: wizardSelectedRewards[0] || "Free Reward",
            type: 'individual',
            industry: selectedIndustry,
            isNewCustomer: wizardSelectedRewards.some(r => r.includes('welcome')),
            pointsCost: 0,
            description: `Reward for customers`,
            rewardName: wizardSelectedRewards[0] || "Free Reward"
          };
          
          const programReward = {
            id: `${selectedIndustry}-program`,
            name: selectedProgramType || "Loyalty Program",
            type: 'program',
            industry: selectedIndustry,
            isNewCustomer: false,
            pointsCost: 0,
            description: `Loyalty program with multiple rewards`,
            rewardName: selectedProgramType || "Loyalty Program"
          };
          
          setBusinessData(prev => ({
            ...prev,
            selectedRewards: [...prev.selectedRewards, individualReward, programReward],
            hasSetupReward: true
          }));
          
          // Move to the next main step
          setStep(step + 1);
          return;
        } else {
          toast({
            title: "Please select a program type",
            description: "You need to select a reward program to continue.",
            variant: "destructive"
          });
          return;
        }
      }
    }
    
    // For other main steps, just move to the next step
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };
  
  const handleBack = () => {
    if (step === 2 && wizardStep === 1) {
      // When going back from business type to About Tap Loyalty
      setStep(1);
      setMiniWizardStep('intro'); // Reset to first mini-wizard step
      return;
    }
    
    // If we're in Step 1 (Create First Reward)
    if (step === 1) {
      // Handle the wizard sub-steps
      if (wizardStep === 2) {
        // In reward selection, navigate between customer categories
        if (customerCategoryStep === 'existing') {
          setCustomerCategoryStep('new')
          return
        } else if (customerCategoryStep === 'loyal') {
          setCustomerCategoryStep('existing')
          return
        } else if (customerCategoryStep === 'new') {
          // Go back to industry selection
          setWizardStep(1)
          setCustomerCategoryStep(null)
          return
        }
      } else if (wizardStep === 3) {
        // Go back to reward selection (loyal customers)
        setWizardStep(2)
        setCustomerCategoryStep('loyal')
        return
      } else if (wizardStep === 4) {
        // Go back to program selection
        setWizardStep(3)
        return
      } else if (wizardStep > 1) {
        setWizardStep(wizardStep - 1)
        return
      }
      return
    }
    
    // For other main steps, just move to the previous step
    if (step > 1) {
      setStep(step - 1)
      
      // If we're moving back to Step 1, make sure we're at the last wizard sub-step
      if (step === 2) {
        setWizardStep(4) // Set to the confirmation step
      }
    }
  }
  
  const handleComplete = async () => {
    if (!user?.uid) {
      console.error("No user ID found, cannot complete onboarding");
      return;
    }
    
    try {
      setLoading(true);
      console.log("=== STARTING ONBOARDING COMPLETION PROCESS ===");
      console.log("User ID:", user.uid);
      console.log("Selected rewards:", businessData.selectedRewards);
      console.log("Coffee program configured:", coffeeProgramConfigured);
      console.log("Coffee program settings:", coffeeProgram);
      
      // Create a batch to handle multiple Firestore operations
      const batch = writeBatch(db);
      console.log("Created Firestore batch");
      
      // Save onboarding data to Firestore
      const merchantRef = doc(db, 'merchants', user.uid);
      batch.update(merchantRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      });
      console.log("Added merchant update to batch");
      
      // 1) Create the selected rewards
      console.log(`Processing ${businessData.selectedRewards.length} rewards...`);
      for (const reward of businessData.selectedRewards) {
        const rewardRef = doc(collection(db, 'merchants', user.uid, 'rewards'));
        console.log(`Creating reward with ID: ${rewardRef.id}, name: ${reward.name}`);
        
        // Prepare the reward data with all required fields
        const rewardData = {
          rewardName: reward.name || reward.rewardName,
          description: reward.description,
          isActive: true,
          pointsCost: reward.pointsCost,
          rewardVisibility: 'global',
          conditions: reward.conditions || [],
          limitations: reward.limitations || [
            { type: 'customerLimit', value: 1 },
            { type: 'totalRedemptionLimit', value: 100 }
          ],
          createdAt: new Date().toISOString(),
          status: 'active',
          merchantId: user.uid,
          updatedAt: new Date().toISOString(),
          minSpend: 0,
          reason: '',
          customers: [],
          redemptionCount: 0,
          uniqueCustomersCount: 0,
          lastRedeemedAt: null,
          uniqueCustomerIds: []
        };
        
        // If this is a program-type reward, add program-specific fields
        if (reward.type === 'program' && reward.programtype) {
          console.log(`Adding program type: ${reward.programtype} to reward`);
          rewardData.programtype = reward.programtype;
          
          // If this is a coffee program, add coffee-specific configuration
          if (reward.programtype === 'coffee' && reward.coffeeConfig) {
            console.log("Adding coffee config to reward:", reward.coffeeConfig);
            rewardData.coffeeConfig = reward.coffeeConfig;
          }
        }
        
        console.log("Final reward data:", rewardData);
        batch.set(rewardRef, rewardData);
        console.log(`Added reward ${rewardRef.id} to batch`);
      }
      
      // Handle banner and announcement separately
      const handleSaveBannerAndAnnouncement = async () => {
        console.log("======== BANNER DB SAVE START ========");
        
        if (!bannerData) {
          console.log("No banner data to save");
          return null;
        }
        
        logObjectDetails(bannerData, "BANNER DATA FOR FIRESTORE");
        
        try {
          // 1. First create banner reference
          const bannerRef = doc(collection(db, 'merchants', user.uid, 'banners'));
          console.log(`BANNER REF: merchants/${user.uid}/banners/${bannerRef.id}`);
          
          // Create clean banner data without announcement
          const { announcement, ...cleanBannerData } = bannerData;
          const bannerToSave = {
            ...cleanBannerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            merchantId: user.uid
          };
          
          console.log("CLEAN BANNER DATA (without announcement):", JSON.stringify(bannerToSave, null, 2));
          
          // 2. Save the banner document
          await setDoc(bannerRef, bannerToSave);
          console.log(`Banner saved with ID: ${bannerRef.id}`);
          
          // 3. Then check and save announcement as a subcollection
          if (announcementData) {
            console.log("ANNOUNCEMENT DATA FOUND FOR SUBCOLLECTION");
            logObjectDetails(announcementData, "ANNOUNCEMENT DATA");
            
            // Create announcement reference
            const announcementRef = doc(collection(db, 'merchants', user.uid, 'banners', bannerRef.id, 'announcements'));
            console.log(`SAVING TO PATH: merchants/${user.uid}/banners/${bannerRef.id}/announcements/${announcementRef.id}`);
            
            // Prepare announcement data
            const announcementToSave = {
              ...announcementData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              merchantId: user.uid,
              id: announcementRef.id,
              bannerId: bannerRef.id
            };
            
            console.log("PREPARED ANNOUNCEMENT DATA:", JSON.stringify(announcementToSave, null, 2));
            
            // Save the announcement to the subcollection
            await setDoc(announcementRef, announcementToSave);
            console.log(`Announcement saved with ID: ${announcementRef.id}`);
          }
          
          return bannerRef.id;
        } catch (error) {
          console.error("ERROR SAVING BANNER/ANNOUNCEMENT:", error);
          throw error;
        }
      };
      
      let bannerId = null;
      if (bannerData) {
        try {
          bannerId = await handleSaveBannerAndAnnouncement();
          console.log('Banner and announcement saved with ID:', bannerId);
        } catch (error) {
          console.error('Failed to save banner and announcement:', error);
        }
      } else {
        // Continue with the rest of your batch operations
        // ...
      }
      
      // 3) Save each selected points rule
      console.log(`Processing ${selectedPointsRules.length} points rules...`);
      for (const ruleId of selectedPointsRules) {
        const ruleDocRef = doc(collection(db, 'merchants', user.uid, 'pointsRules'));
        console.log(`Creating points rule with ID: ${ruleDocRef.id}, rule: ${ruleId}`);
        
        // Get the actual rule data based on the ID
        const ruleData = {
          ruleName: ruleId,
          conditions: ruleId === "morning-coffee-bonus" 
            ? [
                { type: "timeOfDay", startTime: "7:00:00", endTime: "10:00:00" },
                { type: "daysOfWeek", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] }
              ] 
            : ["someCondition"],
          pointsMultiplier: ruleId === "weekend-treat" ? 3 : 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          merchantId: user.uid
        };
        
        console.log("Points rule data:", ruleData);
        batch.set(ruleDocRef, ruleData);
        console.log(`Added points rule ${ruleDocRef.id} to batch`);
      }
      
      // First commit the batch to ensure all other data is saved
      console.log("=== COMMITTING BATCH TO FIRESTORE ===");
      try {
        await batch.commit();
        console.log("✅ Batch committed successfully");
      } catch (batchError) {
        console.error("❌ Error committing batch:", batchError);
        throw batchError;
      }
      
      // 4) Handle coffee program creation if configured
      if (coffeeProgramConfigured) {
        console.log("=== SETTING UP COFFEE PROGRAM ===");
        try {
          console.log('Coffee program configuration:', JSON.stringify(coffeeProgram, null, 2));
          
          // Validate that functions object exists
          if (!functions) {
            console.error('❌ Firebase functions object is undefined or null');
            throw new Error('Firebase functions not available');
          }
          
          // Call the cloud function to create the coffee program
          console.log("Preparing to call 'coffeeprogram' cloud function");
          const coffeeprogramFunc = httpsCallable(functions, 'coffeeprogram');
          
          // Prepare data for the function call
          const data = {
            merchantId: user.uid,
            pin: coffeeProgram.pin || '1234',  // Use default if missing
            firstCoffeeBeforeTransaction: coffeeProgram.freeRewardTiming === 'before',
            frequency: parseInt(coffeeProgram.frequency || '5'),
            levels: parseInt(coffeeProgram.levels || '10')
          };
          
          console.log('Function call data:', JSON.stringify(data, null, 2));
          
          // Show a loading toast while the function is being called
          toast({
            title: "Creating Coffee Program",
            description: "Please wait while we set up your coffee loyalty program...",
          });
          
          console.log("Calling cloud function now...");
          const result = await coffeeprogramFunc(data);
          console.log('✅ Coffee program function call completed with result:', result);
          
          // Show success message
          toast({
            title: "Coffee Program Created",
            description: "Your coffee loyalty program has been set up successfully.",
          });
        } catch (error: any) {
          // Detailed error logging
          console.error('❌ Error creating coffee program:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          
          toast({
            title: "Coffee Program Error",
            description: `Failed to create coffee program: ${error.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      } else {
        console.log("No coffee program configured, skipping coffee program setup");
      }
      
      console.log("=== ONBOARDING COMPLETION SUCCESSFUL ===");
      toast({
        title: "Onboarding completed!",
        description: `Your account has been set up successfully with ${businessData.selectedRewards.length} rewards.`,
      });
      
      // Redirect to dashboard
      console.log("Redirecting to dashboard...");
      router.push('/dashboard');
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  const [selectedIndustry, setSelectedIndustry] = useState('cafe')
  const [rewardType, setRewardType] = useState('individual')
  const [expandedRewards, setExpandedRewards] = useState<Record<string, boolean>>({})

  // First, let's fix the toggleRewardDetails function to ensure only one reward is expanded at a time
  const toggleRewardDetails = (rewardId: string) => {
    if (expandedRewardDetails === rewardId) {
      // If clicking on already expanded reward, close it
      setExpandedRewardDetails(null);
    } else {
      // Otherwise, open this one and close any others
      setExpandedRewardDetails(rewardId);
    }
  };

  const handleRewardSelection = (rewardId: string) => {
    setWizardSelectedRewards(prev => {
      if (prev.includes(rewardId)) {
        return prev.filter(id => id !== rewardId);
        } else {
        return [...prev, rewardId];
      }
    });
  };

  // First, add a state to track which reward's JSON is being viewed
  const [viewingJsonFor, setViewingJsonFor] = useState<string | null>(null)

  // Add a function to toggle JSON view
  const toggleJsonView = (rewardId: string, type: 'individual' | 'program', e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the collapsible
    setViewingJsonFor(viewingJsonFor === `${rewardId}-${type}` ? null : `${rewardId}-${type}`)
  }

  // Add this near the top of the component
  const [showExitConfirmation, setShowExitConfirmation] = useState(false)

  // Add this function to handle exit confirmation
  const handleExitClick = () => {
    setShowExitConfirmation(true)
  }

  // Add these new states to track the wizard progress
  const [wizardStep, setWizardStep] = useState(1)
  const [selectedRewardType, setSelectedRewardType] = useState<string | null>(null)
  const [selectedProgramType, setSelectedProgramType] = useState<string | null>(null)

  // Add this function to handle industry selection and move to next wizard step
  const handleIndustrySelect = (industry: string) => {
    console.log(`Selected industry: ${industry}`);
    setSelectedIndustry(industry);
    
    // Update business data with the selected industry
    setBusinessData(prev => ({
      ...prev,
      industry: industry
    }));
  }

  // Add this state to track selected rewards in the wizard
  const [wizardSelectedRewards, setWizardSelectedRewards] = useState<string[]>([])

  // Update the handleRewardTypeSelection function
  const handleRewardTypeSelection = (rewardId: string) => {
    console.log("Selected reward:", rewardId); // Add logging for debugging
    
    // Check if this is a coffee program
    if (rewardId.includes('coffee-lovers-program')) {
      // Add or remove from selected rewards
      if (wizardSelectedRewards.includes(rewardId)) {
        // If already selected, just show the config dialog
        setShowCoffeeProgramConfig(true);
      } else {
        // Add to selected rewards and show config dialog
        setWizardSelectedRewards(prev => [...prev, rewardId]);
        
        // Show a success toast
        toast({
          title: "Coffee Program Selected",
          description: "Configure your coffee loyalty program settings",
          variant: "default"
        });
        
        // Show the configuration dialog
        setShowCoffeeProgramConfig(true);
      }
      return;
    }
    
    // For non-coffee program rewards, toggle selection
    if (wizardSelectedRewards.includes(rewardId)) {
      setWizardSelectedRewards(prev => prev.filter(r => r !== rewardId));
      
      // Show a toast for removal
      toast({
        title: "Reward Removed",
        description: "The reward has been removed from your selections",
        variant: "default"
      });
    } else {
      setWizardSelectedRewards(prev => [...prev, rewardId]);
      
      // Show a success toast
      toast({
        title: "Reward Selected",
        description: "The reward has been added to your selections",
        variant: "default"
      });
    }
    
    // Close the expanded details
    setExpandedRewardDetails(null);
  };

  // Add a function to continue to the next step when ready
  const continueToNextStep = () => {
    if (wizardSelectedRewards.length > 0) {
      // Create actual reward objects from the selected reward IDs
      const newRewards = wizardSelectedRewards.map(rewardId => {
        // Parse the reward ID to get type and name
        const [customerType, rewardName] = rewardId.split('-', 2);
        
        return {
          id: rewardId,
          name: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: 'individual',
          industry: selectedIndustry,
          isNewCustomer: customerType === 'new',
          pointsCost: 0,
          description: `Reward for ${customerType} customers`,
          rewardName: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        };
      });
      
      // Add coffee program if configured
      if (coffeeProgramConfigured) {
        newRewards.push({
          id: 'coffee-program',
          name: 'Coffee Loyalty Program',
          type: 'program',
          programtype: 'coffee',
          industry: selectedIndustry,
          isNewCustomer: false,
          pointsCost: 0,
          description: 'Buy X coffees, get one free',
          coffeeConfig: {
            pin: coffeeProgram.pin,
            freeRewardTiming: coffeeProgram.freeRewardTiming,
            frequency: parseInt(coffeeProgram.frequency),
            levels: parseInt(coffeeProgram.levels)
          }
        });
      }
      
      // Update businessData with the new rewards
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, ...newRewards],
        hasSetupReward: true
      }));
      
      console.log("Added rewards to businessData:", newRewards);
      
      setSelectedRewardType(wizardSelectedRewards.join(', '))
      setWizardStep(3)
    } else {
      toast({
        title: "Please select a reward",
        description: "You need to select at least one reward to continue.",
        variant: "destructive"
      })
    }
  }

  // Add a function to remove a selected reward
  const removeSelectedReward = (type: string) => {
    setWizardSelectedRewards(prev => prev.filter(r => r !== type))
  }

  // Add this function to handle program type selection
  const handleProgramTypeSelection = (type: string) => {
    setSelectedProgramType(type)
    setWizardStep(4) // Move to final confirmation
  }

  // Add this function to go back in the wizard
  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1)
    }
  }

  // Add this state to track expanded reward details
  const [expandedRewardDetails, setExpandedRewardDetails] = useState<string | null>(null)

  // Add a new state to track if the intro has been viewed
  const [hasViewedIntro, setHasViewedIntro] = useState(true)

  // Then in the useEffect that runs on component mount, add:
  useEffect(() => {
    // Set hasViewedIntro to true when component mounts
    setHasViewedIntro(true)
  }, [])

  // Fix the duplicate variable declaration
  // Add these new states to manage pagination
  const [currentRewardPage, setCurrentRewardPage] = useState(1);
  const [currentNewCustomerPage, setCurrentNewCustomerPage] = useState(1);
  const rewardsPerPage = 6; // Only declare this once

  // Create a function to handle reward pagination
  const handleRewardPageChange = (pageNumber: number) => {
    setCurrentRewardPage(pageNumber);
    // Reset expanded reward when changing pages
    setExpandedRewardDetails(null);
  };

  // Create a function to handle new customer reward pagination
  const handleNewCustomerPageChange = (pageNumber: number) => {
    setCurrentNewCustomerPage(pageNumber);
    // Reset expanded reward when changing pages
    setExpandedRewardDetails(null);
  };

  // Add a new state to manage pagination for loyal customers
  const [currentLoyalCustomerPage, setCurrentLoyalCustomerPage] = useState(1);

  // Create a function to handle loyal customer reward pagination
  const handleLoyalCustomerPageChange = (pageNumber: number) => {
    setCurrentLoyalCustomerPage(pageNumber);
    // Reset expanded reward when changing pages
    setExpandedRewardDetails(null);
  };

  // Add these states to handle coffee program configuration
  const [coffeeProgram, setCoffeeProgram] = useState({
    pin: '',
    freeRewardTiming: 'after' as 'before' | 'after',
    frequency: '5',
    levels: '5'
  });

  // Add a function to handle coffee program selection
  const handleCoffeeProgramSelection = (rewardId: string) => {
    // First add the reward to selected rewards
    handleRewardTypeSelection(rewardId);
    
    // Then show the coffee program configuration dialog
    setShowCoffeeProgramConfig(true);
  };

  // Add state to control the coffee program configuration dialog
  const [showCoffeeProgramConfig, setShowCoffeeProgramConfig] = useState(false);

  // First, let's add a state to track if the coffee program has been configured
  const [coffeeProgramConfigured, setCoffeeProgramConfigured] = useState(false);

  // Update the saveCoffeeProgram function to set coffeeProgramConfigured to true

  const saveCoffeeProgram = () => {
    // Save the coffee program configuration
    setCoffeeProgramConfigured(true);
    
    // Add the coffee program to businessData
    const coffeeReward = {
      id: 'coffee-program',
      name: 'Coffee Loyalty Program',
      type: 'program',
      programtype: 'coffee',
      industry: selectedIndustry,
      isNewCustomer: false,
      pointsCost: 0,
      description: 'Buy X coffees, get one free',
      coffeeConfig: {
        pin: coffeeProgram.pin,
        freeRewardTiming: coffeeProgram.freeRewardTiming,
        frequency: parseInt(coffeeProgram.frequency),
        levels: parseInt(coffeeProgram.levels)
      }
    };
    
    setBusinessData(prev => ({
      ...prev,
      selectedRewards: [...prev.selectedRewards, coffeeReward],
      hasSetupReward: true
    }));
    
    console.log("Added coffee program to businessData:", coffeeReward);
    
    // Close the dialog
    setShowCoffeeProgramConfig(false);
    
    // Show success toast
    toast({
      title: "Coffee Program Configured",
      description: "Your coffee program has been set up successfully.",
    });
  }

  // In the review step (Step 4), add a function to handle coffee program configuration
  const handleCoffeeProgramConfig = () => {
    // Find if there's a coffee program in the selected rewards
    const coffeeProgram = businessData.selectedRewards.find(reward => 
      reward.name === "Coffee Lovers Program" || reward.id.includes('coffee-lovers')
    );
    
    if (coffeeProgram && coffeeProgram.coffeeConfig) {
      // If there's already a configuration, load it
      setCoffeeProgram({
        pin: coffeeProgram.coffeeConfig.pin,
        freeRewardTiming: coffeeProgram.coffeeConfig.freeRewardTiming,
        frequency: coffeeProgram.coffeeConfig.frequency.toString(),
        levels: coffeeProgram.coffeeConfig.levels.toString()
      });
      
      // Show the configuration dialog
      setShowCoffeeProgramConfig(true);
    }
  };

  // Add a function to handle cancellation of coffee program configuration
  const handleCancelCoffeeConfig = () => {
    // If this is a new configuration (not editing an existing one)
    if (!coffeeProgramConfigured) {
      // Remove the traditional coffee program from selected rewards
      setWizardSelectedRewards(prev => 
        prev.filter(id => id !== 'traditional-coffee-program')
      );
      
      // Show a toast to inform the user
      toast({
        title: "Configuration Cancelled",
        description: "Coffee program was not added to your selections",
        variant: "default"
      });
    }
    
    // Close the configuration dialog
    setShowCoffeeProgramConfig(false);
  };

  // Add a function to handle removing the coffee program configuration
  const handleRemoveCoffeeConfig = () => {
    // Reset the coffee program configuration
    setCoffeeProgram({
      pin: '',
      freeRewardTiming: 'after',
      frequency: '5',
      levels: '5'
    });
    
    // Mark as not configured
    setCoffeeProgramConfigured(false);
    
    // Remove from selected rewards
    setWizardSelectedRewards(prev => 
      prev.filter(id => id !== 'traditional-coffee-program')
    );
    
    // Remove from business data
    setBusinessData(prev => ({
      ...prev,
      selectedRewards: prev.selectedRewards.filter(r => 
        r.id !== 'traditional-coffee-program'
      )
    }));
    
    // Show a toast to inform the user
    toast({
      title: "Configuration Removed",
      description: "Coffee program configuration has been removed",
      variant: "default"
    });
  };

  // Add states for voucher program configuration
  const [voucherProgram, setVoucherProgram] = useState({
    name: 'Standard Voucher Program',
    description: 'Earn vouchers based on your total spend',
    totalSpendRequired: '100',
    voucherAmount: '10',
    voucherType: 'amount' as 'amount' | 'percent'
  });

  // Add state to control the voucher program configuration dialog
  const [showVoucherProgramConfig, setShowVoucherProgramConfig] = useState(false);

  // Add state to track if the voucher program has been configured
  const [voucherProgramConfigured, setVoucherProgramConfigured] = useState(false);

  // Add a function to save voucher program configuration
  const saveVoucherProgram = () => {
    // Update the voucher program with the configuration
    setBusinessData(prev => {
      const updatedRewards = prev.selectedRewards.map(r => {
        if (r.programtype === 'voucher') {
          return {
            ...r,
            voucherConfig: voucherProgram
          };
        }
        return r;
      });
      
      return {
        ...prev,
        selectedRewards: updatedRewards
      };
    });
    
    // Set the selected program type
    setSelectedProgramType('voucher');
    
    // Close the configuration dialog
    setShowVoucherProgramConfig(false);
    
    // Do NOT automatically advance to the next step
    // setWizardStep(4); - Remove this line
  };

  // Add a function to handle removing the voucher program configuration
  const handleRemoveVoucherConfig = () => {
    // Reset the voucher program configuration
    setVoucherProgram({
      name: 'Standard Voucher Program',
      description: 'Earn vouchers based on your total spend',
      totalSpendRequired: '100',
      voucherAmount: '10',
      voucherType: 'amount'
    });
    
    // Mark as not configured
    setVoucherProgramConfigured(false);
    
    // Remove from selected rewards
    setWizardSelectedRewards(prev => 
      prev.filter(id => id !== 'standard-voucher-program')
    );
    
    // Remove from business data
    setBusinessData(prev => ({
      ...prev,
      selectedRewards: prev.selectedRewards.filter(r => 
        r.id !== 'standard-voucher-program'
      )
    }));
    
    // Show a toast to inform the user
    toast({
      title: "Configuration Removed",
      description: "Voucher program configuration has been removed",
      variant: "default"
    });
  };

  // Add a function to handle cancellation of voucher program configuration
  const handleCancelVoucherConfig = () => {
    // If this is a new configuration (not editing an existing one)
    if (!voucherProgramConfigured) {
      // Remove the voucher program from selected rewards
      setWizardSelectedRewards(prev => 
        prev.filter(id => id !== 'standard-voucher-program')
      );
      
      // Show a toast to inform the user
      toast({
        title: "Configuration Cancelled",
        description: "Voucher program was not added to your selections",
        variant: "default"
      });
    }
    
    // Close the configuration dialog
    setShowVoucherProgramConfig(false);
  };

  // Function that handles saving the banner
  const handleSaveBanner = (data: any) => {
    console.log("======== BANNER SAVE START ========");
    logObjectDetails(data, "RECEIVED BANNER DATA");
    
    // Store the raw banner data
    setBannerData(data);
    
    // Check for announcement in the banner data (note: singular "announcement", not plural)
    if (data.announcement) {
      console.log("Banner has an announcement");
      logObjectDetails(data.announcement, "BANNER ANNOUNCEMENT");
      
      // Store the announcement data
      setAnnouncementData(data.announcement);
    } else {
      console.log("NO ANNOUNCEMENT found in banner data");
    }
    
    // Update the business data
    setBusinessData(prev => {
      const updated = {
        ...prev,
        hasSetupBanner: true,
        bannerDetails: {
          name: data.title || 'Banner',
          type: data.style || 'standard'
        }
      };
      console.log("UPDATED BUSINESS DATA:", updated);
      return updated;
    });
    
    console.log("======== BANNER SAVE COMPLETE ========");
  };

  // Toggler for points rules
  function handlePointsRuleToggle(ruleId: string) {
    if (selectedPointsRules.includes(ruleId)) {
      setSelectedPointsRules((prev) => prev.filter((id) => id !== ruleId))
    } else {
      setSelectedPointsRules((prev) => [...prev, ruleId])
      
      // Show success toast
      toast({
        title: "Rule Selected",
        description: "Points rule has been added to your selections",
        variant: "default"
      })
    }
  }

  // Add this near the top of the component
  useEffect(() => {
    console.log("Current bannerData state:", bannerData);
    console.log("Current businessData state:", businessData);
  }, [bannerData, businessData]);

  // Add the missing handleSaveAnnouncement function
  const handleSaveAnnouncement = (newAnnouncement: any) => {
    console.log("Saving announcement:", newAnnouncement);
    setAnnouncementData(newAnnouncement);
    setShowAnnouncementDesigner(false);
    // Additional logic as needed
  };

  // First, add this state to track which reward's details are expanded
  const [expandedRewardId, setExpandedRewardId] = useState<string | null>(null);

  // Add this state for the mini-wizard
  const [miniWizardStep, setMiniWizardStep] = useState('intro');

  // Add this function to ensure rewards are added before completion
  const handleFinalStep = () => {
    // Check if we have any selected rewards in the wizard
    if (wizardSelectedRewards.length > 0 && businessData.selectedRewards.length === 0) {
      console.log("Adding final rewards before completion...");
      
      // Create reward objects from selected IDs
      const finalRewards = wizardSelectedRewards.map(rewardId => {
        // Parse the reward ID to get type and name
        const [customerType, rewardName] = rewardId.split('-', 2);
        
        return {
          id: rewardId,
          name: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          type: 'individual',
          industry: selectedIndustry,
          isNewCustomer: customerType === 'new',
          pointsCost: 0,
          description: `Reward for ${customerType} customers`,
          rewardName: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          conditions: [],
          limitations: [
            { type: 'customerLimit', value: 1 },
            { type: 'totalRedemptionLimit', value: 100 }
          ]
        };
      });
      
      // Add coffee program if configured
      if (coffeeProgramConfigured) {
        finalRewards.push({
          id: 'coffee-program',
          name: 'Coffee Loyalty Program',
          type: 'program',
          programtype: 'coffee',
          industry: selectedIndustry,
          isNewCustomer: false,
          pointsCost: 0,
          description: 'Buy X coffees, get one free',
          coffeeConfig: {
            pin: coffeeProgram.pin || '1234',
            freeRewardTiming: coffeeProgram.freeRewardTiming || 'after',
            frequency: parseInt(coffeeProgram.frequency || '5'),
            levels: parseInt(coffeeProgram.levels || '10')
          },
          conditions: [],
          limitations: []
        });
      }
      
      // Update businessData with the final rewards
      setBusinessData(prev => {
        const updatedData = {
          ...prev,
          selectedRewards: [...finalRewards],
          hasSetupReward: true
        };
        console.log("Updated businessData with rewards:", updatedData);
        return updatedData;
      });
      
      // Wait a moment for state to update before proceeding
      setTimeout(() => {
        handleComplete();
      }, 100);
    } else {
      // If we already have rewards or none were selected, proceed normally
      handleComplete();
    }
  };

  // Add this function to directly save rewards when moving between customer categories
  const handleCustomerCategoryNext = () => {
    // First, save the current category's rewards
    if (customerCategoryStep === 'new') {
      // Get all selected rewards for new customers
      const newCustomerRewards = wizardSelectedRewards
        .filter(id => id.startsWith('new-'))
        .map(rewardId => {
          const rewardName = rewardId.split('-').slice(1).join('-');
          return {
            id: rewardId,
            name: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: 'individual',
            industry: selectedIndustry,
            isNewCustomer: true,
            pointsCost: 0,
            description: 'Reward for new customers',
            rewardName: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            conditions: [],
            limitations: [
              { type: 'customerLimit', value: 1 },
              { type: 'totalRedemptionLimit', value: 100 }
            ]
          };
        });
      
      console.log("Saving new customer rewards:", newCustomerRewards);
      
      // Add these rewards to businessData
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, ...newCustomerRewards],
        hasSetupReward: true
      }));
      
      // Move to existing customers
      setCustomerCategoryStep('existing');
    } 
    else if (customerCategoryStep === 'existing') {
      // Get all selected rewards for existing customers
      const existingCustomerRewards = wizardSelectedRewards
        .filter(id => id.startsWith('existing-'))
        .map(rewardId => {
          const rewardName = rewardId.split('-').slice(1).join('-');
          return {
            id: rewardId,
            name: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: 'individual',
            industry: selectedIndustry,
            isNewCustomer: false,
            pointsCost: 0,
            description: 'Reward for existing customers',
            rewardName: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            conditions: [],
            limitations: [
              { type: 'customerLimit', value: 1 },
              { type: 'totalRedemptionLimit', value: 100 }
            ]
          };
        });
      
      console.log("Saving existing customer rewards:", existingCustomerRewards);
      
      // Add these rewards to businessData
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, ...existingCustomerRewards],
        hasSetupReward: true
      }));
      
      // Move to loyal customers
      setCustomerCategoryStep('loyal');
    }
    else if (customerCategoryStep === 'loyal') {
      // Get all selected rewards for loyal customers
      const loyalCustomerRewards = wizardSelectedRewards
        .filter(id => id.startsWith('loyal-'))
        .map(rewardId => {
          const rewardName = rewardId.split('-').slice(1).join('-');
          return {
            id: rewardId,
            name: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            type: 'individual',
            industry: selectedIndustry,
            isNewCustomer: false,
            pointsCost: 0,
            description: 'Reward for loyal customers',
            rewardName: rewardName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            conditions: [],
            limitations: [
              { type: 'customerLimit', value: 1 },
              { type: 'totalRedemptionLimit', value: 100 }
            ]
          };
        });
      
      console.log("Saving loyal customer rewards:", loyalCustomerRewards);
      
      // Add these rewards to businessData
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, ...loyalCustomerRewards],
        hasSetupReward: true
      }));
      
      // Move to program selection
      setWizardStep(3);
      setCustomerCategoryStep(null);
    }
  };

  // Add this function to handle the business type selection
  const handleBusinessTypeNext = () => {
    if (selectedIndustry) {
      // Move to the customer category selection
      setWizardStep(2);
      setCustomerCategoryStep('new');
    } else {
      toast({
        title: "Please select a business type",
        description: "You need to select your business type to continue.",
        variant: "destructive"
      });
    }
  };

  // Add this function to handle the points rules navigation
  const handlePointsRulesNext = () => {
    // Save the selected points rules if needed
    console.log("Moving from points rules to banner step");
    
    // Move to the banner step
    setStep(4);
  };

  return (
    <div className="container max-w-[1600px] py-10">
      {/* Exit button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 h-8 w-8 rounded-full"
        onClick={handleExitClick}
        title="Exit onboarding"
      >
        <X className="h-4 w-4" />
      </Button>
      
      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative">
        {/* Progress bar - only show when not on intro page */}
        {hasViewedIntro && (
          <div className="md:col-span-3 md:order-first">
            <div className="fixed top-0 left-0 bottom-0 w-[320px] bg-gray-50 overflow-y-auto border-r border-gray-100 shadow-sm">
              {/* Simplified branding header */}
              <div className="bg-gray-50 text-gray-800 p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  {/* Logo image */}
                  <img src="/logo.png" alt="Logo" className="h-6 w-6 rounded" />
                  <h2 className="text-xl font-medium">
                    <span className="font-bold text-[#007AFF]">Tap</span> Loyalty
                  </h2>
                </div>
                <p className="text-xs text-gray-500 mt-1">Business Onboarding</p>
              </div>
              
              {/* Progress content */}
              <div className="px-5 py-6">
                {/* Progress bar */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">Progress</span>
                    <span className="text-xs font-medium text-[#007AFF]">Step {step} of {totalSteps}</span>
                  </div>
                  <div className="h-2 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                      style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* Steps list */}
                <div className="space-y-5">
                  {/* Info step status */}
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 1 ? "bg-[#007AFF] text-white" :
                      step > 1 ? "bg-green-100 text-green-600" :
                      "bg-white text-gray-400"
                    }`}>
                      {step > 1 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step >= 1 ? "text-gray-800" : "text-gray-400"
                      }`}>
                        About Tap Loyalty
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Learn how the platform works
                      </p>
                    </div>
                  </div>
                  
                  {/* Reward creation status - now step 2 */}
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 2 ? "bg-[#007AFF] text-white" :
                      step > 2 ? "bg-green-100 text-green-600" :
                      "bg-white text-gray-400"
                    }`}>
                      {step > 2 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Gift className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step >= 2 ? "text-gray-800" : "text-gray-400"
                      }`}>
                        Create Rewards
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Set up rewards for customers
                      </p>
                      {businessData.selectedRewards.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {businessData.selectedRewards.length} rewards selected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Points rule status - now step 3 */}
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 3 ? "bg-[#007AFF] text-white" :
                      step > 3 ? "bg-green-100 text-green-600" :
                      "bg-white text-gray-400"
                    }`}>
                      {step > 3 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <BarChart className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step >= 3 ? "text-gray-800" : "text-gray-400"
                      }`}>
                        Set Up Points Rules
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Define how points are earned
                      </p>
                      {selectedPointsRules.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            {selectedPointsRules.length} rules selected
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Banner status - now step 4 */}
                  <div className="flex items-start gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 4 ? "bg-[#007AFF] text-white" :
                      step > 4 ? "bg-green-100 text-green-600" :
                      "bg-white text-gray-400"
                    }`}>
                      {step > 4 ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Image className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        step >= 4 ? "text-gray-800" : "text-gray-400"
                      }`}>
                        Create Homepage Banner
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Design a promotional banner
                      </p>
                      {businessData.bannerDetails && (
                        <div className="mt-2">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Banner created
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Copyright at bottom */}
                <div className="mt-auto pt-8 text-center fixed bottom-4 left-0 right-0 w-[320px]">
                  <p className="text-xs text-gray-400">© 2023 Tap Loyalty</p>
                </div>
              </div>
            </div>
            {/* This empty div takes up space in the grid to push main content */}
            <div className="w-[320px]"></div>
          </div>
        )}

        {/* Main setup module - centered */}
        <div className={hasViewedIntro 
          ? "md:col-span-9 w-full" 
          : "md:col-span-12 w-full"
        }>
          {/* Welcome title section - centered above the setup module */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl mb-1">
              <span className="font-bold text-[#007AFF]">Let's</span> <span className="text-black">Get Started</span>
            </h1>
            <p className="text-sm text-gray-500">Build your loyalty program in just a few simple steps</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm w-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {step === 1 && "About Tap Loyalty"}
                {step === 2 && wizardStep === 1 && "Select Your Business Type"}
                {step === 2 && wizardStep === 2 && "Select Rewards"}
                {step === 2 && wizardStep === 3 && "Select a Loyalty Program"}
                {step === 3 && "Points Rules"}
                {step === 4 && "Marketing Banner"}
              </CardTitle>
              <CardDescription className="text-xs">
                {step === 1 && "Learn how our loyalty platform works for your business"}
                {step === 2 && wizardStep === 1 && "Choose your industry to get personalized reward suggestions"}
                {step === 2 && wizardStep === 2 && customerCategoryStep === 'new' && "Choose rewards for new customers"}
                {step === 2 && wizardStep === 2 && customerCategoryStep === 'existing' && "Choose rewards for existing customers"}
                {step === 2 && wizardStep === 2 && customerCategoryStep === 'loyal' && "Choose rewards for loyal customers"}
                {step === 2 && wizardStep === 3 && "Choose a program type that best fits your business"}
                {step === 3 && "Define how customers earn points"}
                {step === 4 && "Create a banner to promote your program"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-6 space-y-4">
              {/* Step 1: About Tap Loyalty - Mini Wizard */}
              {step === 1 && (
                <div className="space-y-6">
                  {/* Mini-wizard navigation */}
                  <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-200">
                      {[
                        { id: 'intro', label: 'Introduction' },
                        { id: 'how', label: 'How It Works' },
                        { id: 'apps', label: 'The Apps' },
                        { id: 'setup', label: 'Your Setup' }
                      ].map((tab, index) => (
                        <button
                          key={tab.id}
                          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            miniWizardStep === tab.id 
                              ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          onClick={() => setMiniWizardStep(tab.id)}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </div>
                            <span>{tab.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {/* Mini-wizard content */}
                    <div className="p-6">
                      {/* Introduction */}
                      {miniWizardStep === 'intro' && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <Sparkles className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900">
                              Welcome to <span className="text-blue-600 font-bold">Tap Loyalty</span>
                            </h3>
                          </div>
                          
                          <p className="text-gray-600">
                            Tap Loyalty helps you build customer relationships and grow your business through a simple, 
                            effective loyalty program that rewards your customers for their repeat business.
                          </p>
                          
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-blue-800">
                            <p className="text-sm">
                              <strong>In this onboarding process, you'll set up:</strong>
                            </p>
                            <ul className="mt-2 space-y-1 text-sm">
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-blue-600" />
                                <span>Rewards for your customers</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-blue-600" />
                                <span>Points earning rules</span>
                              </li>
                              <li className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-blue-600" />
                                <span>Marketing banner for your app</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                      
                      {/* How It Works */}
                      {miniWizardStep === 'how' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900">How Tap Loyalty Works</h3>
                          
                          {/* Tabs for Consumer vs Merchant view */}
                          <Tabs defaultValue="merchant" className="w-full">
                            <TabsList className="grid grid-cols-2 mb-6">
                              <TabsTrigger value="consumer">For Consumers</TabsTrigger>
                              <TabsTrigger value="merchant">For Merchants</TabsTrigger>
                            </TabsList>
                            
                            {/* Consumer Tab Content */}
                            <TabsContent value="consumer" className="space-y-6">
                              <div className="grid gap-6 md:grid-cols-3">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">1</div>
                                    <h4 className="font-medium text-gray-900">Connect Their Bank</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Customers securely link their bank accounts using Open Banking and the Consumer Data Right (CDR) for bank-level security and privacy.
                                  </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">2</div>
                                    <h4 className="font-medium text-gray-900">Shop Normally</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Customers pay as usual at participating businesses. AutoTap™ technology automatically detects their transactions in real-time.
                                  </p>
                                </div>
                            
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">3</div>
                                    <h4 className="font-medium text-gray-900">Earn & Redeem</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Rewards grow automatically and can be redeemed at any participating business. Customers climb loyalty tiers for better perks.
                                  </p>
                                </div>
                              </div>
                              
                              {/* AutoTap Technology section */}
                              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                                <h4 className="font-medium text-gray-900 mb-3">AutoTap™ Technology</h4>
                                <p className="text-sm text-gray-700 mb-4">
                                  Our proprietary AutoTap technology uses Australia's Open Banking framework to securely access customers' consented transaction data, matching their purchases at participating merchants in real-time to automatically assign rewards - no scanning required.
                                </p>
                                
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Bank-level security</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Privacy-first CDR compliance</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Zero friction</span>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                            
                            {/* Merchant Tab Content */}
                            <TabsContent value="merchant" className="space-y-6">
                              <div className="grid gap-6 md:grid-cols-3">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">1</div>
                                    <h4 className="font-medium text-gray-900">Simple Setup</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Create your merchant profile, customize your rewards, and define points rules. We'll handle all the technical integration.
                                  </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">2</div>
                                    <h4 className="font-medium text-gray-900">Automatic Point Earning</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    When customers make purchases at your business, they automatically earn points through AutoTap™ technology with no extra hardware needed.
                                  </p>
                                </div>
                            
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">3</div>
                                    <h4 className="font-medium text-gray-900">Build Customer Loyalty</h4>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Track customer engagement, offer special rewards, and drive repeat business through your merchant dashboard.
                                  </p>
                                </div>
                              </div>
                              
                              {/* Points Earning Details */}
                              <div className="bg-blue-50 p-5 rounded-lg border border-blue-100">
                                <h4 className="font-medium text-gray-900 mb-3">How Points Work For Your Business</h4>
                                <p className="text-sm text-gray-700 mb-4">
                                  By default, customers earn <span className="font-semibold">3 points for every $1 spent</span> at your business. You can create special rules for bonus points during specific times or for specific customer actions.
                                </p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Percent className="h-4 w-4 text-blue-600" />
                                      <h5 className="font-medium text-gray-800 text-sm">Default Multiplier</h5>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      3× points for every $1 spent at your business by default.
                                    </p>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Clock className="h-4 w-4 text-blue-600" />
                                      <h5 className="font-medium text-gray-800 text-sm">Time-Based Bonuses</h5>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Create happy hours or special days with increased point multipliers to drive traffic during slow periods.
                                    </p>
                                  </div>
                                  
                                  <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Crown className="h-4 w-4 text-blue-600" />
                                      <h5 className="font-medium text-gray-800 text-sm">Reward Redemption</h5>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Set point thresholds for rewards and control how and when customers can redeem them at your business.
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Customer insights */}
                              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <h4 className="font-medium text-gray-900 mb-3">Customer Insights & Analytics</h4>
                                <p className="text-sm text-gray-600 mb-4">
                                  Gain valuable data about your customers' spending habits and loyalty program engagement through our comprehensive dashboard:
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Customer visit frequency</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Average transaction value</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Most popular rewards</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-blue-600" />
                                    <span className="text-sm text-gray-700">Customer retention metrics</span>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>
                          
                          {/* Customer Data Control section */}
                          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Customer Data Control</h4>
                            <p className="text-sm text-gray-600 italic mb-4">We believe privacy is a fundamental right, not just a feature</p>
                            
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                <h5 className="font-medium text-gray-800 text-sm mb-2">Bank-Level Security</h5>
                                <p className="text-xs text-gray-600">
                                  Customers' financial data is protected with AES-256 encryption and enterprise-grade security protocols. We never store their full banking credentials.
                                </p>
                              </div>
                              
                              <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                <h5 className="font-medium text-gray-800 text-sm mb-2">Transparent Permissions</h5>
                                <p className="text-xs text-gray-600">
                                  We only access the data customers explicitly allow. Our permissions are clearly explained, and they can revoke access at any time.
                                </p>
                              </div>
                              
                              <div className="bg-white p-3 rounded-md border border-gray-100 shadow-sm">
                                <h5 className="font-medium text-gray-800 text-sm mb-2">No Data Selling</h5>
                                <p className="text-xs text-gray-600">
                                  Unlike many loyalty programs, we never sell customers' personal data to third parties. Their information is used solely to enhance their rewards experience.
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Compliance badges with actual images */}
                          <div className="grid grid-cols-3 gap-4 pt-2">
                            <div className="flex flex-col items-center">
                              <div className="h-16 flex items-center justify-center mb-2">
                                <img 
                                  src="/accc.png" 
                                  alt="ACCC Approved" 
                                  width={64} 
                                  height={64}
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs text-gray-600 text-center">ACCC Approved</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="h-16 flex items-center justify-center mb-2">
                                <img 
                                  src="/cdr.png" 
                                  alt="CDR Compliant" 
                                  width={110} 
                                  height={110}
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs text-gray-600 text-center">CDR Compliant</span>
                            </div>
                            
                            <div className="flex flex-col items-center">
                              <div className="h-16 flex items-center justify-center mb-2">
                                <img 
                                  src="/aus.png" 
                                  alt="Australian Owned" 
                                  width={64} 
                                  height={64}
                                  className="object-contain"
                                />
                              </div>
                              <span className="text-xs text-gray-600 text-center">Australian Owned</span>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-600">
                              Tap Loyalty is fully compliant with Australia's Consumer Data Right (CDR) framework and has received approval from the Australian Competition and Consumer Commission (ACCC). We adhere to strict Australian privacy laws and banking regulations, using military-grade AES-256 encryption to ensure customers' data is handled with the highest standards of security and transparency.
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* The Apps */}
                      {miniWizardStep === 'apps' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900">The Tap Loyalty Apps</h3>
                          
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Store className="h-5 w-5 text-blue-600" />
                                </div>
                                <h4 className="font-medium text-gray-900">Merchant Dashboard</h4>
                              </div>
                              
                              <ul className="space-y-3">
                                {[
                                  "Create and manage rewards",
                                  "Track customer visits and points",
                                  "View analytics and insights",
                                  "Customize your loyalty program"
                                ].map((item, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm">
                                    <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Users className="h-5 w-5 text-blue-600" />
                                </div>
                                <h4 className="font-medium text-gray-900">Customer App</h4>
                              </div>
                              
                              <div className="flex flex-col items-center gap-6">
                                <ul className="space-y-3 w-full">
                                  {[
                                    "Earn points with every visit",
                                    "Discover local businesses",
                                    "Redeem exciting rewards",
                                    "Track points and progress"
                                  ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                      <Check className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                      <span className="text-gray-700">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                                
                                <img 
                                  src="/ios.png" 
                                  alt="iOS App"
                                  width={720} 
                                  height={1440}
                                  className="object-contain max-h-[720px]"
                                  style={{ transform: 'scale(1.2)' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Your Setup */}
                      {miniWizardStep === 'setup' && (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-gray-900">What You'll Set Up Today</h3>
                          
                          <div className="space-y-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Gift className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 mb-1">Rewards</h5>
                                <p className="text-sm text-gray-600">Create enticing rewards that customers can redeem with their points</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <BarChart className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 mb-1">Points Rules</h5>
                                <p className="text-sm text-gray-600">Set how customers earn points with visits and purchases</p>
                              </div>
                            </div>
                            
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Image className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900 mb-1">Marketing Banner</h5>
                                <p className="text-sm text-gray-600">Create a banner to promote your loyalty program to customers</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <p className="text-sm text-blue-800">
                              <strong>Ready to get started?</strong> Click "Continue" below to begin setting up your loyalty program.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Mini-wizard navigation buttons */}
                    <div className="flex justify-between items-center border-t border-gray-200 p-4 bg-gray-50">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          const steps = ['intro', 'how', 'apps', 'setup'];
                          const currentIndex = steps.indexOf(miniWizardStep);
                          if (currentIndex > 0) {
                            setMiniWizardStep(steps[currentIndex - 1]);
                          }
                        }}
                        disabled={miniWizardStep === 'intro'}
                      >
                        <ChevronLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Button>
                      
                      {miniWizardStep === 'setup' ? (
                        <Button 
                          onClick={() => {
                            setStep(2);
                            setWizardStep(1); // Explicitly set to business type selection
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Continue to Setup
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => {
                            const steps = ['intro', 'how', 'apps', 'setup'];
                            const currentIndex = steps.indexOf(miniWizardStep);
                            if (currentIndex < steps.length - 1) {
                              setMiniWizardStep(steps[currentIndex + 1]);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Next
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Create Rewards */}
              {step === 2 && (
                <div className="space-y-6">
                  {/* Industry Selection - wizardStep 1 */}
                  {wizardStep === 1 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Café / Coffee Shop */}
                        <div 
                          className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                            selectedIndustry === 'cafe' 
                              ? 'bg-blue-50 ring-2 ring-blue-500' 
                              : 'bg-white border border-gray-200 hover:border-blue-200'
                          }`}
                          onClick={() => handleIndustrySelect('cafe')}
                        >
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Coffee className="h-5 w-5 text-blue-600" />
                          </div>
                            <div className="flex-1">
                            <h3 className="font-medium text-gray-900">Café / Coffee Shop</h3>
                            <p className="text-sm text-gray-500 mt-1">Coffee, pastries, light meals</p>
                          </div>
                            {selectedIndustry === 'cafe' && (
                            <Check className="h-5 w-5 text-blue-500 ml-auto" />
                            )}
                        </div>
                        
                        {/* Restaurant */}
                        <div 
                          className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                            selectedIndustry === 'restaurant' 
                              ? 'bg-blue-50 ring-2 ring-blue-500' 
                              : 'bg-white border border-gray-200 hover:border-blue-200'
                          }`}
                          onClick={() => handleIndustrySelect('restaurant')}
                        >
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Utensils className="h-5 w-5 text-blue-600" />
                          </div>
                            <div className="flex-1">
                            <h3 className="font-medium text-gray-900">Restaurant</h3>
                            <p className="text-sm text-gray-500 mt-1">Dining, food service</p>
                          </div>
                            {selectedIndustry === 'restaurant' && (
                            <Check className="h-5 w-5 text-blue-500 ml-auto" />
                            )}
                        </div>
                        
                        {/* Retail */}
                        <div 
                          className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-all ${
                            selectedIndustry === 'retail' 
                              ? 'bg-blue-50 ring-2 ring-blue-500' 
                              : 'bg-white border border-gray-200 hover:border-blue-200'
                          }`}
                          onClick={() => handleIndustrySelect('retail')}
                        >
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                            <div className="flex-1">
                            <h3 className="font-medium text-gray-900">Retail</h3>
                            <p className="text-sm text-gray-500 mt-1">Shops, stores, merchandise</p>
                          </div>
                            {selectedIndustry === 'retail' && (
                            <Check className="h-5 w-5 text-blue-500 ml-auto" />
                            )}
                      </div>
                    </div>
                    
                      <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                        <Button variant="outline" onClick={handleBack}>
                          Back
                        </Button>
                                    <Button 
                          onClick={handleBusinessTypeNext}
                          disabled={!selectedIndustry}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                    </>
                  )}
                  
                  {/* Reward Selection - wizardStep 2 */}
                  {wizardStep === 2 && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* New customer rewards */}
                        {customerCategoryStep === 'new' && (
                          <>
                            <RewardCard
                              id="new-welcome-discount"
                              name="Welcome Discount"
                              description="10% off first purchase"
                              icon={Percent}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-welcome-discount')}
                              onSelect={() => handleRewardSelection('new-welcome-discount')}
                            />

                            {/* Add the new reward here */}
                            <RewardCard
                              id="new-customer-discount"
                              name="New Customer Discount"
                              description="20% off your first purchase"
                              icon={Percent}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-customer-discount')}
                              onSelect={() => handleRewardSelection('new-customer-discount')}
                            />

                            {/* Free Snack with Drink */}
                            <RewardCard
                              id="new-free-snack"
                              name="Free Snack with Drink"
                              description="Complimentary snack with any drink purchase"
                              icon={UtensilsCrossed}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 400 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-free-snack')}
                              onSelect={() => handleRewardSelection('new-free-snack')}
                            />

                            {/* First Visit Coffee Combo */}
                            <RewardCard
                              id="new-coffee-combo"
                              name="First Visit Coffee Combo"
                              description="Special price on coffee and pastry combo"
                              icon={Coffee}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-coffee-combo')}
                              onSelect={() => handleRewardSelection('new-coffee-combo')}
                            />

                            {/* Charming Morning Mug */}
                            <RewardCard
                              id="new-morning-mug"
                              name="Charming Morning Mug"
                              description="Free mug gift on your first morning visit"
                              icon={Gift}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 200 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-morning-mug')}
                              onSelect={() => handleRewardSelection('new-morning-mug')}
                            />

                            {/* Referral Bonus */}
                            <RewardCard
                              id="new-referral-bonus"
                              name="Referral Bonus for Newcomers"
                              description="10% off when you bring a friend"
                              icon={Users}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 100 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-referral-bonus')}
                              onSelect={() => handleRewardSelection('new-referral-bonus')}
                            />
                          </>
                          )}
                          
                        {/* Existing customer rewards */}
                          {customerCategoryStep === 'existing' && (
                            <>
                            {/* Taste Tester Invitation */}
                            <RewardCard
                              id="existing-taste-tester"
                              name="Taste Tester Invitation"
                              description="Receive an invitation to be a taste tester for new menu items. Your feedback is valuable!"
                              icon={UtensilsCrossed}
                              conditions={[{ type: 'totalLifetimeSpend', value: 300 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 150 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-taste-tester')}
                              onSelect={() => handleRewardSelection('existing-taste-tester')}
                            />

                            {/* End of Month Surprise */}
                            <RewardCard
                              id="existing-month-surprise"
                              name="End of Month Surprise"
                              description="Enjoy a surprise treat with your last purchase of the month, just to brighten your day!"
                              icon={Gift}
                              conditions={[]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-month-surprise')}
                              onSelect={() => handleRewardSelection('existing-month-surprise')}
                            />

                            {/* Weekly Special Discount */}
                            <RewardCard
                              id="existing-weekly-special"
                              name="Weekly Special Discount"
                              description="Enjoy a 15% discount on one item every Tuesday as a thank you for your loyalty!"
                              icon={Calendar}
                              conditions={[]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 400 },
                                { type: 'daysOfWeek', value: ['Tuesday'] }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-weekly-special')}
                              onSelect={() => handleRewardSelection('existing-weekly-special')}
                            />

                            {/* Bring a Friend Bonus */}
                            <RewardCard
                              id="existing-bring-friend"
                              name="Bring a Friend Bonus"
                              description="Bring a friend and both receive a 10% discount on your purchases! Share the joy of coffee."
                              icon={Users}
                              conditions={[]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-bring-friend')}
                              onSelect={() => handleRewardSelection('existing-bring-friend')}
                            />

                            {/* Coffee of the Month */}
                            <RewardCard
                              id="existing-coffee-month"
                              name="Coffee of the Month"
                              description="Get a special coffee offer every month just for our loyal customers!"
                              icon={Coffee}
                              conditions={[
                                { type: 'minimumLifetimeSpend', value: 150 }
                              ]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 250 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-coffee-month')}
                              onSelect={() => handleRewardSelection('existing-coffee-month')}
                            />

                            {/* Free Upgrade */}
                            <RewardCard
                              id="existing-free-upgrade"
                              name="Free Upgrade on Your Choice"
                              description="Enjoy a free upgrade on your next drink—get that large latte for the price of a regular!"
                              icon={ArrowUp}
                              conditions={[
                                { type: 'minimumTransactions', value: 1 }
                              ]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 500 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('existing-free-upgrade')}
                              onSelect={() => handleRewardSelection('existing-free-upgrade')}
                            />
                        </>
                      )}
                      
                        {/* Loyal customer rewards */}
                          {customerCategoryStep === 'loyal' && (
                            <>
                            <RewardCard
                              id="loyal-vip-discount"
                              name="VIP Discount"
                              description="20% off for VIP members"
                              icon={Award}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 500 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('loyal-vip-discount')}
                              onSelect={() => handleRewardSelection('loyal-vip-discount')}
                            />
                                          
                            <RewardCard
                              id="loyal-exclusive-access"
                              name="Exclusive Access"
                              description="Early access to new products"
                              icon={Sparkles}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 300 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('loyal-exclusive-access')}
                              onSelect={() => handleRewardSelection('loyal-exclusive-access')}
                            />
                          </>
                        )}
                                    </div>
                                    
                      <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                        <Button variant="outline" onClick={handleBack}>
                          Back
                            </Button>
                                            <Button
                          onClick={handleCustomerCategoryNext}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                            </div>
                    </>
                  )}
                  
                  {/* Program Selection - wizardStep 3 */}
                  {wizardStep === 3 && (
                    <>
                      {/* Single container with dropdown for coffee program */}
                      <div className="mt-4">
                        {/* Coffee Program Button */}
                        <div className="border rounded-lg overflow-hidden bg-white">
                          <div 
                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                            onClick={() => setShowCoffeeProgramConfig(!showCoffeeProgramConfig)}
                          >
                            <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Coffee className="h-5 w-5 text-blue-600" />
                                </div>
                              <div>
                            <h3 className="font-medium text-gray-900">Coffee Program</h3>
                                <p className="text-sm text-gray-500">Buy X coffees, get one free!</p>
                            </div>
                            </div>
                            <ChevronDown 
                              className={`h-5 w-5 text-gray-500 transition-transform ${
                                showCoffeeProgramConfig ? 'rotate-180' : ''
                              }`}
                            />
                          </div>
                          
                          {/* Configuration section - shown when expanded */}
                          {showCoffeeProgramConfig && (
                            <div className="border-t border-gray-200 bg-gray-50 p-4">
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="coffee-pin">PIN Code</Label>
                                  <Input 
                                    id="coffee-pin" 
                                    value={coffeeProgram.pin} 
                                    onChange={(e) => setCoffeeProgram({...coffeeProgram, pin: e.target.value})}
                                    className="mt-1"
                                    placeholder="1234"
                                  />
                                </div>
                                
                                <div>
                                  <Label>First Free Coffee</Label>
                                  <RadioGroup 
                                    value={coffeeProgram.freeRewardTiming}
                                    onValueChange={(value) => setCoffeeProgram({
                                      ...coffeeProgram, 
                                      freeRewardTiming: value as 'before' | 'after'
                                    })}
                                    className="mt-1"
                                  >
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="before" id="before" />
                                      <Label htmlFor="before">Before first transaction</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <RadioGroupItem value="after" id="after" />
                                      <Label htmlFor="after">After first transaction</Label>
                                    </div>
                                  </RadioGroup>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label htmlFor="frequency">Frequency</Label>
                                  <Input 
                                    id="frequency" 
                                    type="number"
                                    value={coffeeProgram.frequency} 
                                    onChange={(e) => setCoffeeProgram({
                                      ...coffeeProgram, 
                                      frequency: e.target.value
                                    })}
                                    className="mt-1"
                                    placeholder="5"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="levels">Number of Rewards</Label>
                                  <Input 
                                    id="levels" 
                                    type="number"
                                    value={coffeeProgram.levels} 
                                    onChange={(e) => setCoffeeProgram({
                                      ...coffeeProgram, 
                                      levels: e.target.value
                                    })}
                                    className="mt-1"
                                    placeholder="10"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex justify-end">
                                <Button 
                                  variant="default"
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    // Save coffee program configuration
                                    setCoffeeProgramConfigured(true);
                                    setShowCoffeeProgramConfig(false);
                                    toast({
                                      title: "Coffee Program Configured",
                                      description: "Your coffee program has been set up successfully.",
                                    });
                                  }}
                                >
                                  Save Configuration
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          {/* Show configured program details if configured */}
                          {coffeeProgramConfigured && !showCoffeeProgramConfig && (
                            <div className="border-t border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-gray-700">Configuration Details</h4>
                                <div className="flex items-center text-green-600">
                                  <Check className="h-4 w-4 mr-1" />
                                  <span className="text-sm font-medium">Configured</span>
                                </div>
                          </div>
                          
                              <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <div>
                                  <span className="text-gray-500">PIN Code:</span>
                                  <span className="ml-2 font-medium">{coffeeProgram.pin}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">First Free Coffee:</span>
                                  <span className="ml-2 font-medium">
                                    {coffeeProgram.freeRewardTiming === 'before' ? 'Before first transaction' : 'After first transaction'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Frequency:</span>
                                  <span className="ml-2 font-medium">Every {coffeeProgram.frequency} transactions</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Number of Rewards:</span>
                                  <span className="ml-2 font-medium">{coffeeProgram.levels}</span>
                                </div>
                              </div>
                              
                              {/* Add Remove Configuration button */}
                              <div className="mt-4 flex justify-end">
                                <Button 
                                  variant="outline" 
                                  className="text-red-500 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setCoffeeProgramConfigured(false);
                                    toast({
                                      title: "Configuration Removed",
                                      description: "Coffee program configuration has been removed.",
                                      variant: "destructive"
                                    });
                                  }}
                                >
                                  Remove Configuration
                                </Button>
                                </div>
                            </div>
                          )}
                                    </div>
                                  </div>
                                  
                      <div className="flex justify-end pt-6 mt-6 border-t border-gray-200">
                        <Button variant="outline" onClick={handleBack}>
                          Back
                                    </Button>
                            <Button 
                          onClick={() => {
                            // Force advance to next step regardless of coffee program configuration
                            if (step < totalSteps) {
                              // Move directly to the next main step
                              setStep(step + 1);
                            } else {
                              // Or complete the wizard if this is the last step
                              handleComplete();
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 ml-2"
                        >
                          Continue
                          <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                    </>
                      )}
                </div>
              )}

              {/* Step 3: Set up Points Rules - Changing to Reward Categories */}
              {step === 3 && (
                <div className="mt-4">
                  {/* Here we use PointsRuleCard, not RewardCard */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        id: "morning-coffee-perk",
                        name: "Morning Coffee Perk",
                        description: "1.5x points in the morning hours, if you spend at least $4, on weekdays.",
                        icon: Coffee,
                        pointsmultiplier: 1.5,
                        conditions: [
                          {
                            type: "timeOfDay",
                            startTime: "December 11, 2024 at 7:00:00 AM UTC+11",
                            endTime: "December 11, 2024 at 10:00:00 AM UTC+11"
                          },
                          {
                            type: "minimumSpend",
                            amount: 4.0
                          },
                          {
                            type: "daysOfWeek",
                            days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
                          }
                        ],
                        merchantId: "abc123",
                        createdAt: "December 10, 2024 at 6:00:00 PM UTC+11",
                      },
                      {
                        id: "lunchtime-loyalty-boost",
                        name: "Lunchtime Loyalty Boost",
                        description: "2x points at lunchtime if you spend at least $10, on M/W/F.",
                        icon: Coffee, // or whichever icon you prefer, e.g., Utensils or Gift
                        pointsmultiplier: 2,
                        conditions: [
                          {
                            type: "timeOfDay",
                            startTime: "December 11, 2024 at 12:00:00 PM UTC+11",
                            endTime: "December 11, 2024 at 2:00:00 PM UTC+11"
                          },
                          {
                            type: "minimumSpend",
                            amount: 10.0
                          },
                          {
                            type: "daysOfWeek",
                            days: ["Monday", "Wednesday", "Friday"]
                          }
                        ],
                        merchantId: "abc123",
                        createdAt: "December 10, 2024 at 6:30:00 PM UTC+11",
                      }
                    ].map((rule) => (
                      <PointsRuleCard
                        key={rule.id}
                        id={rule.id}
                        name={rule.name}
                        description={rule.description}
                        icon={rule.icon}
                        conditions={rule.conditions || []}
                        pointsmultiplier={rule.pointsmultiplier}
                        isSelected={selectedPointsRules.includes(rule.id)}
                        onSelect={() => handlePointsRuleToggle(rule.id)}
                        isPointsRule={true} // Explicitly set to true for points rules
                      />
                    ))}
                  </div>
                  
                  {/* Add bottom navigation */}
                  <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button 
                      onClick={handlePointsRulesNext}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Create Homepage Banner */}
              {step === 4 && (
                <div className="space-y-6">
                  {/* Banner creation card with illustration and prominent CTA */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl overflow-hidden border border-blue-100 shadow-sm">
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-10">
                      {/* Left side: Real BannerPreview component - increased gap and adjusted padding */}
                      <div className="w-full md:w-2/5 flex justify-start pl-0 md:pl-4">
                        <div className="relative w-full max-w-xs shadow-lg">
                          {/* Show either the created banner or the example banner */}
                          <div className="relative z-0">
                            {bannerData ? (
                              <BannerPreview
                                title={bannerData.title}
                                description={bannerData.description}
                                color={bannerData.color}
                                styleType={bannerData.styleType}
                                merchantName={fetchedMerchantName || "Your Store"}
                                forceWhiteText={bannerData.styleType !== BannerStyle.DARK}
                              />
                            ) : (
                              <BannerPreview
                                title="Welcome to Our Store"
                                description="Join our loyalty program today and start earning rewards with every purchase!"
                                color="#3B82F6"
                                styleType={BannerStyle.LIGHT}
                                merchantName="Your Store"
                                forceWhiteText={true}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Right side: Content and CTA - updated description */}
                      <div className="w-full md:w-3/5 text-center md:text-left">
                        <div className="flex items-center gap-2 mb-3">
                          <h2 className="text-2xl font-bold text-gray-900">
                            Create Your App Homepage Banner
                          </h2>
                          <Badge variant="outline" className="text-gray-500 border-gray-300">
                            Optional
                          </Badge>
                        </div>
                        <p className="text-gray-600 mb-6">
                          Add a beautiful banner to your loyalty app's home page to highlight 
                          special offers and increase customer engagement.
                        </p>
                        
                        {bannerData ? (
                          <div className="flex flex-col items-center md:items-start">
                            <div className="flex items-center gap-2 text-green-600 mb-3">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">Banner created successfully!</span>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                onClick={() => setShowBannerDialog(true)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                Edit Your Banner
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => {
                                  setBannerData(null);
                                  toast({
                                    title: "Banner removed",
                                    description: "Your banner has been removed.",
                                    variant: "default"
                                  });
                                }}
                                className="border-red-200 text-red-600 hover:bg-red-50"
                              >
                                Remove Banner
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => setShowBannerDialog(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-lg text-lg shadow-md transition-all hover:shadow-lg flex items-center gap-2"
                          >
                            <Sparkles className="h-5 w-5" />
                            Design Your Banner
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Bottom section with benefits */}
                    <div className="bg-white border-t border-blue-100 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Eye className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-600">Increase app engagement</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm text-gray-600">Attract new customers</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Gift className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-600">Promote special offers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Add bottom navigation if it doesn't exist */}
                  <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                    <Button variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                    <Button 
                      onClick={handleFinalStep}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
            </div>
            
      {/* Add the exit confirmation dialog */}
      <AlertDialog open={showExitConfirmation} onOpenChange={setShowExitConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit Onboarding?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to exit? Your progress will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push('/dashboard')}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Coffee Program Configuration Dialog */}
      <Dialog open={showCoffeeProgramConfig} onOpenChange={setShowCoffeeProgramConfig}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center">
                <span className="text-[#007AFF]">Configure</span>{' '}Coffee Program
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 min-h-[300px] space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>PIN Code</Label>
                <Input
                  type="text"
                  maxLength={4}
                  value={coffeeProgram.pin}
                  onChange={(e) => setCoffeeProgram({ ...coffeeProgram, pin: e.target.value })}
                  placeholder="Enter 4-digit PIN"
                />
                <p className="text-sm text-muted-foreground">
                  Staff will enter this PIN when redeeming free coffees
                </p>
                </div>

              <div className="grid gap-2">
                <Label>First Free Coffee Timing</Label>
                <RadioGroup
                  value={coffeeProgram.freeRewardTiming}
                  onValueChange={(value: 'before' | 'after') => 
                    setCoffeeProgram({ ...coffeeProgram, freeRewardTiming: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after">After first transaction</Label>
              </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="before" />
                    <Label htmlFor="before">Before first transaction</Label>
            </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  Choose when customers receive their first free coffee
                </p>
          </div>

              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Input
                  type="number"
                  min="1"
                  value={coffeeProgram.frequency}
                  onChange={(e) => setCoffeeProgram({ ...coffeeProgram, frequency: e.target.value })}
                  placeholder="Enter number of transactions"
                />
                <p className="text-sm text-muted-foreground">
                  Number of transactions required between free coffees
                </p>
        </div>

              <div className="grid gap-2">
                <Label>Number of Rewards</Label>
                <Input
                  type="number"
                  min="1"
                  value={coffeeProgram.levels}
                  onChange={(e) => setCoffeeProgram({ ...coffeeProgram, levels: e.target.value })}
                  placeholder="Enter number of rewards"
                />
                <p className="text-sm text-muted-foreground">
                  Total number of free coffees in the program
                </p>
      </div>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelCoffeeConfig}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveCoffeeProgram}
            >
              Create Program
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Voucher Program Configuration Dialog */}
      <Dialog open={showVoucherProgramConfig} onOpenChange={setShowVoucherProgramConfig}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              <div className="flex items-center">
                <span className="text-[#007AFF]">Configure</span>{' '}Voucher Program
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 min-h-[300px] space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>Program Name</Label>
                <Input
                  type="text"
                  value={voucherProgram.name}
                  onChange={(e) => setVoucherProgram({ ...voucherProgram, name: e.target.value })}
                  placeholder="Enter program name"
                />
                <p className="text-sm text-muted-foreground">
                  Name of your voucher program
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  type="text"
                  value={voucherProgram.description}
                  onChange={(e) => setVoucherProgram({ ...voucherProgram, description: e.target.value })}
                  placeholder="Enter program description"
                />
                <p className="text-sm text-muted-foreground">
                  Brief description of your voucher program
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Total Spend Required</Label>
                <Input
                  type="number"
                  min="1"
                  value={voucherProgram.totalSpendRequired}
                  onChange={(e) => setVoucherProgram({ ...voucherProgram, totalSpendRequired: e.target.value })}
                  placeholder="Enter amount"
                />
                <p className="text-sm text-muted-foreground">
                  Amount customers need to spend to earn a voucher
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Voucher Type</Label>
                <RadioGroup
                  value={voucherProgram.voucherType}
                  onValueChange={(value: 'amount' | 'percent') => 
                    setVoucherProgram({ ...voucherProgram, voucherType: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="amount" id="amount" />
                    <Label htmlFor="amount">Fixed Amount ($)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="percent" id="percent" />
                    <Label htmlFor="percent">Percentage (%)</Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  Choose the type of voucher to issue
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Voucher Amount</Label>
                <Input
                  type="number"
                  min="1"
                  value={voucherProgram.voucherAmount}
                  onChange={(e) => setVoucherProgram({ ...voucherProgram, voucherAmount: e.target.value })}
                  placeholder="Enter amount"
                />
                <p className="text-sm text-muted-foreground">
                  {voucherProgram.voucherType === 'percent' ? 
                    'Percentage discount for the voucher' : 
                    'Dollar amount for the voucher'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancelVoucherConfig}
            >
              Cancel
            </Button>
            <Button 
              onClick={saveVoucherProgram}
            >
              Create Program
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* The Create Banner Dialog */}
      <CreateBannerDialog
        open={showBannerDialog}
        onOpenChange={setShowBannerDialog}
        initialBannerData={bannerData}
        onSave={(data) => {
          console.log("======== CREATE BANNER DIALOG RETURNED DATA ========");
          console.log("Full data object:", JSON.stringify(data, null, 2));
          console.log(`Has announcements property: ${data.hasOwnProperty('announcements')}`);
          if (data.announcements) {
            console.log(`Announcements count: ${data.announcements.length}`);
            data.announcements.forEach((ann, i) => 
              console.log(`Announcement ${i}:`, JSON.stringify(ann, null, 2))
            );
          }
          handleSaveBanner(data);
        }}
      />

      {/* The Announcement Designer Dialog */}
      <AnnouncementDesignerDialog
        open={showAnnouncementDesigner}
        onOpenChange={setShowAnnouncementDesigner}
        onSave={(newAnnouncement) => handleSaveAnnouncement(newAnnouncement)}
        initialAnnouncement={announcementData}
      />
    </div>
  )
} 