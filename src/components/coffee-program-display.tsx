"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"

interface CoffeeProgramConfig {
  pin: string
  freeRewardTiming: 'before' | 'after'
  frequency: number
  levels: number
}

interface CoffeeProgramDisplayProps {
  config: CoffeeProgramConfig
  onEdit?: () => void
  onRemove?: () => void
}

export function CoffeeProgramDisplay({ config, onEdit, onRemove }: CoffeeProgramDisplayProps) {
  return (
    <Card className="border rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">☕</div>
            <div>
              <h3 className="text-xl font-bold">Traditional Coffee Program</h3>
              <p className="text-gray-500">Buy {config.frequency} coffees, get 1 free (stamp card style)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-green-600">
              <Check className="h-5 w-5 mr-1" />
              <span className="font-medium">Configured</span>
            </div>
            {onEdit && (
              <Button 
                variant="outline"
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-6 border-t pt-6">
          <h4 className="text-lg font-bold mb-4">Configuration Details</h4>
          
          <div className="grid grid-cols-2 gap-y-6">
            <div>
              <span className="text-gray-500">PIN Code:</span>
              <span className="ml-2 font-bold text-black">{config.pin}</span>
            </div>
            <div>
              <span className="text-gray-500">First Free Coffee:</span>
              <span className="ml-2 font-bold text-black">
                {config.freeRewardTiming === 'before' ? 'Before first transaction' : 'After first transaction'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Frequency:</span>
              <span className="ml-2 font-bold text-black">Every {config.frequency} transactions</span>
            </div>
            <div>
              <span className="text-gray-500">Number of Rewards:</span>
              <span className="ml-2 font-bold text-black">{config.levels}</span>
            </div>
          </div>
          
          {onRemove && (
            <div className="mt-6 flex justify-between">
              <Button 
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={onRemove}
              >
                Remove Configuration
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
} 