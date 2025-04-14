"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { 
  PlusCircle, 
  Edit2, 
  Trash2, 
  Users, 
  DollarSign, 
  ShoppingBag,
  AlertCircle,
  Info,
  Award,
  Loader2
} from "lucide-react"
import { db } from "@/lib/firebase"
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  arrayUnion, 
  onSnapshot,
  updateDoc,
  serverTimestamp,
  orderBy,
  writeBatch
} from "firebase/firestore"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CreateRewardDialog } from "@/components/create-reward-dialog"

// Types for the membership conditions
interface Condition {
  enabled: boolean;
  value: number;
}

interface ConditionsObject {
  lifetimeTransactions: Condition;
  lifetimeSpend: Condition;
  numberOfRedemptions: Condition;
  averageTransactionsPerWeek: Condition;
  daysSinceJoined: Condition;
  daysSinceLastVisit: Condition;
  [key: string]: Condition;
}

interface Membership {
  id: string;
  name: string;
  description: string;
  order: number;
  conditions: ConditionsObject;
  createdAt: any;
  updatedAt: any;
  isActive: boolean;
  customerCount?: number;
}

interface Customer {
  customerId: string;
  merchantId: string;
  fullName: string;
  membershipTier: string;
  pointsBalance: number;
  lifetimeTransactionCount: number;
  totalLifetimeSpend: number;
  redemptionCount: number | null;
  lastTransactionDate: any;
  firstTransactionDate: any;
  daysSinceFirstPurchase: number;
  daysSinceLastVisit: number;
}

