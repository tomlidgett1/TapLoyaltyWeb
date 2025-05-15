"use client"

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { 
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form
} from "@/components/ui/form"
import { useEffect } from "react"
import { Users, UserCheck, UserMinus, UserX, ChevronRight, BarChart3, RefreshCcw, Info } from "lucide-react"

interface CustomerCohorts {
  new: {
    firstVisitWithinDays: number
    maxLifetimeVisits: number
  }
  active: {
    lastVisitWithinDays: number
  }
  dormant: {
    lastVisitBetween: [number, number]
  }
  churned: {
    lastVisitMoreThanDays: number
  }
  resurrected: {
    wasDormantOrChurned: boolean
    recentVisitWithinDays: number
  }
}

interface CustomerCohortsFormProps {
  data: CustomerCohorts
  onChange: (data: CustomerCohorts) => void
}

export function CustomerCohortsForm({ data, onChange }: CustomerCohortsFormProps) {
  
  const handleNumberChange = (
    section: keyof CustomerCohorts, 
    field: string, 
    value: string
  ) => {
    const numValue = value === "" ? 0 : parseInt(value)
    
    if (section === 'dormant' && field === 'lastVisitBetween') {
      // Handle the special case for dormant.lastVisitBetween which is a tuple
      const index = parseInt(field.split('_')[1]) // Assuming format lastVisitBetween_0 or lastVisitBetween_1
      const newArray = [...data.dormant.lastVisitBetween]
      newArray[index] = numValue
      
      onChange({
        ...data,
        dormant: {
          ...data.dormant,
          lastVisitBetween: newArray as [number, number]
        }
      })
    } else {
      // Handle all other numeric fields
      onChange({
        ...data,
        [section]: {
          ...data[section],
          [field]: numValue
        }
      })
    }
  }
  
  const handleSwitchChange = (
    section: keyof CustomerCohorts, 
    field: string, 
    checked: boolean
  ) => {
    // Ensure resurrected.wasDormantOrChurned is always true
    if (section === 'resurrected' && field === 'wasDormantOrChurned') {
      return;
    }
    
    onChange({
      ...data,
      [section]: {
        ...data[section],
        [field]: checked
      }
    })
  }

  // Ensure resurrected.wasDormantOrChurned is always true
  useEffect(() => {
    if (data.resurrected.wasDormantOrChurned !== true) {
      onChange({
        ...data,
        resurrected: {
          ...data.resurrected,
          wasDormantOrChurned: true
        }
      });
    }
  }, [data.resurrected.wasDormantOrChurned]);

  return (
    <div className="space-y-8">
      {/* New Customers */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Users className="h-4 w-4 text-blue-600 mr-2" />
          New Customers
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define what constitutes a new customer based on their first visit and activity level.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstVisitWithinDays">First visit within (days)</Label>
            <Input
              id="firstVisitWithinDays"
              type="number"
              min="1"
              value={data.new.firstVisitWithinDays}
              onChange={(e) => handleNumberChange('new', 'firstVisitWithinDays', e.target.value)}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              Customers whose first visit was within this many days
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxLifetimeVisits">Maximum lifetime visits</Label>
            <Input
              id="maxLifetimeVisits"
              type="number"
              min="1"
              value={data.new.maxLifetimeVisits}
              onChange={(e) => handleNumberChange('new', 'maxLifetimeVisits', e.target.value)}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of visits to still be considered new
            </p>
          </div>
        </div>
      </div>
      
      {/* Active Customers */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <UserCheck className="h-4 w-4 text-blue-600 mr-2" />
          Active Customers
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define what constitutes an active customer based on recent activity.
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="lastVisitWithinDays">Last visit within (days)</Label>
          <Input
            id="lastVisitWithinDays"
            type="number"
            min="1"
            value={data.active.lastVisitWithinDays}
            onChange={(e) => handleNumberChange('active', 'lastVisitWithinDays', e.target.value)}
            className="rounded-md max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Customers who have visited within this many days are considered active
          </p>
        </div>
      </div>
      
      {/* Dormant Customers */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <UserMinus className="h-4 w-4 text-blue-600 mr-2" />
          Dormant Customers
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define what constitutes a dormant customer based on inactivity period.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dormantMin">Last visit between (min days)</Label>
            <Input
              id="dormantMin"
              type="number"
              min="1"
              value={data.dormant.lastVisitBetween[0]}
              onChange={(e) => {
                const newArray: [number, number] = [...data.dormant.lastVisitBetween];
                newArray[0] = parseInt(e.target.value || '0');
                onChange({
                  ...data,
                  dormant: {
                    ...data.dormant,
                    lastVisitBetween: newArray
                  }
                });
              }}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              Minimum days since last visit to be considered dormant
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="dormantMax">Last visit between (max days)</Label>
            <Input
              id="dormantMax"
              type="number"
              min="1"
              value={data.dormant.lastVisitBetween[1]}
              onChange={(e) => {
                const newArray: [number, number] = [...data.dormant.lastVisitBetween];
                newArray[1] = parseInt(e.target.value || '0');
                onChange({
                  ...data,
                  dormant: {
                    ...data.dormant,
                    lastVisitBetween: newArray
                  }
                });
              }}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              Maximum days since last visit to be considered dormant
            </p>
          </div>
        </div>
      </div>
      
      {/* Churned Customers */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <UserX className="h-4 w-4 text-blue-600 mr-2" />
          Churned Customers
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define what constitutes a churned customer based on extended inactivity.
        </p>
        
        <div className="space-y-2">
          <Label htmlFor="lastVisitMoreThanDays">Last visit more than (days)</Label>
          <Input
            id="lastVisitMoreThanDays"
            type="number"
            min="1"
            value={data.churned.lastVisitMoreThanDays}
            onChange={(e) => handleNumberChange('churned', 'lastVisitMoreThanDays', e.target.value)}
            className="rounded-md max-w-md"
          />
          <p className="text-xs text-muted-foreground">
            Customers who haven't visited for more than this many days are considered churned
          </p>
        </div>
      </div>
      
      {/* Resurrected Customers */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <RefreshCcw className="h-4 w-4 text-blue-600 mr-2" />
          Resurrected Customers
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define what constitutes a resurrected customer based on return after inactivity.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="wasDormantOrChurned">Was dormant or churned</Label>
              <Switch
                id="wasDormantOrChurned"
                checked={data.resurrected.wasDormantOrChurned}
                onCheckedChange={(checked) => handleSwitchChange('resurrected', 'wasDormantOrChurned', checked)}
                disabled={true}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Customer was previously dormant or churned (always enabled)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="recentVisitWithinDays">Recent visit within (days)</Label>
            <Input
              id="recentVisitWithinDays"
              type="number"
              min="1"
              value={data.resurrected.recentVisitWithinDays}
              onChange={(e) => handleNumberChange('resurrected', 'recentVisitWithinDays', e.target.value)}
              className="rounded-md"
            />
            <p className="text-xs text-muted-foreground">
              Customer has returned within this many days
            </p>
          </div>
        </div>
      </div>
      
      {/* Customer Lifecycle Visualization */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <BarChart3 className="h-4 w-4 text-blue-600 mr-2" />
          Customer Lifecycle Visualization
        </h3>
        
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex flex-wrap gap-2 md:gap-0 justify-between">
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium">New</span>
              <span className="text-xs text-muted-foreground">{data.new.firstVisitWithinDays} days</span>
            </div>
            
            <div className="flex items-center text-gray-300">
              <ChevronRight className="h-5 w-5" />
            </div>
            
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <UserCheck className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm font-medium">Active</span>
              <span className="text-xs text-muted-foreground">{data.active.lastVisitWithinDays} days</span>
            </div>
            
            <div className="flex items-center text-gray-300">
              <ChevronRight className="h-5 w-5" />
            </div>
            
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-2">
                <UserMinus className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-sm font-medium">Dormant</span>
              <span className="text-xs text-muted-foreground">{data.dormant.lastVisitBetween[0]}-{data.dormant.lastVisitBetween[1]} days</span>
            </div>
            
            <div className="flex items-center text-gray-300">
              <ChevronRight className="h-5 w-5" />
            </div>
            
            <div className="flex flex-col items-center p-2 min-w-[100px]">
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
                <UserX className="h-6 w-6 text-red-600" />
              </div>
              <span className="text-sm font-medium">Churned</span>
              <span className="text-xs text-muted-foreground">{data.churned.lastVisitMoreThanDays}+ days</span>
            </div>
          </div>
          
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-center">
              <div className="flex flex-col items-center p-2">
                <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                  <RefreshCcw className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-sm font-medium">Resurrected</span>
                <span className="text-xs text-muted-foreground">Within {data.resurrected.recentVisitWithinDays} days</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800 font-medium">Customer Lifecycle Management</p>
              <p className="text-xs text-blue-700 mt-1">
                These settings determine how customers are categorised throughout their lifecycle. The Tap Agent will use these segments to create targeted rewards and re-engagement campaigns.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 