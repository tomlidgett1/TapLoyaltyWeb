"use client"

import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CalendarIcon, X, CheckCircle, Edit as EditIcon, Search, Info, Loader2 } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc, query, getDocs, orderBy, limit, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { ScrollArea } from "@/components/ui/scroll-area"

interface CreateRewardPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: any
  isEditing?: boolean
  rewardId?: string
  customerId?: string
  customerName?: string
}

interface FormData {
  // Basic Details
  rewardName: string
  description: string
  type: string
  rewardVisibility: string
  specificCustomerIds?: string[]
  specificCustomerNames?: string[]
  pin: string
  pointsCost: string
  isActive: boolean
  delayedVisibility: boolean
  delayedVisibilityType: string
  delayedVisibilityTransactions: string
  delayedVisibilitySpend: string
  
  // Reward type specific fields
  discountValue: string
  discountAppliesTo: string
  minimumPurchase: string
  itemName: string
  itemDescription: string
  requiredPurchase: string
  bonusItem: string
  bundleDiscountType: string
  bundleDiscountValue: string
  mysteryOptions: string
  revealAtCheckout: boolean
  customRewardDetails: string
  voucherAmount: string
  
  // Conditions
  conditions: {
    useTransactionRequirements: boolean
    useSpendingRequirements: boolean
    useTimeRequirements: boolean
    minimumTransactions: string
    maximumTransactions: string
      daysSinceJoined: string
    minimumLifetimeSpend: string
    minimumPointsBalance: string
    membershipLevel: string
    newCustomer: boolean
    useMembershipRequirements: boolean
  }

  // Limitations
  limitations: {
    totalRedemptionLimit: string
    perCustomerLimit: string
    useTimeRestrictions: boolean
    startTime: string
    endTime: string
    dayRestrictions: string[]
    useDateRestrictions: boolean
    dateRestrictionStart: string
    dateRestrictionEnd: string
  }

  // New fields for Active Period
  hasActivePeriod: boolean
  activePeriod: {
    startDate: string
    endDate: string
    startTime: string
    endTime: string
  }
  
  // Summary text for the reward
  rewardSummary: string
}

