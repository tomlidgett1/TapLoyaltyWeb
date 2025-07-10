"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface CreateProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (programData: any) => void
}

export function CreateProgramDialog({ 
  open, 
  onOpenChange, 
  onSave 
}: CreateProgramDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  
  // Basic Program Info
  const [title, setTitle] = useState("Loyalty Program")
  const [description, setDescription] = useState("Earn rewards for your loyalty")
  
  // Points & Earning Rules
  const [pointsPerDollar, setPointsPerDollar] = useState(1)
  const [minimumSpend, setMinimumSpend] = useState(0)
  const [enableBonusPoints, setEnableBonusPoints] = useState(false)
  const [bonusPointsMultiplier, setBonusPointsMultiplier] = useState(2)
  const [bonusPointsThreshold, setBonusPointsThreshold] = useState(100)
  
  // Recurring Vouchers
  const [enableRecurringVouchers, setEnableRecurringVouchers] = useState(false)
  const [voucherFrequency, setVoucherFrequency] = useState("monthly") // weekly, monthly, quarterly
  const [voucherAmount, setVoucherAmount] = useState(10)
  const [voucherType, setVoucherType] = useState("percentage") // percentage, fixed
  const [voucherMinSpend, setVoucherMinSpend] = useState(50)
  const [voucherExpiry, setVoucherExpiry] = useState(30) // days
  
  // Transaction Rewards
  const [enableTransactionRewards, setEnableTransactionRewards] = useState(false)
  const [transactionRewardType, setTransactionRewardType] = useState("points") // points, voucher, gift
  const [transactionPointsReward, setTransactionPointsReward] = useState(50)
  const [transactionVoucherReward, setTransactionVoucherReward] = useState(5)
  const [transactionThreshold, setTransactionThreshold] = useState(10) // number of transactions
  const [transactionPeriod, setTransactionPeriod] = useState("monthly") // weekly, monthly
  
  // Tier System
  const [enableTiers, setEnableTiers] = useState(false)
  const [tiers, setTiers] = useState([
    { name: "Bronze", threshold: 0, multiplier: 1, benefits: [] },
    { name: "Silver", threshold: 500, multiplier: 1.25, benefits: ["Early access to sales"] },
    { name: "Gold", threshold: 1000, multiplier: 1.5, benefits: ["Free shipping", "Priority support"] },
    { name: "Platinum", threshold: 2000, multiplier: 2, benefits: ["Exclusive products", "Personal advisor"] }
  ])
  
  // Special Features
  const [enableReferralBonus, setEnableReferralBonus] = useState(false)
  const [referralBonus, setReferralBonus] = useState(100)
  const [enableBirthdayBonus, setEnableBirthdayBonus] = useState(false)
  const [birthdayBonus, setBirthdayBonus] = useState(200)
  const [enableWelcomeBonus, setEnableWelcomeBonus] = useState(true)
  const [welcomeBonus, setWelcomeBonus] = useState(50)

  const handleSave = async () => {
    setLoading(true)
    
    try {
      const programData = {
        // Basic Info
        title,
        description,
        
        // Points & Earning
        pointsPerDollar,
        minimumSpend,
        enableBonusPoints,
        bonusPointsMultiplier,
        bonusPointsThreshold,
        
        // Recurring Vouchers
        enableRecurringVouchers,
        voucherSettings: {
          frequency: voucherFrequency,
          amount: voucherAmount,
          type: voucherType,
          minSpend: voucherMinSpend,
          expiry: voucherExpiry
        },
        
        // Transaction Rewards
        enableTransactionRewards,
        transactionRewards: {
          type: transactionRewardType,
          pointsReward: transactionPointsReward,
          voucherReward: transactionVoucherReward,
          threshold: transactionThreshold,
          period: transactionPeriod
        },
        
        // Tier System
        enableTiers,
        tiers: enableTiers ? tiers : [],
        
        // Special Features
        specialFeatures: {
          referralBonus: enableReferralBonus ? referralBonus : null,
          birthdayBonus: enableBirthdayBonus ? birthdayBonus : null,
          welcomeBonus: enableWelcomeBonus ? welcomeBonus : null
        },
        
        createdAt: new Date().toISOString()
      }
      
      if (onSave) {
        onSave(programData)
      }
      
      toast({
        title: "Program created",
        description: "Your loyalty program has been created successfully.",
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "There was an error creating your program.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="text-[#007AFF]">Create</span> Loyalty Program
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="points">Points & Earning</TabsTrigger>
            <TabsTrigger value="vouchers">Recurring Vouchers</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Rewards</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>
          
          {/* Basic Information Tab */}
          <TabsContent value="basic" className="space-y-4">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-1">Setup Your Loyalty Program</h3>
            <p className="text-xs text-blue-700">
              Define the basic details of your loyalty program. This information will be visible to your customers when they join.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Program Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a memorable name for your program"
            />
            <p className="text-xs text-gray-500">
              Choose a name that reflects your brand and the value of your program
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how customers benefit from your program"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              A clear description helps customers understand how your loyalty program works
            </p>
          </div>
          
            {/* Welcome Bonus */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Welcome Bonus</CardTitle>
                    <CardDescription>Reward new customers for joining your program</CardDescription>
                  </div>
                  <Switch
                    checked={enableWelcomeBonus}
                    onCheckedChange={setEnableWelcomeBonus}
                  />
                </div>
              </CardHeader>
              {enableWelcomeBonus && (
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="welcomeBonus">Welcome Points</Label>
                    <Input
                      id="welcomeBonus"
                      type="number"
                      value={welcomeBonus}
                      onChange={(e) => setWelcomeBonus(Number(e.target.value))}
                      placeholder="50"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
          
          {/* Points & Earning Tab */}
          <TabsContent value="points" className="space-y-4">
            <div className="bg-green-50 p-3 rounded-md border border-green-100 mb-4">
              <h3 className="text-sm font-medium text-green-800 mb-1">Points & Earning Rules</h3>
              <p className="text-xs text-green-700">
                Configure how customers earn points for their purchases and activities.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointsPerDollar">Points per $1 spent</Label>
                <Input
                  id="pointsPerDollar"
                  type="number"
                  value={pointsPerDollar}
                  onChange={(e) => setPointsPerDollar(Number(e.target.value))}
                  placeholder="1"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="minimumSpend">Minimum spend for points</Label>
                <Input
                  id="minimumSpend"
                  type="number"
                  value={minimumSpend}
                  onChange={(e) => setMinimumSpend(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            </div>
            
            {/* Bonus Points */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Bonus Points</CardTitle>
                    <CardDescription>Offer multiplier for high-value purchases</CardDescription>
                  </div>
                  <Switch
                    checked={enableBonusPoints}
                    onCheckedChange={setEnableBonusPoints}
                  />
                </div>
              </CardHeader>
              {enableBonusPoints && (
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bonusMultiplier">Points Multiplier</Label>
                      <Input
                        id="bonusMultiplier"
                        type="number"
                        step="0.1"
                        value={bonusPointsMultiplier}
                        onChange={(e) => setBonusPointsMultiplier(Number(e.target.value))}
                        placeholder="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bonusThreshold">Minimum spend for bonus</Label>
                      <Input
                        id="bonusThreshold"
                        type="number"
                        value={bonusPointsThreshold}
                        onChange={(e) => setBonusPointsThreshold(Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
            
            {/* Special Bonuses */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Referral Bonus</CardTitle>
                      <CardDescription>Points for referring friends</CardDescription>
                    </div>
                    <Switch
                      checked={enableReferralBonus}
                      onCheckedChange={setEnableReferralBonus}
                    />
                  </div>
                </CardHeader>
                {enableReferralBonus && (
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="referralBonus">Referral Points</Label>
                      <Input
                        id="referralBonus"
                        type="number"
                        value={referralBonus}
                        onChange={(e) => setReferralBonus(Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
              
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Birthday Bonus</CardTitle>
                      <CardDescription>Special birthday points</CardDescription>
                    </div>
                    <Switch
                      checked={enableBirthdayBonus}
                      onCheckedChange={setEnableBirthdayBonus}
                    />
                  </div>
                </CardHeader>
                {enableBirthdayBonus && (
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="birthdayBonus">Birthday Points</Label>
                      <Input
                        id="birthdayBonus"
                        type="number"
                        value={birthdayBonus}
                        onChange={(e) => setBirthdayBonus(Number(e.target.value))}
                        placeholder="200"
                      />
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </TabsContent>
          
          {/* Recurring Vouchers Tab */}
          <TabsContent value="vouchers" className="space-y-4">
            <div className="bg-purple-50 p-3 rounded-md border border-purple-100 mb-4">
              <h3 className="text-sm font-medium text-purple-800 mb-1">Recurring Vouchers</h3>
              <p className="text-xs text-purple-700">
                Automatically send discount vouchers to your loyal customers on a regular schedule.
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Enable Recurring Vouchers</CardTitle>
                    <CardDescription>Send automatic discount vouchers to customers</CardDescription>
                  </div>
                  <Switch
                    checked={enableRecurringVouchers}
                    onCheckedChange={setEnableRecurringVouchers}
                  />
                </div>
              </CardHeader>
              {enableRecurringVouchers && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucherFrequency">Frequency</Label>
                      <Select value={voucherFrequency} onValueChange={setVoucherFrequency}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="voucherType">Voucher Type</Label>
                      <Select value={voucherType} onValueChange={setVoucherType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage Off</SelectItem>
                          <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="voucherAmount">
                        {voucherType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}
                      </Label>
                      <Input
                        id="voucherAmount"
                        type="number"
                        value={voucherAmount}
                        onChange={(e) => setVoucherAmount(Number(e.target.value))}
                        placeholder={voucherType === 'percentage' ? '10' : '5'}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="voucherMinSpend">Minimum Spend ($)</Label>
                      <Input
                        id="voucherMinSpend"
                        type="number"
                        value={voucherMinSpend}
                        onChange={(e) => setVoucherMinSpend(Number(e.target.value))}
                        placeholder="50"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="voucherExpiry">Expiry (days)</Label>
                      <Input
                        id="voucherExpiry"
                        type="number"
                        value={voucherExpiry}
                        onChange={(e) => setVoucherExpiry(Number(e.target.value))}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Preview</h4>
                    <p className="text-sm text-gray-600">
                      Customers will receive a {voucherAmount}{voucherType === 'percentage' ? '%' : '$'} 
                      {voucherType === 'percentage' ? ' discount' : ' off'} voucher {voucherFrequency}, 
                      valid for {voucherExpiry} days with a minimum spend of ${voucherMinSpend}.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
          
          {/* Transaction Rewards Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="bg-orange-50 p-3 rounded-md border border-orange-100 mb-4">
              <h3 className="text-sm font-medium text-orange-800 mb-1">Transaction Rewards</h3>
              <p className="text-xs text-orange-700">
                Reward customers for reaching transaction milestones over specific periods.
              </p>
            </div>
            
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Enable Transaction Rewards</CardTitle>
                    <CardDescription>Reward customers for frequent purchases</CardDescription>
                  </div>
                  <Switch
                    checked={enableTransactionRewards}
                    onCheckedChange={setEnableTransactionRewards}
                  />
                </div>
              </CardHeader>
              {enableTransactionRewards && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transactionThreshold">Number of Transactions</Label>
                      <Input
                        id="transactionThreshold"
                        type="number"
                        value={transactionThreshold}
                        onChange={(e) => setTransactionThreshold(Number(e.target.value))}
                        placeholder="10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="transactionPeriod">Time Period</Label>
                      <Select value={transactionPeriod} onValueChange={setTransactionPeriod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="transactionRewardType">Reward Type</Label>
                      <Select value={transactionRewardType} onValueChange={setTransactionRewardType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reward type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="points">Bonus Points</SelectItem>
                          <SelectItem value="voucher">Discount Voucher</SelectItem>
                          <SelectItem value="gift">Free Gift</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {transactionRewardType === 'points' && (
                      <div className="space-y-2">
                        <Label htmlFor="transactionPointsReward">Bonus Points</Label>
                        <Input
                          id="transactionPointsReward"
                          type="number"
                          value={transactionPointsReward}
                          onChange={(e) => setTransactionPointsReward(Number(e.target.value))}
                          placeholder="50"
                        />
                      </div>
                    )}
                    
                    {transactionRewardType === 'voucher' && (
                      <div className="space-y-2">
                        <Label htmlFor="transactionVoucherReward">Voucher Amount ($)</Label>
                        <Input
                          id="transactionVoucherReward"
                          type="number"
                          value={transactionVoucherReward}
                          onChange={(e) => setTransactionVoucherReward(Number(e.target.value))}
                          placeholder="5"
                        />
                      </div>
                    )}
                    
                    {transactionRewardType === 'gift' && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-700">
                          Free gift rewards will need to be configured in your inventory system.
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Preview</h4>
                    <p className="text-sm text-gray-600">
                      Customers who make {transactionThreshold} transactions {transactionPeriod} will receive{' '}
                      {transactionRewardType === 'points' && `${transactionPointsReward} bonus points`}
                      {transactionRewardType === 'voucher' && `a $${transactionVoucherReward} voucher`}
                      {transactionRewardType === 'gift' && 'a free gift'}.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          </TabsContent>
          
          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100 mb-4">
              <h3 className="text-sm font-medium text-indigo-800 mb-1">Advanced Features</h3>
              <p className="text-xs text-indigo-700">
                Configure tier systems and advanced program features.
              </p>
            </div>
            
            {/* Tier System */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Tier System</CardTitle>
                    <CardDescription>Create customer tiers with increasing benefits</CardDescription>
                  </div>
                  <Switch
                    checked={enableTiers}
                    onCheckedChange={setEnableTiers}
                  />
                </div>
              </CardHeader>
              {enableTiers && (
                <CardContent>
                  <div className="space-y-4">
                    {tiers.map((tier, index) => (
                      <div key={index} className="border rounded-md p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={index === 0 ? "secondary" : index === 1 ? "default" : index === 2 ? "outline" : "destructive"}>
                            {tier.name}
                          </Badge>
                          <div className="text-sm text-gray-500">
                            {tier.threshold === 0 ? 'Starting tier' : `${tier.threshold}+ points`}
                          </div>
                        </div>
                        <div className="text-sm">
                          <div className="mb-1">Points multiplier: {tier.multiplier}x</div>
                          {tier.benefits.length > 0 && (
                            <div>
                              <span className="font-medium">Benefits:</span>
                              <ul className="list-disc list-inside ml-2">
                                {tier.benefits.map((benefit, benefitIndex) => (
                                  <li key={benefitIndex}>{benefit}</li>
                                ))}
            </ul>
          </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
            
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Program Summary</CardTitle>
                <CardDescription>Review your loyalty program configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Basic earning rate:</span>
                    <span>{pointsPerDollar} point{pointsPerDollar !== 1 ? 's' : ''} per $1</span>
                  </div>
                  {enableBonusPoints && (
                    <div className="flex justify-between">
                      <span>Bonus multiplier:</span>
                      <span>{bonusPointsMultiplier}x on ${bonusPointsThreshold}+ purchases</span>
                    </div>
                  )}
                  {enableRecurringVouchers && (
                    <div className="flex justify-between">
                      <span>Recurring vouchers:</span>
                      <span>{voucherAmount}{voucherType === 'percentage' ? '%' : '$'} off {voucherFrequency}</span>
                    </div>
                  )}
                  {enableTransactionRewards && (
                    <div className="flex justify-between">
                      <span>Transaction rewards:</span>
                      <span>
                        {transactionRewardType === 'points' && `${transactionPointsReward} points`}
                        {transactionRewardType === 'voucher' && `$${transactionVoucherReward} voucher`}
                        {transactionRewardType === 'gift' && 'Free gift'}
                        {' '}for {transactionThreshold} purchases {transactionPeriod}
                      </span>
                    </div>
                  )}
                  {enableTiers && (
                    <div className="flex justify-between">
                      <span>Tier system:</span>
                      <span>{tiers.length} tiers enabled</span>
                    </div>
                  )}
        </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !title || !description}
            className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
          >
            {loading ? "Creating..." : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 