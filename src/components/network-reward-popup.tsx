"use client"

import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect, useRef } from "react"
import { X, DollarSign, ShoppingBag, Info, ArrowRight, Users, TrendingUp, Zap, Globe, ChevronUp } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface NetworkRewardPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NetworkRewardPopup({ open, onOpenChange }: NetworkRewardPopupProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [rewardType, setRewardType] = useState<"dollarOff" | "percentOff">("dollarOff")
  const [currentInfoSlide, setCurrentInfoSlide] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [infoBoxesVisible, setInfoBoxesVisible] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState({
    rewardName: "",
    description: "",
    discountValue: "10",
    minimumSpend: "50.00",
    networkPointsCost: "100",
    pin: ""
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Touch/drag handlers for carousel
  const handleStart = (clientX: number) => {
    setIsDragging(true)
    setStartX(clientX)
    setCurrentX(clientX)
  }

  const handleMove = (clientX: number) => {
    if (!isDragging) return
    setCurrentX(clientX)
  }

  const handleEnd = () => {
    if (!isDragging) return
    
    const deltaX = currentX - startX
    const threshold = 50 // Minimum distance to trigger slide change
    
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0 && currentInfoSlide > 0) {
        // Swiped right, go to previous slide
        setCurrentInfoSlide(currentInfoSlide - 1)
      } else if (deltaX < 0 && currentInfoSlide < 1) {
        // Swiped left, go to next slide
        setCurrentInfoSlide(currentInfoSlide + 1)
      }
    }
    
    setIsDragging(false)
    setStartX(0)
    setCurrentX(0)
  }

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleStart(e.clientX)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX)
  }

  const handleMouseUp = () => {
    handleEnd()
  }

  const handleMouseLeave = () => {
    if (isDragging) {
      handleEnd()
    }
  }

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    handleEnd()
  }

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX)
      }
      
      const handleGlobalMouseUp = () => {
        handleEnd()
      }
      
      document.addEventListener('mousemove', handleGlobalMouseMove)
      document.addEventListener('mouseup', handleGlobalMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove)
        document.removeEventListener('mouseup', handleGlobalMouseUp)
      }
    }
  }, [isDragging, currentX, startX, currentInfoSlide]);

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
      if (!formData.discountValue.trim() || parseFloat(formData.discountValue) <= 0) {
        toast({
          title: "Invalid discount",
          description: "Please enter a valid discount value",
          variant: "destructive"
        })
        return
      }
      if (!formData.minimumSpend.trim() || parseFloat(formData.minimumSpend) <= 0) {
        toast({
          title: "Invalid minimum spend",
          description: "Please enter a valid minimum spend amount",
          variant: "destructive"
        })
        return
      }
      if (!formData.networkPointsCost.trim() || parseFloat(formData.networkPointsCost) <= 0) {
        toast({
          title: "Invalid network points cost",
          description: "Please enter a valid network points cost",
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

      const timestamp = new Date()
      
      // Create the reward data
      const rewardData = {
        rewardName: formData.rewardName,
        description: formData.description,
        type: "discount",
        isNetworkReward: true,
        discountType: rewardType,
        discountValue: parseFloat(formData.discountValue),
        minimumSpend: parseFloat(formData.minimumSpend),
        networkPointsCost: parseFloat(formData.networkPointsCost),
        pin: formData.pin,
        isActive: true,
        status: "active",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        merchantId: user.uid,
        rewardVisibility: "global",
        pointsCost: 0,
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        eligibility: "networkCustomers"
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
      
      toast({
        title: "Network Reward Created",
        description: "Your network reward has been successfully created and is now available to Tap Network customers.",
      })
      
      onOpenChange(false)
      
      // Navigate to the reward details page
      router.push(`/store/${newRewardRef.id}`)
    } catch (error) {
      console.error("Error creating network reward:", error)
      toast({
        title: "Error",
        description: "Failed to create network reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
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
            discountValue: "10",
            minimumSpend: "50.00",
            networkPointsCost: "100",
            pin: ""
          })
          setCurrentStep(1)
          setRewardType("dollarOff")
          setCurrentInfoSlide(0)
          setInfoBoxesVisible(true)
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
          
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
              <div className="p-6 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="text-blue-500">Create</span> Network Reward
                </h2>
                <p className="text-sm text-gray-600">
                  Attract new network customers
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
                    { step: 1, title: "Create Reward", desc: "Set up discount details" },
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
                
                {/* App Preview */}
                <div className="mt-6 pt-6 border-t">
                  <div className="text-xs text-gray-500 mb-2 font-medium">Preview</div>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {formData.rewardName || "Spend $50, Get $10 Off"}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {formData.description || "Super Savings for you!"}
                        </p>
                        <div className="flex items-center gap-1 mt-1 flex-nowrap">
                          <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                            {rewardType === "dollarOff" 
                              ? `$${formData.discountValue || "10"} Off` 
                              : `${formData.discountValue || "10"}% Off`}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                            Min. spend: ${formData.minimumSpend || "50"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg px-2 py-1 ml-3">
                        <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                          {formData.networkPointsCost || "100"} 
                        </span>
                        <Globe className="w-3 h-3 ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-6 min-h-0">
                {currentStep === 1 && (
                  <div className={cn(
                    "transition-all duration-500 ease-in-out",
                    infoBoxesVisible ? "mt-0 space-y-4" : "-mt-4 space-y-4"
                  )}>
                    {/* Information Boxes with Hide Button */}
                    <div 
                      className={cn(
                        "relative overflow-hidden transition-all duration-500 ease-in-out",
                        infoBoxesVisible ? "max-h-[200px] opacity-100 mb-0" : "max-h-0 opacity-0 -mb-4"
                      )}
                    >
                      {/* Full Width Carousel with Pagination */}
                      <div className="relative">
                        <div className="overflow-hidden rounded-md">
                          <div 
                            ref={carouselRef}
                            className={cn(
                              "flex cursor-grab select-none",
                              isDragging ? "cursor-grabbing" : "transition-transform duration-300 ease-in-out"
                            )}
                            style={{ 
                              transform: `translateX(-${currentInfoSlide * 100}%)` 
                            }}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                          >
                            {/* Slide 1: About Network Rewards */}
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 w-full flex-shrink-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-start gap-2">
                                  <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-medium">About Network Rewards</p>
                                  </div>
                                </div>
                                {/* Hide Button */}
                                <button
                                  onClick={() => setInfoBoxesVisible(!infoBoxesVisible)}
                                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
                                >
                                  <ChevronUp className={cn(
                                    "h-3 w-3 transition-transform duration-300",
                                    !infoBoxesVisible && "rotate-180"
                                  )} />
                                  Hide
                                </button>
                              </div>
                              <div className="pl-6">
                                <p>Network rewards attract customers who have points at other Tap Network merchants but haven't shopped with you before.</p>
                                <p className="mt-1">These customers can use their existing points to redeem discounts at your store, bringing you <strong>new business</strong> while ensuring you still profit from each transaction.</p>
                              </div>
                            </div>

                            {/* Slide 2: Why Network Rewards Work */}
                            <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-xs text-gray-700 w-full flex-shrink-0">
                              <div className="flex items-start gap-2">
                                <TrendingUp className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Why Network Rewards Work</p>
                                  <ul className="list-disc pl-4 space-y-1 mt-1">
                                    <li>Attract customers who have <strong>never shopped with you</strong></li>
                                    <li>They can <strong>only redeem specific Network Rewards created by you</strong></li>
                                    <li>They come with <strong>spending power</strong> (points from other merchants)</li>
                                    <li>You still <strong>profit</strong> from minimum spend requirements</li>
                                    <li>Great way to <strong>acquire new loyal customers</strong></li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Pagination Dots */}
                        <div className="flex justify-center gap-2 mt-3">
                          <button
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              currentInfoSlide === 0 ? "bg-gray-600" : "bg-gray-300"
                            )}
                            onClick={() => setCurrentInfoSlide(0)}
                          />
                          <button
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              currentInfoSlide === 1 ? "bg-gray-600" : "bg-gray-300"
                            )}
                            onClick={() => setCurrentInfoSlide(1)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "space-y-3 transition-all duration-500 ease-in-out", 
                      infoBoxesVisible ? "pt-1" : "-mt-4"
                    )}>
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Discount Type</Label>
                          {!infoBoxesVisible && (
                            <button
                              onClick={() => setInfoBoxesVisible(true)}
                              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              <ChevronUp className="h-3 w-3 rotate-180" />
                              Show info
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-1.5">
                          <div
                            className={cn(
                              "border rounded-md p-3 cursor-pointer transition-all",
                              rewardType === "dollarOff" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => setRewardType("dollarOff")}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center",
                                rewardType === "dollarOff" ? "bg-blue-500 text-white" : "bg-gray-100"
                              )}>
                                <DollarSign className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">$ Off</p>
                                <p className="text-xs text-gray-500">Fixed dollar discount</p>
                              </div>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "border rounded-md p-3 cursor-pointer transition-all",
                              rewardType === "percentOff" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => setRewardType("percentOff")}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-7 w-7 rounded-full flex items-center justify-center",
                                rewardType === "percentOff" ? "bg-blue-500 text-white" : "bg-gray-100"
                              )}>
                                <Zap className="h-3.5 w-3.5" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">% Off</p>
                                <p className="text-xs text-gray-500">Percentage discount</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="rewardName" className="text-sm">Reward Name</Label>
                        <Input
                          id="rewardName"
                          placeholder={rewardType === "dollarOff" ? "e.g., $10 Off Your First Order" : "e.g., 20% Off Your First Purchase"}
                          value={formData.rewardName}
                          onChange={(e) => setFormData({...formData, rewardName: e.target.value})}
                          className="h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="description" className="text-sm">Description</Label>
                        <Textarea
                          id="description"
                          placeholder={rewardType === "dollarOff" 
                            ? "e.g., Welcome to our store! Get $10 off when you spend $50 or more." 
                            : "e.g., New to our store! Enjoy 20% off your first purchase when you spend $50 or more."}
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="min-h-[70px] text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="discountValue" className="text-sm">
                            {rewardType === "dollarOff" ? "Discount Amount" : "Discount Percentage"}
                          </Label>
                          <div className="relative">
                            {rewardType === "dollarOff" && (
                              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <span className="text-gray-500">$</span>
                              </div>
                            )}
                            <Input
                              id="discountValue"
                              type="text"
                              className={cn("h-9", rewardType === "dollarOff" ? "pl-7" : "")}
                              placeholder={rewardType === "dollarOff" ? "10" : "20"}
                              value={formData.discountValue}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                setFormData({...formData, discountValue: value});
                              }}
                            />
                            {rewardType === "percentOff" && (
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-500">%</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="minimumSpend" className="text-sm">Minimum Spend</Label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <span className="text-gray-500">$</span>
                            </div>
                            <Input
                              id="minimumSpend"
                              type="text"
                              className="pl-7 h-9"
                              placeholder="50.00"
                              value={formData.minimumSpend}
                              onChange={(e) => {
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                setFormData({...formData, minimumSpend: value});
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="networkPointsCost" className="text-sm">Network Points Cost</Label>
                        <Input
                          id="networkPointsCost"
                          type="text"
                          className="h-9"
                          placeholder="100"
                          value={formData.networkPointsCost}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d]/g, '');
                            setFormData({...formData, networkPointsCost: value});
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of network points customers need to redeem this reward. Points ratios are standardised across the network with $1 earning 3 points.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="pin" className="text-sm">Redemption PIN</Label>
                        <Input
                          id="pin"
                          type="text"
                          maxLength={4}
                          placeholder="4-digit PIN"
                          value={formData.pin}
                          onChange={(e) => {
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
                          <p className="font-medium">How Network Rewards Work</p>
                          <ul className="list-disc pl-4 space-y-1 mt-1">
                            <li>Available to customers with points at <strong>other Tap Network merchants</strong></li>
                            <li>Customers spend their existing network points to redeem this discount</li>
                            <li>You receive <strong>full payment</strong> for the minimum spend amount</li>
                            <li>Great way to <strong>acquire new customers</strong> and increase foot traffic</li>
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
                            Network
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 leading-none">Discount</p>
                            <p className="text-sm font-medium leading-tight">
                              {rewardType === "dollarOff" 
                                ? `$${formData.discountValue} off` 
                                : `${formData.discountValue}% off`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 leading-none">Minimum Spend</p>
                            <p className="text-sm font-medium leading-tight">${formData.minimumSpend}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Zap className="h-4 w-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 leading-none">Network Points Cost</p>
                            <p className="text-sm font-medium leading-tight">{formData.networkPointsCost} points</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-purple-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 leading-none">Eligibility</p>
                            <p className="text-sm font-medium leading-tight">Tap Network customers only</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between gap-3 max-w-5xl">
                  <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-1">
                    <Button 
                      variant="outline" 
                      onClick={() => onOpenChange(false)}
                      className="rounded-md w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    {currentStep > 1 && (
                      <Button 
                        variant="outline" 
                        onClick={() => handleStepChange(currentStep - 1)}
                        className="rounded-md w-full sm:w-auto"
                      >
                        Back
                      </Button>
                    )}
                  </div>
                  <Button 
                    onClick={() => {
                      if (currentStep < 2) {
                        handleStepChange(currentStep + 1);
                      } else {
                        handleSubmit();
                      }
                    }}
                    disabled={isSubmitting}
                    className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-md w-full sm:w-auto order-1 sm:order-2"
                  >
                    {currentStep === 2 ? (isSubmitting ? 'Creating Reward...' : 'Create Network Reward') : 'Continue'}
                    {currentStep === 1 && <ArrowRight className="ml-1 h-3 w-3" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
} 