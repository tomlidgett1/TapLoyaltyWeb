"use client"

import { useState, useEffect } from "react"
import { PageTransition } from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
  LayoutDashboard,
  FileQuestion,
  Cloud,
  Percent,
  Target,
  AlertTriangle,
  ShieldCheck,
  LineChart,
  Lightbulb,
  CalendarRange,
  Brain,
  BarChart3,
  Building2,
  Receipt,
  BadgeDollarSign,
  Users,
  Gift, 
  Settings, 
  Info,
  ArrowRight,
  DollarSign,
  Plus,
  CheckCircle,
  MessageSquareText,
  Bell, 
  Calendar,
  FileText, 
  BarChart,
  Clock, 
  Sparkles,
  Zap,
  Star,
  MessageSquare as Message,
  Star as StarIcon,
  Clipboard,
  ClipboardList,
  UserCircle,
  Cake,
  Trophy,
  Mail,
  ShoppingBag
} from "lucide-react"

// Import necessary Firebase dependencies
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, getDocs, query, where } from "firebase/firestore" 
import { useAuth } from "@/contexts/auth-context"
import { getAuth } from 'firebase/auth';

// Add the gradient text CSS
const gradientTextStyle = `
.gradient-text {
  background: linear-gradient(90deg, #3D8BFF 0%, #FF8A00 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-weight: 700;
}

.apple-switch {
  background-color: #007AFF;
}

.apple-card {
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: none;
}

.apple-button {
  background-color: #007AFF;
  border-radius: 8px;
  font-weight: 500;
}

.apple-button:hover {
  background-color: #0062CC;
}
`;

