"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetPortal, SheetOverlay } from "@/components/ui/sheet"
import * as SheetPrimitive from "@radix-ui/react-dialog"
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
import { CalendarIcon, Clock, HelpCircle, Users, UserCheck, UserCog, ShoppingCart, DollarSign, UserPlus, X, BugPlay, FileText, Eye, ListChecks, AlertTriangle, ChevronRight, Edit as EditIcon, CheckCircle, ClipboardCheck, User, Sparkles, Info, ShoppingBag, Award, Lock, Search, Calendar, Gift } from "lucide-react"
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
    useDateRestrictions: boolean
    dateRestrictionStart: string
    dateRestrictionEnd: string
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
  const [instantClose, setInstantClose] = useState(false)
  
  // Reset instantClose when sheet is closed
  useEffect(() => {
    if (!open && instantClose) {
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);
  
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
      useDateRestrictions: false,
      dateRestrictionStart: "",
      dateRestrictionEnd: ""
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
    const typeValid = formData.type?.trim() !== '';
    const pinValid = formData.pin?.trim() !== '' && formData.pin?.trim().length === 4;
    const pointsCostValid = typeof formData.pointsCost === 'string' 
      ? formData.pointsCost.trim() !== '' 
      : typeof formData.pointsCost === 'number';
    
    return nameValid && descriptionValid && pointsCostValid && typeValid && pinValid;
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
      // Check individual fields to provide more specific error messages
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
      
      // After successful save
      setInstantClose(true);
      onOpenChange(false);
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
      <SheetPortal>
        <SheetOverlay className="bg-black/30" />
        <SheetPrimitive.Content
          className={cn(
            "fixed z-50 gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
            "sm:max-w-[600px] p-0 overflow-auto h-screen flex flex-col"
          )}
          data-instant-close={instantClose ? "true" : "false"}
        >
          <SheetPrimitive.Close 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-0 disabled:pointer-events-none data-[state=open]:bg-secondary z-10"
            tabIndex={-1}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        <div className="flex-none px-6 py-3 border-b">
          <SheetHeader className="mb-1">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-lg">
                  <span className="text-blue-500">Create</span> Reward
                </SheetTitle>
                <SheetDescription className="text-sm">
                  Offer rewards that motivate customers to engage with your loyalty program
                </SheetDescription>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 mt-3">
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
                  aria-label={`Go to step ${step}`}
                />
              ))}
            </div>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          {currentStep === 1 && (
            <div className="px-6 pt-2 pb-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Basic Details</h2>
              </div>
              <div className="space-y-6">
                {/* Core Details Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Core Information</h3>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div className="grid gap-2">
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
                            className="text-sm h-9"
                          />
                          <p className="text-xs text-gray-500">Choose a name customers will easily understand</p>
                        </div>
                      
                        <div className="grid gap-2">
                          <Label className="text-sm">Description <span className="text-red-500">*</span></Label>
                          <Textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Explain what customers will receive when they redeem this reward"
                            className="min-h-[70px] text-sm"
                          />
                          <p className="text-xs text-gray-500">Provide clear details about the reward and any important conditions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Reward Type and Points Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Reward Type & Points</h3>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="grid gap-2">
                          <Label className="text-sm">Reward Type</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value })}
                          >
                            <SelectTrigger className="text-sm h-9">
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
                          <Label className="text-sm">Points Cost <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="0"
                            value={formData.pointsCost}
                            onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                            placeholder="e.g., 100"
                            className="text-sm h-9"
                          />
                          <p className="text-xs text-gray-500">Points customers will spend to redeem</p>
                        </div>
                      </div>
                      
                      {/* Type-specific fields - only showing a few for brevity */}
                      {formData.type === 'percentageDiscount' && (
                        <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Discount Percentage <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            placeholder="e.g., 15 for 15% off"
                            className="text-sm h-9"
                          />
                          <p className="text-xs text-gray-500">Percentage discount the customer will receive</p>
                          
                          <div className="mt-2">
                            <Label className="text-sm">Applies To (Optional)</Label>
                            <Input
                              type="text"
                              value={formData.discountAppliesTo}
                              onChange={(e) => setFormData({ ...formData, discountAppliesTo: e.target.value })}
                              placeholder="e.g., Any purchase, Coffee only, etc."
                              className="text-sm h-9"
                            />
                            <p className="text-xs text-gray-500">Specify what products this discount applies to</p>
                          </div>
                        </div>
                      )}

                      {formData.type === 'fixedDiscount' && (
                        <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Discount Amount ($) <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={formData.discountValue}
                            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                            placeholder="e.g., 10 for $10 off"
                            className="text-sm h-9"
                          />
                          <p className="text-xs text-gray-500">Fixed amount discount the customer will receive</p>
                          
                          <div className="mt-2">
                            <Label className="text-sm">Minimum Purchase ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.minimumPurchase}
                              onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
                              placeholder="e.g., 25 for minimum $25 purchase"
                              className="text-sm h-9"
                            />
                            <p className="text-xs text-gray-500">Minimum purchase amount required to use this discount</p>
                          </div>
                        </div>
                      )}

                      {formData.type === 'freeItem' && (
                        <div className="grid gap-2 border-l-2 border-blue-100 pl-4 py-2">
                          <Label className="text-sm">Free Item Name <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={formData.itemName}
                            onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                            placeholder="e.g., Coffee, Muffin, etc."
                            className="text-sm h-9"
                          />
                          <p className="text-xs text-gray-500">Specify what item the customer will receive for free</p>
                          
                          <div className="mt-2">
                            <Label className="text-sm">Item Description (Optional)</Label>
                            <Input
                              type="text"
                              value={formData.itemDescription}
                              onChange={(e) => setFormData({ ...formData, itemDescription: e.target.value })}
                              placeholder="e.g., Any size, Specific flavor, etc."
                              className="text-sm h-9"
                            />
                            <p className="text-xs text-gray-500">Additional details about the free item</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Redemption PIN Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Redemption PIN</h3>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid gap-2 max-w-md">
                      <Label className="text-sm">PIN Code (4 digits) <span className="text-red-500">*</span></Label>
                      <Input
                        maxLength={4}
                        value={formData.pin}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                          setFormData({ ...formData, pin: value })
                        }}
                        placeholder="4-digit PIN (e.g., 1234)"
                        className="text-sm h-9"
                      />
                      <p className="text-xs text-gray-500">Staff will use this PIN during redemption</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 2 && (
            <div className="px-6 pt-2 pb-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Visibility Settings</h2>
              </div>

              <div className="space-y-6">
                {/* Visibility Type Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Who Can See This Reward</h3>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-xs text-gray-600 mb-4">
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
                            <p className={`text-sm font-medium transition-colors duration-200 ${formData.rewardVisibility === 'all' ? 'text-blue-700' : ''}`}>All Customers</p>
                            <p className="text-xs text-gray-500 mt-1">
                              This reward will be visible to all your customers (subject to any conditions)
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
                              Only customers who just joined your loyalty program will see this reward
                            </p>
                          </div>
                        </div>
                      </label>
                      
                      <label htmlFor="specific-customer" className="block w-full cursor-pointer">
                        <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${formData.rewardVisibility === 'specific' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                          <RadioGroupItem value="specific" id="specific-customer" className="mt-1" />
                          <div className="flex-1">
                            <p className={`text-sm font-medium transition-colors duration-200 ${formData.rewardVisibility === 'specific' ? 'text-blue-700' : ''}`}>Specific Customer</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Choose a specific customer who can see this reward
                            </p>
                          </div>
                        </div>
                      </label>
                    </RadioGroup>
                    
                    {formData.rewardVisibility === 'specific' && (
                                              <div className="mt-4 border-l-2 border-blue-100 pl-4 py-2">
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm">Select Customers</Label>
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
                                className="pl-8 text-sm h-9"
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
                                      <span className="text-sm font-medium">{customer.name}</span>
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
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
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
                      <p className="text-xs text-gray-600 mb-4">
                        Hide this reward until the customer reaches a certain milestone.
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
                  )}
                </div>
                
                {/* Active Period Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Active Period</h3>
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
                      <p className="text-xs text-gray-600 mb-4">
                        Set a date range when this reward is active and can be redeemed.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label className="text-sm">Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                                                        <Button
                            variant="outline"
                            className={`w-full justify-start text-left font-normal text-sm h-9 ${!formData.activePeriod.startDate && "text-muted-foreground"}`}
                          >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.activePeriod.startDate ? formatDate(formData.activePeriod.startDate) : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                                onSelect={(date: Date | undefined) => {
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
                          <Label className="text-sm">End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={`w-full justify-start text-left font-normal text-sm h-9 ${!formData.activePeriod.endDate && "text-muted-foreground"}`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.activePeriod.endDate ? formatDate(formData.activePeriod.endDate) : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <CalendarComponent
                                mode="single"
                                selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                                onSelect={(date: Date | undefined) => {
                                  const dateString = date ? date.toISOString().split('T')[0] : '';
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                      endDate: dateString
                                    }
                                  });
                                }}
                                disabled={(date: Date) =>
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
          )}
          
          {currentStep === 3 && (
            <div className="px-6 pt-2 pb-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Conditions</h2>
              </div>
                
              {/* New Customer Card - Always visible at the top */}
              <div className="bg-white border rounded-md shadow-sm mb-6 overflow-hidden">
                                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">New Customer Only</h3>
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
                  <p className="text-xs text-gray-600 mb-2">
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
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
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
                          <p className="text-xs text-gray-500 min-h-[2.5rem]">
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
                          <p className="text-xs text-gray-500 min-h-[2.5rem]">
                            Maximum purchases limit (leave empty for no limit)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Spending Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Spending Requirements</h3>
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
                  )}
                </div>
                
                {/* Time Requirements Card */}
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Time-Based Requirements</h3>
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
                      <p className="text-xs text-gray-600 mb-4">
                        Set time-based conditions that determine eligibility based on membership duration or last visit.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6">
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
                        
                        <div className="space-y-2">
                          <Label className="text-sm">Days Since Last Visit</Label>
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
                            className="text-sm h-9"
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
                <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <h3 className="font-medium text-sm">Membership Level Requirement</h3>
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
                        <p className="text-xs text-muted-foreground">
                          Only customers at or above this membership level will see this reward
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {currentStep === 4 && (
            <div className="px-6 pt-2 pb-4">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Limitations</h2>
              </div>

              {/* Redemption Limits Card */}
              <div className="bg-white border rounded-md shadow-sm mb-6 overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">Redemption Limits</h3>
                  </div>
                </div>
                
                <div className="p-4 space-y-6">
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

              {/* Time Restrictions Card */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">Time Restrictions</h3>
                  </div>
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

                {formData.limitations.useTimeRestrictions && (
                  <div className="p-4 space-y-6">
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
                )}
              </div>

              {/* Date Restrictions Card */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden mt-6">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">Date Range Restrictions</h3>
                  </div>
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

                {formData.limitations.useDateRestrictions && (
                  <div className="p-4 space-y-6">
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
                                "w-full justify-start text-left font-normal",
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
                                "w-full justify-start text-left font-normal",
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
                )}
              </div>
            </div>
          )}
          
          {currentStep === 5 && (
            <div className="px-6 pt-2 pb-4 space-y-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Review</h2>
              </div>

              {/* Basic Details Review */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <h3 className="font-medium text-sm">Basic Details</h3>
                  </div>
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
                
                <div className="p-4 space-y-4">
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
                    
                    <div className="col-span-2">
                      <p className="text-sm font-medium text-gray-500">Visibility</p>
                      <p className="text-sm">{getVisibilityText(formData.rewardVisibility)}</p>
                      {formData.rewardVisibility === 'specific' && formData.specificCustomerNames && formData.specificCustomerNames.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {formData.specificCustomerNames.map((name, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Reward Details Review */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium">Reward Details</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleStepChange(2)}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
                
                <div className="p-4 space-y-4">
                  {formData.type === 'percentage' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Discount Value</p>
                        <p className="text-sm">{formData.discountValue || '0'}%</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Applies To</p>
                        <p className="text-sm">{formData.discountAppliesTo === 'entire' ? 'Entire Purchase' : 'Specific Items'}</p>
                      </div>
                    </div>
                  )}
                  
                  {formData.type === 'fixed' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Discount Amount</p>
                        <p className="text-sm">${formData.discountValue || '0'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Minimum Purchase</p>
                        <p className="text-sm">${formData.minimumPurchase || '0'}</p>
                      </div>
                    </div>
                  )}
                  
                  {formData.type === 'item' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Item Name</p>
                        <p className="text-sm">{formData.itemName || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Item Description</p>
                        <p className="text-sm">{formData.itemDescription || 'No description provided'}</p>
                      </div>
                    </div>
                  )}
                  
                  {formData.type === 'bundle' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Required Purchase</p>
                        <p className="text-sm">{formData.requiredPurchase || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Bonus Item</p>
                        <p className="text-sm">{formData.bonusItem || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Discount Type</p>
                        <p className="text-sm">{capitalizeFirstLetter(formData.bundleDiscountType) || 'Free'}</p>
                      </div>
                      {formData.bundleDiscountType !== 'free' && (
                        <div>
                          <p className="text-sm font-medium text-gray-500">Discount Value</p>
                          <p className="text-sm">
                            {formData.bundleDiscountType === 'percentage' ? `${formData.bundleDiscountValue || '0'}%` : `$${formData.bundleDiscountValue || '0'}`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {formData.type === 'mystery' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Mystery Options</p>
                        <p className="text-sm">{formData.mysteryOptions || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Reveal Timing</p>
                        <p className="text-sm">{formData.revealAtCheckout ? 'At checkout' : 'Immediately'}</p>
                      </div>
                    </div>
                  )}
                  
                  {formData.type === 'custom' && (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Custom Reward Details</p>
                        <p className="text-sm">{formData.customRewardDetails || 'Not specified'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Conditions Review */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium">Conditions</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleStepChange(3)}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
                
                <div className="p-4 space-y-4">
                  {formData.conditions.newCustomer ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                      <div className="flex gap-2">
                        <UserPlus className="h-5 w-5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-800">
                          This reward is for new customers only. Other conditions are disabled.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Transaction Requirements */}
                      {formData.conditions.useTransactionRequirements && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">Transaction Requirements</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Minimum Transactions</p>
                              <p className="text-sm">{formData.conditions.minimumTransactions || '0'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Maximum Transactions</p>
                              <p className="text-sm">{formData.conditions.maximumTransactions || 'No limit'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Spending Requirements */}
                      {formData.conditions.useSpendingRequirements && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">Spending Requirements</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Minimum Lifetime Spend</p>
                              <p className="text-sm">${formData.conditions.minimumLifetimeSpend || '0'}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Minimum Points Balance</p>
                              <p className="text-sm">{formData.conditions.minimumPointsBalance || '0'} points</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Time Requirements */}
                      {formData.conditions.useTimeRequirements && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">Time Requirements</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-gray-500">Minimum Days as Member</p>
                              <p className="text-sm">{formData.conditions.daysSinceJoined || '0'} days</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-500">Days Since Last Visit</p>
                              <p className="text-sm">{formData.conditions.daysSinceLastVisit || '0'} days</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Membership Level Requirements */}
                      {formData.conditions.useMembershipRequirements && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-700">Membership Level Requirements</p>
                          <div>
                            <p className="text-sm font-medium text-gray-500">Minimum Membership Level</p>
                            <p className="text-sm">{capitalizeFirstLetter(formData.conditions.membershipLevel) || 'Bronze'}</p>
                          </div>
                        </div>
                      )}
                      
                      {/* No conditions applied message */}
                      {!formData.conditions.useTransactionRequirements && 
                       !formData.conditions.useSpendingRequirements && 
                       !formData.conditions.useTimeRequirements && 
                       !formData.conditions.useMembershipRequirements && (
                        <p className="text-sm text-gray-500 italic">No specific conditions applied. This reward is available to all customers.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Limitations Review */}
              <div className="bg-white border rounded-md shadow-sm overflow-hidden">
                <div className="border-b bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium">Limitations</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => handleStepChange(4)}
                  >
                    <EditIcon className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
                
                <div className="p-4 space-y-4">
                  {/* Redemption Limits */}
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-700">Redemption Limits</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Total Redemption Limit</p>
                        <p className="text-sm">{formData.limitations.totalRedemptionLimit || 'Unlimited'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Per-Customer Limit</p>
                        <p className="text-sm">{formData.limitations.perCustomerLimit || 'Unlimited'}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Time Restrictions */}
                  {formData.limitations.useTimeRestrictions && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Time Restrictions</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Available From</p>
                          <p className="text-sm">{formData.limitations.startTime || 'Not specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Available Until</p>
                          <p className="text-sm">{formData.limitations.endTime || 'Not specified'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-500">Available Days</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {formData.limitations.dayRestrictions.length > 0 ? (
                            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, index) => {
                              const isSelected = formData.limitations.dayRestrictions.includes(index.toString());
                              return (
                                <span 
                                  key={day} 
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    isSelected ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'
                                  }`}
                                >
                                  {day.substring(0, 3)}
                                </span>
                              )
                            })
                          ) : (
                            <p className="text-sm text-gray-500">All days</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Date Range Restrictions */}
                  {formData.limitations.useDateRestrictions && (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-700">Date Range Restrictions</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Start Date</p>
                          <p className="text-sm">
                            {formData.limitations.dateRestrictionStart ? 
                              format(new Date(formData.limitations.dateRestrictionStart), "MMM d, yyyy") : 
                              'Not specified'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">End Date</p>
                          <p className="text-sm">
                            {formData.limitations.dateRestrictionEnd ? 
                              format(new Date(formData.limitations.dateRestrictionEnd), "MMM d, yyyy") : 
                              'Not specified'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* No limitations message */}
                  {!formData.limitations.useTimeRestrictions && 
                   !formData.limitations.useDateRestrictions && 
                   !formData.limitations.totalRedemptionLimit && 
                   !formData.limitations.perCustomerLimit && (
                    <p className="text-sm text-gray-500 italic">No specific limitations applied. This reward has no redemption limits or time restrictions.</p>
                  )}
                </div>
              </div>
              
              {/* Summary card */}
              <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800 mb-1">Reward Summary</h3>
                    <p className="text-sm text-blue-700">
                      {formData.rewardSummary || generateRewardSummary()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <div className="flex-none px-6 py-4 border-t bg-background sticky bottom-0 w-full z-10 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
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
        </SheetPrimitive.Content>
      </SheetPortal>
    </Sheet>
  )
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
} 