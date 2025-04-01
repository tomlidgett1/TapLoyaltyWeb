"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gift, Sparkles, Coffee, DollarSign, ShoppingBag, Info, CheckCircle, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

interface IntroductoryRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntroductoryRewardDialog({ open, onOpenChange }: IntroductoryRewardDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [rewardType, setRewardType] = useState<"voucher" | "freeItem">("voucher")
  const [formData, setFormData] = useState({
    rewardName: "",
    description: "",
    itemName: "",
    voucherAmount: "5.00",
    itemValue: "5.00",
    pin: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Create Introductory Reward
            </DialogTitle>
            <DialogDescription className="text-blue-100 mt-2">
              Offer a special welcome gift to first-time customers, funded by Tap Loyalty
            </DialogDescription>
          </DialogHeader>
        </div>

        <Tabs value={`step${currentStep}`} className="w-full overflow-auto">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="step1" disabled>
                1. Create Reward
              </TabsTrigger>
              <TabsTrigger value="step2" disabled>
                2. Review & Submit
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-6 py-4">
            <TabsContent value="step1" className="mt-0 space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">About Introductory Rewards</p>
                    <p>This special reward is funded by Tap Loyalty (up to $5 value) and helps attract new customers to your business.</p>
                    <p className="mt-1">Each new customer can redeem <strong>only one</strong> introductory reward across the entire platform, so make yours compelling!</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div>
                  <Label>Reward Type</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-all",
                        rewardType === "voucher" 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => setRewardType("voucher")}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          rewardType === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                        )}>
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Gift Voucher</p>
                          <p className="text-sm text-gray-500">$5 credit toward purchase</p>
                        </div>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "border rounded-lg p-4 cursor-pointer transition-all",
                        rewardType === "freeItem" 
                          ? "border-blue-500 bg-blue-50" 
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => setRewardType("freeItem")}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center",
                          rewardType === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                        )}>
                          <Coffee className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Free Item</p>
                          <p className="text-sm text-gray-500">Item up to $5 value</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rewardName">Reward Name</Label>
                  <Input
                    id="rewardName"
                    placeholder={rewardType === "voucher" ? "e.g., Welcome $5 Voucher" : "e.g., Free Coffee for New Customers"}
                    value={formData.rewardName}
                    onChange={(e) => setFormData({...formData, rewardName: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder={rewardType === "voucher" 
                      ? "e.g., Enjoy $5 off your first purchase as a welcome gift from us!" 
                      : "e.g., Welcome to our store! Enjoy a free coffee on your first visit."}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="min-h-[80px]"
                  />
                </div>

                {rewardType === "freeItem" && (
                  <div className="space-y-2">
                    <Label htmlFor="itemName">Free Item Name</Label>
                    <Input
                      id="itemName"
                      placeholder="e.g., Regular Coffee, Pastry, etc."
                      value={formData.itemName}
                      onChange={(e) => setFormData({...formData, itemName: e.target.value})}
                    />
                    <p className="text-sm text-gray-500 mt-1">Item must be valued at $5 or less</p>
                  </div>
                )}

                {rewardType === "voucher" && (
                  <div className="space-y-2">
                    <Label htmlFor="voucherAmount">Voucher Amount</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <span className="text-gray-500">$</span>
                      </div>
                      <Input
                        id="voucherAmount"
                        type="text"
                        className="pl-7 bg-gray-50"
                        value="5.00"
                        disabled
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Fixed value: $5.00 (funded by Tap Loyalty)</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="pin">Redemption PIN</Label>
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
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter a 4-digit PIN that will be required when redeeming this reward
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="mt-0 space-y-6">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">How Introductory Rewards Work</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                      <li>This reward is <strong>funded by Tap Loyalty</strong> (up to $5 value)</li>
                      <li>It will be prominently featured to new customers on the platform</li>
                      <li>Each customer can redeem only one introductory reward across all merchants</li>
                      <li>You'll be reimbursed for the reward value when it's redeemed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h3 className="font-medium">Reward Preview</h3>
                </div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-lg">{formData.rewardName}</p>
                      <p className="text-gray-600 text-sm">{formData.description}</p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Introductory
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {rewardType === "voucher" ? (
                        <DollarSign className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Coffee className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">
                        {rewardType === "voucher" ? "Gift Voucher" : "Free Item"}
                      </p>
                      <p className="font-medium">
                        {rewardType === "voucher" 
                          ? `$${formData.voucherAmount} credit` 
                          : formData.itemName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Cost to Customer</p>
                      <p className="font-medium">Free (0 points)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Eligibility</p>
                      <p className="font-medium">First-time customers only</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          {currentStep === 1 ? (
            <Button 
              onClick={() => handleStepChange(2)}
              className="ml-auto"
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex w-full justify-between">
              <Button 
                variant="outline" 
                onClick={() => handleStepChange(1)}
              >
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <>Creating Reward...</>
                ) : (
                  <>Create Introductory Reward</>
                )}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 