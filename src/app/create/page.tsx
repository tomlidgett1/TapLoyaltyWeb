"use client"

import { Card } from "@/components/ui/card"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { useState } from "react"
import { Sparkles, Settings, ImagePlus, MessageSquare, Clock, Repeat, Bot, ChevronRight, ListFilter, Eye, HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export default function CreatePage() {
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [pointsRuleDialogOpen, setPointsRuleDialogOpen] = useState(false)
  const [recurringRewardOpen, setRecurringRewardOpen] = useState(false)

  const sections = [
    {
      title: "Rewards",
      description: "Create and manage different types of rewards for your customers",
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
        },
        {
          title: "Scheduled Reward",
          description: "Plan rewards for future campaigns",
          icon: Clock,
          action: () => console.log("Create scheduled reward")
        },
      ]
    },
    {
      title: "Program Settings",
      description: "Configure core settings for your loyalty program",
      items: [
        {
          title: "Point Rules",
          description: "Configure earning and redemption rules",
          icon: Settings,
          action: () => setPointsRuleDialogOpen(true)
        },
        {
          title: "Homepage Banner",
          description: "Update your store's featured content",
          icon: ImagePlus,
          action: () => console.log("Create banner")
        },
        {
          title: "Broadcast Message",
          description: "Send updates to all your customers",
          icon: MessageSquare,
          action: () => console.log("Create broadcast")
        }
      ]
    }
  ]

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-col">
          <div className="flex justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage your loyalty program content
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.title} className="space-y-4">
              <div className="border-b pb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-muted-foreground">{section.title}</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className={cn(
                    "h-7 text-xs",
                    "text-muted-foreground",
                    "hover:text-[#007AFF] hover:bg-transparent",
                    "transition-colors"
                  )}
                  onClick={() => console.log(`View all ${section.title}`)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  View all
                </Button>
              </div>

              <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                {section.items.map((item) => (
                  <Card 
                    key={item.title}
                    className="group cursor-pointer transition-all hover:shadow-sm hover:border-[#007AFF]/30"
                    onClick={item.action}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-4 w-4 text-[#007AFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium truncate">{item.title}</h3>
                          {item.badge && (
                            <span className={cn(
                              "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                              item.badge === "New" 
                                ? "text-[#007AFF] bg-[#007AFF]/10" 
                                : "text-green-600 bg-green-50"
                            )}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[#007AFF] transition-colors" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t pt-6">
          <Card className="bg-[#007AFF]/5 border-none">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                  <HelpCircle className="h-4 w-4 text-[#007AFF]" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">Need help getting started?</h3>
                  <p className="text-xs text-muted-foreground">
                    Check out our help guides and tutorials
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                className={cn(
                  "text-xs font-medium",
                  "text-[#007AFF]",
                  "hover:bg-[#007AFF]/10",
                  "transition-colors"
                )}
              >
                View guides
              </Button>
            </div>
          </Card>
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