"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Bell,
  CreditCard,
  Store,
  Award,
  Upload,
  MapPin,
  Key,
  Save,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertCircle,
  FileText,
  PlusCircle,
  Settings,
  Loader2,
  BadgeIcon,
  Info,
  DollarSign,
  ShoppingBag,
  ImageIcon,
  X,
  Headphones,
  Send,
  Check,
  Phone,
  Mail,
  Copy,
  Cake,
  Calendar,
  Gift,
  Users
} from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, orderBy, writeBatch, addDoc, setDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { MapLocationPicker } from "@/components/map-location-picker"

const data = {
  nav: [
    { name: "Business", icon: Store },
    { name: "Location", icon: MapPin },
    { name: "Team", icon: User },
    { name: "Merchant ID", icon: Key },
    { name: "Notifications", icon: Bell },
    { name: "Billing", icon: CreditCard },
    { name: "Operating Hours", icon: Clock },
    { name: "Memberships", icon: Award },
  ],
}

// Types for the membership conditions
interface Condition {
  enabled: boolean;
  value: number;
}

interface ConditionsObject {
  lifetimeTransactions: Condition;
  lifetimeSpend: Condition;
  numberOfRedemptions: Condition;
  averageTransactionsPerWeek: Condition;
  daysSinceJoined: Condition;
  daysSinceLastVisit: Condition;
  [key: string]: Condition;
}

interface Membership {
  id: string;
  name: string;
  description: string;
  order: number;
  conditions: ConditionsObject;
  createdAt: any;
  updatedAt: any;
  isActive: boolean;
  customerCount?: number;
}

