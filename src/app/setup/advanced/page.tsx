"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Save, Settings, Users, BarChart, Gift, Zap, Bell } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function AdvancedSetupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Advanced settings state
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [businessDescription, setBusinessDescription] = useState("")
  const [pointsPerDollar, setPointsPerDollar] = useState([1])
  const [welcomeReward, setWelcomeReward] = useState("")
  const [tierSystem, setTierSystem] = useState(false)
  const [referralProgram, setReferralProgram] = useState(false)
  const [birthdayRewards, setBirthdayRewards] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(false)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [autoRewards, setAutoRewards] = useState(true)
  const [customBranding, setCustomBranding] = useState(false)
  const [analyticsLevel, setAnalyticsLevel] = useState("basic")
  const [integrations, setIntegrations] = useState<string[]>([])
  const [rewardTypes, setRewardTypes] = useState<string[]>([])
  const [customerSegments, setCustomerSegments] = useState(false)
  const [campaignAutomation, setCampaignAutomation] = useState(false)
  const [fraudDetection, setFraudDetection] = useState(true)
  const [dataRetention, setDataRetention] = useState("2years")
  const [apiAccess, setApiAccess] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    toast({
      title: "Advanced settings saved!",
      description: "Your comprehensive setup has been configured successfully.",
    })
    
    setLoading(false)
    router.push('/dashboard')
  }

  const handleIntegrationChange = (integration: string, checked: boolean) => {
    if (checked) {
      setIntegrations([...integrations, integration])
    } else {
      setIntegrations(integrations.filter(i => i !== integration))
    }
  }

  const handleRewardTypeChange = (rewardType: string, checked: boolean) => {
    if (checked) {
      setRewardTypes([...rewardTypes, rewardType])
    } else {
      setRewardTypes(rewardTypes.filter(r => r !== rewardType))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="rounded-md"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Advanced Setup</h1>
            <p className="text-sm text-gray-600">Configure every aspect of your loyalty program</p>
          </div>
        </div>

        <Tabs defaultValue="business" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 rounded-md">
            <TabsTrigger value="business" className="rounded-md">
              <Settings className="h-4 w-4 mr-2" />
              Business
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="rounded-md">
              <Gift className="h-4 w-4 mr-2" />
              Loyalty
            </TabsTrigger>
            <TabsTrigger value="customers" className="rounded-md">
              <Users className="h-4 w-4 mr-2" />
              Customers
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-md">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-md">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-md">
              <Zap className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Business Tab */}
          <TabsContent value="business" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
                <CardDescription>
                  Detailed information about your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Enter your business name"
                      className="rounded-md"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select value={businessType} onValueChange={setBusinessType}>
                      <SelectTrigger className="rounded-md">
                        <SelectValue placeholder="Select your business type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cafe">Café</SelectItem>
                        <SelectItem value="restaurant">Restaurant</SelectItem>
                        <SelectItem value="retail">Retail Store</SelectItem>
                        <SelectItem value="salon">Salon/Spa</SelectItem>
                        <SelectItem value="fitness">Fitness/Gym</SelectItem>
                        <SelectItem value="automotive">Automotive</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="businessDescription">Business Description</Label>
                  <Textarea
                    id="businessDescription"
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Describe your business and what makes it unique"
                    className="rounded-md"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Custom Branding</Label>
                    <p className="text-sm text-gray-600">
                      Use your own colours and logo in the loyalty app
                    </p>
                  </div>
                  <Switch
                    checked={customBranding}
                    onCheckedChange={setCustomBranding}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Loyalty Program Configuration</CardTitle>
                <CardDescription>
                  Set up how customers earn and redeem rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Points per Dollar Spent: {pointsPerDollar[0]}</Label>
                  <Slider
                    value={pointsPerDollar}
                    onValueChange={setPointsPerDollar}
                    max={20}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="welcomeReward">Welcome Reward</Label>
                  <Input
                    id="welcomeReward"
                    value={welcomeReward}
                    onChange={(e) => setWelcomeReward(e.target.value)}
                    placeholder="e.g., Free coffee, 10% off first purchase"
                    className="rounded-md"
                  />
                </div>

                <div className="space-y-4">
                  <Label>Reward Types</Label>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      "Percentage Discounts",
                      "Fixed Amount Off",
                      "Free Products",
                      "Buy X Get Y Free",
                      "Cashback",
                      "Exclusive Access"
                    ].map((type) => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={rewardTypes.includes(type)}
                          onCheckedChange={(checked) => 
                            handleRewardTypeChange(type, checked as boolean)
                          }
                        />
                        <Label htmlFor={type} className="text-sm">{type}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tier System</Label>
                      <p className="text-sm text-gray-600">
                        Bronze, Silver, Gold tiers
                      </p>
                    </div>
                    <Switch
                      checked={tierSystem}
                      onCheckedChange={setTierSystem}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Referral Program</Label>
                      <p className="text-sm text-gray-600">
                        Reward customer referrals
                      </p>
                    </div>
                    <Switch
                      checked={referralProgram}
                      onCheckedChange={setReferralProgram}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Birthday Rewards</Label>
                    <p className="text-sm text-gray-600">
                      Automatic birthday rewards for customers
                    </p>
                  </div>
                  <Switch
                    checked={birthdayRewards}
                    onCheckedChange={setBirthdayRewards}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Customer Management</CardTitle>
                <CardDescription>
                  Configure customer segmentation and automation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Customer Segmentation</Label>
                    <p className="text-sm text-gray-600">
                      Automatically group customers by behaviour
                    </p>
                  </div>
                  <Switch
                    checked={customerSegments}
                    onCheckedChange={setCustomerSegments}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Campaign Automation</Label>
                    <p className="text-sm text-gray-600">
                      Automated marketing campaigns
                    </p>
                  </div>
                  <Switch
                    checked={campaignAutomation}
                    onCheckedChange={setCampaignAutomation}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Data Retention Period</Label>
                  <Select value={dataRetention} onValueChange={setDataRetention}>
                    <SelectTrigger className="rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1year">1 Year</SelectItem>
                      <SelectItem value="2years">2 Years</SelectItem>
                      <SelectItem value="5years">5 Years</SelectItem>
                      <SelectItem value="indefinite">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you and your customers receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive updates via email
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Send SMS updates to customers
                    </p>
                  </div>
                  <Switch
                    checked={smsNotifications}
                    onCheckedChange={setSmsNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Send app push notifications
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Rewards</Label>
                    <p className="text-sm text-gray-600">
                      Automatically apply rewards when customers qualify
                    </p>
                  </div>
                  <Switch
                    checked={autoRewards}
                    onCheckedChange={setAutoRewards}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Analytics & Reporting</CardTitle>
                <CardDescription>
                  Configure data collection and reporting preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="analyticsLevel">Analytics Level</Label>
                  <Select value={analyticsLevel} onValueChange={setAnalyticsLevel}>
                    <SelectTrigger className="rounded-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Analytics</SelectItem>
                      <SelectItem value="advanced">Advanced Analytics</SelectItem>
                      <SelectItem value="enterprise">Enterprise Analytics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Fraud Detection</Label>
                    <p className="text-sm text-gray-600">
                      Monitor for suspicious activity
                    </p>
                  </div>
                  <Switch
                    checked={fraudDetection}
                    onCheckedChange={setFraudDetection}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>API Access</Label>
                    <p className="text-sm text-gray-600">
                      Enable API for custom integrations
                    </p>
                  </div>
                  <Switch
                    checked={apiAccess}
                    onCheckedChange={setApiAccess}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-lg">Third-Party Integrations</CardTitle>
                <CardDescription>
                  Connect with your existing business tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    "Shopify",
                    "Square",
                    "Stripe",
                    "Mailchimp",
                    "Klaviyo",
                    "Zapier",
                    "Google Analytics",
                    "Facebook Pixel"
                  ].map((integration) => (
                    <div key={integration} className="flex items-center space-x-2">
                      <Checkbox
                        id={integration}
                        checked={integrations.includes(integration)}
                        onCheckedChange={(checked) => 
                          handleIntegrationChange(integration, checked as boolean)
                        }
                      />
                      <Label htmlFor={integration} className="text-sm">{integration}</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end pt-6">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-gray-900 hover:bg-gray-800 text-white rounded-md"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save All Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 