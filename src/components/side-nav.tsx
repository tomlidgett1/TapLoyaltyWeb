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
  LogOut,
  ChevronDown,
  MessageSquare,
  Clock,
  Settings,
  FileText,
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
  X,
  Mail,
  Camera,
  Upload,
  Bell,
  Settings as SettingsIcon,
  Repeat
} from "lucide-react"
import { RiRobot3Line } from "react-icons/ri"

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

import { NetworkRewardSheet } from "@/components/network-reward-sheet"
import { NetworkRewardPopup } from "@/components/network-reward-popup"
import { SendBroadcastPopup } from "@/components/send-broadcast-popup"
import { CreatePointsRulePopup } from "@/components/create-points-rule-popup"
import { IntroductoryRewardPopup } from "@/components/introductory-reward-popup"
import { CreateManualProgramDialog } from "@/components/create-manual-program-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { SettingsDialog } from "@/components/settings-dialog"
import { NavUser } from "@/components/nav-user"
import { NavCreate } from "@/components/nav-create"
import { motion, AnimatePresence } from "framer-motion"

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
    title: "Agents",
    href: "/dashboard/agents",
    icon: RiRobot3Line,
  },
  {
    title: "Email",
    href: "/email",
    icon: Mail
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

  const [networkRewardOpen, setNetworkRewardOpen] = useState(false)
  const [networkRewardPopupOpen, setNetworkRewardPopupOpen] = useState(false)
  const [sendBroadcastPopupOpen, setSendBroadcastPopupOpen] = useState(false)
  const [createPointsRulePopupOpen, setCreatePointsRulePopupOpen] = useState(false)
  const [introductoryRewardPopupOpen, setIntroductoryRewardPopupOpen] = useState(false)
  const [programTypeSelectorOpen, setProgramTypeSelectorOpen] = useState(false)
  const [createManualProgramOpen, setCreateManualProgramOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isInternalChange, setIsInternalChange] = useState(true)

  const [supportBoxOpen, setSupportBoxOpen] = useState(false)
  const [supportMessage, setSupportMessage] = useState("")
  const [supportLoading, setSupportLoading] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  
  // Merchant status and plan state
  const [merchantStatus, setMerchantStatus] = useState<'active' | 'inactive'>('active')
  const [merchantPlan, setMerchantPlan] = useState<'light' | 'advanced' | 'pro'>('light')

  // Notification state
  const [notifications, setNotifications] = useState<{
    id: string;
    type: 'logo-missing' | 'info' | 'warning';
    title: string;
    message: string;
    dismissible: boolean;
  }[]>([])
  
  // Setup progress tracking
  const [setupProgress, setSetupProgress] = useState({
    completed: 0,
    total: 10,
    items: {
      uploadLogo: false,
      introReward: false,
      individualReward: false,
      createProgram: false,
      createBanner: false,
      pointsRule: false,
      networkReward: false,
      manualAgent: false,
      customerService: false,
      emailSummary: false
    }
  })
  
  // Audio notification
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Compute if any dialog is open to prevent backdrop flashing
  const isAnyDialogOpen = createSheetOpen || createRewardSheetOpen || createRewardPopupOpen || 
    createRecurringOpen || createBannerOpen || broadcastDialogOpen || createRuleOpen || 
    introRewardOpen || networkRewardOpen || networkRewardPopupOpen || sendBroadcastPopupOpen || 
    createPointsRulePopupOpen || introductoryRewardPopupOpen || programTypeSelectorOpen || 
    createManualProgramOpen || settingsDialogOpen

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
        networkRewardOpen || networkRewardPopupOpen || sendBroadcastPopupOpen || 
        createPointsRulePopupOpen || introductoryRewardPopupOpen || programTypeSelectorOpen || 
        createManualProgramOpen || settingsDialogOpen) {

    }
  }, [createSheetOpen, createRewardSheetOpen, createRewardPopupOpen, createRecurringOpen, createBannerOpen, broadcastDialogOpen, createRuleOpen, introRewardOpen, networkRewardOpen, networkRewardPopupOpen, sendBroadcastPopupOpen, createPointsRulePopupOpen, introductoryRewardPopupOpen, programTypeSelectorOpen, createManualProgramOpen, settingsDialogOpen])

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
        // Reset merchant data when no user
        setMerchantName("My Business")
        setMerchantEmail("")
        setInitials("MB")
        setMerchantData(null)
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

  // Listen for real-time merchant data changes (status, isNetworkStore, etc.)
  useEffect(() => {
    if (!user?.uid) {
      setMerchantStatus('active') // Reset to default
      setMerchantData(null) // Reset merchant data
      return
    }

    const merchantRef = doc(db, 'merchants', user.uid)
    const unsubscribe = onSnapshot(merchantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as MerchantData
        
        // Update merchant status
        if (data.status) {
          setMerchantStatus(data.status as 'active' | 'inactive')
        }
        
        // Update full merchant data (including isNetworkStore and other fields)
        setMerchantData(prevData => ({
          ...prevData,
          ...data
        }))
        
        // Update merchant name if it changed
        const possibleNameFields = ['name', 'businessName', 'merchantName', 'storeName', 'companyName', 'displayName']
        let foundName = null
        for (const field of possibleNameFields) {
          if (data[field]) {
            foundName = data[field]
            break
          }
        }
        if (foundName && foundName !== merchantName) {
          setMerchantName(foundName)
          
          // Update initials
          const words = foundName.split(' ')
          if (words.length >= 2) {
            setInitials(`${words[0][0]}${words[1][0]}`.toUpperCase())
          } else {
            setInitials(foundName.substring(0, 2).toUpperCase())
          }
        }
        
        // Update email if it changed
        const email = data.email || user.email || ""
        if (email !== merchantEmail) {
          setMerchantEmail(email)
        }
      }
    }, (error) => {
      console.error("Error listening to merchant data changes:", error)
    })

    return () => unsubscribe()
  }, [user?.uid, merchantName, merchantEmail])

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.uid) {
        // Reset checklist when no user
        setChecklistItems([
          { id: 'reward', title: 'Create a reward', completed: false, href: '#', openSheet: true },
          { id: 'banner', title: 'Create a banner', completed: false, href: '/store/banners' },
          { id: 'points', title: 'Set up a points rule', completed: false, href: '/store/points-rules' },
          { id: 'customer', title: 'Add a customer', completed: false, href: '/customers' }
        ]);
        return;
      }
      
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
    if (!user?.uid) {
      setPendingInboxCount(0);
      return;
    }
    
    // Create a listener for agent inbox documents with status "new"
    const agentInboxRef = collection(db, `merchants/${user.uid}/agentinbox`);
    const q = query(agentInboxRef, where("status", "==", "new"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Count only agent and customerservice types
      // and only if classification.isCustomerInquiry is not false
      const count = snapshot.docs.filter(doc => {
        const data = doc.data();
        const isCustomerInquiry = data.classification?.isCustomerInquiry !== false;
        return (data.type === 'agent' || data.type === 'customerservice') && isCustomerInquiry;
      }).length;
      
      setPendingInboxCount(count);
    }, (error) => {
      console.error("Error fetching agent inbox count:", error);
      setPendingInboxCount(0);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  // Track setup progress from get started page items
  useEffect(() => {
    if (!user?.uid) {
      setSetupProgress({
        completed: 0,
        total: 10,
        items: {
          uploadLogo: false,
          introReward: false,
          individualReward: false,
          createProgram: false,
          createBanner: false,
          pointsRule: false,
          networkReward: false,
          manualAgent: false,
          customerService: false,
          emailSummary: false
        }
      });
      return;
    }

    // Track merchant document changes (logo, intro rewards, programs)
    const merchantRef = doc(db, 'merchants', user.uid);
    const unsubscribeMerchant = onSnapshot(merchantRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        
        // Check logo
        const hasLogo = !!(data.logoUrl && typeof data.logoUrl === 'string' && data.logoUrl.trim() !== '');
        
        // Check intro rewards
        const hasIntroRewards = data.introductoryRewardIds && Array.isArray(data.introductoryRewardIds) && data.introductoryRewardIds.length > 0;
        
        // Check for active programs
        const hasActiveTransactionRewards = data.transactionRewards && Array.isArray(data.transactionRewards) && 
          data.transactionRewards.some((program: any) => program.active === true);
        const hasActiveVoucherPrograms = data.voucherPrograms && Array.isArray(data.voucherPrograms) && 
          data.voucherPrograms.some((program: any) => program.active === true);
        const hasActiveCoffeePrograms = data.coffeePrograms && Array.isArray(data.coffeePrograms) && 
          data.coffeePrograms.some((program: any) => program.active === true);
        const hasActivePrograms = hasActiveTransactionRewards || hasActiveVoucherPrograms || hasActiveCoffeePrograms;

                 setSetupProgress(prev => ({
           ...prev,
           items: {
             ...prev.items,
             uploadLogo: hasLogo,
             introReward: hasIntroRewards,
             createProgram: hasActivePrograms
           }
         }));
       }
     }, (error) => {
       console.error("Error listening to merchant document for setup progress:", error);
     });

         // Track rewards collection
     const rewardsRef = collection(db, `merchants/${user.uid}/rewards`);
     const unsubscribeRewards = onSnapshot(rewardsRef, (snapshot) => {
       const hasRewards = !snapshot.empty;
       setSetupProgress(prev => ({
         ...prev,
         items: {
           ...prev.items,
           individualReward: hasRewards,
           networkReward: hasRewards // Network rewards are also in the rewards collection
         }
       }));
     }, (error) => {
       console.error("Error listening to rewards collection:", error);
     });

     // Track banners collection
     const bannersRef = collection(db, `merchants/${user.uid}/banners`);
     const unsubscribeBanners = onSnapshot(bannersRef, (snapshot) => {
       const hasBanners = !snapshot.empty;
       setSetupProgress(prev => ({
         ...prev,
         items: {
           ...prev.items,
           createBanner: hasBanners
         }
       }));
     }, (error) => {
       console.error("Error listening to banners collection:", error);
     });

     // Track points rules collection
     const pointsRulesRef = collection(db, `merchants/${user.uid}/pointsRules`);
     const unsubscribePointsRules = onSnapshot(pointsRulesRef, (snapshot) => {
       const hasPointsRules = !snapshot.empty;
       setSetupProgress(prev => ({
         ...prev,
         items: {
           ...prev.items,
           pointsRule: hasPointsRules
         }
       }));
     }, (error) => {
       console.error("Error listening to points rules collection:", error);
     });

     // Track agents collection
     const agentsRef = collection(db, `merchants/${user.uid}/agents`);
     const unsubscribeAgents = onSnapshot(agentsRef, (snapshot) => {
       const hasAgents = !snapshot.empty;
       setSetupProgress(prev => ({
         ...prev,
         items: {
           ...prev.items,
           manualAgent: hasAgents
         }
       }));
     }, (error) => {
       console.error("Error listening to agents collection:", error);
     });

    // Track enrolled agents for customer service and email summary
    const customerServiceRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'customer-service');
    const unsubscribeCustomerService = onSnapshot(customerServiceRef, (doc) => {
      const hasCustomerService = doc.exists();
      setSetupProgress(prev => ({
        ...prev,
        items: {
          ...prev.items,
          customerService: hasCustomerService
        }
      }));
    }, (error) => {
      console.error("Error listening to customer service agent:", error);
    });

    const emailSummaryRef = doc(db, 'merchants', user.uid, 'agentsenrolled', 'email-summary');
    const unsubscribeEmailSummary = onSnapshot(emailSummaryRef, (doc) => {
      const hasEmailSummary = doc.exists();
      setSetupProgress(prev => ({
        ...prev,
        items: {
          ...prev.items,
          emailSummary: hasEmailSummary
        }
      }));
    }, (error) => {
      console.error("Error listening to email summary agent:", error);
    });

    return () => {
      unsubscribeMerchant();
      unsubscribeRewards();
      unsubscribeBanners();
      unsubscribePointsRules();
      unsubscribeAgents();
      unsubscribeCustomerService();
      unsubscribeEmailSummary();
    };
  }, [user?.uid]);

  // Calculate completed count whenever items change
  useEffect(() => {
    const completedCount = Object.values(setupProgress.items).filter(Boolean).length;
    setSetupProgress(prev => ({
      ...prev,
      completed: completedCount
    }));
  }, [setupProgress.items]);

  // Check for missing logo and show notification
  useEffect(() => {
    if (!user?.uid || !merchantData) {
      setNotifications([]);
      return;
    }

    const hasLogo = merchantData.logoUrl && 
                   typeof merchantData.logoUrl === 'string' && 
                   merchantData.logoUrl.trim() !== '' &&
                   !logoError;

    if (!hasLogo) {
      const logoNotification = {
        id: 'logo-missing',
        type: 'logo-missing' as const,
        title: 'Upload Logo',
        message: 'Add your business logo to complete your profile',
        dismissible: true
      };
      setNotifications(prev => {
        // Check if notification already exists
        const exists = prev.some(n => n.id === 'logo-missing');
        if (!exists) {
          // Play a happy chime notification sound
          if (audioRef.current) {
            audioRef.current.src = '/sounds/notification-chime.mp3'; // Default happy chime sound
            audioRef.current.volume = 0.4; // Moderate volume for the chime
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(e => console.log('Audio play failed:', e));
          }
          return [...prev, logoNotification];
        }
        return prev;
      });
    } else {
      // Remove logo notification if logo is now present
      setNotifications(prev => prev.filter(n => n.id !== 'logo-missing'));
    }
  }, [user?.uid, merchantData?.logoUrl, logoError, merchantData]);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
    if (!user?.uid) {
      console.warn("Cannot update merchant status: no authenticated user");
      return;
    }

    try {
      const merchantRef = doc(db, 'merchants', user.uid);
      await updateDoc(merchantRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // Status will be updated automatically by the real-time listener
      
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
    if (!supportMessage.trim() || !user?.uid) {
      console.warn("Cannot submit support request: no authenticated user or empty message");
      return;
    }

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
            <PanelRight className="h-4 w-4 text-gray-600" strokeWidth={2.75} />
          </Button>
        )}
      </div>
      
      {/* Create Button */}
      <div className="px-4 mb-2">
        <NavCreate
          isCollapsed={isCollapsed}
          onCreateReward={() => setCreateRewardPopupOpen(true)}
          onNetworkReward={() => isCollapsed ? setNetworkRewardOpen(true) : setNetworkRewardPopupOpen(true)}
          onCreateProgram={() => setProgramTypeSelectorOpen(true)}
          onCreateBanner={() => setCreateBannerOpen(true)}
          onNewMessage={() => isCollapsed ? setBroadcastDialogOpen(true) : setSendBroadcastPopupOpen(true)}
          onNewPointsRule={() => isCollapsed ? setCreateRuleOpen(true) : setCreatePointsRulePopupOpen(true)}
          onIntroReward={() => isCollapsed ? setIntroRewardOpen(true) : setIntroductoryRewardPopupOpen(true)}
        />
      </div>
      
      {/* Horizontal separator */}
      <div className="px-3 mb-2">
        <div className="border-t border-gray-200"></div>
      </div>
      
      <nav 
        className={cn(
          "px-3 py-1.5 flex-1",
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
                          "group flex items-center justify-between w-full gap-3 rounded-md px-3 py-1 text-sm font-[450] transition-all duration-200 ease-in-out h-8",
                          isActive 
                            ? "bg-[#007AFF]/10 text-[#007AFF]" 
                            : "text-gray-800 hover:bg-[#007AFF]/5"
                        )}
                        onClick={() => toggleSection(item.title)}
                        title={isCollapsed ? item.title : undefined}
                      >
                        <div className="flex items-center gap-3 h-full">
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                            <item.icon 
                              className={cn("h-4 w-4", 
                                isActive 
                                  ? "text-[#007AFF]" 
                                  : "text-gray-500 group-hover:text-[#007AFF]"
                              )} 
                              strokeWidth={2.75}
                              style={item.title === "Agents" ? { strokeWidth: 1 } : undefined}
                            />
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
                          )} strokeWidth={2.75} />
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
                                    "group flex items-center gap-3 rounded-md px-3 py-0.5 text-sm font-[450] transition-colors h-7",
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
                                    )} strokeWidth={2.75} />
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
                      "group flex items-center gap-3 rounded-md px-3 py-1 text-sm font-[450] transition-all duration-200 ease-in-out whitespace-nowrap relative h-8",
                      isActive 
                        ? "bg-[#007AFF]/10 text-[#007AFF]" 
                        : "text-gray-800 hover:bg-[#007AFF]/5"
                    )}
                    title={isCollapsed ? item.title : undefined}
                  >
                    <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 relative">
                      <item.icon 
                        className={cn("h-4 w-4", 
                          isActive 
                            ? "text-[#007AFF]" 
                            : "text-gray-500 group-hover:text-[#007AFF]"
                        )} 
                                                 strokeWidth={2.75}
                         style={item.title === "Agents" ? { strokeWidth: 1 } : undefined}
                      />
                      {(item.title === "Email" || item.title === "Agent Inbox") && pendingInboxCount > 0 && isCollapsed && (
                        <span className="absolute -top-1 -right-1 bg-white text-blue-600 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center border border-blue-200">
                          {pendingInboxCount > 9 ? '9+' : pendingInboxCount}
                        </span>
                      )}
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
                    {(item.title === "Agent Inbox" || item.title === "Email") && pendingInboxCount > 0 && !isCollapsed && (
                      <Badge 
                        className="ml-auto bg-white text-blue-500 border-[0.5px] border-blue-100 rounded-md px-1.5 py-0 h-4.5 min-w-[18px] flex items-center justify-center transition-all duration-300 ease-in-out text-[10px]"
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
              className="w-full h-7 p-0 hover:bg-gray-200 rounded-md flex items-center justify-center"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4 text-gray-600" strokeWidth={2.75} />
            </Button>
          </div>
        )}
      </nav>
      
      {/* Setup Progress Badge */}
      {!isCollapsed && setupProgress.completed < setupProgress.total && (
        <div className="px-3 pb-2">
          <Link 
            href="/getstarted" 
            className="block w-full p-2.5 bg-white hover:bg-gray-50 border-2 border-gray-250 rounded-lg transition-colors group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-xs font-medium text-gray-900">Setup</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600 font-medium">
                    {setupProgress.completed}/{setupProgress.total}
                  </p>
                  <ChevronRight className="h-3 w-3 text-gray-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </div>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${(setupProgress.completed / setupProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </Link>
        </div>
      )}
      
      {/* Collapsed state setup progress indicator */}
      {isCollapsed && setupProgress.completed < setupProgress.total && (
        <div className="px-3 pb-2">
          <Link 
            href="/getstarted"
            className="block w-full"
            title={`Setup Progress: ${setupProgress.completed}/${setupProgress.total} completed`}
          >
            <div className="w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full flex items-center justify-center relative transition-colors">
              <CheckCircle className="h-4 w-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {setupProgress.total - setupProgress.completed}
              </span>
            </div>
          </Link>
        </div>
      )}
      
      {/* Notification Stacker */}
      {!isCollapsed && notifications.length > 0 && (
        <div className="px-3 pb-2">
          <AnimatePresence>
            {notifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                transition={{
                  enter: {
                    duration: 0.4,
                    ease: [0.04, 0.62, 0.23, 0.98],
                    delay: index * 0.1
                  },
                  exit: {
                    duration: 0.3,
                    ease: [0.4, 0, 1, 1]
                  }
                }}
                className="mb-2"
              >
                                 <div 
                   className="block w-full px-2.5 pt-2.5 pb-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors group cursor-pointer"
                   onClick={() => setSettingsDialogOpen(true)}
                 >
                   <div className="space-y-1">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                           <Camera className="h-3 w-3 text-white" />
                         </div>
                         <p className="text-xs font-medium text-gray-900">Upload Logo</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <ChevronRight className="h-3 w-3 text-gray-500 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                       </div>
                     </div>
                     <div className="pl-7">
                       <p className="text-[10px] text-gray-600 font-medium">Required</p>
                     </div>
                   </div>
                 </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      
      {/* Collapsed state notification indicator */}
      {isCollapsed && notifications.length > 0 && (
        <div className="px-3 pb-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-full flex justify-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                backgroundColor: ["#3B82F6", "#2563EB", "#3B82F6"]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors"
              onClick={() => setIsCollapsed(false)}
              title={`${notifications.length} notification${notifications.length > 1 ? 's' : ''}`}
            >
              <Bell className="h-4 w-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </motion.div>
          </motion.div>
        </div>
      )}
      
      {/* Hidden audio element for notification sound */}
      <audio
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
      >
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGUgBz2O0/DIeCUFLIHO8tiJNwgZaLvt" type="audio/wav" />
      </audio>
      
      {/* Account section at the bottom - using NavUser component */}
      <div className="mt-auto border-t border-gray-200 p-3">
        {loading || merchantName === "My Business" ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center animate-pulse">
              <div className="w-4 h-4 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
            {!isCollapsed && (
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
                <div className="h-2 bg-gray-100 rounded animate-pulse w-16"></div>
              </div>
            )}
          </div>
        ) : (
          <NavUser 
            user={{
              name: merchantName,
              email: merchantEmail,
              avatar: merchantData?.logoUrl && !logoError ? merchantData.logoUrl : "",
              initials: initials,
              uid: user?.uid
            }}
            status={merchantStatus}
            isNetworkStore={merchantData?.isNetworkStore}
            onLogout={handleLogout}
            onOpenSettings={() => setSettingsDialogOpen(true)}
            onOpenSupport={() => setSupportBoxOpen(true)}
            onStatusChange={updateMerchantStatus}
          />
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



      {/* NetworkRewardSheet component */}
      <NetworkRewardSheet open={networkRewardOpen} onOpenChange={setNetworkRewardOpen} />

      {/* New Popup Components */}
      <NetworkRewardPopup open={networkRewardPopupOpen} onOpenChange={setNetworkRewardPopupOpen} />
      <SendBroadcastPopup open={sendBroadcastPopupOpen} onOpenChange={setSendBroadcastPopupOpen} />
      <CreatePointsRulePopup open={createPointsRulePopupOpen} onOpenChange={setCreatePointsRulePopupOpen} />
      <IntroductoryRewardPopup open={introductoryRewardPopupOpen} onOpenChange={setIntroductoryRewardPopupOpen} />
      
      {/* CreateManualProgramDialog component */}
      <CreateManualProgramDialog open={createManualProgramOpen} onOpenChange={setCreateManualProgramOpen} />

      {/* CreateBannerDialog component */}
      <CreateBannerDialog open={createBannerOpen} onOpenChange={setCreateBannerOpen} />

      {/* Program Type Selector Popup */}
      {programTypeSelectorOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-in fade-in duration-200" 
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={() => setProgramTypeSelectorOpen(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-md mx-4 shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
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
                    // Use a more elegant transition approach
                    setCreateManualProgramOpen(true);
                    // Keep the backdrop visible during transition
                    requestAnimationFrame(() => {
                      setProgramTypeSelectorOpen(false);
                    });
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <SettingsIcon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-gray-900">Custom Program</h4>
                      <p className="text-sm text-gray-600">Create a manual program with custom rewards and conditions</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    // Use a more elegant transition approach
                    setCreateRecurringOpen(true);
                    // Keep the backdrop visible during transition
                    requestAnimationFrame(() => {
                      setProgramTypeSelectorOpen(false);
                    });
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Repeat className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-gray-900">Recurring Program</h4>
                      <p className="text-sm text-gray-600">Set up coffee programs, vouchers, or cashback rewards</p>
                    </div>
                  </div>
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

      {/* Customer Support Small Popup */}
      {supportBoxOpen && (
        <>
          {/* Invisible backdrop to close popup when clicking outside */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setSupportBoxOpen(false)}
          />
          
          {/* Small popup positioned from bottom of sidebar */}
          <div className={cn(
            "fixed z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-200",
            isCollapsed ? "bottom-4 left-20" : "bottom-4 left-52"
          )}>
            <div className="bg-white rounded-md w-80 shadow-xl border border-gray-200 overflow-hidden">
              {/* Compact Header */}
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Headphones className="h-4 w-4 text-blue-600" strokeWidth={2.75} />
                    <h3 className="text-sm font-semibold text-gray-900">Support</h3>
                  </div>
                  <button
                    onClick={() => setSupportBoxOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="h-4 w-4" strokeWidth={2.75} />
                  </button>
                </div>
              </div>
              
              {/* Compact Body */}
              <div className="p-4">
                <p className="text-xs text-gray-600 mb-3">
                  Quick question? We'll get back to you soon.
                </p>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder="What can we help with?"
                  className="w-full h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSupportSubmit();
                    }
                  }}
                />
                
                {/* Compact Footer */}
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-gray-500">
                    Ctrl+Enter to send
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSupportBoxOpen(false)}
                      className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                      disabled={supportLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSupportSubmit}
                      disabled={!supportMessage.trim() || supportLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {supportLoading ? (
                        <>
                          <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" strokeWidth={2.75} />
                          Send
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen} />
    </div>
  )
}