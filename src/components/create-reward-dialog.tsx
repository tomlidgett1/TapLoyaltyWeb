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
  defaultValues 
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
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to create rewards.",
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

      // Save to merchant's rewards subcollection
      const merchantRewardRef = await addDoc(
        collection(db, 'merchants', user.uid, 'rewards'),
        rewardData
      )

      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: merchantRewardRef.id
      }

      // Update the merchant's reward with the ID
      await updateDoc(
        doc(db, 'merchants', user.uid, 'rewards', merchantRewardRef.id),
        { id: merchantRewardRef.id }
      )

      // Save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', merchantRewardRef.id),
        rewardWithId
      )

      toast({
        title: "Success",
        description: "Your reward has been created successfully.",
      })

      onOpenChange(false)
      return merchantRewardRef.id
    } catch (error) {
      console.error('Error creating reward:', error)
      toast({
        title: "Error",
        description: "There was a problem creating your reward. Please try again.",
        variant: "destructive"
      })
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

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogContent 
        className="sm:max-w-[800px] h-[700px] flex flex-col"
        closeable={false}
      >
        <DialogHeader className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl">
                  <span className="text-[#007AFF]">Create</span> New Reward
                </DialogTitle>
                <DialogDescription>
                  Design a new reward for your loyal customers. Fill out the details below.
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
                onClick={() => {
                  // Your template logic here
                }}
              >
                Create from Template
              </Button>
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
              <span>Basic Details</span>
            </TabsTrigger>
            <TabsTrigger value="step2" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>Visibility</span>
            </TabsTrigger>
            <TabsTrigger value="step3" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Conditions</span>
            </TabsTrigger>
            <TabsTrigger value="step4" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Limitations</span>
            </TabsTrigger>
            <TabsTrigger value="step5" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span>Review</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="step1" className="space-y-6 py-4">
              {/* Reward Information Group */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">Reward Information</h3>
                <div className="rounded-md border p-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Reward Name</Label>
                    <Input 
                      value={formData.rewardName}
                      onChange={(e) => setFormData({...formData, rewardName: e.target.value})}
                      placeholder="e.g., Free Coffee"
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose a clear, descriptive name for your reward
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe what the customer will receive"
                    />
                    <p className="text-sm text-muted-foreground">
                      Provide details about the reward and how to redeem it
                    </p>
                  </div>
                </div>
              </div>

              {/* Reward Settings Group */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">Reward Settings</h3>
                <div className="rounded-md border p-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Points Cost</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={formData.pointsCost}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value))
                        setFormData({...formData, pointsCost: value.toString()})
                      }}
                      placeholder="Enter points required"
                    />
                    <p className="text-sm text-muted-foreground">
                      Number of points needed to redeem this reward
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>PIN Code</Label>
                    <Input 
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        setFormData({...formData, pin: value})
                      }}
                      placeholder="Enter 4-digit PIN"
                    />
                    <p className="text-sm text-muted-foreground">
                      Set a 4-digit PIN code for staff to verify redemptions
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Active Status</Label>
                      <p className="text-sm text-muted-foreground">
                        Make this reward available immediately
                      </p>
                    </div>
                    <Switch 
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({...formData, isActive: checked})}
                    />
                  </div>

                  {/* Add Active Period section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label>Active Period</Label>
                        <p className="text-sm text-muted-foreground">
                          Set when this reward is available
                        </p>
                      </div>
                      <Switch 
                        checked={formData.hasActivePeriod}
                        onCheckedChange={(checked) => setFormData({
                          ...formData, 
                          hasActivePeriod: checked,
                          activePeriod: {
                            startDate: "",
                            endDate: ""
                          }
                        })}
                      />
                    </div>

                    {formData.hasActivePeriod && (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !formData.activePeriod.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.activePeriod.startDate ? 
                                  format(new Date(formData.activePeriod.startDate), "PPP") : 
                                  "Select date"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.activePeriod.startDate ? new Date(formData.activePeriod.startDate) : undefined}
                                onSelect={(date) => setFormData({
                                  ...formData,
                                  activePeriod: {
                                    ...formData.activePeriod,
                                    startDate: date ? date.toISOString() : ""
                                  }
                                })}
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
                                  "w-full justify-start text-left font-normal",
                                  !formData.activePeriod.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {formData.activePeriod.endDate ? 
                                  format(new Date(formData.activePeriod.endDate), "PPP") : 
                                  "Select date"
                                }
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={formData.activePeriod.endDate ? new Date(formData.activePeriod.endDate) : undefined}
                                onSelect={(date) => setFormData({
                                  ...formData,
                                  activePeriod: {
                                    ...formData.activePeriod,
                                    endDate: date ? date.toISOString() : ""
                                  }
                                })}
                                disabled={(date) => 
                                  date < new Date(formData.activePeriod.startDate) ||
                                  date < new Date()
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    )}
                    {!formData.hasActivePeriod && (
                      <p className="text-sm text-muted-foreground italic">
                        This reward will run indefinitely
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="space-y-4 py-4">
              <div className="space-y-6">
                {/* Reward Visibility Group */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium">Reward Visibility</h3>
                  <div className="rounded-md border p-4 space-y-4">
                    <Select 
                      value={formData.rewardVisibility}
                      onValueChange={(value) => setFormData({
                        ...formData, 
                        rewardVisibility: value,
                        conditions: {
                          ...formData.conditions,
                          minimumTransactions: value === 'existing' ? "1" : "",
                          maximumTransactions: value === 'new' ? "0" : ""
                        },
                        delayedVisibility: value === 'new' ? false : formData.delayedVisibility,
                        delayedVisibilityType: value === 'new' ? "transactions" : formData.delayedVisibilityType,
                        delayedVisibilityTransactions: value === 'new' ? "" : formData.delayedVisibilityTransactions,
                        delayedVisibilitySpend: value === 'new' ? "" : formData.delayedVisibilitySpend
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          <div className="flex items-center">
                            <Users className="mr-2 h-4 w-4" />
                            All Customers
                          </div>
                        </SelectItem>
                        <SelectItem value="new">
                          <div className="flex items-center">
                            <UserPlus className="mr-2 h-4 w-4" />
                            New Customers
                          </div>
                        </SelectItem>
                        <SelectItem value="existing">
                          <div className="flex items-center">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Existing Customers
                          </div>
                        </SelectItem>
                        <SelectItem value="conditional">
                          <div className="flex items-center">
                            <UserCog className="mr-2 h-4 w-4" />
                            Conditional Customers
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Show requirements based on selection */}
                    {formData.rewardVisibility === 'existing' && (
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span>Minimum Lifetime Transactions: 1</span>
                        </div>
                      </div>
                    )}
                    {formData.rewardVisibility === 'new' && (
                      <div className="rounded-md bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span>Maximum Lifetime Transactions: 0</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delayed Visibility Group */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-medium">Delayed Visibility</h3>
                    <Switch 
                      checked={formData.delayedVisibility}
                      onCheckedChange={(checked) => setFormData({
                        ...formData, 
                        delayedVisibility: checked,
                        delayedVisibilityType: checked ? formData.delayedVisibilityType : "transactions",
                        delayedVisibilityTransactions: "",
                        delayedVisibilitySpend: ""
                      })}
                      disabled={formData.rewardVisibility === 'new'}
                    />
                  </div>

                  {formData.delayedVisibility && (
                    <div className={cn(
                      "rounded-md border p-4 space-y-4",
                      formData.rewardVisibility === 'new' && "opacity-50"
                    )}>
                      <Select 
                        value={formData.delayedVisibilityType}
                        onValueChange={(value) => setFormData({
                          ...formData,
                          delayedVisibilityType: value,
                          delayedVisibilityTransactions: "",
                          delayedVisibilitySpend: ""
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="transactions">
                            <div className="flex items-center">
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              Total Lifetime Transactions
                            </div>
                          </SelectItem>
                          <SelectItem value="spend">
                            <div className="flex items-center">
                              <DollarSign className="mr-2 h-4 w-4" />
                              Total Lifetime Spend
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {formData.delayedVisibilityType === 'transactions' && (
                        <div className="grid gap-2">
                          <Label>Required Transactions</Label>
                          <Input 
                            type="number"
                            value={formData.delayedVisibilityTransactions}
                            onChange={(e) => setFormData({
                              ...formData,
                              delayedVisibilityTransactions: e.target.value
                            })}
                            placeholder="Enter number of transactions"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Reward becomes visible after this many transactions
                          </p>
                        </div>
                      )}

                      {formData.delayedVisibilityType === 'spend' && (
                        <div className="grid gap-2">
                          <Label>Required Spend ($)</Label>
                          <Input 
                            type="number"
                            value={formData.delayedVisibilitySpend}
                            onChange={(e) => setFormData({
                              ...formData,
                              delayedVisibilitySpend: e.target.value
                            })}
                            placeholder="Enter spend amount"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Reward becomes visible after this spend amount
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="space-y-4 py-4">
              <div className="space-y-6">
                {/* Main container */}
                <div className="space-y-6">
                  {/* Transaction Requirements Group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Transaction Requirements</h3>
                      <Switch 
                        checked={formData.conditions.useTransactionRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTransactionRequirements: checked,
                            minimumTransactions: formData.rewardVisibility === 'existing' ? "1" : "",
                            maximumTransactions: ""
                          }
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                      />
                    </div>

                    {formData.conditions.useTransactionRequirements && (
                      <div className={cn(
                        "space-y-4 rounded-md border p-4",
                        formData.rewardVisibility === 'new' && "opacity-50"
                      )}>
                        <div className="grid gap-2">
                          <Label>Minimum Transactions</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.minimumTransactions}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, minimumTransactions: e.target.value }
                            })}
                            placeholder="Enter minimum transactions"
                            disabled={formData.rewardVisibility === 'new' || formData.rewardVisibility === 'existing'}
                          />
                          {formData.rewardVisibility === 'existing' && (
                            <p className="text-sm text-muted-foreground">
                              Fixed at 1 transaction for existing customers
                            </p>
                          )}
                        </div>

                        <div className="grid gap-2">
                          <Label>Maximum Transactions</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.maximumTransactions}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, maximumTransactions: e.target.value }
                            })}
                            placeholder="Enter maximum transactions"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          {formData.rewardVisibility === 'new' && (
                            <p className="text-sm text-muted-foreground">
                              Set to 0 for new customers
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Spending Requirements Group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Spending Requirements</h3>
                      <Switch 
                        checked={formData.conditions.useSpendingRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useSpendingRequirements: checked,
                            minimumLifetimeSpend: "",
                            minimumPointsBalance: ""
                          }
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                      />
                    </div>

                    {formData.conditions.useSpendingRequirements && (
                      <div className={cn(
                        "space-y-4 rounded-md border p-4",
                        formData.rewardVisibility === 'new' && "opacity-50"
                      )}>
                        <div className="grid gap-2">
                          <Label>Minimum Lifetime Spend ($)</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.minimumLifetimeSpend}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, minimumLifetimeSpend: e.target.value }
                            })}
                            placeholder="Enter minimum spend amount"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Customer must have spent at least this amount
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label>Minimum Points Balance</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.minimumPointsBalance}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, minimumPointsBalance: e.target.value }
                            })}
                            placeholder="Enter minimum points"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Customer must have at least this many points
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Time-based Requirements Group */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Time-based Requirements</h3>
                      <Switch 
                        checked={formData.conditions.useTimeRequirements}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            useTimeRequirements: checked,
                            daysSinceJoined: "",
                            daysSinceLastVisit: ""
                          }
                        })}
                        disabled={formData.rewardVisibility === 'new'}
                      />
                    </div>

                    {formData.conditions.useTimeRequirements && (
                      <div className={cn(
                        "space-y-4 rounded-md border p-4",
                        formData.rewardVisibility === 'new' && "opacity-50"
                      )}>
                        <div className="grid gap-2">
                          <Label>Days Since Joined</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.daysSinceJoined}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, daysSinceJoined: e.target.value }
                            })}
                            placeholder="Enter number of days"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Customer must be a member for at least this many days
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label>Days Since Last Visit</Label>
                          <Input 
                            type="number"
                            value={formData.conditions.daysSinceLastVisit}
                            onChange={(e) => setFormData({
                              ...formData,
                              conditions: { ...formData.conditions, daysSinceLastVisit: e.target.value }
                            })}
                            placeholder="Enter number of days"
                            disabled={formData.rewardVisibility === 'new'}
                          />
                          <p className="text-sm text-muted-foreground">
                            Customer's last visit must be within this many days
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Membership Level Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-medium">Membership Level</h3>
                      <Switch 
                        checked={!!formData.conditions.membershipLevel}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          conditions: {
                            ...formData.conditions,
                            membershipLevel: checked ? "bronze" : "" // Default to bronze when enabled
                          }
                        })}
                      />
                    </div>

                    {formData.conditions.membershipLevel && (
                      <div className="rounded-md border p-4 space-y-4">
                        <Select
                          value={formData.conditions.membershipLevel}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            conditions: {
                              ...formData.conditions,
                              membershipLevel: value
                            }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select membership level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          Only customers with this membership level or higher can see this reward
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step4" className="space-y-6 py-4">
              {/* Redemption Limits Group */}
              <div className="space-y-4">
                <h3 className="text-base font-medium">Redemption Limits</h3>
                <div className="rounded-md border p-4 space-y-4">
                  <div className="grid gap-2">
                    <Label>Total Redemption Limit</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={formData.limitations.totalRedemptionLimit}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value))
                        setFormData({
                          ...formData,
                          limitations: { 
                            ...formData.limitations, 
                            totalRedemptionLimit: value.toString() 
                          }
                        })
                      }}
                      placeholder="Enter total limit"
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum number of times this reward can be redeemed by all customers
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Per Customer Limit</Label>
                    <Input 
                      type="number"
                      min="0"
                      value={formData.limitations.perCustomerLimit}
                      onChange={(e) => {
                        const value = Math.max(0, Number(e.target.value))
                        setFormData({
                          ...formData,
                          limitations: { 
                            ...formData.limitations, 
                            perCustomerLimit: value.toString() 
                          }
                        })
                      }}
                      placeholder="Enter customer limit"
                    />
                    <p className="text-sm text-muted-foreground">
                      Maximum number of times each customer can redeem this reward
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Restrictions Group */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium">Time Restrictions</h3>
                  <Switch 
                    checked={formData.limitations.useTimeRestrictions}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      limitations: { 
                        ...formData.limitations, 
                        useTimeRestrictions: checked,
                        startTime: "",
                        endTime: "",
                        dayRestrictions: []
                      }
                    })}
                  />
                </div>

                {formData.limitations.useTimeRestrictions && (
                  <div className="rounded-md border p-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>Start Time</Label>
                        <Select
                          value={formData.limitations.startTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: { ...formData.limitations, startTime: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem 
                                key={to12HourFormat(i)} 
                                value={to12HourFormat(i)}
                              >
                                {to12HourFormat(i)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>End Time</Label>
                        <Select
                          value={formData.limitations.endTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            limitations: { ...formData.limitations, endTime: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => (
                              <SelectItem 
                                key={to12HourFormat(i)} 
                                value={to12HourFormat(i)}
                              >
                                {to12HourFormat(i)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Available Days</Label>
                      <div className="flex flex-wrap gap-2">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const isSelected = formData.limitations.dayRestrictions.includes(day)
                          return (
                            <Button
                              key={day}
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              className={cn(
                                "w-[90px]",
                                isSelected && "bg-[#007AFF] hover:bg-[#007AFF]/90 text-white"
                              )}
                              onClick={() => {
                                const newDays = isSelected
                                  ? formData.limitations.dayRestrictions.filter(d => d !== day)
                                  : [...formData.limitations.dayRestrictions, day]
                                setFormData({
                                  ...formData,
                                  limitations: { ...formData.limitations, dayRestrictions: newDays }
                                })
                              }}
                            >
                              {day.slice(0, 3)}
                            </Button>
                          )
                        })}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Select which days this reward is available
                      </p>
                    </div>
                  </div>
                )}
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
                        {`${format(new Date(formData.activePeriod.startDate), 'PPP')} to ${format(new Date(formData.activePeriod.endDate), 'PPP')}`}
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
                  ).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
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
                              {typeof value === 'number' ? value.toString() : value}
                            </p>
                          </div>
                        ))
                      }
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No conditions set
                    </p>
                  )}
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
                {currentStep === 5 ? 'Create Reward' : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 