"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc, getDoc, query, where, getDocs } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gift, Sparkles, Coffee, DollarSign, ShoppingBag, Info, CheckCircle, ArrowRight, Edit, Trash, AlertCircle, ExternalLink, Plus, ChevronDown, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { format } from "date-fns"

interface IntroductoryRewardPopupProps {
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

const MAX_INTRODUCTORY_REWARDS = 3;

export function IntroductoryRewardPopup({ open, onOpenChange }: IntroductoryRewardPopupProps) {
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
  const [existingRewards, setExistingRewards] = useState<ExistingReward[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [expandedRewards, setExpandedRewards] = useState<Record<string, boolean>>({})
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Check existing introductory rewards
  useEffect(() => {
    const checkExistingRewards = async () => {
      if (!user?.uid || !open) return;
      
      setIsLoading(true);
      try {
        // Search for all introductory rewards for this merchant
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards');
        const q = query(rewardsRef, where("isIntroductoryReward", "==", true));
        const querySnapshot = await getDocs(q);
        
        const rewards: ExistingReward[] = [];
        querySnapshot.forEach((doc) => {
          rewards.push({
            id: doc.id,
            ...doc.data()
          } as ExistingReward);
        });
        
        // Sort by creation date (newest first)
        rewards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setExistingRewards(rewards);
        
        // If they have no rewards or less than max, show create form by default
        setShowCreateForm(rewards.length === 0);
        
        // Reset expanded state - all collapsed by default
        setExpandedRewards({});
        
      } catch (error) {
        console.error("Error checking introductory rewards:", error);
        toast({
          title: "Error",
          description: "Failed to retrieve your introductory rewards information.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkExistingRewards();
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

      // Check if merchant already has the maximum number of introductory rewards
      if (existingRewards.length >= MAX_INTRODUCTORY_REWARDS) {
        toast({
          title: "Maximum Introductory Rewards Reached",
          description: `You can only have up to ${MAX_INTRODUCTORY_REWARDS} introductory rewards. Please remove one to create a new one.`,
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
      
      // Update merchant document with introductory rewards info
      const merchantRef = doc(db, 'merchants', user.uid);
      const merchantDoc = await getDoc(merchantRef);
      const merchantData = merchantDoc.data();
      
      // Update the introductory rewards array
      const currentIntroRewardIds = merchantData?.introductoryRewardIds || [];
      const updatedIntroRewardIds = [...currentIntroRewardIds, newRewardRef.id];
      
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: true,
          introductoryRewardIds: updatedIntroRewardIds,
          introductoryRewardCount: updatedIntroRewardIds.length
        },
        { merge: true }
      )
      
      toast({
        title: "Introductory Reward Created",
        description: "Your introductory reward has been successfully created and is now available to new customers.",
      })
      
      // Reset form
      setFormData({
        rewardName: "",
        description: "",
        itemName: "",
        voucherAmount: "5.00",
        itemValue: "5.00",
        pin: ""
      })
      setCurrentStep(1)
      setShowCreateForm(false)
      
      // Refresh the existing rewards list
      const updatedRewards = [...existingRewards, rewardWithId as ExistingReward];
      setExistingRewards(updatedRewards);
      
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
  const handleViewReward = (rewardId: string) => {
    onOpenChange(false);
    router.push(`/store/${rewardId}`);
  }

  // Function to toggle reward active status
  const handleToggleActive = async (reward: ExistingReward) => {
    if (!user) return;
    
    try {
      const newActiveStatus = !reward.isActive;
      
      // Update the reward in the merchant's subcollection
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', reward.id);
      await setDoc(
        rewardRef,
        { 
          isActive: newActiveStatus,
          status: newActiveStatus ? 'active' : 'inactive',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      
      // Also update in the top-level rewards collection
      const globalRewardRef = doc(db, 'rewards', reward.id);
      await setDoc(
        globalRewardRef,
        { 
          isActive: newActiveStatus,
          status: newActiveStatus ? 'active' : 'inactive',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
      
      // Update local state
      setExistingRewards(prev => 
        prev.map(r => 
          r.id === reward.id 
            ? { ...r, isActive: newActiveStatus, status: newActiveStatus ? 'active' : 'inactive' }
            : r
        )
      );
      
      toast({
        title: newActiveStatus ? "Reward Activated" : "Reward Deactivated",
        description: `Your introductory reward has been ${newActiveStatus ? 'activated' : 'deactivated'}.`,
      });
      
    } catch (error) {
      console.error("Error toggling reward status:", error);
      toast({
        title: "Error",
        description: "Failed to update reward status. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Function to delete introductory reward
  const handleDeleteReward = async (reward: ExistingReward) => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      // Get current merchant data
      const merchantRef = doc(db, 'merchants', user.uid);
      const merchantDoc = await getDoc(merchantRef);
      const merchantData = merchantDoc.data();
      
      // Update the introductory rewards array
      const currentIntroRewardIds = merchantData?.introductoryRewardIds || [];
      const updatedIntroRewardIds = currentIntroRewardIds.filter((id: string) => id !== reward.id);
      
      // Update merchant document
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: updatedIntroRewardIds.length > 0,
          introductoryRewardIds: updatedIntroRewardIds,
          introductoryRewardCount: updatedIntroRewardIds.length
        },
        { merge: true }
      );
      
      // Update the reward to no longer be an introductory reward
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', reward.id);
      await setDoc(
        rewardRef,
        { 
          isIntroductoryReward: false,
          status: reward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      // Also update in the top-level rewards collection
      const globalRewardRef = doc(db, 'rewards', reward.id);
      await setDoc(
        globalRewardRef,
        { 
          isIntroductoryReward: false,
          status: reward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      toast({
        title: "Introductory Reward Removed",
        description: "Your introductory reward has been removed successfully.",
      });
      
      // Update the existing rewards list
      setExistingRewards(prev => prev.filter(r => r.id !== reward.id));
      
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

  // Function to toggle reward expansion
  const toggleRewardExpansion = (rewardId: string) => {
    setExpandedRewards(prev => ({
      ...prev,
      [rewardId]: !prev[rewardId]
    }));
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch (e) {
      return "Invalid date";
    }
  }

  // Render the existing rewards view
  const renderExistingRewards = () => {
    return (
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800 mb-4">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Introductory Rewards ({existingRewards.length}/{MAX_INTRODUCTORY_REWARDS})</p>
              <p className="text-xs">You can create up to {MAX_INTRODUCTORY_REWARDS} different introductory rewards to welcome new customers.</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          {existingRewards.map((reward) => {
            const isExpanded = expandedRewards[reward.id] || false;
            return (
              <Card key={reward.id} className="shadow-sm rounded-md overflow-hidden border border-gray-200">
                {/* Header - Always Visible */}
                <div 
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                  onClick={() => toggleRewardExpansion(reward.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {reward.type === "voucher" ? (
                          <DollarSign className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Coffee className="h-3 w-3 text-blue-600" />
                        )}
                      </div>
                      
                      {/* Title and Type */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-gray-900 truncate">{reward.rewardName}</h3>
                        <p className="text-xs text-gray-500">
                          {reward.type === "voucher" 
                            ? `$${reward.voucherAmount?.toFixed(2)} voucher` 
                            : `Free ${reward.itemName}`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Right side controls */}
                    <div className="flex items-center gap-3">
                      {/* Active Switch */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reward.isActive}
                          onCheckedChange={() => handleToggleActive(reward)}
                          size="sm"
                        />
                        <span className="text-xs text-gray-500">
                          {reward.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      
                      {/* Expand Icon */}
                      <div className="text-gray-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Collapsible Content */}
                <div className={cn(
                  "overflow-hidden transition-all duration-200 ease-in-out",
                  isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <CardContent className="pb-2 px-4 pt-3 space-y-3">
                    {/* Description */}
                    <div>
                      <p className="text-xs text-gray-600 leading-relaxed">{reward.description}</p>
                    </div>
                    
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-3 w-3 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">Customer Cost</p>
                          <p className="text-sm font-medium leading-tight">Free (0 points)</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-3 w-3 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">Redemptions</p>
                          <p className="text-sm font-medium leading-tight">{reward.redemptionCount} times</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Info className="h-3 w-3 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">Created</p>
                          <p className="text-sm font-medium leading-tight">{formatDate(reward.createdAt)}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-3 w-3 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 leading-none">PIN Code</p>
                          <p className="text-sm font-medium leading-tight font-mono">{reward.pin}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Actions */}
                  <CardFooter className="flex space-x-2 border-t border-gray-100 pt-3 pb-3 px-4">
                    <Button 
                      className="bg-[#007AFF] hover:bg-[#0071E3] text-white text-xs h-7 flex-1" 
                      size="sm" 
                      onClick={() => handleViewReward(reward.id)}
                    >
                      View Details
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="flex items-center justify-center gap-1 text-xs h-7 px-3"
                      size="sm"
                      onClick={() => handleDeleteReward(reward)}
                      disabled={isSubmitting}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                </div>
              </Card>
            );
          })}
        </div>
        
        {existingRewards.length < MAX_INTRODUCTORY_REWARDS && (
          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-[#007AFF] hover:bg-[#0071E3] text-white text-sm h-9"
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Introductory Reward
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Render create form with left panel navigation
  const renderCreateForm = () => {
    return (
      <div className="flex h-full">
        {/* Left Panel */}
        <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
          <div className="p-6 border-b flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              <span className="text-blue-500">Create</span> Introductory Reward
            </h2>
            <p className="text-sm text-gray-600">
              Special reward for new customers
            </p>
            
            <div className="flex items-center space-x-1 mt-4">
              {[1, 2].map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => handleStepChange(step)}
                  className={`h-2 w-16 rounded-md transition-all ${
                    step === currentStep 
                      ? "bg-blue-600" 
                      : step < currentStep 
                      ? "bg-blue-300" 
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Steps navigation */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
            <nav className="space-y-2">
              {[
                { step: 1, title: "Create Reward", desc: "Set up reward details" },
                { step: 2, title: "Review & Submit", desc: "Confirm and create" }
              ].map((item) => (
                <button
                  key={item.step}
                  onClick={() => handleStepChange(item.step)}
                  className={`w-full text-left p-3 rounded-md transition-colors ${
                    currentStep === item.step
                      ? "bg-blue-100 text-blue-900 border border-blue-200"
                      : item.step < currentStep
                      ? "bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-white text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={item.step > currentStep + 1}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                      currentStep === item.step
                        ? "bg-blue-600 text-white"
                        : item.step < currentStep
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}>
                      {item.step < currentStep ? "✓" : item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {currentStep === 1 && (
              <div className="mt-0 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-xs text-blue-800 space-y-1">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">About Introductory Rewards ({existingRewards.length}/{MAX_INTRODUCTORY_REWARDS})</p>
                      <p>Create up to {MAX_INTRODUCTORY_REWARDS} special rewards funded by Tap Loyalty (up to $5 value each) to attract new customers.</p>
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
                            "h-6 w-6 rounded-full flex items-center justify-center",
                            rewardType === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                          )}>
                            <DollarSign className="h-3 w-3" />
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
                            "h-6 w-6 rounded-full flex items-center justify-center",
                            rewardType === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                          )}>
                            <Coffee className="h-3 w-3" />
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
              </div>
            )}

            {currentStep === 2 && (
              <div className="mt-0 space-y-4">
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
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        {rewardType === "voucher" ? (
                          <DollarSign className="h-3 w-3 text-blue-600" />
                        ) : (
                          <Coffee className="h-3 w-3 text-blue-600" />
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
                      <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 leading-none">Cost to Customer</p>
                        <p className="text-sm font-medium leading-tight">Free (0 points)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-3 w-3 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 leading-none">Eligibility</p>
                        <p className="text-sm font-medium leading-tight">First-time customers only</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
            <div className="flex justify-between items-center w-full">
              {currentStep === 1 ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                    size="sm"
                    className="text-xs h-8"
                  >
                    Back to List
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
        </div>
      </div>
    );
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing
          setFormData({
            rewardName: "",
            description: "",
            itemName: "",
            voucherAmount: "5.00",
            itemValue: "5.00",
            pin: ""
          })
          setCurrentStep(1)
          setShowCreateForm(false)
          setRewardType("voucher")
        }
        onOpenChange(open)
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          {!showCreateForm ? (
            <div className="flex flex-col h-full">
              <div className="flex-shrink-0 px-6 py-3 border-b">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  <span className="text-blue-500">Manage</span> Introductory Rewards
                </h2>
                <p className="text-sm text-gray-600">
                  Manage your introductory rewards ({existingRewards.length}/{MAX_INTRODUCTORY_REWARDS})
                </p>
              </div>

              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-6 w-6 border-3 border-blue-200 rounded-full border-t-blue-600"></div>
                    <p className="text-xs text-gray-500">Loading...</p>
                  </div>
                </div>
              ) : (
                renderExistingRewards()
              )}
            </div>
          ) : (
            renderCreateForm()
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 