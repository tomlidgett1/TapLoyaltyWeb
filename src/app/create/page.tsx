"use client"

import { useState, useEffect } from "react"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleSheet } from "@/components/create-points-rule-sheet"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { SendBroadcastSheet } from "@/components/send-broadcast-sheet"
import { IntroductoryRewardDialog } from "@/components/introductory-reward-dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { PageTransition } from "@/components/page-transition"
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

export default function CreatePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)
  const [introRewardOpen, setIntroRewardOpen] = useState(false)
  const [hasIntroReward, setHasIntroReward] = useState(false)

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
          action: () => setCreateRewardOpen(true)
        },
        {
          title: "Recurring Reward",
          description: "Create rewards that repeat on a schedule",
          icon: CalendarClock,
          iconColor: "text-[#007AFF]",
          action: () => setCreateRecurringOpen(true)
        },
        // Only show the Introductory Reward option if the merchant doesn't have one yet
        ...(!hasIntroReward ? [{
          title: "Introductory Reward",
          description: "Create a special welcome reward for new customers, funded by Tap Loyalty",
          icon: Sparkles,
          iconColor: "text-[#007AFF]",
          action: () => setIntroRewardOpen(true),
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
          action: () => setCreateRuleOpen(true)
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
          action: () => setCreateBannerOpen(true)
        },
        {
          title: "Send Broadcast",
          description: "Send a message to all or selected customers",
          icon: Bell,
          iconColor: "text-[#007AFF]",
          action: () => setBroadcastDialogOpen(true)
        }
      ]
    }
  ]

  return (
    <PageTransition>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
          <p className="text-gray-500 mt-2">
            Create new rewards, points rules, and communication tools for your loyalty program
          </p>
        </div>

        <div className="space-y-10">
          {createOptions.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn("p-2 rounded-lg bg-gray-100")}>
                  <section.icon className="h-6 w-6 text-[#007AFF]" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">{section.title}</h2>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {section.items.map((item, i) => (
                  <div 
                    key={i}
                    onClick={item.action}
                    className={cn(
                      "group relative overflow-hidden bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer",
                      item.highlight 
                        ? "border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50" 
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
                            : "bg-gray-50 group-hover:bg-[#007AFF]/5"
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

        {/* Dialogs */}
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
        
        <IntroductoryRewardDialog
          open={introRewardOpen}
          onOpenChange={setIntroRewardOpen}
        />
      </div>
    </PageTransition>
  )
} 