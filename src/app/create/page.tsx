"use client"

import { Card } from "@/components/ui/card"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { useState } from "react"
import { 
  Sparkles, 
  Settings, 
  ImagePlus, 
  MessageSquare, 
  Clock, 
  Repeat, 
  Bot, 
  ChevronRight,
  Rocket,
  Users,
  ArrowRight
} from "lucide-react"

export default function CreatePage() {
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [pointsRuleDialogOpen, setPointsRuleDialogOpen] = useState(false)
  const [recurringRewardOpen, setRecurringRewardOpen] = useState(false)

  const sections = [
    {
      id: "rewards",
      title: "Rewards & Incentives",
      items: [
        {
          title: "Individual Reward",
          description: "Create a single reward for your customers",
          icon: Sparkles,
          action: () => setCreateRewardOpen(true),
          badge: "Popular"
        },
        {
          title: "Recurring Reward",
          description: "Set up rewards that repeat on a schedule",
          icon: Repeat,
          action: () => setRecurringRewardOpen(true)
        },
        {
          title: "AI-Generated Reward",
          description: "Let AI help you create optimized rewards",
          icon: Bot,
          action: () => console.log("Create AI reward"),
          badge: "New"
        }
      ]
    },
    {
      id: "program",
      title: "Program Settings",
      items: [
        {
          title: "Points Rules",
          description: "Configure earning and redemption rules",
          icon: Settings,
          action: () => setPointsRuleDialogOpen(true),
          color: "orange"
        },
        {
          title: "Tiers & Levels",
          description: "Set up customer loyalty tiers",
          icon: Users,
          action: () => console.log("Create tiers"),
          color: "pink"
        }
      ]
    },
    {
      id: "marketing",
      title: "Marketing & Communication",
      items: [
        {
          title: "Homepage Banner",
          description: "Update your store's featured content",
          icon: ImagePlus,
          action: () => console.log("Create banner"),
          color: "yellow"
        },
        {
          title: "Broadcast Message",
          description: "Send updates to all your customers",
          icon: MessageSquare,
          action: () => console.log("Create broadcast"),
          color: "indigo"
        }
      ]
    }
  ]

  return (
    <div className="p-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your loyalty program content
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.id}>
              <h2 className="text-sm font-medium mb-3 text-muted-foreground">
                {section.title}
              </h2>

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {section.items.map((item) => (
                  <Card
                    key={item.title}
                    className="group cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={item.action}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          <item.icon className="h-4 w-4 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium truncate">
                              {item.title}
                            </h3>
                            {item.badge && (
                              <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <CreateRewardDialog 
        open={createRewardOpen} 
        onOpenChange={setCreateRewardOpen}
      />

      <CreatePointsRuleDialog 
        open={pointsRuleDialogOpen}
        onOpenChange={setPointsRuleDialogOpen}
      />

      <CreateRecurringRewardDialog 
        open={recurringRewardOpen}
        onOpenChange={setRecurringRewardOpen}
      />
    </div>
  )
} 