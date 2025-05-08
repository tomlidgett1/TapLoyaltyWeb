"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator,
  CommandShortcut
} from "@/components/ui/command"
import { DialogTitle } from "@/components/ui/dialog"
import { 
  Gift, 
  Award, 
  Settings, 
  Plus, 
  Search, 
  Tag, 
  Users, 
  BarChart, 
  MessageSquare, 
  Bell, 
  Layout, 
  Zap, 
  BookOpen,
  Coffee,
  Store,
  Repeat
} from "lucide-react"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { CreateProgramDialog } from "@/components/create-program-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { TapAiDialog } from "@/components/tap-ai-dialog"
import { CreatePointsRuleSheet } from "@/components/create-points-rule-sheet"
import { SendBroadcastSheet } from "@/components/send-broadcast-sheet"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const [createRewardOpen, setCreateRewardOpen] = useState(false)
  const [createProgramOpen, setCreateProgramOpen] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [tapAIOpen, setTapAIOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === "i" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setTapAIOpen(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="max-w-[280px] w-full mx-auto">
          <DialogTitle className="sr-only">Command Menu</DialogTitle>
          <CommandInput placeholder="Type a command or search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            <CommandGroup heading="Navigation">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard"))}
              >
                <Layout className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/store/rewards"))}
              >
                <Gift className="mr-2 h-4 w-4" />
                <span>Rewards</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/customers"))}
              >
                <Users className="mr-2 h-4 w-4" />
                <span>Customers</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/analytics"))}
              >
                <BarChart className="mr-2 h-4 w-4" />
                <span>Analytics</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/dashboard/settings"))}
              >
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="Create">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/create"))}
              >
                <Plus className="mr-2 h-4 w-4" />
                <span>Create New</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setCreateRewardOpen(true))}
              >
                <Gift className="mr-2 h-4 w-4" />
                <span>Create Reward</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setCreateProgramOpen(true))}
              >
                <Repeat className="mr-2 h-4 w-4" />
                <span>Create Program</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setCreateRuleOpen(true))}
              >
                <Zap className="mr-2 h-4 w-4" />
                <span>Create Points Rule</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setCreateBannerOpen(true))}
              >
                <Layout className="mr-2 h-4 w-4" />
                <span>Create Banner</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/create"))}
              >
                <Coffee className="mr-2 h-4 w-4" />
                <span>Create Coffee Card</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => setBroadcastOpen(true))}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>Send Broadcast</span>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator />
            
            <CommandGroup heading="Resources">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/Library"))}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                <span>Rewards Library</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/store"))}
              >
                <Store className="mr-2 h-4 w-4" />
                <span>Store</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/help"))}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </div>
      </CommandDialog>
      
      <CreateRewardDialog 
        open={createRewardOpen} 
        onOpenChange={setCreateRewardOpen} 
      />
      
      <CreateProgramDialog 
        open={createProgramOpen} 
        onOpenChange={setCreateProgramOpen} 
      />
      
      <CreateBannerDialog 
        open={createBannerOpen} 
        onOpenChange={setCreateBannerOpen} 
      />
      
      <TapAiDialog
        open={tapAIOpen}
        onOpenChange={setTapAIOpen}
      />
      
      <CreatePointsRuleSheet 
        open={createRuleOpen} 
        onOpenChange={setCreateRuleOpen} 
      />
      
      <SendBroadcastSheet 
        open={broadcastOpen} 
        onOpenChange={setBroadcastOpen} 
      />
    </>
  )
} 