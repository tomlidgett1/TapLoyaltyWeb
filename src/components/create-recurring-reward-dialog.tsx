"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle, ShoppingBag } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { playSuccessSound } from '@/lib/audio'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CreateTransactionRewardDialog } from "@/components/create-transaction-reward-dialog"

interface CreateRecurringRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRecurringRewardDialog({ open, onOpenChange }: CreateRecurringRewardDialogProps) {
  const { user } = useAuth()
  const [screen, setScreen] = useState<'options' | 'coffee' | 'discount'>('options')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pin: '',
    freeRewardTiming: 'after' as 'before' | 'after',
    frequency: '5',
    levels: '5',
    rewardName: '',
    description: '',
    spendRequired: '100',
    discountAmount: '10',
    isActive: true,
    iterations: '3'
  })
  const [showVoucherInfo, setShowVoucherInfo] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showTransactionReward, setShowTransactionReward] = useState(false)

  const options = [
    {
      title: "Coffee Program",
      description: "Create a buy-X-get-1-free coffee loyalty program",
      icon: Coffee,
      action: () => setScreen('coffee')
    },
    {
      title: "Recurring Voucher",
      description: "Set up an automatically recurring voucher reward",
      icon: Percent,
      action: () => setScreen('discount')
    },
    {
      title: "Transaction-Based Reward",
      description: "Reward customers based on number of transactions",
      icon: ShoppingBag,
      action: () => {
        onOpenChange(false)
        setShowTransactionReward(true)
      }
    }
  ]

  const saveCoffeeProgram = async () => {
    if (!user?.uid) return
    setLoading(true)

    try {
      // Check if coffee program exists
      const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const q = query(rewardsRef, where('programtype', '==', 'coffee'))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast({
          title: "Error",
          description: "Coffee program already exists",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      const coffeeprogram = httpsCallable(functions, 'coffeeprogram')
      
      const data = {
        merchantId: user.uid,
        pin: formData.pin,
        firstCoffeeBeforeTransaction: formData.freeRewardTiming === 'before',
        frequency: parseInt(formData.frequency),
        levels: parseInt(formData.levels)
      }

      console.log("Sending data:", JSON.stringify(data, null, 2))
      
      const result = await coffeeprogram(data)
      playSuccessSound()
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Success</span>
          </div>
        ),
        description: "Coffee program created successfully",
      })
      onOpenChange(false)
    } catch (error: any) {
      // No error handling needed here
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    // Check if required fields are filled
    if (!formData.rewardName || !formData.pin || !formData.spendRequired || !formData.discountAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including PIN code",
        variant: "destructive"
      })
      return
    }
    
    // Show confirmation dialog instead of immediately saving
    setShowConfirmation(true)
  }

  const saveRecurringDiscount = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a voucher",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    setShowConfirmation(false) // Close the confirmation dialog

    try {
      // Call the voucher function
      const voucher = httpsCallable(functions, 'voucher')
      
      // Make sure merchantId is explicitly set and logged
      const merchantId = user.uid
      console.log("Using merchantId:", merchantId)
      
      // Structure the data as a plain JavaScript object
      const functionData = {
        data: {
          merchantId: merchantId,
          pin: formData.pin,
          name: formData.rewardName,
          description: formData.description || "",
          active: formData.isActive,
          rewardAmount: parseInt(formData.discountAmount),
          totalSpendRequired: parseInt(formData.spendRequired),
          iterations: parseInt(formData.iterations)
        }
      }

      // Log the complete data object to verify all fields
      console.log("Sending data to voucher function:", JSON.stringify(functionData, null, 2))
      
      // Call the function with the data
      const result = await voucher(functionData)
      console.log("Voucher function result:", result)
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Recurring voucher created successfully",
      })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error("Error creating voucher:", error)
      
      // Check for specific error message about existing voucher program
      if (error.message && error.message.includes("Voucher Program Already Exists")) {
        toast({
          title: "Program Already Exists",
          description: "A voucher program already exists for this merchant. You cannot create multiple voucher programs.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create recurring voucher",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const ConfirmationDialog = () => {
    if (!showConfirmation) return null
    
    const voucherAmount = parseInt(formData.discountAmount)
    const spendRequired = parseInt(formData.spendRequired)
    const iterations = parseInt(formData.iterations)
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-[#007AFF]">Confirm Recurring Voucher</h3>
            
            <p className="mb-4 text-sm">
              You're about to create a recurring voucher program with the following details:
            </p>
            
            <div className="bg-blue-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">{formData.rewardName}</h4>
              {formData.description && <p className="text-sm mb-3 text-gray-600">{formData.description}</p>}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Voucher Amount:</span>
                  <span className="font-medium">${voucherAmount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Spend Required:</span>
                  <span className="font-medium">${spendRequired}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of Vouchers:</span>
                  <span className="font-medium">{iterations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">PIN Code:</span>
                  <span className="font-medium">{formData.pin}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">How This Will Work</h4>
              <p className="text-sm mb-3">
                This will create {iterations} vouchers worth ${voucherAmount} each that customers can earn as they spend at your business:
              </p>
              
              <div className="space-y-2 text-sm">
                {[...Array(Math.min(iterations, 5))].map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-medium">${voucherAmount} voucher</span> unlocks when customer spends ${spendRequired * (i + 1)}
                    </div>
                  </div>
                ))}
                
                {iterations > 5 && (
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      ...
                    </div>
                    <div>And so on, up to {iterations} vouchers</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowConfirmation(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={saveRecurringDiscount}
                disabled={loading}
                className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {screen === 'options' ? (
                <>
                  <span className="text-[#007AFF]">Create</span> Recurring Reward
                </>
              ) : screen === 'coffee' ? (
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mr-2 -ml-2 h-8 w-8"
                    onClick={() => setScreen('options')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-[#007AFF]">Configure</span>{' '}Coffee Program
                </div>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2 -ml-2 h-8 w-8"
                      onClick={() => setScreen('options')}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-[#007AFF]">Configure</span>&nbsp;Recurring Voucher
                  </div>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        type="button"
                        size="sm"
                        className="text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 hover:text-blue-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        How it works
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="bottom" align="end" className="w-80 p-0 z-50" sideOffset={5}>
                      <div className="bg-gradient-to-br from-blue-50 to-blue-100/70 p-4 text-sm rounded-md">
                        <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          About Recurring Vouchers
                        </h3>
                        <p className="text-blue-700 mb-3">
                          Recurring vouchers automatically reward customers as they reach spending milestones at your business.
                        </p>
                        <div className="space-y-2 text-blue-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>Each voucher has the same value but requires progressively higher spending to unlock</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>If you set <span className="font-medium text-blue-800">$10 voucher</span> with <span className="font-medium text-blue-800">$100 spend required</span> and <span className="font-medium text-blue-800">5 vouchers</span>, customers will get:</p>
                          </div>
                          <div className="pl-7 space-y-1.5 bg-white/50 p-2 rounded border border-blue-200/50 my-1">
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">1.</span> 
                              <span>First $10 voucher after spending $100</span>
                            </p>
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">2.</span> 
                              <span>Second $10 voucher after spending $200</span>
                            </p>
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">3.</span> 
                              <span>Third $10 voucher after spending $300, and so on</span>
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>Vouchers appear automatically in customer accounts when they qualify</p>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>

          {screen === 'options' ? (
            <div className="py-4 min-h-[300px]">
              <div className="grid gap-3">
                {options.map((option) => (
                  <Card 
                    key={option.title}
                    className="group cursor-pointer transition-all hover:shadow-sm hover:border-[#007AFF]/30"
                    onClick={option.action}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <option.icon className="h-4 w-4 text-[#007AFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium truncate">
                          {option.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {option.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[#007AFF] transition-colors" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : screen === 'coffee' ? (
            <div className="py-4 min-h-[300px] space-y-6">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>PIN Code</Label>
                  <Input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Enter 4-digit PIN"
                  />
                  <p className="text-sm text-muted-foreground">
                    Staff will enter this PIN when redeeming free coffees
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>First Free Coffee Timing</Label>
                  <RadioGroup
                    value={formData.freeRewardTiming}
                    onValueChange={(value: 'before' | 'after') => 
                      setFormData({ ...formData, freeRewardTiming: value })
                    }
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="after" id="after" />
                      <Label htmlFor="after">After first transaction</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="before" id="before" />
                      <Label htmlFor="before">Before first transaction</Label>
                    </div>
                  </RadioGroup>
                  <p className="text-sm text-muted-foreground">
                    Choose when customers receive their first free coffee
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Frequency</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    placeholder="Enter number of transactions"
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of transactions required between free coffees
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label>Number of Rewards</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.levels}
                    onChange={(e) => setFormData({ ...formData, levels: e.target.value })}
                    placeholder="Enter number of rewards"
                  />
                  <p className="text-sm text-muted-foreground">
                    Total number of free coffees in the program
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-2 space-y-4">
              <div className="space-y-3">
                <div className="grid gap-2">
                  <Label>Reward Name</Label>
                  <Input
                    type="text"
                    value={formData.rewardName}
                    onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                    placeholder="Enter reward name"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the recurring voucher"
                    rows={3}
                  />
                </div>

                <div className="grid gap-2">
                  <Label>PIN Code</Label>
                  <Input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Enter 4-digit PIN"
                  />
                  <p className="text-sm text-muted-foreground">
                    Staff will enter this PIN when redeeming vouchers
                  </p>
                </div>

                <div className="grid gap-1">
                  <Label>Total Spend Required ($)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.spendRequired}
                    onChange={(e) => setFormData({ ...formData, spendRequired: e.target.value })}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount needed to qualify for this voucher
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Voucher Amount ($)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                      placeholder="Enter voucher amount"
                    />
                    <p className="text-sm text-muted-foreground">
                      Amount of voucher
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label>Number of Vouchers</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.iterations}
                      onChange={(e) => setFormData({ ...formData, iterations: e.target.value })}
                      placeholder="Enter number of vouchers"
                    />
                    <p className="text-sm text-muted-foreground">
                      How many to create
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-4 flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                if (screen === 'options') {
                  onOpenChange(false)
                } else {
                  setScreen('options')
                }
              }}
            >
              {screen === 'options' ? 'Cancel' : 'Back'}
            </Button>
            {screen === 'coffee' && (
              <Button 
                onClick={saveCoffeeProgram} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Program'
                )}
              </Button>
            )}
            {screen === 'discount' && (
              <Button 
                onClick={handleCreateClick} 
                disabled={loading}
                className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
              >
                Create Recurring Voucher
              </Button>
            )}
          </div>

          {showConfirmation && <ConfirmationDialog />}
        </DialogContent>
      </Dialog>
      
      <CreateTransactionRewardDialog 
        open={showTransactionReward} 
        onOpenChange={setShowTransactionReward} 
      />
    </>
  )
} 