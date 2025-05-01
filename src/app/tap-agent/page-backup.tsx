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
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { ArrowRight, Info } from "lucide-react"

// Create a mock implementation for agent settings functions
// This would be replaced with actual implementation later
const saveAgentSettings = async (settings: any) => {
  console.log("Saving agent settings:", settings);
  // Mock implementation
  return Promise.resolve({ success: true });
};

const getOperatingHours = () => {
  // Mock implementation
  return Promise.resolve("9:00 AM - 5:00 PM");
};

export default function TapAgentPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // State for active tab
  const [activeTab, setActiveTab] = useState<string>("business-brand")
  const [completionStatus, setCompletionStatus] = useState<Record<string, number>>({
    "business-brand": 0,
    "product-pricing": 0,
    "financial": 0,
    "customer-segments": 0,
    "reward-constraints": 0,
    "messaging": 0,
    "campaign": 0,
    "compliance": 0,
    "performance": 0,
    "dormancy": 0,
    "data-enhancers": 0
  })
  const [overallProgress, setOverallProgress] = useState<number>(0)
  
  // Sample form state for business and brand section
  const [businessBrand, setBusinessBrand] = useState({
    openingHours: "",
    brandPrimaryColor: "#007AFF",
    brandSecondaryColor: "#FFFFFF",
    brandAccentColor: "#FF3B30",
    logoUrl: "",
    toneOfVoice: [] as string[],
    agentTasks: [] as string[]
  })

  // Add a new state for the product & pricing section below the businessBrand state
  const [productPricing, setProductPricing] = useState({
    skuList: [] as {name: string, category: string, price: string, cost: string}[],
    heroItems: [] as string[],
    lowVelocityItems: [] as string[],
    averageBasketSize: "",
    basketComposition: [] as {category: string, percentage: number}[],
    newSkuName: "",
    newSkuCategory: "",
    newSkuPrice: "",
    newSkuCost: "",
    newHeroItem: "",
    newLowVelocityItem: "",
    newBasketCategory: "",
    newBasketPercentage: 0
  })

  // Update function for business and brand state
  const updateBusinessBrand = (key: string, value: any) => {
    setBusinessBrand(prev => ({
      ...prev,
      [key]: value
    }))
    
    // Calculate section completion
    const requiredFields = ["openingHours", "brandPrimaryColor", "logoUrl", "toneOfVoice"]
    const filledRequired = requiredFields.filter(field => {
      if (field === "toneOfVoice") {
        return businessBrand.toneOfVoice.length > 0
      }
      return businessBrand[field as keyof typeof businessBrand]
    }).length
    const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100)
    
    setCompletionStatus(prev => ({
      ...prev,
      "business-brand": completionPercentage
    }))
  }
  
  // Load opening hours when component mounts
  useEffect(() => {
    const loadOperatingHours = async () => {
      if (!user) return
      
      try {
        const merchantId = user.uid
        const hours = await getOperatingHours()
        updateBusinessBrand('openingHours', hours)
      } catch (error) {
        console.error("Error loading operating hours:", error)
      }
    }
    
    loadOperatingHours()
  }, [user])
  
  // Calculate overall progress whenever section completion changes
  useEffect(() => {
    const sectionValues = Object.values(completionStatus)
    const averageCompletion = sectionValues.reduce((sum, value) => sum + value, 0) / sectionValues.length
    setOverallProgress(Math.round(averageCompletion))
  }, [completionStatus])
  
  // Save progress to Firebase
  const saveProgress = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save settings.",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    
    try {
      const merchantId = user.uid
      
      // Combine all settings into one object
      const agentSettings = {
        businessBrand,
        productPricing,
        // Include other state objects here
      }
      
      // Save to Firestore using our utility function
      const success = await saveAgentSettings(agentSettings)
      
      if (success) {
        toast({
          title: "Progress Saved",
          description: "Your Tap Agent configuration has been saved.",
        })
      } else {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Tap Agent Configuration</h1>
              <p className="text-muted-foreground">Configure your AI agent to meet your business needs</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="w-32" />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-10 h-auto p-1">
              <TabsTrigger value="business-brand" className="flex flex-col py-2 px-4 h-auto gap-1">
                <span>Business & Brand</span>
                <Progress value={completionStatus["business-brand"]} className="h-1.5" />
              </TabsTrigger>
              {/* Other tab triggers */}
            </TabsList>

            <TabsContent value="business-brand" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business & Brand</CardTitle>
                  <CardDescription>Define your business details and brand identity</CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Brand Identity</h3>
                    
                    {/* Opening Hours Field */}
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="openingHours">Opening Hours</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">Enter your business hours in format: Mon-Fri: 9am-5pm, Sat: 10am-4pm, Sun: Closed</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="openingHours"
                        placeholder="Mon-Fri: 9am-5pm, Sat: 10am-4pm, Sun: Closed"
                        value={businessBrand.openingHours}
                        onChange={(e) => updateBusinessBrand("openingHours", e.target.value)}
                      />
                    </div>
                    
                    {/* Brand Palette Section */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Brand Palette</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Primary Color */}
                        <div className="space-y-2">
                          <Label htmlFor="brandPrimaryColor">Primary Color</Label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-10 h-10 rounded-md border" 
                              style={{ backgroundColor: businessBrand.brandPrimaryColor }}
                            />
                            <Input
                              id="brandPrimaryColor"
                              type="text"
                              value={businessBrand.brandPrimaryColor}
                              onChange={(e) => updateBusinessBrand("brandPrimaryColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Main brand color</p>
                        </div>
                        
                        {/* Secondary Color */}
                        <div className="space-y-2">
                          <Label htmlFor="brandSecondaryColor">Secondary Color</Label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-10 h-10 rounded-md border" 
                              style={{ backgroundColor: businessBrand.brandSecondaryColor }}
                            />
                            <Input
                              id="brandSecondaryColor"
                              type="text"
                              value={businessBrand.brandSecondaryColor}
                              onChange={(e) => updateBusinessBrand("brandSecondaryColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Supporting brand color</p>
                        </div>
                        
                        {/* Accent Color */}
                        <div className="space-y-2">
                          <Label htmlFor="brandAccentColor">Accent Color</Label>
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-10 h-10 rounded-md border" 
                              style={{ backgroundColor: businessBrand.brandAccentColor }}
                            />
                            <Input
                              id="brandAccentColor"
                              type="text"
                              value={businessBrand.brandAccentColor}
                              onChange={(e) => updateBusinessBrand("brandAccentColor", e.target.value)}
                              className="flex-1"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">Highlight color for CTAs</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Logo URL */}
                    <div className="grid gap-2">
                      <Label htmlFor="logoUrl">Logo URL</Label>
                      <Input
                        id="logoUrl"
                        placeholder="https://example.com/logo.png"
                        value={businessBrand.logoUrl}
                        onChange={(e) => updateBusinessBrand("logoUrl", e.target.value)}
                      />
                    </div>
                    
                    {/* Tone of Voice Tags */}
                    <div className="space-y-3">
                      <Label>Tone of Voice</Label>
                      <div className="flex flex-wrap gap-2">
                        {["Professional", "Friendly", "Casual", "Formal", "Playful", "Authoritative", "Empathetic", "Enthusiastic"].map((tone) => (
                          <Badge
                            key={tone}
                            variant={businessBrand.toneOfVoice.includes(tone) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => {
                              if (businessBrand.toneOfVoice.includes(tone)) {
                                updateBusinessBrand("toneOfVoice", businessBrand.toneOfVoice.filter(t => t !== tone))
                              } else {
                                updateBusinessBrand("toneOfVoice", [...businessBrand.toneOfVoice, tone])
                              }
                            }}
                          >
                            {tone}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Select tags that best describe your brand's communication style</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Agent Tasks Section */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-lg">Agent Tasks</h3>
                    <p className="text-sm text-muted-foreground">Select which tasks you want your Tap Agent to perform</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[
                        { name: "Customer Support", icon: "MessageSquare" },
                        { name: "Order Status", icon: "Package" },
                        { name: "Product Recommendations", icon: "Gift" },
                        { name: "Loyalty Program", icon: "Award" },
                        { name: "Promotions", icon: "Tag" },
                        { name: "Inventory Checks", icon: "Clipboard" },
                      ].map((task) => (
                        <div key={task.name} className="flex items-start space-x-3 p-3 border rounded-lg">
                          <Switch
                            id={`task-${task.name}`}
                            checked={businessBrand.agentTasks.includes(task.name)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                updateBusinessBrand("agentTasks", [...businessBrand.agentTasks, task.name])
                              } else {
                                updateBusinessBrand("agentTasks", businessBrand.agentTasks.filter(t => t !== task.name))
                              }
                            }}
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor={`task-${task.name}`}>{task.name}</Label>
                            <p className="text-xs text-muted-foreground">Enable this task for your agent</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between border-t p-6">
                  <Button variant="outline">Reset</Button>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={saveProgress} disabled={loading}>
                      {loading ? "Saving..." : "Save Progress"}
                    </Button>
                    <Button 
                      className="gap-2 bg-blue-600 hover:bg-blue-700" 
                      onClick={() => setActiveTab("product-pricing")}
                    >
                      Next: Product & Pricing
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Other tabs content would go here */}
          </Tabs>
        </div>
      </div>
    </PageTransition>
  )
} 