export default function TapAgentPage() {
  // Get the current user's auth state
  const { user } = useAuth()
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("business-brand")
  const [completionStatus, setCompletionStatus] = useState<Record<string, number>>({
    "business-brand": 0,
    "objectives": 0,
    "product-pricing": 0,
    "financial": 0,
    "customer-segments": 0,
    "reward-constraints": 0,
    "messaging": 0
  })
  const [overallProgress, setOverallProgress] = useState<number>(0)
  const { toast } = useToast()
  
  // Add state for merchant name
  const [merchantName, setMerchantName] = useState<string>("")
  
  // Sample form state for business and brand section
  const [businessBrand, setBusinessBrand] = useState({
    merchantId: "", // Keep merchantId in state but hide the input field
    brandPalette: "",
    brandPrimaryColor: "#007AFF",
    brandSecondaryColor: "#FFFFFF",
    brandAccentColor: "#FF3B30",
    logoUrl: "",
    toneOfVoice: [] as string[],
    agentTasks: {} as Record<string, boolean>,
    openingHours: {} as {[day: string]: {isOpen: boolean, openTime: string, closeTime: string}},
    businessContext: "" // Add this new field
  })

  // Add a useEffect to load settings from the settings page
  useEffect(() => {
    // This will be called when the component mounts
    async function loadSettings() {
      try {
        // Call Firestore to get the merchant data
        // For now, setting some default values to demonstrate
        const defaultHours = {} as {[day: string]: {isOpen: boolean, openTime: string, closeTime: string}};
        const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        daysOfWeek.forEach(day => {
          defaultHours[day.toLowerCase()] = {
            isOpen: true,
            openTime: "09:00",
            closeTime: "17:00"
          }
        });
        
        // Default agent tasks
        const defaultAgentTasks = {
          rewards: false,
          banners: false,
          messages: false,
          "re-engagement": false,
          email: false,
          analysis: false
        };
        
        // Update the state with the imported values
        setBusinessBrand(prev => ({
          ...prev,
          openingHours: defaultHours,
          agentTasks: defaultAgentTasks,
          // We would also set merchantId here from the fetched data
          merchantId: "merchant_12345"
        }));
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    
    loadSettings();
  }, []);

  // Initialize the productPricing state with an empty skus array
  const [productPricing, setProductPricing] = useState({
    skuList: [] as {name: string, category: string, price: string, cost: string}[],
    heroItems: [] as string[],
    lowVelocityItems: [] as string[],
    averageBasketSize: "",
    basketComposition: [] as {category: string, percentage: number}[],
    newHeroItem: "",
    newLowVelocityItem: "",
    newBasketCategory: "",
    newBasketPercentage: 0,
    newSkuName: "",
    newSkuCategory: "",
    newSkuPrice: "",
    newSkuCost: "",
    productCategory: "",
    skus: [] as { name: string, category: string, price: string, cost: string }[],
    heroProducts: "",
    lowVelocityProducts: "",
    pricingStrategy: "",
    competitivePressure: "",
    seasonalPricing: "",
    bundlingStrategy: ""
  })

  // Add a new state for the financial guard-rails section after the productPricing state
  const [financialGuardrails, setFinancialGuardrails] = useState({
    targetGrossMargin: "",
    monthlyRewardBudget: "",
    rewardBudgetType: "fixed", // 'fixed' or 'percentage'
    maxCostPerAcquisition: "",
    maxDiscountPercentage: "",
    targetROAS: "",
    minRewardValue: "",
    maxRewardValue: "",
    avgRewardValue: "",
    minPurchaseRequirement: ""
  })

  // Add a new state for messaging and creative inputs
  const [messagingInputs, setMessagingInputs] = useState({
    bannerSlots: "1",
    bannerDimensions: "1200x628",
    copyLengthLimits: "",
    quietHoursStart: "21:00",
    quietHoursEnd: "07:00",
    preferredEmojis: "",
    ctaLandingRoute: "/rewards/{id}",
    restrictedKeywords: ""
  })

  // Add state for customer segments
  const [customerSegments, setCustomerSegments] = useState({
    loyaltyTiers: [
      { 
        name: "Bronze", 
        order: 1,
        description: "Basic membership benefits",
        conditions: {
          lifetimeTransactions: { enabled: true, value: 0 },
          lifetimeSpend: { enabled: true, value: 0 },
          numberOfRedemptions: { enabled: false, value: 0 }
        }
      },
      { 
        name: "Silver", 
        order: 2,
        description: "Enhanced membership benefits",
        conditions: {
          lifetimeTransactions: { enabled: true, value: 10 },
          lifetimeSpend: { enabled: true, value: 500 },
          numberOfRedemptions: { enabled: false, value: 0 }
        }
      },
      { 
        name: "Gold", 
        order: 3,
        description: "Premium membership benefits",
        conditions: {
          lifetimeTransactions: { enabled: true, value: 25 },
          lifetimeSpend: { enabled: true, value: 1500 },
          numberOfRedemptions: { enabled: true, value: 5 }
        }
      }
    ],
    dormantThreshold: "30",
    vipCriteria: "",
    demographicTags: [] as string[],
    // Additional cohort settings
    newCustomerDuration: "30",
    frequentVisitorThreshold: "4",
    frequentVisitorPeriod: "30",
    highSpenderThreshold: "100",
    highSpenderPeriod: "30",
    seasonalVisitors: [] as string[],
    birthdayRewards: true,
    anniversaryRewards: true,
    // Add cohort thresholds
    activeThreshold: "30",
    newCustomerThreshold: "30",
    newCustomerVisitLimit: "2",
    churnedThreshold: "180",
    resurrectedThreshold: "60",
    dormantCohortThreshold: "90",
    // Add escalation strategy
    escalationStrategy: "value_increase",
    // Initialize VIP thresholds with empty strings
    vipSpendThreshold: "",
    vipSpendPeriod: "",
    vipVisitThreshold: "",
    birthdayRewardDays: "7",
    transactionMilestones: { enabled: false, interval: "10" },
    redemptionMilestones: { enabled: false, interval: "5" },
    spendingMilestones: { enabled: false, amount: "500" },
    // Track threshold validation errors - initialize with empty strings
    cohortThresholdErrors: {
      activeThreshold: "",
      dormantCohortThreshold: "",
      churnedThreshold: "",
      resurrectedThreshold: "",
      newCustomerThreshold: ""
    }
  })

  // Add state for reward constraints
  const [rewardConstraints, setRewardConstraints] = useState({
    allowedOfferTypes: {
      freeItem: true,
      percentageDiscount: true,
      fixedAmount: true,
      buyXGetY: true,
      mysteryGift: false
    },
    dailyRedemptionLimit: "3",
    redemptionWindow: "7",
    minimumDaysBetweenRewards: "1",
    rewardLifespanMin: "1",
    rewardLifespanMax: "7",
    concurrencyCeiling: "4",
    displayFrequency: "daily",
    displayLocation: ["home_screen", "checkout"] as string[],
    minPurchaseRequirement: "10"
  });

  // Add remaining advanced section states
  const [campaignSettings, setCampaignSettings] = useState({
    frequencyMin: "1",
    frequencyMax: "4",
    aBTestDuration: "14",
    testGroupSize: "10"
  })

  // Add a loading state for Firestore operations
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Initialize the objectiveMatrix state with all required properties
  const [objectiveMatrix, setObjectiveMatrix] = useState({
    businessObjectives: [
      {
        name: "increase_revenue",
        description: "Increase overall revenue",
        priority: 10
      },
      {
        name: "customer_retention",
        description: "Keep existing customers coming back",
        priority: 8
      }
    ],
    customerObjectives: {
      value_for_money: 8,
      convenience: 7,
      quality: 9,
      exclusivity: 5,
      personalization: 6,
      novelty: 4
    },
    seasonalObjectives: [
      {
        season: "Summer",
        objective: "Increase cold beverage sales",
        startDate: "2023-06-01",
        endDate: "2023-08-31"
      }
    ],
    // Add this property to fix the type errors
    objectives: [] as any[],
    newObjective: {
      userType: "",
      objective: "",
      importance: "",
      rewardType: "",
      example: ""
    }
  });
  
  // Add a new function to track the completion of the objectives section
  const updateObjectivesStatus = () => {
    // Calculate the completion percentage based on filled objectives
    const hasBusinessObjectives = objectiveMatrix.businessObjectives.length > 0;
    const hasCustomerObjectives = Object.keys(objectiveMatrix.customerObjectives).length > 0;
    
    // Count how many sections are complete
    const sections = [hasBusinessObjectives, hasCustomerObjectives];
    const completeSections = sections.filter(Boolean).length;
    
    // Calculate completion percentage
    const completionPercentage = Math.round((completeSections / sections.length) * 100);
    
    // Update the completion status
    setCompletionStatus(prev => ({
      ...prev,
      "objectives": completionPercentage
    }));
  };
  
  // Update objectiveMatrix useEffect to track completion
  useEffect(() => {
    updateObjectivesStatus();
  }, [objectiveMatrix]);
  
  // Update function for business and brand state
  const updateBusinessBrand = (key: string, value: any) => {
    setBusinessBrand(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Calculate section completion
    const requiredFields = ["merchantId", "brandPrimaryColor", "toneOfVoice"]
    const filledRequired = requiredFields.filter(field => {
      if (field === "toneOfVoice") {
        return businessBrand.toneOfVoice.length > 0;
      }
      return businessBrand[field as keyof typeof businessBrand]
    }).length;
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      "business-brand": completionPercentage
    }))
  }
  
  // Add a new update function for product & pricing state below the updateBusinessBrand function
  const updateProductPricing = (key: string, value: any) => {
    setProductPricing(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Calculate section completion
    const requiredFields = ["skuList", "heroItems", "averageBasketSize"]
    const filledRequired = requiredFields.filter(field => productPricing[field as keyof typeof productPricing]).length
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      "product-pricing": completionPercentage
    }))
  }
  
  // Add a new update function for financial guard-rails state
  const updateFinancialGuardrails = (key: string, value: any) => {
    setFinancialGuardrails(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Calculate section completion
    const requiredFields = ["targetGrossMargin", "monthlyRewardBudget", "maxCostPerAcquisition", "maxDiscountPercentage", "minRewardValue", "maxRewardValue", "avgRewardValue", "minPurchaseRequirement"]
    const filledRequired = requiredFields.filter(field => financialGuardrails[field as keyof typeof financialGuardrails]).length
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      "financial": completionPercentage
    }))
  }
  
  // Add an update function for messaging inputs
  const updateMessagingInputs = (key: string, value: any) => {
    setMessagingInputs(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Calculate section completion for the messaging tab
    const requiredFields = ["bannerSlots", "quietHoursStart", "quietHoursEnd"]
    const filledRequired = requiredFields.filter(field => messagingInputs[field as keyof typeof messagingInputs]).length
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      "messaging": completionPercentage
    }))
  }
  
  // Add a new update function for customer segments
  const updateCustomerSegments = (key: string, value: any) => {
    // Create a new state object with the updated value
    const updatedSegments = {
      ...customerSegments,
      [key]: value
    };
    
    // Ensure cohortThresholdErrors exists
    if (!updatedSegments.cohortThresholdErrors) {
      updatedSegments.cohortThresholdErrors = {
        activeThreshold: "",
        dormantCohortThreshold: "",
        churnedThreshold: "",
        resurrectedThreshold: "",
        newCustomerThreshold: ""
      };
    }
    
    // If this is a cohort threshold, validate the thresholds
    if ([
      'activeThreshold', 
      'dormantCohortThreshold', 
      'churnedThreshold', 
      'resurrectedThreshold'
    ].includes(key)) {
      // Validate cohort thresholds
      validateCohortThresholds(updatedSegments, key);
    } else {
      // Set state with the updated value
      setCustomerSegments(updatedSegments);
    }
    
    // Calculate section completion
    const requiredFields = [
      "loyaltyTiers", 
      "dormantThreshold", 
      "activeThreshold", 
      "newCustomerThreshold", 
      "churnedThreshold", 
      "resurrectedThreshold", 
      "dormantCohortThreshold",
      "vipSpendThreshold",
      "vipSpendPeriod",
      "vipVisitThreshold",
      "birthdayRewardDays",
      "transactionMilestones",
      "redemptionMilestones",
      "spendingMilestones"
    ]
    const filledRequired = requiredFields.filter(field => updatedSegments[field as keyof typeof updatedSegments]).length
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      ["customer-segments"]: completionPercentage
    }))
  }
  
  // Validate cohort thresholds to ensure they are mutually exclusive and collectively exhaustive
  const validateCohortThresholds = (updatedSegments: any, changedKey: string) => {
    // Ensure cohortThresholdErrors exists with default values if not present
    const errors = { 
      ...(updatedSegments.cohortThresholdErrors || {
        activeThreshold: "",
        dormantCohortThreshold: "",
        churnedThreshold: "",
        resurrectedThreshold: "",
        newCustomerThreshold: ""
      }) 
    };
    let hasErrors = false;
    
    // Convert string values to numbers for comparison
    const active = parseInt(updatedSegments.activeThreshold) || 0;
    const dormant = parseInt(updatedSegments.dormantCohortThreshold) || 0;
    const churned = parseInt(updatedSegments.churnedThreshold) || 0;
    const resurrected = parseInt(updatedSegments.resurrectedThreshold) || 0;
    
    // Clear previous errors for the changed field
    errors[changedKey] = "";
    
    // Validate that thresholds are in ascending order: active < dormant < churned
    if (active >= dormant) {
      errors.activeThreshold = "Active threshold must be less than Dormant threshold";
      errors.dormantCohortThreshold = "Dormant threshold must be greater than Active threshold";
      hasErrors = true;
    }
    
    if (dormant >= churned) {
      errors.dormantCohortThreshold = "Dormant threshold must be less than Churned threshold";
      errors.churnedThreshold = "Churned threshold must be greater than Dormant threshold";
      hasErrors = true;
    }
    
    // Validate that resurrected threshold is a reasonable value (positive)
    if (resurrected <= 0) {
      errors.resurrectedThreshold = "Resurrected threshold must be greater than 0";
      hasErrors = true;
    }
    
    // Update the state with new values and any validation errors
    setCustomerSegments({
      ...updatedSegments,
      cohortThresholdErrors: errors
    });
  }
  
  // Add update function for reward constraints
  const updateRewardConstraints = (field: string, value: string | string[]) => {
    setRewardConstraints(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Calculate section completion
    const requiredFields = ["dailyRedemptionLimit", "redemptionWindow", "allowedOfferTypes"]
    const allowedOfferTypesValid = Object.values(rewardConstraints.allowedOfferTypes).some(v => v === true);
    const filledRequired = requiredFields.filter(field => {
      if (field === "allowedOfferTypes") {
        return allowedOfferTypesValid;
      }
      return rewardConstraints[field as keyof typeof rewardConstraints];
    }).length;
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      ["reward-constraints"]: completionPercentage
    }));
  };
  
  // Calculate overall progress whenever section completion changes
  useEffect(() => {
    const sectionValues = Object.values(completionStatus)
    const averageCompletion = sectionValues.reduce((sum, value) => sum + value, 0) / sectionValues.length
    setOverallProgress(Math.round(averageCompletion))
  }, [completionStatus])
  
  // Add this function near your other save functions
  const formatCohortsForFirestore = () => {
    // Create a well-structured object of cohort definitions with conditions as arrays
    return {
      new: {
        id: "new",
        name: "New",
        color: "blue",
        definition: "Recent first-time customers with few visits",
        conditions: [
          {
            type: "firstVisitWithinDays",
            value: parseInt(customerSegments.newCustomerThreshold || "14")
          },
          {
            type: "maxLifetimeVisits",
            value: parseInt(customerSegments.newCustomerVisitLimit || "2")
          }
        ],
        businessValue: "Perfect time for welcome offers and onboarding rewards"
      },
      active: {
        id: "active",
        name: "Active",
        color: "green",
        definition: "Regular customers who visit frequently",
        conditions: [
          {
            type: "lastVisitWithinDays",
            value: parseInt(customerSegments.activeThreshold || "14")
          }
        ],
        businessValue: "Your loyal customers - focus on upselling and increasing basket size"
      },
      dormant: {
        id: "dormant",
        name: "Dormant",
        color: "amber",
        definition: "Customers who haven't visited recently",
        conditions: [
          {
            type: "lastVisitMinDays",
            value: parseInt(customerSegments.activeThreshold || "14")
          },
          {
            type: "lastVisitMaxDays",
            value: parseInt(customerSegments.dormantCohortThreshold || "60")
          }
        ],
        businessValue: "Time for 'We miss you' campaigns with gentle incentives"
      },
      churned: {
        id: "churned",
        name: "Churned",
        color: "red",
        definition: "Long-term inactive customers",
        conditions: [
          {
            type: "lastVisitMoreThanDays",
            value: parseInt(customerSegments.churnedThreshold || "60")
          }
        ],
        businessValue: "Requires strong win-back offers or partnerships"
      },
      resurrected: {
        id: "resurrected",
        name: "Resurrected",
        color: "purple",
        definition: "Previously dormant or churned who just returned",
        conditions: [
          {
            type: "recentVisitWithinDays",
            value: parseInt(customerSegments.resurrectedThreshold || "14")
          },
          {
            type: "previousStatus",
            value: "dormant,churned"
          }
        ],
        businessValue: "Critical re-engagement period - welcome them back warmly"
      }
    };
  };
  
  // Update the saveProgress function to use the new cohorts format
  const saveProgress = async () => {
    // Check if Firebase is initialized
    if (!db) {
      console.error("Firestore not initialized");
      toast({
        title: "Configuration Error",
        description: "Database connection not available. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }
    
    // Get current user directly from auth
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser || !currentUser.uid) {
      console.error("No authenticated user found");
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save progress.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      console.log("Starting save process with user:", currentUser.uid);
      
      // Format the cohorts
      const formattedCohorts = formatCohortsForFirestore();
      console.log("Formatted cohorts:", formattedCohorts);
      
      // Create the data to save with cohorts at root level
      console.log("Saving to agent collection (new compact format)...");

      /*
        We now transform all local state slices into the exact structure required by
        Firestore.  Refer to the JSON specification provided by the user.
      */

      // 1. BUSINESS BRAND ----------------------------------------------------
      const businessBrandToSave = {
        businessName: merchantName || businessBrand.merchantId || "",
        businessContext: businessBrand.businessContext || "",
        primaryColor: businessBrand.brandPrimaryColor || "",
        secondaryColor: businessBrand.brandSecondaryColor || "",
        brandVoice: businessBrand.toneOfVoice || []
      };

      // 2. AGENT TASKS -------------------------------------------------------
      const tasks = businessBrand.agentTasks || {};
      const agentTasksToSave = {
        rewardsGeneration: tasks.rewards ?? false,
        reEngagement: tasks["re-engagement"] ?? false,
        bannerCreation: tasks.banners ?? false,
        emailMarketing: tasks.email ?? false,
        customerMessaging: tasks.messages ?? false,
        performanceAnalysis: tasks.analysis ?? false
      };

      // 3. BUSINESS HOURS ----------------------------------------------------
      const businessHoursToSave: Record<string, {open: boolean; start: string; end: string}> = {};
      if (businessBrand.openingHours) {
        Object.entries(businessBrand.openingHours).forEach(([day, info]: any) => {
          businessHoursToSave[day.toLowerCase()] = {
            open: info.isOpen ?? false,
            start: info.openTime || "",
            end: info.closeTime || ""
          };
        });
      }

      // 4. OBJECTIVES --------------------------------------------------------
      // Map business objectives
      const businessObjectives = (objectiveMatrix.businessObjectives || []).map((obj: any) => ({
        id: obj.name,
        label: obj.description,
        priority: obj.priority
      }));

      // Map customer value priorities (snake_case -> camelCase)
      const camelCase = (s: string) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const customerValuePriorities: Record<string, number> = {};
      Object.entries(objectiveMatrix.customerObjectives || {}).forEach(([key, value]: any) => {
        customerValuePriorities[camelCase(key)] = value as number;
      });

      // Seasonal campaigns
      const seasonalCampaigns = (objectiveMatrix.seasonalObjectives || []).map((obj: any) => ({
        name: obj.season,
        objective: obj.objective,
        startDate: obj.startDate,
        endDate: obj.endDate
      }));

      const objectivesToSave = {
        businessObjectives,
        customerValuePriorities,
        seasonalCampaigns
      };

      // 5. PRODUCT PRICING ---------------------------------------------------
      const productsList = (productPricing.skuList || productPricing.skus || []).map((sku: any) => ({
        name: sku.name,
        price: Number(sku.price ?? 0),
        cost: Number(sku.cost ?? 0),
        category: sku.category || ""
      }));

      const productPricingToSave = {
        averageBasketSize: Number(productPricing.averageBasketSize || 0),
        products: productsList,
        heroProducts: productPricing.heroItems || productPricing.heroProducts || [],
        lowVelocityProducts: productPricing.lowVelocityItems || productPricing.lowVelocityProducts || []
      };

      // 6. FINANCIAL GUARDRAILS ---------------------------------------------
      const financialGuardrailsToSave = {
        rewardBudgetType: financialGuardrails.rewardBudgetType || "fixed",
        monthlyBudget: Number(financialGuardrails.monthlyRewardBudget || 0),
        targetGrossMargin: Number(financialGuardrails.targetGrossMargin || 0),
        maxCostPerAcquisition: Number(financialGuardrails.maxCostPerAcquisition || 0),
        minRewardValue: Number(financialGuardrails.minRewardValue || 0),
        maxRewardValue: Number(financialGuardrails.maxRewardValue || 0)
      };

      // 7. CUSTOMER SEGMENTS -------------------------------------------------
      const loyaltyTiers = (customerSegments.loyaltyTiers || []).map((tier: any) => ({
        name: tier.name,
        lifetimeTransactions: tier.conditions?.lifetimeTransactions?.value ?? 0,
        lifetimeSpend: tier.conditions?.lifetimeSpend?.value ?? 0,
        redemptions: tier.conditions?.numberOfRedemptions?.value ?? 0
      }));

      const visitSpendingThresholds = {
        frequentVisitor: {
          visits: parseInt(customerSegments.frequentVisitorThreshold || "0"),
          perDays: parseInt(customerSegments.frequentVisitorPeriod || "0")
        },
        highSpender: {
          amount: parseInt(customerSegments.highSpenderThreshold || "0"),
          perDays: parseInt(customerSegments.highSpenderPeriod || "0")
        }
      };

      const customerSegmentsToSave = { loyaltyTiers, visitSpendingThresholds };

      // 8. CUSTOMER COHORTS --------------------------------------------------
      const customerCohortsToSave = {
        new: {
          firstVisitWithinDays: parseInt(customerSegments.newCustomerThreshold || "30"),
          maxLifetimeVisits: parseInt(customerSegments.newCustomerVisitLimit || "2")
        },
        active: {
          lastVisitWithinDays: parseInt(customerSegments.activeThreshold || "30")
        },
        dormant: {
          lastVisitBetween: [
            parseInt(customerSegments.activeThreshold || "30"),
            parseInt(customerSegments.dormantCohortThreshold || "90")
          ]
        },
        churned: {
          lastVisitMoreThanDays: parseInt(customerSegments.churnedThreshold || "180")
        },
        resurrected: {
          wasDormantOrChurned: true,
          recentVisitWithinDays: parseInt(customerSegments.resurrectedThreshold || "60")
        }
      };

      // 9. REWARD CONSTRAINTS ----------------------------------------------
      const rewardConstraintsToSave = {
        allowedTypes: rewardConstraints.allowedOfferTypes || {},
        concurrencyCeiling: Number(rewardConstraints.concurrencyCeiling || 0)
      };

      // 10. MESSAGING CONSTRAINTS ------------------------------------------
      let keywordsArray: string[] = [];
      if (messagingInputs.restrictedKeywords) {
        keywordsArray = messagingInputs.restrictedKeywords
          .split(/[,\n]/)
          .map(k => k.trim())
          .filter(Boolean);
      }

      const messagingConstraintsToSave = {
        restrictedKeywords: keywordsArray
      };

      // --------------------------------------------------------------------
      const dataToSave = {
        businessBrand: businessBrandToSave,
        agentTasks: agentTasksToSave,
        businessHours: businessHoursToSave,
        objectives: objectivesToSave,
        productPricing: productPricingToSave,
        financialGuardrails: financialGuardrailsToSave,
        customerSegments: customerSegmentsToSave,
        customerCohorts: customerCohortsToSave,
        rewardConstraints: rewardConstraintsToSave,
        messagingConstraints: messagingConstraintsToSave
      };
      
      // Save to the agent collection using the user's UID
      const agentDocRef = doc(db, "agent", currentUser.uid);
      await setDoc(agentDocRef, dataToSave, { merge: true });
      console.log("Agent data save successful!");
      
      toast({
        title: "Progress saved",
        description: "Your TAP Agent configuration has been updated.",
      });
      
      return true; // Add return value for success
    } catch (error) {
      console.error("Error saving progress:", error);
      
      // More detailed error handling
      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for specific Firebase errors
        if (errorMessage.includes("permission-denied")) {
          errorMessage = "You don't have permission to save data. Please check your account.";
        } else if (errorMessage.includes("unavailable")) {
          errorMessage = "Database is currently unavailable. Please try again later.";
        } else if (errorMessage.includes("not-found")) {
          errorMessage = "Database path not found. Please contact support.";
        }
      }
      
      setSaveError(`Failed to save progress: ${errorMessage}`);
      
      toast({
        title: "Error saving progress",
        description: `There was a problem saving your changes: ${errorMessage}`,
        variant: "destructive"
      });
      
      return false; // Add return value for failure
    } finally {
      setIsSaving(false);
    }
  };
  
  // Add useEffect to load agent settings from Firestore
  useEffect(() => {
    // Skip if user is not authenticated
    if (!user) return
    
    async function loadAgentSettings() {
      try {
        // Fix for 'user' is possibly 'null'
        if (!user) return;
        
        const agentDocRef = doc(db, "agent", user.uid)
        const agentDoc = await getDoc(agentDocRef)
        
        if (agentDoc.exists()) {
          const data = agentDoc.data()
          
          /* -----------------------------------------------------------------
             NEW (COMPACT) FORMAT DETECTION
             If the document contains an "objectives" field we assume the new
             structure introduced in the latest save routine.  We map every
             top-level section back into the component state so the UI reflects
             exactly what was persisted.
          ----------------------------------------------------------------- */

          if (data.objectives) {
            // 1. BUSINESS BRAND & TASKS ------------------------------------
            const bb = data.businessBrand || {};
            const at = data.agentTasks || {};
            const bh = data.businessHours || {};

            // openingHours mapping
            const openingHours = Object.fromEntries(
              Object.entries(bh).map(([day, info]: any) => [
                day,
                {
                  isOpen: info.open ?? false,
                  openTime: info.start || "",
                  closeTime: info.end || ""
                }
              ])
            );

            const agentTasksUi = {
              rewards: at.rewardsGeneration ?? false,
              banners: at.bannerCreation ?? false,
              messages: at.customerMessaging ?? false,
              "re-engagement": at.reEngagement ?? false,
              email: at.emailMarketing ?? false,
              analysis: at.performanceAnalysis ?? false
            };

            setBusinessBrand(prev => ({
              ...prev,
              brandPrimaryColor: bb.primaryColor || prev.brandPrimaryColor,
              brandSecondaryColor: bb.secondaryColor || prev.brandSecondaryColor,
              toneOfVoice: bb.brandVoice || prev.toneOfVoice,
              businessContext: bb.businessContext || prev.businessContext,
              openingHours,
              agentTasks: agentTasksUi
            }));

            // 2. PRODUCT PRICING -------------------------------------------
            const pp = data.productPricing || {};
            const mappedSkus = (pp.products || []).map((p: any) => ({
              name: p.name,
              category: p.category,
              price: p.price?.toString() ?? "",
              cost: p.cost?.toString() ?? ""
            }));

            setProductPricing(prev => ({
              ...prev,
              averageBasketSize: pp.averageBasketSize?.toString() || prev.averageBasketSize,
              heroItems: pp.heroProducts || prev.heroItems,
              lowVelocityItems: pp.lowVelocityProducts || prev.lowVelocityItems,
              skuList: mappedSkus
            }));

            // 3. FINANCIAL GUARDRAILS --------------------------------------
            const fg = data.financialGuardrails || {};
            setFinancialGuardrails(prev => ({
              ...prev,
              rewardBudgetType: fg.rewardBudgetType || prev.rewardBudgetType,
              monthlyRewardBudget: fg.monthlyBudget?.toString() || prev.monthlyRewardBudget,
              targetGrossMargin: fg.targetGrossMargin?.toString() || prev.targetGrossMargin,
              maxCostPerAcquisition: fg.maxCostPerAcquisition?.toString() || prev.maxCostPerAcquisition,
              minRewardValue: fg.minRewardValue?.toString() || prev.minRewardValue,
              maxRewardValue: fg.maxRewardValue?.toString() || prev.maxRewardValue
            }));

            // 4. CUSTOMER SEGMENTS & COHORTS -------------------------------
            const cs = data.customerSegments || {};
            const cc = data.customerCohorts || {};

            const tiers = (cs.loyaltyTiers || []).map((tier: any, idx: number) => ({
              name: tier.name,
              order: idx + 1,
              description: "",
              conditions: {
                lifetimeTransactions: { enabled: true, value: tier.lifetimeTransactions ?? 0 },
                lifetimeSpend: { enabled: true, value: tier.lifetimeSpend ?? 0 },
                numberOfRedemptions: { enabled: true, value: tier.redemptions ?? 0 }
              }
            }));

            const vst = cs.visitSpendingThresholds || {};

            setCustomerSegments(prev => ({
              ...prev,
              loyaltyTiers: ensureCorrectTierStructure(tiers),
              frequentVisitorThreshold: vst.frequentVisitor?.visits?.toString() || prev.frequentVisitorThreshold,
              frequentVisitorPeriod: vst.frequentVisitor?.perDays?.toString() || prev.frequentVisitorPeriod,
              highSpenderThreshold: vst.highSpender?.amount?.toString() || prev.highSpenderThreshold,
              highSpenderPeriod: vst.highSpender?.perDays?.toString() || prev.highSpenderPeriod,
              activeThreshold: cc.active?.lastVisitWithinDays?.toString() || prev.activeThreshold,
              newCustomerThreshold: cc.new?.firstVisitWithinDays?.toString() || prev.newCustomerThreshold,
              newCustomerVisitLimit: cc.new?.maxLifetimeVisits?.toString() || prev.newCustomerVisitLimit,
              dormantCohortThreshold: cc.dormant?.lastVisitBetween?.[1]?.toString() || prev.dormantCohortThreshold,
              churnedThreshold: cc.churned?.lastVisitMoreThanDays?.toString() || prev.churnedThreshold,
              resurrectedThreshold: cc.resurrected?.recentVisitWithinDays?.toString() || prev.resurrectedThreshold
            }));

            // 5. REWARD CONSTRAINTS ----------------------------------------
            const rc = data.rewardConstraints || {};
            setRewardConstraints(prev => ({
              ...prev,
              allowedOfferTypes: rc.allowedTypes || prev.allowedOfferTypes,
              concurrencyCeiling: rc.concurrencyCeiling?.toString() || prev.concurrencyCeiling
            }));

            // 6. MESSAGING CONSTRAINTS -------------------------------------
            const mc = data.messagingConstraints || {};
            setMessagingInputs(prev => ({
              ...prev,
              restrictedKeywords: (mc.restrictedKeywords || []).join(", ")
            }));

            // 7. OBJECTIVES  -> objectiveMatrix ----------------------------
            const ob = data.objectives;

            const snake = (str: string) => str.replace(/[A-Z]/g, l => "_" + l.toLowerCase());

            const businessObjectives = (ob.businessObjectives || []).map((bo: any) => ({
              name: bo.id,
              description: bo.label,
              priority: bo.priority
            }));

            const customerObjectives: Record<string, number> = {};
            Object.entries(ob.customerValuePriorities || {}).forEach(([k, v]: any) => {
              customerObjectives[snake(k as string)] = v as number;
            });

            const seasonalObjectives = (ob.seasonalCampaigns || []).map((so: any) => ({
              season: so.name,
              objective: so.objective,
              startDate: so.startDate,
              endDate: so.endDate
            }));

            setObjectiveMatrix(prev => ({
              ...prev,
              businessObjectives,
              customerObjectives: customerObjectives as any,
              seasonalObjectives
            }) as any);

            // After all mappings recalc progress
            calculateOverallProgress();

            return; // <-- Done handling new format
          }

          /* -----------------------------------------------------------------
             LEGACY FORMAT (fallback)
          ----------------------------------------------------------------- */

          // Existing processing block remains for backward compatibility ------
          // Update each state with the loaded data
          if (data.businessBrand) {
            // Convert agentTasks from array to object if it's in the old format
            if (data.businessBrand.agentTasks && Array.isArray(data.businessBrand.agentTasks)) {
              const tasksObject = {} as Record<string, boolean>;
              data.businessBrand.agentTasks.forEach((taskId: string) => {
                tasksObject[taskId] = true;
              });
              data.businessBrand.agentTasks = tasksObject;
            }
            setBusinessBrand(data.businessBrand);
          }
          if (data.productPricing) {
            setProductPricing({
              ...data.productPricing,
              newHeroItem: data.productPricing.newHeroItem || "",
              newLowVelocityItem: data.productPricing.newLowVelocityItem || ""
            });
          }
          if (data.financialGuardrails) setFinancialGuardrails(data.financialGuardrails);
          if (data.messagingInputs) setMessagingInputs(data.messagingInputs);
          if (data.customerSegments) {
            if (data.customerSegments.loyaltyTiers) {
              data.customerSegments.loyaltyTiers = ensureCorrectTierStructure(data.customerSegments.loyaltyTiers);
            }
            if (data.dormancySettings && !data.customerSegments.activeThreshold) {
              data.customerSegments = {
                ...data.customerSegments,
                activeThreshold: data.dormancySettings.activeThreshold || "30",
                newCustomerThreshold: data.dormancySettings.newCustomerThreshold || "30",
                churnedThreshold: data.dormancySettings.churnedThreshold || "180",
                resurrectedThreshold: data.dormancySettings.resurrectedThreshold || "60",
                dormantCohortThreshold: data.dormancySettings.dormantThreshold || "90",
                escalationStrategy: data.dormancySettings.escalationStrategy || "value_increase"
              };
            }
            setCustomerSegments(data.customerSegments);
          }
          if (data.rewardConstraints) setRewardConstraints(data.rewardConstraints);
          if (data.objectiveMatrix) setObjectiveMatrix(data.objectiveMatrix);
          calculateOverallProgress();
        }
      } catch (error) {
        console.error("Error loading agent settings:", error)
      }
    }
    
    loadAgentSettings()
  }, [user])
  
  // Function to calculate overall progress
  const calculateOverallProgress = () => {
    const sectionValues = Object.values(completionStatus)
    const averageCompletion = sectionValues.reduce((sum, value) => sum + value, 0) / sectionValues.length
    setOverallProgress(Math.round(averageCompletion))
  }
  
  // Update the useEffect that watches completion status to use the new function
  useEffect(() => {
    calculateOverallProgress()
  }, [completionStatus])

  // Add these helper functions for managing loyalty tiers
  const addLoyaltyTier = () => {
    setCustomerSegments(prev => {
      const newTier = { 
        name: "", 
        order: prev.loyaltyTiers.length + 1,
        description: "",
        conditions: {
          lifetimeTransactions: { enabled: true, value: 0 },
          lifetimeSpend: { enabled: true, value: 0 },
          numberOfRedemptions: { enabled: false, value: 0 }
        }
      };
      
      return {
      ...prev,
        loyaltyTiers: [...prev.loyaltyTiers, newTier]
      };
    });
  }

  const removeLoyaltyTier = (index: number) => {
    setCustomerSegments(prev => ({
      ...prev,
      loyaltyTiers: prev.loyaltyTiers.filter((_, i) => i !== index)
    }));
  }

  const updateLoyaltyTier = (index: number, field: string, value: any) => {
    setCustomerSegments(prev => {
      const updatedTiers = [...prev.loyaltyTiers];
      updatedTiers[index] = {
        ...updatedTiers[index],
        [field]: field === 'minVisits' || field === 'maxVisits' 
          ? value === '' || value === 'null' || value === '∞' ? null : Number(value)
          : value
      };
      return {
        ...prev,
        loyaltyTiers: updatedTiers
      };
    });
  }

  // Add this function to ensure each tier has the correct structure
  const ensureCorrectTierStructure = (tiers: any[] | any) => {
    if (!Array.isArray(tiers)) {
      return [
        { 
          name: "Bronze", 
          order: 1,
          description: "Basic membership benefits",
          conditions: {
            lifetimeTransactions: { enabled: true, value: 0 },
            lifetimeSpend: { enabled: true, value: 0 },
            numberOfRedemptions: { enabled: false, value: 0 }
          }
        },
        { 
          name: "Silver", 
          order: 2,
          description: "Enhanced membership benefits",
          conditions: {
            lifetimeTransactions: { enabled: true, value: 10 },
            lifetimeSpend: { enabled: true, value: 500 },
            numberOfRedemptions: { enabled: false, value: 0 }
          }
        },
        { 
          name: "Gold", 
          order: 3,
          description: "Premium membership benefits",
          conditions: {
            lifetimeTransactions: { enabled: true, value: 25 },
            lifetimeSpend: { enabled: true, value: 1500 },
            numberOfRedemptions: { enabled: true, value: 5 }
          }
        }
      ];
    }
    
    return tiers.map(tier => {
      // If no nested conditions, derive them from possible root-level numbers
      if (!tier.conditions || !tier.conditions.lifetimeTransactions) {
        const lt = (tier as any).lifetimeTransactions ?? 0;
        const ls = (tier as any).lifetimeSpend ?? 0;
        const rd = (tier as any).redemptions ?? 0;
        return {
          name: tier.name || "",
          order: tier.order || 1,
          description: tier.description || "",
          conditions: {
            lifetimeTransactions: { enabled: true, value: lt },
            lifetimeSpend:   { enabled: true, value: ls },
            numberOfRedemptions: { enabled: true, value: rd }
          }
        };
      }
      return tier;
    });
  };

  // In the component, add state for merchant ID
  const [merchantId, setMerchantId] = useState("")

  // Add a function to load membership tiers from Firestore
  const loadMembershipTiers = async () => {
    console.log("loadMembershipTiers called with merchantId:", merchantId);
    if (!user || !merchantId) {
      console.log("Missing user or merchantId, skipping load");
      return;
    }
    
    try {
      // First check if the merchant exists
      const merchantRef = doc(db, `merchants/${merchantId}`);
      const merchantDoc = await getDoc(merchantRef);
      
      if (!merchantDoc.exists()) {
        console.log("Merchant document doesn't exist, creating it");
        // Create the merchant document if it doesn't exist
        await setDoc(merchantRef, {
          name: "Your Business",
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: user.uid
        });
      }
      
      // Get memberships collection for this merchant
      const membershipsRef = collection(db, `merchants/${merchantId}/memberships`);
      console.log("Fetching memberships from path:", `merchants/${merchantId}/memberships`);
      
      const membershipsSnapshot = await getDocs(membershipsRef);
      console.log("Memberships snapshot:", membershipsSnapshot.size, "documents found");
      
      if (!membershipsSnapshot.empty) {
        // Convert the memberships to the format we need
        const tiers = membershipsSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log("Membership document data:", doc.id, data);
          
          return {
            id: doc.id, // Store the document ID for updates
            name: data.name || "",
            order: data.order || 0,
            description: data.description || "",
            conditions: {
              lifetimeTransactions: data.conditions?.lifetimeTransactions || { enabled: false, value: 0 },
              lifetimeSpend: data.conditions?.lifetimeSpend || { enabled: false, value: 0 },
              numberOfRedemptions: data.conditions?.numberOfRedemptions || { enabled: false, value: 0 }
            },
            isActive: data.isActive !== undefined ? data.isActive : true
          };
        }).sort((a, b) => a.order - b.order); // Sort by order
        
        console.log("Processed membership tiers:", tiers);
        
        // Update the state with the loaded tiers
        updateCustomerSegments('loyaltyTiers', tiers);
        
        toast({
          title: "Membership Tiers Loaded",
          description: `Loaded ${tiers.length} membership tiers from your account.`,
        });
      } else {
        console.log("No membership documents found, creating default tiers");
        
        // Create default membership tiers
        const defaultTiers = [
          { 
            name: "Bronze", 
            order: 1,
            description: "Basic membership benefits",
            conditions: {
              lifetimeTransactions: { enabled: true, value: 0 },
              lifetimeSpend: { enabled: true, value: 0 },
              numberOfRedemptions: { enabled: false, value: 0 }
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          { 
            name: "Silver", 
            order: 2,
            description: "Enhanced membership benefits",
            conditions: {
              lifetimeTransactions: { enabled: true, value: 10 },
              lifetimeSpend: { enabled: true, value: 500 },
              numberOfRedemptions: { enabled: false, value: 0 }
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          { 
            name: "Gold", 
            order: 3,
            description: "Premium membership benefits",
            conditions: {
              lifetimeTransactions: { enabled: true, value: 25 },
              lifetimeSpend: { enabled: true, value: 1500 },
              numberOfRedemptions: { enabled: true, value: 5 }
            },
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        
        // Create the membership documents in Firestore
        for (const tier of defaultTiers) {
          const newDocRef = doc(collection(db, `merchants/${merchantId}/memberships`));
          await setDoc(newDocRef, tier);
          console.log("Created default tier:", tier.name, "with ID:", newDocRef.id);
        }
        
        // Update the state with the default tiers
        const tiersWithIds = await Promise.all(defaultTiers.map(async (tier) => {
          const querySnapshot = await getDocs(
            query(
              collection(db, `merchants/${merchantId}/memberships`),
              where("name", "==", tier.name),
              where("order", "==", tier.order)
            )
          );
          
          if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { ...tier, id: doc.id };
          }
          
          return tier;
        }));
        
        updateCustomerSegments('loyaltyTiers', tiersWithIds);
        
        toast({
          title: "Default Membership Tiers Created",
          description: "We've created default Bronze, Silver, and Gold tiers for you.",
        });
      }
    } catch (error) {
      console.error("Error loading/creating membership tiers:", error);
      toast({
        title: "Error with Membership Tiers",
        description: "There was a problem with your membership tiers.",
        variant: "destructive"
      });
    }
  };

  // Update the saveMembershipTiers function
  const saveMembershipTiers = async () => {
    console.log("saveMembershipTiers called with merchantId:", merchantId);
    if (!user || !merchantId) {
      console.log("Missing user or merchantId, skipping save");
      return;
    }
    
    try {
      setIsSaving(true);
      console.log("Saving membership tiers:", customerSegments.loyaltyTiers);
      
      // Get existing membership IDs to track deletions
      const membershipsRef = collection(db, `merchants/${merchantId}/memberships`);
      const existingSnapshot = await getDocs(membershipsRef);
      const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));
      const updatedIds = new Set();
      
      // For each tier in the current state, create or update the membership document
      for (const tier of customerSegments.loyaltyTiers) {
        console.log("Processing tier for save:", tier);
        
        const membershipData = {
          name: tier.name,
          order: tier.order,
          description: tier.description,
          conditions: {
            lifetimeTransactions: tier.conditions.lifetimeTransactions,
            lifetimeSpend: tier.conditions.lifetimeSpend,
            numberOfRedemptions: tier.conditions.numberOfRedemptions
          },
          isActive: (tier as any).isActive !== undefined ? (tier as any).isActive : true,
          updatedAt: new Date()
        };
        
        // If the tier has an ID, update the existing document
        if ((tier as any).id) {
          console.log("Updating existing tier with ID:", (tier as any).id);
          await setDoc(doc(db, `merchants/${merchantId}/memberships/${(tier as any).id}`), membershipData, { merge: true });
          updatedIds.add((tier as any).id);
        } else {
          // Otherwise create a new document
          console.log("Creating new tier document");
          const newDocRef = doc(collection(db, `merchants/${merchantId}/memberships`));
          await setDoc(newDocRef, {
            ...membershipData,
            createdAt: new Date()
          });
          console.log("Created new tier with ID:", newDocRef.id);
          updatedIds.add(newDocRef.id);
        }
      }
      
      // Check for tiers that were deleted in the UI and remove them from Firestore
      const deletedIds = [...existingIds].filter(id => !updatedIds.has(id));
      console.log("Deleted tier IDs:", deletedIds);
      
      for (const id of deletedIds) {
        console.log("Deleting tier with ID:", id);
        await setDoc(doc(db, `merchants/${merchantId}/memberships/${id}`), {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date()
        }, { merge: true });
      }
      
      toast({
        title: "Membership Tiers Saved",
        description: "Your loyalty tier definitions have been saved.",
      });
      
      // Reload the tiers to get any new IDs
      loadMembershipTiers();
    } catch (error) {
      console.error("Error saving membership tiers:", error);
      toast({
        title: "Error Saving Tiers",
        description: "There was a problem saving your membership tiers.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update the useEffect to load merchant ID and membership tiers
  useEffect(() => {
    console.log("merchantId useEffect triggered with value:", merchantId);
    if (!user) return;
    
    async function loadInitialData() {
      try {
        console.log("loadInitialData called");
        // First load the agent settings to get the merchant ID
        // Fix for user?.uid possibly being undefined
        if (!user?.uid) return;
        
        const agentDocRef = doc(db, "agent", user.uid);
        const agentDoc = await getDoc(agentDocRef);
        
        if (agentDoc.exists()) {
          const data = agentDoc.data();
          console.log("Agent document data:", data);
          
          // If we have a merchant ID, set it
          if (data.businessBrand && data.businessBrand.merchantId) {
            console.log("Setting merchantId to:", data.businessBrand.merchantId);
            setMerchantId(data.businessBrand.merchantId);
          } else {
            console.log("No merchantId found in agent document");
          }
          
          // Load the rest of the agent settings as before
          if (data.businessBrand) setBusinessBrand(data.businessBrand);
          if (data.productPricing) {
            // Ensure newHeroItem and newLowVelocityItem are initialized properly
            setProductPricing({
              ...data.productPricing,
              newHeroItem: data.productPricing.newHeroItem || "",
              newLowVelocityItem: data.productPricing.newLowVelocityItem || ""
            });
          }
          if (data.financialGuardrails) setFinancialGuardrails(data.financialGuardrails);
          if (data.messagingInputs) setMessagingInputs(data.messagingInputs);
          if (data.customerSegments) {
            // We'll load membership tiers separately, but still load other customer segment settings
            if (data.customerSegments.loyaltyTiers) {
              data.customerSegments.loyaltyTiers = ensureCorrectTierStructure(data.customerSegments.loyaltyTiers);
            }
            setCustomerSegments(data.customerSegments);
          }
          if (data.rewardConstraints) setRewardConstraints(data.rewardConstraints);
          
        } else {
          console.log("Agent document does not exist");
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    }
    
    loadInitialData();
  }, [user]);

  // Add a separate useEffect to load membership tiers when merchantId changes
  useEffect(() => {
    console.log("merchantId useEffect triggered with value:", merchantId);
    if (merchantId) {
      loadMembershipTiers();
      
      // Fetch merchant name when merchantId is available
      const fetchMerchantName = async () => {
        try {
          const merchantRef = doc(db, 'merchants', merchantId);
          const merchantDoc = await getDoc(merchantRef);
          
          if (merchantDoc.exists()) {
            const data = merchantDoc.data();
            // Look for merchant name in different possible field names
            const name = data.merchantName || data.name || data.tradingName || data.businessName || "";
            setMerchantName(name);
          }
        } catch (error) {
          console.error("Error fetching merchant name:", error);
        }
      };
      
      fetchMerchantName();
    }
  }, [merchantId]);

  // Add these functions to handle the objective matrix updates
  const updateObjectiveMatrix = (
    section: 'businessObjectives' | 'seasonalObjectives',
    index: number,
    field: string,
    value: any
  ) => {
    setObjectiveMatrix(prev => {
      const updated = {...prev};
      // Fix for element implicitly has 'any' type
      const sectionItem = updated[section][index] as Record<string, any>;
      sectionItem[field] = value;
      return updated;
    });
  };

  const updateCustomerObjective = (id: string, value: number) => {
    setObjectiveMatrix(prev => ({
      ...prev,
      customerObjectives: {
        ...prev.customerObjectives,
        [id]: value
      }
    }));
  };

  const addBusinessObjective = () => {
    setObjectiveMatrix(prev => ({
      ...prev,
      businessObjectives: [
        ...prev.businessObjectives,
        {
          name: "",
          description: "",
          priority: 5
        }
      ]
    }));
  };

  const moveObjective = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setObjectiveMatrix(prev => {
        const updated = {...prev};
        const temp = updated.businessObjectives[index];
        updated.businessObjectives[index] = updated.businessObjectives[index - 1];
        updated.businessObjectives[index - 1] = temp;
        return updated;
      });
    } else if (direction === 'down' && index < objectiveMatrix.businessObjectives.length - 1) {
      setObjectiveMatrix(prev => {
        const updated = {...prev};
        const temp = updated.businessObjectives[index];
        updated.businessObjectives[index] = updated.businessObjectives[index + 1];
        updated.businessObjectives[index + 1] = temp;
        return updated;
      });
    }
  };

  const addSeasonalObjective = () => {
    setObjectiveMatrix(prev => ({
      ...prev,
      seasonalObjectives: [
        ...prev.seasonalObjectives,
        {
          season: "",
          objective: "",
          startDate: "",
          endDate: ""
        }
      ]
    }));
  };

  const removeSeasonalObjective = (index: number) => {
    setObjectiveMatrix(prev => ({
      ...prev,
      seasonalObjectives: prev.seasonalObjectives.filter((_, i) => i !== index)
    }));
  };

  // Function to add a new objective
  const addObjective = () => {
    const { userType, objective } = objectiveMatrix.newObjective;
    
    if (userType && objective) {
      setObjectiveMatrix(prev => ({
        ...prev,
        objectives: [...prev.objectives, prev.newObjective],
        newObjective: {
        userType: "",
        objective: "",
        importance: "",
        rewardType: "",
        example: ""
        }
      }));
    }
  };

  // Function to remove an objective
  const removeObjective = (index: number) => {
    setObjectiveMatrix(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i: number) => i !== index)
    }));
  };

  // Function to update a field in the new objective form
  const updateNewObjectiveField = (field: string, value: string) => {
    setObjectiveMatrix(prev => ({
      ...prev,
      newObjective: {
        ...prev.newObjective,
      [field]: value
      }
    }));
  };

  // Add useEffect to fetch merchant name when user ID is available
  useEffect(() => {
    // Exit early if user is not defined
    if (!user) return;
    
    // User is now definitely defined
    const uid = user.uid;
    if (!uid) return;
    
    async function fetchMerchantName() {
      try {
        const merchantRef = doc(db, 'merchants', uid);
        const merchantDoc = await getDoc(merchantRef);
        
        if (merchantDoc.exists()) {
          const data = merchantDoc.data();
          // Get the merchantName field specifically
          if (data.merchantName) {
            console.log("Found merchantName:", data.merchantName);
            setMerchantName(data.merchantName);
          } else {
            // If merchantName doesn't exist, use user ID
            console.log("No merchantName found, using uid:", uid);
            setMerchantName(uid);
          }
        } else {
          // If merchant document doesn't exist, use user ID
          console.log("No merchant document found, using uid:", uid);
          setMerchantName(uid);
        }
      } catch (error) {
        console.error("Error fetching merchant name:", error);
        // Fallback to user ID if there's an error
        setMerchantName(uid);
      }
    }
    
    fetchMerchantName();
  }, [user]);

  // Add these functions to your component, before the return statement

  // Function to add a new SKU
  const addSku = () => {
    setProductPricing(prev => ({
      ...prev,
      skus: [...(prev.skus || []), { name: "", category: "", price: "", cost: "" }]
    }));
  };

  // Function to update a specific SKU field
  const updateSku = (index: number, field: string, value: string) => {
    setProductPricing(prev => {
      const updatedSkus = [...(prev.skus || [])];
      if (updatedSkus[index]) {
        updatedSkus[index] = {
          ...updatedSkus[index],
          [field]: value
        };
      }
      return {
        ...prev,
        skus: updatedSkus
      };
    });
  };

  // Function to remove a SKU
  const removeSku = (index: number) => {
    setProductPricing(prev => ({
      ...prev,
      skus: (prev.skus || []).filter((_, i) => i !== index)
    }));
  };

  // Add this state variable for the new demographic tag input
  const [newDemographicTag, setNewDemographicTag] = useState<string>("")

  // Add these functions to handle demographic tags
  const addDemographicTag = () => {
    if (newDemographicTag.trim() !== "") {
      setCustomerSegments(prev => ({
        ...prev,
        demographicTags: [...prev.demographicTags, newDemographicTag.trim()]
      }))
      setNewDemographicTag("")
    }
  }

  const removeDemographicTag = (index: number) => {
    setCustomerSegments(prev => ({
      ...prev,
      demographicTags: prev.demographicTags.filter((_, i) => i !== index)
    }))
  }

  // Add these functions to handle loyalty tiers
  const moveLoyaltyTier = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      setCustomerSegments(prev => {
        const updatedTiers = [...prev.loyaltyTiers]
        const temp = updatedTiers[index]
        updatedTiers[index] = updatedTiers[index - 1]
        updatedTiers[index - 1] = temp
        return { ...prev, loyaltyTiers: updatedTiers }
      })
    } else if (direction === 'down' && index < customerSegments.loyaltyTiers.length - 1) {
      setCustomerSegments(prev => {
        const updatedTiers = [...prev.loyaltyTiers]
        const temp = updatedTiers[index]
        updatedTiers[index] = updatedTiers[index + 1]
        updatedTiers[index + 1] = temp
        return { ...prev, loyaltyTiers: updatedTiers }
      })
    }
  }

  const updateLoyaltyTierCondition = (
    tierIndex: number, 
    conditionName: 'lifetimeTransactions' | 'lifetimeSpend' | 'numberOfRedemptions', 
    field: 'enabled' | 'value', 
    value: boolean | number
  ) => {
    setCustomerSegments(prev => {
      const updatedTiers = [...prev.loyaltyTiers]
      updatedTiers[tierIndex] = {
        ...updatedTiers[tierIndex],
        conditions: {
          ...updatedTiers[tierIndex].conditions,
          [conditionName]: {
            ...updatedTiers[tierIndex].conditions[conditionName],
            [field]: value
          }
        }
      }
      return { ...prev, loyaltyTiers: updatedTiers }
    })
  }

  // Add this function to handle updating offer types in the reward constraints
  const updateRewardConstraintOfferType = (offerType: string, value: boolean) => {
    setRewardConstraints(prev => ({
      ...prev,
      allowedOfferTypes: {
        ...prev.allowedOfferTypes,
        [offerType]: value
      }
    }));
  };

  // Add this near the top of your component
  const auth = getAuth();
  // No need to create a new db instance, use the imported one

  // Add a button to test Firestore connection
  <Button 
    variant="outline"
    onClick={() => {
      console.log("Testing Firestore connection...");
      const testUser = auth.currentUser;
      console.log("Current user:", testUser);
      console.log("Firestore instance:", db);
      
      if (testUser) {
        toast({
          title: "User authenticated",
          description: `Logged in as: ${testUser.email}`,
        });
      } else {
        toast({
          title: "Not authenticated",
          description: "No user is currently logged in.",
          variant: "destructive"
        });
      }
    }}
    className="text-xs"
  >
    Test Connection
  </Button>

  // Create a function to handle the "Done" button click that saves before redirecting
  const handleDoneClick = async () => {
    // First save the agent settings
    const saveSuccessful = await saveProgress();
    
    // Only redirect if save was successful or if saveSuccessful is undefined (function didn't return a value)
    if (saveSuccessful !== false) {
      window.location.href = '/dashboard';
    }
  };

  return (
    <PageTransition>
      <style jsx global>{gradientTextStyle}</style>
      <div className="min-h-[98vh] bg-gray-100">
        <div className="w-[99.5%] mx-auto py-2 px-2 h-[98%]">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden h-full">
            {/* Header with title and progress */}
            <div className="px-4 pt-3 pb-5 border-b">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold">
                    Tap <span className="gradient-text">Agent</span> 
                  </h1>
                  <p className="text-gray-500 mt-1">
                    Configure your agent to create personalised customer rewards
                  </p>
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto">
                  <div className="flex items-center gap-3 mb-2">
                    {merchantName && (
                      <span className="text-sm font-medium text-gray-700">{merchantName}</span>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7 px-3"
                      onClick={() => window.location.href = '/dashboard'}
                    >
                      Exit Setup
                    </Button>
                  </div>
                  
                  <div className="w-full md:w-64">
                  <div className="flex items-center justify-between mb-1">
                     
                  </div>
                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                    
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
                  
            {/* Navigation with more visual emphasis */}
            <div className="px-4 py-4 border-b">
              <div className="mb-2">
                <h3 className="text-sm font-medium text-gray-700">Configuration Steps</h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "business-brand", label: "Business & Brand", icon: <Building2 className="h-4 w-4" /> },
                  { id: "objectives", label: "Objectives", icon: <Brain className="h-4 w-4" /> },
                  { id: "product-pricing", label: "Product & Pricing", icon: <Receipt className="h-4 w-4" /> },
                  { id: "financial", label: "Financial", icon: <BadgeDollarSign className="h-4 w-4" /> },
                  { id: "customer-segments", label: "Customer Segments", icon: <Users className="h-4 w-4" /> },
                  { id: "reward-constraints", label: "Reward Constraints", icon: <Gift className="h-4 w-4" /> },
                  { id: "messaging", label: "Messaging", icon: <MessageSquareText className="h-4 w-4" /> }
                ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                      activeTab === tab.id 
                        ? "bg-gradient-to-r from-blue-50 to-orange-50 text-blue-700 font-medium shadow-sm" 
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <div className={activeTab === tab.id ? "text-blue-600" : "text-gray-500"}>
                      {tab.icon}
                    </div>
                    <span>{tab.label}</span>
                    <div className={`ml-1 h-2 w-2 rounded-full ${
                      completionStatus[tab.id] === 100 
                        ? "bg-green-500" 
                        : completionStatus[tab.id] > 0 
                          ? "bg-amber-500" 
                          : "bg-gray-200"
                    }`}></div>
                </button>
                ))}
              </div>
            </div>

            {/* Content area */}
            <div>
            {/* Dynamic content based on active tab */}
            {activeTab === "business-brand" && (
              <Card className="border-0 shadow-md apple-card">
                <CardHeader className="pb-2">
                    <div>
                    <CardTitle className="text-2xl">
                      <span className="gradient-text">Business & Brand DNA</span>
                    </CardTitle>
                    <CardDescription className="text-gray-500 mt-1">
                      Define your brand identity and business details
                      </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-8 pt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium gradient-text">Brand Identity</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="merchantName" className="text-sm font-medium text-gray-700">Business Name</Label>
                        <Input
                          id="merchantName"
                          placeholder="Your Business Name"
                          value={merchantName}
                          onChange={(e) => setMerchantName(e.target.value)}
                          className="rounded-lg border-gray-200"
                        />
                              </div>
                      
                      {/* Add new Business Context section here */}
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="businessContext" className="text-sm font-medium text-gray-700">Business Context</Label>
                        <textarea
                          id="businessContext"
                          placeholder="Describe your business in detail: what you offer, your unique value proposition, target audience, business goals, and any other context that would help the agent create better rewards."
                          value={businessBrand.businessContext || ""}
                          onChange={(e) => updateBusinessBrand('businessContext', e.target.value)}
                          className="w-full min-h-[120px] p-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500">This information helps the agent understand your business better and create more relevant rewards.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="brandPrimaryColor" className="text-sm font-medium text-gray-700">Primary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="brandPrimaryColor"
                            value={businessBrand.brandPrimaryColor}
                            onChange={(e) => updateBusinessBrand('brandPrimaryColor', e.target.value)}
                            className="w-10 h-10 rounded-full overflow-hidden border-0"
                            style={{ appearance: 'none' }}
                          />
                          <Input
                            value={businessBrand.brandPrimaryColor}
                            onChange={(e) => updateBusinessBrand('brandPrimaryColor', e.target.value)}
                            className="rounded-lg border-gray-200 font-mono"
                          />
                    </div>
                  </div>
                  
                      <div className="space-y-2">
                        <Label htmlFor="brandSecondaryColor" className="text-sm font-medium text-gray-700">Secondary Color</Label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            id="brandSecondaryColor"
                            value={businessBrand.brandSecondaryColor}
                            onChange={(e) => updateBusinessBrand('brandSecondaryColor', e.target.value)}
                            className="w-10 h-10 rounded-full overflow-hidden border-0"
                            style={{ appearance: 'none' }}
                          />
                          <Input
                            value={businessBrand.brandSecondaryColor}
                            onChange={(e) => updateBusinessBrand('brandSecondaryColor', e.target.value)}
                            className="rounded-lg border-gray-200 font-mono"
                          />
                        </div>
                    </div>
                    
                    {/* Removed Accent Color input */}
                    </div>
                                </div>
                        
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium gradient-text">Brand Voice & Tone</h3>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Tone of Voice</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["friendly", "professional", "casual", "formal", "playful", "serious", "inspirational", "direct", "quirky", "luxurious"].map(tone => (
                          <Badge 
                            key={tone}
                            variant={(businessBrand.toneOfVoice && businessBrand.toneOfVoice.includes(tone)) ? "default" : "outline"}
                            className={`cursor-pointer px-3 py-1.5 rounded-full transition-all ${
                              (businessBrand.toneOfVoice && businessBrand.toneOfVoice.includes(tone))
                                ? "bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200"
                                : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                            }`}
                            onClick={() => {
                              if (businessBrand.toneOfVoice && businessBrand.toneOfVoice.includes(tone)) {
                                updateBusinessBrand('toneOfVoice', businessBrand.toneOfVoice.filter(t => t !== tone))
                              } else {
                                updateBusinessBrand('toneOfVoice', [...(businessBrand.toneOfVoice || []), tone])
                              }
                            }}
                          >
                            {(businessBrand.toneOfVoice && businessBrand.toneOfVoice.includes(tone)) && (
                              <CheckCircle className="h-3 w-3 mr-1 inline-block text-blue-600" />
                            )}
                            {tone}
                          </Badge>
                        ))}
                              </div>
                      <p className="text-xs text-gray-500 mt-2">Select the tones that best represent your brand's voice</p>
                    </div>
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium gradient-text">Agent Capabilities</h3>
                    
                      <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Enable Agent Tasks</Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                        {[
                          { id: "rewards", label: "Rewards Generation", icon: <Gift className="h-4 w-4 text-blue-600" /> },
                          { id: "banners", label: "Banner Creation", icon: <LayoutDashboard className="h-4 w-4 text-blue-600" /> },
                          { id: "messages", label: "Customer Messaging", icon: <MessageSquareText className="h-4 w-4 text-blue-600" /> },
                          { id: "re-engagement", label: "Re-engagement", icon: <Bell className="h-4 w-4 text-blue-600" /> },
                          { id: "email", label: "Email Marketing", icon: <Mail className="h-4 w-4 text-blue-600" /> },
                          { id: "analysis", label: "Performance Analysis", icon: <BarChart className="h-4 w-4 text-blue-600" /> }
                        ].map(task => (
                          <div key={task.id} className="flex items-center space-x-2 p-3 border border-gray-100 rounded-xl bg-gray-50">
                            <div className="flex items-center gap-2 flex-1">
                              {task.icon}
                              <span className="text-sm text-gray-700">{task.label}</span>
                            </div>
                            <Switch 
                              checked={businessBrand.agentTasks && businessBrand.agentTasks[task.id]} 
                              onCheckedChange={(checked) => {
                                updateBusinessBrand('agentTasks', {
                                  ...(businessBrand.agentTasks || {}),
                                  [task.id]: checked
                                })
                              }}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                />
                              </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Select which tasks the agent should perform for your business</p>
                            </div>
                          </div>
                          
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium gradient-text">Business Hours</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                          <div key={day} className="flex items-center space-x-4 p-3 border border-gray-100 rounded-xl bg-gray-50">
                            <div className="w-24">
                              <span className="text-sm font-medium text-gray-700 capitalize">{day}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={businessBrand.openingHours && businessBrand.openingHours[day] ? businessBrand.openingHours[day].isOpen : true} 
                                onCheckedChange={(checked) => {
                                  updateBusinessBrand('openingHours', {
                                    ...(businessBrand.openingHours || {}),
                                    [day]: {
                                      isOpen: checked,
                                      openTime: businessBrand.openingHours && businessBrand.openingHours[day] ? businessBrand.openingHours[day].openTime : "09:00",
                                      closeTime: businessBrand.openingHours && businessBrand.openingHours[day] ? businessBrand.openingHours[day].closeTime : "17:00"
                                    }
                                  })
                                }}
                                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                              />
                              <span className="text-sm text-gray-600 w-16">
                                {businessBrand.openingHours && businessBrand.openingHours[day] && businessBrand.openingHours[day].isOpen ? "Open" : "Closed"}
                              </span>
                              </div>
                            
                            {businessBrand.openingHours && businessBrand.openingHours[day] && businessBrand.openingHours[day].isOpen && (
                              <div className="flex items-center gap-2 ml-4">
                              <Input
                                  type="time"
                                  value={businessBrand.openingHours[day].openTime}
                                  onChange={(e) => {
                                    updateBusinessBrand('openingHours', {
                                      ...businessBrand.openingHours,
                                      [day]: {
                                        ...businessBrand.openingHours[day],
                                        openTime: e.target.value
                                      }
                                    })
                                  }}
                                  className="w-32 rounded-lg border-gray-200"
                                />
                                <span className="text-gray-500">to</span>
                              <Input
                                  type="time"
                                  value={businessBrand.openingHours[day].closeTime}
                                  onChange={(e) => {
                                    updateBusinessBrand('openingHours', {
                                      ...businessBrand.openingHours,
                                      [day]: {
                                        ...businessBrand.openingHours[day],
                                        closeTime: e.target.value
                                      }
                                    })
                                  }}
                                  className="w-32 rounded-lg border-gray-200"
                              />
                            </div>
                            )}
                          </div>
                          ))}
                        </div>
                      <p className="text-xs text-gray-500 mt-2">Set your business hours to help the agent schedule appropriate campaigns</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t p-6">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex items-center gap-1 rounded-lg"
                      onClick={() => window.location.href = '/dashboard'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                      Back to Dashboard
                    </Button>
                    <Button variant="outline" className="rounded-lg">Reset</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                      onClick={saveProgress}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-pulse mr-2">●</span>
                          Saving...
                        </>
                      ) : (
                        "Save Progress"
                      )}
                    </Button>
                    <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("objectives")}>
                      Next: Objectives
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            )}
            
              {activeTab === "objectives" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                    <div>
                      <CardTitle className="text-2xl">
                        <span className="gradient-text">Objectives & OKRs</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Define your business objectives and key results the Tap Agent should optimize for
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Business Objectives Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Business Objectives</h3>
                      <p className="text-sm text-gray-600">Define what success looks like for your business</p>
                      
                      {/* Templates dropdown */}
                      <div className="mb-4 flex items-center space-x-2">
                        <Label htmlFor="objective-template" className="text-sm font-medium whitespace-nowrap">Quick templates:</Label>
                        <Select onValueChange={(value) => {
                          if (value === "" || value === "none") return;
                          
                          // Parse the template string to get objective details
                          const [name, description] = value.split('|');
                          
                          // Add new objective from template
                          setObjectiveMatrix(prev => ({
                            ...prev,
                            businessObjectives: [
                              ...prev.businessObjectives,
                              { name, description, priority: 8 }
                            ]
                          }));
                        }}>
                          <SelectTrigger className="w-full" id="objective-template">
                            <SelectValue placeholder="Select a template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select a template objective</SelectItem>
                            <SelectItem value="Increase weekly visits|Boost the number of customer visits per week">Increase weekly visits</SelectItem>
                            <SelectItem value="Raise average order value|Increase the average order value to target">Raise AOV</SelectItem>
                            <SelectItem value="Reduce dormant cohort|Decrease percentage of dormant customers">Reduce dormant customers</SelectItem>
                            <SelectItem value="Boost retention rate|Improve customer retention percentage">Boost retention rate</SelectItem>
                            <SelectItem value="Increase customer acquisition|Grow new customer base efficiently">Increase acquisition</SelectItem>
                            <SelectItem value="Improve customer LTV|Maximize lifetime value of customers">Improve customer LTV</SelectItem>
                            <SelectItem value="Optimize inventory turnover|Ensure optimal product rotation">Optimize inventory turnover</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Business objectives list with cards */}
                      <div className="space-y-4">
                        {objectiveMatrix.businessObjectives.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {objectiveMatrix.businessObjectives.map((objective, index) => (
                              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={objective.name}
                                      onChange={(e) => updateObjectiveMatrix('businessObjectives', index, 'name', e.target.value)}
                                      className="font-medium text-blue-700 bg-transparent border-0 w-full p-0 focus:outline-none focus:ring-0"
                                      placeholder="Objective name"
                                    />
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <button 
                                      onClick={() => moveObjective(index, 'up')}
                                      className="p-1 text-gray-400 hover:text-blue-500 rounded transition"
                                      disabled={index === 0}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m18 15-6-6-6 6"/>
                                      </svg>
                                    </button>
                                    <button 
                                      onClick={() => moveObjective(index, 'down')}
                                      className="p-1 text-gray-400 hover:text-blue-500 rounded transition"
                                      disabled={index === objectiveMatrix.businessObjectives.length - 1}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m6 9 6 6 6-6"/>
                                      </svg>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setObjectiveMatrix(prev => ({
                                          ...prev,
                                          businessObjectives: prev.businessObjectives.filter((_, i) => i !== index)
                                        }));
                                      }}
                                      className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                                
                                <div className="mb-3">
                                  <textarea
                                    value={objective.description}
                                    onChange={(e) => updateObjectiveMatrix('businessObjectives', index, 'description', e.target.value)}
                                    className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 min-h-[60px]"
                                    placeholder="Add specifics about this objective (e.g. target metrics)"
                                  />
                                </div>
                                
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-500 mr-2">Priority:</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={objective.priority}
                                    onChange={(e) => updateObjectiveMatrix('businessObjectives', index, 'priority', parseInt(e.target.value))}
                                    className="flex-1 mr-2 h-2"
                                  />
                                  <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                    {objective.priority}/10
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
                            <p className="text-gray-500">No objectives defined yet. Add your first objective or select from templates above.</p>
                          </div>
                        )}
                        
                        <Button 
                          onClick={addBusinessObjective} 
                          variant="outline" 
                          className="w-full mt-2 border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Objective
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Customer Objectives Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Customer Value Priorities</h3>
                      <p className="text-sm text-gray-600">What matters most to your customers? Adjust importance levels below.</p>
                      
                      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                        <div className="space-y-4 mt-2">
                          {Object.entries(objectiveMatrix.customerObjectives).map(([id, value]) => (
                            <div key={id} className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3 text-sm capitalize font-medium">
                                {id.replace(/_/g, ' ')}
                              </div>
                              <div className="col-span-7">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-gray-500">Low</span>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={value}
                                    onChange={(e) => updateCustomerObjective(id, parseInt(e.target.value))}
                                    className="flex-1 mx-2 h-2"
                                  />
                                  <span className="text-xs text-gray-500">High</span>
                                </div>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  value >= 8 ? 'bg-green-100 text-green-800' : 
                                  value >= 5 ? 'bg-blue-100 text-blue-800' : 
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {value}/10
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Seasonal Objectives Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Seasonal Campaigns</h3>
                      <p className="text-sm text-gray-600">Define time-limited campaigns and seasonal objectives</p>
                      
                      {/* Seasonal templates dropdown */}
                      <div className="mb-4 flex items-center space-x-2">
                        <Label htmlFor="seasonal-template" className="text-sm font-medium whitespace-nowrap">Quick templates:</Label>
                        <Select onValueChange={(value) => {
                          if (value === "") return;
                          
                          // Parse the template string to get season and objective
                          const [season, objective] = value.split('|');
                          
                          const today = new Date();
                          const endDate = new Date();
                          endDate.setMonth(endDate.getMonth() + 1);
                          
                          // Add new seasonal objective from template
                          setObjectiveMatrix(prev => ({
                            ...prev,
                            seasonalObjectives: [
                              ...prev.seasonalObjectives,
                              { 
                                season, 
                                objective, 
                                startDate: today.toISOString().split('T')[0],
                                endDate: endDate.toISOString().split('T')[0]
                              }
                            ]
                          }));
                        }}>
                          <SelectTrigger className="w-full" id="seasonal-template">
                            <SelectValue placeholder="Select a seasonal template" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Select a seasonal template</SelectItem>
                            <SelectItem value="Summer|Increase cold beverage sales">Summer promotion</SelectItem>
                            <SelectItem value="Back to School|Boost sales of student items">Back to School</SelectItem>
                            <SelectItem value="Holiday Season|Maximize holiday shopping revenue">Holiday Season</SelectItem>
                            <SelectItem value="New Year|Promote health and wellness products">New Year</SelectItem>
                            <SelectItem value="Valentine's Day|Increase gift purchases">Valentine's Day</SelectItem>
                            <SelectItem value="Black Friday|Maximize sale period revenue">Black Friday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Seasonal objectives list */}
                      <div className="space-y-4">
                        {objectiveMatrix.seasonalObjectives.length > 0 ? (
                          <div className="grid grid-cols-1 gap-4">
                            {objectiveMatrix.seasonalObjectives.map((objective, index) => (
                              <div key={index} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={objective.season}
                                      onChange={(e) => updateObjectiveMatrix('seasonalObjectives', index, 'season', e.target.value)}
                                      className="font-medium text-blue-700 bg-transparent border-0 w-full p-0 focus:outline-none focus:ring-0"
                                      placeholder="Season name"
                                    />
                                  </div>
                                  <button 
                                    onClick={() => removeSeasonalObjective(index)}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                    </svg>
                                  </button>
                                </div>
                                
                                <div className="mb-3">
                                  <textarea
                                    value={objective.objective}
                                    onChange={(e) => updateObjectiveMatrix('seasonalObjectives', index, 'objective', e.target.value)}
                                    className="w-full text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 min-h-[60px]"
                                    placeholder="Describe the seasonal objective"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label htmlFor={`startDate-${index}`} className="text-xs text-gray-500 mb-1 block">Start Date</Label>
                                    <input
                                      id={`startDate-${index}`}
                                      type="date"
                                      value={objective.startDate}
                                      onChange={(e) => updateObjectiveMatrix('seasonalObjectives', index, 'startDate', e.target.value)}
                                      className="w-full text-sm border border-gray-200 rounded p-1"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`endDate-${index}`} className="text-xs text-gray-500 mb-1 block">End Date</Label>
                                    <input
                                      id={`endDate-${index}`}
                                      type="date"
                                      value={objective.endDate}
                                      onChange={(e) => updateObjectiveMatrix('seasonalObjectives', index, 'endDate', e.target.value)}
                                      className="w-full text-sm border border-gray-200 rounded p-1"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-6 text-center border border-dashed border-gray-300">
                            <p className="text-gray-500">No seasonal campaigns defined yet. Add your first campaign or select from templates above.</p>
                          </div>
                        )}
                        
                        <Button 
                          onClick={addSeasonalObjective} 
                          variant="outline" 
                          className="w-full mt-2 border-dashed border-gray-300 text-gray-500 hover:text-blue-600 hover:border-blue-300"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Seasonal Campaign
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t p-6">
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("business-brand")}
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                        Back to Business & Brand
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                        onClick={saveProgress}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="animate-pulse mr-2">●</span>
                            Saving...
                          </>
                        ) : (
                          "Save Progress"
                        )}
                      </Button>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("product-pricing")}>
                        Next: Product & Pricing
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}
              
              {activeTab === "product-pricing" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                      <div>
                      <CardTitle className="text-2xl">
                        <span className="gradient-text">Product & Pricing</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Define your product catalog and pricing strategy
                        </CardDescription>
      </div>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Product Catalog Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Product Catalog</h3>
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="productCategory" className="text-sm font-medium text-gray-700">Product Category</Label>
                            <Select
                              value={productPricing.productCategory}
                              onValueChange={(value) => updateProductPricing('productCategory', value)}
                            >
                              <SelectTrigger id="productCategory" className="w-full rounded-lg border-gray-200">
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="food">Food</SelectItem>
                                <SelectItem value="beverage">Beverage</SelectItem>
                                <SelectItem value="retail">Retail</SelectItem>
                                <SelectItem value="service">Service</SelectItem>
                                <SelectItem value="experience">Experience</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="averageBasketSize" className="text-sm font-medium text-gray-700">Average Basket Size</Label>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">$</span>
                              <Input
                                id="averageBasketSize"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="25.00"
                                value={productPricing.averageBasketSize}
                                onChange={(e) => updateProductPricing('averageBasketSize', e.target.value)}
                                className="rounded-lg border-gray-200"
                              />
                            </div>
                            <p className="text-xs text-gray-500">Average amount spent per transaction</p>
                          </div>
    </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium text-gray-700">Product SKUs</Label>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm" 
                              onClick={addSku}
                              className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add SKU
                            </Button>
                          </div>
                          
                          <div className="border border-gray-100 rounded-xl overflow-hidden">
                            <div className="grid grid-cols-12 gap-2 bg-gray-50 p-3 border-b border-gray-100">
                              <div className="col-span-4 text-sm font-medium text-gray-700">Product Name</div>
                              <div className="col-span-2 text-sm font-medium text-gray-700">Price ($)</div>
                              <div className="col-span-2 text-sm font-medium text-gray-700">Cost ($)</div>
                              <div className="col-span-3 text-sm font-medium text-gray-700">Category</div>
                              <div className="col-span-1 text-sm font-medium text-gray-700"></div>
                            </div>
                            
                            <div className="max-h-64 overflow-y-auto">
                              {(productPricing.skus || []).map((sku, index) => (
                                <div key={index} className="grid grid-cols-12 gap-2 p-3 border-b border-gray-100 items-center">
                                  <div className="col-span-4">
                              <Input
                                      value={sku.name}
                                      onChange={(e) => updateSku(index, 'name', e.target.value)}
                                placeholder="Product name"
                                      className="rounded-lg border-gray-200"
                              />
                                  </div>
                                  <div className="col-span-2">
                              <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={sku.price}
                                      onChange={(e) => updateSku(index, 'price', e.target.value)}
                                      placeholder="0.00"
                                      className="rounded-lg border-gray-200"
                                    />
                                  </div>
                                  <div className="col-span-2">
                              <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={sku.cost}
                                      onChange={(e) => updateSku(index, 'cost', e.target.value)}
                                      placeholder="0.00"
                                      className="rounded-lg border-gray-200"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Select
                                      value={sku.category}
                                      onValueChange={(value) => updateSku(index, 'category', value)}
                                    >
                                      <SelectTrigger className="rounded-lg border-gray-200">
                                        <SelectValue placeholder="Category" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="main">Main</SelectItem>
                                        <SelectItem value="side">Side</SelectItem>
                                        <SelectItem value="dessert">Dessert</SelectItem>
                                        <SelectItem value="drink">Drink</SelectItem>
                                        <SelectItem value="combo">Combo</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="col-span-1 text-right">
                                <Button 
                                  type="button" 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => removeSku(index)}
                                      className="text-gray-500 hover:text-red-500 p-1 h-auto"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                                      </svg>
                                </Button>
                          </div>
                              </div>
                              ))}
                              
                              {(!productPricing.skus || productPricing.skus.length === 0) && (
                                <div className="p-4 text-center text-gray-500">
                                  No products added yet. Click "Add SKU" to get started.
                              </div>
                            )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">Add your key products to help the agent create relevant offers</p>
                            </div>
                          </div>
                        </div>
                      
                    <Separator className="my-6" />
                    
                    {/* Special Product Categories */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Special Product Categories</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="heroItems" className="text-sm font-medium text-gray-700">Hero Products</Label>
                          <div className="flex gap-2">
                            <Input
                              id="newHeroItem"
                              placeholder="Add a hero product"
                              value={productPricing.newHeroItem}
                              onChange={(e) => updateProductPricing('newHeroItem', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                            <Button 
                              type="button" 
                              onClick={() => {
                                if (productPricing.newHeroItem && productPricing.newHeroItem.trim()) {
                                  updateProductPricing('heroItems', [...productPricing.heroItems, productPricing.newHeroItem.trim()]);
                                  updateProductPricing('newHeroItem', '');
                                }
                              }}
                              disabled={!productPricing.newHeroItem || !productPricing.newHeroItem.trim()}
                              className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(productPricing.heroItems || []).map((item, index) => (
                              <Badge 
                                key={index}
                                variant="outline"
                                className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => updateProductPricing('heroItems', productPricing.heroItems.filter((_, i) => i !== index))}
                                  className="ml-1 h-4 w-4 rounded-full hover:bg-blue-200 inline-flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18"/>
                                    <path d="m6 6 12 12"/>
                                  </svg>
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">Your best-selling or signature products</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="lowVelocityItems" className="text-sm font-medium text-gray-700">Low Velocity Products</Label>
                          <div className="flex gap-2">
                            <Input
                              id="newLowVelocityItem"
                              placeholder="Add a low velocity product"
                              value={productPricing.newLowVelocityItem}
                              onChange={(e) => updateProductPricing('newLowVelocityItem', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                            <Button 
                              type="button" 
                              onClick={() => {
                                if (productPricing.newLowVelocityItem && productPricing.newLowVelocityItem.trim()) {
                                  updateProductPricing('lowVelocityItems', [...productPricing.lowVelocityItems, productPricing.newLowVelocityItem.trim()]);
                                  updateProductPricing('newLowVelocityItem', '');
                                }
                              }}
                              disabled={!productPricing.newLowVelocityItem || !productPricing.newLowVelocityItem.trim()}
                              className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                            >
                              Add
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {(productPricing.lowVelocityItems || []).map((item, index) => (
                              <Badge 
                                key={index}
                                variant="outline"
                                className="px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border-amber-100 flex items-center gap-1"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => updateProductPricing('lowVelocityItems', productPricing.lowVelocityItems.filter((_, i) => i !== index))}
                                  className="ml-1 h-4 w-4 rounded-full hover:bg-amber-200 inline-flex items-center justify-center"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6 6 18"/>
                                    <path d="m6 6 12 12"/>
                                  </svg>
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">Products that need a sales boost</p>
                        </div>
                      </div>
                    </div>
                    
                      
                    
                              
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                      <div className="flex items-start gap-3">
                        <BadgeDollarSign className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800">Why this matters</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Your product and pricing information helps the AI agent create offers that align with your business strategy, 
                            promote high-margin items, and move slow inventory while maintaining your desired price positioning.
                          </p>
                              </div>
                    </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("objectives")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        Previous: Objectives
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                          onClick={saveProgress}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <span className="animate-pulse mr-2">●</span>
                              Saving...
                            </>
                          ) : (
                            "Save Progress"
                          )}
                        </Button>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("financial")}>
                        Next: Financial Guardrails
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                </Card>
              )}
              
              {activeTab === "financial" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                        <div>
                      <CardTitle className="text-2xl">
                        <span className="gradient-text">Financial Guardrails</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Set budget constraints and financial parameters for your rewards
                  </CardDescription>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Budget Constraints Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Budget Constraints</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                          <Label htmlFor="rewardBudgetType" className="text-sm font-medium text-gray-700">Reward Budget Type</Label>
                          <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                id="fixed" 
                                name="budgetType" 
                                value="fixed" 
                                checked={financialGuardrails.rewardBudgetType === "fixed"}
                                onChange={() => updateFinancialGuardrails('rewardBudgetType', 'fixed')}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <Label htmlFor="fixed" className="text-sm text-gray-700 cursor-pointer">Fixed Amount</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <input 
                                type="radio" 
                                id="percentage" 
                                name="budgetType" 
                                value="percentage" 
                                checked={financialGuardrails.rewardBudgetType === "percentage"}
                                onChange={() => updateFinancialGuardrails('rewardBudgetType', 'percentage')}
                                className="text-blue-600 focus:ring-blue-500"
                              />
                              <Label htmlFor="percentage" className="text-sm text-gray-700 cursor-pointer">Percentage of Revenue</Label>
                            </div>
                      </div>
                        </div>
                          
                            <div className="space-y-2">
                          <Label htmlFor="monthlyRewardBudget" className="text-sm font-medium text-gray-700">
                            {financialGuardrails.rewardBudgetType === "fixed" ? "Monthly Reward Budget" : "Budget as % of Revenue"}
                          </Label>
                          <div className="flex items-center gap-2">
                            {financialGuardrails.rewardBudgetType === "fixed" && <span className="text-gray-500">$</span>}
                              <Input
                                id="monthlyRewardBudget"
                              type="number"
                              min="0"
                              step={financialGuardrails.rewardBudgetType === "fixed" ? "100" : "0.1"}
                              placeholder={financialGuardrails.rewardBudgetType === "fixed" ? "1000" : "2.5"}
                                value={financialGuardrails.monthlyRewardBudget}
                                onChange={(e) => updateFinancialGuardrails('monthlyRewardBudget', e.target.value)}
                              className="rounded-lg border-gray-200"
                              />
                            {financialGuardrails.rewardBudgetType === "percentage" && <span className="text-gray-500">%</span>}
                          </div>
                              <p className="text-xs text-gray-500">
                            {financialGuardrails.rewardBudgetType === "fixed" 
                              ? "Maximum amount to spend on rewards each month" 
                              : "Percentage of monthly revenue allocated to rewards"}
                          </p>
                          </div>
                        </div>
                      </div>
                        
                    <Separator className="my-6" />
                      
                    {/* Profitability Parameters Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Profitability Parameters</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="targetGrossMargin" className="text-sm font-medium text-gray-700">Target Gross Margin</Label>
                        <div className="flex items-center gap-2">
                            <Input
                              id="targetGrossMargin"
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="30"
                              value={financialGuardrails.targetGrossMargin}
                              onChange={(e) => updateFinancialGuardrails('targetGrossMargin', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                          <p className="text-xs text-gray-500">Minimum gross margin to maintain for reward-driven sales</p>
                      </div>
                      
                          <div className="space-y-2">
                          <Label htmlFor="maxCostPerAcquisition" className="text-sm font-medium text-gray-700">Max Cost Per Acquisition</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">$</span>
                            <Input
                              id="maxCostPerAcquisition"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="25.00"
                              value={financialGuardrails.maxCostPerAcquisition}
                              onChange={(e) => updateFinancialGuardrails('maxCostPerAcquisition', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                      </div>
                          <p className="text-xs text-gray-500">Maximum cost to acquire a new customer through rewards</p>
                    </div>
                        
                        
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Reward Value Limits Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Reward Value Limits</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="minRewardValue" className="text-sm font-medium text-gray-700">Minimum Reward Value</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">$</span>
                            <Input
                              id="minRewardValue"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="5.00"
                              value={financialGuardrails.minRewardValue}
                              onChange={(e) => updateFinancialGuardrails('minRewardValue', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Smallest reward value that can be offered</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="maxRewardValue" className="text-sm font-medium text-gray-700">Maximum Reward Value</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">$</span>
                            <Input
                              id="maxRewardValue"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="50.00"
                              value={financialGuardrails.maxRewardValue}
                              onChange={(e) => updateFinancialGuardrails('maxRewardValue', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                          </div>
                          <p className="text-xs text-gray-500">Largest reward value that can be offered</p>
                        </div>
                        
                        
                        
                       
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                          <div className="flex items-start gap-3">
                        <BadgeDollarSign className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                          <h4 className="text-sm font-medium text-blue-800">Financial Impact</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Setting clear financial guardrails ensures your reward program remains profitable while still providing 
                            compelling offers to customers. These parameters help the AI agent balance customer engagement with 
                            business sustainability.
                          </p>
                          </div>
                    </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("product-pricing")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        Previous: Product & Pricing
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                          onClick={saveProgress}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <span className="animate-pulse mr-2">●</span>
                              Saving...
                            </>
                          ) : (
                            "Save Progress"
                          )}
                        </Button>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("customer-segments")}>
                        Next: Customer Segments
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                </Card>
              )}
              
              {activeTab === "customer-segments" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                        <div>
                      <CardTitle className="text-xl">
                        <span className="gradient-text">Customer Segments</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Define your customer segments and loyalty tiers
                          </CardDescription>
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Loyalty Tiers Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Loyalty Tiers</h3>
                        
                        <div className="space-y-4">
                        {customerSegments.loyaltyTiers.map((tier, index) => (
                          <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                  index === 0 ? "bg-amber-100 text-amber-700" :
                                  index === 1 ? "bg-gray-200 text-gray-700" :
                                  "bg-yellow-100 text-yellow-700"
                                }`}>
                                  <Trophy className="h-4 w-4" />
                                </div>
                                <div>
                                      <Input 
                                        value={tier.name}
                                    onChange={(e) => updateLoyaltyTier(index, 'name', e.target.value)}
                                    className="font-medium border-0 bg-transparent p-0 h-auto text-base focus-visible:ring-0"
                                    placeholder="Tier Name"
                                  />
                                      <Input 
                                        value={tier.description}
                                    onChange={(e) => updateLoyaltyTier(index, 'description', e.target.value)}
                                    className="text-sm text-gray-500 border-0 bg-transparent p-0 h-auto focus-visible:ring-0"
                                    placeholder="Tier Description"
                                  />
                                </div>
                              </div>
                                      <div className="flex items-center gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => moveLoyaltyTier(index, 'up')}
                                  disabled={index === 0}
                                  className="h-8 w-8 p-0 rounded-lg"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m18 15-6-6-6 6"/>
                                  </svg>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => moveLoyaltyTier(index, 'down')}
                                  disabled={index === customerSegments.loyaltyTiers.length - 1}
                                  className="h-8 w-8 p-0 rounded-lg"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="m6 9 6 6 6-6"/>
                                  </svg>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => removeLoyaltyTier(index)}
                                  disabled={customerSegments.loyaltyTiers.length <= 1}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                                  </svg>
                                </Button>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`lifetimeTransactions-${index}`} className="text-sm font-medium text-gray-700">
                                    Lifetime Transactions
                                  </Label>
                                        <Switch 
                                    id={`lifetimeTransactions-enabled-${index}`}
                                          checked={tier.conditions.lifetimeTransactions.enabled}
                                    onCheckedChange={(checked) => updateLoyaltyTierCondition(index, 'lifetimeTransactions', 'enabled', checked)}
                                    className="apple-switch"
                                  />
                                </div>
                                        <Input 
                                  id={`lifetimeTransactions-${index}`}
                                          type="number"
                                          min="0"
                                  value={tier.conditions.lifetimeTransactions.value}
                                  onChange={(e) => updateLoyaltyTierCondition(index, 'lifetimeTransactions', 'value', parseInt(e.target.value))}
                                          disabled={!tier.conditions.lifetimeTransactions.enabled}
                                  className="rounded-lg border-gray-200"
                                        />
                                      </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`lifetimeSpend-${index}`} className="text-sm font-medium text-gray-700">
                                    Lifetime Spend ($)
                                  </Label>
                                        <Switch 
                                    id={`lifetimeSpend-enabled-${index}`}
                                          checked={tier.conditions.lifetimeSpend.enabled}
                                    onCheckedChange={(checked) => updateLoyaltyTierCondition(index, 'lifetimeSpend', 'enabled', checked)}
                                    className="apple-switch"
                                  />
                                </div>
                                        <Input 
                                  id={`lifetimeSpend-${index}`}
                                          type="number"
                                          min="0"
                                  value={tier.conditions.lifetimeSpend.value}
                                  onChange={(e) => updateLoyaltyTierCondition(index, 'lifetimeSpend', 'value', parseInt(e.target.value))}
                                          disabled={!tier.conditions.lifetimeSpend.enabled}
                                  className="rounded-lg border-gray-200"
                                        />
                                      </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor={`numberOfRedemptions-${index}`} className="text-sm font-medium text-gray-700">
                                    Number of Redemptions
                                  </Label>
                                        <Switch 
                                    id={`numberOfRedemptions-enabled-${index}`}
                                          checked={tier.conditions.numberOfRedemptions.enabled}
                                    onCheckedChange={(checked) => updateLoyaltyTierCondition(index, 'numberOfRedemptions', 'enabled', checked)}
                                    className="apple-switch"
                                  />
                                </div>
                                        <Input 
                                  id={`numberOfRedemptions-${index}`}
                                          type="number"
                                          min="0"
                                  value={tier.conditions.numberOfRedemptions.value}
                                  onChange={(e) => updateLoyaltyTierCondition(index, 'numberOfRedemptions', 'value', parseInt(e.target.value))}
                                          disabled={!tier.conditions.numberOfRedemptions.enabled}
                                  className="rounded-lg border-gray-200"
                                        />
                                      </div>
                            </div>
                          </div>
                        ))}
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={addLoyaltyTier}
                          className="w-full py-2 border-dashed border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Loyalty Tier
                        </Button>
                      </div>
                    </div>
                    
                    <Separator className="my-6" />
                    
                    {/* Demographic Tags Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Demographic Tags</h3>
                      
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {customerSegments.demographicTags.map((tag, index) => (
                            <Badge 
                              key={index}
                              variant="outline"
                              className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border-blue-100 flex items-center gap-1"
                            >
                              {tag}
                                      <button
                                        type="button"
                                onClick={() => removeDemographicTag(index)}
                                className="ml-1 h-4 w-4 rounded-full hover:bg-blue-200 inline-flex items-center justify-center"
                                      >
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6 6 18"/>
                                  <path d="m6 6 12 12"/>
                                </svg>
                                      </button>
                            </Badge>
                          ))}
                          
                          {customerSegments.demographicTags.length === 0 && (
                            <div className="text-sm text-gray-500 italic">No demographic tags added yet</div>
                          )}
                          </div>
                          
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add demographic tag (e.g., parents, students)"
                            value={newDemographicTag}
                            onChange={(e) => setNewDemographicTag(e.target.value)}
                            className="rounded-lg border-gray-200"
                          />
                          <Button 
                            type="button" 
                            onClick={addDemographicTag}
                            disabled={!newDemographicTag}
                            className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                          >
                            Add
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">Add demographic groups that are relevant to your business</p>
                              </div>
                    </div>
                    
                    <Separator className="my-6" />
                      
                    {/* Visit & Spending Thresholds Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Visit & Spending Thresholds</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Frequent Visitor Threshold */}
                        <div className="space-y-2">
                          <Label htmlFor="frequentVisitorThreshold" className="text-sm font-medium text-gray-700">
                            Frequent Visitor Threshold
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="frequentVisitorThreshold"
                              type="number"
                              min="1"
                              placeholder="4"
                              value={customerSegments.frequentVisitorThreshold}
                              onChange={(e) => updateCustomerSegments('frequentVisitorThreshold', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                            <span className="text-sm text-gray-600">visits per</span>
                            <Input
                              id="frequentVisitorPeriod"
                              type="number"
                              min="1"
                              placeholder="30"
                              value={customerSegments.frequentVisitorPeriod}
                              onChange={(e) => updateCustomerSegments('frequentVisitorPeriod', e.target.value)}
                              className="w-20 rounded-lg border-gray-200"
                            />
                            <span className="text-sm text-gray-600">days</span>
                          </div>
                          <p className="text-xs text-gray-500">Number of visits in a period to be considered frequent</p>
                        </div>
                        
                        {/* High Spender Threshold */}
                        <div className="space-y-2">
                          <Label htmlFor="highSpenderThreshold" className="text-sm font-medium text-gray-700">
                            High Spender Threshold
                          </Label>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">$</span>
                            <Input
                              id="highSpenderThreshold"
                              type="number"
                              min="1"
                              placeholder="100"
                              value={customerSegments.highSpenderThreshold}
                              onChange={(e) => updateCustomerSegments('highSpenderThreshold', e.target.value)}
                              className="rounded-lg border-gray-200"
                            />
                            <span className="text-sm text-gray-600">per</span>
                            <Input
                              id="highSpenderPeriod"
                              type="number"
                              min="1"
                              placeholder="30"
                              value={customerSegments.highSpenderPeriod}
                              onChange={(e) => updateCustomerSegments('highSpenderPeriod', e.target.value)}
                              className="w-20 rounded-lg border-gray-200"
                            />
                            <span className="text-sm text-gray-600">days</span>
                          </div>
                          <p className="text-xs text-gray-500">Spending amount in a period to be considered a high spender</p>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-6" />
                    
                    {/* Cohort-Specific Thresholds Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Customer Cohort Definitions</h3>
                      
                      <div className="bg-white p-4 rounded-lg border border-gray-100 mb-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">What are Customer Cohorts?</h4>
                        <p className="text-xs text-gray-700 mb-3">
                          Customer cohorts are groups of customers categorized by their behavior patterns, especially their transaction history. 
                          By segmenting customers this way, you can deliver personalized experiences that match where they are in their customer journey.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="bg-gray-50 p-2 rounded-md">
                            <h5 className="font-medium text-gray-800">Why Cohorts Matter</h5>
                            <p className="text-gray-600 mt-1">
                              Different customer groups respond to different incentives. New customers need onboarding, active customers need appreciation, 
                              and dormant customers need re-engagement offers.
                            </p>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded-md">
                            <h5 className="font-medium text-gray-800">How the Agent Uses Cohorts</h5>
                            <p className="text-gray-600 mt-1">
                              Your agent tailors reward messaging, offer values, and redemption conditions based on cohort data to maximize engagement 
                              and return on investment.
                            </p>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded-md">
                            <h5 className="font-medium text-gray-800">Business Impact</h5>
                            <p className="text-gray-600 mt-1">
                              Properly defined cohorts can increase redemption rates by 30-40% and help recover at-risk customers before they fully churn.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-blue-800 mb-1">
                              <strong>Café-Optimized Customer Segments</strong>
                            </p>
                            <p className="text-xs text-blue-700">
                              These thresholds are optimized for businesses with frequent customer visits like cafés, 
                              bakeries, and quick-service restaurants.
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Create a new object with updated values to ensure state updates properly
                              const updatedSegments = {
                                ...customerSegments,
                                newCustomerThreshold: '14',
                                newCustomerVisitLimit: '2',
                                activeThreshold: '14',
                                activeMinVisits: '2',
                                dormantCohortThreshold: '60',
                                churnedThreshold: '60',
                                resurrectedThreshold: '14'
                              };
                              
                              // Update the entire object at once
                              setCustomerSegments(updatedSegments);
                              
                              // Show a toast notification to confirm the update
                              toast({
                                title: "Café-Optimized Defaults Applied",
                                description: "Cohort thresholds have been set to values ideal for frequent-visit businesses.",
                              });
                            }}
                            className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 text-xs h-8"
                          >
                            Use Café Defaults (Recommended)
                          </Button>
                        </div>
                      </div>
                      
                      <div className="overflow-hidden bg-white border border-gray-100 rounded-xl shadow-sm mb-6">
                        <div className="grid grid-cols-5 gap-2 bg-gray-50 p-3 border-b border-gray-100 text-xs font-medium text-gray-700">
                          <div>Cohort</div>
                          <div>Definition</div>
                          <div>How It's Calculated</div>
                          <div>Your Settings</div>
                          <div>Why It Matters</div>
                        </div>
                        
                        <div className="divide-y divide-gray-100">
                          {/* New Customers */}
                          <div className="grid grid-cols-5 gap-2 p-3 items-center text-sm">
                            <div className="font-medium text-blue-700">New</div>
                            <div className="text-xs">Recent first-time customers with few visits</div>
                            <div className="text-xs text-gray-600">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>First visit within last X days</li>
                                <li>Total lifetime visits ≤ Y</li>
                              </ul>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={customerSegments.newCustomerThreshold || "14"}
                                  onChange={(e) => updateCustomerSegments('newCustomerThreshold', e.target.value)}
                                  className="w-16 h-7 text-xs rounded-md"
                                />
                                <span className="text-xs">days since first visit</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={customerSegments.newCustomerVisitLimit || "2"}
                                  onChange={(e) => updateCustomerSegments('newCustomerVisitLimit', e.target.value)}
                                  className="w-16 h-7 text-xs rounded-md"
                                />
                                <span className="text-xs">max lifetime visits</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">Perfect time for welcome offers and onboarding rewards</div>
                          </div>
                          
                          {/* Active Customers */}
                          <div className="grid grid-cols-5 gap-2 p-3 items-center text-sm">
                            <div className="font-medium text-green-700">Active</div>
                            <div className="text-xs">Regular customers who visit frequently</div>
                            <div className="text-xs text-gray-600">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Last visit within X days</li>
                              </ul>
                            </div>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="1"
                                value={customerSegments.activeThreshold || "14"}
                                onChange={(e) => updateCustomerSegments('activeThreshold', e.target.value)}
                                className="w-16 h-7 text-xs rounded-md"
                              />
                              <span className="text-xs">days since last visit</span>
                            </div>
                            <div className="text-xs text-gray-600">Your loyal customers - focus on upselling and increasing basket size</div>
                          </div>
                          
                          {/* Dormant Customers */}
                          <div className="grid grid-cols-5 gap-2 p-3 items-center text-sm">
                            <div className="font-medium text-amber-700">Dormant</div>
                            <div className="text-xs">Customers who haven't visited recently</div>
                            <div className="text-xs text-gray-600">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Last visit between X and Y days ago</li>
                                <li>Not yet considered churned</li>
                              </ul>
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-1 text-xs">
                                <span>Between</span>
                                <Input
                                  type="number"
                                  min="1"
                                  value={customerSegments.activeThreshold || "14"}
                                  disabled
                                  className="w-12 h-7 text-xs rounded-md bg-gray-50"
                                />
                                <span>and</span>
                                <Input
                                  type="number"
                                  min="1"
                                  value={customerSegments.dormantCohortThreshold || "60"}
                                  onChange={(e) => updateCustomerSegments('dormantCohortThreshold', e.target.value)}
                                  className="w-16 h-7 text-xs rounded-md"
                                />
                                <span>days since last visit</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-600">Time for "We miss you" campaigns with gentle incentives</div>
                          </div>
                          
                          {/* Churned Customers */}
                          <div className="grid grid-cols-5 gap-2 p-3 items-center text-sm">
                            <div className="font-medium text-red-700">Churned</div>
                            <div className="text-xs">Long-term inactive customers</div>
                            <div className="text-xs text-gray-600">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Last visit more than X days ago</li>
                                <li>Considered lost customers</li>
                              </ul>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span>More than</span>
                              <Input
                                type="number"
                                min="1"
                                value={customerSegments.churnedThreshold || "60"}
                                onChange={(e) => updateCustomerSegments('churnedThreshold', e.target.value)}
                                className="w-16 h-7 text-xs rounded-md"
                              />
                              <span>days since last visit</span>
                            </div>
                            <div className="text-xs text-gray-600">Requires strong win-back offers or partnerships</div>
                          </div>
                          
                          {/* Resurrected Customers */}
                          <div className="grid grid-cols-5 gap-2 p-3 items-center text-sm">
                            <div className="font-medium text-purple-700">Resurrected</div>
                            <div className="text-xs">Previously dormant or churned who just returned</div>
                            <div className="text-xs text-gray-600">
                              <ul className="list-disc pl-4 space-y-1">
                                <li>Recent visit within X days</li>
                                <li>Was previously dormant or churned</li>
                              </ul>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                              <span>Within</span>
                              <Input
                                type="number"
                                min="1"
                                value={customerSegments.resurrectedThreshold || "14"}
                                onChange={(e) => updateCustomerSegments('resurrectedThreshold', e.target.value)}
                                className="w-16 h-7 text-xs rounded-md"
                              />
                              <span>days after returning</span>
                            </div>
                            <div className="text-xs text-gray-600">Critical re-engagement period - welcome them back warmly</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-800 mb-2">How Customer Cohorts Work:</h4>
                        <ul className="text-xs text-gray-600 space-y-2">
                          <li><strong>Evaluation Order:</strong> Customers are checked in this order: Resurrected → New → Active → Dormant → Churned</li>
                          <li><strong>Customer Data Used:</strong> First visit date, last visit date, total visit count, and visit frequency</li>
                          <li><strong>Café Recommendation:</strong> For coffee shops, bakeries, and quick-service restaurants, the default values work well</li>
                          <li><strong>Business Impact:</strong> These segments help target the right offers to the right customers at the right time</li>
                        </ul>
                      </div>
                      
                      {/* Visual Timeline */}
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-800 mb-3">Customer Cohorts Based on Last Transaction Date:</h4>
                        
                        {/* Cohort segments as cards instead of timeline */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {/* Active segment */}
                          <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-4 bg-green-500 rounded-full"></div>
                              <h5 className="font-medium text-green-800">Active</h5>
                            </div>
                            <p className="text-xs text-green-700">
                              Most recent transaction within last {customerSegments.activeThreshold || "14"} days
                            </p>
                          </div>
                          
                          {/* Dormant segment */}
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-4 bg-amber-500 rounded-full"></div>
                              <h5 className="font-medium text-amber-800">Dormant</h5>
                            </div>
                            <p className="text-xs text-amber-700">
                              Most recent transaction between {customerSegments.activeThreshold || "14"} and {customerSegments.dormantCohortThreshold || "60"} days ago
                            </p>
                          </div>
                          
                          {/* Churned segment */}
                          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-4 bg-red-500 rounded-full"></div>
                              <h5 className="font-medium text-red-800">Churned</h5>
                            </div>
                            <p className="text-xs text-red-700">
                              Most recent transaction more than {customerSegments.churnedThreshold || "60"} days ago
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {/* New segment */}
                          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-4 bg-blue-500 rounded-full"></div>
                              <h5 className="font-medium text-blue-800">New</h5>
                            </div>
                            <p className="text-xs text-blue-700">
                              First transaction within last {customerSegments.newCustomerThreshold || "14"} days and fewer than {customerSegments.newCustomerVisitLimit || "2"} total visits
                            </p>
                          </div>
                          
                          {/* Resurrected segment */}
                          <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-4 w-4 bg-purple-500 rounded-full"></div>
                              <h5 className="font-medium text-purple-800">Resurrected</h5>
                            </div>
                            <p className="text-xs text-purple-700">
                              Was dormant/churned but most recent transaction within last {customerSegments.resurrectedThreshold || "14"} days
                            </p>
                          </div>
                        </div>
                        
                        {/* Simple timeline visualization */}
                        <div className="mt-6 bg-white p-4 rounded-lg border border-gray-200">
                          <h5 className="text-xs font-medium mb-3">Transaction Recency Timeline:</h5>
                          <div className="relative">
                            <div className="h-1 bg-gray-200 w-full mb-4"></div>
                            
                            {/* Timeline labels */}
                            <div className="flex justify-between text-[10px] text-gray-500">
                              <div>Today</div>
                              <div>{customerSegments.activeThreshold || "14"} days ago</div>
                              <div>{customerSegments.dormantCohortThreshold || "60"} days ago</div>
                              <div>Older</div>
                            </div>
                            
                            {/* Timeline segments */}
                            <div className="flex w-full h-6 mt-1">
                              <div className="bg-green-100 text-[10px] text-green-800 flex items-center justify-center" style={{ width: '33%' }}>
                                Active
                              </div>
                              <div className="bg-amber-100 text-[10px] text-amber-800 flex items-center justify-center" style={{ width: '33%' }}>
                                Dormant
                              </div>
                              <div className="bg-red-100 text-[10px] text-red-800 flex items-center justify-center" style={{ width: '34%' }}>
                                Churned
                              </div>
                            </div>
                            
                            {/* Special cases note */}
                            <div className="mt-3 text-[10px] text-gray-600">
                              <p><strong>Note:</strong> New and Resurrected customers are special cases based on additional criteria beyond just transaction recency.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                            
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                            <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div>
                          <h4 className="text-sm font-medium text-blue-800">Why Customer Segmentation Matters</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Detailed customer segmentation allows your AI agent to create highly targeted rewards that resonate with specific customer groups. 
                            This increases engagement and conversion rates while building stronger customer relationships.
                          </p>
                        </div>
                          </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("financial")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        Previous: Financial
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                      </div>
                      <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                          onClick={saveProgress}
                          disabled={isSaving}
                        >
                          {isSaving ? (
                            <>
                              <span className="animate-pulse mr-2">●</span>
                              Saving...
                            </>
                          ) : (
                            "Save Progress"
                          )}
                        </Button>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("reward-constraints")}>
                            Next: Reward Constraints
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                          </div>
                    </CardFooter>
                  </Card>
                )}
              
              {activeTab === "reward-constraints" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                    <div>
                      <CardTitle className="text-2xl">
                        <span className="gradient-text">Reward Constraints</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Configure the rules and limitations for your rewards program
                      </CardDescription>
                          </div>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Allowed Offer Types Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Allowed Offer Types</h3>
                      <p className="text-sm text-gray-600">Select which reward types the agent is allowed to create</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Gift className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Free Item</h4>
                                <p className="text-xs text-gray-500 mt-1">E.g., Free coffee, dessert, or side item with purchase</p>
                            </div>
                        </div>
                            <Switch 
                              checked={rewardConstraints.allowedOfferTypes.freeItem}
                              onCheckedChange={(checked) => updateRewardConstraintOfferType('freeItem', checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                          </div>
                          
                        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                                <Percent className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Percentage Discount (%)</h4>
                                <p className="text-xs text-gray-500 mt-1">E.g., 15% off your next purchase, 20% off specific items</p>
                            </div>
                        </div>
                            <Switch 
                              checked={rewardConstraints.allowedOfferTypes.percentageDiscount}
                              onCheckedChange={(checked) => updateRewardConstraintOfferType('percentageDiscount', checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                              </div>
                          </div>
                          
                        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center">
                                <BadgeDollarSign className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Fixed Amount ($)</h4>
                                <p className="text-xs text-gray-500 mt-1">E.g., $5 off your order, $10 off when you spend $50+</p>
                            </div>
                        </div>
                            <Switch 
                              checked={rewardConstraints.allowedOfferTypes.fixedAmount}
                              onCheckedChange={(checked) => updateRewardConstraintOfferType('fixedAmount', checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                          </div>
                          
                        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                                <ShoppingBag className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Buy X Get Y</h4>
                                <p className="text-xs text-gray-500 mt-1">E.g., Buy one get one free, Buy 3 get 1 free</p>
                            </div>
                        </div>
                            <Switch
                              checked={rewardConstraints.allowedOfferTypes.buyXGetY}
                              onCheckedChange={(checked) => updateRewardConstraintOfferType('buyXGetY', checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                        </div>
                          </div>
                          
                        <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-pink-50 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-pink-600" />
                              </div>
                          <div>
                                <h4 className="font-medium">Mystery Gift</h4>
                                <p className="text-xs text-gray-500 mt-1">E.g., Surprise reward revealed at checkout, random prize</p>
                              </div>
                            </div>
                            <Switch 
                              checked={rewardConstraints.allowedOfferTypes.mysteryGift}
                              onCheckedChange={(checked) => updateRewardConstraintOfferType('mysteryGift', checked)}
                              className="data-[state=checked]:bg-blue-600"
                            />
                          </div>
                        </div>
                      </div>
                          </div>
                          
                    <Separator className="my-6" />
                    
                    
                    
                    
                    {/* Reward Duration & Display Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Reward Duration & Display</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        
                            <div className="space-y-2">
                          <Label htmlFor="concurrencyCeiling" className="text-sm font-medium text-gray-700">
                            Concurrency Ceiling
                          </Label>
                              <div className="flex items-center gap-2">
                                <Input
                              id="concurrencyCeiling"
                                  type="number"
                                  min="1"
                              max="10"
                              placeholder="4"
                              value={rewardConstraints.concurrencyCeiling}
                              onChange={(e) => updateRewardConstraints('concurrencyCeiling', e.target.value)}
                              className="max-w-[100px] rounded-lg border-gray-200"
                            />
                            <span className="text-sm text-gray-600">active rewards</span>
                              </div>
                          <p className="text-xs text-gray-500">Maximum number of rewards displayed to a customer at once</p>
                            </div>
                          
                        <div className="space-y-2">
                          
                            </div>
                            
                        <div className="space-y-2 md:col-span-2">
                          
                            </div>
                        </div>
                      </div>
                      
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-4">
                        <div className="flex items-start gap-3">
                        <Gift className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                          <h4 className="text-sm font-medium text-blue-800">Reward Constraints Impact</h4>
                          <p className="text-xs text-blue-700 mt-1">
                            Setting clear constraints helps your AI agent create rewards that align with your business goals and customer expectations.
                            These parameters ensure rewards are valuable but sustainable, and presented at the right time and place.
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("customer-segments")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        Previous: Customer Segments
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                    </div>
                      <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                          onClick={saveProgress}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span className="animate-pulse mr-2">●</span>
                            Saving...
                              </>
                            ) : (
                          "Save Progress"
                            )}
                          </Button>
                      <Button className="gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg" onClick={() => setActiveTab("messaging")}>
                        Next: Messaging
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}

              {activeTab === "messaging" && (
                <Card className="border-0 shadow-md apple-card">
                  <CardHeader className="pb-2">
                    <div>
                      <CardTitle className="text-2xl">
                        <span className="gradient-text">Messaging</span>
                      </CardTitle>
                      <CardDescription className="text-gray-500 mt-1">
                        Configure messaging constraints for your rewards
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-8 pt-4">
                    {/* Restricted Keywords Section */}
                      <div className="space-y-4">
                      <h3 className="text-lg font-medium gradient-text">Restricted Keywords</h3>
                      <p className="text-sm text-gray-600">Specify words that should not be used in reward messaging</p>
                      
                      <div className="space-y-4">
                        <div className="space-y-4">
                          <Label htmlFor="restrictedKeywords" className="text-sm font-medium text-gray-700">
                            Keywords to Avoid
                          </Label>
                          <Input
                            id="restrictedKeywords"
                            placeholder="e.g., free, guaranteed, unlimited, best, cheapest"
                            value={messagingInputs.restrictedKeywords || ""}
                            onChange={(e) => updateMessagingInputs('restrictedKeywords', e.target.value)}
                            className="rounded-lg border-gray-200"
                          />
                          <p className="text-xs text-gray-500">
                            Enter comma-separated words that should be avoided in reward messaging. 
                            These might include legally sensitive terms or words that don't align with your brand voice.
                          </p>
                            </div>
                            
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Common Restricted Terms</h4>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {["free", "guaranteed", "unlimited", "best", "cheapest", "discount", "sale", "limited time", "exclusive", "secret"].map(keyword => (
                              <Badge 
                                key={keyword}
                            variant="outline" 
                                className="cursor-pointer px-3 py-1.5 rounded-full transition-all bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                            onClick={() => {
                                  const currentKeywords = messagingInputs.restrictedKeywords || "";
                                  const keywordArray = currentKeywords.split(',').map(k => k.trim()).filter(k => k !== "");
                                  
                                  if (!keywordArray.includes(keyword)) {
                                    const newKeywords = [...keywordArray, keyword].join(', ');
                                    updateMessagingInputs('restrictedKeywords', newKeywords);
                                  }
                                }}
                              >
                                + {keyword}
                              </Badge>
                            ))}
                            </div>
                          <p className="text-xs text-gray-500 mt-2">Click to add these common restricted terms to your list</p>
                          </div>
                            </div>
                            
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-6">
                        <div className="flex items-start gap-3">
                          <MessageSquareText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-800">Why Restricted Keywords Matter</h4>
                            <p className="text-xs text-blue-700 mt-1">
                              Restricting certain keywords helps ensure your rewards messaging complies with regulations and 
                              maintains your brand standards. This prevents potential legal issues and keeps your messaging 
                              consistent with your brand voice.
                            </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t p-6">
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                        className="flex items-center gap-1 rounded-lg"
                        onClick={() => setActiveTab("reward-constraints")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                          </svg>
                        Previous: Reward Constraints
                        </Button>
                      <Button variant="outline" className="rounded-lg">Reset</Button>
                      </div>
                      <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                        className="border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg" 
                          onClick={saveProgress}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span className="animate-pulse mr-2">●</span>
                              Saving...
                              </>
                            ) : (
                            "Save Progress"
                            )}
                          </Button>
                      <Button 
                        className="gap-2 bg-green-600 hover:bg-green-700 rounded-lg" 
                        onClick={handleDoneClick}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <span className="animate-pulse mr-2">●</span>
                            Saving...
                          </>
                        ) : (
                          <>
                            Done
                            <CheckCircle className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 