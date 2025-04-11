"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { CalendarIcon, ArrowLeft, ArrowRight, Check, HelpCircle, FileText } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface BasicRewardWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues: any
  onSave: (data: any) => void
  isEditing?: boolean
  rewardId?: string
  customerId?: string
  customerName?: string
}

export function BasicRewardWizard({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  isEditing = false,
  rewardId,
  customerId,
  customerName
}: BasicRewardWizardProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState(defaultValues)
  const { toast } = useToast()
  
  useEffect(() => {
    if (defaultValues) {
      setFormData(defaultValues)
    }
  }, [defaultValues])
  
  const totalSteps = 3
  
  const handleNext = () => {
    if (step === 1) {
      // Validate basic details
      if (!formData.rewardName?.trim()) {
        toast({
          title: "Missing reward name",
          description: "Please enter a name for your reward",
          variant: "destructive"
        })
        return
      }
      
      if (!formData.description?.trim()) {
        toast({
          title: "Missing description",
          description: "Please enter a description for your reward",
          variant: "destructive"
        })
        return
      }
      
      if (!formData.pointsCost) {
        toast({
          title: "Missing points cost",
          description: "Please enter how many points this reward costs",
          variant: "destructive"
        })
        return
      }
    }
    
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      // Save the form data
      onSave(formData)
    }
  }
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }
  
  // Helper function to format the date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Pick a date'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Invalid date'
      return format(date, 'PPP')  // e.g. "Feb 24, 2025"
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[700px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            <span className="text-[#007AFF]">{isEditing ? 'Edit' : 'Create'}</span> {isEditing ? 'Reward' : 'New Reward'}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Let's start with the basic details of your reward."}
            {step === 2 && "Now, let's set who can see this reward and any conditions they need to meet."}
            {step === 3 && "Finally, let's set any limitations on how this reward can be used."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4 px-6">
          {/* Step 1: Basic Details */}
          {step === 1 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reward Information</CardTitle>
                  <CardDescription>
                    These are the core details customers will see about your reward
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rewardName">Reward Name</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Choose a clear, concise name that describes what customers will get
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="rewardName"
                      value={formData.rewardName}
                      onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                      placeholder="e.g. Free Coffee, 10% Discount"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description">Description</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Provide details about what the reward includes and how to redeem it
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what the customer gets with this reward"
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="type">Reward Type</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Select the category that best describes your reward
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger id="type">
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Reward Settings</CardTitle>
                  <CardDescription>
                    Configure how much this reward costs and when it's available
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pointsCost">Points Cost</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              How many points a customer needs to redeem this reward
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="pointsCost"
                      type="number"
                      min="0"
                      value={formData.pointsCost}
                      onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                      placeholder="Enter points cost"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="pin">PIN Code (4 digits)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Optional security code that staff can verify when a customer redeems
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="pin"
                      maxLength={4}
                      value={formData.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                        setFormData({ ...formData, pin: value })
                      }}
                      placeholder="Enter 4-digit PIN"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Active Status</Label>
                      <div className="text-sm text-muted-foreground">
                        Is this reward currently available to customers?
                      </div>
                    </div>
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Set Active Period</Label>
                      <div className="text-sm text-muted-foreground">
                        Limit this reward to a specific date range
                      </div>
                    </div>
                    <Switch
                      checked={formData.hasActivePeriod}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasActivePeriod: checked })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.hasActivePeriod && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal w-full",
                                !formData.activePeriod?.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod?.startDate ? (
                                formatDate(formData.activePeriod.startDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod?.startDate ? new Date(formData.activePeriod.startDate) : undefined}
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
                      
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "justify-start text-left font-normal w-full",
                                !formData.activePeriod?.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {formData.activePeriod?.endDate ? (
                                formatDate(formData.activePeriod.endDate)
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={formData.activePeriod?.endDate ? new Date(formData.activePeriod.endDate) : undefined}
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
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 2: Visibility and Conditions */}
          {step === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Reward Visibility</CardTitle>
                  <CardDescription>
                    Control which customers can see and claim this reward
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="rewardVisibility">Available To</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Choose which customers can see this reward in the app
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select
                      value={formData.rewardVisibility}
                      onValueChange={(value) => setFormData({ ...formData, rewardVisibility: value })}
                    >
                      <SelectTrigger id="rewardVisibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="new">New Customers Only</SelectItem>
                        <SelectItem value="returning">Returning Customers Only</SelectItem>
                        <SelectItem value="vip">VIP Customers Only</SelectItem>
                        {customerId && (
                          <SelectItem value="specific">Specific Customer Only</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Delayed Visibility</Label>
                      <div className="text-sm text-muted-foreground">
                        Only show this reward after customers meet certain criteria
                      </div>
                    </div>
                    <Switch
                      checked={formData.delayedVisibility}
                      onCheckedChange={(checked) => setFormData({ ...formData, delayedVisibility: checked })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.delayedVisibility && (
                    <>
                      <div className="space-y-2 pt-2">
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
                        <div className="space-y-2">
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
                        <div className="space-y-2">
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
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Reward Conditions</CardTitle>
                  <CardDescription>
                    Set requirements customers must meet to be eligible for this reward
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Transaction Requirements</Label>
                      <div className="text-sm text-muted-foreground">
                        Set minimum or maximum transaction requirements
                      </div>
                    </div>
                    <Switch
                      checked={formData.conditions.useTransactionRequirements}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          useTransactionRequirements: checked,
                          minimumTransactions: checked ? formData.conditions.minimumTransactions : "",
                          maximumTransactions: checked ? formData.conditions.maximumTransactions : ""
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.conditions.useTransactionRequirements && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
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
                          placeholder="Enter minimum"
                        />
                      </div>
                      
                      <div className="space-y-2">
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
                          placeholder="Enter maximum"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Spending Requirements</Label>
                      <div className="text-sm text-muted-foreground">
                        Set minimum spending or points balance requirements
                      </div>
                    </div>
                    <Switch
                      checked={formData.conditions.useSpendingRequirements}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          useSpendingRequirements: checked,
                          minimumLifetimeSpend: checked ? formData.conditions.minimumLifetimeSpend : "",
                          minimumPointsBalance: checked ? formData.conditions.minimumPointsBalance : ""
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.conditions.useSpendingRequirements && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
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
                          placeholder="Enter amount"
                        />
                      </div>
                      
                      <div className="space-y-2">
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
                          placeholder="Enter points"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Time Requirements</Label>
                      <div className="text-sm text-muted-foreground">
                        Set requirements based on customer history
                      </div>
                    </div>
                    <Switch
                      checked={formData.conditions.useTimeRequirements}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          useTimeRequirements: checked,
                          daysSinceJoined: checked ? formData.conditions.daysSinceJoined : "",
                          daysSinceLastVisit: checked ? formData.conditions.daysSinceLastVisit : ""
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.conditions.useTimeRequirements && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
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
                          placeholder="Enter days"
                        />
                      </div>
                      
                      <div className="space-y-2">
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
                          placeholder="Enter days"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>New Customer Only</Label>
                      <div className="text-sm text-muted-foreground">
                        Limit this reward to first-time customers
                      </div>
                    </div>
                    <Switch
                      checked={formData.conditions.newCustomer}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          newCustomer: checked
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between pt-2">
                    <div className="space-y-0.5">
                      <Label>Membership Level Requirements</Label>
                      <div className="text-sm text-muted-foreground">
                        Require a specific membership tier
                      </div>
                    </div>
                    <Switch
                      checked={formData.conditions.useMembershipRequirements}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        conditions: {
                          ...formData.conditions,
                          useMembershipRequirements: checked,
                          membershipLevel: checked ? formData.conditions.membershipLevel : ""
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.conditions.useMembershipRequirements && (
                    <div className="space-y-2 pt-2">
                      <Label>Required Membership Level</Label>
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
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Step 3: Limitations */}
          {step === 3 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Redemption Limits</CardTitle>
                  <CardDescription>
                    Set limits on how many times this reward can be redeemed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalRedemptionLimit">Total Redemption Limit</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Maximum number of times this reward can be redeemed by all customers combined
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="totalRedemptionLimit"
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
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="w-[200px]">
                              Maximum number of times each customer can redeem this reward
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="perCustomerLimit"
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
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Time Restrictions</CardTitle>
                  <CardDescription>
                    Limit when this reward can be redeemed
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Time of Day Restrictions</Label>
                      <div className="text-sm text-muted-foreground">
                        Limit redemptions to specific hours
                      </div>
                    </div>
                    <Switch
                      checked={formData.limitations.useTimeRestrictions}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        limitations: {
                          ...formData.limitations,
                          useTimeRestrictions: checked,
                          startTime: checked ? formData.limitations.startTime : "",
                          endTime: checked ? formData.limitations.endTime : ""
                        }
                      })}
                      className="data-[state=checked]:bg-[#007AFF]"
                    />
                  </div>
                  
                  {formData.limitations.useTimeRestrictions && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Input
                          type="time"
                          value={formData.limitations.startTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              startTime: e.target.value
                            }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          type="time"
                          value={formData.limitations.endTime}
                          onChange={(e) => setFormData({
                            ...formData,
                            limitations: {
                              ...formData.limitations,
                              endTime: e.target.value
                            }
                          })}
                        />
                      </div>
                    </div>
                  )}
                  
                  {formData.limitations.useTimeRestrictions && (
                    <div className="space-y-2 pt-2">
                      <Label>Days of Week</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <div key={day} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day}`}
                              checked={formData.limitations.dayRestrictions?.includes(day)}
                              onCheckedChange={(checked) => {
                                const currentDays = formData.limitations.dayRestrictions || [];
                                const updatedDays = checked
                                  ? [...currentDays, day]
                                  : currentDays.filter(d => d !== day);
                                
                                setFormData({
                                  ...formData,
                                  limitations: {
                                    ...formData.limitations,
                                    dayRestrictions: updatedDays
                                  }
                                });
                              }}
                            />
                            <Label htmlFor={`day-${day}`} className="text-sm">
                              {day.substring(0, 3)}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Review Summary</CardTitle>
                  <CardDescription>
                    Here's a summary of your reward settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                        <div>
                          <h4 className="font-medium text-blue-800">{formData.rewardName}</h4>
                          <p className="text-sm text-blue-700 mt-1">{formData.pointsCost} points</p>
                          <p className="text-sm text-blue-600 mt-2">{formData.description}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Visibility</h4>
                        <p className="text-sm">
                          {formData.rewardVisibility === 'all' ? 'All Customers' :
                           formData.rewardVisibility === 'new' ? 'New Customers Only' :
                           formData.rewardVisibility === 'returning' ? 'Returning Customers Only' :
                           formData.rewardVisibility === 'vip' ? 'VIP Customers Only' :
                           formData.rewardVisibility === 'specific' ? 'Specific Customer Only' : 'Unknown'}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
                        <p className="text-sm">{formData.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                      
                      {formData.hasActivePeriod && (
                        <div className="col-span-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Active Period</h4>
                          <p className="text-sm">
                            {formData.activePeriod?.startDate && formData.activePeriod?.endDate
                              ? `${formatDate(formData.activePeriod.startDate)} to ${formatDate(formData.activePeriod.endDate)}`
                              : 'No active period set'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        <DialogFooter className="flex justify-between border-t pt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleBack}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            type="button" 
            onClick={handleNext}
            className="bg-[#007AFF] hover:bg-[#0062CC] text-white"
          >
            {step === totalSteps ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                {isEditing ? 'Update Reward' : 'Create Reward'}
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 