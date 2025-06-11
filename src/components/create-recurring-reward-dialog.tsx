"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle, ShoppingBag } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"

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
  const [instantClose, setInstantClose] = useState(false)
  const [hasCoffeeProgram, setHasCoffeeProgram] = useState(false)
  const [existingCoffeeProgram, setExistingCoffeeProgram] = useState<any>(null)
  const [removingProgram, setRemovingProgram] = useState(false)
  const [hasVoucherProgram, setHasVoucherProgram] = useState(false)
  const [existingVoucherProgram, setExistingVoucherProgram] = useState<any>(null)
  const [removingVoucherProgram, setRemovingVoucherProgram] = useState(false)
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

  // Reset instantClose when sheet is closed
  useEffect(() => {
    if (!open && instantClose) {
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);

  // Check if merchant has existing programs when the dialog opens
  useEffect(() => {
    if (open && user?.uid) {
      checkExistingCoffeeProgram();
      checkExistingVoucherProgram();
    }
  }, [open, user?.uid]);

  // Function to check if merchant has an existing coffee program
  const checkExistingCoffeeProgram = async () => {
    if (!user?.uid) return;
    
    try {
      const merchantDocRef = doc(db, 'merchants', user.uid);
      const merchantSnapshot = await getDoc(merchantDocRef);
      
      if (merchantSnapshot.exists()) {
        const merchantData = merchantSnapshot.data();
        
        // Check if coffeeprogram flag is true
        if (merchantData.coffeeprogram === true && merchantData.coffeePrograms && merchantData.coffeePrograms.length > 0) {
          setHasCoffeeProgram(true);
          setExistingCoffeeProgram(merchantData.coffeePrograms[0]);
          
          // Update form data with existing program settings
          setCoffeeFormData({
            pin: merchantData.coffeePrograms[0].pin || '',
            frequency: merchantData.coffeePrograms[0].frequency?.toString() || '5',
            minimumSpend: merchantData.coffeePrograms[0].minspend?.toString() || '0',
            minimumTimeBetween: merchantData.coffeePrograms[0].mintime?.toString() || '0',
          });
        } else {
          setHasCoffeeProgram(false);
          setExistingCoffeeProgram(null);
        }
      }
    } catch (error) {
      console.error("Error checking for existing coffee program:", error);
      toast({
        title: "Error",
        description: "Could not check for existing coffee program",
        variant: "destructive"
      });
    }
  };

  // Function to remove the existing coffee program
  const removeCoffeeProgram = async () => {
    if (!user?.uid) return;
    setRemovingProgram(true);
    
    try {
      // 1. Update merchant document to remove coffee program
      const merchantDocRef = doc(db, 'merchants', user.uid);
      await updateDoc(merchantDocRef, {
        coffeeprogram: false,
        coffeePrograms: deleteField()
      });
      
      // 2. Get all customers
      const customersRef = collection(db, 'merchants', user.uid, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      // 3. Batch update to remove coffee program data from all customers
      const batch = writeBatch(db);
      
      customersSnapshot.forEach((customerDoc) => {
        // Remove coffeeEligibleCount field from each customer
        const customerRef = doc(db, 'merchants', user.uid, 'customers', customerDoc.id);
        batch.update(customerRef, {
          coffeeEligibleCount: deleteField()
        });
        
        // Delete the coffeeLoyalty collection for this customer
        // Note: We can't delete a collection in a batch, so we'll handle this separately
      });
      
      // Commit the batch update
      await batch.commit();
      
      // 4. For each customer, delete their coffeeLoyalty collection
      // This needs to be done separately as Firestore doesn't support collection deletion in batches
      const deletePromises = customersSnapshot.docs.map(async (customerDoc) => {
        const coffeeLoyaltyRef = collection(db, 'merchants', user.uid, 'customers', customerDoc.id, 'coffeeLoyalty');
        const coffeeLoyaltySnapshot = await getDocs(coffeeLoyaltyRef);
        
        const deleteBatch = writeBatch(db);
        coffeeLoyaltySnapshot.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        
        return deleteBatch.commit();
      });
      
      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: "Coffee program has been removed successfully",
      });
      
      // Reset state
      setHasCoffeeProgram(false);
      setExistingCoffeeProgram(null);
      setCoffeeFormData({
        pin: '',
        frequency: '5',
        minimumSpend: '0',
        minimumTimeBetween: '0',
      });
      
    } catch (error: any) {
      console.error("Error removing coffee program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove coffee program",
        variant: "destructive"
      });
    } finally {
      setRemovingProgram(false);
    }
  };

  // Function to check if merchant has an existing voucher program
  const checkExistingVoucherProgram = async () => {
    if (!user?.uid) return;
    
    try {
      const merchantDocRef = doc(db, 'merchants', user.uid);
      const merchantSnapshot = await getDoc(merchantDocRef);
      
      if (merchantSnapshot.exists()) {
        const merchantData = merchantSnapshot.data();
        
        // Check if voucherprogram flag is true
        if (merchantData.voucherprogram === true && merchantData.voucherPrograms && merchantData.voucherPrograms.length > 0) {
          setHasVoucherProgram(true);
          setExistingVoucherProgram(merchantData.voucherPrograms[0]);
          
          // Update form data with existing program settings
          setVoucherFormData({
            pin: merchantData.voucherPrograms[0].pin || '',
            rewardName: merchantData.voucherPrograms[0].name || '',
            description: merchantData.voucherPrograms[0].description || '',
            spendRequired: merchantData.voucherPrograms[0].totalSpendRequired?.toString() || '100',
            discountAmount: merchantData.voucherPrograms[0].rewardAmount?.toString() || '10',
            isActive: merchantData.voucherPrograms[0].active !== false
          });
        } else {
          setHasVoucherProgram(false);
          setExistingVoucherProgram(null);
        }
      }
    } catch (error) {
      console.error("Error checking for existing voucher program:", error);
      toast({
        title: "Error",
        description: "Could not check for existing voucher program",
        variant: "destructive"
      });
    }
  };

  // Function to remove the existing voucher program
  const removeVoucherProgram = async () => {
    if (!user?.uid) return;
    setRemovingVoucherProgram(true);
    
    try {
      // Update merchant document to remove voucher program
      const merchantDocRef = doc(db, 'merchants', user.uid);
      await updateDoc(merchantDocRef, {
        voucherprogram: false,
        voucherPrograms: deleteField()
      });
      
      toast({
        title: "Success",
        description: "Voucher program has been removed successfully",
      });
      
      // Reset state
      setHasVoucherProgram(false);
      setExistingVoucherProgram(null);
      setVoucherFormData({
        rewardName: '',
        description: '',
        pin: '',
        spendRequired: '100',
        discountAmount: '10',
        isActive: true
      });
      
    } catch (error: any) {
      console.error("Error removing voucher program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove voucher program",
        variant: "destructive"
      });
    } finally {
      setRemovingVoucherProgram(false);
    }
  };

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
      
      console.log("Coffee program saved:", coffeeProgram)
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Coffee program created successfully",
      })
      setHasCoffeeProgram(true)
      setExistingCoffeeProgram(coffeeProgram)
      setInstantClose(true);
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
      // Check if voucher program exists
      const merchantDocRef = doc(db, 'merchants', user.uid)
      const merchantDoc = await getDoc(merchantDocRef)
      
      if (merchantDoc.exists() && merchantDoc.data().voucherprogram === true) {
        toast({
          title: "Error",
          description: "Voucher program already exists",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Create the voucher program data object
      const voucherProgram = {
          pin: voucherFormData.pin,
          name: voucherFormData.rewardName,
          description: voucherFormData.description || "",
          active: voucherFormData.isActive,
          rewardAmount: parseInt(voucherFormData.discountAmount),
          totalSpendRequired: parseInt(voucherFormData.spendRequired),
        createdAt: new Date()
      }
      
      // Update the merchant document to add the voucher program to an array
      await setDoc(merchantDocRef, {
        voucherprogram: true,
        voucherPrograms: arrayUnion(voucherProgram)
      }, { merge: true })
      
      console.log("Voucher program saved:", voucherProgram)
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Recurring voucher created successfully",
      })
      setHasVoucherProgram(true)
      setExistingVoucherProgram(voucherProgram)
      setInstantClose(true);
      onOpenChange(false)
      
    } catch (error: any) {
      console.error("Error creating voucher:", error)
      
        toast({
          title: "Error",
          description: error.message || "Failed to create recurring voucher",
          variant: "destructive"
        })
    } finally {
      setLoading(false)
    }
  }

  const ConfirmationDialog = () => {
    if (!showVoucherConfirmation) return null
    
    const voucherAmount = parseInt(voucherFormData.discountAmount)
    const spendRequired = parseInt(voucherFormData.spendRequired)
    
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
                  <span className="text-gray-600">PIN Code:</span>
                  <span className="font-medium">{voucherFormData.pin}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-md p-4 mb-4">
              <h4 className="font-medium mb-2">How This Will Work</h4>
              <p className="text-sm mb-3">
                This will create {voucherAmount} vouchers worth ${voucherAmount} each that customers can earn as they spend at your business:
              </p>
              
              <div className="space-y-2 text-sm">
                {[...Array(Math.min(voucherAmount, 5))].map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <span className="font-medium">${voucherAmount} voucher</span> unlocks when customer spends ${spendRequired * (i + 1)}
                    </div>
                  </div>
                ))}
                
                {voucherAmount > 5 && (
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center flex-shrink-0 text-xs">
                      ...
                    </div>
                    <div>And so on, up to {voucherAmount} vouchers</div>
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
      // Instead of calling the Firebase function, save directly to Firestore
      const merchantRef = doc(db, 'merchants', user.uid)
      
      // Create the transaction reward data object with proper typing
      interface TransactionReward {
        pin: string;
        name: string;
        description: string;
        active: boolean;
        transactionThreshold: number;
        rewardType: 'dollar_voucher' | 'free_item';
        iterations: number;
        createdAt: Date;
        voucherAmount?: number;
        freeItemName?: string;
      }

      const transactionReward: TransactionReward = {
        pin: transactionFormData.pin,
        name: transactionFormData.rewardName,
        description: transactionFormData.description || "",
        active: transactionFormData.isActive,
        transactionThreshold: parseInt(transactionFormData.transactionThreshold),
        rewardType: transactionFormData.rewardType,
        iterations: parseInt(transactionFormData.iterations),
        createdAt: new Date()
      }

      // Add reward type specific fields
      if (transactionFormData.rewardType === 'dollar_voucher') {
        transactionReward.voucherAmount = parseInt(transactionFormData.voucherAmount)
      } else if (transactionFormData.rewardType === 'free_item') {
        transactionReward.freeItemName = transactionFormData.freeItemName
      }
      
      // Update the merchant document to add the transaction reward to an array
      await setDoc(merchantRef, {
        transactionRewards: arrayUnion(transactionReward)
      }, { merge: true })
      
      console.log("Transaction reward saved:", transactionReward)
      
      playSuccessSound()
      toast({
        title: "Success",
        description: "Transaction-based reward created successfully",
      })
      setInstantClose(true);
      onOpenChange(false)
      
    } catch (error: any) {
      console.error("Error creating transaction reward:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to create transaction-based reward",
          variant: "destructive"
        })
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
        <SheetOverlay className="bg-black/30" />
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col" instantClose={instantClose}>
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
                  <div className="py-4">
                    {/* Two-column layout for better space utilization */}
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left column with image and action button */}
                      <div className="md:w-2/5 flex flex-col items-center">
                        <div className="rounded-lg overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 p-3 mb-4 shadow-sm border border-slate-200">
                      <img 
                        src="/rec1.png" 
                            alt="Coffee program preview" 
                            className="w-full h-auto object-contain"
                      />
                      </div>
                      
                        {!hasCoffeeProgram ? (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700" 
                            size="lg"
                            onClick={() => setShowCoffeeForm(true)}
                          >
                            Configure Program
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            className="w-full bg-red-600 hover:bg-red-700" 
                            size="lg"
                            onClick={removeCoffeeProgram}
                            disabled={removingProgram}
                          >
                            {removingProgram ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removing Program...
                              </>
                            ) : (
                              <>
                                Remove Existing Program
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Right column with program info */}
                      <div className="md:w-3/5">
                        <div className="mb-4">
                          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                            <Coffee className="h-5 w-5 text-blue-600" />
                            Coffee Loyalty Program
                      </h2>
                          <p className="text-sm text-gray-600">
                            Digital stamp card for coffee or beverages - customers buy X drinks, get 1 free
                          </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-md border border-slate-200 mb-4 shadow-sm">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">How it works</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">1</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Purchase</p>
                                <p className="text-gray-600">Customers make qualifying purchases</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">2</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Collect</p>
                                <p className="text-gray-600">They earn digital stamps toward rewards</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">3</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Redeem</p>
                                <p className="text-gray-600">After X purchases, they get a free item</p>
                              </div>
                            </div>
                      </div>
                        </div>
                        
                        {/* Show existing program if one exists */}
                        {hasCoffeeProgram ? (
                          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-1.5" />
                                Active Program
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">Reward Cycle</span>
                                <span className="text-gray-900">Buy {parseInt(coffeeFormData.frequency) - 1}, get the {coffeeFormData.frequency}th free</span>
                              </div>
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">PIN Code</span>
                                <span className="text-gray-900 font-mono">{coffeeFormData.pin}</span>
                              </div>
                              {parseInt(coffeeFormData.minimumSpend) > 0 && (
                                <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                  <span className="font-medium block text-gray-700 mb-1">Minimum Spend</span>
                                  <span className="text-gray-900">${coffeeFormData.minimumSpend}</span>
                                </div>
                              )}
                              {parseInt(coffeeFormData.minimumTimeBetween) > 0 && (
                                <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                  <span className="font-medium block text-gray-700 mb-1">Time Between Purchases</span>
                                  <span className="text-gray-900">{coffeeFormData.minimumTimeBetween} minutes</span>
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-3 flex items-center">
                              <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <strong>Note:</strong> Removing the program will delete all customer progress data
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Program Benefits</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Increase customer retention</span>
                                  Encourage repeat visits and build loyalty
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Simple to set up</span>
                                  Easy configuration with customizable rules
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Unlimited rewards</span>
                                  Program runs in perpetuity with no limits
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Prevent abuse</span>
                                  Set minimum spend and time requirements
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                        Create a digital "buy X get 1 free" stamp card program for coffee or other beverages. This program runs in perpetuity with no limit on free items earned. Only transactions after program creation will count, and you can set minimum spend and time requirements to prevent abuse.
                  </p>
                </div>
                
                    <div className="grid grid-cols-1 gap-6 overflow-hidden">
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
                        <Label>Frequency <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                              value={coffeeFormData.frequency}
                              onChange={(e) => setCoffeeFormData({ ...coffeeFormData, frequency: e.target.value })}
                          placeholder="e.g., 5"
                        />
                        <p className="text-sm text-muted-foreground">
                            Total number of coffees in the reward cycle (e.g., "10" means buy 9, get the 10th free)
                        </p>
                      </div>

                      <div className="grid gap-2">
                          <Label>Minimum Spend Required ($)</Label>
                        <Input
                          type="number"
                            min="0"
                            value={coffeeFormData.minimumSpend}
                            onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumSpend: e.target.value })}
                          placeholder="e.g., 5"
                        />
                        <p className="text-sm text-muted-foreground">
                            Minimum transaction amount to qualify for a stamp (0 for no minimum)
                        </p>
                      </div>

                        <div className="grid gap-2">
                          <Label>Minimum Time Between Purchases (minutes)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={coffeeFormData.minimumTimeBetween}
                            onChange={(e) => setCoffeeFormData({ ...coffeeFormData, minimumTimeBetween: e.target.value })}
                            placeholder="e.g., 30"
                          />
                          <p className="text-sm text-muted-foreground">
                            Minimum time required between purchases to earn stamps (0 for no limit)
                          </p>
                    </div>
                    
                    <div className="mt-2">
                      <h4 className="text-sm font-medium mb-2">Program Summary</h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm mb-2">
                          Based on your settings, customers will:
                        </p>
                        <ul className="text-sm space-y-1 pl-5 list-disc">
                          <li>
                                Buy {parseInt(coffeeFormData.frequency) - 1} coffees, get the {coffeeFormData.frequency}th one free (reward cycle: {coffeeFormData.frequency} coffees)
                          </li>
                              {parseInt(coffeeFormData.minimumSpend) > 0 && (
                          <li>
                                  Need to spend at least ${coffeeFormData.minimumSpend} per transaction to earn a stamp
                          </li>
                              )}
                              {parseInt(coffeeFormData.minimumTimeBetween) > 0 && (
                                <li>
                                  Need to wait at least {coffeeFormData.minimumTimeBetween} minutes between purchases to earn stamps
                                </li>
                              )}
                              <li>
                                <strong>This program runs in perpetuity</strong> with no limit to how many free coffees can be earned
                              </li>
                              <li>
                                Only transactions made <strong>after program creation</strong> will count toward stamps
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
                  <div className="py-4">
                    {/* Two-column layout for better space utilization */}
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Left column with image and action button */}
                      <div className="md:w-2/5 flex flex-col items-center">
                        <div className="rounded-lg overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 p-3 mb-4 shadow-sm border border-slate-200">
                      <img 
                        src="/rec2.png" 
                        alt="Recurring Voucher preview" 
                            className="w-full h-auto object-contain"
                      />
                    </div>
                    
                        {!hasVoucherProgram ? (
                          <Button 
                            className="w-full bg-blue-600 hover:bg-blue-700" 
                            size="lg"
                            onClick={() => setShowVoucherForm(true)}
                          >
                            Configure Voucher
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button 
                            variant="destructive" 
                            className="w-full bg-red-600 hover:bg-red-700" 
                            size="lg"
                            onClick={removeVoucherProgram}
                            disabled={removingVoucherProgram}
                          >
                            {removingVoucherProgram ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Removing Program...
                              </>
                            ) : (
                              <>
                                Remove Existing Program
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Right column with program info */}
                      <div className="md:w-3/5">
                        <div className="mb-4">
                          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
                            <Percent className="h-5 w-5 text-blue-600" />
                        Recurring Voucher
                      </h2>
                          <p className="text-sm text-gray-600">
                            Automatic dollar-value vouchers when customers reach spending thresholds
                          </p>
                        </div>
                        
                        <div className="bg-white p-4 rounded-md border border-slate-200 mb-4 shadow-sm">
                          <h3 className="text-sm font-medium text-gray-700 mb-3">How it works</h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">1</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Spend</p>
                                <p className="text-gray-600">Customers spend at your business</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">2</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Earn</p>
                                <p className="text-gray-600">They reach spending thresholds</p>
                              </div>
                            </div>
                            <div className="flex items-start">
                              <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 font-medium">3</div>
                              <div>
                                <p className="font-medium text-gray-900 mb-0.5">Redeem</p>
                                <p className="text-gray-600">They receive dollar-value vouchers</p>
                              </div>
                            </div>
                  </div>
                </div>
                    
                        {/* Show existing program if one exists */}
                        {hasVoucherProgram ? (
                          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-1.5" />
                                Active Program
                              </h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">Reward Amount</span>
                                <span className="text-gray-900">${voucherFormData.discountAmount} voucher</span>
                              </div>
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">Spend Required</span>
                                <span className="text-gray-900">${voucherFormData.spendRequired}</span>
                              </div>
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">PIN Code</span>
                                <span className="text-gray-900 font-mono">{voucherFormData.pin}</span>
                              </div>
                              <div className="bg-white p-3 rounded-md border border-slate-200 text-xs">
                                <span className="font-medium block text-gray-700 mb-1">Status</span>
                                <span className="text-gray-900">{voucherFormData.isActive ? "Active" : "Inactive"}</span>
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 mt-3 flex items-center">
                              <svg className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                              <strong>Note:</strong> Removing the program will delete all customer progress data
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white p-4 rounded-md border border-slate-200 shadow-sm">
                            <h3 className="text-sm font-medium text-gray-700 mb-3">Program Benefits</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Reward big spenders</span>
                                  Encourage higher transaction values
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Flexible redemption</span>
                                  Dollar-value vouchers for any purchase
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Automatic rewards</span>
                                  No manual tracking needed
                                </div>
                              </div>
                              <div className="flex items-start">
                                <div className="bg-blue-100 rounded p-1 mr-2 flex-shrink-0">
                                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                                <div className="text-xs text-gray-600">
                                  <span className="font-medium text-gray-900 block">Increase loyalty</span>
                                  Keep customers coming back
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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
                                And so on, up to ${voucherFormData.discountAmount} vouchers in total
                          </li>
                          <li>
                                Total potential reward value: ${parseInt(voucherFormData.discountAmount) * parseInt(voucherFormData.spendRequired)}
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
                    
                    <div className="text-center max-w-lg">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        Transaction-Based Reward
                      </h2>
                      <p className="text-lg text-gray-700 mb-5">
                        Reward customers based on number of transactions
                      </p>
                      <div className="bg-gray-50 p-5 rounded-md border border-gray-100">
                        <p className="text-md text-gray-600">
                          Ideal for businesses where visit frequency matters more than spend amount. Rewards based on visit count.
                        </p>
                  </div>
                </div>
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
                  
                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
                      <h3 className="text-sm font-medium text-blue-800 mb-1">Transaction Reward Setup</h3>
                      <p className="text-xs text-blue-700">
                        Create rewards that customers earn automatically as they make more transactions at your business. 
                        These rewards incentivize repeat visits and build customer loyalty over time.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6 overflow-hidden">
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
              
              {activeTab === 'coffee' && !showCoffeeForm && (
                <Button 
                  onClick={() => setShowCoffeeForm(true)}
                  className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
                >
                  Configure
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {activeTab === 'discount' && !showVoucherForm && (
                <Button 
                  onClick={() => setShowVoucherForm(true)}
                  className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
                >
                  Configure
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {activeTab === 'transaction' && !showTransactionForm && (
                <Button 
                  onClick={() => setShowTransactionForm(true)}
                  className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
                >
                  Configure
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              
              {activeTab === 'coffee' && showCoffeeForm && (
              <Button 
                onClick={saveCoffeeProgram}
                  disabled={loading || !coffeeFormData.pin || !coffeeFormData.frequency}
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