"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { CalendarIcon, Clock, HelpCircle, Users, UserCheck, UserCog, ShoppingCart, DollarSign, UserPlus, X, BugPlay, FileText, Eye, ListChecks, AlertTriangle, ChevronRight, Edit as EditIcon, CheckCircle, ClipboardCheck, User, Sparkles, Info, ShoppingBag, Award, Lock, Search } from "lucide-react"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CreateRewardProgress } from "./create-reward-progress"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc, query, getDocs, orderBy, limit, where } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { useRouter } from "next/navigation"
import { BasicRewardWizard } from "./basic-reward-wizard"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface CreateRewardDialogProps {
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
  discountValue: string          // For percentage and fixed discounts
  discountAppliesTo: string      // For percentage discount
  minimumPurchase: string        // For fixed discount
  itemName: string               // For free item
  itemDescription: string        // For free item details
  requiredPurchase: string       // For bundle offer (X)
  bonusItem: string              // For bundle offer (Y)
  bundleDiscountType: string     // For bundle offer (free, percentage, fixed)
  bundleDiscountValue: string    // For bundle offer (percentage or fixed amount)
  mysteryOptions: string         // For mystery surprise options
  revealAtCheckout: boolean      // For mystery surprise reveal timing
  customRewardDetails: string    // For other/custom rewards
  voucherAmount: string          // Legacy field
  
  // Conditions
  conditions: {
    useTransactionRequirements: boolean
    useSpendingRequirements: boolean
    useTimeRequirements: boolean
    minimumTransactions: string
    maximumTransactions: string
    daysSinceJoined: string
    daysSinceLastVisit: string
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
    dayRestrictions: string[]  // Change from Array<string> to string[]
  }

  // New fields for Active Period
  hasActivePeriod: boolean
  activePeriod: {
    startDate: string
    endDate: string
  }
  
  // Summary text for the reward
  rewardSummary: string
}

