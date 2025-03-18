"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Gift, 
  PackageOpen, 
  Zap,
  Search,
  Filter,
  Plus,
  Coffee,
  ShoppingBag,
  Cake,
  Star,
  DollarSign,
  Calendar,
  UserPlus,
  LayoutGrid,
  List
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/page-transition"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { RewardDetailsDialog } from "@/components/reward-details-dialog"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/components/ui/use-toast"

const rewardTemplates = [
  {
    id: 'test-reward',
    name: 'Test Reward',
    description: 'Enjoy a special test reward to elevate your experience!',
    category: 'special-occasion',
    pointsCost: "5",
    icon: Gift,
    tags: ['Test', 'Special', '$10 Value'],
    type: "voucher",
    voucherAmount: "10",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: true,
      minimumTransactions: "1",
      maximumTransactions: "",
      useSpendingRequirements: true,
      minimumLifetimeSpend: "20",
      minimumPointsBalance: "",
      useTimeRequirements: false,
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "100",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'birthday-reward',
    name: 'Birthday Reward',
    description: 'Special reward for customers on their birthday',
    category: 'special-occasion',
    pointsCost: "0",
    icon: Cake,
    tags: ['Birthday', 'Free', 'Annual'],
    type: "voucher",
    voucherAmount: "10",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: false,
      minimumLifetimeSpend: "",
      minimumPointsBalance: "",
      useTimeRequirements: false,
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "",
      perCustomerLimit: "",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'coffee-loyalty',
    name: 'Coffee Loyalty',
    description: 'Buy 9 coffees, get 1 free',
    category: 'loyalty',
    pointsCost: "100",
    icon: Coffee,
    tags: ['Drinks', 'Popular', 'Frequent']
  },
  {
    id: 'welcome-discount',
    name: 'Welcome Discount',
    description: '10% off first purchase for new customers',
    category: 'welcome',
    pointsCost: "0",
    icon: ShoppingBag,
    tags: ['New Customers', 'Discount']
  },
  {
    id: 'vip-reward',
    name: 'VIP Status Reward',
    description: 'Exclusive reward for VIP members',
    category: 'tier',
    pointsCost: "500",
    icon: Star,
    tags: ['VIP', 'Premium', 'Exclusive']
  },
  {
    id: 'spend-bonus',
    name: 'Spend Bonus',
    description: '$5 reward for every $100 spent',
    category: 'spending',
    pointsCost: "0",
    icon: DollarSign,
    tags: ['Spending', 'Cash Back']
  },
  {
    id: 'monthly-special',
    name: 'Monthly Special',
    description: 'Rotating monthly reward for members',
    category: 'recurring',
    pointsCost: "200",
    icon: Calendar,
    tags: ['Monthly', 'Seasonal']
  }
]

const rewardCategories = [
  { id: 'all', label: 'All Templates', icon: Gift },
  { id: 'special-occasion', label: 'Special Occasions', icon: Cake },
  { id: 'loyalty', label: 'Loyalty & Punch Cards', icon: Coffee },
  { id: 'welcome', label: 'Welcome Rewards', icon: UserPlus },
  { id: 'tier', label: 'Tier Benefits', icon: Star },
  { id: 'spending', label: 'Spending Rewards', icon: DollarSign },
  { id: 'recurring', label: 'Recurring Rewards', icon: Calendar }
]

