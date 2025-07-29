"use client"

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Gift, Percent, DollarSign, ShoppingBag, Sparkles, Settings } from "lucide-react"

interface RewardConstraints {
  allowedTypes: {
    freeItem: boolean
    percentageDiscount: boolean
    fixedAmount: boolean
    buyXGetY: boolean
    mysteryGift: boolean // Required field, not optional
  }
  concurrencyCeiling: number
}

interface RewardConstraintsFormProps {
  data: RewardConstraints
  onChange: (data: RewardConstraints) => void
}

const rewardTypeDescriptions = {
  freeItem: "Offer a free product or item",
  percentageDiscount: "Offer a percentage discount on products",
  fixedAmount: "Offer a fixed amount discount",
  buyXGetY: "Buy X items, get Y items free",
  mysteryGift: "Surprise customers with a mystery gift or reward"
}

const rewardTypeIcons = {
  freeItem: <Gift className="h-4 w-4 text-blue-600" />,
  percentageDiscount: <Percent className="h-4 w-4 text-blue-600" />,
  fixedAmount: <DollarSign className="h-4 w-4 text-blue-600" />,
  buyXGetY: <ShoppingBag className="h-4 w-4 text-blue-600" />,
  mysteryGift: <Sparkles className="h-4 w-4 text-blue-600" />
}

export function RewardConstraintsForm({ data, onChange }: RewardConstraintsFormProps) {
  
  const handleToggleType = (type: keyof RewardConstraints['allowedTypes']) => {
    onChange({
      ...data,
      allowedTypes: {
        ...data.allowedTypes,
        [type]: !data.allowedTypes[type]
      }
    })
  }
  
  const handleConcurrencyCeilingChange = (value: number[]) => {
    onChange({
      ...data,
      concurrencyCeiling: value[0]
    })
  }
  
  // Get all the allowed reward types for display
  const displayTypes = Object.entries(data.allowedTypes) as [keyof typeof rewardTypeDescriptions, boolean][];

  return (
    <div className="space-y-8">
      {/* Allowed Reward Types */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Gift className="h-4 w-4 text-blue-600 mr-2" />
          Allowed Reward Types
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Select which types of rewards your Tap Agent can create and offer to customers.
        </p>
        
        <div className="space-y-4 mt-2">
          {displayTypes.map(([type, enabled]) => (
            <div 
              key={type} 
              className={`flex items-center justify-between p-3 rounded-md border ${enabled ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  {rewardTypeIcons[type]}
                </div>
                <div>
                  <Label htmlFor={type} className="font-medium capitalize">
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {rewardTypeDescriptions[type]}
                  </p>
                </div>
              </div>
              <Switch
                id={type}
                checked={enabled}
                onCheckedChange={() => handleToggleType(type)}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Concurrency Ceiling */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Settings className="h-4 w-4 text-blue-600 mr-2" />
          Concurrency Ceiling
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Maximum number of active rewards that can be shown to a customer at once.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Maximum active rewards</Label>
            <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{data.concurrencyCeiling}</span>
          </div>
          <Slider
            value={[data.concurrencyCeiling]}
            min={1}
            max={10}
            step={1}
            onValueChange={handleConcurrencyCeilingChange}
            className="py-2"
          />
          <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-2">
            <p className="text-sm text-blue-800">Reward Concurrency Impact</p>
            <p className="text-xs text-blue-700 mt-1">
              This limits how many rewards a customer can see at the same time. A lower number creates a sense of exclusivity, while a higher number offers more choices but may dilute attention.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 