export function SettingsDialog({ open, onOpenChange, initialActiveSection }: { open?: boolean, onOpenChange?: (open: boolean) => void, initialActiveSection?: string }) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState(initialActiveSection || "Business")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  
  // Update active section when initialActiveSection prop changes
  useEffect(() => {
    if (initialActiveSection) {
      setActiveSection(initialActiveSection)
    }
  }, [initialActiveSection])
  
  // Days of the week
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  
  // Form states from settings page
  const [legalBusinessName, setLegalBusinessName] = useState("")
  const [tradingName, setTradingName] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessType, setBusinessType] = useState("cafe")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoUrl, setLogoUrl] = useState("")
  
  // Address fields
  const [street, setStreet] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState("NSW")
  const [postcode, setPostcode] = useState("")
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [formattedAddress, setFormattedAddress] = useState("")
  
  // Location coordinates structure
  const [location, setLocation] = useState<{
    address?: string;
    coordinates?: {
      latitude?: number;
      longitude?: number;
    };
    displayAddress?: string;
  }>({
    address: "",
    coordinates: {
      latitude: undefined,
      longitude: undefined
    },
    displayAddress: ""
  })
  
  // Representative Details
  const [repName, setRepName] = useState("")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  
  // Operating Hours
  const [operatingHours, setOperatingHours] = useState(() => {
    const defaultHours: Record<string, { isClosed: boolean; open: string; close: string }> = {}
    daysOfWeek.forEach(day => {
      defaultHours[day.toLowerCase()] = {
        isClosed: false,
        open: "09:00",
        close: "17:00"
      }
    })
    return defaultHours
  })
  
  // Business Verification & Systems
  const [abn, setAbn] = useState("")
  const [abnVerificationFile, setAbnVerificationFile] = useState<File | null>(null)
  const [abnVerificationUrl, setAbnVerificationUrl] = useState("")
  const [pointOfSale, setPointOfSale] = useState("lightspeed")
  const [paymentProvider, setPaymentProvider] = useState("square")
  const [storeActive, setStoreActive] = useState(true)
  
  // ABN verification state
  const [showAbnVerificationDialog, setShowAbnVerificationDialog] = useState(false)
  const [verificationPassword, setVerificationPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [newAbn, setNewAbn] = useState("")
  
  // ABN verification status
  const [abnVerificationStatus, setAbnVerificationStatus] = useState<"pending" | "in_review" | "approved" | "rejected" | "verified" | "">("")
  const [abnRejectionReason, setAbnRejectionReason] = useState("")
  const [abnVerificationDate, setAbnVerificationDate] = useState<any>(null)
  
  // Merchant ID
  const [merchantId, setMerchantId] = useState("")
  
  // Notification settings
  const [notifications, setNotifications] = useState({
    customerFirstPurchase: true,
    customerMilestone: true,
    customerBirthday: true,
    customerAnniversary: false,
    rewardCreated: true,
    rewardRedeemed: true,
    rewardExpiring: true,
    pointsAwarded: false,
    dailySummary: true,
    weeklySummary: true,
    monthlySummary: true,
    salesTarget: false,
    systemUpdates: true,
    securityAlerts: true,
    paymentIssues: true,
    lowInventory: false
  })
  
  // Bank account details for refunds
  const [bsbNumber, setBsbNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  
  // Account type selection state
  const [selectedAccountType, setSelectedAccountType] = useState<string | null>("standard")
  const [isNetworkStore, setIsNetworkStore] = useState(false)
  const [planLoading, setPlanLoading] = useState(false)
  
  // Membership-related state variables
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [membershipLoading, setMembershipLoading] = useState(false)
  const [showCreateMembershipDialog, setShowCreateMembershipDialog] = useState(false)
  
  // Create membership form state
  const [membershipFormData, setMembershipFormData] = useState<Omit<Membership, 'id' | 'createdAt' | 'updatedAt' | 'customerCount'>>({
    name: "",
    description: "",
    order: 0,
    isActive: true,
    conditions: {
      lifetimeTransactions: { enabled: false, value: 0 },
      lifetimeSpend: { enabled: false, value: 0 },
      numberOfRedemptions: { enabled: false, value: 0 },
      averageTransactionsPerWeek: { enabled: false, value: 0 },
      daysSinceJoined: { enabled: false, value: 0 },
      daysSinceLastVisit: { enabled: false, value: 0 }
    }
  })
  
  // Condition form state (separate from the actual saved conditions)
  const [membershipConditionSettings, setMembershipConditionSettings] = useState({
    lifetimeTransactions: {
      enabled: false,
      value: 0
    },
    lifetimeSpend: {
      enabled: false,
      value: 0
    },
    numberOfRedemptions: {
      enabled: false,
      value: 0
    }
  })
  
  // Support box state
  const [supportBoxOpen, setSupportBoxOpen] = useState(false)
  const [supportMessage, setSupportMessage] = useState("")
  const [supportLoading, setSupportLoading] = useState(false)

  // Validation state - track missing fields count for each section
  const [validationCounts, setValidationCounts] = useState({
    Business: 0,
    Location: 0,
    Team: 0
  })
  
  // Business types
  const businessTypes = [
    { value: "cafe", label: "Cafe" },
    { value: "restaurant", label: "Restaurant" },
    { value: "retail", label: "Retail" },
    { value: "salon", label: "Salon" },
    { value: "gym", label: "Gym" },
    { value: "other", label: "Other" }
  ]
  
  // Australian states
  const australianStates = [
    { value: "NSW", label: "New South Wales" },
    { value: "VIC", label: "Victoria" },
    { value: "QLD", label: "Queensland" },
    { value: "WA", label: "Western Australia" },
    { value: "SA", label: "South Australia" },
    { value: "TAS", label: "Tasmania" },
    { value: "ACT", label: "Australian Capital Territory" },
    { value: "NT", label: "Northern Territory" }
  ]

  // Validation functions
  const validateBusinessSection = () => {
    let count = 0
    
    // Required business fields
    if (!legalBusinessName.trim()) count++
    if (!tradingName.trim()) count++
    if (!businessEmail.trim()) count++
    if (!abn.trim()) count++
    
    // ABN verification pending/in review/rejected counts as incomplete
    if (abn.trim() && !['approved', 'verified'].includes(abnVerificationStatus)) count++
    
    return count
  }

  const validateLocationSection = () => {
    let count = 0
    
    // Required location fields
    if (!street.trim()) count++
    if (!suburb.trim()) count++
    if (!state.trim()) count++
    if (!postcode.trim()) count++
    if (!latitude || !longitude) count++
    
    return count
  }

  const validateTeamSection = () => {
    let count = 0
    
    // Required team/representative fields
    if (!repName.trim()) count++
    if (!repPhone.trim()) count++
    if (!repEmail.trim()) count++
    
    return count
  }

  // Check if critical required fields are missing (prevents saving)
  const hasCriticalFieldsMissing = () => {
    return !legalBusinessName.trim() || 
           !tradingName.trim() || 
           !businessType.trim() ||
           !street.trim() ||
           !suburb.trim() ||
           !state.trim() ||
           !postcode.trim()
  }

  // Update validation counts when relevant fields change
  useEffect(() => {
    setValidationCounts({
      Business: validateBusinessSection(),
      Location: validateLocationSection(),
      Team: validateTeamSection()
    })
  }, [
    legalBusinessName, tradingName, businessEmail, abn, abnVerificationStatus,
    street, suburb, state, postcode, latitude, longitude,
    repName, repPhone, repEmail
  ])

  // Load merchant data from Firestore
  useEffect(() => {
    async function fetchMerchantData() {
      if (!user?.uid) {
        setDataLoading(false)
        return
      }
      
      try {
        setDataLoading(true)
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
        
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          
          // Set merchantId
          setMerchantId(user.uid)
          
          // Set business details
          setLegalBusinessName(data.legalBusinessName || data.legalName || "")
          setTradingName(data.merchantName || data.tradingName || "")
          setBusinessEmail(data.businessEmail || user.email || "")
          setBusinessType(data.businessType || "cafe")
          setLogoUrl(data.logoUrl || "")
          
          // Set address
          if (data.address) {
            setStreet(data.address.street || "")
            setSuburb(data.address.suburb || "")
            setState(data.address.state || "NSW")
            setPostcode(data.address.postcode || "")
            setLatitude(data.address.latitude)
            setLongitude(data.address.longitude)
            setFormattedAddress(data.address.formattedAddress || "")
          }
          
          // Set location coordinates
          if (data.location && data.location.coordinates) {
            setLocation({
              address: data.location.address || `${street}, ${suburb}`,
              coordinates: {
                latitude: data.location.coordinates.latitude,
                longitude: data.location.coordinates.longitude
              },
              displayAddress: data.location.displayAddress || data.address?.formattedAddress || ""
            })
            
            setLatitude(data.location.coordinates.latitude)
            setLongitude(data.location.coordinates.longitude)
            setFormattedAddress(data.location.displayAddress || "")
          }
          
          // Set representative details
          if (data.representative) {
            setRepName(data.representative.name || "")
            setRepPhone(data.representative.phone || "")
            setRepEmail(data.representative.email || "")
          }
          
          // Set operating hours
          if (data.operatingHours) {
            setOperatingHours(data.operatingHours)
          }
          
          // Set business verification details
          setAbn(data.abn || "")
          setAbnVerificationUrl(data.abnVerificationUrl || "")
          setPointOfSale(data.pointOfSale || "lightspeed")
          setPaymentProvider(data.paymentProvider || "square")
          setStoreActive(data.status === "active")
          
          // Set ABN verification status
          if (data.abnstatus === "verified") {
            setAbnVerificationStatus("verified")
            setAbnVerificationDate(data.abnVerificationDate || null)
            setAbnRejectionReason("")
          } else if (data.abnVerification) {
            setAbnVerificationStatus(data.abnVerification.status || "pending")
            setAbnRejectionReason(data.abnVerification.rejectionReason || "")
            setAbnVerificationDate(data.abnVerification.verificationDate || null)
          } else {
            setAbnVerificationStatus(abnVerificationUrl ? "pending" : "")
          }
          
          // Set bank account details for refunds
          if (data.refundAccount) {
            setBsbNumber(data.refundAccount.bsb || "")
            setAccountNumber(data.refundAccount.accountNumber || "")
            setAccountName(data.refundAccount.accountName || "")
          }
          
          // Set notifications
          if (data.notifications) {
            setNotifications({
              ...notifications,
              ...data.notifications
            })
          }
          
          // Set plan information
          const networkStore = Boolean(data.isNetworkStore)
          setIsNetworkStore(networkStore)
          setSelectedAccountType(networkStore ? "network" : "standard")
        }
      } catch (error) {
        console.error("Error fetching merchant data:", error)
        toast({
          title: "Error",
          description: "Failed to load your settings. Please try again.",
          variant: "destructive"
        })
      } finally {
        setDataLoading(false)
      }
    }
    
    if (open) {
      fetchMerchantData()
    }
  }, [user, open])

  // Cleanup support box when dialog closes
  useEffect(() => {
    if (!open) {
      setSupportBoxOpen(false)
      setSupportMessage("")
    }
  }, [open])

  // Aggressive cleanup of any lingering overlays
  useEffect(() => {
    if (!open) {
      // Small delay to ensure dialog animations complete
      const timer = setTimeout(() => {
        // Remove any lingering overlays that might be stuck
        const overlays = document.querySelectorAll('[data-radix-dialog-overlay]')
        overlays.forEach(overlay => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay)
          }
        })
        
        // Also remove any dialog content that might be stuck
        const dialogContents = document.querySelectorAll('[data-radix-dialog-content]')
        dialogContents.forEach(content => {
          // Only remove if it's not visible/active
          const computedStyle = window.getComputedStyle(content)
          if (computedStyle.display === 'none' || computedStyle.opacity === '0') {
            if (content.parentNode) {
              content.parentNode.removeChild(content)
            }
          }
        })
        
        // Final aria-hidden cleanup - this is the critical fix
        const ariaHiddenElements = document.querySelectorAll('[aria-hidden="true"]')
        ariaHiddenElements.forEach(element => {
          // Skip actual dialog components
          if (!element.hasAttribute('data-radix-dialog-content') && 
              !element.hasAttribute('data-radix-dialog-overlay') &&
              !element.hasAttribute('data-radix-toast-viewport')) {
            element.removeAttribute('aria-hidden')
            element.removeAttribute('data-aria-hidden')
            console.log('Final cleanup - removed aria-hidden from:', element.className)
          }
        })
        
        // Ensure body can receive pointer events
        document.body.style.pointerEvents = 'auto'
        document.body.style.overflow = 'auto'
        
        console.log('Performed aggressive overlay and aria-hidden cleanup')
      }, 500) // Wait for animations to complete
      
      return () => clearTimeout(timer)
    }
  }, [open])

  // Load memberships from Firestore
  useEffect(() => {
    if (!user?.uid || !open) return
    
    setMembershipLoading(true)
    
    const membershipRef = collection(db, 'merchants', user.uid, 'memberships')
    const membershipQuery = query(membershipRef, orderBy('order', 'asc'))
    
    const unsubscribe = onSnapshot(membershipQuery, async (snapshot) => {
      const membershipsData: Membership[] = []
      
      // Get all customers to count membership tiers
      const customersRef = collection(db, 'merchants', user.uid, 'customers')
      const customersSnapshot = await getDocs(customersRef)
      
      // Create a map to count customers by tier
      const tierCounts: {[key: string]: number} = {}
      
      customersSnapshot.forEach(doc => {
        const data = doc.data()
        const tier = (data.membershipTier || 'bronze').toLowerCase()
        tierCounts[tier] = (tierCounts[tier] || 0) + 1
      })
      
      for (const doc of snapshot.docs) {
        const data = doc.data() as Membership
        const tierName = data.name.toLowerCase()
        
        const membership = {
          id: doc.id,
          name: data.name || "",
          description: data.description || "",
          order: data.order || 0,
          conditions: data.conditions || {
            lifetimeTransactions: { enabled: false, value: 0 },
            lifetimeSpend: { enabled: false, value: 0 },
            numberOfRedemptions: { enabled: false, value: 0 },
            averageTransactionsPerWeek: { enabled: false, value: 0 },
            daysSinceJoined: { enabled: false, value: 0 },
            daysSinceLastVisit: { enabled: false, value: 0 }
          },
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          isActive: data.isActive !== false,
          customerCount: tierCounts[tierName] || 0
        }
        
        membershipsData.push(membership)
      }
      
      setMemberships(membershipsData)
      setMembershipLoading(false)
    })
    
    return unsubscribe
  }, [user, open])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, or SVG)",
          variant: "destructive"
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoUrl(previewUrl);
      
      toast({
        title: "Logo Selected",
        description: "Click Save Changes to upload your new logo",
      });
    }
  };

  const handleAbnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAbnVerificationFile(e.target.files[0])
    }
  }

  const updateOperatingHours = (day: string, field: string, value: any) => {
    setOperatingHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }))
  }

  const updateNotification = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const updateMerchantPlan = async (isNetwork: boolean) => {
    if (!user?.uid) return;

    setPlanLoading(true);
    try {
      const merchantRef = doc(db, 'merchants', user.uid);
      await updateDoc(merchantRef, {
        isNetworkStore: isNetwork,
        updatedAt: serverTimestamp()
      });
      
      setIsNetworkStore(isNetwork);
      setSelectedAccountType(isNetwork ? "network" : "standard");
      
      toast({
        title: "Plan Updated",
        description: `Successfully switched to ${isNetwork ? 'Tap Network' : 'Tap Standard'}`,
      });
    } catch (error) {
      console.error("Error updating merchant plan:", error);
      toast({
        title: "Error",
        description: "Failed to update plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSupportSubmit = async () => {
    if (!supportMessage.trim() || !user?.uid) return;

    setSupportLoading(true);
    try {
      const enquiryRef = collection(db, 'merchantenquiry');
      await addDoc(enquiryRef, {
        message: supportMessage.trim(),
        merchantId: user.uid,
        merchantName: tradingName || legalBusinessName,
        merchantEmail: businessEmail,
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
  };

  const resetMembershipFormData = () => {
    setMembershipFormData({
      name: "",
      description: "",
      order: memberships.length + 1,
      isActive: true,
      conditions: {
        lifetimeTransactions: { enabled: false, value: 0 },
        lifetimeSpend: { enabled: false, value: 0 },
        numberOfRedemptions: { enabled: false, value: 0 },
        averageTransactionsPerWeek: { enabled: false, value: 0 },
        daysSinceJoined: { enabled: false, value: 0 },
        daysSinceLastVisit: { enabled: false, value: 0 }
      }
    })
    
    setMembershipConditionSettings({
      lifetimeTransactions: {
        enabled: false,
        value: 0
      },
      lifetimeSpend: {
        enabled: false,
        value: 0
      },
      numberOfRedemptions: {
        enabled: false,
        value: 0
      }
    })
  }

  const handleMembershipConditionSettingChange = (type: 'lifetimeTransactions' | 'lifetimeSpend' | 'numberOfRedemptions', field: 'enabled' | 'value', value: boolean | number) => {
    setMembershipConditionSettings(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }))
  }

  const handleCreateMembership = () => {
    // Check if all tiers already exist
    const availableTiers = ['Bronze', 'Silver', 'Gold'].filter(tierName => 
      !memberships.some(m => m.name.toLowerCase() === tierName.toLowerCase())
    )
    
    if (availableTiers.length === 0) {
      toast({
        title: "All Tiers Created",
        description: "You have already created all available membership tiers (Bronze, Silver, Gold).",
        variant: "default"
      })
      return
    }
    
    resetMembershipFormData()
    setShowCreateMembershipDialog(true)
  }

  const handleSaveMembership = async () => {
    if (!user?.uid) return
    
    try {
      if (!membershipFormData.name) {
        toast({
          title: "Error",
          description: "Please select a tier name",
          variant: "destructive"
        })
        return
      }
      
      // Validate that only Bronze, Silver, Gold are allowed
      const allowedTiers = ['Bronze', 'Silver', 'Gold']
      if (!allowedTiers.includes(membershipFormData.name)) {
        toast({
          title: "Error",
          description: "Only Bronze, Silver, and Gold tiers are allowed",
          variant: "destructive"
        })
        return
      }
      
      // Check if tier already exists
      const existingTier = memberships.find(m => m.name.toLowerCase() === membershipFormData.name.toLowerCase())
      if (existingTier) {
        toast({
          title: "Error",
          description: `${membershipFormData.name} tier already exists`,
          variant: "destructive"
        })
        return
      }
      
      // Create conditions object with the correct structure
      const conditions = {
        lifetimeTransactions: { 
          enabled: membershipConditionSettings.lifetimeTransactions.enabled, 
          value: membershipConditionSettings.lifetimeTransactions.value 
        },
        lifetimeSpend: { 
          enabled: membershipConditionSettings.lifetimeSpend.enabled, 
          value: membershipConditionSettings.lifetimeSpend.value 
        },
        numberOfRedemptions: { 
          enabled: membershipConditionSettings.numberOfRedemptions.enabled, 
          value: membershipConditionSettings.numberOfRedemptions.value 
        },
        // Include other condition types with default values
        averageTransactionsPerWeek: { enabled: false, value: 0 },
        daysSinceJoined: { enabled: false, value: 0 },
        daysSinceLastVisit: { enabled: false, value: 0 }
      }
      
      // Check if any conditions are enabled
      const hasEnabledConditions = 
        membershipConditionSettings.lifetimeTransactions.enabled || 
        membershipConditionSettings.lifetimeSpend.enabled || 
        membershipConditionSettings.numberOfRedemptions.enabled;
      
      // If there are no conditions, make the tier inactive
      const updatedIsActive = hasEnabledConditions ? membershipFormData.isActive : false;
      
      if (!hasEnabledConditions && membershipFormData.isActive) {
        toast({
          title: "Warning",
          description: "Tier has been set to inactive because it has no conditions",
          variant: "default"
        })
      }
      
      const membershipData = {
        ...membershipFormData,
        isActive: updatedIsActive,
        conditions, // Use the new conditions object format
        updatedAt: serverTimestamp()
      }
      
      // Check if we're editing an existing membership
      const existingMembership = memberships.find(m => m.name.toLowerCase() === membershipFormData.name.toLowerCase())
      
      if (existingMembership) {
        // Update existing membership
        await updateDoc(
          doc(db, 'merchants', user.uid, 'memberships', existingMembership.id),
          membershipData
        )
        
        toast({
          title: "Success",
          description: "Membership tier updated successfully"
        })
      } else {
        // Create new membership
        const newDocRef = doc(collection(db, 'merchants', user.uid, 'memberships'))
        await setDoc(newDocRef, {
          ...membershipData,
          createdAt: serverTimestamp()
        })
        
        toast({
          title: "Success",
          description: "Membership tier created successfully"
        })
      }
      
      setShowCreateMembershipDialog(false)
    } catch (error) {
      console.error("Error saving membership:", error)
      toast({
        title: "Error",
        description: "Failed to save membership tier",
        variant: "destructive"
      })
    }
  };

  const uploadFileToStorage = async (file: File, fileType: string): Promise<string | null> => {
    if (!file || !user?.uid) {
      toast({
        title: "Upload Error",
        description: !file ? "No file selected" : "Authentication required",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      const fileId = uuidv4();
      const storagePath = `merchants/${user.uid}/files/${fileId}`;
      
      const storage = getStorage();
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, { 
        contentType: file.type || 'application/octet-stream' 
      });
      
      return await new Promise<string | null>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
          },
          (error) => {
            console.error('Upload error:', error);
            toast({
              title: "Upload Failed",
              description: "Please try again later.",
              variant: "destructive"
            });
            reject(null);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(storageRef);
              resolve(downloadURL);
            } catch (e) {
              console.error('Error getting download URL:', e);
              reject(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Please try again later.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!user?.uid) {
      console.error("Error: No user ID available");
      toast({
        title: "Error",
        description: "You must be logged in to save changes.",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields before saving
    const missingFields: string[] = [];
    
    // Business information requirements
    if (!legalBusinessName.trim()) missingFields.push("Legal Business Name");
    if (!tradingName.trim()) missingFields.push("Trading Name");
    if (!businessType.trim()) missingFields.push("Business Type");
    
    // Address requirements
    if (!street.trim()) missingFields.push("Street Address");
    if (!suburb.trim()) missingFields.push("Suburb");
    if (!state.trim()) missingFields.push("State");
    if (!postcode.trim()) missingFields.push("Postcode");
    
    if (missingFields.length > 0) {
      toast({
        title: "Required Fields Missing",
        description: `Please complete the following required fields: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Handle logo upload
      let newLogoUrl = logoUrl;
      if (logoFile) {
        try {
          const uploadedLogoUrl = await uploadFileToStorage(logoFile, "logo");
          if (uploadedLogoUrl) {
            newLogoUrl = uploadedLogoUrl;
            setLogoUrl(uploadedLogoUrl);
            setLogoFile(null);
            
            toast({
              title: "Logo Uploaded",
              description: "Your business logo has been updated.",
            });
          }
        } catch (error) {
          console.error("Error uploading logo:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive"
          });
        }
      }
      
      // Handle ABN verification document upload
      let newAbnVerificationUrl = abnVerificationUrl;
      
      if (abnVerificationFile) {
        try {
          const uploadedVerificationUrl = await uploadFileToStorage(abnVerificationFile, "verification");
          if (uploadedVerificationUrl) {
            newAbnVerificationUrl = uploadedVerificationUrl;
            setAbnVerificationUrl(uploadedVerificationUrl);
            setAbnVerificationFile(null);
            setAbnVerificationStatus("pending");
            
            toast({
              title: "Verification Document Uploaded",
              description: "Your ABN verification document has been uploaded successfully.",
            });
          }
        } catch (error) {
          console.error("Error uploading ABN verification:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload verification document. Please try again.",
            variant: "destructive"
          });
        }
      }
      
      // Save all changes to Firestore
      const merchantData = {
        legalBusinessName: legalBusinessName,
        legalName: legalBusinessName, // Keep for backwards compatibility
        tradingName: tradingName,
        merchantName: tradingName, // Primary field for trading name
        businessEmail: businessEmail,
        businessType: businessType,
        logoUrl: newLogoUrl,
        address: {
          street,
          suburb,
          state,
          postcode,
          latitude,
          longitude,
          formattedAddress
        },
        location: {
          address: `${street}, ${suburb}`,
          coordinates: {
            latitude,
            longitude
          },
          displayAddress: `${street}, ${suburb}, ${state}, ${postcode}`
        },
        representative: {
          name: repName,
          phone: repPhone,
          email: repEmail
        },
        operatingHours,
        abn,
        abnVerificationUrl: newAbnVerificationUrl,
        pointOfSale,
        paymentProvider,
        abnVerification: {
          status: abnVerificationStatus,
          rejectionReason: abnRejectionReason,
          verificationDate: abnVerificationDate,
          lastUpdated: serverTimestamp()
        },
        notifications,
        refundAccount: {
          bsb: bsbNumber,
          accountNumber: accountNumber,
          accountName: accountName,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(doc(db, 'merchants', user.uid), merchantData);
      
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully."
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Save Failed",
        description: "Failed to save your settings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderContent = () => {
    if (dataLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    switch (activeSection) {
      case "Business":
        return (
          <div className="space-y-6">
            {/* Logo and Business Identity Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative group cursor-pointer"
                      onClick={() => document.getElementById('logo-upload-dialog')?.click()}
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-200 group-hover:shadow-md transition-shadow">
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Business Logo" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <Store className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tradingName || legalBusinessName || "Your Business"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-0.5">{businessEmail}</p>
                      <button 
                        onClick={() => document.getElementById('logo-upload-dialog')?.click()}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1.5 font-medium"
                      >
                        Change logo
                      </button>
                    </div>
                  </div>
                  
                  {logoFile && (
                    <div className="flex items-center gap-2 text-xs bg-white px-3 py-1.5 rounded-md border border-blue-200">
                      <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                      <span className="text-gray-700">{logoFile.name}</span>
                      <span className="text-gray-500">ready to upload</span>
                    </div>
                  )}
                </div>
                <input
                  id="logo-upload-dialog"
                  type="file"
                  className="hidden"
                  onChange={handleLogoChange}
                  accept="image/*"
                />
              </div>
              
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="legalBusinessName" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Legal Business Name
                    </Label>
                    <Input
                      id="legalBusinessName"
                      value={legalBusinessName}
                      onChange={(e) => setLegalBusinessName(e.target.value)}
                      placeholder="As registered with ASIC"
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tradingName" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Trading Name
                    </Label>
                    <Input
                      id="tradingName"
                      value={tradingName}
                      onChange={(e) => setTradingName(e.target.value)}
                      placeholder="Name customers see"
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="businessEmail" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Primary Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="businessEmail"
                        type="email"
                        value={businessEmail}
                        readOnly
                        className="rounded-md bg-gray-50 border-gray-200 pr-8"
                      />
                      <Key className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Primary account email cannot be changed
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="businessType" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Business Type
                    </Label>
                    <select 
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ABN & Verification Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <ShieldCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Business Verification</h3>
                      <p className="text-xs text-gray-600 mt-0.5">Australian Business Number and verification</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white border">
                    {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && (
                      <>
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-green-700">Verified</span>
                      </>
                    )}
                    {abnVerificationStatus === "rejected" && (
                      <>
                        <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                        <span className="text-red-700">Rejected</span>
                      </>
                    )}
                    {abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && (
                      <>
                        <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                        <span className="text-orange-700">In Review</span>
                      </>
                    )}
                    {!abnVerificationUrl && (
                      <>
                        <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-600">Pending</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div>
                  <Label htmlFor="abn" className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Australian Business Number (ABN)
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input 
                        id="abn"
                        value={abn}
                        readOnly
                        placeholder="XX XXX XXX XXX"
                        className="rounded-md bg-gray-50 border-gray-200 pr-10"
                      />
                      <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAbnVerificationDialog(true)}
                      disabled={!abn}
                      className="rounded-md"
                    >
                      Change
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Used to match transactions with your merchant account
                  </p>
                </div>

                {/* Verification Document Upload */}
                <div>
                  <Label className="text-xs font-medium text-gray-700 mb-3 block">
                    Verification Document
                  </Label>
                  
                  {abnVerificationUrl && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-3">
                      <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {abnVerificationFile?.name || 'Verification Document'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Uploaded for verification
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        asChild
                        className="rounded-md"
                      >
                        <a href={abnVerificationUrl} target="_blank" rel="noopener noreferrer">
                          <span className="text-xs">View</span>
                        </a>
                      </Button>
                    </div>
                  )}
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('abn-verification')?.click()}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {abnVerificationUrl ? 'Replace verification document' : 'Upload verification document'}
                    </p>
                    <p className="text-xs text-gray-500">
                      PDF, JPG, or PNG (max 5MB)
                    </p>
                    {abnVerificationFile && (
                      <p className="text-xs text-blue-600 mt-2">
                        {abnVerificationFile.name} ({(abnVerificationFile.size / 1024).toFixed(1)} KB)
                      </p>
                    )}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setAbnVerificationFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="abn-verification"
                    />
                  </div>
                </div>

                {/* Status Messages */}
                {abnVerificationStatus === "rejected" && abnRejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                          <X className="h-4 w-4 text-red-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-red-900">Verification Rejected</h4>
                        <p className="text-xs text-red-700 mt-1">{abnRejectionReason}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('abn-verification')?.click()}
                          className="mt-3 text-xs border-red-300 text-red-700 hover:bg-red-50"
                        >
                          Upload New Document
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && abnVerificationDate && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-green-900">ABN Verified</h4>
                        <p className="text-xs text-green-700 mt-0.5">
                          Verified on {abnVerificationDate.toDate ? abnVerificationDate.toDate().toLocaleDateString() : new Date(abnVerificationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case "Location":
        return (
          <div className="space-y-6">
            {/* Location Status Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Business Location</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Set your exact business location for customers
                    </p>
                  </div>
                </div>
                {location.coordinates?.latitude && location.coordinates?.longitude && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 border border-green-200">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700">Location verified</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Map Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-gray-700">
                    Search for your address or click the map to set your location
                  </p>
                  {latitude && longitude && (
                    <p className="text-xs text-gray-500">
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="h-[400px] p-6">
                <MapLocationPicker
                  initialAddress={formattedAddress || `${street}, ${suburb}, ${state}, ${postcode}, Australia`}
                  initialLatitude={latitude}
                  initialLongitude={longitude}
                  onLocationChange={(locationData) => {
                    setLatitude(locationData.latitude);
                    setLongitude(locationData.longitude);
                    setFormattedAddress(locationData.formattedAddress || locationData.address);
                    
                    const addressParts = locationData.address.split(',');
                    const simpleAddress = addressParts.length >= 2 
                      ? `${addressParts[0].trim()}, ${addressParts[1].trim()}`
                      : locationData.address;
                    
                    setLocation({
                      address: simpleAddress,
                      coordinates: {
                        latitude: locationData.latitude,
                        longitude: locationData.longitude
                      },
                      displayAddress: locationData.formattedAddress || locationData.address
                    });
                    
                    const streetPart = addressParts[0]?.trim() || "";
                    setStreet(streetPart);
                    
                    const suburbPart = addressParts[1]?.trim() || "";
                    setSuburb(suburbPart);
                  }}
                />
              </div>
            </div>
            
            {/* Address Details Form */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Address Details</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Fine-tune your business address information
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Current Address Display */}
                {formattedAddress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-blue-900 mb-1">Current Address</p>
                        <p className="text-sm text-blue-800">{formattedAddress}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Street Address */}
                <div>
                  <Label htmlFor="street" className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Street Address
                  </Label>
                  <div className="relative">
                    <Input
                      id="street"
                      placeholder="123 Main Street"
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        setLocation(prev => ({
                          ...prev,
                          address: `${e.target.value}, ${suburb}`,
                          displayAddress: `${e.target.value}, ${suburb}, ${state}, ${postcode}`
                        }));
                      }}
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 pl-10"
                    />
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Suburb and Postcode Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="suburb" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Suburb / City
                    </Label>
                    <Input
                      id="suburb"
                      placeholder="Sydney"
                      value={suburb}
                      onChange={(e) => {
                        setSuburb(e.target.value);
                        setLocation(prev => ({
                          ...prev,
                          address: `${street}, ${e.target.value}`,
                          displayAddress: `${street}, ${e.target.value}, ${state}, ${postcode}`
                        }));
                      }}
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="postcode" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Postcode
                    </Label>
                    <Input
                      id="postcode"
                      placeholder="2000"
                      value={postcode}
                      onChange={(e) => {
                        const newPostcode = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPostcode(newPostcode);
                        setLocation(prev => ({
                          ...prev,
                          displayAddress: `${street}, ${suburb}, ${state}, ${newPostcode}`
                        }));
                      }}
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                      maxLength={4}
                    />
                  </div>
                </div>
                
                {/* State Selection */}
                <div>
                  <Label htmlFor="state" className="text-xs font-medium text-gray-700 mb-1.5 block">
                    State / Territory
                  </Label>
                  <select 
                    id="state"
                    value={state}
                    onChange={(e) => {
                      setState(e.target.value);
                      setLocation(prev => ({
                        ...prev,
                        displayAddress: `${street}, ${suburb}, ${e.target.value}, ${postcode}`
                      }));
                    }}
                    className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {australianStates.map(state => (
                      <option key={state.value} value={state.value}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Helper Text */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-5">
                  <div className="flex gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-900">Important</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Make sure your address is accurate. Customers will use this information to find your business.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "Team":
        return (
          <div className="space-y-6">
            {/* Team Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Team Management</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Manage your primary business contact
                  </p>
                </div>
              </div>
            </div>
            
            {/* Primary Representative Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Primary Representative</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Main point of contact for business matters
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Name Field */}
                <div>
                  <Label htmlFor="repName" className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="repName"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="John Smith"
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 pl-10"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                
                {/* Contact Information Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="repPhone" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Phone Number
                    </Label>
                    <div className="relative">
                      <Input
                        id="repPhone"
                        value={repPhone}
                        onChange={(e) => setRepPhone(e.target.value)}
                        placeholder="0412 345 678"
                        className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 pl-10"
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="repEmail" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Input
                        id="repEmail"
                        type="email"
                        value={repEmail}
                        onChange={(e) => setRepEmail(e.target.value)}
                        placeholder="contact@business.com"
                        className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500 pl-10"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-5">
                  <div className="flex gap-3">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">Primary Contact</p>
                      <p className="text-xs text-blue-800 mt-1">
                        This person will receive all important business communications and have administrative access.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "Merchant ID":
        return (
          <div className="space-y-6">
            {/* Merchant ID Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Key className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">API Integration</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Your unique identifier for API access
                  </p>
                </div>
              </div>
            </div>
            
            {/* Merchant ID Display */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Your Merchant ID</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Use this ID to authenticate API requests
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <Label htmlFor="merchantId" className="text-xs font-medium text-gray-700 mb-3 block">
                    Merchant ID
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-white rounded-md border border-gray-200 p-3 font-mono text-sm text-gray-900 overflow-x-auto">
                      {merchantId}
                    </div>
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(merchantId);
                        toast({
                          title: "Copied!",
                          description: "Merchant ID copied to clipboard",
                        });
                      }}
                      className="rounded-md shrink-0"
                    >
                      <Copy className="h-4 w-4 mr-1.5" />
                      Copy
                    </Button>
                  </div>
                </div>
                
                {/* API Documentation Link */}
                <div className="mt-5 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex gap-3">
                    <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">API Documentation</p>
                      <p className="text-xs text-blue-800 mt-1">
                        Visit our developer portal for complete API documentation and integration guides.
                      </p>
                      <Button 
                        variant="link" 
                        className="text-blue-600 hover:text-blue-700 p-0 h-auto text-xs mt-2"
                        asChild
                      >
                        <a href="https://docs.taployalty.com.au" target="_blank" rel="noopener noreferrer">
                          View API Docs →
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Security Notice */}
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex gap-3">
                    <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-amber-900">Security Notice</p>
                      <p className="text-xs text-amber-800 mt-1">
                        Keep your Merchant ID secure. Never share it publicly or commit it to version control.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "Operating Hours":
        return (
          <div className="space-y-6">
            {/* Operating Hours Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Business Hours</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Let customers know when you're open
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hours Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Store className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">Weekly Schedule</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Configure your operating hours for each day
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {daysOfWeek.map((day, index) => {
                  const dayLower = day.toLowerCase()
                  const isOpen = !operatingHours[dayLower]?.isClosed
                  
                  return (
                    <div key={day} className={cn(
                      "p-4 transition-colors",
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch 
                            id={`open-${dayLower}`}
                            checked={isOpen}
                            onCheckedChange={(checked) => 
                              updateOperatingHours(dayLower, 'isClosed', !checked)
                            }
                            className="data-[state=checked]:bg-blue-600"
                          />
                          <Label 
                            htmlFor={`open-${dayLower}`} 
                            className={cn(
                              "text-sm font-medium cursor-pointer transition-colors",
                              isOpen ? "text-gray-900" : "text-gray-500"
                            )}
                          >
                            {day}
                          </Label>
                        </div>
                        
                        {isOpen ? (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`open-time-${dayLower}`} className="text-xs text-gray-500">
                                Opens
                              </Label>
                              <Input
                                id={`open-time-${dayLower}`}
                                type="time"
                                value={operatingHours[dayLower]?.open || "09:00"}
                                onChange={(e) => updateOperatingHours(dayLower, 'open', e.target.value)}
                                className="w-28 h-8 text-xs rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                            
                            <span className="text-gray-400">—</span>
                            
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`close-time-${dayLower}`} className="text-xs text-gray-500">
                                Closes
                              </Label>
                              <Input
                                id={`close-time-${dayLower}`}
                                type="time"
                                value={operatingHours[dayLower]?.close || "17:00"}
                                onChange={(e) => updateOperatingHours(dayLower, 'close', e.target.value)}
                                className="w-28 h-8 text-xs rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-medium">Closed</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* Quick Actions */}
              <div className="p-4 bg-gray-50 border-t border-gray-100">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      daysOfWeek.forEach(day => {
                        updateOperatingHours(day.toLowerCase(), 'isClosed', false)
                        updateOperatingHours(day.toLowerCase(), 'open', '09:00')
                        updateOperatingHours(day.toLowerCase(), 'close', '17:00')
                      })
                    }}
                    className="text-xs rounded-md"
                  >
                    Set All 9-5
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      daysOfWeek.forEach(day => {
                        if (day === 'Saturday' || day === 'Sunday') {
                          updateOperatingHours(day.toLowerCase(), 'isClosed', true)
                        } else {
                          updateOperatingHours(day.toLowerCase(), 'isClosed', false)
                          updateOperatingHours(day.toLowerCase(), 'open', '09:00')
                          updateOperatingHours(day.toLowerCase(), 'close', '17:00')
                        }
                      })
                    }}
                    className="text-xs rounded-md"
                  >
                    Weekdays Only
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-900">Customer Visibility</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Your operating hours will be displayed on your store page and in search results to help customers know when to visit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case "Notifications":
        return (
          <div className="space-y-6">
            {/* Notifications Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Notification Preferences</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Choose which events you want to be notified about
                  </p>
                </div>
              </div>
            </div>
            
            {/* Customer Milestones */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Customer Milestones</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Stay informed about customer achievements and special dates
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {[
                  {
                    key: 'customerFirstPurchase',
                    title: 'First Purchase',
                    description: 'When a new customer makes their first purchase',
                    icon: <ShoppingBag className="h-4 w-4 text-gray-400" />
                  },
                  {
                    key: 'customerMilestone',
                    title: 'Purchase Milestones',
                    description: 'When customers reach their 10th, 25th, 50th purchase',
                    icon: <Award className="h-4 w-4 text-gray-400" />
                  },
                  {
                    key: 'customerBirthday',
                    title: 'Customer Birthdays',
                    description: "When it's a customer's birthday (if provided)",
                    icon: <Cake className="h-4 w-4 text-gray-400" />
                  },
                  {
                    key: 'customerAnniversary',
                    title: 'Loyalty Anniversary',
                    description: 'When a customer has been in your loyalty program for 1 year',
                    icon: <Calendar className="h-4 w-4 text-gray-400" />
                  }
                ].map((item, index) => (
                  <div key={item.key} className={cn(
                    "p-4 transition-colors",
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{item.icon}</div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                            {item.title}
                          </Label>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications[item.key as keyof typeof notifications] as boolean}
                        onCheckedChange={(checked) => updateNotification(item.key, checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* More Notification Categories */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Business Updates</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Important updates about your business operations
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {[
                  {
                    key: 'rewardRedeemed',
                    title: 'Reward Redemptions',
                    description: 'When customers redeem rewards',
                    icon: <Gift className="h-4 w-4 text-gray-400" />
                  },
                  {
                    key: 'dailySummary',
                    title: 'Daily Summary',
                    description: 'Daily overview of business activity',
                    icon: <FileText className="h-4 w-4 text-gray-400" />
                  },
                  {
                    key: 'systemUpdates',
                    title: 'System Updates',
                    description: 'Important platform updates and features',
                    icon: <Settings className="h-4 w-4 text-gray-400" />
                  }
                ].map((item, index) => (
                  <div key={item.key} className={cn(
                    "p-4 transition-colors",
                    index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{item.icon}</div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium text-gray-900 cursor-pointer">
                            {item.title}
                          </Label>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch 
                        checked={notifications[item.key as keyof typeof notifications] as boolean}
                        onCheckedChange={(checked) => updateNotification(item.key, checked)}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notification Delivery Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-900">Notification Delivery</p>
                  <p className="text-xs text-blue-800 mt-1">
                    Notifications will be sent to your registered email address and appear in your dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case "Billing":
        return (
          <div className="space-y-6">
            {/* Billing Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Billing & Plans</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Manage your subscription and payment details
                  </p>
                </div>
              </div>
            </div>
            
            {/* Plan Selection */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Choose Your Plan</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Select the plan that best fits your business needs
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setSelectedAccountType("standard")}
                    disabled={planLoading}
                    className={cn(
                      "relative p-6 rounded-xl border-2 text-center transition-all",
                      "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedAccountType === "standard"
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    {!isNetworkStore && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                          Current
                        </span>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white rounded-xl shadow-sm mx-auto overflow-hidden border border-gray-100">
                        <img 
                          src="/taplogo.png" 
                          alt="Tap Standard" 
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">Tap Standard</p>
                        <p className="text-xs text-gray-600 mt-1">Your rules, your points</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedAccountType("network")}
                    disabled={planLoading}
                    className={cn(
                      "relative p-6 rounded-xl border-2 text-center transition-all",
                      "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                      selectedAccountType === "network"
                        ? "border-blue-500 bg-blue-50/50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    {isNetworkStore && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                          Current
                        </span>
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="w-16 h-16 bg-white rounded-xl shadow-sm mx-auto overflow-hidden border border-gray-100">
                        <img 
                          src="/tappro.png" 
                          alt="Tap Network" 
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-gray-900">Tap Network</p>
                        <p className="text-xs text-gray-600 mt-1">Earn here, spend everywhere</p>
                      </div>
                    </div>
                  </button>
                </div>
                
                {/* Current Plan Status */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg overflow-hidden border border-gray-200">
                        <img 
                          src={isNetworkStore ? "/tappro.png" : "/taplogo.png"}
                          alt={isNetworkStore ? "Tap Network" : "Tap Standard"}
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Active Plan</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {isNetworkStore ? "Tap Network" : "Tap Standard"}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={planLoading || (selectedAccountType === (isNetworkStore ? "network" : "standard"))}
                      onClick={() => updateMerchantPlan(selectedAccountType === "network")}
                      className="rounded-md"
                    >
                      {planLoading ? (
                        <div className="flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs">Updating...</span>
                        </div>
                      ) : selectedAccountType === (isNetworkStore ? "network" : "standard") ? (
                        "Current Plan"
                      ) : (
                        "Change Plan"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Refund Account Section */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Refund Account</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Bank details for Tap Loyalty funded rewards refunds
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">Monthly Refunds</p>
                      <p className="text-xs text-blue-800 mt-1">
                        Enter your bank details to receive refunds for Tap Loyalty funded rewards. Refunds are processed at the end of each month.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="bsbNumber" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      BSB Number
                    </Label>
                    <Input
                      id="bsbNumber"
                      value={bsbNumber}
                      onChange={(e) => setBsbNumber(e.target.value)}
                      placeholder="123-456"
                      maxLength={7}
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="accountNumber" className="text-xs font-medium text-gray-700 mb-1.5 block">
                      Account Number
                    </Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="12345678"
                      className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="accountName" className="text-xs font-medium text-gray-700 mb-1.5 block">
                    Account Name
                  </Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Business Name Pty Ltd"
                    className="rounded-md border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the exact name as it appears on your bank account
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      case "Memberships":
        return (
          <div className="space-y-6">
            {/* Memberships Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Membership Tiers</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Create loyalty tiers to reward your best customers
                  </p>
                </div>
              </div>
            </div>
            
            {/* Tier System Info */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">Tier Management</h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Configure Bronze, Silver, and Gold membership levels
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {/* Info Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex gap-3">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-blue-900">How Tiers Work</p>
                      <p className="text-xs text-blue-800 mt-1">
                        All customers start at Bronze tier and automatically upgrade when they meet higher tier requirements. 
                        You must configure all three tiers to activate your loyalty program.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Membership Tiers Grid */}
                {membershipLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
                    {['Bronze', 'Silver', 'Gold'].map(tierName => {
                      const existingMembership = memberships.find(m => m.name.toLowerCase() === tierName.toLowerCase())
                      const isConfigured = !!existingMembership
                      
                      return (
                        <div key={tierName} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                          <div className={cn(
                            "p-4 border-b",
                            tierName === 'Bronze' && "bg-amber-50 border-amber-100",
                            tierName === 'Silver' && "bg-gray-50 border-gray-100",
                            tierName === 'Gold' && "bg-yellow-50 border-yellow-100"
                          )}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-10 w-10 rounded-lg flex items-center justify-center",
                                  tierName === 'Bronze' && "bg-amber-100",
                                  tierName === 'Silver' && "bg-gray-200",
                                  tierName === 'Gold' && "bg-yellow-100"
                                )}>
                                  <Award className={cn(
                                    "h-5 w-5",
                                    tierName === 'Bronze' && "text-amber-600",
                                    tierName === 'Silver' && "text-gray-600",
                                    tierName === 'Gold' && "text-yellow-600"
                                  )} />
                                </div>
                                <div>
                                  <h3 className="text-base font-semibold text-gray-900">{tierName} Tier</h3>
                                  {tierName.toLowerCase() === 'bronze' && (
                                    <p className="text-xs text-gray-600 mt-0.5">Default starting tier</p>
                                  )}
                                </div>
                              </div>
                              {isConfigured && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">
                                    {existingMembership.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <Switch 
                                    checked={existingMembership.isActive}
                                    onCheckedChange={async (checked) => {
                                      try {
                                        await updateDoc(
                                          doc(db, 'merchants', user!.uid!, 'memberships', existingMembership.id),
                                          {
                                            isActive: checked,
                                            updatedAt: serverTimestamp()
                                          }
                                        )
                                        
                                        toast({
                                          title: "Status Updated",
                                          description: `${tierName} tier is now ${checked ? 'active' : 'inactive'}`,
                                        })
                                      } catch (error) {
                                        console.error("Error updating membership status:", error)
                                        toast({
                                          title: "Error",
                                          description: "Failed to update tier status. Please try again.",
                                          variant: "destructive"
                                        })
                                      }
                                    }}
                                    disabled={tierName.toLowerCase() === 'bronze'}
                                    className="data-[state=checked]:bg-blue-600"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-6">
                            {isConfigured ? (
                              <>
                                <p className="text-sm text-gray-600 mb-4">{existingMembership.description}</p>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                                    <span className="text-xs text-gray-500">Active Customers</span>
                                    <span className="text-sm font-semibold text-gray-900">{existingMembership.customerCount || 0}</span>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs font-medium text-gray-700 mb-2">Requirements</p>
                                    {existingMembership.conditions && Object.entries(existingMembership.conditions).filter(([_, c]) => c.enabled).length > 0 ? (
                                      <div className="space-y-2">
                                        {Object.entries(existingMembership.conditions).map(([type, condition]) => {
                                          if (!condition.enabled) return null;
                                          
                                          return (
                                            <div key={type} className="flex items-center justify-between bg-gray-50 rounded-md p-2">
                                              <span className="text-xs text-gray-600">
                                                {type === "lifetimeTransactions" 
                                                  ? "Lifetime Transactions" 
                                                  : type === "lifetimeSpend"
                                                  ? "Lifetime Spend"
                                                  : type === "numberOfRedemptions"
                                                  ? "Redemptions"
                                                  : type}
                                              </span>
                                              <span className="text-xs font-medium text-gray-900">
                                                {type === "lifetimeSpend"
                                                  ? `$${condition.value.toFixed(2)}`
                                                  : condition.value}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-500 italic">No requirements set</p>
                                    )}
                                  </div>
                                </div>
                                
                                <Button
                                  onClick={() => {
                                    // Set form data for editing
                                    setMembershipFormData({
                                      name: existingMembership.name,
                                      description: existingMembership.description,
                                      order: existingMembership.order,
                                      isActive: existingMembership.isActive,
                                      conditions: existingMembership.conditions
                                    })
                                    
                                    // Set condition settings for editing
                                    setMembershipConditionSettings({
                                      lifetimeTransactions: {
                                        enabled: existingMembership.conditions.lifetimeTransactions?.enabled || false,
                                        value: existingMembership.conditions.lifetimeTransactions?.value || 0
                                      },
                                      lifetimeSpend: {
                                        enabled: existingMembership.conditions.lifetimeSpend?.enabled || false,
                                        value: existingMembership.conditions.lifetimeSpend?.value || 0
                                      },
                                      numberOfRedemptions: {
                                        enabled: existingMembership.conditions.numberOfRedemptions?.enabled || false,
                                        value: existingMembership.conditions.numberOfRedemptions?.value || 0
                                      }
                                    })
                                    
                                    setShowCreateMembershipDialog(true)
                                  }}
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-4 rounded-md"
                                >
                                  Edit Requirements
                                </Button>
                              </>
                            ) : (
                              <div className="text-center py-8">
                                <div className={cn(
                                  "h-12 w-12 rounded-full mx-auto mb-3 flex items-center justify-center",
                                  tierName === 'Bronze' && "bg-amber-100",
                                  tierName === 'Silver' && "bg-gray-100",
                                  tierName === 'Gold' && "bg-yellow-100"
                                )}>
                                  <Award className={cn(
                                    "h-6 w-6",
                                    tierName === 'Bronze' && "text-amber-600",
                                    tierName === 'Silver' && "text-gray-600",
                                    tierName === 'Gold' && "text-yellow-600"
                                  )} />
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                  Configure this tier to start rewarding customers
                                </p>
                                <Button
                                  onClick={() => {
                                    resetMembershipFormData()
                                    setMembershipFormData(prev => ({ ...prev, name: tierName }))
                                    setShowCreateMembershipDialog(true)
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm"
                                  size="sm"
                                >
                                  Configure {tierName} Tier
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Add Additional Tier Box */}
                    <div className="border border-dashed border-gray-300 bg-gray-50 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                      <PlusCircle className="h-12 w-12 text-gray-400 mb-3" />
                      <h3 className="text-base font-medium text-gray-600 mb-2">Custom Tier</h3>
                      <p className="text-xs text-gray-500 text-center mb-4 max-w-[200px]">
                        Additional tiers beyond Bronze, Silver, and Gold
                      </p>
                      <Button
                        onClick={() => {
                          toast({
                            title: "Coming Soon",
                            description: "Custom tiers will be available in a future update.",
                          })
                        }}
                        variant="outline"
                        className="text-gray-600 border-gray-300 hover:bg-gray-100"
                        disabled
                      >
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return <div>Select a section from the sidebar</div>
    }
  }

  return (
    <>
    <Dialog 
      open={open} 
              onOpenChange={(newOpen) => {
          console.log('Settings dialog state changing:', { from: open, to: newOpen })
          if (!newOpen) {
            // Immediate cleanup when closing
            document.body.style.pointerEvents = 'auto'
            document.body.style.overflow = 'auto'
            
            // Force remove aria-hidden from all elements
            const elementsWithAriaHidden = document.querySelectorAll('[aria-hidden="true"]')
            elementsWithAriaHidden.forEach(element => {
              // Only remove aria-hidden if it's not a dialog component itself
              if (!element.hasAttribute('data-radix-dialog-content') && 
                  !element.hasAttribute('data-radix-dialog-overlay')) {
                element.removeAttribute('aria-hidden')
                element.removeAttribute('data-aria-hidden')
                console.log('Removed aria-hidden from:', element.className)
              }
            })
          }
          onOpenChange?.(newOpen)
        }}
    >
      <DialogContent className="p-0 h-[90vh] max-h-[90vh] md:max-w-[750px] lg:max-w-[950px] flex flex-col">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        
        <div className="flex flex-1 min-h-0">
          <div className="w-64 border-r bg-gray-50 flex flex-col relative">
            <div className="p-4 flex-1">
              <h2 className="text-base font-medium mb-4">Settings</h2>
              <nav className="space-y-1">
                {data.nav.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setActiveSection(item.name)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors w-full text-left",
                      item.name === activeSection
                        ? "bg-[#007AFF]/10 text-[#007AFF]"
                        : "text-gray-600 hover:bg-[#007AFF]/5"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn(
                        "h-4 w-4",
                        item.name === activeSection
                          ? "text-[#007AFF]"
                          : "text-gray-500"
                      )} />
                      {item.name}
                    </div>
                    {validationCounts[item.name as keyof typeof validationCounts] > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full">
                        {validationCounts[item.name as keyof typeof validationCounts]}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Support Section */}
            <div className="p-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs"
                onClick={() => setSupportBoxOpen(true)}
              >
                <Headphones className="h-3 w-3" />
                Contact Support
              </Button>
            </div>
            
            {/* Store Active Toggle */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-3 w-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Store Active</span>
                </div>
                <Switch
                  checked={storeActive}
                  onCheckedChange={async (checked) => {
                    setStoreActive(checked);
                    // Immediately update status in Firestore
                    if (!user) return;
                    
                    try {
                      await updateDoc(doc(db, 'merchants', user.uid), {
                        status: checked ? "active" : "inactive",
                        updatedAt: serverTimestamp()
                      });
                      toast({
                        title: checked ? "Store Activated" : "Store Deactivated",
                        description: checked 
                          ? "Your store is now active and visible to customers." 
                          : "Your store is now inactive and hidden from customers.",
                      });
                    } catch (error) {
                      console.error("Error updating store status:", error);
                      // Revert the switch if update failed
                      setStoreActive(!checked);
                      toast({
                        title: "Error",
                        description: "Failed to update store status. Please try again.",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="data-[state=checked]:bg-[#007AFF]"
                />
              </div>
            </div>
            
            {/* Merchant Profile Section */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-200 flex-shrink-0">
                  {logoUrl ? (
                    <img 
                      src={logoUrl} 
                      alt={tradingName || legalBusinessName || "Business"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary text-white text-sm flex items-center justify-center">
                      {(tradingName || legalBusinessName || "B").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {tradingName || legalBusinessName || "Your Business"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {businessEmail || "No email"}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Customer Support Small Popup - positioned relative to sidebar */}
            {supportBoxOpen && (
              <div className="absolute bottom-20 left-full ml-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
            )}
          </div>
          <main className="flex-1 flex flex-col min-h-0">
            <header className="flex h-16 shrink-0 items-center gap-2 border-b border-gray-200">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{activeSection}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {renderContent()}
            </div>
            
            {/* Bottom Action Bar */}
            <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
              <div className="flex justify-end">
                <Button 
                  className="gap-2" 
                  onClick={handleSave}
                  disabled={loading || hasCriticalFieldsMissing()}
                  title={hasCriticalFieldsMissing() ? "Complete required fields before saving" : undefined}
                >
                  <Save className="h-4 w-4" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* ABN Verification Dialog - Moved outside main dialog */}
    <Dialog open={showAbnVerificationDialog} onOpenChange={setShowAbnVerificationDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>Change ABN</DialogTitle>
        <DialogDescription>
          Update your Australian Business Number. This requires password verification for security.
        </DialogDescription>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-abn">Current ABN</Label>
            <Input
              id="current-abn"
              value={abn}
              readOnly
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="new-abn">New ABN</Label>
            <Input
              id="new-abn"
              value={newAbn}
              onChange={(e) => setNewAbn(e.target.value)}
              placeholder="Enter new ABN"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="verification-password">Confirm Password</Label>
            <Input
              id="verification-password"
              type="password"
              value={verificationPassword}
              onChange={(e) => {
                setVerificationPassword(e.target.value)
                setPasswordError("")
              }}
              placeholder="Enter your account password"
            />
            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowAbnVerificationDialog(false);
              setVerificationPassword("");
              setPasswordError("");
              setNewAbn("");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!verificationPassword || !newAbn) return;
              
              setVerifyingPassword(true);
              setPasswordError("");
              
              try {
                if (!auth.currentUser?.email) {
                  throw new Error("No user email found");
                }
                
                const credential = EmailAuthProvider.credential(auth.currentUser.email, verificationPassword);
                await reauthenticateWithCredential(auth.currentUser, credential);
                
                // Update ABN
                setAbn(newAbn);
                
                toast({
                  title: "ABN Updated",
                  description: "Your ABN has been successfully updated.",
                });
                
                setShowAbnVerificationDialog(false);
                setVerificationPassword("");
                setNewAbn("");
              } catch (error: any) {
                console.error("Password verification failed:", error);
                setPasswordError("Incorrect password. Please try again.");
              } finally {
                setVerifyingPassword(false);
              }
            }}
            disabled={verifyingPassword || !verificationPassword || !newAbn}
          >
            {verifyingPassword ? "Verifying..." : "Update ABN"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Create Membership Tier Dialog */}
    <Dialog open={showCreateMembershipDialog} onOpenChange={setShowCreateMembershipDialog}>
      <DialogContent className="sm:max-w-md max-h-[97vh] overflow-y-auto rounded-md border-0 shadow-lg">
        <DialogTitle>
          {memberships.find(m => m.name.toLowerCase() === membershipFormData.name.toLowerCase()) ? 'Edit' : 'Create'} Membership Tier
        </DialogTitle>
        <DialogDescription>
          Set the conditions that customers must meet to qualify for this tier
        </DialogDescription>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="membershipName">Tier Name</Label>
            <select 
              id="membershipName"
              value={membershipFormData.name}
              onChange={(e) => setMembershipFormData(prev => ({ ...prev, name: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a tier...</option>
              {['Bronze', 'Silver', 'Gold'].filter(tierName => 
                !memberships.some(m => m.name.toLowerCase() === tierName.toLowerCase())
              ).map(tierName => (
                <option key={tierName} value={tierName}>
                  {tierName}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Only Bronze, Silver, and Gold tiers are allowed. You can only create tiers that don't already exist.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="membershipDescription">Description</Label>
            <Input
              id="membershipDescription"
              value={membershipFormData.description}
              onChange={(e) => setMembershipFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g. Top tier customers"
              className="rounded-md"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="membershipIsActive" className="cursor-pointer">Active Status</Label>
            </div>
            <Switch 
              id="membershipIsActive" 
              checked={membershipFormData.isActive} 
              onCheckedChange={(checked) => setMembershipFormData({...membershipFormData, isActive: checked})}
            />
          </div>
          
          <Separator />
          
          <div>
            <h3 className="text-sm font-medium mb-3">Qualification Requirements</h3>
            <div className="space-y-4">
              {/* Lifetime Transactions */}
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center flex-1">
                    <ShoppingBag className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Label htmlFor="membershipLifetimeTransactions" className="text-sm">Lifetime Transactions</Label>
                  </div>
                  
                  {membershipConditionSettings.lifetimeTransactions.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        id="membershipLifetimeTransactions"
                        type="number"
                        min="0"
                        value={membershipConditionSettings.lifetimeTransactions.value}
                        onChange={(e) => handleMembershipConditionSettingChange('lifetimeTransactions', 'value', parseInt(e.target.value))}
                        className="w-20 h-8 text-xs rounded-md"
                        placeholder="0"
                      />
                    </div>
                  )}
                  
                  <Switch 
                    id="membershipLifetimeTransactionsEnabled" 
                    checked={membershipConditionSettings.lifetimeTransactions.enabled} 
                    onCheckedChange={(checked) => handleMembershipConditionSettingChange("lifetimeTransactions", "enabled", checked)}
                    className="rounded-full"
                  />
                </div>
                {membershipConditionSettings.lifetimeTransactions.enabled && (
                  <p className="text-xs text-muted-foreground mt-2 ml-6">
                    Customer qualifies after this many completed transactions
                  </p>
                )}
              </div>
              
              {/* Lifetime Spend */}
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center flex-1">
                    <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Label htmlFor="membershipLifetimeSpend" className="text-sm">Lifetime Spend</Label>
                  </div>
                  
                  {membershipConditionSettings.lifetimeSpend.enabled && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">$</span>
                      <Input
                        id="membershipLifetimeSpend"
                        type="number"
                        min="0"
                        value={membershipConditionSettings.lifetimeSpend.value}
                        onChange={(e) => handleMembershipConditionSettingChange('lifetimeSpend', 'value', parseInt(e.target.value))}
                        className="w-20 h-8 text-xs rounded-md"
                        placeholder="0"
                      />
                    </div>
                  )}
                  
                  <Switch 
                    id="membershipLifetimeSpendEnabled" 
                    checked={membershipConditionSettings.lifetimeSpend.enabled} 
                    onCheckedChange={(checked) => handleMembershipConditionSettingChange("lifetimeSpend", "enabled", checked)}
                    className="rounded-full"
                  />
                </div>
                {membershipConditionSettings.lifetimeSpend.enabled && (
                  <p className="text-xs text-muted-foreground mt-2 ml-6">
                    Customer qualifies after spending this amount
                  </p>
                )}
              </div>
              
              {/* Number of Redemptions */}
              <div className="border rounded-md p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center flex-1">
                    <Award className="h-4 w-4 mr-2 text-muted-foreground" />
                    <Label htmlFor="membershipNumberOfRedemptions" className="text-sm">Number of Redemptions</Label>
                  </div>
                  
                  {membershipConditionSettings.numberOfRedemptions.enabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        id="membershipNumberOfRedemptions"
                        type="number"
                        min="0"
                        value={membershipConditionSettings.numberOfRedemptions.value}
                        onChange={(e) => handleMembershipConditionSettingChange('numberOfRedemptions', 'value', parseInt(e.target.value))}
                        className="w-20 h-8 text-xs rounded-md"
                        placeholder="0"
                      />
                    </div>
                  )}
                  
                  <Switch 
                    id="membershipNumberOfRedemptionsEnabled" 
                    checked={membershipConditionSettings.numberOfRedemptions.enabled} 
                    onCheckedChange={(checked) => handleMembershipConditionSettingChange("numberOfRedemptions", "enabled", checked)}
                    className="rounded-full"
                  />
                </div>
                {membershipConditionSettings.numberOfRedemptions.enabled && (
                  <p className="text-xs text-muted-foreground mt-2 ml-6">
                    Customer qualifies after redeeming this many rewards
                  </p>
                )}
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Info className="h-3 w-3 mr-1" />
                <span>Customers only need to meet ONE of the enabled conditions to qualify</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setShowCreateMembershipDialog(false)}
            className="rounded-md shadow-sm border-0 ring-1 ring-gray-200 hover:bg-gray-50 h-9"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSaveMembership}
            disabled={!membershipFormData.name}
            className="bg-[#007AFF] hover:bg-[#0071e3] text-white rounded-md shadow-sm h-9 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {memberships.find(m => m.name.toLowerCase() === membershipFormData.name.toLowerCase()) ? 'Save Changes' : 'Create Tier'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>
  )
} 