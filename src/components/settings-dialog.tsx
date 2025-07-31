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
  Send
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
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, onSnapshot, orderBy, writeBatch, addDoc } from "firebase/firestore"
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

export function SettingsDialog({ open, onOpenChange }: { open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState("Business")
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  
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
            {/* Business Information */}
            <Card className="rounded-md">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div 
                    className="relative w-16 h-16 rounded-md border-2 border-dashed border-muted hover:border-muted-foreground/50 cursor-pointer transition-colors"
                    onClick={() => document.getElementById('logo-upload-dialog')?.click()}
                  >
                    {logoUrl ? (
                      <img 
                        src={logoUrl} 
                        alt="Business Logo" 
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium">
                      {tradingName || legalBusinessName || "Your Business"}
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-600">{businessEmail}</CardDescription>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-1 h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => document.getElementById('logo-upload-dialog')?.click()}
                    >
                      Change logo
                    </Button>
                  </div>
                </div>
                <input
                  id="logo-upload-dialog"
                  type="file"
                  className="hidden"
                  onChange={handleLogoChange}
                  accept="image/*"
                />
                {logoFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    <span>{logoFile.name} ready to upload</span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="legalBusinessName" className="text-sm font-medium">Legal Business Name</Label>
                    <Input
                      id="legalBusinessName"
                      value={legalBusinessName}
                      onChange={(e) => setLegalBusinessName(e.target.value)}
                      placeholder="Legal name as registered"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tradingName" className="text-sm font-medium">Trading Name</Label>
                    <Input
                      id="tradingName"
                      value={tradingName}
                      onChange={(e) => setTradingName(e.target.value)}
                      placeholder="Name customers know you by"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessEmail" className="text-sm font-medium">Primary Email</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      value={businessEmail}
                      readOnly
                      className="bg-muted"
                    />
                    <p className="text-xs text-gray-600">
                      This is your primary account email and cannot be changed
                    </p>
                  </div>
                                        <div className="space-y-2">
                        <Label htmlFor="businessType" className="text-sm font-medium">Business Type</Label>
                    <select 
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {businessTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ABN & Verification */}
            <Card className="rounded-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">ABN & Verification</CardTitle>
                    <CardDescription className="text-xs text-gray-600">
                      Australian Business Number and verification status
                    </CardDescription>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                    {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && (
                      <>
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                        Verified
                      </>
                    )}
                    {abnVerificationStatus === "rejected" && (
                      <>
                        <div className="h-1.5 w-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                        Rejected
                      </>
                    )}
                    {abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && (
                      <>
                        <div className="h-1.5 w-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                        In Review
                      </>
                    )}
                    {!abnVerificationUrl && (
                      <>
                        <div className="h-1.5 w-1.5 bg-gray-500 rounded-full flex-shrink-0"></div>
                        Pending
                      </>
                    )}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                                      <div className="space-y-2">
                        <Label htmlFor="abn" className="text-sm font-medium">Australian Business Number (ABN)</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="abn"
                      value={abn}
                      readOnly
                      placeholder="e.g. 12 345 678 901"
                      className="bg-muted flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAbnVerificationDialog(true)}
                      disabled={!abn}
                    >
                      Change
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We use your ABN to match consumer transactions with your merchant account
                  </p>
                </div>

                <div className="space-y-3">
                  <Label>Verification Document</Label>
                  
                  {abnVerificationUrl && (
                    <div className="flex items-center gap-3 p-3 border rounded-md">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {abnVerificationFile?.name || 'Verification Document'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded for verification
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={abnVerificationUrl} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  )}
                  
                  <div className="border-2 border-dashed rounded-md p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('abn-verification')?.click()}
                      >
                        {abnVerificationUrl ? 'Replace Document' : 'Upload Document'}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, or PNG files accepted
                      </p>
                      {abnVerificationFile && (
                        <p className="text-sm text-muted-foreground">
                          {abnVerificationFile.name} ({(abnVerificationFile.size / 1024).toFixed(1)} KB)
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setAbnVerificationFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="abn-verification"
                    />
                  </div>
                </div>

                {abnVerificationStatus === "rejected" && abnRejectionReason && (
                  <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex gap-3">
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Verification Rejected</p>
                        <p className="text-sm text-muted-foreground">{abnRejectionReason}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('abn-verification')?.click()}
                        >
                          Upload New Document
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && abnVerificationDate && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex gap-3">
                      <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">ABN Verified</p>
                        <p className="text-sm text-green-700">
                          Verified on {abnVerificationDate.toDate ? abnVerificationDate.toDate().toLocaleDateString() : new Date(abnVerificationDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )

      case "Location":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Search for your business address or click on the map to set your exact location
              </p>
              {location.address && location.coordinates && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                  <MapPin className="h-3 w-3" />
                  <span>Location set</span>
                </div>
              )}
            </div>
            
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-900">Address Details</h4>
                <p className="text-xs text-muted-foreground">
                  Review and edit your address details. The location coordinates are set from the map above.
                </p>
              </div>
              
              <div className="space-y-4">
                                  <div className="space-y-2">
                    <Label htmlFor="street" className="text-sm font-medium">Street Address</Label>
                    <Input
                      id="street"
                      placeholder="123 Main Street"
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        // Update location display address
                        setLocation(prev => ({
                          ...prev,
                          address: `${e.target.value}, ${suburb}`,
                          displayAddress: `${e.target.value}, ${suburb}, ${state}, ${postcode}`
                        }));
                      }}
                      className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                    />
                  </div>
                
                <div className="grid grid-cols-2 gap-4">
                                      <div className="space-y-2">
                      <Label htmlFor="suburb" className="text-sm font-medium">Suburb</Label>
                      <Input
                        id="suburb"
                        placeholder="Sydney"
                        value={suburb}
                        onChange={(e) => {
                          setSuburb(e.target.value);
                          // Update location display address
                          setLocation(prev => ({
                            ...prev,
                            address: `${street}, ${e.target.value}`,
                            displayAddress: `${street}, ${e.target.value}, ${state}, ${postcode}`
                          }));
                        }}
                        className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postcode" className="text-sm font-medium">Postcode</Label>
                      <Input
                        id="postcode"
                        placeholder="2000"
                        value={postcode}
                        onChange={(e) => {
                          const newPostcode = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setPostcode(newPostcode);
                          // Update location display address
                          setLocation(prev => ({
                            ...prev,
                            displayAddress: `${street}, ${suburb}, ${state}, ${newPostcode}`
                          }));
                        }}
                        className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                      />
                    </div>
                </div>
                
                                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-sm font-medium">State</Label>
                    <select 
                      id="state"
                      value={state}
                      onChange={(e) => {
                        setState(e.target.value);
                        // Update location display address
                        setLocation(prev => ({
                          ...prev,
                          displayAddress: `${street}, ${suburb}, ${e.target.value}, ${postcode}`
                        }));
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {australianStates.map(state => (
                        <option key={state.value} value={state.value}>
                          {state.label}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>
            </div>
          </div>
        )

      case "Team":
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="repName">Primary Representative Name</Label>
              <Input
                id="repName"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                placeholder="Full name of the main contact"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repPhone">Phone Number</Label>
              <Input
                id="repPhone"
                value={repPhone}
                onChange={(e) => setRepPhone(e.target.value)}
                placeholder="e.g. 0412 345 678"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repEmail">Email Address</Label>
              <Input
                id="repEmail"
                type="email"
                value={repEmail}
                onChange={(e) => setRepEmail(e.target.value)}
                placeholder="contact@yourbusiness.com"
              />
            </div>
          </div>
        )

      case "Merchant ID":
        return (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-md">
              <Label htmlFor="merchantId">Your Merchant ID (for API integration)</Label>
              <div className="flex items-center gap-2 mt-2">
                <code className="bg-gray-100 p-2 rounded-md text-sm font-mono flex-1 overflow-x-auto">
                  {merchantId}
                </code>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(merchantId);
                    toast({
                      title: "Copied!",
                      description: "Merchant ID copied to clipboard",
                    });
                  }}
                >
                  Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                This is your unique merchant identifier for API integration.
              </p>
            </div>
          </div>
        )

      case "Operating Hours":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Operating Hours</h3>
              <p className="text-sm text-muted-foreground">Set your business operating hours for customers</p>
            </div>
            
            <div className="space-y-4">
              {daysOfWeek.map(day => {
                const dayLower = day.toLowerCase()
                return (
                  <div key={day} className="space-y-2 pb-2 border-b">
                    <div className="flex items-center gap-3">
                      <Switch 
                        id={`open-${dayLower}`}
                        checked={!operatingHours[dayLower]?.isClosed}
                        onCheckedChange={(checked) => 
                          updateOperatingHours(dayLower, 'isClosed', !checked)
                        }
                      />
                      <Label htmlFor={`open-${dayLower}`} className="font-medium">{day}</Label>
                    </div>
                    
                    {!operatingHours[dayLower]?.isClosed && (
                      <div className="flex items-center gap-4 ml-8 mt-2">
                        <div className="space-y-1">
                          <Label htmlFor={`open-time-${dayLower}`} className="text-xs">Open</Label>
                          <Input
                            id={`open-time-${dayLower}`}
                            type="time"
                            value={operatingHours[dayLower]?.open || "09:00"}
                            onChange={(e) => updateOperatingHours(dayLower, 'open', e.target.value)}
                            className="w-32"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={`close-time-${dayLower}`} className="text-xs">Close</Label>
                          <Input
                            id={`close-time-${dayLower}`}
                            type="time"
                            value={operatingHours[dayLower]?.close || "17:00"}
                            onChange={(e) => updateOperatingHours(dayLower, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )

      case "Notifications":
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium">Customer Milestones</h3>
              <p className="text-sm text-muted-foreground">Notifications about customer activity and achievements</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>First Purchase</Label>
                  <p className="text-sm text-muted-foreground">
                    When a new customer makes their first purchase
                  </p>
                </div>
                <Switch 
                  checked={notifications.customerFirstPurchase}
                  onCheckedChange={(checked) => updateNotification('customerFirstPurchase', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Purchase Milestones</Label>
                  <p className="text-sm text-muted-foreground">
                    When customers reach their 10th, 25th, 50th purchase
                  </p>
                </div>
                <Switch 
                  checked={notifications.customerMilestone}
                  onCheckedChange={(checked) => updateNotification('customerMilestone', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Customer Birthdays</Label>
                  <p className="text-sm text-muted-foreground">
                    When it's a customer's birthday (if provided)
                  </p>
                </div>
                <Switch 
                  checked={notifications.customerBirthday}
                  onCheckedChange={(checked) => updateNotification('customerBirthday', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Loyalty Anniversary</Label>
                  <p className="text-sm text-muted-foreground">
                    When a customer has been in your loyalty program for 1 year
                  </p>
                </div>
                <Switch 
                  checked={notifications.customerAnniversary}
                  onCheckedChange={(checked) => updateNotification('customerAnniversary', checked)}
                />
              </div>
            </div>
          </div>
        )

      case "Billing":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => setSelectedAccountType("standard")}
                disabled={planLoading}
                className={cn(
                  "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedAccountType === "standard"
                    ? "border-[#007AFF] bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto overflow-hidden">
                    <img 
                      src="/taplogo.png" 
                      alt="Tap Standard" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Tap Standard</p>
                    <p className="text-xs text-gray-500 mt-1">Your rules, your points.</p>
                    {!isNetworkStore && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                          Current Plan
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedAccountType("network")}
                disabled={planLoading}
                className={cn(
                  "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF] disabled:opacity-50 disabled:cursor-not-allowed",
                  selectedAccountType === "network"
                    ? "border-[#007AFF] bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto overflow-hidden">
                    <img 
                      src="/tappro.png" 
                      alt="Tap Network" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Tap Network</p>
                    <p className="text-xs text-gray-500 mt-1">Earn here, spend everywhere.</p>
                    {isNetworkStore && (
                      <div className="mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                          <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                          Current Plan
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>

            <div className="border rounded-md p-6 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-md overflow-hidden">
                    <img 
                      src={isNetworkStore ? "/tappro.png" : "/taplogo.png"}
                      alt={isNetworkStore ? "Tap Network" : "Tap Standard"}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="font-semibold text-lg text-gray-900">
                      {isNetworkStore ? "Tap Network" : "Tap Standard"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                    Active
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={planLoading || (selectedAccountType === (isNetworkStore ? "network" : "standard"))}
                    onClick={() => updateMerchantPlan(selectedAccountType === "network")}
                  >
                    {planLoading ? (
                      <div className="flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Updating...
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

            {/* Refund Account Section */}
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle className="text-base font-medium">Refund Account</CardTitle>
                <CardDescription className="text-xs text-gray-600">Bank details for Tap Loyalty funded rewards refunds</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p>Enter your bank details below to receive refunds for Tap Loyalty funded rewards.</p>
                      <p className="mt-1">Refunds are processed at the end of each month for all eligible redemptions.</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bsbNumber" className="text-sm font-medium">BSB Number</Label>
                    <Input
                      id="bsbNumber"
                      value={bsbNumber}
                      onChange={(e) => setBsbNumber(e.target.value)}
                      placeholder="e.g. 123-456"
                      maxLength={7}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber" className="text-sm font-medium">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 12345678"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="accountName" className="text-sm font-medium">Account Name</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. Business Name Pty Ltd"
                  />
                  <p className="text-xs text-gray-600">
                    Enter the exact name as it appears on your bank account
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case "Memberships":
        return (
          <div className="space-y-6">
            <div className="text-xs text-gray-600 space-y-1 pb-4 border-b border-gray-100">
              <p>All customers automatically start at the <strong>Bronze tier</strong> and are upgraded as they meet conditions for higher tiers.</p>
              <p>The Bronze tier serves as the default starting point and cannot be modified.</p>
            </div>
            
            {membershipLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : memberships.length === 0 ? (
              <div className="bg-muted/50 border rounded-md shadow-sm p-8 text-center">
                <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-base font-medium mb-2">No Membership Tiers</h3>
                <p className="text-xs text-gray-600 mb-4 max-w-md mx-auto">
                  Create membership tiers to segment your customers and offer targeted rewards.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memberships.map(membership => (
                  <div key={membership.id} className="border rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium">{membership.name}</h3>
                        {membership.name.toLowerCase() === 'bronze' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                            Default
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                                          <span className="text-xs text-gray-600">
                    {membership.isActive ? 'Active' : 'Inactive'}
                  </span>
                        <Switch 
                          checked={membership.isActive}
                          onCheckedChange={async (checked) => {
                            try {
                              await updateDoc(
                                doc(db, 'merchants', user!.uid!, 'memberships', membership.id),
                                {
                                  isActive: checked,
                                  updatedAt: serverTimestamp()
                                }
                              )
                              
                              toast({
                                title: "Status Updated",
                                description: `${membership.name} tier is now ${checked ? 'active' : 'inactive'}`,
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
                          disabled={membership.name.toLowerCase() === 'bronze'}
                        />
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3">{membership.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Customers:</span>
                        <span className="font-medium">{membership.customerCount || 0}</span>
                      </div>
                      
                      <div className="space-y-1">
                        <span className="text-xs font-medium">Requirements:</span>
                        {membership.conditions && Object.entries(membership.conditions).map(([type, condition]) => {
                          if (!condition.enabled) return null;
                          
                          return (
                            <div key={type} className="flex items-center justify-between text-xs">
                              <span>
                                {type === "lifetimeTransactions" 
                                  ? "Lifetime Transactions" 
                                  : type === "lifetimeSpend"
                                  ? "Lifetime Spend"
                                  : type === "numberOfRedemptions"
                                  ? "Number of Redemptions"
                                  : type}
                              </span>
                              <span className="font-medium">
                                {type === "lifetimeSpend"
                                  ? `$${condition.value.toFixed(2)}`
                                  : condition.value}
                              </span>
                            </div>
                          );
                        })}
                        
                        {(!membership.conditions || Object.entries(membership.conditions).filter(([_, c]) => c.enabled).length === 0) && (
                          <div className="text-xs text-gray-600">
                            No active conditions
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                    // Prevent activating store without a logo
                    if (checked) {
                      const hasLogo = logoUrl && 
                                     typeof logoUrl === 'string' && 
                                     logoUrl.trim() !== '';
                      
                      if (!hasLogo) {
                        toast({
                          title: "Logo Required",
                          description: "Please upload a business logo before activating your store.",
                          variant: "destructive"
                        });
                        return;
                      }
                    }

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
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
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
  </>
  )
} 