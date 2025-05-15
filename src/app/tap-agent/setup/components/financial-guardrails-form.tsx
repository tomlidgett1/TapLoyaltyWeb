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
import { DollarSign, PieChart, Target, Wallet, CreditCard } from "lucide-react"

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
    <div className="space-y-8">
      {/* Reward Budget Type & Amount */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Wallet className="h-4 w-4 text-blue-600 mr-2" />
          Reward Budget
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Define how much you want to spend on rewards each month.
        </p>
        
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
                className="rounded-md"
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
                className="max-w-[100px] rounded-md"
              />
              <span className="text-lg">%</span>
              <span className="text-sm text-muted-foreground">of monthly revenue</span>
            </>
          )}
        </div>
      </div>
      
      {/* Target Gross Margin */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <PieChart className="h-4 w-4 text-blue-600 mr-2" />
          Target Gross Margin
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Set your desired minimum gross margin for products included in rewards.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Target margin</Label>
            <span className="font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{data.targetGrossMargin}%</span>
          </div>
          <Slider
            value={[data.targetGrossMargin]}
            min={0}
            max={100}
            step={1}
            onValueChange={handleTargetGrossMarginChange}
            className="py-2"
          />
          <p className="text-xs text-muted-foreground">
            The agent will try to maintain this gross margin percentage when creating rewards.
          </p>
        </div>
      </div>
      
      {/* Max Cost Per Acquisition */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <Target className="h-4 w-4 text-blue-600 mr-2" />
          Max Cost Per Acquisition
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Maximum amount to spend to acquire a new customer through rewards.
        </p>
        
        <div className="flex items-center gap-2 max-w-xs">
          <span className="text-lg">$</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={data.maxCostPerAcquisition}
            onChange={(e) => handleMaxCPAChange(e.target.value)}
            placeholder="0.00"
            className="rounded-md"
          />
        </div>
        
        <p className="text-xs text-muted-foreground">
          This helps control your customer acquisition costs and ensures profitability.
        </p>
      </div>
      
      {/* Reward Value Range */}
      <div className="border rounded-md p-5 space-y-4">
        <h3 className="font-medium flex items-center">
          <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
          Reward Value Range
        </h3>
        
        <p className="text-sm text-muted-foreground">
          Set the minimum and maximum values for individual rewards offered to customers.
        </p>
        
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
                className="rounded-md"
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
                className="rounded-md"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mt-2">
          <div className="flex gap-2">
            <DollarSign className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-blue-800">Reward Value Guidance</p>
              <p className="text-xs text-blue-700 mt-1">
                These limits ensure that rewards are valuable enough to be meaningful to customers
                while preventing excessive discounting that could impact your profitability.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 