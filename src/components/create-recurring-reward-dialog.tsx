"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetOverlay, SheetDescription } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle, ShoppingBag, Award } from "lucide-react"
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
  const [hasTransactionProgram, setHasTransactionProgram] = useState(false)
  const [existingTransactionProgram, setExistingTransactionProgram] = useState<any>(null)
  const [removingTransactionProgram, setRemovingTransactionProgram] = useState(false)
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
      checkExistingTransactionProgram();
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

  // Function to check if merchant has an existing transaction program
  const checkExistingTransactionProgram = async () => {
    if (!user?.uid) return;
    
    try {
      const merchantDocRef = doc(db, 'merchants', user.uid);
      const merchantSnapshot = await getDoc(merchantDocRef);
      
      if (merchantSnapshot.exists()) {
        const merchantData = merchantSnapshot.data();
        
        // Check if transactionRewards array exists and has active rewards
        if (merchantData.transactionRewards && merchantData.transactionRewards.length > 0) {
          const activeReward = merchantData.transactionRewards.find((reward: any) => reward.active === true);
          
          if (activeReward) {
            setHasTransactionProgram(true);
            setExistingTransactionProgram(activeReward);
            
            // Update form data with existing program settings
            setTransactionFormData({
              pin: activeReward.pin || '',
              rewardName: activeReward.name || '',
              description: activeReward.description || '',
              transactionThreshold: activeReward.transactionThreshold?.toString() || '5',
              rewardType: activeReward.rewardType || 'dollar_voucher',
              voucherAmount: activeReward.voucherAmount?.toString() || '10',
              freeItemName: activeReward.freeItemName || '',
              conditions: activeReward.conditions || '',
              iterations: activeReward.iterations?.toString() || '15',
              isActive: activeReward.active !== false
            });
          } else {
            setHasTransactionProgram(false);
            setExistingTransactionProgram(null);
          }
        } else {
          setHasTransactionProgram(false);
          setExistingTransactionProgram(null);
        }
      }
    } catch (error) {
      console.error("Error checking for existing transaction program:", error);
      toast({
        title: "Error",
        description: "Could not check for existing transaction program",
        variant: "destructive"
      });
    }
  };

  // Function to remove the existing transaction program
  const removeTransactionProgram = async () => {
    if (!user?.uid) return;
    setRemovingTransactionProgram(true);
    
    try {
      // 1. Update merchant document to remove transaction program
      const merchantDocRef = doc(db, 'merchants', user.uid);
      const merchantSnapshot = await getDoc(merchantDocRef);
      
      if (merchantSnapshot.exists()) {
        const merchantData = merchantSnapshot.data();
        
        if (merchantData.transactionRewards && merchantData.transactionRewards.length > 0) {
          // Filter out the active transaction reward
          const updatedRewards = merchantData.transactionRewards.filter((reward: any) => reward.active !== true);
          
          // Update the merchant document
          await updateDoc(merchantDocRef, {
            transactionRewards: updatedRewards.length > 0 ? updatedRewards : deleteField()
          });
        }
      }
      
      // 2. Get all customers
      const customersRef = collection(db, 'merchants', user.uid, 'customers');
      const customersSnapshot = await getDocs(customersRef);
      
      // 3. Batch update to remove transaction program data from all customers
      const batch = writeBatch(db);
      
      customersSnapshot.forEach((customerDoc) => {
        // Remove transaction-related fields from each customer
        const customerRef = doc(db, 'merchants', user.uid, 'customers', customerDoc.id);
        batch.update(customerRef, {
          transactionCount: deleteField()
        });
        
        // Delete the transactionLoyalty collection for this customer
        // Note: We can't delete a collection in a batch, so we'll handle this separately
      });
      
      // Commit the batch update
      await batch.commit();
      
      // 4. For each customer, delete their transactionLoyalty collection
      // This needs to be done separately as Firestore doesn't support collection deletion in batches
      const deletePromises = customersSnapshot.docs.map(async (customerDoc) => {
        const transactionLoyaltyRef = collection(db, 'merchants', user.uid, 'customers', customerDoc.id, 'transactionLoyalty');
        const transactionLoyaltySnapshot = await getDocs(transactionLoyaltyRef);
        
        const deleteBatch = writeBatch(db);
        transactionLoyaltySnapshot.forEach((doc) => {
          deleteBatch.delete(doc.ref);
        });
        
        return deleteBatch.commit();
      });
      
      await Promise.all(deletePromises);
      
      toast({
        title: "Success",
        description: "Transaction program has been removed successfully",
      });
      
      // Reset state
      setHasTransactionProgram(false);
      setExistingTransactionProgram(null);
      setTransactionFormData({
        pin: '',
        rewardName: '',
        description: '',
        transactionThreshold: '5',
        rewardType: 'dollar_voucher',
        voucherAmount: '10',
        freeItemName: '',
        conditions: '',
        iterations: '15',
        isActive: true
      });
      
    } catch (error: any) {
      console.error("Error removing transaction program:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove transaction program",
        variant: "destructive"
      });
    } finally {
      setRemovingTransactionProgram(false);
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
    
    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(voucherFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
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
        <div className="bg-white rounded-md max-w-md w-full max-h-[90vh] overflow-auto">
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

    // Validate PIN is exactly 4 digits
    if (!/^\d{4}$/.test(transactionFormData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be exactly 4 digits",
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
    
    // Directly save the transaction reward
    saveTransactionReward()
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
        conditions?: string;
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

      // Add conditions if provided
      if (transactionFormData.conditions) {
        transactionReward.conditions = transactionFormData.conditions
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
        <div className="bg-white rounded-md max-w-md w-full max-h-[90vh] overflow-auto">
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
                onClick={handleCreateTransactionClick}
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
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl overflow-hidden p-0 flex flex-col" 
          instantClose={instantClose}
        >
          <div className="flex-none px-6 py-5 border-b">
            <SheetHeader className="mb-4">
              <SheetTitle className="text-lg">
                <span className="text-[#007AFF]">Create</span> Recurring Reward
              </SheetTitle>
              <SheetDescription className="text-sm text-gray-600">
                Set up automatic rewards to engage customers with your loyalty program
              </SheetDescription>
            </SheetHeader>
            
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
                <Coffee size={15} className="text-[#007AFF]" />
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
                <Percent size={15} className="text-[#007AFF]" />
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
                <ShoppingBag size={15} className="text-[#007AFF]" />
                Transaction Reward
              </button>
            </div>
                </div>
                
          <Tabs 
            defaultValue="coffee" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="hidden">
              <TabsTrigger value="coffee">Coffee Program</TabsTrigger>
              <TabsTrigger value="discount">Recurring Voucher</TabsTrigger>
              <TabsTrigger value="transaction">Transaction Reward</TabsTrigger>
              </TabsList>
            
            <ScrollArea className="flex-1 overflow-auto">
              <TabsContent value="coffee" className="mt-0 h-full">
                {!showCoffeeForm ? (
                  <div className="p-6 pb-0">
                    {/* Current Status */}
                    {hasCoffeeProgram ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Active Coffee Program</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-600">Reward Cycle:</span>
                            <p className="font-medium">Buy {parseInt(coffeeFormData.frequency) - 1}, get the {coffeeFormData.frequency}th free</p>
                          </div>
                          <div>
                            <span className="text-gray-600">PIN Code:</span>
                            <p className="font-medium font-mono">{coffeeFormData.pin}</p>
                          </div>
                          {parseInt(coffeeFormData.minimumSpend) > 0 && (
                            <div>
                              <span className="text-gray-600">Minimum Spend:</span>
                              <p className="font-medium">${coffeeFormData.minimumSpend}</p>
                            </div>
                          )}
                          {parseInt(coffeeFormData.minimumTimeBetween) > 0 && (
                            <div>
                              <span className="text-gray-600">Time Between Purchases:</span>
                              <p className="font-medium">{coffeeFormData.minimumTimeBetween} minutes</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowCoffeeForm(true)}
                            className="rounded-md"
                          >
                            Edit Program
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={removeCoffeeProgram}
                            disabled={removingProgram}
                            className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {removingProgram ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              'Remove Program'
                            )}
                          </Button>
                      </div>
                          </div>
                        ) : (
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
                        )}
                    
                    {/* Coffee Image - Fixed to bottom of dialog */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end px-6">
                      <img 
                        src="/coffee.png" 
                        alt="Coffee" 
                        className="h-auto w-full max-w-[350px] object-contain"
                      />
                    </div>
                        </div>
                ) : (
                  <div className="p-6 pt-0">
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
              </TabsContent>
              
              <TabsContent value="discount" className="mt-0 h-full">
                {!showVoucherForm ? (
                  <div className="p-6">
                    {/* Current Status */}
                    {hasVoucherProgram ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Active Voucher Program</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-600">Reward Amount:</span>
                            <p className="font-medium">${voucherFormData.discountAmount} voucher</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Spend Required:</span>
                            <p className="font-medium">${voucherFormData.spendRequired}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">PIN Code:</span>
                            <p className="font-medium font-mono">{voucherFormData.pin}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <p className="font-medium">{voucherFormData.isActive ? "Active" : "Inactive"}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowVoucherForm(true)}
                            className="rounded-md"
                          >
                            Edit Program
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={removeVoucherProgram}
                            disabled={removingVoucherProgram}
                            className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {removingVoucherProgram ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              'Remove Program'
                            )}
                          </Button>
                      </div>
                        </div>
                        ) : (
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
                        )}
                    
                    {/* Voucher Image - Fixed to bottom of dialog */}
                    <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end px-6">
                      <img 
                        src="/voucher.png" 
                        alt="Voucher" 
                        className="h-auto w-full max-w-[347px] object-contain"
                      />
                    </div>
              </div>
            ) : (
                  <div className="p-6 pt-0">
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold">Configure Voucher Program</h2>
                      <p className="text-sm text-gray-600">Set up your recurring voucher rewards</p>
                    </div>
                  
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                      <Input
                        type="text"
                            value={voucherFormData.rewardName}
                            onChange={(e) => setVoucherFormData({ ...voucherFormData, rewardName: e.target.value })}
                            placeholder="e.g., Loyalty Voucher"
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
                      </div>
                      
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Voucher Amount ($) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                              value={voucherFormData.discountAmount}
                              onChange={(e) => setVoucherFormData({ ...voucherFormData, discountAmount: e.target.value })}
                          placeholder="e.g., 10"
                            className="h-10 rounded-md"
                        />
                      </div>
                    </div>
                    
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Description</Label>
                        <Textarea
                          value={voucherFormData.description}
                          onChange={(e) => setVoucherFormData({ ...voucherFormData, description: e.target.value })}
                          placeholder="Describe your voucher program..."
                          className="min-h-[80px] rounded-md"
                        />
                  </div>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="transaction" className="mt-0 h-full">
                {!showTransactionForm ? (
                  <div className="p-6 pb-0">
                    {/* Current Status */}
                    {hasTransactionProgram ? (
                      <div className="border border-gray-200 rounded-md p-6 bg-gray-50">
                        <div className="flex items-center gap-3 mb-4">
                          <CheckCircle className="h-5 w-5 text-[#007AFF]" />
                          <h3 className="text-md font-semibold">Active Transaction Program</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                          <div>
                            <span className="text-gray-600">Program Name:</span>
                            <p className="font-medium">{transactionFormData.rewardName}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">PIN Code:</span>
                            <p className="font-medium font-mono">{transactionFormData.pin}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Transaction Threshold:</span>
                            <p className="font-medium">{transactionFormData.transactionThreshold} transactions</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Reward Type:</span>
                            <p className="font-medium">
                              {transactionFormData.rewardType === 'dollar_voucher' 
                                ? `$${transactionFormData.voucherAmount} Voucher` 
                                : `Free ${transactionFormData.freeItemName}`}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Number of Levels:</span>
                            <p className="font-medium">{transactionFormData.iterations}</p>
                          </div>
                          {transactionFormData.conditions && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Conditions:</span>
                              <p className="font-medium">{transactionFormData.conditions}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={removeTransactionProgram}
                            disabled={removingTransactionProgram}
                            className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                          >
                            {removingTransactionProgram ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Removing...
                              </>
                            ) : (
                              'Remove Program'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                ) : (
                  <div className="p-6 pt-0">
                    <div className="mb-6">
                      <h2 className="text-lg font-semibold">Configure Transaction Rewards</h2>
                      <p className="text-sm text-gray-600">Set up your transaction-based reward program</p>
                    </div>
                  
                    <div className="max-w-2xl">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Reward Name <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            value={transactionFormData.rewardName}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, rewardName: e.target.value })}
                            placeholder="e.g., Loyal Customer Reward"
                              className="h-10"
                          />
                            <p className="text-xs text-gray-500">
                              Name that clearly explains the benefit to customers
                          </p>
                        </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">PIN Code <span className="text-red-500">*</span></Label>
                          <Input
                            type="text"
                            maxLength={4}
                            value={transactionFormData.pin}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, pin: e.target.value })}
                              placeholder="e.g., 1234"
                              className="h-10"
                          />
                            <p className="text-xs text-gray-500">
                            Staff will enter this PIN when redeeming rewards
                          </p>
                        </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Transaction Threshold <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.transactionThreshold}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, transactionThreshold: e.target.value })}
                              placeholder="e.g., 5"
                              className="h-10"
                            />
                            <p className="text-xs text-gray-500">
                              Number of transactions for first reward and between subsequent rewards
                            </p>
                              </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Number of Levels <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.iterations}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, iterations: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10"
                            />
                            <p className="text-xs text-gray-500">
                              Total number of reward levels to create
                            </p>
                            </div>
                              </div>
                        
                        {/* Reward Type Selection */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Reward Type <span className="text-red-500">*</span></Label>
                          {/* Sub-Tab Container */}
                          <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                            <button
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                transactionFormData.rewardType === "free_item"
                                  ? "text-gray-800 bg-white shadow-sm"
                                  : "text-gray-600 hover:bg-gray-200/70"
                              )}
                              onClick={() => setTransactionFormData({ ...transactionFormData, rewardType: 'free_item' })}
                            >
                              <Award className="h-3 w-3" />
                              Free Item
                            </button>
                            <button
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                transactionFormData.rewardType === "dollar_voucher"
                                  ? "text-gray-800 bg-white shadow-sm"
                                  : "text-gray-600 hover:bg-gray-200/70"
                              )}
                              onClick={() => setTransactionFormData({ ...transactionFormData, rewardType: 'dollar_voucher' })}
                            >
                              <Percent className="h-3 w-3" />
                              Voucher
                            </button>
                            </div>
                        </div>

                        {/* Conditional Fields Based on Reward Type */}
                        {transactionFormData.rewardType === 'dollar_voucher' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Voucher Amount ($) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              min="1"
                              value={transactionFormData.voucherAmount}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, voucherAmount: e.target.value })}
                              placeholder="e.g., 10"
                              className="h-10"
                            />
                            <p className="text-xs text-gray-500">
                              Dollar amount for each voucher reward
                            </p>
              </div>
            )}

                        {transactionFormData.rewardType === 'free_item' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Free Item Name <span className="text-red-500">*</span></Label>
                            <Input
                              type="text"
                              value={transactionFormData.freeItemName}
                              onChange={(e) => setTransactionFormData({ ...transactionFormData, freeItemName: e.target.value })}
                              placeholder="e.g., Free Coffee, Free Dessert"
                              className="h-10"
                            />
                            <p className="text-xs text-gray-500">
                              Name of the free item customers will receive
                            </p>
          </div>
                        )}

                        {/* Conditions Section */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Conditions</Label>
                          <Textarea
                            value={transactionFormData.conditions}
                            onChange={(e) => setTransactionFormData({ ...transactionFormData, conditions: e.target.value })}
                            placeholder="e.g., Valid for 30 days from issue date, Cannot be combined with other offers, One per customer"
                            className="min-h-[80px] resize-none"
                            rows={3}
                          />
                          <p className="text-xs text-gray-500">
                            Optional terms and conditions for this reward (e.g., expiry, restrictions)
                          </p>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                          <h4 className="font-medium text-gray-900 mb-3">Program Summary</h4>
                          <div className="space-y-2 text-sm text-gray-700">
                            <p>With these settings, customers will:</p>
                            <ul className="space-y-1 ml-4 list-disc">
                              <li>Earn their first reward after {transactionFormData.transactionThreshold} transactions</li>
                              <li>Receive {transactionFormData.rewardType === 'dollar_voucher' ? `a $${transactionFormData.voucherAmount} voucher` : `a free ${transactionFormData.freeItemName || 'item'}`} at each level</li>
                              <li>Unlock new rewards every {transactionFormData.transactionThreshold} transactions, up to {transactionFormData.iterations} levels</li>
                              <li>Need {parseInt(transactionFormData.transactionThreshold) * parseInt(transactionFormData.iterations)} total transactions to reach the final level</li>
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
          


          {/* Fixed Footer */}
          {(showCoffeeForm || showVoucherForm || showTransactionForm) && (
            <div className="flex-none sticky bottom-0 z-10 bg-white border-t px-6 py-4 shadow-lg">
              <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                    setShowCoffeeForm(false)
                    setShowVoucherForm(false)
                    setShowTransactionForm(false)
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
                      handleCreateClick()
                    } else if (showTransactionForm) {
                      handleCreateTransactionClick()
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
        </SheetContent>
      </Sheet>
      
      {/* Confirmation Dialogs */}
      {showVoucherConfirmation && <ConfirmationDialog />}
      {showTransactionConfirmation && <TransactionConfirmationDialog />}
    </>
  )
} 

// Add scrollbar styles
const scrollbarStyles = `
  .content-area::-webkit-scrollbar {
    width: 4px;
  }
  
  .content-area::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.02);
  }
  
  .content-area::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  
  .content-area::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.15);
  }
` 