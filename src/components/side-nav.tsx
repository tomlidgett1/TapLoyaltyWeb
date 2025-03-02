"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Gift, 
  Users, 
  BarChart, 
  PlusCircle,
  Store,
  Layers,
  LogOut,
  CreditCard,
  User,
  ChevronUp,
  ChevronDown,
  Zap,
  Image,
  MessageSquare,
  ShoppingBag,
  Clock,
  Settings
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home
  },
  {
    title: "My Store",
    href: "/store",
    icon: Store,
    subItems: [
      {
        title: "Overview",
        href: "/store",
        icon: ShoppingBag
      },
      {
        title: "Activity",
        href: "/store/activity",
        icon: Clock
      },
      {
        title: "Rewards",
        href: "/store/rewards",
        icon: Gift
      },
      {
        title: "Points Rules",
        href: "/store/points-rules",
        icon: Zap
      },
      {
        title: "Banners",
        href: "/store/banners",
        icon: Image
      },
      {
        title: "Broadcast Messages",
        href: "/store/messages",
        icon: MessageSquare
      }
    ]
  },
  {
    title: "Create",
    href: "/create",
    icon: PlusCircle
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users
  },
  {
    title: "Rewards Library",
    href: "/Library",
    icon: Gift
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart
  },
  {
    title: "Integrations",
    href: "/integrations",
    icon: Layers
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings
  }
]

export function SideNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const [merchantName, setMerchantName] = useState("My Business")
  const [merchantEmail, setMerchantEmail] = useState("")
  const [initials, setInitials] = useState("MB")
  const [loading, setLoading] = useState(true)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // Initialize open state based on current path
    navItems.forEach(item => {
      if (item.subItems) {
        const isActive = item.subItems.some(subItem => 
          pathname === subItem.href || pathname.startsWith(`${subItem.href}/`)
        )
        if (isActive) {
          setOpenItems(prev => ({ ...prev, [item.title]: true }))
        }
      }
    })
  }, [pathname])

  useEffect(() => {
    async function fetchMerchantData() {
      if (!user?.uid) {
        setLoading(false)
        return
      }
      
      try {
        console.log("Fetching merchant data for user:", user.uid)
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
        
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          console.log("Merchant data:", data)
          
          // Log all fields to see what's available
          console.log("Available fields:", Object.keys(data))
          
          // Try different possible field names for the merchant name
          const possibleNameFields = ['name', 'businessName', 'merchantName', 'storeName', 'companyName', 'displayName']
          
          let foundName = null
          for (const field of possibleNameFields) {
            if (data[field]) {
              console.log(`Found name in field: ${field} = ${data[field]}`)
              foundName = data[field]
              break
            }
          }
          
          // Set the merchant name with the found field or fallback
          if (foundName) {
            setMerchantName(foundName)
          } else {
            console.log("No name field found, using default")
          }
          
          // Set email with fallbacks
          const email = data.email || user.email || ""
          setMerchantEmail(email)
          
          // Generate initials from business name
          if (foundName) {
            const words = foundName.split(' ')
            if (words.length >= 2) {
              setInitials(`${words[0][0]}${words[1][0]}`.toUpperCase())
            } else {
              setInitials(foundName.substring(0, 2).toUpperCase())
            }
          }
        } else {
          console.log("No merchant document found")
        }
      } catch (error) {
        console.error("Error fetching merchant data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMerchantData()
  }, [user])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const toggleItem = (title: string) => {
    setOpenItems(prev => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <div className="w-64 border-r h-screen flex-shrink-0 bg-white flex flex-col">
      <div className="h-16 border-b flex items-center px-4">
        <span className="text-xl font-bold">
          <span className="text-[#007AFF] font-extrabold">Tap</span>
          {' '}
          <span>Loyalty</span>
        </span>
      </div>
      
      <nav className="p-2 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isOpen = openItems[item.title] || false
            
            return (
              <li key={item.href}>
                {hasSubItems ? (
                  <Collapsible open={isOpen} onOpenChange={() => toggleItem(item.title)}>
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={cn(
                          "group flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors w-full",
                          isActive 
                            ? "bg-[#007AFF]/10 text-[#007AFF]" 
                            : "text-muted-foreground hover:bg-gray-100"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={cn("h-4 w-4", 
                            isActive 
                              ? "text-[#007AFF]" 
                              : "text-muted-foreground group-hover:text-gray-900"
                          )} />
                          <span className={isActive ? "text-[#007AFF]" : "group-hover:text-gray-900"}>
                            {item.title}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="pl-9 mt-1 space-y-1">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href || 
                            (subItem.href !== item.href && pathname.startsWith(`${subItem.href}/`)) ||
                            (subItem.href === item.href && pathname === item.href);
                          
                          return (
                            <li key={subItem.href}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                                  isSubActive 
                                    ? "bg-[#007AFF]/10 text-[#007AFF] font-medium" 
                                    : "text-muted-foreground hover:bg-gray-100 hover:text-gray-900"
                                )}
                              >
                                <subItem.icon className={cn("h-4 w-4", 
                                  isSubActive ? "text-[#007AFF]" : "text-muted-foreground"
                                )} />
                                <span>{subItem.title}</span>
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-[#007AFF]/10 text-[#007AFF]" 
                        : "text-muted-foreground hover:bg-gray-100"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", 
                      isActive 
                        ? "text-[#007AFF]" 
                        : "text-muted-foreground group-hover:text-gray-900"
                    )} />
                    <span className={isActive ? "text-[#007AFF]" : "group-hover:text-gray-900"}>
                      {item.title}
                    </span>
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
      
      {/* Profile section at bottom */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {loading ? "Loading..." : merchantName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {loading ? "" : merchantEmail}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{merchantName}</p>
              <p className="text-xs text-muted-foreground">{merchantEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>My Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
} 