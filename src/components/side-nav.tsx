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
  Settings,
  Sparkles,
  MoreVertical,
  CheckCircle,
  XCircle,
  ChevronRight
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
import { doc, getDoc, DocumentData } from "firebase/firestore"
import { signOut } from "firebase/auth"
import { auth, Auth } from "@/lib/firebase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TapAiButton } from "@/components/tap-ai-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, query, where, limit } from "firebase/firestore"

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
        title: "Memberships",
        href: "/store/memberships",
        icon: CreditCard
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
    title: "TapAI",
    href: "#",
    icon: Sparkles,
    isAI: true
  },
  {
    title: "Rewards Library",
    href: "/rewardlibrary",
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
  },
  {
    title: "Onboarding Wizard",
    href: "/onboarding",
    icon: Sparkles,
  }
]

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  href: string;
}

interface MerchantData {
  logoUrl?: string;
  tradingName?: string;
  businessEmail?: string;
  [key: string]: any;
}

export function SideNav() {
  const pathname = usePathname() || ""
  const router = useRouter()
  const { user } = useAuth()
  const [merchantName, setMerchantName] = useState("My Business")
  const [merchantEmail, setMerchantEmail] = useState("")
  const [initials, setInitials] = useState("MB")
  const [loading, setLoading] = useState(true)
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({})
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: 'reward', title: 'Create a reward', completed: false, href: '/create' },
    { id: 'banner', title: 'Create a banner', completed: false, href: '/store/banners' },
    { id: 'points', title: 'Set up a points rule', completed: false, href: '/store/points-rules' },
    { id: 'customer', title: 'Add a customer', completed: false, href: '/customers' }
  ])
  const [showChecklist, setShowChecklist] = useState(true)

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
          const data = merchantDoc.data() as MerchantData
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
          
          setMerchantData(data)
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

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.uid) return;
      
      try {
        // Check if rewards exist
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards');
        const rewardsSnapshot = await getDocs(rewardsRef);
        const hasRewards = !rewardsSnapshot.empty;
        
        // Check if banners exist
        const bannersRef = collection(db, 'merchants', user.uid, 'banners');
        const bannersSnapshot = await getDocs(bannersRef);
        const hasBanners = !bannersSnapshot.empty;
        
        // Check if points rules exist
        const pointsRulesRef = collection(db, 'merchants', user.uid, 'pointsRules');
        const pointsRulesSnapshot = await getDocs(pointsRulesRef);
        const hasPointsRules = !pointsRulesSnapshot.empty;
        
        // Check if customers exist
        const customersQuery = query(
          collection(db, 'customers'),
          where('merchantId', '==', user.uid),
          limit(1)
        );
        const customersSnapshot = await getDocs(customersQuery);
        const hasCustomers = !customersSnapshot.empty;
        
        // Update checklist items
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'reward') return { ...item, completed: hasRewards };
          if (item.id === 'banner') return { ...item, completed: hasBanners };
          if (item.id === 'points') return { ...item, completed: hasPointsRules };
          if (item.id === 'customer') return { ...item, completed: hasCustomers };
          return item;
        }));
        
        // Hide checklist if all items are completed
        if (hasRewards && hasBanners && hasPointsRules && hasCustomers) {
          // Don't hide immediately, maybe after a few days
          // For now, we'll keep it visible
        }
        
      } catch (error) {
        console.error("Error checking onboarding status:", error);
      }
    };
    
    checkOnboardingStatus();
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await signOut(auth as Auth)
      router.push('/login')
    } catch (error) {
      console.error("Error signing out:", error)
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      })
    }
  }

  const toggleItem = (title: string) => {
    setOpenItems(prev => ({ ...prev, [title]: !prev[title] }))
  }

  return (
    <div className="w-64 border-r h-screen flex-shrink-0 bg-white flex flex-col">
      <div className="h-16 border-b flex items-center px-4">
        <img
          src="/hand1.png"
          alt="Tap Loyalty Logo"
          className="w-6.2 h-7 mr-2 object-cover rounded"
        />
        <div className="flex flex-col">
          <span className="text-xl font-semibold leading-none">
            <span className="text-[#007AFF] font-extrabold">Tap</span>
            {' '}
            <span>Loyalty</span>
          </span>
          <span className="text-xs text-gray-500 mt-0.5">
            Merchant Portal
          </span>
        </div>
      </div>
      
      <nav className="p-2 flex-1 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.filter(item => !item.isAI).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isOpen = openItems[item.title] || false
            
            return (
              <li key={item.title}>
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
      
      {/* Onboarding Checklist */}
      {showChecklist && (
        <div className="px-3 py-2 mx-2 mb-3 bg-blue-50 rounded-lg">
          <Collapsible defaultOpen={true}>
            <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium text-blue-700">
              <div className="flex items-center">
                <Sparkles className="h-4 w-4 mr-2 text-blue-500" />
                <span>Getting Started</span>
              </div>
              <ChevronUp className="h-4 w-4 text-blue-500" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2">
                {checklistItems.map(item => (
                  <Link 
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between p-1.5 text-xs rounded-md hover:bg-blue-100 transition-colors"
                  >
                    <span className="text-gray-700">{item.title}</span>
                    {item.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                  </Link>
                ))}
                
                <div className="pt-1 mt-1 border-t border-blue-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 font-medium">
                      {checklistItems.filter(item => item.completed).length} of {checklistItems.length} completed
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      onClick={() => setShowChecklist(false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
      
      {/* Profile section at bottom */}
      <div className="mt-auto border-t pt-4 pb-4">
        <div className="flex items-center p-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border mr-3">
            {merchantData?.logoUrl ? (
              <img 
                src={merchantData.logoUrl} 
                alt={merchantData.tradingName || "Business Logo"} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {merchantData?.tradingName || user?.displayName || "Your Business"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {merchantData?.businessEmail || user?.email || ""}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">
                  {merchantData?.tradingName || user?.displayName || "Your Business"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {merchantData?.businessEmail || user?.email || ""}
                </p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
} 