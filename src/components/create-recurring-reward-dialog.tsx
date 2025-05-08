"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle, ShoppingBag } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { setDoc, writeBatch } from 'firebase/firestore'
import { ScrollArea } from "@/components/ui/scroll-area"

interface CreateRecurringRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Add interface to fix type errors for transaction reward
interface FunctionData {
  merchantId: string;
  pin: string;
  name: string;
  description: string;
  active: boolean;
  transactionThreshold: number;
  rewardType: 'dollar_voucher' | 'free_item';
  iterations: number;
  voucherAmount?: number;
  freeItemName?: string;
}

export function CreateRecurringRewardDialog({ open, onOpenChange }: CreateRecurringRewardDialogProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("coffee")
  const [loading, setLoading] = useState(false)
  const [showCoffeeForm, setShowCoffeeForm] = useState(false)
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [coffeeFormData, setCoffeeFormData] = useState({
    pin: '',
    freeRewardTiming: 'after' as 'before' | 'after',
    frequency: '5',
    levels: '5',
  })
  const [voucherFormData, setVoucherFormData] = useState({
    rewardName: '',
    description: '',
    pin: '',
    spendRequired: '100',
    discountAmount: '10',
    isActive: true,
    iterations: '3'
  })
  const [transactionFormData, setTransactionFormData] = useState({
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
  const [showVoucherConfirmation, setShowVoucherConfirmation] = useState(false)
  const [showTransactionConfirmation, setShowTransactionConfirmation] = useState(false)

  // Reset form visibility when tab changes
  useEffect(() => {
    setShowCoffeeForm(false)
    setShowVoucherForm(false)
    setShowTransactionForm(false)
  }, [activeTab])

  // Custom scrollbar styles
  const scrollbarStyles = `
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `

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
        pin: coffeeFormData.pin,
        firstCoffeeBeforeTransaction: coffeeFormData.freeRewardTiming === 'before',
        frequency: parseInt(coffeeFormData.frequency),
        levels: parseInt(coffeeFormData.levels)
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
    if (!voucherFormData.rewardName || !voucherFormData.pin || !voucherFormData.spendRequired || !voucherFormData.discountAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including PIN code",
        variant: "destructive"
      })
      return
    }
    
    // Show confirmation dialog instead of immediately saving
    setShowVoucherConfirmation(true)
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
    setShowVoucherConfirmation(false) // Close the confirmation dialog

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
          pin: voucherFormData.pin,
          name: voucherFormData.rewardName,
          description: voucherFormData.description || "",
          active: voucherFormData.isActive,
          rewardAmount: parseInt(voucherFormData.discountAmount),
          totalSpendRequired: parseInt(voucherFormData.spendRequired),
          iterations: parseInt(voucherFormData.iterations)
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
    if (!showVoucherConfirmation) return null
    
    const voucherAmount = parseInt(voucherFormData.discountAmount)
    const spendRequired = parseInt(voucherFormData.spendRequired)
    const iterations = parseInt(voucherFormData.iterations)
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-[#007AFF]">Confirm Recurring Voucher</h3>
            
            <p className="mb-4 text-sm">
              You're about to create a recurring voucher program with the following details:
            </p>
            
            <div className="bg-blue-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">{voucherFormData.rewardName}</h4>
              {voucherFormData.description && <p className="text-sm mb-3 text-gray-600">{voucherFormData.description}</p>}
              
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
                  <span className="font-medium">{voucherFormData.pin}</span>
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
                onClick={() => setShowVoucherConfirmation(false)}
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

  // Add function to handle transaction reward creation
  const handleCreateTransactionClick = () => {
    // Check if required fields are filled
    if (!transactionFormData.rewardName || !transactionFormData.pin || !transactionFormData.transactionThreshold) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields including PIN code",
        variant: "destructive"
      })
      return
    }

    if (transactionFormData.rewardType === 'dollar_voucher' && !transactionFormData.voucherAmount) {
      toast({
        title: "Missing Information",
        description: "Please enter a voucher amount",
        variant: "destructive"
      })
      return
    }

    if (transactionFormData.rewardType === 'free_item' && !transactionFormData.freeItemName) {
      toast({
        title: "Missing Information",
        description: "Please enter a free item name",
        variant: "destructive"
      })
      return
    }
    
    // Show confirmation dialog
    setShowTransactionConfirmation(true)
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
    setShowTransactionConfirmation(false) // Close the confirmation dialog

    try {
      // Call the recurring reward function
      const recurringReward = httpsCallable(functions, 'recurringRewardCallable')
      
      // Make sure merchantId is explicitly set and logged
      const merchantId = user.uid
      console.log("Using merchantId:", merchantId)
      
      // Structure the data with proper typing
      const data: FunctionData = {
        merchantId: merchantId,
        pin: transactionFormData.pin,
        name: transactionFormData.rewardName,
        description: transactionFormData.description || "",
        active: transactionFormData.isActive,
        transactionThreshold: parseInt(transactionFormData.transactionThreshold),
        rewardType: transactionFormData.rewardType,
        iterations: parseInt(transactionFormData.iterations)
      }

      // Add reward type specific fields
      if (transactionFormData.rewardType === 'dollar_voucher') {
        data.voucherAmount = parseInt(transactionFormData.voucherAmount)
      } else if (transactionFormData.rewardType === 'free_item') {
        data.freeItemName = transactionFormData.freeItemName
      }

      // Log the complete data object to verify all fields
      console.log("Sending data to recurring reward function:", JSON.stringify(data, null, 2))
      
      // Call the function with the data
      const functionData = { data }
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

  const TransactionConfirmationDialog = () => {
    if (!showTransactionConfirmation) return null
    
    const transactionThreshold = parseInt(transactionFormData.transactionThreshold)
    const iterations = parseInt(transactionFormData.iterations)
    const rewardDescription = transactionFormData.rewardType === 'dollar_voucher' 
      ? `$${transactionFormData.voucherAmount} voucher` 
      : `Free ${transactionFormData.freeItemName}`
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-2 text-[#007AFF]">Confirm Transaction-Based Reward</h3>
            
            <p className="mb-4 text-sm">
              You're about to create a transaction-based reward program with the following details:
            </p>
            
            <div className="bg-blue-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">{transactionFormData.rewardName}</h4>
              {transactionFormData.description && <p className="text-sm mb-3 text-gray-600">{transactionFormData.description}</p>}
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Reward Type:</span>
                  <span className="font-medium">
                    {transactionFormData.rewardType === 'dollar_voucher' ? 'Dollar Voucher' : 'Free Item'}
                  </span>
                          </div>
                {transactionFormData.rewardType === 'dollar_voucher' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Voucher Amount:</span>
                    <span className="font-medium">${transactionFormData.voucherAmount}</span>
                          </div>
                )}
                {transactionFormData.rewardType === 'free_item' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Free Item:</span>
                    <span className="font-medium">{transactionFormData.freeItemName}</span>
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
                  <span className="font-medium">{transactionFormData.pin}</span>
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
                onClick={() => setShowTransactionConfirmation(false)}
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col">
          <style jsx global>{scrollbarStyles}</style>
          
          <div className="flex-none px-6 py-4 border-b">
            <SheetHeader className="mb-2">
              <SheetTitle className="text-2xl font-bold">
                <span className="text-[#007AFF]">Create</span> Recurring Reward
              </SheetTitle>
            </SheetHeader>
                </div>
                
          <Tabs 
            defaultValue="coffee" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="px-6 py-2 border-b">
              <TabsList className="w-full grid grid-cols-3 bg-gray-100">
                <TabsTrigger value="coffee" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Coffee className="h-4 w-4 mr-2" />
                  Coffee Program
                </TabsTrigger>
                <TabsTrigger value="discount" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <Percent className="h-4 w-4 mr-2" />
                  Recurring Voucher
                </TabsTrigger>
                <TabsTrigger value="transaction" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Transaction Reward
                </TabsTrigger>
              </TabsList>
            </div>
            
            <ScrollArea className="flex-1 px-6 py-4">
              <TabsContent value="coffee" className="mt-0 h-full">
                {!showCoffeeForm ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="mb-10 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-gray-50 p-2">
                      <img 
                        src="/rec1.png" 
                        alt="Coffee Program preview" 
                        className="w-[220px] h-auto object-contain"
                      />
                      </div>
                      
                    <div className="text-center max-w-lg mb-10">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Coffee Program
                      </h2>
                      <p className="text-lg text-gray-700 mb-5">
                        Create a buy-X-get-1-free coffee loyalty program
                      </p>
                      <div className="bg-gray-50 p-5 rounded-md border border-gray-100 mb-6">
                        <p className="text-md text-gray-600">
                          Perfect for cafes, bakeries, or any business with repeat purchases. Customers earn stamps toward free items.
                        </p>
                      </div>
                        </div>
                        
                    <Button 
                      onClick={() => setShowCoffeeForm(true)}
                      className="w-[250px] h-12 bg-[#007AFF] hover:bg-[#0071E3] text-white text-lg"
                    >
                            Configure
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                        </div>
                ) : (
                  <div className="py-1 min-h-[300px] overflow-x-hidden">
                    <div className="flex items-center mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2 -ml-2 h-8 w-8"
                        onClick={() => setShowCoffeeForm(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">
                          <span className="text-[#007AFF]">Configure</span> Coffee Program
                        </h3>
                      </div>
                    </div>
                  
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Coffee Program Settings</h3>
                  <p className="text-xs text-blue-700">
                    Create a digital "buy X get 1 free" stamp card program for coffee or other beverages. Configure how many purchases customers need to make before earning a free item.
                  </p>
                </div>
                
                    <div className="grid grid-cols-1 gap-6 overflow-hidden">
                      {/* Form inputs take full width now */}
                      <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label>PIN Code <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                        maxLength={4}
                            value={coffeeFormData.pin}
                            onChange={(e) => setCoffeeFormData({ ...coffeeFormData, pin: e.target.value })}
                        placeholder="Enter 4-digit PIN (e.g., 1234)"
                      />
                      <p className="text-sm text-muted-foreground">
                        Staff will enter this PIN when redeeming free coffees
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>First Free Coffee Timing</Label>
                      <RadioGroup
                            value={coffeeFormData.freeRewardTiming}
                        onValueChange={(value: 'before' | 'after') => 
                              setCoffeeFormData({ ...coffeeFormData, freeRewardTiming: value })
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
                              value={coffeeFormData.frequency}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, frequency: e.target.value })}
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
                              value={coffeeFormData.levels}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, levels: e.target.value })}
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
                                {coffeeFormData.freeRewardTiming === 'before' ? 
                              "Get a free coffee immediately upon joining" : 
                                  `Get a free coffee after ${coffeeFormData.frequency} purchases`}
                          </li>
                          <li>
                                Earn another free coffee every {coffeeFormData.frequency} purchases
                          </li>
                          <li>
                                Earn up to {coffeeFormData.levels} free coffees in total
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="discount" className="mt-0 h-full">
                {!showVoucherForm ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="mb-10 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-gray-50 p-2">
                      <img 
                        src="/rec2.png" 
                        alt="Recurring Voucher preview" 
                        className="w-[220px] h-auto object-contain"
                      />
                    </div>
                    
                    <div className="text-center max-w-lg mb-10">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Recurring Voucher
                      </h2>
                      <p className="text-lg text-gray-700 mb-5">
                        Set up an automatically recurring voucher reward
                      </p>
                      <div className="bg-gray-50 p-5 rounded-md border border-gray-100 mb-6">
                        <p className="text-md text-gray-600">
                          Great for retail and services. Customers earn dollar value vouchers at spending milestones.
                        </p>
                  </div>
                </div>
                    
                    <Button 
                      onClick={() => setShowVoucherForm(true)}
                      className="w-[250px] h-12 bg-[#007AFF] hover:bg-[#0071E3] text-white text-lg"
                    >
                      Configure
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
              </div>
            ) : (
              <div className="py-1 min-h-[300px] overflow-x-hidden">
                    <div className="flex items-center mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2 -ml-2 h-8 w-8"
                        onClick={() => setShowVoucherForm(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">
                          <span className="text-[#007AFF]">Configure</span> Recurring Voucher
                        </h3>
                      </div>
                    </div>
                  
                <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Recurring Voucher Settings</h3>
                  <p className="text-xs text-blue-700">
                    Create vouchers that customers earn automatically as they spend at your business. Each voucher requires the same spend amount, creating a regular reward cycle.
                  </p>
                </div>
                
                    <div className="grid grid-cols-1 gap-6 overflow-hidden">
                      {/* Form inputs take full width now */}
                      <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label>Reward Name <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                            value={voucherFormData.rewardName}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, rewardName: e.target.value })}
                        placeholder="e.g., Loyalty Spending Voucher"
                      />
                      <p className="text-xs text-muted-foreground">
                        Choose a clear name that explains the value to customers
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Description</Label>
                      <Textarea
                            value={voucherFormData.description}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
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
                            value={voucherFormData.pin}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, pin: e.target.value })}
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
                              value={voucherFormData.spendRequired}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, spendRequired: e.target.value })}
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
                              value={voucherFormData.discountAmount}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, discountAmount: e.target.value })}
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
                            value={voucherFormData.iterations}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, iterations: e.target.value })}
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
                                ${voucherFormData.discountAmount} voucher after spending ${voucherFormData.spendRequired}
                          </li>
                          <li>
                                Another ${voucherFormData.discountAmount} voucher after spending ${parseInt(voucherFormData.spendRequired) * 2}
                          </li>
                          <li>
                                And so on, up to ${voucherFormData.iterations} vouchers in total
                          </li>
                          <li>
                                Total potential reward value: ${parseInt(voucherFormData.discountAmount) * parseInt(voucherFormData.iterations)}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="transaction" className="mt-0 h-full">
                {!showTransactionForm ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <div className="mb-10 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50 to-gray-50 p-2">
                      <img 
                        src="/rec1.png" 
                        alt="Transaction-Based Reward preview" 
                        className="w-[220px] h-auto object-contain"
                      />
                    </div>
                    
                    <div className="text-center max-w-lg mb-10">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Transaction-Based Reward
                      </h2>
                      <p className="text-lg text-gray-700 mb-5">
                        Reward customers based on number of transactions
                      </p>
                      <div className="bg-gray-50 p-5 rounded-md border border-gray-100 mb-6">
                        <p className="text-md text-gray-600">
                          Ideal for businesses where visit frequency matters more than spend amount. Rewards based on visit count.
                        </p>
                  </div>
                </div>
                    
                    <Button 
                      onClick={() => setShowTransactionForm(true)}
                      className="w-[250px] h-12 bg-[#007AFF] hover:bg-[#0071E3] text-white text-lg"
                    >
                      Configure
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-1 min-h-[300px] overflow-x-hidden">
                    <div className="flex items-center mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mr-2 -ml-2 h-8 w-8"
                        onClick={() => setShowTransactionForm(false)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">
                          <span className="text-[#007AFF]">Configure</span> Transaction-Based Reward
                        </h3>
                      </div>
                    </div>
                  
                    {/* Add instruction panel */}
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-1">Transaction Reward Setup</h3>
                      <p className="text-xs text-blue-700">
                        Create rewards that customers earn automatically as they make more transactions at your business. 
                        These rewards incentivize repeat visits and build customer loyalty over time.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6 overflow-hidden">
                      {/* Form inputs take full width now */}
                      <div className="space-y-3">
                        <div className="grid gap-2">
                          <Label>Reward Name <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={transactionFormData.rewardName}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, rewardName: e.target.value })}
                            placeholder="e.g., Loyal Customer Reward"
                          />
                          <p className="text-xs text-muted-foreground">
                            Choose a name that clearly explains the benefit to customers
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label>Description</Label>
                          <Textarea
                            value={transactionFormData.description}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                            placeholder="e.g., Earn special rewards as you visit our store more often"
                            rows={3}
                          />
                          <p className="text-xs text-muted-foreground">
                            Help customers understand how to earn these rewards
                          </p>
                        </div>

                        <div className="grid gap-2">
                          <Label>PIN Code <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            maxLength={4}
                            value={transactionFormData.pin}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, pin: e.target.value })}
                            placeholder="Enter 4-digit PIN (e.g., 1234)"
                          />
                          <p className="text-xs text-muted-foreground">
                            Staff will enter this PIN when redeeming rewards
                          </p>
                        </div>

                        <div className="border-t pt-4 mt-2">
                          <Label className="text-base font-medium mb-3 block">Reward Type <span className="text-red-500">*</span></Label>
                          <RadioGroup
                            value={transactionFormData.rewardType}
                            onValueChange={(value: 'dollar_voucher' | 'free_item') => 
                              setTransactionFormData({ ...transactionFormData, rewardType: value })
                            }
                            className="flex flex-col space-y-3 mt-2"
                          >
                            <div className="flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setTransactionFormData({ ...transactionFormData, rewardType: 'dollar_voucher' })}>
                              <RadioGroupItem value="dollar_voucher" id="dollar_voucher" className="mt-1" />
                              <div>
                                <Label htmlFor="dollar_voucher" className="font-medium">Dollar Voucher</Label>
                                <p className="text-xs text-gray-500 mt-1">Reward customers with a fixed dollar amount they can spend</p>
                              </div>
                            </div>
                            <div className="flex items-start space-x-3 border rounded-md p-3 hover:bg-gray-50 cursor-pointer" onClick={() => setTransactionFormData({ ...transactionFormData, rewardType: 'free_item' })}>
                              <RadioGroupItem value="free_item" id="free_item" className="mt-1" />
                              <div>
                                <Label htmlFor="free_item" className="font-medium">Free Item</Label>
                                <p className="text-xs text-gray-500 mt-1">Reward customers with a specific free product</p>
                              </div>
                            </div>
                          </RadioGroup>
                        </div>

                        {transactionFormData.rewardType === 'dollar_voucher' && (
                          <div className="grid gap-2 mt-4 border-l-2 border-blue-100 pl-4">
                            <Label>Voucher Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.voucherAmount}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, voucherAmount: e.target.value })}
                              placeholder="e.g., 10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Dollar value of each reward voucher
                            </p>
              </div>
            )}

                        {transactionFormData.rewardType === 'free_item' && (
                          <div className="grid gap-2 mt-4 border-l-2 border-blue-100 pl-4">
                            <Label>Free Item Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={transactionFormData.freeItemName}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, freeItemName: e.target.value })}
                              placeholder="e.g., Coffee, Dessert, Appetizer"
                            />
                            <p className="text-xs text-muted-foreground">
                              Name of the free item customers will receive
                            </p>
          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="grid gap-2">
                            <Label>Transaction Threshold <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.transactionThreshold}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionThreshold: e.target.value })}
                              placeholder="e.g., 5"
                            />
                            <p className="text-xs text-muted-foreground">
                              Number of transactions for first reward and between subsequent rewards
                            </p>
                          </div>

                          <div className="grid gap-2">
                            <Label>Number of Levels <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.iterations}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, iterations: e.target.value })}
                              placeholder="e.g., 10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Total number of reward levels to create
                            </p>
                          </div>
                        </div>
                        
                        {/* Add summary section */}
                        <div className="border-t pt-4 mt-3">
                          <h4 className="text-sm font-medium mb-2">Program Summary</h4>
                          <div className="bg-gray-50 p-3 rounded-md">
                            <p className="text-sm mb-2">
                              With these settings, customers will:
                            </p>
                            <ul className="text-sm space-y-1 pl-5 list-disc">
                              <li>
                                Earn their first reward after {transactionFormData.transactionThreshold} transactions
                              </li>
                              <li>
                                Receive {transactionFormData.rewardType === 'dollar_voucher' ? `a $${transactionFormData.voucherAmount} voucher` : `a free ${transactionFormData.freeItemName || 'item'}`} at each level
                              </li>
                              <li>
                                Unlock new rewards every {transactionFormData.transactionThreshold} transactions, up to {transactionFormData.iterations} levels
                              </li>
                              <li>
                                Need {parseInt(transactionFormData.transactionThreshold) * parseInt(transactionFormData.iterations)} total transactions to reach the final level
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <div className="flex-none px-6 py-4 border-t">
            <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                  if (showCoffeeForm || showVoucherForm || showTransactionForm) {
                    setShowCoffeeForm(false)
                    setShowVoucherForm(false)
                    setShowTransactionForm(false)
                } else {
                    onOpenChange(false)
                }
              }}
            >
                {(showCoffeeForm || showVoucherForm || showTransactionForm) ? 'Back' : 'Cancel'}
            </Button>
              
              {activeTab === 'coffee' && showCoffeeForm && (
              <Button 
                onClick={saveCoffeeProgram}
                  disabled={loading || !coffeeFormData.pin || !coffeeFormData.frequency || !coffeeFormData.levels}
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
              
              {activeTab === 'discount' && showVoucherForm && (
              <Button 
                onClick={handleCreateClick}
                  disabled={loading || !voucherFormData.rewardName || !voucherFormData.pin || !voucherFormData.spendRequired || !voucherFormData.discountAmount}
                className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
              >
                Create Recurring Voucher
              </Button>
            )}
              
              {activeTab === 'transaction' && showTransactionForm && (
                <Button 
                  onClick={handleCreateTransactionClick}
                  disabled={loading || 
                    !transactionFormData.rewardName || 
                    !transactionFormData.pin || 
                    !transactionFormData.transactionThreshold || 
                    (transactionFormData.rewardType === 'dollar_voucher' && !transactionFormData.voucherAmount) ||
                    (transactionFormData.rewardType === 'free_item' && !transactionFormData.freeItemName)
                  }
                  className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
                >
                  Create Transaction Reward
              </Button>
            )}
          </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {showVoucherConfirmation && <ConfirmationDialog />}
      {showTransactionConfirmation && <TransactionConfirmationDialog />}
    </>
  )
} 