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

interface RewardConstraints {
  allowedTypes: {
    freeItem: boolean
    percentageDiscount: boolean
    fixedAmount: boolean
    buyXGetY: boolean
    mysteryGift?: boolean // Made optional for backward compatibility
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
  buyXGetY: "Buy X items, get Y items free"
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
  
  // Filter out mysteryGift for display and interaction
  const displayTypes = Object.entries(data.allowedTypes).filter(
    ([key]) => key !== 'mysteryGift' && key in rewardTypeDescriptions
  ) as [keyof typeof rewardTypeDescriptions, boolean][];

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Reward Constraints</CardTitle>
        <CardDescription>
          Define allowed reward types and limitations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Allowed Reward Types */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Allowed Reward Types</h3>
            <p className="text-sm text-muted-foreground">
              Select which types of rewards your Tap Agent can create.
            </p>
          </div>
          
          <div className="space-y-4">
            {displayTypes.map(([type, enabled]) => (
              <div key={type} className="flex items-center justify-between">
                <div>
                  <Label htmlFor={type} className="font-medium capitalize">
                    {type.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {rewardTypeDescriptions[type]}
                  </p>
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
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Concurrency Ceiling</h3>
            <p className="text-sm text-muted-foreground">
              Maximum number of active rewards that can be shown to a customer at once.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Maximum active rewards</Label>
              <span className="font-medium">{data.concurrencyCeiling}</span>
            </div>
            <Slider
              value={[data.concurrencyCeiling]}
              min={1}
              max={10}
              step={1}
              onValueChange={handleConcurrencyCeilingChange}
            />
            <p className="text-xs text-muted-foreground">
              This limits how many rewards a customer can see at the same time. A lower number creates a sense of exclusivity, while a higher number offers more choices.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 