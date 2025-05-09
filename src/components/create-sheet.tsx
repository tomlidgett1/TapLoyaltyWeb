"use client"

import React, { useState, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleSheet } from "@/components/create-points-rule-sheet"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { SendBroadcastSheet } from "@/components/send-broadcast-sheet"
import { IntroductoryRewardSheet } from "@/components/introductory-reward-sheet"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Gift, 
  Zap, 
  ArrowRight, 
  MessageSquare, 
  ImagePlus,
  Bell,
  Coffee,
  CalendarClock,
  HelpCircle,
  Store,
  Plus,
  Sparkles
} from "lucide-react"

interface CreateSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// The global variable is no longer needed since we're opening sheets immediately
// instead of waiting for the parent to close

export function CreateSheet({ open, onOpenChange }: CreateSheetProps) {
  const { user } = useAuth()
  // These states control which dialog/sheet is open
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)
  const [introRewardOpen, setIntroRewardOpen] = useState(false)
  const [hasIntroReward, setHasIntroReward] = useState(false)
  
  // State to control instant closing (without animation)
  const [instantClose, setInstantClose] = useState(false)

  // Debug logging for state changes
  useEffect(() => {
    console.log("State changes - Create sheet open:", open);
    console.log("Reward dialog open:", createRewardOpen);
    console.log("Recurring dialog open:", createRecurringOpen);
    console.log("Rule sheet open:", createRuleOpen);
    console.log("Banner dialog open:", createBannerOpen);
    console.log("Broadcast sheet open:", broadcastDialogOpen);
    console.log("Intro sheet open:", introRewardOpen);
  }, [open, createRewardOpen, createRecurringOpen, createRuleOpen, createBannerOpen, broadcastDialogOpen, introRewardOpen]);

  // When the parent is closed and we've requested instant close, we should reset the flag
  useEffect(() => {
    if (!open && instantClose) {
      // Reset the flag after the sheet is fully closed
      const timer = setTimeout(() => {
        setInstantClose(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, instantClose]);

  // Check if merchant already has an introductory reward
  useEffect(() => {
    const checkIntroReward = async () => {
      if (!user?.uid) return
      
      try {
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantDoc = await getDoc(merchantRef)
        const merchantData = merchantDoc.data()
        
        setHasIntroReward(!!merchantData?.hasIntroductoryReward)
      } catch (error) {
        console.error("Error checking introductory reward status:", error)
      }
    }
    
    checkIntroReward()
  }, [user?.uid])

  // Helper functions to set which sheet should open next and close the create sheet instantly
  const handleOpenReward = () => {
    // First, open the new sheet before closing the parent
    setCreateRewardOpen(true);
    // Then close the parent with instant close effect
    setInstantClose(true);
    onOpenChange(false);
  };
  
  const handleOpenRecurring = () => {
    setCreateRecurringOpen(true);
    setInstantClose(true);
    onOpenChange(false);
  };
  
  const handleOpenRule = () => {
    setCreateRuleOpen(true);
    setInstantClose(true);
    onOpenChange(false);
  };
  
  const handleOpenBanner = () => {
    setCreateBannerOpen(true);
    setInstantClose(true);
    onOpenChange(false);
  };
  
  const handleOpenBroadcast = () => {
    setBroadcastDialogOpen(true);
    setInstantClose(true);
    onOpenChange(false);
  };
  
  const handleOpenIntro = () => {
    setIntroRewardOpen(true);
    setInstantClose(true);
    onOpenChange(false);
  };

  const createOptions = [
    {
      title: "Rewards",
      description: "Create rewards for your customers to redeem",
      icon: Gift,
      iconColor: "text-[#007AFF]",
      bgColor: "bg-gray-50",
      items: [
        {
          title: "Individual Reward",
          description: "Create a new reward that customers can redeem with their points",
          icon: Gift,
          iconColor: "text-[#007AFF]",
          action: handleOpenReward
        },
        {
          title: "Recurring Reward",
          description: "Create rewards that repeat on a schedule",
          icon: CalendarClock,
          iconColor: "text-[#007AFF]",
          action: handleOpenRecurring
        },
        // Only show the Introductory Reward option if the merchant doesn't have one yet
        ...(!hasIntroReward ? [{
          title: "Introductory Reward",
          description: "Create a special welcome reward for new customers, funded by Tap Loyalty",
          icon: Sparkles,
          iconColor: "text-[#007AFF]",
          action: handleOpenIntro,
          highlight: true // Add a property to highlight this option
        }] : [])
      ]
    },
    {
      title: "Points Rules",
      description: "Set up how customers earn points",
      icon: Zap,
      iconColor: "text-[#007AFF]",
      bgColor: "bg-gray-50",
      items: [
        {
          title: "Points Rule",
          description: "Set up rules for how customers earn points at your business",
          icon: Zap,
          iconColor: "text-[#007AFF]",
          action: handleOpenRule
        }
      ]
    },
    {
      title: "Communication",
      description: "Connect with your customers",
      icon: Bell,
      iconColor: "text-[#007AFF]",
      bgColor: "bg-gray-50",
      items: [
        {
          title: "Create Banner",
          description: "Add a promotional banner to your customer-facing app",
          icon: ImagePlus,
          iconColor: "text-[#007AFF]",
          action: handleOpenBanner
        },
        {
          title: "Send Broadcast",
          description: "Send a message to all or selected customers",
          icon: Bell,
          iconColor: "text-[#007AFF]",
          action: handleOpenBroadcast
        }
      ]
    }
  ]

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          className={cn(
            "w-full sm:max-w-md lg:max-w-lg xl:max-w-2xl",
            "p-0 overflow-hidden flex flex-col"
          )}
          data-instant-close={instantClose}
          instantClose={instantClose}
        >
          <ScrollArea className="flex-1 h-full">
            <div className="p-6 space-y-6">
              <SheetHeader className="text-left space-y-2">
                <SheetTitle className="text-2xl font-bold">Create</SheetTitle>
                <SheetDescription className="text-base">
                  Choose what to create for your loyalty program
                </SheetDescription>
              </SheetHeader>
              
              {/* Grid of creation options */}
              {createOptions.map((section, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex gap-3 items-center">
                    <section.icon className={cn("h-5 w-5", section.iconColor)} />
                    <h2 className="text-lg font-medium">{section.title}</h2>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {section.items.map((item, j) => (
                      <div
                        key={j}
                        onClick={item.action}
                        className={cn(
                          "relative group border rounded-lg overflow-hidden cursor-pointer transition-all",
                          "hover:shadow-md hover:border-[#007AFF]/30",
                          item.highlight ? "border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50" 
                            : "border-gray-200 hover:border-[#007AFF]/30"
                        )}
                      >
                        {item.highlight && (
                          <div className="absolute top-0 right-0">
                            <div className="bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-bl-lg">
                              Special
                            </div>
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn(
                              "p-1.5 rounded-lg transition-colors",
                              item.highlight 
                                ? "bg-blue-100" 
                                : "bg-gray-50 group-hover:bg-[#007AFF]/10"
                            )}>
                              <item.icon className="h-4 w-4 text-[#007AFF]" />
                            </div>
                            <div className="h-7 w-7 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity group-hover:bg-[#007AFF]/10">
                              <Plus className="h-3.5 w-3.5 text-[#007AFF]" />
                            </div>
                          </div>
                          <h3 className="font-medium text-base mb-0.5">{item.title}</h3>
                          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#007AFF] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      
      {/* Render all dialogs and sheets outside the parent Sheet component */}
      {/* This way, they won't be affected by the parent Sheet's closing */}
      <CreateRewardDialog 
        open={createRewardOpen} 
        onOpenChange={setCreateRewardOpen}
      />
      
      <CreateRecurringRewardDialog 
        open={createRecurringOpen}
        onOpenChange={setCreateRecurringOpen}
      />
      
      <CreatePointsRuleSheet 
        open={createRuleOpen}
        onOpenChange={setCreateRuleOpen}
      />
      
      <CreateBannerDialog 
        open={createBannerOpen} 
        onOpenChange={setCreateBannerOpen} 
      />
      
      <SendBroadcastSheet
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
      />
      
      <IntroductoryRewardSheet
        open={introRewardOpen}
        onOpenChange={setIntroRewardOpen}
      />
    </>
  )
} 