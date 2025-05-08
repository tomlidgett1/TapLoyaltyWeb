"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useState } from "react"
import { FileText, Clock, ListChecks, Edit as EditIcon, Info, Settings, CheckCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface CreatePointsRuleSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreatePointsRuleSheet({ open, onOpenChange }: CreatePointsRuleSheetProps) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-hidden p-0 flex flex-col">
        <div className="flex-none px-6 py-4 border-b">
          <SheetHeader className="mb-2">
            <SheetTitle className="text-xl">
              <span className="text-[#007AFF]">Create</span> Points Rule
            </SheetTitle>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <Tabs value={`step${currentStep}`} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="step1" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Basic Details
              </TabsTrigger>
              <TabsTrigger value="step2" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Conditions
              </TabsTrigger>
              <TabsTrigger value="step3" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Review
              </TabsTrigger>
            </TabsList>

            <div className="mt-4">
              <TabsContent value="step1" className="min-h-[300px] py-4">
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
              </TabsContent>

              <TabsContent value="step2" className="min-h-[300px] py-4">
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
              </TabsContent>

              <TabsContent value="step3" className="min-h-[300px] py-4">
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
              </TabsContent>
            </div>
          </Tabs>
        </ScrollArea>

        <div className="flex-none px-6 py-4 border-t">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center">
              <span className="text-xl font-bold">
                <span className="text-[#007AFF] font-extrabold">Tap</span>
                {' '}
                <span>Loyalty</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
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
                disabled={
                  (currentStep === 1 && !formData.name) ||
                  (currentStep === 2 && 
                    ((formData.useTimeRestrictions && (!formData.startTime || !formData.endTime)) ||
                     (formData.useMinimumSpend && !formData.minimumSpend) ||
                     (formData.useDayRestrictions && formData.dayRestrictions.length === 0)))
                }
                className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
              >
                {currentStep === 3 ? 'Create Rule' : 'Next'}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
} 