"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
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
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc, query, getDocs, orderBy, limit, where } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface CreateRewardSheetProps {
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
    dayRestrictions: string[]
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

export function CreateRewardSheet({ 
  open, 
  onOpenChange,
  defaultValues,
  isEditing = false,
  rewardId,
  customerId,
  customerName
}: CreateRewardSheetProps) {
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
      membershipLevel: "bronze",
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
  
  // Add state for customer dropdown
  const [customers, setCustomers] = useState<Array<{id: string, name: string, email?: string, pointsBalance?: number, lifetimeTransactionCount?: number}>>([])
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<Array<{id: string, name: string}>>([])

  const { user } = useAuth()

  // Load default values if provided
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
  
  // Fetch customers when specific visibility is selected
  useEffect(() => {
    if (formData.rewardVisibility === 'specific' && customers.length === 0 && !isLoadingCustomers && user?.uid) {
      fetchMerchantCustomers();
    }
  }, [formData.rewardVisibility, customers.length, user?.uid]);
  
  // Fetch merchant's customers
  const fetchMerchantCustomers = async () => {
    if (!user?.uid) return;
    
    setIsLoadingCustomers(true);
    try {
      // Try the correct subcollection path with the fullName field
      const subcollectionQuery = query(
        collection(db, 'merchants', user.uid, 'customers'),
        orderBy('fullName', 'asc'),
        limit(100)
      );
      
      const subcollectionSnapshot = await getDocs(subcollectionQuery);
      
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
        
        setCustomers(customersData);
      } else {
        // If that fails, try without the orderBy
        const unorderedQuery = query(
          collection(db, 'merchants', user.uid, 'customers'),
          limit(100)
        );
        
        const unorderedSnapshot = await getDocs(unorderedQuery);
        
        if (unorderedSnapshot.docs.length > 0) {
          const customersData = unorderedSnapshot.docs.map(doc => {
            const data = doc.data();
            const customerName = data.fullName || data.name || data.displayName || data.customerName || 'Unnamed Customer';
            return {
              id: doc.id,
              name: customerName,
              email: data.email,
              pointsBalance: data.pointsBalance || 0,
              lifetimeTransactionCount: data.lifetimeTransactionCount || 0
            };
          });
          
          setCustomers(customersData);
        }
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Could not load customers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Initialize selected customers when editing
  useEffect(() => {
    if (defaultValues && 
        defaultValues.rewardVisibility === 'specific' && 
        defaultValues.specificCustomerIds && 
        defaultValues.specificCustomerIds.length > 0) {
      
      if (customers.length === 0) {
        fetchMerchantCustomers();
      }
      
      const initialSelectedCustomers = defaultValues.specificCustomerIds.map((id: string) => ({
        id,
        name: defaultValues.specificCustomerNames?.find((_name: string, index: number) => 
          index === defaultValues.specificCustomerIds.indexOf(id)
        ) || `Customer ${id}`
      }));
      
      setSelectedCustomers(initialSelectedCustomers);
    }
  }, [defaultValues]);

  // Update selected customers when customer data is loaded
  useEffect(() => {
    if (formData.rewardVisibility === 'specific' && 
        formData.specificCustomerIds && 
        formData.specificCustomerIds.length > 0 &&
        customers.length > 0) {
      
      const updatedSelectedCustomers = formData.specificCustomerIds.map(id => {
        const customer = customers.find(c => c.id === id);
        return {
          id,
          name: customer?.name || `Customer ${id}`
        };
      });
      
      setSelectedCustomers(updatedSelectedCustomers);
      
      setFormData({
        ...formData,
        specificCustomerNames: updatedSelectedCustomers.map(c => c.name)
      });
    }
  }, [customers, formData.specificCustomerIds]);

  // Generate reward summary when relevant fields change
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

  // Validation functions
  const validateBasicDetails = () => {
    const nameValid = formData.rewardName?.trim() !== '';
    const descriptionValid = formData.description?.trim() !== '';
    const pointsCostValid = typeof formData.pointsCost === 'string' 
      ? formData.pointsCost.trim() !== '' 
      : typeof formData.pointsCost === 'number';
    
    return nameValid && descriptionValid && pointsCostValid;
  }

  const validateConditions = () => {
    return true; // Simplified validation for now
  }

  const validateLimitations = () => {
    return true; // Simplified validation for now
  }

  const validations = {
    basic: validateBasicDetails(),
    conditions: validateConditions(),
    limitations: validateLimitations()
  }

  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      return;
    }

    if (step === 2 && !validations.basic) {
      toast({
        title: "Complete Basic Details",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      });
      return;
    }

    if (step === 3 && !validations.conditions) {
      toast({
        title: "Complete Conditions",
        description: "Please set up the reward conditions before proceeding.",
        variant: "destructive"
      });
      return;
    }

    setCurrentStep(step);
  }

  // Helper function for date/time formatting
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return format(date, 'PPP'); // e.g. "Feb 24, 2025"
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  }

  // Helper function to generate reward summary
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
        const firstLine = formData.customRewardDetails.split('\n')[0];
        summary = firstLine || "Custom reward";
        break;
        
      default:
        summary = "Reward";
        break;
    }
    
    return summary;
  }

  // Helper function for timestamp conversion
  const toUTCTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    )).toISOString();
  }

  // Helper function to get visibility text
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

  // Debug helper function
  const debugObject = (obj: any, label: string) => {
    console.log(`----- DEBUG ${label} -----`);
    console.log("Type:", typeof obj);
    console.log("Value:", obj);
    console.log("JSON string:", JSON.stringify(obj));
    console.log("Keys:", Object.keys(obj));
    console.log("------------------------");
  };

  // Save reward to Firestore
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

      // Handle multiple specific customers if available
      let uniqueCustomerIds: string[] = [];
      if (formData.specificCustomerIds && formData.specificCustomerIds.length > 0) {
        uniqueCustomerIds = [...formData.specificCustomerIds];
      } 
      // Fall back to the single customerId prop if available
      else if (customerId) {
        uniqueCustomerIds = [customerId];
      }

      // For new customer rewards, add special handling
      if (formData.rewardVisibility === 'new') {
        console.log("New Customer Reward Specialization");
      }
      
      // Filter out membership-related conditions for new customers
      const filteredConditions = formData.rewardVisibility === 'new' 
        ? conditions.filter(condition => condition.type !== 'membershipLevel')
        : conditions;

      // Ensure delayedVisibility is always false for new customers
      const finalDelayedVisibility = formData.rewardVisibility === 'new' ? false : delayedVisibility;

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
        
        // Remove the specificCustomerIds array from the final data
        delete rewardData.specificCustomerIds;
      }
      // Fall back to the single customerId prop if available
      else if (customerId) {
        // Only store the customer name for display purposes
        rewardData.specificCustomerNames = customerName ? [customerName] : [];
        
        // Store the single customer ID in the customers array
        rewardData.customers = [customerId];
        
        // Set uniqueCustomerIds as an array with the single customerId
        rewardData.uniqueCustomerIds = [customerId];
      }

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
        
        // Close the sheet
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
        
        // Close the sheet
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col">
        <div className="flex-none px-6 py-4 border-b">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-2xl">
              <span className="text-[#007AFF]">{isEditing ? 'Edit' : 'Create'}</span> {isEditing ? 'Reward' : 'New Reward'}
            </SheetTitle>
            <SheetDescription>
              {isEditing 
                ? 'Update the details of your existing reward.' 
                : customerName
                  ? `Design a personalized reward for ${customerName}.`
                  : 'Design a new reward for your loyal customers. Fill out the details below.'}
            </SheetDescription>
          </SheetHeader>

          {customerId && customerName && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
              <User className="h-4 w-4 text-[#007AFF]" />
              <span className="text-sm text-blue-700">
                Creating reward for <span className="font-medium">{customerName}</span>
              </span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
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
                    onClick={() => {
                      toast({
                        title: "AI Generation",
                        description: "This feature is not implemented in this component yet.",
                      })
                    }}
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

        <div className="flex-none px-6 py-2 border-b">
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
                  onClick={() => handleStepChange(step)}
                  className={`h-2 w-10 rounded-full transition-all ${
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

        <ScrollArea className="flex-1">
          {currentStep === 1 && (
            <div className="px-6 py-4">
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
                      
                      {/* Type-specific fields - only showing a few for brevity */}
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
          )}
          
          {currentStep === 2 && (
            <div className="px-6 py-4">
              <p>Visibility settings will appear here.</p>
            </div>
          )}
          
          {currentStep === 3 && (
            <div className="px-6 py-4">
              <p>Conditions will appear here.</p>
            </div>
          )}
          
          {currentStep === 4 && (
            <div className="px-6 py-4">
              <p>Limitations will appear here.</p>
            </div>
          )}
          
          {currentStep === 5 && (
            <div className="px-6 py-4">
              <p>Review will appear here.</p>
            </div>
          )}
        </ScrollArea>

        <div className="flex-none px-6 py-4 border-t">
          <div className="flex justify-between">
            <div className="flex gap-2">
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
            </div>
            <Button 
              onClick={() => {
                if (currentStep < 5) {
                  handleStepChange(currentStep + 1);
                } else {
                  saveReward();
                }
              }}
              className="bg-[#007AFF] hover:bg-[#0062CC] text-white"
            >
              {currentStep === 5 ? (isEditing ? 'Update Reward' : 'Create Reward') : 'Next'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
} 