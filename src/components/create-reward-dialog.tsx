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
import { CalendarIcon, Clock, HelpCircle, Users, UserCheck, UserCog, ShoppingCart, DollarSign, UserPlus, X, BugPlay, FileText, Eye, ListChecks, AlertTriangle, ChevronRight, Edit as EditIcon, CheckCircle, ClipboardCheck, User, Sparkles } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CreateRewardProgress } from "./create-reward-progress"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc } from "firebase/firestore"
import { getFunctions, httpsCallable } from "firebase/functions"
import { useRouter } from "next/navigation"

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
  specificCustomerId?: string  // Add this property to fix the type error
  specificCustomerName?: string // Add this property for consistency
  pin: string
  pointsCost: string
  isActive: boolean
  delayedVisibility: boolean
  delayedVisibilityType: string
  delayedVisibilityTransactions: string
  delayedVisibilitySpend: string
  itemName: string
  voucherAmount: string
  spendThreshold: string

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
    dayRestrictions: string[]
  }

  // New fields for Active Period
  hasActivePeriod: boolean
  activePeriod: {
    startDate: string
    endDate: string
  }
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
    specificCustomerId: customerId,
    specificCustomerName: customerName,
    pin: "",
    pointsCost: "",
    isActive: true,
    delayedVisibility: false,
    delayedVisibilityType: "transactions",
    delayedVisibilityTransactions: "",
    delayedVisibilitySpend: "",
    itemName: "",
    voucherAmount: "",
    spendThreshold: "",

    // Conditions
    conditions: {
      useTransactionRequirements: false,
      useSpendingRequirements: false,
      useTimeRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      minimumLifetimeSpend: "",
      minimumPointsBalance: "",
      membershipLevel: "",
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
    }
  })

  // Add new state for AI creator
  const [aiPrompt, setAiPrompt] = useState("")
  const [isAiCreatorOpen, setIsAiCreatorOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const { user } = useAuth()

  useEffect(() => {
    if (defaultValues) {
      setFormData(defaultValues)
    } else if (customerId) {
      setFormData({
        ...formData,
        rewardVisibility: 'specific',
        specificCustomerId: customerId,
        specificCustomerName: customerName
      })
    }
  }, [defaultValues, customerId, customerName])

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
    const pointsCostValid = formData.pointsCost?.trim() !== '';
    
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
        specificCustomerId: formData.specificCustomerId,
        customerName: customerName
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
        conditions.push({
          type: "newCustomer",
          value: 1
        })
      }

      // Membership level condition
      if (formData.conditions.membershipLevel) {
        conditions.push({
          type: "membershipLevel",
          value: formData.conditions.membershipLevel
        })
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
      if (formData.limitations.perCustomerLimit) {
        limitations.push({
          type: "customerLimit",
          value: Number(formData.limitations.perCustomerLimit)
        })
      }

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
      console.log("specificCustomerId:", formData.specificCustomerId);
      console.log("customerName:", customerName);

      // Force the customer ID to be used regardless of visibility setting
      let uniqueCustomerIds = {};
      if (customerId) {
        // Use the prop directly instead of formData
        uniqueCustomerIds = { [customerId]: true };
        console.log(`Setting uniqueCustomerIds.${customerId} = true`);
      }

      // Debug the created object
      debugObject(uniqueCustomerIds, "uniqueCustomerIds");

      // Also update the customerVisibility field
      const customerVisibility = customerId ? 'specific' : 'all';

      // Create the base reward data object
      const rewardData: any = {
        rewardName: formData.rewardName,
        description: formData.description,
        programtype: "points",
        isActive: formData.isActive,
        pointsCost: Math.max(0, Number(formData.pointsCost)),
        rewardVisibility: formData.rewardVisibility,
        voucherAmount: Number(formData.voucherAmount) || 0,
        delayedVisibility,
        conditions,
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
        customerVisibility
      }

      // Only add specificCustomerId if it exists and is not undefined
      if (customerId) {
        rewardData.specificCustomerId = customerId;
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
      case 'specific': return `${customerName} Only`;
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
        membershipLevel: "silver"
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
                      updatedFormData.limitations.dayRestrictions = Array.isArray(limitation.value) ? limitation.value : [];
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
      `}</style>
      <DialogContent 
        className="sm:max-w-[800px] h-[700px] flex flex-col dialog-content"
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="step1" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Details
            </TabsTrigger>
            <TabsTrigger value="step2" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visibility
            </TabsTrigger>
            <TabsTrigger value="step3" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="step4" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Limitations
            </TabsTrigger>
            <TabsTrigger value="step5" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Review
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="step1" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Reward Name</Label>
                    <Input
                      value={formData.rewardName}
                      onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                      placeholder="Enter reward name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your reward"
                      className="min-h-[100px]"
                    />
                  </div>
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
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="freeItem">Free Item</SelectItem>
                        <SelectItem value="voucher">Gift Voucher</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Points Cost</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.pointsCost}
                      onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                      placeholder="Enter points cost"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>PIN Code (4 digits)</Label>
                    <Input
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        setFormData({ ...formData, pin: value })
                      }}
                      placeholder="Enter 4-digit PIN"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active Status</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Set Active Period</Label>
                    <Switch
                      checked={formData.hasActivePeriod}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasActivePeriod: checked })}
                    />
                  </div>
                  {formData.hasActivePeriod && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !formData.activePeriod.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod.startDate ? (
                                formatDate(formData.activePeriod.startDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                      startDate: date.toISOString()
                                    }
                                  })
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid gap-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !formData.activePeriod.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod.endDate ? (
                                formatDate(formData.activePeriod.endDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                      endDate: date.toISOString()
                                    }
                                  })
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Visibility Settings Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Visibility Settings</Label>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Reward Visibility</Label>
                    <Select
                      value={formData.rewardVisibility}
                      onValueChange={(value) => setFormData({ ...formData, rewardVisibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new">New Customers Only</SelectItem>
                        <SelectItem value="returning">Returning Customers Only</SelectItem>
                        <SelectItem value="vip">VIP Customers Only</SelectItem>
                        {customerId && (
                          <SelectItem value="specific">Specific Customer Only</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Delayed Visibility Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Delayed Visibility</Label>
                      <Switch
                        checked={formData.delayedVisibility}
                        onCheckedChange={(checked) => setFormData({ ...formData, delayedVisibility: checked })}
                      />
                    </div>
                  </div>
                  
                  {formData.delayedVisibility && (
                    <>
                      <div className="grid gap-2">
                        <Label>Visibility Requirement</Label>
                        <Select
                          value={formData.delayedVisibilityType}
                          onValueChange={(value) => setFormData({ ...formData, delayedVisibilityType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select requirement type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transactions">Number of Transactions</SelectItem>
                            <SelectItem value="spend">Total Spend Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {formData.delayedVisibilityType === 'transactions' ? (
                        <div className="grid gap-2">
                          <Label>Required Transactions</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.delayedVisibilityTransactions}
                            onChange={(e) => setFormData({ ...formData, delayedVisibilityTransactions: e.target.value })}
                            placeholder="Enter number of transactions"
                          />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Label>Required Spend ($)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.delayedVisibilitySpend}
                            onChange={(e) => setFormData({ ...formData, delayedVisibilitySpend: e.target.value })}
                            placeholder="Enter spend amount"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Transaction Requirements Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Transaction Requirements</Label>
                      <Switch
                        checked={formData.conditions.useTransactionRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTransactionRequirements: checked,
                            // Clear values when toggled off
                            minimumTransactions: checked ? formData.conditions.minimumTransactions : "",
                            maximumTransactions: checked ? formData.conditions.maximumTransactions : ""
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useTransactionRequirements && (
                    <>
                      <div className="grid gap-2">
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
                          placeholder="Enter minimum transactions"
                        />
                      </div>
                      
                      <div className="grid gap-2">
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
                          placeholder="Enter maximum transactions"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Spending Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Spending Requirements</Label>
                      <Switch
                        checked={formData.conditions.useSpendingRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useSpendingRequirements: checked,
                            // Clear values when toggled off
                            minimumLifetimeSpend: checked ? formData.conditions.minimumLifetimeSpend : "",
                            minimumPointsBalance: checked ? formData.conditions.minimumPointsBalance : ""
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useSpendingRequirements && (
                    <>
                      <div className="grid gap-2">
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
                          placeholder="Enter minimum lifetime spend"
                        />
                      </div>
                      
                      <div className="grid gap-2">
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
                          placeholder="Enter minimum points balance"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Time Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Time Requirements</Label>
                      <Switch
                        checked={formData.conditions.useTimeRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTimeRequirements: checked,
                            // Clear values when toggled off
                            daysSinceJoined: checked ? formData.conditions.daysSinceJoined : "",
                            daysSinceLastVisit: checked ? formData.conditions.daysSinceLastVisit : ""
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useTimeRequirements && (
                    <>
                      <div className="grid gap-2">
                        <Label>Days Since Joined</Label>
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
                          placeholder="Enter days since joined"
                        />
                      </div>
                      
                      <div className="grid gap-2">
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
                          placeholder="Enter days since last visit"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Other Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Other Requirements</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>New Customer Only</Label>
                    <Switch
                      checked={formData.conditions.newCustomer}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          newCustomer: checked
                        }
                      })}
                    />
                  </div>

                  {/* Add this to the conditions section in step 3 (after the "New Customer Only" switch) */}

                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Membership Level Requirements</Label>
                      <Switch
                        checked={formData.conditions.useMembershipRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useMembershipRequirements: checked,
                            // Clear value when toggled off
                            membershipLevel: checked ? formData.conditions.membershipLevel : ""
                          }
                        })}
                      />
                    </div>
                  </div>

                  {formData.conditions.useMembershipRequirements && (
                    <div className="grid gap-2">
                      <Label>Required Membership Level</Label>
                      <Select
                        value={formData.conditions.membershipLevel}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            membershipLevel: value
                          }
                        })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select membership level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bronze">Bronze</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="platinum">Platinum</SelectItem>
                          <SelectItem value="vip">VIP</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Only customers with this membership level or higher will see this reward
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step4" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Redemption Limits Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Redemption Limits</Label>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
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
                      placeholder="Enter total redemption limit (leave empty for unlimited)"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Per Customer Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limitations.perCustomerLimit}
                      onChange={(e) => setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                          perCustomerLimit: e.target.value
                        }
                      })}
                      placeholder="Enter per customer limit (leave empty for unlimited)"
                    />
                  </div>
                  
                  {/* Time Restrictions Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Time Restrictions</Label>
                      <Switch
                        checked={formData.limitations.useTimeRestrictions}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          limitations: {
                            ...formData.limitations,
                            useTimeRestrictions: checked,
                            // Clear values when toggled off
                            startTime: checked ? formData.limitations.startTime : "",
                            endTime: checked ? formData.limitations.endTime : "",
                            dayRestrictions: checked ? formData.limitations.dayRestrictions : []
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.limitations.useTimeRestrictions && (
                    <>
                      <div className="grid gap-2">
                        <Label>Start Time</Label>
                        <Select
                          value={formData.limitations.startTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              startTime: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => {
                              const hour = i % 12 || 12
                              const period = i < 12 ? 'AM' : 'PM'
                              return (
                                <SelectItem key={i} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>End Time</Label>
                        <Select
                          value={formData.limitations.endTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              endTime: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => {
                              const hour = i % 12 || 12
                              const period = i < 12 ? 'AM' : 'PM'
                              return (
                                <SelectItem key={i} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Day Restrictions</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={formData.limitations.dayRestrictions.includes(day) ? "default" : "outline"}
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
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step5" className="space-y-6 py-4">
              {/* Basic Details Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Basic Details</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(1)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Reward Name</p>
                      <p className="text-sm">{formData.rewardName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Points Cost</p>
                      <p className="text-sm">{formData.pointsCost} points</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">PIN Code</p>
                      <p className="text-sm">{formData.pin}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          formData.isActive ? "bg-green-500" : "bg-gray-300"
                        )} />
                        <p className="text-sm">
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                </div>
              </div>

              {/* Visibility Settings Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Visibility Settings</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(2)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Available To</p>
                      <p className="text-sm">{getVisibilityText(formData.rewardVisibility)}</p>
                    </div>
                    {formData.delayedVisibility && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Delayed Visibility</p>
                        <p className="text-sm">
                          {formData.delayedVisibilityType === 'transactions' 
                            ? `After ${formData.delayedVisibilityTransactions} transactions`
                            : `After $${formData.delayedVisibilitySpend} spent`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                  {formData.hasActivePeriod && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Active Period</p>
                      <p className="text-sm">
                        {formData.activePeriod.startDate && formData.activePeriod.endDate ? 
                          `${new Date(formData.activePeriod.startDate).toLocaleDateString()} to ${new Date(formData.activePeriod.endDate).toLocaleDateString()}`
                          : "Date range not specified"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Conditions</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(3)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4">
                  {Object.entries(formData.conditions)
                    .filter(([key, value]) => 
                      value && 
                      value !== "" && 
                      !key.startsWith('use')
                    )
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {formatLabel(key)}
                        </p>
                        <p className="text-sm">
                          {typeof value === 'boolean' 
                            ? value ? 'Yes' : 'No' 
                            : String(value)}
                        </p>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Limitations Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Limitations</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(4)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4">
                  {Object.entries(formData.limitations)
                    .filter(([key, value]) => 
                      value && 
                      value !== "" && 
                      !key.startsWith('use')
                    ).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(formData.limitations)
                        .filter(([key, value]) => 
                          value && 
                          value !== "" && 
                          !key.startsWith('use')
                        )
                        .map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              {formatLabel(key)}
                            </p>
                            <p className="text-sm">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No limitations set
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
              >
                {currentStep === 5 ? submitButtonText : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 