export function CreateRewardPopup({ 
  open, 
  onOpenChange,
  defaultValues,
  isEditing = false,
  rewardId,
  customerId,
  customerName
}: CreateRewardPopupProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()
  const { user } = useAuth()
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomers, setSelectedCustomers] = useState<{ id: string; name: string }[]>([])
    const [customersLoading, setCustomersLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    // Basic Details
    rewardName: "",
    description: "",
    type: "",
    rewardVisibility: "all",
    specificCustomerIds: customerId ? [customerId] : [],
    specificCustomerNames: customerName ? [customerName] : [],
    pin: "",
    pointsCost: "",
    isActive: true,
    delayedVisibility: false,
    delayedVisibilityType: "transactions",
    delayedVisibilityTransactions: "",
    delayedVisibilitySpend: "",
    
    // Reward type specific fields
    discountValue: "",
    discountAppliesTo: "",
    minimumPurchase: "",
    itemName: "",
    itemDescription: "",
    requiredPurchase: "",
    bonusItem: "",
    bundleDiscountType: "free",
    bundleDiscountValue: "",
    mysteryOptions: "",
    revealAtCheckout: false,
    customRewardDetails: "",
    voucherAmount: "",
    
    // Conditions
    conditions: {
      useTransactionRequirements: false,
      useSpendingRequirements: false,
      useTimeRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      daysSinceJoined: "",
      minimumLifetimeSpend: "",
      minimumPointsBalance: "",
      membershipLevel: "Bronze",
      newCustomer: false,
      useMembershipRequirements: true
    },

    // Limitations
    limitations: {
      totalRedemptionLimit: "",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: [],
      useDateRestrictions: false,
      dateRestrictionStart: "",
      dateRestrictionEnd: ""
    },

    // New fields for Active Period
    hasActivePeriod: false,
    activePeriod: {
      startDate: "",
      endDate: "",
      startTime: "09:00",
      endTime: "17:00"
    },
    
    // Summary text for the reward
    rewardSummary: "",
  })

  // Validation functions
  // Fetch customers for specific customer selection
  const fetchMerchantCustomers = async () => {
    if (!user) return;
    
    setCustomersLoading(true);
    try {
      const customersRef = collection(db, 'merchants', user.uid, 'customers');
      const customersQuery = query(customersRef, orderBy('createdAt', 'desc'), limit(100));
      const querySnapshot = await getDocs(customersQuery);
      
      const customersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  };

  // Load customers when opening for specific customer selection
  useEffect(() => {
    if (open && formData.rewardVisibility === 'specific') {
      fetchMerchantCustomers();
    }
  }, [open, formData.rewardVisibility, user]);

  const validateBasicDetails = () => {
    const nameValid = formData.rewardName?.trim() !== '';
    const descriptionValid = formData.description?.trim() !== '';
    const typeValid = formData.type?.trim() !== '';
    const pinValid = formData.pin?.trim() !== '' && formData.pin?.trim().length === 4;
    const pointsCostValid = typeof formData.pointsCost === 'string' 
      ? formData.pointsCost.trim() !== '' 
      : typeof formData.pointsCost === 'number';
    
    return nameValid && descriptionValid && pointsCostValid && typeValid && pinValid;
  }

  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }

    if (step === 2 && !validateBasicDetails()) {
      const missingFields = [];
      
      if (!formData.rewardName?.trim()) missingFields.push("Reward Name");
      if (!formData.description?.trim()) missingFields.push("Description");
      if (!formData.type?.trim()) missingFields.push("Reward Type");
      if (!formData.pin?.trim() || formData.pin?.trim().length !== 4) missingFields.push("4-digit PIN");
      if (!formData.pointsCost?.toString().trim()) missingFields.push("Points Cost");
      
      toast({
        title: "Complete Basic Details",
        description: `Please fill in all required fields before proceeding: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(step);
  }

  // Generate reward summary
  const generateRewardSummary = () => {
    let summary = "";
    
    switch(formData.type) {
      case 'percentageDiscount':
        summary = `Get ${formData.discountValue}% off`;
        if (formData.discountAppliesTo) {
          summary += ` ${formData.discountAppliesTo}`;
        } else {
          summary += " your purchase";
        }
        break;
        
      case 'fixedDiscount':
        summary = `$${formData.discountValue} off`;
        if (formData.minimumPurchase && Number(formData.minimumPurchase) > 0) {
          summary += ` when you spend $${formData.minimumPurchase} or more`;
        } else {
          summary += " your purchase";
        }
        break;
        
      case 'freeItem':
        summary = `Get a free ${formData.itemName}`;
        if (formData.itemDescription) {
          summary += ` (${formData.itemDescription})`;
        }
        break;
        
      case 'bundleOffer':
        summary = `Buy ${formData.requiredPurchase}, get ${formData.bonusItem}`;
        if (formData.bundleDiscountType === 'free') {
          summary += " free";
        } else if (formData.bundleDiscountType === 'percentage') {
          summary += ` ${formData.bundleDiscountValue}% off`;
        } else if (formData.bundleDiscountType === 'fixed') {
          summary += ` $${formData.bundleDiscountValue} off`;
        }
        break;
        

        
      default:
        summary = "Reward";
        break;
    }
    
    return summary;
  }

  const saveReward = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save rewards.",
        variant: "destructive"
      })
      return
    }

    try {
      // Transform conditions into array of objects
      const conditions = []

      // Transaction conditions
      if (formData.conditions.minimumTransactions) {
        conditions.push({
          type: "minimumTransactions",
          value: Number(formData.conditions.minimumTransactions)
        })
      }

      if (formData.conditions.maximumTransactions) {
        conditions.push({
          type: "maximumTransactions",
          value: Number(formData.conditions.maximumTransactions)
        })
      }

      // Spending conditions
      if (formData.conditions.minimumLifetimeSpend) {
        conditions.push({
          type: "minimumLifetimeSpend",
          value: Number(formData.conditions.minimumLifetimeSpend)
        })
      }

      if (formData.conditions.minimumPointsBalance) {
        conditions.push({
          type: "minimumPointsBalance",
          value: Number(formData.conditions.minimumPointsBalance)
        })
      }

      // Time-based conditions
      if (formData.conditions.daysSinceJoined) {
        conditions.push({
          type: "daysSinceJoined",
          value: Number(formData.conditions.daysSinceJoined)
        })
      }

      // Membership level condition (always enabled for non-new customers)
      if (formData.conditions.membershipLevel && formData.rewardVisibility !== 'new') {
        conditions.push({
          type: "membershipLevel",
          value: formData.conditions.membershipLevel
        })
      }

      // Transform limitations into array of objects
      const limitations = []

      // Total Redemption Limit
      if (formData.limitations.totalRedemptionLimit) {
        limitations.push({
          type: "totalRedemptionLimit",
          value: Number(formData.limitations.totalRedemptionLimit)
        });
      }

      // Time Restrictions
      if (formData.limitations.useTimeRestrictions) {
        if (formData.limitations.startTime) {
          limitations.push({
            type: "startTime",
            value: formData.limitations.startTime
          });
        }
        
        if (formData.limitations.endTime) {
          limitations.push({
            type: "endTime", 
            value: formData.limitations.endTime
          });
        }
        
        if (formData.limitations.dayRestrictions.length > 0) {
          limitations.push({
            type: "dayRestrictions",
            value: formData.limitations.dayRestrictions
          });
        }
      }

      // Date Restrictions
      if (formData.limitations.useDateRestrictions) {
        if (formData.limitations.dateRestrictionStart) {
          limitations.push({
            type: "dateRestrictionStart",
            value: formData.limitations.dateRestrictionStart
          });
        }
        
        if (formData.limitations.dateRestrictionEnd) {
          limitations.push({
            type: "dateRestrictionEnd",
            value: formData.limitations.dateRestrictionEnd
          });
        }
      }

      // Ensure Per Customer Limit is always at least 1
      const perCustomerLimit = formData.limitations.perCustomerLimit 
        ? Math.max(1, Number(formData.limitations.perCustomerLimit)) 
        : 1;
      
      limitations.push({
        type: "customerLimit",
        value: perCustomerLimit
      });

      const timestamp = new Date()
      const utcTimestamp = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes()
      ))

      // Check if reward should be active based on active period
      let isActiveBasedOnPeriod = formData.isActive
      if (formData.hasActivePeriod && formData.activePeriod.startDate && formData.activePeriod.endDate) {
        const now = new Date()
        
        // Create start datetime using same method as saving (no timezone conversion)
        const startDate = new Date(formData.activePeriod.startDate)
        const [startHours, startMinutes] = formData.activePeriod.startTime.split(':')
        const startYear = startDate.getFullYear()
        const startMonth = startDate.getMonth() + 1
        const startDay = startDate.getDate()
        const utcStartDate = new Date(Date.UTC(startYear, startMonth - 1, startDay, parseInt(startHours), parseInt(startMinutes), 0, 0))
        
        // Create end datetime using same method as saving (no timezone conversion)
        const endDate = new Date(formData.activePeriod.endDate)
        const [endHours, endMinutes] = formData.activePeriod.endTime.split(':')
        const endYear = endDate.getFullYear()
        const endMonth = endDate.getMonth() + 1
        const endDay = endDate.getDate()
        const utcEndDate = new Date(Date.UTC(endYear, endMonth - 1, endDay, parseInt(endHours), parseInt(endMinutes), 59, 999))
        
        // If current date/time is outside the active period, mark as inactive
        if (now < utcStartDate || now > utcEndDate) {
          isActiveBasedOnPeriod = false
        }
      }

      // Create the base reward data object
      const rewardData: any = {
        rewardName: formData.rewardName,
        description: formData.description,
        programtype: "points",
        isActive: isActiveBasedOnPeriod,
        pointsCost: formData.rewardVisibility === 'new' ? 0 : Math.max(0, Number(formData.pointsCost)),
        rewardVisibility: formData.rewardVisibility === 'all' ? 'global' : 
                          formData.rewardVisibility === 'specific' ? 'specific' : 
                          formData.rewardVisibility === 'new' ? 'global' : 'conditional',
        newcx: formData.rewardVisibility === 'new',
        firstPurchaseRequired: formData.rewardVisibility === 'new',
        
        // Add reward type specific data
        rewardTypeDetails: {
          type: formData.type,
        },
        
        delayedVisibility: formData.rewardVisibility === 'new' || !formData.delayedVisibility ? null : {
          type: formData.delayedVisibilityType === 'transactions' ? 'totaltransactions' : 'totalLifetimeSpend',
          value: formData.delayedVisibilityType === 'transactions' 
            ? Number(formData.delayedVisibilityTransactions)
            : Number(formData.delayedVisibilitySpend)
        },
        conditions,
        limitations,
        pin: formData.pin,
        createdAt: utcTimestamp,
        status: isActiveBasedOnPeriod ? 'active' : 'inactive',
        merchantId: user.uid,
        updatedAt: utcTimestamp,
        minSpend: 0,
        reason: '',
        customers: [],
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        lastRedeemedAt: null,
        uniqueCustomerIds: customerId ? [customerId] : [],
        
        // Add active period data
        hasActivePeriod: formData.hasActivePeriod,
        activePeriod: formData.hasActivePeriod ? {
          startDate: (() => {
            // Store Melbourne time as UTC without conversion
            const date = new Date(formData.activePeriod.startDate)
            const [hours, minutes] = formData.activePeriod.startTime.split(':')
            
            // Get date components
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            
            // Create date with Melbourne time but store as UTC
            const utcDate = new Date(Date.UTC(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0))
            return utcDate.toISOString()
          })(),
          endDate: (() => {
            // Store Melbourne time as UTC without conversion
            const date = new Date(formData.activePeriod.endDate)
            const [hours, minutes] = formData.activePeriod.endTime.split(':')
            
            // Get date components
            const year = date.getFullYear()
            const month = date.getMonth() + 1
            const day = date.getDate()
            
            // Create date with Melbourne time but store as UTC
            const utcDate = new Date(Date.UTC(year, month - 1, day, parseInt(hours), parseInt(minutes), 59, 999))
            return utcDate.toISOString()
          })()
        } : null,
        
        // Add the reward summary
        rewardSummary: generateRewardSummary(),
      }
      
      // Add type-specific details
      switch(formData.type) {
        case 'percentageDiscount':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            discountValue: Number(formData.discountValue) || 0,
            discountType: 'percentage',
            appliesTo: formData.discountAppliesTo || 'Any purchase'
          };
          break;
          
        case 'fixedDiscount':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            discountValue: Number(formData.discountValue) || 0,
            discountType: 'fixed',
            minimumPurchase: Number(formData.minimumPurchase) || 0
          };
          break;
          
        case 'freeItem':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            itemName: formData.itemName,
            itemDescription: formData.itemDescription || ''
          };
          break;
          
        case 'bundleOffer':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            requiredPurchase: formData.requiredPurchase,
            bonusItem: formData.bonusItem,
            bundleDiscountType: formData.bundleDiscountType,
            bundleDiscountValue: formData.bundleDiscountType !== 'free' ? Number(formData.bundleDiscountValue) || 0 : 0
          };
          break;

      }

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', user.uid, 'rewards');
      const newRewardRef = await addDoc(merchantRewardsRef, {
        ...rewardData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: newRewardRef.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Update the merchant's reward with the ID
      await updateDoc(
        doc(db, 'merchants', user.uid, 'rewards', newRewardRef.id),
        { id: newRewardRef.id }
      );

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      );
      
      toast({
        title: "Reward Created",
        description: "Your new reward has been successfully created.",
      });
      
      // Close the popup
      onOpenChange(false);
      
    } catch (error) {
      console.error("Error saving reward:", error);
      toast({
        title: "Error",
        description: "Failed to create reward. Please try again.",
        variant: "destructive"
      });
    }
  }

  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing
          setFormData({
            rewardName: "",
            description: "",
            type: "",
            rewardVisibility: "all",
            specificCustomerIds: customerId ? [customerId] : [],
            specificCustomerNames: customerName ? [customerName] : [],
            pin: "",
            pointsCost: "",
            isActive: true,
            delayedVisibility: false,
            delayedVisibilityType: "transactions",
            delayedVisibilityTransactions: "",
            delayedVisibilitySpend: "",
            discountValue: "",
            discountAppliesTo: "",
            minimumPurchase: "",
            itemName: "",
            itemDescription: "",
            requiredPurchase: "",
            bonusItem: "",
            bundleDiscountType: "free",
            bundleDiscountValue: "",
            mysteryOptions: "",
            revealAtCheckout: false,
            customRewardDetails: "",
            voucherAmount: "",
            conditions: {
              useTransactionRequirements: false,
              useSpendingRequirements: false,
              useTimeRequirements: false,
              minimumTransactions: "",
              maximumTransactions: "",
              daysSinceJoined: "",
              minimumLifetimeSpend: "",
              minimumPointsBalance: "",
              membershipLevel: "Bronze",
              newCustomer: false,
              useMembershipRequirements: true
            },
            limitations: {
              totalRedemptionLimit: "",
              perCustomerLimit: "1",
              useTimeRestrictions: false,
              startTime: "",
              endTime: "",
              dayRestrictions: [],
              useDateRestrictions: false,
              dateRestrictionStart: "",
              dateRestrictionEnd: ""
            },
            hasActivePeriod: false,
            activePeriod: {
              startDate: "",
              endDate: "",
              startTime: "09:00",
              endTime: "17:00"
            },
            rewardSummary: "",
          })
          setCurrentStep(1)
        }
        onOpenChange(open)
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
              <div className="p-6 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="text-blue-500">Create</span> Reward
                </h2>
                <p className="text-sm text-gray-600">
                  Offer rewards that motivate customers to engage with your loyalty program
                </p>
                
                <div className="flex items-center space-x-1 mt-4">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => handleStepChange(step)}
                      className={`h-2 w-10 rounded-md transition-all ${
                        step === currentStep 
                          ? "bg-blue-600" 
                          : step < currentStep 
                          ? "bg-blue-300" 
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Steps navigation */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                <nav className="space-y-2">
                  {[
                    { step: 1, title: "Basic Details", desc: "Name, type, and points" },
                    { step: 2, title: "Visibility", desc: "Who can see this reward (not who can redeem)" },
                    { step: 3, title: "Conditions", desc: "Who can redeem this reward" },
                    { step: 4, title: "Limitations", desc: "Usage restrictions" },
                    { step: 5, title: "Review", desc: "Final review and create" }
                  ].map((item) => (
                    <button
                      key={item.step}
                      onClick={() => handleStepChange(item.step)}
                      className={`w-full text-left p-3 rounded-md transition-colors ${
                        currentStep === item.step
                          ? "bg-blue-100 text-blue-900 border border-blue-200"
                          : item.step < currentStep
                          ? "bg-white text-gray-700 hover:bg-gray-50"
                          : "bg-white text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={item.step > currentStep + 1}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          currentStep === item.step
                            ? "bg-blue-600 text-white"
                            : item.step < currentStep
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-400"
                        }`}>
                          {item.step < currentStep ? "✓" : item.step}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Details</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Reward Name <span className="text-red-500">*</span></Label>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-600">Active</Label>
                            <Switch
                              checked={formData.isActive}
                              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                            />
                          </div>
                        </div>
                        <Input
                          value={formData.rewardName}
                          onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                          placeholder="Enter a clear, concise name (e.g., 'Free Coffee Reward')"
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-sm">Description <span className="text-red-500">*</span></Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Explain what customers will receive when they redeem this reward"
                          className="min-h-[70px] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-sm">Reward Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select reward type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentageDiscount">Percentage Discount</SelectItem>
                              <SelectItem value="fixedDiscount">Fixed-Amount Discount</SelectItem>
                              <SelectItem value="freeItem">Free Item</SelectItem>
                              <SelectItem value="bundleOffer">Buy X Get Y (Bundle)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-sm">Points Cost <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.rewardVisibility === 'new' ? '0' : formData.pointsCost}
                            onChange={(e) => {
                              if (formData.rewardVisibility === 'new') return; // Prevent changes for new customers
                              setFormData({ ...formData, pointsCost: e.target.value })
                            }}
                            placeholder="e.g., 100"
                            className="h-9"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          {formData.rewardVisibility === 'new' && (
                            <p className="text-xs text-amber-600">
                              New customer rewards must be free (0 points) since they haven't earned points yet.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Type-specific fields */}
                      {formData.type === 'percentageDiscount' && (
                        <div className="space-y-1.5 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Discount Percentage <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            placeholder="e.g., 15 for 15% off"
                            className="h-9"
                          />
                        </div>
                      )}

                      {formData.type === 'fixedDiscount' && (
                        <div className="space-y-1.5 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Discount Amount ($) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            placeholder="e.g., 10 for $10 off"
                            className="h-9"
                          />
                          
                          <div className="space-y-1.5 mt-2">
                            <Label className="text-sm">Minimum Purchase ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.minimumPurchase}
                              onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                              placeholder="e.g., 25 for minimum $25 purchase"
                              className="h-9"
                            />
                          </div>
                        </div>
                      )}

                      {formData.type === 'freeItem' && (
                        <div className="space-y-1.5 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Free Item Name <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={formData.itemName}
                            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                            placeholder="e.g., Coffee, Muffin, etc."
                            className="h-9"
                          />
                        </div>
                      )}

                      {formData.type === 'bundleOffer' && (
                        <div className="space-y-1.5 border-l-2 border-blue-100 pl-4 py-2">
                          <div className="space-y-1.5">
                            <Label className="text-sm">Required Purchase <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={formData.requiredPurchase}
                              onChange={(e) => setFormData({ ...formData, requiredPurchase: e.target.value })}
                              placeholder="e.g., Large Coffee, Any Sandwich, etc."
                              className="h-9"
                            />
                            <p className="text-xs text-gray-500">What the customer needs to purchase</p>
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-sm">Bonus Item <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={formData.bonusItem}
                              onChange={(e) => setFormData({ ...formData, bonusItem: e.target.value })}
                              placeholder="e.g., Small Coffee, Cookie, etc."
                              className="h-9"
                            />
                            <p className="text-xs text-gray-500">What the customer gets as a bonus</p>
                          </div>
                          
                          <div className="space-y-1.5">
                            <Label className="text-sm">Bonus Discount Type <span className="text-red-500">*</span></Label>
                            <Select
                              value={formData.bundleDiscountType}
                              onValueChange={(value) => setFormData({ ...formData, bundleDiscountType: value })}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select discount type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free (100% off)</SelectItem>
                                <SelectItem value="percentage">Percentage off</SelectItem>
                                <SelectItem value="fixed">Fixed amount off</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {formData.bundleDiscountType !== 'free' && (
                            <div className="space-y-1.5">
                              <Label className="text-sm">
                                Discount Value <span className="text-red-500">*</span>
                                {formData.bundleDiscountType === 'percentage' && ' (%)'}
                                {formData.bundleDiscountType === 'fixed' && ' ($)'}
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max={formData.bundleDiscountType === 'percentage' ? "100" : undefined}
                                step={formData.bundleDiscountType === 'fixed' ? "0.01" : "1"}
                                value={formData.bundleDiscountValue}
                                onChange={(e) => setFormData({ ...formData, bundleDiscountValue: e.target.value })}
                                placeholder={formData.bundleDiscountType === 'percentage' ? "e.g., 50 for 50% off" : "e.g., 5 for $5 off"}
                                className="h-9"
                              />
                            </div>
                          )}
                        </div>
                      )}



                      <div className="space-y-1.5">
                        <Label className="text-sm">PIN Code (4 digits) <span className="text-red-500">*</span></Label>
                        <Input
                          maxLength={4}
                          value={formData.pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                            setFormData({ ...formData, pin: value })
                          }}
                          placeholder="4-digit PIN (e.g., 1234)"
                          className="h-9"
                        />
                        <p className="text-xs text-gray-500">Staff will use this PIN during redemption</p>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Visibility Settings</h3>
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex gap-3">
                          <Info className="h-4 w-4 text-gray-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 mb-1">About Visibility Settings</p>
                            <p className="text-sm text-gray-600">
                              These settings control <strong>who can see</strong> this reward in their app. Redemption eligibility (who can actually redeem it) will be configured in the following steps with conditions and limitations.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Who Can See This Reward */}
                      <div className="space-y-3">
                        <Label className="text-sm">Who Can See This Reward</Label>
                        
                        <RadioGroup 
                          value={formData.rewardVisibility} 
                          onValueChange={(value) => {
                            setFormData({
                              ...formData,
                              rewardVisibility: value,
                              pointsCost: value === 'new' ? '0' : formData.pointsCost,
                              conditions: {
                                ...formData.conditions,
                                newCustomer: value === 'new',
                                useMembershipRequirements: value !== 'new'
                              }
                            });
                          }}
                          className="space-y-3"
                        >
                          <label htmlFor="all-customers" className="block w-full cursor-pointer">
                            <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                              <RadioGroupItem value="all" id="all-customers" className="mt-1" />
                              <div className="flex-1">
                                <p className={`text-sm font-medium transition-colors duration-200 ${formData.rewardVisibility === 'all' ? 'text-blue-700' : ''}`}>All Customers</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  This reward will be visible to all your customers in their app
                                </p>
                              </div>
                            </div>
                          </label>
                          
                          <label htmlFor="new-customers" className="block w-full cursor-pointer">
                            <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'new' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                              <RadioGroupItem value="new" id="new-customers" className="mt-1" />
                              <div className="flex-1">
                                <p className={`text-sm font-medium transition-colors duration-200 ${formData.rewardVisibility === 'new' ? 'text-blue-700' : ''}`}>New Customers Only</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Only customers who just joined your loyalty program will see this reward in their app
                                </p>
                              </div>
                            </div>
                          </label>
                          
                          <label htmlFor="specific-customers" className="block w-full cursor-pointer">
                            <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'specific' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                              <RadioGroupItem value="specific" id="specific-customers" className="mt-1" />
                              <div className="flex-1">
                                <p className={`text-sm font-medium transition-colors duration-200 ${formData.rewardVisibility === 'specific' ? 'text-blue-700' : ''}`}>Specific Customers</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Choose specific customers who can see this reward in their app
                                </p>
                              </div>
                            </div>
                          </label>
                        </RadioGroup>
                        
                        {/* Specific Customer Selection */}
                        <AnimatePresence mode="wait">
                          {formData.rewardVisibility === 'specific' && (
                            <motion.div
                              key="specific-customers"
                              initial={{ height: 0, opacity: 0, y: -10 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94]
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-100 pl-4 py-2">
                            {customersLoading ? (
                              <div className="flex items-center justify-center p-8">
                                <div className="text-sm text-gray-500">Loading customers...</div>
                              </div>
                            ) : customers.length > 0 ? (
                              <div className="space-y-4">
                                {/* Customer search input */}
                                <div className="relative">
                                  <Input
                                    type="text"
                                    placeholder="Search customers..."
                                    className="pl-8 text-sm h-9"
                                    onChange={(e) => {
                                      console.log("Searching for:", e.target.value);
                                    }}
                                  />
                                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                                </div>
                                
                                {/* Customer list with checkboxes */}
                                <div className="border rounded-md max-h-[200px] overflow-y-auto">
                                  {customers.map((customer) => (
                                    <div 
                                      key={customer.id} 
                                      className="flex items-start p-3 border-b last:border-b-0 hover:bg-gray-50"
                                    >
                                      <Checkbox
                                        id={`customer-${customer.id}`}
                                        checked={selectedCustomers.some(c => c.id === customer.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            const newSelectedCustomers = [...selectedCustomers, { 
                                              id: customer.id, 
                                              name: customer.name 
                                            }];
                                            setSelectedCustomers(newSelectedCustomers);
                                            
                                            setFormData({
                                              ...formData,
                                              specificCustomerIds: newSelectedCustomers.map(c => c.id),
                                              specificCustomerNames: newSelectedCustomers.map(c => c.name)
                                            });
                                          } else {
                                            const newSelectedCustomers = selectedCustomers.filter(
                                              c => c.id !== customer.id
                                            );
                                            setSelectedCustomers(newSelectedCustomers);
                                            
                                            setFormData({
                                              ...formData,
                                              specificCustomerIds: newSelectedCustomers.map(c => c.id),
                                              specificCustomerNames: newSelectedCustomers.map(c => c.name)
                                            });
                                          }
                                        }}
                                        className="mt-1 mr-3"
                                      />
                                      <div className="flex-1">
                                        <label 
                                          htmlFor={`customer-${customer.id}`}
                                          className="flex flex-col cursor-pointer"
                                        >
                                          <span className="text-sm font-medium">{customer.name}</span>
                                          {customer.email && (
                                            <span className="text-xs text-gray-500">{customer.email}</span>
                                          )}
                                        </label>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Selected customers summary */}
                                {selectedCustomers.length > 0 && (
                                  <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                                    <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Customers ({selectedCustomers.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                      {selectedCustomers.map(customer => (
                                        <div key={customer.id} className="bg-white border border-blue-200 rounded-full px-3 py-1 text-sm flex items-center gap-1">
                                          <span>{customer.name}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newSelectedCustomers = selectedCustomers.filter(
                                                c => c.id !== customer.id
                                              );
                                              setSelectedCustomers(newSelectedCustomers);
                                              
                                              setFormData({
                                                ...formData,
                                                specificCustomerIds: newSelectedCustomers.map(c => c.id),
                                                specificCustomerNames: newSelectedCustomers.map(c => c.name)
                                              });
                                            }}
                                            className="text-gray-400 hover:text-red-500"
                                          >
                                            <X className="h-3 w-3" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <p className="text-sm text-amber-600">
                                  No customers found. Make sure you have customers in your loyalty program.
                                </p>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={fetchMerchantCustomers}
                                  className="text-blue-600 border-blue-200"
                                >
                                  Retry Loading Customers
                                </Button>
                              </div>
                            )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Progressive Unlock */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Progressive Unlock</Label>
                          <Switch
                            checked={formData.delayedVisibility}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              delayedVisibility: checked,
                              delayedVisibilityType: checked ? formData.delayedVisibilityType : "transactions",
                              delayedVisibilityTransactions: checked ? formData.delayedVisibilityTransactions : "",
                              delayedVisibilitySpend: checked ? formData.delayedVisibilitySpend : ""
                            })}
                            disabled={formData.rewardVisibility === 'new'}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        
                        <AnimatePresence mode="wait">
                          {formData.delayedVisibility && (
                            <motion.div
                              key="progressive-unlock"
                              initial={{ height: 0, opacity: 0, y: -10 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94]
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-100 pl-4 py-2">
                            <p className="text-xs text-gray-600 mb-4">
                              Hide this reward from view until the customer reaches a certain milestone. Once visible, redemption eligibility will still be determined by your conditions and limitations settings.
                            </p>
                            
                            <div className="space-y-4">
                              <div className="grid gap-2">
                                <Label className="text-sm">Unlock Type</Label>
                                <RadioGroup 
                                  value={formData.delayedVisibilityType} 
                                  onValueChange={(value) => setFormData({
                                    ...formData,
                                    delayedVisibilityType: value
                                  })}
                                  className="grid grid-cols-2 gap-3"
                                >
                                  <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                    <RadioGroupItem value="transactions" id="transactions" />
                                    <Label htmlFor="transactions" className="cursor-pointer text-sm">Transactions</Label>
                                  </div>
                                  <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                    <RadioGroupItem value="spend" id="spend" />
                                    <Label htmlFor="spend" className="cursor-pointer text-sm">Total Spend</Label>
                                  </div>
                                </RadioGroup>
                              </div>
                            
                              {formData.delayedVisibilityType === 'transactions' ? (
                                <div className="grid gap-2">
                                  <Label className="text-sm">Minimum Transactions</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={formData.delayedVisibilityTransactions}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      delayedVisibilityTransactions: e.target.value
                                    })}
                                    placeholder="e.g., 5"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Customer must make this many purchases before they can see the reward
                                  </p>
                                </div>
                              ) : (
                                <div className="grid gap-2">
                                  <Label className="text-sm">Minimum Spend ($)</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={formData.delayedVisibilitySpend}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      delayedVisibilitySpend: e.target.value
                                    })}
                                    placeholder="e.g., 100"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Customer must spend this much before they can see the reward
                                  </p>
                                </div>
                              )}
                            </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Active Period */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Active Period</Label>
                          <Switch
                            checked={formData.hasActivePeriod}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              hasActivePeriod: checked,
                              activePeriod: checked ? formData.activePeriod : { startDate: "", endDate: "", startTime: "09:00", endTime: "17:00" }
                            })}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        
                        <AnimatePresence mode="wait">
                          {formData.hasActivePeriod && (
                            <motion.div
                              key="active-period"
                              initial={{ height: 0, opacity: 0, y: -10 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94]
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-100 pl-4 py-2">
                            <p className="text-xs text-gray-600 mb-4">
                              Set a specific date and time period when this reward is visible to customers. Times are treated as Melbourne local time. Additional redemption conditions can be set in the following steps.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm">Start Date & Time</Label>
                                <div className="space-y-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal h-9",
                                          !formData.activePeriod.startDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.activePeriod.startDate ? format(new Date(formData.activePeriod.startDate), "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarComponent
                                        mode="single"
                                        selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                                        onSelect={(date: Date | undefined) => 
                                          setFormData({
                                            ...formData,
                                            activePeriod: {
                                              ...formData.activePeriod,
                                              startDate: date ? date.toISOString() : ''
                                            }
                                          })
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    type="time"
                                    value={formData.activePeriod.startTime}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      activePeriod: {
                                        ...formData.activePeriod,
                                        startTime: e.target.value
                                      }
                                    })}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm">End Date & Time</Label>
                                <div className="space-y-2">
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          "w-full justify-start text-left font-normal h-9",
                                          !formData.activePeriod.endDate && "text-muted-foreground"
                                        )}
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {formData.activePeriod.endDate ? format(new Date(formData.activePeriod.endDate), "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                      <CalendarComponent
                                        mode="single"
                                        selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                                        onSelect={(date: Date | undefined) => 
                                          setFormData({
                                            ...formData,
                                            activePeriod: {
                                              ...formData.activePeriod,
                                              endDate: date ? date.toISOString() : ''
                                            }
                                          })
                                        }
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                  <Input
                                    type="time"
                                    value={formData.activePeriod.endTime}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      activePeriod: {
                                        ...formData.activePeriod,
                                        endTime: e.target.value
                                      }
                                    })}
                                    className="h-9"
                                  />
                                </div>
                              </div>
                            </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditions</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* New Customer - Always visible at the top */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">New Customer Only</Label>
                          <Switch
                            checked={formData.conditions.newCustomer}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({
                                  ...formData,
                                  rewardVisibility: 'new',
                                  delayedVisibility: false,
                                  conditions: {
                                    ...formData.conditions,
                                    newCustomer: true,
                                    maximumTransactions: "0",
                                    membershipLevel: "Bronze",
                                    useMembershipRequirements: false,
                                    useTransactionRequirements: false,
                                    useSpendingRequirements: false,
                                    useTimeRequirements: false,
                                    minimumTransactions: "",
                                    daysSinceJoined: "",
                                    minimumLifetimeSpend: "",
                                    minimumPointsBalance: ""
                                  }
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  rewardVisibility: formData.rewardVisibility === 'new' ? 'all' : formData.rewardVisibility,
                                  conditions: {
                                    ...formData.conditions,
                                    newCustomer: false,
                                    useMembershipRequirements: true
                                  }
                                });
                              }
                            }}
                            disabled={formData.rewardVisibility === 'new'}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>
                        
                        <p className="text-xs text-gray-600">
                          Enable this to restrict the reward to customers who recently joined your loyalty program.
                        </p>
                        
                        {formData.rewardVisibility === 'new' && (
                          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                            <div className="flex gap-2">
                              <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <p className="text-xs text-amber-700">
                                When enabled, other conditions will be disabled as this specifically targets new customers only.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={`space-y-4 ${formData.rewardVisibility === 'new' ? 'opacity-50 pointer-events-none' : ''}`}>
                        {/* Transaction Requirements */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Transaction Requirements</Label>
                            <Switch
                              checked={formData.conditions.useTransactionRequirements}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                conditions: {
                                  ...formData.conditions,
                                  useTransactionRequirements: checked,
                                  minimumTransactions: checked ? formData.conditions.minimumTransactions : "",
                                  maximumTransactions: checked ? formData.conditions.maximumTransactions : ""
                                }
                              })}
                              disabled={formData.rewardVisibility === 'new'}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        
                          <AnimatePresence mode="wait">
                            {formData.conditions.useTransactionRequirements && (
                              <motion.div
                                key="transaction-requirements"
                                initial={{ height: 0, opacity: 0, y: -10 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -10 }}
                                transition={{ 
                                  duration: 0.3,
                                  ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-l-2 border-blue-100 pl-4 py-2">
                              <p className="text-xs text-gray-600 mb-4">
                                Set purchase count conditions that determine eligibility based on the number of transactions.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-sm">Minimum Transactions</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.conditions.minimumTransactions}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      conditions: {
                                        ...formData.conditions,
                                        minimumTransactions: e.target.value
                                      }
                                    })}
                                    placeholder="e.g., 5"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Customer must have made at least this many purchases
                                  </p>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-sm">Maximum Transactions</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.conditions.maximumTransactions}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      conditions: {
                                        ...formData.conditions,
                                        maximumTransactions: e.target.value
                                      }
                                    })}
                                    placeholder="e.g., 20"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Maximum purchases limit (leave empty for no limit)
                                  </p>
                                </div>
                              </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {/* Spending Requirements */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Spending Requirements</Label>
                            <Switch
                              checked={formData.conditions.useSpendingRequirements}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                conditions: {
                                  ...formData.conditions,
                                  useSpendingRequirements: checked,
                                  minimumLifetimeSpend: checked ? formData.conditions.minimumLifetimeSpend : "",
                                  minimumPointsBalance: checked ? formData.conditions.minimumPointsBalance : ""
                                }
                              })}
                              disabled={formData.rewardVisibility === 'new'}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        
                          <AnimatePresence mode="wait">
                            {formData.conditions.useSpendingRequirements && (
                              <motion.div
                                key="spending-requirements"
                                initial={{ height: 0, opacity: 0, y: -10 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -10 }}
                                transition={{ 
                                  duration: 0.3,
                                  ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-l-2 border-blue-100 pl-4 py-2">
                              <p className="text-xs text-gray-600 mb-4">
                                Set monetary or points requirements that determine eligibility based on spending or point balance.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <Label className="text-sm">Minimum Lifetime Spend ($)</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.conditions.minimumLifetimeSpend}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      conditions: {
                                        ...formData.conditions,
                                        minimumLifetimeSpend: e.target.value
                                      }
                                    })}
                                    placeholder="e.g., 100"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Customer must have spent at least this amount across all purchases
                                  </p>
                                </div>
                                
                                <div className="space-y-2">
                                  <Label className="text-sm">Minimum Points Balance</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.conditions.minimumPointsBalance}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      conditions: {
                                        ...formData.conditions,
                                        minimumPointsBalance: e.target.value
                                      }
                                    })}
                                    placeholder="e.g., 500"
                                    className="text-sm h-9"
                                  />
                                  <p className="text-xs text-gray-500">
                                    Customer must have at least this many points in their account
                                  </p>
                                </div>
                              </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {/* Time Requirements */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Time-Based Requirements</Label>
                            <Switch
                              checked={formData.conditions.useTimeRequirements}
                              onCheckedChange={(checked) => setFormData({
                                ...formData,
                                conditions: {
                                  ...formData.conditions,
                                  useTimeRequirements: checked,
                                  daysSinceJoined: checked ? formData.conditions.daysSinceJoined : ""
                                }
                              })}
                              disabled={formData.rewardVisibility === 'new'}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        
                          <AnimatePresence mode="wait">
                            {formData.conditions.useTimeRequirements && (
                              <motion.div
                                key="time-requirements"
                                initial={{ height: 0, opacity: 0, y: -10 }}
                                animate={{ height: "auto", opacity: 1, y: 0 }}
                                exit={{ height: 0, opacity: 0, y: -10 }}
                                transition={{ 
                                  duration: 0.3,
                                  ease: [0.25, 0.46, 0.45, 0.94]
                                }}
                                className="overflow-hidden"
                              >
                                <div className="border-l-2 border-blue-100 pl-4 py-2">
                              <p className="text-xs text-gray-600 mb-4">
                                Set time-based conditions that determine eligibility based on membership duration or last visit.
                              </p>
                              
                              <div className="space-y-2">
                                <Label className="text-sm">Minimum Days as Member</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={formData.conditions.daysSinceJoined}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    conditions: {
                                      ...formData.conditions,
                                      daysSinceJoined: e.target.value
                                    }
                                  })}
                                  placeholder="e.g., 30"
                                  className="text-sm h-9"
                                />
                                <p className="text-xs text-gray-500">
                                  Customer must have been a member for at least this many days
                                </p>
                              </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {/* Membership Level - Always enabled for non-new customers */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm">Membership Level Requirement</Label>
                            <Switch
                              checked={formData.rewardVisibility !== 'new'}
                              disabled={true}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                          
                          {formData.rewardVisibility === 'new' ? (
                            <div className="border-l-2 border-blue-100 pl-4 py-2">
                              <div className="flex items-center gap-2 border border-blue-100 bg-blue-50 p-3 rounded-md">
                                <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-medium text-amber-700">B</div>
                                <div>
                                  <p className="text-sm font-medium text-blue-800">Bronze (Default)</p>
                                  <p className="text-xs text-blue-700">
                                    New customers automatically start at Bronze membership level
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border-l-2 border-blue-100 pl-4 py-2 space-y-3">
                              <div className="space-y-2">
                                <Label htmlFor="membershipLevel" className="text-sm">Minimum Membership Level</Label>
                                <Select
                                  value={formData.conditions.membershipLevel || ""}
                                  onValueChange={(value) => {
                                    setFormData({
                                      ...formData,
                                      conditions: {
                                        ...formData.conditions,
                                        membershipLevel: value
                                      }
                                    });
                                  }}
                                >
                                  <SelectTrigger id="membershipLevel" className="text-sm h-9">
                                    <SelectValue placeholder="Select a membership level" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Bronze">Bronze</SelectItem>
                                    <SelectItem value="Silver">Silver</SelectItem>
                                    <SelectItem value="Gold">Gold</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Limitations</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Redemption Limits */}
                      <div className="space-y-3">
                        <Label className="text-sm">Redemption Limits</Label>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="totalRedemptionLimit" className="text-sm">Total Redemption Limit</Label>
                            <Input
                              id="totalRedemptionLimit"
                              type="number"
                              min="0"
                              value={formData.limitations.totalRedemptionLimit}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setFormData({
                                  ...formData,
                                  limitations: {
                                    ...formData.limitations,
                                    totalRedemptionLimit: e.target.value === '' ? '' : Math.max(0, value).toString()
                                  }
                                })
                              }}
                              placeholder="Unlimited"
                              className="text-sm h-9"
                            />
                            <p className="text-xs text-gray-500">
                              Maximum number of times this reward can be redeemed across all customers (leave empty for unlimited)
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="perCustomerLimit" className="text-sm">Per-Customer Limit</Label>
                            <Input
                              id="perCustomerLimit"
                              type="number"
                              min="0"
                              value={formData.limitations.perCustomerLimit}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                setFormData({
                                  ...formData,
                                  limitations: {
                                    ...formData.limitations,
                                    perCustomerLimit: e.target.value === '' ? '' : Math.max(0, value).toString()
                                  }
                                })
                              }}
                              placeholder="Unlimited"
                              className="text-sm h-9"
                            />
                            <p className="text-xs text-gray-500">
                              How many times each individual customer can redeem this reward (leave empty for unlimited)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Time Restrictions */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Time Restrictions</Label>
                          <Switch 
                            checked={formData.limitations.useTimeRestrictions}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              limitations: {
                                ...formData.limitations,
                                useTimeRestrictions: checked
                              }
                            })}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>

                        <AnimatePresence mode="wait">
                          {formData.limitations.useTimeRestrictions && (
                            <motion.div
                              key="time-restrictions"
                              initial={{ height: 0, opacity: 0, y: -10 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94]
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-100 pl-4 py-2 space-y-6">
                            <p className="text-sm text-gray-600">
                              Specify when this reward can be redeemed. This is useful for happy hours, lunch specials, etc.
                            </p>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="timeRestrictionStart">Available From</Label>
                                <Input
                                  id="timeRestrictionStart"
                                  type="time"
                                  value={formData.limitations.startTime}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    limitations: {
                                      ...formData.limitations,
                                      startTime: e.target.value
                                    }
                                  })}
                                  className="h-9"
                                />
                                <p className="text-xs text-gray-500">
                                  Starting time when this reward can be redeemed
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="timeRestrictionEnd">Available Until</Label>
                                <Input
                                  id="timeRestrictionEnd"
                                  type="time"
                                  value={formData.limitations.endTime}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    limitations: {
                                      ...formData.limitations,
                                      endTime: e.target.value
                                    }
                                  })}
                                  className="h-9"
                                />
                                <p className="text-xs text-gray-500">
                                  Ending time when this reward can be redeemed
                                </p>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <Label>Available Days</Label>
                              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                                  <div
                                    key={day}
                                    onClick={() => {
                                      const dayIndex = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(day);
                                      const newAvailableDays = [...formData.limitations.dayRestrictions];
                                      if (newAvailableDays.includes(dayIndex.toString())) {
                                        newAvailableDays.splice(newAvailableDays.indexOf(dayIndex.toString()), 1);
                                      } else {
                                        newAvailableDays.push(dayIndex.toString());
                                      }
                                      setFormData({
                                        ...formData,
                                        limitations: {
                                          ...formData.limitations,
                                          dayRestrictions: newAvailableDays
                                        }
                                      });
                                    }}
                                    className={`cursor-pointer flex items-center justify-center text-xs p-2 rounded-md ${
                                      formData.limitations.dayRestrictions.includes(
                                        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(day).toString()
                                      )
                                        ? "bg-blue-100 text-blue-800 font-medium"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {day.substring(0, 3)}
                                  </div>
                                ))}
                              </div>
                              <p className="text-xs text-gray-500">
                                Select the days when this reward is available for redemption
                              </p>
                            </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Date Restrictions */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Date Range Restrictions</Label>
                          <Switch 
                            checked={formData.limitations.useDateRestrictions}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              limitations: {
                                ...formData.limitations,
                                useDateRestrictions: checked
                              }
                            })}
                            className="data-[state=checked]:bg-blue-600"
                          />
                        </div>

                        <AnimatePresence mode="wait">
                          {formData.limitations.useDateRestrictions && (
                            <motion.div
                              key="date-restrictions"
                              initial={{ height: 0, opacity: 0, y: -10 }}
                              animate={{ height: "auto", opacity: 1, y: 0 }}
                              exit={{ height: 0, opacity: 0, y: -10 }}
                              transition={{ 
                                duration: 0.3,
                                ease: [0.25, 0.46, 0.45, 0.94]
                              }}
                              className="overflow-hidden"
                            >
                              <div className="border-l-2 border-blue-100 pl-4 py-2 space-y-6">
                            <p className="text-sm text-gray-600">
                              Set a specific date range when this reward is available. Useful for seasonal promotions.
                            </p>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <Label htmlFor="dateRestrictionStart">Start Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="dateRestrictionStart"
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal h-9",
                                        !formData.limitations.dateRestrictionStart && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {formData.limitations.dateRestrictionStart ? format(new Date(formData.limitations.dateRestrictionStart), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={formData.limitations.dateRestrictionStart ? new Date(formData.limitations.dateRestrictionStart) : undefined}
                                      onSelect={(date: Date | undefined) => 
                                        setFormData({
                                          ...formData,
                                          limitations: {
                                            ...formData.limitations,
                                            dateRestrictionStart: date ? date.toISOString() : ''
                                          }
                                        })
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <p className="text-xs text-gray-500">
                                  First day when this reward can be redeemed
                                </p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="dateRestrictionEnd">End Date</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      id="dateRestrictionEnd"
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-start text-left font-normal h-9",
                                        !formData.limitations.dateRestrictionEnd && "text-muted-foreground"
                                      )}
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {formData.limitations.dateRestrictionEnd ? format(new Date(formData.limitations.dateRestrictionEnd), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={formData.limitations.dateRestrictionEnd ? new Date(formData.limitations.dateRestrictionEnd) : undefined}
                                      onSelect={(date: Date | undefined) => 
                                        setFormData({
                                          ...formData,
                                          limitations: {
                                            ...formData.limitations,
                                            dateRestrictionEnd: date ? date.toISOString() : ''
                                          }
                                        })
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <p className="text-xs text-gray-500">
                                  Last day when this reward can be redeemed
                                </p>
                              </div>
                            </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Review</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Basic Details Review */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Basic Details</Label>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleStepChange(1)}
                          >
                            <EditIcon className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </div>
                        
                        <div className="border-l-2 border-blue-100 pl-4 py-2 space-y-4">
                          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Reward Name</p>
                              <p className="text-sm">{formData.rewardName || 'Not specified'}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Type</p>
                              <p className="text-sm">{capitalizeFirstLetter(formData.type) || 'Not specified'}</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Points Cost</p>
                              <p className="text-sm">{formData.pointsCost || '0'} points</p>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-gray-500">Status</p>
                              <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${formData.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                <p className="text-sm">{formData.isActive ? 'Active' : 'Inactive'}</p>
                              </div>
                            </div>
                            
                            <div className="col-span-2">
                              <p className="text-sm font-medium text-gray-500">Description</p>
                              <p className="text-sm">{formData.description || 'No description provided'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Summary card */}
                      <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                        <div className="flex gap-3">
                          <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <h3 className="text-sm font-medium text-blue-800 mb-1">Reward Summary</h3>
                            <p className="text-sm text-blue-700">
                              {generateRewardSummary()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between gap-3 max-w-5xl">
                  <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-1">
                    <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      className="rounded-md w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    {currentStep > 1 && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleStepChange(currentStep - 1)}
                        className="rounded-md w-full sm:w-auto"
                      >
                        Back
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={async () => {
                      if (currentStep < 5) {
                        handleStepChange(currentStep + 1);
                      } else {
                        setIsCreating(true);
                        await saveReward();
                        // Keep loading state for 2 seconds
                        setTimeout(() => {
                          setIsCreating(false);
                        }, 2000);
                      }
                    }}
                    disabled={isCreating}
                    className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-md w-full sm:w-auto order-1 sm:order-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      currentStep === 5 ? 'Create Reward' : 'Next'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 