"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { FileText, Clock, ListChecks, Edit as EditIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"

interface CreatePointsRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePointsRuleDialog({ open, onOpenChange }: CreatePointsRuleDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    // Basic Details
    name: "",
    pointsmultiplier: "1",

    // Conditions
    useTimeRestrictions: false,
    startTime: "",
    endTime: "",
    useMinimumSpend: false,
    minimumSpend: "",
    useDayRestrictions: false,
    dayRestrictions: [] as string[],
  })

  // After the form data state declaration, add a list of predefined rules that users can select from
  const TEMPLATE_RULES = [
    {
      name: "Morning Coffee Bonus",
      pointsmultiplier: 1.5,
      conditions: [
        {
          type: "timeOfDay",
          startTime: "07:00",
          endTime: "10:00"
        },
        {
          type: "daysOfWeek",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        }
      ]
    },
    {
      name: "Weekend Treat",
      pointsmultiplier: 3,
      conditions: [
        {
          type: "daysOfWeek",
          days: ["Saturday", "Sunday"]
        }
      ]
    }
  ]

  // Add a function to apply a template rule to the form
  const applyTemplate = (template: any) => {
    // Create a new form data object
    const newFormData = { ...formData, name: template.name, pointsmultiplier: template.pointsmultiplier.toString() }
    
    // Apply conditions from the template
    template.conditions.forEach((condition: any) => {
      if (condition.type === "timeOfDay") {
        newFormData.useTimeRestrictions = true
        newFormData.startTime = condition.startTime
        newFormData.endTime = condition.endTime
      } else if (condition.type === "daysOfWeek") {
        newFormData.useDayRestrictions = true
        newFormData.dayRestrictions = condition.days
      } else if (condition.type === "minimumSpend") {
        newFormData.useMinimumSpend = true
        newFormData.minimumSpend = condition.amount.toString()
      }
    })
    
    setFormData(newFormData)
  }

  // Helper function to convert local 12h time to UTC 12-hour format
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

  const savePointsRule = async () => {
    if (!user?.uid) return

    try {
      const conditions = []

      // Add time restrictions
      if (formData.useTimeRestrictions) {
        conditions.push({
          type: "timeOfDay",
          startTime: formData.startTime ? Timestamp.fromDate(new Date(`2000/01/01 ${formData.startTime}`)) : null,
          endTime: formData.endTime ? Timestamp.fromDate(new Date(`2000/01/01 ${formData.endTime}`)) : null
        })
      }

      // Add minimum spend
      if (formData.useMinimumSpend && formData.minimumSpend) {
        conditions.push({
          type: "minimumSpend",
          amount: Number(formData.minimumSpend)
        })
      }

      // Add day restrictions
      if (formData.useDayRestrictions && formData.dayRestrictions.length > 0) {
        conditions.push({
          type: "daysOfWeek",
          days: formData.dayRestrictions
        })
      }

      const ruleData = {
        name: formData.name,
        pointsmultiplier: Number(formData.pointsmultiplier),
        conditions,
        merchantId: user.uid,
        createdAt: Timestamp.now()
      }

      await addDoc(collection(db, 'merchants', user.uid, 'pointsRules'), ruleData)

      toast({
        title: "Success",
        description: "Points rule created successfully.",
      })

      onOpenChange(false)

    } catch (error) {
      console.error('Error creating points rule:', error)
      toast({
        title: "Error",
        description: "There was a problem creating the points rule.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            <span className="text-[#007AFF]">Create</span> Points Rule
          </DialogTitle>
        </DialogHeader>

        <Tabs value={`step${currentStep}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step1">Basic Details</TabsTrigger>
            <TabsTrigger value="step2">Conditions</TabsTrigger>
            <TabsTrigger value="step3">Review</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="step1" className="min-h-[300px] py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Rule Name</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter rule name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Points Multiplier</Label>
                    <Input
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.pointsmultiplier}
                      onChange={(e) => setFormData({ ...formData, pointsmultiplier: e.target.value })}
                      placeholder="Enter points multiplier"
                    />
                  </div>
                </div>
                
                {/* Add this new section */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-base font-medium mb-3">Quick Templates</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select a template to quickly set up a common points rule:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {TEMPLATE_RULES.map((template, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="h-auto p-3 justify-start"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex flex-col items-start text-left">
                          <span className="font-medium">{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.pointsmultiplier}x points multiplier
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="min-h-[300px] py-4">
              <div className="space-y-6">
                {/* Time Restrictions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Time Restrictions</Label>
                    <Switch
                      checked={formData.useTimeRestrictions}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        useTimeRestrictions: checked
                      })}
                    />
                  </div>

                  {formData.useTimeRestrictions && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Start Time</Label>
                        <Select
                          value={formData.startTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            startTime: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select start time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i % 12 || 12
                              const period = i >= 12 ? 'PM' : 'AM'
                              return (
                                <SelectItem key={`${hour}:00 ${period}`} value={`${hour}:00 ${period}`}>
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
                          value={formData.endTime}
                          onValueChange={(value) => setFormData({
                            ...formData,
                            endTime: value
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select end time" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i % 12 || 12
                              const period = i >= 12 ? 'PM' : 'AM'
                              return (
                                <SelectItem key={`${hour}:00 ${period}`} value={`${hour}:00 ${period}`}>
                                  {`${hour}:00 ${period}`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Minimum Spend */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Minimum Spend Requirement</Label>
                    <Switch
                      checked={formData.useMinimumSpend}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        useMinimumSpend: checked
                      })}
                    />
                  </div>

                  {formData.useMinimumSpend && (
                    <div className="grid gap-2">
                      <Label>Minimum Amount ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.minimumSpend}
                        onChange={(e) => setFormData({
                          ...formData,
                          minimumSpend: e.target.value
                        })}
                        placeholder="Enter minimum spend amount"
                      />
                    </div>
                  )}
                </div>

                {/* Day Restrictions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Day Restrictions</Label>
                    <Switch
                      checked={formData.useDayRestrictions}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        useDayRestrictions: checked
                      })}
                    />
                  </div>

                  {formData.useDayRestrictions && (
                    <div className="grid gap-2">
                      <div className="flex flex-wrap gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={formData.dayRestrictions.includes(day) ? "default" : "outline"}
                            onClick={() => {
                              const newDays = formData.dayRestrictions.includes(day)
                                ? formData.dayRestrictions.filter(d => d !== day)
                                : [...formData.dayRestrictions, day]
                              setFormData({
                                ...formData,
                                dayRestrictions: newDays
                              })
                            }}
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="min-h-[300px] py-4">
              <div className="space-y-6">
                {/* Basic Details Review */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-base font-medium">Basic Details</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-muted-foreground hover:text-foreground ml-auto"
                      onClick={() => setCurrentStep(1)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Rule Name</p>
                        <p className="text-sm">{formData.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Points Multiplier</p>
                        <p className="text-sm">{formData.pointsmultiplier}x</p>
                      </div>
                    </div>
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
                      onClick={() => setCurrentStep(2)}
                    >
                      <EditIcon className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  <div className="rounded-md border p-4">
                    {(!formData.useTimeRestrictions && !formData.useMinimumSpend && !formData.useDayRestrictions) ? (
                      <p className="text-sm text-muted-foreground italic">No conditions set</p>
                    ) : (
                      <div className="space-y-4">
                        {formData.useTimeRestrictions && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Time Restrictions</p>
                            <p className="text-sm">{formData.startTime} to {formData.endTime}</p>
                          </div>
                        )}
                        {formData.useMinimumSpend && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Minimum Spend</p>
                            <p className="text-sm">${formData.minimumSpend}</p>
                          </div>
                        )}
                        {formData.useDayRestrictions && formData.dayRestrictions.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Active Days</p>
                            <p className="text-sm">{formData.dayRestrictions.join(', ')}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              <Button 
                onClick={() => {
                  if (currentStep < 3) {
                    setCurrentStep(currentStep + 1)
                  } else {
                    savePointsRule()
                  }
                }}
              >
                {currentStep === 3 ? 'Create Rule' : 'Next'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 