"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreatePointsRuleDialog } from "@/components/create-points-rule-dialog"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { useState } from "react"
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
  Store
} from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

// Define type for options
interface OptionType {
  title: string
  description: string
  icon: React.ElementType
  type: "reward" | "program" | "recurring"
}

export default function CreatePage() {
  const router = useRouter()
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [createProgramOpen, setCreateProgramOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<OptionType | null>(null)

  const rewardOptions: OptionType[] = [
    {
      title: "Individual Reward",
      description: "Create a new reward that customers can redeem with their points",
      icon: Gift,
      type: "reward"
    },
    {
      title: "Coffee Program",
      description: "Set up a buy-X-get-1-free coffee or loyalty program",
      icon: Coffee,
      type: "program"
    },
    {
      title: "Recurring Reward",
      description: "Create rewards that repeat on a schedule",
      icon: CalendarClock,
      type: "recurring"
    }
  ]
  
  const pointsRuleOptions: OptionType[] = [
    {
      title: "Points Rule",
      description: "Set up rules for how customers earn points at your business",
      icon: Zap,
      type: "reward"
    }
  ]
  
  const communicationOptions: OptionType[] = [
    {
      title: "Create Banner",
      description: "Add a promotional banner to your customer-facing app",
      icon: ImagePlus,
      type: "reward"
    },
    {
      title: "Send Broadcast",
      description: "Send a message to all or selected customers",
      icon: Bell,
      type: "reward"
    }
  ]
  
  const renderOptionCards = (options: OptionType[]) => {
    return options.map((option) => (
      <Card 
        key={option.title}
        className="overflow-hidden border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer rounded-lg"
        onClick={() => handleOptionClick(option)}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "h-12 w-12 rounded-md flex items-center justify-center flex-shrink-0",
              option.type === "reward" && "bg-purple-50",
              option.type === "program" && "bg-amber-50",
              option.type === "recurring" && "bg-indigo-50"
            )}>
              <option.icon className={cn(
                "h-6 w-6",
                option.type === "reward" && "text-purple-500",
                option.type === "program" && "text-amber-500",
                option.type === "recurring" && "text-indigo-500"
              )} />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-medium">{option.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {option.description}
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              className="h-9 gap-2 rounded-md"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    ))
  }

  const handleOptionClick = (option: OptionType) => {
    setSelectedOption(option)
    
    if (option.type === "reward") {
      setCreateRewardOpen(true)
    } else if (option.type === "program") {
      setCreateProgramOpen(true)
    } else if (option.type === "recurring") {
      setCreateRecurringOpen(true)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Create</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create new reward programs and loyalty offers for your customers
        </p>
      </div>

      <div className="space-y-8">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-purple-500" />
            <h2 className="text-xl font-medium">Rewards</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderOptionCards(rewardOptions)}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-medium">Points Rules</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderOptionCards(pointsRuleOptions)}
          </div>
        </div>
        
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-rose-500" />
            <h2 className="text-xl font-medium">Communication</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderOptionCards(communicationOptions)}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateRewardDialog 
        open={createRewardOpen} 
        onOpenChange={setCreateRewardOpen}
      />
      
      <CreateRewardDialog 
        open={createProgramOpen} 
        onOpenChange={setCreateProgramOpen}
        defaultValues={{ type: "program" }}
      />
      
      <CreateRecurringRewardDialog 
        open={createRecurringOpen}
        onOpenChange={setCreateRecurringOpen}
      />
      
      <CreatePointsRuleDialog 
        open={createRuleOpen}
        onOpenChange={setCreateRuleOpen}
      />
    </div>
  )
} 