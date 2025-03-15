"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Zap,
  ShoppingCart,
  Calendar,
  Clock,
  Edit,
  Trash,
  Eye,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Tag,
  DollarSign,
  Users,
  ListFilter
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"

// Types
type RuleCategory = "all" | "active" | "inactive"
type SortField = "name" | "type" | "points" | "usageCount" | "createdAt"
type SortDirection = "asc" | "desc"

interface PointsRule {
  id: string
  name: string
  description: string
  type: "purchase" | "referral" | "engagement" | "other"
  points: number
  usageCount: number
  status: "active" | "inactive" | "draft"
  createdAt: Date
  updatedAt: Date
  conditions?: {
    minPurchase?: number
    maxPoints?: number
    frequency?: string
  }
}

export default function PointsRulesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [rules, setRules] = useState<PointsRule[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [ruleCategory, setRuleCategory] = useState<RuleCategory>("all")
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    const fetchRules = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const rulesRef = collection(db, 'merchants', user.uid, 'pointsRules')
        const q = query(rulesRef)
        const querySnapshot = await getDocs(q)
        
        console.log(`Found ${querySnapshot.size} points rules`)
        
        const fetchedRules: PointsRule[] = []
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          
          fetchedRules.push({
            id: doc.id,
            name: data.name || 'Unnamed Rule',
            description: data.description || '',
            type: data.type || 'purchase',
            points: data.points || 0,
            usageCount: data.usageCount || 0,
            status: data.status || 'active',
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
            conditions: data.conditions || {}
          })
        })
        
        setRules(fetchedRules)
        
        // If no rules found, add some mock data for testing
        if (fetchedRules.length === 0) {
          console.log("No points rules found, adding mock data")
          setRules([
            {
              id: "mock1",
              name: "Purchase Points",
              description: "Earn points for every purchase",
              type: "purchase",
              points: 10,
              usageCount: 156,
              status: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
              conditions: {
                minPurchase: 1
              }
            },
            {
              id: "mock2",
              name: "Referral Bonus",
              description: "Earn points when you refer a friend",
              type: "referral",
              points: 50,
              usageCount: 23,
              status: "active",
              createdAt: new Date(),
              updatedAt: new Date()
            },
            {
              id: "mock3",
              name: "Birthday Bonus",
              description: "Earn extra points on your birthday",
              type: "engagement",
              points: 100,
              usageCount: 42,
              status: "active",
              createdAt: new Date(),
              updatedAt: new Date(),
              conditions: {
                frequency: "yearly"
              }
            }
          ])
        }
      } catch (error) {
        console.error("Error fetching points rules:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRules()
  }, [user])

  // Filter and sort rules
  const filteredRules = rules.filter(rule => {
    // Filter by search query
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by category
    const matchesCategory = 
      ruleCategory === "all" || 
      (ruleCategory === "active" && rule.status === "active") ||
      (ruleCategory === "inactive" && rule.status === "inactive")
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // Sort by selected field
    let comparison = 0
    
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "type":
        comparison = a.type.localeCompare(b.type)
        break
      case "points":
        comparison = a.points - b.points
        break
      case "usageCount":
        comparison = a.usageCount - b.usageCount
        break
      case "createdAt":
        comparison = a.createdAt.getTime() - b.createdAt.getTime()
        break
      default:
        comparison = 0
    }
    
    // Apply sort direction
    return sortDirection === "asc" ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const toggleRuleStatus = async (id: string, currentStatus: string) => {
    if (!user?.uid) return
    
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active"
      const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id)
      await updateDoc(ruleRef, { 
        status: newStatus,
        updatedAt: new Date()
      })
      
      // Update local state
      setRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, status: newStatus, updatedAt: new Date() } : rule
      ))
    } catch (error) {
      console.error("Error updating rule status:", error)
    }
  }

  const deleteRule = async (id: string) => {
    if (!user?.uid || !confirm("Are you sure you want to delete this points rule? This action cannot be undone.")) return
    
    try {
      const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id)
      await deleteDoc(ruleRef)
      
      // Update local state
      setRules(prev => prev.filter(rule => rule.id !== id))
    } catch (error) {
      console.error("Error deleting points rule:", error)
    }
  }

  const formatDate = (date: Date) => {
    return format(date, "MMM d, yyyy")
  }

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return <ShoppingCart className="h-4 w-4" />
      case "referral":
        return <Users className="h-4 w-4" />
      case "engagement":
        return <Calendar className="h-4 w-4" />
      default:
        return <Zap className="h-4 w-4" />
    }
  }

  const getRuleTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "Purchase"
      case "referral":
        return "Referral"
      case "engagement":
        return "Engagement"
      default:
        return "Other"
    }
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {children}
      {sortField === field && (
        sortDirection === "desc" ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronUp className="h-4 w-4" />
      )}
    </button>
  )

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Points Rules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage how customers earn and redeem points
            </p>
          </div>
          
          <Button 
            className="h-9 gap-2 rounded-md"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Rule
          </Button>
        </div>
        
        <Tabs defaultValue="all" onValueChange={(value) => setRuleCategory(value as RuleCategory)}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="h-9 rounded-md">
              <TabsTrigger value="all" className="flex items-center gap-1.5">
                <ListFilter className="h-4 w-4" />
                All Rules
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-1.5">
                <Zap className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger value="inactive" className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Inactive
              </TabsTrigger>
            </TabsList>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder="Search rules..." 
                className="w-[250px] pl-9 h-9 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <Card className="rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">
                        <SortButton field="name">Rule Name</SortButton>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">
                        <SortButton field="points">Points</SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton field="usageCount">Usage Count</SortButton>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <SortButton field="createdAt">Created</SortButton>
                      </TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                              <Zap className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="mt-4 text-lg font-medium">No points rules found</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              {searchQuery ? "Try adjusting your search query" : "Create your first points rule to get started"}
                            </p>
                            {!searchQuery && (
                              <Button 
                                className="mt-4 h-9 gap-2 rounded-md"
                                onClick={() => setCreateDialogOpen(true)}
                              >
                                <Plus className="h-4 w-4" />
                                Create Rule
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <div className="h-9 w-9 min-w-[36px] rounded-md bg-muted flex items-center justify-center">
                                {getRuleTypeIcon(rule.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate">{rule.name}</div>
                                <div className="text-xs text-muted-foreground line-clamp-1">{rule.description}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              rule.type === "purchase" && "bg-green-50 text-green-700 border-green-200",
                              rule.type === "referral" && "bg-blue-50 text-blue-700 border-blue-200",
                              rule.type === "engagement" && "bg-purple-50 text-purple-700 border-purple-200"
                            )}>
                              <div className="flex items-center gap-1">
                                {getRuleTypeIcon(rule.type)}
                                <span>{getRuleTypeLabel(rule.type)}</span>
                              </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span>{rule.points}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{rule.usageCount}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              rule.status === "active" && "bg-green-50 text-green-700 border-green-200",
                              rule.status === "inactive" && "bg-gray-50 text-gray-700 border-gray-200",
                              rule.status === "draft" && "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {rule.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(rule.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0 rounded-md">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-md">
                                  <DropdownMenuItem onClick={() => router.push(`/rules/${rule.id}`)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => router.push(`/rules/${rule.id}/edit`)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleRuleStatus(rule.id, rule.status)}>
                                    {rule.status === "active" ? (
                                      <>
                                        <Clock className="h-4 w-4 mr-2" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <Zap className="h-4 w-4 mr-2" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem 
                                    className="text-red-600"
                                    onClick={() => deleteRule(rule.id)}
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Individual tabs for each rule category */}
          {["purchase", "referral", "engagement"].map((category) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                  <div className="col-span-full h-40 flex items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                  </div>
                ) : filteredRules.length === 0 ? (
                  <div className="col-span-full h-40 flex flex-col items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      {category === "purchase" ? (
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      ) : category === "referral" ? (
                        <Users className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="mt-4 text-lg font-medium">
                      No {category} rules found
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? "Try adjusting your search query" : `Create your first ${category} rule`}
                    </p>
                    {!searchQuery && (
                      <Button 
                        className="mt-4 h-9 gap-2 rounded-md"
                        onClick={() => setCreateDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Create {category.charAt(0).toUpperCase() + category.slice(1)} Rule
                      </Button>
                    )}
                  </div>
                ) : (
                  filteredRules.map((rule) => (
                    <Card key={rule.id} className="rounded-lg overflow-hidden">
                      <CardHeader className="p-4 pb-0">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline" className={cn(
                            "rounded-md mb-2",
                            rule.type === "purchase" && "bg-green-50 text-green-700 border-green-200",
                            rule.type === "referral" && "bg-blue-50 text-blue-700 border-blue-200",
                            rule.type === "engagement" && "bg-purple-50 text-purple-700 border-purple-200"
                          )}>
                            <div className="flex items-center gap-1">
                              {getRuleTypeIcon(rule.type)}
                              <span>{getRuleTypeLabel(rule.type)}</span>
                            </div>
                          </Badge>
                          
                          <Badge variant="outline" className={cn(
                            "rounded-md",
                            rule.status === "active" && "bg-green-50 text-green-700 border-green-200",
                            rule.status === "inactive" && "bg-gray-50 text-gray-700 border-gray-200",
                            rule.status === "draft" && "bg-amber-50 text-amber-700 border-amber-200"
                          )}>
                            {rule.status}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {rule.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm text-muted-foreground">Points Awarded</p>
                            <div className="flex items-center mt-1">
                              <div className="flex items-center gap-1">
                                <Zap className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{rule.points}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Usage Count</p>
                            <p className="font-medium mt-1">{rule.usageCount}</p>
                          </div>
                        </div>
                        
                        {rule.conditions && rule.conditions.minPurchase && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground mb-1">
                              Min. Purchase: ${rule.conditions.minPurchase}
                            </p>
                          </div>
                        )}
                        
                        {rule.conditions && rule.conditions.frequency && (
                          <div className="mt-3">
                            <p className="text-sm text-muted-foreground mb-1">
                              Frequency: {rule.conditions.frequency}
                            </p>
                          </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex justify-between">
                        <Button 
                          variant="outline" 
                          className="h-9 rounded-md"
                          onClick={() => router.push(`/rules/${rule.id}`)}
                        >
                          View Details
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-9 w-9 p-0 rounded-md">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-md">
                            <DropdownMenuItem onClick={() => router.push(`/rules/${rule.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleRuleStatus(rule.id, rule.status)}>
                              {rule.status === "active" ? (
                                <>
                                  <Clock className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => deleteRule(rule.id)}
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
      <CreatePointsRuleDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  )
} 