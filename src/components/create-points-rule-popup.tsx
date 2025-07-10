"use client"

import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState, useEffect } from "react"
import { X, FileText, Clock, ListChecks, Edit as EditIcon, Info, Settings, CheckCircle, Zap } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"

interface CreatePointsRulePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePointsRulePopup({ open, onOpenChange }: CreatePointsRulePopupProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const { toast } = useToast()
  const { user } = useAuth()
  const [showForm, setShowForm] = useState(false)

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

  // List of predefined rules that users can select from
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

  // Reset form visibility when dialog is closed
  useEffect(() => {
    if (!open) {
      setShowForm(false)
      setCurrentStep(1)
    }
  }, [open])

  // Function to apply a template rule to the form
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

  const savePointsRule = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to create rules.",
        variant: "destructive"
      })
      return
    }

    try {
      // Format the conditions as an array of condition objects
      const conditions: any[] = []
      
      // Add time restrictions if enabled
      if (formData.useTimeRestrictions) {
        // Parse the time strings to create proper Firestore timestamps
        const createTimestamp = (timeStr: string) => {
          if (!timeStr) return null;
          
          // Get today's date as a base
          const today = new Date();
          const [time, period] = timeStr.split(' ');
          const [hours, minutes] = time.split(':');
          let hour = parseInt(hours);
          
          // Convert to 24-hour format
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          // Create a new date with the specified time
          const date = new Date(today);
          date.setHours(hour, parseInt(minutes) || 0, 0, 0);
          
          // Return a Firestore timestamp
          return Timestamp.fromDate(date);
        };
        
        conditions.push({
          type: "timeOfDay",
          startTime: createTimestamp(formData.startTime),
          endTime: createTimestamp(formData.endTime)
        });
      }
      
      // Add minimum spend if enabled
      if (formData.useMinimumSpend) {
        conditions.push({
          type: "minimumSpend",
          amount: parseFloat(formData.minimumSpend)
        });
      }
      
      // Add day restrictions if enabled
      if (formData.useDayRestrictions && formData.dayRestrictions.length > 0) {
        conditions.push({
          type: "daysOfWeek",
          days: formData.dayRestrictions.map(day => day.toLowerCase())
        });
      }
      
      // Create the rule data
      const ruleData = {
        name: formData.name,
        pointsmultiplier: parseFloat(formData.pointsmultiplier),
        conditions: conditions,
        active: true,
        status: "active",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }
      
      // Save to Firestore
      const rulesRef = collection(db, 'merchants', user.uid, 'pointsRules')
      await addDoc(rulesRef, ruleData)
      
      toast({
        title: "Success",
        description: "Points rule created successfully.",
      })
      
      onOpenChange(false)
      
    } catch (error) {
      console.error("Error creating points rule:", error)
      toast({
        title: "Error",
        description: "There was a problem creating the points rule.",
        variant: "destructive"
      })
    }
  }

  const handleStepChange = (step: number) => {
    // Validation for moving forward
    if (step > currentStep) {
      if (currentStep === 1 && !formData.name) {
        toast({
          title: "Missing information",
          description: "Please enter a rule name before continuing.",
          variant: "destructive"
        })
        return
      }
      
      if (currentStep === 2) {
        // Check if any time restrictions are incomplete
        if (formData.useTimeRestrictions && (!formData.startTime || !formData.endTime)) {
          toast({
            title: "Incomplete time restrictions",
            description: "Please set both start and end times or disable time restrictions.",
            variant: "destructive"
          })
          return
        }
        
        // Check if minimum spend is incomplete
        if (formData.useMinimumSpend && !formData.minimumSpend) {
          toast({
            title: "Incomplete minimum spend",
            description: "Please set a minimum spend amount or disable this condition.",
            variant: "destructive"
          })
          return
        }
        
        // Check if day restrictions are incomplete
        if (formData.useDayRestrictions && formData.dayRestrictions.length === 0) {
          toast({
            title: "Incomplete day restrictions",
            description: "Please select at least one day or disable day restrictions.",
            variant: "destructive"
          })
          return
        }
      }
    }
    
    setCurrentStep(step)
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing
          setFormData({
            name: "",
            pointsmultiplier: "1",
            useTimeRestrictions: false,
            startTime: "",
            endTime: "",
            useMinimumSpend: false,
            minimumSpend: "",
            useDayRestrictions: false,
            dayRestrictions: [],
          })
          setCurrentStep(1)
          setShowForm(false)
        }
        onOpenChange(open)
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          {!showForm ? (
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 px-6 py-5 border-b">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="text-[#007AFF]">Create</span> Points Rule
                </h2>
                <p className="text-sm text-gray-600">
                  Define how customers earn points in your loyalty program
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                  <div className="flex items-center gap-3 mb-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <h3 className="text-md font-semibold">Points Rules</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Create custom rules to control how customers earn points. Set multipliers for specific times, days, or spending amounts to boost engagement.
                  </p>
                  <Button 
                    onClick={() => setShowForm(true)}
                    variant="outline"
                    className="rounded-md"
                  >
                    Create Points Rule
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Left Panel */}
              <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
                <div className="p-6 border-b flex-shrink-0">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    <span className="text-[#007AFF]">Create</span> Points Rule
                  </h2>
                  <p className="text-sm text-gray-600">
                    Define custom earning rules
                  </p>
                  
                  <div className="flex items-center space-x-1 mt-4">
                    {[1, 2, 3].map((step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => handleStepChange(step)}
                        className={`h-2 w-12 rounded-md transition-all ${
                          step === currentStep 
                            ? "bg-blue-600" 
                            : step < currentStep 
                            ? "bg-blue-300" 
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Steps navigation */}
                <div className="flex-1 p-6 overflow-y-auto min-h-0">
                  <nav className="space-y-2">
                    {[
                      { step: 1, title: "Basic Details", desc: "Name and multiplier", icon: Info },
                      { step: 2, title: "Conditions", desc: "When rule applies", icon: Settings },
                      { step: 3, title: "Review", desc: "Confirm and create", icon: CheckCircle }
                    ].map((item) => (
                      <button
                        key={item.step}
                        onClick={() => handleStepChange(item.step)}
                        className={`w-full text-left p-3 rounded-md transition-colors ${
                          currentStep === item.step
                            ? "bg-blue-100 text-blue-900 border border-blue-200"
                            : item.step < currentStep
                            ? "bg-white text-gray-700 hover:bg-gray-50"
                            : "bg-white text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={item.step > currentStep + 1}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            currentStep === item.step
                              ? "bg-blue-600 text-white"
                              : item.step < currentStep
                              ? "bg-green-500 text-white"
                              : "bg-gray-200 text-gray-400"
                          }`}>
                            {item.step < currentStep ? "✓" : item.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Right Panel - Content */}
              <div className="flex-1 flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      {/* Add instruction panel */}
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-1">Basic Rule Information</h3>
                        <p className="text-xs text-blue-700">
                          Start by creating a points rule that will determine how many points customers earn. Points multipliers can boost earnings during specific times or for specific activities.
                        </p>
                      </div>
                    
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Rule Name <span className="text-red-500">*</span></Label>
                          <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g., Weekend Double Points"
                          />
                          <p className="text-xs text-muted-foreground">
                            Choose a descriptive name that explains when this rule applies
                          </p>
                        </div>
                        <div className="grid gap-2">
                          <Label>Points Multiplier <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.1"
                            value={formData.pointsmultiplier}
                            onChange={(e) => setFormData({ ...formData, pointsmultiplier: e.target.value })}
                            placeholder="Enter multiplier (e.g., 2 for double points)"
                          />
                          <p className="text-xs text-muted-foreground">
                            Set how many times the base points customers will earn (e.g., 2 = double points)
                          </p>
                        </div>
                      </div>
                      
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
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      {/* Add instruction panel */}
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-1">Rule Conditions</h3>
                        <p className="text-xs text-blue-700">
                          Set when this points rule should apply. You can restrict it to specific times, days, or spending amounts. If no conditions are set, the rule will apply to all transactions.
                        </p>
                      </div>
                    
                      {/* Time Restrictions */}
                      <div className="space-y-4 border-l-2 border-blue-100 pl-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-blue-600" />
                              Time of Day Restrictions
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Apply this rule only during specific hours
                            </p>
                          </div>
                          <Switch
                            checked={formData.useTimeRestrictions}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              useTimeRestrictions: checked
                            })}
                          />
                        </div>

                        {formData.useTimeRestrictions && (
                          <div className="grid grid-cols-2 gap-4 mt-2 pl-2">
                            <div className="grid gap-2">
                              <Label>Start Time <span className="text-red-500">*</span></Label>
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
                              <Label>End Time <span className="text-red-500">*</span></Label>
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
                      <div className="space-y-4 border-l-2 border-blue-100 pl-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium flex items-center">
                              <FileText className="h-4 w-4 mr-2 text-blue-600" />
                              Minimum Spend Requirement
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Apply this rule only for transactions above a certain amount
                            </p>
                          </div>
                          <Switch
                            checked={formData.useMinimumSpend}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              useMinimumSpend: checked
                            })}
                          />
                        </div>

                        {formData.useMinimumSpend && (
                          <div className="grid gap-2 mt-2 pl-2 max-w-[250px]">
                            <Label>Minimum Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.minimumSpend}
                              onChange={(e) => setFormData({
                                ...formData,
                                minimumSpend: e.target.value
                              })}
                              placeholder="e.g., 25"
                            />
                            <p className="text-xs text-muted-foreground">
                              Customer must spend at least this amount to earn the multiplier
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Day Restrictions */}
                      <div className="space-y-4 border-l-2 border-blue-100 pl-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium flex items-center">
                              <ListChecks className="h-4 w-4 mr-2 text-blue-600" />
                              Day of Week Restrictions
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              Apply this rule only on specific days of the week
                            </p>
                          </div>
                          <Switch
                            checked={formData.useDayRestrictions}
                            onCheckedChange={(checked) => setFormData({
                              ...formData,
                              useDayRestrictions: checked
                            })}
                          />
                        </div>

                        {formData.useDayRestrictions && (
                          <div className="grid gap-2 mt-2 pl-2">
                            <Label className="mb-2">Select Days <span className="text-red-500">*</span></Label>
                            <div className="flex flex-wrap gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={formData.dayRestrictions.includes(day) ? "default" : "outline"}
                                  className={formData.dayRestrictions.includes(day) ? "bg-blue-600 hover:bg-blue-700" : ""}
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
                                  {day.substring(0, 3)}
                                </Button>
                              ))}
                            </div>
                            
                            {formData.useDayRestrictions && formData.dayRestrictions.length === 0 && (
                              <p className="text-xs text-amber-600 mt-2">
                                Please select at least one day for this rule to apply
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      {/* Add instruction panel */}
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-1">Review and Confirm</h3>
                        <p className="text-xs text-blue-700">
                          Review your points rule settings before creating it. Click on the Edit buttons to make any changes.
                        </p>
                      </div>
                      
                      {/* Basic Details Review */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-blue-600" />
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
                              <p className="text-sm font-medium">
                                {formData.name || <span className="italic text-gray-400">Not set</span>}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Points Multiplier</p>
                              <p className="text-sm font-medium">{formData.pointsmultiplier}x</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Conditions Review */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <ListChecks className="h-5 w-5 text-blue-600" />
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
                            <div className="flex items-center gap-2 text-blue-600 py-2">
                              <CheckCircle className="h-5 w-5" />
                              <p className="text-sm">No conditions set - rule will apply to all transactions</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {formData.useTimeRestrictions && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-muted-foreground">Time Restrictions</p>
                                  <p className="text-sm">
                                    {formData.startTime && formData.endTime ? 
                                      `${formData.startTime} to ${formData.endTime}` : 
                                      <span className="text-amber-600 text-xs">⚠️ Time range incomplete</span>}
                                  </p>
                                </div>
                              )}
                              {formData.useMinimumSpend && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-muted-foreground">Minimum Spend</p>
                                  <p className="text-sm">
                                    {formData.minimumSpend ? 
                                      `$${formData.minimumSpend}` : 
                                      <span className="text-amber-600 text-xs">⚠️ Amount not set</span>}
                                  </p>
                                </div>
                              )}
                              {formData.useDayRestrictions && (
                                <div className="space-y-1">
                                  <p className="text-sm font-medium text-muted-foreground">Active Days</p>
                                  <p className="text-sm">
                                    {formData.dayRestrictions.length > 0 ? 
                                      formData.dayRestrictions.join(', ') : 
                                      <span className="text-amber-600 text-xs">⚠️ No days selected</span>}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Summary of what happens */}
                      <div className="bg-green-50 border border-green-100 rounded-md p-4 mt-4">
                        <h4 className="text-sm font-medium text-green-800 mb-2">What Will Happen</h4>
                        <p className="text-sm text-green-700 mb-3">
                          When you create this rule:
                        </p>
                        <ul className="text-sm text-green-700 space-y-2">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>
                              Customers will earn <span className="font-medium">{formData.pointsmultiplier}x points</span> on qualifying transactions
                            </span>
                          </li>
                          {formData.useTimeRestrictions && formData.startTime && formData.endTime && (
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>
                                Only applies between <span className="font-medium">{formData.startTime}</span> and <span className="font-medium">{formData.endTime}</span>
                              </span>
                            </li>
                          )}
                          {formData.useMinimumSpend && formData.minimumSpend && (
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>
                                Only applies when spending <span className="font-medium">${formData.minimumSpend} or more</span>
                              </span>
                            </li>
                          )}
                          {formData.useDayRestrictions && formData.dayRestrictions.length > 0 && (
                            <li className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <span>
                                Only applies on: <span className="font-medium">{formData.dayRestrictions.join(', ')}</span>
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action Bar */}
                <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setShowForm(false)
                          setCurrentStep(1)
                        }}
                        className="rounded-md"
                      >
                        Cancel
                      </Button>
                      {currentStep > 1 && (
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep(currentStep - 1)}
                          className="rounded-md"
                        >
                          Back
                        </Button>
                      )}
                    </div>
                    <Button 
                      onClick={() => {
                        if (currentStep < 3) {
                          handleStepChange(currentStep + 1)
                        } else {
                          savePointsRule()
                        }
                      }}
                      disabled={
                        (currentStep === 1 && !formData.name) ||
                        (currentStep === 2 && 
                          ((formData.useTimeRestrictions && (!formData.startTime || !formData.endTime)) ||
                           (formData.useMinimumSpend && !formData.minimumSpend) ||
                           (formData.useDayRestrictions && formData.dayRestrictions.length === 0)))
                      }
                      className="bg-[#007AFF] hover:bg-[#0071E3] text-white rounded-md"
                    >
                      {currentStep === 3 ? 'Create Rule' : 'Next'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 