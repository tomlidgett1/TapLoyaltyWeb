"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export function MerchantProfile() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [merchantName, setMerchantName] = useState<string>("")
  const [logoUrl, setLogoUrl] = useState<string>("")
  
  useEffect(() => {
    const fetchMerchantProfile = async () => {
      if (!user?.uid) return
      
      try {
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantSnap = await getDoc(merchantRef)
        
        if (merchantSnap.exists()) {
          const data = merchantSnap.data()
          setMerchantName(data.name || "")
          setLogoUrl(data.logoUrl || "")
        }
      } catch (error) {
        console.error("Error fetching merchant profile:", error)
      }
    }
    
    fetchMerchantProfile()
  }, [user])
  
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 w-full justify-start px-2 rounded-md">
          <div className="flex items-center gap-2 w-full">
            <Avatar className="h-6 w-6">
              <AvatarImage src={logoUrl} alt={merchantName} />
              <AvatarFallback className="text-xs bg-[#007AFF] text-white">
                {merchantName ? getInitials(merchantName) : "ME"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">
                {merchantName || "My Business"}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 rounded-md">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings/profile')}>
          <User className="h-4 w-4 mr-2" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 