export default function RewardLibraryPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedReward, setSelectedReward] = useState<typeof rewardTemplates[0] | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const filterRewards = (templates: typeof rewardTemplates, query: string) => {
    if (!query.trim()) return templates
    
    const searchLower = query.toLowerCase()
    return templates.filter(template => 
      template.name.toLowerCase().includes(searchLower) ||
      template.description.toLowerCase().includes(searchLower) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchLower))
    )
  }

  const handleRewardClick = (reward: typeof rewardTemplates[0]) => {
    setSelectedReward(reward)
    setIsDetailsOpen(true)
  }

  const handleEdit = () => {
    setIsDetailsOpen(false)
    setIsCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!selectedReward || !user) return

    try {
      // Create the reward document
      const rewardDoc = await addDoc(collection(db, "rewards"), {
        name: selectedReward.name,
        description: selectedReward.description,
        pointsCost: parseInt(selectedReward.pointsCost),
        type: selectedReward.type,
        voucherAmount: selectedReward.voucherAmount ? parseInt(selectedReward.voucherAmount) : null,
        isActive: selectedReward.isActive,
        conditions: selectedReward.conditions,
        limitations: selectedReward.limitations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
        merchantId: user.uid // Assuming merchantId is the same as user.uid
      })

      // Create the merchant-specific reward reference
      await setDoc(doc(db, `merchants/${user.uid}/rewards/${rewardDoc.id}`), {
        rewardId: rewardDoc.id,
        name: selectedReward.name,
        description: selectedReward.description,
        pointsCost: parseInt(selectedReward.pointsCost),
        type: selectedReward.type,
        voucherAmount: selectedReward.voucherAmount ? parseInt(selectedReward.voucherAmount) : null,
        isActive: selectedReward.isActive,
        conditions: selectedReward.conditions,
        limitations: selectedReward.limitations,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      toast({
        title: "Reward Created",
        description: "Your reward has been created successfully.",
      })

      // Close the dialog
      setIsDetailsOpen(false)

      // Redirect to the reward details page
      router.push(`/store/rewards/${rewardDoc.id}`)
    } catch (error) {
      console.error("Error creating reward:", error)
      toast({
        title: "Error",
        description: "There was an error creating your reward. Please try again.",
        variant: "destructive"
      })
    }
  }

  const renderRewardItem = (template: typeof rewardTemplates[0], viewType: 'grid' | 'list') => {
    const Icon = template.icon

    if (viewType === 'list') {
      return (
        <Card 
          key={template.id} 
          className="group hover:shadow-md transition-shadow rounded-md cursor-pointer"
          onClick={() => handleRewardClick(template)}
        >
          <div className="flex items-center p-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-medium">{template.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{template.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary"
                    className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground w-24 text-right">
                {template.pointsCost === "0" ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <span>{template.pointsCost} points</span>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRewardClick(template)
                }}
              >
                Use Template
              </Button>
            </div>
          </div>
        </Card>
      )
    }

    return (
      <Card 
        key={template.id} 
        className="group hover:shadow-md transition-shadow rounded-md cursor-pointer"
        onClick={() => handleRewardClick(template)}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {template.tags.map((tag) => (
              <Badge 
                key={tag} 
                variant="secondary"
                className="bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                {tag}
              </Badge>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {template.pointsCost === "0" ? (
                <span className="text-green-600 font-medium">Free</span>
              ) : (
                <span>{template.pointsCost} points</span>
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRewardClick(template)
              }}
            >
              Use Template
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <PageTransition>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold">Rewards Library</h1>
            <p className="text-muted-foreground">Browse and customize pre-made reward templates</p>
          </div>
          <Button 
            className="bg-[#007AFF] hover:bg-[#0063CC] text-white"
            onClick={() => router.push("/store/rewards/create")}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom
          </Button>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="individual" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-muted">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <Gift className="h-4 w-4" />
                <span>Individual Rewards</span>
              </TabsTrigger>
              <TabsTrigger value="programs" className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4" />
                <span>Programs</span>
              </TabsTrigger>
              <TabsTrigger value="points" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>Points Rules</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-3">
              <div className="relative w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-10 h-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="default" className="h-10">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-10"
                onClick={() => setViewType(viewType === 'grid' ? 'list' : 'grid')}
              >
                {viewType === 'grid' ? (
                  <List className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Individual Rewards Content with Sub-tabs */}
          <TabsContent value="individual">
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="w-full bg-background border-b h-12 p-0 space-x-2">
                {rewardCategories.map(category => {
                  const Icon = category.icon
                  return (
                    <TabsTrigger 
                      key={category.id}
                      value={category.id}
                      className="data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:border-b-2"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {rewardCategories.map(category => (
                <TabsContent key={category.id} value={category.id}>
                  <div className={cn(
                    viewType === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-3 gap-4"
                      : "space-y-4"
                  )}>
                    {filterRewards(
                      rewardTemplates.filter(template => 
                        category.id === 'all' || template.category === category.id
                      ),
                      searchQuery
                    ).map((template) => renderRewardItem(template, viewType))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </TabsContent>

          {/* Programs Content */}
          <TabsContent value="programs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="group hover:shadow-md transition-shadow rounded-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Star className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">VIP Program</CardTitle>
                        <CardDescription>Multi-tier loyalty program with exclusive benefits</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Premium
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Multi-tier
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    View Program
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Points Rules Content */}
          <TabsContent value="points">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="group hover:shadow-md transition-shadow rounded-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Standard Points</CardTitle>
                        <CardDescription>1 point per $1 spent</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Basic
                    </Badge>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                      Points
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Configure Rule
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add dialogs */}
        {selectedReward && (
          <>
            <RewardDetailsDialog
              isOpen={isDetailsOpen}
              onClose={() => setIsDetailsOpen(false)}
              reward={selectedReward}
              onEdit={handleEdit}
              onCreate={handleCreate}
            />
            <CreateRewardDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              defaultValues={selectedReward}
            />
          </>
        )}
      </div>
    </PageTransition>
  )
} 