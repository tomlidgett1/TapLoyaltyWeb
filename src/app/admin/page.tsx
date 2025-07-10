"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
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
import { ChevronDown, Edit, MoreHorizontal, Plus, Trash, ArrowLeft, ArrowUp, ArrowDown, CheckCircle, XCircle, User } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
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
  const [currentView, setCurrentView] = useState<'merchants' | 'customers' | 'functions' | 'rewards'>('merchants');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
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

        {/* Entity type tabs */}
        <Tabs 
          defaultValue="merchants" 
          className="mb-8" 
          onValueChange={(value) => setCurrentView(value as 'merchants' | 'customers' | 'functions' | 'rewards')}
        >
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="functions">Functions</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
          </TabsList>
        </Tabs>

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
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              {searchTerm ? "No merchants match your search" : "No merchants found"}
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedMerchants.map((merchant) => (
                            <TableRow key={merchant.id}>
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
                            <TableHead className="w-[200px] sticky left-0 bg-white z-20 border-r">
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
                                <TableCell className="font-medium sticky left-0 bg-white z-10 border-r">
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
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          {searchTerm ? "No customers match your search" : "No customers found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedCustomers.map((customer) => (
                        <TableRow key={customer.id}>
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