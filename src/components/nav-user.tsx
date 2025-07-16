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
          className="w-full justify-start gap-2 h-auto p-2 data-[state=open]:bg-gray-100 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
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
        className="w-56 rounded-lg"
        side="right"
        align="end"
        sideOffset={4}
      >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
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
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Status Section */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Status & Plan
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem 
                className="flex items-center justify-between cursor-pointer group"
                onClick={toggleStoreStatus}
                disabled={loading}
              >
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm">Status</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${status === 'active' ? 'text-green-700' : 'text-red-700'} group-hover:hidden`}>
                    {loading ? 'Updating...' : (status === 'active' ? 'Live' : 'Offline')}
                  </span>
                  <span className={`text-xs font-medium hidden group-hover:inline ${status === 'active' ? 'text-red-600' : 'text-green-600'}`}>
                    {loading ? 'Updating...' : (status === 'active' ? 'Click to Deactivate' : 'Click to Activate')}
                  </span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isNetworkStore ? (
                    <Globe className="h-3 w-3 text-blue-500" strokeWidth={2.75} />
                  ) : (
                    <Circle className="h-3 w-3 text-gray-500" strokeWidth={2.75} />
                  )}
                  <span className="text-sm">Plan</span>
                </div>
                <span className={`text-xs font-medium ${isNetworkStore ? 'text-blue-700' : 'text-gray-700'}`}>
                  {isNetworkStore ? "Network" : "Standard"}
                </span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/merchant/profile" className="cursor-pointer">
                  <User className="h-4 w-4" strokeWidth={2.75} />
                  Profile
                </Link>
              </DropdownMenuItem>
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
              <DropdownMenuItem asChild>
                <Link href="/docs" className="cursor-pointer">
                  <FileText className="h-4 w-4" strokeWidth={2.75} />
                  Help Guide
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