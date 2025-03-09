"use client"

import { useState } from "react"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { SendBroadcastDialog } from "@/components/send-broadcast-dialog"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
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
  Plus
} from "lucide-react"

export default function CreatePage() {
  const router = useRouter()
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [createProgramOpen, setCreateProgramOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)

  const createOptions = [
    {
      title: "Rewards",
      description: "Create rewards for your customers to redeem",
      icon: Gift,
      iconColor: "text-purple-500",
      bgColor: "bg-purple-50",
      items: [
        {
          title: "Individual Reward",
          description: "Create a new reward that customers can redeem with their points",
          icon: Gift,
          iconColor: "text-purple-500",
          action: () => setCreateRewardOpen(true)
        },
        {
          title: "Coffee Program",
          description: "Set up a buy-X-get-1-free coffee or loyalty program",
          icon: Coffee,
          iconColor: "text-amber-500",
          action: () => setCreateProgramOpen(true)
        },
        {
          title: "Recurring Reward",
          description: "Create rewards that repeat on a schedule",
          icon: CalendarClock,
          iconColor: "text-indigo-500",
          action: () => setCreateRecurringOpen(true)
        }
      ]
    },
    {
      title: "Points Rules",
      description: "Set up how customers earn points",
      icon: Zap,
      iconColor: "text-blue-500",
      bgColor: "bg-blue-50",
      items: [
        {
          title: "Points Rule",
          description: "Set up rules for how customers earn points at your business",
          icon: Zap,
          iconColor: "text-blue-500",
          action: () => setCreateRuleOpen(true)
        }
      ]
    },
    {
      title: "Communication",
      description: "Connect with your customers",
      icon: Bell,
      iconColor: "text-rose-500",
      bgColor: "bg-rose-50",
      items: [
        {
          title: "Create Banner",
          description: "Add a promotional banner to your customer-facing app",
          icon: ImagePlus,
          iconColor: "text-green-500",
          action: () => setCreateBannerOpen(true)
        },
        {
          title: "Send Broadcast",
          description: "Send a message to all or selected customers",
          icon: Bell,
          iconColor: "text-rose-500",
          action: () => setBroadcastDialogOpen(true)
        }
      ]
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create</h1>
        <p className="text-gray-500 mt-2">
          Create new rewards, points rules, and communication tools for your loyalty program
        </p>
      </div>

      <div className="space-y-10">
        {createOptions.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("p-2 rounded-lg", section.bgColor)}>
                <section.icon className={cn("h-6 w-6", section.iconColor)} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="text-sm text-gray-500">{section.description}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {section.items.map((item, i) => (
                <div 
                  key={i}
                  onClick={item.action}
                  className="group relative overflow-hidden bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-lg bg-gray-50 group-hover:bg-opacity-80 transition-colors")}>
                        <item.icon className={cn("h-5 w-5", item.iconColor)} />
                      </div>
                      <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-4 w-4 text-gray-500" />
                      </div>
                    </div>
                    <h3 className="font-medium text-lg mb-1">{item.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
      
      <CreateRewardDialog 
        open={createProgramOpen} 
        onOpenChange={setCreateProgramOpen}
        defaultType="program"
      />
      
      <CreateRecurringRewardDialog 
        open={createRecurringOpen}
        onOpenChange={setCreateRecurringOpen}
      />
      
      <CreatePointsRuleDialog 
        open={createRuleOpen}
        onOpenChange={setCreateRuleOpen}
      />
      
      <CreateBannerDialog 
        open={createBannerOpen} 
        onOpenChange={setCreateBannerOpen} 
      />
      
      <SendBroadcastDialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
      />
    </div>
  )
} 