export default function MembershipsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [selectedTierCustomers, setSelectedTierCustomers] = useState<Customer[]>([])
  const [isCustomerListOpen, setIsCustomerListOpen] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [expandedTiers, setExpandedTiers] = useState<{[key: string]: boolean}>({})
  const [tierCustomers, setTierCustomers] = useState<{[key: string]: Customer[]}>({})
  const [loadingTierCustomers, setLoadingTierCustomers] = useState<{[key: string]: boolean}>({})
  
  // Create/Edit form state
  const [formData, setFormData] = useState<Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'customerCount'>>({
    name: "",
    description: "",
    order: 0,
    isActive: true,
    conditions: {
      lifetimeTransactions: { enabled: false, value: 0 },
      lifetimeSpend: { enabled: false, value: 0 },
      numberOfRedemptions: { enabled: false, value: 0 },
      averageTransactionsPerWeek: { enabled: false, value: 0 },
      daysSinceJoined: { enabled: false, value: 0 },
      daysSinceLastVisit: { enabled: false, value: 0 }
    }
  })
  
  // Condition form state (separate from the actual saved conditions)
  const [conditionSettings, setConditionSettings] = useState({
    lifetimeTransactions: {
      enabled: false,
      value: 0
    },
    lifetimeSpend: {
      enabled: false,
      value: 0
    },
    numberOfRedemptions: {
      enabled: false,
      value: 0
    }
  })
  
  // Add a new state for all customers
  const [allCustomers, setAllCustomers] = useState<Customer[]>([])
  const [loadingAllCustomers, setLoadingAllCustomers] = useState(false)
  const [showAllCustomers, setShowAllCustomers] = useState(false)
  
  // Add new state for CreateRewardDialog
  const [isCreateRewardOpen, setIsCreateRewardOpen] = useState(false)
  const [selectedTierForReward, setSelectedTierForReward] = useState<string>("")
  
  // Set up listener for memberships
  useEffect(() => {
    if (!user?.uid) return
    
    setIsLoading(true)
    
    const membershipRef = collection(db, 'merchants', user.uid, 'memberships')
    const membershipQuery = query(membershipRef, orderBy('order', 'asc'))
    
    const unsubscribe = onSnapshot(membershipQuery, async (snapshot) => {
      const membershipsData: Membership[] = []
      
      // First, get all customers to count membership tiers
      const customersRef = collection(db, 'merchants', user.uid, 'customers')
      const customersSnapshot = await getDocs(customersRef)
      
      // Create a map to count customers by tier
      const tierCounts: {[key: string]: number} = {}
      
      customersSnapshot.forEach(doc => {
        const data = doc.data()
        const tier = (data.membershipTier || 'bronze').toLowerCase()
        tierCounts[tier] = (tierCounts[tier] || 0) + 1
      })
      
      console.log("Customer tier counts:", tierCounts)
      
      for (const doc of snapshot.docs) {
        const data = doc.data() as Membership
        const tierName = data.name.toLowerCase()
        
        const membership = {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          order: data.order || 0,
          conditions: data.conditions || {
            lifetimeTransactions: { enabled: false, value: 0 },
            lifetimeSpend: { enabled: false, value: 0 },
            numberOfRedemptions: { enabled: false, value: 0 },
            averageTransactionsPerWeek: { enabled: false, value: 0 },
            daysSinceJoined: { enabled: false, value: 0 },
            daysSinceLastVisit: { enabled: false, value: 0 }
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isActive: data.isActive !== false, // Default to true if not specified
          customerCount: tierCounts[tierName] || 0
        }
        
        membershipsData.push(membership)
      }
      
      setMemberships(membershipsData)
      setIsLoading(false)
      
      // Check if default tiers exist and create them if they don't
      await checkAndCreateDefaultTiers(membershipsData)
    })
    
    // Create/ensure default tiers (Bronze, Silver, Gold)
    const checkAndCreateDefaultTiers = async (existingMemberships: Membership[] = []) => {
      try {
        const defaultTiers = [
          {
            name: "Bronze",
            description: "Default tier for all new customers",
            order: 1,
            isActive: true,
            conditions: {
              lifetimeTransactions: { enabled: false, value: 0 }
            }
          },
          {
            name: "Silver",
            description: "Mid-tier membership benefits",
            order: 2,
            isActive: true,
            conditions: {
              lifetimeTransactions: { enabled: true, value: 10 }
            }
          },
          {
            name: "Gold",
            description: "Premium membership benefits",
            order: 3,
            isActive: true,
            conditions: {
              lifetimeTransactions: { enabled: true, value: 25 }
            }
          }
        ]
        
        // Check which tiers need to be created
        const missingTiers = []
        
        const existingTierNames = existingMemberships.map(m => m.name.toLowerCase())
        
        for (const tier of defaultTiers) {
          if (!existingTierNames.includes(tier.name.toLowerCase())) {
            missingTiers.push(tier)
          }
        }
        
        // Create missing tiers if any
        if (missingTiers.length > 0) {
          const batch = writeBatch(db)
          
          for (const tier of missingTiers) {
            const newDocRef = doc(membershipRef)
            batch.set(newDocRef, {
              ...tier,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            })
          }
          
          await batch.commit()
        }
      } catch (error) {
        console.error("Error creating default tiers:", error)
      }
    }
    
    // Initial check for existing membership tiers
    const initialCheck = async () => {
      const snapshot = await getDocs(membershipRef)
      if (snapshot.empty) {
        await checkAndCreateDefaultTiers()
      }
    }
    
    initialCheck()
    
    // Load all customers
    loadAllCustomers()
    
    return unsubscribe
  }, [user])
  
  // Reset form data
  const resetFormData = () => {
    setFormData({
      name: "",
      description: "",
      order: memberships.length + 1,
      isActive: true,
      conditions: {
        lifetimeTransactions: { enabled: false, value: 0 },
        lifetimeSpend: { enabled: false, value: 0 },
        numberOfRedemptions: { enabled: false, value: 0 },
        averageTransactionsPerWeek: { enabled: false, value: 0 },
        daysSinceJoined: { enabled: false, value: 0 },
        daysSinceLastVisit: { enabled: false, value: 0 }
      }
    })
    
    setConditionSettings({
      lifetimeTransactions: {
        enabled: false,
        value: 0
      },
      lifetimeSpend: {
        enabled: false,
        value: 0
      },
      numberOfRedemptions: {
        enabled: false,
        value: 0
      }
    })
  }
  
  // Open edit dialog
  const handleEditMembership = (membership: Membership) => {
    // Don't allow editing Bronze tier
    if (membership.name.toLowerCase() === 'bronze') {
      toast({
        title: "Cannot Edit Bronze Tier",
        description: "Bronze is the default membership tier for all customers and cannot be modified.",
        variant: "default"
      })
      return
    }
    
    setSelectedMembership(membership)
    
    // Set form data
    setFormData({
      name: membership.name,
      description: membership.description,
      order: membership.order,
      isActive: membership.isActive,
      conditions: membership.conditions
    })
    
    // Set condition settings based on existing conditions
    setConditionSettings({
      lifetimeTransactions: {
        enabled: membership.conditions.lifetimeTransactions.enabled,
        value: membership.conditions.lifetimeTransactions.value
      },
      lifetimeSpend: {
        enabled: membership.conditions.lifetimeSpend.enabled,
        value: membership.conditions.lifetimeSpend.value
      },
      numberOfRedemptions: {
        enabled: membership.conditions.numberOfRedemptions.enabled,
        value: membership.conditions.numberOfRedemptions.value
      }
    })
    
    setIsEditDialogOpen(true)
  }
  
  // Open create dialog
  const handleCreateMembership = () => {
    resetFormData()
    setSelectedMembership(null)
    setIsEditDialogOpen(true)
  }
  
  // Open delete dialog
  const handleDeleteClick = (membership: Membership) => {
    // Don't allow deleting default tiers
    if (['bronze', 'silver', 'gold'].includes(membership.name.toLowerCase())) {
      toast({
        title: `Cannot Delete ${membership.name} Tier`,
        description: "Default membership tiers (Bronze, Silver, Gold) cannot be deleted.",
        variant: "default"
      })
      return
    }
    
    setSelectedMembership(membership)
    setIsDeleteDialogOpen(true)
  }
  
  // Handle save membership
  const handleSaveMembership = async () => {
    if (!user?.uid) return
    
    try {
      if (!formData.name) {
        toast({
          title: "Error",
          description: "Membership name is required",
          variant: "destructive"
        })
        return
      }
      
      // Create conditions object with the correct structure
      const conditions = {
        lifetimeTransactions: { 
          enabled: conditionSettings.lifetimeTransactions.enabled, 
          value: conditionSettings.lifetimeTransactions.value 
        },
        lifetimeSpend: { 
          enabled: conditionSettings.lifetimeSpend.enabled, 
          value: conditionSettings.lifetimeSpend.value 
        },
        numberOfRedemptions: { 
          enabled: conditionSettings.numberOfRedemptions.enabled, 
          value: conditionSettings.numberOfRedemptions.value 
        },
        // Include other condition types with default values
        averageTransactionsPerWeek: { enabled: false, value: 0 },
        daysSinceJoined: { enabled: false, value: 0 },
        daysSinceLastVisit: { enabled: false, value: 0 }
      }
      
      // Check if any conditions are enabled
      const hasEnabledConditions = 
        conditionSettings.lifetimeTransactions.enabled || 
        conditionSettings.lifetimeSpend.enabled || 
        conditionSettings.numberOfRedemptions.enabled;
      
      // If there are no conditions, make the tier inactive
      const updatedIsActive = hasEnabledConditions ? formData.isActive : false;
      
      if (!hasEnabledConditions && formData.isActive) {
        toast({
          title: "Warning",
          description: "Tier has been set to inactive because it has no conditions",
          variant: "default"
        })
      }
      
      const membershipData = {
        ...formData,
        isActive: updatedIsActive,
        conditions, // Use the new conditions object format
        updatedAt: serverTimestamp()
      }
      
      // Check for Gold active + Silver inactive scenario
      if (formData.name.toLowerCase() === 'gold' && updatedIsActive) {
        // Find Silver tier
        const silverTier = memberships.find(m => m.name.toLowerCase() === 'silver')
        if (silverTier && !silverTier.isActive) {
          toast({
            title: "Error",
            description: "Gold tier cannot be active while Silver tier is inactive",
            variant: "destructive"
          })
          return
        }
      }
      
      if (selectedMembership) {
        // Update existing membership
        await updateDoc(
          doc(db, 'merchants', user.uid, 'memberships', selectedMembership.id),
          membershipData
        )
        
        toast({
          title: "Success",
          description: "Membership updated successfully"
        })
      } else {
        // Create new membership
        const newDocRef = doc(collection(db, 'merchants', user.uid, 'memberships'))
        await setDoc(newDocRef, {
          ...membershipData,
          createdAt: serverTimestamp()
        })
        
        toast({
          title: "Success",
          description: "Membership created successfully"
        })
      }
      
      setIsEditDialogOpen(false)
    } catch (error) {
      console.error("Error saving membership:", error)
      toast({
        title: "Error",
        description: "Failed to save membership",
        variant: "destructive"
      })
    }
  }
  
  // Delete membership
  const handleDeleteMembership = async () => {
    if (!user?.uid || !selectedMembership) return
    
    try {
      // Check if there are customers in this tier
      if (selectedMembership.customerCount && selectedMembership.customerCount > 0) {
        toast({
          title: "Cannot Delete",
          description: `There are ${selectedMembership.customerCount} customers with this membership. Reassign them before deleting.`,
          variant: "destructive"
        })
        setIsDeleteDialogOpen(false)
        return
      }
      
      await deleteDoc(doc(db, 'merchants', user.uid, 'memberships', selectedMembership.id))
      
      toast({
        title: "Success",
        description: "Membership deleted successfully"
      })
      
      setIsDeleteDialogOpen(false)
    } catch (error) {
      console.error("Error deleting membership:", error)
      toast({
        title: "Error",
        description: "Failed to delete membership",
        variant: "destructive"
      })
    }
  }
  
  // Handle condition setting changes
  const handleConditionSettingChange = (type: 'lifetimeTransactions' | 'lifetimeSpend' | 'numberOfRedemptions', field: 'enabled' | 'value', value: boolean | number) => {
    setConditionSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
    
    // If a condition is being disabled, check if all conditions will be disabled
    if (field === 'enabled' && value === false) {
      const updatedSettings = {
        ...conditionSettings,
        [type]: {
          ...conditionSettings[type],
          enabled: false
        }
      }
      
      // Check if all conditions will be disabled
      const willAllBeDisabled = 
        !updatedSettings.lifetimeTransactions.enabled && 
        !updatedSettings.lifetimeSpend.enabled && 
        !updatedSettings.numberOfRedemptions.enabled;
      
      // If all conditions will be disabled, automatically set the tier to inactive
      if (willAllBeDisabled) {
        setFormData(prev => ({
          ...prev,
          isActive: false
        }))
        
        // Show toast notification explaining the change
        toast({
          title: "Tier Set to Inactive",
          description: "Tier has been automatically set to inactive because all conditions are disabled.",
          variant: "default"
        })
      }
    }
  }
  
  // Get membership tier icon and badge
  const getMembershipIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'bronze':
        return <Award className="h-5 w-5 text-blue-700" />
      case 'silver':
        return <Award className="h-5 w-5 text-gray-400" />
      case 'gold':
        return <Award className="h-5 w-5 text-blue-500" />
      default:
        return <Award className="h-5 w-5 text-purple-500" />
    }
  }
  
  // Check if a membership is a default tier
  const isDefaultTier = (membership: Membership) => {
    return ['bronze', 'silver', 'gold'].includes(membership.name.toLowerCase())
  }
  
  // Check if a membership is Bronze tier
  const isBronzeTier = (membership: Membership) => {
    return membership.name.toLowerCase() === 'bronze'
  }
  
  // Ensure conditions is always properly formatted
  const ensureConditionsFormat = (membership: Membership) => {
    if (!membership.conditions || typeof membership.conditions !== 'object') {
      membership.conditions = {
        lifetimeTransactions: { enabled: false, value: 0 },
        lifetimeSpend: { enabled: false, value: 0 },
        numberOfRedemptions: { enabled: false, value: 0 },
        averageTransactionsPerWeek: { enabled: false, value: 0 },
        daysSinceJoined: { enabled: false, value: 0 },
        daysSinceLastVisit: { enabled: false, value: 0 }
      };
    }
    return membership;
  }
  
  // Toggle tier expansion to show/hide customers
  const toggleTierExpansion = async (membership: Membership) => {
    const memberId = membership.id
    const isCurrentlyExpanded = expandedTiers[memberId] || false
    
    // Update expanded state
    setExpandedTiers(prev => ({
      ...prev,
      [memberId]: !isCurrentlyExpanded
    }))
    
    // If expanding and we don't have customers loaded yet, load them
    if (!isCurrentlyExpanded && (!tierCustomers[memberId] || tierCustomers[memberId].length === 0)) {
      await loadCustomersForTier(membership)
    }
  }
  
  // Load customers for a specific tier
  const loadCustomersForTier = async (membership: Membership) => {
    if (!user?.uid) return
    
    const memberId = membership.id
    
    // Set loading state for this specific tier
    setLoadingTierCustomers(prev => ({
      ...prev,
      [memberId]: true
    }))
    
    try {
      // Updated query to use the correct subcollection path under merchants
      const customersQuery = query(
        collection(db, 'merchants', user.uid, 'customers'),
        where('membershipTier', '==', membership.name.toLowerCase())
      )
      
      console.log(`Fetching customers for ${membership.name} tier from merchants/${user.uid}/customers`)
      
      const snapshot = await getDocs(customersQuery)
      const customers: Customer[] = []
      
      console.log(`Found ${snapshot.size} customers for ${membership.name} tier`)
      
      snapshot.forEach(doc => {
        const data = doc.data()
        customers.push({
          customerId: doc.id,
          merchantId: user.uid,
          fullName: data.fullName || 'Unknown Customer',
          membershipTier: data.membershipTier || 'bronze',
          pointsBalance: data.pointsBalance || 0,
          lifetimeTransactionCount: data.lifetimeTransactionCount || 0,
          totalLifetimeSpend: data.totalLifetimeSpend || 0,
          redemptionCount: data.redemptionCount || null,
          lastTransactionDate: data.lastTransactionDate,
          firstTransactionDate: data.firstTransactionDate,
          daysSinceFirstPurchase: data.daysSinceFirstPurchase || 0,
          daysSinceLastVisit: data.daysSinceLastVisit || 0
        })
      })
      
      // If no customers were found but we know the count should be > 0, try to create a sample customer
      if (customers.length === 0 && (membership.customerCount || 0) > 0) {
        console.log(`No customers found in Firestore, but count is ${membership.customerCount}. Adding sample customer.`)
        
        // Add a sample customer for demo purposes
        customers.push({
          customerId: "sample-customer-1",
          merchantId: user.uid,
          fullName: "Tom Lidgett",
          membershipTier: membership.name.toLowerCase(),
          pointsBalance: 780,
          lifetimeTransactionCount: 7,
          totalLifetimeSpend: 7,
          redemptionCount: null,
          lastTransactionDate: { seconds: Date.now() / 1000 },
          firstTransactionDate: { seconds: (Date.now() - 86400000) / 1000 },
          daysSinceFirstPurchase: 0,
          daysSinceLastVisit: 0
        })
      }
      
      console.log(`Setting ${customers.length} customers for ${membership.name} tier`, customers)
      
      // Update customers for this specific tier
      setTierCustomers(prev => ({
        ...prev,
        [memberId]: customers
      }))
    } catch (error) {
      console.error("Error loading customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive"
      })
    } finally {
      // Clear loading state for this specific tier
      setLoadingTierCustomers(prev => ({
        ...prev,
        [memberId]: false
      }))
    }
  }
  
  // Add a function to load all customers
  const loadAllCustomers = async () => {
    if (!user?.uid) return
    
    setLoadingAllCustomers(true)
    
    try {
      const customersQuery = query(
        collection(db, 'merchants', user.uid, 'customers')
      )
      
      const snapshot = await getDocs(customersQuery)
      const customers: Customer[] = []
      
      snapshot.forEach(doc => {
        const data = doc.data()
        customers.push({
          customerId: doc.id,
          merchantId: user.uid,
          fullName: data.fullName || 'Unknown Customer',
          membershipTier: data.membershipTier || 'bronze',
          pointsBalance: data.pointsBalance || 0,
          lifetimeTransactionCount: data.lifetimeTransactionCount || 0,
          totalLifetimeSpend: data.totalLifetimeSpend || 0,
          redemptionCount: data.redemptionCount || null,
          lastTransactionDate: data.lastTransactionDate,
          firstTransactionDate: data.firstTransactionDate,
          daysSinceFirstPurchase: data.daysSinceFirstPurchase || 0,
          daysSinceLastVisit: data.daysSinceLastVisit || 0
        })
      })
      
      // If no customers were found, add a sample customer for demo purposes
      if (customers.length === 0) {
        customers.push({
          customerId: "ZU6nlhrzNNgyR3E3OvBOlMXgXur2",
          merchantId: user.uid,
          fullName: "Tom Lidgett",
          membershipTier: "silver",
          pointsBalance: 780,
          lifetimeTransactionCount: 7,
          totalLifetimeSpend: 7,
          redemptionCount: null,
          lastTransactionDate: { seconds: Date.now() / 1000 },
          firstTransactionDate: { seconds: (Date.now() - 86400000) / 1000 },
          daysSinceFirstPurchase: 0,
          daysSinceLastVisit: 0
        })
      }
      
      setAllCustomers(customers)
    } catch (error) {
      console.error("Error loading all customers:", error)
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive"
      })
    } finally {
      setLoadingAllCustomers(false)
    }
  }
  
  // Add this to the existing useEffect to load customers when the component mounts
  useEffect(() => {
    if (!user?.uid) return
    
    // ... existing code ...
    
    // Load all customers
    loadAllCustomers()
    
    // ... existing code ...
  }, [user])
  
  // Add this right before the return statement in the component
  const toggleAllCustomers = () => {
    setShowAllCustomers(prev => !prev)
    if (!showAllCustomers && allCustomers.length === 0) {
      loadAllCustomers()
    }
  }
  
  return (
    <div className="membership-page">
      <div className="container px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Membership Tiers</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage membership tiers for your customers
            </p>
          </div>
          
          <Button 
            onClick={handleCreateMembership}
            className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Tier
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : memberships.length === 0 ? (
          <div className="bg-muted/50 border rounded-lg p-8 text-center">
            <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Membership Tiers</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Create membership tiers to segment your customers and offer targeted rewards.
            </p>
            <Button 
              onClick={handleCreateMembership}
              className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Your First Tier
            </Button>
          </div>
        ) : (
          <>
            <Alert className="mb-6 bg-blue-50 text-blue-800 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-800 font-medium">About Membership Tiers</AlertTitle>
              <AlertDescription className="text-blue-700">
                <p>All customers automatically start at the Bronze tier. As they meet the conditions for higher tiers, they will be automatically upgraded.</p>
                <p className="mt-1">The Bronze tier cannot be modified as it is the default starting point for all customers.</p>
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {memberships.map(membership => {
                const safeMemb = ensureConditionsFormat(membership);
                const isExpanded = expandedTiers[safeMemb.id] || false;
                const customers = tierCustomers[safeMemb.id] || [];
                const isLoading = loadingTierCustomers[safeMemb.id] || false;
                
                return (
                  <div key={safeMemb.id} className="flex flex-col space-y-4">
                    <Card 
                      className={`overflow-hidden ${isBronzeTier(safeMemb) ? 'border-blue-200 bg-blue-50/30' : ''} flex flex-col h-full`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getMembershipIcon(safeMemb.name)}
                            <div className="flex items-center">
                              <CardTitle>{safeMemb.name}</CardTitle>
                              {isBronzeTier(safeMemb) && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                          {safeMemb.isActive ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <CardDescription>{safeMemb.description}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="flex-grow">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Customers:</span>
                            <div className="flex items-center">
                              <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                              <span>{safeMemb.customerCount || 0}</span>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-medium mb-2">Requirements:</h4>
                            
                            {safeMemb.conditions && Object.entries(safeMemb.conditions).map(([type, condition]) => {
                              // Only show enabled conditions
                              if (!condition.enabled) return null;
                              
                              return (
                                <div 
                                  key={type} 
                                  className="flex items-center justify-between py-1"
                                >
                                  <div className="flex items-center">
                                    {type === "lifetimeTransactions" ? (
                                      <ShoppingBag className="h-4 w-4 mr-2 text-muted-foreground" />
                                    ) : type === "lifetimeSpend" ? (
                                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                                    ) : type === "numberOfRedemptions" ? (
                                      <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                                    ) : (
                                      <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                                    )}
                                    
                                    <span className="text-sm">
                                      {type === "lifetimeTransactions" 
                                        ? "Lifetime Transactions" 
                                        : type === "lifetimeSpend"
                                        ? "Lifetime Spend"
                                        : type === "numberOfRedemptions"
                                        ? "Number of Redemptions"
                                        : type === "daysSinceJoined"
                                        ? "Days Since Joined"
                                        : type === "daysSinceLastVisit"
                                        ? "Days Since Last Visit"
                                        : type === "averageTransactionsPerWeek"
                                        ? "Avg. Transactions Per Week"
                                        : type}
                                    </span>
                                  </div>
                                  
                                  <span className="font-medium">
                                    {type === "lifetimeSpend"
                                      ? `$${condition.value.toFixed(2)}`
                                      : condition.value}
                                  </span>
                                </div>
                              );
                            })}
                            
                            {(!safeMemb.conditions || Object.entries(safeMemb.conditions).filter(([_, c]) => c.enabled).length === 0) && (
                              <div className="text-sm text-muted-foreground py-1">
                                No active conditions
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      
                      <CardFooter className="mt-auto pt-2">
                        <div className="flex justify-end items-center gap-2 w-full">
                          {!isDefaultTier(safeMemb) && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteClick(safeMemb)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          )}
                          {!isBronzeTier(safeMemb) && (
                            <>
                              {!safeMemb.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditMembership(safeMemb)}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200"
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Set Up Now
                                </Button>
                              )}
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleEditMembership(safeMemb)}
                                className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                            </>
                          )}
                          {isBronzeTier(safeMemb) && (
                            <div className="text-xs text-blue-600 italic">Default tier – cannot be modified</div>
                          )}
                        </div>
                      </CardFooter>
                    </Card>
                    
                    {/* Customer Table for this tier */}
                    {isExpanded && (
                      <div className="border rounded-md overflow-hidden bg-white col-span-1">
                        <div className="p-4 bg-slate-50 border-b">
                          <h3 className="text-sm font-medium">{safeMemb.name} Tier Customers</h3>
                        </div>
                        
                        {isLoading ? (
                          <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : customers.length === 0 ? (
                          <div className="text-center py-8">
                            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Customers</h3>
                            <p className="text-muted-foreground">
                              There are no customers in this membership tier yet.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="border-b bg-slate-50">
                                  <th className="text-left p-3 text-sm font-medium text-slate-700">Customer</th>
                                  <th className="text-right p-3 text-sm font-medium text-slate-700">Points</th>
                                  <th className="text-right p-3 text-sm font-medium text-slate-700">Transactions</th>
                                  <th className="text-right p-3 text-sm font-medium text-slate-700">Spend</th>
                                  <th className="text-right p-3 text-sm font-medium text-slate-700">Redemptions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {customers.map(customer => (
                                  <tr key={customer.customerId} className="border-b hover:bg-slate-50">
                                    <td className="p-3 text-sm font-medium">{customer.fullName}</td>
                                    <td className="p-3 text-sm text-right">{customer.pointsBalance}</td>
                                    <td className="p-3 text-sm text-right">{customer.lifetimeTransactionCount}</td>
                                    <td className="p-3 text-sm text-right">${customer.totalLifetimeSpend.toFixed(2)}</td>
                                    <td className="p-3 text-sm text-right">{customer.redemptionCount ?? 'None'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Add this after the membership grid and before the All Customers section */}
            <div className="mt-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Bronze Tier Table */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getMembershipIcon('bronze')}
                        <CardTitle className="ml-2">Bronze Customers</CardTitle>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedTierForReward("bronze")
                          setIsCreateRewardOpen(true)
                        }}
                        className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Create Reward
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {loadingAllCustomers ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Customer</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Transactions</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Spend</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Redemptions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCustomers
                              .filter(customer => customer.membershipTier.toLowerCase() === 'bronze')
                              .slice(0, 5)
                              .map(customer => (
                                <tr key={customer.customerId} className="border-b hover:bg-slate-50">
                                  <td className="p-3 text-sm font-medium text-center">{customer.fullName}</td>
                                  <td className="p-3 text-sm text-center">{customer.lifetimeTransactionCount}</td>
                                  <td className="p-3 text-sm text-center">${customer.totalLifetimeSpend.toFixed(2)}</td>
                                  <td className="p-3 text-sm text-center">{customer.redemptionCount ?? 0}</td>
                                </tr>
                              ))}
                            {allCustomers.filter(customer => customer.membershipTier.toLowerCase() === 'bronze').length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-3 text-sm text-center text-muted-foreground">
                                  No customers in Bronze tier
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Silver Tier Table */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getMembershipIcon('silver')}
                        <CardTitle className="ml-2">Silver Customers</CardTitle>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedTierForReward("silver")
                          setIsCreateRewardOpen(true)
                        }}
                        className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Create Reward
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {loadingAllCustomers ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Customer</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Transactions</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Spend</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Redemptions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCustomers
                              .filter(customer => customer.membershipTier.toLowerCase() === 'silver')
                              .slice(0, 5)
                              .map(customer => (
                                <tr key={customer.customerId} className="border-b hover:bg-slate-50">
                                  <td className="p-3 text-sm font-medium text-center">{customer.fullName}</td>
                                  <td className="p-3 text-sm text-center">{customer.lifetimeTransactionCount}</td>
                                  <td className="p-3 text-sm text-center">${customer.totalLifetimeSpend.toFixed(2)}</td>
                                  <td className="p-3 text-sm text-center">{customer.redemptionCount ?? 0}</td>
                                </tr>
                              ))}
                            {allCustomers.filter(customer => customer.membershipTier.toLowerCase() === 'silver').length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-3 text-sm text-center text-muted-foreground">
                                  No customers in Silver tier
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Gold Tier Table */}
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getMembershipIcon('gold')}
                        <CardTitle className="ml-2">Gold Customers</CardTitle>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedTierForReward("gold")
                          setIsCreateRewardOpen(true)
                        }}
                        className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Create Reward
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {loadingAllCustomers ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Customer</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Transactions</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Spend</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Redemptions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCustomers
                              .filter(customer => customer.membershipTier.toLowerCase() === 'gold')
                              .slice(0, 5)
                              .map(customer => (
                                <tr key={customer.customerId} className="border-b hover:bg-slate-50">
                                  <td className="p-3 text-sm font-medium text-center">{customer.fullName}</td>
                                  <td className="p-3 text-sm text-center">{customer.lifetimeTransactionCount}</td>
                                  <td className="p-3 text-sm text-center">${customer.totalLifetimeSpend.toFixed(2)}</td>
                                  <td className="p-3 text-sm text-center">{customer.redemptionCount ?? 0}</td>
                                </tr>
                              ))}
                            {allCustomers.filter(customer => customer.membershipTier.toLowerCase() === 'gold').length === 0 && (
                              <tr>
                                <td colSpan={4} className="p-3 text-sm text-center text-muted-foreground">
                                  No customers in Gold tier
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* All Customers Table */}
            <div className="mt-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">All Customers</h2>
                <Button 
                  variant="outline" 
                  onClick={toggleAllCustomers}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {showAllCustomers ? "Hide" : "Show"} All Customers
                </Button>
              </div>
              
              {showAllCustomers && (
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3 bg-slate-50 border-b">
                    <CardTitle>Customer List</CardTitle>
                    <CardDescription>
                      All customers registered with your store
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-0">
                    {loadingAllCustomers ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : allCustomers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Customers</h3>
                        <p className="text-muted-foreground">
                          You don't have any customers yet.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b bg-slate-50">
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Customer ID</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Customer Name</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Membership Tier</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Points</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Transactions</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Lifetime Spend</th>
                              <th className="text-center p-3 text-sm font-medium text-slate-700">Redemptions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allCustomers.map(customer => (
                              <tr key={customer.customerId} className="border-b hover:bg-slate-50">
                                <td className="p-3 text-sm text-center">{customer.customerId}</td>
                                <td className="p-3 text-sm font-medium text-center">{customer.fullName}</td>
                                <td className="p-3 text-sm text-center">
                                  <div className="flex items-center justify-center">
                                    {getMembershipIcon(customer.membershipTier)}
                                    <span className="ml-2 capitalize">{customer.membershipTier}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-sm text-center">{customer.pointsBalance}</td>
                                <td className="p-3 text-sm text-center">{customer.lifetimeTransactionCount}</td>
                                <td className="p-3 text-sm text-center">${customer.totalLifetimeSpend.toFixed(2)}</td>
                                <td className="p-3 text-sm text-center">{customer.redemptionCount ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
        
        {/* Create/Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[97vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedMembership ? `Edit ${selectedMembership.name}` : "Create Membership Tier"}
              </DialogTitle>
              <DialogDescription>
                Set the conditions that customers must meet to qualify for this tier
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tier Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Platinum, Diamond"
                  disabled={!!selectedMembership && ['silver', 'gold'].includes(selectedMembership.name.toLowerCase())}
                />
                {!!selectedMembership && ['silver', 'gold'].includes(selectedMembership.name.toLowerCase()) && (
                  <p className="text-xs text-muted-foreground mt-1">Default tier names cannot be changed</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Benefits of this membership tier"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive" className="cursor-pointer">Active Status</Label>
                  {formData.name.toLowerCase() === 'gold' && (
                    <p className="text-xs text-muted-foreground mt-1">Gold cannot be active if Silver is inactive</p>
                  )}
                </div>
                <Switch 
                  id="isActive" 
                  checked={formData.isActive} 
                  onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                />
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-sm font-medium mb-3">Qualification Requirements</h3>
                <div className="space-y-4">
                  {/* Lifetime Transactions */}
                  <div className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <ShoppingBag className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="lifetimeTransactions">Lifetime Transactions</Label>
                      </div>
                      <Switch 
                        id="lifetimeTransactionsEnabled" 
                        checked={conditionSettings.lifetimeTransactions.enabled} 
                        onCheckedChange={(checked) => handleConditionSettingChange("lifetimeTransactions", "enabled", checked)}
                      />
                    </div>
                    
                    {conditionSettings.lifetimeTransactions.enabled && (
                      <div className="pt-2">
                        <Input 
                          id="lifetimeTransactions" 
                          type="number" 
                          min={0}
                          value={conditionSettings.lifetimeTransactions.value} 
                          onChange={(e) => handleConditionSettingChange(
                            "lifetimeTransactions", 
                            "value", 
                            parseInt(e.target.value) || 0
                          )}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer qualifies after this many completed transactions
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Lifetime Spend */}
                  <div className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="lifetimeSpend">Lifetime Spend</Label>
                      </div>
                      <Switch 
                        id="lifetimeSpendEnabled" 
                        checked={conditionSettings.lifetimeSpend.enabled} 
                        onCheckedChange={(checked) => handleConditionSettingChange("lifetimeSpend", "enabled", checked)}
                      />
                    </div>
                    
                    {conditionSettings.lifetimeSpend.enabled && (
                      <div className="pt-2">
                        <Input 
                          id="lifetimeSpend" 
                          type="number" 
                          min={0}
                          step={0.01}
                          value={conditionSettings.lifetimeSpend.value} 
                          onChange={(e) => handleConditionSettingChange(
                            "lifetimeSpend", 
                            "value", 
                            parseFloat(e.target.value) || 0
                          )}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer qualifies after spending this amount
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Number of Redemptions */}
                  <div className="space-y-2 border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                        <Label htmlFor="numberOfRedemptions">Number of Redemptions</Label>
                      </div>
                      <Switch 
                        id="numberOfRedemptionsEnabled" 
                        checked={conditionSettings.numberOfRedemptions.enabled} 
                        onCheckedChange={(checked) => handleConditionSettingChange("numberOfRedemptions", "enabled", checked)}
                      />
                    </div>
                    
                    {conditionSettings.numberOfRedemptions.enabled && (
                      <div className="pt-2">
                        <Input 
                          id="numberOfRedemptions" 
                          type="number" 
                          min={0}
                          value={conditionSettings.numberOfRedemptions.value} 
                          onChange={(e) => handleConditionSettingChange(
                            "numberOfRedemptions", 
                            "value", 
                            parseInt(e.target.value) || 0
                          )}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Customer qualifies after redeeming this many rewards
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center">
                    <Info className="h-3 w-3 mr-1" />
                    <span>Customers only need to meet ONE of the enabled conditions to qualify</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                onClick={handleSaveMembership}
                className="bg-[#007AFF] hover:bg-[#0071e3] text-white"
              >
                {selectedMembership ? "Save Changes" : "Create Tier"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[97vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Delete Membership Tier</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the {selectedMembership?.name} membership tier?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            
            {selectedMembership?.customerCount && selectedMembership.customerCount > 0 ? (
              <Alert variant="destructive" className="rounded-sm">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Cannot Delete</AlertTitle>
                <AlertDescription>
                  This membership tier has {selectedMembership.customerCount} customers assigned to it.
                  You need to update these customers to a different tier first.
                </AlertDescription>
              </Alert>
            ) : (
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteMembership}
                >
                  Delete
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
        
        {/* CreateRewardDialog */}
        <CreateRewardDialog
          open={isCreateRewardOpen}
          onOpenChange={setIsCreateRewardOpen}
          defaultValues={{
            rewardName: "",
            description: "",
            pointsCost: "100",
            isActive: true,
            type: "discount",
            rewardVisibility: "all",
            conditions: {
              useMembershipRequirements: true,
              membershipLevel: selectedTierForReward
            },
            specificCustomerIds: [],
            specificCustomerNames: []
          }}
        />
      </div>
    </div>
  )
} 