"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { CalendarIcon, Clock, HelpCircle, Users, UserCheck, UserCog, ShoppingCart, DollarSign, UserPlus, X, BugPlay, FileText, Eye, ListChecks, AlertTriangle, ChevronRight, Edit as EditIcon, CheckCircle, ClipboardCheck } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { CreateRewardProgress } from "./create-reward-progress"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, updateDoc, doc, setDoc } from "firebase/firestore"

interface CreateRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: any
  isEditing?: boolean
  rewardId?: string
}

interface FormData {
  // Basic Details
  rewardName: string
  description: string
  type: string
  rewardVisibility: string
  pin: string
  pointsCost: string
  isActive: boolean
  delayedVisibility: boolean
  delayedVisibilityType: string
  delayedVisibilityTransactions: string
  delayedVisibilitySpend: string
  itemName: string
  voucherAmount: string
  spendThreshold: string

  // Conditions
  conditions: {
    useTransactionRequirements: boolean
    useSpendingRequirements: boolean
    useTimeRequirements: boolean
    minimumTransactions: string
    maximumTransactions: string
    daysSinceJoined: string
    daysSinceLastVisit: string
    minimumLifetimeSpend: string
    minimumPointsBalance: string
    membershipLevel: string
    newCustomer: boolean
  }

  // Limitations
  limitations: {
    totalRedemptionLimit: string
    perCustomerLimit: string
    useTimeRestrictions: boolean
    startTime: string
    endTime: string
    dayRestrictions: string[]
  }

  // New fields for Active Period
  hasActivePeriod: boolean
  activePeriod: {
    startDate: string
    endDate: string
  }
}

