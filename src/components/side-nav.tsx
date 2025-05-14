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
  DollarSign,
  Package,
  Mail,
  FileText
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TapAiButton } from "@/components/tap-ai-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { CreateSheet } from "@/components/create-sheet"

// Get auth instance
const auth = getAuth();

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
  
  /* Avatar image styles */
  .merchant-avatar-container {
    width: 100%;
    height: 100%;
    position: relative;
    border-radius: 50%;
    overflow: hidden;
  }
  
  .merchant-avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: relative;
    z-index: 2;
  }
  
  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    font-weight: 500;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
  }
`;

// Define types for nav items structure before the navItems array
interface NavSubTab {
  title: string;
  href: string;
  icon: any;
}

interface NavSubItem {
  title: string;
  href: string;
  icon: any;
  subTabs?: NavSubTab[];
  isTab?: boolean;
}

interface NavItem {
  title: string;
  href: string;
  icon: any;
  subItems?: NavSubItem[];
  isAI?: boolean;
  openSheet?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home
  },
  {
    title: "Tap Agent",
    href: "/tap-agent/intro",
    icon: Sparkles,
  },
  {
    title: "My Store",
    href: "/store",
    icon: Store,
    subItems: [
      {
        title: "Store Overview",
        href: "/store/overview",
        icon: BarChart,
        subTabs: [
          {
            title: "Inventory",
            href: "/store/inventory",
            icon: Package
          }
        ]
      },
      {
        title: "Activity",
        href: "/store/activity",
        icon: Clock
      },
      {
        title: "Notes",
        href: "/notes",
        icon: FileText
      },
      {
        title: "Rewards",
        href: "/store/rewards",
        icon: Gift
      },
      {
        title: "Points Rules",
        href: "/store/points-rules",
        icon: Zap,
        isTab: true
      },
      {
        title: "Banners",
        href: "/store/banners",
        icon: Image,
        isTab: true
      },
      {
        title: "Memberships",
        href: "/store/memberships",
        icon: CreditCard,
        isTab: true
      },
      {
        title: "Messages",
        href: "/store/messages",
        icon: MessageSquare
      },
      {
        title: "Emails",
        href: "/store/emails",
        icon: Mail
      },
      {
        title: "Customers",
        href: "/customers",
        icon: Users
      }
    ]
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
    subItems: [
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings,
        subTabs: [
        ]
      },
      {
        title: "Integrations",
        href: "/dashboard/integrations",
        icon: Layers
      }
    ]
  },
]

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  href: string;
  openSheet?: boolean;
  isTab?: boolean;
}

interface MerchantData {
  logoUrl?: string;
  logo?: string;
  logoURL?: string;
  businessLogo?: string;
  storeLogoUrl?: string;
  imageUrl?: string;
  image?: string;
  tradingName?: string;
  businessEmail?: string;
  name?: string;
  businessName?: string;
  merchantName?: string;
  storeName?: string;
  companyName?: string;
  displayName?: string;
  email?: string;
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
  const [logoError, setLogoError] = useState(false)
  const [logoLoading, setLogoLoading] = useState(true)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    { id: 'reward', title: 'Create a reward', completed: false, href: '#', openSheet: true },
    { id: 'banner', title: 'Create a banner', completed: false, href: '/store/banners' },
    { id: 'points', title: 'Set up a points rule', completed: false, href: '/store/points-rules' },
    { id: 'customer', title: 'Add a customer', completed: false, href: '/customers' }
  ])
  const [showChecklist, setShowChecklist] = useState(true)
  const [openSections, setOpenSections] = useState<SectionState>({
    "My Store": true,
    "Tap Agent": true,
    "Settings": true
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [createSheetOpen, setCreateSheetOpen] = useState(false)

  // Reset logo states when merchantData changes
  useEffect(() => {
    setLogoError(false)
    setLogoLoading(true)
  }, [merchantData?.logoUrl])

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
          
          // Check for logo URL with various possible field names
          const possibleLogoFields = ['logoUrl', 'logo', 'logoURL', 'businessLogo', 'storeLogoUrl', 'imageUrl', 'image']
          let logoUrl = null
          
          for (const field of possibleLogoFields) {
            if (data[field] && typeof data[field] === 'string') {
              const url = data[field] as string;
              // Basic URL validation
              if (url.startsWith('http') && (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.svg') || url.includes('.webp') || url.includes('firebasestorage.googleapis.com'))) {
                console.log(`Found valid logo URL in field: ${field} = ${url}`)
                logoUrl = url
                // Add the found logo URL to the merchantData object
                data.logoUrl = logoUrl
                break
              } else {
                console.log(`Found logo field but URL seems invalid: ${field} = ${url}`)
              }
            }
          }
          
          if (!logoUrl) {
            console.log("No valid logo URL found in any expected fields")
          }
          
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
      await signOut(auth)
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
            .filter(item => item.title !== "Tap Agent" && item.title !== "Onboarding Wizard" && item.title !== "Create" && item.title !== "Financials" && item.title !== "Rewards Library")
            .map((item) => {
              const isActive = item.title === "Dashboard" 
                ? (pathname === item.href || pathname.match(/^\/dashboard\/(?!settings).*$/)) 
                : (pathname === item.href || pathname.startsWith(`${item.href}/`))
              
              return (
                <li key={item.title}>
                  {item.openSheet ? (
                    <button
                      className={cn(
                        "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors w-full text-left",
                        isActive 
                          ? "bg-[#007AFF]/10 text-[#007AFF]" 
                          : "text-gray-800 hover:bg-[#007AFF]/5"
                      )}
                      onClick={() => setCreateSheetOpen(true)}
                    >
                      <item.icon className={cn("h-4 w-4 flex-shrink-0", 
                        isActive 
                          ? "text-[#007AFF]" 
                          : "text-gray-500 group-hover:text-[#007AFF]"
                      )} />
                      <span className={isActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                        {item.title}
                      </span>
                    </button>
                  ) : (
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
                  )}
                </li>
              )
          })}
          
          {/* Tap Agent section */}
          {navItems
            .filter(item => item.title === "Tap Agent")
            .map((item) => (
              <li key={item.title} className="mt-3">
                <Link
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors",
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "bg-[#007AFF]/10 text-[#007AFF]" 
                      : "text-gray-800 hover:bg-[#007AFF]/5"
                  )}
                >
                  <item.icon className={cn("h-4 w-4 flex-shrink-0", 
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "text-[#007AFF]" 
                      : "text-gray-500 group-hover:text-[#007AFF]"
                  )} />
                  <span className={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
          
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
                          pathname.startsWith(`${subItem.href}/`)
                        
                        // Check if this item should be shown as a tab or has subtabs
                        const hasSubTabsOrIsTab = subItem.subTabs || subItem.isTab;
                        
                        // If it's marked as a tab, don't show it in the sidebar directly
                        if (subItem.isTab) {
                          return null;
                        }
                        
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
                            {/* Render subtabs if present */}
                            {subItem.subTabs && isSubActive && (
                              <ul className="pl-4 mt-1 space-y-1">
                                {subItem.subTabs.map((tab) => {
                                  const isTabActive = pathname === tab.href || 
                                    pathname.startsWith(`${tab.href}/`);
                                  return (
                                    <li key={tab.title}>
                                      <Link
                                        href={tab.href}
                                        className={cn(
                                          "group flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-normal transition-colors",
                                          isTabActive 
                                            ? "bg-[#007AFF]/10 text-[#007AFF]" 
                                            : "text-gray-800 hover:bg-[#007AFF]/5"
                                        )}
                                      >
                                        <tab.icon className={cn("h-4 w-4 flex-shrink-0", 
                                          isTabActive 
                                            ? "text-[#007AFF]" 
                                            : "text-gray-500 group-hover:text-[#007AFF]"
                                        )} />
                                        <span className={isTabActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"}>
                                          {tab.title}
                                        </span>
                                      </Link>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </li>
            ))}
          
          {/* Settings section */}
          {navItems
            .filter(item => item.title === "Settings" && item.subItems)
            .map((item) => (
              <li key={item.title} className="mt-3">
                <div className="px-3 mb-1">
                  <button 
                    onClick={() => toggleSection("Settings")}
                    className="text-[10px] font-medium text-gray-500 hover:text-[#007AFF] uppercase tracking-wider"
                  >
                    {item.title}
                  </button>
                </div>
                <Collapsible open={openSections["Settings"] !== false}>
                  <CollapsibleContent>
                    <ul className="space-y-1">
                      {item.subItems?.map((subItem) => {
                        const isSubActive = pathname === subItem.href || 
                          pathname.startsWith(`${subItem.href}/`)
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
        </ul>
      </nav>
      
      {/* Account section at the bottom */}
      <div className="mt-auto border-t border-gray-200 py-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden min-w-0 max-w-[80%]">
            <Avatar className="h-8 w-8 flex-shrink-0">
              {merchantData?.logoUrl && !logoError ? (
                <div className="merchant-avatar-container">
                  <img 
                    src={merchantData.logoUrl} 
                    alt={merchantName} 
                    className="merchant-avatar-image"
                    onError={() => setLogoError(true)}
                    onLoad={() => setLogoLoading(false)}
                    style={{ opacity: logoLoading ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }}
                  />
                  {logoLoading && (
                    <AvatarFallback className="bg-primary text-white text-xs avatar-fallback">
                      {initials}
                    </AvatarFallback>
                  )}
                </div>
              ) : (
                <AvatarFallback className="bg-primary text-white text-xs avatar-fallback">
                  {initials}
                </AvatarFallback>
              )}
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

      {/* CreateSheet component */}
      <CreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
    </div>
  )
}