"use client"

import { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetOverlay } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc, getDoc, query, where, getDocs } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gift, Sparkles, Coffee, DollarSign, ShoppingBag, Info, CheckCircle, ArrowRight, Edit, Trash, AlertCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import Image from "next/image"
import { httpsCallable } from "firebase/functions"
import { functions } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

interface IntroductoryRewardSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ExistingReward {
  id: string
  rewardName: string
  description: string
  type: string
  isIntroductoryReward: boolean
  fundedByTapLoyalty: boolean
  itemName?: string
  voucherAmount?: number
  itemValue?: number
  pin: string
  isActive: boolean
  status: string
  createdAt: string
  updatedAt: string
  merchantId: string
  redemptionCount: number
  uniqueCustomersCount: number
}

export function IntroductoryRewardSheet({ open, onOpenChange }: IntroductoryRewardSheetProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [rewardType, setRewardType] = useState<"voucher" | "freeItem">("voucher")
  const [instantClose, setInstantClose] = useState(false)
  const [formData, setFormData] = useState({
    rewardName: "",
    description: "",
    itemName: "",
    voucherAmount: "5.00",
    itemValue: "5.00",
    pin: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingReward, setExistingReward] = useState<ExistingReward | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Reset instantClose when sheet is closed
  useEffect(() => {
    if (!open && instantClose) {
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);

  // Check if merchant already has an introductory reward
  useEffect(() => {
    const checkExistingReward = async () => {
      if (!user?.uid || !open) return;
      
      setIsLoading(true);
      try {
        // Check merchant document first
        const merchantRef = doc(db, 'merchants', user.uid);
        const merchantDoc = await getDoc(merchantRef);
        const merchantData = merchantDoc.data();
        
        if (merchantData?.hasIntroductoryReward) {
          // If we have the introductory reward ID stored
          if (merchantData.introductoryRewardId) {
            // Get the reward from the rewards collection
            const rewardRef = doc(db, 'merchants', user.uid, 'rewards', merchantData.introductoryRewardId);
            const rewardDoc = await getDoc(rewardRef);
            
            if (rewardDoc.exists()) {
              setExistingReward({
                id: rewardDoc.id,
                ...rewardDoc.data()
              } as ExistingReward);
              setIsLoading(false);
              return;
            }
          }
          
          // If the ID is not available or the document doesn't exist, search for it
          const rewardsRef = collection(db, 'merchants', user.uid, 'rewards');
          const q = query(rewardsRef, where("isIntroductoryReward", "==", true));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const rewardDoc = querySnapshot.docs[0];
            setExistingReward({
              id: rewardDoc.id,
              ...rewardDoc.data()
            } as ExistingReward);
          }
        }
      } catch (error) {
        console.error("Error checking introductory reward:", error);
        toast({
          title: "Error",
          description: "Failed to retrieve your introductory reward information.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingReward();
  }, [user?.uid, open, toast]);

  const handleStepChange = (step: number) => {
    // Basic validation for step 1
    if (step > 1 && currentStep === 1) {
      if (!formData.rewardName.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter a reward name",
          variant: "destructive"
        })
        return
      }
      if (!formData.description.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter a reward description",
          variant: "destructive"
        })
        return
      }
      if (rewardType === "freeItem" && !formData.itemName.trim()) {
        toast({
          title: "Missing information",
          description: "Please enter the free item name",
          variant: "destructive"
        })
        return
      }
      if (!formData.pin.trim() || formData.pin.length !== 4 || !/^\d+$/.test(formData.pin)) {
        toast({
          title: "Invalid PIN",
          description: "Please enter a 4-digit PIN code",
          variant: "destructive"
        })
        return
      }
    }

    setCurrentStep(step)
  }

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create rewards.",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Check if merchant already has an introductory reward
      const merchantRef = doc(db, 'merchants', user.uid)
      const merchantDoc = await getDoc(merchantRef)
      const merchantData = merchantDoc.data()

      if (merchantData?.hasIntroductoryReward) {
        toast({
          title: "Introductory Reward Already Exists",
          description: "You've already created an introductory reward. You can only have one per merchant.",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      const timestamp = new Date()
      
      // Create the reward data
      const rewardData = {
        rewardName: formData.rewardName,
        description: formData.description,
        type: rewardType,
        isIntroductoryReward: true,
        fundedByTapLoyalty: true,
        maxValue: 5.00,
        itemName: rewardType === "freeItem" ? formData.itemName : "",
        voucherAmount: rewardType === "voucher" ? 5.00 : 0,
        itemValue: rewardType === "freeItem" ? 5.00 : 0,
        pin: formData.pin,
        isActive: true,
        status: "active",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        merchantId: user.uid,
        rewardVisibility: "global",
        pointsCost: 0, // Free for first-time customers
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        limitations: [
          {
            type: "customerLimit",
            value: 1
          }
        ]
      }

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const newRewardRef = await addDoc(merchantRewardsRef, rewardData)
      
      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: newRewardRef.id
      }
      
      // Update the merchant's reward with the ID
      await setDoc(
        doc(db, 'merchants', user.uid, 'rewards', newRewardRef.id),
        { ...rewardWithId }
      )

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      )
      
      // Update merchant document to indicate they have an introductory reward
      await setDoc(
        merchantRef,
        { hasIntroductoryReward: true, introductoryRewardId: newRewardRef.id },
        { merge: true }
      )
      
      toast({
        title: "Introductory Reward Created",
        description: "Your introductory reward has been successfully created and is now available to new customers.",
      })
      
      // Use instantClose for smooth transition
      setInstantClose(true);
      onOpenChange(false)
      
      // Navigate to the reward details page
      router.push(`/store/${newRewardRef.id}`)
    } catch (error) {
      console.error("Error creating introductory reward:", error)
      toast({
        title: "Error",
        description: "Failed to create introductory reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to view reward details
  const handleViewReward = () => {
    if (existingReward?.id) {
      // Use instantClose for smooth transition
      setInstantClose(true);
      onOpenChange(false);
      router.push(`/store/${existingReward.id}`);
    }
  }

  // Function to delete introductory reward
  const handleDeleteReward = async () => {
    if (!user || !existingReward?.id) return;
    
    try {
      setIsSubmitting(true);
      
      // Update the merchant document to remove the introductory reward flag
      const merchantRef = doc(db, 'merchants', user.uid);
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: false,
          introductoryRewardId: null 
        },
        { merge: true }
      );
      
      // We don't actually delete the reward from the database,
      // just mark it as no longer being the introductory reward
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', existingReward.id);
      await setDoc(
        rewardRef,
        { 
          isIntroductoryReward: false,
          // Keep the reward as a normal reward
          status: existingReward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      // Also update in the top-level rewards collection
      const globalRewardRef = doc(db, 'rewards', existingReward.id);
      await setDoc(
        globalRewardRef,
        { 
          isIntroductoryReward: false,
          status: existingReward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      toast({
        title: "Introductory Reward Removed",
        description: "Your introductory reward has been removed. You can now create a new one.",
      });
      
      // Reset the existing reward
      setExistingReward(null);
      
    } catch (error) {
      console.error("Error deleting introductory reward:", error);
      toast({
        title: "Error",
        description: "Failed to remove the introductory reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return "Invalid date";
    }
  }

  // Render the existing reward view
  const renderExistingReward = () => {
    if (!existingReward) return null;
    
    return (
      <div className="flex-1 overflow-auto p-5">
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">You Already Have an Introductory Reward</p>
              <p className="text-xs">Your business already has an active introductory reward. You can only have one introductory reward at a time.</p>
            </div>
          </div>
        </div>
        
        <Card className="shadow-sm rounded-md overflow-hidden">
          <CardHeader className="pb-2 px-4 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{existingReward.rewardName}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{existingReward.description}</CardDescription>
              </div>
              <Badge variant={existingReward.isActive ? "default" : "secondary"} className="text-xs px-2 py-0.5">
                {existingReward.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="pb-2 px-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  {existingReward.type === "voucher" ? (
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Coffee className="h-4 w-4 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 leading-none">
                    {existingReward.type === "voucher" ? "Gift Voucher" : "Free Item"}
                  </p>
                  <p className="text-sm font-medium leading-tight">
                    {existingReward.type === "voucher" 
                      ? `$${existingReward.voucherAmount?.toFixed(2)} credit` 
                      : existingReward.itemName}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 leading-none">Cost to Customer</p>
                  <p className="text-sm font-medium leading-tight">Free (0 points)</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-2 border-t pt-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">Created On</p>
                <p className="text-sm">{formatDate(existingReward.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Redemptions</p>
                <p className="text-sm">{existingReward.redemptionCount} times</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-3 border-t pt-3 pb-4 px-4">
            <div className="flex w-full justify-between">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
                Close
              </Button>
              <Button className="bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs h-8" size="sm" onClick={handleViewReward}>
                View Details
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </div>
            
            <div className="w-full pt-1">
              <Button 
                variant="destructive" 
                className="w-full flex items-center justify-center gap-1 text-xs h-8"
                size="sm"
                onClick={handleDeleteReward}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash className="h-3 w-3" />
                    <span>Remove Introductory Reward</span>
                  </>
                )}
              </Button>
              <p className="text-[10px] text-gray-500 text-center mt-1 px-2">
                This will remove your current introductory reward but keep it as a normal reward.
                You can then create a new introductory reward.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetOverlay className="bg-black/30" />
      <SheetContent
        side="right"
        className="w-full sm:max-w-md md:max-w-xl lg:max-w-2xl p-0 overflow-hidden flex flex-col rounded-md"
        data-instant-close={instantClose ? "true" : "false"}
      >
        <div className="flex-none px-6 py-3 border-b">
          <SheetHeader className="mb-1">
            <SheetTitle className="text-xl">
              <span className="text-blue-500">
                {existingReward ? "View" : "Create"}
              </span> Introductory Reward
            </SheetTitle>
            <SheetDescription className="text-sm">
              {existingReward 
                ? "Manage your existing introductory reward for new customers"
                : "Welcome new customers with a special first-visit reward"}
            </SheetDescription>
          </SheetHeader>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin h-6 w-6 border-3 border-blue-200 rounded-full border-t-blue-600"></div>
              <p className="text-xs text-gray-500">Loading...</p>
            </div>
          </div>
        ) : existingReward ? (
          renderExistingReward()
        ) : (
          <Tabs value={`step${currentStep}`} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-none px-6 pt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="step1" className="text-xs py-1.5">
                  1. Create Reward
                </TabsTrigger>
                <TabsTrigger value="step2" className="text-xs py-1.5">
                  2. Review & Submit
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-4 pb-6">
                <TabsContent value="step1" className="mt-0 space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800 space-y-1">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">About Introductory Rewards</p>
                        <p>This special reward is funded by Tap Loyalty (up to $5 value) and helps attract new customers to your business.</p>
                        <p className="mt-1">Each new customer can redeem <strong>only one</strong> introductory reward across the entire platform, so make yours compelling!</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div>
                      <Label className="text-sm">Reward Type</Label>
                      <div className="grid grid-cols-2 gap-3 mt-1.5">
                        <div
                          className={cn(
                            "border rounded-md p-3 cursor-pointer transition-all",
                            rewardType === "voucher" 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => setRewardType("voucher")}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center",
                              rewardType === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                            )}>
                              <DollarSign className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Gift Voucher</p>
                              <p className="text-xs text-gray-500">$5 credit toward purchase</p>
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            "border rounded-md p-3 cursor-pointer transition-all",
                            rewardType === "freeItem" 
                              ? "border-blue-500 bg-blue-50" 
                              : "border-gray-200 hover:border-gray-300"
                          )}
                          onClick={() => setRewardType("freeItem")}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center",
                              rewardType === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                            )}>
                              <Coffee className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Free Item</p>
                              <p className="text-xs text-gray-500">Item up to $5 value</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="rewardName" className="text-sm">Reward Name</Label>
                      <Input
                        id="rewardName"
                        placeholder={rewardType === "voucher" ? "e.g., Welcome $5 Voucher" : "e.g., Free Coffee for New Customers"}
                        value={formData.rewardName}
                        onChange={(e) => setFormData({...formData, rewardName: e.target.value})}
                        className="h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="description" className="text-sm">Description</Label>
                      <Textarea
                        id="description"
                        placeholder={rewardType === "voucher" 
                          ? "e.g., Enjoy $5 off your first purchase as a welcome gift from us!" 
                          : "e.g., Welcome to our store! Enjoy a free coffee on your first visit."}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        className="min-h-[70px] text-sm"
                      />
                    </div>

                    {rewardType === "freeItem" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="itemName" className="text-sm">Free Item Name</Label>
                        <Input
                          id="itemName"
                          placeholder="e.g., Regular Coffee, Pastry, etc."
                          value={formData.itemName}
                          onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                          className="h-9"
                        />
                        <p className="text-xs text-gray-500 mt-1">Item must be valued at $5 or less</p>
                      </div>
                    )}

                    {rewardType === "voucher" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="voucherAmount" className="text-sm">Voucher Amount</Label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <span className="text-gray-500">$</span>
                          </div>
                          <Input
                            id="voucherAmount"
                            type="text"
                            className="pl-7 bg-gray-50 h-9"
                            value="5.00"
                            disabled
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Fixed value: $5.00 (funded by Tap Loyalty)</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="pin" className="text-sm">Redemption PIN</Label>
                      <Input
                        id="pin"
                        type="text"
                        maxLength={4}
                        placeholder="4-digit PIN"
                        value={formData.pin}
                        onChange={(e) => {
                          // Only allow digits
                          const value = e.target.value.replace(/\D/g, '');
                          setFormData({...formData, pin: value});
                        }}
                        className="h-9"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter a 4-digit PIN that will be required when redeeming this reward
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="step2" className="mt-0 space-y-4">
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">How Introductory Rewards Work</p>
                        <ul className="list-disc pl-4 space-y-1 mt-1">
                          <li>This reward is <strong>funded by Tap Loyalty</strong> (up to $5 value)</li>
                          <li>It will be prominently featured to new customers on the platform</li>
                          <li>Each customer can redeem only one introductory reward across all merchants</li>
                          <li>You'll be reimbursed for the reward value when it's redeemed</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h3 className="font-medium text-sm">Reward Preview</h3>
                    </div>
                    <div className="p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="font-medium text-sm">{formData.rewardName}</p>
                          <p className="text-gray-600 text-xs">{formData.description}</p>
                        </div>
                        <div className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          Introductory
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          {rewardType === "voucher" ? (
                            <DollarSign className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Coffee className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">
                            {rewardType === "voucher" ? "Gift Voucher" : "Free Item"}
                          </p>
                          <p className="text-sm font-medium leading-tight">
                            {rewardType === "voucher" 
                              ? `$${formData.voucherAmount} credit` 
                              : formData.itemName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">Cost to Customer</p>
                          <p className="text-sm font-medium leading-tight">Free (0 points)</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">Eligibility</p>
                          <p className="text-sm font-medium leading-tight">First-time customers only</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
            
            <div className="flex-none px-6 py-3 border-t">
              <div className="flex justify-between items-center w-full">
                {currentStep === 1 ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      size="sm"
                      className="text-xs h-8"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handleStepChange(2)}
                      className="bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs h-8"
                      size="sm"
                    >
                      Continue
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => handleStepChange(1)}
                      size="sm"
                      className="text-xs h-8"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs h-8"
                      size="sm"
                    >
                      {isSubmitting ? (
                        <>Creating Reward...</>
                      ) : (
                        <>Create Introductory Reward</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  )
} 