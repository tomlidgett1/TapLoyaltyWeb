"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Plus, Settings, Trash2, DollarSign, ShoppingBag, Coffee, ChevronDown, Eye, CreditCard, Star, Award, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// import { Badge } from "@/components/ui/badge" // Unused import
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Condition {
  id: string
  type: 'transaction_count' | 'spend_amount' | 'visit_count'
  value: number
  description: string
}

interface Limitation {
  id: string
  type: 'one_time' | 'daily' | 'weekly' | 'monthly'
  value?: number
  description: string
}

interface ProgramReward {
  id: string
  name: string
  description: string
  type: 'discount' | 'free_item' | 'buy_x_get_y' | 'voucher'
  value: number | string
  discountType?: 'percentage' | 'dollar'
  freeItemName?: string
  buyQuantity?: number
  getQuantity?: number
  buyItemName?: string
  getItemName?: string
  getDiscountType?: 'percentage' | 'dollar' | 'free'
  getDiscountValue?: number
  voucherAmount?: number
  pointsCost?: number
  conditions: Condition[]
  limitations: Limitation[]
  order: number
}

interface CreateManualProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingProgram?: {
    id: string
    name: string
    description?: string
    pin: string
    rewards: any[]
  } | null
}

export function CreateManualProgramDialog({ open, onOpenChange, editingProgram }: CreateManualProgramDialogProps) {
  const { user } = useAuth()
  const [programName, setProgramName] = useState("My Custom Program")
  const [programDescription, setProgramDescription] = useState("")
  const [programPin, setProgramPin] = useState("")
  const [isEditingName, setIsEditingName] = useState(false)
  const [rewards, setRewards] = useState<ProgramReward[]>([])
  const [expandedReward, setExpandedReward] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'setup' | 'templates' | 'how-it-works' | 'data-example'>('setup')
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [selectedIndustry, setSelectedIndustry] = useState<'food' | 'entertainment' | 'retail'>('food')

  // Initialize form when editing a program
  useEffect(() => {
    if (editingProgram) {
      setProgramName(editingProgram.name)
      setProgramDescription(editingProgram.description || "")
      setProgramPin(editingProgram.pin)
      setRewards(editingProgram.rewards as ProgramReward[] || [])
      setActiveTab('setup')
    } else {
      // Reset form for new program
      setProgramName("My Custom Program")
      setProgramDescription("")
      setProgramPin("")
      setRewards([])
      setActiveTab('setup')
    }
  }, [editingProgram, open])

  // Template data organized by industry
  const templatesByIndustry = {
    food: [
      {
        id: 'cafe',
        name: 'Coffee Shop',
        description: 'Perfect for cafes',
        programName: 'Coffee Loyalty Program',
        pin: '2468',
        rewards: [
          {
            id: 'reward-1',
            name: '10% Off First Purchase',
            description: 'Welcome discount for new customers',
            type: 'discount' as const,
            value: 10,
            discountType: 'percentage' as const,
            pointsCost: 0,
            conditions: [{ id: 'c1', type: 'transaction_count' as const, value: 1, description: 'After 1 transaction' }],
            limitations: [],
            order: 0
          },
          {
            id: 'reward-2',
            name: 'Free Coffee',
            description: 'Complimentary regular coffee',
            type: 'free_item' as const,
            value: 0,
            freeItemName: 'Regular Coffee',
            pointsCost: 0,
            conditions: [{ id: 'c2', type: 'transaction_count' as const, value: 5, description: 'After 5 transactions' }],
            limitations: [],
            order: 1
          },
          {
            id: 'reward-3',
            name: 'Buy 2 Get 1 Free Pastry',
            description: 'Buy two pastries, get one free',
            type: 'buy_x_get_y' as const,
            value: 0,
            buyQuantity: 2,
            getQuantity: 1,
            buyItemName: 'Pastry',
            getItemName: 'Pastry',
            getDiscountType: 'free' as const,
            pointsCost: 0,
            conditions: [{ id: 'c3', type: 'transaction_count' as const, value: 10, description: 'After 10 transactions' }],
            limitations: [],
            order: 2
          }
        ]
      },
      {
        id: 'restaurant',
        name: 'Restaurant',
        description: 'For dining establishments',
        programName: 'Diner Rewards Program',
        pin: '3579',
        rewards: [
          {
            id: 'reward-1',
            name: 'Free Appetizer',
            description: 'Complimentary starter',
            type: 'free_item' as const,
            value: 0,
            freeItemName: 'Appetizer',
            pointsCost: 0,
            conditions: [{ id: 'c1', type: 'spend_amount' as const, value: 75, description: 'After spending $75' }],
            limitations: [],
            order: 0
          }
        ]
      }
    ],
    entertainment: [
      {
        id: 'pub',
        name: 'Pub & Bar',
        description: 'Great for pubs and bars',
        programName: 'Pub Loyalty Program',
        pin: '1357',
        rewards: [
          {
            id: 'reward-1',
            name: '15% Off Food',
            description: 'Discount on all food items',
            type: 'discount' as const,
            value: 15,
            discountType: 'percentage' as const,
            pointsCost: 0,
            conditions: [{ id: 'c1', type: 'spend_amount' as const, value: 50, description: 'After spending $50' }],
            limitations: [],
            order: 0
          },
          {
            id: 'reward-2',
            name: 'Free Appetiser',
            description: 'Complimentary starter',
            type: 'free_item' as const,
            value: 0,
            freeItemName: 'House Appetiser',
            pointsCost: 0,
            conditions: [{ id: 'c2', type: 'visit_count' as const, value: 8, description: 'After 8 visits' }],
            limitations: [],
            order: 1
          }
        ]
      }
    ],
    retail: [
      {
        id: 'retail',
        name: 'Retail Store',
        description: 'Ideal for retail stores',
        programName: 'VIP Customer Program',
        pin: '9876',
        rewards: [
          {
            id: 'reward-1',
            name: '$5 Off Purchase',
            description: 'Dollar discount on any purchase',
            type: 'discount' as const,
            value: 5,
            discountType: 'dollar' as const,
            pointsCost: 0,
            conditions: [{ id: 'c1', type: 'transaction_count' as const, value: 3, description: 'After 3 transactions' }],
            limitations: [],
            order: 0
          },
          {
            id: 'reward-2',
            name: '20% Off Next Purchase',
            description: 'Percentage discount',
            type: 'discount' as const,
            value: 20,
            discountType: 'percentage' as const,
            pointsCost: 0,
            conditions: [{ id: 'c2', type: 'spend_amount' as const, value: 100, description: 'After spending $100' }],
            limitations: [],
            order: 1
          }
        ]
      },
      {
        id: 'boutique',
        name: 'Boutique',
        description: 'For fashion & specialty stores',
        programName: 'Style Rewards',
        pin: '4680',
        rewards: [
          {
            id: 'reward-1',
            name: '25% Off',
            description: 'Premium discount',
            type: 'discount' as const,
            value: 25,
            discountType: 'percentage' as const,
            pointsCost: 0,
            conditions: [{ id: 'c1', type: 'spend_amount' as const, value: 150, description: 'After spending $150' }],
            limitations: [],
            order: 0
          }
        ]
      }
    ]
  }

  type TemplateType = typeof templatesByIndustry.food[0]
  
  const applyTemplate = (template: TemplateType) => {
    setProgramName(template.programName)
    setProgramDescription(template.description)
    setProgramPin(template.pin)
    setRewards(template.rewards as ProgramReward[])
    setActiveTab('setup')
    // Validate after applying template
    setTimeout(() => validateSequentialConditions(), 0)
  }

  const addReward = () => {
    const newReward: ProgramReward = {
      id: `reward-${Date.now()}`,
      name: `Reward ${rewards.length + 1}`,
      description: "",
      type: 'discount',
      value: 10,
      conditions: [],
      limitations: [],
      order: rewards.length
    }
    setRewards([...rewards, newReward])
    setExpandedReward(newReward.id)
    
    // Validate after adding reward
    setTimeout(() => validateSequentialConditions(), 0)
  }

  const removeReward = (id: string) => {
    setRewards(rewards.filter(r => r.id !== id))
    if (expandedReward === id) {
      setExpandedReward(null)
    }
    
    // Validate after removing reward
    setTimeout(() => validateSequentialConditions(), 0)
  }

  const validateSequentialConditions = () => {
    const errors: Record<string, string[]> = {}
    const sortedRewards = [...rewards].sort((a, b) => a.order - b.order)
    
    for (let i = 1; i < sortedRewards.length; i++) {
      const currentReward = sortedRewards[i]
      const previousReward = sortedRewards[i - 1]
      const rewardErrors: string[] = []
      
      // Check each condition type
      const conditionTypes = ['transaction_count', 'spend_amount', 'visit_count'] as const
      
      conditionTypes.forEach(conditionType => {
        const currentCondition = currentReward.conditions.find(c => c.type === conditionType)
        const previousCondition = previousReward.conditions.find(c => c.type === conditionType)
        
        if (currentCondition && previousCondition) {
          // Require at least 1 more than the previous reward
          const minimumRequired = previousCondition.value + (conditionType === 'spend_amount' ? 1 : 1)
          if (currentCondition.value < minimumRequired) {
            const conditionName = conditionType === 'transaction_count' ? 'Transactions' 
              : conditionType === 'spend_amount' ? 'Spend Amount' 
              : 'Visits'
            rewardErrors.push(`${conditionName} must be at least ${minimumRequired} (previous reward had ${previousCondition.value})`)
          }
        } else if (previousCondition && !currentCondition) {
          const conditionName = conditionType === 'transaction_count' ? 'Transactions' 
            : conditionType === 'spend_amount' ? 'Spend Amount' 
            : 'Visits'
          const minimumRequired = previousCondition.value + (conditionType === 'spend_amount' ? 1 : 1)
          rewardErrors.push(`Must include ${conditionName} condition with at least ${minimumRequired} (previous reward required ${previousCondition.value})`)
        }
      })
      
      if (rewardErrors.length > 0) {
        errors[currentReward.id] = rewardErrors
      }
    }
    
    setValidationErrors(errors)
  }

  const updateReward = (id: string, updates: Partial<ProgramReward>) => {
    const updatedRewards = rewards.map(r => r.id === id ? { ...r, ...updates } : r)
    setRewards(updatedRewards)
    
    // Use setTimeout to ensure state is updated before validation
    setTimeout(() => validateSequentialConditions(), 0)
  }

  const addCondition = (rewardId: string) => {
    const newCondition: Condition = {
      id: `condition-${Date.now()}`,
      type: 'transaction_count',
      value: 1,
      description: 'After 1 transaction'
    }
    
    updateReward(rewardId, {
      conditions: [...(rewards.find(r => r.id === rewardId)?.conditions || []), newCondition]
    })
  }

  const removeCondition = (rewardId: string, conditionId: string) => {
    const reward = rewards.find(r => r.id === rewardId)
    if (reward) {
      updateReward(rewardId, {
        conditions: reward.conditions.filter(c => c.id !== conditionId)
      })
    }
  }

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'discount':
        return <DollarSign className="h-3 w-3" style={{ color: '#007AFF' }} />
      case 'free_item':
        return <Coffee className="h-3 w-3" style={{ color: '#007AFF' }} />
      case 'buy_x_get_y':
        return <Award className="h-3 w-3" style={{ color: '#007AFF' }} />
      case 'voucher':
        return <CreditCard className="h-3 w-3" style={{ color: '#007AFF' }} />
      default:
        return <Award className="h-3 w-3" style={{ color: '#007AFF' }} />
    }
  }

  const getConditionDescription = (condition: Condition) => {
    switch (condition.type) {
      case 'transaction_count':
        return `After ${condition.value} ${condition.value === 1 ? 'transaction' : 'transactions'}`
      case 'spend_amount':
        return `After spending $${condition.value}`
      case 'visit_count':
        return `After ${condition.value} ${condition.value === 1 ? 'visit' : 'visits'}`
      default:
        return condition.description
    }
  }

  const getMinimumValueForCondition = (rewardId: string, conditionType: 'transaction_count' | 'spend_amount' | 'visit_count'): number => {
    const currentReward = rewards.find(r => r.id === rewardId)
    if (!currentReward) return 1
    
    const sortedRewards = [...rewards].sort((a, b) => a.order - b.order)
    const currentIndex = sortedRewards.findIndex(r => r.id === rewardId)
    
    if (currentIndex <= 0) return 1 // First reward has no restrictions
    
    // Find the highest value for this condition type in all previous rewards
    let maxPreviousValue = 0
    for (let i = 0; i < currentIndex; i++) {
      const previousReward = sortedRewards[i]
      const previousCondition = previousReward.conditions.find(c => c.type === conditionType)
      if (previousCondition && previousCondition.value > maxPreviousValue) {
        maxPreviousValue = previousCondition.value
      }
    }
    
    // Return minimum required (previous max + 1) or 1 if no previous conditions
    return maxPreviousValue > 0 ? maxPreviousValue + 1 : 1
  }

  const handleSave = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save a program.",
        variant: "destructive"
      })
      return
    }

    // Validate one more time before saving
    validateSequentialConditions()
    
    // Check if there are any validation errors
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: "Validation Error",
        description: "Please fix the sequential reward requirements before saving.",
        variant: "destructive"
      })
      return
    }
    
    if (rewards.length === 0) {
      toast({
        title: "No Rewards",
        description: "Please add at least one reward before saving.",
        variant: "destructive"
      })
      return
    }

    if (!programName.trim() || programName === "My Custom Program") {
      toast({
        title: "Program Name Required",
        description: "Please enter a unique program name.",
        variant: "destructive"
      })
      return
    }

    if (!programDescription.trim()) {
      toast({
        title: "Description Required", 
        description: "Please enter a program description.",
        variant: "destructive"
      })
      return
    }

    if (!programPin.trim()) {
      toast({
        title: "PIN Required",
        description: "Please set a PIN for the program before saving.",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      const merchantId = user.uid
      const programId = editingProgram?.id || `program_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const isEditing = !!editingProgram
      
      // Helper function to remove undefined values
      const cleanObject = (obj: any): any => {
        const cleaned: any = {}
        Object.keys(obj).forEach(key => {
          if (obj[key] !== undefined && obj[key] !== null) {
            if (typeof obj[key] === 'object' && !Array.isArray(obj[key]) && obj[key].constructor === Object) {
              const cleanedNested = cleanObject(obj[key])
              if (Object.keys(cleanedNested).length > 0) {
                cleaned[key] = cleanedNested
              }
            } else {
              cleaned[key] = obj[key]
            }
          }
        })
        return cleaned
      }

      // Prepare the program data
      const programData = cleanObject({
        name: programName,
        description: programDescription,
        pin: programPin,
        type: 'manual',
        status: 'active',
        rewards: rewards.map(reward => cleanObject({
          id: reward.id,
          name: reward.name,
          description: reward.description,
          type: reward.type,
          order: reward.order,
          // Basic reward properties
          value: reward.value,
          discountType: reward.discountType,
          freeItemName: reward.freeItemName,
          // Buy X Get Y properties
          buyQuantity: reward.buyQuantity,
          getQuantity: reward.getQuantity,
          buyItemName: reward.buyItemName,
          getItemName: reward.getItemName,
          getDiscountType: reward.getDiscountType,
          getDiscountValue: reward.getDiscountValue,
          // Voucher properties
          voucherAmount: reward.voucherAmount,
          // Points cost
          pointsCost: reward.pointsCost,
          // Conditions (simplified structure matching existing points rules)
          conditions: reward.conditions.map(condition => {
            if (condition.type === 'transaction_count') {
              return cleanObject({ type: 'visitNumber', number: condition.value })
            } else if (condition.type === 'spend_amount') {
              return cleanObject({ type: 'minimumSpend', amount: condition.value })
            } else if (condition.type === 'visit_count') {
              return cleanObject({ type: 'visitNumber', number: condition.value })
            }
            return cleanObject({ type: condition.type, value: condition.value })
          }),
          // Limitations (fixed to customerLimit only)
          limitations: [{ type: 'customerLimit', value: 1 }]
        })),
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        totalRewards: rewards.length
      })

      // Save to Firestore
      const programRef = doc(db, `merchants/${merchantId}/customprograms/${programId}`)
      await setDoc(programRef, programData)

      toast({
        title: isEditing ? "Program Updated Successfully" : "Program Saved Successfully",
        description: `"${programName}" has been ${isEditing ? 'updated' : 'saved to your merchant account'}.`
      })

    onOpenChange(false)
    } catch (error) {
      console.error('Error saving program:', error)
      toast({
        title: "Save Error",
        description: "Failed to save the program. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!user?.uid || !editingProgram?.id) {
      toast({
        title: "Error",
        description: "Cannot delete program - missing information.",
        variant: "destructive"
      })
      return
    }

    setIsDeleting(true)

    try {
      const merchantId = user.uid
      const programRef = doc(db, `merchants/${merchantId}/customprograms/${editingProgram.id}`)
      await deleteDoc(programRef)

      toast({
        title: "Program Deleted",
        description: `"${programName}" has been permanently deleted.`
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error deleting program:', error)
      toast({
        title: "Delete Error",
        description: "Failed to delete the program. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] min-h-[80vh] overflow-hidden p-0">
        <style jsx>{`
          .custom-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
          }
          
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-col h-full max-h-[90vh] min-h-[80vh]"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b border-gray-100">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {isEditingName ? (
                    <Input
                      value={programName}
                      onChange={(e) => setProgramName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                      className="text-lg font-semibold border-none p-0 h-auto focus-visible:ring-0"
                      autoFocus
                    />
                  ) : (
                    <DialogTitle 
                      className="text-lg font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => setIsEditingName(true)}
                    >
                      {programName}
                    </DialogTitle>
                  )}
                </div>
              </div>
              
              {/* Tabs under program name */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'setup'
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  }`}
                  onClick={() => setActiveTab('setup')}
                >
                  <Settings className="h-3 w-3" />
                  Set Up
                </button>
                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'templates'
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  }`}
                  onClick={() => setActiveTab('templates')}
                >
                  <Star className="h-3 w-3" />
                  Templates
                </button>
                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'how-it-works'
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  }`}
                  onClick={() => setActiveTab('how-it-works')}
                >
                  <Eye className="h-3 w-3" />
                  How This Works
                </button>
                <button
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'data-example'
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  }`}
                  onClick={() => setActiveTab('data-example')}
                >
                  <Database className="h-3 w-3" />
                  Data Example
                </button>
              </div>
            </div>
          </DialogHeader>

          {/* Content - Split Layout */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'setup' ? (
              <div className="grid grid-cols-3 h-full">
                {/* Left Panel - Program Builder */}
                <div className="col-span-2 overflow-y-auto custom-scrollbar px-6 py-4 border-r border-gray-100">
                <div className="space-y-4">
              {/* Program Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-700">Program Description</Label>
                  <span className={`text-xs ${programDescription.length > 38 ? 'text-red-500' : 'text-gray-500'}`}>
                    {programDescription.length}/38
                  </span>
                </div>
                <Textarea
                  value={programDescription}
                  onChange={(e) => {
                    if (e.target.value.length <= 38) {
                      const value = e.target.value
                      // Capitalize first letter if there's content
                      const capitalizedValue = value.length > 0 
                        ? value.charAt(0).toUpperCase() + value.slice(1)
                        : value
                      setProgramDescription(capitalizedValue)
                    }
                  }}
                  className="text-sm min-h-[60px]"
                  placeholder="Describe what this loyalty program offers to customers..."
                  maxLength={38}
                />
              </div>

              {/* Program PIN */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                <Label className="text-sm font-medium text-gray-700 min-w-0">Program PIN:</Label>
                <Input
                  value={programPin}
                  onChange={(e) => setProgramPin(e.target.value.replace(/\D/g, ''))}
                  className="w-20 h-7 text-sm text-center"
                  placeholder="1234"
                  maxLength={4}
                />
                <span className="text-xs text-gray-500">Required for reward redemption</span>
              </div>

              {/* Rewards List */}
              <AnimatePresence>
                {rewards.map((reward, index) => (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className={`border rounded-md bg-white ${
                      validationErrors[reward.id] ? 'border-red-300' : 'border-gray-200'
                    }`}
                  >
                    {/* Reward Header */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedReward(expandedReward === reward.id ? null : reward.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-xs font-medium" style={{ backgroundColor: '#007AFF20', color: '#007AFF' }}>
                            {index + 1}
                          </div>
                          {getRewardIcon(reward.type)}
                          <div>
                            <h4 className="font-medium text-sm">{reward.name}</h4>
                            <p className="text-xs text-gray-600">
                              {reward.conditions.length > 0 
                                ? getConditionDescription(reward.conditions[0])
                                : 'No conditions set'
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeReward(reward.id)
                            }}
                            className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <ChevronDown 
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              expandedReward === reward.id ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Validation Errors */}
                    {validationErrors[reward.id] && (
                      <div className="px-4 py-2 bg-red-50 border-t border-red-100">
                        <div className="space-y-1">
                          {validationErrors[reward.id].map((error, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                              <span className="text-xs text-red-700">{error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reward Details */}
                    <AnimatePresence>
                      {expandedReward === reward.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100 overflow-hidden"
                        >
                          <div className="p-4 space-y-4">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-xs text-gray-600">Reward Name</Label>
                                <Input
                                  value={reward.name}
                                  onChange={(e) => updateReward(reward.id, { name: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-gray-600">Type</Label>
                                <Select
                                  value={reward.type}
                                  onValueChange={(value) => updateReward(reward.id, { type: value as any })}
                                >
                                  <SelectTrigger className="mt-1 h-8 text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="discount">Discount</SelectItem>
                                    <SelectItem value="free_item">Free Item</SelectItem>
                                    <SelectItem value="buy_x_get_y">Buy X Get Y Free</SelectItem>
                                    <SelectItem value="voucher">Voucher</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="col-span-2">
                              <Label className="text-xs text-gray-600">Description</Label>
                              <Textarea
                                value={reward.description}
                                onChange={(e) => updateReward(reward.id, { description: e.target.value })}
                                className="mt-1 text-sm min-h-[60px]"
                                placeholder="Describe this reward..."
                              />
                              </div>
                              <div className="col-span-1">
                                <Label className="text-xs text-gray-600">Points Cost</Label>
                                <Input
                                  type="number"
                                  value={reward.pointsCost || 0}
                                  onChange={(e) => updateReward(reward.id, { pointsCost: parseInt(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="0"
                                  min="0"
                                />
                              </div>
                            </div>

                            {/* Reward Type Specific Fields */}
                            {reward.type === 'discount' && (
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-600">Discount Type</Label>
                                  <Select
                                    value={reward.discountType || 'percentage'}
                                    onValueChange={(value) => updateReward(reward.id, { discountType: value as 'percentage' | 'dollar' })}
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                                      <SelectItem value="dollar">Dollar Amount ($)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600">
                                    {reward.discountType === 'dollar' ? 'Dollar Amount' : 'Percentage'}
                                  </Label>
                                  <Input
                                    type="number"
                                    value={reward.value}
                                    onChange={(e) => updateReward(reward.id, { value: parseFloat(e.target.value) || 0 })}
                                    className="mt-1 h-8 text-sm"
                                    placeholder={reward.discountType === 'dollar' ? '10' : '15'}
                                  />
                                </div>
                              </div>
                            )}

                            {reward.type === 'free_item' && (
                              <div>
                                <Label className="text-xs text-gray-600">Free Item Name</Label>
                                <Input
                                  value={reward.freeItemName || ''}
                                  onChange={(e) => updateReward(reward.id, { freeItemName: e.target.value })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="e.g., Large Coffee, Pastry, etc."
                                />
                              </div>
                            )}

                            {reward.type === 'buy_x_get_y' && (
                              <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs text-gray-600">Buy Quantity</Label>
                                  <Input
                                    type="number"
                                    value={reward.buyQuantity || 1}
                                    onChange={(e) => updateReward(reward.id, { buyQuantity: parseInt(e.target.value) || 1 })}
                                    className="mt-1 h-8 text-sm"
                                    min="1"
                                  />
                                </div>
                                <div>
                                    <Label className="text-xs text-gray-600">Buy Item Name</Label>
                                    <Input
                                      value={reward.buyItemName || ''}
                                      onChange={(e) => updateReward(reward.id, { buyItemName: e.target.value })}
                                      className="mt-1 h-8 text-sm"
                                      placeholder="e.g., Coffee, Sandwich, etc."
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-gray-600">Get Quantity</Label>
                                  <Input
                                    type="number"
                                    value={reward.getQuantity || 1}
                                    onChange={(e) => updateReward(reward.id, { getQuantity: parseInt(e.target.value) || 1 })}
                                    className="mt-1 h-8 text-sm"
                                    min="1"
                                  />
                                  </div>
                                  <div>
                                    <Label className="text-xs text-gray-600">Get Item Name</Label>
                                    <Input
                                      value={reward.getItemName || ''}
                                      onChange={(e) => updateReward(reward.id, { getItemName: e.target.value })}
                                      className="mt-1 h-8 text-sm"
                                      placeholder="e.g., Coffee, Pastry, etc."
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs text-gray-600">Get Item Discount Type</Label>
                                    <Select
                                      value={reward.getDiscountType || 'free'}
                                      onValueChange={(value) => updateReward(reward.id, { getDiscountType: value as 'percentage' | 'dollar' | 'free' })}
                                    >
                                      <SelectTrigger className="mt-1 h-8 text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="free">Free</SelectItem>
                                        <SelectItem value="percentage">Percentage Off (%)</SelectItem>
                                        <SelectItem value="dollar">Dollar Off ($)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {reward.getDiscountType && reward.getDiscountType !== 'free' && (
                                    <div>
                                      <Label className="text-xs text-gray-600">
                                        {reward.getDiscountType === 'dollar' ? 'Dollar Amount Off' : 'Percentage Off'}
                                      </Label>
                                      <Input
                                        type="number"
                                        value={reward.getDiscountValue || 0}
                                        onChange={(e) => updateReward(reward.id, { getDiscountValue: parseFloat(e.target.value) || 0 })}
                                        className="mt-1 h-8 text-sm"
                                        placeholder={reward.getDiscountType === 'dollar' ? '5' : '50'}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {reward.type === 'voucher' && (
                              <div>
                                <Label className="text-xs text-gray-600">Voucher Amount ($)</Label>
                                <Input
                                  type="number"
                                  value={reward.voucherAmount || 0}
                                  onChange={(e) => updateReward(reward.id, { voucherAmount: parseFloat(e.target.value) || 0 })}
                                  className="mt-1 h-8 text-sm"
                                  placeholder="25"
                                />
                              </div>
                            )}

                            {/* Conditions */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs text-gray-600">Conditions</Label>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addCondition(reward.id)}
                                  className="h-6 text-xs hover:bg-blue-50"
                                  style={{ color: '#007AFF' }}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {reward.conditions.map((condition) => (
                                  <div key={condition.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                                    <Select
                                      value={condition.type}
                                      onValueChange={(value) => {
                                        const updated = rewards.find(r => r.id === reward.id)
                                        if (updated) {
                                          updateReward(reward.id, {
                                            conditions: updated.conditions.map(c => 
                                              c.id === condition.id 
                                                ? { ...c, type: value as any }
                                                : c
                                            )
                                          })
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="h-7 text-xs w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="transaction_count">Transactions</SelectItem>
                                        <SelectItem value="spend_amount">Spend Amount</SelectItem>
                                        <SelectItem value="visit_count">Visits</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      type="number"
                                      value={condition.value}
                                      min={getMinimumValueForCondition(reward.id, condition.type)}
                                      onChange={(e) => {
                                        const inputValue = parseInt(e.target.value) || 0
                                        const minValue = getMinimumValueForCondition(reward.id, condition.type)
                                        const finalValue = Math.max(inputValue, minValue)
                                        
                                        const updated = rewards.find(r => r.id === reward.id)
                                        if (updated) {
                                          updateReward(reward.id, {
                                            conditions: updated.conditions.map(c => 
                                              c.id === condition.id 
                                                ? { ...c, value: finalValue }
                                                : c
                                            )
                                          })
                                        }
                                      }}
                                      onBlur={(e) => {
                                        // Auto-correct on blur if value is below minimum
                                        const inputValue = parseInt(e.target.value) || 0
                                        const minValue = getMinimumValueForCondition(reward.id, condition.type)
                                        if (inputValue < minValue) {
                                          const updated = rewards.find(r => r.id === reward.id)
                                          if (updated) {
                                            updateReward(reward.id, {
                                              conditions: updated.conditions.map(c => 
                                                c.id === condition.id 
                                                  ? { ...c, value: minValue }
                                                  : c
                                              )
                                            })
                                          }
                                        }
                                      }}
                                      className="h-7 text-xs w-20"
                                      placeholder={getMinimumValueForCondition(reward.id, condition.type).toString()}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-xs text-gray-700 px-2 py-1 rounded-md border" style={{ backgroundColor: '#007AFF20', borderColor: '#007AFF40' }}>
                                        {getConditionDescription(condition)}
                                      </span>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeCondition(reward.id, condition.id)}
                                      className="h-6 w-6 p-0 hover:bg-red-50 hover:text-red-600"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Limitations - Fixed to customerLimit only */}
                            <div>
                                <Label className="text-xs text-gray-600">Limitations</Label>
                              <div className="mt-2 p-2 bg-gray-50 rounded-md border border-gray-200">
                                <span className="text-xs text-gray-700">
                                  Customer Limit: Each customer can earn this reward only once
                                      </span>
                                    </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Add Reward Button */}
              <Button
                variant="outline"
                onClick={addReward}
                className="w-full h-12 border-dashed border-gray-300 text-gray-600 transition-colors hover:bg-blue-50"
                style={{ 
                  borderColor: '#007AFF40',
                  color: '#007AFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#007AFF'
                  e.currentTarget.style.color = '#007AFF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#007AFF40'
                  e.currentTarget.style.color = '#007AFF'
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Reward
              </Button>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className="col-span-1 bg-gray-50 overflow-y-auto custom-scrollbar">
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    App Preview
                  </h3>
                  
                  {/* Program Info Preview */}
                  {(programName !== "My Custom Program" || programDescription) && (
                    <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                      <h4 className="text-sm font-medium text-gray-900 mb-1" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                        {programName}
                      </h4>
                      {programDescription && (
                        <p className="text-xs text-gray-600" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {programDescription}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Phone Frame */}
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="space-y-3">
                      {rewards.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Add rewards to see preview
                        </div>
                      ) : (
                        rewards.map((reward) => (
                          <div key={reward.id} className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                  {reward.name || 'Untitled Reward'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                  {reward.description || 'No description'}
                                </p>
                                
                                {/* Conditions and Points Cost as subtitle */}
                                {(reward.conditions.length > 0 || (reward.pointsCost && reward.pointsCost > 0)) && (
                                  <div className="flex items-center gap-1 mt-1 flex-nowrap">
                                    {reward.conditions.length > 0 && (
                                      <>
                                        <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                          {getConditionDescription(reward.conditions[0])}
                                        </span>
                                        {(reward.pointsCost && reward.pointsCost > 0) && <span className="text-xs text-gray-400">•</span>}
                                      </>
                                    )}
                                      <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                      One per customer
                                      </span>
                                    {(reward.pointsCost && reward.pointsCost > 0) && (
                                      <>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs font-medium whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', color: '#007AFF' }}>
                                          {reward.pointsCost} points
                                        </span>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Reward Badge */}
                              <div className={`flex items-center justify-center rounded-md px-2 py-1 ml-3 ${
                                reward.type === 'discount' 
                                  ? 'text-white'
                                  : reward.type === 'free_item'
                                    ? 'text-white'
                                    : reward.type === 'voucher'
                                      ? 'bg-orange-400 text-white'
                                      : 'bg-green-500 text-white'
                              }`}
                              style={
                                reward.type === 'discount' 
                                  ? { backgroundColor: '#007AFF' }
                                  : reward.type === 'free_item' 
                                    ? { backgroundColor: '#895129' } 
                                    : {}
                              }>
                                {reward.type === 'discount' ? (
                                  <>
                                    <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                      {reward.discountType === 'dollar' ? '$' : ''}{reward.value}{reward.discountType === 'percentage' ? '%' : ''} Off
                                    </span>
                                  </>
                                ) : reward.type === 'free_item' ? (
                                  <>
                                    <Coffee className="w-3 h-3 mr-1 fill-white" />
                                    <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                      {reward.freeItemName || 'Free Item'}
                                    </span>
                                  </>
                                ) : reward.type === 'voucher' ? (
                                  <>
                                    <CreditCard className="w-3 h-3 mr-1" />
                                    <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                      ${reward.voucherAmount || 0} voucher
                                    </span>
                                  </>
                                ) : reward.type === 'buy_x_get_y' ? (
                                  <>
                                    <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                      Buy {reward.buyQuantity || 1} {reward.buyItemName ? reward.buyItemName : 'Item'} Get {reward.getQuantity || 1} {reward.getItemName ? reward.getItemName : 'Item'}
                                      {reward.getDiscountType === 'free' || !reward.getDiscountType ? ' Free' : 
                                       reward.getDiscountType === 'percentage' ? ` ${reward.getDiscountValue || 0}% Off` :
                                       ` $${reward.getDiscountValue || 0} Off`}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                    Reward
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : activeTab === 'templates' ? (
              /* Templates Tab Content */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <div className="p-6">
                  <div className="max-w-6xl mx-auto">
                    <div className="space-y-6">
                    {/* Industry Tabs - Top Left */}
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                      <button
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          selectedIndustry === 'food'
                            ? "text-gray-800 bg-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/70"
                        }`}
                        onClick={() => setSelectedIndustry('food')}
                      >
                        <Coffee className="h-3 w-3" />
                        Food & Beverage
                      </button>
                      <button
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          selectedIndustry === 'entertainment'
                            ? "text-gray-800 bg-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/70"
                        }`}
                        onClick={() => setSelectedIndustry('entertainment')}
                      >
                        <ShoppingBag className="h-3 w-3" />
                        Entertainment
                      </button>
                      <button
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          selectedIndustry === 'retail'
                            ? "text-gray-800 bg-white shadow-sm"
                            : "text-gray-600 hover:bg-gray-200/70"
                        }`}
                        onClick={() => setSelectedIndustry('retail')}
                      >
                        <Award className="h-3 w-3" />
                        Retail
                      </button>
                    </div>

                    {/* Template Grid - 4 per row */}
                    <div className="grid grid-cols-4 gap-4">
                      {templatesByIndustry[selectedIndustry].map((template) => {
                        // const isExpanded = expandedTemplate === template.id // Unused variable
                        return (
                          <motion.div 
                            key={template.id} 
                            className="bg-white border border-gray-200 rounded-md overflow-hidden hover:border-blue-300 transition-all duration-200"
                            whileHover={{ y: -2 }}
                            transition={{ duration: 0.2 }}
                          >
                            {/* Card Header */}
                            <div 
                              className="p-4 cursor-pointer"
                              onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
                            >
                              <div className="text-center space-y-3">
                                <div>
                                  <h3 className="font-medium text-gray-900 text-sm mb-1">{template.name}</h3>
                                  <p className="text-xs text-gray-600">{template.description}</p>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {template.rewards.length} rewards • PIN: {template.pin}
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      applyTemplate(template as any)
                                    }}
                                    className="h-7 px-3 text-xs"
                                    style={{ 
                                      borderColor: '#007AFF',
                                      color: '#007AFF'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#007AFF'
                                      e.currentTarget.style.color = 'white'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent'
                                      e.currentTarget.style.color = '#007AFF'
                                    }}
                                  >
                                    Use Template
                                  </Button>
                                  <motion.div
                                    animate={{ rotate: expandedTemplate === template.id ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                  </motion.div>
                                </div>
                              </div>
                            </div>

                            {/* Expandable Reward Details */}
                            <AnimatePresence>
                              {expandedTemplate === template.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeOut" }}
                                  className="border-t border-gray-100 bg-gray-50"
                                >
                                  <div className="p-4 space-y-3">
                                    <h4 className="text-xs font-medium text-gray-700 mb-2">Reward Structure</h4>
                                    <div className="space-y-2">
                                      {template.rewards.map((reward: any, index: number) => (
                                        <motion.div 
                                          key={reward.id}
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: index * 0.1, duration: 0.2 }}
                                          className="bg-white rounded-md p-2 border border-gray-200"
                                        >
                                          <div className="flex items-start gap-2">
                                            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                              <span className="text-xs font-medium text-blue-700">{index + 1}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="text-xs font-medium text-gray-900 mb-1">{reward.name}</div>
                                              <div className="text-xs text-gray-600 mb-1">{reward.description}</div>
                                              <div className="text-xs text-gray-500">
                                                {reward.conditions[0]?.description || 'No conditions'}
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )
                      })}
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-gray-500">Templates can be customised in the Set Up tab after selection</p>
                    </div>
                  </div>
                </div>
              </div>
                </motion.div>
            ) : activeTab === 'how-it-works' ? (
              /* How This Works Tab Content */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <div className="p-6">
                  <div className="max-w-6xl mx-auto">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">How Manual Programs Work</h2>
                      <p className="text-gray-600">Create sequential reward programs that guide customers through a journey</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Step 1 */}
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#007AFF20' }}>
                          <span className="text-lg font-semibold" style={{ color: '#007AFF' }}>1</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Set Conditions</h3>
                        <p className="text-sm text-gray-600">Define when customers become eligible for each reward based on transactions, spending, or visits.</p>
                      </div>

                      {/* Step 2 */}
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#007AFF20' }}>
                          <span className="text-lg font-semibold" style={{ color: '#007AFF' }}>2</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Configure Rewards</h3>
                        <p className="text-sm text-gray-600">Choose from discounts, free items, buy-X-get-Y offers, or vouchers with custom values.</p>
                      </div>

                      {/* Step 3 */}
                      <div className="text-center">
                        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#007AFF20' }}>
                          <span className="text-lg font-semibold" style={{ color: '#007AFF' }}>3</span>
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">Set Limitations</h3>
                        <p className="text-sm text-gray-600">Control how often rewards can be used - one-time, daily, weekly, or monthly limits.</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="font-medium text-gray-900 mb-3">Example Program Flow</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-green-700">1</span>
                          </div>
                          <span className="text-sm text-gray-700">After 1 transaction → 10% off next purchase</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-green-700">2</span>
                          </div>
                          <span className="text-sm text-gray-700">After 3 transactions → Free coffee</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-green-700">3</span>
                          </div>
                          <span className="text-sm text-gray-700">After spending $50 → $10 voucher</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-4" style={{ backgroundColor: '#007AFF10' }}>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: '#007AFF' }}>
                          <span className="text-xs text-white font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-1">Pro Tip</h4>
                          <p className="text-sm text-gray-700">Start with simple conditions and gradually add complexity. Monitor the preview panel to see how rewards will appear to customers.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </motion.div>
            ) : (
              /* Data Example Tab Content */
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="h-full overflow-y-auto custom-scrollbar"
              >
                <div className="p-6">
                  <div className="max-w-6xl mx-auto">
                  <div className="space-y-6">
                    <div className="text-center">
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Firestore Data Structure</h2>
                      <p className="text-gray-600">Exact format of how your program data is saved in Firestore</p>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Document Path
                      </h3>
                      <div className="bg-white rounded-md p-3 border font-mono text-sm">
                        <span className="text-blue-600">merchants</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-green-600">{user?.uid || '{merchantId}'}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-blue-600">customprograms</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-purple-600">program_timestamp_randomId</span>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Complete Data Structure</h3>
                      <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
                        <pre className="text-green-400 text-xs leading-relaxed">
{`{
  "name": "My Custom Program",
  "pin": "1234",
  "type": "manual",
  "status": "active",
  "rewards": [
    {
      "id": "reward-1234567890",
      "name": "Welcome Discount",
      "description": "10% off your first purchase",
      "type": "discount",
      "order": 0,
      
      // Basic reward properties
      "value": 10,
      "discountType": "percentage", // or "dollar"
      
      // Free item properties (when type = "free_item")
      "freeItemName": "Large Coffee",
      
      // Buy X Get Y properties (when type = "buy_x_get_y")
      "buyQuantity": 2,
      "getQuantity": 1,
      "buyItemName": "Coffee",
      "getItemName": "Pastry",
      "getDiscountType": "free", // "free", "percentage", or "dollar"
      "getDiscountValue": 50, // only when getDiscountType is not "free"
      
      // Voucher properties (when type = "voucher")
      "voucherAmount": 25,
      
      // Points cost
      "pointsCost": 100,
      
      // Conditions array (matches existing points rules structure)
      "conditions": [
        {
          "type": "visitNumber", // Maps from transaction_count/visit_count
          "number": 1
        },
        {
          "type": "minimumSpend", // Maps from spend_amount
          "amount": 25
        }
      ],
      
      // Limitations array (fixed to customerLimit only)
      "limitations": [
        {
          "type": "customerLimit",
          "value": 1
        }
      ]
    }
  ],
  
  // Metadata
  "createdAt": "Firebase Server Timestamp",
  "updatedAt": "Firebase Server Timestamp", 
  "createdBy": "${user?.uid || '{merchantId}'}",
  "totalRewards": 1
}`}
                        </pre>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 mb-2">Reward Types</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-mono bg-blue-100 px-2 py-0.5 rounded">discount</span> - Percentage or dollar off</div>
                          <div><span className="font-mono bg-blue-100 px-2 py-0.5 rounded">free_item</span> - Free specific item</div>
                          <div><span className="font-mono bg-blue-100 px-2 py-0.5 rounded">buy_x_get_y</span> - Buy X items, get Y items with discount</div>
                          <div><span className="font-mono bg-blue-100 px-2 py-0.5 rounded">voucher</span> - Store credit voucher</div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-2">Condition Types (Saved Format)</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-mono bg-green-100 px-2 py-0.5 rounded">visitNumber</span> - Number of transactions/visits (field: &quot;number&quot;)</div>
                          <div><span className="font-mono bg-green-100 px-2 py-0.5 rounded">minimumSpend</span> - Minimum spend amount (field: &quot;amount&quot;)</div>
                          <div className="text-xs text-green-700 mt-1">Note: transaction_count/visit_count → visitNumber, spend_amount → minimumSpend</div>
                        </div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <h4 className="font-medium text-orange-900 mb-2">Limitation Types (Fixed)</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-mono bg-orange-100 px-2 py-0.5 rounded">customerLimit</span> - Each customer can earn once (value: 1)</div>
                          <div className="text-xs text-orange-700 mt-1">Note: All rewards are limited to one per customer</div>
                        </div>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <h4 className="font-medium text-purple-900 mb-2">Get Discount Types</h4>
                        <div className="space-y-2 text-sm">
                          <div><span className="font-mono bg-purple-100 px-2 py-0.5 rounded">free</span> - Get item completely free</div>
                          <div><span className="font-mono bg-purple-100 px-2 py-0.5 rounded">percentage</span> - Get item with % discount</div>
                          <div><span className="font-mono bg-purple-100 px-2 py-0.5 rounded">dollar</span> - Get item with $ discount</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 bg-red-500">
                          <span className="text-xs text-white font-bold">!</span>
                        </div>
                        <div>
                          <h4 className="font-medium text-red-900 mb-1">Important Notes</h4>
                          <ul className="text-sm text-red-800 space-y-1">
                            <li>• All timestamps use Firebase Server Timestamp</li>
                            <li>• Sequential rewards must have increasing condition values</li>
                            <li>• Points cost is optional (0 means no points required)</li>
                            <li>• Reward IDs and condition/limitation IDs are auto-generated</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </motion.div>
            )}
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-white">
            <div className="flex items-center justify-between">
              {/* Left side - Delete button (only when editing) */}
              <div>
                {editingProgram && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Program'}
                  </Button>
                )}
              </div>

              {/* Right side - Cancel and Save buttons */}
              <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="text-white"
                style={{ 
                  backgroundColor: '#007AFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0056CC'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#007AFF'
                }}
                  disabled={rewards.length === 0 || isSaving}
              >
                  {isSaving ? 'Saving...' : editingProgram ? 'Update Program' : 'Create Program'}
              </Button>
            </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 9999 }}>
                <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-lg border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Program</h3>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete "{programName}"? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-end gap-3">
                    <Button
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 