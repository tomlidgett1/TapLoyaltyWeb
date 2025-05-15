"use client"

import { useState } from "react"
import { Mail, Package, AlertCircle, CheckCircle, XCircle, ChevronDown, Star, Clock, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Define types for agent actions
interface AgentAction {
  id: string
  type: "email" | "offer" | "program" | "other"
  title: string
  description: string
  priority: "high" | "medium" | "low"
  timestamp: Date
  agent: "customer-service" | "marketing" | "loyalty" | "other"
  content: any
  status: "pending" | "approved" | "declined"
}

// Add a gradient text component for Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

export default function AgentInboxPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<string>("all")
  const [selectedAction, setSelectedAction] = useState<AgentAction | null>(null)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([
    {
      id: "act-1",
      type: "email",
      title: "Email Response to Customer Inquiry",
      description: "A customer has asked about product availability. I've drafted a response.",
      priority: "high",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
      agent: "customer-service",
      content: {
        customerEmail: "sarah.johnson@example.com",
        customerName: "Sarah Johnson",
        subject: "Product Availability Inquiry",
        inquiry: "Hello, I'm interested in purchasing your premium coffee subscription, but I wanted to check if it's available for international shipping? I'm located in Canada. Also, do you offer sample packs before committing to a full subscription? Thanks, Sarah",
        suggestedResponse: "Hi Sarah,\n\nThank you for your interest in our premium coffee subscription! I'm happy to inform you that we do ship to Canada, with deliveries typically taking 5-7 business days.\n\nRegarding sample packs, we actually do offer a 'Coffee Explorer' package that includes 3 small bags of our most popular blends. It's a perfect way to experience our coffee before committing to a full subscription. The sample pack is priced at $14.99 with free shipping for Canadian customers.\n\nWould you like me to send you more details about our international shipping policies or the Coffee Explorer sample pack?\n\nLooking forward to helping you enjoy our coffee!\n\nBest regards,\nThe Coffee House Team"
      },
      status: "pending"
    },
    {
      id: "act-2",
      type: "offer",
      title: "Personalized Discount Offer",
      description: "This customer hasn't purchased in 45 days. I recommend sending them a special offer.",
      priority: "medium",
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      agent: "marketing",
      content: {
        customerEmail: "mike.roberts@example.com",
        customerName: "Mike Roberts",
        lastPurchaseDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45), // 45 days ago
        purchaseHistory: [
          { date: "2023-06-15", amount: 68.50, items: ["Medium Roast Coffee (2 lbs)", "Ceramic Pour Over"] },
          { date: "2023-04-02", amount: 32.75, items: ["Light Roast Coffee (1 lb)", "Coffee Filters"] },
          { date: "2023-02-18", amount: 49.99, items: ["Coffee Gift Box", "Travel Mug"] }
        ],
        suggestedOffer: {
          discountType: "percentage",
          discountAmount: 15,
          expirationDays: 7,
          message: "We miss you! Here's 15% off your next order.",
          reasoning: "Customer has made 3 purchases averaging $50.41 but hasn't returned in 45 days. Our data shows that customers who receive a 15% offer within 45-60 days of their last purchase have a 42% return rate."
        }
      },
      status: "pending"
    },
    {
      id: "act-3",
      type: "program",
      title: "Loyalty Program Recommendation",
      description: "Based on customer purchase patterns, I recommend creating a new Coffee Enthusiast tier.",
      priority: "low",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      agent: "loyalty",
      content: {
        programName: "Coffee Enthusiast Tier",
        analysis: "After analyzing your customer purchase patterns, I've identified a segment of customers who purchase more than 3 lbs of coffee per month but don't qualify for your current premium tier.",
        customerSegmentSize: "93 customers (12% of your active customer base)",
        averageSpend: "$64.75 per month",
        recommendation: {
          tierName: "Coffee Enthusiast",
          qualifications: "Purchases of 3+ lbs of coffee per month",
          benefits: [
            "Free shipping on all orders",
            "Early access to limited edition beans",
            "10% discount on brewing equipment",
            "Free coffee sample with each order"
          ],
          expectedResults: "Projected 22% increase in retention and 15% increase in average order value for this segment.",
          implementationDifficulty: "Medium - requires updates to your loyalty program structure and tracking of monthly coffee purchases."
        }
      },
      status: "pending"
    }
  ])

  // Filter actions based on active tab
  const filteredActions = pendingActions.filter(action => {
    if (activeTab === "all") return true
    if (activeTab === "high") return action.priority === "high"
    if (activeTab === "email") return action.type === "email"
    if (activeTab === "offer") return action.type === "offer"
    if (activeTab === "program") return action.type === "program"
    return false
  })

  // Handle action approval
  const handleApprove = (actionId: string) => {
    setPendingActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { ...action, status: "approved" }
          : action
      )
    )
    
    toast({
      title: "Action Approved",
      description: "The agent will now implement this action.",
      variant: "default",
    })
    
    setIsDetailSheetOpen(false)
  }
  
  // Handle action decline
  const handleDecline = (actionId: string) => {
    setPendingActions(prev => 
      prev.map(action => 
        action.id === actionId 
          ? { ...action, status: "declined" }
          : action
      )
    )
    
    toast({
      title: "Action Declined",
      description: "The agent will not proceed with this action.",
      variant: "destructive",
    })
    
    setIsDetailSheetOpen(false)
  }
  
  // Show action details
  const viewActionDetails = (action: AgentAction) => {
    setSelectedAction(action)
    setIsDetailSheetOpen(true)
  }
  
  // Format relative time
  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    
    let interval = Math.floor(seconds / 31536000)
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 2592000)
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 86400)
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 3600)
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 60)
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`
    
    if (seconds < 10) return 'just now'
    
    return `${Math.floor(seconds)} second${Math.floor(seconds) === 1 ? '' : 's'} ago`
  }
  
  // Get icon for action type
  const getActionIcon = (type: string) => {
    switch (type) {
      case "email":
        return <Mail className="h-5 w-5 text-blue-500" />
      case "offer":
        return <Package className="h-5 w-5 text-purple-500" />
      case "program":
        return <Star className="h-5 w-5 text-amber-500" />
      default:
        return <Mail className="h-5 w-5 text-gray-500" />
    }
  }
  
  // Get color for priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
      case "medium":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
      case "low":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200"
    }
  }
  
  // Get formatted agent name
  const getAgentName = (agent: string) => {
    switch (agent) {
      case "customer-service":
        return "Customer Service Agent"
      case "marketing":
        return "Marketing Agent"
      case "loyalty":
        return "Loyalty Program Agent"
      default:
        return "AI Agent"
    }
  }

  return (
    <div className="container max-w-7xl mx-auto px-4">
      <div className="pt-4"></div>
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div>
          <h2 className="text-xl font-medium flex items-center gap-2">
            <GradientText>Agent</GradientText> Inbox
          </h2>
        </div>
        
        <div className="flex items-center gap-4">
          <Button size="sm" className="gap-2 h-8">
            <CheckCircle className="h-4 w-4" />
            Approve All
          </Button>
        </div>
      </div>
      
      <div className="mt-4">
        <div style={{
          width: "100vw",
          position: "relative",
          left: "50%",
          right: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          height: "1px",
          backgroundColor: "rgb(229, 231, 235)"
        }}></div>
      </div>
      
      <div className="mt-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all" className="gap-2">
              <Clock className="h-4 w-4" />
              All Actions
            </TabsTrigger>
            <TabsTrigger value="high" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              High Priority
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Email Responses
            </TabsTrigger>
            <TabsTrigger value="offer" className="gap-2">
              <Package className="h-4 w-4" />
              Customer Offers
            </TabsTrigger>
            <TabsTrigger value="program" className="gap-2">
              <Star className="h-4 w-4" />
              Program Updates
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-0">
            {filteredActions.length === 0 ? (
              <Card className="rounded-md">
                <CardContent className="pt-10 pb-10 flex flex-col items-center justify-center">
                  <Clock className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-medium text-center mb-2">No actions found</h3>
                  <p className="text-sm text-gray-500 text-center max-w-md">
                    There are no pending agent actions that match your current filter. Try changing your filter or check back later.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredActions.map(action => (
                  <Card key={action.id} className="rounded-md overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      {/* Main content */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                          <div>
                            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
                              {action.title}
                              <Badge variant="outline" className={`ml-2 text-xs font-medium ${getPriorityColor(action.priority)}`}>
                                {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                              </Badge>
                            </h3>
                            <p className="text-sm text-gray-500">
                              {action.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 md:gap-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2"
                              onClick={() => viewActionDetails(action)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => handleDecline(action.id)}
                            >
                              <XCircle className="h-4 w-4" />
                              Decline
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="gap-2 text-green-600 border-green-200 hover:bg-gray-50"
                              onClick={() => handleApprove(action.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              Approve
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div>
                            <span>{getAgentName(action.agent)}</span>
                          </div>
                          <span>•</span>
                          <div>
                            <span>{formatTimeAgo(action.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Detail Sheet */}
      <Sheet open={isDetailSheetOpen} onOpenChange={setIsDetailSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-auto">
          {selectedAction && (
            <>
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  {selectedAction.title}
                </SheetTitle>
                <SheetDescription>
                  Suggested by {getAgentName(selectedAction.agent)} {formatTimeAgo(selectedAction.timestamp)}
                </SheetDescription>
              </SheetHeader>
              
              <div className="space-y-6">
                {/* Different content based on action type */}
                {selectedAction.type === "email" && (
                  <div className="space-y-6">
                    <Card className="rounded-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Customer:</span>
                            <span className="text-sm">{selectedAction.content.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Email:</span>
                            <span className="text-sm">{selectedAction.content.customerEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Subject:</span>
                            <span className="text-sm">{selectedAction.content.subject}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Customer's Inquiry:</h4>
                      <Card className="rounded-md">
                        <CardContent className="p-4">
                          <p className="text-sm whitespace-pre-line">{selectedAction.content.inquiry}</p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Suggested Response:</h4>
                      <Textarea 
                        className="font-mono text-sm min-h-[200px]"
                        value={selectedAction.content.suggestedResponse}
                        readOnly
                      />
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Agent Notes</h4>
                      <p className="text-sm text-gray-700">
                        This response addresses the customer's questions about international shipping to Canada and sample pack availability. I've included specific details about delivery timeframes and the Coffee Explorer package to provide complete information.
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedAction.type === "offer" && (
                  <div className="space-y-6">
                    <Card className="rounded-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Customer Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Customer:</span>
                            <span className="text-sm">{selectedAction.content.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Email:</span>
                            <span className="text-sm">{selectedAction.content.customerEmail}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm font-medium">Last Purchase:</span>
                            <span className="text-sm">{formatTimeAgo(selectedAction.content.lastPurchaseDate)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2">Purchase History:</h4>
                      <Card className="rounded-md">
                        <CardContent className="p-4">
                          <div className="space-y-4">
                            {selectedAction.content.purchaseHistory.map((purchase: any, index: number) => (
                              <div key={index} className="border-b last:border-b-0 pb-3 last:pb-0">
                                <div className="flex justify-between text-sm">
                                  <span className="font-medium">{purchase.date}</span>
                                  <span className="text-green-600">${purchase.amount.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {purchase.items.join(", ")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card className="rounded-md border-gray-200">
                      <CardHeader className="bg-gray-50 border-b border-gray-100 pb-3">
                        <CardTitle className="text-base text-gray-800">Suggested Offer</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Discount:</span>
                          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200 border-none">
                            {selectedAction.content.suggestedOffer.discountAmount}% Off
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Expires:</span>
                          <span className="text-sm">In {selectedAction.content.suggestedOffer.expirationDays} days</span>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-1">Message to Customer:</h5>
                          <p className="text-sm p-2 bg-gray-50 rounded-md border">
                            {selectedAction.content.suggestedOffer.message}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-800 mb-2">Agent Analysis</h4>
                      <p className="text-sm text-gray-700">
                        {selectedAction.content.suggestedOffer.reasoning}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedAction.type === "program" && (
                  <div className="space-y-6">
                    <Card className="rounded-md">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">Program Recommendation: {selectedAction.content.programName}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-4">{selectedAction.content.analysis}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 p-3 rounded-md border">
                            <h5 className="text-xs font-medium text-gray-500 mb-1">CUSTOMER SEGMENT</h5>
                            <p className="text-sm font-medium">{selectedAction.content.customerSegmentSize}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md border">
                            <h5 className="text-xs font-medium text-gray-500 mb-1">AVERAGE MONTHLY SPEND</h5>
                            <p className="text-sm font-medium">{selectedAction.content.averageSpend}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="rounded-md border-gray-200">
                      <CardHeader className="bg-gray-50 border-b border-gray-100 pb-3">
                        <CardTitle className="text-base text-gray-800">
                          Recommendation Details: {selectedAction.content.recommendation.tierName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <h5 className="text-sm font-medium mb-2">Qualification Criteria:</h5>
                          <p className="text-sm p-2 bg-gray-50 rounded-md border">
                            {selectedAction.content.recommendation.qualifications}
                          </p>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium mb-2">Benefits:</h5>
                          <ul className="space-y-1">
                            {selectedAction.content.recommendation.benefits.map((benefit: string, index: number) => (
                              <li key={index} className="text-sm flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">EXPECTED RESULTS</h5>
                            <p className="text-sm text-gray-800">{selectedAction.content.recommendation.expectedResults}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">IMPLEMENTATION</h5>
                            <p className="text-sm text-gray-800">{selectedAction.content.recommendation.implementationDifficulty}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
              
              <SheetFooter className="mt-8 flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleDecline(selectedAction.id)}
                >
                  <XCircle className="h-4 w-4" />
                  Decline
                </Button>
                <Button 
                  className="gap-2"
                  onClick={() => handleApprove(selectedAction.id)}
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Action
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
} 