"use client"

import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle, ShoppingBag, Award, X, Edit } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from '@/contexts/auth-context'
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs, doc, arrayUnion, setDoc, writeBatch, getDoc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { playSuccessSound } from '@/lib/audio'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface CreateRecurringRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRecurringRewardDialog({ open, onOpenChange }: CreateRecurringRewardDialogProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState("coffee")
  const [loading, setLoading] = useState(false)
  const [showCoffeeForm, setShowCoffeeForm] = useState(false)
  const [showVoucherForm, setShowVoucherForm] = useState(false)
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showCashbackForm, setShowCashbackForm] = useState(false)
  const [hasCoffeeProgram, setHasCoffeeProgram] = useState(false)
  const [hasVoucherProgram, setHasVoucherProgram] = useState(false)
  const [hasTransactionProgram, setHasTransactionProgram] = useState(false)
  const [hasCashbackProgram, setHasCashbackProgram] = useState(false)
  const [coffeeFormData, setCoffeeFormData] = useState({
    pin: '',
    frequency: '5',
    minimumSpend: '0',
    minimumTimeBetween: '0',
  })
  const [voucherFormData, setVoucherFormData] = useState({
    rewardName: '',
    description: '',
    pin: '',
    spendRequired: '100',
    discountAmount: '10',
    isActive: true,
  })
  const [transactionFormData, setTransactionFormData] = useState({
    pin: '',
    rewardName: '',
    description: '',
    transactionThreshold: '5',
    rewardType: 'dollar_voucher' as 'dollar_voucher' | 'free_item',
    voucherAmount: '10',
    freeItemName: '',
    conditions: '',
    iterations: '15',
    isActive: true
  })
  const [cashbackFormData, setCashbackFormData] = useState({
    cashbackRate: '2',
    programName: 'Tap Cash',
    description: 'Earn cashback on every purchase',
    isActive: true
  })

  // Reset form visibility when tab changes - but only for non-active tabs
  useEffect(() => {
    if (activeTab !== "coffee") setShowCoffeeForm(false)
    if (activeTab !== "discount") setShowVoucherForm(false)
    if (activeTab !== "transaction") setShowTransactionForm(false)
    if (activeTab !== "cashback") setShowCashbackForm(false)
  }, [activeTab])

  // Check if merchant has existing programs when the dialog opens
  useEffect(() => {
    if (open && user?.uid) {
      checkExistingPrograms()
    }
  }, [open, user?.uid])

  const checkExistingPrograms = async () => {
    if (!user?.uid) return
    
    try {
      const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
      
      if (merchantDoc.exists()) {
        const data = merchantDoc.data()
        
        // Check for cashback program
        if (data.isCashback && data.cashbackProgram) {
          setHasCashbackProgram(true)
          setCashbackFormData({
            cashbackRate: data.cashbackProgram.cashbackRate?.toString() || '2',
            programName: data.cashbackProgram.programName || 'Tap Cash',
            description: data.cashbackProgram.description || 'Earn cashback on every purchase',
            isActive: data.cashbackProgram.isActive !== false
          })
        }
      }
    } catch (error) {
      console.error("Error checking existing programs:", error)
    }
  }

  const saveCoffeeProgram = async () => {
    if (!user?.uid) return
    
    // Validate required fields
    if (!coffeeFormData.pin || !coffeeFormData.frequency) {
      toast({
        title: "Missing Information",
        description: "Please fill in both PIN code and frequency",
        variant: "destructive"
      })
      return
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(coffeeFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)

    try {
      // Check if coffee program exists
      const merchantDocRef = doc(db, 'merchants', user.uid)
      const merchantDoc = await getDoc(merchantDocRef)

      if (merchantDoc.exists() && merchantDoc.data().coffeeprogram === true) {
        toast({
          title: "Error",
          description: "Coffee program already exists",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Create the coffee program data object
      const coffeeProgram = {
        pin: coffeeFormData.pin,
        frequency: parseInt(coffeeFormData.frequency),
        minspend: parseInt(coffeeFormData.minimumSpend) || 0,
        mintime: parseInt(coffeeFormData.minimumTimeBetween) || 0,
        createdAt: new Date(),
        active: true
      }
      
      // Update the merchant document to add the coffee program to an array
      await setDoc(merchantDocRef, {
        coffeeprogram: true,
        coffeePrograms: arrayUnion(coffeeProgram)
      }, { merge: true })
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Coffee program created successfully",
      })
      setHasCoffeeProgram(true)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating coffee program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create coffee program",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveVoucherProgram = async () => {
    if (!user?.uid) return
    
    // Validate required fields
    if (!voucherFormData.rewardName || !voucherFormData.pin || !voucherFormData.spendRequired || !voucherFormData.discountAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(voucherFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)

    try {
      const merchantDocRef = doc(db, 'merchants', user.uid)
      
      // Create the voucher program data object
      const voucherProgram = {
        rewardName: voucherFormData.rewardName,
        description: voucherFormData.description,
        pin: voucherFormData.pin,
        spendRequired: parseInt(voucherFormData.spendRequired),
        discountAmount: parseInt(voucherFormData.discountAmount),
        isActive: voucherFormData.isActive,
        createdAt: new Date(),
        type: 'recurring_voucher'
      }
      
      // Update the merchant document to add the voucher program
      await setDoc(merchantDocRef, {
        voucherPrograms: arrayUnion(voucherProgram)
      }, { merge: true })
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Recurring voucher program created successfully",
      })
      setHasVoucherProgram(true)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating voucher program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create voucher program",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveTransactionProgram = async () => {
    if (!user?.uid) return
    
    // Validate required fields
    const requiredFields = [
      transactionFormData.rewardName,
      transactionFormData.pin,
      transactionFormData.transactionThreshold
    ]
    
    if (transactionFormData.rewardType === 'dollar_voucher' && !transactionFormData.voucherAmount) {
      requiredFields.push(transactionFormData.voucherAmount)
    }
    
    if (transactionFormData.rewardType === 'free_item' && !transactionFormData.freeItemName) {
      requiredFields.push(transactionFormData.freeItemName)
    }
    
    if (requiredFields.some(field => !field)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(transactionFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)

    try {
      const merchantDocRef = doc(db, 'merchants', user.uid)
      
      // Create the transaction program data object
      const transactionProgram = {
        rewardName: transactionFormData.rewardName,
        description: transactionFormData.description,
        pin: transactionFormData.pin,
        transactionThreshold: parseInt(transactionFormData.transactionThreshold),
        rewardType: transactionFormData.rewardType,
        voucherAmount: transactionFormData.rewardType === 'dollar_voucher' ? parseInt(transactionFormData.voucherAmount) : null,
        freeItemName: transactionFormData.rewardType === 'free_item' ? transactionFormData.freeItemName : null,
        conditions: transactionFormData.conditions,
        iterations: parseInt(transactionFormData.iterations),
        isActive: transactionFormData.isActive,
        createdAt: new Date(),
        type: 'transaction_reward'
      }
      
      // Update the merchant document to add the transaction program
      await setDoc(merchantDocRef, {
        transactionPrograms: arrayUnion(transactionProgram)
      }, { merge: true })
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Transaction reward program created successfully",
      })
      setHasTransactionProgram(true)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating transaction program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create transaction program",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const saveCashbackProgram = async () => {
    if (!user?.uid) return
    
    // Validate required fields
    if (!cashbackFormData.cashbackRate || !cashbackFormData.programName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }
    
    // Validate cashback rate is a valid percentage
    const rate = parseFloat(cashbackFormData.cashbackRate)
    if (isNaN(rate) || rate <= 0 || rate > 100) {
      toast({
        title: "Invalid Rate",
        description: "Cashback rate must be between 0.1% and 100%",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)

    try {
      const merchantDocRef = doc(db, 'merchants', user.uid)
      
      // Create the cashback program data object
      const cashbackProgram = {
        programName: cashbackFormData.programName,
        description: cashbackFormData.description,
        cashbackRate: rate,
        isActive: cashbackFormData.isActive,
        createdAt: new Date(),
        type: 'cashback'
      }
      
      // Update the merchant document to enable cashback
      await setDoc(merchantDocRef, {
        isCashback: true,
        cashbackRate: rate,
        cashbackProgram: cashbackProgram
      }, { merge: true })
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Tap Cash program created successfully",
      })
      setHasCashbackProgram(true)
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error creating cashback program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create cashback program",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const removeCashbackProgram = async () => {
    if (!user?.uid) return
    
    setLoading(true)

    try {
      const merchantDocRef = doc(db, 'merchants', user.uid)
      
      // Remove cashback program from merchant document
      await updateDoc(merchantDocRef, {
        isCashback: deleteField(),
        cashbackRate: deleteField(),
        cashbackProgram: deleteField()
      })
      
      toast({
        title: "Success",
        description: "Tap Cash program removed successfully",
      })
      setHasCashbackProgram(false)
      setShowCashbackForm(false)
    } catch (error: any) {
      console.error("Error removing cashback program:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to remove cashback program",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          <div className="flex h-full">
            {/* Left Content Section */}
            <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex-shrink-0 px-6 py-5 border-b">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="text-[#007AFF]">Create</span> Recurring Reward
                </h2>
                <p className="text-sm text-gray-600">
                  Set up automatic rewards to engage customers with your loyalty program
                </p>
              </div>
              
              {/* Main Tab Container */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "coffee"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                  onClick={() => setActiveTab("coffee")}
                >
                  Coffee Program
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "discount"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                  onClick={() => setActiveTab("discount")}
                >
                  Recurring Voucher
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "transaction"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                  onClick={() => setActiveTab("transaction")}
                >
                  Transaction Reward
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === "cashback"
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                  onClick={() => setActiveTab("cashback")}
                >
                  Tap Cash
                </button>
              </div>
            </div>
              
              <div className="flex-1 h-full min-h-0">
              {activeTab === "coffee" && (
                <div className="mt-0 h-full flex flex-col">
                  {!showCoffeeForm ? (
                    <div className="flex-1 overflow-y-auto p-6 pb-0 min-h-0">
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-3">
                          <Coffee className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Coffee Loyalty Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Create a digital stamp card where customers buy X drinks and get 1 free
                        </p>
                        <Button
                          onClick={() => setShowCoffeeForm(true)}
                          variant="outline"
                          className="rounded-md"
                        >
                          Set Up Program
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-0">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold">Configure Coffee Program</h2>
                        <p className="text-sm text-gray-600">Set up your digital stamp card program</p>
                      </div>
                    
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={coffeeFormData.pin}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Staff will enter this PIN when redeeming free coffees
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Frequency <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={coffeeFormData.frequency}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, frequency: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Total coffees in reward cycle (e.g., "10" means buy 9, get 10th free)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Minimum Spend ($)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={coffeeFormData.minimumSpend}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumSpend: e.target.value })}
                              placeholder="e.g., 5"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Minimum transaction amount to qualify (0 for no minimum)
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Time Between Purchases (minutes)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={coffeeFormData.minimumTimeBetween}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumTimeBetween: e.target.value })}
                              placeholder="e.g., 30"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Minimum time between purchases to earn stamps (0 for no limit)
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
                
              {activeTab === "discount" && (
                <div className="mt-0 h-full flex flex-col">
                  {!showVoucherForm ? (
                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="border border-gray-200 rounded-md p-6 bg-gray-50 mb-6">
                      <div className="flex items-center gap-3 mb-3">
                        <Percent className="h-5 w-5 text-purple-600" />
                        <h3 className="text-md font-semibold">Recurring Voucher Program</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Automatically reward customers with vouchers when they reach spending thresholds
                      </p>
                      <Button
                        onClick={() => setShowVoucherForm(true)}
                        variant="outline"
                        className="rounded-md"
                      >
                        Set Up Program
                      </Button>
                    </div>
                  </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-0">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold">Configure Recurring Voucher</h2>
                        <p className="text-sm text-gray-600">Set up automatic voucher rewards for spending milestones</p>
                      </div>
                    
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={voucherFormData.rewardName}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, rewardName: e.target.value })}
                              placeholder="e.g., Loyalty Discount"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={voucherFormData.pin}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Staff will enter this PIN when applying the voucher
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Spend Required ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={voucherFormData.spendRequired}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, spendRequired: e.target.value })}
                              placeholder="e.g., 100"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Total amount customer needs to spend to earn voucher
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Discount Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={voucherFormData.discountAmount}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, discountAmount: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Dollar amount off the customer receives
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Description</Label>
                          <Textarea
                            value={voucherFormData.description}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
                            placeholder="Describe how this reward works..."
                            className="rounded-md"
                            rows={3}
                          />
                        </div>

                        <div className="bg-purple-50 border border-purple-200 rounded-md p-4">
                          <h4 className="font-medium text-sm mb-2 text-purple-800">Program Preview</h4>
                          <p className="text-sm text-purple-700">
                            Customers will receive a ${voucherFormData.discountAmount} voucher after spending ${voucherFormData.spendRequired} in total purchases.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
                
              {activeTab === "transaction" && (
                <div className="mt-0 h-full flex flex-col">
                  {!showTransactionForm ? (
                  <div className="flex-1 overflow-y-auto p-6 pb-0 min-h-0">
                    <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                      <div className="flex items-center gap-3 mb-3">
                        <ShoppingBag className="h-5 w-5 text-[#007AFF]" />
                        <h3 className="text-md font-semibold">Transaction Reward Program</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">
                        Reward customers based on the number of transactions they make
                      </p>
                      <Button
                        onClick={() => setShowTransactionForm(true)}
                        variant="outline"
                        className="rounded-md"
                      >
                        Set Up Program
                      </Button>
                    </div>
                  </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-0">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold">Configure Transaction Reward</h2>
                        <p className="text-sm text-gray-600">Reward customers for reaching transaction milestones</p>
                      </div>
                    
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={transactionFormData.rewardName}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, rewardName: e.target.value })}
                              placeholder="e.g., Frequent Shopper Reward"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              maxLength={4}
                              value={transactionFormData.pin}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Staff will enter this PIN when redeeming the reward
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Transaction Threshold <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.transactionThreshold}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionThreshold: e.target.value })}
                              placeholder="e.g., 5"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Number of transactions required to earn reward
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Type <span className="text-red-500">*</span></Label>
                            <RadioGroup 
                              value={transactionFormData.rewardType} 
                              onValueChange={(value: 'dollar_voucher' | 'free_item') => setTransactionFormData({ ...transactionFormData, rewardType: value })}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="dollar_voucher" id="dollar_voucher" />
                                <Label htmlFor="dollar_voucher" className="text-sm">Dollar Voucher</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="free_item" id="free_item" />
                                <Label htmlFor="free_item" className="text-sm">Free Item</Label>
                              </div>
                            </RadioGroup>
                          </div>

                          {transactionFormData.rewardType === 'dollar_voucher' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Voucher Amount ($) <span className="text-red-500">*</span></Label>
                              <Input
                                type="number"
                                min="1"
                                value={transactionFormData.voucherAmount}
                                onChange={(e) => setTransactionFormData({ ...transactionFormData, voucherAmount: e.target.value })}
                                placeholder="e.g., 10"
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          {transactionFormData.rewardType === 'free_item' && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Free Item Name <span className="text-red-500">*</span></Label>
                              <Input
                                type="text"
                                value={transactionFormData.freeItemName}
                                onChange={(e) => setTransactionFormData({ ...transactionFormData, freeItemName: e.target.value })}
                                placeholder="e.g., Free Coffee"
                                className="h-10 rounded-md"
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Number of Iterations</Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.iterations}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, iterations: e.target.value })}
                              placeholder="e.g., 15"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              How many times customer can earn this reward (0 for unlimited)
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Description</Label>
                          <Textarea
                            value={transactionFormData.description}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                            placeholder="Describe how this reward works..."
                            className="rounded-md"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Additional Conditions</Label>
                          <Textarea
                            value={transactionFormData.conditions}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, conditions: e.target.value })}
                            placeholder="Any special terms or conditions..."
                            className="rounded-md"
                            rows={2}
                          />
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                          <h4 className="font-medium text-sm mb-2 text-blue-800">Program Preview</h4>
                          <p className="text-sm text-blue-700">
                            Customers will receive {transactionFormData.rewardType === 'dollar_voucher' 
                              ? `a $${transactionFormData.voucherAmount} voucher` 
                              : `a free ${transactionFormData.freeItemName || 'item'}`} 
                            after completing {transactionFormData.transactionThreshold} transactions.
                            {transactionFormData.iterations !== '15' && transactionFormData.iterations !== '0' && 
                              ` This reward can be earned ${transactionFormData.iterations} times.`}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "cashback" && (
                <div className="mt-0 h-full flex flex-col">
                  {!showCashbackForm ? (
                    <div className="flex-1 overflow-y-auto p-6 min-h-0">
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50 mb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Award className="h-5 w-5 text-green-600" />
                          <h3 className="text-md font-semibold">Tap Cash Cashback Program</h3>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          Give customers a % back in store credit that they can use to reduce their bill
                        </p>
                        {!hasCashbackProgram ? (
                          <Button
                            onClick={() => setShowCashbackForm(true)}
                            variant="outline"
                            className="rounded-md"
                          >
                            Set Up Program
                          </Button>
                        ) : (
                          <div className="space-y-4">
                            <div className="bg-white border border-gray-200 rounded-md p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <Award className="h-4 w-4 text-green-600" />
                                <p className="text-sm text-gray-900 font-medium">✓ Tap Cash is Active</p>
                              </div>
                              
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Program Name:</span>
                                  <span className="text-gray-900 font-medium">{cashbackFormData.programName}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Cashback Rate:</span>
                                  <span className="text-gray-900 font-medium">{cashbackFormData.cashbackRate}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Status:</span>
                                  <span className="text-gray-900 font-medium">
                                    {cashbackFormData.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                {cashbackFormData.description && (
                                  <div className="pt-1">
                                    <span className="text-gray-600">Description:</span>
                                    <p className="text-gray-900 mt-1">{cashbackFormData.description}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="bg-white border border-gray-200 rounded-md p-3">
                              <h4 className="text-sm font-medium text-gray-900 mb-2">How It Works</h4>
                              <p className="text-xs text-gray-600">
                                Customers automatically earn {cashbackFormData.cashbackRate}% cashback on every purchase. 
                                For example, a $100 purchase earns ${(parseFloat(cashbackFormData.cashbackRate || '0') * 100 / 100).toFixed(2)} in Tap Cash credit.
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                onClick={() => setShowCashbackForm(true)}
                                variant="outline"
                                size="sm"
                                className="rounded-md"
                              >
                                <Edit size={14} className="mr-1" />
                                Edit Settings
                              </Button>
                              <Button
                                onClick={removeCashbackProgram}
                                variant="destructive"
                                size="sm"
                                className="rounded-md"
                                disabled={loading}
                              >
                                Remove Program
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto p-6 pt-0 min-h-0">
                      <div className="mb-6">
                        <h2 className="text-lg font-semibold">Configure Tap Cash</h2>
                        <p className="text-sm text-gray-600">Set up cashback rewards for every purchase</p>
                      </div>
                    
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Program Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={cashbackFormData.programName}
                              onChange={(e) => setCashbackFormData({ ...cashbackFormData, programName: e.target.value })}
                              placeholder="e.g., Tap Cash"
                              className="h-10 rounded-md"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Cashback Rate (%) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="100"
                              value={cashbackFormData.cashbackRate}
                              onChange={(e) => setCashbackFormData({ ...cashbackFormData, cashbackRate: e.target.value })}
                              placeholder="e.g., 2"
                              className="h-10 rounded-md"
                            />
                            <p className="text-xs text-gray-500">
                              Percentage of purchase amount returned as store credit
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Description</Label>
                          <Textarea
                            value={cashbackFormData.description}
                            onChange={(e) => setCashbackFormData({ ...cashbackFormData, description: e.target.value })}
                            placeholder="Describe how the cashback program works..."
                            className="rounded-md"
                            rows={3}
                          />
                        </div>

                        <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
                          <h4 className="font-medium text-sm mb-2 text-gray-800">Program Preview</h4>
                          <p className="text-sm text-gray-600">
                            Customers will earn <span className="font-semibold text-[#007AFF]">{cashbackFormData.cashbackRate}%</span> cashback on every purchase. 
                            For example, a $100 purchase would earn <span className="font-semibold text-green-600">${(parseFloat(cashbackFormData.cashbackRate || '0') * 100 / 100).toFixed(2)}</span> in Tap Cash credit.
                          </p>
                        </div>

                        <div className="border border-gray-200 rounded-md p-4">
                          <h4 className="font-medium text-sm mb-3 text-gray-800">How Tap Cash Works</h4>
                          <div className="space-y-2">
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm text-gray-600">Customers automatically earn cashback on every purchase</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm text-gray-600">Cashback is credited to their store wallet instantly</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm text-gray-600">They can use Tap Cash to reduce their bill on future purchases</p>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] mt-1.5 flex-shrink-0"></div>
                              <p className="text-sm text-gray-600">No minimum spend or restrictions - works on all purchases</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>

            {/* Fixed Footer */}
            {(showCoffeeForm || showVoucherForm || showTransactionForm || showCashbackForm) && (
              <div className="flex-shrink-0 sticky bottom-0 z-10 bg-white border-t px-6 py-4 shadow-lg">
                <div className="flex justify-end gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCoffeeForm(false)
                      setShowVoucherForm(false)
                      setShowTransactionForm(false)
                      setShowCashbackForm(false)
                    }}
                    className="rounded-md"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => {
                      if (showCoffeeForm) {
                        saveCoffeeProgram()
                      } else if (showVoucherForm) {
                        saveVoucherProgram()
                      } else if (showTransactionForm) {
                        saveTransactionProgram()
                      } else if (showCashbackForm) {
                        saveCashbackProgram()
                      }
                    }}
                    disabled={loading}
                    className="rounded-md"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Program'
                    )}
                  </Button>
                </div>
              </div>
            )}
            </div>
            
            {/* Right Image Section */}
            <div className="hidden lg:flex w-[350px] bg-white items-center justify-center p-2 border-l border-gray-200">
              <div className="text-center">
                <img 
                  src="/phone4.png" 
                  alt="Tap Loyalty App" 
                  className="h-auto w-full max-w-[330px] object-contain mx-auto"
                />
                <p className="text-sm text-gray-600 mt-2 px-2">
                 Preview
                </p>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 