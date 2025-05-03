"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, setDoc } from "firebase/firestore"
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
import { CustomersList } from "./components/customers-view"
import { 
  Building2, 
  CheckCircle, 
  Clock, 
  Target, 
  TagsIcon, 
  LineChart, 
  Users, 
  UsersRound, 
  Gift, 
  MessageSquare 
} from "lucide-react"
import Link from "next/link"

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
  }
}

export default function AgentSetup() {
  const { user } = useAuth()
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(defaultAgentConfig)
  const [activeTab, setActiveTab] = useState("brand")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mainTab, setMainTab] = useState("setup")

  useEffect(() => {
    async function fetchAgentConfig() {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      
      try {
        const agentDocRef = doc(db, 'agents', user.uid)
        const agentDoc = await getDoc(agentDocRef)
        
        if (agentDoc.exists()) {
          const data = agentDoc.data() as AgentConfig
          setAgentConfig(data)
        } else {
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

  const saveAgentConfig = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to save your agent configuration.",
        variant: "destructive"
      })
      return
    }
    
    setSaving(true)
    
    try {
      const agentDocRef = doc(db, 'agents', user.uid)
      await setDoc(agentDocRef, agentConfig, { merge: true })
      
      toast({
        title: "Success",
        description: "Your agent configuration has been saved.",
        variant: "default"
      })
    } catch (error) {
      console.error("Error saving agent configuration:", error)
      toast({
        title: "Error",
        description: "Failed to save your agent configuration.",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
  }
  
  const handleMainTabChange = (tab: string) => {
    setMainTab(tab)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="mx-auto py-4 max-w-full bg-white">
      <div className="flex flex-col space-y-4">
        <div className="border-b border-gray-200 w-full bg-white shadow-sm">
          <div className="container mx-auto px-6 max-w-7xl pb-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Tap Agent</span> Setup
                </h1>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/tap-agent/intro">Learn More</Link>
                </Button>
              </div>
              <p className="text-muted-foreground">
                Configure your Tap Agent to automate marketing, rewards, and customer engagement.
              </p>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto px-6 max-w-7xl">
          <Tabs defaultValue="setup" value={mainTab} onValueChange={handleMainTabChange} className="w-full">
            <TabsList className="w-fit grid grid-cols-2 mb-6 shadow-md border border-gray-200 rounded-lg overflow-hidden">
              <TabsTrigger value="setup" className="px-6">Setup</TabsTrigger>
              <TabsTrigger value="customers" className="px-6">Customers</TabsTrigger>
            </TabsList>
            
            <TabsContent value="setup">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
                <p className="text-sm text-muted-foreground mb-4">
                  Complete each section to customize how your Tap Agent works for your business.
                </p>
                
                <Tabs 
                  defaultValue="brand" 
                  value={activeTab} 
                  onValueChange={handleTabChange}
                  className="w-full"
                >
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-60 flex-shrink-0 bg-slate-100 rounded-lg p-4 border border-slate-200 shadow-sm">
                      <ScrollArea className="md:h-auto max-h-[500px] scrollable pr-2">
                        <TabsList className="flex flex-col w-full h-auto space-y-1 bg-transparent">
                          <TabsTrigger value="brand" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <Building2 className="mr-2 h-4 w-4" />
                            Business Brand
                          </TabsTrigger>
                          <TabsTrigger value="tasks" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Agent Tasks
                          </TabsTrigger>
                          <TabsTrigger value="hours" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <Clock className="mr-2 h-4 w-4" />
                            Business Hours
                          </TabsTrigger>
                          <TabsTrigger value="objectives" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <Target className="mr-2 h-4 w-4" />
                            Objectives
                          </TabsTrigger>
                          <TabsTrigger value="pricing" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <TagsIcon className="mr-2 h-4 w-4" />
                            Product Pricing
                          </TabsTrigger>
                          <TabsTrigger value="financials" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <LineChart className="mr-2 h-4 w-4" />
                            Financial Guardrails
                          </TabsTrigger>
                          <TabsTrigger value="segments" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <Users className="mr-2 h-4 w-4" />
                            Customer Segments
                          </TabsTrigger>
                          <TabsTrigger value="cohorts" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <UsersRound className="mr-2 h-4 w-4" />
                            Customer Cohorts
                          </TabsTrigger>
                          <TabsTrigger value="rewards" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <Gift className="mr-2 h-4 w-4" />
                            Reward Constraints
                          </TabsTrigger>
                          <TabsTrigger value="messaging" className="justify-start w-full border border-transparent hover:border-blue-100 hover:bg-blue-50">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Messaging Constraints
                          </TabsTrigger>
                        </TabsList>
                      </ScrollArea>
                    </div>
                    
                    <div className="flex-1 bg-white rounded-lg p-6 shadow-md border border-slate-200">
                      <ScrollArea className="max-h-[650px] scrollable">
                        <div className="pr-4 pl-1">
                          <TabsContent value="brand">
                            <BusinessBrandForm 
                              data={agentConfig.businessBrand} 
                              onChange={(data) => updateSection("businessBrand", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="tasks">
                            <AgentTasksForm 
                              data={agentConfig.agentTasks} 
                              onChange={(data) => updateSection("agentTasks", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="hours">
                            <BusinessHoursForm 
                              data={agentConfig.businessHours} 
                              onChange={(data) => updateSection("businessHours", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="objectives">
                            <ObjectivesForm 
                              data={agentConfig.objectives} 
                              onChange={(data) => updateSection("objectives", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="pricing">
                            <ProductPricingForm 
                              data={agentConfig.productPricing} 
                              onChange={(data) => updateSection("productPricing", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="financials">
                            <FinancialGuardrailsForm 
                              data={agentConfig.financialGuardrails} 
                              onChange={(data) => updateSection("financialGuardrails", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="segments">
                            <CustomerSegmentsForm 
                              data={agentConfig.customerSegments} 
                              onChange={(data) => updateSection("customerSegments", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="cohorts">
                            <CustomerCohortsForm 
                              data={agentConfig.customerCohorts} 
                              onChange={(data) => updateSection("customerCohorts", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="rewards">
                            <RewardConstraintsForm 
                              data={agentConfig.rewardConstraints} 
                              onChange={(data) => updateSection("rewardConstraints", data)} 
                            />
                          </TabsContent>
                          
                          <TabsContent value="messaging">
                            <MessagingConstraintsForm 
                              data={agentConfig.messagingConstraints} 
                              onChange={(data) => updateSection("messagingConstraints", data)} 
                            />
                          </TabsContent>
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </Tabs>
                
                <div className="flex justify-between mt-6 pt-4 border-t border-slate-200">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      // Reset section to default
                      const sectionKey = activeTab === "brand" ? "businessBrand" :
                                      activeTab === "tasks" ? "agentTasks" :
                                      activeTab === "hours" ? "businessHours" :
                                      activeTab === "objectives" ? "objectives" :
                                      activeTab === "pricing" ? "productPricing" :
                                      activeTab === "financials" ? "financialGuardrails" :
                                      activeTab === "segments" ? "customerSegments" :
                                      activeTab === "cohorts" ? "customerCohorts" :
                                      activeTab === "rewards" ? "rewardConstraints" :
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
                    className="border-slate-300 hover:bg-slate-100"
                  >
                    Reset Section
                  </Button>
                  
                  <Button 
                    onClick={saveAgentConfig}
                    disabled={saving}
                    className="shadow-sm"
                  >
                    {saving ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="customers">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
                <CustomersList />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 