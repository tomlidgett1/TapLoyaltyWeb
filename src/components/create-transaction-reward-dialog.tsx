"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from "@/components/ui/use-toast"
import { playSuccessSound } from '@/lib/audio'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface CreateTransactionRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateTransactionRewardDialog({ open, onOpenChange }: CreateTransactionRewardDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState({
    pin: '',
    rewardName: '',
    description: '',
    transactionThreshold: '5',
    rewardType: 'dollar_voucher' as 'dollar_voucher' | 'free_item',
    voucherAmount: '10',
    freeItemName: '',
    iterations: '15',
    isActive: true
  })

  const handleCreateClick = () => {
    // Check if required fields are filled
    if (!formData.rewardName || !formData.pin || !formData.transactionThreshold) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including PIN code",
        variant: "destructive"
      })
      return
    }

    if (formData.rewardType === 'dollar_voucher' && !formData.voucherAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter a voucher amount",
        variant: "destructive"
      })
      return
    }

    if (formData.rewardType === 'free_item' && !formData.freeItemName) {
      toast({
        title: "Missing Information",
        description: "Please enter a free item name",
        variant: "destructive"
      })
      return
    }
    
    // Show confirmation dialog
    setShowConfirmation(true)
  }

  const saveTransactionReward = async () => {
    if (!user?.uid) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a reward",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    setShowConfirmation(false) // Close the confirmation dialog

    try {
      // Call the recurring reward function
      const recurringReward = httpsCallable(functions, 'recurringRewardCallable')
      
      // Make sure merchantId is explicitly set and logged
      const merchantId = user.uid
      console.log("Using merchantId:", merchantId)
      
      // Structure the data as expected by the function
      const functionData = {
        data: {
          merchantId: merchantId,
          pin: formData.pin,
          name: formData.rewardName,
          description: formData.description || "",
          active: formData.isActive,
          transactionThreshold: parseInt(formData.transactionThreshold),
          rewardType: formData.rewardType,
          iterations: parseInt(formData.iterations)
        }
      }

      // Add reward type specific fields
      if (formData.rewardType === 'dollar_voucher') {
        functionData.data.voucherAmount = parseInt(formData.voucherAmount)
      } else if (formData.rewardType === 'free_item') {
        functionData.data.freeItemName = formData.freeItemName
      }

      // Log the complete data object to verify all fields
      console.log("Sending data to recurring reward function:", JSON.stringify(functionData, null, 2))
      
      // Call the function with the data
      const result = await recurringReward(functionData)
      console.log("Recurring reward function result:", result)
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Transaction-based reward created successfully",
      })
      onOpenChange(false)
      
    } catch (error: any) {
      console.error("Error creating recurring reward:", error)
      
      // Check for specific error message about existing program
      if (error.message && error.message.includes("Recurring Reward Program Already Exists")) {
        toast({
          title: "Program Already Exists",
          description: "A transaction-based reward program already exists for this merchant. You cannot create multiple transaction-based reward programs.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create transaction-based reward",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const ConfirmationDialog = () => {
    if (!showConfirmation) return null
    
    const transactionThreshold = parseInt(formData.transactionThreshold)
    const iterations = parseInt(formData.iterations)
    const rewardDescription = formData.rewardType === 'dollar_voucher' 
      ? `$${formData.voucherAmount} voucher` 
      : `Free ${formData.freeItemName}`
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-[#007AFF]">Confirm Transaction-Based Reward</h3>
            
            <p className="mb-4 text-sm">
              You're about to create a transaction-based reward program with the following details:
            </p>
            
            <div className="bg-blue-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">{formData.rewardName}</h4>
              {formData.description && <p className="text-sm mb-3 text-gray-600">{formData.description}</p>}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reward Type:</span>
                  <span className="font-medium">
                    {formData.rewardType === 'dollar_voucher' ? 'Dollar Voucher' : 'Free Item'}
                  </span>
                </div>
                {formData.rewardType === 'dollar_voucher' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voucher Amount:</span>
                    <span className="font-medium">${formData.voucherAmount}</span>
                  </div>
                )}
                {formData.rewardType === 'free_item' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Free Item:</span>
                    <span className="font-medium">{formData.freeItemName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Transaction Threshold:</span>
                  <span className="font-medium">{transactionThreshold} transactions</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Number of Levels:</span>
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
                This will create {iterations} reward levels that customers can earn as they make more transactions at your business:
              </p>
              
              <div className="space-y-2 text-sm">
                {[...Array(Math.min(iterations, 5))].map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-medium">{rewardDescription}</span> unlocks after {transactionThreshold * (i + 1)} transactions
                    </div>
                  </div>
                ))}
                
                {iterations > 5 && (
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      ...
                    </div>
                    <div>And so on, up to {iterations} reward levels</div>
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
                onClick={saveTransactionReward}
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2 -ml-2 h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-[#007AFF]">Configure</span>&nbsp;Transaction-Based Reward
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
                      About Transaction-Based Rewards
                    </h3>
                    <p className="text-blue-700 mb-3">
                      Transaction-based rewards automatically reward customers as they make more transactions at your business.
                    </p>
                    <div className="space-y-2 text-blue-700">
                      <div className="flex items-start gap-2">
                        <div className="min-w-[20px] font-bold text-blue-500">•</div>
                        <p>Each reward level requires a higher number of transactions to unlock</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="min-w-[20px] font-bold text-blue-500">•</div>
                        <p>If you set <span className="font-medium text-blue-800">5 transactions</span> as the threshold and <span className="font-medium text-blue-800">15 levels</span>, customers will get:</p>
                      </div>
                      <div className="pl-7 space-y-1.5 bg-white/50 p-2 rounded border border-blue-200/50 my-1">
                        <p className="flex items-center">
                          <span className="text-blue-500 mr-2">1.</span> 
                          <span>First reward after 5 transactions</span>
                        </p>
                        <p className="flex items-center">
                          <span className="text-blue-500 mr-2">2.</span> 
                          <span>Second reward after 10 transactions</span>
                        </p>
                        <p className="flex items-center">
                          <span className="text-blue-500 mr-2">3.</span> 
                          <span>Third reward after 15 transactions, and so on</span>
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="min-w-[20px] font-bold text-blue-500">•</div>
                        <p>Rewards appear automatically in customer accounts when they qualify</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4 min-h-[400px]">
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
                placeholder="Describe the transaction-based reward"
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
                Staff will enter this PIN when redeeming rewards
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Reward Type</Label>
              <RadioGroup
                value={formData.rewardType}
                onValueChange={(value: 'dollar_voucher' | 'free_item') => 
                  setFormData({ ...formData, rewardType: value })
                }
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="dollar_voucher" id="dollar_voucher" />
                  <Label htmlFor="dollar_voucher">Dollar Voucher</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free_item" id="free_item" />
                  <Label htmlFor="free_item">Free Item</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.rewardType === 'dollar_voucher' && (
              <div className="grid gap-2">
                <Label>Voucher Amount ($)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.voucherAmount}
                  onChange={(e) => setFormData({ ...formData, voucherAmount: e.target.value })}
                  placeholder="Enter voucher amount"
                />
                <p className="text-sm text-muted-foreground">
                  Dollar amount of the voucher
                </p>
              </div>
            )}

            {formData.rewardType === 'free_item' && (
              <div className="grid gap-2">
                <Label>Free Item Name</Label>
                <Input
                  type="text"
                  value={formData.freeItemName}
                  onChange={(e) => setFormData({ ...formData, freeItemName: e.target.value })}
                  placeholder="Enter free item name"
                />
                <p className="text-sm text-muted-foreground">
                  Name of the free item (e.g. "Coffee", "Dessert")
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Transaction Threshold</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.transactionThreshold}
                  onChange={(e) => setFormData({ ...formData, transactionThreshold: e.target.value })}
                  placeholder="Enter number of transactions"
                />
                <p className="text-sm text-muted-foreground">
                  Transactions needed for first reward
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Number of Levels</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.iterations}
                  onChange={(e) => setFormData({ ...formData, iterations: e.target.value })}
                  placeholder="Enter number of reward levels"
                />
                <p className="text-sm text-muted-foreground">
                  How many levels to create
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateClick} 
            disabled={loading}
            className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
          >
            Create Transaction Reward
          </Button>
        </div>

        {showConfirmation && <ConfirmationDialog />}
      </DialogContent>
    </Dialog>
  )
} 