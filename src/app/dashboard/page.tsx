"use client"

import { Card } from "@/components/ui/card"
import { 
  Users, CreditCard, Gift, BarChart2, 
  TrendingUp, Store, ArrowUp, ArrowDown,
  Sparkles, MessageSquare, Settings, ImagePlus,
  PlusCircle, User
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { useState, useMemo } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMerchantTransactions } from "@/hooks/use-merchant-transactions"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDateTime } from "@/lib/utils"

// Apple's blue color
const tapBlue = "rgb(0, 122, 255)"

export default function DashboardPage() {
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const { activities, loading } = useMerchantTransactions(10)
  const [activeTab, setActiveTab] = useState<'all' | 'transactions' | 'redemptions'>('all')

  const filteredActivities = useMemo(() => {
    if (activeTab === 'all') return activities
    return activities.filter(activity => activity.activityType === activeTab.slice(0, -1))
  }, [activities, activeTab])

  const createActions = [
    {
      title: "Create Reward",
      action: () => setCreateRewardOpen(true)
    },
    {
      title: "Create Points Rule",
      action: () => console.log("Create points rule")
    },
    {
      title: "Add Homepage Banner",
      action: () => console.log("Create banner")
    },
    {
      title: "Send Broadcast Message",
      action: () => console.log("Create broadcast")
    }
  ]

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor your store's performance and customer activity.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Tabs defaultValue="today" className="w-[360px]">
                <TabsList className="bg-[#F5F5F7] p-1 rounded-lg w-full">
                  {[
                    { value: "today", label: "Today" },
                    { value: "yesterday", label: "Yesterday" },
                    { value: "week", label: "7 Days" },
                    { value: "month", label: "30 Days" }
                  ].map((tab) => (
                    <TabsTrigger 
                      key={tab.value} 
                      value={tab.value}
                      className={cn(
                        "flex-1 rounded-md text-sm px-3 py-1.5",
                        "data-[state=active]:bg-white data-[state=active]:text-[#007AFF] data-[state=active]:shadow-sm",
                        "data-[state=inactive]:text-gray-900 data-[state=inactive]:hover:bg-white/50",
                        "transition-all duration-150"
                      )}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-[#007AFF] hover:bg-[#0066CC] text-white">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-[200px] py-2"
                >
                  {createActions.map((action) => (
                    <DropdownMenuItem 
                      key={action.title}
                      onClick={action.action}
                      className="text-sm font-medium px-3 py-2 cursor-pointer focus:bg-[#007AFF]/10 focus:text-[#007AFF]"
                    >
                      {action.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card className="p-4 border-[#007AFF]/10">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Revenue</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">$2,459</p>
                  <span className="text-xs text-[#007AFF] flex items-center">
                    <ArrowUp className="h-3 w-3" />12.5%
                  </span>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-[#007AFF]" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Customers</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">1,234</p>
                  <span className="text-xs text-green-600 flex items-center">
                    <ArrowUp className="h-3 w-3" />4.3%
                  </span>
                </div>
              </div>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Active Rewards</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">45</p>
                  <span className="text-xs text-red-600 flex items-center">
                    <ArrowDown className="h-3 w-3" />2.5%
                  </span>
                </div>
              </div>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Avg. Order</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-semibold">$24.50</p>
                  <span className="text-xs text-green-600 flex items-center">
                    <ArrowUp className="h-3 w-3" />8.1%
                  </span>
                </div>
              </div>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
          </Card>
        </div>

        <div className="grid gap-3 grid-cols-1 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Recent Activity</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-8 text-xs hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                  >
                    View all
                  </Button>
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList className="bg-[#F5F5F7] h-9">
                    <TabsTrigger 
                      value="all"
                      className={cn(
                        "px-4",
                        "data-[state=active]:bg-white data-[state=active]:text-[#007AFF] data-[state=active]:shadow-sm",
                        "data-[state=inactive]:text-gray-600"
                      )}
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger 
                      value="transactions"
                      className={cn(
                        "px-4",
                        "data-[state=active]:bg-white data-[state=active]:text-[#007AFF] data-[state=active]:shadow-sm",
                        "data-[state=inactive]:text-gray-600"
                      )}
                    >
                      Transactions
                    </TabsTrigger>
                    <TabsTrigger 
                      value="redemptions"
                      className={cn(
                        "px-4",
                        "data-[state=active]:bg-white data-[state=active]:text-[#007AFF] data-[state=active]:shadow-sm",
                        "data-[state=inactive]:text-gray-600"
                      )}
                    >
                      Redemptions
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="mt-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading activities...
                        </TableCell>
                      </TableRow>
                    ) : filteredActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          {activeTab === 'all' 
                            ? 'No activities found'
                            : `No ${activeTab.slice(0, -1)}s found`}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredActivities.map((activity) => (
                        <TableRow key={activity.activityType === 'transaction' ? activity.transactionId : activity.redemptionId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center overflow-hidden">
                                {activity.customerProfile?.shareProfileWithMerchants && 
                                 activity.customerProfile?.profilePictureUrl ? (
                                  <img 
                                    src={activity.customerProfile.profilePictureUrl} 
                                    alt={activity.customerProfile.fullName || activity.customerId}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="h-4 w-4 text-[#007AFF]" />
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">
                                  {activity.customerProfile?.fullName || 'Unknown Customer'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {(activity.customerProfile?.pointsBalance || 0).toLocaleString()} points
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {formatDateTime(activity.actualcreatedAt)}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                              activity.activityType === 'transaction' && "bg-green-100 text-green-700",
                              activity.activityType === 'redemption' && "bg-purple-100 text-purple-700"
                            )}>
                              {activity.activityType === 'transaction' ? 'Purchase' : 'Redemption'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {activity.activityType === 'transaction' ? (
                              <span>${activity.amount}</span>
                            ) : (
                              <div className="flex flex-col">
                                <span>{activity.rewardName}</span>
                                <span className="text-xs text-muted-foreground">
                                  -{activity.pointsUsed} points
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={cn(
                              "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                              activity.activityType === 'transaction' ? (
                                activity.status === 'completed' && "bg-green-100 text-green-700",
                                activity.status === 'pending' && "bg-yellow-100 text-yellow-700",
                                activity.status === 'cancelled' && "bg-red-100 text-red-700"
                              ) : (
                                activity.status === 'successful' && "bg-green-100 text-green-700",
                                activity.status === 'pending' && "bg-yellow-100 text-yellow-700",
                                activity.status === 'failed' && "bg-red-100 text-red-700"
                              )
                            )}>
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Popular Rewards</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs hover:text-[#007AFF] hover:bg-[#007AFF]/10"
                >
                  View all
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[
                { name: "Free Coffee", claimed: 45, total: 100 },
                { name: "10% Off", claimed: 28, total: 50 },
                { name: "Free Pastry", claimed: 15, total: 30 },
              ].map((reward, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{reward.name}</span>
                    <span className="text-muted-foreground">{reward.claimed}/{reward.total}</span>
                  </div>
                  <div className="h-1.5 bg-[#007AFF]/10 rounded-full">
                    <div 
                      className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
                      style={{ width: `${(reward.claimed/reward.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <CreateRewardDialog 
        open={createRewardOpen} 
        onOpenChange={setCreateRewardOpen}
      />
    </div>
  )
} 