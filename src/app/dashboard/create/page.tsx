"use client"

import { Card } from "@/components/ui/card"
import { 
  Sparkles, 
  MessageSquare, 
  Settings, 
  ImagePlus, 
  Repeat,
  ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"

const createActions = [
  {
    title: "Individual Reward",
    description: "Create a one-time reward for your customers",
    icon: Sparkles,
    href: "/dashboard/create/reward",
    color: "blue"
  },
  {
    title: "Recurring Reward",
    description: "Set up rewards that repeat on a schedule",
    icon: Repeat,
    href: "/dashboard/create/recurring",
    color: "purple"
  },
  {
    title: "Broadcast Message",
    description: "Send updates to all your customers",
    icon: MessageSquare,
    href: "/dashboard/create/broadcast",
    color: "green"
  },
  {
    title: "Homepage Banner",
    description: "Update your store's featured content",
    icon: ImagePlus,
    href: "/dashboard/create/banner",
    color: "orange"
  },
  {
    title: "Point Rule",
    description: "Configure earning and redemption rules",
    icon: Settings,
    href: "/dashboard/create/rules",
    color: "red"
  }
]

export default function CreatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose what you'd like to create for your loyalty program.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {createActions.map((action) => (
          <Card 
            key={action.title}
            className="p-6 hover:border-[#007AFF] hover:shadow-sm cursor-pointer transition-all group relative overflow-hidden"
            onClick={() => window.location.href = action.href}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                    <action.icon className="h-6 w-6 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-[#007AFF] transition-colors" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
} 