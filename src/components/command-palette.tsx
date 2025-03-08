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
  Store
} from "lucide-react"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
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
    <CommandDialog open={open} onOpenChange={setOpen}>
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
            onSelect={() => runCommand(() => router.push("/create"))}
          >
            <Gift className="mr-2 h-4 w-4" />
            <span>Create Reward</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/create"))}
          >
            <Award className="mr-2 h-4 w-4" />
            <span>Create Program</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/create"))}
          >
            <Zap className="mr-2 h-4 w-4" />
            <span>Create Points Rule</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/create"))}
          >
            <Bell className="mr-2 h-4 w-4" />
            <span>Create Banner</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/create"))}
          >
            <Coffee className="mr-2 h-4 w-4" />
            <span>Create Coffee Card</span>
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
    </CommandDialog>
  )
} 