export function CreateRewardDialog({ 
  open, 
  onOpenChange,
  defaultValues,
  isEditing = false,
  rewardId,
  customerId,
  customerName
}: CreateRewardDialogProps) {
  // Add the router
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()
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
    bundleDiscountType: "free",    // Default to free
    bundleDiscountValue: "",
    mysteryOptions: "",
    revealAtCheckout: false,
    customRewardDetails: "",
    voucherAmount: "",
    spendThreshold: "",
    
    // Conditions
    conditions: {
      useTransactionRequirements: true,
      useSpendingRequirements: true,
      useTimeRequirements: true,
      minimumTransactions: "1",
      maximumTransactions: "10",
      daysSinceJoined: "30",
      daysSinceLastVisit: "7",
      minimumLifetimeSpend: "500",
      minimumPointsBalance: "200",
      membershipLevel: "bronze", // Changed from empty string to "bronze"
      newCustomer: false,
      useMembershipRequirements: false
    },

    // Limitations
    limitations: {
      totalRedemptionLimit: "",
      perCustomerLimit: "",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: [],
    },

    // New fields for Active Period
    hasActivePeriod: false,
    activePeriod: {
      startDate: "",
      endDate: ""
    },
    
    // Summary text for the reward
    rewardSummary: "",
  })

  // Add new state for AI creator
  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiCreatorOpen, setIsAiCreatorOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isBasicWizardOpen, setIsBasicWizardOpen] = useState(false)
  
  // Add state for customer dropdown
  const [customers, setCustomers] = useState<Array<{id: string, name: string, email?: string, pointsBalance?: number, lifetimeTransactionCount?: number}>>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Array<{id: string, name: string}>>([])

  const { user } = useAuth()

  useEffect(() => {
    if (defaultValues) {
      // Set initial form data from default values
      setFormData({
        ...formData,
        ...defaultValues,
        // Make sure membership level is properly capitalized
        conditions: {
          ...formData.conditions,
          ...defaultValues.conditions,
          membershipLevel: defaultValues.conditions?.membershipLevel 
            ? capitalizeFirstLetter(defaultValues.conditions.membershipLevel)
            : ""
        }
      });
      
      // If there's a specific customer ID provided
      if (customerId && customerName) {
        setFormData({
          ...formData,
          rewardVisibility: 'specific',
          specificCustomerIds: customerId ? [customerId] : [],
          specificCustomerNames: customerName ? [customerName] : []
        });
      }
      
      // If there are specific customer IDs in default values
      if (defaultValues.specificCustomerIds && defaultValues.specificCustomerIds.length > 0) {
        setFormData({
          ...formData,
          rewardVisibility: 'specific',
          specificCustomerIds: defaultValues.specificCustomerIds,
          specificCustomerNames: defaultValues.specificCustomerNames
        });
      }
    }
  }, [defaultValues, customerId, customerName]);
  
  // Add effect to fetch customers when "specific" visibility is selected
  useEffect(() => {
    console.log("DEBUG: Visibility effect triggered", {
      visibility: formData.rewardVisibility,
      customersCount: customers.length,
      isLoading: isLoadingCustomers,
      userId: user?.uid
    });
    
    if (formData.rewardVisibility === 'specific' && customers.length === 0 && !isLoadingCustomers && user?.uid) {
      console.log("DEBUG: Conditions met, calling fetchMerchantCustomers");
      fetchMerchantCustomers();
    } else {
      console.log("DEBUG: Skipping customer fetch, conditions not met");
    }
  }, [formData.rewardVisibility, customers.length, user?.uid]);
  
  // Function to fetch merchant's customers - updated with correct path and field name
  const fetchMerchantCustomers = async () => {
    if (!user?.uid) {
      console.log("DEBUG: fetchMerchantCustomers - No user ID available");
      return;
    }
    
    console.log("DEBUG: Starting fetchMerchantCustomers", {
      merchantId: user.uid,
      currentCustomers: customers.length
    });
    
    setIsLoadingCustomers(true);
    try {
      // Try the correct subcollection path with the fullName field
      console.log("DEBUG: Trying merchants/{merchantId}/customers subcollection with fullName field");
      const subcollectionQuery = query(
        collection(db, 'merchants', user.uid, 'customers'),
        orderBy('fullName', 'asc'), // Use fullName instead of name
        limit(100)
      );
      
      const subcollectionSnapshot = await getDocs(subcollectionQuery);
      console.log("DEBUG: Subcollection query complete, docs count:", subcollectionSnapshot.docs.length);
      
      if (subcollectionSnapshot.docs.length > 0) {
        const customersData = subcollectionSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.fullName || data.name || 'Unnamed Customer',
            email: data.email,
            pointsBalance: data.pointsBalance || 0,
            lifetimeTransactionCount: data.lifetimeTransactionCount || 0
          };
        });
        
        console.log("DEBUG: Processed customer data from subcollection:", customersData);
        setCustomers(customersData);
      } else {
        // If that fails, try without the orderBy (in case the field doesn't exist)
        console.log("DEBUG: No customers found with fullName field, trying without orderBy");
        const unorderedQuery = query(
          collection(db, 'merchants', user.uid, 'customers'),
          limit(100)
        );
        
        const unorderedSnapshot = await getDocs(unorderedQuery);
        console.log("DEBUG: Unordered query complete, docs count:", unorderedSnapshot.docs.length);
        
        if (unorderedSnapshot.docs.length > 0) {
          // Log the first document to see its structure
          console.log("DEBUG: First customer document structure:", unorderedSnapshot.docs[0].data());
          
          const customersData = unorderedSnapshot.docs.map(doc => {
            const data = doc.data();
            // Try different possible field names for the customer name
            const customerName = data.fullName || data.name || data.displayName || data.customerName || 'Unnamed Customer';
            return {
              id: doc.id,
              name: customerName,
              email: data.email,
              pointsBalance: data.pointsBalance || 0,
              lifetimeTransactionCount: data.lifetimeTransactionCount || 0
            };
          });
          
          console.log("DEBUG: Processed customer data without ordering:", customersData);
          setCustomers(customersData);
        } else {
          console.log("DEBUG: No customers found in any location");
        }
      }
    } catch (error) {
      console.error("DEBUG: Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Could not load customers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCustomers(false);
      console.log("DEBUG: fetchMerchantCustomers complete");
    }
  };

  const rewardExamples = [
    {
      type: "discount",
      name: "First Purchase Discount",
      description: "Get 15% off your first purchase. Welcome to our loyalty program!"
    },
    {
      type: "discount",
      name: "Birthday Special",
      description: "Celebrate with 20% off any purchase during your birthday month."
    },
    {
      type: "freeItem",
      name: "Coffee Lover's Reward",
      description: "Enjoy a free regular coffee after purchasing 5 coffees."
    },
    {
      type: "freeItem",
      name: "Pastry Paradise",
      description: "Get a free pastry of your choice with any coffee purchase."
    },
    {
      type: "voucher",
      name: "$10 Welcome Voucher",
      description: "Start your journey with us using this $10 welcome voucher on any purchase."
    },
    {
      type: "voucher",
      name: "Loyalty Milestone",
      description: "Receive a $25 voucher when you reach 500 points. Thank you for your loyalty!"
    }
  ]

  // Validation functions
  const validateBasicDetails = () => {
    // Add null checks for all string values that might be undefined
    const nameValid = formData.rewardName?.trim() !== '';
    const descriptionValid = formData.description?.trim() !== '';
    
    // Handle both string and number types for pointsCost
    const pointsCostValid = typeof formData.pointsCost === 'string' 
      ? formData.pointsCost.trim() !== '' 
      : typeof formData.pointsCost === 'number';
    
    // Return validation result
    return nameValid && descriptionValid && pointsCostValid;
  }

  const validateConditions = () => {
    // Add your conditions validation logic
    return true
  }

  const validateLimitations = () => {
    // Add your limitations validation logic
    return true
  }

  const validations = {
    basic: validateBasicDetails(),
    conditions: validateConditions(),
    limitations: validateLimitations()
  }

  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
      return
    }

    if (step === 2 && !validations.basic) {
      toast({
        title: "Complete Basic Details",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      })
      return
    }

    if (step === 3 && !validations.conditions) {
      toast({
        title: "Complete Conditions",
        description: "Please set up the reward conditions before proceeding.",
        variant: "destructive"
      })
      return
    }

    setCurrentStep(step)
  }

  const steps = [
    {
      id: 1,
      name: "Basic Details",
      description: "Set the core reward information"
    },
    {
      id: 2,
      name: "Visibility",
      description: "Control who can see and claim this reward"
    },
    {
      id: 3,
      name: "Conditions",
      description: "Set conditions for reward eligibility"
    },
    {
      id: 4,
      name: "Limitations",
      description: "Set usage limits and restrictions"
    },
    {
      id: 5,
      name: "Review",
      description: "Review and create your reward"
    }
  ]

  // Add this helper function to convert local date to UTC timestamp
  const toUTCTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    )).toISOString()
  }

  // Helper function to convert local time to UTC 12-hour format
  const toUTCTime = (time12h: string): string => {
    if (!time12h) return ""
    
    // Parse the input time
    const [time, period] = time12h.split(' ')
    const [hours, minutes] = time.split(':')
    let hour = parseInt(hours)
    
    // Convert to 24-hour first
    if (period === 'PM' && hour !== 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    
    // Convert back to 12-hour format
    const newPeriod = hour >= 12 ? 'PM' : 'AM'
    const newHour = hour % 12 || 12
    
    return `${newHour}:00 ${newPeriod}`
  }

  // Add this debugging function at the top of your component
  const debugObject = (obj: any, label: string) => {
    console.log(`----- DEBUG ${label} -----`);
    console.log("Type:", typeof obj);
    console.log("Value:", obj);
    console.log("JSON string:", JSON.stringify(obj));
    console.log("Keys:", Object.keys(obj));
    console.log("------------------------");
  };

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
      console.log("FORM DATA AT START OF SAVE:", {
        rewardVisibility: formData.rewardVisibility,
        specificCustomerIds: formData.specificCustomerIds,
        customerNames: formData.specificCustomerNames
      });

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
      if (formData.conditions.daysSinceLastVisit) {
        conditions.push({
          type: "daysSinceLastVisit",
          value: Number(formData.conditions.daysSinceLastVisit)
        })
      }

      // Boolean conditions
      if (formData.conditions.newCustomer) {
        // Only add newCustomer condition if it's not from the New Customers Only visibility setting
        if (formData.rewardVisibility !== 'new') {
        conditions.push({
          type: "newCustomer",
          value: 1
        })
        }
      }

      // Membership level condition
      if (formData.conditions.membershipLevel && formData.rewardVisibility !== 'new') {
        console.log(`Adding membershipLevel condition: ${formData.conditions.membershipLevel}`);
        conditions.push({
          type: "membershipLevel",
          value: formData.conditions.membershipLevel
        })
      } else if (formData.conditions.membershipLevel && formData.rewardVisibility === 'new') {
        console.log(`Skipping membershipLevel (${formData.conditions.membershipLevel}) condition for New Customers Only reward (visibility=${formData.rewardVisibility})`);
      }

      // Skip any other membership-related conditions for New Customers
      if (formData.conditions.useMembershipRequirements && formData.rewardVisibility === 'new') {
        console.log("Ignoring useMembershipRequirements for New Customers Only reward");
        // Don't add any membership requirements for new customers
      }

      // Transform limitations into array of objects
      const limitations = []

      // Add active period to limitations if enabled
      if (formData.hasActivePeriod) {
        limitations.push({
          type: "activePeriod",
          value: {
            startDate: toUTCTimestamp(formData.activePeriod.startDate),
            endDate: toUTCTimestamp(formData.activePeriod.endDate)
          }
        })
      }

      // Add other limitations
      if (formData.limitations.totalRedemptionLimit) {
        limitations.push({
          type: "totalRedemptionLimit",
          value: Number(formData.limitations.totalRedemptionLimit)
        })
      }
      
      // Ensure Per Customer Limit is always at least 1
      const perCustomerLimit = formData.limitations.perCustomerLimit 
        ? Math.max(1, Number(formData.limitations.perCustomerLimit)) 
        : 1;
      
        limitations.push({
          type: "customerLimit",
        value: perCustomerLimit
      });

      // Time restrictions
      if (formData.limitations.useTimeRestrictions) {
        if (formData.limitations.startTime || formData.limitations.endTime) {
          limitations.push({
            type: "timeOfDay",
            value: {
              startTime: formData.limitations.startTime ? toUTCTime(formData.limitations.startTime) : "12:00 AM",
              endTime: formData.limitations.endTime ? toUTCTime(formData.limitations.endTime) : "11:59 PM"
            }
          })
        }

        // Add days of week restrictions
        if (formData.limitations.dayRestrictions.length > 0) {
          limitations.push({
            type: "daysOfWeek",
            value: formData.limitations.dayRestrictions
          })
        }
      }

      // Format delayed visibility as a single object with type and value
      const delayedVisibility = formData.delayedVisibility ? {
        type: formData.delayedVisibilityType === 'transactions' 
          ? 'totaltransactions' 
          : 'totalLifetimeSpend',
        value: formData.delayedVisibilityType === 'transactions'
          ? Number(formData.delayedVisibilityTransactions)
          : Number(formData.delayedVisibilitySpend)
      } : null

      const timestamp = new Date()
      const utcTimestamp = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes()
      ))

      // Create uniqueCustomerIds object for specific customer
      console.log("BEFORE creating uniqueCustomerIds:");
      console.log("rewardVisibility:", formData.rewardVisibility);
      console.log("specificCustomerIds:", formData.specificCustomerIds);
      console.log("customerNames:", formData.specificCustomerNames);

      // Handle multiple specific customers if available
      let uniqueCustomerIds = [];
      if (formData.specificCustomerIds && formData.specificCustomerIds.length > 0) {
        uniqueCustomerIds = [...formData.specificCustomerIds];
        console.log(`Setting uniqueCustomerIds array for ${uniqueCustomerIds.length} customers`);
      } 
      // Fall back to the single customerId prop if available
      else if (customerId) {
        uniqueCustomerIds = [customerId];
        console.log(`Setting uniqueCustomerIds array with single customer: ${customerId}`);
      }

      // Debug the created array
      debugObject(uniqueCustomerIds, "uniqueCustomerIds");

      // Add debug logging for conditions
      console.log("Before filtering conditions:", JSON.stringify(conditions));
      
      // For new customer rewards, add special handling
      if (formData.rewardVisibility === 'new') {
        console.log("===== NEW CUSTOMER REWARD SPECIALIZATION =====");
        console.log("- Setting newcx: true");
        console.log("- Filtering out membership-related conditions");
        console.log("- Disabling Progressive Unlock (delayedVisibility)");
        console.log("===============================================");
      }
      
      // Filter out membership-related conditions for new customers
      const filteredConditions = formData.rewardVisibility === 'new' 
        ? conditions.filter(condition => condition.type !== 'membershipLevel')
        : conditions;
        
      if (formData.rewardVisibility === 'new') {
        console.log("After filtering conditions for new customers:", JSON.stringify(filteredConditions));
      }

      // Ensure delayedVisibility is always false for new customers
      const finalDelayedVisibility = formData.rewardVisibility === 'new' ? false : delayedVisibility;
      if (formData.rewardVisibility === 'new' && delayedVisibility) {
        console.log("Forcing delayedVisibility to false for New Customers Only reward");
      }

      // Create the base reward data object
      const rewardData: any = {
        rewardName: formData.rewardName,
        description: formData.description,
        programtype: "points",
        isActive: formData.isActive,
        pointsCost: Math.max(0, Number(formData.pointsCost)),
        // Update visibility values
        rewardVisibility: formData.rewardVisibility === 'all' ? 'global' : 
                          formData.rewardVisibility === 'specific' ? 'specific' : 
                          formData.rewardVisibility === 'new' ? 'new' : 'conditional',
        // Add newcx flag for New Customers Only visibility
        newcx: formData.rewardVisibility === 'new',
        
        // Add reward type specific data
        rewardTypeDetails: {
          type: formData.type,
        },
        
        // Add back the missing fields
        delayedVisibility: finalDelayedVisibility,
        conditions: filteredConditions,
        limitations,
        pin: formData.pin,
        createdAt: utcTimestamp,
        status: formData.isActive ? 'active' : 'inactive',
        merchantId: user.uid,
        updatedAt: utcTimestamp,
        minSpend: 0,
        reason: '',
        customers: [],
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        lastRedeemedAt: null,
        uniqueCustomerIds,
        
        // Add the reward summary
        rewardSummary: formData.rewardSummary,
      }
      
      // Add type-specific details to the rewardTypeDetails object
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
            discountType: formData.bundleDiscountType,
            discountValue: formData.bundleDiscountType !== 'free' 
              ? Number(formData.bundleDiscountValue) || 0 
              : 0
          };
          break;
          
        case 'mysterySurprise':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            options: formData.mysteryOptions.split('\n').filter(option => option.trim() !== ''),
            revealAtCheckout: formData.revealAtCheckout
          };
          break;
          
        case 'other':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            details: formData.customRewardDetails
          };
          break;
          
        // For backward compatibility
        default:
          if (formData.voucherAmount) {
            rewardData.voucherAmount = Number(formData.voucherAmount) || 0;
          }
          break;
      }
      
      // Handle specific customer visibility case
      if (formData.rewardVisibility === 'specific' && formData.specificCustomerIds && formData.specificCustomerIds.length > 0) {
        // Only store the customer names for display purposes
        rewardData.specificCustomerNames = formData.specificCustomerNames;
        
        // Store customer IDs in an array called "customers"
        rewardData.customers = formData.specificCustomerIds;
        
        console.log(`Setting customers array with ${formData.specificCustomerIds.length} customers:`, formData.specificCustomerIds);
        
        // Remove the specificCustomerIds array from the final data
        delete rewardData.specificCustomerIds;
        
        // Keep uniqueCustomerIds for redemption tracking
        // delete rewardData.uniqueCustomerIds; <- Remove this line
      }
      // Fall back to the single customerId prop if available
      else if (customerId) {
        // Only store the customer name for display purposes
        rewardData.specificCustomerNames = customerName ? [customerName] : [];
        
        // Store the single customer ID in the customers array
        rewardData.customers = [customerId];
        
        console.log(`Setting customers array with single customer:`, [customerId]);
        
        // Set uniqueCustomerIds as an array with the single customerId
        rewardData.uniqueCustomerIds = [customerId];
      }

      // Debug the final rewardData
      debugObject(rewardData, "rewardData");

      // Before saving to Firestore
      console.log("FINAL DATA TO SAVE:", JSON.stringify(rewardData));

      // If editing, update the existing document in both collections
      if (isEditing && rewardId) {
        // Update in merchant's rewards subcollection
        const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
        await updateDoc(merchantRewardRef, {
          ...rewardData,
          updatedAt: new Date().toISOString()
        });
        
        // Also update in top-level rewards collection
        const globalRewardRef = doc(db, 'rewards', rewardId);
        await updateDoc(globalRewardRef, {
          ...rewardData,
          updatedAt: new Date().toISOString()
        });
        
        toast({
          title: "Reward Updated",
          description: "Your reward has been successfully updated.",
        });
        
        // Close the dialog
        onOpenChange(false);
      } 
      // Otherwise, create a new document in both collections
      else {
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
        
        // Close the dialog
        onOpenChange(false);
        
        // Redirect to the reward details page
        if (newRewardRef && newRewardRef.id) {
          // Navigate to the reward details page
          router.push(`/store/${newRewardRef.id}`);
        }
      }
    } catch (error) {
      console.error("Error saving reward:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} reward. Please try again.`,
        variant: "destructive"
      });
    }
  }

  // Helper function to format the visibility text
  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'all': return 'All Customers';
      case 'new': return 'New Customers Only';
      case 'returning': return 'Returning Customers Only';
      case 'vip': return 'VIP Customers Only';
      case 'specific': return `${formData.specificCustomerNames?.join(', ') || "Not specified"} Only`;
      default: return 'All Customers';
    }
  }

  // Helper function to format the date safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return format(date, 'PPP')  // e.g. "Feb 24, 2025"
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  // Helper function to convert 24h to 12h format
  const to12HourFormat = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:00 ${ampm}`
  }

  const fillTestData = () => {
    setFormData({
      ...formData,
      rewardName: "Test Reward",
      description: "This is a test reward with all fields populated",
      pointsCost: "100",
      pin: "1234",
      isActive: true,
      hasActivePeriod: true,
      activePeriod: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      },
      rewardVisibility: "existing",
      delayedVisibility: true,
      delayedVisibilityType: "transactions",
      delayedVisibilityTransactions: "5",
      delayedVisibilitySpend: "100",
      voucherAmount: "10",
      type: "discount",
      itemName: "Test Item",
      spendThreshold: "50",
      conditions: {
        useTransactionRequirements: true,
        minimumTransactions: "1",
        maximumTransactions: "10",
        useSpendingRequirements: true,
        minimumLifetimeSpend: "500",
        minimumPointsBalance: "200",
        useTimeRequirements: true,
        daysSinceJoined: "30",
        daysSinceLastVisit: "7",
        newCustomer: false,
        membershipLevel: "silver",
        useMembershipRequirements: false
      },
      limitations: {
        totalRedemptionLimit: "100",
        perCustomerLimit: "2",
        useTimeRestrictions: true,
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        dayRestrictions: ["Monday", "Wednesday", "Friday"]
      }
    })
  }

  // Helper function to format the label text
  const formatLabel = (key: string): string => {
    return key
      // Split on capital letters and spaces
      .split(/(?=[A-Z])|(?:\s+)/)
      // Remove empty strings
      .filter(Boolean)
      // Capitalize first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Update the button text based on editing mode
  const submitButtonText = isEditing ? 'Update Reward' : 'Create Reward';

  // Update the handleAiGeneration function to handle both formats
  const handleAiGeneration = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a description of the reward you want to create.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsGenerating(true)
      
      // Determine if we're in development mode
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      // Choose the appropriate endpoint
      const endpoint = isDevelopment
        ? '/api/ai-assistant-proxy' // Local proxy
        : 'https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/aiAssistant'; // Production
      
      // Call the API with a simpler prompt
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Create a reward based on this description: ${aiPrompt}. Include all relevant details like name, description, points cost, visibility, conditions, and limitations.`,
          threadId: null
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log("AI Response:", responseData);
      
      if (responseData && responseData.content) {
        try {
          console.log("Full AI response content:", responseData.content);
          
          // Try to extract JSON from the response
          const jsonMatch = responseData.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              // Try to parse the JSON
              const jsonData = JSON.parse(jsonMatch[0]);
              console.log("Parsed JSON data:", jsonData);
              
              // Add this debugging code right after parsing the JSON
              console.log("Limitations from JSON:", jsonData.limitations);

              // Map the JSON data to our form structure
              const updatedFormData = {
                ...formData,
                // Basic details
                rewardName: jsonData.rewardName || jsonData.name || formData.rewardName,
                description: jsonData.description || formData.description,
                pointsCost: (jsonData.pointsCost || jsonData.points_required || "").toString(),
                type: jsonData.type || "discount",
                isActive: jsonData.isActive !== false,
                
                // Visibility - default to "all" if not specified
                rewardVisibility: jsonData.rewardVisibility || jsonData.visibility || "all",
                
                // Delayed visibility
                delayedVisibility: !!jsonData.delayedVisibility,
                delayedVisibilityType: jsonData.delayedVisibility?.type || formData.delayedVisibilityType,
                delayedVisibilityTransactions: jsonData.delayedVisibility?.value?.toString() || 
                                             jsonData.delayedVisibility?.transactions?.toString() || 
                                             formData.delayedVisibilityTransactions,
                delayedVisibilitySpend: jsonData.delayedVisibility?.spend?.toString() || formData.delayedVisibilitySpend,
                
                // Additional fields for specific reward types
                voucherAmount: (jsonData.voucherAmount || "").toString(),
                itemName: jsonData.itemName || "",
                
                // Conditions
                conditions: {
                  ...formData.conditions,
                  useTransactionRequirements: false,
                  minimumTransactions: "",
                  maximumTransactions: "",
                  useSpendingRequirements: false,
                  minimumLifetimeSpend: "",
                  minimumPointsBalance: "",
                  useTimeRequirements: false,
                  daysSinceJoined: "",
                  daysSinceLastVisit: "",
                  newCustomer: false
                },
                
                // Limitations
                limitations: {
                  ...formData.limitations,
                  totalRedemptionLimit: "",
                  perCustomerLimit: "",
                  useTimeRestrictions: false,
                  startTime: "",
                  endTime: "",
                  dayRestrictions: []
                }
              };
              
              // Process conditions if they exist
              if (jsonData.conditions) {
                // Handle array format
                if (Array.isArray(jsonData.conditions)) {
                  updatedFormData.conditions.useTransactionRequirements = true;
                  updatedFormData.conditions.useSpendingRequirements = true;
                  updatedFormData.conditions.useTimeRequirements = true;
                  
                  jsonData.conditions.forEach((condition: { type: string; value: any }) => {
                    if (condition.type === "minimumTransactions") {
                      updatedFormData.conditions.minimumTransactions = condition.value.toString();
                    } else if (condition.type === "maximumTransactions") {
                      updatedFormData.conditions.maximumTransactions = condition.value.toString();
                    } else if (condition.type === "minimumLifetimeSpend") {
                      updatedFormData.conditions.minimumLifetimeSpend = condition.value.toString();
                    } else if (condition.type === "minimumPointsBalance") {
                      updatedFormData.conditions.minimumPointsBalance = condition.value.toString();
                    } else if (condition.type === "daysSinceJoined") {
                      updatedFormData.conditions.daysSinceJoined = condition.value.toString();
                    } else if (condition.type === "daysSinceLastVisit") {
                      updatedFormData.conditions.daysSinceLastVisit = condition.value.toString();
                    } else if (condition.type === "newCustomer") {
                      updatedFormData.conditions.newCustomer = condition.value === true;
                    }
                  });
                } 
                // Handle object format
                else {
                  updatedFormData.conditions.useTransactionRequirements = !!(jsonData.conditions.minimumTransactions || jsonData.conditions.maximumTransactions);
                  updatedFormData.conditions.minimumTransactions = (jsonData.conditions.minimumTransactions || "").toString();
                  updatedFormData.conditions.maximumTransactions = (jsonData.conditions.maximumTransactions || "").toString();
                  
                  updatedFormData.conditions.useSpendingRequirements = !!(jsonData.conditions.minimumLifetimeSpend || jsonData.conditions.minimumPointsBalance);
                  updatedFormData.conditions.minimumLifetimeSpend = (jsonData.conditions.minimumLifetimeSpend || "").toString();
                  updatedFormData.conditions.minimumPointsBalance = (jsonData.conditions.minimumPointsBalance || "").toString();
                  
                  updatedFormData.conditions.useTimeRequirements = !!(jsonData.conditions.daysSinceJoined || jsonData.conditions.daysSinceLastVisit);
                  updatedFormData.conditions.daysSinceJoined = (jsonData.conditions.daysSinceJoined || "").toString();
                  updatedFormData.conditions.daysSinceLastVisit = (jsonData.conditions.daysSinceLastVisit || "").toString();
                  
                  updatedFormData.conditions.newCustomer = jsonData.conditions.newCustomer === true;
                }
              }
              
              // Process limitations if they exist
              if (jsonData.limitations) {
                // Handle array format
                if (Array.isArray(jsonData.limitations)) {
                  // First set default values
                  updatedFormData.limitations.useTimeRestrictions = false;
                  
                  jsonData.limitations.forEach((limitation: { type: string; value: any }) => {
                    console.log("Processing limitation:", limitation);
                    
                    if (limitation.type === "customerLimit") {
                      updatedFormData.limitations.perCustomerLimit = limitation.value.toString();
                    } else if (limitation.type === "totalRedemptionLimit") {
                      updatedFormData.limitations.totalRedemptionLimit = limitation.value.toString();
                    } else if (limitation.type === "timeOfDay") {
                      // Set the flag first
                      updatedFormData.limitations.useTimeRestrictions = true;
                      
                      console.log("Found timeOfDay limitation:", limitation);
                      console.log("Value type:", typeof limitation.value);
                      console.log("Value content:", limitation.value);
                      
                      // Handle different value formats
                      if (limitation.value && typeof limitation.value === 'object') {
                        // Direct property access with fallbacks
                        const startTime = limitation.value.startTime || "";
                        const endTime = limitation.value.endTime || "";
                        
                        // Format time strings to match the expected format in the form
                        updatedFormData.limitations.startTime = formatTimeString(startTime);
                        updatedFormData.limitations.endTime = formatTimeString(endTime);
                        
                        console.log("Set time from object:", 
                          updatedFormData.limitations.startTime, 
                          updatedFormData.limitations.endTime
                        );
                      } else if (typeof limitation.value === 'string') {
                        // Parse string format
                        const timeMatch = limitation.value.match(/(\d+:\d+(?:\s*[AP]M)?)\s*-\s*(\d+:\d+(?:\s*[AP]M)?)/i);
                        if (timeMatch) {
                          updatedFormData.limitations.startTime = formatTimeString(timeMatch[1]);
                          updatedFormData.limitations.endTime = formatTimeString(timeMatch[2]);
                        }
                      }
                    } else if (limitation.type === "daysOfWeek") {
                      updatedFormData.limitations.useTimeRestrictions = true;
                      updatedFormData.limitations.dayRestrictions = Array.isArray(limitation.value) 
                        ? (limitation.value.map(day => String(day)) as Array<string>) 
                        : [];
                    }
                  });
                  
                  // Final check of time restrictions
                  console.log("Final time restrictions settings:", {
                    useTimeRestrictions: updatedFormData.limitations.useTimeRestrictions,
                    startTime: `"${updatedFormData.limitations.startTime}"`, // Add quotes to see whitespace
                    endTime: `"${updatedFormData.limitations.endTime}"`,     // Add quotes to see whitespace
                    dayRestrictions: updatedFormData.limitations.dayRestrictions
                  });
                } 
                // Handle object format
                else {
                  updatedFormData.limitations.totalRedemptionLimit = (jsonData.limitations.totalRedemptionLimit || "").toString();
                  updatedFormData.limitations.perCustomerLimit = (jsonData.limitations.perCustomerLimit || "").toString();
                  
                  // Check for time restrictions in various formats
                  const hasTimeRestrictions = !!(
                    jsonData.limitations.startTime || 
                    jsonData.limitations.endTime || 
                    jsonData.limitations.timeOfDay ||
                    (jsonData.limitations.dayRestrictions && jsonData.limitations.dayRestrictions.length > 0)
                  );
                  
                  updatedFormData.limitations.useTimeRestrictions = hasTimeRestrictions;
                  
                  // Handle timeOfDay object if present
                  if (jsonData.limitations.timeOfDay && typeof jsonData.limitations.timeOfDay === 'object') {
                    updatedFormData.limitations.startTime = jsonData.limitations.timeOfDay.startTime || "";
                    updatedFormData.limitations.endTime = jsonData.limitations.timeOfDay.endTime || "";
                  } else {
                    updatedFormData.limitations.startTime = jsonData.limitations.startTime || "";
                    updatedFormData.limitations.endTime = jsonData.limitations.endTime || "";
                  }
                  
                  updatedFormData.limitations.dayRestrictions = jsonData.limitations.dayRestrictions || [];
                  
                  console.log("Set time restrictions (object format):", 
                    updatedFormData.limitations.useTimeRestrictions,
                    updatedFormData.limitations.startTime, 
                    updatedFormData.limitations.endTime,
                    updatedFormData.limitations.dayRestrictions
                  );
                }
              }
              
              // Update the delayed visibility settings
              if (jsonData.delayedVisibility) {
                console.log("Found delayedVisibility:", jsonData.delayedVisibility);
                
                // Set the flag first
                updatedFormData.delayedVisibility = true;
                
                // Get the type and value
                const visibilityType = jsonData.delayedVisibility.type || "";
                const visibilityValue = jsonData.delayedVisibility.value || "";
                
                console.log("Visibility type:", visibilityType);
                console.log("Visibility value:", visibilityValue);
                
                // Map the type to our form format
                if (visibilityType.toLowerCase().includes("transaction")) {
                  updatedFormData.delayedVisibilityType = "transactions";
                  updatedFormData.delayedVisibilityTransactions = visibilityValue.toString();
                } else if (visibilityType.toLowerCase().includes("spend") || 
                           visibilityType.toLowerCase().includes("total")) {
                  updatedFormData.delayedVisibilityType = "spend";
                  updatedFormData.delayedVisibilitySpend = visibilityValue.toString();
                } else {
                  // Default to transactions if type is unclear
                  updatedFormData.delayedVisibilityType = "transactions";
                  updatedFormData.delayedVisibilityTransactions = visibilityValue.toString();
                }
                
                console.log("Set delayed visibility settings:", {
                  delayedVisibility: updatedFormData.delayedVisibility,
                  delayedVisibilityType: updatedFormData.delayedVisibilityType,
                  delayedVisibilityTransactions: updatedFormData.delayedVisibilityTransactions,
                  delayedVisibilitySpend: updatedFormData.delayedVisibilitySpend
                });
              }
              
              setFormData(updatedFormData);
              
              toast({
                title: "Reward Generated",
                description: "AI has created a reward based on your description. You can now review and edit it.",
              });
              
              // Move to the first step to show the generated reward
              setCurrentStep(1);
              
            } catch (jsonError) {
              console.error("Error parsing JSON:", jsonError);
              // Fall back to key-value extraction
              extractKeyValueData(responseData.content);
            }
          } else {
            // No JSON found, use key-value extraction
            extractKeyValueData(responseData.content);
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          toast({
            title: "Parsing Error",
            description: "Could not parse the AI response into a reward. Please try again with a clearer description.",
            variant: "destructive"
          });
        }
      }
      
      // Close the AI creator popover
      setIsAiCreatorOpen(false);
      
    } catch (error) {
      console.error("Error generating reward with AI:", error)
      toast({
        title: "Generation Failed",
        description: "Failed to generate reward. Please try again or create manually.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Helper function to extract data from key-value format
  const extractKeyValueData = (content: string) => {
    // Extract key-value pairs using regex
    const extractValue = (key: string, defaultValue: string = "") => {
      const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : defaultValue;
    };
    
    // Extract array values
    const extractArray = (key: string) => {
      const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
      const match = content.match(regex);
      if (!match) return [];
      return match[1].split(',').map(item => item.trim());
    };
    
    // Extract boolean values
    const extractBoolean = (key: string) => {
      const value = extractValue(key, "").toLowerCase();
      return value === 'yes' || value === 'true' || value === '1';
    };
    
    // Create a reward data object from the extracted values
    const rewardData = {
      name: extractValue('NAME', "AI Generated Reward"),
      description: extractValue('DESCRIPTION', "Generated from your description"),
      points_required: parseInt(extractValue('POINTS_REQUIRED', "100")) || 100,
      type: extractValue('TYPE', "discount"),
      visibility: extractValue('VISIBILITY', "all"),
      voucher_amount: extractValue('VOUCHER_AMOUNT', ""),
      item_name: extractValue('ITEM_NAME', ""),
      
      // Add delayed visibility fields
      delayed_visibility: extractBoolean('DELAYED_VISIBILITY'),
      delayed_visibility_type: extractValue('DELAYED_VISIBILITY_TYPE', "transactions"),
      delayed_visibility_transactions: extractValue('DELAYED_VISIBILITY_TRANSACTIONS', ""),
      delayed_visibility_spend: extractValue('DELAYED_VISIBILITY_SPEND', ""),
      
      // Add active period fields
      has_active_period: extractBoolean('ACTIVE_PERIOD'),
      active_period_start_date: extractValue('ACTIVE_PERIOD_START_DATE', ""),
      active_period_end_date: extractValue('ACTIVE_PERIOD_END_DATE', ""),
      
      conditions: {
        minimum_transactions: extractValue('MINIMUM_TRANSACTIONS', ""),
        maximum_transactions: extractValue('MAXIMUM_TRANSACTIONS', ""),
        minimum_lifetime_spend: extractValue('MINIMUM_LIFETIME_SPEND', ""),
        minimum_points_balance: extractValue('MINIMUM_POINTS_BALANCE', ""),
        days_since_joined: extractValue('DAYS_SINCE_JOINED', ""),
        days_since_last_visit: extractValue('DAYS_SINCE_LAST_VISIT', ""),
        new_customer: extractBoolean('NEW_CUSTOMER')
      },
      
      limitations: {
        total_redemption_limit: extractValue('TOTAL_REDEMPTION_LIMIT', ""),
        per_customer_limit: extractValue('PER_CUSTOMER_LIMIT', ""),
        use_time_restrictions: extractBoolean('TIME_RESTRICTIONS'),
        time_restrictions: {
          start_time: extractValue('START_TIME', ""),
          end_time: extractValue('END_TIME', ""),
          days: extractArray('DAY_RESTRICTIONS')
        }
      }
    };
    
    console.log("Extracted key-value data:", rewardData);
    
    // Map the extracted data to our form structure
    const updatedFormData = {
      ...formData,
      // Basic details
      rewardName: rewardData.name,
      description: rewardData.description,
      pointsCost: rewardData.points_required.toString(),
      type: rewardData.type,
      
      // Visibility - default to "all" if not specified
      rewardVisibility: rewardData.visibility || "all",
      
      // Delayed visibility
      delayedVisibility: rewardData.delayed_visibility,
      delayedVisibilityType: rewardData.delayed_visibility_type,
      delayedVisibilityTransactions: rewardData.delayed_visibility_transactions,
      delayedVisibilitySpend: rewardData.delayed_visibility_spend,
      
      // Active period
      hasActivePeriod: rewardData.has_active_period,
      activePeriod: {
        startDate: rewardData.active_period_start_date,
        endDate: rewardData.active_period_end_date
      },
      
      // Additional fields for specific reward types
      voucherAmount: rewardData.voucher_amount,
      itemName: rewardData.item_name,
      
      // Conditions
      conditions: {
        ...formData.conditions,
        useTransactionRequirements: !!(rewardData.conditions.minimum_transactions || rewardData.conditions.maximum_transactions),
        minimumTransactions: rewardData.conditions.minimum_transactions,
        maximumTransactions: rewardData.conditions.maximum_transactions,
        
        useSpendingRequirements: !!(rewardData.conditions.minimum_lifetime_spend || rewardData.conditions.minimum_points_balance),
        minimumLifetimeSpend: rewardData.conditions.minimum_lifetime_spend,
        minimumPointsBalance: rewardData.conditions.minimum_points_balance,
        
        useTimeRequirements: !!(rewardData.conditions.days_since_joined || rewardData.conditions.days_since_last_visit),
        daysSinceJoined: rewardData.conditions.days_since_joined,
        daysSinceLastVisit: rewardData.conditions.days_since_last_visit,
        
        newCustomer: rewardData.conditions.new_customer
      },
      
      // Limitations
      limitations: {
        ...formData.limitations,
        totalRedemptionLimit: rewardData.limitations.total_redemption_limit,
        perCustomerLimit: rewardData.limitations.per_customer_limit,
        
        useTimeRestrictions: rewardData.limitations.use_time_restrictions,
        startTime: rewardData.limitations.time_restrictions.start_time,
        endTime: rewardData.limitations.time_restrictions.end_time,
        dayRestrictions: rewardData.limitations.time_restrictions.days
      }
    };
    
    setFormData(updatedFormData);
    
    toast({
      title: "Reward Generated",
      description: "AI has created a reward based on your description. You can now review and edit it.",
    });
    
    // Move to the first step to show the generated reward
    setCurrentStep(1);
  };

  // Add a helper function to properly format time strings
  function formatTimeString(timeStr: string): string {
    if (!timeStr) return "";
    
    // If it's already in the right format with AM/PM, return it
    if (/\d+:\d+\s*[AP]M/i.test(timeStr)) {
      return timeStr;
    }
    
    // Try to convert 24-hour format to 12-hour format with AM/PM
    try {
      const [hours, minutes] = timeStr.split(':').map(part => parseInt(part, 10));
      if (isNaN(hours) || isNaN(minutes)) return timeStr;
      
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert 0 to 12 for 12 AM
      
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      console.error("Error formatting time:", e);
      return timeStr;
    }
  }

  // Add this useEffect to initialize selectedCustomers when editing a customer-specific reward
  useEffect(() => {
    // Check if we're editing a reward with specific customers
    if (defaultValues && 
        defaultValues.rewardVisibility === 'specific' && 
        defaultValues.specificCustomerIds && 
        defaultValues.specificCustomerIds.length > 0) {
      
      // First, ensure we have the customers data
      if (customers.length === 0) {
        fetchMerchantCustomers();
      }
      
      // Map the customer IDs to customer objects
      // For now, we'll just use the IDs since we don't have names yet
      const initialSelectedCustomers = defaultValues.specificCustomerIds.map(id => ({
        id,
        name: defaultValues.specificCustomerNames?.find((_name, index) => 
          index === defaultValues.specificCustomerIds.indexOf(id)
        ) || `Customer ${id}`
      }));
      
      console.log("Initializing selected customers:", initialSelectedCustomers);
      setSelectedCustomers(initialSelectedCustomers);
    }
  }, [defaultValues]);

  // Also add this useEffect to update selectedCustomers when customers data is loaded
  useEffect(() => {
    // If we have customer IDs but no names, try to find the names from loaded customers
    if (formData.rewardVisibility === 'specific' && 
        formData.specificCustomerIds && 
        formData.specificCustomerIds.length > 0 &&
        customers.length > 0) {
      
      // Update selected customers with names from loaded customer data
      const updatedSelectedCustomers = formData.specificCustomerIds.map(id => {
        const customer = customers.find(c => c.id === id);
        return {
          id,
          name: customer?.name || `Customer ${id}`
        };
      });
      
      console.log("Updating selected customers with names:", updatedSelectedCustomers);
      setSelectedCustomers(updatedSelectedCustomers);
      
      // Also update the form data with customer names
      setFormData({
        ...formData,
        specificCustomerNames: updatedSelectedCustomers.map(c => c.name)
      });
    }
  }, [customers, formData.specificCustomerIds]);

  // Add a function to generate the reward summary based on the reward type and details
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
        
      case 'mysterySurprise':
        summary = "Surprise reward - redeem to reveal your prize!";
        break;
        
      case 'other':
        // For custom rewards, use the first line of the details as a summary
        const firstLine = formData.customRewardDetails.split('\n')[0];
        summary = firstLine || "Custom reward";
        break;
        
      default:
        summary = "Reward";
        break;
    }
    
    return summary;
  }

  // Add an effect to update the summary when relevant fields change
  useEffect(() => {
    const summary = generateRewardSummary();
    setFormData(prev => ({
      ...prev,
      rewardSummary: summary
    }));
  }, [
    formData.type, 
    formData.discountValue, 
    formData.discountAppliesTo,
    formData.minimumPurchase,
    formData.itemName,
    formData.itemDescription,
    formData.requiredPurchase,
    formData.bonusItem,
    formData.bundleDiscountType,
    formData.bundleDiscountValue,
    formData.customRewardDetails
  ]);

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <style jsx global>{`
        .dialog-content input:focus,
        .dialog-content textarea:focus,
        .dialog-content select:focus,
        .dialog-content [data-state="open"] {
          outline: none !important;
          box-shadow: none !important;
          border-color: #007AFF !important;
          border-width: 1px !important;
        }
        
        /* Set default border for all inputs to be light and thin */
        .dialog-content input,
        .dialog-content textarea,
        .dialog-content select {
          border-width: 1px !important;
          border-color: #E2E8F0 !important;
          transition: border-color 0.2s ease-in-out;
        }
        
        /* Remove any heavy shadows that might be present */
        .dialog-content input:focus-visible,
        .dialog-content textarea:focus-visible,
        .dialog-content select:focus-visible {
          box-shadow: none !important;
          outline: none !important;
          ring-width: 0 !important;
        }
        
        .dialog-content .switch[data-state="checked"] {
          background-color: #007AFF !important;
        }
        
        .dialog-content .switch[data-state="checked"] .switch-thumb {
          background-color: white !important;
        }
        
        /* Add this to ensure the Switch component's class is targeted */
        .dialog-content [role="switch"][data-state="checked"] {
          background-color: #007AFF !important;
        }
      `}</style>
      <DialogContent 
        className="sm:max-w-[800px] h-[97vh] flex flex-col dialog-content"
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl">
                  <span className="text-[#007AFF]">{isEditing ? 'Edit' : 'Create'}</span> {isEditing ? 'Reward' : 'New Reward'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Update the details of your existing reward.' 
                    : customerName
                      ? `Design a personalized reward for ${customerName}.`
                      : 'Design a new reward for your loyal customers. Fill out the details below.'}
                </DialogDescription>
              </div>
              
              {customerId && customerName && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                  <User className="h-4 w-4 text-[#007AFF]" />
                  <span className="text-sm text-blue-700">
                    Creating reward for <span className="font-medium">{customerName}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  onClick={fillTestData}
                >
                  <BugPlay className="h-4 w-4 mr-2" />
                  Test Fill
                </Button>
              )}
              
              {/* TapAI Button - updated from Smart Creator */}
              <Popover open={isAiCreatorOpen} onOpenChange={setIsAiCreatorOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-[#E8F2FF] text-[#007AFF] hover:bg-[#D1E5FF]"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    TapAI
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium">TapAI Reward Creator</h4>
                      <p className="text-sm text-muted-foreground">
                        Describe the reward you want to create and our AI will generate it for you.
                      </p>
                    </div>
                    <Textarea
                      placeholder="E.g., Create a birthday discount reward that gives 20% off to customers during their birthday month"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <Button 
                      className="w-full bg-[#007AFF] hover:bg-[#0062CC]" 
                      onClick={handleAiGeneration}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="mr-2">Generating...</span>
                          <span className="animate-spin">⏳</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Reward
                        </>
                      )}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button 
                variant="outline" 
                size="sm"
                className="bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700"
                onClick={() => {
                  toast({
                    title: "Help Guide",
                    description: "Need help? Contact our support team for assistance with creating rewards.",
                  })
                }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Guide
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs 
          value={`step${currentStep}`} 
          onValueChange={(value) => setCurrentStep(Number(value.replace('step', '')))}
          className="w-full flex-1 overflow-hidden flex flex-col"
        >
          <div className="border-b pb-4">
            <div className="w-full mx-auto px-5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <h3 className="text-lg font-semibold">
                    {currentStep === 1 ? "Basic Details" : 
                     currentStep === 2 ? "Visibility Settings" : 
                     currentStep === 3 ? "Conditions" : 
                     currentStep === 4 ? "Limitations" : "Review"}
                  </h3>
                  <p className="ml-3 text-sm text-gray-500">Step {currentStep} of 5</p>
                </div>
                
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setCurrentStep(step)}
                      className={`h-2 w-14 rounded-full transition-all ${
                        step === currentStep 
                          ? "bg-blue-600" 
                          : step < currentStep 
                          ? "bg-blue-300" 
                          : "bg-gray-200"
                      }`}
                      aria-label={`Go to step ${step}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="step1" className="min-h-[400px] py-4">
              <div className="px-5">
                {/* Add a helpful instruction panel at the top */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Basic Details Instructions</h3>
                  <p className="text-xs text-blue-700">
                    Start by entering the core information for your reward. A clear name and description will help customers understand what they're redeeming.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Core Details Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Core Information</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                              <Label>Reward Name <span className="text-red-500">*</span></Label>
                              <div className="flex items-center gap-2">
                                <Label className="text-sm text-gray-600">Active</Label>
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
                            />
                            <p className="text-xs text-gray-500">Choose a name customers will easily understand</p>
                          </div>
                        
                          <div className="grid gap-2">
                            <Label>Description <span className="text-red-500">*</span></Label>
                            <Textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Explain what customers will receive when they redeem this reward"
                              className="min-h-[100px]"
                            />
                            <p className="text-xs text-gray-500">Provide clear details about the reward and any important conditions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reward Type and Points Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Reward Type & Points</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                          <div className="grid gap-2">
                            <Label>Reward Type</Label>
                            <Select
                              value={formData.type}
                              onValueChange={(value) => setFormData({ ...formData, type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select reward type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentageDiscount">Percentage Discount</SelectItem>
                                <SelectItem value="fixedDiscount">Fixed-Amount Discount</SelectItem>
                                <SelectItem value="freeItem">Free Item</SelectItem>
                                <SelectItem value="bundleOffer">Buy X Get Y (Bundle)</SelectItem>
                                <SelectItem value="mysterySurprise">Mystery Surprise</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">Choose the type of reward to offer</p>
                          </div>
                          
                          <div className="grid gap-2">
                            <Label>Points Cost <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.pointsCost}
                              onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                              placeholder="e.g., 100"
                            />
                            <p className="text-xs text-gray-500">Points customers will spend to redeem</p>
                          </div>
                        </div>
                        
                        {/* Add reward type specific input fields */}
                        {formData.type === 'percentageDiscount' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Discount Percentage <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              max="100"
                              value={formData.discountValue}
                              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                              placeholder="e.g., 15 for 15% off"
                            />
                            <p className="text-xs text-gray-500">Percentage discount the customer will receive</p>
                            
                            <div className="mt-2">
                              <Label>Applies To (Optional)</Label>
                              <Input
                                type="text"
                                value={formData.discountAppliesTo}
                                onChange={(e) => setFormData({ ...formData, discountAppliesTo: e.target.value })}
                                placeholder="e.g., Any purchase, Coffee only, etc."
                              />
                              <p className="text-xs text-gray-500">Specify what products this discount applies to</p>
                            </div>
                          </div>
                        )}

                        {formData.type === 'fixedDiscount' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Discount Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={formData.discountValue}
                              onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                              placeholder="e.g., 5 for $5 off"
                            />
                            <p className="text-xs text-gray-500">Fixed amount discount the customer will receive</p>
                            
                            <div className="mt-2">
                              <Label>Minimum Purchase Amount ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={formData.minimumPurchase}
                                onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                                placeholder="e.g., 20"
                              />
                              <p className="text-xs text-gray-500">Minimum purchase required to use this discount (0 for no minimum)</p>
                            </div>
                          </div>
                        )}

                        {formData.type === 'freeItem' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Free Item Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={formData.itemName}
                              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                              placeholder="e.g., Coffee, Muffin, etc."
                            />
                            <p className="text-xs text-gray-500">Specify what item the customer will receive for free</p>
                            
                            <div className="mt-2">
                              <Label>Item Description (Optional)</Label>
                              <Input
                                type="text"
                                value={formData.itemDescription}
                                onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                                placeholder="e.g., Any size, Specific flavor, etc."
                              />
                              <p className="text-xs text-gray-500">Additional details about the free item</p>
                            </div>
                          </div>
                        )}

                        {formData.type === 'bundleOffer' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Required Purchase (X) <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={formData.requiredPurchase}
                              onChange={(e) => setFormData({ ...formData, requiredPurchase: e.target.value })}
                              placeholder="e.g., Any sandwich, Coffee, etc."
                            />
                            <p className="text-xs text-gray-500">What the customer needs to purchase</p>
                            
                            <div className="mt-4">
                              <Label>Bonus Item (Y) <span className="text-red-500">*</span></Label>
                              <Input
                                type="text"
                                value={formData.bonusItem}
                                onChange={(e) => setFormData({ ...formData, bonusItem: e.target.value })}
                                placeholder="e.g., Second sandwich, Drink, etc."
                              />
                              <p className="text-xs text-gray-500">What item the customer receives as a bonus</p>
                            </div>
                            
                            <div className="mt-4">
                              <Label>Discount Type <span className="text-red-500">*</span></Label>
                              <RadioGroup 
                                value={formData.bundleDiscountType} 
                                onValueChange={(value) => setFormData({
                                  ...formData,
                                  bundleDiscountType: value
                                })}
                                className="grid grid-cols-3 gap-2 mt-2"
                              >
                                <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                  <RadioGroupItem value="free" id="bundle-free" />
                                  <Label htmlFor="bundle-free" className="cursor-pointer">Free</Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                  <RadioGroupItem value="percentage" id="bundle-percentage" />
                                  <Label htmlFor="bundle-percentage" className="cursor-pointer">% Off</Label>
                                </div>
                                <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                  <RadioGroupItem value="fixed" id="bundle-fixed" />
                                  <Label htmlFor="bundle-fixed" className="cursor-pointer">$ Off</Label>
                                </div>
                              </RadioGroup>
                            </div>
                            
                            {formData.bundleDiscountType !== 'free' && (
                              <div className="mt-2">
                                <Label>
                                  {formData.bundleDiscountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount ($)'}
                                  <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  max={formData.bundleDiscountType === 'percentage' ? "100" : undefined}
                                  value={formData.bundleDiscountValue}
                                  onChange={(e) => setFormData({ ...formData, bundleDiscountValue: e.target.value })}
                                  placeholder={formData.bundleDiscountType === 'percentage' ? "e.g., 50 for 50% off" : "e.g., 5 for $5 off"}
                                />
                                <p className="text-xs text-gray-500">
                                  {formData.bundleDiscountType === 'percentage' 
                                    ? 'Percentage discount applied to the bonus item' 
                                    : 'Fixed amount discount applied to the bonus item'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {formData.type === 'mysterySurprise' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Possible Rewards <span className="text-red-500">*</span></Label>
                            <Textarea
                              value={formData.mysteryOptions}
                              onChange={(e) => setFormData({ ...formData, mysteryOptions: e.target.value })}
                              placeholder="List possible rewards, one per line (e.g., Free coffee, 10% off, etc.)"
                              className="min-h-[80px]"
                            />
                            <p className="text-xs text-gray-500">List the possible rewards that could be randomly selected</p>
                            
                            <div className="mt-2 flex items-center space-x-2">
                              <Checkbox 
                                id="revealAtCheckout"
                                checked={formData.revealAtCheckout}
                                onCheckedChange={(checked) => 
                                  setFormData({ ...formData, revealAtCheckout: checked === true })
                                }
                              />
                              <Label htmlFor="revealAtCheckout" className="text-sm font-normal">
                                Reveal reward only at checkout
                              </Label>
                            </div>
                          </div>
                        )}

                        {formData.type === 'other' && (
                          <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                            <Label>Custom Reward Details <span className="text-red-500">*</span></Label>
                            <Textarea
                              value={formData.customRewardDetails}
                              onChange={(e) => setFormData({ ...formData, customRewardDetails: e.target.value })}
                              placeholder="Describe the custom reward in detail"
                              className="min-h-[80px]"
                            />
                            <p className="text-xs text-gray-500">Provide a detailed description of this custom reward</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Redemption PIN Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Redemption PIN</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="grid gap-2 max-w-md">
                        <Label>PIN Code (4 digits) <span className="text-red-500">*</span></Label>
                    <Input
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        setFormData({ ...formData, pin: value })
                      }}
                          placeholder="4-digit PIN (e.g., 1234)"
                    />
                        <p className="text-xs text-gray-500">Staff will use this PIN during redemption</p>
                  </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="min-h-[400px] py-4">
              <div className="px-5">
                {/* Add a helpful instruction panel at the top */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Visibility Settings</h3>
                  <p className="text-xs text-blue-700">
                    Control who can see this reward and when it appears for your customers.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Visibility Type Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Who Can See This Reward</h3>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Choose which customers will be able to see this reward in their account.
                      </p>
                      
                      <RadioGroup 
                        value={formData.rewardVisibility} 
                        onValueChange={(value) => {
                          if (value === 'new') {
                            // If visibility is set to "new customers only", update conditions automatically
                            setFormData({
                              ...formData,
                              rewardVisibility: value,
                              conditions: {
                                ...formData.conditions,
                                newCustomer: true,
                                maximumTransactions: "0",
                                membershipLevel: "bronze",
                                useMembershipRequirements: false
                              }
                            });
                          } else if (value === 'specific') {
                            // If visibility is set to "specific customer", make sure we have a customer specified
                            setFormData({
                              ...formData,
                              rewardVisibility: value,
                              conditions: {
                                ...formData.conditions,
                                newCustomer: false
                              }
                            });
                          } else {
                            // For "all customers" visibility
                            setFormData({
                              ...formData,
                              rewardVisibility: value,
                              conditions: {
                                ...formData.conditions,
                                newCustomer: false
                              }
                            });
                          }
                        }}
                        className="space-y-3"
                      >
                        <label htmlFor="all-customers" className="block w-full cursor-pointer">
                          <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                            <RadioGroupItem value="all" id="all-customers" className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-medium transition-colors duration-200 ${formData.rewardVisibility === 'all' ? 'text-blue-700' : ''}`}>All Customers</p>
                              <p className="text-sm text-gray-500 mt-1">
                                This reward will be visible to all your customers (subject to any conditions)
                              </p>
                            </div>
                          </div>
                        </label>
                        
                        <label htmlFor="new-customers" className="block w-full cursor-pointer">
                          <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'new' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                            <RadioGroupItem value="new" id="new-customers" className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-medium transition-colors duration-200 ${formData.rewardVisibility === 'new' ? 'text-blue-700' : ''}`}>New Customers Only</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Only customers who just joined your loyalty program will see this reward
                              </p>
                            </div>
                          </div>
                        </label>
                        
                        <label htmlFor="specific-customer" className="block w-full cursor-pointer">
                          <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'specific' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                            <RadioGroupItem value="specific" id="specific-customer" className="mt-1" />
                            <div className="flex-1">
                              <p className={`font-medium transition-colors duration-200 ${formData.rewardVisibility === 'specific' ? 'text-blue-700' : ''}`}>Specific Customer</p>
                              <p className="text-sm text-gray-500 mt-1">
                                Choose a specific customer who can see this reward
                              </p>
                            </div>
                          </div>
                        </label>
                      </RadioGroup>
                      
                      {formData.rewardVisibility === 'specific' && (
                        <div className="mt-4 border-l-2 border-blue-100 pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label>Select Customers</Label>
                            <div className="text-xs text-blue-600">
                              {selectedCustomers.length} selected
                            </div>
                          </div>
                          
                          {isLoadingCustomers ? (
                            <div className="flex items-center gap-2 py-2">
                              <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                              <p className="text-sm text-gray-600">Loading customers...</p>
                            </div>
                          ) : customers.length > 0 ? (
                            <div className="space-y-4">
                              <div className="text-xs text-gray-500 mb-2">
                                DEBUG: {customers.length} customers loaded
                              </div>
                              
                              {/* Customer search input */}
                              <div className="relative">
                                <Input
                                  type="text"
                                  placeholder="Search customers..."
                                  className="pl-8"
                                  onChange={(e) => {
                                    // Add customer search functionality here
                                    console.log("Searching for:", e.target.value);
                                  }}
                                />
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                              </div>
                              
                              {/* Customer list with checkboxes */}
                              <div className="border rounded-md max-h-[300px] overflow-y-auto">
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
                                          // Add customer to selection
                                          const newSelectedCustomers = [...selectedCustomers, { 
                                            id: customer.id, 
                                            name: customer.name 
                                          }];
                                          setSelectedCustomers(newSelectedCustomers);
                                          
                                          // Update form data with all selected customers
                                          setFormData({
                                            ...formData,
                                            specificCustomerIds: newSelectedCustomers.map(c => c.id),
                                            specificCustomerNames: newSelectedCustomers.map(c => c.name)
                                          });
                                          
                                          console.log("Added customer to selection:", customer);
                                        } else {
                                          // Remove customer from selection
                                          const newSelectedCustomers = selectedCustomers.filter(
                                            c => c.id !== customer.id
                                          );
                                          setSelectedCustomers(newSelectedCustomers);
                                          
                                          // Update form data with remaining selected customers
                                          setFormData({
                                            ...formData,
                                            specificCustomerIds: newSelectedCustomers.map(c => c.id),
                                            specificCustomerNames: newSelectedCustomers.map(c => c.name)
                                          });
                                          
                                          console.log("Removed customer from selection:", customer);
                                        }
                                      }}
                                      className="mt-1 mr-3"
                                    />
                                    <div className="flex-1">
                                      <label 
                                        htmlFor={`customer-${customer.id}`}
                                        className="flex flex-col cursor-pointer"
                                      >
                                        <span className="font-medium">{customer.name}</span>
                                        {customer.email && (
                                          <span className="text-xs text-gray-500">{customer.email}</span>
                                        )}
                                        <div className="flex gap-4 mt-1">
                                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                                            {customer.pointsBalance} points
                                          </span>
                                          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded">
                                            {customer.lifetimeTransactionCount} transactions
                                          </span>
                                        </div>
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
                                            // Remove this customer from selection
                                            const newSelectedCustomers = selectedCustomers.filter(
                                              c => c.id !== customer.id
                                            );
                                            setSelectedCustomers(newSelectedCustomers);
                                            
                                            // Update form data
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
                              
                              <p className="text-xs text-gray-500">
                                Only selected customers will see this reward in their account
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="text-sm text-amber-600">
                                No customers found. Make sure you have customers in your loyalty program.
                              </p>
                              <div className="text-xs text-gray-500 mb-2">
                                DEBUG: User ID: {user?.uid || "No user ID"}
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  console.log("DEBUG: Manual retry for loading customers");
                                  fetchMerchantCustomers();
                                }}
                                className="text-blue-600 border-blue-200"
                              >
                                Retry Loading Customers
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progressive Unlock Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Progressive Unlock</h3>
                      </div>
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
                    
                    {formData.delayedVisibility && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Hide this reward until the customer reaches a certain milestone.
                        </p>
                        
                        <div className="space-y-4">
                          <div className="grid gap-2">
                            <Label>Unlock Type</Label>
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
                                <Label htmlFor="transactions" className="cursor-pointer">Transactions</Label>
                              </div>
                              <div className="flex items-center space-x-2 border rounded p-2 hover:bg-gray-50">
                                <RadioGroupItem value="spend" id="spend" />
                                <Label htmlFor="spend" className="cursor-pointer">Total Spend</Label>
                              </div>
                            </RadioGroup>
                          </div>
                          
                          {formData.delayedVisibilityType === 'transactions' ? (
                            <div className="grid gap-2">
                              <Label>Minimum Transactions</Label>
                              <Input
                                type="number"
                                min="1"
                                value={formData.delayedVisibilityTransactions}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  delayedVisibilityTransactions: e.target.value
                                })}
                                placeholder="e.g., 5"
                              />
                              <p className="text-xs text-gray-500">
                                Customer must make this many purchases before they can see the reward
                              </p>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <Label>Minimum Spend ($)</Label>
                              <Input
                                type="number"
                                min="1"
                                value={formData.delayedVisibilitySpend}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  delayedVisibilitySpend: e.target.value
                                })}
                                placeholder="e.g., 100"
                              />
                              <p className="text-xs text-gray-500">
                                Customer must spend this much before they can see the reward
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Active Period Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Active Period</h3>
                      </div>
                    <Switch
                      checked={formData.hasActivePeriod}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          hasActivePeriod: checked,
                          activePeriod: checked ? {
                            startDate: formData.activePeriod.startDate || new Date().toISOString().split('T')[0],
                            endDate: formData.activePeriod.endDate || ''
                          } : {
                            startDate: '',
                            endDate: ''
                          }
                        })}
                        className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                    
                  {formData.hasActivePeriod && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Set a date range when this reward is active and can be redeemed.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!formData.activePeriod.startDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.activePeriod.startDate ? formatDate(formData.activePeriod.startDate) : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                              mode="single"
                              selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                              onSelect={(date) => {
                                    const dateString = date ? date.toISOString().split('T')[0] : '';
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                        startDate: dateString
                                    }
                                    });
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                            <p className="text-xs text-gray-500">
                              When this reward becomes available to redeem
                            </p>
                      </div>
                          
                          <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                                  className={`w-full justify-start text-left font-normal ${!formData.activePeriod.endDate && "text-muted-foreground"}`}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                                  {formData.activePeriod.endDate ? formatDate(formData.activePeriod.endDate) : "Select date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                              mode="single"
                              selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                              onSelect={(date) => {
                                    const dateString = date ? date.toISOString().split('T')[0] : '';
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                        endDate: dateString
                                    }
                                    });
                              }}
                                  disabled={(date) =>
                                    formData.activePeriod.startDate
                                      ? date < new Date(formData.activePeriod.startDate)
                                      : false
                                  }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                            <p className="text-xs text-gray-500">
                              When this reward expires and can no longer be redeemed
                            </p>
                          </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="min-h-[400px] py-4">
              <div className="px-5">
                {/* Helpful instruction panel at the top */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Reward Conditions</h3>
                  <p className="text-xs text-blue-700">
                    Set specific requirements that determine which customers can access this reward.
                  </p>
                </div>
                  
                {/* New Customer Card - Always visible at the top */}
                <div className="bg-white border rounded-lg shadow-sm mb-6 overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-blue-600" />
                      <h3 className="font-medium">New Customer Only</h3>
                    </div>
                    <Switch
                      checked={formData.conditions.newCustomer}
                      onCheckedChange={(checked) => {
                        // If turning on new customer condition
                        if (checked) {
                          setFormData({
                            ...formData,
                            rewardVisibility: 'new',
                            delayedVisibility: false,
                            conditions: {
                              ...formData.conditions,
                              newCustomer: true,
                              maximumTransactions: "0",
                              membershipLevel: "bronze",
                              useMembershipRequirements: false,
                              useTransactionRequirements: false,
                              useSpendingRequirements: false,
                              useTimeRequirements: false,
                              minimumTransactions: "",
                              daysSinceJoined: "",
                              daysSinceLastVisit: "",
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
                              newCustomer: false
                            }
                          });
                        }
                      }}
                      disabled={formData.rewardVisibility === 'new'}
                      className="data-[state=checked]:bg-blue-600"
                    />
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-2">
                      Enable this to restrict the reward to customers who recently joined your loyalty program.
                    </p>
                    
                    {formData.rewardVisibility === 'new' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-3">
                        <div className="flex gap-2">
                          <Info className="h-5 w-5 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-700">
                            When enabled, other conditions will be disabled as this specifically targets new customers only.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className={`space-y-6 ${formData.rewardVisibility === 'new' ? 'opacity-50 pointer-events-none' : ''}`}>
                  {/* Transaction Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Transaction Requirements</h3>
                      </div>
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
                  
                    {formData.conditions.useTransactionRequirements && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Set purchase count conditions that determine eligibility based on the number of transactions.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Minimum Transactions</Label>
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
                            />
                            <p className="text-xs text-gray-500 min-h-[2.5rem]">
                              Customer must have made at least this many purchases
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Maximum Transactions</Label>
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
                            />
                            <p className="text-xs text-gray-500 min-h-[2.5rem]">
                              Maximum purchases limit (leave empty for no limit)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Spending Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Spending Requirements</h3>
                      </div>
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
                  
                    {formData.conditions.useSpendingRequirements && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Set monetary or points requirements that determine eligibility based on spending or point balance.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Minimum Lifetime Spend ($)</Label>
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
                            />
                            <p className="text-xs text-gray-500">
                              Customer must have spent at least this amount across all purchases
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Minimum Points Balance</Label>
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
                            />
                            <p className="text-xs text-gray-500">
                              Customer must have at least this many points in their account
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Time Requirements Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Time-Based Requirements</h3>
                      </div>
                      <Switch
                        checked={formData.conditions.useTimeRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTimeRequirements: checked,
                            daysSinceJoined: checked ? formData.conditions.daysSinceJoined : "",
                            daysSinceLastVisit: checked ? formData.conditions.daysSinceLastVisit : ""
                          }
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  
                    {formData.conditions.useTimeRequirements && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Set time-based conditions that determine eligibility based on membership duration or last visit.
                        </p>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label>Minimum Days as Member</Label>
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
                            />
                            <p className="text-xs text-gray-500">
                              Customer must have been a member for at least this many days
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Days Since Last Visit</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.conditions.daysSinceLastVisit}
                              onChange={(e) => setFormData({
                                ...formData,
                                conditions: {
                                  ...formData.conditions,
                                  daysSinceLastVisit: e.target.value
                                }
                              })}
                              placeholder="e.g., 14"
                            />
                            <p className="text-xs text-gray-500">
                              It must have been at least this many days since the customer's last purchase
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Membership Level Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Membership Level Requirement</h3>
                      </div>
                      <Switch
                        checked={formData.rewardVisibility === 'new' ? false : formData.conditions.useMembershipRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useMembershipRequirements: checked,
                            membershipLevel: checked ? formData.conditions.membershipLevel : ""
                          }
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                    
                    {formData.rewardVisibility === 'new' ? (
                      <div className="p-4">
                        <div className="flex items-center gap-2 border border-blue-100 bg-blue-50 p-3 rounded-md">
                          <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-xs font-medium text-amber-700">B</div>
                          <div>
                            <p className="text-sm font-medium text-blue-800">Bronze (Default)</p>
                            <p className="text-xs text-blue-700">
                              Membership levels are not applicable for New Customers as they automatically start at Bronze
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : formData.conditions.useMembershipRequirements && (
                      <div className="p-4 space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="membershipLevel">Minimum Membership Level</Label>
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
                            <SelectTrigger id="membershipLevel">
                              <SelectValue placeholder="Select a membership level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Bronze">Bronze</SelectItem>
                              <SelectItem value="Silver">Silver</SelectItem>
                              <SelectItem value="Gold">Gold</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Only customers at or above this membership level will see this reward
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step4" className="min-h-[400px] py-4">
              <div className="px-5">
                {/* Add a helpful instruction panel at the top */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Reward Limitations</h3>
                  <p className="text-xs text-blue-700">
                    Set restrictions on how and when this reward can be redeemed to control usage.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Redemption Limits Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Redemption Limits</h3>
                    </div>
                  </div>
                  
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-4">
                        Control how many times this reward can be redeemed globally and per customer.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                    <Label>Total Redemption Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limitations.totalRedemptionLimit}
                      onChange={(e) => setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                          totalRedemptionLimit: e.target.value
                        }
                      })}
                            placeholder="e.g., 100"
                    />
                          <p className="text-xs text-gray-500">
                            Maximum number of times this reward can be redeemed by all customers combined
                          </p>
                  </div>
                  
                        <div className="space-y-2">
                    <Label>Per Customer Limit</Label>
                    <Input
                      type="number"
                            min="1"
                      value={formData.limitations.perCustomerLimit}
                            onChange={(e) => {
                              const value = e.target.value;
                              const validValue = value === '' ? '1' : Math.max(1, parseInt(value) || 1).toString();
                              setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                                  perCustomerLimit: validValue
                                }
                              })
                            }}
                            placeholder="e.g., 1"
                          />
                          <p className="text-xs text-gray-500">
                            Maximum number of times each customer can redeem this reward (minimum 1)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Time Restrictions Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Time Restrictions</h3>
                      </div>
                      <Switch
                        checked={formData.limitations.useTimeRestrictions}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          limitations: {
                            ...formData.limitations,
                            useTimeRestrictions: checked,
                            startTime: checked ? formData.limitations.startTime : "",
                            endTime: checked ? formData.limitations.endTime : "",
                            dayRestrictions: checked ? formData.limitations.dayRestrictions : []
                          }
                        })}
                        className="data-[state=checked]:bg-blue-600"
                      />
                  </div>
                  
                  {formData.limitations.useTimeRestrictions && (
                      <div className="p-4">
                        <p className="text-sm text-gray-600 mb-4">
                          Restrict when this reward can be redeemed based on time of day and days of the week.
                        </p>
                        
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={formData.limitations.startTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                                  limitations: { ...formData.limitations, startTime: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                              const hour = i % 12 || 12
                                    const period = i >= 12 ? 'PM' : 'AM'
                              return (
                                      <SelectItem key={`${hour}:00 ${period}`} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                              <p className="text-xs text-gray-500">
                                Reward can only be redeemed after this time
                              </p>
                      </div>
                      
                            <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={formData.limitations.endTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                                  limitations: { ...formData.limitations, endTime: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                                  {Array.from({ length: 24 }, (_, i) => {
                              const hour = i % 12 || 12
                                    const period = i >= 12 ? 'PM' : 'AM'
                              return (
                                      <SelectItem key={`${hour}:00 ${period}`} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                              <p className="text-xs text-gray-500">
                                Reward can only be redeemed before this time
                              </p>
                            </div>
                      </div>
                      
                          <div className="space-y-3">
                            <Label>Available Days</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={formData.limitations.dayRestrictions.includes(day) ? "default" : "outline"}
                                  className={`h-9 ${formData.limitations.dayRestrictions.includes(day) ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                              onClick={() => {
                                const newDays = formData.limitations.dayRestrictions.includes(day)
                                  ? formData.limitations.dayRestrictions.filter(d => d !== day)
                                  : [...formData.limitations.dayRestrictions, day]
                                setFormData({
                                  ...formData,
                                  limitations: {
                                    ...formData.limitations,
                                    dayRestrictions: newDays
                                  }
                                })
                              }}
                            >
                              {day.substring(0, 3)}
                            </Button>
                          ))}
                        </div>
                            <p className="text-xs text-gray-500">
                              Select the days of the week when this reward can be redeemed
                            </p>
                      </div>
                        </div>
                      </div>
                  )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step5" className="min-h-[400px] py-4">
              <div className="px-5">
                {/* Add a helpful instruction panel at the top */}
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Review Your Reward</h3>
                  <p className="text-xs text-blue-700">
                    Review your reward settings before creating it. Use the edit buttons to make any changes.
                  </p>
                </div>
                
                <div className="space-y-6">
                  {/* Basic Details Review Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Basic Details</h3>
                      </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setCurrentStep(1)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                    
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                          <p className="text-sm text-gray-500">Reward Name</p>
                          <p className="font-medium">{formData.rewardName || "Not set"}</p>
                      </div>
                      <div className="space-y-1">
                          <p className="text-sm text-gray-500">Status</p>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${formData.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                            {formData.isActive ? "Active" : "Inactive"}
                      </div>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <p className="text-sm text-gray-500">Description</p>
                          <p className="text-sm">{formData.description || "Not set"}</p>
                      </div>
                      <div className="space-y-1">
                          <p className="text-sm text-gray-500">Reward Type</p>
                          <p className="font-medium">
                            {formData.type === 'percentageDiscount' ? 'Percentage Discount' : 
                             formData.type === 'fixedDiscount' ? 'Fixed-Amount Discount' : 
                             formData.type === 'freeItem' ? 'Free Item' : 
                             formData.type === 'bundleOffer' ? 'Buy X Get Y (Bundle)' : 
                             formData.type === 'mysterySurprise' ? 'Mystery Surprise' : 
                             formData.type === 'other' ? 'Other' : 'Not set'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">Points Cost</p>
                          <p className="font-medium">{formData.pointsCost || "Not set"}</p>
                      </div>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-500">PIN Code</p>
                          <p className="font-medium">{formData.pin || "Not set"}</p>
                    </div>
                        {formData.type === 'percentageDiscount' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Discount</p>
                            <p className="font-medium">{formData.discountValue}%</p>
                            <p className="text-xs text-gray-500">{formData.discountAppliesTo ? `Applies to: ${formData.discountAppliesTo}` : "No specific conditions"}</p>
                    </div>
                        )}
                        {formData.type === 'fixedDiscount' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Discount</p>
                            <p className="font-medium">${formData.discountValue}</p>
                            <p className="text-xs text-gray-500">{formData.minimumPurchase ? `Minimum purchase: $${formData.minimumPurchase}` : "No minimum purchase required"}</p>
                          </div>
                        )}
                        {formData.type === 'freeItem' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Free Item</p>
                            <p className="font-medium">{formData.itemName}</p>
                            <p className="text-xs text-gray-500">{formData.itemDescription ? `Description: ${formData.itemDescription}` : "No additional details"}</p>
                          </div>
                        )}
                        {formData.type === 'bundleOffer' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Bundle Offer</p>
                            <p className="font-medium">Buy: {formData.requiredPurchase}</p>
                            <p className="text-sm">
                              Get: {formData.bonusItem} 
                              {formData.bundleDiscountType === 'free' 
                                ? ' (Free)' 
                                : formData.bundleDiscountType === 'percentage' 
                                  ? ` (${formData.bundleDiscountValue}% off)` 
                                  : ` ($${formData.bundleDiscountValue} off)`}
                            </p>
                          </div>
                        )}
                        {formData.type === 'mysterySurprise' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Possible Rewards</p>
                            <p className="font-medium">{formData.mysteryOptions}</p>
                            <p className="text-xs text-gray-500">{formData.revealAtCheckout ? "Reward revealed at checkout" : "Reward revealed after purchase"}</p>
                          </div>
                        )}
                        {formData.type === 'other' && (
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Custom Reward Details</p>
                            <p className="font-medium">{formData.customRewardDetails}</p>
                          </div>
                        )}
                      </div>
                  </div>
                </div>

                  {/* Visibility Review Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Visibility Settings</h3>
                      </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setCurrentStep(2)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                            <p className="text-sm text-gray-500">Visible To</p>
                            <p className="font-medium">
                              {getVisibilityText(formData.rewardVisibility)}
                            </p>
                      </div>
                          
                          {formData.rewardVisibility === 'specific' && (
                        <div className="space-y-1">
                              <p className="text-sm text-gray-500">Specific Customer</p>
                              <p className="font-medium">{formData.specificCustomerNames?.join(', ') || "Not specified"}</p>
                        </div>
                      )}
                          
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Progressive Unlock</p>
                            <p className="font-medium">
                              {formData.delayedVisibility ? (
                                <>
                                  After {formData.delayedVisibilityType === 'transactions' 
                                    ? `${formData.delayedVisibilityTransactions} transactions` 
                                    : `$${formData.delayedVisibilitySpend} spent`}
                                </>
                              ) : (
                                "Immediately visible"
                              )}
                        </p>
                      </div>
                          
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Active Period</p>
                            <p className="font-medium">
                              {formData.hasActivePeriod ? (
                                <>
                                  {formData.activePeriod.startDate ? formatDate(formData.activePeriod.startDate) : "Start date not set"}
                                  {" to "}
                                  {formData.activePeriod.endDate ? formatDate(formData.activePeriod.endDate) : "No end date"}
                                </>
                              ) : (
                                "Always active"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                  </div>
                </div>

                  {/* Conditions Review Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                        <ListChecks className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Conditions</h3>
                      </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setCurrentStep(3)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                    
                    <div className="p-4">
                      {formData.rewardVisibility === 'new' ? (
                        <div className="flex items-center gap-2 bg-blue-50 p-3 rounded-md">
                          <UserPlus className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium">New Customers Only</p>
                            <p className="text-xs text-gray-600 mt-1">
                              This reward is only visible to customers who just joined your program.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {!formData.conditions.useTransactionRequirements &&
                            !formData.conditions.useSpendingRequirements &&
                            !formData.conditions.useTimeRequirements &&
                            !formData.conditions.useMembershipRequirements ? (
                            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
                              <Info className="h-5 w-5 text-gray-500" />
                              <p className="text-sm text-gray-600">No conditions set. Available to all customers who can see it.</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {formData.conditions.newCustomer && (
                                <div className="p-3 border-l-2 border-blue-500 bg-blue-50 rounded-r-md">
                                  <p className="font-medium">New Customer Only</p>
                                </div>
                              )}
                              
                              {formData.conditions.useTransactionRequirements && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Minimum Transactions</p>
                                    <p className="font-medium">
                                      {formData.conditions.minimumTransactions ? `${formData.conditions.minimumTransactions} purchases` : "Not set"}
                          </p>
                        </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Maximum Transactions</p>
                                    <p className="font-medium">
                                      {formData.conditions.maximumTransactions ? `${formData.conditions.maximumTransactions} purchases` : "No limit"}
                                    </p>
                  </div>
                </div>
                              )}
                              
                              {formData.conditions.useSpendingRequirements && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Minimum Lifetime Spend</p>
                                    <p className="font-medium">
                                      {formData.conditions.minimumLifetimeSpend ? `$${formData.conditions.minimumLifetimeSpend}` : "Not set"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Minimum Points Balance</p>
                                    <p className="font-medium">
                                      {formData.conditions.minimumPointsBalance ? `${formData.conditions.minimumPointsBalance} points` : "Not set"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {formData.conditions.useTimeRequirements && (
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Days Since Joined</p>
                                    <p className="font-medium">
                                      {formData.conditions.daysSinceJoined ? `${formData.conditions.daysSinceJoined} days` : "Not set"}
                                    </p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm text-gray-500">Days Since Last Visit</p>
                                    <p className="font-medium">
                                      {formData.conditions.daysSinceLastVisit ? `${formData.conditions.daysSinceLastVisit} days` : "Not set"}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {formData.conditions.useMembershipRequirements && (
                                <div className="space-y-1">
                                  <p className="text-sm text-gray-500">Required Membership Level</p>
                                  <p className="font-medium capitalize">
                                    {formData.conditions.membershipLevel || "Not set"}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Limitations Review Card */}
                  <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                    <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">Limitations</h3>
                      </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50"
                        onClick={() => setCurrentStep(4)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                    
                    <div className="p-4">
                      <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Total Redemption Limit</p>
                            <p className="font-medium">
                              {formData.limitations.totalRedemptionLimit ? `${formData.limitations.totalRedemptionLimit} redemptions` : "No limit"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-500">Per Customer Limit</p>
                            <p className="font-medium">
                              {formData.limitations.perCustomerLimit ? `${formData.limitations.perCustomerLimit} per customer` : "1 per customer"}
                              </p>
                            </div>
                      </div>
                        
                        {formData.limitations.useTimeRestrictions && (
                          <div>
                            <p className="text-sm text-gray-500 mb-2">Time Restrictions</p>
                            
                            <div className="bg-gray-50 p-3 rounded-md space-y-2">
                              {(formData.limitations.startTime || formData.limitations.endTime) && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-gray-500" />
                                  <p className="text-sm">
                                    {formData.limitations.startTime && formData.limitations.endTime ? (
                                      `Redeemable between ${formData.limitations.startTime} and ${formData.limitations.endTime}`
                                    ) : formData.limitations.startTime ? (
                                      `Redeemable after ${formData.limitations.startTime}`
                                    ) : (
                                      `Redeemable before ${formData.limitations.endTime}`
                                    )}
                                  </p>
                                </div>
                              )}
                              
                              {formData.limitations.dayRestrictions.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-gray-500" />
                                  <p className="text-sm">
                                    Available on: {formData.limitations.dayRestrictions.join(', ')}
                                  </p>
                  </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Final Check and Action Section */}
                <div className="mt-6 bg-green-50 border border-green-100 rounded-md p-4">
                  <h4 className="font-medium text-green-800 mb-3 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Ready to Create
                  </h4>
                  <p className="text-sm text-green-700 mb-2">
                    Your reward is configured and ready to create. Customers who meet the visibility and condition requirements will see this in their account.
                  </p>
                  {isEditing ? (
                    <p className="text-sm text-green-700">
                      Click "Update Reward" to save your changes to the existing reward.
                    </p>
                  ) : (
                    <p className="text-sm text-green-700">
                      Click "Create Reward" to make this reward available to customers.
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="absolute left-4">
              <span className="text-xl font-bold">
                <span className="text-[#007AFF] font-extrabold">Tap</span>
                {' '}
                <span>Loyalty</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => handleStepChange(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              <Button 
                onClick={async () => {
                  if (currentStep < 5) {
                    if (currentStep === 1 && !validateBasicDetails()) {
                      toast({
                        title: "Incomplete Form",
                        description: "Please fill out all required fields. Name, description, and a 4-digit PIN are required.",
                        variant: "destructive"
                      })
                      return
                    }
                    handleStepChange(currentStep + 1)
                  } else {
                    if (validations.basic && validations.conditions && validations.limitations) {
                      await saveReward()
                    } else {
                      toast({
                        title: "Incomplete Form",
                        description: "Please complete all required fields before creating the reward.",
                        variant: "destructive"
                      })
                    }
                  }
                }}
                disabled={currentStep === 5 && !(validations.basic && validations.conditions && validations.limitations)}
                className="bg-[#007AFF] hover:bg-[#0062CC] text-white"
              >
                {currentStep === 5 ? submitButtonText : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
      {/* Basic Reward Wizard */}
      <BasicRewardWizard
        open={isBasicWizardOpen}
        onOpenChange={setIsBasicWizardOpen}
        defaultValues={formData}
        onSave={(updatedData) => {
          setFormData(updatedData)
          setIsBasicWizardOpen(false)
          if (currentStep === 5) {
            saveReward()
          }
        }}
        isEditing={isEditing}
        rewardId={rewardId}
        customerId={customerId}
        customerName={customerName}
      />
    </Dialog>
  )
} 

// Add this helper function at the top of the file, outside the component
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}