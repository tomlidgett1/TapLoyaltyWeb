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
  MessageSquare,
  Maximize2,
  Minimize2
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
  const [isExpanded, setIsExpanded] = useState(false)

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

  const toggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0D6EFD]"></div>
      </div>
    )
  }

  return (
    <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'fixed inset-0 z-50 bg-white overflow-auto' : 'mx-auto max-w-full bg-white'}`}>
      <div className="flex flex-col">
        <div className="w-full bg-white">
          <div className={`${isExpanded ? 'px-4 py-2' : 'px-6 py-4 max-w-7xl'}`}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <h1 className={`${isExpanded ? 'text-xl' : 'text-xl'} font-semibold tracking-tight text-[#111827]`}>
                  <span className="bg-gradient-to-r from-[#0D6EFD] to-[#FF8C00] bg-clip-text text-transparent">Tap Agent</span> Setup
                </h1>
                <div className="flex items-center gap-2">
                  <Tabs 
                    defaultValue="setup" 
                    value={mainTab} 
                    onValueChange={handleMainTabChange} 
                    className="mr-2"
                  >
                    <TabsList className="h-8 grid grid-cols-2 bg-[#F6F6F7] border border-[#E2E4E8] rounded-md overflow-hidden p-0.5">
                      <TabsTrigger 
                        value="setup" 
                        className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
                      >
                        Setup
                      </TabsTrigger>
                      <TabsTrigger 
                        value="customers" 
                        className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-[#111827] data-[state=active]:shadow-sm text-[#6B7280] transition-all duration-150 ease-in-out"
                      >
                        Customers
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    asChild 
                    className="h-8 border-[#D1D5DB] text-[#111827] hover:bg-[#F0F2F4] transition-all duration-150 ease-in-out active:scale-[0.98]"
                  >
                    <Link href="/tap-agent/intro">Learn More</Link>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={toggleExpand}
                    className="h-8 border-[#D1D5DB] text-[#111827] hover:bg-[#F0F2F4] transition-all duration-150 ease-in-out active:scale-[0.98] flex items-center gap-1"
                  >
                    {isExpanded ? (
                      <>
                        <Minimize2 className="h-3.5 w-3.5" />
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
              </div>
              {!isExpanded && (
                <p className="text-sm text-[#6B7280]">
                  Configure your Tap Agent to automate marketing, rewards, and customer engagement.
                </p>
              )}
            </div>
            
            <div className="h-px w-full bg-gray-200 mt-3"></div>
          </div>
        </div>
        
        <div className={`${isExpanded ? 'px-4 pt-0' : 'px-6 pt-0 max-w-7xl'}`}>
          <Tabs defaultValue="setup" value={mainTab} onValueChange={handleMainTabChange} className="w-full">
            <TabsContent value="setup">
              {!isExpanded && (
                <p className="text-sm text-[#6B7280] mb-2">
                  Complete each section to customize how your Tap Agent works for your business.
                </p>
              )}
              
              <Tabs 
                defaultValue="brand" 
                value={activeTab} 
                onValueChange={handleTabChange}
                className="w-full"
              >
                <div className="flex flex-col gap-3">
                  <div className={`w-full bg-white py-2 mb-2 ${isExpanded ? 'sticky top-16 z-10 shadow-sm' : ''}`}>
                    <div className="flex flex-wrap gap-1.5 justify-start items-center">
                      <TabsList className="flex flex-wrap h-auto gap-1.5 bg-transparent p-0">
                        <TabsTrigger 
                          value="brand" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <Building2 className="mr-1.5 h-3.5 w-3.5" />
                          Business Brand
                        </TabsTrigger>
                        <TabsTrigger 
                          value="tasks" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Agent Tasks
                        </TabsTrigger>
                        <TabsTrigger 
                          value="hours" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <Clock className="mr-1.5 h-3.5 w-3.5" />
                          Hours
                        </TabsTrigger>
                        <TabsTrigger 
                          value="objectives" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <Target className="mr-1.5 h-3.5 w-3.5" />
                          Objectives
                        </TabsTrigger>
                        <TabsTrigger 
                          value="pricing" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <TagsIcon className="mr-1.5 h-3.5 w-3.5" />
                          Pricing
                        </TabsTrigger>
                        <TabsTrigger 
                          value="financials" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <LineChart className="mr-1.5 h-3.5 w-3.5" />
                          Financials
                        </TabsTrigger>
                        <TabsTrigger 
                          value="cohorts" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <UsersRound className="mr-1.5 h-3.5 w-3.5" />
                          Cohorts
                        </TabsTrigger>
                        <TabsTrigger 
                          value="rewards" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <Gift className="mr-1.5 h-3.5 w-3.5" />
                          Rewards
                        </TabsTrigger>
                        <TabsTrigger 
                          value="messaging" 
                          className="justify-start h-8 px-3 rounded-md text-xs transition-all border border-[#E2E4E8] hover:border-[#0D6EFD] hover:bg-[#EBF5FF] data-[state=active]:border-[#0D6EFD] data-[state=active]:bg-[#EBF5FF] data-[state=active]:text-[#0D6EFD] data-[state=active]:shadow-sm"
                        >
                          <MessageSquare className="mr-1.5 h-3.5 w-3.5" />
                          Messages
                        </TabsTrigger>
                      </TabsList>
                    </div>
                  </div>
                  
                  <div className="w-full bg-white rounded-lg border border-[#E2E4E8] p-5">
                    <ScrollArea className={`${isExpanded ? 'max-h-[calc(100vh-180px)]' : 'max-h-[650px]'} scrollable`}>
                      <div className={`${isExpanded ? 'px-0' : 'pr-2'}`}>
                        <TabsContent value="brand" className="pt-0 mt-0">
                          <BusinessBrandForm 
                            data={agentConfig.businessBrand} 
                            onChange={(data) => updateSection("businessBrand", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="tasks" className="pt-0 mt-0">
                          <AgentTasksForm 
                            data={agentConfig.agentTasks} 
                            onChange={(data) => updateSection("agentTasks", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="hours" className="pt-0 mt-0">
                          <BusinessHoursForm 
                            data={agentConfig.businessHours} 
                            onChange={(data) => updateSection("businessHours", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="objectives" className="pt-0 mt-0">
                          <ObjectivesForm 
                            data={agentConfig.objectives} 
                            onChange={(data) => updateSection("objectives", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="pricing" className="pt-0 mt-0">
                          <ProductPricingForm 
                            data={agentConfig.productPricing} 
                            onChange={(data) => updateSection("productPricing", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="financials" className="pt-0 mt-0">
                          <FinancialGuardrailsForm 
                            data={agentConfig.financialGuardrails} 
                            onChange={(data) => updateSection("financialGuardrails", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="cohorts" className="pt-0 mt-0">
                          <CustomerCohortsForm 
                            data={agentConfig.customerCohorts} 
                            onChange={(data) => updateSection("customerCohorts", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="rewards" className="pt-0 mt-0">
                          <RewardConstraintsForm 
                            data={agentConfig.rewardConstraints} 
                            onChange={(data) => updateSection("rewardConstraints", data)} 
                          />
                        </TabsContent>
                        
                        <TabsContent value="messaging" className="pt-0 mt-0">
                          <MessagingConstraintsForm 
                            data={agentConfig.messagingConstraints} 
                            onChange={(data) => updateSection("messagingConstraints", data)} 
                          />
                        </TabsContent>
                      </div>
                    </ScrollArea>
                    
                    <div className="flex justify-between mt-6 pt-4 border-t border-[#E2E4E8]">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // Reset section to default
                          const sectionKey = activeTab === "brand" ? "businessBrand" :
                                          activeTab === "tasks" ? "agentTasks" :
                                          activeTab === "hours" ? "businessHours" :
                                          activeTab === "objectives" ? "objectives" :
                                          activeTab === "pricing" ? "productPricing" :
                                          activeTab === "financials" ? "financialGuardrails" :
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
                        className="h-8 border-[#D1D5DB] text-[#111827] hover:bg-[#F0F2F4] transition-all duration-150 ease-in-out active:scale-[0.98]"
                      >
                        Reset Section
                      </Button>
                      
                      <Button 
                        onClick={saveAgentConfig}
                        disabled={saving}
                        size="sm"
                        className="h-8 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white transition-all duration-150 ease-in-out active:scale-[0.98]"
                      >
                        {saving ? "Saving..." : "Save Configuration"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs>
            </TabsContent>
            
            <TabsContent value="customers">
              <CustomersList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 