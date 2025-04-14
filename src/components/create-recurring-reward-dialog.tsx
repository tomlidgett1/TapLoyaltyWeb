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
      image: "/rec1.png",
      details: "Perfect for cafes, bakeries, or any business with repeat purchases. Customers earn stamps toward free items.",
      action: () => setScreen('coffee')
    },
    {
      title: "Recurring Voucher",
      description: "Set up an automatically recurring voucher reward",
      icon: Percent,
      image: "/rec2.png",
      details: "Great for retail and services. Customers earn dollar value vouchers at spending milestones.",
      action: () => setScreen('discount')
    },
    {
      title: "Transaction-Based Reward",
      description: "Reward customers based on number of transactions",
      icon: ShoppingBag,
      image: "/rec1.png",
      details: "Ideal for businesses where visit frequency matters more than spend amount. Rewards based on visit count.",
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
        title: "Success",
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
        <DialogContent className="sm:max-w-[95%] md:max-w-[90%] lg:max-w-[1100px] h-[97vh] max-h-[97vh] overflow-auto overflow-x-hidden flex flex-col scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <style jsx global>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
          `}</style>
          <DialogHeader>
            <DialogTitle>
              {screen === 'options' ? (
                <>
                  <span className="text-[#007AFF]">Create</span> Recurring Reward
                </>
              ) : screen === 'coffee' ? (
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
                    <span className="text-[#007AFF]">Configure</span>{' '}Coffee Program
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
                          About Coffee Programs
                        </h3>
                        <p className="text-blue-700 mb-3">
                          Coffee programs create digital loyalty cards that reward customers after a set number of purchases.
                        </p>
                        <div className="space-y-2 text-blue-700">
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>Customers earn stamps with each qualifying purchase</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>If you set <span className="font-medium text-blue-800">5 purchases</span> as the frequency and <span className="font-medium text-blue-800">5 rewards</span>, customers will get:</p>
                          </div>
                          <div className="pl-7 space-y-1.5 bg-white/50 p-2 rounded border border-blue-200/50 my-1">
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">1.</span> 
                              <span>First free coffee after 5 purchases</span>
                            </p>
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">2.</span> 
                              <span>Second free coffee after 10 purchases</span>
                            </p>
                            <p className="flex items-center">
                              <span className="text-blue-500 mr-2">3.</span> 
                              <span>Third free coffee after 15 purchases, and so on</span>
                            </p>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="min-w-[20px] font-bold text-blue-500">•</div>
                            <p>Free coffees appear automatically in customer accounts when they qualify</p>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
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

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {screen === 'options' ? (
              <div className="py-6 min-h-[300px]">
                <div className="bg-blue-50 p-4 rounded-md border border-blue-100 mb-6">
                  <h3 className="text-md font-medium text-blue-800 mb-2">Select Reward Type</h3>
                  <p className="text-sm text-blue-700">
                    Choose the type of recurring reward you want to create for your customers. Each option shows how it appears in the customer app.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {options.map((option) => (
                    <div 
                      key={option.title}
                      className="group cursor-pointer transition-all hover:shadow-md border border-gray-200 rounded-xl overflow-hidden hover:border-[#007AFF] flex flex-col"
                      onClick={option.action}
                    >
                      {/* Image section */}
                      <div className="bg-gradient-to-br from-blue-50 to-gray-50 p-8 flex items-center justify-center h-[250px]">
                        <div className="transform scale-[1.7]">
                          <img 
                            src={option.image} 
                            alt={`${option.title} preview`} 
                            className="w-auto h-auto object-contain max-h-[180px]"
                          />
                        </div>
                      </div>
                      
                      {/* Content section */}
                      <div className="p-6 flex-1 flex flex-col text-center">
                        <div className="mb-4 mt-2 flex flex-col items-center">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#007AFF] transition-colors">
                            {option.title}
                          </h3>
                        </div>
                        
                        <p className="text-md text-gray-600 mb-4">
                          {option.description}
                        </p>
                        
                        <div className="bg-gray-50 p-4 rounded-md border border-gray-100 mb-6 flex-1">
                          <p className="text-sm text-gray-700">
                            {option.details}
                          </p>
                        </div>
                        
                        <div className="mt-auto flex justify-center">
                          <button className="w-full py-3 px-4 rounded-md bg-blue-50 text-md text-[#007AFF] font-medium flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            Configure
                            <ChevronRight className="h-5 w-5 ml-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : screen === 'coffee' ? (
              <div className="py-1 min-h-[300px] overflow-x-hidden">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Coffee Program Settings</h3>
                  <p className="text-xs text-blue-700">
                    Create a digital "buy X get 1 free" stamp card program for coffee or other beverages. Configure how many purchases customers need to make before earning a free item.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 overflow-hidden">
                  {/* Left column with form inputs - takes 3/5 of the space */}
                  <div className="md:col-span-3 space-y-4">
                    <div className="grid gap-2">
                      <Label>PIN Code <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        maxLength={4}
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                        placeholder="Enter 4-digit PIN (e.g., 1234)"
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
                          <Label htmlFor="before">Before first transaction (welcome gift)</Label>
                        </div>
                      </RadioGroup>
                      <p className="text-sm text-muted-foreground">
                        Choose when customers receive their first free coffee
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Frequency <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          placeholder="e.g., 5"
                        />
                        <p className="text-sm text-muted-foreground">
                          Number of purchases required between free coffees
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <Label>Number of Rewards <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.levels}
                          onChange={(e) => setFormData({ ...formData, levels: e.target.value })}
                          placeholder="e.g., 5"
                        />
                        <p className="text-sm text-muted-foreground">
                          Total number of free coffees in the program
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Program Summary</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm mb-2">
                          Based on your settings, customers will:
                        </p>
                        <ul className="text-sm space-y-1 pl-5 list-disc">
                          <li>
                            {formData.freeRewardTiming === 'before' ? 
                              "Get a free coffee immediately upon joining" : 
                              `Get a free coffee after ${formData.frequency} purchases`}
                          </li>
                          <li>
                            Earn another free coffee every {formData.frequency} purchases
                          </li>
                          <li>
                            Earn up to {formData.levels} free coffees in total
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column with iOS image - takes 2/5 of the space */}
                  <div className="md:col-span-2 flex flex-col items-center">
                    <h3 className="text-base font-bold text-gray-900 mb--1">
                      Preview on iOS App
                    </h3>
                    <div className="flex items-center justify-center" style={{ height: "480px" }}>
                      <img 
                        src="/ios.png" 
                        alt="Coffee Program on iOS App" 
                        className="max-h-[460px] w-auto object-contain"
                        style={{ transform: "scale(1.45)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-1 min-h-[300px] overflow-x-hidden">
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Recurring Voucher Settings</h3>
                  <p className="text-xs text-blue-700">
                    Create vouchers that customers earn automatically as they spend at your business. Each voucher requires the same spend amount, creating a regular reward cycle.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 overflow-hidden">
                  {/* Left column with form inputs - takes 3/5 of the space */}
                  <div className="md:col-span-3 space-y-3">
                    <div className="grid gap-2">
                      <Label>Reward Name <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        value={formData.rewardName}
                        onChange={(e) => setFormData({ ...formData, rewardName: e.target.value })}
                        placeholder="e.g., Loyalty Spending Voucher"
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose a clear name that explains the value to customers
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="e.g., Earn $10 vouchers for every $100 you spend"
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        This helps customers understand how to earn the vouchers
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>PIN Code <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        maxLength={4}
                        value={formData.pin}
                        onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                        placeholder="Enter 4-digit PIN (e.g., 1234)"
                      />
                      <p className="text-sm text-muted-foreground">
                        Staff will enter this PIN when redeeming vouchers
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Total Spend Required ($) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.spendRequired}
                          onChange={(e) => setFormData({ ...formData, spendRequired: e.target.value })}
                          placeholder="e.g., 100"
                        />
                        <p className="text-xs text-muted-foreground">
                          Amount needed for each voucher
                        </p>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label>Voucher Amount ($) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.discountAmount}
                          onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                          placeholder="e.g., 10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Value of each voucher
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label>Number of Vouchers <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.iterations}
                        onChange={(e) => setFormData({ ...formData, iterations: e.target.value })}
                        placeholder="e.g., 5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Total number of vouchers a customer can earn
                      </p>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Program Summary</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm mb-2">
                          Based on your settings, customers will earn:
                        </p>
                        <ul className="text-sm space-y-1 pl-5 list-disc">
                          <li>
                            ${formData.discountAmount} voucher after spending ${formData.spendRequired}
                          </li>
                          <li>
                            Another ${formData.discountAmount} voucher after spending ${parseInt(formData.spendRequired) * 2}
                          </li>
                          <li>
                            And so on, up to ${formData.iterations} vouchers in total
                          </li>
                          <li>
                            Total potential reward value: ${parseInt(formData.discountAmount) * parseInt(formData.iterations)}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right column with iOS image - takes 2/5 of the space */}
                  <div className="md:col-span-2 flex flex-col items-center">
                    <h3 className="text-base font-bold text-gray-900 mb--1">
                      Preview on iOS App
                    </h3>
                    <div className="flex items-center justify-center" style={{ height: "480px" }}>
                      <img 
                        src="/ios.png" 
                        alt="Recurring Voucher on iOS App" 
                        className="max-h-[460px] w-auto object-contain"
                        style={{ transform: "scale(1.45)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-1 pb-1 flex justify-end gap-2">
            <Button 
              variant="outline" 
              size="sm"
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
                size="sm" 
                disabled={loading || !formData.pin || !formData.frequency || !formData.levels}
                className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
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
                size="sm" 
                disabled={loading || !formData.rewardName || !formData.pin || !formData.spendRequired || !formData.discountAmount}
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