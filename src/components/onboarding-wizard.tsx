"use client"

// This file exists only to satisfy Tailwind's content scanning
// The actual onboarding functionality is in src/app/onboarding/page.tsx 

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, updateDoc, writeBatch } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { ArrowRight, CheckCircle, Coffee, Gift, Store, Users, Upload, Sparkles, Award, BarChart, Image, Utensils, Percent, Cake, Wine, UtensilsCrossed, Check, X, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Ban } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    hasSetupReward: false,
    selectedRewards: [] as {
      id: string,
      name: string,
      type: string,
      industry: string,
      isNewCustomer: boolean,
      pointsCost: number,
      description: string
    }[],
    hasSetupPointsRule: false,
    pointsRuleDetails: null as { name: string, type: string } | null,
    hasSetupBanner: false,
    bannerDetails: null as { name: string, type: string } | null
  })
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
          setWizardStep(2)
          setCustomerCategoryStep('new') // Start with new customers
          return
        } else {
          toast({
            title: "Please select an industry",
            description: "You need to select your business type to continue.",
            variant: "destructive"
          })
          return
        }
      } else if (wizardStep === 2) {
        // From Reward Selection to next category or Program Selection
        if (customerCategoryStep === 'new') {
          // Check if at least one reward is selected for new customers
          if (wizardSelectedRewards.filter(r => r.includes('new-')).length > 0) {
            setCustomerCategoryStep('existing')
            return
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for new customers.",
              variant: "destructive"
            })
            return
          }
        } else if (customerCategoryStep === 'existing') {
          // Check if at least one reward is selected for existing customers
          if (wizardSelectedRewards.filter(r => r.includes('existing-')).length > 0) {
            setCustomerCategoryStep('loyal')
            return
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for existing customers.",
              variant: "destructive"
            })
            return
          }
        } else if (customerCategoryStep === 'loyal') {
          // Check if at least one reward is selected for loyal customers
          if (wizardSelectedRewards.filter(r => r.includes('loyal-')).length > 0) {
            setWizardStep(3) // Move to program selection
            setCustomerCategoryStep(null)
            return
          } else {
            toast({
              title: "Please select a reward",
              description: "You need to select at least one reward for loyal customers.",
              variant: "destructive"
            })
            return
          }
        }
      } else if (wizardStep === 3) {
        // From Program Selection to Confirmation
        if (selectedProgramType) {
          setWizardStep(4)
          return
        } else {
          toast({
            title: "Please select a program type",
            description: "You need to select a reward program to continue.",
            variant: "destructive"
          })
          return
        }
      } else if (wizardStep === 4) {
        // From Confirmation to next main step
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
        setStep(step + 1)
        return
      }
    }
    
    // For other main steps, just move to the next step
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }
  
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
    if (!user?.uid) return
    
    try {
      setLoading(true)
      
      // Create a batch to handle multiple Firestore operations
      const batch = writeBatch(db)
      
      // Save onboarding data to Firestore
      const merchantRef = doc(db, 'merchants', user.uid)
      batch.update(merchantRef, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      })
      
      // Create the selected rewards
      for (const reward of businessData.selectedRewards) {
        const rewardRef = doc(collection(db, 'merchants', user.uid, 'rewards'))
        
        // Format the reward data according to the required structure
        const rewardData = {
          rewardName: reward.rewardName,
          description: reward.description,
          isActive: true,
          pointsCost: reward.pointsCost,
          rewardVisibility: 'global',
          conditions: reward.conditions || [],
          limitations: reward.limitations || [
            {
              type: 'customerLimit',
              value: 1
            },
            {
              type: 'totalRedemptionLimit',
              value: 100
            }
          ],
          createdAt: new Date().toISOString()
        }
        
        batch.set(rewardRef, rewardData)
      }
      
      // Commit all the changes
      await batch.commit()
      
      toast({
        title: "Onboarding completed!",
        description: `Your account has been set up successfully with ${businessData.selectedRewards.length} rewards.`,
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
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

  const handleRewardSelection = (rewardId: string, type: 'individual' | 'program') => {
    // Create a unique ID that includes both the reward ID and the type
    const uniqueId = `${rewardId}-${type}`;
    
    // Define the base reward details with the required JSON structure
    const rewardDetails = {
      id: uniqueId,
      name: '',
      type: type,
      industry: selectedIndustry,
      isNewCustomer: false,
      rewardName: '',
      description: '',
      isActive: true,
      pointsCost: 0,
      rewardVisibility: 'global',
      conditions: [] as any[],
      limitations: [
        {
          type: 'customerLimit',
          value: 1
        },
        {
          type: 'totalRedemptionLimit',
          value: 100
        }
      ]
    }
    
    // Set the specific details based on the reward ID and type
    switch (rewardId) {
      case 'cafe-coffee':
        if (type === 'individual') {
          rewardDetails.name = 'Free Coffee';
          rewardDetails.rewardName = 'Free Coffee';
          rewardDetails.pointsCost = 150;
          rewardDetails.description = 'Enjoy a free coffee of your choice after earning enough points.';
          
          // Add conditions for individual reward
          rewardDetails.conditions = [
            {
              type: 'minimumTransactions',
              value: 10
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'Coffee Lovers Program';
          rewardDetails.rewardName = 'Coffee Lovers Program';
          rewardDetails.pointsCost = 500;
          rewardDetails.description = 'A program with coffee-related rewards at different point levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'cafe-pastry':
        if (type === 'individual') {
          rewardDetails.name = 'Free Pastry';
          rewardDetails.rewardName = 'Free Pastry';
          rewardDetails.pointsCost = 200;
          rewardDetails.description = 'Redeem for a free pastry of your choice after spending $50.';
          
          // Add conditions for individual reward
          rewardDetails.conditions = [
            {
              type: 'minimumSpend',
              amount: 50
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'daysOfWeek',
            value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          });
        } else {
          rewardDetails.name = 'Sweet Treats Program';
          rewardDetails.rewardName = 'Sweet Treats Program';
          rewardDetails.pointsCost = 600;
          rewardDetails.description = 'A program with pastry and dessert rewards at different tiers';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'cafe-new':
        if (type === 'individual') {
          rewardDetails.name = 'New Customer Welcome Reward';
          rewardDetails.rewardName = 'New Customer Welcome Reward';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special offer for first-time customers with no purchase required.';
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'New Customer Welcome Program';
          rewardDetails.rewardName = 'New Customer Welcome Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special perks for new customers on their first visit';
          rewardDetails.programtype = 'welcome';
        }
        break;
        
      case 'retail-discount':
        if (type === 'individual') {
          rewardDetails.name = '15% Discount';
          rewardDetails.rewardName = '15% Discount';
          rewardDetails.pointsCost = 300;
          rewardDetails.description = 'Get 15% off your next purchase after earning enough points.';
          rewardDetails.voucherAmount = 15.0; // Percentage discount
          
          rewardDetails.conditions = [
            {
              type: 'minimumPointsBalance',
              value: 300
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'Tiered Discount Program';
          rewardDetails.rewardName = 'Tiered Discount Program';
          rewardDetails.pointsCost = 800;
          rewardDetails.description = 'A program with increasing discounts at different point thresholds';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'retail-first-time':
        if (type === 'individual') {
          rewardDetails.name = 'First-Time Shopper Discount';
          rewardDetails.rewardName = 'First-Time Shopper Discount';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special 10% discount for new customers on their first visit.';
          rewardDetails.voucherAmount = 10.0; // Percentage discount
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'First-Time Shopper Program';
          rewardDetails.rewardName = 'First-Time Shopper Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'A program with special offers for first-time shoppers';
          rewardDetails.programtype = 'welcome';
        }
        break;
        
      case 'retail-vip':
        if (type === 'individual') {
          rewardDetails.name = 'Free Gift';
          rewardDetails.rewardName = 'Free Gift';
          rewardDetails.pointsCost = 300;
          rewardDetails.description = 'Receive a free gift with your next purchase after earning enough points.';
          
          rewardDetails.conditions = [
            {
              type: 'minimumPointsBalance',
              value: 300
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'VIP Rewards Program';
          rewardDetails.rewardName = 'VIP Rewards Program';
          rewardDetails.pointsCost = 750;
          rewardDetails.description = 'A program with exclusive gifts and perks for loyal customers';
          rewardDetails.programtype = 'vip';
        }
        break;
        
      case 'restaurant-appetizer':
        if (type === 'individual') {
          rewardDetails.name = 'Free Appetizer';
          rewardDetails.rewardName = 'Free Appetizer';
          rewardDetails.pointsCost = 250;
          rewardDetails.description = 'Enjoy a free appetizer after your 5th visit.';
          
          rewardDetails.conditions = [
            {
              type: 'visitNumber',
              number: 5
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'daysOfWeek',
            value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
          });
        } else {
          rewardDetails.name = 'Dining Rewards Program';
          rewardDetails.rewardName = 'Dining Rewards Program';
          rewardDetails.pointsCost = 700;
          rewardDetails.description = 'A program with appetizers, desserts, and entrees at different levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'restaurant-drink':
        if (type === 'individual') {
          rewardDetails.name = 'Free Drink';
          rewardDetails.rewardName = 'Free Drink';
          rewardDetails.pointsCost = 200;
          rewardDetails.description = 'Redeem for a free drink after spending $100.';
          
          rewardDetails.conditions = [
            {
              type: 'minimumSpend',
              amount: 100
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'timeOfDay',
            value: {
              startTime: '16:00',
              endTime: '19:00'
            }
          });
        } else {
          rewardDetails.name = 'Beverage Rewards Program';
          rewardDetails.rewardName = 'Beverage Rewards Program';
          rewardDetails.pointsCost = 600;
          rewardDetails.description = 'A program with different drink rewards at various point levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'restaurant-first-time':
        if (type === 'individual') {
          rewardDetails.name = 'First-Time Diner Special';
          rewardDetails.rewardName = 'First-Time Diner Special';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Complimentary dessert or appetizer for first-time diners.';
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'First-Time Diner Program';
          rewardDetails.rewardName = 'First-Time Diner Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'A program with special perks for customers on their first visit';
          rewardDetails.programtype = 'welcome';
        }
        break;
    }
    
    // Check if this reward is already selected
    const isAlreadySelected = businessData.selectedRewards.some(reward => reward.id === uniqueId)
    
    if (isAlreadySelected) {
      // Remove it if already selected
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: prev.selectedRewards.filter(reward => reward.id !== uniqueId)
      }))
    } else {
      // Add it if not already selected
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, rewardDetails],
        hasSetupReward: true
      }))
    }
  }

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
  const handleIndustrySelection = (industry: string) => {
    setSelectedIndustry(industry)
    setWizardStep(2) // Move to individual reward selection
  }

  // Add this state to track selected rewards in the wizard
  const [wizardSelectedRewards, setWizardSelectedRewards] = useState<string[]>([])

  // Modify the handleRewardTypeSelection function to close the collapsible after selection
  const handleRewardTypeSelection = (type: string) => {
    // Add the reward to selected rewards if not already selected
    if (!wizardSelectedRewards.includes(type)) {
      setWizardSelectedRewards(prev => [...prev, type])
      
      // Show a success toast
      toast({
        title: "Reward selected!",
        description: `"${type}" has been added to your selections.`,
        variant: "default"
      })
    }
    
    // Close the collapsible by setting expandedRewardDetails to null
    setExpandedRewardDetails(null)
  }

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
      
      {/* Welcome title section - centered above the grid */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold mb-1">Welcome to <span className="text-[#007AFF]">Tap Loyalty</span></h1>
        <p className="text-sm text-gray-500">Let's set up your loyalty program in just a few steps</p>
      </div>
      
      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Empty column for left spacing */}
        <div className="hidden md:block md:col-span-2">
          {/* This creates space on the left */}
        </div>
        
        {/* Main setup module - centered */}
        <div className={hasViewedIntro ? "md:col-span-7" : "md:col-span-8"}>
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              {hasViewedIntro && (
                <div className="flex items-center w-full">
                  {/* Title section - only show when not on intro page */}
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {step === 1 && "Reward Setup"}
                      {step === 2 && "Points Rules"}
                      {step === 3 && "Marketing Banner"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {step === 1 && "Set up your loyalty program rewards"}
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
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-base font-medium">Create Your First Reward</h3>
                        <p className="text-xs text-gray-500">
                          Rewards are what customers can redeem with their points
                        </p>
                      </div>
                    </div>
                    
                    {/* Wizard Step 1: Industry Selection */}
                    {wizardStep === 1 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">Step 1: Select Your Industry</h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          Choose the industry that best matches your business
                        </p>
                        
                        <div className="space-y-3">
                          <div 
                            className={`flex items-center gap-3 p-4 bg-white rounded-md border ${
                              selectedIndustry === 'cafe' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            } cursor-pointer transition-colors`}
                            onClick={() => setSelectedIndustry('cafe')}
                          >
                            <Coffee className="h-6 w-6 text-amber-500" />
                            <div className="flex-1">
                              <h5 className="font-medium">Café</h5>
                              <p className="text-sm text-gray-500">Coffee shops, bakeries, and casual eateries</p>
                            </div>
                            {selectedIndustry === 'cafe' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          
                          <div 
                            className={`flex items-center gap-3 p-4 bg-white rounded-md border ${
                              selectedIndustry === 'restaurant' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            } cursor-pointer transition-colors`}
                            onClick={() => setSelectedIndustry('restaurant')}
                          >
                            <Utensils className="h-6 w-6 text-red-500" />
                            <div className="flex-1">
                              <h5 className="font-medium">Restaurant</h5>
                              <p className="text-sm text-gray-500">Full-service restaurants and dining establishments</p>
                            </div>
                            {selectedIndustry === 'restaurant' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          
                          <div 
                            className={`flex items-center gap-3 p-4 bg-white rounded-md border ${
                              selectedIndustry === 'retail' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                            } cursor-pointer transition-colors`}
                            onClick={() => setSelectedIndustry('retail')}
                          >
                            <Store className="h-6 w-6 text-blue-500" />
                            <div className="flex-1">
                              <h5 className="font-medium">Retail</h5>
                              <p className="text-sm text-gray-500">Shops, boutiques, and retail stores</p>
                            </div>
                            {selectedIndustry === 'retail' && (
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">Selected: </span>
                            {selectedIndustry ? (
                              <span className="capitalize">{selectedIndustry}</span>
                            ) : (
                              "None"
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Wizard Step 2: Individual Reward Selection */}
                    {wizardStep === 2 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">
                            {customerCategoryStep === 'new' && "Step 2.1: New Customer Rewards"}
                            {customerCategoryStep === 'existing' && "Step 2.2: Existing Customer Rewards"}
                            {customerCategoryStep === 'loyal' && "Step 2.3: Loyal Customer Rewards"}
                          </h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {customerCategoryStep === 'new' && "Select rewards for first-time visitors"}
                          {customerCategoryStep === 'existing' && "Select rewards for regular customers"}
                          {customerCategoryStep === 'loyal' && "Select rewards for your most valuable customers"}
                        </p>
                        
                        {/* Progress indicator */}
                        <div className="flex items-center justify-center space-x-2 mb-4">
                          <div className={`h-2.5 w-2.5 rounded-full ${customerCategoryStep === 'new' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                          <div className={`h-2.5 w-2.5 rounded-full ${customerCategoryStep === 'existing' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                          <div className={`h-2.5 w-2.5 rounded-full ${customerCategoryStep === 'loyal' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                        </div>
                        
                        {/* Show selected rewards for the current category */}
                        {wizardSelectedRewards.filter(r => 
                          (customerCategoryStep === 'new' && r.includes('new-')) ||
                          (customerCategoryStep === 'existing' && r.includes('existing-')) ||
                          (customerCategoryStep === 'loyal' && r.includes('loyal-'))
                        ).length > 0 && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
                            <h5 className="text-sm font-medium text-blue-800 mb-2">Selected Rewards:</h5>
                            <div className="flex flex-wrap gap-2">
                              {wizardSelectedRewards
                                .filter(r => 
                                  (customerCategoryStep === 'new' && r.includes('new-')) ||
                                  (customerCategoryStep === 'existing' && r.includes('existing-')) ||
                                  (customerCategoryStep === 'loyal' && r.includes('loyal-'))
                                )
                                .map(reward => (
                                  <div key={reward} className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-blue-200">
                                    <span className="text-xs">{reward.replace(/^(new|existing|loyal)-/, '')}</span>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-4 w-4 rounded-full"
                                      onClick={() => removeSelectedReward(reward)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))
                              }
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-3">
                          {/* Show rewards based on the current customer category */}
                          {customerCategoryStep === 'new' && (
                            <>
                              {/* New customer rewards - displayed in a grid */}
                              <div className="grid md:grid-cols-2 gap-4">
                                {/* Welcome Coffee reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-welcome-coffee' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-welcome-coffee')}
                                  >
                                    <Coffee className="h-6 w-6 text-green-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">Welcome Coffee</h5>
                                      <p className="text-sm text-gray-500">
                                        Enjoy a complimentary welcome coffee on your first visit! We're thrilled to have you!
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-welcome-coffee' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-welcome-coffee' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-welcome-coffee') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-welcome-coffee')}
                                        >
                                          {wizardSelectedRewards.includes('new-welcome-coffee') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Buy One Get One reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-bogo' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-bogo')}
                                  >
                                    <Coffee className="h-6 w-6 text-amber-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">Buy One Get One</h5>
                                      <p className="text-sm text-gray-500">
                                        Purchase any coffee and get a second coffee absolutely free! Treat a friend or just indulge yourself.
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-bogo' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-bogo' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-bogo') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-bogo')}
                                        >
                                          {wizardSelectedRewards.includes('new-bogo') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Free Pastry reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-free-pastry' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-free-pastry')}
                                  >
                                    <Cake className="h-6 w-6 text-pink-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">Free Pastry</h5>
                                      <p className="text-sm text-gray-500">
                                        Buy any drink and enjoy a free pastry! A perfect pairing to brighten your day.
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-free-pastry' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-free-pastry' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-free-pastry') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-free-pastry')}
                                        >
                                          {wizardSelectedRewards.includes('new-free-pastry') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Coffee Loyalty Card reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-loyalty-card' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-loyalty-card')}
                                  >
                                    <Award className="h-6 w-6 text-blue-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">Coffee Loyalty Card</h5>
                                      <p className="text-sm text-gray-500">
                                        Receive a loyalty card on your first visit. Buy 5 coffees and get the 6th one free!
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-loyalty-card' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-loyalty-card' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-loyalty-card') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-loyalty-card')}
                                        >
                                          {wizardSelectedRewards.includes('new-loyalty-card') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 10% Off First Purchase reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-discount' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-discount')}
                                  >
                                    <Percent className="h-6 w-6 text-green-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">10% Off First Purchase</h5>
                                      <p className="text-sm text-gray-500">
                                        Enjoy 10% off your first purchase! That's our way of saying welcome.
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-discount' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-discount' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-discount') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-discount')}
                                        >
                                          {wizardSelectedRewards.includes('new-discount') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Referral Coffee Discount reward */}
                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                  <div 
                                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                      expandedRewardDetails === 'new-referral' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                    }`}
                                    onClick={() => toggleRewardDetails('new-referral')}
                                  >
                                    <Users className="h-6 w-6 text-purple-500" />
                                    <div className="flex-1">
                                      <h5 className="font-medium">Referral Coffee Discount</h5>
                                      <p className="text-sm text-gray-500">
                                        Refer a friend and both enjoy 15% off your next coffee! Share the joy of coffee.
                                      </p>
                                    </div>
                                    {expandedRewardDetails === 'new-referral' ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {expandedRewardDetails === 'new-referral' && (
                                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                                      <div className="space-y-4">
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                            Conditions
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>First visit only (1 transaction required)</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                </div>
                                                <span>0 points cost</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <div>
                                          <h6 className="text-sm font-medium mb-2 flex items-center">
                                            <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                            Limitations
                                          </h6>
                                          <div className="bg-white p-3 rounded border border-gray-200">
                                            <ul className="text-sm space-y-2">
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Limited to 1 per customer</span>
                                              </li>
                                              <li className="flex items-start gap-2">
                                                <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                </div>
                                                <span>Total redemption limit: 1000</span>
                                              </li>
                                            </ul>
                                          </div>
                                        </div>
                                        
                                        <Button 
                                          className={`w-full ${
                                            wizardSelectedRewards.includes('new-referral') 
                                              ? "bg-green-600 hover:bg-green-700" 
                                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                                          } text-white`}
                                          onClick={() => handleRewardTypeSelection('new-referral')}
                                        >
                                          {wizardSelectedRewards.includes('new-referral') 
                                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                            : "Select This Reward"
                                          }
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          
                          {customerCategoryStep === 'existing' && (
                            <>
                              {/* Existing customer rewards */}
                              <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                <div 
                                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                    expandedRewardDetails === 'existing-discount' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => toggleRewardDetails('existing-discount')}
                                >
                                  <Percent className="h-6 w-6 text-amber-500" />
                                  <div className="flex-1">
                                    <h5 className="font-medium">10% Discount</h5>
                                    <p className="text-sm text-gray-500">
                                      10% off your next purchase
                                    </p>
                                  </div>
                                  {expandedRewardDetails === 'existing-discount' ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                
                                {expandedRewardDetails === 'existing-discount' && (
                                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                                    <div className="space-y-4">
                                      <div>
                                        <h6 className="text-sm font-medium mb-2 flex items-center">
                                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                          Conditions
                                        </h6>
                                        <div className="bg-white p-3 rounded border border-gray-200">
                                          <ul className="text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                              </div>
                                              <span>Minimum 5 transactions required</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                              </div>
                                              <span>300 points cost</span>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h6 className="text-sm font-medium mb-2 flex items-center">
                                          <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                          Limitations
                                        </h6>
                                        <div className="bg-white p-3 rounded border border-gray-200">
                                          <ul className="text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                              </div>
                                              <span>Limited to 1 per customer per month</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                              </div>
                                              <span>Valid for 30 days after redemption</span>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                      
                                      <Button 
                                        className={`w-full ${
                                          wizardSelectedRewards.includes('existing-discount') 
                                            ? "bg-green-600 hover:bg-green-700" 
                                            : "bg-[#007AFF] hover:bg-[#0066CC]"
                                        } text-white`}
                                        onClick={() => handleRewardTypeSelection('existing-discount')}
                                      >
                                        {wizardSelectedRewards.includes('existing-discount') 
                                          ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                          : "Select This Reward"
                                        }
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                          
                          {customerCategoryStep === 'loyal' && (
                            <>
                              {/* Loyal customer rewards */}
                              <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                <div 
                                  className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                    expandedRewardDetails === 'loyal-vip' ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                  }`}
                                  onClick={() => toggleRewardDetails('loyal-vip')}
                                >
                                  <Award className="h-6 w-6 text-purple-500" />
                                  <div className="flex-1">
                                    <h5 className="font-medium">VIP Experience</h5>
                                    <p className="text-sm text-gray-500">
                                      Special perks for your most loyal customers
                                    </p>
                                  </div>
                                  {expandedRewardDetails === 'loyal-vip' ? (
                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                  )}
                                </div>
                                
                                {expandedRewardDetails === 'loyal-vip' && (
                                  <div className="p-4 border-t border-gray-200 bg-gray-50">
                                    <div className="space-y-4">
                                      <div>
                                        <h6 className="text-sm font-medium mb-2 flex items-center">
                                          <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                          Conditions
                                        </h6>
                                        <div className="bg-white p-3 rounded border border-gray-200">
                                          <ul className="text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                              </div>
                                              <span>Minimum 20 transactions required</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                              </div>
                                              <span>750 points cost</span>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                      
                                      <div>
                                        <h6 className="text-sm font-medium mb-2 flex items-center">
                                          <Ban className="h-4 w-4 text-amber-600 mr-1" />
                                          Limitations
                                        </h6>
                                        <div className="bg-white p-3 rounded border border-gray-200">
                                          <ul className="text-sm space-y-2">
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                              </div>
                                              <span>Limited to 1 per customer per quarter</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                              <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                              </div>
                                              <span>Valid for 60 days after redemption</span>
                                            </li>
                                          </ul>
                                        </div>
                                      </div>
                                      
                                      <Button 
                                        className={`w-full ${
                                          wizardSelectedRewards.includes('loyal-vip') 
                                            ? "bg-green-600 hover:bg-green-700" 
                                            : "bg-[#007AFF] hover:bg-[#0066CC]"
                                        } text-white`}
                                        onClick={() => handleRewardTypeSelection('loyal-vip')}
                                      >
                                        {wizardSelectedRewards.includes('loyal-vip') 
                                          ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                          : "Select This Reward"
                                        }
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Wizard Step 3: Program Selection */}
                    {wizardStep === 3 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">Step 3: Choose a Reward Program</h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">
                          Now, select a program that offers multiple rewards at different levels
                        </p>
                        
                        <div className="space-y-3">
                          {selectedIndustry === 'cafe' && (
                            <>
                              <div 
                                className="flex items-center gap-3 p-4 bg-white rounded-md border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => handleProgramTypeSelection('coffee-lovers')}
                              >
                                <Award className="h-6 w-6 text-amber-500" />
                                <div className="flex-1">
                                  <h5 className="font-medium">Coffee Lovers Program</h5>
                                  <p className="text-sm text-gray-500">
                                    A tiered program with coffee-related rewards
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                              
                              <div 
                                className="flex items-center gap-3 p-4 bg-white rounded-md border border-gray-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                onClick={() => handleProgramTypeSelection('sweet-treats')}
                              >
                                <Cake className="h-6 w-6 text-pink-500" />
                                <div className="flex-1">
                                  <h5 className="font-medium">Sweet Treats Program</h5>
                                  <p className="text-sm text-gray-500">
                                    A program with pastry and dessert rewards
                                  </p>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </>
                          )}
                          
                          {/* Add similar sections for retail and restaurant */}
                        </div>
                      </div>
                    )}
                    
                    {/* Wizard Step 4: Confirmation */}
                    {wizardStep === 4 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">Step 4: Review Your Selections</h4>
                        </div>
                        
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <h5 className="font-medium flex items-center text-green-700">
                            <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                            Great choices! Here's what you've selected:
                          </h5>
                          
                          <div className="mt-4 space-y-3">
                            <div className="bg-white p-3 rounded-md border border-gray-200">
                              <p className="font-medium">Industry</p>
                              <p className="text-sm text-gray-600">{selectedIndustry}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded-md border border-gray-200">
                              <p className="font-medium">Individual Reward</p>
                              <p className="text-sm text-gray-600">{selectedRewardType}</p>
                            </div>
                            
                            <div className="bg-white p-3 rounded-md border border-gray-200">
                              <p className="font-medium">Reward Program</p>
                              <p className="text-sm text-gray-600">{selectedProgramType}</p>
                            </div>
                          </div>
                          
                          <Button 
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
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
                              setStep(step + 1)
                            }}
                          >
                            Confirm Selections & Continue
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Set up Points Rules - Changing to Reward Categories */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Gift className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Select Rewards by Customer Type</h3>
                        <p className="text-sm text-gray-500">
                          Choose rewards for different customer segments
                        </p>
                      </div>
                    </div>
                    
                    {/* Selected rewards count */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-1">Selected Rewards: {wizardSelectedRewards.length}/3</h4>
                      <p className="text-sm text-blue-700">
                        Please select at least one reward from each category: New Customers, Existing Customers, and Loyal Customers.
                      </p>
                      
                      {/* Show selected rewards */}
                      {wizardSelectedRewards.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {wizardSelectedRewards.map(reward => (
                            <div key={reward} className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-blue-200">
                              <span className="text-xs">{reward}</span>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 rounded-full"
                                onClick={() => removeSelectedReward(reward)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-6">
                      {/* Category 1: New Customers */}
                      <div>
                        <h4 className="text-base font-medium mb-3 flex items-center">
                          <Users className="h-5 w-5 mr-2 text-green-600" />
                          New Customers
                        </h4>
                        <div className="space-y-3">
                          {/* Placeholder for new customer rewards - will be populated later */}
                          <div className="p-4 bg-white rounded-md border border-dashed border-gray-300 text-center">
                            <p className="text-sm text-gray-500">Rewards for new customers will appear here</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Category 2: Existing Customers */}
                      <div>
                        <h4 className="text-base font-medium mb-3 flex items-center">
                          <Coffee className="h-5 w-5 mr-2 text-amber-600" />
                          Existing Customers
                        </h4>
                        <div className="space-y-3">
                          {/* Placeholder for existing customer rewards - will be populated later */}
                          <div className="p-4 bg-white rounded-md border border-dashed border-gray-300 text-center">
                            <p className="text-sm text-gray-500">Rewards for existing customers will appear here</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Category 3: Loyal Customers */}
                      <div>
                        <h4 className="text-base font-medium mb-3 flex items-center">
                          <Award className="h-5 w-5 mr-2 text-purple-600" />
                          Loyal Customers
                        </h4>
                        <div className="space-y-3">
                          {/* Placeholder for loyal customer rewards - will be populated later */}
                          <div className="p-4 bg-white rounded-md border border-dashed border-gray-300 text-center">
                            <p className="text-sm text-gray-500">Rewards for loyal customers will appear here</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Create Homepage Banner */}
              {step === 3 && (
                <div className="space-y-6">
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
                        <Button 
                          className={`w-full ${
                            wizardSelectedRewards.includes('welcome-banner') 
                              ? "bg-green-600 hover:bg-green-700" 
                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                          } text-white`}
                          onClick={() => handleRewardTypeSelection('welcome-banner')}
                        >
                          {wizardSelectedRewards.includes('welcome-banner') 
                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                            : "Select This Reward"
                          }
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <Image className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Promotional Banner</h4>
                          <p className="text-sm text-gray-500">Highlight special offers or limited-time rewards</p>
                        </div>
                        <Button 
                          className={`w-full ${
                            wizardSelectedRewards.includes('promotional-banner') 
                              ? "bg-green-600 hover:bg-green-700" 
                              : "bg-[#007AFF] hover:bg-[#0066CC]"
                          } text-white`}
                          onClick={() => handleRewardTypeSelection('promotional-banner')}
                        >
                          {wizardSelectedRewards.includes('promotional-banner') 
                            ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                            : "Select This Reward"
                          }
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Progress bar - only show when not on intro page */}
        {hasViewedIntro && (
          <div className="md:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5 sticky top-6">
              <h3 className="text-lg font-medium mb-4">Your Setup Progress</h3>
              
              {/* Add step indicator at the top */}
              <div className="mb-6">
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
              
              <div className="space-y-3">
                {/* Reward creation status */}
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    step === 1 ? "bg-[#007AFF] text-white" :
                    step > 1 ? "bg-green-100 text-green-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {step > 1 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">1</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      step >= 1 ? "text-gray-900" : "text-gray-500"
                    }`}>
                      Create Rewards
                    </p>
                    {businessData.selectedRewards.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {businessData.selectedRewards.map((reward) => (
                          <div key={reward.id} className="flex items-center gap-1">
                            <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                            <p className="text-xs text-gray-600 truncate">{reward.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Points rule status */}
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    step === 2 ? "bg-[#007AFF] text-white" :
                    step > 2 ? "bg-green-100 text-green-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {step > 2 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">2</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      step >= 2 ? "text-gray-900" : "text-gray-500"
                    }`}>
                      Set Up Points Rules
                    </p>
                    {businessData.pointsRuleDetails && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {businessData.pointsRuleDetails.name}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Banner status */}
                <div className="flex items-center gap-3">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                    step === 3 ? "bg-[#007AFF] text-white" :
                    step > 3 ? "bg-green-100 text-green-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {step > 3 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <span className="text-xs">3</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${
                      step >= 3 ? "text-gray-900" : "text-gray-500"
                    }`}>
                      Create Homepage Banner
                    </p>
                    {businessData.bannerDetails && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {businessData.bannerDetails.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
    </div>
  )
} 