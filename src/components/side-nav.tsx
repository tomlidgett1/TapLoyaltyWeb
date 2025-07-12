"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  Home, 
  Gift, 
  Users, 
  BarChart, 
  Store,
  Layers,
  LogOut,
  User,
  ChevronDown,
  MessageSquare,
  Clock,
  Settings,
  MoreVertical,
  FileText,
  Bot,
  Rocket,
  ChevronRight,
  PanelRight,
  PanelLeft,
  PlusCircle,
  Coffee,
  Image,
  Zap,
  Sparkles,
  Inbox,
  CheckCircle,
  Circle,
  Crown,
  Star,
  Globe,
  Zap as ZapIcon,
  Headphones,
  Send,
  X
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, DocumentData } from "firebase/firestore"
import { signOut, Auth, getAuth } from "firebase/auth"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { TapAiButton } from "@/components/tap-ai-button"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { collection, getDocs, query, where, limit, onSnapshot, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"
import { CreateSheet } from "@/components/create-sheet"
import { CreateRewardSheet } from "@/components/create-reward-sheet"
import { CreateRewardPopup } from "@/components/create-reward-popup"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { SendBroadcastSheet } from "@/components/send-broadcast-sheet"
import { CreatePointsRuleSheet } from "@/components/create-points-rule-sheet"
import { IntroductoryRewardSheet } from "@/components/introductory-reward-sheet"
import { Badge } from "@/components/ui/badge"
import { SetupPopup } from "@/components/setup-popup"
import { NetworkRewardSheet } from "@/components/network-reward-sheet"
import { NetworkRewardPopup } from "@/components/network-reward-popup"
import { SendBroadcastPopup } from "@/components/send-broadcast-popup"
import { CreatePointsRulePopup } from "@/components/create-points-rule-popup"
import { IntroductoryRewardPopup } from "@/components/introductory-reward-popup"
import { CreateManualProgramDialog } from "@/components/create-manual-program-dialog"

// Get auth instance
const auth = getAuth();

// Custom scrollbar styles
const scrollbarStyles = 
  `.custom-scrollbar::-webkit-scrollbar {
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
  
  /* Hidden scrollbar styles for collapsed state */
  .scrollbar-hidden::-webkit-scrollbar,
  .scrollbar-hidden *::-webkit-scrollbar {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    background: transparent !important;
  }
  
  .scrollbar-hidden,
  .scrollbar-hidden * {
    -ms-overflow-style: none !important;
    scrollbar-width: none !important;
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
    title: "Tap Loyalty",
    href: "/store/overview",
    icon: Store
  },
  {
    title: "Plan",
    href: "/plan",
    icon: Layers
  },
  {
    title: "Agents",
    href: "/dashboard/agents",
    icon: Bot,
  },
  {
    title: "Inbox",
    href: "/dashboard/agent-inbox",
    icon: Inbox,
  },
  {
    title: "Insights",
    href: "/insights",
    icon: BarChart
  },
  {
    title: "Documents",
    href: "/notes",
    icon: FileText
  }
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
  isNetworkStore?: boolean;
  [key: string]: any;
}

interface SectionState {
  [key: string]: boolean;
}

export function SideNav({ className = "", onCollapseChange, collapsed }: { className?: string, onCollapseChange?: (collapsed: boolean) => void, collapsed?: boolean }) {
  // Add portal container for dropdown menus to the document body
  useEffect(() => {
    const portalContainer = document.getElementById('dropdown-portal');
    if (!portalContainer) {
      const div = document.createElement('div');
      div.id = 'dropdown-portal';
      div.style.position = 'relative';
      div.style.zIndex = '9999';
      document.body.appendChild(div);
    }
    
    return () => {
      const portalContainer = document.getElementById('dropdown-portal');
      if (portalContainer) {
        document.body.removeChild(portalContainer);
      }
    };
  }, []);
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
    "Tap Loyalty": false
  })
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [createRewardSheetOpen, setCreateRewardSheetOpen] = useState(false)
  const [createRewardPopupOpen, setCreateRewardPopupOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)
  const [createBannerOpen, setCreateBannerOpen] = useState(false)
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false)
  const [createRuleOpen, setCreateRuleOpen] = useState(false)
  const [introRewardOpen, setIntroRewardOpen] = useState(false)
  const [pendingInboxCount, setPendingInboxCount] = useState(0)
  const [setupPopupOpen, setSetupPopupOpen] = useState(false)
  const [networkRewardOpen, setNetworkRewardOpen] = useState(false)
  const [networkRewardPopupOpen, setNetworkRewardPopupOpen] = useState(false)
  const [sendBroadcastPopupOpen, setSendBroadcastPopupOpen] = useState(false)
  const [createPointsRulePopupOpen, setCreatePointsRulePopupOpen] = useState(false)
  const [introductoryRewardPopupOpen, setIntroductoryRewardPopupOpen] = useState(false)
  const [programTypeSelectorOpen, setProgramTypeSelectorOpen] = useState(false)
  const [createManualProgramOpen, setCreateManualProgramOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isInternalChange, setIsInternalChange] = useState(true)
  const [createDropdownOpen, setCreateDropdownOpen] = useState(false)
  const [supportBoxOpen, setSupportBoxOpen] = useState(false)
  const [supportMessage, setSupportMessage] = useState("")
  const [supportLoading, setSupportLoading] = useState(false)
  
  // Merchant status and plan state
  const [merchantStatus, setMerchantStatus] = useState<'active' | 'inactive'>('active')
  const [merchantPlan, setMerchantPlan] = useState<'light' | 'advanced' | 'pro'>('light')



  // Sync with parent's collapsed prop (external change)
  useEffect(() => {
    if (collapsed !== undefined && collapsed !== isCollapsed) {
      setIsInternalChange(false)
      setIsCollapsed(collapsed)
    }
  }, [collapsed, isCollapsed])

  // Close dropdown menus when sheets are opened/closed
  useEffect(() => {
    // Close the create dropdown when any dialog/sheet opens
    if (createSheetOpen || createRewardSheetOpen || createRewardPopupOpen || createRecurringOpen || 
        createBannerOpen || broadcastDialogOpen || createRuleOpen || introRewardOpen || 
        setupPopupOpen || networkRewardOpen || networkRewardPopupOpen || sendBroadcastPopupOpen || 
        createPointsRulePopupOpen || introductoryRewardPopupOpen || programTypeSelectorOpen || 
        createManualProgramOpen) {
      setCreateDropdownOpen(false)
    }
  }, [createSheetOpen, createRewardSheetOpen, createRewardPopupOpen, createRecurringOpen, createBannerOpen, broadcastDialogOpen, createRuleOpen, introRewardOpen, setupPopupOpen, networkRewardOpen, networkRewardPopupOpen, sendBroadcastPopupOpen, createPointsRulePopupOpen, introductoryRewardPopupOpen, programTypeSelectorOpen, createManualProgramOpen])

  // Notify parent component when collapse state changes (only for internal changes)
  useEffect(() => {
    if (isInternalChange) {
      onCollapseChange?.(isCollapsed)
    } else {
      setIsInternalChange(true) // Reset for next change
    }
  }, [isCollapsed, onCollapseChange, isInternalChange])

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
          
          // Set merchant status from database
          if (data.status) {
            setMerchantStatus(data.status as 'active' | 'inactive')
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

  // Add a useEffect to fetch pending inbox items count
  useEffect(() => {
    if (!user?.uid) return;
    
    // Create a listener for agent inbox documents with status "new"
    const agentInboxRef = collection(db, `merchants/${user.uid}/agentinbox`);
    const q = query(agentInboxRef, where("status", "==", "new"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingInboxCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching agent inbox count:", error);
      setPendingInboxCount(0);
    });
    
    return () => unsubscribe();
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

  const updateMerchantStatus = async (newStatus: 'active' | 'inactive') => {
    if (!user?.uid) return;

    try {
      const merchantRef = doc(db, 'merchants', user.uid);
      await updateDoc(merchantRef, {
        status: newStatus
      });
      
      setMerchantStatus(newStatus);
      
      toast({
        title: "Status Updated",
        description: `Store status changed to ${newStatus === 'active' ? 'Live' : 'Offline'}`,
      });
    } catch (error) {
      console.error("Error updating merchant status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim() || !user?.uid) return;

    setSupportLoading(true);
    try {
      const enquiryRef = collection(db, 'merchantenquiry');
      await addDoc(enquiryRef, {
        message: supportMessage.trim(),
        merchantId: user.uid,
        merchantName: merchantName,
        merchantEmail: merchantEmail,
        timestamp: serverTimestamp(),
        status: 'open'
      });

      toast({
        title: "Support Request Sent",
        description: "We'll get back to you soon!",
      });

      setSupportMessage("");
      setSupportBoxOpen(false);
    } catch (error) {
      console.error("Error submitting support request:", error);
      toast({
        title: "Error",
        description: "Failed to send support request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSupportLoading(false);
    }
  }

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className={cn(
      "h-screen flex-shrink-0 bg-[#F5F5F5] flex flex-col transition-all duration-300 ease-in-out",
      isCollapsed ? "w-full md:w-16" : "w-full md:w-48",
      className
    )}>
      {/* Apply all styles in a single style tag */}
      <style jsx global>{`
        ${scrollbarStyles}
        
        ${isCollapsed ? `
          /* Global styles to completely eliminate scrollbars when sidebar is collapsed */
          nav[data-scrollbar-hidden="true"]::-webkit-scrollbar,
          nav[data-scrollbar-hidden="true"] *::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }
          
          nav[data-scrollbar-hidden="true"],
          nav[data-scrollbar-hidden="true"] * {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        ` : ''}
      `}</style>
      
      <div className="h-16 flex items-end px-3 pb-2 mb-2 relative">
        <Link href="/dashboard" className="flex items-center gap-2.5 pl-2 h-8 hover:opacity-80 transition-opacity">
          <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
            <img 
              src="/taplogo.png" 
              alt="Tap Logo" 
              className="h-6 w-6 rounded-sm"
            />
          </div>
          <div className="h-8 flex items-center overflow-hidden">
            <span className={cn(
              "text-2xl font-extrabold leading-none text-[#007AFF] transition-all duration-300 ease-in-out whitespace-nowrap",
              isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75"
            )}>
              Tap
            </span>
          </div>
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsInternalChange(true)
              setIsCollapsed(!isCollapsed)
            }}
            className="h-5 w-5 p-0 hover:bg-gray-200 rounded-sm flex-shrink-0 absolute right-3 bottom-3"
            title="Collapse sidebar"
          >
            <PanelRight className="h-4 w-4 text-gray-600" />
          </Button>
        )}
      </div>
      
      {/* Create Button */}
      <div className="px-3 mb-2">
        {isCollapsed ? (
          <DropdownMenu open={createDropdownOpen} onOpenChange={setCreateDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out text-gray-800 hover:bg-[#007AFF]/5 w-full h-9"
                title="Create"
              >
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <PlusCircle className="h-4 w-4 text-gray-500 group-hover:text-[#007AFF]" />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" className="w-48">
              <DropdownMenuItem onClick={() => setCreateRewardPopupOpen(true)}>
                <Gift className="h-4 w-4 mr-2" />
                Create Reward New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNetworkRewardOpen(true)}>
                <ZapIcon className="h-4 w-4 mr-2" />
                Network Reward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProgramTypeSelectorOpen(true)}>
                <Coffee className="h-4 w-4 mr-2" />
                Create Program
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateBannerOpen(true)}>
                <Image className="h-4 w-4 mr-2" />
                New Banner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBroadcastDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateRuleOpen(true)}>
                <Zap className="h-4 w-4 mr-2" />
                New Points Rule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIntroRewardOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Intro Reward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSetupPopupOpen(true)} className="text-purple-600">
                <Settings className="w-4 h-4 mr-2" />
                Setup Popup (Dev)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <DropdownMenu open={createDropdownOpen} onOpenChange={setCreateDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className="group flex items-center justify-between w-full gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out text-gray-800 hover:bg-[#007AFF]/5 h-9"
              >
                <div className="flex items-center gap-3 h-full">
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <PlusCircle className="h-4 w-4 text-gray-500 group-hover:text-[#007AFF]" />
                  </div>
                  <div className="h-full flex items-center overflow-hidden">
                    <span className={cn(
                      "transition-all duration-300 ease-in-out whitespace-nowrap group-hover:text-[#007AFF]",
                      isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75"
                    )}>
                      Create
                    </span>
                  </div>
                </div>
                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                  <ChevronDown className={cn(
                    "h-4 w-4 transition-all duration-300 ease-in-out text-gray-500 group-hover:text-[#007AFF]",
                    isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75"
                  )} />
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setCreateRewardPopupOpen(true)}>
                <Gift className="h-4 w-4 mr-2" />
                Create Reward New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNetworkRewardPopupOpen(true)}>
                <ZapIcon className="h-4 w-4 mr-2" />
                Network Reward
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setProgramTypeSelectorOpen(true)}>
                <Coffee className="h-4 w-4 mr-2" />
                Create Program
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreateBannerOpen(true)}>
                <Image className="h-4 w-4 mr-2" />
                New Banner
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSendBroadcastPopupOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                New Message
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCreatePointsRulePopupOpen(true)}>
                <Zap className="h-4 w-4 mr-2" />
                New Points Rule
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIntroductoryRewardPopupOpen(true)}>
                <Sparkles className="w-4 h-4 mr-2" />
                Intro Reward
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSetupPopupOpen(true)} className="text-purple-600">
                <Settings className="w-4 h-4 mr-2" />
                Setup Popup (Dev)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Horizontal separator */}
      <div className="px-3 mb-2">
        <div className="border-t border-gray-200"></div>
      </div>
      
      <nav 
        className={cn(
          "px-3 py-2 flex-1",
          isCollapsed ? "" : "overflow-y-auto custom-scrollbar"
        )}
        style={isCollapsed ? {
          msOverflowStyle: "none",  /* IE and Edge */
          scrollbarWidth: "none",   /* Firefox */
          overflowY: "hidden",      /* Standard property */
          WebkitOverflowScrolling: "auto" /* Disable momentum scrolling */
        } : {}}
        {...(isCollapsed ? { 'data-scrollbar-hidden': 'true' } : {})}
      >
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = item.title === "Dashboard" 
              ? pathname === item.href // Only exact match for Dashboard
              : (pathname === item.href || pathname.startsWith(`${item.href}/`))
            
            return (
              <li key={item.title}>
                {item.subItems ? (
                  <Collapsible open={openSections[item.title] !== false}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "group flex items-center justify-between w-full gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200 ease-in-out h-9",
                          isActive 
                            ? "bg-[#007AFF]/10 text-[#007AFF]" 
                            : "text-gray-800 hover:bg-[#007AFF]/5"
                        )}
                        onClick={() => toggleSection(item.title)}
                        title={isCollapsed ? item.title : undefined}
                      >
                        <div className="flex items-center gap-3 h-full">
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            <item.icon className={cn("h-4 w-4", 
                              isActive 
                                ? "text-[#007AFF]" 
                                : "text-gray-500 group-hover:text-[#007AFF]"
                            )} />
                          </div>
                          <div className="h-full flex items-center overflow-hidden">
                            <span className={cn(
                              "transition-all duration-300 ease-in-out whitespace-nowrap",
                              isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75",
                              isActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"
                            )}>
                              {item.title}
                            </span>
                          </div>
                        </div>
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          <ChevronDown className={cn(
                            "h-4 w-4 transition-all duration-300 ease-in-out",
                            openSections[item.title] !== false ? "rotate-180" : "",
                            isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75",
                            isActive ? "text-[#007AFF]" : "text-gray-500"
                          )} />
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    {!isCollapsed && (
                      <CollapsibleContent>
                        <ul className="mt-0.5 space-y-0.5 pl-6">
                          {item.subItems.map((subItem) => {
                            const isSubActive = pathname === subItem.href || 
                              pathname.startsWith(`${subItem.href}/`)
                            
                            return (
                              <li key={subItem.title}>
                                <Link
                                  href={subItem.href}
                                  className={cn(
                                    "group flex items-center gap-3 rounded-md px-3 py-1 text-sm font-medium transition-colors h-8",
                                    isSubActive 
                                      ? "bg-[#007AFF]/10 text-[#007AFF]" 
                                      : "text-gray-700 hover:bg-[#007AFF]/5"
                                  )}
                                >
                                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                    <subItem.icon className={cn("h-4 w-4", 
                                      isSubActive 
                                        ? "text-[#007AFF]" 
                                        : "text-gray-400 group-hover:text-[#007AFF]"
                                    )} />
                                  </div>
                                  <div className="h-full flex items-center overflow-hidden">
                                    <span className={cn(
                                      "transition-all duration-300 ease-in-out whitespace-nowrap",
                                      isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75",
                                      isSubActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"
                                    )}>
                                      {subItem.title}
                                    </span>
                                  </div>
                                </Link>
                              </li>
                            )
                          })}
                        </ul>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200 ease-in-out whitespace-nowrap relative h-9",
                      isActive 
                        ? "bg-[#007AFF]/10 text-[#007AFF]" 
                        : "text-gray-800 hover:bg-[#007AFF]/5"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                      <item.icon className={cn("h-4 w-4", 
                        isActive 
                          ? "text-[#007AFF]" 
                          : "text-gray-500 group-hover:text-[#007AFF]"
                      )} />
                    </div>
                    <div className="h-full flex items-center overflow-hidden flex-1">
                      <span className={cn(
                        "transition-all duration-300 ease-in-out whitespace-nowrap",
                        isCollapsed ? "w-0 opacity-0 delay-0" : "w-auto opacity-100 delay-75",
                        isActive ? "text-[#007AFF]" : "group-hover:text-[#007AFF]"
                      )}>
                        {item.title}
                      </span>
                    </div>
                    {item.title === "Agent Inbox" && pendingInboxCount > 0 && !isCollapsed && (
                      <Badge 
                        className="ml-auto bg-blue-50 text-blue-600 border-blue-200 rounded-md px-1.5 py-0 h-5 min-w-[20px] flex items-center justify-center transition-all duration-300 ease-in-out"
                      >
                        {pendingInboxCount}
                      </Badge>
                    )}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        
        {/* Reopen button when collapsed - positioned after Documents */}
        {isCollapsed && (
          <div className="px-3 py-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsInternalChange(true)
                setIsCollapsed(false)
              }}
              className="w-full h-8 p-0 hover:bg-gray-200 rounded-md flex items-center justify-center"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        )}
      </nav>
      
      {/* Account section at the bottom */}
      <div className="mt-auto border-t border-gray-200 py-3 px-3">
          {isCollapsed ? (
            <div className="flex justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-md relative">
                    <div className="h-8 w-8 rounded-md overflow-hidden">
                      {merchantData?.logoUrl && !logoError ? (
                        <div className="w-full h-full relative">
                          <img 
                            src={merchantData.logoUrl} 
                            alt={merchantName} 
                            className="w-full h-full object-cover"
                            onError={() => setLogoError(true)}
                            onLoad={() => setLogoLoading(false)}
                            style={{ opacity: logoLoading ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }}
                          />
                          {logoLoading && (
                            <div className="absolute inset-0 bg-primary text-white text-xs flex items-center justify-center">
                              {initials}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full h-full bg-primary text-white text-xs flex items-center justify-center">
                          {initials}
                        </div>
                      )}
                    </div>
                    {/* Status indicator for collapsed view */}
                    <div className="absolute -bottom-0.5 -right-0.5">
                      {merchantStatus === 'active' ? (
                        <CheckCircle className="h-3 w-3 text-green-500 bg-white rounded-full" />
                      ) : (
                        <Circle className="h-3 w-3 text-gray-400 bg-white rounded-full" />
                      )}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/merchant/profile" className="cursor-pointer flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings" className="cursor-pointer flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/integrations" className="cursor-pointer flex items-center">
                      <Layers className="h-4 w-4 mr-2" />
                      <span>Integrations</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/docs" className="cursor-pointer flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>Help Guide</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSupportBoxOpen(true)} className="cursor-pointer">
                    <Headphones className="h-4 w-4 mr-2" />
                    <span>Customer Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Top row: Avatar, Name, Email, and Menu */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 overflow-hidden min-w-0 max-w-[80%]">
                  <div className="h-8 w-8 rounded-md overflow-hidden flex-shrink-0">
                    {merchantData?.logoUrl && !logoError ? (
                      <div className="w-full h-full relative">
                        <img 
                          src={merchantData.logoUrl} 
                          alt={merchantName} 
                          className="w-full h-full object-cover"
                          onError={() => setLogoError(true)}
                          onLoad={() => setLogoLoading(false)}
                          style={{ opacity: logoLoading ? 0 : 1, transition: 'opacity 0.2s ease-in-out' }}
                        />
                        {logoLoading && (
                          <div className="absolute inset-0 bg-primary text-white text-xs flex items-center justify-center">
                            {initials}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-primary text-white text-xs flex items-center justify-center">
                        {initials}
                      </div>
                    )}
                  </div>
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
                      <Link href="/merchant/profile" className="cursor-pointer flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/settings" className="cursor-pointer flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/integrations" className="cursor-pointer flex items-center">
                        <Layers className="h-4 w-4 mr-2" />
                        <span>Integrations</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/docs" className="cursor-pointer flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Help Guide</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSupportBoxOpen(true)} className="cursor-pointer">
                      <Headphones className="h-4 w-4 mr-2" />
                      <span>Customer Support</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Status and Plan Info */}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                {/* Status Row */}
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-gray-500">Status</span>
                  <div className="relative">
                    {/* Default status display */}
                    <div className="flex items-center gap-1.5 group-hover:opacity-0 transition-opacity duration-500 ease-out">
                      <div className={cn(
                        "h-2 w-2 rounded-full",
                        merchantStatus === 'active' ? "bg-green-500" : "bg-gray-400"
                      )} />
                      <span className={cn(
                        "text-xs font-medium",
                        merchantStatus === 'active' ? "text-green-700" : "text-gray-600"
                      )}>
                        {merchantStatus === 'active' ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    
                    {/* Hover state: Deactivate/Activate button */}
                    {merchantStatus === 'active' && (
                      <button 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out flex items-center justify-end"
                        onClick={() => updateMerchantStatus('inactive')}
                      >
                        <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-md border border-red-200 hover:bg-red-200 transition-colors whitespace-nowrap">
                          Deactivate
                        </span>
                      </button>
                    )}
                    
                    {merchantStatus === 'inactive' && (
                      <button 
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out flex items-center justify-end"
                        onClick={() => updateMerchantStatus('active')}
                      >
                        <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-md border border-green-200 hover:bg-green-200 transition-colors whitespace-nowrap">
                          Activate
                        </span>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Plan Row */}
                <div className="flex items-center justify-between group">
                  <span className="text-xs text-gray-500">Plan</span>
                  <div className="relative">
                    {/* Default plan display */}
                    <div className="flex items-center gap-1.5 group-hover:opacity-0 transition-opacity duration-500 ease-out">
                      {merchantData?.isNetworkStore ? (
                        <Globe className="h-3 w-3 text-blue-500" />
                      ) : (
                        <Circle className="h-3 w-3 text-gray-500" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        merchantData?.isNetworkStore ? "text-blue-700" : "text-gray-700"
                      )}>
                        {merchantData?.isNetworkStore ? "Tap Network" : "Tap Standard"}
                      </span>
                    </div>
                    
                    {/* Hover state: Change Plan badge */}
                    <button 
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out flex items-center justify-end"
                      onClick={() => {
                        // Add navigation to plan page or plan change modal
                        window.location.href = '/plan';
                      }}
                    >
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-md border border-blue-200 hover:bg-blue-200 transition-colors whitespace-nowrap">
                        Change Plan
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* CreateSheet component */}
      <CreateSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />
      
      {/* CreateRewardSheet component */}
      <CreateRewardSheet open={createRewardSheetOpen} onOpenChange={setCreateRewardSheetOpen} />

      {/* CreateRewardPopup component */}
      <CreateRewardPopup open={createRewardPopupOpen} onOpenChange={setCreateRewardPopupOpen} />

      {/* CreateRecurringRewardDialog component */}
      <CreateRecurringRewardDialog open={createRecurringOpen} onOpenChange={setCreateRecurringOpen} />

      {/* SendBroadcastSheet component */}
      <SendBroadcastSheet open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen} />

      {/* CreatePointsRuleSheet component */}
      <CreatePointsRuleSheet open={createRuleOpen} onOpenChange={setCreateRuleOpen} />

      {/* IntroductoryRewardSheet component */}
      <IntroductoryRewardSheet open={introRewardOpen} onOpenChange={setIntroRewardOpen} />

      {/* SetupPopup component */}
      <SetupPopup open={setupPopupOpen} onOpenChange={setSetupPopupOpen} />

      {/* NetworkRewardSheet component */}
      <NetworkRewardSheet open={networkRewardOpen} onOpenChange={setNetworkRewardOpen} />

      {/* New Popup Components */}
      <NetworkRewardPopup open={networkRewardPopupOpen} onOpenChange={setNetworkRewardPopupOpen} />
      <SendBroadcastPopup open={sendBroadcastPopupOpen} onOpenChange={setSendBroadcastPopupOpen} />
      <CreatePointsRulePopup open={createPointsRulePopupOpen} onOpenChange={setCreatePointsRulePopupOpen} />
      <IntroductoryRewardPopup open={introductoryRewardPopupOpen} onOpenChange={setIntroductoryRewardPopupOpen} />
      
      {/* CreateManualProgramDialog component */}
      <CreateManualProgramDialog open={createManualProgramOpen} onOpenChange={setCreateManualProgramOpen} />

      {/* Program Type Selector Popup */}
      {programTypeSelectorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-lg max-w-md mx-4 shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                <span style={{ color: '#007AFF' }}>Create</span> Program
              </h3>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCreateManualProgramOpen(true);
                    setProgramTypeSelectorOpen(false);
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <h4 className="font-medium text-gray-900">Custom Program</h4>
                  <p className="text-sm text-gray-600">Create a manual program with custom rewards and conditions</p>
                </button>
                
                <button
                  onClick={() => {
                    setCreateRecurringOpen(true);
                    setProgramTypeSelectorOpen(false);
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <h4 className="font-medium text-gray-900">Recurring Program</h4>
                  <p className="text-sm text-gray-600">Set up coffee programs, vouchers, or cashback rewards</p>
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setProgramTypeSelectorOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Support Input Box */}
      {supportBoxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-in fade-in duration-200">
          <div className="bg-white rounded-md max-w-md mx-4 shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Customer Support</h3>
                </div>
                <button
                  onClick={() => setSupportBoxOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                How can we help you today? Send us a message and we'll get back to you soon.
              </p>
              <textarea
                value={supportMessage}
                onChange={(e) => setSupportMessage(e.target.value)}
                placeholder="Type your question or issue here..."
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSupportSubmit();
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to send quickly
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSupportBoxOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                  disabled={supportLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSupportSubmit}
                  disabled={!supportMessage.trim() || supportLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {supportLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}