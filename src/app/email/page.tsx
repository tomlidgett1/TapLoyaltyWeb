"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { useMerchant } from "@/hooks/use-merchant"
import axios from "axios"
import {
  Mail,
  Users,
  FileText,
  Send,
  Clock,
  BarChart2,
  Settings,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2
} from "lucide-react"
import { fetchMerchantCustomers, fetchTemplates, getMerchantCampaignReports } from "@/services/mailchimp"

// Mailchimp API configuration
const API_KEY = '47fbae78b915abaa7956de0baf066b4b-us9';
const SERVER_PREFIX = 'us9';
const BASE_URL = `https://${SERVER_PREFIX}.api.mailchimp.com/3.0`;

export default function EmailPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()
  const { merchant } = useMerchant()
  const [activeTab, setActiveTab] = useState("templates")
  const [isConnected, setIsConnected] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [customers, setCustomers] = useState([])
  const [templates, setTemplates] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)

  // Load templates
  useEffect(() => {
    const loadTemplates = async () => {
      if (!user?.uid) return
      
      try {
        setIsLoadingTemplates(true)
        
        // For demo purposes, we'll use sample templates with placeholder images
        setTimeout(() => {
          const sampleTemplates = [
            {
              id: "template-1",
              name: "Welcome Email",
              category: "Onboarding",
              preview_image: null
            },
            {
              id: "template-2",
              name: "Monthly Newsletter",
              category: "Newsletters",
              preview_image: null
            },
            {
              id: "template-3",
              name: "Special Offer",
              category: "Promotions",
              preview_image: null
            },
            {
              id: "template-4",
              name: "Product Announcement",
              category: "Marketing",
              preview_image: null
            }
          ];
          
          setTemplates(sampleTemplates);
          setIsLoadingTemplates(false);
        }, 1000);
        
      } catch (error) {
        console.error("Error loading templates:", error)
        setIsLoadingTemplates(false)
        toast({
          title: "Error",
          description: "Failed to load email templates. Please try again.",
          variant: "destructive",
        })
      }
    }
    
    loadTemplates()
  }, [user, toast])

  // Load merchant data
  useEffect(() => {
    const loadMerchantData = async () => {
      if (!user?.uid || !merchant?.id) return
      
      try {
        // No need to set loading state here since we're initializing with false
        // Just simulate loading data
        // In a real implementation, you would fetch this data from your Mailchimp service
        
        // For now, we'll just set some dummy data
        setCustomers([])
        setCampaigns([])
      } catch (error) {
        console.error("Error loading merchant data:", error)
        toast({
          title: "Error",
          description: "Failed to load email marketing data. Please try again.",
          variant: "destructive",
        })
      }
    }
    
    loadMerchantData()
  }, [user, merchant, toast])

  // Function to sync customers
  const syncCustomers = async () => {
    if (!merchant?.id) return
    
    try {
      setIsSyncing(true)
      toast({
        title: "Syncing Customers",
        description: "Please wait while we sync your customers...",
      })
      
      // In a real implementation, you would call your syncCustomersToMailchimp function
      // For now, we'll simulate a sync
      setTimeout(() => {
        setIsSyncing(false)
        toast({
          title: "Sync Complete",
          description: "Your customers have been synced successfully.",
          variant: "success",
        })
      }, 2000)
    } catch (error) {
      console.error("Error syncing customers:", error)
      setIsSyncing(false)
      toast({
        title: "Sync Failed",
        description: "Failed to sync customers. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Loading state - only show if explicitly loading
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading email marketing dashboard...</p>
        </div>
      </div>
    )
  }

  // Main email dashboard
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Marketing</h1>
          <p className="text-gray-500 mt-2">
            Create and manage email campaigns for your customers
          </p>
        </div>
        
        <Button onClick={() => router.push('/email/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>
      
      <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="audiences" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Audiences</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Campaigns</CardTitle>
              <CardDescription>
                Create and manage your email marketing campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaigns yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Create your first email campaign to start connecting with your customers
                </p>
                <Button onClick={() => router.push('/email/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Browse and use pre-designed email templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTemplates ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                  <p className="text-gray-500 ml-3">Loading templates...</p>
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map(template => (
                    <div key={template.id} className="border rounded-md overflow-hidden hover:shadow-md transition-shadow">
                      <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-sm">{template.name}</h3>
                          <p className="text-xs text-gray-500">{template.category}</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white">
                        <div className="aspect-video bg-gray-100 rounded-md flex flex-col items-center justify-center p-8">
                          <FileText className="h-16 w-16 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 text-center">
                            {template.name} template
                          </p>
                        </div>
                      </div>
                      <div className="p-3 border-t bg-white">
                        <Button 
                          variant="outline" 
                          className="w-full text-sm"
                          onClick={() => router.push(`/email/create?template=${template.id}`)}
                        >
                          Use Template
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No templates available</h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    There are currently no email templates available.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="audiences" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Audience</CardTitle>
                <CardDescription>
                  Manage your customer email list
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1"
                onClick={syncCustomers}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Customers
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Your Customer List</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Your customers are automatically synced with our email system. Click "Sync Customers" to update the list.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
                    0 Active Subscribers
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Reports</CardTitle>
              <CardDescription>
                View performance metrics for your email campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-8 text-center">
                <BarChart2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No reports available</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Send your first campaign to start collecting performance data
                </p>
                <Button onClick={() => router.push('/email/create')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Manage your email marketing settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                <div>
                  <p className="font-medium">Email Marketing Enabled</p>
                  <p className="text-sm text-gray-500">Your account is ready to send email campaigns</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Default Settings</h3>
                <div className="grid gap-2">
                  <Label htmlFor="default-from-name">Default From Name</Label>
                  <Input 
                    id="default-from-name" 
                    placeholder="Your Business Name"
                    defaultValue={merchant?.merchantName || ""}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="default-from-email">Default From Email</Label>
                  <Input 
                    id="default-from-email" 
                    type="email"
                    placeholder="hello@taployalty.com"
                    defaultValue="hello@taployalty.com"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    All emails are sent through the TapLoyalty email system
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 