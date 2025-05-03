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
import { 
  RadioGroup,
  RadioGroupItem
} from "@/components/ui/radio-group"
import { Slider } from "@/components/ui/slider"

interface FinancialGuardrails {
  rewardBudgetType: 'fixed' | 'percentage'
  monthlyBudget: number
  targetGrossMargin: number
  maxCostPerAcquisition: number
  minRewardValue: number
  maxRewardValue: number
}

interface FinancialGuardrailsFormProps {
  data: FinancialGuardrails
  onChange: (data: FinancialGuardrails) => void
}

export function FinancialGuardrailsForm({ data, onChange }: FinancialGuardrailsFormProps) {
  
  const handleBudgetTypeChange = (value: 'fixed' | 'percentage') => {
    onChange({
      ...data,
      rewardBudgetType: value
    })
  }
  
  const handleMonthlyBudgetChange = (value: string) => {
    onChange({
      ...data,
      monthlyBudget: value === "" ? 0 : parseFloat(value)
    })
  }
  
  const handleTargetGrossMarginChange = (value: number[]) => {
    onChange({
      ...data,
      targetGrossMargin: value[0]
    })
  }
  
  const handleMaxCPAChange = (value: string) => {
    onChange({
      ...data,
      maxCostPerAcquisition: value === "" ? 0 : parseFloat(value)
    })
  }
  
  const handleMinRewardValueChange = (value: string) => {
    const newValue = value === "" ? 0 : parseFloat(value)
    
    onChange({
      ...data,
      minRewardValue: newValue,
      // Ensure maxRewardValue is not less than minRewardValue
      maxRewardValue: data.maxRewardValue < newValue ? newValue : data.maxRewardValue
    })
  }
  
  const handleMaxRewardValueChange = (value: string) => {
    const newValue = value === "" ? 0 : parseFloat(value)
    
    onChange({
      ...data,
      maxRewardValue: newValue,
      // Ensure minRewardValue is not greater than maxRewardValue
      minRewardValue: data.minRewardValue > newValue ? newValue : data.minRewardValue
    })
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Financial Guardrails</CardTitle>
        <CardDescription>
          Set financial constraints for your rewards program.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Reward Budget Type & Amount */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium">Reward Budget</h3>
            <p className="text-sm text-muted-foreground">
              Define how much you want to spend on rewards.
            </p>
          </div>
          
          <RadioGroup
            value={data.rewardBudgetType}
            onValueChange={(value) => handleBudgetTypeChange(value as 'fixed' | 'percentage')}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="budget-fixed" />
              <Label htmlFor="budget-fixed" className="font-normal">
                Fixed monthly amount
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="budget-percentage" />
              <Label htmlFor="budget-percentage" className="font-normal">
                Percentage of monthly revenue
              </Label>
            </div>
          </RadioGroup>
          
          <div className="flex items-center gap-2 max-w-xs">
            {data.rewardBudgetType === 'fixed' ? (
              <>
                <span className="text-lg">$</span>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={data.monthlyBudget}
                  onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                  placeholder="0"
                />
              </>
            ) : (
              <>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={data.monthlyBudget}
                  onChange={(e) => handleMonthlyBudgetChange(e.target.value)}
                  placeholder="0"
                  className="max-w-[100px]"
                />
                <span className="text-lg">%</span>
                <span className="text-sm text-muted-foreground">of monthly revenue</span>
              </>
            )}
          </div>
        </div>
        
        {/* Target Gross Margin */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Target Gross Margin</h3>
            <p className="text-sm text-muted-foreground">
              Set your desired minimum gross margin for products in rewards.
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Target margin</Label>
              <span className="font-medium">{data.targetGrossMargin}%</span>
            </div>
            <Slider
              value={[data.targetGrossMargin]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleTargetGrossMarginChange}
            />
            <p className="text-xs text-muted-foreground">
              The agent will try to maintain this gross margin percentage when creating rewards.
            </p>
          </div>
        </div>
        
        {/* Max Cost Per Acquisition */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Max Cost Per Acquisition</h3>
            <p className="text-sm text-muted-foreground">
              Maximum amount to spend to acquire a new customer.
            </p>
          </div>
          
          <div className="flex items-center gap-2 max-w-xs">
            <span className="text-lg">$</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={data.maxCostPerAcquisition}
              onChange={(e) => handleMaxCPAChange(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        
        {/* Reward Value Range */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Reward Value Range</h3>
            <p className="text-sm text-muted-foreground">
              Set the minimum and maximum values for individual rewards.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min-reward-value">Minimum Reward Value ($)</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  id="min-reward-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.minRewardValue}
                  onChange={(e) => handleMinRewardValueChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max-reward-value">Maximum Reward Value ($)</Label>
              <div className="flex items-center gap-2">
                <span className="text-lg">$</span>
                <Input
                  id="max-reward-value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={data.maxRewardValue}
                  onChange={(e) => handleMaxRewardValueChange(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground">
            These limits ensure that rewards are valuable enough to be meaningful to customers
            while preventing excessive discounting.
          </p>
        </div>
      </CardContent>
    </Card>
  )
} 