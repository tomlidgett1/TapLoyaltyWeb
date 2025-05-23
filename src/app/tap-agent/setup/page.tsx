"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { AgentConfig } from "@/types/agent-config"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BusinessBrandForm } from "./components/business-brand-form"
import { AgentTasksForm } from "./components/agent-tasks-form"
import { BusinessHoursForm } from "./components/business-hours-form"
import { ObjectivesForm } from "./components/objectives-form"
import { ProductPricingForm } from "./components/product-pricing-form"
import { FinancialGuardrailsForm } from "./components/financial-guardrails-form"
import { CustomerSegmentsForm } from "./components/customer-segments-form"
import { CustomerCohortsForm } from "./components/customer-cohorts-form"
import { RewardConstraintsForm } from "./components/reward-constraints-form"
import { MessagingConstraintsForm } from "./components/messaging-constraints-form"
import { EmailSetupForm } from "./components/email-setup-form"
import { CustomersList } from "./components/customers-view"
import { PageHeader } from "@/components/page-header"
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from "@/components/ui/sheet"
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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { 
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { 
  Bot, 
  Award, 
  Check, 
  ChevronRight, 
  Loader2, 
  Wrench,
  MessageSquare,
  Layers,
  Mail,
  Mic,
  BookOpen,
  PlusCircle,
  ArrowLeft,
  BookText,
  Target,
  Calendar,
  Clock,
  Store,
  DollarSign,
  Users,
  UserCircle,
  Gift,
  Send,
  Info,
  Sparkles,
  Zap,
  BarChart,
  Heart,
  Gauge,
  ShieldCheck,
  Megaphone,
  Star,
  Hourglass,
  CircleDollarSign,
  Wallet,
  Building2,
  CheckCircle,
  TagsIcon,
  LineChart,
  UsersRound,
  X,
  Maximize2,
  Minimize2,
  Clock as Clock3,
  RefreshCcw
} from "lucide-react"

// Define the structure for the business knowledge data
interface BusinessKnowledge {
  generalInfo: string;
  manualEntries: Array<{
    id: string;
    content: string;
    timestamp: number;
    source: 'manual' | 'voice';
  }>;
  lastUpdated: number;
  publicHolidays?: string;
  returnPolicy?: string;
}

// Default agent configuration
const defaultAgentConfig: AgentConfig = {
  businessBrand: {
    businessName: "",
    businessContext: "",
    primaryColor: "#007AFF",
    secondaryColor: "#FFFFFF",
    brandVoice: []
  },
  agentTasks: {
    rewardsGeneration: false,
    reEngagement: false,
    bannerCreation: false,
    emailMarketing: false,
    customerMessaging: false,
    performanceAnalysis: false
  },
  businessHours: {
    monday: { open: true, start: "09:00", end: "17:00" },
    tuesday: { open: true, start: "09:00", end: "17:00" },
    wednesday: { open: true, start: "09:00", end: "17:00" },
    thursday: { open: true, start: "09:00", end: "17:00" },
    friday: { open: true, start: "09:00", end: "17:00" },
    saturday: { open: true, start: "09:00", end: "17:00" },
    sunday: { open: false, start: "09:00", end: "17:00" }
  },
  objectives: {
    businessObjectives: [
      { id: "increase_revenue", label: "Increase overall revenue", priority: 10 }
    ],
    customerValuePriorities: {
      personalization: 5,
      valueForMoney: 5,
      convenience: 5,
      quality: 5,
      exclusivity: 5,
      novelty: 5
    },
    seasonalCampaigns: []
  },
  productPricing: {
    averageBasketSize: 0,
    products: [],
    heroProducts: [],
    lowVelocityProducts: []
  },
  financialGuardrails: {
    rewardBudgetType: "fixed",
    monthlyBudget: 1000,
    targetGrossMargin: 30,
    maxCostPerAcquisition: 25,
    minRewardValue: 5,
    maxRewardValue: 50
  },
  customerSegments: {
    loyaltyTiers: [
      {
        name: "Bronze",
        lifetimeTransactions: 0,
        lifetimeSpend: 0,
        redemptions: 0
      }
    ],
    visitSpendingThresholds: {
      frequentVisitor: { visits: 4, perDays: 30 },
      highSpender: { amount: 100, perDays: 30 }
    }
  },
  customerCohorts: {
    new: {
      firstVisitWithinDays: 30,
      maxLifetimeVisits: 2
    },
    active: {
      lastVisitWithinDays: 30
    },
    dormant: {
      lastVisitBetween: [30, 90]
    },
    churned: {
      lastVisitMoreThanDays: 180
    },
    resurrected: {
      wasDormantOrChurned: true,
      recentVisitWithinDays: 60
    }
  },
  rewardConstraints: {
    allowedTypes: {
      freeItem: true,
      percentageDiscount: true,
      fixedAmount: true,
      buyXGetY: true,
      mysteryGift: false
    },
    concurrencyCeiling: 4
  },
  messagingConstraints: {
    restrictedKeywords: []
  },
  emailSettings: {
    isConnected: false,
    connectedEmail: "",
    automaticResponses: false,
    analyzeEmailTone: false,
    emailTone: "professional",
    customTone: [],
    excludedEmails: [],
    notifyBeforeSend: true,
    customSignature: ""
  },
  businessKnowledge: {
    generalInfo: "",
    manualEntries: [],
    lastUpdated: Date.now(),
    publicHolidays: "",
    returnPolicy: ""
  }
}

export default function AgentSetup() {
  const { user } = useAuth()
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    ...defaultAgentConfig,
    // Ensure emailSettings is properly initialized
    emailSettings: {
      ...defaultAgentConfig.emailSettings
    },
    // Ensure businessKnowledge is properly initialized
    businessKnowledge: {
      ...defaultAgentConfig.businessKnowledge
    }
  })
  const [rewardActiveTab, setRewardActiveTab] = useState("brand")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mainTab, setMainTab] = useState("setup")
  const [isExpanded, setIsExpanded] = useState(false)
  const [agentType, setAgentType] = useState("reward")
  const [customerServiceSheetOpen, setCustomerServiceSheetOpen] = useState(false)
  const [showBusinessContext, setShowBusinessContext] = useState(false)
  const [customerServiceActiveTab, setCustomerServiceActiveTab] = useState("settings")
  const [businessInsights, setBusinessInsights] = useState<{
    businessName: string;
    businessHours: Record<string, any>;
    products: any[];
    objectives: string[];
    customerSegments: any[];
    brandVoice: string[];
  }>({
    businessName: "",
    businessHours: {},
    products: [],
    objectives: [],
    customerSegments: [],
    brandVoice: []
  })
  const [isRecording, setIsRecording] = useState(false)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualInput, setManualInput] = useState("")

  useEffect(() => {
    async function fetchAgentConfig() {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      
      try {
        // Fetch agent config from the agents collection
        const agentDocRef = doc(db, 'agents', user.uid)
        const agentDoc = await getDoc(agentDocRef)
        
        // Also fetch business knowledge from the new collection path
        const instructionsDocRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions')
        const instructionsDoc = await getDoc(instructionsDocRef)
        
        // Initialize with default business knowledge
        let businessKnowledgeData = {
          ...defaultAgentConfig.businessKnowledge
        }
        
        // Initialize email settings data and business brand data
        let emailSettingsData = null
        let businessBrandData = null
        
        // If instructions document exists, use its business knowledge data
        if (instructionsDoc.exists()) {
          const instructionsData = instructionsDoc.data()
          if (instructionsData.businessKnowledge) {
            businessKnowledgeData = instructionsData.businessKnowledge
          }
          
          // Also get email settings if they exist in the instructions document
          if (instructionsData.emailSettings) {
            emailSettingsData = {
              ...defaultAgentConfig.emailSettings,
              ...instructionsData.emailSettings
            }
          }
          
          // Get business brand data if it exists in the instructions document
          if (instructionsData.businessBrand) {
            businessBrandData = {
              ...defaultAgentConfig.businessBrand,
              ...instructionsData.businessBrand
            }
          }
        }
        
        if (agentDoc.exists()) {
          const data = agentDoc.data() as Partial<AgentConfig>
          
          // Create a merged config ensuring all properties exist
          const mergedConfig: AgentConfig = {
            ...defaultAgentConfig,
            ...data,
            // Explicitly handle nested objects that might be missing
            emailSettings: {
              ...defaultAgentConfig.emailSettings,
              ...(data.emailSettings || {}),
              // Prioritize email settings from instructions document if they exist
              ...(emailSettingsData || {})
            },
            businessBrand: {
              ...defaultAgentConfig.businessBrand,
              ...(data.businessBrand || {}),
              // Prioritize business brand from instructions document if it exists
              ...(businessBrandData || {})
            },
            // Use business knowledge from the instructions document
            businessKnowledge: businessKnowledgeData,
            agentTasks: {
              ...defaultAgentConfig.agentTasks,
              ...(data.agentTasks || {})
            },
            businessHours: {
              ...defaultAgentConfig.businessHours,
              ...(data.businessHours || {})
            },
            objectives: {
              ...defaultAgentConfig.objectives,
              ...(data.objectives || {})
            },
            productPricing: {
              ...defaultAgentConfig.productPricing,
              ...(data.productPricing || {})
            },
            financialGuardrails: {
              ...defaultAgentConfig.financialGuardrails,
              ...(data.financialGuardrails || {})
            },
            customerSegments: {
              ...defaultAgentConfig.customerSegments,
              ...(data.customerSegments || {})
            },
            customerCohorts: {
              ...defaultAgentConfig.customerCohorts,
              ...(data.customerCohorts || {})
            },
            rewardConstraints: {
              ...defaultAgentConfig.rewardConstraints,
              ...(data.rewardConstraints || {})
            },
            messagingConstraints: {
              ...defaultAgentConfig.messagingConstraints,
              ...(data.messagingConstraints || {})
            }
          }
          
          setAgentConfig(mergedConfig)
        } else {
          // If no agent config exists, still use any business knowledge that might exist
          setAgentConfig(prev => ({
            ...prev,
            businessKnowledge: businessKnowledgeData
          }))
          console.log("No agent configuration found, using defaults")
        }
      } catch (error) {
        console.error("Error fetching agent configuration:", error)
        toast({
          title: "Error",
          description: "Failed to load your agent configuration.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }
    
    fetchAgentConfig()
  }, [user])

  const saveAgentConfig = async (config?: AgentConfig) => {
    if (!user?.uid) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to save your agent configuration.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    const configToSave = config || agentConfig

    try {
      // Extract business knowledge to save separately
      const { businessKnowledge, ...agentConfigWithoutBusinessKnowledge } = configToSave

      // Save agent config to agents collection
      await setDoc(doc(db, 'agents', user.uid), {
        ...agentConfigWithoutBusinessKnowledge,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Save business knowledge, email settings, and business brand to the instructions document
      await setDoc(doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions'), {
        businessKnowledge,
        emailSettings: configToSave.emailSettings,
        businessBrand: configToSave.businessBrand,
        updatedAt: serverTimestamp(),
      }, { merge: true })

      toast({
        title: "Success",
        description: "Your agent configuration has been saved.",
      })
    } catch (error) {
      console.error("Error saving agent configuration:", error)
      toast({
        title: "Error",
        description: "Failed to save your agent configuration.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRewardTabChange = (tab: string) => {
    setRewardActiveTab(tab)
  }
  
  const handleMainTabChange = (tab: string) => {
    setMainTab(tab)
  }

  const handleAgentTypeChange = (type: string) => {
    setAgentType(type);
    
    // Extract business insights when switching to customer service tab
    if (type === "customer-service") {
      extractBusinessInsights();
    }
  }

  const updateSection = <K extends keyof AgentConfig>(
    section: K, 
    data: AgentConfig[K]
  ) => {
    setAgentConfig(prev => ({
      ...prev,
      [section]: data
    }))
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  const addManualContextEntry = async (content: string) => {
    if (!content.trim()) return;
    
    if (!user?.uid) {
      toast({
        title: "Not logged in",
        description: "Your context was added but not saved to the server.",
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    const newEntry = {
      id: crypto.randomUUID(),
      content,
      timestamp: Date.now(),
      source: 'manual' as const
    };
    
    const updatedBusinessKnowledge = {
      ...agentConfig.businessKnowledge,
      manualEntries: [
        ...agentConfig.businessKnowledge.manualEntries,
        newEntry
      ],
      lastUpdated: Date.now()
    };
    
    // Update state first for immediate UI feedback
    updateSection('businessKnowledge', updatedBusinessKnowledge);
    
    // Save to Firestore in the new collection path
    try {
      const instructionsDocRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
      
      await setDoc(instructionsDocRef, {
        businessKnowledge: updatedBusinessKnowledge,
        businessBrand: agentConfig.businessBrand,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Your business context was added and saved.",
      });
    } catch (error) {
      console.error("Error saving business context:", error);
      toast({
        title: "Error",
        description: "Your context was added but could not be saved to the server.",
        variant: "destructive"
      });
    }
    
    setShowManualInput(false);
    setManualInput('');
  };
  
  const addVoiceContextEntry = async (content: string) => {
    if (!content.trim()) return;
    
    if (!user?.uid) {
      toast({
        title: "Not logged in",
        description: "Your voice input was added but not saved to the server.",
        variant: "destructive"
      });
      return;
    }
    
    // Update local state
    const newEntry = {
      id: crypto.randomUUID(),
      content,
      timestamp: Date.now(),
      source: 'voice' as const
    };
    
    const updatedBusinessKnowledge = {
      ...agentConfig.businessKnowledge,
      manualEntries: [
        ...agentConfig.businessKnowledge.manualEntries,
        newEntry
      ],
      lastUpdated: Date.now()
    };
    
    // Update state first for immediate UI feedback
    updateSection('businessKnowledge', updatedBusinessKnowledge);
    
    // Save to Firestore in the new collection path
    try {
      const instructionsDocRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
      
      await setDoc(instructionsDocRef, {
        businessKnowledge: updatedBusinessKnowledge,
        businessBrand: agentConfig.businessBrand,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      toast({
        title: "Success",
        description: "Your voice input was added and saved.",
      });
    } catch (error) {
      console.error("Error saving voice input:", error);
      toast({
        title: "Error",
        description: "Your voice input was added but could not be saved to the server.",
        variant: "destructive"
      });
    }
  };

  // Function to extract business insights from agent config
  const extractBusinessInsights = () => {
    const insights = {
      businessName: agentConfig.businessBrand.businessName || "Your Business",
      businessHours: agentConfig.businessHours || {},
      products: agentConfig.productPricing.products || [],
      objectives: agentConfig.objectives.businessObjectives.map(obj => obj.label) || [],
      customerSegments: agentConfig.customerSegments.loyaltyTiers || [],
      brandVoice: agentConfig.businessBrand.brandVoice || []
    }
    
    setBusinessInsights(insights)
  }

  // Call extractBusinessInsights when agentConfig changes
  useEffect(() => {
    if (!loading) {
      extractBusinessInsights();
    }
  }, [agentConfig.businessBrand, agentConfig.businessHours, agentConfig.productPricing, agentConfig.objectives, agentConfig.customerSegments, loading]);

  // Handle simulated voice recording for demo
  const handleVoiceRecord = () => {
    if (isRecording) {
      // Stop "recording"
      setIsRecording(false);
      // Simulate a transcription result
      const transcriptions = [
        "We offer 30-day returns on all products purchased online or in-store with a valid receipt.",
        "Our business hours are Monday to Friday from 9 AM to 6 PM, and Saturday from 10 AM to 4 PM. We're closed on Sundays.",
        "Our customer service team can be reached at support@example.com or by phone at (555) 123-4567.",
        "We offer free shipping on all orders over $75 within Australia. International shipping rates vary by location.",
        "All our products come with a 12-month manufacturer warranty that covers defects in materials and workmanship.",
      ];
      const randomTranscription = transcriptions[Math.floor(Math.random() * transcriptions.length)];
      
      // Small delay to simulate processing
      setTimeout(() => {
        addVoiceContextEntry(randomTranscription);
      }, 1000);
      
      toast({
        title: "Voice processed",
        description: "Your voice input has been transcribed and is being added.",
      });
    } else {
      // Start "recording"
      setIsRecording(true);
      
      // Simulate automatic stop after 5 seconds
      setTimeout(() => {
        if (isRecording) {
          handleVoiceRecord();
        }
      }, 5000);
      
      toast({
        title: "Recording started",
        description: "Recording your voice input (simulated)...",
      });
    }
  };

  // Reset agent config to default values
  const resetToDefault = async () => {
    if (!user?.uid) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to reset your agent configuration.",
        variant: "destructive",
      })
      return
    }

    try {
      // Update email settings and business brand in the main agent config
      const resetConfig = {
        ...agentConfig,
        emailSettings: { ...defaultAgentConfig.emailSettings },
        businessBrand: { ...defaultAgentConfig.businessBrand }
      }
      setAgentConfig(resetConfig)

      // Reset business knowledge separately
      const resetBusinessKnowledge = { ...defaultAgentConfig.businessKnowledge }
      updateSection('businessKnowledge', resetBusinessKnowledge)

      // Save the email settings and business brand to the agents collection
      await setDoc(doc(db, 'agents', user.uid), {
        emailSettings: { ...defaultAgentConfig.emailSettings },
        businessBrand: { ...defaultAgentConfig.businessBrand },
        updatedAt: serverTimestamp(),
      }, { merge: true })

      // Reset the business knowledge and business brand in the instructions collection
      await setDoc(doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions'), {
        businessKnowledge: resetBusinessKnowledge,
        businessBrand: { ...defaultAgentConfig.businessBrand },
        emailSettings: { ...defaultAgentConfig.emailSettings },
        updatedAt: serverTimestamp(),
      }, { merge: true })

      toast({
        title: "Reset complete",
        description: "Your agent configuration has been reset to default values.",
      })
    } catch (error) {
      console.error("Error resetting configuration:", error)
      toast({
        title: "Error",
        description: "Failed to reset your agent configuration.",
        variant: "destructive",
      })
    }
  }

  const deleteContextEntry = async (id: string) => {
    if (!user?.uid) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to delete a context entry.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update local state
      const updatedBusinessKnowledge = {
        ...agentConfig.businessKnowledge,
        manualEntries: agentConfig.businessKnowledge.manualEntries.filter((entry) => entry.id !== id)
      };
      updateSection('businessKnowledge', updatedBusinessKnowledge);

      // Save to Firestore
      const instructionsDocRef = doc(db, 'merchants', user.uid, 'customer-service-agent', 'instructions');
      await setDoc(instructionsDocRef, {
        businessKnowledge: updatedBusinessKnowledge,
        businessBrand: agentConfig.businessBrand,
        updatedAt: serverTimestamp()
      }, { merge: true });

      toast({
        title: "Success",
        description: "The context entry has been deleted.",
      });
    } catch (error) {
      console.error("Error deleting context entry:", error);
      toast({
        title: "Error",
        description: "Failed to delete the context entry.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D6EFD]"></div>
      </div>
    )
  }

  // Render the business context page
  const renderBusinessContextPage = () => {
    return (
      <>
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowBusinessContext(false)}
            className="gap-1 mr-2 p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-medium">Business Knowledge Base</h2>
            <p className="text-sm text-muted-foreground">
              Information the agent will use when responding to customer inquiries
            </p>
          </div>
        </div>
        
        <div className="space-y-6 mb-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Business Context</h3>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleVoiceRecord}
                  className={`gap-2 rounded-md ${isRecording ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
                >
                  <Mic className={`h-4 w-4 ${isRecording ? 'text-red-600 animate-pulse' : ''}`} />
                  {isRecording ? 'Recording...' : 'Add voice input'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="gap-2 rounded-md"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add manual context
                </Button>
              </div>
            </div>
            
            {showManualInput && (
              <div className="mb-6 border p-4 rounded-md bg-gray-50 space-y-3">
                <Textarea
                  placeholder="Describe your business, products, services, policies, or any other relevant information..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  className="min-h-[100px] rounded-md"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setManualInput("");
                      setShowManualInput(false);
                    }}
                    className="rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => addManualContextEntry(manualInput)}
                    disabled={!manualInput.trim()}
                    className="rounded-md"
                  >
                    Save Context
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          <Card className="border shadow-sm rounded-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center gap-2">
                <Store className="h-4 w-4 text-blue-600" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-sm space-y-4">
                <div>
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input 
                    id="businessName"
                    value={agentConfig.businessBrand.businessName}
                    onChange={(e) => updateSection("businessBrand", {
                      ...agentConfig.businessBrand,
                      businessName: e.target.value
                    })}
                    className="mt-1 rounded-md"
                    placeholder="Enter your business name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="businessContext">Business Description</Label>
                  <Textarea
                    id="businessContext"
                    value={agentConfig.businessBrand.businessContext}
                    onChange={(e) => updateSection("businessBrand", {
                      ...agentConfig.businessBrand,
                      businessContext: e.target.value
                    })}
                    className="mt-1 min-h-[100px] rounded-md"
                    placeholder="Describe what your business does, your products/services, and your value proposition"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-sm rounded-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-blue-600" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm space-y-3">
                  {Object.entries(agentConfig.businessHours).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex items-center gap-3">
                      <div className="w-24">
                        <span className="capitalize">{day}</span>
                      </div>
                      <Switch
                        checked={hours.open}
                        onCheckedChange={(checked) => {
                          const updatedHours = {
                            ...agentConfig.businessHours,
                            [day]: {
                              ...hours,
                              open: checked
                            }
                          };
                          updateSection("businessHours", updatedHours);
                        }}
                      />
                      {hours.open && (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            type="time"
                            value={hours.start}
                            onChange={(e) => {
                              const updatedHours = {
                                ...agentConfig.businessHours,
                                [day]: {
                                  ...hours,
                                  start: e.target.value
                                }
                              };
                              updateSection("businessHours", updatedHours);
                            }}
                            className="w-28 rounded-md"
                          />
                          <span>to</span>
                          <Input
                            type="time"
                            value={hours.end}
                            onChange={(e) => {
                              const updatedHours = {
                                ...agentConfig.businessHours,
                                [day]: {
                                  ...hours,
                                  end: e.target.value
                                }
                              };
                              updateSection("businessHours", updatedHours);
                            }}
                            className="w-28 rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="border shadow-sm rounded-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Brand Voice
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm">
                  <Label htmlFor="emailTone" className="mb-2 block">Communication Style</Label>
                  <Select 
                    value={agentConfig.emailSettings.emailTone}
                    onValueChange={(value) => {
                      updateSection("emailSettings", {
                        ...agentConfig.emailSettings,
                        emailTone: value
                      })
                    }}
                  >
                    <SelectTrigger id="emailTone" className="rounded-md">
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-1">
                      {businessInsights.brandVoice.map((trait, index) => (
                        <Badge key={index} variant="outline" className="bg-gray-50 rounded-md">
                          {trait}
                        </Badge>
                      ))}
                    </div>
                    {businessInsights.brandVoice.length === 0 && (
                      <p className="text-muted-foreground mt-1">Adjust your brand voice in the Business Brand tab.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Display manual and voice entries at the bottom */}
          <Card className="border shadow-sm rounded-md mt-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex items-center gap-2">
                <BookText className="h-4 w-4 text-blue-600" />
                Additional Business Context
              </CardTitle>
              <CardDescription>
                Additional context information that will be used by the customer service agent
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {agentConfig.businessKnowledge?.manualEntries && 
               agentConfig.businessKnowledge.manualEntries.length > 0 ? (
                <div className="space-y-4">
                  {agentConfig.businessKnowledge.manualEntries.map((entry) => (
                    <div key={entry.id} className="p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={entry.source === 'voice' ? 'secondary' : 'outline'} className="rounded-md">
                          {entry.source === 'voice' ? 'Voice Input' : 'Manual Entry'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteContextEntry(entry.id)}
                            className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-600"
                            title="Delete entry"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm">{entry.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <BookText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>No business context entries yet.</p>
                  <p className="text-sm">Add context using the buttons above.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'fixed inset-0 z-50 bg-white overflow-auto' : 'w-full bg-white'}`}>
      <div className="p-6 py-4">
        <PageHeader
          title={<><span className="bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent">Tap Agent</span> Setup</>}
          subtitle="Your marketing, rewards, and customer engagement - on autopilot."
        >
          <div className="flex items-center gap-2">
            <Tabs 
              defaultValue="setup" 
              value={mainTab} 
              onValueChange={handleMainTabChange} 
              className="mr-2"
            >
              <TabsList className="hidden">
                <TabsTrigger value="setup">Setup</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => handleMainTabChange("setup")}
                  className={`flex items-center justify-center gap-2 px-5 py-3 text-sm transition-all border shadow-sm hover:bg-gray-50 rounded-md font-medium ${
                    mainTab === "setup" 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-white text-gray-700"
                  }`}
                >
                  <div className={`${
                    mainTab === "setup" 
                      ? "bg-blue-100 p-1.5 rounded-full" 
                      : "text-gray-500"
                  }`}>
                    <Wrench className={`h-5 w-5 ${mainTab === "setup" ? "text-blue-600" : ""}`} />
                  </div>
                  <span className={mainTab === "setup" ? "bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent" : ""}>Setup</span>
                </Button>
                <Button
                  onClick={() => handleMainTabChange("customers")}
                  className={`flex items-center justify-center gap-2 px-5 py-3 text-sm transition-all border shadow-sm hover:bg-gray-50 rounded-md font-medium ${
                    mainTab === "customers" 
                      ? "bg-blue-50 border-blue-200" 
                      : "bg-white text-gray-700"
                  }`}
                >
                  <div className={`${
                    mainTab === "customers" 
                      ? "bg-blue-100 p-1.5 rounded-full" 
                      : "text-gray-500"
                  }`}>
                    <Users className={`h-5 w-5 ${mainTab === "customers" ? "text-blue-600" : ""}`} />
                  </div>
                  <span className={mainTab === "customers" ? "bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent" : ""}>Customers</span>
                </Button>
              </div>
            </Tabs>
            <Button 
              variant="outline" 
              size="sm" 
              asChild 
              className="h-9 gap-2 border-0 ring-1 ring-gray-200 bg-white text-gray-700 shadow-sm rounded-md"
            >
              <Link href="/tap-agent/intro">Learn More</Link>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={toggleExpand}
              className="h-9 gap-2 border-0 ring-1 ring-gray-200 bg-white text-gray-700 shadow-sm rounded-md flex items-center"
            >
              {isExpanded ? (
                <>
                  <Minimize2 className="h-4 w-4" />
                  <span>Minimize</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-4 w-4" />
                  <span>Expand</span>
                </>
              )}
            </Button>
          </div>
        </PageHeader>
        
        <Tabs defaultValue="setup" value={mainTab} onValueChange={handleMainTabChange} className="w-full">
          <TabsContent value="setup">
            {/* Agent Type Selection */}
            <Tabs 
              defaultValue="reward" 
              value={agentType} 
              onValueChange={handleAgentTypeChange}
              className="w-full mb-5"
            >
              {agentType !== "customer-service-setup" && (
                <div className="flex justify-start mb-4">
                  <TabsList className="hidden">
                    <TabsTrigger value="reward">Reward Agent</TabsTrigger>
                    <TabsTrigger value="customer-service">Customer Service</TabsTrigger>
                  </TabsList>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAgentTypeChange("reward")}
                      className={`flex items-center justify-center gap-2 px-5 py-3 text-sm transition-all border shadow-sm hover:bg-gray-50 rounded-md font-medium ${
                        agentType === "reward" 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-white text-gray-700"
                      }`}
                    >
                      <div className={`${
                        agentType === "reward" 
                          ? "bg-blue-100 p-1.5 rounded-full" 
                          : "text-gray-500"
                      }`}>
                        <Award className={`h-5 w-5 ${agentType === "reward" ? "text-blue-600" : ""}`} />
                      </div>
                      <span className={agentType === "reward" ? "bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent" : ""}>Reward Agent</span>
                    </Button>
                    <Button
                      onClick={() => handleAgentTypeChange("customer-service")}
                      className={`flex items-center justify-center gap-2 px-5 py-3 text-sm transition-all border shadow-sm hover:bg-gray-50 rounded-md font-medium ${
                        agentType === "customer-service" 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-white text-gray-700"
                      }`}
                    >
                      <div className={`${
                        agentType === "customer-service" 
                          ? "bg-blue-100 p-1.5 rounded-full" 
                          : "text-gray-500"
                      }`}>
                        <Bot className={`h-5 w-5 ${agentType === "customer-service" ? "text-blue-600" : ""}`} />
                      </div>
                      <span className={agentType === "customer-service" ? "bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent" : ""}>Customer Service Agent</span>
                    </Button>
                  </div>
                </div>
              )}
              
              <TabsContent value="reward">
                <div className="flex flex-col gap-4">
                  <div className="w-full bg-white rounded-md border shadow-sm">
                    <div className="flex items-center justify-between border-b px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                          <Award className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-xl font-medium">Reward Agent</h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            AI assistant configured to create personalized rewards for your customers
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`rounded-md border shadow-sm ${agentConfig.agentTasks.rewardsGeneration ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50'}`}
                      >
                        <div className={`h-2 w-2 rounded-full mr-2 ${agentConfig.agentTasks.rewardsGeneration ? 'bg-green-500' : 'bg-gray-400'}`} />
                        {agentConfig.agentTasks.rewardsGeneration ? 'Active' : 'Inactive'}
                      </Button>
                    </div>
                    
                <Tabs 
                  defaultValue="brand" 
                  value={rewardActiveTab} 
                  onValueChange={handleRewardTabChange}
                  className="w-full"
                >
                      <div className="border-b px-6 py-2 bg-gray-50 overflow-x-auto">
                        <div className="flex gap-1 min-w-max">
                          <TabsList className="hidden">
                            <TabsTrigger value="brand">Brand</TabsTrigger>
                            <TabsTrigger value="tasks">Tasks</TabsTrigger>
                            <TabsTrigger value="hours">Hours</TabsTrigger>
                            <TabsTrigger value="objectives">Objectives</TabsTrigger>
                            <TabsTrigger value="pricing">Pricing</TabsTrigger>
                            <TabsTrigger value="financials">Financials</TabsTrigger>
                            <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
                            <TabsTrigger value="rewards">Rewards</TabsTrigger>
                            <TabsTrigger value="messaging">Messages</TabsTrigger>
                          </TabsList>
                          
                          <Button 
                            onClick={() => handleRewardTabChange("brand")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "brand" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Building2 className="h-4 w-4" />
                            <span>Brand</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("tasks")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "tasks" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Tasks</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("hours")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "hours" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Clock3 className="h-4 w-4" />
                            <span>Hours</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("objectives")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "objectives" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Target className="h-4 w-4" />
                            <span>Objectives</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("pricing")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "pricing" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <TagsIcon className="h-4 w-4" />
                            <span>Pricing</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("financials")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "financials" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <LineChart className="h-4 w-4" />
                            <span>Financials</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("cohorts")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "cohorts" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <UsersRound className="h-4 w-4" />
                            <span>Cohorts</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("rewards")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "rewards" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <Gift className="h-4 w-4" />
                            <span>Rewards</span>
                          </Button>
                          <Button 
                            onClick={() => handleRewardTabChange("messaging")}
                            className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${rewardActiveTab === "messaging" ? "bg-white text-blue-600 shadow-sm" : "bg-transparent text-gray-700 hover:bg-gray-50"}`}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span>Messages</span>
                          </Button>
                      </div>
                    </div>
                    
                      <div className="p-6">
                        <ScrollArea className={`${isExpanded ? 'max-h-[calc(100vh-300px)]' : 'max-h-[600px]'} scrollable pr-4`}>
                          <TabsContent value="brand" className="pt-0 mt-0 data-[state=active]:block">
                            <div className="space-y-6">
                              {/* Business Information and Brand Voice side by side */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Business Information */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Store className="h-4 w-4 text-blue-600 mr-2" />
                                    Business Information
                                  </h3>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="businessName">Business Name</Label>
                                      <Input 
                                        id="businessName"
                                        value={agentConfig.businessBrand.businessName}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          businessName: e.target.value
                                        })}
                                        className="mt-1 rounded-md"
                                        placeholder="Enter your business name"
                                      />
                                    </div>
                                    
                                    <div>
                                      <Label htmlFor="businessContext">Business Description</Label>
                                      <Textarea
                                        id="businessContext"
                                        value={agentConfig.businessBrand.businessContext}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          businessContext: e.target.value
                                        })}
                                        className="mt-1 min-h-[100px] rounded-md"
                                        placeholder="Describe what your business does, your products/services, and your value proposition"
                                      />
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Brand Voice */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Layers className="h-4 w-4 text-blue-600 mr-2" />
                                    Brand Voice
                                  </h3>
                                  
                                  <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                      Select the tone and style that best represents your brand's personality
                                    </p>
                                    
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {["friendly", "professional", "casual", "formal", "playful", "serious"].map(voice => (
                                        <Button
                                          key={voice}
                                          onClick={() => {
                                            const updatedVoice = agentConfig.businessBrand.brandVoice.includes(voice)
                                              ? agentConfig.businessBrand.brandVoice.filter(v => v !== voice)
                                              : [...agentConfig.businessBrand.brandVoice, voice];
                                            
                                            updateSection("businessBrand", {
                                              ...agentConfig.businessBrand,
                                              brandVoice: updatedVoice
                                            });
                                          }}
                                          variant="outline"
                                          className={`h-10 capitalize rounded-md ${
                                            agentConfig.businessBrand.brandVoice.includes(voice)
                                              ? "bg-blue-50 text-blue-700 border-blue-200"
                                              : ""
                                          }`}
                                        >
                                          {voice}
                                        </Button>
                                      ))}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                      <div className="flex-1">
                                        <Input
                                          id="customVoice"
                                          placeholder="Add custom tone"
                                          className="rounded-md"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && e.currentTarget.value.trim()) {
                                              e.preventDefault();
                                              const newVoice = e.currentTarget.value.trim();
                                              if (!agentConfig.businessBrand.brandVoice.includes(newVoice)) {
                                                updateSection("businessBrand", {
                                                  ...agentConfig.businessBrand,
                                                  brandVoice: [...agentConfig.businessBrand.brandVoice, newVoice]
                                                });
                                                e.currentTarget.value = "";
                                              }
                                            }
                                          }}
                                        />
                                      </div>
                                      <Button 
                                        onClick={() => {
                                          const input = document.getElementById('customVoice') as HTMLInputElement;
                                          if (input && input.value.trim()) {
                                            const newVoice = input.value.trim();
                                            if (!agentConfig.businessBrand.brandVoice.includes(newVoice)) {
                                              updateSection("businessBrand", {
                                                ...agentConfig.businessBrand,
                                                brandVoice: [...agentConfig.businessBrand.brandVoice, newVoice]
                                              });
                                              input.value = "";
                                            }
                                          }
                                        }}
                                        className="rounded-md"
                                      >
                                        Add
                                      </Button>
                                    </div>
                                    
                                    {agentConfig.businessBrand.brandVoice.length > 0 && (
                                      <div className="mt-2">
                                        <Label className="mb-2 block">Selected Brand Voice</Label>
                                        <div className="flex flex-wrap gap-2">
                                          {agentConfig.businessBrand.brandVoice.map(voice => (
                                            <Badge 
                                              key={voice}
                                              variant="outline"
                                              className="px-2 py-1 rounded-md bg-blue-50 border-blue-200 text-blue-700 flex items-center gap-1"
                                            >
                                              {voice}
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => updateSection("businessBrand", {
                                                  ...agentConfig.businessBrand,
                                                  brandVoice: agentConfig.businessBrand.brandVoice.filter(v => v !== voice)
                                                })}
                                                className="h-4 w-4 rounded-full p-0 hover:bg-blue-100"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Brand Colors */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <div className="h-4 w-4 bg-gradient-to-r from-blue-500 to-orange-500 rounded-full mr-2"></div>
                                    Primary Color
                                  </h3>
                                  
                                  <div className="flex gap-3 items-center">
                                    <Input
                                      id="primaryColor"
                                      type="color"
                                      value={agentConfig.businessBrand.primaryColor}
                                      onChange={(e) => updateSection("businessBrand", {
                                        ...agentConfig.businessBrand,
                                        primaryColor: e.target.value
                                      })}
                                      className="w-16 h-16 p-1 cursor-pointer rounded-md"
                                    />
                                    <div className="flex-1">
                                      <Input
                                        type="text"
                                        value={agentConfig.businessBrand.primaryColor}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          primaryColor: e.target.value
                                        })}
                                        placeholder="#007AFF"
                                        className="rounded-md"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        This color will be used for primary elements in customer communications
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <div className="h-4 w-4 bg-white border border-gray-200 rounded-full mr-2"></div>
                                    Secondary Color
                                  </h3>
                                  
                                  <div className="flex gap-3 items-center">
                                    <Input
                                      id="secondaryColor"
                                      type="color"
                                      value={agentConfig.businessBrand.secondaryColor}
                                      onChange={(e) => updateSection("businessBrand", {
                                        ...agentConfig.businessBrand,
                                        secondaryColor: e.target.value
                                      })}
                                      className="w-16 h-16 p-1 cursor-pointer rounded-md"
                                    />
                                    <div className="flex-1">
                                      <Input
                                        type="text"
                                        value={agentConfig.businessBrand.secondaryColor}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          secondaryColor: e.target.value
                                        })}
                                        placeholder="#FFFFFF"
                                        className="rounded-md"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1">
                                        This color will be used for secondary elements and backgrounds
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="tasks" className="pt-0 mt-0 data-[state=active]:block">
                            <AgentTasksForm 
                              data={agentConfig.agentTasks} 
                              onChange={(data) => updateSection("agentTasks", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="hours" className="pt-0 mt-0 data-[state=active]:block">
                            <div className="space-y-6">
                              <div className="border rounded-md p-5 space-y-5">
                                <h3 className="font-medium flex items-center">
                                  <Clock3 className="h-4 w-4 text-blue-600 mr-2" />
                                  Business Hours
                                </h3>
                                
                                <p className="text-sm text-muted-foreground">
                                  Configure your operating hours for each day of the week. These hours will be used to determine when rewards can be offered.
                                </p>
                                
                                <div className="space-y-5">
                                  {/* Weekday Group */}
                                  <div className="border rounded-md p-4 bg-gray-50">
                                    <h4 className="text-sm font-medium mb-3 flex items-center">
                                      <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                                      Weekdays
                                    </h4>
                                    
                                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((day) => (
                                      <div key={day} className="mb-3 last:mb-0">
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor={`${day}-switch`} className="font-medium capitalize">
                                            {day}
                                          </Label>
                                          <Switch
                                            id={`${day}-switch`}
                                            checked={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open}
                                            onCheckedChange={() => {
                                              const updatedHours = {
                                                ...agentConfig.businessHours,
                                                [day]: {
                                                  ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                  open: !agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open
                                                }
                                              };
                                              updateSection("businessHours", updatedHours);
                                            }}
                                          />
                                        </div>
                                        
                                        {agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open && (
                                          <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                              <Label htmlFor={`${day}-start`} className="text-xs text-muted-foreground">
                                                Open
                                              </Label>
                                              <Input
                                                id={`${day}-start`}
                                                type="time"
                                                value={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].start}
                                                onChange={(e) => {
                                                  const updatedHours = {
                                                    ...agentConfig.businessHours,
                                                    [day]: {
                                                      ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                      start: e.target.value
                                                    }
                                                  };
                                                  updateSection("businessHours", updatedHours);
                                                }}
                                                className="mt-1 rounded-md"
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor={`${day}-end`} className="text-xs text-muted-foreground">
                                                Close
                                              </Label>
                                              <Input
                                                id={`${day}-end`}
                                                type="time"
                                                value={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].end}
                                                onChange={(e) => {
                                                  const updatedHours = {
                                                    ...agentConfig.businessHours,
                                                    [day]: {
                                                      ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                      end: e.target.value
                                                    }
                                                  };
                                                  updateSection("businessHours", updatedHours);
                                                }}
                                                className="mt-1 rounded-md"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Weekend Group */}
                                  <div className="border rounded-md p-4 bg-gray-50">
                                    <h4 className="text-sm font-medium mb-3 flex items-center">
                                      <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                                      Weekend
                                    </h4>
                                    
                                    {['saturday', 'sunday'].map((day) => (
                                      <div key={day} className="mb-3 last:mb-0">
                                        <div className="flex items-center justify-between">
                                          <Label htmlFor={`${day}-switch`} className="font-medium capitalize">
                                            {day}
                                          </Label>
                                          <Switch
                                            id={`${day}-switch`}
                                            checked={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open}
                                            onCheckedChange={() => {
                                              const updatedHours = {
                                                ...agentConfig.businessHours,
                                                [day]: {
                                                  ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                  open: !agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open
                                                }
                                              };
                                              updateSection("businessHours", updatedHours);
                                            }}
                                          />
                                        </div>
                                        
                                        {agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].open && (
                                          <div className="grid grid-cols-2 gap-4 mt-2">
                                            <div>
                                              <Label htmlFor={`${day}-start`} className="text-xs text-muted-foreground">
                                                Open
                                              </Label>
                                              <Input
                                                id={`${day}-start`}
                                                type="time"
                                                value={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].start}
                                                onChange={(e) => {
                                                  const updatedHours = {
                                                    ...agentConfig.businessHours,
                                                    [day]: {
                                                      ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                      start: e.target.value
                                                    }
                                                  };
                                                  updateSection("businessHours", updatedHours);
                                                }}
                                                className="mt-1 rounded-md"
                                              />
                                            </div>
                                            <div>
                                              <Label htmlFor={`${day}-end`} className="text-xs text-muted-foreground">
                                                Close
                                              </Label>
                                              <Input
                                                id={`${day}-end`}
                                                type="time"
                                                value={agentConfig.businessHours[day as keyof typeof agentConfig.businessHours].end}
                                                onChange={(e) => {
                                                  const updatedHours = {
                                                    ...agentConfig.businessHours,
                                                    [day]: {
                                                      ...agentConfig.businessHours[day as keyof typeof agentConfig.businessHours],
                                                      end: e.target.value
                                                    }
                                                  };
                                                  updateSection("businessHours", updatedHours);
                                                }}
                                                className="mt-1 rounded-md"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  
                                  {/* Public Holidays */}
                                  <div className="border rounded-md p-4">
                                    <h4 className="text-sm font-medium mb-3 flex items-center">
                                      <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                                      Public Holidays
                                    </h4>
                                    
                                    <div className="space-y-4">
                                      <div>
                                        <Label htmlFor="publicHolidays">Holiday Schedule</Label>
                                        <Textarea
                                          id="publicHolidays"
                                          value={agentConfig.businessKnowledge?.publicHolidays || ""}
                                          onChange={(e) => {
                                            const updatedKnowledge = {
                                              ...agentConfig.businessKnowledge,
                                              publicHolidays: e.target.value,
                                              lastUpdated: Date.now()
                                            };
                                            updateSection("businessKnowledge", updatedKnowledge);
                                          }}
                                          className="mt-1 min-h-[100px] rounded-md"
                                          placeholder="List your public holidays and special opening hours:&#10;&#10;New Year's Day (Jan 1) - Closed&#10;Australia Day (Jan 26) - 10am to 4pm&#10;Good Friday - Closed"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                          Enter one holiday per line with dates and opening hours
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Quick Actions */}
                                  <div className="flex flex-wrap gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const standardHours = {
                                          monday: { open: true, start: "09:00", end: "17:00" },
                                          tuesday: { open: true, start: "09:00", end: "17:00" },
                                          wednesday: { open: true, start: "09:00", end: "17:00" },
                                          thursday: { open: true, start: "09:00", end: "17:00" },
                                          friday: { open: true, start: "09:00", end: "17:00" },
                                          saturday: { open: false, start: "10:00", end: "16:00" },
                                          sunday: { open: false, start: "10:00", end: "16:00" }
                                        };
                                        updateSection("businessHours", standardHours);
                                      }}
                                      className="rounded-md"
                                    >
                                      Set Standard Hours (9-5)
                                    </Button>
                                    
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const allOpen = {
                                          monday: { ...agentConfig.businessHours.monday, open: true },
                                          tuesday: { ...agentConfig.businessHours.tuesday, open: true },
                                          wednesday: { ...agentConfig.businessHours.wednesday, open: true },
                                          thursday: { ...agentConfig.businessHours.thursday, open: true },
                                          friday: { ...agentConfig.businessHours.friday, open: true },
                                          saturday: { ...agentConfig.businessHours.saturday, open: true },
                                          sunday: { ...agentConfig.businessHours.sunday, open: true }
                                        };
                                        updateSection("businessHours", allOpen);
                                      }}
                                      className="rounded-md"
                                    >
                                      Open All Days
                                    </Button>
                                    
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        const allClosed = {
                                          monday: { ...agentConfig.businessHours.monday, open: false },
                                          tuesday: { ...agentConfig.businessHours.tuesday, open: false },
                                          wednesday: { ...agentConfig.businessHours.wednesday, open: false },
                                          thursday: { ...agentConfig.businessHours.thursday, open: false },
                                          friday: { ...agentConfig.businessHours.friday, open: false },
                                          saturday: { ...agentConfig.businessHours.saturday, open: false },
                                          sunday: { ...agentConfig.businessHours.sunday, open: false }
                                        };
                                        updateSection("businessHours", allClosed);
                                      }}
                                      className="rounded-md"
                                    >
                                      Close All Days
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="objectives" className="pt-0 mt-0 data-[state=active]:block">
                            <ObjectivesForm 
                              data={agentConfig.objectives} 
                              onChange={(data) => updateSection("objectives", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="pricing" className="pt-0 mt-0 data-[state=active]:block">
                            <ProductPricingForm 
                              data={agentConfig.productPricing} 
                              onChange={(data) => updateSection("productPricing", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="financials" className="pt-0 mt-0 data-[state=active]:block">
                            <FinancialGuardrailsForm 
                              data={agentConfig.financialGuardrails} 
                              onChange={(data) => updateSection("financialGuardrails", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="cohorts" className="pt-0 mt-0 data-[state=active]:block">
                            <CustomerCohortsForm 
                              data={agentConfig.customerCohorts} 
                              onChange={(data) => updateSection("customerCohorts", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="rewards" className="pt-0 mt-0 data-[state=active]:block">
                            <RewardConstraintsForm 
                              data={agentConfig.rewardConstraints} 
                              onChange={(data) => updateSection("rewardConstraints", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="messaging" className="pt-0 mt-0 data-[state=active]:block">
                            <MessagingConstraintsForm 
                              data={agentConfig.messagingConstraints} 
                              onChange={(data) => updateSection("messagingConstraints", data)} 
                            />
                          </TabsContent>
                      </ScrollArea>
                      
                      <div className="flex justify-between mt-6 pt-4 border-t border-[#E2E4E8]">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            // Reset section to default
                            const sectionKey = rewardActiveTab === "brand" ? "businessBrand" :
                                            rewardActiveTab === "tasks" ? "agentTasks" :
                                            rewardActiveTab === "hours" ? "businessHours" :
                                            rewardActiveTab === "objectives" ? "objectives" :
                                            rewardActiveTab === "pricing" ? "productPricing" :
                                            rewardActiveTab === "financials" ? "financialGuardrails" :
                                            rewardActiveTab === "cohorts" ? "customerCohorts" :
                                            rewardActiveTab === "rewards" ? "rewardConstraints" :
                                            "messagingConstraints";
                          
                            setAgentConfig(prev => ({
                              ...prev,
                              [sectionKey]: defaultAgentConfig[sectionKey as keyof AgentConfig]
                            }));
                          
                            toast({
                              title: "Reset",
                              description: "This section has been reset to default values.",
                            })
                          }}
                          className="h-9 gap-2 border-0 ring-1 ring-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm rounded-md"
                        >
                          Reset Section
                        </Button>
                        
                        <Button 
                          onClick={() => saveAgentConfig()}
                          disabled={saving}
                          size="sm"
                            className="rounded-md"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Save Changes
                              </>
                            )}
                        </Button>
                    </div>
                  </div>
                </Tabs>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="customer-service">
                <div className="flex flex-col gap-4">
                  <div className="w-full bg-white rounded-md border shadow-sm">
                    {agentConfig.businessKnowledge.manualEntries.length > 0 || 
                     agentConfig.businessBrand.businessName || 
                     agentConfig.businessBrand.businessContext ? (
                      <div>
                        <div className="flex items-center justify-between border-b px-6 py-4">
                          <div className="flex items-center">
                          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                            <Bot className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h2 className="text-xl font-medium">Customer Service Agent</h2>
                              <p className="text-sm text-muted-foreground mt-1">
                                AI assistant configured to help customers based on your business rules
                            </p>
                            </div>
                          </div>
                          <Button 
                            variant="outline"
                            size="sm"
                            className={`rounded-md border shadow-sm ${agentConfig.emailSettings.automaticResponses ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50'}`}
                          >
                            <div className={`h-2 w-2 rounded-full mr-2 ${agentConfig.emailSettings.automaticResponses ? 'bg-green-500' : 'bg-gray-400'}`} />
                            {agentConfig.emailSettings.automaticResponses ? 'Active' : 'Inactive'}
                          </Button>
                        </div>
                        
                        <Tabs defaultValue="settings" value={customerServiceActiveTab} onValueChange={setCustomerServiceActiveTab} className="w-full">
                          <div className="border-b px-6 py-2 bg-gray-50">
                            <TabsList className="hidden">
                              <TabsTrigger value="settings">Settings</TabsTrigger>
                              <TabsTrigger value="business-context">Business Context</TabsTrigger>
                            </TabsList>
                            
                            <div className="flex gap-3">
                              <Button
                                onClick={() => setCustomerServiceActiveTab("settings")}
                                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${
                                  customerServiceActiveTab === "settings" ? 
                                  "bg-white text-blue-600 shadow-sm" : 
                                  "bg-transparent text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <Wrench className="h-4 w-4" />
                                <span>Settings</span>
                              </Button>
                              <Button
                                onClick={() => setCustomerServiceActiveTab("business-context")}
                                className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm transition-all ${
                                  customerServiceActiveTab === "business-context" ? 
                                  "bg-white text-blue-600 shadow-sm" : 
                                  "bg-transparent text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                <BookText className="h-4 w-4" />
                                <span>Business Context</span>
                              </Button>
                            </div>
                          </div>
                          
                          <TabsContent value="settings" className="p-6">
                            <div className="space-y-6">
                              {/* Agent Settings */}
                              <div>
                                <h3 className="font-medium mb-4 flex items-center">
                                  <Bot className="h-4 w-4 text-blue-600 mr-2" />
                                  <span>Agent Configuration</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${agentConfig.emailSettings.automaticResponses ? 'bg-green-100' : 'bg-gray-200'}`}>
                                      <MessageSquare className={`h-5 w-5 ${agentConfig.emailSettings.automaticResponses ? 'text-green-600' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">Automatic Responses</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Agent will automatically respond to customer inquiries
                                      </div>
                                    </div>
                                    <Switch 
                                      checked={agentConfig.emailSettings.automaticResponses}
                                      onCheckedChange={(checked) => {
                                        updateSection("emailSettings", {
                                          ...agentConfig.emailSettings,
                                          automaticResponses: checked
                                        })
                                      }}
                                      className="ml-auto"
                                    />
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border">
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${agentConfig.emailSettings.notifyBeforeSend ? 'bg-blue-100' : 'bg-gray-200'}`}>
                                      <Check className={`h-5 w-5 ${agentConfig.emailSettings.notifyBeforeSend ? 'text-blue-600' : 'text-gray-500'}`} />
                                    </div>
                                    <div>
                                      <div className="font-medium text-sm">Human Review</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        You'll review all responses before they're sent to customers
                                      </div>
                                    </div>
                                    <Switch 
                                      checked={agentConfig.emailSettings.notifyBeforeSend}
                                      onCheckedChange={(checked) => {
                                        updateSection("emailSettings", {
                                          ...agentConfig.emailSettings,
                                          notifyBeforeSend: checked
                                        })
                                      }}
                                      className="ml-auto"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              {/* Communication Style and Email Sign-off in a grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Communication Style */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Layers className="h-4 w-4 text-blue-600 mr-2" />
                                    Communication Style
                                  </h3>
                                  
                                  <div>
                                    <Label htmlFor="emailTone" className="mb-2 block">Agent Communication Style</Label>
                                    <Select 
                                      value={agentConfig.emailSettings.emailTone}
                                      onValueChange={(value) => {
                                        updateSection("emailSettings", {
                                          ...agentConfig.emailSettings,
                                          emailTone: value
                                        })
                                      }}
                                    >
                                      <SelectTrigger id="emailTone" className="rounded-md">
                                        <SelectValue placeholder="Select a tone" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="friendly">Friendly</SelectItem>
                                        <SelectItem value="casual">Casual</SelectItem>
                                        <SelectItem value="formal">Formal</SelectItem>
                                        <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                        <SelectItem value="empathetic">Empathetic</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      This sets the overall tone for all customer communications
                                    </p>
                                  </div>
                                </div>
                                
                                {/* Email Sign-off */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Mail className="h-4 w-4 text-blue-600 mr-2" />
                                    Email Sign-off
                                  </h3>
                                  
                                  <div>
                                    <Label htmlFor="emailSignature" className="mb-2 block">Custom Email Signature</Label>
                                    <Textarea
                                      id="emailSignature"
                                      value={agentConfig.emailSettings.customSignature || ""}
                                      onChange={(e) => updateSection("emailSettings", {
                                        ...agentConfig.emailSettings,
                                        customSignature: e.target.value
                                      })}
                                      className="mt-1 min-h-[100px] rounded-md"
                                      placeholder="Kind regards,&#10;The [Business Name] Team"
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                      This will appear at the end of all customer emails
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Signature Templates */}
                              <div className="border rounded-md p-5 space-y-4">
                                <h3 className="font-medium flex items-center">
                                  <BookText className="h-4 w-4 text-blue-600 mr-2" />
                                  Signature Templates
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <Button
                                    variant="outline"
                            size="sm"
                                    onClick={() => updateSection("emailSettings", {
                                      ...agentConfig.emailSettings,
                                      customSignature: `Kind regards,\nThe ${agentConfig.businessBrand.businessName || "[Business Name]"} Team`
                                    })}
                                    className="h-auto py-2 px-3 text-left justify-start rounded-md"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">Professional</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Kind regards,<br />
                                        The {agentConfig.businessBrand.businessName || "[Business Name]"} Team
                                      </p>
                                    </div>
                                  </Button>
                                  
                                  <Button
                            variant="outline"
                                    size="sm"
                                    onClick={() => updateSection("emailSettings", {
                                      ...agentConfig.emailSettings,
                                      customSignature: `Thanks,\nCustomer Support\n${agentConfig.businessBrand.businessName || "[Business Name]"}`
                                    })}
                                    className="h-auto py-2 px-3 text-left justify-start rounded-md"
                          >
                                    <div>
                                      <p className="font-medium text-sm">Casual</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Thanks,<br />
                                        Customer Support<br />
                                        {agentConfig.businessBrand.businessName || "[Business Name]"}
                                      </p>
                                    </div>
                          </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateSection("emailSettings", {
                                      ...agentConfig.emailSettings,
                                      customSignature: `Best wishes,\n${agentConfig.businessBrand.businessName || "[Business Name]"} Support Team\nPhone: [Your Phone]\nEmail: [Your Email]`
                                    })}
                                    className="h-auto py-2 px-3 text-left justify-start rounded-md"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">Detailed</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Best wishes,<br />
                                        {agentConfig.businessBrand.businessName || "[Business Name]"} Support Team<br />
                                        Phone: [Your Phone]<br />
                                        Email: [Your Email]
                                      </p>
                        </div>
                                  </Button>
                                  
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateSection("emailSettings", {
                                      ...agentConfig.emailSettings,
                                      customSignature: `Cheers,\nThe team at ${agentConfig.businessBrand.businessName || "[Business Name]"}`
                                    })}
                                    className="h-auto py-2 px-3 text-left justify-start rounded-md"
                                  >
                                    <div>
                                      <p className="font-medium text-sm">Friendly</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Cheers,<br />
                                        The team at {agentConfig.businessBrand.businessName || "[Business Name]"}
                                      </p>
                                    </div>
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Business Information Summary */}
                                <div className="bg-blue-50 p-5 rounded-md border border-blue-100 h-full">
                                  <h3 className="font-medium mb-3 flex items-center text-blue-800">
                              <Store className="h-4 w-4 text-blue-600 mr-2" />
                              Business Information
                            </h3>
                            {agentConfig.businessBrand.businessName && (
                                    <p className="text-sm font-medium mb-2">{agentConfig.businessBrand.businessName}</p>
                            )}
                            {agentConfig.businessBrand.businessContext ? (
                              <p className="text-sm text-muted-foreground">
                                {agentConfig.businessBrand.businessContext}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">
                                No business description provided
                              </p>
                            )}
                          </div>
                          
                                {/* Hours & Contact */}
                                <div className="bg-gray-50 p-5 rounded-md border h-full">
                                  <h3 className="font-medium mb-3 flex items-center">
                                <Clock3 className="h-4 w-4 text-blue-600 mr-2" />
                                Business Hours
                              </h3>
                                  <div className="space-y-1">
                                {Object.entries(agentConfig.businessHours)
                                  .filter(([_, hours]) => hours.open)
                                  .map(([day, hours]) => (
                                        <div key={day} className="flex justify-between text-sm">
                                          <span className="capitalize font-medium">{day}</span>
                                          <span className="text-gray-600">{hours.start} - {hours.end}</span>
                                        </div>
                                  ))}
                              {Object.values(agentConfig.businessHours).every(h => !h.open) && (
                                <p className="text-sm text-muted-foreground italic">No business hours set</p>
                              )}
                                  </div>
                            </div>
                            
                                {/* Communication Style */}
                                <div className="bg-gray-50 p-5 rounded-md border h-full">
                                  <h3 className="font-medium mb-3 flex items-center">
                                <Layers className="h-4 w-4 text-blue-600 mr-2" />
                                Communication Style
                              </h3>
                                  <div className="space-y-3">
                                    <Badge className="rounded-md bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
                                  {agentConfig.emailSettings.emailTone.charAt(0).toUpperCase() + 
                                   agentConfig.emailSettings.emailTone.slice(1)}
                                </Badge>
                                {businessInsights.brandVoice.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium mb-2">Brand Voice Traits:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {businessInsights.brandVoice.map((trait, index) => (
                                        <Badge key={index} variant="outline" className="text-xs bg-white rounded-md">
                                          {trait}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                  </div>
                              </div>
                            </div>
                              
                              <div className="flex justify-end mt-6 pt-4 border-t">
                                <Button 
                                  onClick={() => saveAgentConfig()}
                                  disabled={saving}
                                  className="rounded-md"
                                >
                                  {saving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-2" />
                                      Save Changes
                                    </>
                                  )}
                                </Button>
                              </div>
                            
                              <div className="flex justify-end mt-4">
                                <Button 
                                  onClick={() => {
                                    extractBusinessInsights();
                                    setCustomerServiceSheetOpen(true);
                                  }}
                                  size="sm"
                                  className="rounded-md"
                                >
                                  <Wrench className="h-4 w-4 mr-2" />
                                  Edit Settings
                                </Button>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="business-context" className="p-6">
                            <div className="space-y-6">
                              <div className="flex justify-between items-center">
                                <h3 className="font-medium flex items-center">
                                  <BookText className="h-4 w-4 text-blue-600 mr-2" />
                                  Business Knowledge Base
                              </h3>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    extractBusinessInsights();
                                    setShowBusinessContext(true);
                                    setCustomerServiceSheetOpen(true);
                                  }}
                                  className="rounded-md"
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Add Context
                                </Button>
                                </div>
                              
                              {/* First Row: Business Information and Business Hours */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Business Information */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Store className="h-4 w-4 text-blue-600 mr-2" />
                                    Business Information
                                  </h3>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="businessName">Business Name</Label>
                                      <Input 
                                        id="businessName"
                                        value={agentConfig.businessBrand.businessName}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          businessName: e.target.value
                                        })}
                                        className="mt-1 rounded-md"
                                        placeholder="Enter your business name"
                                      />
                                </div>
                                    
                                    <div>
                                      <Label htmlFor="businessContext">Business Description</Label>
                                      <Textarea
                                        id="businessContext"
                                        value={agentConfig.businessBrand.businessContext}
                                        onChange={(e) => updateSection("businessBrand", {
                                          ...agentConfig.businessBrand,
                                          businessContext: e.target.value
                                        })}
                                        className="mt-1 min-h-[100px] rounded-md"
                                        placeholder="Describe what your business does, your products/services, and your value proposition"
                                      />
                              </div>
                            </div>
                          </div>
                          
                                {/* Business Hours */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Clock3 className="h-4 w-4 text-blue-600 mr-2" />
                                    Business Hours
                                  </h3>
                                  
                                  <div className="space-y-3">
                                    {Object.entries(agentConfig.businessHours).map(([day, hours]: [string, any]) => (
                                      <div key={day} className="flex items-center gap-3">
                                        <div className="w-24">
                                          <span className="capitalize">{day}</span>
                                        </div>
                                        <Switch
                                          checked={hours.open}
                                          onCheckedChange={(checked) => {
                                            const updatedHours = {
                                              ...agentConfig.businessHours,
                                              [day]: {
                                                ...hours,
                                                open: checked
                                              }
                                            };
                                            updateSection("businessHours", updatedHours);
                                          }}
                                        />
                                        {hours.open && (
                                          <div className="flex-1 flex items-center gap-2">
                                            <Input
                                              type="time"
                                              value={hours.start}
                                              onChange={(e) => {
                                                const updatedHours = {
                                                  ...agentConfig.businessHours,
                                                  [day]: {
                                                    ...hours,
                                                    start: e.target.value
                                                  }
                                                };
                                                updateSection("businessHours", updatedHours);
                                              }}
                                              className="w-28 rounded-md"
                                            />
                                            <span>to</span>
                                            <Input
                                              type="time"
                                              value={hours.end}
                                              onChange={(e) => {
                                                const updatedHours = {
                                                  ...agentConfig.businessHours,
                                                  [day]: {
                                                    ...hours,
                                                    end: e.target.value
                                                  }
                                                };
                                                updateSection("businessHours", updatedHours);
                                              }}
                                              className="w-28 rounded-md"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Second Row: Public Holidays and Return Policy */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Public Holidays */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                                    Public Holidays
                                  </h3>
                                  
                                  <div className="space-y-4">
                            <div>
                                      <Label htmlFor="publicHolidays">Holiday Schedule</Label>
                                      <Textarea
                                        id="publicHolidays"
                                        value={agentConfig.businessKnowledge?.publicHolidays || ""}
                                        onChange={(e) => {
                                          const updatedKnowledge = {
                                            ...agentConfig.businessKnowledge,
                                            publicHolidays: e.target.value,
                                            lastUpdated: Date.now()
                                          };
                                          updateSection("businessKnowledge", updatedKnowledge);
                                        }}
                                        className="mt-1 min-h-[150px] rounded-md"
                                        placeholder="List your public holidays and special opening hours:&#10;&#10;New Year's Day (Jan 1) - Closed&#10;Australia Day (Jan 26) - 10am to 4pm&#10;Good Friday - Closed"
                                      />
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Enter one holiday per line with dates and opening hours
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Return Policy */}
                                <div className="border rounded-md p-5 space-y-4">
                                  <h3 className="font-medium flex items-center">
                                    <RefreshCcw className="h-4 w-4 text-blue-600 mr-2" />
                                    Return Policy
                                  </h3>
                                  
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor="returnPolicy">Return & Refund Policy</Label>
                                      <Textarea
                                        id="returnPolicy"
                                        value={agentConfig.businessKnowledge?.returnPolicy || ""}
                                        onChange={(e) => {
                                          const updatedKnowledge = {
                                            ...agentConfig.businessKnowledge,
                                            returnPolicy: e.target.value,
                                            lastUpdated: Date.now()
                                          };
                                          updateSection("businessKnowledge", updatedKnowledge);
                                        }}
                                        className="mt-1 min-h-[150px] rounded-md"
                                        placeholder="Describe your return and refund policy in detail:&#10;&#10;- Return period (e.g., 30 days)&#10;- Condition requirements&#10;- Refund process&#10;- Exceptions"
                                      />
                                      <p className="text-xs text-muted-foreground mt-2">
                                        Provide clear details about your return and refund policies
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Business Context Entries */}
                              <div className="border rounded-md p-5 space-y-4">
                                <h3 className="font-medium flex items-center">
                                <BookText className="h-4 w-4 text-blue-600 mr-2" />
                                  Additional Business Context
                                  {agentConfig.businessKnowledge.manualEntries.length > 0 && (
                                    <Badge variant="outline" className="ml-2 rounded-md">
                                      {agentConfig.businessKnowledge.manualEntries.length} {agentConfig.businessKnowledge.manualEntries.length === 1 ? 'entry' : 'entries'}
                                    </Badge>
                                  )}
                              </h3>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={handleVoiceRecord}
                                    className={`gap-2 rounded-md ${isRecording ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
                                  >
                                    <Mic className={`h-4 w-4 ${isRecording ? 'text-red-600 animate-pulse' : ''}`} />
                                    {isRecording ? 'Recording...' : 'Add voice input'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setShowManualInput(!showManualInput)}
                                    className="gap-2 rounded-md"
                                  >
                                    <PlusCircle className="h-4 w-4" />
                                    Add manual context
                                  </Button>
                                </div>
                                
                                {showManualInput && (
                                  <div className="border p-4 rounded-md bg-gray-50 space-y-3">
                                    <Textarea
                                      placeholder="Describe your business, products, services, policies, or any other relevant information..."
                                      value={manualInput}
                                      onChange={(e) => setManualInput(e.target.value)}
                                      className="min-h-[100px] rounded-md"
                                    />
                                    <div className="flex justify-end gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setManualInput("");
                                          setShowManualInput(false);
                                        }}
                                        className="rounded-md"
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={() => addManualContextEntry(manualInput)}
                                        disabled={!manualInput.trim()}
                                        className="rounded-md"
                                      >
                                        Save Context
                                      </Button>
                                    </div>
                                  </div>
                                )}
                                
                                {agentConfig.businessKnowledge.manualEntries.length > 0 ? (
                                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                  {agentConfig.businessKnowledge.manualEntries.map((entry) => (
                                      <div key={entry.id} className="p-3 bg-gray-50 rounded-md border">
                                        <div className="flex items-center justify-between mb-2">
                                          <Badge variant={entry.source === 'voice' ? 'secondary' : 'outline'} className="rounded-md">
                                            {entry.source === 'voice' ? 'Voice Input' : 'Manual Entry'}
                                        </Badge>
                                          <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                              {new Date(entry.timestamp).toLocaleString()}
                                        </span>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => deleteContextEntry(entry.id)}
                                              className="h-6 w-6 rounded-md hover:bg-red-50 hover:text-red-600"
                                              title="Delete entry"
                                            >
                                              <X className="h-4 w-4" />
                                            </Button>
                                          </div>
                                      </div>
                                      <p className="text-sm">{entry.content}</p>
                                    </div>
                                  ))}
                                </div>
                                ) : (
                                  <div className="text-center py-6 text-muted-foreground">
                                    <BookText className="h-12 w-12 mx-auto mb-2 opacity-20" />
                                    <p>No business context entries yet.</p>
                                    <p className="text-sm">Add context using the buttons above.</p>
                              </div>
                                )}
                            </div>
                              
                              <div className="flex justify-end pt-4">
                                <Button 
                                  onClick={() => saveAgentConfig()}
                                  disabled={saving}
                                  className="rounded-md"
                                >
                                  {saving ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-2" />
                                      Save Changes
                                    </>
                          )}
                                </Button>
                        </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    ) : (
                      <div className="max-w-2xl mx-auto text-center py-12">
                        <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          <Bot className="h-10 w-10 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-medium mb-3">Set Up Customer Service Agent</h2>
                        <p className="text-gray-600 mb-8 max-w-lg mx-auto">
                          Let AI handle customer inquiries automatically, delivering timely and consistent 
                          responses based on your specific business rules and preferences.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left max-w-2xl mx-auto mb-8">
                          <div className="bg-gray-50 p-4 rounded-md border">
                            <MessageSquare className="h-6 w-6 text-blue-600 mb-3" />
                            <h3 className="font-medium mb-1">Auto-Response</h3>
                            <p className="text-sm text-gray-600">Automatically reply to common customer questions</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-md border">
                            <Clock3 className="h-6 w-6 text-blue-600 mb-3" />
                            <h3 className="font-medium mb-1">24/7 Support</h3>
                            <p className="text-sm text-gray-600">Provide instant responses at any time</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-md border">
                            <Bot className="h-6 w-6 text-blue-600 mb-3" />
                            <h3 className="font-medium mb-1">Smart Learning</h3>
                            <p className="text-sm text-gray-600">Gets better as it learns your business</p>
                          </div>
                        </div>
                        <Button 
                          onClick={() => {
                            // Navigate to detailed setup or open a modal
                            setCustomerServiceSheetOpen(true)
                          }}
                          size="lg"
                          className="bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white gap-2 rounded-md px-6"
                        >
                          <Bot className="h-5 w-5" />
                          Set up customer agent
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
          
          <TabsContent value="customers">
            <CustomersList />
          </TabsContent>
        </Tabs>
      </div>
      {customerServiceSheetOpen && (
        <Sheet open={customerServiceSheetOpen} onOpenChange={setCustomerServiceSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl p-0 flex flex-col rounded-md">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {!showBusinessContext ? (
                  <>
                    <SheetHeader className="mb-8">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                      <SheetTitle className="text-xl">Customer Service Agent Setup</SheetTitle>
                      <SheetDescription>
                        Configure your AI-powered customer service agent to handle common inquiries.
                      </SheetDescription>
                        </div>
                      </div>
                    </SheetHeader>
                    
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-5 rounded-md border border-blue-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <BookText className="h-5 w-5 text-blue-600" />
                          </div>
                          <h3 className="font-medium">Business Knowledge</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Add information about your business that the agent will use when responding to customer inquiries.
                        </p>
                        <Button 
                          onClick={() => {
                            extractBusinessInsights();
                            setShowBusinessContext(true);
                          }}
                          className="w-full gap-2 rounded-md bg-blue-600 hover:bg-blue-700"
                        >
                          <BookOpen className="h-4 w-4" />
                          View & Edit Business Context
                        </Button>
                      </div>

                      <div className="bg-green-50 p-5 rounded-md border border-green-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                            <LineChart className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="font-medium">Inquiry Analysis</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          Analyse customer inquiries to identify common patterns and improve automated responses.
                        </p>
                        <Button 
                          onClick={() => {
                            toast({
                              title: "Analysis Started",
                              description: "Analysing customer inquiries. This may take a few minutes.",
                            })
                          }}
                          className="w-full gap-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                        >
                          <LineChart className="h-4 w-4" />
                          Analyse customer inquiries
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <h3 className="font-medium flex items-center">
                          <Bot className="h-4 w-4 text-blue-600 mr-2" />
                          Agent Configuration
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Configure how your customer service agent responds to inquiries.
                        </p>
                        
                        <div className="space-y-5 rounded-md border p-5">
                          <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md border">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${agentConfig.emailSettings.automaticResponses ? 'bg-green-100' : 'bg-gray-200'}`}>
                              <MessageSquare className={`h-5 w-5 ${agentConfig.emailSettings.automaticResponses ? 'text-green-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1">
                              <Label htmlFor="enableAgent" className="font-medium">Enable customer service agent</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                Agent will automatically respond to customer inquiries
                              </p>
                            </div>
                            <Switch 
                              id="enableAgent" 
                              checked={agentConfig.emailSettings.automaticResponses}
                              onCheckedChange={(checked) => {
                                updateSection("emailSettings", {
                                  ...agentConfig.emailSettings,
                                  automaticResponses: checked
                                })
                              }}
                            />
                          </div>
                          
                          <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md border">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${agentConfig.emailSettings.notifyBeforeSend ? 'bg-blue-100' : 'bg-gray-200'}`}>
                              <Check className={`h-5 w-5 ${agentConfig.emailSettings.notifyBeforeSend ? 'text-blue-600' : 'text-gray-500'}`} />
                            </div>
                            <div className="flex-1">
                              <Label htmlFor="humanReview" className="font-medium">Require human review</Label>
                              <p className="text-xs text-muted-foreground mt-1">
                                You'll review all responses before they're sent to customers
                              </p>
                            </div>
                            <Switch 
                              id="humanReview" 
                              checked={agentConfig.emailSettings.notifyBeforeSend}
                              onCheckedChange={(checked) => {
                                updateSection("emailSettings", {
                                  ...agentConfig.emailSettings,
                                  notifyBeforeSend: checked
                                })
                              }}
                            />
                          </div>
                          
                          <div className="pt-2">
                            <Label htmlFor="agentTone" className="font-medium mb-2 block">Communication Style</Label>
                            <Select 
                              value={agentConfig.emailSettings.emailTone}
                              onValueChange={(value) => {
                                updateSection("emailSettings", {
                                  ...agentConfig.emailSettings,
                                  emailTone: value
                                })
                              }}
                            >
                              <SelectTrigger id="agentTone" className="rounded-md w-full bg-gray-50 border">
                                <SelectValue placeholder="Select a tone" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="casual">Casual</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                                <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                                <SelectItem value="empathetic">Empathetic</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                              This sets the overall tone for all customer communications
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2 border">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-blue-600" />
                        <p className="font-medium">About the Customer Service Agent</p>
                        </div>
                        <p className="text-muted-foreground">
                          This AI agent automatically responds to customer inquiries based on your business information. With human review enabled, you'll approve responses before they're sent.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  renderBusinessContextPage()
                )}
              </div>
            </div>
            
            <div className="border-t border-[#E2E4E8] bg-white p-4">
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (showBusinessContext) {
                      setShowBusinessContext(false);
                    } else {
                      // Use the resetToDefault function
                      resetToDefault();
                    }
                  }}
                  className="h-9 gap-2 border shadow-sm rounded-md"
                >
                  {showBusinessContext ? "Back to Setup" : "Reset Settings"}
                </Button>
                
                <Button 
                  onClick={() => {
                    if (showBusinessContext) {
                      // Save business context information
                      saveAgentConfig();
                      setShowBusinessContext(false);
                    } else {
                      saveAgentConfig();
                      setCustomerServiceSheetOpen(false);
                    }
                  }}
                  disabled={saving}
                  size="sm"
                  className="h-9 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white shadow-sm rounded-md"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : showBusinessContext ? (
                    "Save & Continue"
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
} 