export function CreateRewardDialog({ 
  open, 
  onOpenChange,
  defaultValues,
  isEditing = false,
  rewardId
}: CreateRewardDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()
  const [formData, setFormData] = useState<FormData>({
    // Basic Details
    rewardName: "",
    description: "",
    type: "",
    rewardVisibility: "all",
    pin: "",
    pointsCost: "",
    isActive: true,
    delayedVisibility: false,
    delayedVisibilityType: "transactions",
    delayedVisibilityTransactions: "",
    delayedVisibilitySpend: "",
    itemName: "",
    voucherAmount: "",
    spendThreshold: "",

    // Conditions
    conditions: {
      useTransactionRequirements: false,
      useSpendingRequirements: false,
      useTimeRequirements: false,
      minimumTransactions: "",
      maximumTransactions: "",
      daysSinceJoined: "",
      daysSinceLastVisit: "",
      minimumLifetimeSpend: "",
      minimumPointsBalance: "",
      membershipLevel: "",
      newCustomer: false,
    },

    // Limitations
    limitations: {
      totalRedemptionLimit: "",
      perCustomerLimit: "",
      useTimeRestrictions: false,
      startTime: "",
      endTime: "",
      dayRestrictions: [],
    },

    // New fields for Active Period
    hasActivePeriod: false,
    activePeriod: {
      startDate: "",
      endDate: ""
    }
  })

  const { user } = useAuth()

  useEffect(() => {
    if (defaultValues) {
      setFormData(defaultValues)
    }
  }, [defaultValues])

  const rewardExamples = [
    {
      type: "discount",
      name: "First Purchase Discount",
      description: "Get 15% off your first purchase. Welcome to our loyalty program!"
    },
    {
      type: "discount",
      name: "Birthday Special",
      description: "Celebrate with 20% off any purchase during your birthday month."
    },
    {
      type: "freeItem",
      name: "Coffee Lover's Reward",
      description: "Enjoy a free regular coffee after purchasing 5 coffees."
    },
    {
      type: "freeItem",
      name: "Pastry Paradise",
      description: "Get a free pastry of your choice with any coffee purchase."
    },
    {
      type: "voucher",
      name: "$10 Welcome Voucher",
      description: "Start your journey with us using this $10 welcome voucher on any purchase."
    },
    {
      type: "voucher",
      name: "Loyalty Milestone",
      description: "Receive a $25 voucher when you reach 500 points. Thank you for your loyalty!"
    }
  ]

  // Validation functions
  const validateBasicDetails = () => {
    // Add null checks for all string values that might be undefined
    const nameValid = formData.rewardName?.trim() !== '';
    const descriptionValid = formData.description?.trim() !== '';
    const pointsCostValid = formData.pointsCost?.trim() !== '';
    
    // Return validation result
    return nameValid && descriptionValid && pointsCostValid;
  }

  const validateConditions = () => {
    // Add your conditions validation logic
    return true
  }

  const validateLimitations = () => {
    // Add your limitations validation logic
    return true
  }

  const validations = {
    basic: validateBasicDetails(),
    conditions: validateConditions(),
    limitations: validateLimitations()
  }

  const handleStepChange = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
      return
    }

    if (step === 2 && !validations.basic) {
      toast({
        title: "Complete Basic Details",
        description: "Please fill in all required fields before proceeding.",
        variant: "destructive"
      })
      return
    }

    if (step === 3 && !validations.conditions) {
      toast({
        title: "Complete Conditions",
        description: "Please set up the reward conditions before proceeding.",
        variant: "destructive"
      })
      return
    }

    setCurrentStep(step)
  }

  const steps = [
    {
      id: 1,
      name: "Basic Details",
      description: "Set the core reward information"
    },
    {
      id: 2,
      name: "Visibility",
      description: "Control who can see and claim this reward"
    },
    {
      id: 3,
      name: "Conditions",
      description: "Set conditions for reward eligibility"
    },
    {
      id: 4,
      name: "Limitations",
      description: "Set usage limits and restrictions"
    },
    {
      id: 5,
      name: "Review",
      description: "Review and create your reward"
    }
  ]

  // Add this helper function to convert local date to UTC timestamp
  const toUTCTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    return new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes()
    )).toISOString()
  }

  // Helper function to convert local time to UTC 12-hour format
  const toUTCTime = (time12h: string): string => {
    if (!time12h) return ""
    
    // Parse the input time
    const [time, period] = time12h.split(' ')
    const [hours, minutes] = time.split(':')
    let hour = parseInt(hours)
    
    // Convert to 24-hour first
    if (period === 'PM' && hour !== 12) hour += 12
    if (period === 'AM' && hour === 12) hour = 0
    
    // Convert back to 12-hour format
    const newPeriod = hour >= 12 ? 'PM' : 'AM'
    const newHour = hour % 12 || 12
    
    return `${newHour}:00 ${newPeriod}`
  }

  const saveReward = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to save rewards.",
        variant: "destructive"
      })
      return
    }

    try {
      // Transform conditions into array of objects
      const conditions = []

      // Transaction conditions
      if (formData.conditions.minimumTransactions) {
        conditions.push({
          type: "minimumTransactions",
          value: Number(formData.conditions.minimumTransactions)
        })
      }
      if (formData.conditions.maximumTransactions) {
        conditions.push({
          type: "maximumTransactions",
          value: Number(formData.conditions.maximumTransactions)
        })
      }

      // Spending conditions
      if (formData.conditions.minimumLifetimeSpend) {
        conditions.push({
          type: "minimumLifetimeSpend",
          value: Number(formData.conditions.minimumLifetimeSpend)
        })
      }
      if (formData.conditions.minimumPointsBalance) {
        conditions.push({
          type: "minimumPointsBalance",
          value: Number(formData.conditions.minimumPointsBalance)
        })
      }

      // Time-based conditions
      if (formData.conditions.daysSinceJoined) {
        conditions.push({
          type: "daysSinceJoined",
          value: Number(formData.conditions.daysSinceJoined)
        })
      }
      if (formData.conditions.daysSinceLastVisit) {
        conditions.push({
          type: "daysSinceLastVisit",
          value: Number(formData.conditions.daysSinceLastVisit)
        })
      }

      // Boolean conditions
      if (formData.conditions.newCustomer) {
        conditions.push({
          type: "newCustomer",
          value: 1
        })
      }

      // Membership level condition
      if (formData.conditions.membershipLevel) {
        conditions.push({
          type: "membershipLevel",
          value: formData.conditions.membershipLevel
        })
      }

      // Transform limitations into array of objects
      const limitations = []

      // Add active period to limitations if enabled
      if (formData.hasActivePeriod) {
        limitations.push({
          type: "activePeriod",
          value: {
            startDate: toUTCTimestamp(formData.activePeriod.startDate),
            endDate: toUTCTimestamp(formData.activePeriod.endDate)
          }
        })
      }

      // Add other limitations
      if (formData.limitations.totalRedemptionLimit) {
        limitations.push({
          type: "totalRedemptionLimit",
          value: Number(formData.limitations.totalRedemptionLimit)
        })
      }
      if (formData.limitations.perCustomerLimit) {
        limitations.push({
          type: "customerLimit",
          value: Number(formData.limitations.perCustomerLimit)
        })
      }

      // Time restrictions
      if (formData.limitations.useTimeRestrictions) {
        if (formData.limitations.startTime || formData.limitations.endTime) {
          limitations.push({
            type: "timeOfDay",
            value: {
              startTime: formData.limitations.startTime ? toUTCTime(formData.limitations.startTime) : "12:00 AM",
              endTime: formData.limitations.endTime ? toUTCTime(formData.limitations.endTime) : "11:59 PM"
            }
          })
        }

        // Add days of week restrictions
        if (formData.limitations.dayRestrictions.length > 0) {
          limitations.push({
            type: "daysOfWeek",
            value: formData.limitations.dayRestrictions
          })
        }
      }

      // Format delayed visibility as a single object with type and value
      const delayedVisibility = formData.delayedVisibility ? {
        type: formData.delayedVisibilityType === 'transactions' 
          ? 'totaltransactions' 
          : 'totalLifetimeSpend',
        value: formData.delayedVisibilityType === 'transactions'
          ? Number(formData.delayedVisibilityTransactions)
          : Number(formData.delayedVisibilitySpend)
      } : null

      const timestamp = new Date()
      const utcTimestamp = new Date(Date.UTC(
        timestamp.getFullYear(),
        timestamp.getMonth(),
        timestamp.getDate(),
        timestamp.getHours(),
        timestamp.getMinutes()
      ))

      const rewardData = {
        rewardName: formData.rewardName,
        description: formData.description,
        programtype: "points",
        isActive: formData.isActive,
        pointsCost: Math.max(0, Number(formData.pointsCost)),
        rewardVisibility: formData.rewardVisibility === 'conditional' ? 'conditional' : 'global',
        voucherAmount: Number(formData.voucherAmount) || 0,
        delayedVisibility,
        conditions,
        limitations,
        pin: formData.pin,
        createdAt: utcTimestamp,
        status: formData.isActive ? 'active' : 'inactive',
        merchantId: user.uid,
        updatedAt: utcTimestamp,
        minSpend: 0,
        reason: '',
        customers: [],
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        lastRedeemedAt: null,
        uniqueCustomerIds: []
      }

      // If editing, update the existing document in both collections
      if (isEditing && rewardId) {
        // Update in merchant's rewards subcollection
        const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId);
        await updateDoc(merchantRewardRef, {
          ...rewardData,
          updatedAt: new Date().toISOString()
        });
        
        // Also update in top-level rewards collection
        const globalRewardRef = doc(db, 'rewards', rewardId);
        await updateDoc(globalRewardRef, {
          ...rewardData,
          updatedAt: new Date().toISOString()
        });
        
        toast({
          title: "Reward Updated",
          description: "Your reward has been successfully updated.",
        });
      } 
      // Otherwise, create a new document in both collections
      else {
        // Create in merchant's rewards subcollection
        const merchantRewardsRef = collection(db, 'merchants', user.uid, 'rewards');
        const newRewardRef = await addDoc(merchantRewardsRef, {
          ...rewardData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        // Add the ID to the reward data
        const rewardWithId = {
          ...rewardData,
          id: newRewardRef.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Update the merchant's reward with the ID
        await updateDoc(
          doc(db, 'merchants', user.uid, 'rewards', newRewardRef.id),
          { id: newRewardRef.id }
        );
        
        // Also save to top-level rewards collection
        await setDoc(
          doc(db, 'rewards', newRewardRef.id),
          rewardWithId
        );
        
        toast({
          title: "Reward Created",
          description: "Your new reward has been successfully created.",
        });
      }

      // Close the dialog
      onOpenChange(false);
      
      // Optional: refresh the page or update the UI
      if (isEditing) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error saving reward:", error);
      toast({
        title: "Error",
        description: `Failed to ${isEditing ? 'update' : 'create'} reward. Please try again.`,
        variant: "destructive"
      });
    }
  }

  // Helper function to format the visibility text
  const getVisibilityText = (visibility: string) => {
    const map = {
      'all': 'All Customers',
      'new': 'New Customers Only',
      'existing': 'Existing Customers Only',
      'conditional': 'Conditional'
    }
    return map[visibility as keyof typeof map] || visibility
  }

  // Helper function to format the date safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return format(date, 'PPP')  // e.g. "Feb 24, 2025"
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  // Helper function to convert 24h to 12h format
  const to12HourFormat = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:00 ${ampm}`
  }

  const fillTestData = () => {
    setFormData({
      ...formData,
      rewardName: "Test Reward",
      description: "This is a test reward with all fields populated",
      pointsCost: "100",
      pin: "1234",
      isActive: true,
      hasActivePeriod: true,
      activePeriod: {
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      },
      rewardVisibility: "existing",
      delayedVisibility: true,
      delayedVisibilityType: "transactions",
      delayedVisibilityTransactions: "5",
      delayedVisibilitySpend: "100",
      voucherAmount: "10",
      type: "discount",
      itemName: "Test Item",
      spendThreshold: "50",
      conditions: {
        useTransactionRequirements: true,
        minimumTransactions: "1",
        maximumTransactions: "10",
        useSpendingRequirements: true,
        minimumLifetimeSpend: "500",
        minimumPointsBalance: "200",
        useTimeRequirements: true,
        daysSinceJoined: "30",
        daysSinceLastVisit: "7",
        newCustomer: false,
        membershipLevel: "silver"
      },
      limitations: {
        totalRedemptionLimit: "100",
        perCustomerLimit: "2",
        useTimeRestrictions: true,
        startTime: "9:00 AM",
        endTime: "5:00 PM",
        dayRestrictions: ["Monday", "Wednesday", "Friday"]
      }
    })
  }

  // Helper function to format the label text
  const formatLabel = (key: string): string => {
    return key
      // Split on capital letters and spaces
      .split(/(?=[A-Z])|(?:\s+)/)
      // Remove empty strings
      .filter(Boolean)
      // Capitalize first letter of each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Update the button text based on editing mode
  const submitButtonText = isEditing ? 'Update Reward' : 'Create Reward';

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <style jsx global>{`
        .dialog-content input:focus,
        .dialog-content textarea:focus,
        .dialog-content select:focus,
        .dialog-content [data-state="open"] {
          outline: none !important;
          box-shadow: none !important;
          border-color: #007AFF !important;
        }
      `}</style>
      <DialogContent 
        className="sm:max-w-[800px] h-[700px] flex flex-col dialog-content"
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl">
                  <span className="text-[#007AFF]">{isEditing ? 'Edit' : 'Create'}</span> {isEditing ? 'Reward' : 'New Reward'}
                </DialogTitle>
                <DialogDescription>
                  {isEditing 
                    ? 'Update the details of your existing reward.' 
                    : 'Design a new reward for your loyal customers. Fill out the details below.'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  onClick={fillTestData}
                >
                  <BugPlay className="h-4 w-4 mr-2" />
                  Test Fill
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                className="bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700"
                onClick={() => {
                  toast({
                    title: "Help Guide",
                    description: "Need help? Contact our support team for assistance with creating rewards.",
                  })
                }}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help Guide
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs 
          value={`step${currentStep}`} 
          onValueChange={(value) => setCurrentStep(Number(value.replace('step', '')))}
          className="w-full flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="step1" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Details
            </TabsTrigger>
            <TabsTrigger value="step2" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visibility
            </TabsTrigger>
            <TabsTrigger value="step3" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Conditions
            </TabsTrigger>
            <TabsTrigger value="step4" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Limitations
            </TabsTrigger>
            <TabsTrigger value="step5" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Review
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="step1" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Reward Name</Label>
                    <Input
                      value={formData.rewardName}
                      onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                      placeholder="Enter reward name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe your reward"
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Reward Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reward type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="discount">Discount</SelectItem>
                        <SelectItem value="freeItem">Free Item</SelectItem>
                        <SelectItem value="voucher">Gift Voucher</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Points Cost</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.pointsCost}
                      onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                      placeholder="Enter points cost"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>PIN Code (4 digits)</Label>
                    <Input
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        setFormData({ ...formData, pin: value })
                      }}
                      placeholder="Enter 4-digit PIN"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active Status</Label>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Set Active Period</Label>
                    <Switch
                      checked={formData.hasActivePeriod}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasActivePeriod: checked })}
                    />
                  </div>
                  {formData.hasActivePeriod && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !formData.activePeriod.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod.startDate ? (
                                formatDate(formData.activePeriod.startDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                      startDate: date.toISOString()
                                    }
                                  })
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="grid gap-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal",
                                !formData.activePeriod.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod.endDate ? (
                                formatDate(formData.activePeriod.endDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                              onSelect={(date) => {
                                if (date) {
                                  setFormData({
                                    ...formData,
                                    activePeriod: {
                                      ...formData.activePeriod,
                                      endDate: date.toISOString()
                                    }
                                  })
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Visibility Settings Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Visibility Settings</Label>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Reward Visibility</Label>
                    <Select
                      value={formData.rewardVisibility}
                      onValueChange={(value) => setFormData({ ...formData, rewardVisibility: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new">New Customers Only</SelectItem>
                        <SelectItem value="returning">Returning Customers Only</SelectItem>
                        <SelectItem value="vip">VIP Customers Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Delayed Visibility Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Delayed Visibility</Label>
                      <Switch
                        checked={formData.delayedVisibility}
                        onCheckedChange={(checked) => setFormData({ ...formData, delayedVisibility: checked })}
                      />
                    </div>
                  </div>
                  
                  {formData.delayedVisibility && (
                    <>
                      <div className="grid gap-2">
                        <Label>Visibility Requirement</Label>
                        <Select
                          value={formData.delayedVisibilityType}
                          onValueChange={(value) => setFormData({ ...formData, delayedVisibilityType: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select requirement type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transactions">Number of Transactions</SelectItem>
                            <SelectItem value="spend">Total Spend Amount</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {formData.delayedVisibilityType === 'transactions' ? (
                        <div className="grid gap-2">
                          <Label>Required Transactions</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.delayedVisibilityTransactions}
                            onChange={(e) => setFormData({ ...formData, delayedVisibilityTransactions: e.target.value })}
                            placeholder="Enter number of transactions"
                          />
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Label>Required Spend ($)</Label>
                          <Input
                            type="number"
                            min="1"
                            value={formData.delayedVisibilitySpend}
                            onChange={(e) => setFormData({ ...formData, delayedVisibilitySpend: e.target.value })}
                            placeholder="Enter spend amount"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Transaction Requirements Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Transaction Requirements</Label>
                      <Switch
                        checked={formData.conditions.useTransactionRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTransactionRequirements: checked
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useTransactionRequirements && (
                    <>
                      <div className="grid gap-2">
                        <Label>Minimum Transactions</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.minimumTransactions}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              minimumTransactions: e.target.value
                            }
                          })}
                          placeholder="Enter minimum transactions"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Maximum Transactions</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.maximumTransactions}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              maximumTransactions: e.target.value
                            }
                          })}
                          placeholder="Enter maximum transactions"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Spending Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Spending Requirements</Label>
                      <Switch
                        checked={formData.conditions.useSpendingRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useSpendingRequirements: checked
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useSpendingRequirements && (
                    <>
                      <div className="grid gap-2">
                        <Label>Minimum Lifetime Spend ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.minimumLifetimeSpend}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              minimumLifetimeSpend: e.target.value
                            }
                          })}
                          placeholder="Enter minimum lifetime spend"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Minimum Points Balance</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.minimumPointsBalance}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              minimumPointsBalance: e.target.value
                            }
                          })}
                          placeholder="Enter minimum points balance"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Time Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Time Requirements</Label>
                      <Switch
                        checked={formData.conditions.useTimeRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTimeRequirements: checked
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.conditions.useTimeRequirements && (
                    <>
                      <div className="grid gap-2">
                        <Label>Days Since Joined</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.daysSinceJoined}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              daysSinceJoined: e.target.value
                            }
                          })}
                          placeholder="Enter days since joined"
                        />
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Days Since Last Visit</Label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.conditions.daysSinceLastVisit}
                          onChange={(e) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              daysSinceLastVisit: e.target.value
                            }
                          })}
                          placeholder="Enter days since last visit"
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Other Requirements Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Other Requirements</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label>New Customer Only</Label>
                    <Switch
                      checked={formData.conditions.newCustomer}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          newCustomer: checked
                        }
                      })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step4" className="min-h-[400px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {/* Redemption Limits Section */}
                  <div className="border-b pb-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Redemption Limits</Label>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Total Redemption Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limitations.totalRedemptionLimit}
                      onChange={(e) => setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                          totalRedemptionLimit: e.target.value
                        }
                      })}
                      placeholder="Enter total redemption limit (leave empty for unlimited)"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Per Customer Limit</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.limitations.perCustomerLimit}
                      onChange={(e) => setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                          perCustomerLimit: e.target.value
                        }
                      })}
                      placeholder="Enter per customer limit (leave empty for unlimited)"
                    />
                  </div>
                  
                  {/* Time Restrictions Section */}
                  <div className="border-b pb-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Time Restrictions</Label>
                      <Switch
                        checked={formData.limitations.useTimeRestrictions}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          limitations: {
                            ...formData.limitations,
                            useTimeRestrictions: checked
                          }
                        })}
                      />
                    </div>
                  </div>
                  
                  {formData.limitations.useTimeRestrictions && (
                    <>
                      <div className="grid gap-2">
                        <Label>Start Time</Label>
                        <Select
                          value={formData.limitations.startTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              startTime: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => {
                              const hour = i % 12 || 12
                              const period = i < 12 ? 'AM' : 'PM'
                              return (
                                <SelectItem key={i} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>End Time</Label>
                        <Select
                          value={formData.limitations.endTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              endTime: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }).map((_, i) => {
                              const hour = i % 12 || 12
                              const period = i < 12 ? 'AM' : 'PM'
                              return (
                                <SelectItem key={i} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Day Restrictions</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                            <Button
                              key={day}
                              type="button"
                              variant={formData.limitations.dayRestrictions.includes(day) ? "default" : "outline"}
                              onClick={() => {
                                const newDays = formData.limitations.dayRestrictions.includes(day)
                                  ? formData.limitations.dayRestrictions.filter(d => d !== day)
                                  : [...formData.limitations.dayRestrictions, day]
                                setFormData({
                                  ...formData,
                                  limitations: {
                                    ...formData.limitations,
                                    dayRestrictions: newDays
                                  }
                                })
                              }}
                            >
                              {day.substring(0, 3)}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step5" className="space-y-6 py-4">
              {/* Basic Details Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Basic Details</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(1)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Reward Name</p>
                      <p className="text-sm">{formData.rewardName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Points Cost</p>
                      <p className="text-sm">{formData.pointsCost} points</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">PIN Code</p>
                      <p className="text-sm">{formData.pin}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          formData.isActive ? "bg-green-500" : "bg-gray-300"
                        )} />
                        <p className="text-sm">
                          {formData.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Description</p>
                    <p className="text-sm">{formData.description}</p>
                  </div>
                </div>
              </div>

              {/* Visibility Settings Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Visibility Settings</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(2)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Available To</p>
                      <p className="text-sm">{getVisibilityText(formData.rewardVisibility)}</p>
                    </div>
                    {formData.delayedVisibility && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Delayed Visibility</p>
                        <p className="text-sm">
                          {formData.delayedVisibilityType === 'transactions' 
                            ? `After ${formData.delayedVisibilityTransactions} transactions`
                            : `After $${formData.delayedVisibilitySpend} spent`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                  {formData.hasActivePeriod && (
                    <div className="space-y-1 pt-2 border-t">
                      <p className="text-sm font-medium text-muted-foreground">Active Period</p>
                      <p className="text-sm">
                        {formData.activePeriod.startDate && formData.activePeriod.endDate ? 
                          `${new Date(formData.activePeriod.startDate).toLocaleDateString()} to ${new Date(formData.activePeriod.endDate).toLocaleDateString()}`
                          : "Date range not specified"
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Conditions</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(3)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4">
                  {Object.entries(formData.conditions)
                    .filter(([key, value]) => 
                      value && 
                      value !== "" && 
                      !key.startsWith('use')
                    )
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {formatLabel(key)}
                        </p>
                        <p className="text-sm">
                          {typeof value === 'boolean' 
                            ? value ? 'Yes' : 'No' 
                            : String(value)}
                        </p>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Limitations Review */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-medium">Limitations</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                    onClick={() => handleStepChange(4)}
                  >
                    <EditIcon className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="rounded-md border p-4">
                  {Object.entries(formData.limitations)
                    .filter(([key, value]) => 
                      value && 
                      value !== "" && 
                      !key.startsWith('use')
                    ).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(formData.limitations)
                        .filter(([key, value]) => 
                          value && 
                          value !== "" && 
                          !key.startsWith('use')
                        )
                        .map(([key, value]) => (
                          <div key={key} className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">
                              {formatLabel(key)}
                            </p>
                            <p className="text-sm">
                              {Array.isArray(value) ? value.join(', ') : value}
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No limitations set
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="absolute left-4">
              <span className="text-xl font-bold">
                <span className="text-[#007AFF] font-extrabold">Tap</span>
                {' '}
                <span>Loyalty</span>
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={async () => {
                  if (currentStep < 5) {
                    if (currentStep === 1 && !validateBasicDetails()) {
                      toast({
                        title: "Incomplete Form",
                        description: "Please fill out all required fields. Name, description, and a 4-digit PIN are required.",
                        variant: "destructive"
                      })
                      return
                    }
                    handleStepChange(currentStep + 1)
                  } else {
                    if (validations.basic && validations.conditions && validations.limitations) {
                      await saveReward()
                    } else {
                      toast({
                        title: "Incomplete Form",
                        description: "Please complete all required fields before creating the reward.",
                        variant: "destructive"
                      })
                    }
                  }
                }}
                disabled={currentStep === 5 && !(validations.basic && validations.conditions && validations.limitations)}
              >
                {currentStep === 5 ? submitButtonText : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 