"use client"

import { useState } from "react"
import { Mail, Package, AlertCircle, CheckCircle, XCircle, ChevronDown, Star, Clock, Eye, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
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
  }
  
  // Show action details
  const viewActionDetails = (action: AgentAction) => {
    setSelectedAction(action)
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
        return "bg-red-50 text-red-700 border-red-200"
      case "medium":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
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
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold tracking-tight whitespace-nowrap flex items-center gap-2">
              <GradientText>Agent</GradientText> Inbox
            </h1>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" className="h-8 gap-2 rounded-md">
              <Filter className="h-4 w-4" />
              <span className="text-sm">Filter</span>
            </Button>
            <Button className="h-8 gap-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span>Approve All</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-t flex-1 min-h-0 h-[calc(100vh-9rem)]">
        {/* Left Column - Agent Requests List */}
        <div className="lg:col-span-1 border-r flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b flex-shrink-0">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="high" className="flex items-center justify-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>High Priority</span>
                </TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="offer">Offers</TabsTrigger>
                <TabsTrigger value="program">Programs</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
      
          <div className="flex-grow overflow-y-auto h-[calc(100%-8rem)] min-h-0 scrollbar-thin">
            <style jsx global>{`
              .scrollbar-thin {
                scrollbar-width: thin;
                scrollbar-color: rgba(203, 213, 225, 0.5) transparent;
              }
              .scrollbar-thin::-webkit-scrollbar {
                width: 6px;
              }
              .scrollbar-thin::-webkit-scrollbar-track {
                background: transparent;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb {
                background-color: rgba(203, 213, 225, 0.5);
                border-radius: 20px;
              }
              .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                background-color: rgba(148, 163, 184, 0.7);
              }
            `}</style>
            {filteredActions.length === 0 ? (
              <div className="p-8 text-center">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-medium mb-1">No agent actions found</h3>
                <p className="text-sm text-muted-foreground">
                  There are no pending agent actions that match your current filter.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredActions.map((action) => (
                  <div 
                    key={action.id}
                    className={cn(
                      "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedAction?.id === action.id && "bg-muted",
                      action.priority === "high" && "border-l-4 border-l-red-500"
                    )}
                    onClick={() => viewActionDetails(action)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-shrink">
                        {getActionIcon(action.type)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{action.title}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{action.description}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <div className="flex items-center gap-1 mb-1">
                          <Badge variant="outline" className={`text-xs whitespace-nowrap px-2 py-0 h-5 font-medium rounded-md ${getPriorityColor(action.priority)}`}>
                            {action.priority.charAt(0).toUpperCase() + action.priority.slice(1)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(action.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {getAgentName(action.agent)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
                      
        {/* Right Column - Action Detail */}
        <div className="lg:col-span-1 flex flex-col min-h-0 p-0">
          {selectedAction ? (
            <div className="flex flex-col h-full">
              <div className="px-6 py-4 border-b flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-medium">
                    {selectedAction.title}
                  </h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                    {getAgentName(selectedAction.agent)} • {formatTimeAgo(selectedAction.timestamp)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 gap-1 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDecline(selectedAction.id)}
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Decline</span>
                  </Button>
                  <Button 
                    size="sm"
                    className="h-8 gap-1 rounded-md"
                    onClick={() => handleApprove(selectedAction.id)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </Button>
                </div>
              </div>

              <div className="px-6 py-6 flex-grow overflow-y-auto">
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
                      
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                        <p className="text-sm text-blue-700">
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
                      
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                        <p className="text-sm text-blue-700">
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
                      
                      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">Agent Reasoning</h4>
                        <p className="text-sm text-blue-700">
                          I've identified a growth opportunity by creating a new loyalty tier. This tier targets the 12% of customers who are heavy coffee purchasers but don't qualify for premium benefits. Based on purchasing patterns, offering these specific benefits should increase both retention and average order value for this valuable customer segment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No action selected</h3>
                <p className="text-muted-foreground">
                  Select an action from the list to view its details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 