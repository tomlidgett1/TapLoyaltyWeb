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
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-100 text-3xl">☕</div>
            <div>
              <h3 className="text-xl font-bold">Traditional Coffee Program</h3>
              <p className="text-gray-500">Buy {config.frequency} coffees, get 1 free (stamp card style)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Check className="h-5 w-5 mr-1" />
              <span className="font-medium">Active</span>
            </div>
            {onEdit && (
              <Button 
                variant="outline"
                onClick={onEdit}
                className="border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                Edit Configuration
              </Button>
            )}
          </div>
        </div>
        
        <div className="mt-6 border-t pt-6">
          <h4 className="text-lg font-bold mb-4 flex items-center">
            <span className="mr-2">Program Configuration</span>
            <span className="text-xs text-white bg-blue-600 px-2 py-0.5 rounded-full">Staff Only</span>
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-blue-600 font-semibold">PIN</span>
              </div>
              <div>
                <span className="text-gray-500 block text-sm">Redemption PIN Code:</span>
                <span className="font-bold text-black text-lg tracking-wider">{config.pin}</span>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-purple-600 font-semibold">1st</span>
              </div>
              <div>
                <span className="text-gray-500 block text-sm">First Free Coffee:</span>
                <span className="font-bold text-black">
                  {config.freeRewardTiming === 'before' ? 'Welcome Gift (Before First Purchase)' : 'After First Set of Purchases'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-green-600 font-semibold">#</span>
              </div>
              <div>
                <span className="text-gray-500 block text-sm">Purchase Frequency:</span>
                <span className="font-bold text-black">Every {config.frequency} coffee purchases</span>
              </div>
            </div>
            
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-amber-600 font-semibold">☕</span>
              </div>
              <div>
                <span className="text-gray-500 block text-sm">Total Free Coffees:</span>
                <span className="font-bold text-black">{config.levels} rewards</span>
              </div>
            </div>
          </div>
          
          {/* How It Works Section */}
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h5 className="font-semibold mb-3 text-gray-700">How It Works For Customers</h5>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</div>
                <p className="text-gray-600">
                  {config.freeRewardTiming === 'before' 
                    ? 'Customers receive a free coffee upon joining your program' 
                    : `Customers make ${config.frequency} coffee purchases to earn their first free coffee`}
                </p>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</div>
                <p className="text-gray-600">
                  After each set of {config.frequency} purchases, they earn another free coffee
                </p>
              </div>
              <div className="flex items-start">
                <div className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</div>
                <p className="text-gray-600">
                  They can earn up to {config.levels} free coffees through this program
                </p>
              </div>
            </div>
          </div>
          
          {/* Staff Instructions */}
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-semibold mb-2 text-amber-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Staff Instructions
            </h5>
            <p className="text-sm text-amber-700 mb-2">
              When a customer wants to redeem their free coffee:
            </p>
            <ol className="text-sm text-amber-700 space-y-1 list-decimal pl-5">
              <li>Ask them to show their reward in the app</li>
              <li>Enter the PIN code <strong>{config.pin}</strong> to redeem</li>
              <li>The system will automatically mark the reward as redeemed</li>
            </ol>
          </div>
          
          {onRemove && (
            <div className="mt-6 border-t pt-6">
              <Button 
                variant="outline"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={onRemove}
              >
                Remove Coffee Program
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Warning: Removing this program will delete all associated customer rewards.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
} 