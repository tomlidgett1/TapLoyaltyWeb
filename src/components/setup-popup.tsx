"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Sparkles, 
  Zap, 
  Settings,
  ArrowRight,
  Clock,
  ChevronLeft,
  Building,
  Gift,
  Users,
  BarChart,
  Layers,
  Puzzle
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

interface SetupPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SetupStep = 'selection' | 'basic' | 'advanced'

export function SetupPopup({ open, onOpenChange }: SetupPopupProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<SetupStep>('selection')
  const [selectedMode, setSelectedMode] = useState<'basic' | 'advanced' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Basic setup form state
  const [basicForm, setBasicForm] = useState({
    businessName: '',
    businessType: '',
    pointsPerDollar: 1,
    welcomeReward: 100,
    emailNotifications: true,
    automaticRewards: false
  })

  // Advanced setup form state
  const [advancedForm, setAdvancedForm] = useState({
    businessName: '',
    businessType: '',
    businessDescription: '',
    customBranding: false,
    pointsPerDollar: [5],
    rewardTypes: [] as string[],
    tierSystem: false,
    referralProgram: false,
    customerSegmentation: false,
    automationLevel: 'basic',
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    analyticsLevel: 'standard',
    fraudDetection: true,
    apiAccess: false,
    integrations: [] as string[]
  })

  const [activeTab, setActiveTab] = useState('business')

  const handleModeSelection = (mode: 'basic' | 'advanced') => {
    setSelectedMode(mode)
    setCurrentStep(mode)
  }

  const handleBackToSelection = () => {
    setCurrentStep('selection')
    setSelectedMode(null)
  }

  const handleBasicSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Setup Complete!",
      description: "Your basic loyalty program has been configured successfully."
    })
    
    setIsLoading(false)
    onOpenChange(false)
    router.push('/dashboard')
  }

  const handleAdvancedSave = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Setup Complete!",
      description: "Your advanced loyalty program has been configured successfully."
    })
    
    setIsLoading(false)
    onOpenChange(false)
    router.push('/dashboard')
  }

  const handleSkip = () => {
    onOpenChange(false)
  }

  const handleRewardTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setAdvancedForm(prev => ({
        ...prev,
        rewardTypes: [...prev.rewardTypes, type]
      }))
    } else {
      setAdvancedForm(prev => ({
        ...prev,
        rewardTypes: prev.rewardTypes.filter(t => t !== type)
      }))
    }
  }

  const handleIntegrationChange = (integration: string, checked: boolean) => {
    if (checked) {
      setAdvancedForm(prev => ({
        ...prev,
        integrations: [...prev.integrations, integration]
      }))
    } else {
      setAdvancedForm(prev => ({
        ...prev,
        integrations: prev.integrations.filter(i => i !== integration)
      }))
    }
  }

  const tabs = [
    { id: 'business', label: 'Business', icon: Building },
    { id: 'loyalty', label: 'Loyalty', icon: Gift },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'integrations', label: 'Integrations', icon: Puzzle }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden rounded-md">
        {/* Mode Selection Step */}
        {currentStep === 'selection' && (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="flex items-center justify-center gap-2 text-2xl">
                <Sparkles className="h-6 w-6 text-[#007AFF]" />
                Welcome to Tap Loyalty!
              </DialogTitle>
              <DialogDescription className="text-base">
                Choose how you'd like to set up your loyalty program
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {/* Basic Setup */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 rounded-md bg-gray-50 ${
                  selectedMode === 'basic' 
                    ? 'border-[#007AFF] bg-[#007AFF]/5' 
                    : 'border-gray-200 hover:border-[#007AFF]/50'
                }`}
                onClick={() => setSelectedMode('basic')}
              >
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center mx-auto mb-4 border border-gray-200 shadow-sm">
                    <Zap className="h-5 w-5 text-gray-600" />
                  </div>
                  <CardTitle className="text-xl">Basic Setup</CardTitle>
                  <CardDescription>
                    Quick guided setup to get you started in minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Choose your business type</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Set up pre-built rewards</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Configure loyalty programs</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Create marketing banners</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>5-10 minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Setup */}
              <Card 
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 rounded-md bg-gray-50 ${
                  selectedMode === 'advanced' 
                    ? 'border-[#007AFF] bg-[#007AFF]/5' 
                    : 'border-gray-200 hover:border-[#007AFF]/50'
                }`}
                onClick={() => setSelectedMode('advanced')}
              >
                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 bg-white rounded-md flex items-center justify-center mx-auto mb-4 border border-gray-200 shadow-sm">
                    <Settings className="h-5 w-5 text-gray-600" />
                  </div>
                  <CardTitle className="text-xl">Advanced Mode</CardTitle>
                  <CardDescription>
                    Full control over every aspect of your loyalty program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Custom reward creation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Advanced analytics setup</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Customer segmentation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
                      <span className="text-sm">Integration management</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>Configure at your own pace</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </Button>
              
              <div className="flex gap-3">
                {selectedMode === 'basic' && (
                  <Button 
                    onClick={() => handleModeSelection('basic')}
                    className="bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-md"
                  >
                    Start Basic Setup
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                {selectedMode === 'advanced' && (
                  <Button 
                    onClick={() => handleModeSelection('advanced')}
                    className="bg-gray-900 hover:bg-gray-800 text-white rounded-md"
                  >
                    Open Advanced Mode
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
                
                {!selectedMode && (
                  <Button disabled className="rounded-md">
                    Select a setup mode
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Basic Setup Step */}
        {currentStep === 'basic' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="rounded-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-xl">Basic Setup</DialogTitle>
                  <DialogDescription>
                    Quick setup to get your loyalty program running
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[60vh] space-y-8 mt-6">
              {/* Business Information */}
              <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  Business Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={basicForm.businessName}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, businessName: e.target.value }))}
                      placeholder="Enter your business name"
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <select
                      id="businessType"
                      value={basicForm.businessType}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, businessType: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                    >
                      <option value="">Select business type</option>
                      <option value="retail">Retail</option>
                      <option value="restaurant">Restaurant</option>
                      <option value="cafe">Café</option>
                      <option value="salon">Salon/Spa</option>
                      <option value="fitness">Fitness</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Loyalty Program */}
              <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Loyalty Program
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="pointsPerDollar">Points per Dollar Spent</Label>
                    <Input
                      id="pointsPerDollar"
                      type="number"
                      value={basicForm.pointsPerDollar}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, pointsPerDollar: parseInt(e.target.value) || 1 }))}
                      min="1"
                      max="20"
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="welcomeReward">Welcome Reward (Points)</Label>
                    <Input
                      id="welcomeReward"
                      type="number"
                      value={basicForm.welcomeReward}
                      onChange={(e) => setBasicForm(prev => ({ ...prev, welcomeReward: parseInt(e.target.value) || 100 }))}
                      min="0"
                      className="rounded-md"
                    />
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Preferences
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="emailNotifications">Email Notifications</Label>
                      <p className="text-sm text-gray-600">Send email updates to customers</p>
                    </div>
                    <Switch
                      id="emailNotifications"
                      checked={basicForm.emailNotifications}
                      onCheckedChange={(checked) => setBasicForm(prev => ({ ...prev, emailNotifications: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="automaticRewards">Automatic Rewards</Label>
                      <p className="text-sm text-gray-600">Automatically apply rewards when earned</p>
                    </div>
                    <Switch
                      id="automaticRewards"
                      checked={basicForm.automaticRewards}
                      onCheckedChange={(checked) => setBasicForm(prev => ({ ...prev, automaticRewards: checked }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
              <Button 
                variant="outline" 
                onClick={handleBackToSelection}
                className="rounded-md"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <Button 
                onClick={handleBasicSave}
                disabled={isLoading || !basicForm.businessName || !basicForm.businessType}
                className="bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-md"
              >
                {isLoading ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </>
        )}

        {/* Advanced Setup Step */}
        {currentStep === 'advanced' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBackToSelection}
                  className="rounded-md"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <DialogTitle className="text-xl">Advanced Setup</DialogTitle>
                  <DialogDescription>
                    Configure every aspect of your loyalty program
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Tabs */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mt-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                      activeTab === tab.id
                        ? "text-gray-800 bg-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200/70"
                    )}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="overflow-y-auto max-h-[50vh] mt-6">
              {/* Business Tab */}
              {activeTab === 'business' && (
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="advBusinessName">Business Name</Label>
                      <Input
                        id="advBusinessName"
                        value={advancedForm.businessName}
                        onChange={(e) => setAdvancedForm(prev => ({ ...prev, businessName: e.target.value }))}
                        placeholder="Enter your business name"
                        className="rounded-md"
                      />
                    </div>
                    <div>
                      <Label htmlFor="advBusinessType">Business Type</Label>
                      <select
                        id="advBusinessType"
                        value={advancedForm.businessType}
                        onChange={(e) => setAdvancedForm(prev => ({ ...prev, businessType: e.target.value }))}
                        className="w-full p-2 border border-gray-300 rounded-md bg-white"
                      >
                        <option value="">Select business type</option>
                        <option value="retail">Retail</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="cafe">Café</option>
                        <option value="salon">Salon/Spa</option>
                        <option value="fitness">Fitness</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      value={advancedForm.businessDescription}
                      onChange={(e) => setAdvancedForm(prev => ({ ...prev, businessDescription: e.target.value }))}
                      placeholder="Describe your business and what makes it unique"
                      className="rounded-md"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="customBranding">Custom Branding</Label>
                      <p className="text-sm text-gray-600">Enable custom colours and logos</p>
                    </div>
                    <Switch
                      id="customBranding"
                      checked={advancedForm.customBranding}
                      onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, customBranding: checked }))}
                    />
                  </div>
                </div>
              )}

              {/* Loyalty Tab */}
              {activeTab === 'loyalty' && (
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50 space-y-6">
                  <div>
                    <Label>Points per Dollar Spent: {advancedForm.pointsPerDollar[0]}</Label>
                    <Slider
                      value={advancedForm.pointsPerDollar}
                      onValueChange={(value) => setAdvancedForm(prev => ({ ...prev, pointsPerDollar: value }))}
                      max={20}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-base font-medium">Reward Types</Label>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      {['Discounts', 'Free Items', 'Cashback', 'Experiences', 'Early Access', 'Exclusive Offers'].map((type) => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={type}
                            checked={advancedForm.rewardTypes.includes(type)}
                            onCheckedChange={(checked) => handleRewardTypeChange(type, checked as boolean)}
                          />
                          <Label htmlFor={type} className="text-sm">{type}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="tierSystem">Tier System</Label>
                        <p className="text-sm text-gray-600">Bronze, Silver, Gold tiers</p>
                      </div>
                      <Switch
                        id="tierSystem"
                        checked={advancedForm.tierSystem}
                        onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, tierSystem: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="referralProgram">Referral Program</Label>
                        <p className="text-sm text-gray-600">Reward customer referrals</p>
                      </div>
                      <Switch
                        id="referralProgram"
                        checked={advancedForm.referralProgram}
                        onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, referralProgram: checked }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Customers Tab */}
              {activeTab === 'customers' && (
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="customerSegmentation">Customer Segmentation</Label>
                      <p className="text-sm text-gray-600">Automatically group customers by behaviour</p>
                    </div>
                    <Switch
                      id="customerSegmentation"
                      checked={advancedForm.customerSegmentation}
                      onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, customerSegmentation: checked }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="automationLevel">Automation Level</Label>
                    <select
                      id="automationLevel"
                      value={advancedForm.automationLevel}
                      onChange={(e) => setAdvancedForm(prev => ({ ...prev, automationLevel: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white mt-2"
                    >
                      <option value="basic">Basic - Manual approval required</option>
                      <option value="moderate">Moderate - Some automated actions</option>
                      <option value="advanced">Advanced - Fully automated</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-medium">Notification Preferences</Label>
                      <div className="space-y-3 mt-3">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="advEmailNotifications">Email Notifications</Label>
                          <Switch
                            id="advEmailNotifications"
                            checked={advancedForm.emailNotifications}
                            onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, emailNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="smsNotifications">SMS Notifications</Label>
                          <Switch
                            id="smsNotifications"
                            checked={advancedForm.smsNotifications}
                            onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, smsNotifications: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label htmlFor="pushNotifications">Push Notifications</Label>
                          <Switch
                            id="pushNotifications"
                            checked={advancedForm.pushNotifications}
                            onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, pushNotifications: checked }))}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50 space-y-6">
                  <div>
                    <Label htmlFor="analyticsLevel">Analytics Level</Label>
                    <select
                      id="analyticsLevel"
                      value={advancedForm.analyticsLevel}
                      onChange={(e) => setAdvancedForm(prev => ({ ...prev, analyticsLevel: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-md bg-white mt-2"
                    >
                      <option value="basic">Basic - Essential metrics only</option>
                      <option value="standard">Standard - Comprehensive reporting</option>
                      <option value="advanced">Advanced - Predictive analytics</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="fraudDetection">Fraud Detection</Label>
                        <p className="text-sm text-gray-600">AI-powered fraud prevention</p>
                      </div>
                      <Switch
                        id="fraudDetection"
                        checked={advancedForm.fraudDetection}
                        onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, fraudDetection: checked }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="apiAccess">API Access</Label>
                        <p className="text-sm text-gray-600">Developer API access</p>
                      </div>
                      <Switch
                        id="apiAccess"
                        checked={advancedForm.apiAccess}
                        onCheckedChange={(checked) => setAdvancedForm(prev => ({ ...prev, apiAccess: checked }))}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Integrations Tab */}
              {activeTab === 'integrations' && (
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50 space-y-6">
                  <div>
                    <Label className="text-base font-medium">Available Integrations</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                      {['Shopify', 'Square', 'Stripe', 'Mailchimp', 'Klaviyo', 'Zapier', 'HubSpot', 'Salesforce', 'Xero', 'QuickBooks'].map((integration) => (
                        <div key={integration} className="flex items-center space-x-2">
                          <Checkbox
                            id={integration}
                            checked={advancedForm.integrations.includes(integration)}
                            onCheckedChange={(checked) => handleIntegrationChange(integration, checked as boolean)}
                          />
                          <Label htmlFor={integration} className="text-sm">{integration}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-100">
              <Button 
                variant="outline" 
                onClick={handleBackToSelection}
                className="rounded-md"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              
              <Button 
                onClick={handleAdvancedSave}
                disabled={isLoading || !advancedForm.businessName || !advancedForm.businessType}
                className="bg-gray-900 hover:bg-gray-800 text-white rounded-md"
              >
                {isLoading ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
} 