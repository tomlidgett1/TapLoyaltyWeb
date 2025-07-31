"use client"

import {
  ChevronsUpDown,
  LogOut,
  User,
  Settings,
  Layers,
  FileText,
  Headphones,
  Circle,
  Globe,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
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

interface NavUserProps {
  user: {
    name: string
    email: string
    avatar: string
    initials: string
    uid?: string
  }
  status: 'active' | 'inactive'
  isNetworkStore?: boolean
  onLogout: () => void
  onOpenSettings: () => void
  onOpenSupport: () => void
  onStatusChange?: (newStatus: 'active' | 'inactive') => void
}

export function NavUser({
  user,
  status,
  isNetworkStore = false,
  onLogout,
  onOpenSettings,
  onOpenSupport,
  onStatusChange,
}: NavUserProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const toggleStoreStatus = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    
    try {
      const merchantRef = doc(db, 'merchants', user.uid)
      const newStatus = status === 'active' ? 'inactive' : 'active'
      
      // Update store status
      await updateDoc(merchantRef, {
        status: newStatus
      })
      
      // Call the callback to update parent component state
      onStatusChange?.(newStatus)
      
      toast({
        title: newStatus === 'active' ? "Store Activated" : "Store Deactivated",
        description: newStatus === 'active' 
          ? "Your store is now visible to customers" 
          : "Your store is now hidden from customers",
      })
    } catch (error) {
      console.error("Error toggling store status:", error)
      toast({
        title: "Error",
        description: "Failed to update store status. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-auto p-2 data-[state=open]:bg-gray-100 hover:bg-[#007AFF]/5 focus:outline-none focus-visible:outline-none focus-visible:ring-0 transition-colors duration-200"
        >
          <div className="relative">
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="rounded-lg">{user.initials}</AvatarFallback>
            </Avatar>
            {/* Status dot in bottom right corner */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
              status === 'active' ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="truncate text-xs text-gray-500">{user.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 rounded-2xl ml-4"
        side="top"
        align="end"
        sideOffset={4}
      >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1 text-left text-sm">
                <Avatar className="h-6 w-6 rounded-md">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-md text-xs">{user.initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                </div>
                {/* Status dot on far right */}
                <div className={`h-2 w-2 rounded-full ${
                  status === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Status Section */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Status & Plan
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem 
                className="cursor-pointer group"
                onClick={toggleStoreStatus}
                disabled={loading}
              >
                <Activity className="h-4 w-4" strokeWidth={2.75} />
                <span>Status</span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-medium group-hover:hidden">
                    {loading ? 'Updating...' : (status === 'active' ? 'Live' : 'Offline')}
                  </span>
                  <span className="text-xs font-medium hidden group-hover:inline">
                    {loading ? 'Updating...' : (status === 'active' ? 'Click to Deactivate' : 'Click to Activate')}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem>
                {isNetworkStore ? (
                  <Globe className="h-4 w-4" strokeWidth={2.75} />
                ) : (
                  <Circle className="h-4 w-4" strokeWidth={2.75} />
                )}
                <span>Plan</span>
                <span className="ml-auto text-xs font-medium">
                  {isNetworkStore ? "Network" : "Standard"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
                <Settings className="h-4 w-4" strokeWidth={2.75} />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/integrations" className="cursor-pointer">
                  <Layers className="h-4 w-4" strokeWidth={2.75} />
                  Integrations
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenSupport} className="cursor-pointer">
                <Headphones className="h-4 w-4" strokeWidth={2.75} />
                Customer Support
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout} className="cursor-pointer text-red-600">
              <LogOut className="h-4 w-4" strokeWidth={2.75} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
  )
} 