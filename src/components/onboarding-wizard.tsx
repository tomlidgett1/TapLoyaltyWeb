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
import { ArrowRight, CheckCircle, Coffee, Gift, Store, Users, Upload, Sparkles, Award, BarChart, Image, Utensils, Percent, Cake, Wine, UtensilsCrossed, Check, X, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Ban, Calendar, ChevronLeft, Clock, Package, Plus, DollarSign, HelpCircle, Crown, ArrowUp } from "lucide-react"
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
}: {
  id: string
  name: string
  description: string
  icon: LucideIcon
  conditions: { type: string; [key: string]: any }[]
  pointsmultiplier?: number
  isSelected: boolean
  onSelect: () => void
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
              {/* Show "Points Rule" badge on the same line */}
              <Badge
                variant="outline"
                className="text-[10px] text-blue-600 border-blue-400 cursor-default"
              >
                Points Rule
              </Badge>
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
  
  // Move these state declarations up here, before they're used
  const [selectedPointsRules, setSelectedPointsRules] = useState<string[]>([])
  const [bannerData, setBannerData] = useState<any>(null)
  const [showBannerDialog, setShowBannerDialog] = useState(false)
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcementData, setAnnouncementData] = useState<any>(null)
  
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const totalSteps = 3
  
  const [customerCategoryStep, setCustomerCategoryStep] = useState<'new' | 'existing' | 'loyal' | null>(null)
  
  const handleNext = () => {
    // If we're in Step 1 (Create First Reward)
    if (step === 1) {
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
      
      // Create a batch to handle multiple Firestore operations
      const batch = writeBatch(db);
      
      // Save onboarding data to Firestore
      const merchantRef = doc(db, 'merchants', user.uid);
      batch.update(merchantRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      });
      
      // 1) Create the selected rewards
      for (const reward of businessData.selectedRewards) {
        const rewardRef = doc(collection(db, 'merchants', user.uid, 'rewards'));
        
        // Prepare the reward data with all required fields
        const rewardData = {
          rewardName: reward.rewardName || reward.name,
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
          rewardData.programtype = reward.programtype;
          
          // If this is a coffee program, add coffee-specific configuration
          if (reward.programtype === 'coffee' && reward.coffeeConfig) {
            rewardData.coffeeConfig = reward.coffeeConfig;
          }
        }
        
        batch.set(rewardRef, rewardData);
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
      for (const ruleId of selectedPointsRules) {
        const ruleDocRef = doc(collection(db, 'merchants', user.uid, 'pointsRules'));
        
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
        
        batch.set(ruleDocRef, ruleData);
      }
      
      // 4) Handle coffee program creation separately if needed
      let coffeeRewardId = null;

      // Log all rewards to see what we're working with
      console.log('All selected rewards:', businessData.selectedRewards);

      // Look specifically for coffee program - check for 'Traditional Coffee Program' by name or coffee programtype
      const coffeeProgram = businessData.selectedRewards.find(r => 
        r.name === 'Traditional Coffee Program' || 
        r.rewardName === 'Traditional Coffee Program' || 
        r.programtype === 'coffee'
      );

      console.log('Traditional Coffee Program found:', coffeeProgram);

      if (coffeeProgram) {
        console.log('Found coffee program:', coffeeProgram);
        
        try {
          console.log('Committing batch before coffee program creation');
          // First commit the batch to ensure all other data is saved
          await batch.commit();
          console.log('Batch committed successfully');
          
          // Get coffee configuration - either from the coffeeConfig property or from state
          const coffeeConfig = coffeeProgram.coffeeConfig || coffeeProgram;
          console.log('Using coffee config:', coffeeConfig);
          
          // Validate that functions object exists
          if (!functions) {
            console.error('Firebase functions object is undefined or null');
            throw new Error('Firebase functions not available');
          }
          
          console.log('Preparing to call cloud function "coffeeprogram"');
          // Then call the cloud function to create the coffee program
          const coffeeprogramFunc = httpsCallable(functions, 'coffeeprogram');
          
          // Prepare data for the function call
          const data = {
            merchantId: user.uid,
            pin: coffeeConfig.pin || '1234',  // Use default if missing
            firstCoffeeBeforeTransaction: 
              (coffeeConfig.freeRewardTiming === 'before') || false,
            frequency: parseInt(coffeeConfig.frequency?.toString() || '5'),
            levels: parseInt(coffeeConfig.levels?.toString() || '10')
          };
          
          console.log('Calling coffee program function with data:', JSON.stringify(data, null, 2));
          
          // Show a loading toast while the function is being called
          toast({
            title: "Creating Coffee Program",
            description: "Please wait while we set up your coffee loyalty program...",
          });
          
          const result = await coffeeprogramFunc(data);
          console.log('Coffee program function call completed with result:', result);
          
          // Show success message
          toast({
            title: "Coffee Program Created",
            description: "Your coffee loyalty program has been set up successfully.",
          });
        } catch (error: any) {
          // Detailed error logging
          console.error('Error creating coffee program:', error);
          console.error('Error message:', error.message);
          
          toast({
            title: "Coffee Program Error",
            description: `Failed to create coffee program: ${error.message || 'Unknown error'}`,
            variant: "destructive"
          });
        }
      } else {
        console.log('No Traditional Coffee Program found, committing batch normally');
        // If no coffee program, just commit the batch
        await batch.commit();
      }
      
      toast({
        title: "Onboarding completed!",
        description: `Your account has been set up successfully with ${businessData.selectedRewards.length} rewards.`,
      });
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error completing onboarding:', error);
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
  const [hasViewedIntro, setHasViewedIntro] = useState(false)

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
    // Update the business data with the coffee program configuration
    setBusinessData(prev => {
      const updatedRewards = prev.selectedRewards.map(r => {
        if (r.programtype === 'coffee' || r.name === 'Traditional Coffee Program') {
          return {
            ...r,
            programtype: 'coffee',
            coffeeConfig: {
              pin: coffeeProgram.pin,
              freeRewardTiming: coffeeProgram.freeRewardTiming,
              frequency: parseInt(coffeeProgram.frequency.toString()),
              levels: parseInt(coffeeProgram.levels.toString())
            }
          };
        }
        return r;
      });
      
      return {
        ...prev,
        selectedRewards: updatedRewards
      };
    });
    
    // Set the coffee program as configured
    setCoffeeProgramConfigured(true);
    
    // Close the configuration dialog
    setShowCoffeeProgramConfig(false);
    
    // Show a success toast
    toast({
      title: "Coffee Program Configured",
      description: "Your coffee loyalty program has been set up successfully.",
      variant: "default"
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

  // Add this helper function to format the reward card
  const RewardCard = ({ 
    id, 
    name, 
    description, 
    icon: Icon,
    conditions,
    limitations,
    isSelected,
    onSelect,
    pointsmultiplier
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
  }) => {
    const isExpanded = expandedRewardId === id;

    // Helper: Convert numeric multiplier to a simple "2x" string.
    const multiplierLabel = pointsmultiplier && pointsmultiplier > 1
      ? `${pointsmultiplier}x`
      : null

    return (
      <div
        className={`border rounded-lg overflow-hidden bg-white transition-all ${
        isSelected ? 'ring-2 ring-green-500 border-green-500' : 'border-gray-200'
        }`}
      >
        {/* Show a small points-rule badge at the top if we're on Step 2 */}
        {step === 2 && (
          <div className="px-4 pt-4">
            <Badge
              variant="outline"
              className="text-[10px] text-blue-600 border-blue-400 cursor-default"
            >
              Points Rule
            </Badge>
          </div>
        )}

        <div 
          className={`flex items-start gap-3 p-4 cursor-pointer transition-all ${
            isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
          }`}
          onClick={() => setExpandedRewardId(isExpanded ? null : id)}
        >
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
            <Icon className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {/* Display the rule name plus multiplier ("2x") if it exists */}
              <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{name}</h3>
                {multiplierLabel && (
                  <Badge variant="secondary" className="text-[10px]">
                    {multiplierLabel}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isSelected && (
                  <span className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="h-4 w-4" />
                    Selected
                  </span>
                )}
                <ChevronDown 
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
        </div>

        {/* Collapsible details section */}
        <div className={`border-t border-gray-200 ${isExpanded ? '' : 'hidden'}`}>
          <div className="p-4 bg-gray-50 space-y-4">
            {/* Conditions */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Conditions:</h4>
              {conditions.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No conditions</div>
               ) : (
                <div className="space-y-3">
                  {conditions.map((cond, i) => {
                    if (cond.type === 'timeOfDay') {
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
                            <span className="text-sm text-gray-600 ml-1">${cond.amount || cond.value}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'daysOfWeek') {
                      const days = cond.days || (Array.isArray(cond.value) ? cond.value : []);
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Days:</span>
                            <span className="text-sm text-gray-600 ml-1">{days.join(', ')}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'maximumTransactions' || cond.type === 'minimumTransactions') {
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">{cond.type === 'maximumTransactions' ? 'Maximum' : 'Minimum'} Transactions:</span>
                            <span className="text-sm text-gray-600 ml-1">{cond.value}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'totalLifetimeSpend') {
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <DollarSign className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Total Lifetime Spend:</span>
                            <span className="text-sm text-gray-600 ml-1">${cond.value}</span>
                          </div>
                        </div>
                      )
                    } else if (cond.type === 'minimumLifetimeSpend') {
                      return (
                        <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                          <DollarSign className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Minimum Lifetime Spend:</span>
                            <span className="text-sm text-gray-600 ml-1">${cond.value}</span>
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
                    // Default case for any other condition types
                    return (
                      <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                        <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          <span className="font-medium">{cond.type}:</span> {JSON.stringify(cond.value || cond)}
                        </div>
                      </div>
                    )
                  })}
                </div>
               )}
            </div>
 
            {/* Limitations - using the same nice formatting */}
            {limitations && limitations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Limitations:</h4>
                <div className="space-y-3">
                  {limitations.map((limitation, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                      {limitation.type === 'customerLimit' ? (
                        <>
                          <Users className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Customer Limit:</span>
                            <span className="text-sm text-gray-600 ml-1">{limitation.value} per customer</span>
                          </div>
                        </>
                      ) : limitation.type === 'totalRedemptionLimit' ? (
                        <>
                          <Ban className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Total Limit:</span>
                            <span className="text-sm text-gray-600 ml-1">{limitation.value} redemptions</span>
                          </div>
                        </>
                      ) : limitation.type === 'daysOfWeek' ? (
                        <>
                          <Calendar className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">Days:</span>
                            <span className="text-sm text-gray-600 ml-1">
                              {Array.isArray(limitation.value) 
                                ? limitation.value.join(', ') 
                                : limitation.value}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <HelpCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-sm text-gray-700">{limitation.type}:</span>
                            <span className="text-sm text-gray-600 ml-1">{JSON.stringify(limitation.value)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
 
            {/* Select button below limitations */}
            <div className="pt-2">
              <Button
                size="sm"
                variant={isSelected ? "outline" : "default"}
                className={isSelected 
                  ? "border-red-500 text-red-500 hover:bg-red-50" 
                  : "bg-green-600 hover:bg-green-700 text-white"
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
              >
                {isSelected ? (
                  "Remove Selection"
                ) : (
                  "Select Reward"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
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
            <div className="fixed top-0 left-0 bottom-0 w-[320px] bg-white overflow-y-auto border-r border-gray-200 shadow-sm">
              {/* Branding header */}
              <div className="bg-[#007AFF] text-white p-5 pb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold">Tap Loyalty</h2>
                </div>
                <p className="text-sm text-white/80">Business Onboarding</p>
      </div>
      
              {/* Progress content with negative margin to overlap with header */}
              <div className="px-5 pt-0 pb-5 -mt-4">
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600">Progress</span>
                    <span className="text-sm font-medium text-[#007AFF]">Step {step} of {totalSteps}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#007AFF] rounded-full transition-all duration-300"
                      style={{ width: `${(step / totalSteps) * 100}%` }}
                    />
                  </div>
      </div>
                
                <h3 className="text-lg font-medium mb-4 text-gray-800">Your Setup Progress</h3>
                
                <div className="space-y-6">
                  {/* Reward creation status */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 1 ? "bg-[#007AFF] text-white" :
                      step > 1 ? "bg-green-100 text-green-600" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {step > 1 ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Gift className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-base font-medium ${
                        step >= 1 ? "text-gray-900" : "text-gray-500"
                      }`}>
                        Create Rewards
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Set up rewards for your customers to earn
                      </p>
                      {businessData.selectedRewards.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {businessData.selectedRewards.map((reward) => (
                            <div key={reward.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                              <p className="text-xs text-gray-600 truncate">{reward.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Points rule status */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 2 ? "bg-[#007AFF] text-white" :
                      step > 2 ? "bg-green-100 text-green-600" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {step > 2 ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <BarChart className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-base font-medium ${
                        step >= 2 ? "text-gray-900" : "text-gray-500"
                      }`}>
                        Set Up Points Rules
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Define how customers earn points
                      </p>
                      {selectedPointsRules.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedPointsRules.map((rule) => (
                            <div key={rule} className="flex items-center gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                              <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                              <p className="text-xs text-gray-600 truncate">{rule.replace(/-/g, ' ')}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Banner status */}
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step === 3 ? "bg-[#007AFF] text-white" :
                      step > 3 ? "bg-green-100 text-green-600" :
                      "bg-gray-100 text-gray-400"
                    }`}>
                      {step > 3 ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Image className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-base font-medium ${
                        step >= 3 ? "text-gray-900" : "text-gray-500"
                      }`}>
                        Create Homepage Banner
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Design a banner to promote your program
                      </p>
                      {businessData.bannerDetails && (
                        <div className="mt-3 bg-gray-50 p-2 rounded-md border border-gray-200">
                          <p className="text-xs text-gray-600">
                            {businessData.bannerDetails.name} ({businessData.bannerDetails.type})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Add a help section at the bottom */}
                <div className="mt-12 pt-6 border-t border-gray-200">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-[#007AFF]" />
                      Need help?
                    </h4>
                    <p className="text-xs text-gray-600 mb-3">
                      Our setup guide can help you make the most of your loyalty program.
                    </p>
                    <Button variant="outline" size="sm" className="w-full text-[#007AFF] border-[#007AFF]/30 hover:bg-[#007AFF]/10">
                      View Setup Guide
                    </Button>
                  </div>
                  
                  <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">© 2023 Tap Loyalty</p>
                  </div>
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
            <h1 className="text-2xl font-bold mb-1">Welcome to <span className="text-[#007AFF]">Tap Loyalty</span></h1>
            <p className="text-sm text-gray-500">Let's set up your loyalty program in just a few steps</p>
          </div>
          
          <Card className="border-gray-200 shadow-sm w-full">
            <CardHeader className="py-3 px-4 border-b">
              {hasViewedIntro && (
                <div className="flex items-center w-full">
                  {/* Title section - only show when not on intro page */}
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {step === 1 && wizardStep === 1 && "Select Your Business Type"}
                      {step === 1 && wizardStep === 2 && "Select Rewards"}
                      {step === 1 && wizardStep === 3 && "Select a Loyalty Program"}
                      {step === 2 && "Points Rules"}
                      {step === 3 && "Marketing Banner"}
              </CardTitle>
                    <CardDescription className="text-xs">
                      {step === 1 && wizardStep === 1 && "Choose your industry to get personalized reward suggestions"}
                      {step === 1 && wizardStep === 2 && customerCategoryStep === 'new' && "Choose rewards for new customers"}
                      {step === 1 && wizardStep === 2 && customerCategoryStep === 'existing' && "Choose rewards for existing customers"}
                      {step === 1 && wizardStep === 2 && customerCategoryStep === 'loyal' && "Choose rewards for loyal customers"}
                      {step === 1 && wizardStep === 3 && "Choose a program type that best fits your business"}
                      {step === 2 && "Define how customers earn points"}
                      {step === 3 && "Create a banner to promote your program"}
              </CardDescription>
                  </div>
                  
                  {/* Navigation buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(step > 1 || (step === 1 && hasViewedIntro)) ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          // If we're in a sub-step of the wizard (like 2.2)
                          if (step === 1 && hasViewedIntro && wizardStep > 1) {
                            // Go back to the previous wizard step
                            setWizardStep(wizardStep - 1);
                          } 
                          // If we're on the first wizard step but after intro
                          else if (step === 1 && hasViewedIntro && wizardStep === 1) {
                            // Go back to intro
                            setHasViewedIntro(false);
                          }
                          // Otherwise use the normal step navigation
                          else {
                            handleBack();
                          }
                        }}
                      >
                        Back
                      </Button>
                    ) : (
                      <div>{/* Empty div to maintain the flex layout */}</div>
                    )}
                    
                    <Button 
                      onClick={handleNext}
                      disabled={loading}
                      className="bg-[#007AFF] hover:bg-[#0066CC]"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </div>
                      ) : step === totalSteps ? (
                        <>Complete Setup</>
                      ) : (
                        <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="pt-6 space-y-4">
              {/* Step 1: Create First Reward */}
              {step === 1 && !hasViewedIntro && (
                <div className="space-y-8">
                  <div className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-lg border border-blue-100">
                    <h3 className="text-xl font-semibold mb-4 text-blue-900">
                      Welcome to{" "}
                      <span className="font-bold" style={{ color: '#007AFF' }}>
                        TAP
                      </span>{" "}
                      Loyalty
                    </h3>
                    
                    {/* Apps Section */}
                    <div className="grid md:grid-cols-2 gap-6 mb-8">
                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Store className="h-5 w-5 text-purple-600" />
                      </div>
                          <h4 className="font-medium text-purple-900">Merchant App</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Your dashboard to manage rewards, track customer engagement, and grow your business.
                        </p>
                        <ul className="space-y-2">
                          {[
                            "Create and manage rewards",
                            "Track customer visits and points",
                            "View analytics and insights",
                            "Customize your loyalty program"
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Users className="h-5 w-5 text-green-600" />
                          </div>
                          <h4 className="font-medium text-green-900">Consumer App</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Where customers discover businesses, earn points, and redeem rewards.
                        </p>
                        <ul className="space-y-2">
                          {[
                            "Earn points with every visit",
                            "Discover local businesses",
                            "Redeem exciting rewards",
                            "Track points and progress"
                          ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    {/* How It Works Section */}
                    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8">
                      <h4 className="font-medium text-lg mb-4">How TAP Loyalty Works</h4>
                      <div className="grid gap-6 md:grid-cols-3">
                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                            <Coffee className="h-6 w-6 text-amber-600" />
                          </div>
                          <h5 className="font-medium mb-2">1. Customer Visits</h5>
                        <p className="text-sm text-gray-600">
                            Customers visit your business and earn points through the TAP app
                          </p>
                        </div>

                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                            <Gift className="h-6 w-6 text-blue-600" />
                            </div>
                          <h5 className="font-medium mb-2">2. Points Accumulate</h5>
                          <p className="text-sm text-gray-600">
                            Points add up based on your custom rules and visit frequency
                          </p>
                          </div>
                    
                        <div className="text-center">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                            <Award className="h-6 w-6 text-green-600" />
                      </div>
                          <h5 className="font-medium mb-2">3. Reward Redemption</h5>
                          <p className="text-sm text-gray-600">
                            Customers redeem points for rewards you've created
                          </p>
                  </div>
                </div>
                    </div>

                    {/* Features Overview */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-lg">What You Can Create</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          {
                            icon: <Gift className="h-5 w-5 text-pink-600" />,
                            title: "Rewards",
                            description: "Create enticing rewards that customers can redeem with their points"
                          },
                          {
                            icon: <BarChart className="h-5 w-5 text-blue-600" />,
                            title: "Points Rules",
                            description: "Set how customers earn points with visits and purchases"
                          },
                          {
                            icon: <Sparkles className="h-5 w-5 text-purple-600" />,
                            title: "Programs",
                            description: "Design special programs for new, existing, and loyal customers"
                          },
                          {
                            icon: <Image className="h-5 w-5 text-green-600" />,
                            title: "Marketing",
                            description: "Create banners to promote your loyalty program"
                          }
                        ].map((feature, i) => (
                          <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-200">
                            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0">
                              {feature.icon}
                      </div>
                            <div>
                              <h5 className="font-medium mb-1">{feature.title}</h5>
                              <p className="text-sm text-gray-600">{feature.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Get Started Button */}
                    <div className="mt-8 text-center">
                      <Button
                        onClick={() => setHasViewedIntro(true)}
                        className="bg-[#007AFF] hover:bg-[#0066CC] text-white px-8"
                      >
                        Let's Get Started <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                            </div>
                          </div>
                </div>
              )}

              {/* Original reward creation content - only show after intro */}
              {step === 1 && hasViewedIntro && (
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
                          onClick={handleNext}
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
                              id="new-welcome-latte"
                              name="Welcome Latte"
                              description="Free coffee for first-time customers"
                              icon={Coffee}
                              conditions={[{ type: 'maximumTransactions', value: 1 }]}
                              limitations={[
                                { type: 'customerLimit', value: 1 },
                                { type: 'totalRedemptionLimit', value: 500 }
                              ]}
                              isSelected={wizardSelectedRewards.includes('new-welcome-latte')}
                              onSelect={() => handleRewardSelection('new-welcome-latte')}
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
                          onClick={handleNext}
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

              {/* Step 2: Set up Points Rules - Changing to Reward Categories */}
              {step === 2 && (
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
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Create Homepage Banner */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Moved the "Customize Banner" button above the container */}
                  <div className="flex justify-end">
                    {bannerData ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">Selected!</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBannerDialog(true)
                          // Possibly pre-fill bannerData with a "Promotional Banner" template
                        }}
                      >
                        Create Banner
                      </Button>
                    )}
                  </div>

                  {/* A nicer introduction about creating banners */}
                  <div className="bg-white p-4 rounded-md border border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">
                      Create an Engaging Homepage Banner
                    </h2>
                    <p className="text-sm text-gray-600">
                      Make a memorable first impression by adding a visually appealing banner 
                      that highlights your loyalty program, seasonal offers, or key promotions. 
                      This is a great way to capture attention and encourage customers to take action.
                    </p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Image className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Create Homepage Banner</h3>
                        <p className="text-sm text-gray-500">
                          Promote your loyalty program with an eye-catching banner
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <Image className="h-5 w-5 text-rose-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Welcome Banner</h4>
                          <p className="text-sm text-gray-500">Introduce customers to your loyalty program</p>
                        </div>
                        {bannerData ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Selected!</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowBannerDialog(true)
                              // Possibly pre-fill bannerData with a "Welcome Banner" template
                            }}
                          >
                            Customize Banner
                          </Button>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <Image className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Promotional Banner</h4>
                          <p className="text-sm text-gray-500">Highlight special offers or limited-time rewards</p>
                        </div>
                        {bannerData ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-5 w-5" />
                            <span className="text-sm font-medium">Selected!</span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowBannerDialog(true)
                              // Possibly pre-fill bannerData with a "Promotional Banner" template
                            }}
                          >
                            Customize Banner
                          </Button>
                        )}
                      </div>
                    </div>
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