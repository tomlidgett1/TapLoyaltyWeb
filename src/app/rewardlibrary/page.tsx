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
  List,
  Clock,
  AlertCircle
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { RewardDetailsDialog } from "@/components/reward-details-dialog"
import { CreateRewardDialog } from "@/components/create-reward-dialog"

// Empty array for reward templates
const rewardTemplates = [
  {
    id: 'free-coffee',
    name: 'Free Coffee',
    description: 'Enjoy a complimentary cup of our signature coffee on your next visit with any purchase.',
    category: 'welcome',
    pointsCost: "0",
    icon: Coffee,
    tags: ['Free', 'Beverage', 'Welcome'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: true,
      minimumTransactions: "1",
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
      totalRedemptionLimit: "200",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-muffin',
    name: 'Free Muffin',
    description: 'Grab a free muffin with any beverage purchase at our café!',
    category: 'loyalty',
    pointsCost: "0",
    icon: Cake,
    tags: ['Free', 'Food', 'Bakery'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: true,
      minimumLifetimeSpend: "5",
      minimumPointsBalance: "",
      useTimeRequirements: false,
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "150",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-pastry',
    name: 'Free Pastry',
    description: 'Enjoy a free pastry of your choice on any order over $10!',
    category: 'loyalty',
    pointsCost: "0",
    icon: Cake,
    tags: ['Free', 'Food', 'Bakery'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: true,
      minimumLifetimeSpend: "10",
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
    id: 'free-iced-tea',
    name: 'Free Iced Tea',
    description: 'Cool down with a complimentary iced tea with any meal purchased!',
    category: 'loyalty',
    pointsCost: "0",
    icon: Coffee,
    tags: ['Free', 'Beverage', 'Refreshing'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: true,
      minimumTransactions: "2",
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
      totalRedemptionLimit: "120",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-sandwich',
    name: 'Free Sandwich',
    description: 'Enjoy a complimentary sandwich with any purchase over $15!',
    category: 'spending',
    pointsCost: "0",
    icon: ShoppingBag,
    tags: ['Free', 'Food', 'Meal'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: true,
      minimumLifetimeSpend: "15",
      minimumPointsBalance: "",
      useTimeRequirements: false,
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "80",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-hot-chocolate',
    name: 'Free Hot Chocolate',
    description: 'Warm up with a free hot chocolate after any pastry purchase!',
    category: 'special-occasion',
    pointsCost: "0",
    icon: Coffee,
    tags: ['Free', 'Beverage', 'Seasonal'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: true,
      minimumTransactions: "1",
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
      totalRedemptionLimit: "90",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-smoothie',
    name: 'Free Smoothie',
    description: 'Refresh yourself with a delicious smoothie after your third visit!',
    category: 'loyalty',
    pointsCost: "0",
    icon: Coffee,
    tags: ['Free', 'Beverage', 'Healthy'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: true,
      minimumTransactions: "3",
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
      totalRedemptionLimit: "75",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-cake-slice',
    name: 'Free Cake Slice',
    description: 'Enjoy a complimentary slice of cake with any drink purchase over $10!',
    category: 'special-occasion',
    pointsCost: "0",
    icon: Cake,
    tags: ['Free', 'Dessert', 'Premium'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: true,
      minimumLifetimeSpend: "10",
      minimumPointsBalance: "",
      useTimeRequirements: false,
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "60",
      perCustomerLimit: "1",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: []
    }
  },
  {
    id: 'free-breakfast-item',
    name: 'Free Breakfast Item',
    description: 'Start your day right with a free breakfast item with any purchase before 10 AM!',
    category: 'recurring',
    pointsCost: "0",
    icon: Coffee,
    tags: ['Free', 'Breakfast', 'Morning'],
    type: "voucher",
    voucherAmount: "0",
    rewardVisibility: "global",
    isActive: true,
    conditions: {
      useTransactionRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      useSpendingRequirements: false,
      minimumLifetimeSpend: "",
      minimumPointsBalance: "",
      useTimeRequirements: true,
      daysSinceJoined: "",
      daysSinceLastVisit: "1",
      membershipLevel: "",
      newCustomer: false
    },
    limitations: {
      totalRedemptionLimit: "70",
      perCustomerLimit: "1",
      useTimeRestrictions: true,
      startTime: "06:00 AM",
      endTime: "10:00 AM",
      dayRestrictions: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    }
  }
]

// Keep the categories for the UI structure
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
  const [viewType, setViewType] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedReward, setSelectedReward] = useState<typeof rewardTemplates[0] | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isCreateRewardOpen, setIsCreateRewardOpen] = useState(false)

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
    setIsCreateRewardOpen(true)
  }

  const handleCreate = () => {
    router.push(`/store/rewards/create?template=${selectedReward?.id}`)
  }

  const renderRewardItem = (template: typeof rewardTemplates[0], viewType: "grid" | "list") => {
    const Icon = template.icon || Gift
    
    // Count active conditions and limitations
    const conditionCount = Object.entries(template.conditions).filter(([key, value]) => {
      if (key === 'useTransactionRequirements' || key === 'useSpendingRequirements' || key === 'useTimeRequirements') {
        return value === true
      }
      if (key === 'newCustomer') return value === true
      return value && value !== ""
    }).length
    
    const limitationCount = Object.entries(template.limitations).filter(([key, value]) => {
      if (key === 'useTimeRestrictions') return value === true
      if (key === 'dayRestrictions') return Array.isArray(value) && value.length > 0
      return value && value !== ""
    }).length

    if (viewType === 'list') {
      return (
        <div 
          key={template.id}
          className="group flex items-stretch overflow-hidden bg-gray-50 border border-gray-100 rounded-lg hover:shadow-md transition-all cursor-pointer"
          onClick={() => handleRewardClick(template)}
        >
          <div className="w-16 bg-blue-50 flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-500" />
          </div>
          
          <div className="flex-1 p-4 flex items-center">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 line-clamp-1">{template.description}</p>
            </div>
            
            <div className="flex items-center gap-3 ml-4">
              {conditionCount > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  {conditionCount} {conditionCount === 1 ? 'condition' : 'conditions'}
                </div>
              )}
              
              {limitationCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white text-gray-700 px-2 py-1 rounded-full text-xs font-medium border border-gray-100">
                  <AlertCircle className="h-3 w-3" />
                  {limitationCount} {limitationCount === 1 ? 'limit' : 'limits'}
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm"
                className="ml-2 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRewardClick(template)
                }}
              >
                Use Template
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div 
        key={template.id} 
        className="group bg-gray-50 border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all rounded-lg overflow-hidden cursor-pointer"
        onClick={() => handleRewardClick(template)}
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{template.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{template.description}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {template.tags.map((tag: string) => (
              <Badge 
                key={tag} 
                variant="secondary"
                className="bg-white text-gray-600 border border-gray-100"
              >
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              {conditionCount > 0 && (
                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                  <Clock className="h-3 w-3" />
                  {conditionCount}
                </div>
              )}
              
              {limitationCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white text-gray-700 px-2 py-1 rounded-full text-xs font-medium border border-gray-100">
                  <AlertCircle className="h-3 w-3" />
                  {limitationCount}
                </div>
              )}
              
              <div className="text-sm text-gray-500">
                {template.pointsCost === "0" ? (
                  <span className="text-green-600 font-medium">Free</span>
                ) : (
                  <span>{template.pointsCost} points</span>
                )}
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              onClick={(e) => {
                e.stopPropagation()
                handleRewardClick(template)
              }}
            >
              Use Template
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="p-6">
        <PageHeader
          title="Rewards Library"
          subtitle="Browse and create rewards from pre-made templates"
        >
          <Button onClick={() => setIsCreateRewardOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Reward
          </Button>
        </PageHeader>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all">All Templates</TabsTrigger>
              <TabsTrigger value="welcome">Welcome</TabsTrigger>
              <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
              <TabsTrigger value="spending">Spending</TabsTrigger>
              <TabsTrigger value="birthday">Birthday</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search templates..." 
                className="pl-9 h-9 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="border rounded-md flex">
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-none rounded-l-md",
                  viewType === "grid" && "bg-muted"
                )}
                onClick={() => setViewType("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                className={cn(
                  "h-9 w-9 rounded-none rounded-r-md",
                  viewType === "list" && "bg-muted"
                )}
                onClick={() => setViewType("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
              open={isCreateRewardOpen}
              onOpenChange={setIsCreateRewardOpen}
              defaultValues={selectedReward}
            />
          </>
        )}
      </div>
    </PageTransition>
  )
} 