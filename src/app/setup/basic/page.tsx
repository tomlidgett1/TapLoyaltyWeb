"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function BasicSetupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Basic settings state
  const [businessName, setBusinessName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [pointsPerDollar, setPointsPerDollar] = useState("1")
  const [welcomeReward, setWelcomeReward] = useState("")
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoRewards, setAutoRewards] = useState(true)

  const handleSave = async () => {
    setLoading(true)
    
    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast({
      title: "Settings saved!",
      description: "Your basic setup has been configured successfully.",
    })
    
    setLoading(false)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-8 px-4">
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
            <h1 className="text-2xl font-semibold text-gray-900">Basic Setup</h1>
            <p className="text-sm text-gray-600">Configure your essential loyalty program settings</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Business Information */}
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-lg">Business Information</CardTitle>
              <CardDescription>
                Basic details about your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Loyalty Program Settings */}
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-lg">Loyalty Program</CardTitle>
              <CardDescription>
                Configure how customers earn and redeem points
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pointsPerDollar">Points per Dollar Spent</Label>
                <Select value={pointsPerDollar} onValueChange={setPointsPerDollar}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 point per $1</SelectItem>
                    <SelectItem value="2">2 points per $1</SelectItem>
                    <SelectItem value="5">5 points per $1</SelectItem>
                    <SelectItem value="10">10 points per $1</SelectItem>
                  </SelectContent>
                </Select>
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
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-lg">Preferences</CardTitle>
              <CardDescription>
                Choose your notification and automation settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600">
                    Receive updates about your loyalty program
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
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

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-md"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 