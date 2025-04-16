"use client"

import { PageTransition } from "@/components/page-transition"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Sparkles, 
  BarChart, 
  Gift, 
  Settings, 
  Users, 
  Bell, 
  FileText, 
  Clock, 
  ArrowRight, 
  CheckCircle, 
  Brain, 
  Database, 
  Zap, 
  SendToBack, 
  RefreshCw, 
  Coffee,
  Calendar,
  DollarSign,
  Plus,
  Info,
  ChevronRight,
  Star
} from "lucide-react"

export default function TapAgentPage() {
  return (
    <PageTransition>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex flex-col gap-8">
          {/* Hero section */}
          <div className="rounded-xl bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-50 border border-blue-100 p-8 shadow-sm">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-2 py-0 text-xs font-medium">
                  New Feature
                </Badge>
              </div>
              
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-3">
                AI-Powered Smart Rewards
              </h1>
              
              <p className="text-lg text-gray-600 max-w-2xl">
                Turn your transaction data into personalized customer rewards that drive repeat visits and increase revenue—automatically optimized by our AI engine.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
                  Enable Smart Rewards
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2">
                  <Info className="h-4 w-4" />
                  Watch Demo
                </Button>
              </div>
              
              <div className="grid grid-cols-3 gap-6 mt-10 pt-6 border-t border-blue-100">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">+18% Visit Frequency</p>
                    <p className="text-sm text-gray-500">Based on pilot data</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">5-Minute Setup</p>
                    <p className="text-sm text-gray-500">No technical skills needed</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="mt-0.5 text-blue-600">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Full Control</p>
                    <p className="text-sm text-gray-500">Set budgets & restrictions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main content tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-5 mb-8 w-full md:w-auto">
              <TabsTrigger value="overview" className="text-sm">Overview</TabsTrigger>
              <TabsTrigger value="how-it-works" className="text-sm">How It Works</TabsTrigger>
              <TabsTrigger value="control-panel" className="text-sm">Control Panel</TabsTrigger>
              <TabsTrigger value="benefits" className="text-sm">Benefits</TabsTrigger>
              <TabsTrigger value="getting-started" className="text-sm">Getting Started</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-0">
              <div className="grid gap-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2 border-0 shadow-md">
                    <CardHeader className="pb-3 bg-white rounded-t-lg border-b">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Sparkles className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle>What Are Smart Rewards?</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            AI-powered recommendations customized for your business
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="text-sm text-gray-600 space-y-4">
                        <p className="leading-relaxed">
                          Every customer who links their card sees <span className="font-medium text-blue-700">3–4 personalised rewards</span> inside 
                          the Tap Loyalty app—refreshed every few days, always relevant to their behaviour at <span className="font-medium text-blue-700">your</span> venue.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <div className="mb-3 text-blue-600">
                              <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Personalized</h3>
                            <p className="text-sm text-gray-500">Rewards are tailored to each customer's unique behavior patterns</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <div className="mb-3 text-blue-600">
                              <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                                <Zap className="h-4 w-4" />
                              </div>
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Automatic</h3>
                            <p className="text-sm text-gray-500">Refreshed and delivered without any manual intervention needed</p>
                          </div>
                          
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <div className="mb-3 text-blue-600">
                              <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center">
                                <BarChart className="h-4 w-4" />
                              </div>
                            </div>
                            <h3 className="font-medium text-gray-900 mb-2">Effective</h3>
                            <p className="text-sm text-gray-500">Drives measurable increases in visit frequency and total spend</p>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-5">
                          <div className="flex items-start gap-3">
                            <div className="mt-1">
                              <Coffee className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-blue-700 mb-2">Example in Action</h4>
                              <p className="text-sm text-gray-600">
                                A weekday regular might receive a free pastry with their next coffee after 5 stamps, 
                                while a lapsed weekend diner gets $10 off brunch if they return within 7 days.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md h-fit">
                    <CardHeader className="pb-3 bg-white rounded-t-lg border-b">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                          <Star className="h-4 w-4 text-blue-600" />
                        </div>
                        <CardTitle>Key Benefits</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <div className="rounded-full h-5 w-5 bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Increase Customer Retention</p>
                            <p className="text-xs text-gray-500 mt-0.5">Keep customers coming back with personalized incentives</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="rounded-full h-5 w-5 bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Boost Average Order Value</p>
                            <p className="text-xs text-gray-500 mt-0.5">Incentivize higher spending with tailored offers</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="rounded-full h-5 w-5 bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Reactivate Dormant Customers</p>
                            <p className="text-xs text-gray-500 mt-0.5">Automatically reach out to customers who haven't visited</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="rounded-full h-5 w-5 bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Drive Off-peak Traffic</p>
                            <p className="text-xs text-gray-500 mt-0.5">Fill quiet periods with targeted incentives</p>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="rounded-full h-5 w-5 bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700">Zero Operational Overhead</p>
                            <p className="text-xs text-gray-500 mt-0.5">Set it up once and let the AI handle the rest</p>
                          </div>
                        </li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Example Customer Journeys */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="pb-3 bg-white rounded-t-lg border-b">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle>Example Customer Journeys</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          See how AI adapts to different customer profiles
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="rounded-lg border border-gray-200 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-gray-50">
                          <TableRow>
                            <TableHead className="font-medium">Customer Profile</TableHead>
                            <TableHead className="font-medium">Detected Behavior</TableHead>
                            <TableHead className="font-medium">AI-Selected Reward</TableHead>
                            <TableHead className="font-medium">Expected Outcome</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                  <Coffee className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Daily Flat-White Dan</p>
                                  <p className="text-xs text-gray-500">Frequent weekday visitor</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">6 visits last 7 days</p>
                              <p className="text-xs text-gray-500">Average spend: $6.50</p>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-50 border-blue-100 text-blue-700">Free size-upgrade</Badge>
                              <p className="text-xs text-gray-500 mt-1">After 5 drinks (expires in 3 days)</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="text-emerald-600 font-medium">Sustains high frequency</span>
                              <p className="text-xs text-gray-500 mt-1">Plus encourages milk upgrades</p>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                                  <Calendar className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Weekend Brunch Bella</p>
                                  <p className="text-xs text-gray-500">Weekend-only customer</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">Visits Sat/Sun only</p>
                              <p className="text-xs text-gray-500">Average spend: $24</p>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-purple-50 border-purple-100 text-purple-700">20% off mid-week order</Badge>
                              <p className="text-xs text-gray-500 mt-1">Min. $15 (expires Thursday)</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="text-emerald-600 font-medium">Shifts traffic to quieter days</span>
                              <p className="text-xs text-gray-500 mt-1">Increases weekly visit frequency</p>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                  <Clock className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">Loyalty Lapsed Leo</p>
                                  <p className="text-xs text-gray-500">Formerly regular customer</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">Last visit 90 days ago</p>
                              <p className="text-xs text-gray-500">Previously spent $22/visit</p>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-amber-50 border-amber-100 text-amber-700">$10 comeback voucher</Badge>
                              <p className="text-xs text-gray-500 mt-1">7-day expiry window</p>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="text-emerald-600 font-medium">Reactivates dormant user</span>
                              <p className="text-xs text-gray-500 mt-1">55% redemption rate in testing</p>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* How It Works Tab */}
            <TabsContent value="how-it-works" className="mt-0">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3 bg-white rounded-t-lg border-b">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>How the Engine Works</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Behind the scenes of our AI-powered reward generation system
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-10">
                    <div className="relative">
                      <div className="hidden md:block absolute top-0 left-1/2 h-full w-px bg-gray-200 -translate-x-1/2"></div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                        {/* Step 1 */}
                        <div className="relative md:pr-8">
                          <div className="md:absolute md:right-[-17px] md:top-0 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full shadow-md mb-4 md:mb-0">
                            <span className="text-sm font-medium">1</span>
                          </div>
                          
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm md:mr-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Database className="h-5 w-5 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-gray-900">Data Feed</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Each transaction you process via card or POS integration lands in BigQuery within minutes, creating a real-time view of customer behavior patterns.
                            </p>
                          </div>
                        </div>
                        
                        {/* Step 2 */}
                        <div className="relative md:pl-8">
                          <div className="md:absolute md:left-[-17px] md:top-0 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full shadow-md mb-4 md:mb-0">
                            <span className="text-sm font-medium">2</span>
                          </div>
                          
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm md:ml-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Brain className="h-5 w-5 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-gray-900">Feature Builder</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Our ML models translate raw transaction data into behavioral signals including recency, frequency, average ticket size, favorite time of day, and more.
                            </p>
                          </div>
                        </div>
                        
                        {/* Step 3 */}
                        <div className="relative md:pr-8">
                          <div className="md:absolute md:right-[-17px] md:top-0 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full shadow-md mb-4 md:mb-0">
                            <span className="text-sm font-medium">3</span>
                          </div>
                          
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm md:mr-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-gray-900">AI Decision</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Our "Reward-Designer" agent evaluates these signals nightly and selects up to 4 rewards from your approved library that are most likely to drive desired business outcomes.
                            </p>
                          </div>
                        </div>
                        
                        {/* Step 4 */}
                        <div className="relative md:pl-8">
                          <div className="md:absolute md:left-[-17px] md:top-0 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full shadow-md mb-4 md:mb-0">
                            <span className="text-sm font-medium">4</span>
                          </div>
                          
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm md:ml-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <SendToBack className="h-5 w-5 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-gray-900">Delivery</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Selected rewards are immediately written to Firestore, appearing instantly in the customer's app with optional push notifications to drive engagement.
                            </p>
                          </div>
                        </div>
                        
                        {/* Step 5 */}
                        <div className="relative md:pr-8 md:col-span-2 md:max-w-[50%] md:mx-auto">
                          <div className="md:absolute md:left-[-17px] md:top-0 z-10 flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full shadow-md mb-4 md:mb-0">
                            <span className="text-sm font-medium">5</span>
                          </div>
                          
                          <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm md:ml-4">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <RefreshCw className="h-5 w-5 text-blue-600" />
                              </div>
                              <h3 className="font-medium text-gray-900">Feedback Loop</h3>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">
                              Redemption data flows back into the model, creating a continuous learning cycle that improves reward effectiveness over time specifically for your customer base.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-6">
                      <div className="h-8 w-8 rounded-md bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Safety, Privacy & Compliance</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                        <div className="flex items-start gap-3 h-full">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">No Card Details Stored</h4>
                            <p className="text-sm text-gray-600">
                              Tap Loyalty uses encrypted Open Banking tokens, ensuring no sensitive financial information is ever stored in our systems.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                        <div className="flex items-start gap-3 h-full">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">GDPR & CDR Compliant</h4>
                            <p className="text-sm text-gray-600">
                              Fully compliant with GDPR and Australian Consumer Data Right regulations, with clear opt-out mechanisms for customers.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
                        <div className="flex items-start gap-3 h-full">
                          <div className="flex-shrink-0 mt-1">
                            <div className="h-6 w-6 rounded-full bg-emerald-50 flex items-center justify-center">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Built-in Guardrails</h4>
                            <p className="text-sm text-gray-600">
                              You approve every reward template; the AI cannot invent or deploy discounts outside your predefined rules and limits.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Control Panel Tab */}
            <TabsContent value="control-panel" className="mt-0">
              <Card className="border-0 shadow-md">
                <CardHeader className="pb-3 bg-white rounded-t-lg border-b">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-blue-50 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Your Control Panel</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        Powerful management tools to customize your Smart Rewards experience
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="mb-8">
                    <p className="text-sm text-gray-600 mb-6">
                      The Smart Rewards Control Panel gives you full control over how AI-generated rewards work 
                      for your business. Everything from budget limits to blackout dates can be configured with ease.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Overview Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-blue-50 px-5 py-3 border-b border-blue-100">
                          <div className="flex items-center gap-2">
                            <BarChart className="h-4 w-4 text-blue-700" />
                            <h3 className="font-medium text-blue-700">Overview</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Track uplift in visits, spend per visit, and total redemptions against your baseline metrics.
                          </p>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="text-xs text-gray-500">Visit Lift</p>
                              <p className="text-emerald-600 font-medium">+18%</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded text-center">
                              <p className="text-xs text-gray-500">Spend Increase</p>
                              <p className="text-emerald-600 font-medium">+12%</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reward Library Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-purple-50 px-5 py-3 border-b border-purple-100">
                          <div className="flex items-center gap-2">
                            <Gift className="h-4 w-4 text-purple-700" />
                            <h3 className="font-medium text-purple-700">Reward Library</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Enable/disable reward templates and set default points cost, minimum spend, and valid days.
                          </p>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>Buy-X-Get-Y</span>
                              <Badge className="bg-emerald-50 text-emerald-700 border-0">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>Percentage Off</span>
                              <Badge className="bg-emerald-50 text-emerald-700 border-0">Active</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>Dollar Voucher</span>
                              <Badge className="bg-gray-100 text-gray-700 border-0">Disabled</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Budget & Limits Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-green-50 px-5 py-3 border-b border-green-100">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-700" />
                            <h3 className="font-medium text-green-700">Budget & Limits</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Cap daily/weekly reward cost, set blackout dates, and exclude specific items.
                          </p>
                          <div className="mt-4 grid grid-cols-1 gap-2">
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-500">Weekly Budget</p>
                              <p className="text-gray-900 font-medium">$200 <span className="text-xs text-gray-500">max</span></p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-xs text-gray-500">Excluded Items</p>
                              <p className="text-gray-900 text-xs">Alcohol, Gift Cards</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Customer Segments Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-amber-50 px-5 py-3 border-b border-amber-100">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-amber-700" />
                            <h3 className="font-medium text-amber-700">Customer Segments</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Pin critical segments so the AI always prioritizes them in reward allocation.
                          </p>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>VIP Customers</span>
                              <Badge className="bg-blue-50 text-blue-700 border-0">Prioritized</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>Students</span>
                              <Badge className="bg-blue-50 text-blue-700 border-0">Prioritized</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>First-time Visitors</span>
                              <Badge className="bg-blue-50 text-blue-700 border-0">Prioritized</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Notifications Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-red-50 px-5 py-3 border-b border-red-100">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-red-700" />
                            <h3 className="font-medium text-red-700">Notifications</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Toggle push alerts and email receipts for each reward type to drive engagement.
                          </p>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span>Push Notifications</span>
                              <Badge className="bg-emerald-50 text-emerald-700 border-0">Enabled</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>Email Notifications</span>
                              <Badge className="bg-emerald-50 text-emerald-700 border-0">Enabled</Badge>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>SMS Alerts</span>
                              <Badge className="bg-gray-100 text-gray-700 border-0">Disabled</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Reporting Panel */}
                      <div className="bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden">
                        <div className="bg-indigo-50 px-5 py-3 border-b border-indigo-100">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-700" />
                            <h3 className="font-medium text-indigo-700">Reporting</h3>
                          </div>
                        </div>
                        <div className="p-5">
                          <p className="text-sm text-gray-600">
                            Export redemption CSVs, view cohort lift charts, download AI decision logs.
                          </p>
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center text-xs text-blue-600">
                              <Button variant="link" className="h-auto p-0 text-xs text-blue-600">
                                Download Redemption Report
                              </Button>
                            </div>
                            <div className="flex items-center text-xs text-blue-600">
                              <Button variant="link" className="h-auto p-0 text-xs text-blue-600">
                                View AI Decision Logs
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-10 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-900">Smart Rewards Dashboard</h3>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Coming Soon</Badge>
                      </div>
                      <Button className="gap-1 bg-blue-600 hover:bg-blue-700">
                        <span>Request Demo</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                      <div className="max-w-lg mx-auto">
                        <h4 className="font-medium text-gray-900 mb-2">
                          Enterprise-grade analytics dashboard coming in Q3 2023
                        </h4>
                        <p className="text-sm text-gray-600 mb-6">
                          Get a sneak peek of our upcoming unified dashboard with real-time analytics, 
                          AI-generated insights, and advanced cohort analysis tools.
                        </p>
                        <img 
                          src="https://placehold.co/800x400/e6f7ff/007AFF?text=Smart+Rewards+Dashboard+Preview" 
                          alt="Dashboard Preview" 
                          className="rounded-md border border-gray-200 shadow-sm mx-auto"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Benefits Tab */}
            <TabsContent value="benefits" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Benefits at a Glance</CardTitle>
                  <CardDescription>
                    See how Smart Rewards can transform your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <BarChart className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium">+18% visit frequency</h3>
                      <p className="text-sm text-muted-foreground">
                        On average after 60 days (based on pilot data).
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium">Hands-free personalization</h3>
                      <p className="text-sm text-muted-foreground">
                        No spreadsheets or manual coupon uploads.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium">Real-time ROI tracking</h3>
                      <p className="text-sm text-muted-foreground">
                        See incremental revenue per reward type.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium">Churn buster</h3>
                      <p className="text-sm text-muted-foreground">
                        Automatic "win-back" offers for customers who haven't visited in X days.
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Database className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="font-medium">Data moat</h3>
                      <p className="text-sm text-muted-foreground">
                        The more your customers transact, the smarter the engine becomes for you alone.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h3 className="font-medium mb-4">Frequently Asked Questions</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium">Can I run a manual campaign for Mother's Day?</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                          Absolutely—use the "One-Off Campaign" tab to push a custom reward to all users or a saved segment.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium">What if a reward costs me more than it brings in?</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                          The AI monitors redemption ROI and will retire under-performing offers automatically.
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium">How often does the engine refresh rewards?</h4>
                        <p className="text-sm mt-1 text-muted-foreground">
                          By default, every 24 hours. You can change cadence to 48–72 hours in Settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Getting Started Tab */}
            <TabsContent value="getting-started" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started (5-Minute Setup)</CardTitle>
                  <CardDescription>
                    Quick and easy steps to launch Smart Rewards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <div className="relative border-l-2 border-blue-200 pl-6 pb-1">
                      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">1</div>
                      <h3 className="font-medium">Connect POS/Card Feed</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        We handle the API keys; no dev work for you.
                      </p>
                    </div>
                    
                    <div className="relative border-l-2 border-blue-200 pl-6 pb-1">
                      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">2</div>
                      <h3 className="font-medium">Pick Templates</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Toggle the reward types you're comfortable offering.
                      </p>
                    </div>
                    
                    <div className="relative border-l-2 border-blue-200 pl-6 pb-1">
                      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">3</div>
                      <h3 className="font-medium">Set Budgets</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Define weekly reward cost ceiling (e.g. max $200).
                      </p>
                    </div>
                    
                    <div className="relative border-l-2 border-blue-200 pl-6 pb-1">
                      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">4</div>
                      <h3 className="font-medium">Launch</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customers instantly start seeing tailored rewards in their app.
                      </p>
                    </div>
                    
                    <div className="relative pl-6">
                      <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">5</div>
                      <h3 className="font-medium">Watch the Dashboard</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Track uplift and tweak settings anytime.
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-8">
                    <h4 className="text-sm font-medium text-blue-700">Need help?</h4>
                    <p className="text-sm mt-2 text-blue-800">
                      Live chat is available in the portal, or email merchants@taployalty.com.
                    </p>
                  </div>
                  
                  <div className="mt-8 flex justify-center">
                    <Button size="lg" className="gap-2">
                      Enable Smart Rewards
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageTransition>
  )
} 