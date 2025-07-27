"use client"

import {
  ChevronDown,
  PlusCircle,
  Gift,
  Zap,
  Coffee,
  Image,
  MessageSquare,
  Sparkles,
  Settings,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavCreateProps {
  isCollapsed?: boolean
  onCreateReward: () => void
  onNetworkReward: () => void
  onCreateProgram: () => void
  onCreateBanner: () => void
  onNewMessage: () => void
  onNewPointsRule: () => void
  onIntroReward: () => void
  onSetupPopup: () => void
}

export function NavCreate({
  isCollapsed = false,
  onCreateReward,
  onNetworkReward,
  onCreateProgram,
  onCreateBanner,
  onNewMessage,
  onNewPointsRule,
  onIntroReward,
  onSetupPopup,
}: NavCreateProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="group w-full justify-start gap-2 h-auto p-2 data-[state=open]:bg-gray-100 hover:bg-[#007AFF]/5 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors duration-200"
        >
          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
            <PlusCircle className="h-4 w-4 text-gray-500 group-hover:text-[#007AFF] transition-colors duration-200" strokeWidth={2.75} />
          </div>
          {!isCollapsed && (
            <>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium text-gray-800 group-hover:text-[#007AFF] transition-colors duration-200">Create</span>
              </div>
              <ChevronDown className="ml-auto size-4 text-gray-500 group-hover:text-[#007AFF] transition-colors duration-200" strokeWidth={2.75} />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-2xl"
        side={isCollapsed ? "right" : "bottom"}
        align="start"
        sideOffset={4}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Rewards Section */}
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Rewards & Programs
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreateReward} className="cursor-pointer">
            <Gift className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            Create Reward New
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNetworkReward} className="cursor-pointer">
            <Zap className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            Network Reward
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCreateProgram} className="cursor-pointer">
            <Coffee className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            Create Program
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onIntroReward} className="cursor-pointer">
            <Sparkles className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            Intro Reward
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Marketing Section */}
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Marketing & Communication
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onCreateBanner} className="cursor-pointer">
            <Image className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            New Banner
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewMessage} className="cursor-pointer">
            <MessageSquare className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            New Message
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNewPointsRule} className="cursor-pointer">
            <Zap className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            New Points Rule
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        {/* Development Section */}
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onSetupPopup} className="cursor-pointer text-purple-600">
            <Settings className="h-4 w-4 mr-2 text-gray-500" strokeWidth={2.75} />
            Setup Popup (Dev)
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 