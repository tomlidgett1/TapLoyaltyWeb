"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc, setDoc, arrayUnion } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, Edit, MoreHorizontal, Plus, Trash, ArrowLeft, ArrowUp, ArrowDown, CheckCircle, XCircle, User, Coffee, DollarSign, ShoppingBag, Award, Gift, Sparkles, TrendingUp, Zap, Globe, ChevronUp, Users, Info } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { 
  Select, 
  SelectContent, 
  SelectGroup, 
  SelectItem, 
  SelectLabel, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import {
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Customer {
  id: string;
  abn?: string;
  ageGroup?: string;
  badge?: number;
  basicConsentId?: string;
  basicUserId?: string;
  businessPreferences?: string[];
  consumerID?: string;
  createdAt?: string;
  customerId?: string;
  email?: string;
  fcmToken?: string;
  firstName?: string;
  fullName?: string;
  gender?: string;
  hasActiveConnection?: boolean;
  interests?: string[];
  lastConnectionCheck?: string;
  lastConnectionId?: string;
  lastKnownLocation?: {
    latitude?: number;
    longitude?: number;
    suburb?: string;
    updatedAt?: string;
  };
  lastName?: string;
  lifetimeTapPoints?: number;
  location?: {
    address?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    updatedAt?: string;
  };
  mobileNumber?: string;
  occupation?: string;
  profilePictureUrl?: string;
  referralCode?: string;
  signInMethod?: string;
  tapPoints?: number;
  totalRedemptions?: number;
  updatedAt?: string;
  [key: string]: any;
}

interface Merchant {
  id: string;
  abn?: string;
  address?: {
    postcode?: string;
    state?: string;
    street?: string;
    suburb?: string;
    country?: string;
    countryCode?: string;
    isoCountryCode?: string;
    subAdministrativeArea?: string;
    subLocality?: string;
  };
  businessEmail?: string;
  businessPhone?: string;
  businessType?: string;
  defaultMultiplier?: number;
  displayAddress?: string;
  hasIntroductoryReward?: boolean;
  inlandWater?: string;
  introductoryRewardId?: string;
  lastUpdated?: string;
  legalName?: string;
  location?: {
    address?: string;
    areaOfInterest?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    displayAddress?: string;
  };
  logoUrl?: string;
  merchantId?: string;
  merchantName?: string;
  merchantPoints?: number;
  notifications?: {
    customerAnniversary?: boolean;
    customerBirthday?: boolean;
    customerFirstPurchase?: boolean;
    customerMilestone?: boolean;
    dailySummary?: boolean;
    lowInventory?: boolean;
    monthlySummary?: boolean;
    paymentIssues?: boolean;
    pointsAwarded?: boolean;
    rewardCreated?: boolean;
    rewardExpiring?: boolean;
    rewardRedeemed?: boolean;
    salesTarget?: boolean;
    securityAlerts?: boolean;
    systemUpdates?: boolean;
    weeklySummary?: boolean;
  };
  ocean?: string;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  operatingHours?: {
    monday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    tuesday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    wednesday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    thursday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    friday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    saturday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    sunday?: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    };
    [key: string]: {
      open?: string;
      close?: string;
      isClosed?: boolean;
    } | undefined;
  };
  paymentProvider?: string;
  pointOfSale?: string;
  primaryEmail?: string;
  representative?: {
    email?: string;
    name?: string;
    phone?: string;
  };
  status?: string;
  timeZone?: string;
  tradingName?: string;
  [key: string]: any;
}

interface FunctionConfig {
  name: string;
  schedule: string;
  timeZone: string;
  memory: string;
  timeoutSeconds: number;
  secrets: string[];
  enabled: boolean;
  description: string;
  code: string;
}

interface Reward {
  id: string;
  rewardName?: string;
  rewardId?: string;
  merchantId?: string;
  createdAt?: string;
  collection: 'global' | 'merchant' | 'customer';
  collectionPath: string;
  customerId?: string;
  merchantName?: string;
  customerName?: string;
  [key: string]: any;
}

