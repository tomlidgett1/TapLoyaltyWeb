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
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Customer Cohorts</CardTitle>
        <CardDescription>
          Define customer lifecycle stages and behaviors.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* New Customers */}
        <div className="space-y-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">New Customers</h3>
            <p className="text-sm text-muted-foreground">
              Define what constitutes a new customer.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstVisitWithinDays">
                First visit within (days)
              </Label>
              <Input
                id="firstVisitWithinDays"
                type="number"
                min="1"
                value={data.new.firstVisitWithinDays}
                onChange={(e) => handleNumberChange('new', 'firstVisitWithinDays', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Customers whose first visit was within this many days.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxLifetimeVisits">
                Maximum lifetime visits
              </Label>
              <Input
                id="maxLifetimeVisits"
                type="number"
                min="1"
                value={data.new.maxLifetimeVisits}
                onChange={(e) => handleNumberChange('new', 'maxLifetimeVisits', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Maximum number of visits to still be considered new.
              </p>
            </div>
          </div>
        </div>
        
        {/* Active Customers */}
        <div className="space-y-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">Active Customers</h3>
            <p className="text-sm text-muted-foreground">
              Define what constitutes an active customer.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastVisitWithinDays">
              Last visit within (days)
            </Label>
            <Input
              id="lastVisitWithinDays"
              type="number"
              min="1"
              value={data.active.lastVisitWithinDays}
              onChange={(e) => handleNumberChange('active', 'lastVisitWithinDays', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Customers who have visited within this many days are considered active.
            </p>
          </div>
        </div>
        
        {/* Dormant Customers */}
        <div className="space-y-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">Dormant Customers</h3>
            <p className="text-sm text-muted-foreground">
              Define what constitutes a dormant customer.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dormantMin">
                Last visit between (min days)
              </Label>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dormantMax">
                Last visit between (max days)
              </Label>
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
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Customers whose last visit was between these values (in days) are considered dormant.
          </p>
        </div>
        
        {/* Churned Customers */}
        <div className="space-y-4 border-b pb-4">
          <div>
            <h3 className="text-lg font-medium">Churned Customers</h3>
            <p className="text-sm text-muted-foreground">
              Define what constitutes a churned customer.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="lastVisitMoreThanDays">
              Last visit more than (days)
            </Label>
            <Input
              id="lastVisitMoreThanDays"
              type="number"
              min="1"
              value={data.churned.lastVisitMoreThanDays}
              onChange={(e) => handleNumberChange('churned', 'lastVisitMoreThanDays', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Customers who haven't visited in more than this many days are considered churned.
            </p>
          </div>
        </div>
        
        {/* Resurrected Customers */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Resurrected Customers</h3>
            <p className="text-sm text-muted-foreground">
              Define what constitutes a resurrected customer.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="wasDormantOrChurned" className="mb-1 block">
                  Was dormant or churned
                </Label>
                <p className="text-xs text-muted-foreground">
                  Customer was previously in dormant or churned state.
                </p>
              </div>
              <Switch
                id="wasDormantOrChurned"
                checked={true}
                disabled={true}
                onCheckedChange={() => {}}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="recentVisitWithinDays">
                Recent visit within (days)
              </Label>
              <Input
                id="recentVisitWithinDays"
                type="number"
                min="1"
                value={data.resurrected.recentVisitWithinDays}
                onChange={(e) => handleNumberChange('resurrected', 'recentVisitWithinDays', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A dormant/churned customer who returned within this many days is considered resurrected.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 