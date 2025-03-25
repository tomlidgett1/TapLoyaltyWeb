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
  ListFilter,
  Check
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"

// Types
type RuleCategory = "all" | "active" | "inactive"
type SortField = "name" | "pointsmultiplier" | "usageCount" | "createdAt"
type SortDirection = "asc" | "desc"

interface PointsRule {
  id: string
  name: string
  description?: string
  pointsmultiplier: number
  usageCount: number
  active: boolean
  createdAt: Date
  conditions?: Array<{
    type: string
    startTime?: any
    endTime?: any
    days?: string[]
    amount?: number
    number?: number
  }>
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null)
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)

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
          
          // Handle different date formats safely
          const getDateSafely = (dateField: any): Date => {
            if (!dateField) return new Date();
            
            // If it's a Firestore timestamp with toDate method
            if (dateField && typeof dateField.toDate === 'function') {
              return dateField.toDate();
            }
            
            // If it's a string or number timestamp
            if (typeof dateField === 'string' || typeof dateField === 'number') {
              const date = new Date(dateField);
              return isNaN(date.getTime()) ? new Date() : date;
            }
            
            // If it's a seconds-based Firestore timestamp
            if (dateField.seconds) {
              return new Date(dateField.seconds * 1000);
            }
            
            return new Date();
          };
          
          fetchedRules.push({
            id: doc.id,
            name: data.name || 'Unnamed Rule',
            description: data.description || '',
            pointsmultiplier: data.pointsmultiplier || 0,
            usageCount: data.usageCount || 0,
            active: data.active === undefined ? true : data.active,
            createdAt: getDateSafely(data.createdAt),
            conditions: data.conditions || []
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
              pointsmultiplier: 10,
              usageCount: 156,
              active: true,
              createdAt: new Date(),
              conditions: [{ type: "purchase" }]
            },
            {
              id: "mock2",
              name: "Referral Bonus",
              description: "Earn points when you refer a friend",
              pointsmultiplier: 50,
              usageCount: 23,
              active: true,
              createdAt: new Date(),
              conditions: [{ type: "referral" }]
            },
            {
              id: "mock3",
              name: "Birthday Bonus",
              description: "Earn extra points on your birthday",
              pointsmultiplier: 100,
              usageCount: 42,
              active: true,
              createdAt: new Date(),
              conditions: [{ type: "engagement" }]
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

  // Clear selections when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedRules([])
    }
  }, [selectionMode])

  // Filter and sort rules
  const filteredRules = rules.filter(rule => {
    // Filter by search query
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Filter by category
    const matchesCategory = 
      ruleCategory === "all" || 
      (ruleCategory === "active" && rule.active) ||
      (ruleCategory === "inactive" && !rule.active)
    
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    // Sort by selected field
    let comparison = 0
    
    switch (sortField) {
      case "name":
        comparison = a.name.localeCompare(b.name)
        break
      case "pointsmultiplier":
        comparison = a.pointsmultiplier - b.pointsmultiplier
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

  const toggleRuleStatus = async (id: string, currentStatus: boolean) => {
    if (!user?.uid) return
    
    try {
      const newStatus = !currentStatus
      const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id)
      await updateDoc(ruleRef, { 
        active: newStatus,
        updatedAt: new Date()
      })
      
      // Update local state
      setRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, active: newStatus, updatedAt: new Date() } : rule
      ))
    } catch (error) {
      console.error("Error updating rule status:", error)
    }
  }

  const confirmDeleteRule = (id: string) => {
    setRuleToDelete(id)
    setDeleteDialogOpen(true)
  }

  const handleDeleteRule = async () => {
    if (!user?.uid || !ruleToDelete) return
    
    try {
      const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', ruleToDelete)
      await deleteDoc(ruleRef)
      
      // Update local state
      setRules(prev => prev.filter(rule => rule.id !== ruleToDelete))
    } catch (error) {
      console.error("Error deleting points rule:", error)
    } finally {
      setRuleToDelete(null)
      setDeleteDialogOpen(false)
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

  const handleSelectRule = (id: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedRules(prev => [...prev, id])
    } else {
      setSelectedRules(prev => prev.filter(ruleId => ruleId !== id))
    }
  }

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRules(filteredRules.map(rule => rule.id))
    } else {
      setSelectedRules([])
    }
  }

  const confirmBulkDelete = () => {
    if (selectedRules.length > 0) {
      setBulkDeleteDialogOpen(true)
    }
  }

  const handleBulkDelete = async () => {
    if (!user?.uid || selectedRules.length === 0) return
    
    try {
      // Delete each selected rule
      for (const ruleId of selectedRules) {
        const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', ruleId)
        await deleteDoc(ruleRef)
      }
      
      // Update local state
      setRules(prev => prev.filter(rule => !selectedRules.includes(rule.id)))
      setSelectedRules([]) // Clear selection
    } catch (error) {
      console.error("Error deleting points rules:", error)
    } finally {
      setBulkDeleteDialogOpen(false)
    }
  }

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev)
  }

  // Calculate the total number of columns based on selection mode
  const totalColumns = selectionMode ? 8 : 7;

  const formatTimeRange = (startTime: any, endTime: any) => {
    try {
      const formatTime = (time: any) => {
        if (!time) return "?";
        
        let date: Date;
        
        if (time && typeof time.toDate === 'function') {
          date = time.toDate();
        } else if (time.seconds) {
          date = new Date(time.seconds * 1000);
        } else if (time instanceof Date) {
          date = time;
        } else {
          return "?";
        }
        
        const hours = date.getHours();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour = hours % 12 || 12;
        return `${hour}${ampm}`;
      };
      
      return `${formatTime(startTime)}-${formatTime(endTime)}`;
    } catch (error) {
      return "Invalid time";
    }
  };

  const formatDays = (days: string[] | undefined) => {
    if (!days || days.length === 0) return "None";
    
    if (days.length === 7) return "All days";
    
    if (days.length <= 2) {
      return days.map(day => day.charAt(0).toUpperCase() + day.slice(1, 3)).join(", ");
    }
    
    return `${days.length} days`;
  };

  // Helper function to determine the primary rule type from conditions
  const getRuleType = (rule: PointsRule): string => {
    if (!rule.conditions || rule.conditions.length === 0) return "other";
    
    // Check for specific condition types
    if (rule.conditions.some(c => c.type === "minimumSpend")) return "purchase";
    if (rule.conditions.some(c => c.type === "firstPurchase")) return "purchase";
    if (rule.conditions.some(c => c.type === "visitNumber")) return "engagement";
    if (rule.conditions.some(c => c.type === "daysOfWeek")) return "engagement";
    if (rule.conditions.some(c => c.type === "timeOfDay")) return "engagement";
    
    // Default to the first condition type
    return rule.conditions[0].type;
  };

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
            
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={toggleSelectionMode}
                    className="h-9 rounded-md"
                  >
                    Cancel
                  </Button>
                  
                  {selectedRules.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={confirmBulkDelete}
                      className="h-9 rounded-md"
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedRules.length})
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleSelectionMode}
                  className="h-9 rounded-md"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Select
                </Button>
              )}
              
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
          </div>
          
          <TabsContent value="all" className="mt-0">
            <Card className="rounded-lg overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {selectionMode && (
                        <TableHead className="w-[40px]">
                          <Checkbox 
                            checked={
                              selectedRules.length > 0 && 
                              selectedRules.length === filteredRules.length
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRules(filteredRules.map(rule => rule.id))
                              } else {
                                setSelectedRules([])
                              }
                            }}
                          />
                        </TableHead>
                      )}
                      <TableHead>
                        <SortButton field="name">Rule Name</SortButton>
                      </TableHead>
                      <TableHead>
                        <SortButton field="pointsmultiplier">Multiplier</SortButton>
                      </TableHead>
                      <TableHead>Conditions</TableHead>
                      <TableHead>
                        <SortButton field="usageCount">Usage Count</SortButton>
                      </TableHead>
                      <TableHead>
                        <span>Status</span>
                      </TableHead>
                      <TableHead>
                        <SortButton field="createdAt">Created</SortButton>
                      </TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={totalColumns} className="h-24 text-center">
                          <div className="flex justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={totalColumns} className="h-24 text-center">
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
                        <TableRow 
                          key={rule.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/store/rules/${rule.id}`)}
                        >
                          {selectionMode && (
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedRules.includes(rule.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedRules([...selectedRules, rule.id])
                                  } else {
                                    setSelectedRules(selectedRules.filter(id => id !== rule.id))
                                  }
                                }}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="font-medium">{rule.name}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span>{rule.pointsmultiplier}x</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {rule.conditions?.map((condition, index) => {
                                if (condition.type === "timeOfDay") {
                                  return (
                                    <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      Time: {formatTimeRange(condition.startTime, condition.endTime)}
                                    </Badge>
                                  );
                                } else if (condition.type === "daysOfWeek") {
                                  return (
                                    <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Days: {formatDays(condition.days)}
                                    </Badge>
                                  );
                                } else if (condition.type === "minimumSpend") {
                                  return (
                                    <Badge key={index} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      Min: ${condition.amount}
                                    </Badge>
                                  );
                                } else if (condition.type === "firstPurchase") {
                                  return (
                                    <Badge key={index} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                      First Purchase
                                    </Badge>
                                  );
                                } else if (condition.type === "visitNumber") {
                                  return (
                                    <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                      Visit #{condition.number}
                                    </Badge>
                                  );
                                }
                                return null;
                              })}
                              {(!rule.conditions || rule.conditions.length === 0) && (
                                <span className="text-sm text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {rule.usageCount}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "rounded-md",
                              rule.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                            )}>
                              {rule.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatDate(rule.createdAt)}
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/store/rules/${rule.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/store/rules/${rule.id}/edit`)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setRuleToDelete(rule.id)
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                            getRuleType(rule) === "purchase" && "bg-green-50 text-green-700 border-green-200",
                            getRuleType(rule) === "referral" && "bg-blue-50 text-blue-700 border-blue-200",
                            getRuleType(rule) === "engagement" && "bg-purple-50 text-purple-700 border-purple-200"
                          )}>
                            <div className="flex items-center gap-1">
                              {getRuleTypeIcon(getRuleType(rule))}
                              <span>{getRuleTypeLabel(getRuleType(rule))}</span>
                            </div>
                          </Badge>
                          
                          <Badge variant="outline" className={cn(
                            "rounded-md",
                            rule.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                          )}>
                            {rule.active ? "Active" : "Inactive"}
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
                                <span className="font-medium">{rule.pointsmultiplier}x</span>
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
                          onClick={() => window.location.href = `/store/rules/${rule.id}`}
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
                            <DropdownMenuItem onClick={() => window.location.href = `/store/rules/${rule.id}/edit`}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleRuleStatus(rule.id, rule.active)}>
                              {rule.active ? (
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
                              onClick={() => confirmDeleteRule(rule.id)}
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
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Points Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this points rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteRule}
              className="bg-red-600 hover:bg-red-700 rounded-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="rounded-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Multiple Points Rules</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedRules.length} selected points rules? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              className="bg-red-600 hover:bg-red-700 rounded-md"
            >
              Delete {selectedRules.length} Rules
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <CreatePointsRuleDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen} 
      />
    </div>
  )
} 