export default function AdminMerchants() {
  const router = useRouter();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  const [currentView, setCurrentView] = useState<'merchants' | 'customers' | 'functions' | 'rewards' | 'programs' | 'introRewards' | 'createRewards' | 'networkRewards'>('merchants');
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'advanced'>('standard');
  const [editingCell, setEditingCell] = useState<{
    merchantId: string;
    field: string;
    value: any;
  } | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Merchant | string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [customerSortConfig, setCustomerSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [newMerchant, setNewMerchant] = useState<Partial<Merchant>>({
    tradingName: "",
    businessType: "",
    status: "active",
    address: {
      street: "",
      suburb: "",
      postcode: "",
      state: ""
    }
  });

  // State for functions tab
  const [functions, setFunctions] = useState<FunctionConfig[]>([{
    name: "createRewards",
    schedule: "0 */12 * * *",
    timeZone: "Australia/Melbourne",
    memory: "1GiB",
    timeoutSeconds: 540,
    secrets: ["OPENAI_API_KEY"],
    enabled: true,
    description: "Creates personalized rewards for customers every 12 hours",
    code: `const { OpenAI } = await import("openai");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MAX_WRITES_PER_BATCH = 500;
let batch = db.batch();
let writes = 0;

try {
  const merchantsSnap = await db.collection("merchants").get();
  logger.info(\`Found \${merchantsSnap.size} merchants.\`);

  for (const merchantDoc of merchantsSnap.docs) {
    const merchantId = merchantDoc.id;
    const merchantData = merchantDoc.data();
    const { businessInsights } = merchantData || {};

    const customersSnap = await db.collection(\`merchants/\${merchantId}/customers\`).get();
    if (customersSnap.empty) {
      logger.info(\`Merchant \${merchantId} has no customers → skipping\`);
      continue;
    }

    for (const customerDoc of customersSnap.docs) {
      const customerId = customerDoc.id;
      const customerData = customerDoc.data();

      // Count existing agent rewards for this customer for this merchant
      const rewardsSnap = await db
        .collection(\`customers/\${customerId}/rewards\`)
        .where("programtype", "==", "agent")
        .where("merchantId", "==", merchantId)
        .where("redeemable", "==", true)
        .where("visible", "==", true)
        .get();

      if (rewardsSnap.size >= 4) {
        logger.info(\`Customer \${customerId} at merchant \${merchantId} already has \${rewardsSnap.size} agent rewards → skipping\`);
        continue;
      }

      const numToCreate = 4 - rewardsSnap.size;

      const baseSpecs = [
        { conditionsType: "none", offeringType: "Discount Voucher" },
        { conditionsType: "none", offeringType: "Loyalty Bonus" },
        { conditionsType: "optional", offeringType: "Exclusive Access Pass" },
        { conditionsType: "optional", offeringType: "Free Gift" },
      ];
      const rewardSpecs = baseSpecs.slice(0, numToCreate);

      for (const spec of rewardSpecs) {
        const now = new Date();
        const expiry = new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12 hours later

        const conditionInstruction =
          spec.conditionsType === "none"
            ? "This reward must have no conditions; return an empty conditions array."
            : "This reward can include conditions if they make sense based on the data.";

        const promptContent = \`Create a personalized reward for customer \${customerId} using these customer metrics: \${JSON.stringify(customerData)}.
Also consider the merchant's business insights: \${JSON.stringify(businessInsights)}.
\${conditionInstruction}
This reward is a \${spec.offeringType} offering. Generate a completely unique, creative, and distinct reward that differs from any other offering.
Limit to customerLimit = 1.
Ensure the reward title (rewardName) is fantastic, customer-facing, max 20 characters.
Ensure the reward description is enticing, customer-facing, max 50 characters.\`;

        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            {
              role: "system",
              content: "You are a conversational assistant helping users create reward programs for their customers.",
            },
            { role: "user", content: promptContent },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_reward",
                description: "Create a personalized reward",
                parameters: {
                  type: "object",
                  properties: {
                    rewardName: { type: "string" },
                    description: { type: "string" },
                    isActive: { type: "boolean" },
                    pointsCost: { type: "number" },
                    rewardVisibility: {
                      type: "string",
                      enum: ["global", "private"],
                    },
                    customers: {
                      type: "array",
                      items: { type: "string" },
                    },
                    voucherAmount: { type: "number" },
                    delayedVisibility: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        value: { type: "number" },
                      },
                    },
                    conditions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: [
                              "minimumLifetimeSpend",
                              "minimumTransactions",
                              "maximumTransactions",
                              "minimumPointsBalance",
                              "membershipLevel",
                              "daysSinceJoined",
                              "daysSinceLastVisit",
                            ],
                          },
                          value: { type: "number" },
                        },
                      },
                    },
                    limitations: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: ["customerLimit", "totalRedemptionLimit"],
                          },
                          value: { type: "number" },
                        },
                      },
                    },
                  },
                  required: [
                    "rewardName",
                    "description",
                    "isActive",
                    "pointsCost",
                    "rewardVisibility",
                    "customers",
                    "conditions",
                    "limitations",
                  ],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "create_reward" },
          },
        });

        const toolCall = aiResponse.choices[0].message.tool_calls?.[0];
        if (!toolCall) {
          throw new Error(\`Invalid tool response for merchant \${merchantId}, customer \${customerId}\`);
        }

        const rewardJSON = JSON.parse(toolCall.function.arguments);

        // Enforce business logic
        rewardJSON.conditions = spec.conditionsType === "none" ? [] : rewardJSON.conditions;
        rewardJSON.limitations = [{ type: "customerLimit", value: 1 }];
        rewardJSON.programtype = "agent";
        rewardJSON.rewardVisibility = "global";
        rewardJSON.pin = "1111";
        rewardJSON.createdAt = now;
        rewardJSON.expiryDate = expiry;
        rewardJSON.customers = [customerId];

        // Write to Firestore
        const rewardId = db.collection("rewards").doc().id;

        batch.set(db.doc(\`merchants/\${merchantId}/rewards/\${rewardId}\`), rewardJSON);
        writes++;

        batch.set(db.doc(\`customers/\${customerId}/rewards/\${rewardId}\`), {
          ...rewardJSON,
          merchantId,
          redeemable: true,
          visible: true,
        });
        writes++;

        batch.set(db.doc(\`rewards/\${rewardId}\`), {
          ...rewardJSON,
          merchantId,
          redeemable: true,
          visible: true,
        });
        writes++;

        logger.info(\`Created reward \${rewardId} for merchant \${merchantId}, customer \${customerId}\`);

        if (writes >= MAX_WRITES_PER_BATCH) {
          logger.info(\`Committing batch of \${writes} writes.\`);
          await batch.commit();
          batch = db.batch();
          writes = 0;
        }
      }
    }
  }

  if (writes > 0) {
    logger.info(\`Final commit of \${writes} writes.\`);
    await batch.commit();
  }

  logger.info("✅ createRewards completed.");
} catch (err) {
  logger.error("❌ Error in createRewards:", err);
}`
  }]);
  const [editingFunction, setEditingFunction] = useState<FunctionConfig | null>(null);
  const [isEditFunctionDialogOpen, setIsEditFunctionDialogOpen] = useState(false);
  const [isAddFunctionDialogOpen, setIsAddFunctionDialogOpen] = useState(false);
  const [newFunction, setNewFunction] = useState<FunctionConfig>({
    name: "",
    schedule: "0 0 * * *", // Default to daily at midnight
    timeZone: "Australia/Melbourne",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [],
    enabled: true,
    description: "",
    code: ""
  });

  // Rewards state
  const [selectedRewards, setSelectedRewards] = useState<string[]>([]);
  const [isDeleteRewardDialogOpen, setIsDeleteRewardDialogOpen] = useState(false);
  const [isDeleteAllRewardsDialogOpen, setIsDeleteAllRewardsDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<Reward | null>(null);
  
  // Merchants state for multi-select
  const [selectedMerchants, setSelectedMerchants] = useState<string[]>([]);
  const [isDeleteSelectedMerchantsDialogOpen, setIsDeleteSelectedMerchantsDialogOpen] = useState(false);
  
  // Customers state for multi-select
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [isDeleteSelectedCustomersDialogOpen, setIsDeleteSelectedCustomersDialogOpen] = useState(false);
  
  const [rewardSortConfig, setRewardSortConfig] = useState<{
    key: string;
    direction: 'ascending' | 'descending';
  } | null>(null);
  const [rewardFilters, setRewardFilters] = useState({
    collection: 'all', // 'all', 'global', 'merchant', 'customer'
    visible: 'all', // 'all', 'true', 'false'
    redeemable: 'all', // 'all', 'true', 'false'
  });
  const [maxRewardsToShow, setMaxRewardsToShow] = useState(1000);

  // Programs state (copied from create-recurring-reward-dialog.tsx)
  const [selectedMerchantForProgram, setSelectedMerchantForProgram] = useState<string>("");
  const [activeTab, setActiveTab] = useState("coffee");
  const [showCoffeeForm, setShowCoffeeForm] = useState(false);
  const [showVoucherForm, setShowVoucherForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showCashbackForm, setShowCashbackForm] = useState(false);
  const [coffeeFormData, setCoffeeFormData] = useState({
    pin: '',
    frequency: '5',
    minimumSpend: '0',
    minimumTimeBetween: '0',
  });
  const [voucherFormData, setVoucherFormData] = useState({
    rewardName: '',
    description: '',
    pin: '',
    spendRequired: '100',
    discountAmount: '10',
    isActive: true,
  });
  const [transactionFormData, setTransactionFormData] = useState({
    pin: '',
    rewardName: '',
    description: '',
    transactionThreshold: '5',
    rewardType: 'dollar_voucher' as 'dollar_voucher' | 'free_item',
    voucherAmount: '10',
    freeItemName: '',
    conditions: '',
    iterations: '15',
    isActive: true
  });
  const [cashbackFormData, setCashbackFormData] = useState({
    cashbackRate: '2',
    programName: 'Tap Cash',
    description: 'Earn cashback on every purchase',
    isActive: true
  });
  
  // Intro Rewards state
  const [selectedMerchantForIntroReward, setSelectedMerchantForIntroReward] = useState<string>("");
  const [showIntroRewardForm, setShowIntroRewardForm] = useState(false);
  const [introRewardFormData, setIntroRewardFormData] = useState({
    rewardName: "",
    description: "",
    rewardType: "voucher" as "voucher" | "freeItem",
    itemName: "",
    pin: ""
  });
  
  // Create Rewards state (copied from create-reward-popup.tsx)
  const [selectedMerchantForReward, setSelectedMerchantForReward] = useState<string>("");
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [currentRewardStep, setCurrentRewardStep] = useState(1);
  const [rewardFormData, setRewardFormData] = useState({
    // Basic Details
    rewardName: "",
    description: "",
    type: "",
    rewardVisibility: "all",
    specificCustomerIds: [] as string[],
    specificCustomerNames: [] as string[],
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
      daysSinceLastVisit: "",
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
      dayRestrictions: [] as string[],
      useDateRestrictions: false,
      dateRestrictionStart: "",
      dateRestrictionEnd: ""
    },

    // Active Period
    hasActivePeriod: false,
    activePeriod: {
      startDate: "",
      endDate: ""
    },
    
    // Summary text for the reward
    rewardSummary: "",
  });

  // Network Rewards state (copied from network-reward-popup.tsx)
  const [selectedMerchantForNetworkReward, setSelectedMerchantForNetworkReward] = useState<string>("");
  const [showNetworkRewardForm, setShowNetworkRewardForm] = useState(false);
  const [currentNetworkRewardStep, setCurrentNetworkRewardStep] = useState(1);
  const [networkRewardType, setNetworkRewardType] = useState<"dollarOff" | "percentOff">("dollarOff");
  const [currentInfoSlide, setCurrentInfoSlide] = useState(0);
  const [infoBoxesVisible, setInfoBoxesVisible] = useState(true);
  const [networkRewardFormData, setNetworkRewardFormData] = useState({
    rewardName: "",
    description: "",
    discountValue: "10",
    minimumSpend: "50.00",
    networkPointsCost: "100",
    pin: ""
  });
  
  // Program status checking
  const [merchantPrograms, setMerchantPrograms] = useState<Record<string, any>>({});

  // Function to check existing programs for selected merchant
  const checkMerchantPrograms = async (merchantId: string) => {
    if (!merchantId) return {};
    
    try {
      const merchantRef = doc(db, 'merchants', merchantId);
      const merchantDoc = await getDoc(merchantRef);
      
      if (merchantDoc.exists()) {
        const data = merchantDoc.data();
        return {
          coffeeProgram: data.coffeeprogram || false,
          coffeePrograms: data.coffeePrograms || [],
          voucherPrograms: data.voucherPrograms || [],
          transactionPrograms: data.transactionPrograms || [],
          isCashback: data.isCashback || false,
          cashbackProgram: data.cashbackProgram || null,
          introductoryRewardCount: data.introductoryRewardCount || 0,
          introductoryRewardIds: data.introductoryRewardIds || []
        };
      }
      return {};
    } catch (error) {
      console.error("Error checking merchant programs:", error);
      return {};
    }
  };
  
  // Update merchant programs when merchant is selected
  useEffect(() => {
    if (selectedMerchantForProgram) {
      checkMerchantPrograms(selectedMerchantForProgram).then(programs => {
        setMerchantPrograms(prev => ({
          ...prev,
          [selectedMerchantForProgram]: programs
        }));
      });
    }
  }, [selectedMerchantForProgram]);

  // Update merchant programs when intro reward merchant is selected
  useEffect(() => {
    if (selectedMerchantForIntroReward) {
      checkMerchantPrograms(selectedMerchantForIntroReward).then(programs => {
        setMerchantPrograms(prev => ({
          ...prev,
          [selectedMerchantForIntroReward]: programs
        }));
      });
    }
  }, [selectedMerchantForIntroReward]);

  // Update merchant programs when reward creation merchant is selected
  useEffect(() => {
    if (selectedMerchantForReward) {
      checkMerchantPrograms(selectedMerchantForReward).then(programs => {
        setMerchantPrograms(prev => ({
          ...prev,
          [selectedMerchantForReward]: programs
        }));
      });
    }
  }, [selectedMerchantForReward]);

  // Update merchant programs when network reward merchant is selected
  useEffect(() => {
    if (selectedMerchantForNetworkReward) {
      checkMerchantPrograms(selectedMerchantForNetworkReward).then(programs => {
        setMerchantPrograms(prev => ({
          ...prev,
          [selectedMerchantForNetworkReward]: programs
        }));
      });
    }
  }, [selectedMerchantForNetworkReward]);

  // Check authentication on component mount
  useEffect(() => {
    const authStatus = sessionStorage.getItem('adminAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Handle password submission
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '1975') {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuthenticated', 'true');
      setPasswordError("");
      setPasswordInput("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPasswordInput("");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuthenticated');
    setPasswordInput("");
    setPasswordError("");
  };

  useEffect(() => {
    if (currentView === 'merchants') {
      fetchMerchants();
    } else if (currentView === 'customers') {
      fetchCustomers();
    } else if (currentView === 'rewards') {
      fetchRewards();
    }
  }, [currentView]);

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      const merchantsCollection = collection(db, "merchants");
      const merchantsSnapshot = await getDocs(merchantsCollection);
      const merchantsList = merchantsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Merchant[];
      
      setMerchants(merchantsList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching merchants:", error);
      toast({
        title: "Error",
        description: "Failed to fetch merchants",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const customersCollection = collection(db, "customers");
      const customersSnapshot = await getDocs(customersCollection);
      
      const customersList = await Promise.all(customersSnapshot.docs.map(async (docSnapshot) => {
        const customerData = docSnapshot.data();
        const customerId = docSnapshot.id;
        
        // For each customer, find their merchant-specific data for all merchants
        const merchantCustomerRefs = collection(db, "merchants");
        const merchantsSnapshot = await getDocs(merchantCustomerRefs);
        
        interface MerchantCustomerData {
          merchantId: string;
          merchantData: any;
          customerData: {
            totalLifetimeSpend?: number;
            lifetimeTransactionCount?: number;
            redemptionCount?: number;
            [key: string]: any;
          };
        }
        
        const merchantsData = await Promise.all(
          merchantsSnapshot.docs.map(async merchantDoc => {
            // Fix the reference to use customerId instead of doc.id
            const customerRef = doc(db, 'merchants', merchantDoc.id, 'customers', customerId);
            const customerSnap = await getDoc(customerRef);
            if (customerSnap.exists()) {
              return {
                merchantId: merchantDoc.id,
                merchantData: merchantDoc.data(),
                customerData: customerSnap.data()
              } as MerchantCustomerData;
            }
            return null;
          })
        );
        
        // Filter out null values and get relevant stats
        const validMerchantData = merchantsData.filter((data): data is MerchantCustomerData => data !== null);
        
        // Calculate aggregate statistics across all merchants
        const totalLifetimeSpend = validMerchantData.reduce(
          (total, data) => total + (data.customerData.totalLifetimeSpend || 0), 
          0
        );
        const totalTransactions = validMerchantData.reduce(
          (total, data) => total + (data.customerData.lifetimeTransactionCount || 0), 
          0
        );
        const totalRedemptions = validMerchantData.reduce(
          (total, data) => total + (data.customerData.redemptionCount || 0), 
          0
        );
        
        return {
          id: customerId,
          ...customerData,
          totalMerchants: validMerchantData.length,
          totalLifetimeSpend,
          totalTransactions,
          totalRedemptions,
          merchantConnections: validMerchantData.map(data => ({
            merchantId: data.merchantId,
            merchantName: data.merchantData.tradingName || data.merchantData.merchantName,
          }))
        };
      }));
      
      setCustomers(customersList);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const allRewards: Reward[] = [];
      
      // 1. Fetch global rewards from top-level rewards collection
      try {
        const globalRewardsCollection = collection(db, "rewards");
        const globalRewardsSnapshot = await getDocs(globalRewardsCollection);
        
        globalRewardsSnapshot.docs.forEach(doc => {
          const rewardData = doc.data();
          
          // Handle Firestore Timestamp objects
          let createdAtString = '';
          if (rewardData.createdAt) {
            if (rewardData.createdAt.toDate) {
              // It's a Firestore Timestamp
              createdAtString = rewardData.createdAt.toDate().toISOString();
            } else if (typeof rewardData.createdAt === 'string') {
              createdAtString = rewardData.createdAt;
            } else {
              createdAtString = new Date(rewardData.createdAt).toISOString();
            }
          }
          
          allRewards.push({
            id: doc.id,
            rewardName: rewardData.rewardName || rewardData.title || rewardData.name || `Reward ${doc.id.slice(-6)}`,
            rewardId: rewardData.rewardId || doc.id,
            merchantId: rewardData.merchantId,
            createdAt: createdAtString,
            collection: 'global',
            collectionPath: `rewards/${doc.id}`,
            visible: rewardData.visible,
            redeemable: rewardData.redeemable,
            reason: rewardData.reason,
            ...rewardData
          });
        });
      } catch (globalError) {
        console.error("Error fetching global rewards:", globalError);
      }
      
      // 2. Fetch merchant-specific rewards
      try {
        const merchantsCollection = collection(db, "merchants");
        const merchantsSnapshot = await getDocs(merchantsCollection);
        
        for (const merchantDoc of merchantsSnapshot.docs) {
          const merchantData = merchantDoc.data();
          
          try {
            const merchantRewardsCollection = collection(db, `merchants/${merchantDoc.id}/rewards`);
            const merchantRewardsSnapshot = await getDocs(merchantRewardsCollection);
            
            merchantRewardsSnapshot.docs.forEach(doc => {
              const rewardData = doc.data();
              
              // Handle Firestore Timestamp objects
              let createdAtString = '';
              if (rewardData.createdAt) {
                if (rewardData.createdAt.toDate) {
                  // It's a Firestore Timestamp
                  createdAtString = rewardData.createdAt.toDate().toISOString();
                } else if (typeof rewardData.createdAt === 'string') {
                  createdAtString = rewardData.createdAt;
                } else {
                  createdAtString = new Date(rewardData.createdAt).toISOString();
                }
              }
              
              allRewards.push({
                id: `${merchantDoc.id}-${doc.id}`,
                rewardName: rewardData.rewardName || rewardData.title || rewardData.name || `Reward ${doc.id.slice(-6)}`,
                rewardId: rewardData.rewardId || doc.id,
                merchantId: merchantDoc.id,
                merchantName: merchantData.merchantName || merchantData.tradingName,
                createdAt: createdAtString,
                collection: 'merchant',
                collectionPath: `merchants/${merchantDoc.id}/rewards/${doc.id}`,
                visible: rewardData.visible,
                redeemable: rewardData.redeemable,
                reason: rewardData.reason,
                ...rewardData
              });
            });
          } catch (merchantRewardError) {
            console.error(`Error fetching rewards for merchant ${merchantDoc.id}:`, merchantRewardError);
          }
        }
      } catch (merchantError) {
        console.error("Error fetching merchant rewards:", merchantError);
      }
      
      // 3. Fetch customer-specific rewards
      try {
        const customersCollection = collection(db, "customers");
        const customersSnapshot = await getDocs(customersCollection);
        
        for (const customerDoc of customersSnapshot.docs) {
          const customerData = customerDoc.data();
          
          try {
            const customerRewardsCollection = collection(db, `customers/${customerDoc.id}/rewards`);
            const customerRewardsSnapshot = await getDocs(customerRewardsCollection);
            
            customerRewardsSnapshot.docs.forEach(doc => {
              const rewardData = doc.data();
              
              // Handle Firestore Timestamp objects
              let createdAtString = '';
              if (rewardData.createdAt) {
                if (rewardData.createdAt.toDate) {
                  // It's a Firestore Timestamp
                  createdAtString = rewardData.createdAt.toDate().toISOString();
                } else if (typeof rewardData.createdAt === 'string') {
                  createdAtString = rewardData.createdAt;
                } else {
                  createdAtString = new Date(rewardData.createdAt).toISOString();
                }
              }
              
              allRewards.push({
                id: `${customerDoc.id}-${doc.id}`,
                rewardName: rewardData.rewardName || rewardData.title || rewardData.name || `Reward ${doc.id.slice(-6)}`,
                rewardId: rewardData.rewardId || doc.id,
                merchantId: rewardData.merchantId,
                customerId: customerDoc.id,
                customerName: customerData.fullName || `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim(),
                createdAt: createdAtString,
                collection: 'customer',
                collectionPath: `customers/${customerDoc.id}/rewards/${doc.id}`,
                visible: rewardData.visible,
                redeemable: rewardData.redeemable,
                reason: rewardData.reason,
                ...rewardData
              });
            });
          } catch (customerRewardError) {
            console.error(`Error fetching rewards for customer ${customerDoc.id}:`, customerRewardError);
          }
        }
      } catch (customerError) {
        console.error("Error fetching customer rewards:", customerError);
      }
      
      setRewards(allRewards);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching rewards:", error);
      toast({
        title: "Error",
        description: `Failed to fetch rewards: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleEdit = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (merchant: Merchant) => {
    setEditingMerchant(merchant);
    setIsDeleteDialogOpen(true);
  };

  const handleUpdateMerchant = async () => {
    if (!editingMerchant) return;
    
    try {
      const merchantRef = doc(db, "merchants", editingMerchant.id);
      await updateDoc(merchantRef, editingMerchant);
      
      setMerchants(merchants.map(m => 
        m.id === editingMerchant.id ? editingMerchant : m
      ));
      
      toast({
        title: "Success",
        description: "Merchant updated successfully",
      });
      
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating merchant:", error);
      toast({
        title: "Error",
        description: "Failed to update merchant",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMerchant = async () => {
    if (!editingMerchant) return;
    
    try {
      const merchantRef = doc(db, "merchants", editingMerchant.id);
      await deleteDoc(merchantRef);
      
      setMerchants(merchants.filter(m => m.id !== editingMerchant.id));
      
      toast({
        title: "Success",
        description: "Merchant deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting merchant:", error);
      toast({
        title: "Error",
        description: "Failed to delete merchant",
        variant: "destructive"
      });
    }
  };

  const handleCreateMerchant = async () => {
    try {
      const merchantsCollection = collection(db, "merchants");
      const docRef = await addDoc(merchantsCollection, newMerchant);
      
      const newMerchantWithId = {
        id: docRef.id,
        ...newMerchant
      } as Merchant;
      
      setMerchants([...merchants, newMerchantWithId]);
      
      toast({
        title: "Success",
        description: "Merchant created successfully",
      });
      
      setIsCreateDialogOpen(false);
      setNewMerchant({
        tradingName: "",
        businessType: "",
        status: "active",
        address: {
          street: "",
          suburb: "",
          postcode: "",
          state: ""
        }
      });
    } catch (error) {
      console.error("Error creating merchant:", error);
      toast({
        title: "Error",
        description: "Failed to create merchant",
        variant: "destructive"
      });
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    if (editingMerchant) {
      setEditingMerchant({
        ...editingMerchant,
        [field]: value
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    if (editingMerchant) {
      setEditingMerchant({
        ...editingMerchant,
        address: {
          ...editingMerchant.address,
          [field]: value
        }
      });
    }
  };

  const handleNewMerchantFieldChange = (field: string, value: any) => {
    setNewMerchant({
      ...newMerchant,
      [field]: value
    });
  };

  const handleNewMerchantAddressChange = (field: string, value: string) => {
    setNewMerchant({
      ...newMerchant,
      address: {
        ...newMerchant.address,
        [field]: value
      }
    });
  };

  const handleSort = (key: keyof Merchant | string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (sortConfig && sortConfig.key === key) {
      direction = sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    setSortConfig({ key, direction });
  };

  const getSortedMerchants = (merchantsToSort: Merchant[]) => {
    if (!sortConfig) return merchantsToSort;
    
    return [...merchantsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Handle nested properties
      if (sortConfig.key === 'contact') {
        aValue = a.representative?.name || a.primaryEmail || a.businessEmail || '';
        bValue = b.representative?.name || b.primaryEmail || b.businessEmail || '';
      } else if (sortConfig.key === 'location') {
        aValue = a.address?.suburb || '';
        bValue = b.address?.suburb || '';
      } else if (typeof sortConfig.key === 'string' && sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        aValue = keys.reduce((obj: any, key: string) => obj?.[key] ?? '', a);
        bValue = keys.reduce((obj: any, key: string) => obj?.[key] ?? '', b);
      } else {
        // Handle merchantName and tradingName special case (fallback to the other if one is empty)
        if (sortConfig.key === 'merchantName') {
          aValue = a.merchantName || a.tradingName || '';
          bValue = b.merchantName || b.tradingName || '';
        } else if (sortConfig.key === 'tradingName') {
          aValue = a.tradingName || a.merchantName || '';
          bValue = b.tradingName || b.merchantName || '';
        } else {
          aValue = a[sortConfig.key as keyof Merchant] || '';
          bValue = b[sortConfig.key as keyof Merchant] || '';
        }
      }

      // Handle different types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Ensure case-insensitive string comparison for proper alphabetical sorting
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      } else if (aValue === undefined || aValue === null) {
        aValue = ''; // Ensure undefined/null values are handled
      } else if (bValue === undefined || bValue === null) {
        bValue = ''; // Ensure undefined/null values are handled
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const filteredMerchants = merchants.filter(merchant => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (merchant.merchantName || "").toLowerCase().includes(searchLower) ||
      (merchant.tradingName || "").toLowerCase().includes(searchLower) ||
      (merchant.merchantId || "").toLowerCase().includes(searchLower) ||
      (merchant.businessType || "").toLowerCase().includes(searchLower) ||
      (merchant.primaryEmail || "").toLowerCase().includes(searchLower) ||
      (merchant.address?.suburb || "").toLowerCase().includes(searchLower) ||
      (merchant.representative?.name || "").toLowerCase().includes(searchLower) ||
      (merchant.abn || "").toLowerCase().includes(searchLower)
    );
  });

  // Apply sorting after filtering
  const sortedMerchants = getSortedMerchants(filteredMerchants);

  const renderSortIcon = (columnKey: string) => {
    if (sortConfig?.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Add a function to handle inline cell editing
  const handleCellEdit = (merchantId: string, field: string, value: any) => {
    setEditingCell({
      merchantId,
      field,
      value
    });
  };

  const saveCellEdit = async () => {
    if (!editingCell) return;

    try {
      const merchant = merchants.find(m => m.id === editingCell.merchantId);
      if (!merchant) return;

      // Handle nested fields like address.street
      if (editingCell.field.includes('.')) {
        const [parent, child] = editingCell.field.split('.');
        const updatedMerchant = {
          ...merchant,
          [parent]: {
            ...(merchant[parent] || {}),
            [child]: editingCell.value
          }
        };

        const merchantRef = doc(db, "merchants", merchant.id);
        await updateDoc(merchantRef, updatedMerchant);
        
        setMerchants(merchants.map(m => 
          m.id === merchant.id ? updatedMerchant : m
        ));
      } else {
        // Handle direct fields
        const updatedMerchant = {
          ...merchant,
          [editingCell.field]: editingCell.value
        };

        const merchantRef = doc(db, "merchants", merchant.id);
        await updateDoc(merchantRef, updatedMerchant);
        
        setMerchants(merchants.map(m => 
          m.id === merchant.id ? updatedMerchant : m
        ));
      }

      toast({
        title: "Success",
        description: "Field updated successfully",
      });
    } catch (error) {
      console.error("Error updating field:", error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive"
      });
    } finally {
      setEditingCell(null);
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
  };

  // List of all possible merchant fields for advanced view
  const allMerchantFields = [
    { key: 'merchantName', label: 'Merchant Name' },
    { key: 'merchantId', label: 'Merchant ID' },
    { key: 'tradingName', label: 'Trading Name' },
    { key: 'legalName', label: 'Legal Name' },
    { key: 'businessType', label: 'Business Type' },
    { key: 'abn', label: 'ABN' },
    { key: 'status', label: 'Status' },
    { key: 'logoUrl', label: 'Logo URL' },
    { key: 'displayAddress', label: 'Display Address' },
    { key: 'businessEmail', label: 'Business Email' },
    { key: 'businessPhone', label: 'Business Phone' },
    { key: 'primaryEmail', label: 'Primary Email' },
    { key: 'address.street', label: 'Street' },
    { key: 'address.suburb', label: 'Suburb' },
    { key: 'address.postcode', label: 'Postcode' },
    { key: 'address.state', label: 'State' },
    { key: 'address.country', label: 'Country' },
    { key: 'address.countryCode', label: 'Country Code' },
    { key: 'address.isoCountryCode', label: 'ISO Country Code' },
    { key: 'address.subAdministrativeArea', label: 'Sub Administrative Area' },
    { key: 'address.subLocality', label: 'Sub Locality' },
    { key: 'location.address', label: 'Location Address' },
    { key: 'location.displayAddress', label: 'Location Display Address' },
    { key: 'location.areaOfInterest', label: 'Area of Interest' },
    { key: 'location.coordinates.latitude', label: 'Latitude' },
    { key: 'location.coordinates.longitude', label: 'Longitude' },
    { key: 'defaultMultiplier', label: 'Default Multiplier' },
    { key: 'merchantPoints', label: 'Merchant Points' },
    { key: 'pointOfSale', label: 'Point of Sale' },
    { key: 'paymentProvider', label: 'Payment Provider' },
    { key: 'inlandWater', label: 'Inland Water' },
    { key: 'ocean', label: 'Ocean' },
    { key: 'timeZone', label: 'Time Zone' },
    { key: 'onboardingCompleted', label: 'Onboarding Completed' },
    { key: 'onboardingCompletedAt', label: 'Onboarding Completed At' },
    { key: 'hasIntroductoryReward', label: 'Has Introductory Reward' },
    { key: 'introductoryRewardId', label: 'Introductory Reward ID' },
    { key: 'representative.name', label: 'Representative Name' },
    { key: 'representative.email', label: 'Representative Email' },
    { key: 'representative.phone', label: 'Representative Phone' }
  ];

  // Function to get value from a merchant object using a field path (e.g., "location.coordinates.latitude")
  const getNestedValue = (obj: any, path: string): any => {
    const keys = path.split('.');
    return keys.reduce((o, key) => (o || {})[key], obj);
  };

  // Function to render cell content based on field type
  const renderCellContent = (merchant: Merchant, field: string) => {
    const value = getNestedValue(merchant, field);
    
    // If this cell is being edited, show input
    if (editingCell && editingCell.merchantId === merchant.id && editingCell.field === field) {
      return (
        <div className="flex items-center space-x-1">
          <Input
            value={editingCell.value}
            onChange={(e) => setEditingCell({...editingCell, value: e.target.value})}
            autoFocus
            className="h-8 py-1"
          />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={saveCellEdit}
            className="h-7 w-7 p-0"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={cancelCellEdit}
            className="h-7 w-7 p-0"
          >
            <XCircle className="h-4 w-4 text-red-600" />
          </Button>
        </div>
      );
    }
    
    // Handle different field types
    if (field === 'logoUrl') {
      return value ? (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded overflow-hidden mr-2">
            <img 
              src={value} 
              alt="Logo" 
              className="w-full h-full object-cover"
              onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
            />
          </div>
          <span className="text-xs truncate max-w-[150px]">{value}</span>
        </div>
      ) : "—";
    }
    
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      );
    }
    
    if (field === 'status') {
      return (
        <Badge variant={value === "active" ? "default" : "secondary"}>
          {value || "inactive"}
        </Badge>
      );
    }
    
    // Default rendering
    if (value === undefined || value === null) {
      return "—";
    }
    
    return String(value);
  };

  // Handle sorting for customers
  const handleCustomerSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (customerSortConfig && customerSortConfig.key === key) {
      direction = customerSortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    setCustomerSortConfig({ key, direction });
  };

  // Get sorted customers
  const getSortedCustomers = (customersToSort: Customer[]) => {
    if (!customerSortConfig) return customersToSort;
    
    return [...customersToSort].sort((a, b) => {
      let aValue: any = a[customerSortConfig.key as keyof Customer] || '';
      let bValue: any = b[customerSortConfig.key as keyof Customer] || '';
      
      // Handle special cases
      if (customerSortConfig.key === 'fullName') {
        aValue = a.fullName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || '';
        bValue = b.fullName || `${b.firstName || ''} ${b.lastName || ''}`.trim() || '';
      }
      
      // Handle numeric vs string comparisons
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return customerSortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) {
        return customerSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return customerSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    
    return (
      fullName.toLowerCase().includes(searchLower) ||
      (customer.email || '').toLowerCase().includes(searchLower) ||
      (customer.mobileNumber || '').includes(searchLower) ||
      (customer.customerId || '').toLowerCase().includes(searchLower)
    );
  });

  // Apply sorting to filtered customers
  const sortedCustomers = getSortedCustomers(filteredCustomers);

  // Render sort icon for customer table
  const renderCustomerSortIcon = (columnKey: string) => {
    if (customerSortConfig?.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return customerSortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Function management handlers
  const handleEditFunction = (func: FunctionConfig) => {
    setEditingFunction({...func});
    setIsEditFunctionDialogOpen(true);
  };

  const handleUpdateFunction = () => {
    if (!editingFunction) return;
    
    // In a real app, this would call a Firebase Function to update the function code
    setFunctions(functions.map(f => 
      f.name === editingFunction.name ? editingFunction : f
    ));
    
    toast({
      title: "Success",
      description: "Function configuration updated successfully",
    });
    
    setIsEditFunctionDialogOpen(false);
  };

  const handleAddFunction = () => {
    // In a real app, this would call a Firebase Function to create a new function
    setFunctions([...functions, newFunction]);
    
    toast({
      title: "Success",
      description: "Function created successfully",
    });
    
    setIsAddFunctionDialogOpen(false);
    setNewFunction({
      name: "",
      schedule: "0 0 * * *",
      timeZone: "Australia/Melbourne",
      memory: "256MiB",
      timeoutSeconds: 60,
      secrets: [],
      enabled: true,
      description: "",
      code: ""
    });
  };

  const handleToggleFunctionStatus = (functionName: string, enabled: boolean) => {
    // In a real app, this would call a Firebase Function to enable/disable the function
    setFunctions(functions.map(f => 
      f.name === functionName ? {...f, enabled} : f
    ));
    
    toast({
      title: enabled ? "Function Enabled" : "Function Disabled",
      description: `Function ${functionName} has been ${enabled ? "enabled" : "disabled"}`,
    });
  };

  const handleDeleteFunction = (functionName: string) => {
    // In a real app, this would call a Firebase Function to delete the function
    setFunctions(functions.filter(f => f.name !== functionName));
    
    toast({
      title: "Success",
      description: `Function ${functionName} has been deleted`,
    });
  };

  // Reward management functions
  const handleDeleteReward = (reward: Reward) => {
    setRewardToDelete(reward);
    setIsDeleteRewardDialogOpen(true);
  };

  const handleConfirmDeleteReward = async () => {
    if (!rewardToDelete) return;
    
    try {
      // Create document reference from the collection path
      const pathParts = rewardToDelete.collectionPath.split('/');
      const docRef = doc(db, pathParts[0], pathParts[1], pathParts[2], pathParts[3]);
      await deleteDoc(docRef);
      
      setRewards(rewards.filter(r => r.id !== rewardToDelete.id));
      
      toast({
        title: "Success",
        description: "Reward deleted successfully",
      });
      
      setIsDeleteRewardDialogOpen(false);
      setRewardToDelete(null);
    } catch (error) {
      console.error("Error deleting reward:", error);
      toast({
        title: "Error",
        description: "Failed to delete reward",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAllRewards = async () => {
    try {
      setLoading(true);
      
      // Delete all rewards in batches to avoid hitting Firestore limits
      const deletePromises = rewards.map(reward => {
        const pathParts = reward.collectionPath.split('/');
        // Handle different path lengths for different collection types
        const docRef = pathParts.length === 2 
          ? doc(db, pathParts[0], pathParts[1])
          : doc(db, pathParts[0], pathParts[1], pathParts[2], pathParts[3]);
        return deleteDoc(docRef);
      });
      
      await Promise.all(deletePromises);
      
      setRewards([]);
      setSelectedRewards([]);
      
      toast({
        title: "Success",
        description: `Deleted ${rewards.length} rewards successfully`,
      });
      
      setIsDeleteAllRewardsDialogOpen(false);
      setLoading(false);
    } catch (error) {
      console.error("Error deleting all rewards:", error);
      toast({
        title: "Error",
        description: "Failed to delete all rewards",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDeleteSelectedRewards = async () => {
    if (selectedRewards.length === 0) return;
    
    try {
      setLoading(true);
      
      const rewardsToDelete = rewards.filter(r => selectedRewards.includes(r.id));
      const deletePromises = rewardsToDelete.map(reward => {
        const pathParts = reward.collectionPath.split('/');
        // Handle different path lengths for different collection types
        const docRef = pathParts.length === 2 
          ? doc(db, pathParts[0], pathParts[1])
          : doc(db, pathParts[0], pathParts[1], pathParts[2], pathParts[3]);
        return deleteDoc(docRef);
      });
      
      await Promise.all(deletePromises);
      
      setRewards(rewards.filter(r => !selectedRewards.includes(r.id)));
      setSelectedRewards([]);
      
      toast({
        title: "Success",
        description: `Deleted ${rewardsToDelete.length} rewards successfully`,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error deleting selected rewards:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected rewards",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDeleteSelectedMerchants = async () => {
    if (selectedMerchants.length === 0) return;
    
    try {
      setLoading(true);
      
      const merchantsToDelete = merchants.filter(m => selectedMerchants.includes(m.id));
      const deletePromises = merchantsToDelete.map(merchant => {
        const docRef = doc(db, "merchants", merchant.id);
        return deleteDoc(docRef);
      });
      
      await Promise.all(deletePromises);
      
      setMerchants(merchants.filter(m => !selectedMerchants.includes(m.id)));
      setSelectedMerchants([]);
      
      toast({
        title: "Success",
        description: `Deleted ${merchantsToDelete.length} merchants successfully`,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error deleting selected merchants:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected merchants",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  const handleDeleteSelectedCustomers = async () => {
    if (selectedCustomers.length === 0) return;
    
    try {
      setLoading(true);
      
      const customersToDelete = customers.filter(c => selectedCustomers.includes(c.id));
      const deletePromises = customersToDelete.map(customer => {
        const docRef = doc(db, "customers", customer.id);
        return deleteDoc(docRef);
      });
      
      await Promise.all(deletePromises);
      
      setCustomers(customers.filter(c => !selectedCustomers.includes(c.id)));
      setSelectedCustomers([]);
      
      toast({
        title: "Success",
        description: `Deleted ${customersToDelete.length} customers successfully`,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error deleting selected customers:", error);
      toast({
        title: "Error",
        description: "Failed to delete selected customers",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Reward creation functions (copied and adapted from create-reward-popup.tsx)
  const validateRewardBasicDetails = () => {
    const nameValid = rewardFormData.rewardName?.trim() !== '';
    const descriptionValid = rewardFormData.description?.trim() !== '';
    const typeValid = rewardFormData.type?.trim() !== '';
    const pinValid = rewardFormData.pin?.trim() !== '' && rewardFormData.pin?.trim().length === 4;
    const pointsCostValid = rewardFormData.pointsCost?.trim() !== '';
    
    return nameValid && descriptionValid && pointsCostValid && typeValid && pinValid;
  };

  const handleRewardStepChange = (step: number) => {
    if (step < currentRewardStep) {
      setCurrentRewardStep(step);
      return;
    }

    if (step === 2 && !validateRewardBasicDetails()) {
      const missingFields = [];
      
      if (!rewardFormData.rewardName?.trim()) missingFields.push("Reward Name");
      if (!rewardFormData.description?.trim()) missingFields.push("Description");
      if (!rewardFormData.type?.trim()) missingFields.push("Reward Type");
      if (!rewardFormData.pin?.trim() || rewardFormData.pin?.trim().length !== 4) missingFields.push("4-digit PIN");
      if (!rewardFormData.pointsCost?.toString().trim()) missingFields.push("Points Cost");
      
      toast({
        title: "Complete Basic Details",
        description: `Please fill in all required fields before proceeding: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }

    setCurrentRewardStep(step);
  };

  // Generate reward summary
  const generateRewardSummary = () => {
    let summary = "";
    
    switch(rewardFormData.type) {
      case 'percentageDiscount':
        summary = `Get ${rewardFormData.discountValue}% off`;
        if (rewardFormData.discountAppliesTo) {
          summary += ` ${rewardFormData.discountAppliesTo}`;
        } else {
          summary += " your purchase";
        }
        break;
        
      case 'fixedDiscount':
        summary = `$${rewardFormData.discountValue} off`;
        if (rewardFormData.minimumPurchase && Number(rewardFormData.minimumPurchase) > 0) {
          summary += ` when you spend $${rewardFormData.minimumPurchase} or more`;
        } else {
          summary += " your purchase";
        }
        break;
        
      case 'freeItem':
        summary = `Get a free ${rewardFormData.itemName}`;
        if (rewardFormData.itemDescription) {
          summary += ` (${rewardFormData.itemDescription})`;
        }
        break;
        
      case 'bundleOffer':
        summary = `Buy ${rewardFormData.requiredPurchase}, get ${rewardFormData.bonusItem}`;
        if (rewardFormData.bundleDiscountType === 'free') {
          summary += " free";
        } else if (rewardFormData.bundleDiscountType === 'percentage') {
          summary += ` ${rewardFormData.bundleDiscountValue}% off`;
        } else if (rewardFormData.bundleDiscountType === 'fixed') {
          summary += ` $${rewardFormData.bundleDiscountValue} off`;
        }
        break;
        
      case 'mysterySurprise':
        summary = "Surprise reward - redeem to reveal your prize!";
        break;
        
      case 'other':
        const firstLine = rewardFormData.customRewardDetails.split('\n')[0];
        summary = firstLine || "Custom reward";
        break;
        
      default:
        summary = "Reward";
        break;
    }
    
    return summary;
  };

  const saveRewardForMerchant = async () => {
    if (!selectedMerchantForReward) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      // Transform conditions into array of objects
      const conditions = []

      // Transaction conditions
      if (rewardFormData.conditions.minimumTransactions) {
        conditions.push({
          type: "minimumTransactions",
          value: Number(rewardFormData.conditions.minimumTransactions)
        })
      }

      // Membership level condition (always enabled for non-new customers)
      if (rewardFormData.conditions.membershipLevel && rewardFormData.rewardVisibility !== 'new') {
        conditions.push({
          type: "membershipLevel",
          value: rewardFormData.conditions.membershipLevel
        })
      }

      // Transform limitations into array of objects
      const limitations = []

      // Ensure Per Customer Limit is always at least 1
      const perCustomerLimit = rewardFormData.limitations.perCustomerLimit 
        ? Math.max(1, Number(rewardFormData.limitations.perCustomerLimit)) 
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

      // Create the base reward data object
      const rewardData: any = {
        rewardName: rewardFormData.rewardName,
        description: rewardFormData.description,
        programtype: "points",
        isActive: rewardFormData.isActive,
        pointsCost: Math.max(0, Number(rewardFormData.pointsCost)),
        rewardVisibility: rewardFormData.rewardVisibility === 'all' ? 'global' : 
                          rewardFormData.rewardVisibility === 'specific' ? 'specific' : 
                          rewardFormData.rewardVisibility === 'new' ? 'new' : 'conditional',
        newcx: rewardFormData.rewardVisibility === 'new',
        
        // Add reward type specific data
        rewardTypeDetails: {
          type: rewardFormData.type,
        },
        
        delayedVisibility: rewardFormData.rewardVisibility === 'new' ? false : rewardFormData.delayedVisibility,
        conditions,
        limitations,
        pin: rewardFormData.pin,
        createdAt: utcTimestamp,
        status: rewardFormData.isActive ? 'active' : 'inactive',
        merchantId: selectedMerchantForReward,
        updatedAt: utcTimestamp,
        minSpend: 0,
        reason: '',
        customers: [],
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        lastRedeemedAt: null,
        uniqueCustomerIds: [],
        
        // Add the reward summary
        rewardSummary: generateRewardSummary(),
      }
      
      // Add type-specific details
      switch(rewardFormData.type) {
        case 'percentageDiscount':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            discountValue: Number(rewardFormData.discountValue) || 0,
            discountType: 'percentage',
            appliesTo: rewardFormData.discountAppliesTo || 'Any purchase'
          };
          break;
          
        case 'fixedDiscount':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            discountValue: Number(rewardFormData.discountValue) || 0,
            discountType: 'fixed',
            minimumPurchase: Number(rewardFormData.minimumPurchase) || 0
          };
          break;
          
        case 'freeItem':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            itemName: rewardFormData.itemName,
            itemDescription: rewardFormData.itemDescription || ''
          };
          break;
          
        case 'other':
          rewardData.rewardTypeDetails = {
            ...rewardData.rewardTypeDetails,
            details: rewardFormData.customRewardDetails
          };
          break;
      }

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', selectedMerchantForReward, 'rewards');
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
        doc(db, 'merchants', selectedMerchantForReward, 'rewards', newRewardRef.id),
        { id: newRewardRef.id }
      );

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      );
      
      toast({
        title: "Reward Created",
        description: "The reward has been successfully created for the selected merchant.",
      });
      
      // Reset form
      setRewardFormData({
        rewardName: "",
        description: "",
        type: "",
        rewardVisibility: "all",
        specificCustomerIds: [],
        specificCustomerNames: [],
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
          daysSinceLastVisit: "",
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
          endDate: ""
        },
        rewardSummary: "",
      });
      setShowRewardForm(false);
      setCurrentRewardStep(1);
      
    } catch (error: any) {
      console.error("Error creating reward:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create reward",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to capitalize first letter
  function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  // Network Reward functions (adapted from network-reward-popup.tsx)
  const handleNetworkRewardStepChange = (step: number) => {
    // Basic validation for step 1
    if (step > 1 && currentNetworkRewardStep === 1) {
      if (!networkRewardFormData.rewardName.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter a reward name",
          variant: "destructive"
        });
        return;
      }
      if (!networkRewardFormData.description.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter a reward description",
          variant: "destructive"
        });
        return;
      }
      if (!networkRewardFormData.discountValue.trim() || parseFloat(networkRewardFormData.discountValue) <= 0) {
        toast({
          title: "Invalid discount",
          description: "Please enter a valid discount value",
          variant: "destructive"
        });
        return;
      }
      if (!networkRewardFormData.minimumSpend.trim() || parseFloat(networkRewardFormData.minimumSpend) <= 0) {
        toast({
          title: "Invalid minimum spend",
          description: "Please enter a valid minimum spend amount",
          variant: "destructive"
        });
        return;
      }
      if (!networkRewardFormData.networkPointsCost.trim() || parseFloat(networkRewardFormData.networkPointsCost) <= 0) {
        toast({
          title: "Invalid network points cost",
          description: "Please enter a valid network points cost",
          variant: "destructive"
        });
        return;
      }
      if (!networkRewardFormData.pin.trim() || networkRewardFormData.pin.length !== 4 || !/^\d+$/.test(networkRewardFormData.pin)) {
        toast({
          title: "Invalid PIN",
          description: "Please enter a 4-digit PIN code",
          variant: "destructive"
        });
        return;
      }
    }

    setCurrentNetworkRewardStep(step);
  };

  const saveNetworkRewardForMerchant = async () => {
    if (!selectedMerchantForNetworkReward) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);

      const timestamp = new Date();
      
      // Create the network reward data
      const rewardData = {
        rewardName: networkRewardFormData.rewardName,
        description: networkRewardFormData.description,
        type: "discount",
        isNetworkReward: true,
        discountType: networkRewardType,
        discountValue: parseFloat(networkRewardFormData.discountValue),
        minimumSpend: parseFloat(networkRewardFormData.minimumSpend),
        networkPointsCost: parseFloat(networkRewardFormData.networkPointsCost),
        pin: networkRewardFormData.pin,
        isActive: true,
        status: "active",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        merchantId: selectedMerchantForNetworkReward,
        rewardVisibility: "global",
        pointsCost: 0,
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        eligibility: "networkCustomers"
      };

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', selectedMerchantForNetworkReward, 'rewards');
      const newRewardRef = await addDoc(merchantRewardsRef, rewardData);
      
      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: newRewardRef.id
      };
      
      // Update the merchant's reward with the ID
      await setDoc(
        doc(db, 'merchants', selectedMerchantForNetworkReward, 'rewards', newRewardRef.id),
        { ...rewardWithId }
      );

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      );
      
      toast({
        title: "Network Reward Created",
        description: "The network reward has been successfully created for the selected merchant.",
      });
      
      // Reset form
      setNetworkRewardFormData({
        rewardName: "",
        description: "",
        discountValue: "10",
        minimumSpend: "50.00",
        networkPointsCost: "100",
        pin: ""
      });
      setShowNetworkRewardForm(false);
      setCurrentNetworkRewardStep(1);
      setNetworkRewardType("dollarOff");
      setCurrentInfoSlide(0);
      setInfoBoxesVisible(true);
      
    } catch (error: any) {
      console.error("Error creating network reward:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create network reward",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Intro Reward save function (adapted from introductory-reward-popup.tsx)
  const saveIntroRewardForMerchant = async () => {
    if (!selectedMerchantForIntroReward) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!introRewardFormData.rewardName || !introRewardFormData.description || !introRewardFormData.pin) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    if (introRewardFormData.rewardType === "freeItem" && !introRewardFormData.itemName) {
      toast({
        title: "Missing Information",
        description: "Please enter the free item name",
        variant: "destructive"
      });
      return;
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(introRewardFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      // Check current introductory rewards for this merchant
      const merchantRef = doc(db, 'merchants', selectedMerchantForIntroReward);
      const merchantDoc = await getDoc(merchantRef);
      const merchantData = merchantDoc.data();
      const currentIntroRewardIds = merchantData?.introductoryRewardIds || [];
      
      if (currentIntroRewardIds.length >= 3) {
        toast({
          title: "Maximum Introductory Rewards Reached",
          description: "This merchant already has the maximum of 3 introductory rewards.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const timestamp = new Date();
      
      // Create the reward data
      const rewardData = {
        rewardName: introRewardFormData.rewardName,
        description: introRewardFormData.description,
        type: introRewardFormData.rewardType,
        isIntroductoryReward: true,
        fundedByTapLoyalty: true,
        maxValue: 5.00,
        itemName: introRewardFormData.rewardType === "freeItem" ? introRewardFormData.itemName : "",
        voucherAmount: introRewardFormData.rewardType === "voucher" ? 5.00 : 0,
        itemValue: introRewardFormData.rewardType === "freeItem" ? 5.00 : 0,
        pin: introRewardFormData.pin,
        isActive: true,
        status: "active",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        merchantId: selectedMerchantForIntroReward,
        rewardVisibility: "global",
        pointsCost: 0,
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        limitations: [
          {
            type: "customerLimit",
            value: 1
          }
        ]
      };

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', selectedMerchantForIntroReward, 'rewards');
      const newRewardRef = await addDoc(merchantRewardsRef, rewardData);
      
      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: newRewardRef.id
      };
      
      // Update the merchant's reward with the ID
      await setDoc(
        doc(db, 'merchants', selectedMerchantForIntroReward, 'rewards', newRewardRef.id),
        { ...rewardWithId }
      );

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      );
      
      // Update merchant document with introductory rewards info
      const updatedIntroRewardIds = [...currentIntroRewardIds, newRewardRef.id];
      
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: true,
          introductoryRewardIds: updatedIntroRewardIds,
          introductoryRewardCount: updatedIntroRewardIds.length
        },
        { merge: true }
      );
      
      toast({
        title: "Introductory Reward Created",
        description: "The introductory reward has been successfully created for the selected merchant.",
      });
      
      // Reset form
      setIntroRewardFormData({
        rewardName: "",
        description: "",
        rewardType: "voucher",
        itemName: "",
        pin: ""
      });
      setShowIntroRewardForm(false);
      
    } catch (error: any) {
      console.error("Error creating introductory reward:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create introductory reward",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Program save functions (copied and modified from create-recurring-reward-dialog.tsx)
  const saveCoffeeProgramForMerchant = async () => {
    if (!selectedMerchantForProgram) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!coffeeFormData.pin || !coffeeFormData.frequency) {
      toast({
        title: "Missing Information",
        description: "Please fill in both PIN code and frequency",
        variant: "destructive"
      });
      return;
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(coffeeFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      // Check if coffee program exists
      const merchantDocRef = doc(db, 'merchants', selectedMerchantForProgram);
      const merchantDoc = await getDoc(merchantDocRef);

      if (merchantDoc.exists() && merchantDoc.data().coffeeprogram === true) {
        toast({
          title: "Error",
          description: "Coffee program already exists for this merchant",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create the coffee program data object
      const coffeeProgram = {
        pin: coffeeFormData.pin,
        frequency: parseInt(coffeeFormData.frequency),
        minspend: parseInt(coffeeFormData.minimumSpend) || 0,
        mintime: parseInt(coffeeFormData.minimumTimeBetween) || 0,
        createdAt: new Date(),
        active: true
      };
      
      // Update the merchant document to add the coffee program to an array
      await setDoc(merchantDocRef, {
        coffeeprogram: true,
        coffeePrograms: arrayUnion(coffeeProgram)
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Coffee program created successfully for selected merchant",
      });
      setShowCoffeeForm(false);
    } catch (error: any) {
      console.error("Error creating coffee program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create coffee program",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveVoucherProgramForMerchant = async () => {
    if (!selectedMerchantForProgram) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!voucherFormData.rewardName || !voucherFormData.pin || !voucherFormData.spendRequired || !voucherFormData.discountAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(voucherFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      const merchantDocRef = doc(db, 'merchants', selectedMerchantForProgram);
      
      // Create the voucher program data object
      const voucherProgram = {
        rewardName: voucherFormData.rewardName,
        description: voucherFormData.description,
        pin: voucherFormData.pin,
        spendRequired: parseInt(voucherFormData.spendRequired),
        discountAmount: parseInt(voucherFormData.discountAmount),
        isActive: voucherFormData.isActive,
        createdAt: new Date(),
        type: 'recurring_voucher'
      };
      
      // Update the merchant document to add the voucher program
      await setDoc(merchantDocRef, {
        voucherPrograms: arrayUnion(voucherProgram)
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Recurring voucher program created successfully for selected merchant",
      });
      setShowVoucherForm(false);
    } catch (error: any) {
      console.error("Error creating voucher program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create voucher program",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTransactionProgramForMerchant = async () => {
    if (!selectedMerchantForProgram) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    const requiredFields = [
      transactionFormData.rewardName,
      transactionFormData.pin,
      transactionFormData.transactionThreshold
    ];
    
    if (transactionFormData.rewardType === 'dollar_voucher' && !transactionFormData.voucherAmount) {
      requiredFields.push(transactionFormData.voucherAmount);
    }
    
    if (transactionFormData.rewardType === 'free_item' && !transactionFormData.freeItemName) {
      requiredFields.push(transactionFormData.freeItemName);
    }
    
    if (requiredFields.some(field => !field)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(transactionFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      const merchantDocRef = doc(db, 'merchants', selectedMerchantForProgram);
      
      // Create the transaction program data object
      const transactionProgram = {
        rewardName: transactionFormData.rewardName,
        description: transactionFormData.description,
        pin: transactionFormData.pin,
        transactionThreshold: parseInt(transactionFormData.transactionThreshold),
        rewardType: transactionFormData.rewardType,
        voucherAmount: transactionFormData.rewardType === 'dollar_voucher' ? parseInt(transactionFormData.voucherAmount) : null,
        freeItemName: transactionFormData.rewardType === 'free_item' ? transactionFormData.freeItemName : null,
        conditions: transactionFormData.conditions,
        iterations: parseInt(transactionFormData.iterations),
        isActive: transactionFormData.isActive,
        createdAt: new Date(),
        type: 'transaction_reward'
      };
      
      // Update the merchant document to add the transaction program
      await setDoc(merchantDocRef, {
        transactionPrograms: arrayUnion(transactionProgram)
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Transaction reward program created successfully for selected merchant",
      });
      setShowTransactionForm(false);
    } catch (error: any) {
      console.error("Error creating transaction program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction program",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveCashbackProgramForMerchant = async () => {
    if (!selectedMerchantForProgram) {
      toast({
        title: "No Merchant Selected",
        description: "Please select a merchant first",
        variant: "destructive"
      });
      return;
    }
    
    // Validate required fields
    if (!cashbackFormData.cashbackRate || !cashbackFormData.programName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    // Validate cashback rate is a valid percentage
    const rate = parseFloat(cashbackFormData.cashbackRate);
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      toast({
        title: "Invalid Rate",
        description: "Cashback rate must be between 0.1% and 100%",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      const merchantDocRef = doc(db, 'merchants', selectedMerchantForProgram);
      
      // Create the cashback program data object
      const cashbackProgram = {
        programName: cashbackFormData.programName,
        description: cashbackFormData.description,
        cashbackRate: rate,
        isActive: cashbackFormData.isActive,
        createdAt: new Date(),
        type: 'cashback'
      };
      
      // Update the merchant document to enable cashback
      await setDoc(merchantDocRef, {
        isCashback: true,
        cashbackRate: rate,
        cashbackProgram: cashbackProgram
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Tap Cash program created successfully for selected merchant",
      });
      setShowCashbackForm(false);
    } catch (error: any) {
      console.error("Error creating cashback program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create cashback program",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Reward sorting functions
  const handleRewardSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    
    if (rewardSortConfig && rewardSortConfig.key === key) {
      direction = rewardSortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    setRewardSortConfig({ key, direction });
  };

  const getSortedRewards = (rewardsToSort: Reward[]) => {
    if (!rewardSortConfig) return rewardsToSort;
    
    return [...rewardsToSort].sort((a, b) => {
      let aValue: any = a[rewardSortConfig.key as keyof Reward] || '';
      let bValue: any = b[rewardSortConfig.key as keyof Reward] || '';
      
      // Handle date sorting
      if (rewardSortConfig.key === 'createdAt') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
        return rewardSortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle numeric vs string comparisons
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return rewardSortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
      }
      
      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();
      
      if (aValue < bValue) {
        return rewardSortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return rewardSortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  };

  const renderRewardSortIcon = (columnKey: string) => {
    if (rewardSortConfig?.key !== columnKey) {
      return <ChevronDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return rewardSortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 ml-1" />
    );
  };

  // Function to safely get regex match results
  const safeRegexMatch = (regex: RegExp, text: string, defaultValue: string): string => {
    const match = text.match(regex);
    return match && match[1] ? match[1] : defaultValue;
  };

  // Show loading while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show password dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2">Please enter the password to access the admin portal</p>
          </div>
          
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter admin password"
                className="mt-1"
                autoFocus
              />
              {passwordError && (
                <p className="text-red-600 text-sm mt-1">{passwordError}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full">
              Access Admin Portal
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button 
              variant="ghost" 
              onClick={() => router.push("/dashboard")}
              className="text-sm"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push("/dashboard")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">Admin Portal</h1>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700"
          >
            Logout
          </Button>
        </div>

        {/* Main Tab Container */}
        <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mb-8 flex-wrap gap-1">
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'merchants'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('merchants');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
            }}
          >
            <User size={15} />
            Merchants
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'customers'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('customers');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
            }}
          >
            <Users size={15} />
            Customers
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'functions'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('functions');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
            }}
          >
            <CheckCircle size={15} />
            Functions
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'rewards'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('rewards');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
            }}
          >
            <Gift size={15} />
            Rewards
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'programs'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('programs');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
              setActiveTab("coffee");
              setShowCoffeeForm(false);
              setShowVoucherForm(false);
              setShowTransactionForm(false);
              setShowCashbackForm(false);
            }}
          >
            <Coffee size={15} />
            Programs
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'introRewards'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('introRewards');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
              setShowIntroRewardForm(false);
              setSelectedMerchantForIntroReward("");
            }}
          >
            <Sparkles size={15} />
            Intro Rewards
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'createRewards'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('createRewards');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
              setShowRewardForm(false);
              setSelectedMerchantForReward("");
              setCurrentRewardStep(1);
            }}
          >
            <Award size={15} />
            Create Rewards
          </button>
          
          <button
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              currentView === 'networkRewards'
                ? "text-gray-800 bg-white shadow-sm"
                : "text-gray-600 hover:bg-gray-200/70"
            )}
            onClick={() => {
              setCurrentView('networkRewards');
              setSelectedMerchants([]);
              setSelectedCustomers([]);
              setSelectedRewards([]);
              setShowNetworkRewardForm(false);
              setSelectedMerchantForNetworkReward("");
              setCurrentNetworkRewardStep(1);
              setNetworkRewardType("dollarOff");
              setCurrentInfoSlide(0);
              setInfoBoxesVisible(true);
            }}
          >
            <Globe size={15} />
            Network Rewards
          </button>
        </div>

        {/* Display the appropriate content based on currentView */}
        {currentView === 'merchants' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-72">
                  <Input 
                    placeholder="Search merchants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                
                <div className="flex items-center bg-gray-100 rounded-md p-1">
                  <Button 
                    variant={viewMode === 'standard' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode('standard')}
                    className="text-xs h-8"
                  >
                    Standard View
                  </Button>
                  <Button 
                    variant={viewMode === 'advanced' ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode('advanced')}
                    className="text-xs h-8"
                  >
                    Advanced View
                  </Button>
                </div>
                
                {selectedMerchants.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setIsDeleteSelectedMerchantsDialogOpen(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedMerchants.length})
                  </Button>
                )}
              </div>
              
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Merchant
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <>
                {viewMode === 'standard' ? (
                  // Standard view with limited columns
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">
                            <Checkbox
                              checked={selectedMerchants.length === merchants.length && merchants.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMerchants(merchants.map(m => m.id));
                                } else {
                                  setSelectedMerchants([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead 
                            className="w-[180px] cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('merchantName')}
                          >
                            <div className="flex items-center">
                              Merchant Name
                              {renderSortIcon('merchantName')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('merchantId')}
                          >
                            <div className="flex items-center">
                              Merchant ID
                              {renderSortIcon('merchantId')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('businessType')}
                          >
                            <div className="flex items-center">
                              Business Type
                              {renderSortIcon('businessType')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('abn')}
                          >
                            <div className="flex items-center">
                              ABN
                              {renderSortIcon('abn')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('contact')}
                          >
                            <div className="flex items-center">
                              Contact
                              {renderSortIcon('contact')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('location')}
                          >
                            <div className="flex items-center">
                              Location
                              {renderSortIcon('location')}
                            </div>
                          </TableHead>
                          <TableHead 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => handleSort('status')}
                          >
                            <div className="flex items-center">
                              Status
                              {renderSortIcon('status')}
                            </div>
                          </TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedMerchants.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                              {searchTerm ? "No merchants match your search" : "No merchants found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedMerchants.map((merchant) => (
                            <TableRow key={merchant.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedMerchants.includes(merchant.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedMerchants([...selectedMerchants, merchant.id]);
                                    } else {
                                      setSelectedMerchants(selectedMerchants.filter(id => id !== merchant.id));
                                    }
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                                    {merchant.logoUrl ? (
                                      <img 
                                        src={merchant.logoUrl} 
                                        alt={`${merchant.merchantName || merchant.tradingName} logo`} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                          <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                          <circle cx="9" cy="9" r="2"></circle>
                                          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                  <span>{merchant.merchantName || merchant.tradingName || "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{merchant.merchantId || "—"}</TableCell>
                              <TableCell>{merchant.businessType || "—"}</TableCell>
                              <TableCell>{merchant.abn || "—"}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  <div>{merchant.representative?.name || "—"}</div>
                                  <div className="text-gray-500">{merchant.primaryEmail || merchant.businessEmail || "—"}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {merchant.address?.suburb ? (
                                  <div className="text-sm">
                                    <div>{merchant.address?.street}</div>
                                    <div className="text-gray-500">
                                      {merchant.address?.suburb}, {merchant.address?.state} {merchant.address?.postcode}
                                    </div>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell>
                                <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  merchant.status === "active" 
                                    ? "bg-green-100 text-green-800" 
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {merchant.status || "inactive"}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleEdit(merchant)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(merchant)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => window.open(`/admin/${merchant.id}`, "_blank")}
                                    >
                                      View Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  // Advanced view with all columns
                  <div className="overflow-x-auto">
                    <p className="text-sm text-gray-500 mb-2">Double-click any cell to edit its value</p>
                    <div className="border rounded-md max-h-[70vh] overflow-auto">
                      <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                          <TableRow>
                            <TableHead className="w-[50px] sticky left-0 bg-white z-20 border-r">
                              <Checkbox
                                checked={selectedMerchants.length === merchants.length && merchants.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedMerchants(merchants.map(m => m.id));
                                  } else {
                                    setSelectedMerchants([]);
                                  }
                                }}
                              />
                            </TableHead>
                            <TableHead className="w-[200px] sticky left-[50px] bg-white z-20 border-r">
                              Merchant
                            </TableHead>
                            {allMerchantFields.map(field => (
                              <TableHead 
                                key={field.key} 
                                className="cursor-pointer hover:bg-gray-50 whitespace-nowrap min-w-[120px]"
                                onClick={() => handleSort(field.key)}
                              >
                                <div className="flex items-center">
                                  {field.label}
                                  {renderSortIcon(field.key)}
                                </div>
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedMerchants.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={allMerchantFields.length + 1} className="text-center py-8 text-gray-500">
                                {searchTerm ? "No merchants match your search" : "No merchants found"}
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedMerchants.map((merchant) => (
                              <TableRow key={merchant.id}>
                                <TableCell className="sticky left-0 bg-white z-10 border-r">
                                  <Checkbox
                                    checked={selectedMerchants.includes(merchant.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedMerchants([...selectedMerchants, merchant.id]);
                                      } else {
                                        setSelectedMerchants(selectedMerchants.filter(id => id !== merchant.id));
                                      }
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="font-medium sticky left-[50px] bg-white z-10 border-r">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                                      {merchant.logoUrl ? (
                                        <img 
                                          src={merchant.logoUrl} 
                                          alt="Logo" 
                                          className="w-full h-full object-cover"
                                          onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                                            <circle cx="9" cy="9" r="2"></circle>
                                            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                    <div className="truncate max-w-[140px]">
                                      {merchant.merchantName || merchant.tradingName || "Unknown Merchant"}
                                    </div>
                                  </div>
                                </TableCell>
                                
                                {allMerchantFields.map(field => (
                                  <TableCell 
                                    key={`${merchant.id}-${field.key}`}
                                    className="whitespace-nowrap"
                                    onDoubleClick={() => handleCellEdit(
                                      merchant.id, 
                                      field.key, 
                                      getNestedValue(merchant, field.key) || ""
                                    )}
                                  >
                                    {renderCellContent(merchant, field.key)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Customers Table View */}
        {currentView === 'customers' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative w-72">
                  <Input 
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                
                {selectedCustomers.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => setIsDeleteSelectedCustomersDialogOpen(true)}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedCustomers.length})
                  </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedCustomers.length === customers.length && customers.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCustomers(customers.map(c => c.id));
                            } else {
                              setSelectedCustomers([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead 
                        className="w-[200px] cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('fullName')}
                      >
                        <div className="flex items-center">
                          Customer
                          {renderCustomerSortIcon('fullName')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('email')}
                      >
                        <div className="flex items-center">
                          Email
                          {renderCustomerSortIcon('email')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('mobileNumber')}
                      >
                        <div className="flex items-center">
                          Phone
                          {renderCustomerSortIcon('mobileNumber')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('totalMerchants')}
                      >
                        <div className="flex items-center">
                          Merchants
                          {renderCustomerSortIcon('totalMerchants')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('totalTransactions')}
                      >
                        <div className="flex items-center">
                          Transactions
                          {renderCustomerSortIcon('totalTransactions')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('totalLifetimeSpend')}
                      >
                        <div className="flex items-center">
                          Lifetime Spend
                          {renderCustomerSortIcon('totalLifetimeSpend')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleCustomerSort('totalRedemptions')}
                      >
                        <div className="flex items-center">
                          Redemptions
                          {renderCustomerSortIcon('totalRedemptions')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No customers match your search" : "No customers found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedCustomers.includes(customer.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCustomers([...selectedCustomers, customer.id]);
                                } else {
                                  setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {customer.profilePictureUrl ? (
                                  <img 
                                    src={customer.profilePictureUrl} 
                                    alt={customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim()}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                                  />
                                ) : (
                                  <User className="h-5 w-5 text-[#007AFF]" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium">
                                  {customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer'}
                                </div>
                                {customer.customerId && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    ID: {customer.customerId}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{customer.email || '—'}</TableCell>
                          <TableCell>{customer.mobileNumber || '—'}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                                {customer.totalMerchants || 0}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>{customer.totalTransactions || 0}</TableCell>
                          <TableCell>${(customer.totalLifetimeSpend || 0).toFixed(2)}</TableCell>
                          <TableCell>{customer.totalRedemptions || 0}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push(`/admin/customers/${customer.id}`)}>
                                  View Details
                                </DropdownMenuItem>
                                {customer.merchantConnections && customer.merchantConnections.length > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Linked Merchants</DropdownMenuLabel>
                                    {customer.merchantConnections.map((connection: { merchantId: string; merchantName?: string }, index: number) => (
                                      <DropdownMenuItem 
                                        key={index}
                                        onClick={() => router.push(`/admin/${connection.merchantId}`)}
                                      >
                                        {connection.merchantName || connection.merchantId}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Functions Tab View */}
        {currentView === 'functions' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-semibold">Cloud Functions</h2>
              <Button onClick={() => setIsAddFunctionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Function
              </Button>
            </div>

            {functions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No functions configured. Click "Add Function" to create one.
              </div>
            ) : (
              <div className="space-y-6">
                {functions.map((func) => (
                  <div key={func.name} className="border rounded-lg overflow-hidden">
                    <div className="p-4 flex items-center justify-between border-b bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${func.enabled ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        <h3 className="font-medium">{func.name}</h3>
                        <Badge variant="outline" className="ml-2">{func.schedule}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={func.enabled ? "text-red-600" : "text-green-600"}
                          onClick={() => handleToggleFunctionStatus(func.name, !func.enabled)}
                        >
                          {func.enabled ? "Disable" : "Enable"}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditFunction(func)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600"
                          onClick={() => handleDeleteFunction(func.name)}
                        >
                          <Trash className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4">
                      <div className="mb-4">{func.description}</div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <span className="font-medium block">Schedule:</span>
                          <span className="text-gray-600">{func.schedule}</span>
                        </div>
                        <div>
                          <span className="font-medium block">Memory:</span>
                          <span className="text-gray-600">{func.memory}</span>
                        </div>
                        <div>
                          <span className="font-medium block">Timeout:</span>
                          <span className="text-gray-600">{func.timeoutSeconds} seconds</span>
                        </div>
                        <div>
                          <span className="font-medium block">Timezone:</span>
                          <span className="text-gray-600">{func.timeZone}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium block">Secrets:</span>
                          <span className="text-gray-600">
                            {func.secrets.length > 0 
                              ? func.secrets.map(s => <Badge key={s} variant="secondary" className="mr-1">{s}</Badge>) 
                              : "None"}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Function Code:</h4>
                        <div className="bg-gray-900 text-gray-50 p-4 rounded-md font-mono text-xs overflow-x-auto max-h-80 overflow-y-auto">
                          <pre className="whitespace-pre-wrap break-words">{func.code}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rewards Tab View */}
        {currentView === 'rewards' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-72">
                    <Input 
                      placeholder="Search rewards..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  {selectedRewards.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteSelectedRewards}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedRewards.length})
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDeleteAllRewardsDialogOpen(true)}
                    disabled={rewards.length === 0}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                  <Button onClick={() => fetchRewards()}>
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Filters and Stats */}
              <div className="flex items-center justify-between bg-gray-50 p-4 rounded-md">
                <div className="flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    Showing {Math.min(maxRewardsToShow, rewards.length)} of {rewards.length} total rewards
                  </div>
                  
                  <Select value={rewardFilters.collection} onValueChange={(value) => setRewardFilters({...rewardFilters, collection: value})}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Collections</SelectItem>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="merchant">Merchant</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={rewardFilters.visible} onValueChange={(value) => setRewardFilters({...rewardFilters, visible: value})}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Visible" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Visible</SelectItem>
                      <SelectItem value="false">Hidden</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={rewardFilters.redeemable} onValueChange={(value) => setRewardFilters({...rewardFilters, redeemable: value})}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Redeemable" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="true">Redeemable</SelectItem>
                      <SelectItem value="false">Not Redeemable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor="maxRewards" className="text-sm">Show max:</Label>
                  <Select value={maxRewardsToShow.toString()} onValueChange={(value) => setMaxRewardsToShow(parseInt(value))}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="1000">1000</SelectItem>
                      <SelectItem value="5000">5000</SelectItem>
                      <SelectItem value="10000">10000</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={selectedRewards.length === rewards.length && rewards.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRewards(rewards.map(r => r.id));
                            } else {
                              setSelectedRewards([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('rewardName')}
                      >
                        <div className="flex items-center">
                          Reward Name
                          {renderRewardSortIcon('rewardName')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('rewardId')}
                      >
                        <div className="flex items-center">
                          Reward ID
                          {renderRewardSortIcon('rewardId')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('merchantId')}
                      >
                        <div className="flex items-center">
                          Merchant
                          {renderRewardSortIcon('merchantId')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('collection')}
                      >
                        <div className="flex items-center">
                          Collection
                          {renderRewardSortIcon('collection')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('visible')}
                      >
                        <div className="flex items-center">
                          Visible
                          {renderRewardSortIcon('visible')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('redeemable')}
                      >
                        <div className="flex items-center">
                          Redeemable
                          {renderRewardSortIcon('redeemable')}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleRewardSort('createdAt')}
                      >
                        <div className="flex items-center">
                          Created At
                          {renderRewardSortIcon('createdAt')}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rewards.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No rewards match your search" : "No rewards found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      getSortedRewards(rewards.filter(reward => {
                        // Apply search filter
                        const searchLower = searchTerm.toLowerCase();
                        const matchesSearch = (
                          (reward.rewardName || '').toLowerCase().includes(searchLower) ||
                          (reward.rewardId || '').toLowerCase().includes(searchLower) ||
                          (reward.merchantId || '').toLowerCase().includes(searchLower) ||
                          (reward.merchantName || '').toLowerCase().includes(searchLower) ||
                          (reward.customerName || '').toLowerCase().includes(searchLower) ||
                          reward.collection.toLowerCase().includes(searchLower) ||
                          (reward.reason || '').toLowerCase().includes(searchLower)
                        );

                        // Apply collection filter
                        const matchesCollection = rewardFilters.collection === 'all' || 
                          reward.collection === rewardFilters.collection;

                        // Apply visibility filter
                        const matchesVisible = rewardFilters.visible === 'all' || 
                          (rewardFilters.visible === 'true' && reward.visible === true) ||
                          (rewardFilters.visible === 'false' && reward.visible === false);

                        // Apply redeemable filter
                        const matchesRedeemable = rewardFilters.redeemable === 'all' || 
                          (rewardFilters.redeemable === 'true' && reward.redeemable === true) ||
                          (rewardFilters.redeemable === 'false' && reward.redeemable === false);

                        return matchesSearch && matchesCollection && matchesVisible && matchesRedeemable;
                      }).slice(0, maxRewardsToShow)).map((reward) => (
                        <TableRow key={reward.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRewards.includes(reward.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRewards([...selectedRewards, reward.id]);
                                } else {
                                  setSelectedRewards(selectedRewards.filter(id => id !== reward.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {reward.rewardName || '—'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {reward.rewardId || '—'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{reward.merchantName || reward.merchantId || '—'}</div>
                              {reward.customerId && (
                                <div className="text-sm text-gray-500">
                                  Customer: {reward.customerName || reward.customerId}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={reward.collection === 'global' ? 'default' : 
                                     reward.collection === 'merchant' ? 'secondary' : 'outline'}
                            >
                              {reward.collection}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={reward.visible ? 'default' : 'secondary'}
                            >
                              {reward.visible ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={reward.redeemable ? 'default' : 'secondary'}
                            >
                              {reward.redeemable ? 'Yes' : 'No'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {reward.createdAt ? new Date(reward.createdAt).toLocaleDateString() : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  console.log('Reward details:', reward);
                                  toast({
                                    title: "Reward Details",
                                    description: `${reward.rewardName} - ${reward.reason || 'No reason provided'}`,
                                  });
                                }}>
                                  View Details
                                </DropdownMenuItem>
                                {reward.reason && (
                                  <DropdownMenuItem onClick={() => {
                                    toast({
                                      title: "Reward Reason",
                                      description: reward.reason,
                                    });
                                  }}>
                                    Show Reason
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteReward(reward)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    navigator.clipboard.writeText(reward.collectionPath);
                                    toast({
                                      title: "Copied",
                                      description: "Collection path copied to clipboard",
                                    });
                                  }}
                                >
                                  Copy Path
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        {/* Programs Tab View */}
        {currentView === 'programs' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                <span className="text-[#007AFF]">Create</span> Recurring Programs
              </h2>
              <p className="text-sm text-gray-600">
                Set up automatic reward programs for specific merchants
              </p>
            </div>

            {/* Merchant Selector */}
            <div className="mb-6">
              <Label className="text-sm font-medium">Select Merchant <span className="text-red-500">*</span></Label>
              <Select value={selectedMerchantForProgram} onValueChange={setSelectedMerchantForProgram}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a merchant to create programs for..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Merchants</SelectLabel>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                            {merchant.logoUrl ? (
                              <img 
                                src={merchant.logoUrl} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200"></div>
                            )}
                          </div>
                          <span>{merchant.merchantName || merchant.tradingName || merchant.id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {!selectedMerchantForProgram && (
                <p className="text-xs text-gray-500 mt-1">
                  You must select a merchant before creating any programs
                </p>
              )}
            </div>

            {selectedMerchantForProgram && (
              <>
                {/* Program Type Tabs */}
                <div className="mb-6">
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        activeTab === "coffee"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setActiveTab("coffee")}
                    >
                      <Coffee size={15} />
                      Coffee Program
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        activeTab === "discount"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setActiveTab("discount")}
                    >
                      <Gift size={15} />
                      Recurring Voucher
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        activeTab === "transaction"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setActiveTab("transaction")}
                    >
                      <ShoppingBag size={15} />
                      Transaction Reward
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        activeTab === "cashback"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setActiveTab("cashback")}
                    >
                      <DollarSign size={15} />
                      Tap Cash
                    </button>
                  </div>
                </div>

                {/* Coffee Program */}
                {activeTab === "coffee" && (
                  <div className="space-y-6">
                    {merchantPrograms[selectedMerchantForProgram]?.coffeeProgram ? (
                      <div className="border border-green-200 rounded-md p-6 bg-green-50">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold text-green-800">Coffee Program Active</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          This merchant already has a coffee loyalty program set up.
                        </p>
                        {merchantPrograms[selectedMerchantForProgram]?.coffeePrograms?.length > 0 && (
                          <div className="bg-white rounded border p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Current Coffee Program:</p>
                            {merchantPrograms[selectedMerchantForProgram].coffeePrograms.map((program: any, index: number) => (
                              <div key={index} className="text-xs text-gray-600">
                                <p>• Frequency: Buy {program.frequency - 1}, get 1 free</p>
                                <p>• PIN: {program.pin}</p>
                                {program.minspend > 0 && <p>• Minimum spend: ${program.minspend}</p>}
                                {program.mintime > 0 && <p>• Minimum time between: {program.mintime} minutes</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : !showCoffeeForm ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <Coffee className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Coffee Loyalty Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Create a digital stamp card where customers buy X drinks and get 1 free
                        </p>
                        <Button
                          onClick={() => setShowCoffeeForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Set Up Program
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Configure Coffee Program</h2>
                          <p className="text-sm text-gray-600">Set up your digital stamp card program</p>
                        </div>
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={coffeeFormData.pin}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Staff will enter this PIN when redeeming free coffees
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Frequency <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={coffeeFormData.frequency}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, frequency: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Total coffees in reward cycle (e.g., "10" means buy 9, get 10th free)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Minimum Spend ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={coffeeFormData.minimumSpend}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumSpend: e.target.value })}
                              placeholder="e.g., 5"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Minimum transaction amount to qualify (0 for no minimum)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Time Between Purchases (minutes)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={coffeeFormData.minimumTimeBetween}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumTimeBetween: e.target.value })}
                              placeholder="e.g., 30"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Minimum time between purchases to earn stamps (0 for no limit)
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCoffeeForm(false)}
                            className="rounded-md"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveCoffeeProgramForMerchant}
                            disabled={loading}
                            className="rounded-md"
                          >
                            {loading ? "Saving..." : "Save Program"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Recurring Voucher Program */}
                {activeTab === "discount" && (
                  <div className="space-y-6">
                    {merchantPrograms[selectedMerchantForProgram]?.voucherPrograms?.length > 0 ? (
                      <div className="border border-green-200 rounded-md p-6 bg-green-50">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold text-green-800">Voucher Program(s) Active</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          This merchant has {merchantPrograms[selectedMerchantForProgram].voucherPrograms.length} voucher program(s) set up.
                        </p>
                        <div className="bg-white rounded border p-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Current Voucher Programs:</p>
                          {merchantPrograms[selectedMerchantForProgram].voucherPrograms.map((program: any, index: number) => (
                            <div key={index} className="text-xs text-gray-600 border-b border-gray-100 pb-2 last:border-b-0">
                              <p className="font-medium">• {program.rewardName}</p>
                              <p>  Spend ${program.spendRequired} → Get ${program.discountAmount} voucher</p>
                              <p>  PIN: {program.pin} | Status: {program.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : !showVoucherForm ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <DollarSign className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Recurring Voucher Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Create automatic vouchers that customers earn based on their spending
                        </p>
                        <Button
                          onClick={() => setShowVoucherForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Set Up Program
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Configure Recurring Voucher Program</h2>
                          <p className="text-sm text-gray-600">Set up automatic voucher rewards based on spending</p>
                        </div>
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={voucherFormData.rewardName}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, rewardName: e.target.value })}
                              placeholder="e.g., Loyalty Voucher"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Name that will appear to customers
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={voucherFormData.pin}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Staff will enter this PIN when redeeming vouchers
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Spend Required ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={voucherFormData.spendRequired}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, spendRequired: e.target.value })}
                              placeholder="e.g., 100"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Amount customer needs to spend to earn voucher
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Voucher Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={voucherFormData.discountAmount}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, discountAmount: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Dollar amount of the voucher reward
                            </p>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Textarea
                              value={voucherFormData.description}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
                              placeholder="e.g., Spend $100 and get a $10 voucher for your next visit"
                              className="rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Description shown to customers
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowVoucherForm(false)}
                            className="rounded-md"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveVoucherProgramForMerchant}
                            disabled={loading}
                            className="rounded-md"
                          >
                            {loading ? "Saving..." : "Save Program"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Transaction Reward Program */}
                {activeTab === "transaction" && (
                  <div className="space-y-6">
                    {merchantPrograms[selectedMerchantForProgram]?.transactionPrograms?.length > 0 ? (
                      <div className="border border-green-200 rounded-md p-6 bg-green-50">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold text-green-800">Transaction Program(s) Active</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          This merchant has {merchantPrograms[selectedMerchantForProgram].transactionPrograms.length} transaction program(s) set up.
                        </p>
                        <div className="bg-white rounded border p-3 space-y-2">
                          <p className="text-xs font-medium text-gray-700 mb-2">Current Transaction Programs:</p>
                          {merchantPrograms[selectedMerchantForProgram].transactionPrograms.map((program: any, index: number) => (
                            <div key={index} className="text-xs text-gray-600 border-b border-gray-100 pb-2 last:border-b-0">
                              <p className="font-medium">• {program.rewardName}</p>
                              <p>  After {program.transactionThreshold} purchases → {program.rewardType === 'dollar_voucher' ? `$${program.voucherAmount} voucher` : program.freeItemName}</p>
                              <p>  PIN: {program.pin} | Status: {program.isActive ? 'Active' : 'Inactive'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : !showTransactionForm ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <ShoppingBag className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Transaction Reward Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Reward customers after a certain number of transactions
                        </p>
                        <Button
                          onClick={() => setShowTransactionForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Set Up Program
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Configure Transaction Reward Program</h2>
                          <p className="text-sm text-gray-600">Set up rewards based on transaction count</p>
                        </div>
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={transactionFormData.rewardName}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, rewardName: e.target.value })}
                              placeholder="e.g., 5 Visit Reward"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={transactionFormData.pin}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Transactions Required <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.transactionThreshold}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionThreshold: e.target.value })}
                              placeholder="e.g., 5"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Number of purchases needed to earn reward
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Type <span className="text-red-500">*</span></Label>
                            <RadioGroup
                              value={transactionFormData.rewardType}
                              onValueChange={(value: 'dollar_voucher' | 'free_item') => 
                                setTransactionFormData({ ...transactionFormData, rewardType: value })
                              }
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dollar_voucher" id="dollar_voucher" />
                                <Label htmlFor="dollar_voucher" className="text-sm">Dollar Voucher</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="free_item" id="free_item" />
                                <Label htmlFor="free_item" className="text-sm">Free Item</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {transactionFormData.rewardType === 'dollar_voucher' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Voucher Amount ($) <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                min="1"
                                value={transactionFormData.voucherAmount}
                                onChange={(e) => setTransactionFormData({ ...transactionFormData, voucherAmount: e.target.value })}
                                placeholder="e.g., 10"
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          {transactionFormData.rewardType === 'free_item' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Free Item Name <span className="text-red-500">*</span></Label>
                              <Input
                                type="text"
                                value={transactionFormData.freeItemName}
                                onChange={(e) => setTransactionFormData({ ...transactionFormData, freeItemName: e.target.value })}
                                placeholder="e.g., Free Coffee"
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Textarea
                              value={transactionFormData.description}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                              placeholder="e.g., Make 5 purchases and get a $10 voucher"
                              className="rounded-md"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowTransactionForm(false)}
                            className="rounded-md"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveTransactionProgramForMerchant}
                            disabled={loading}
                            className="rounded-md"
                          >
                            {loading ? "Saving..." : "Save Program"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tap Cash Program */}
                {activeTab === "cashback" && (
                  <div className="space-y-6">
                    {merchantPrograms[selectedMerchantForProgram]?.isCashback ? (
                      <div className="border border-green-200 rounded-md p-6 bg-green-50">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold text-green-800">Tap Cash Program Active</h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          This merchant already has a Tap Cash program set up.
                        </p>
                        {merchantPrograms[selectedMerchantForProgram]?.cashbackProgram && (
                          <div className="bg-white rounded border p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Current Tap Cash Program:</p>
                            <div className="text-xs text-gray-600">
                              <p>• Program: {merchantPrograms[selectedMerchantForProgram].cashbackProgram.programName}</p>
                              <p>• Cashback Rate: {merchantPrograms[selectedMerchantForProgram].cashbackProgram.cashbackRate}%</p>
                              <p>• Status: {merchantPrograms[selectedMerchantForProgram].cashbackProgram.isActive ? 'Active' : 'Inactive'}</p>
                              <p>• Description: {merchantPrograms[selectedMerchantForProgram].cashbackProgram.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : !showCashbackForm ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <Award className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Tap Cash Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Give customers cashback percentage on every purchase
                        </p>
                        <Button
                          onClick={() => setShowCashbackForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Set Up Program
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Configure Tap Cash Program</h2>
                          <p className="text-sm text-gray-600">Set up cashback percentage for all purchases</p>
                        </div>
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Program Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={cashbackFormData.programName}
                              onChange={(e) => setCashbackFormData({ ...cashbackFormData, programName: e.target.value })}
                              placeholder="e.g., Tap Cash"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Cashback Rate (%) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0.1"
                              max="100"
                              step="0.1"
                              value={cashbackFormData.cashbackRate}
                              onChange={(e) => setCashbackFormData({ ...cashbackFormData, cashbackRate: e.target.value })}
                              placeholder="e.g., 2.5"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Percentage of purchase amount returned as cashback
                            </p>
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-medium">Description</Label>
                            <Textarea
                              value={cashbackFormData.description}
                              onChange={(e) => setCashbackFormData({ ...cashbackFormData, description: e.target.value })}
                              placeholder="e.g., Earn cashback on every purchase"
                              className="rounded-md"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowCashbackForm(false)}
                            className="rounded-md"
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={saveCashbackProgramForMerchant}
                            disabled={loading}
                            className="rounded-md"
                          >
                            {loading ? "Saving..." : "Save Program"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Intro Rewards Tab View */}
        {currentView === 'introRewards' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                <span className="text-[#007AFF]">Create</span> Introductory Rewards
              </h2>
              <p className="text-sm text-gray-600">
                Create special introductory rewards for new customers on any merchant (funded by Tap Loyalty)
              </p>
            </div>

            {/* Merchant Selector */}
            <div className="mb-6">
              <Label className="text-sm font-medium">Select Merchant <span className="text-red-500">*</span></Label>
              <Select value={selectedMerchantForIntroReward} onValueChange={setSelectedMerchantForIntroReward}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a merchant to create introductory reward for..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Merchants</SelectLabel>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                            {merchant.logoUrl ? (
                              <img 
                                src={merchant.logoUrl} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200"></div>
                            )}
                          </div>
                          <span>{merchant.merchantName || merchant.tradingName || merchant.id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {!selectedMerchantForIntroReward && (
                <p className="text-xs text-gray-500 mt-1">
                  You must select a merchant before creating an introductory reward
                </p>
              )}
            </div>

            {selectedMerchantForIntroReward && (
              <>
                {/* Check intro rewards first and update the check */}
                {(() => {
                  const merchantData = merchantPrograms[selectedMerchantForIntroReward];
                  const hasIntroRewards = merchantData?.introductoryRewardCount > 0;
                  const introRewardCount = merchantData?.introductoryRewardCount || 0;
                  
                  if (hasIntroRewards) {
                    return (
                      <div className="border border-green-200 rounded-md p-6 bg-green-50">
                        <div className="flex items-center gap-3 mb-3">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold text-green-800">
                            Introductory Rewards Active ({introRewardCount}/3)
                          </h3>
                        </div>
                        <p className="text-sm text-green-700 mb-4">
                          This merchant has {introRewardCount} introductory reward{introRewardCount > 1 ? 's' : ''} set up.
                        </p>
                        <div className="bg-white rounded border p-3">
                          <p className="text-xs font-medium text-gray-700 mb-2">
                            Introductory Reward IDs: {merchantData.introductoryRewardIds.join(', ')}
                          </p>
                        </div>
                        {introRewardCount < 3 && (
                          <Button
                            onClick={() => setShowIntroRewardForm(true)}
                            variant="outline"
                            className="rounded-md mt-3"
                          >
                            Add Another Introductory Reward ({introRewardCount}/3)
                          </Button>
                        )}
                      </div>
                    );
                  } else if (!showIntroRewardForm) {
                    return (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <Gift className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Introductory Reward</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Create a special reward for new customers (up to $5 value, funded by Tap Loyalty)
                        </p>
                        <Button
                          onClick={() => setShowIntroRewardForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Create Introductory Reward
                        </Button>
                      </div>
                    );
                                     }
                   return null;
                 })()}
                
                {showIntroRewardForm && (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">Configure Introductory Reward</h2>
                      <p className="text-sm text-gray-600">Create a special welcome reward for new customers</p>
                    </div>

                    {/* Reward Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Reward Type</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className={cn(
                            "border rounded-md p-3 cursor-pointer transition-all",
                            introRewardFormData.rewardType === "voucher" 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => setIntroRewardFormData({ ...introRewardFormData, rewardType: "voucher" })}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center",
                              introRewardFormData.rewardType === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                            )}>
                              <DollarSign className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Gift Voucher</p>
                              <p className="text-xs text-gray-500">$5 credit toward purchase</p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "border rounded-md p-3 cursor-pointer transition-all",
                            introRewardFormData.rewardType === "freeItem" 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => setIntroRewardFormData({ ...introRewardFormData, rewardType: "freeItem" })}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-6 w-6 rounded-full flex items-center justify-center",
                              introRewardFormData.rewardType === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                            )}>
                              <Coffee className="h-3 w-3" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Free Item</p>
                              <p className="text-xs text-gray-500">Item up to $5 value</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                        <Input
                          type="text"
                          value={introRewardFormData.rewardName}
                          onChange={(e) => setIntroRewardFormData({ ...introRewardFormData, rewardName: e.target.value })}
                          placeholder={introRewardFormData.rewardType === "voucher" ? "e.g., Welcome $5 Voucher" : "e.g., Free Coffee for New Customers"}
                          className="h-10 rounded-md"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={introRewardFormData.pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setIntroRewardFormData({ ...introRewardFormData, pin: value });
                          }}
                          placeholder="4-digit PIN"
                          className="h-10 rounded-md"
                        />
                        <p className="text-xs text-gray-500">
                          Staff will enter this PIN when redeeming the reward
                        </p>
                      </div>

                      {introRewardFormData.rewardType === "freeItem" && (
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Free Item Name <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={introRewardFormData.itemName}
                            onChange={(e) => setIntroRewardFormData({ ...introRewardFormData, itemName: e.target.value })}
                            placeholder="e.g., Regular Coffee, Pastry, etc."
                            className="h-10 rounded-md"
                          />
                          <p className="text-xs text-gray-500">
                            Item must be valued at $5 or less
                          </p>
                        </div>
                      )}

                      <div className="col-span-2 space-y-2">
                        <Label className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
                        <Textarea
                          value={introRewardFormData.description}
                          onChange={(e) => setIntroRewardFormData({ ...introRewardFormData, description: e.target.value })}
                          placeholder={introRewardFormData.rewardType === "voucher" 
                            ? "e.g., Enjoy $5 off your first purchase as a welcome gift from us!" 
                            : "e.g., Welcome to our store! Enjoy a free coffee on your first visit."}
                          className="rounded-md"
                        />
                        <p className="text-xs text-gray-500">
                          Description shown to customers
                        </p>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">About Introductory Rewards</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            <li>This reward is <strong>funded by Tap Loyalty</strong> (up to $5 value)</li>
                            <li>Each customer can redeem only one introductory reward across all merchants</li>
                            <li>Maximum of 3 introductory rewards per merchant</li>
                            <li>You'll be reimbursed when the reward is redeemed</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowIntroRewardForm(false)}
                        className="rounded-md"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={saveIntroRewardForMerchant}
                        disabled={loading}
                        className="rounded-md"
                      >
                        {loading ? "Creating Reward..." : "Create Introductory Reward"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Network Rewards Tab View */}
        {currentView === 'networkRewards' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                <span className="text-[#007AFF]">Create</span> Network Rewards
              </h2>
              <p className="text-sm text-gray-600">
                Attract new network customers with special rewards they can redeem using points from other Tap Network merchants
              </p>
            </div>

            {/* Merchant Selector */}
            <div className="mb-6">
              <Label className="text-sm font-medium">Select Merchant <span className="text-red-500">*</span></Label>
              <Select value={selectedMerchantForNetworkReward} onValueChange={setSelectedMerchantForNetworkReward}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a merchant to create network reward for..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Merchants</SelectLabel>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                            {merchant.logoUrl ? (
                              <img 
                                src={merchant.logoUrl} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200"></div>
                            )}
                          </div>
                          <span>{merchant.merchantName || merchant.tradingName || merchant.id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {!selectedMerchantForNetworkReward && (
                <p className="text-xs text-gray-500 mt-1">
                  You must select a merchant before creating a network reward
                </p>
              )}
            </div>

            {selectedMerchantForNetworkReward && (
              <>
                {!showNetworkRewardForm ? (
                  <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Globe className="h-5 w-5 text-[#007AFF]" />
                      <h3 className="text-md font-semibold">Network Reward</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create special discounts that attract customers from other Tap Network merchants using their existing points
                    </p>
                    <Button
                      onClick={() => setShowNetworkRewardForm(true)}
                      variant="outline"
                      className="rounded-md"
                    >
                      Create Network Reward
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress Steps */}
                    <div className="flex items-center space-x-1">
                      {[1, 2].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => handleNetworkRewardStepChange(step)}
                          className={`h-2 w-16 rounded-md transition-all ${
                            step === currentNetworkRewardStep 
                              ? "bg-blue-600" 
                              : step < currentNetworkRewardStep 
                              ? "bg-blue-300" 
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Step 1: Create Reward */}
                    {currentNetworkRewardStep === 1 && (
                      <div className={cn(
                        "transition-all duration-500 ease-in-out",
                        infoBoxesVisible ? "mt-0 space-y-4" : "-mt-4 space-y-4"
                      )}>
                        {/* Information Boxes */}
                        <div 
                          className={cn(
                            "relative overflow-hidden transition-all duration-500 ease-in-out",
                            infoBoxesVisible ? "max-h-[200px] opacity-100 mb-0" : "max-h-0 opacity-0 -mb-4"
                          )}
                        >
                          <div className="relative">
                            <div className="overflow-hidden rounded-md">
                              <div 
                                className={cn(
                                  "flex transition-transform duration-300 ease-in-out"
                                )}
                                style={{ 
                                  transform: `translateX(-${currentInfoSlide * 100}%)` 
                                }}
                              >
                                {/* Slide 1: About Network Rewards */}
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 w-full flex-shrink-0">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-start gap-2">
                                      <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="font-medium">About Network Rewards</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setInfoBoxesVisible(!infoBoxesVisible)}
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                                    >
                                      <ChevronUp className={cn(
                                        "h-3 w-3 transition-transform duration-300",
                                        !infoBoxesVisible && "rotate-180"
                                      )} />
                                      Hide
                                    </button>
                                  </div>
                                  <div className="pl-6">
                                    <p>Network rewards attract customers who have points at other Tap Network merchants but haven't shopped with you before.</p>
                                    <p className="mt-1">These customers can use their existing points to redeem discounts at your store, bringing you <strong>new business</strong> while ensuring you still profit from each transaction.</p>
                                  </div>
                                </div>

                                {/* Slide 2: Why Network Rewards Work */}
                                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 w-full flex-shrink-0">
                                  <div className="flex items-start gap-2">
                                    <TrendingUp className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">Why Network Rewards Work</p>
                                      <ul className="list-disc pl-4 space-y-1 mt-1">
                                        <li>Attract customers who have <strong>never shopped with you</strong></li>
                                        <li>They can <strong>only redeem specific Network Rewards created by you</strong></li>
                                        <li>They come with <strong>spending power</strong> (points from other merchants)</li>
                                        <li>You still <strong>profit</strong> from minimum spend requirements</li>
                                        <li>Great way to <strong>acquire new loyal customers</strong></li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Pagination Dots */}
                            <div className="flex justify-center gap-2 mt-3">
                              <button
                                className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  currentInfoSlide === 0 ? "bg-gray-600" : "bg-gray-300"
                                )}
                                onClick={() => setCurrentInfoSlide(0)}
                              />
                              <button
                                className={cn(
                                  "w-2 h-2 rounded-full transition-colors",
                                  currentInfoSlide === 1 ? "bg-gray-600" : "bg-gray-300"
                                )}
                                onClick={() => setCurrentInfoSlide(1)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className={cn(
                          "space-y-4 transition-all duration-500 ease-in-out", 
                          infoBoxesVisible ? "pt-1" : "-mt-4"
                        )}>
                          <div>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Discount Type</Label>
                              {!infoBoxesVisible && (
                                <button
                                  onClick={() => setInfoBoxesVisible(true)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                  <ChevronUp className="h-3 w-3 rotate-180" />
                                  Show info
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mt-1.5">
                              <div
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  networkRewardType === "dollarOff" 
                                    ? "border-blue-500 bg-blue-50" 
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setNetworkRewardType("dollarOff")}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center",
                                    networkRewardType === "dollarOff" ? "bg-blue-500 text-white" : "bg-gray-100"
                                  )}>
                                    <DollarSign className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">$ Off</p>
                                    <p className="text-xs text-gray-500">Fixed dollar discount</p>
                                  </div>
                                </div>
                              </div>
                              <div
                                className={cn(
                                  "border rounded-md p-3 cursor-pointer transition-all",
                                  networkRewardType === "percentOff" 
                                    ? "border-blue-500 bg-blue-50" 
                                    : "border-gray-200 hover:border-gray-300"
                                )}
                                onClick={() => setNetworkRewardType("percentOff")}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center",
                                    networkRewardType === "percentOff" ? "bg-blue-500 text-white" : "bg-gray-100"
                                  )}>
                                    <Zap className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">% Off</p>
                                    <p className="text-xs text-gray-500">Percentage discount</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="networkRewardName" className="text-sm">Reward Name</Label>
                            <Input
                              id="networkRewardName"
                              placeholder={networkRewardType === "dollarOff" ? "e.g., $10 Off Your First Order" : "e.g., 20% Off Your First Purchase"}
                              value={networkRewardFormData.rewardName}
                              onChange={(e) => setNetworkRewardFormData({...networkRewardFormData, rewardName: e.target.value})}
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="networkDescription" className="text-sm">Description</Label>
                            <Textarea
                              id="networkDescription"
                              placeholder={networkRewardType === "dollarOff" 
                                ? "e.g., Welcome to our store! Get $10 off when you spend $50 or more." 
                                : "e.g., New to our store! Enjoy 20% off your first purchase when you spend $50 or more."}
                              value={networkRewardFormData.description}
                              onChange={(e) => setNetworkRewardFormData({...networkRewardFormData, description: e.target.value})}
                              className="rounded-md"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label htmlFor="networkDiscountValue" className="text-sm">
                                {networkRewardType === "dollarOff" ? "Discount Amount" : "Discount Percentage"}
                              </Label>
                              <div className="relative">
                                {networkRewardType === "dollarOff" && (
                                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <span className="text-gray-500">$</span>
                                  </div>
                                )}
                                <Input
                                  id="networkDiscountValue"
                                  type="text"
                                  className={cn("h-10 rounded-md", networkRewardType === "dollarOff" ? "pl-7" : "")}
                                  placeholder={networkRewardType === "dollarOff" ? "10" : "20"}
                                  value={networkRewardFormData.discountValue}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    setNetworkRewardFormData({...networkRewardFormData, discountValue: value});
                                  }}
                                />
                                {networkRewardType === "percentOff" && (
                                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <span className="text-gray-500">%</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label htmlFor="networkMinimumSpend" className="text-sm">Minimum Spend</Label>
                              <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                  <span className="text-gray-500">$</span>
                                </div>
                                <Input
                                  id="networkMinimumSpend"
                                  type="text"
                                  className="pl-7 h-10 rounded-md"
                                  placeholder="50.00"
                                  value={networkRewardFormData.minimumSpend}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(/[^\d.]/g, '');
                                    setNetworkRewardFormData({...networkRewardFormData, minimumSpend: value});
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="networkPointsCost" className="text-sm">Network Points Cost</Label>
                            <Input
                              id="networkPointsCost"
                              type="text"
                              className="h-10 rounded-md"
                              placeholder="100"
                              value={networkRewardFormData.networkPointsCost}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d]/g, '');
                                setNetworkRewardFormData({...networkRewardFormData, networkPointsCost: value});
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Number of network points customers need to redeem this reward. Points ratios are standardised across the network with $1 earning 3 points.
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="networkPin" className="text-sm">Redemption PIN</Label>
                            <Input
                              id="networkPin"
                              type="text"
                              maxLength={4}
                              placeholder="4-digit PIN"
                              value={networkRewardFormData.pin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setNetworkRewardFormData({...networkRewardFormData, pin: value});
                              }}
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Enter a 4-digit PIN that will be required when redeeming this reward
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 2: Review & Submit */}
                    {currentNetworkRewardStep === 2 && (
                      <div className="mt-0 space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">How Network Rewards Work</p>
                              <ul className="list-disc pl-4 space-y-1 mt-1">
                                <li>Available to customers with points at <strong>other Tap Network merchants</strong></li>
                                <li>Customers spend their existing network points to redeem this discount</li>
                                <li>You receive <strong>full payment</strong> for the minimum spend amount</li>
                                <li>Great way to <strong>acquire new customers</strong> and increase foot traffic</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 border-b">
                            <h3 className="font-medium text-sm">Reward Preview</h3>
                          </div>
                          <div className="p-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="font-medium text-sm">{networkRewardFormData.rewardName}</p>
                                <p className="text-gray-600 text-xs">{networkRewardFormData.description}</p>
                              </div>
                              <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                                Network
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="h-4 w-4 text-green-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 leading-none">Discount</p>
                                <p className="text-sm font-medium leading-tight">
                                  {networkRewardType === "dollarOff" 
                                    ? `$${networkRewardFormData.discountValue} off` 
                                    : `${networkRewardFormData.discountValue}% off`}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <ShoppingBag className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 leading-none">Minimum Spend</p>
                                <p className="text-sm font-medium leading-tight">${networkRewardFormData.minimumSpend}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <Zap className="h-4 w-4 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 leading-none">Network Points Cost</p>
                                <p className="text-sm font-medium leading-tight">{networkRewardFormData.networkPointsCost} points</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Users className="h-4 w-4 text-purple-600" />
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 leading-none">Eligibility</p>
                                <p className="text-sm font-medium leading-tight">Tap Network customers only</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowNetworkRewardForm(false)}
                        className="rounded-md"
                      >
                        Cancel
                      </Button>
                      {currentNetworkRewardStep > 1 && (
                        <Button 
                          variant="outline" 
                          onClick={() => handleNetworkRewardStepChange(currentNetworkRewardStep - 1)}
                          className="rounded-md"
                        >
                          Back
                        </Button>
                      )}
                      <Button 
                        onClick={() => {
                          if (currentNetworkRewardStep < 2) {
                            handleNetworkRewardStepChange(currentNetworkRewardStep + 1);
                          } else {
                            saveNetworkRewardForMerchant();
                          }
                        }}
                        disabled={loading}
                        className="rounded-md"
                      >
                        {loading ? "Processing..." : currentNetworkRewardStep === 2 ? "Create Network Reward" : "Continue"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Create Rewards Tab View */}
        {currentView === 'createRewards' && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                <span className="text-[#007AFF]">Create</span> Custom Rewards
              </h2>
              <p className="text-sm text-gray-600">
                Create any type of reward for any merchant with full customisation options
              </p>
            </div>

            {/* Merchant Selector */}
            <div className="mb-6">
              <Label className="text-sm font-medium">Select Merchant <span className="text-red-500">*</span></Label>
              <Select value={selectedMerchantForReward} onValueChange={setSelectedMerchantForReward}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Choose a merchant to create reward for..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Merchants</SelectLabel>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded border overflow-hidden flex-shrink-0 bg-gray-50">
                            {merchant.logoUrl ? (
                              <img 
                                src={merchant.logoUrl} 
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200"></div>
                            )}
                          </div>
                          <span>{merchant.merchantName || merchant.tradingName || merchant.id}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              {!selectedMerchantForReward && (
                <p className="text-xs text-gray-500 mt-1">
                  You must select a merchant before creating a reward
                </p>
              )}
            </div>

            {selectedMerchantForReward && (
              <>
                {!showRewardForm ? (
                  <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                    <div className="flex items-center gap-3 mb-3">
                      <Gift className="h-5 w-5 text-[#007AFF]" />
                      <h3 className="text-md font-semibold">Custom Reward</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Create a fully customised reward with advanced conditions, limitations, and targeting options
                    </p>
                    <Button
                      onClick={() => setShowRewardForm(true)}
                      variant="outline"
                      className="rounded-md"
                    >
                      Create Custom Reward
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Progress Steps */}
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <button
                          key={step}
                          type="button"
                          onClick={() => handleRewardStepChange(step)}
                          className={`h-2 w-10 rounded-md transition-all ${
                            step === currentRewardStep 
                              ? "bg-blue-600" 
                              : step < currentRewardStep 
                              ? "bg-blue-300" 
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Step 1: Basic Details */}
                    {currentRewardStep === 1 && (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Basic Details</h2>
                          <p className="text-sm text-gray-600">Define the core properties of your reward</p>
                        </div>
                      
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-gray-600">Active</Label>
                                <Switch
                                  checked={rewardFormData.isActive}
                                  onCheckedChange={(checked) => setRewardFormData({ ...rewardFormData, isActive: checked })}
                                />
                              </div>
                            </div>
                            <Input
                              value={rewardFormData.rewardName}
                              onChange={(e) => setRewardFormData({ ...rewardFormData, rewardName: e.target.value })}
                              placeholder="Enter a clear, concise name (e.g., 'Free Coffee Reward')"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Points Cost <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={rewardFormData.pointsCost}
                              onChange={(e) => setRewardFormData({ ...rewardFormData, pointsCost: e.target.value })}
                              placeholder="e.g., 100"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="col-span-2 space-y-2">
                            <Label className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
                            <Textarea
                              value={rewardFormData.description}
                              onChange={(e) => setRewardFormData({ ...rewardFormData, description: e.target.value })}
                              placeholder="Explain what customers will receive when they redeem this reward"
                              className="rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Type <span className="text-red-500">*</span></Label>
                            <Select
                              value={rewardFormData.type}
                              onValueChange={(value) => setRewardFormData({ ...rewardFormData, type: value })}
                            >
                              <SelectTrigger className="h-10 rounded-md">
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
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code (4 digits) <span className="text-red-500">*</span></Label>
                            <Input
                              maxLength={4}
                              value={rewardFormData.pin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                                setRewardFormData({ ...rewardFormData, pin: value })
                              }}
                              placeholder="4-digit PIN (e.g., 1234)"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">Staff will use this PIN during redemption</p>
                          </div>

                          {/* Type-specific fields */}
                          {rewardFormData.type === 'percentageDiscount' && (
                            <div className="col-span-2 space-y-2 border-l-2 border-blue-100 pl-4 py-2">
                              <Label className="text-sm font-medium">Discount Percentage <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                min="1"
                                max="100"
                                value={rewardFormData.discountValue}
                                onChange={(e) => setRewardFormData({ ...rewardFormData, discountValue: e.target.value })}
                                placeholder="e.g., 15 for 15% off"
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          {rewardFormData.type === 'fixedDiscount' && (
                            <div className="col-span-2 space-y-4 border-l-2 border-blue-100 pl-4 py-2">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Discount Amount ($) <span className="text-red-500">*</span></Label>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={rewardFormData.discountValue}
                                  onChange={(e) => setRewardFormData({ ...rewardFormData, discountValue: e.target.value })}
                                  placeholder="e.g., 10 for $10 off"
                                  className="h-10 rounded-md"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Minimum Purchase ($) <span className="text-red-500">*</span></Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={rewardFormData.minimumPurchase}
                                  onChange={(e) => setRewardFormData({ ...rewardFormData, minimumPurchase: e.target.value })}
                                  placeholder="e.g., 25 for minimum $25 purchase"
                                  className="h-10 rounded-md"
                                />
                              </div>
                            </div>
                          )}

                          {rewardFormData.type === 'freeItem' && (
                            <div className="col-span-2 space-y-2 border-l-2 border-blue-100 pl-4 py-2">
                              <Label className="text-sm font-medium">Free Item Name <span className="text-red-500">*</span></Label>
                              <Input
                                type="text"
                                value={rewardFormData.itemName}
                                onChange={(e) => setRewardFormData({ ...rewardFormData, itemName: e.target.value })}
                                placeholder="e.g., Coffee, Muffin, etc."
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          {rewardFormData.type === 'other' && (
                            <div className="col-span-2 space-y-2 border-l-2 border-blue-100 pl-4 py-2">
                              <Label className="text-sm font-medium">Custom Reward Details <span className="text-red-500">*</span></Label>
                              <Textarea
                                value={rewardFormData.customRewardDetails}
                                onChange={(e) => setRewardFormData({ ...rewardFormData, customRewardDetails: e.target.value })}
                                placeholder="Describe your custom reward in detail"
                                className="rounded-md"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 2: Visibility */}
                    {currentRewardStep === 2 && (
                      <div className="space-y-4">
                        <div className="mb-4">
                          <h2 className="text-lg font-semibold">Visibility Settings</h2>
                          <p className="text-sm text-gray-600">Control who can see and access this reward</p>
                        </div>

                        <div className="space-y-4">
                          <Label className="text-sm font-medium">Who Can See This Reward</Label>
                          
                          <RadioGroup 
                            value={rewardFormData.rewardVisibility} 
                            onValueChange={(value) => {
                              setRewardFormData({
                                ...rewardFormData,
                                rewardVisibility: value,
                                conditions: {
                                  ...rewardFormData.conditions,
                                  newCustomer: value === 'new',
                                  useMembershipRequirements: value !== 'new'
                                }
                              });
                            }}
                            className="space-y-3"
                          >
                            <label htmlFor="all-customers" className="block w-full cursor-pointer">
                              <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${rewardFormData.rewardVisibility === 'all' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                                <RadioGroupItem value="all" id="all-customers" className="mt-1" />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium transition-colors duration-200 ${rewardFormData.rewardVisibility === 'all' ? 'text-blue-700' : ''}`}>All Customers</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    This reward will be visible to all customers
                                  </p>
                                </div>
                              </div>
                            </label>
                            
                            <label htmlFor="new-customers" className="block w-full cursor-pointer">
                              <div className={`flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 transition-all duration-200 ${rewardFormData.rewardVisibility === 'new' ? 'bg-blue-50 border-blue-200 shadow-sm' : ''}`}>
                                <RadioGroupItem value="new" id="new-customers" className="mt-1" />
                                <div className="flex-1">
                                  <p className={`text-sm font-medium transition-colors duration-200 ${rewardFormData.rewardVisibility === 'new' ? 'text-blue-700' : ''}`}>New Customers Only</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Only customers who just joined the loyalty program will see this reward
                                  </p>
                                </div>
                              </div>
                            </label>
                          </RadioGroup>
                        </div>
                      </div>
                    )}

                    {/* Simplified steps 3-5 for now */}
                    {currentRewardStep > 2 && (
                      <div className="text-center py-8 text-gray-500">
                        Step {currentRewardStep} configuration - additional options available in full implementation
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowRewardForm(false)}
                        className="rounded-md"
                      >
                        Cancel
                      </Button>
                      {currentRewardStep > 1 && (
                        <Button 
                          variant="outline" 
                          onClick={() => handleRewardStepChange(currentRewardStep - 1)}
                          className="rounded-md"
                        >
                          Back
                        </Button>
                      )}
                      <Button 
                        onClick={() => {
                          if (currentRewardStep < 5) {
                            handleRewardStepChange(currentRewardStep + 1);
                          } else {
                            saveRewardForMerchant();
                          }
                        }}
                        disabled={loading}
                        className="rounded-md"
                      >
                        {loading ? "Processing..." : currentRewardStep === 5 ? "Create Reward" : "Next"}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Delete Reward Dialog */}
      <Dialog open={isDeleteRewardDialogOpen} onOpenChange={setIsDeleteRewardDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this reward? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {rewardToDelete && (
            <div className="py-4">
              <p className="text-sm text-gray-500 mb-2">
                <strong>Reward:</strong> {rewardToDelete.rewardName || rewardToDelete.rewardId}
              </p>
              <p className="text-sm text-gray-500 mb-2">
                <strong>Collection:</strong> {rewardToDelete.collection}
              </p>
              <p className="text-sm text-gray-500">
                <strong>Path:</strong> {rewardToDelete.collectionPath}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteRewardDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDeleteReward}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Rewards Dialog */}
      <Dialog open={isDeleteAllRewardsDialogOpen} onOpenChange={setIsDeleteAllRewardsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete All Rewards</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {rewards.length} rewards? This action cannot be undone and will remove rewards from all collections (global, merchant, and customer).
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Warning: This will permanently delete all rewards
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>This action will delete:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li>{rewards.filter(r => r.collection === 'global').length} global rewards</li>
                      <li>{rewards.filter(r => r.collection === 'merchant').length} merchant rewards</li>
                      <li>{rewards.filter(r => r.collection === 'customer').length} customer rewards</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAllRewardsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteAllRewards}>
              Delete All Rewards
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Selected Merchants Dialog */}
      <Dialog open={isDeleteSelectedMerchantsDialogOpen} onOpenChange={setIsDeleteSelectedMerchantsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Merchants</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedMerchants.length} selected merchant{selectedMerchants.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSelectedMerchantsDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelectedMerchants}>
              Delete {selectedMerchants.length} Merchant{selectedMerchants.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Selected Customers Dialog */}
      <Dialog open={isDeleteSelectedCustomersDialogOpen} onOpenChange={setIsDeleteSelectedCustomersDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Customers</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedCustomers.length} selected customer{selectedCustomers.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteSelectedCustomersDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSelectedCustomers}>
              Delete {selectedCustomers.length} Customer{selectedCustomers.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Merchant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Make changes to the merchant information here.
            </DialogDescription>
          </DialogHeader>
          
          {editingMerchant && (
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="address">Address & Contact</TabsTrigger>
                <TabsTrigger value="business">Business Settings</TabsTrigger>
                <TabsTrigger value="hours">Operating Hours</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        id="logoUrl"
                        value={editingMerchant.logoUrl || ""}
                        onChange={(e) => handleFieldChange("logoUrl", e.target.value)}
                        className="flex-1"
                      />
                      {editingMerchant.logoUrl && (
                        <div className="w-12 h-12 rounded border overflow-hidden flex-shrink-0">
                          <img 
                            src={editingMerchant.logoUrl} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                            onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="merchantName">Merchant Name</Label>
                    <Input
                      id="merchantName"
                      value={editingMerchant.merchantName || ""}
                      onChange={(e) => handleFieldChange("merchantName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tradingName">Trading Name</Label>
                    <Input
                      id="tradingName"
                      value={editingMerchant.tradingName || ""}
                      onChange={(e) => handleFieldChange("tradingName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="legalName">Legal Name</Label>
                    <Input
                      id="legalName"
                      value={editingMerchant.legalName || ""}
                      onChange={(e) => handleFieldChange("legalName", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Input
                      id="businessType"
                      value={editingMerchant.businessType || ""}
                      onChange={(e) => handleFieldChange("businessType", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="abn">ABN</Label>
                    <Input
                      id="abn"
                      value={editingMerchant.abn || ""}
                      onChange={(e) => handleFieldChange("abn", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={editingMerchant.status} 
                      onValueChange={(value) => handleFieldChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="merchantId">Merchant ID</Label>
                    <Input
                      id="merchantId"
                      value={editingMerchant.merchantId || ""}
                      onChange={(e) => handleFieldChange("merchantId", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="merchantPoints">Merchant Points</Label>
                    <Input
                      id="merchantPoints"
                      type="number"
                      value={editingMerchant.merchantPoints || 0}
                      onChange={(e) => handleFieldChange("merchantPoints", parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="address" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="street">Street</Label>
                    <Input
                      id="street"
                      value={editingMerchant.address?.street || ""}
                      onChange={(e) => handleAddressChange("street", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="suburb">Suburb</Label>
                    <Input
                      id="suburb"
                      value={editingMerchant.address?.suburb || ""}
                      onChange={(e) => handleAddressChange("suburb", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="postcode">Postcode</Label>
                    <Input
                      id="postcode"
                      value={editingMerchant.address?.postcode || ""}
                      onChange={(e) => handleAddressChange("postcode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select 
                      value={editingMerchant.address?.state} 
                      onValueChange={(value) => handleAddressChange("state", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIC">VIC</SelectItem>
                        <SelectItem value="NSW">NSW</SelectItem>
                        <SelectItem value="QLD">QLD</SelectItem>
                        <SelectItem value="WA">WA</SelectItem>
                        <SelectItem value="SA">SA</SelectItem>
                        <SelectItem value="TAS">TAS</SelectItem>
                        <SelectItem value="ACT">ACT</SelectItem>
                        <SelectItem value="NT">NT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editingMerchant.address?.country || ""}
                      onChange={(e) => handleAddressChange("country", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="countryCode">Country Code</Label>
                    <Input
                      id="countryCode"
                      value={editingMerchant.address?.countryCode || ""}
                      onChange={(e) => handleAddressChange("countryCode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="isoCountryCode">ISO Country Code</Label>
                    <Input
                      id="isoCountryCode"
                      value={editingMerchant.address?.isoCountryCode || ""}
                      onChange={(e) => handleAddressChange("isoCountryCode", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subAdministrativeArea">Sub Administrative Area</Label>
                    <Input
                      id="subAdministrativeArea"
                      value={editingMerchant.address?.subAdministrativeArea || ""}
                      onChange={(e) => handleAddressChange("subAdministrativeArea", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subLocality">Sub Locality</Label>
                    <Input
                      id="subLocality"
                      value={editingMerchant.address?.subLocality || ""}
                      onChange={(e) => handleAddressChange("subLocality", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="displayAddress">Display Address</Label>
                    <Input
                      id="displayAddress"
                      value={editingMerchant.displayAddress || ""}
                      onChange={(e) => handleFieldChange("displayAddress", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-4">
                  <div className="text-sm font-medium">Location Details</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locationAddress">Location Address</Label>
                      <Input
                        id="locationAddress"
                        value={editingMerchant.location?.address || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              address: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="locationDisplayAddress">Location Display Address</Label>
                      <Input
                        id="locationDisplayAddress"
                        value={editingMerchant.location?.displayAddress || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              displayAddress: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="areaOfInterest">Area of Interest</Label>
                      <Input
                        id="areaOfInterest"
                        value={editingMerchant.location?.areaOfInterest || ""}
                        onChange={(e) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            location: {
                              ...editingMerchant.location,
                              areaOfInterest: e.target.value
                            }
                          });
                        }}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="inlandWater">Inland Water</Label>
                      <Input
                        id="inlandWater"
                        value={editingMerchant.inlandWater || ""}
                        onChange={(e) => handleFieldChange("inlandWater", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="ocean">Ocean</Label>
                      <Input
                        id="ocean"
                        value={editingMerchant.ocean || ""}
                        onChange={(e) => handleFieldChange("ocean", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Input
                        id="timeZone"
                        value={editingMerchant.timeZone || ""}
                        onChange={(e) => handleFieldChange("timeZone", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="primaryEmail">Primary Email</Label>
                    <Input
                      id="primaryEmail"
                      value={editingMerchant.primaryEmail || ""}
                      onChange={(e) => handleFieldChange("primaryEmail", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      value={editingMerchant.businessEmail || ""}
                      onChange={(e) => handleFieldChange("businessEmail", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      value={editingMerchant.businessPhone || ""}
                      onChange={(e) => handleFieldChange("businessPhone", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repName">Representative Name</Label>
                    <Input
                      id="repName"
                      value={editingMerchant.representative?.name || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            name: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repPhone">Representative Phone</Label>
                    <Input
                      id="repPhone"
                      value={editingMerchant.representative?.phone || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            phone: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="repEmail">Representative Email</Label>
                    <Input
                      id="repEmail"
                      value={editingMerchant.representative?.email || ""}
                      onChange={(e) => {
                        setEditingMerchant({
                          ...editingMerchant,
                          representative: {
                            ...editingMerchant.representative,
                            email: e.target.value
                          }
                        });
                      }}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="business" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="defaultMultiplier">Default Multiplier</Label>
                    <Input
                      id="defaultMultiplier"
                      type="number"
                      value={editingMerchant.defaultMultiplier || 1}
                      onChange={(e) => handleFieldChange("defaultMultiplier", parseFloat(e.target.value) || 1)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pointOfSale">Point of Sale System</Label>
                    <Input
                      id="pointOfSale"
                      value={editingMerchant.pointOfSale || ""}
                      onChange={(e) => handleFieldChange("pointOfSale", e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="paymentProvider">Payment Provider</Label>
                    <Input
                      id="paymentProvider"
                      value={editingMerchant.paymentProvider || ""}
                      onChange={(e) => handleFieldChange("paymentProvider", e.target.value)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="hasIntroductoryReward"
                      checked={editingMerchant.hasIntroductoryReward || false}
                      onCheckedChange={(checked) => handleFieldChange("hasIntroductoryReward", checked === true)}
                    />
                    <Label htmlFor="hasIntroductoryReward">Has Introductory Reward</Label>
                  </div>
                  
                  {editingMerchant.hasIntroductoryReward && (
                    <div>
                      <Label htmlFor="introductoryRewardId">Introductory Reward ID</Label>
                      <Input
                        id="introductoryRewardId"
                        value={editingMerchant.introductoryRewardId || ""}
                        onChange={(e) => handleFieldChange("introductoryRewardId", e.target.value)}
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="onboardingCompleted"
                      checked={editingMerchant.onboardingCompleted || false}
                      onCheckedChange={(checked) => handleFieldChange("onboardingCompleted", checked === true)}
                    />
                    <Label htmlFor="onboardingCompleted">Onboarding Completed</Label>
                  </div>
                  
                  {editingMerchant.onboardingCompleted && (
                    <div>
                      <Label htmlFor="onboardingCompletedAt">Onboarding Completed At</Label>
                      <Input
                        id="onboardingCompletedAt"
                        value={editingMerchant.onboardingCompletedAt || ""}
                        onChange={(e) => handleFieldChange("onboardingCompletedAt", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="hours" className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  Configure operating hours for each day of the week
                </div>
                
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                  <div key={day} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium capitalize">{day}</h3>
                      <div className="flex-1 h-px bg-gray-200"></div>
                      <Checkbox
                        id={`${day}-closed`}
                        checked={editingMerchant.operatingHours?.[day]?.isClosed || false}
                        onCheckedChange={(checked) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            operatingHours: {
                              ...editingMerchant.operatingHours,
                              [day]: {
                                ...editingMerchant.operatingHours?.[day],
                                isClosed: checked === true
                              }
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`${day}-closed`} className="text-sm">Closed</Label>
                    </div>
                    
                    {!editingMerchant.operatingHours?.[day]?.isClosed && (
                      <div className="grid grid-cols-2 gap-4 pl-4">
                        <div>
                          <Label htmlFor={`${day}-open`}>Opening Time</Label>
                          <Input
                            id={`${day}-open`}
                            value={editingMerchant.operatingHours?.[day]?.open || ""}
                            onChange={(e) => {
                              setEditingMerchant({
                                ...editingMerchant,
                                operatingHours: {
                                  ...editingMerchant.operatingHours,
                                  [day]: {
                                    ...editingMerchant.operatingHours?.[day],
                                    open: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="09:00"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor={`${day}-close`}>Closing Time</Label>
                          <Input
                            id={`${day}-close`}
                            value={editingMerchant.operatingHours?.[day]?.close || ""}
                            onChange={(e) => {
                              setEditingMerchant({
                                ...editingMerchant,
                                operatingHours: {
                                  ...editingMerchant.operatingHours,
                                  [day]: {
                                    ...editingMerchant.operatingHours?.[day],
                                    close: e.target.value
                                  }
                                }
                              });
                            }}
                            placeholder="17:00"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="notifications" className="space-y-4">
                <div className="text-sm text-gray-500 mb-4">
                  Configure which notifications this merchant should receive
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "customerAnniversary", label: "Customer Anniversary" },
                    { key: "customerBirthday", label: "Customer Birthday" },
                    { key: "customerFirstPurchase", label: "Customer First Purchase" },
                    { key: "customerMilestone", label: "Customer Milestone" },
                    { key: "dailySummary", label: "Daily Summary" },
                    { key: "lowInventory", label: "Low Inventory" },
                    { key: "monthlySummary", label: "Monthly Summary" },
                    { key: "paymentIssues", label: "Payment Issues" },
                    { key: "pointsAwarded", label: "Points Awarded" },
                    { key: "rewardCreated", label: "Reward Created" },
                    { key: "rewardExpiring", label: "Reward Expiring" },
                    { key: "rewardRedeemed", label: "Reward Redeemed" },
                    { key: "salesTarget", label: "Sales Target" },
                    { key: "securityAlerts", label: "Security Alerts" },
                    { key: "systemUpdates", label: "System Updates" },
                    { key: "weeklySummary", label: "Weekly Summary" }
                  ].map(notification => (
                    <div key={notification.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`notification-${notification.key}`}
                        checked={
                          editingMerchant.notifications?.[notification.key as keyof typeof editingMerchant.notifications] || false
                        }
                        onCheckedChange={(checked) => {
                          setEditingMerchant({
                            ...editingMerchant,
                            notifications: {
                              ...editingMerchant.notifications,
                              [notification.key]: checked === true
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`notification-${notification.key}`}>{notification.label}</Label>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMerchant}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Merchant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this merchant? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {editingMerchant && (
            <div className="py-4">
              <p className="text-sm text-gray-500">
                You are about to delete: <strong>{editingMerchant.tradingName || editingMerchant.merchantName}</strong>
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteMerchant}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Merchant Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Merchant</DialogTitle>
            <DialogDescription>
              Enter the details for the new merchant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 mb-2">
              <Label htmlFor="newLogoUrl">Logo URL</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="newLogoUrl"
                  value={newMerchant.logoUrl || ""}
                  onChange={(e) => handleNewMerchantFieldChange("logoUrl", e.target.value)}
                  className="flex-1"
                  placeholder="https://example.com/logo.png"
                />
                {newMerchant.logoUrl && (
                  <div className="w-12 h-12 rounded border overflow-hidden flex-shrink-0">
                    <img 
                      src={newMerchant.logoUrl} 
                      alt="Logo preview" 
                      className="w-full h-full object-cover"
                      onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newMerchantName">Merchant Name</Label>
                <Input
                  id="newMerchantName"
                  value={newMerchant.merchantName || ""}
                  onChange={(e) => handleNewMerchantFieldChange("merchantName", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newTradingName">Trading Name</Label>
                <Input
                  id="newTradingName"
                  value={newMerchant.tradingName || ""}
                  onChange={(e) => handleNewMerchantFieldChange("tradingName", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newBusinessType">Business Type</Label>
                <Input
                  id="newBusinessType"
                  value={newMerchant.businessType || ""}
                  onChange={(e) => handleNewMerchantFieldChange("businessType", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newAbn">ABN</Label>
                <Input
                  id="newAbn"
                  value={newMerchant.abn || ""}
                  onChange={(e) => handleNewMerchantFieldChange("abn", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="newPrimaryEmail">Primary Email</Label>
                <Input
                  id="newPrimaryEmail"
                  value={newMerchant.primaryEmail || ""}
                  onChange={(e) => handleNewMerchantFieldChange("primaryEmail", e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newStreet">Street</Label>
                <Input
                  id="newStreet"
                  value={newMerchant.address?.street || ""}
                  onChange={(e) => handleNewMerchantAddressChange("street", e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="newSuburb">Suburb</Label>
                <Input
                  id="newSuburb"
                  value={newMerchant.address?.suburb || ""}
                  onChange={(e) => handleNewMerchantAddressChange("suburb", e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="newPostcode">Postcode</Label>
                  <Input
                    id="newPostcode"
                    value={newMerchant.address?.postcode || ""}
                    onChange={(e) => handleNewMerchantAddressChange("postcode", e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="newState">State</Label>
                  <Select 
                    value={newMerchant.address?.state} 
                    onValueChange={(value) => handleNewMerchantAddressChange("state", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIC">VIC</SelectItem>
                      <SelectItem value="NSW">NSW</SelectItem>
                      <SelectItem value="QLD">QLD</SelectItem>
                      <SelectItem value="WA">WA</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="TAS">TAS</SelectItem>
                      <SelectItem value="ACT">ACT</SelectItem>
                      <SelectItem value="NT">NT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="newStatus">Status</Label>
                <Select 
                  value={newMerchant.status} 
                  onValueChange={(value) => handleNewMerchantFieldChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateMerchant}>
              Create Merchant
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Function Dialog */}
      <Dialog open={isEditFunctionDialogOpen} onOpenChange={setIsEditFunctionDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Function Configuration</DialogTitle>
            <DialogDescription>
              Customize your cloud function configuration.
            </DialogDescription>
          </DialogHeader>
          
          {editingFunction && (
            <Tabs defaultValue="basic">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="basic">Basic Settings</TabsTrigger>
                <TabsTrigger value="config">Advanced Configuration</TabsTrigger>
                {editingFunction.name === "createRewards" && (
                  <TabsTrigger value="rewards">Reward Configuration</TabsTrigger>
                )}
                <TabsTrigger value="code">Function Code</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="functionName">Function Name</Label>
                    <Input
                      id="functionName"
                      value={editingFunction.name}
                      onChange={(e) => setEditingFunction({...editingFunction, name: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="enabled">Status</Label>
                    <Select 
                      value={editingFunction.enabled ? "enabled" : "disabled"} 
                      onValueChange={(value) => setEditingFunction({...editingFunction, enabled: value === "enabled"})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={editingFunction.description}
                      onChange={(e) => setEditingFunction({...editingFunction, description: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="schedule">Schedule (cron format)</Label>
                    <Input
                      id="schedule"
                      value={editingFunction.schedule}
                      onChange={(e) => setEditingFunction({...editingFunction, schedule: e.target.value})}
                      placeholder="0 */12 * * *"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Example: 0 */12 * * * runs every 12 hours
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="timeZone">Timezone</Label>
                    <Select 
                      value={editingFunction.timeZone} 
                      onValueChange={(value) => setEditingFunction({...editingFunction, timeZone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                        <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                        <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                        <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                        <SelectItem value="Pacific/Auckland">Pacific/Auckland</SelectItem>
                        <SelectItem value="UTC">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="config" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="memory">Memory Allocation</Label>
                    <Select 
                      value={editingFunction.memory} 
                      onValueChange={(value) => setEditingFunction({...editingFunction, memory: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select memory" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="128MiB">128MiB</SelectItem>
                        <SelectItem value="256MiB">256MiB</SelectItem>
                        <SelectItem value="512MiB">512MiB</SelectItem>
                        <SelectItem value="1GiB">1GiB</SelectItem>
                        <SelectItem value="2GiB">2GiB</SelectItem>
                        <SelectItem value="4GiB">4GiB</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="timeout">Timeout (seconds)</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={editingFunction.timeoutSeconds}
                      onChange={(e) => setEditingFunction({...editingFunction, timeoutSeconds: parseInt(e.target.value) || 60})}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Maximum: 540 seconds (9 minutes)
                    </p>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="secrets">Secrets</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editingFunction.secrets.map((secret, index) => (
                        <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded">
                          <span>{secret}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => {
                              const newSecrets = [...editingFunction.secrets];
                              newSecrets.splice(index, 1);
                              setEditingFunction({...editingFunction, secrets: newSecrets});
                            }}
                          >
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex">
                        <Input
                          id="newSecret"
                          placeholder="Add new secret"
                          className="h-8"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.currentTarget.value) {
                              e.preventDefault();
                              const newSecret = e.currentTarget.value;
                              setEditingFunction({
                                ...editingFunction, 
                                secrets: [...editingFunction.secrets, newSecret]
                              });
                              e.currentTarget.value = "";
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-2"
                          onClick={() => {
                            const input = document.getElementById('newSecret') as HTMLInputElement;
                            if (input.value) {
                              setEditingFunction({
                                ...editingFunction, 
                                secrets: [...editingFunction.secrets, input.value]
                              });
                              input.value = "";
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {editingFunction.name === "createRewards" && (
                <TabsContent value="rewards" className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h3 className="font-medium text-blue-800 mb-2">Reward Generation Settings</h3>
                    <p className="text-sm text-blue-700">
                      Configure how rewards are generated for your customers.
                    </p>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">AI Model Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aiModel">AI Model</Label>
                        <Select 
                          value={editingFunction.code.includes("gpt-4.1") ? "gpt-4.1" : "gpt-3.5-turbo"}
                          onValueChange={(value) => {
                            const updatedCode = editingFunction.code.replace(
                              /model: "([^"]+)"/,
                              `model: "${value}"`
                            );
                            setEditingFunction({...editingFunction, code: updatedCode});
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select AI model" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4.1">GPT-4 (Most capable)</SelectItem>
                            <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster, cheaper)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="maxRewardsPerCustomer">Max Rewards Per Customer</Label>
                        <Input
                          id="maxRewardsPerCustomer"
                          type="number"
                          min="1"
                          max="10"
                          value={safeRegexMatch(/if \(rewardsSnap\.size >= (\d+)\)/, editingFunction.code, "4")}
                          onChange={(e) => {
                            const maxRewards = e.target.value;
                            let updatedCode = editingFunction.code.replace(
                              /if \(rewardsSnap\.size >= (\d+)\)/g,
                              `if (rewardsSnap.size >= ${maxRewards})`
                            );
                            updatedCode = updatedCode.replace(
                              /const numToCreate = (\d+) - rewardsSnap\.size/g,
                              `const numToCreate = ${maxRewards} - rewardsSnap.size`
                            );
                            setEditingFunction({...editingFunction, code: updatedCode});
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Reward Types Configuration</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Configure the types of rewards that will be generated.
                    </p>
                    
                    <div className="space-y-4">
                      {["Discount Voucher", "Loyalty Bonus", "Exclusive Access Pass", "Free Gift"].map((rewardType, index) => {
                        // Extract current settings from code
                        const rewardTypeRegex = new RegExp(`{ conditionsType: "([^"]+)", offeringType: "${rewardType}" }`);
                        const match = editingFunction.code.match(rewardTypeRegex);
                        const currentConditionType = match ? match[1] : "none";
                        
                        return (
                          <div key={rewardType} className="grid grid-cols-3 gap-4 pb-4 border-b last:border-0 last:pb-0">
                            <div>
                              <Label>{rewardType}</Label>
                              <div className="mt-1">
                                <Select 
                                  value={currentConditionType}
                                  onValueChange={(value) => {
                                    const updatedCode = editingFunction.code.replace(
                                      rewardTypeRegex,
                                      `{ conditionsType: "${value}", offeringType: "${rewardType}" }`
                                    );
                                    setEditingFunction({...editingFunction, code: updatedCode});
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Condition type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">No Conditions</SelectItem>
                                    <SelectItem value="optional">Optional Conditions</SelectItem>
                                    <SelectItem value="required">Required Conditions</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="col-span-2">
                              <Label>Display Name</Label>
                              <Input 
                                value={rewardType}
                                onChange={(e) => {
                                  const newName = e.target.value;
                                  const updatedCode = editingFunction.code.replace(
                                    new RegExp(`offeringType: "${rewardType}"`, 'g'),
                                    `offeringType: "${newName}"`
                                  );
                                  setEditingFunction({...editingFunction, code: updatedCode});
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Extract current reward types
                          const baseSpecsMatch = editingFunction.code.match(/const baseSpecs = \[([\s\S]*?)\];/);
                          if (baseSpecsMatch) {
                            const currentBaseSpecs = baseSpecsMatch[1];
                            const updatedBaseSpecs = currentBaseSpecs + ',\n        { conditionsType: "none", offeringType: "New Reward Type" }';
                            const updatedCode = editingFunction.code.replace(
                              /const baseSpecs = \[([\s\S]*?)\];/,
                              `const baseSpecs = [${updatedBaseSpecs}];`
                            );
                            setEditingFunction({...editingFunction, code: updatedCode});
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Reward Type
                      </Button>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Reward Expiration Settings</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="expiryHours">Expiry Time (hours)</Label>
                        <Input
                          id="expiryHours"
                          type="number"
                          min="1"
                          value={safeRegexMatch(/const expiry = new Date\(now\.getTime\(\) \+ (\d+) \* 60 \* 60 \* 1000\)/, editingFunction.code, "12")}
                          onChange={(e) => {
                            const hours = e.target.value;
                            const updatedCode = editingFunction.code.replace(
                              /const expiry = new Date\(now\.getTime\(\) \+ (\d+) \* 60 \* 60 \* 1000\)/,
                              `const expiry = new Date(now.getTime() + ${hours} * 60 * 60 * 1000)`
                            );
                            setEditingFunction({...editingFunction, code: updatedCode});
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          How long rewards will be valid after creation
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">AI Prompt Configuration</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Customize the prompt sent to the AI for generating rewards.
                    </p>
                    
                    <div>
                      <Label htmlFor="systemPrompt">System Prompt</Label>
                      <textarea
                        id="systemPrompt"
                        className="w-full h-20 p-2 mt-1 border rounded-md text-sm font-mono"
                        value={safeRegexMatch(/role: "system",\s+content: "([^"]+)"/, editingFunction.code, 
                          "You are a conversational assistant helping users create reward programs for their customers.")}
                        onChange={(e) => {
                          const systemPrompt = e.target.value;
                          const updatedCode = editingFunction.code.replace(
                            /role: "system",\s+content: "([^"]+)"/,
                            `role: "system",\n                  content: "${systemPrompt}"`
                          );
                          setEditingFunction({...editingFunction, code: updatedCode});
                        }}
                      />
                    </div>
                    
                    <div className="mt-4">
                      <Label htmlFor="userPromptTemplate">User Prompt Template</Label>
                      <textarea
                        id="userPromptTemplate"
                        className="w-full h-40 p-2 mt-1 border rounded-md text-sm font-mono"
                        value={safeRegexMatch(/const promptContent = `([^`]+)`;/, editingFunction.code, "")}
                        onChange={(e) => {
                          const userPrompt = e.target.value;
                          const updatedCode = editingFunction.code.replace(
                            /const promptContent = `([^`]+)`;/,
                            `const promptContent = \`${userPrompt}\`;`
                          );
                          setEditingFunction({...editingFunction, code: updatedCode});
                        }}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can use template variables like ${`{conditionInstruction}`}, ${`{customerData}`}, etc.
                      </p>
                    </div>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Processing Limits</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="batchSize">Max Writes Per Batch</Label>
                        <Input
                          id="batchSize"
                          type="number"
                          min="100"
                          max="1000"
                          value={safeRegexMatch(/const MAX_WRITES_PER_BATCH = (\d+);/, editingFunction.code, "500")}
                          onChange={(e) => {
                            const batchSize = e.target.value;
                            const updatedCode = editingFunction.code.replace(
                              /const MAX_WRITES_PER_BATCH = \d+;/,
                              `const MAX_WRITES_PER_BATCH = ${batchSize};`
                            );
                            setEditingFunction({...editingFunction, code: updatedCode});
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Maximum number of Firestore writes before committing a batch
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
              
              <TabsContent value="code" className="space-y-4">
                <div>
                  <Label htmlFor="functionCode">Function Code</Label>
                  <div className="border rounded-md mt-1 bg-gray-50">
                    <textarea
                      id="functionCode"
                      value={editingFunction.code}
                      onChange={(e) => setEditingFunction({...editingFunction, code: e.target.value})}
                      className="w-full h-96 p-4 font-mono text-sm bg-transparent focus:outline-none"
                      spellCheck="false"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditFunctionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFunction}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Function Dialog */}
      <Dialog open={isAddFunctionDialogOpen} onOpenChange={setIsAddFunctionDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Function</DialogTitle>
            <DialogDescription>
              Configure a new cloud function.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="basic">Basic Settings</TabsTrigger>
              <TabsTrigger value="config">Advanced Configuration</TabsTrigger>
              <TabsTrigger value="code">Function Code</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newFunctionName">Function Name</Label>
                  <Input
                    id="newFunctionName"
                    value={newFunction.name}
                    onChange={(e) => setNewFunction({...newFunction, name: e.target.value})}
                    placeholder="myFunction"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newEnabled">Status</Label>
                  <Select 
                    value={newFunction.enabled ? "enabled" : "disabled"} 
                    onValueChange={(value) => setNewFunction({...newFunction, enabled: value === "enabled"})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="enabled">Enabled</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="newDescription">Description</Label>
                  <Input
                    id="newDescription"
                    value={newFunction.description}
                    onChange={(e) => setNewFunction({...newFunction, description: e.target.value})}
                    placeholder="Describe what this function does"
                  />
                </div>
                
                <div>
                  <Label htmlFor="newSchedule">Schedule (cron format)</Label>
                  <Input
                    id="newSchedule"
                    value={newFunction.schedule}
                    onChange={(e) => setNewFunction({...newFunction, schedule: e.target.value})}
                    placeholder="0 0 * * *"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Example: 0 0 * * * runs daily at midnight
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="newTimeZone">Timezone</Label>
                  <Select 
                    value={newFunction.timeZone} 
                    onValueChange={(value) => setNewFunction({...newFunction, timeZone: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                      <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                      <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                      <SelectItem value="Pacific/Auckland">Pacific/Auckland</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="config" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newMemory">Memory Allocation</Label>
                  <Select 
                    value={newFunction.memory} 
                    onValueChange={(value) => setNewFunction({...newFunction, memory: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select memory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="128MiB">128MiB</SelectItem>
                      <SelectItem value="256MiB">256MiB</SelectItem>
                      <SelectItem value="512MiB">512MiB</SelectItem>
                      <SelectItem value="1GiB">1GiB</SelectItem>
                      <SelectItem value="2GiB">2GiB</SelectItem>
                      <SelectItem value="4GiB">4GiB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="newTimeout">Timeout (seconds)</Label>
                  <Input
                    id="newTimeout"
                    type="number"
                    value={newFunction.timeoutSeconds}
                    onChange={(e) => setNewFunction({...newFunction, timeoutSeconds: parseInt(e.target.value) || 60})}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Maximum: 540 seconds (9 minutes)
                  </p>
                </div>
                
                <div className="col-span-2">
                  <Label htmlFor="newSecrets">Secrets</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newFunction.secrets.map((secret, index) => (
                      <div key={index} className="flex items-center bg-gray-100 px-2 py-1 rounded">
                        <span>{secret}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 w-5 p-0 ml-1"
                          onClick={() => {
                            const newSecrets = [...newFunction.secrets];
                            newSecrets.splice(index, 1);
                            setNewFunction({...newFunction, secrets: newSecrets});
                          }}
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex">
                      <Input
                        id="addNewSecret"
                        placeholder="Add new secret"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            e.preventDefault();
                            const newSecret = e.currentTarget.value;
                            setNewFunction({
                              ...newFunction, 
                              secrets: [...newFunction.secrets, newSecret]
                            });
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          const input = document.getElementById('addNewSecret') as HTMLInputElement;
                          if (input.value) {
                            setNewFunction({
                              ...newFunction, 
                              secrets: [...newFunction.secrets, input.value]
                            });
                            input.value = "";
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="code" className="space-y-4">
              <div>
                <Label htmlFor="newFunctionCode">Function Code</Label>
                <div className="border rounded-md mt-1 bg-gray-50">
                  <textarea
                    id="newFunctionCode"
                    value={newFunction.code}
                    onChange={(e) => setNewFunction({...newFunction, code: e.target.value})}
                    className="w-full h-96 p-4 font-mono text-sm bg-transparent focus:outline-none"
                    spellCheck="false"
                    placeholder="// Write your function code here"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFunctionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFunction} disabled={!newFunction.name || !newFunction.code}>
              Create Function
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 