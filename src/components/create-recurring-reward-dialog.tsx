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
        
        // Check for coffee programs
        if (data.coffeePrograms && Array.isArray(data.coffeePrograms) && data.coffeePrograms.length > 0) {
          setHasCoffeeProgram(true)
          const coffeeProgram = data.coffeePrograms[0] // Get the first coffee program
          setCoffeeFormData({
            pin: coffeeProgram.pin || '',
            frequency: coffeeProgram.frequency?.toString() || '5',
            minimumSpend: coffeeProgram.minspend?.toString() || '0',
            minimumTimeBetween: coffeeProgram.mintime?.toString() || '0'
          })
        }
        
        // Check for voucher programs
        if (data.voucherPrograms && Array.isArray(data.voucherPrograms) && data.voucherPrograms.length > 0) {
          setHasVoucherProgram(true)
          const voucherProgram = data.voucherPrograms[0] // Get the first voucher program
          setVoucherFormData({
            rewardName: voucherProgram.rewardName || '',
            description: voucherProgram.description || '',
            pin: voucherProgram.pin || '',
            spendRequired: voucherProgram.spendRequired?.toString() || '100',
            discountAmount: voucherProgram.discountAmount?.toString() || '10',
            isActive: voucherProgram.isActive !== false
          })
        }
        
        // Check for transaction programs
        if (data.transactionRewards && Array.isArray(data.transactionRewards) && data.transactionRewards.length > 0) {
          setHasTransactionProgram(true)
          const transactionProgram = data.transactionRewards[0] // Get the first transaction program
          setTransactionFormData({
            pin: transactionProgram.pin || '',
            rewardName: transactionProgram.rewardName || '',
            description: transactionProgram.description || '',
            transactionThreshold: transactionProgram.transactionThreshold?.toString() || '5',
            rewardType: transactionProgram.rewardType || 'dollar_voucher',
            voucherAmount: transactionProgram.voucherAmount?.toString() || '10',
            freeItemName: transactionProgram.freeItemName || '',
            conditions: transactionProgram.conditions || '',
            iterations: transactionProgram.iterations?.toString() || '15',
            isActive: transactionProgram.isActive !== false
          })
        }
        
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
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl h-[85vh] translate-x-[-50%] translate-y-[-50%] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          
          {/* Dialog Header */}
          <div className="flex-shrink-0 px-6 py-5 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Create Recurring Reward
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Set up automatic rewards to engage customers
                </p>
              </div>
              <DialogPrimitive.Close className="rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>
            
            {/* Tab Container */}
            <div className="mt-4 flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
              <button
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  activeTab === "coffee"
                    ? "text-gray-800 bg-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-200/70"
                )}
                onClick={() => setActiveTab("coffee")}
              >
                <Coffee size={15} />
                Coffee
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
                <Percent size={15} />
                Voucher
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
                <ShoppingBag size={15} />
                Transaction
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
                <Award size={15} />
                Tap Cash
              </button>
            </div>
          </div>
          
          {/* Dialog Body */}
          <div className="flex-1 overflow-y-auto bg-white min-h-0">
            {activeTab === "coffee" && (
              <div className="p-6">
                {!showCoffeeForm ? (
                  <div className="space-y-6">
                    {/* Program Overview Card */}
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-md">
                          <Coffee className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Coffee Loyalty Program</h3>
                          <p className="text-sm text-gray-600">Digital stamp card - buy X drinks, get 1 free</p>
                        </div>
                      </div>
                      
                      {!hasCoffeeProgram ? (
                        <Button
                          onClick={() => setShowCoffeeForm(true)}
                          className="mt-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Set Up Program
                        </Button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">Program Active</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">PIN Code:</span>
                                <span className="font-medium text-gray-900">{coffeeFormData.pin}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Frequency:</span>
                                <span className="font-medium text-gray-900">Buy {parseInt(coffeeFormData.frequency) - 1}, get 1 free</span>
                              </div>
                              {coffeeFormData.minimumSpend !== '0' && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Min. Spend:</span>
                                  <span className="font-medium text-gray-900">${coffeeFormData.minimumSpend}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => setShowCoffeeForm(true)}
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit Settings
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Coffee Program</h3>
                      <p className="text-sm text-gray-600">Set up your digital stamp card</p>
                    </div>
                    {/* Form Fields */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          PIN Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={coffeeFormData.pin}
                          onChange={(e) => setCoffeeFormData({ ...coffeeFormData, pin: e.target.value })}
                          placeholder="1234"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Staff PIN for redemptions</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Frequency <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={coffeeFormData.frequency}
                          onChange={(e) => setCoffeeFormData({ ...coffeeFormData, frequency: e.target.value })}
                          placeholder="10"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Total stamps (e.g., 10 = buy 9, get 1 free)</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Minimum Spend ($)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={coffeeFormData.minimumSpend}
                          onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumSpend: e.target.value })}
                          placeholder="0"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Minimum purchase to earn stamp</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Time Between (minutes)</Label>
                        <Input
                          type="number"
                          min="0"
                          value={coffeeFormData.minimumTimeBetween}
                          onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumTimeBetween: e.target.value })}
                          placeholder="0"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Cooldown between stamps</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "discount" && (
              <div className="p-6">
                {!showVoucherForm ? (
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-md">
                          <Percent className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Recurring Voucher Program</h3>
                          <p className="text-sm text-gray-600">Auto-reward at spending milestones</p>
                        </div>
                      </div>
                      
                      {!hasVoucherProgram ? (
                        <Button
                          onClick={() => setShowVoucherForm(true)}
                          className="mt-4 rounded-md bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          Set Up Program
                        </Button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">Program Active</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Reward:</span>
                                <span className="font-medium text-gray-900">{voucherFormData.rewardName}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Threshold:</span>
                                <span className="font-medium text-gray-900">${voucherFormData.spendRequired}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Voucher:</span>
                                <span className="font-medium text-gray-900">${voucherFormData.discountAmount} off</span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => setShowVoucherForm(true)}
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit Settings
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Voucher Program</h3>
                      <p className="text-sm text-gray-600">Set up spending milestone rewards</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Reward Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          value={voucherFormData.rewardName}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, rewardName: e.target.value })}
                          placeholder="Loyalty Discount"
                          className="mt-1.5 rounded-md"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          PIN Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={voucherFormData.pin}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, pin: e.target.value })}
                          placeholder="1234"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Staff PIN for applying voucher</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Spend Required ($) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={voucherFormData.spendRequired}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, spendRequired: e.target.value })}
                          placeholder="100"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Spending threshold to earn voucher</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Discount Amount ($) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={voucherFormData.discountAmount}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, discountAmount: e.target.value })}
                          placeholder="10"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Voucher value</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea
                          value={voucherFormData.description}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
                          placeholder="Optional description..."
                          className="mt-1.5 rounded-md"
                          rows={2}
                        />
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                        <p className="text-sm text-purple-700">
                          <strong>Preview:</strong> Spend ${voucherFormData.spendRequired} → Get ${voucherFormData.discountAmount} off
                        </p>
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              )}
                
            {activeTab === "transaction" && (
              <div className="p-6">
                {!showTransactionForm ? (
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-blue-100 rounded-md">
                          <ShoppingBag className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Transaction Reward Program</h3>
                          <p className="text-sm text-gray-600">Reward frequent customers</p>
                        </div>
                      </div>
                      
                      {!hasTransactionProgram ? (
                        <Button
                          onClick={() => setShowTransactionForm(true)}
                          className="mt-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          Set Up Program
                        </Button>
                      ) : (
                        <div className="mt-4 space-y-3">
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">Program Active</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Reward:</span>
                                <span className="font-medium text-gray-900">{transactionFormData.rewardName}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Threshold:</span>
                                <span className="font-medium text-gray-900">{transactionFormData.transactionThreshold} visits</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Reward:</span>
                                <span className="font-medium text-gray-900">
                                  {transactionFormData.rewardType === 'dollar_voucher' 
                                    ? `$${transactionFormData.voucherAmount} voucher`
                                    : transactionFormData.freeItemName
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <Button
                            onClick={() => setShowTransactionForm(true)}
                            variant="outline"
                            size="sm"
                            className="rounded-md"
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit Settings
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Transaction Reward</h3>
                      <p className="text-sm text-gray-600">Set up visit-based rewards</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Reward Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          value={transactionFormData.rewardName}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, rewardName: e.target.value })}
                          placeholder="Frequent Shopper Reward"
                          className="mt-1.5 rounded-md"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          PIN Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          maxLength={4}
                          value={transactionFormData.pin}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, pin: e.target.value })}
                          placeholder="1234"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Staff PIN for redemptions</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Visit Threshold <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          min="1"
                          value={transactionFormData.transactionThreshold}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionThreshold: e.target.value })}
                          placeholder="5"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Number of visits to earn reward</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Reward Type <span className="text-red-500">*</span>
                        </Label>
                        <RadioGroup 
                          value={transactionFormData.rewardType} 
                          onValueChange={(value: 'dollar_voucher' | 'free_item') => setTransactionFormData({ ...transactionFormData, rewardType: value })}
                          className="flex gap-4 mt-1.5"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="dollar_voucher" id="dollar_voucher" />
                            <Label htmlFor="dollar_voucher" className="text-sm font-normal">Dollar Voucher</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="free_item" id="free_item" />
                            <Label htmlFor="free_item" className="text-sm font-normal">Free Item</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {transactionFormData.rewardType === 'dollar_voucher' && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Voucher Amount ($) <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={transactionFormData.voucherAmount}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, voucherAmount: e.target.value })}
                            placeholder="10"
                            className="mt-1.5 rounded-md"
                          />
                        </div>
                      )}

                      {transactionFormData.rewardType === 'free_item' && (
                        <div>
                          <Label className="text-sm font-medium text-gray-700">
                            Free Item Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="text"
                            value={transactionFormData.freeItemName}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, freeItemName: e.target.value })}
                            placeholder="Free Coffee"
                            className="mt-1.5 rounded-md"
                          />
                        </div>
                      )}

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Iterations</Label>
                        <Input
                          type="number"
                          min="1"
                          value={transactionFormData.iterations}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, iterations: e.target.value })}
                          placeholder="0"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">How many times can be earned (0 = unlimited)</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea
                          value={transactionFormData.description}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                          placeholder="Optional description..."
                          className="mt-1.5 rounded-md"
                          rows={2}
                        />
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-700">
                          <strong>Preview:</strong> Visit {transactionFormData.transactionThreshold} times → Get
                          {transactionFormData.rewardType === 'dollar_voucher' 
                            ? ` $${transactionFormData.voucherAmount} off` 
                            : ` ${transactionFormData.freeItemName || 'free item'}`}
                        </p>
                      </div>
                    </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "cashback" && (
              <div className="p-6">
                {!showCashbackForm ? (
                  <div className="space-y-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-green-100 rounded-md">
                          <Award className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Tap Cash Program</h3>
                          <p className="text-sm text-gray-600">% back in store credit on all purchases</p>
                        </div>
                      </div>
                      
                      {!hasCashbackProgram ? (
                        <Button
                          onClick={() => setShowCashbackForm(true)}
                          className="mt-4 rounded-md bg-green-600 hover:bg-green-700 text-white"
                        >
                          Set Up Program
                        </Button>
                      ) : (
                                                  <div className="mt-4 space-y-3">
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-gray-900">Program Active</span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Rate:</span>
                                <span className="font-medium text-gray-900">{cashbackFormData.cashbackRate}% back</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Example:</span>
                                <span className="font-medium text-gray-900">$100 → ${(parseFloat(cashbackFormData.cashbackRate || '0')).toFixed(2)} credit</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => setShowCashbackForm(true)}
                              variant="outline"
                              size="sm"
                              className="rounded-md"
                            >
                              <Edit className="h-4 w-4 mr-1.5" />
                              Edit Settings
                            </Button>
                            <Button
                              onClick={removeCashbackProgram}
                              variant="destructive"
                              size="sm"
                              className="rounded-md"
                              disabled={loading}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Configure Tap Cash</h3>
                      <p className="text-sm text-gray-600">Set up cashback rewards</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">
                          Cashback Rate (%) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          max="100"
                          value={cashbackFormData.cashbackRate}
                          onChange={(e) => setCashbackFormData({ ...cashbackFormData, cashbackRate: e.target.value })}
                          placeholder="2.0"
                          className="mt-1.5 rounded-md"
                        />
                        <p className="mt-1 text-xs text-gray-500">Percentage returned as store credit</p>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Program Name</Label>
                        <Input
                          type="text"
                          value={cashbackFormData.programName}
                          onChange={(e) => setCashbackFormData({ ...cashbackFormData, programName: e.target.value })}
                          placeholder="Tap Cash"
                          className="mt-1.5 rounded-md"
                        />
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <Textarea
                          value={cashbackFormData.description}
                          onChange={(e) => setCashbackFormData({ ...cashbackFormData, description: e.target.value })}
                          placeholder="Optional description..."
                          className="mt-1.5 rounded-md"
                          rows={2}
                        />
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <p className="text-sm text-green-700">
                          <strong>Preview:</strong> {cashbackFormData.cashbackRate}% back on all purchases
                        </p>
                        <p className="text-xs text-green-600 mt-1">
                          $100 purchase = ${(parseFloat(cashbackFormData.cashbackRate || '0')).toFixed(2)} credit
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dialog Footer */}
          {(showCoffeeForm || showVoucherForm || showTransactionForm || showCashbackForm) && (
            <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
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
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 