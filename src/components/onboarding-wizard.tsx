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
import { ArrowRight, CheckCircle, Coffee, Gift, Store, Users, Upload, Sparkles, Award, BarChart, Image, Utensils, Percent, Cake, Wine, UtensilsCrossed, Check, X, ArrowLeft, ChevronRight, ChevronDown, ChevronUp, Ban, Calendar, ChevronLeft, Clock, Package } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

  // Update the saveCoffeeProgram function to mark the program as configured
  const saveCoffeeProgram = () => {
    // Validate PIN code
    if (coffeeProgram.pin.length !== 4 || isNaN(Number(coffeeProgram.pin))) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN code",
        variant: "destructive"
      });
      return;
    }
    
    // Find the selected coffee program type
    const isTraditionalCoffeeProgram = wizardSelectedRewards.includes('traditional-coffee-program');
    
    if (!isTraditionalCoffeeProgram) {
      toast({
        title: "Error",
        description: "No coffee program selected",
        variant: "destructive"
      });
      return;
    }
    
    // Create the coffee program reward with configuration
    const coffeeReward = {
      id: 'traditional-coffee-program',
      name: 'Traditional Coffee Program',
      type: 'program',
      industry: selectedIndustry,
      isNewCustomer: false,
      pointsCost: 0,
      description: 'Buy X coffees, get 1 free (stamp card style)',
      coffeeConfig: {
        pin: coffeeProgram.pin,
        freeRewardTiming: coffeeProgram.freeRewardTiming,
        frequency: parseInt(coffeeProgram.frequency),
        levels: parseInt(coffeeProgram.levels)
      }
    };
    
    // Update business data
    setBusinessData(prev => ({
      ...prev,
      selectedRewards: [...prev.selectedRewards.filter(r => 
        r.id !== 'traditional-coffee-program'
      ), coffeeReward]
    }));
    
    // Mark the coffee program as configured
    setCoffeeProgramConfigured(true);
    
    // Close the configuration dialog
    setShowCoffeeProgramConfig(false);
    
    // Show success toast
    toast({
      title: "Coffee Program Configured",
      description: "Your coffee program has been configured successfully",
      variant: "default"
    });
  };

  // In the review step (Step 4), add a function to handle coffee program configuration
  const handleCoffeeProgramConfig = () => {
    // Find if there's a coffee program in the selected rewards
    const coffeeProgram = businessData.selectedRewards.find(reward => 
      reward.name === "Coffee Lovers Program" || reward.id.includes('coffee-lovers')
    );
    
    if (coffeeProgram) {
      // If there's already a configuration, load it
      if (coffeeProgram.coffeeConfig) {
        setCoffeeProgram({
          pin: coffeeProgram.coffeeConfig.pin,
          freeRewardTiming: coffeeProgram.coffeeConfig.freeRewardTiming,
          frequency: coffeeProgram.coffeeConfig.frequency.toString(),
          levels: coffeeProgram.coffeeConfig.levels.toString()
        });
      }
      
      // Show the configuration dialog
      setShowCoffeeProgramConfig(true);
    }
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
                              {/* All new customer rewards data */}
                              {(() => {
                                // Define all rewards in one array
                                const allNewCustomerRewards = [
                                  // Original rewards
                                  {
                                    id: 'new-welcome-coffee',
                                    icon: <Coffee className="h-6 w-6 text-green-500" />,
                                    title: 'Welcome Coffee',
                                    description: 'Enjoy a complimentary welcome coffee on your first visit! We\'re thrilled to have you!',
                                    redemptionLimit: 1000
                                  },
                                  {
                                    id: 'new-bogo',
                                    icon: <Coffee className="h-6 w-6 text-amber-500" />,
                                    title: 'Buy One Get One',
                                    description: 'Purchase any coffee and get a second coffee absolutely free! Treat a friend or just indulge yourself.',
                                    redemptionLimit: 1000
                                  },
                                  {
                                    id: 'new-free-pastry',
                                    icon: <Cake className="h-6 w-6 text-pink-500" />,
                                    title: 'Free Pastry',
                                    description: 'Buy any drink and enjoy a free pastry! A perfect pairing to brighten your day.',
                                    redemptionLimit: 1000
                                  },
                                  {
                                    id: 'new-loyalty-card',
                                    icon: <Award className="h-6 w-6 text-blue-500" />,
                                    title: 'Coffee Loyalty Card',
                                    description: 'Receive a loyalty card on your first visit. Buy 5 coffees and get the 6th one free!',
                                    redemptionLimit: 1000
                                  },
                                  // New rewards
                                  {
                                    id: 'new-welcome-drink',
                                    icon: <Coffee className="h-6 w-6 text-purple-500" />,
                                    title: 'Welcome Drink',
                                    description: 'Enjoy a complimentary drink on your first visit! We\'re excited to serve you.',
                                    redemptionLimit: 1000
                                  },
                                  {
                                    id: 'new-newcomer-pastry',
                                    icon: <Cake className="h-6 w-6 text-orange-500" />,
                                    title: 'Newcomer Pastry',
                                    description: 'Get a free pastry with your first purchase. A sweet welcome to our café!',
                                    redemptionLimit: 900
                                  },
                                  {
                                    id: 'new-first-visit-discount',
                                    icon: <Percent className="h-6 w-6 text-green-500" />,
                                    title: 'First Visit Discount',
                                    description: 'Enjoy 15% off on your first visit. We\'re delighted to have you here!',
                                    redemptionLimit: 950
                                  },
                                  {
                                    id: 'new-complimentary-coffee',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Complimentary Coffee',
                                    description: 'Receive a free coffee with your first food purchase. Welcome to a world of delightful beverages!',
                                    redemptionLimit: 850
                                  },
                                  {
                                    id: 'new-newbies-choice',
                                    icon: <Gift className="h-6 w-6 text-indigo-500" />,
                                    title: 'Newbie\'s Choice',
                                    description: 'Choose a free add-on with your first drink. Welcome to the community!',
                                    redemptionLimit: 800
                                  },
                                  {
                                    id: 'new-try-us-out',
                                    icon: <Gift className="h-6 w-6 text-yellow-500" />,
                                    title: 'Try Us Out',
                                    description: 'Receive a $5 voucher towards your next purchase after your first visit.',
                                    redemptionLimit: 700
                                  },
                                  {
                                    id: 'new-first-timers-brunch',
                                    icon: <Utensils className="h-6 w-6 text-amber-500" />,
                                    title: 'First Timer\'s Brunch',
                                    description: 'Enjoy a free brunch item on your first morning visit. A warm start to your day!',
                                    redemptionLimit: 650
                                  },
                                  {
                                    id: 'new-welcome-muffin',
                                    icon: <Cake className="h-6 w-6 text-pink-500" />,
                                    title: 'Welcome Muffin',
                                    description: 'Get a free muffin on us for trying out our cafe! Perfect with your first coffee.',
                                    redemptionLimit: 700
                                  },
                                  {
                                    id: 'new-starter-pack',
                                    icon: <Package className="h-6 w-6 text-blue-500" />,
                                    title: 'Starter Pack',
                                    description: 'Enjoy a bundle deal exclusively for new customers. Get more on your first visit!',
                                    redemptionLimit: 950
                                  },
                                  {
                                    id: 'new-exclusive-first-sip',
                                    icon: <Coffee className="h-6 w-6 text-purple-500" />,
                                    title: 'Exclusive First Sip',
                                    description: 'Receive an exclusive drink on your first visit, crafted just for newcomers!',
                                    redemptionLimit: 600
                                  },
                                  {
                                    id: 'new-partner-welcome-gift',
                                    icon: <Users className="h-6 w-6 text-green-500" />,
                                    title: 'Partner Welcome Gift',
                                    description: 'Bring a friend on your first visit and enjoy a 2-for-1 offer on any beverage.',
                                    redemptionLimit: 900
                                  },
                                  {
                                    id: 'new-welcome-plate',
                                    icon: <Utensils className="h-6 w-6 text-orange-500" />,
                                    title: 'Welcome Plate',
                                    description: 'Get a free appetizer on your first dinner visit. Discover what we offer!',
                                    redemptionLimit: 700
                                  },
                                  {
                                    id: 'new-first-visit-gift-card',
                                    icon: <Gift className="h-6 w-6 text-red-500" />,
                                    title: 'First Visit Gift Card',
                                    description: 'Receive a $10 gift card towards your next purchase after your first visit.',
                                    redemptionLimit: 800
                                  },
                                  // Add a coffee program reward to the list
                                  {
                                    id: 'coffee-lovers-program',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Coffee Lovers Program',
                                    description: 'Create a buy-X-get-1-free coffee loyalty program for your customers',
                                    redemptionLimit: 1000,
                                    specialCondition: 'Configurable frequency and rewards'
                                  },
                                  {
                                    id: 'new-coffee-lovers-program',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Coffee Lovers Program',
                                    description: 'Create a buy-X-get-1-free coffee loyalty program for your new customers',
                                    redemptionLimit: 1000,
                                    specialCondition: 'Configurable frequency and rewards'
                                  }
                                ];
                                
                                // Calculate total pages for new customer rewards
                                const totalNewCustomerPages = Math.ceil(allNewCustomerRewards.length / rewardsPerPage);
                                
                                // Get current page rewards
                                const indexOfLastReward = currentNewCustomerPage * rewardsPerPage;
                                const indexOfFirstReward = indexOfLastReward - rewardsPerPage;
                                const currentRewards = allNewCustomerRewards.slice(indexOfFirstReward, indexOfLastReward);
                                
                                return (
                                <div>
                                    {/* New customer rewards - displayed in a grid */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                      {currentRewards.map((reward) => (
                                        <div key={reward.id} className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                          {/* Header section - always visible */}
                                          <div 
                                            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                              expandedRewardDetails === reward.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => toggleRewardDetails(reward.id)}
                                          >
                                            {reward.icon}
                                            <div className="flex-1">
                                              <h5 className="font-medium">{reward.title}</h5>
                                              <p className="text-sm text-gray-500">
                                                {reward.description}
                                              </p>
                                            </div>
                                            <div>
                                              {expandedRewardDetails === reward.id ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                              ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                              )}
                                            </div>
                                </div>
                                
                                          {/* Expanded details section */}
                                          {expandedRewardDetails === reward.id && (
                                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                              <div className="space-y-4">
                                                {/* Conditions */}
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
                                                        <span>First visit only</span>
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
                                
                                                {/* Limitations */}
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
                                                        <span>Total redemption limit: {reward.redemptionLimit}</span>
                                                      </li>
                                                    </ul>
                                                  </div>
                                </div>
                                
                                                <Button 
                                                  className={`w-full ${
                                                    wizardSelectedRewards.includes(reward.id) 
                                                      ? "bg-green-600 hover:bg-green-700" 
                                                      : "bg-[#007AFF] hover:bg-[#0066CC]"
                                                  } text-white`}
                                                  onClick={() => handleRewardTypeSelection(reward.id)}
                                                >
                                                  {wizardSelectedRewards.includes(reward.id) 
                                                    ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                                    : "Select This Reward"
                                                  }
                                                </Button>
                                </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                              </div>
                              
                                    {/* Pagination controls for new customer rewards */}
                                    {totalNewCustomerPages > 1 && (
                                      <div className="flex justify-center items-center gap-2 mt-6">
                                <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleNewCustomerPageChange(currentNewCustomerPage - 1)}
                                          disabled={currentNewCustomerPage === 1}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronLeft className="h-4 w-4" />
                                </Button>
                                        
                                        <div className="flex items-center gap-1">
                                          {Array.from({ length: totalNewCustomerPages }).map((_, i) => (
                                            <Button
                                              key={i}
                                              variant={currentNewCustomerPage === i + 1 ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => handleNewCustomerPageChange(i + 1)}
                                              className={`h-8 w-8 p-0 ${
                                                currentNewCustomerPage === i + 1 ? "bg-[#007AFF]" : ""
                                              }`}
                                            >
                                              {i + 1}
                                            </Button>
                                          ))}
                                        </div>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                          onClick={() => handleNewCustomerPageChange(currentNewCustomerPage + 1)}
                                          disabled={currentNewCustomerPage === totalNewCustomerPages}
                                          className="h-8 w-8 p-0"
                                >
                                          <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                          
                          {customerCategoryStep === 'existing' && (
                            <>
                              {/* All existing customer rewards data */}
                              {(() => {
                                // Define all rewards in one array
                                const allRewards = [
                                  // First page rewards (original 5)
                                  {
                                    id: 'existing-loyalty-coffee',
                                    icon: <Coffee className="h-6 w-6 text-blue-500" />,
                                    title: 'Loyalty Coffee',
                                    description: 'Enjoy a free coffee for being a loyal customer! Thank you for choosing us.',
                                    redemptionLimit: 500
                                  },
                                  {
                                    id: 'existing-birthday-treat',
                                    icon: <Cake className="h-6 w-6 text-pink-500" />,
                                    title: 'Birthday Treat',
                                    description: 'Celebrate your birthday with a complimentary pastry! Enjoy a sweet treat on your special day.',
                                    redemptionLimit: 200,
                                    specialCondition: true
                                  },
                                  {
                                    id: 'existing-coffee-club',
                                    icon: <Users className="h-6 w-6 text-purple-500" />,
                                    title: 'Coffee Club',
                                    description: 'Join our Coffee Club and receive 20% off your next purchase! Sign up for exclusive offers.',
                                    redemptionLimit: 300
                                  },
                                  {
                                    id: 'existing-refer-friend',
                                    icon: <Gift className="h-6 w-6 text-green-500" />,
                                    title: 'Refer a Friend',
                                    description: 'Refer a friend and receive a $5 voucher for your next purchase! Share the love of coffee.',
                                    redemptionLimit: 400
                                  },
                                  {
                                    id: 'existing-weekend-special',
                                    icon: <Calendar className="h-6 w-6 text-amber-500" />,
                                    title: 'Weekend Special',
                                    description: 'Enjoy a 15% discount on all coffee purchases every weekend! A treat to brighten your days.',
                                    redemptionLimit: 300
                                  },
                                  {
                                    id: 'existing-midweek-bonus',
                                    icon: <Cake className="h-6 w-6 text-orange-500" />,
                                    title: 'Midweek Bonus',
                                    description: 'Enjoy a complimentary muffin with any coffee purchase every Wednesday! A midweek treat just for you.',
                                    redemptionLimit: 300
                                  },
                                  // Second page rewards (new rewards)
                                  {
                                    id: 'existing-double-points',
                                    icon: <Award className="h-6 w-6 text-yellow-500" />,
                                    title: 'Double Points Day',
                                    description: 'Earn double points on all purchases every Friday! Boost your rewards and enjoy more perks.',
                                    redemptionLimit: 400
                                  },
                                  {
                                    id: 'existing-exclusive-blend',
                                    icon: <Coffee className="h-6 w-6 text-red-500" />,
                                    title: 'Exclusive Blend Access',
                                    description: 'Be the first to try our exclusive blend coffee! Enjoy a free cup with your next purchase.',
                                    redemptionLimit: 250
                                  },
                                  {
                                    id: 'existing-free-upgrade',
                                    icon: <ArrowRight className="h-6 w-6 text-blue-500" />,
                                    title: 'Free Upgrade',
                                    description: 'Upgrade your regular coffee to a large for free! Your coffee, your way.',
                                    redemptionLimit: 300
                                  },
                                  {
                                    id: 'existing-holiday-special',
                                    icon: <Gift className="h-6 w-6 text-red-500" />,
                                    title: 'Holiday Special',
                                    description: 'Celebrate the holidays with a 15% discount on your total bill! Cheers to festive moments.',
                                    redemptionLimit: 300
                                  },
                                  {
                                    id: 'existing-weekend-brunch',
                                    icon: <Utensils className="h-6 w-6 text-green-500" />,
                                    title: 'Weekend Brunch Offer',
                                    description: 'Enjoy a 20% discount on our brunch menu every weekend! Perfect for a leisurely meal.',
                                    redemptionLimit: 350
                                  },
                                  // Additional rewards
                                  {
                                    id: 'existing-early-bird',
                                    icon: <Coffee className="h-6 w-6 text-yellow-500" />,
                                    title: 'Early Bird Special',
                                    description: 'Get a 20% discount on any purchase before 10 AM.',
                                    redemptionLimit: 300,
                                    pointsCost: 5,
                                    specialCondition: 'Minimum 3 transactions required',
                                    specialLimitation: 'Available 7:00 AM - 10:00 AM only'
                                  },
                                  {
                                    id: 'existing-weekend-brunch',
                                    icon: <Utensils className="h-6 w-6 text-green-500" />,
                                    title: 'Weekend Brunch Deal',
                                    description: 'Enjoy 25% off our brunch menu on weekends.',
                                    redemptionLimit: 500,
                                    pointsCost: 10,
                                    specialLimitation: 'Available Saturday and Sunday only'
                                  },
                                  {
                                    id: 'existing-afternoon-tea',
                                    icon: <Coffee className="h-6 w-6 text-purple-500" />,
                                    title: 'Afternoon Tea Time',
                                    description: 'Buy one tea, get one free every weekday afternoon.',
                                    redemptionLimit: 400,
                                    pointsCost: 8,
                                    specialCondition: 'Minimum lifetime spend of $50',
                                    specialLimitation: 'Available 2:00 PM - 5:00 PM only'
                                  },
                                  {
                                    id: 'existing-loyalty-bonus',
                                    icon: <Coffee className="h-6 w-6 text-blue-500" />,
                                    title: 'Loyalty Bonus Coffee',
                                    description: 'Enjoy a free coffee for every $100 spent.',
                                    redemptionLimit: 700,
                                    pointsCost: 12,
                                    specialCondition: 'Total lifetime spend of $100',
                                    customerLimit: 3
                                  },
                                  {
                                    id: 'existing-midweek-motivator',
                                    icon: <Calendar className="h-6 w-6 text-green-500" />,
                                    title: 'Midweek Motivator',
                                    description: 'Get 15% off all purchases on Wednesdays.',
                                    redemptionLimit: 500,
                                    pointsCost: 10,
                                    customerLimit: 2,
                                    specialLimitation: 'Available on Wednesdays only'
                                  },
                                  {
                                    id: 'existing-seasonal-sips',
                                    icon: <Coffee className="h-6 w-6 text-red-500" />,
                                    title: 'Seasonal Sips',
                                    description: 'Receive a complimentary seasonal drink with any purchase.',
                                    redemptionLimit: 600,
                                    pointsCost: 15,
                                    specialCondition: '30 days since last visit'
                                  },
                                  {
                                    id: 'existing-bring-friend',
                                    icon: <Users className="h-6 w-6 text-indigo-500" />,
                                    title: 'Bring a Friend',
                                    description: 'Bring a friend and enjoy a 2-for-1 deal on any drink.',
                                    redemptionLimit: 350,
                                    pointsCost: 20,
                                    specialCondition: 'Minimum 5 transactions required',
                                    customerLimit: 2
                                  },
                                  {
                                    id: 'existing-happy-hour',
                                    icon: <Clock className="h-6 w-6 text-amber-500" />,
                                    title: 'Happy Hour Savers',
                                    description: '50% off all beverages during happy hour.',
                                    redemptionLimit: 400,
                                    pointsCost: 7,
                                    specialLimitation: 'Available 4:00 PM - 6:00 PM only'
                                  },
                                  {
                                    id: 'existing-exclusive-event',
                                    icon: <Calendar className="h-6 w-6 text-purple-500" />,
                                    title: 'Exclusive Event Access',
                                    description: 'Access to invitation-only tasting events.',
                                    redemptionLimit: 100,
                                    pointsCost: 0,
                                    specialCondition: 'Gold membership level required'
                                  },
                                  {
                                    id: 'existing-anniversary',
                                    icon: <Cake className="h-6 w-6 text-pink-500" />,
                                    title: 'Anniversary Treat',
                                    description: 'Celebrate your membership anniversary with a free dessert.',
                                    redemptionLimit: 150,
                                    pointsCost: 0,
                                    specialCondition: '1 year since joining'
                                  },
                                  {
                                    id: 'existing-coffee-bundle',
                                    icon: <Package className="h-6 w-6 text-brown-500" />,
                                    title: 'Coffee Lovers\' Bundle',
                                    description: 'Get a special bundle price on three coffees.',
                                    redemptionLimit: 250,
                                    pointsCost: 30,
                                    specialCondition: 'Minimum points balance of 100',
                                    customerLimit: 2
                                  },
                                  {
                                    id: 'existing-voucher-surprise',
                                    icon: <Gift className="h-6 w-6 text-green-500" />,
                                    title: 'Voucher Surprise',
                                    description: 'Get a surprise voucher after every 10th visit.',
                                    redemptionLimit: 500,
                                    pointsCost: 0,
                                    specialCondition: 'Minimum 10 transactions required',
                                    customerLimit: 3
                                  },
                                  {
                                    id: 'existing-coffee-lovers-program',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Coffee Lovers Program',
                                    description: 'Create a buy-X-get-1-free coffee loyalty program for your regular customers',
                                    redemptionLimit: 1000,
                                    specialCondition: 'Configurable frequency and rewards'
                                  }
                                ];
                                
                                // Calculate total pages
                                const totalPages = Math.ceil(allRewards.length / rewardsPerPage);
                                
                                // Get current page rewards
                                const indexOfLastReward = currentRewardPage * rewardsPerPage;
                                const indexOfFirstReward = indexOfLastReward - rewardsPerPage;
                                const currentRewards = allRewards.slice(indexOfFirstReward, indexOfLastReward);
                                
                                return (
                                  <div className="space-y-4">
                                    {/* Rewards grid */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                      {currentRewards.map((reward) => (
                                        <div key={reward.id} className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                          {/* Header section - always visible */}
                                          <div 
                                            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                              expandedRewardDetails === reward.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => toggleRewardDetails(reward.id)}
                                          >
                                            {reward.icon}
                              <div className="flex-1">
                                              <h5 className="font-medium">{reward.title}</h5>
                                <p className="text-sm text-gray-500">
                                                {reward.description}
                                </p>
                              </div>
                                            {expandedRewardDetails === reward.id ? (
                                              <ChevronUp className="h-5 w-5 text-gray-400" />
                                            ) : (
                                              <ChevronDown className="h-5 w-5 text-gray-400" />
                                            )}
                            </div>
                            
                                          {/* Expanded details section - only visible when expanded */}
                                          {expandedRewardDetails === reward.id && (
                                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                              <div className="space-y-4">
                                                {/* Conditions */}
                              <div>
                                                  <h6 className="text-sm font-medium mb-2 flex items-center">
                                                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                                    Conditions
                                                  </h6>
                                                  <div className="bg-white p-3 rounded border border-gray-200">
                                                    <ul className="text-sm space-y-2">
                                                      {reward.specialCondition ? (
                                                        <li className="flex items-start gap-2">
                                                          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                              </div>
                                                          <span>{reward.specialCondition}</span>
                                                        </li>
                                                      ) : reward.id === 'existing-birthday-treat' ? (
                                                        <li className="flex items-start gap-2">
                                                          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                          </div>
                                                          <span>Customer must be a member for at least 30 days</span>
                                                        </li>
                                                      ) : (
                                                        <li className="flex items-start gap-2">
                                                          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                          </div>
                                                          <span>Minimum 1 transaction required</span>
                                                        </li>
                                                      )}
                                                      <li className="flex items-start gap-2">
                                                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                        </div>
                                                        <span>{reward.pointsCost ? `${reward.pointsCost} points cost` : '0 points cost'}</span>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                                
                                                {/* Limitations */}
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
                                                        <span>Limited to {reward.customerLimit || 1} per customer</span>
                                                      </li>
                                                      {reward.specialLimitation && (
                                                        <li className="flex items-start gap-2">
                                                          <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                          </div>
                                                          <span>{reward.specialLimitation}</span>
                                                        </li>
                                                      )}
                                                      <li className="flex items-start gap-2">
                                                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                        </div>
                                                        <span>Total redemption limit: {reward.redemptionLimit}</span>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                                
                                <Button 
                                                  className={`w-full ${
                                                    wizardSelectedRewards.includes(reward.id) 
                                                      ? "bg-green-600 hover:bg-green-700" 
                                                      : "bg-[#007AFF] hover:bg-[#0066CC]"
                                                  } text-white`}
                                                  onClick={() => handleRewardTypeSelection(reward.id)}
                                                >
                                                  {wizardSelectedRewards.includes(reward.id) 
                                                    ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                                    : "Select This Reward"
                                                  }
                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Pagination controls */}
                                    {totalPages > 1 && (
                                      <div className="flex justify-center items-center gap-2 mt-6">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                          onClick={() => handleRewardPageChange(currentRewardPage - 1)}
                                          disabled={currentRewardPage === 1}
                                          className="h-8 w-8 p-0"
                                >
                                          <ChevronLeft className="h-4 w-4" />
                                </Button>
                                        
                                        <div className="flex items-center gap-1">
                                          {Array.from({ length: totalPages }).map((_, i) => (
                                            <Button
                                              key={i}
                                              variant={currentRewardPage === i + 1 ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => handleRewardPageChange(i + 1)}
                                              className={`h-8 w-8 p-0 ${
                                                currentRewardPage === i + 1 ? "bg-[#007AFF]" : ""
                                              }`}
                                            >
                                              {i + 1}
                                            </Button>
                                          ))}
                              </div>
                                        
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleRewardPageChange(currentRewardPage + 1)}
                                          disabled={currentRewardPage === totalPages}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronRight className="h-4 w-4" />
                                </Button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                        </>
                      )}
                      
                          {customerCategoryStep === 'loyal' && (
                            <>
                              {/* All loyal customer rewards data */}
                              {(() => {
                                // Define all rewards in one array
                                const allLoyalCustomerRewards = [
                                  // Original rewards
                                  {
                                    id: 'loyal-points-multiplier',
                                    icon: <Award className="h-6 w-6 text-amber-500" />,
                                    title: 'Points Multiplier',
                                    description: 'Earn double points on all purchases',
                                    redemptionLimit: 1000,
                                    specialCondition: 'Minimum 10 transactions required'
                                  },
                                  {
                                    id: 'loyal-vip',
                                    icon: <Award className="h-6 w-6 text-purple-500" />,
                                    title: 'VIP Experience',
                                    description: 'Special perks for your most loyal customers',
                                    redemptionLimit: 500,
                                    specialCondition: 'Minimum 20 transactions required'
                                  },
                                  // New rewards
                                  {
                                    id: 'loyal-free-beverage',
                                    icon: <Coffee className="h-6 w-6 text-blue-500" />,
                                    title: 'VIP Free Beverage',
                                    description: 'As a loyal member, enjoy a complimentary beverage of your choice every month.',
                                    redemptionLimit: 200,
                                    specialCondition: 'Total lifetime spend of $500',
                                    customerLimit: 12
                                  },
                                  {
                                    id: 'loyal-lunch',
                                    icon: <Utensils className="h-6 w-6 text-green-500" />,
                                    title: 'Loyalty Lunch',
                                    description: 'Enjoy a free lunch meal with every 10th visit. Thank you for being a part of our family!',
                                    redemptionLimit: 300,
                                    specialCondition: 'Minimum 10 transactions required',
                                    customerLimit: 3
                                  },
                                  {
                                    id: 'loyal-vip-event',
                                    icon: <Calendar className="h-6 w-6 text-purple-500" />,
                                    title: 'Exclusive VIP Event',
                                    description: 'Access to exclusive VIP events throughout the year. Join us for special tastings and gatherings.',
                                    redemptionLimit: 100,
                                    specialCondition: 'Platinum membership level required',
                                    customerLimit: 3
                                  },
                                  {
                                    id: 'loyal-weekly-coffee',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Complimentary Weekly Coffee',
                                    description: 'Receive one free coffee every week as a thank you for your continued support.',
                                    redemptionLimit: 500,
                                    specialCondition: 'Member for at least 1 year',
                                    customerLimit: 52
                                  },
                                  {
                                    id: 'loyal-milestone-dining',
                                    icon: <Utensils className="h-6 w-6 text-amber-500" />,
                                    title: 'Milestone Dining Experience',
                                    description: 'Celebrate your loyalty with a dining experience for two on us after reaching 50 visits.',
                                    redemptionLimit: 50,
                                    specialCondition: 'Minimum 50 transactions required',
                                    customerLimit: 1
                                  },
                                  {
                                    id: 'loyal-anniversary',
                                    icon: <Gift className="h-6 w-6 text-red-500" />,
                                    title: 'Anniversary Special',
                                    description: 'Enjoy a special gift on your loyalty anniversary, perfect to celebrate the time with us.',
                                    redemptionLimit: 300,
                                    specialCondition: 'Minimum lifetime spend of $1,000',
                                    customerLimit: 1
                                  },
                                  {
                                    id: 'loyal-birthday-bash',
                                    icon: <Cake className="h-6 w-6 text-pink-500" />,
                                    title: 'VIP Birthday Bash',
                                    description: 'Celebrate your birthday with us — receive a cake and a drink for you and your guests.',
                                    redemptionLimit: 150,
                                    specialCondition: 'Gold membership level required',
                                    customerLimit: 1
                                  },
                                  {
                                    id: 'loyal-coffee-subscription',
                                    icon: <Package className="h-6 w-6 text-blue-500" />,
                                    title: 'Exclusive Coffee Subscription',
                                    description: 'Subscribe to our exclusive coffee shipment – free monthly bags delivered to your door.',
                                    redemptionLimit: 200,
                                    specialCondition: 'Minimum points balance of 300',
                                    customerLimit: 6,
                                    pointsCost: 75
                                  },
                                  {
                                    id: 'loyal-coffee-experience',
                                    icon: <Coffee className="h-6 w-6 text-green-500" />,
                                    title: 'Ultimate Coffee Experience',
                                    description: 'Join us behind the scenes for a coffee-making masterclass. Perfect for true enthusiasts.',
                                    redemptionLimit: 100,
                                    specialCondition: 'Total lifetime spend of $1,500',
                                    customerLimit: 1
                                  },
                                  {
                                    id: 'loyal-customer-recognition',
                                    icon: <Award className="h-6 w-6 text-yellow-500" />,
                                    title: 'Loyal Customer Recognition',
                                    description: 'Get recognized on our Wall of Fame and enjoy a dedicated week\'s worth of free snacks.',
                                    redemptionLimit: 50,
                                    specialCondition: 'Minimum 100 transactions required',
                                    customerLimit: 1
                                  },
                                  {
                                    id: 'loyal-coffee-lovers-program',
                                    icon: <Coffee className="h-6 w-6 text-brown-500" />,
                                    title: 'Coffee Lovers Program',
                                    description: 'Create a premium buy-X-get-1-free coffee loyalty program for your most loyal customers',
                                    redemptionLimit: 1000,
                                    specialCondition: 'Configurable frequency and rewards'
                                  }
                                ];
                                
                                // Calculate total pages for loyal customer rewards
                                const totalLoyalCustomerPages = Math.ceil(allLoyalCustomerRewards.length / rewardsPerPage);
                                
                                // Get current page rewards
                                const indexOfLastReward = currentLoyalCustomerPage * rewardsPerPage;
                                const indexOfFirstReward = indexOfLastReward - rewardsPerPage;
                                const currentRewards = allLoyalCustomerRewards.slice(indexOfFirstReward, indexOfLastReward);
                                
                                return (
                                  <div className="space-y-4">
                                    {/* Loyal customer rewards - displayed in a grid */}
                                    <div className="grid md:grid-cols-2 gap-4">
                                      {currentRewards.map((reward) => (
                                        <div key={reward.id} className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                          {/* Header section - always visible */}
                                          <div 
                                            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                              expandedRewardDetails === reward.id ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'
                                            }`}
                                            onClick={() => toggleRewardDetails(reward.id)}
                                          >
                                            {reward.icon}
                            <div className="flex-1">
                                              <h5 className="font-medium">{reward.title}</h5>
                              <p className="text-sm text-gray-500">
                                                {reward.description}
                              </p>
                            </div>
                                            <div>
                                              {expandedRewardDetails === reward.id ? (
                                                <ChevronUp className="h-5 w-5 text-gray-400" />
                                              ) : (
                                                <ChevronDown className="h-5 w-5 text-gray-400" />
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* Expanded details section */}
                                          {expandedRewardDetails === reward.id && (
                                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                              <div className="space-y-4">
                                                {/* Conditions */}
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
                                                        <span>{reward.specialCondition}</span>
                                                      </li>
                                                      <li className="flex items-start gap-2">
                                                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                                        </div>
                                                        <span>{reward.pointsCost ? `${reward.pointsCost} points cost` : '0 points cost'}</span>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                                
                                                {/* Limitations */}
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
                                                        <span>Limited to {reward.customerLimit || 1} per customer</span>
                                                      </li>
                                                      <li className="flex items-start gap-2">
                                                        <div className="h-5 w-5 flex-shrink-0 flex items-center justify-center">
                                                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                                        </div>
                                                        <span>Total redemption limit: {reward.redemptionLimit}</span>
                                                      </li>
                                                    </ul>
                                                  </div>
                                                </div>
                                                
                            <Button 
                                                  className={`w-full ${
                                                    wizardSelectedRewards.includes(reward.id) 
                                                      ? "bg-green-600 hover:bg-green-700" 
                                                      : "bg-[#007AFF] hover:bg-[#0066CC]"
                                                  } text-white`}
                                                  onClick={() => handleRewardTypeSelection(reward.id)}
                                                >
                                                  {wizardSelectedRewards.includes(reward.id) 
                                                    ? <span className="flex items-center justify-center gap-1"><Check className="h-4 w-4" /> Selected</span>
                                                    : "Select This Reward"
                                                  }
                            </Button>
                          </div>
                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Pagination controls for loyal customer rewards */}
                                    {totalLoyalCustomerPages > 1 && (
                                      <div className="flex justify-center items-center gap-2 mt-6">
                            <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleLoyalCustomerPageChange(currentLoyalCustomerPage - 1)}
                                          disabled={currentLoyalCustomerPage === 1}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronLeft className="h-4 w-4" />
                            </Button>
                                        
                                        <div className="flex items-center gap-1">
                                          {Array.from({ length: totalLoyalCustomerPages }).map((_, i) => (
                                            <Button
                                              key={i}
                                              variant={currentLoyalCustomerPage === i + 1 ? "default" : "outline"}
                                              size="sm"
                                              onClick={() => handleLoyalCustomerPageChange(i + 1)}
                                              className={`h-8 w-8 p-0 ${
                                                currentLoyalCustomerPage === i + 1 ? "bg-[#007AFF]" : ""
                                              }`}
                                            >
                                              {i + 1}
                                            </Button>
                                          ))}
                            </div>
                                        
                            <Button 
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleLoyalCustomerPageChange(currentLoyalCustomerPage + 1)}
                                          disabled={currentLoyalCustomerPage === totalLoyalCustomerPages}
                                          className="h-8 w-8 p-0"
                                        >
                                          <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Wizard Step 3: Program Selection */}
                    {wizardStep === 3 && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-lg">Step 3: Choose a Reward Program</h4>
                        </div>
                        
                        <p className="text-gray-600">Now, select a program that offers multiple rewards at different levels</p>
                        
                        <div className="space-y-4">
                          {/* Traditional Coffee Program */}
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-brown-100 flex items-center justify-center text-brown-600">
                                  <Coffee className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-medium">Traditional Coffee Program</h5>
                                  <p className="text-sm text-gray-500">Buy X coffees, get 1 free (stamp card style)</p>
                                </div>
                                {coffeeProgramConfigured ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-green-600 flex items-center">
                                      <CheckCircle className="h-4 w-4 mr-1" /> Configured
                                    </span>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setShowCoffeeProgramConfig(true)}
                                    >
                                      Edit
                                    </Button>
                                  </div>
                                ) : (
                                  <Button 
                                    className="bg-[#007AFF] hover:bg-[#0066CC] text-white"
                                    onClick={() => {
                                      setWizardSelectedRewards(prev => 
                                        prev.includes('traditional-coffee-program') 
                                          ? prev 
                                          : [...prev, 'traditional-coffee-program']
                                      );
                                      setShowCoffeeProgramConfig(true);
                                    }}
                                  >
                                    Configure
                                  </Button>
                                )}
                              </div>
                              
                              {coffeeProgramConfigured && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                  <h6 className="text-sm font-medium mb-2">Configuration Details</h6>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
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
                                  
                                  <div className="mt-4 flex justify-end">
                                    <Button 
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => {
                                        setWizardStep(4); // Move to the next step
                                      }}
                                    >
                                      Continue
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
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
              onClick={() => setShowCoffeeProgramConfig(false)}
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
    </div>
  )
} 