"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  ShoppingCart, 
  Clock, 
  DollarSign,
  Gift,
  Zap,
  MoreVertical,
  Edit,
  Trash,
  Plus,
  Send
} from "lucide-react"
import { useCustomer } from "@/hooks/use-customer"
import { formatDistanceToNow, format } from 'date-fns'
import Link from "next/link"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export default function CustomerDetailsPage() {
  const { id } = useParams()
  const { customer, loading, error } = useCustomer(id as string)
  const [activeTab, setActiveTab] = useState("overview")

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="p-8">
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Customer not found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The customer you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild className="mt-4 rounded-md">
                <Link href="/customers">Back to Customers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'MMM d, yyyy')
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      // Handle Firestore Timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date'
    }
  }

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            asChild
            className="rounded-md"
          >
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Details</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Profile Card */}
          <Card className="lg:col-span-1 rounded-lg">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle>Profile</CardTitle>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 rounded-md"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-md">
                    <DropdownMenuItem className="flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Customer
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Points
                    </DropdownMenuItem>
                    <DropdownMenuItem className="flex items-center">
                      <Send className="mr-2 h-4 w-4" />
                      Send Message
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 flex items-center">
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Customer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-md bg-[#007AFF]/10 flex items-center justify-center overflow-hidden mb-4">
                  {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                    <img 
                      src={customer.profileData.profilePictureUrl} 
                      alt={customer.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-[#007AFF]" />
                  )}
                </div>
                
                <h2 className="text-xl font-semibold">{customer.fullName}</h2>
                
                {customer.membershipTier && (
                  <Badge className="mt-1 rounded-md bg-[#007AFF]/10 text-[#007AFF] border-0">
                    {customer.membershipTier}
                  </Badge>
                )}
                
                <div className="w-full mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.email || 'No email provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{customer.phone || 'No phone provided'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Joined {formatDate(customer.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-semibold">{customer.pointsBalance.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mt-1">Points Balance</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold">{customer.lifetimeTransactionCount}</div>
                  <div className="text-xs text-muted-foreground mt-1">Total Visits</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold">${customer.totalLifetimeSpend}</div>
                  <div className="text-xs text-muted-foreground mt-1">Lifetime Spend</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-semibold">{customer.redemptionCount || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Rewards Redeemed</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Customer Activity Tabs */}
          <Card className="lg:col-span-2 rounded-lg">
            <CardHeader className="pb-0">
              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-4 h-10 rounded-md">
                  <TabsTrigger value="overview" className="rounded-md flex items-center gap-1.5">
                    <Zap className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="rounded-md flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4" />
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="rewards" className="rounded-md flex items-center gap-1.5">
                    <Gift className="h-4 w-4" />
                    Rewards
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="rounded-md flex items-center gap-1.5">
                    <Edit className="h-4 w-4" />
                    Notes
                  </TabsTrigger>
                </TabsList>

                <CardContent className="pt-6">
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="rounded-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {customer.recentTransactions && customer.recentTransactions.length > 0 ? (
                              customer.recentTransactions.slice(0, 3).map((transaction, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <ShoppingCart className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{transaction.type || 'Purchase'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTimeAgo(transaction.timestamp)} • ${transaction.amount}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No recent transactions</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="rounded-lg">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Recent Rewards</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {customer.recentRedemptions && customer.recentRedemptions.length > 0 ? (
                              customer.recentRedemptions.slice(0, 3).map((redemption, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <Gift className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{redemption.rewardName || 'Reward Redeemed'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatTimeAgo(redemption.timestamp)} • {redemption.pointsCost || 0} points
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">No recent redemptions</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card className="rounded-lg">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Customer Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Average Order Value</p>
                            <p className="text-lg font-medium">
                              ${customer.averageOrderValue?.toFixed(2) || '0.00'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Purchase Frequency</p>
                            <p className="text-lg font-medium">
                              {customer.purchaseFrequencyDays ? 
                                `Every ${customer.purchaseFrequencyDays} days` : 
                                'N/A'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Days Since Last Visit</p>
                            <p className="text-lg font-medium">
                              {customer.daysSinceLastVisit || 'N/A'}
                            </p>
                          </div>
                          
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Favorite Product</p>
                            <p className="text-lg font-medium">
                              {customer.favoriteProduct || 'None'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="transactions" className="mt-0">
                    <div className="space-y-4">
                      {customer.transactions && customer.transactions.length > 0 ? (
                        customer.transactions.map((transaction, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 border rounded-md">
                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{transaction.type || 'Purchase'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(transaction.timestamp)} at {transaction.location || 'Unknown location'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">${transaction.amount}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {transaction.pointsEarned ? `+${transaction.pointsEarned} points` : ''}
                                  </p>
                                </div>
                              </div>
                              {transaction.items && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-sm font-medium mb-1">Items:</p>
                                  <div className="space-y-1">
                                    {transaction.items.map((item, idx) => (
                                      <div key={idx} className="text-sm flex justify-between">
                                        <span>{item.quantity}x {item.name}</span>
                                        <span>${item.price}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium">No transactions yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            This customer hasn't made any purchases yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="rewards" className="mt-0">
                    <div className="space-y-4">
                      {customer.redemptions && customer.redemptions.length > 0 ? (
                        customer.redemptions.map((redemption, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 border rounded-md">
                            <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Gift className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">{redemption.rewardName || 'Reward Redeemed'}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(redemption.timestamp)} at {redemption.location || 'Unknown location'}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">{redemption.pointsCost || 0} points</p>
                                  <Badge variant="outline" className="rounded-md">
                                    {redemption.status || 'Redeemed'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-medium">No rewards redeemed</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            This customer hasn't redeemed any rewards yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="notes" className="mt-0">
                    <div className="space-y-4">
                      {customer.notes && customer.notes.length > 0 ? (
                        customer.notes.map((note, index) => (
                          <div key={index} className="p-4 border rounded-md">
                            <div className="flex justify-between items-start mb-2">
                              <p className="font-medium">{note.title || 'Note'}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(note.timestamp)}
                              </p>
                            </div>
                            <p className="text-sm">{note.content}</p>
                            {note.author && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Added by {note.author}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <div className="h-12 w-12 text-muted-foreground mx-auto mb-4">📝</div>
                          <h3 className="text-lg font-medium">No notes yet</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            Add notes about this customer to keep track of important information.
                          </p>
                          <Button className="mt-4 rounded-md">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Note
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  )
} 