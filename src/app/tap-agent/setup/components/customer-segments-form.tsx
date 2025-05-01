"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { PlusCircle, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"

interface LoyaltyTier {
  name: string
  lifetimeTransactions: number
  lifetimeSpend: number
  redemptions: number
}

interface VisitSpendingThresholds {
  frequentVisitor: { visits: number; perDays: number }
  highSpender: { amount: number; perDays: number }
}

interface CustomerSegments {
  loyaltyTiers: LoyaltyTier[]
  visitSpendingThresholds: VisitSpendingThresholds
}

interface CustomerSegmentsFormProps {
  data: CustomerSegments
  onChange: (data: CustomerSegments) => void
}

export function CustomerSegmentsForm({ data, onChange }: CustomerSegmentsFormProps) {
  const [newTierName, setNewTierName] = useState("")
  
  const handleVisitThresholdChange = (field: keyof VisitSpendingThresholds['frequentVisitor'], value: string) => {
    onChange({
      ...data,
      visitSpendingThresholds: {
        ...data.visitSpendingThresholds,
        frequentVisitor: {
          ...data.visitSpendingThresholds.frequentVisitor,
          [field]: value === "" ? 0 : parseInt(value)
        }
      }
    })
  }
  
  const handleSpendingThresholdChange = (field: keyof VisitSpendingThresholds['highSpender'], value: string) => {
    onChange({
      ...data,
      visitSpendingThresholds: {
        ...data.visitSpendingThresholds,
        highSpender: {
          ...data.visitSpendingThresholds.highSpender,
          [field]: value === "" ? 0 : parseInt(value)
        }
      }
    })
  }
  
  const handleTierFieldChange = (index: number, field: keyof LoyaltyTier, value: string) => {
    const newTiers = [...data.loyaltyTiers]
    newTiers[index] = {
      ...newTiers[index],
      [field]: field === 'name' ? value : (value === "" ? 0 : parseInt(value))
    }
    
    onChange({
      ...data,
      loyaltyTiers: newTiers
    })
  }
  
  const handleAddTier = () => {
    if (!newTierName) return
    
    const newTier: LoyaltyTier = {
      name: newTierName,
      lifetimeTransactions: 0,
      lifetimeSpend: 0,
      redemptions: 0
    }
    
    onChange({
      ...data,
      loyaltyTiers: [...data.loyaltyTiers, newTier]
    })
    
    setNewTierName("")
  }
  
  const handleRemoveTier = (index: number) => {
    const newTiers = [...data.loyaltyTiers]
    newTiers.splice(index, 1)
    
    onChange({
      ...data,
      loyaltyTiers: newTiers
    })
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl">Customer Segments</CardTitle>
        <CardDescription>
          Define customer segmentation and loyalty tiers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Loyalty Tiers */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Loyalty Tiers</h3>
            <p className="text-sm text-muted-foreground">
              Define the loyalty tiers for your customers based on their activity and spending.
            </p>
          </div>
          
          <div className="space-y-6">
            {data.loyaltyTiers.map((tier, index) => (
              <div 
                key={`tier-${index}`} 
                className="space-y-4 border rounded-md p-4"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-medium">{tier.name}</Label>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleRemoveTier(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`tier-${index}-name`}>Tier Name</Label>
                    <Input
                      id={`tier-${index}-name`}
                      value={tier.name}
                      onChange={(e) => handleTierFieldChange(index, 'name', e.target.value)}
                      placeholder="e.g. Bronze, Silver, Gold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`tier-${index}-transactions`}>Lifetime Transactions</Label>
                    <Input
                      id={`tier-${index}-transactions`}
                      type="number"
                      min="0"
                      value={tier.lifetimeTransactions}
                      onChange={(e) => handleTierFieldChange(index, 'lifetimeTransactions', e.target.value)}
                      placeholder="Minimum transactions"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`tier-${index}-spend`}>Lifetime Spend ($)</Label>
                    <Input
                      id={`tier-${index}-spend`}
                      type="number"
                      min="0"
                      value={tier.lifetimeSpend}
                      onChange={(e) => handleTierFieldChange(index, 'lifetimeSpend', e.target.value)}
                      placeholder="Minimum spend"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`tier-${index}-redemptions`}>Redemptions</Label>
                    <Input
                      id={`tier-${index}-redemptions`}
                      type="number"
                      min="0"
                      value={tier.redemptions}
                      onChange={(e) => handleTierFieldChange(index, 'redemptions', e.target.value)}
                      placeholder="Minimum redemptions"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="new-tier-name">Add Tier</Label>
              <Input
                id="new-tier-name"
                placeholder="New tier name..."
                value={newTierName}
                onChange={(e) => setNewTierName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTier();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleAddTier}
              disabled={!newTierName}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </div>
        </div>
        
        {/* Visit & Spending Thresholds */}
        <div className="space-y-4 border-t pt-6">
          <div>
            <h3 className="text-lg font-medium">Visit & Spending Thresholds</h3>
            <p className="text-sm text-muted-foreground">
              Define thresholds for frequent visitors and high spenders.
            </p>
          </div>
          
          <div className="space-y-6">
            {/* Frequent Visitor */}
            <div className="space-y-4">
              <h4 className="font-medium">Frequent Visitor</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequent-visits">Visits</Label>
                  <Input
                    id="frequent-visits"
                    type="number"
                    min="1"
                    value={data.visitSpendingThresholds.frequentVisitor.visits}
                    onChange={(e) => handleVisitThresholdChange('visits', e.target.value)}
                    placeholder="Minimum visits"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequent-days">Per Days</Label>
                  <Input
                    id="frequent-days"
                    type="number"
                    min="1"
                    value={data.visitSpendingThresholds.frequentVisitor.perDays}
                    onChange={(e) => handleVisitThresholdChange('perDays', e.target.value)}
                    placeholder="Time period in days"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A customer is considered a frequent visitor if they visit at least {data.visitSpendingThresholds.frequentVisitor.visits} times in {data.visitSpendingThresholds.frequentVisitor.perDays} days.
              </p>
            </div>
            
            {/* High Spender */}
            <div className="space-y-4">
              <h4 className="font-medium">High Spender</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="high-amount">Amount ($)</Label>
                  <Input
                    id="high-amount"
                    type="number"
                    min="1"
                    value={data.visitSpendingThresholds.highSpender.amount}
                    onChange={(e) => handleSpendingThresholdChange('amount', e.target.value)}
                    placeholder="Minimum spend amount"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="high-days">Per Days</Label>
                  <Input
                    id="high-days"
                    type="number"
                    min="1"
                    value={data.visitSpendingThresholds.highSpender.perDays}
                    onChange={(e) => handleSpendingThresholdChange('perDays', e.target.value)}
                    placeholder="Time period in days"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A customer is considered a high spender if they spend at least ${data.visitSpendingThresholds.highSpender.amount} in {data.visitSpendingThresholds.highSpender.perDays} days.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 