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
  ChevronRight,
  ShieldCheck,
  Search,
  Command,
  DollarSign
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
import { signOut, Auth, getAuth } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TapAiButton } from "@/components/tap-ai-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
import { Input } from "@/components/ui/input"

// Type assertion for auth
const typedAuth: Auth = auth as Auth;

// Custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.2);
  }
`;

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
        title: "Messages",
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
    title: "Tap Agent",
    href: "/tap-agent/intro",
    icon: Sparkles,
    subItems: [
      {
        title: "Introduction",
        href: "/tap-agent/intro",
        icon: Home
      },
      {
        title: "Agent Setup",
        href: "/tap-agent/setup",
        icon: Settings
      }
    ]
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users
  },
  {
    title: "Financials",
    href: "/merchant/financials",
    icon: DollarSign
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
    title: "Admin",
    href: "/admin",
    icon: ShieldCheck
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

interface SectionState {
  [key: string]: boolean;
}

export function SideNav() {
  const pathname = usePathname() || ""
  const router = useRouter()
  const { user } = useAuth()
  const [merchantName, setMerchantName] = useState("My Business")
  const [merchantEmail, setMerchantEmail] = useState("")
  const [initials, setInitials] = useState("MB")
  const [loading, setLoading] = useState(true)
  const [merchantData, setMerchantData] = useState<MerchantData | null>(null)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: 'reward', title: 'Create a reward', completed: false, href: '/create' },
    { id: 'banner', title: 'Create a banner', completed: false, href: '/store/banners' },
    { id: 'points', title: 'Set up a points rule', completed: false, href: '/store/points-rules' },
    { id: 'customer', title: 'Add a customer', completed: false, href: '/customers' }
  ])
  const [showChecklist, setShowChecklist] = useState(true)
  const [openSections, setOpenSections] = useState<SectionState>({
    "My Store": true,
    "Tap Agent": true
  })
  const [searchQuery, setSearchQuery] = useState("")

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
      await signOut(typedAuth)
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

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="w-48 h-screen flex-shrink-0 bg-[#F5F5F5] flex flex-col">
      {/* Apply custom scrollbar styles */}
      <style jsx global>{scrollbarStyles}</style>
      
      <div className="h-16 flex items-center px-3 mb-2">
        <div className="flex items-center pl-3">
          <div className="flex flex-col">
            <span className="text-xl font-semibold leading-none">
              <span className="text-[#007AFF] font-extrabold">Tap</span>
              {' '}
              <span>Loyalty</span>
            </span>
            <span className="text-xs text-gray-500 mt-1">
              Merchant Portal
            </span>
          </div>
        </div>
      </div>
      
      {/* Search bar with Command+K shortcut */}
      <div className="px-3 pb-2">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search..." 
            className="pl-10 pr-10 h-9 w-full cursor-pointer"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => {
              e.preventDefault()
              // Simulate Command+K keypress
              const event = new KeyboardEvent('keydown', {
                key: 'k',
                metaKey: true,
                bubbles: true
              })
              document.dispatchEvent(event)
            }}
            readOnly // Make it read-only since we're using it as a button
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
            <Command className="h-3 w-3" />
            K
          </div>
        </div>
      </div>
      
      <nav className="px-2 py-1.5 flex-1 overflow-y-auto custom-scrollbar">
        <ul className="space-y-1">
          {/* Main pages without sub-items */}
          {navItems
            .filter(item => !item.isAI && !item.subItems)
            .filter(item => item.title !== "Onboarding Wizard")
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              
              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors",
                      isActive 
                        ? "bg-[#007AFF]/10 text-[#007AFF]" 
                        : "text-gray-800 hover:bg-[#007AFF]/5"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4 flex-shrink-0", 
                      isActive 
                        ? "text-[#007AFF]" 
                        : "text-gray-500 group-hover:text-[#007AFF]"
                    )} />
                    <span className={isActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                      {item.title}
                    </span>
                  </Link>
                </li>
              )
          })}
          
          {/* My Store section */}
          {navItems
            .filter(item => item.title === "My Store")
            .map((item) => (
              <li key={item.title} className="mt-3">
                <div className="px-3 mb-1">
                  <button 
                    onClick={() => toggleSection("My Store")}
                    className="text-[10px] font-medium text-gray-500 hover:text-[#007AFF] uppercase tracking-wider"
                  >
                    {item.title}
                  </button>
                </div>
                <Collapsible open={openSections["My Store"]}>
                  <CollapsibleContent>
                    <ul className="space-y-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = pathname === subItem.href || 
                          pathname.startsWith(`${item.href}/`)
                        return (
                          <li key={subItem.title}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors",
                                isSubActive 
                                  ? "bg-[#007AFF]/10 text-[#007AFF]" 
                                  : "text-gray-800 hover:bg-[#007AFF]/5"
                              )}
                            >
                              <subItem.icon className={cn("h-4 w-4 flex-shrink-0", 
                                isSubActive 
                                  ? "text-[#007AFF]" 
                                  : "text-gray-500 group-hover:text-[#007AFF]"
                              )} />
                              <span className={isSubActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                                {subItem.title}
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            ))}
          
          {/* Tap Agent section */}
          {navItems
            .filter(item => item.title === "Tap Agent")
            .map((item) => (
              <li key={item.title} className="mt-3">
                <div className="px-3 mb-1">
                  <button 
                    onClick={() => toggleSection("Tap Agent")}
                    className="text-[10px] font-medium text-gray-500 hover:text-[#007AFF] uppercase tracking-wider"
                  >
                    {item.title}
                  </button>
                </div>
                <Collapsible open={openSections["Tap Agent"]}>
                  <CollapsibleContent>
                    <ul className="space-y-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = pathname === subItem.href || 
                          pathname.startsWith(`${item.href}/`)
                        return (
                          <li key={subItem.title}>
                            <Link
                              href={subItem.href}
                              className={cn(
                                "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors",
                                isSubActive 
                                  ? "bg-[#007AFF]/10 text-[#007AFF]" 
                                  : "text-gray-800 hover:bg-[#007AFF]/5"
                              )}
                            >
                              <subItem.icon className={cn("h-4 w-4 flex-shrink-0", 
                                isSubActive 
                                  ? "text-[#007AFF]" 
                                  : "text-gray-500 group-hover:text-[#007AFF]"
                              )} />
                              <span className={isSubActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                                {subItem.title}
                              </span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            ))}
          
          {/* Settings section */}
          {/* Removing this section as Settings doesn't have subItems */}
        </ul>
      </nav>
      
      {/* Account section at the bottom */}
      <div className="mt-auto border-t border-gray-200 py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden min-w-0 max-w-[80%]">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-primary text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{merchantName}</p>
              <p className="text-xs text-muted-foreground truncate">{merchantEmail}</p>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="flex-shrink-0 ml-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/merchant/profile" className="cursor-pointer flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}