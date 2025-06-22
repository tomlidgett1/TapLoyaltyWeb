"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { 
  User, 
  Bell, 
  CreditCard, 
  Users, 
  Store, 
  Layers, 
  ShieldCheck,
  ShieldAlert,
  Mail,
  Smartphone,
  Palette,
  Save,
  Upload,
  MapPin,
  Key,
  Gift,
  BarChart,
  FileText,
  Image as ImageIcon,
  Download,
  Brain,
  Badge as BadgeIcon,
  ShoppingBag,
  Calendar,
  Clock,
  AlertCircle
} from "lucide-react"
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { signInWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import { toast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { MapLocationPicker } from "@/components/map-location-picker"

const SettingsPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")
  
  // Days of the week - moved to the top
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  
  // Form states from signup page
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
  
  // Other existing states
  const [businessName, setBusinessName] = useState("My Business")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [notificationsEmail, setNotificationsEmail] = useState(true)
  const [notificationsSMS, setNotificationsSMS] = useState(false)
  const [notificationsApp, setNotificationsApp] = useState(true)
  
  // Australian states from signup page
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
  
  // Business types from signup page
  const businessTypes = [
    { value: "cafe", label: "Cafe" },
    { value: "restaurant", label: "Restaurant" },
    { value: "retail", label: "Retail" },
    { value: "salon", label: "Salon" },
    { value: "gym", label: "Gym" },
    { value: "other", label: "Other" }
  ]
  
  // Representative Details from signup page
  const [repName, setRepName] = useState("")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  
  // Operating Hours from signup page - moved after daysOfWeek
  const [operatingHours, setOperatingHours] = useState(() => {
    const defaultHours = {}
    daysOfWeek.forEach(day => {
      defaultHours[day.toLowerCase()] = {
        isOpen: true,
        openTime: "09:00",
        closeTime: "17:00"
      }
    })
    return defaultHours
  })
  
  // Business Verification & Systems from signup page
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
  
  // Point of sale systems
  const pointOfSaleSystems = [
    { value: "lightspeed", label: "Lightspeed" },
    { value: "square", label: "Square" },
    { value: "shopify", label: "Shopify" },
    { value: "vend", label: "Vend" },
    { value: "other", label: "Other" },
    { value: "none", label: "None" }
  ]

  // Payment providers
  const paymentProviders = [
    { value: "square", label: "Square" },
    { value: "stripe", label: "Stripe" },
    { value: "paypal", label: "PayPal" },
    { value: "eftpos", label: "EFTPOS" },
    { value: "other", label: "Other" },
    { value: "none", label: "None" }
  ]
  
  // Add merchantId to state variables
  const [merchantId, setMerchantId] = useState("")
  
  // Add this state variable for the primary color
  const [primaryColor, setPrimaryColor] = useState("#007AFF")
  
  // Add these state variables for notification settings
  const [notifications, setNotifications] = useState({
    // Customer Milestones
    customerFirstPurchase: true,
    customerMilestone: true,
    customerBirthday: true,
    customerAnniversary: false,
    
    // Rewards Activity
    rewardCreated: true,
    rewardRedeemed: true,
    rewardExpiring: true,
    pointsAwarded: false,
    
    // Business Performance
    dailySummary: true,
    weeklySummary: true,
    monthlySummary: true,
    salesTarget: false,
    
    // System Notifications
    systemUpdates: true,
    securityAlerts: true,
    paymentIssues: true,
    lowInventory: false
  })
  
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
          setLegalBusinessName(data.legalName || "")
          setTradingName(data.tradingName || "")
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
            
            // Also set the individual state variables for backward compatibility
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
          
          // Set business insights for Tap Agent
          if (data.businessInsights) {
            setBusinessInsights({
              ...businessInsights,
              ...data.businessInsights
            });
          }
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
    
    fetchMerchantData()
  }, [user])
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file (PNG, JPG, or SVG)",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      // Set the file to state
      setLogoFile(file);
      
      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);
      setLogoUrl(previewUrl);
      
      toast({
        title: "Logo Selected",
        description: "Click Save Changes to upload your new logo",
      });
    }
  };
  
  const updateOperatingHours = (day: string, field: string, value: any) => {
    setOperatingHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }))
  }
  
  const handleAbnFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAbnVerificationFile(e.target.files[0])
    }
  }
  
  // Function to update ABN with password verification
  const updateAbnWithVerification = async () => {
    if (!user?.uid || !user?.email || !verificationPassword) {
      setPasswordError("Please enter your password");
      return;
    }
    
    if (!newAbn.trim()) {
      setPasswordError("Please enter a valid ABN");
      return;
    }
    
    setVerifyingPassword(true);
    setPasswordError("");
    
    try {
      // Attempt to reauthenticate the user
      let authenticated = false;
      
      if (auth.currentUser) {
        try {
          const credential = EmailAuthProvider.credential(user.email, verificationPassword);
          await reauthenticateWithCredential(auth.currentUser, credential);
          authenticated = true;
        } catch (authError) {
          console.error("Reauthentication failed:", authError);
          setPasswordError("Incorrect password. Please try again.");
          setVerifyingPassword(false);
          return;
        }
      } else {
        try {
          // If no current user in auth, try to sign in
          await signInWithEmailAndPassword(auth, user.email, verificationPassword);
          authenticated = true;
        } catch (authError) {
          console.error("Sign in failed:", authError);
          setPasswordError("Incorrect password. Please try again.");
          setVerifyingPassword(false);
          return;
        }
      }
      
      if (authenticated) {
        // Update Firestore with the new ABN
        const merchantRef = doc(db, 'merchants', user.uid);
        
        try {
          // Update ABN in Firestore
          await updateDoc(merchantRef, {
            abn: newAbn,
            updatedAt: serverTimestamp()
          });
          
          // Update local state
          setAbn(newAbn);
          setShowAbnVerificationDialog(false);
          setVerificationPassword("");
          
          toast({
            title: "ABN Updated",
            description: "Your ABN has been successfully updated and saved to your account",
          });
        } catch (firestoreError) {
          console.error("Firestore update failed:", firestoreError);
          toast({
            title: "Update Failed",
            description: "There was an error saving your ABN. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("ABN update process failed:", error);
      setPasswordError("An unexpected error occurred. Please try again.");
    } finally {
      setVerifyingPassword(false);
    }
  }
  
  const toggleStoreStatus = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    
    try {
      const merchantRef = doc(db, 'merchants', user.uid)
      
      // Update store status
      await updateDoc(merchantRef, {
        status: storeActive ? "inactive" : "active"
      })
      
      setStoreActive(!storeActive)
      
      toast({
        title: storeActive ? "Store Deactivated" : "Store Activated",
        description: storeActive 
          ? "Your store is now hidden from customers" 
          : "Your store is now visible to customers",
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
  
  // Function to upload files to Firebase Storage
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
      console.log(`Uploading ${fileType} to: ${storagePath}`);
      
      // Upload to Firebase Storage
      const storage = getStorage();
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, { 
        contentType: file.type || 'application/octet-stream' 
      });
      
      // Return a promise that resolves with the download URL
      return await new Promise<string | null>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Handle progress if needed
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
              // Get download URL after successful upload
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
    
    setLoading(true);
    console.log("Save process started");
    
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
      let documentUploaded = false;
      
      if (abnVerificationFile) {
        try {
          const uploadedVerificationUrl = await uploadFileToStorage(abnVerificationFile, "verification");
          if (uploadedVerificationUrl) {
            newAbnVerificationUrl = uploadedVerificationUrl;
            setAbnVerificationUrl(uploadedVerificationUrl);
            setAbnVerificationFile(null);
            documentUploaded = true;
            
            // Set verification status to pending when a new document is uploaded
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
      
      // Handle other document upload
      if (documentFile) {
        try {
          const documentUrl = await uploadFileToStorage(documentFile, "document");
          if (documentUrl) {
          // Add to documents array
          const newDocument = {
            name: documentFile.name,
            url: documentUrl,
              path: `merchants/${user.uid}/files/${documentFile.name}`,
            uploadedAt: new Date()
          };
          
          setDocuments(prev => [...prev, newDocument]);
          setDocumentFile(null);
          
          toast({
            title: "Document Uploaded",
            description: "Your document has been uploaded successfully.",
          });
          }
        } catch (error) {
          console.error("Error uploading document:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload document. Please try again.",
            variant: "destructive"
          });
        }
      }
      
      // Save all changes to Firestore
      const merchantData = {
        legalName: legalBusinessName,
        tradingName: tradingName,
        businessEmail: businessEmail,
        businessType: businessType,
        logoUrl: newLogoUrl,
        merchantName: tradingName,
        address: {
          street,
          suburb,
          state,
          postcode
        },
        location: {
          address: `${street}, ${suburb}`,
          coordinates: {
            latitude,
            longitude
          },
          displayAddress: formattedAddress
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
        status: storeActive ? "active" : "inactive",
        abnVerification: {
          status: abnVerificationStatus,
          rejectionReason: abnRejectionReason,
          verificationDate: abnVerificationDate,
          lastUpdated: serverTimestamp()
        },
        notifications,
        businessInsights,
        // Bank account details for refunds
        refundAccount: {
          bsb: bsbNumber,
          accountNumber: accountNumber,
          accountName: accountName,
          updatedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp(),
        documents: documents.map(doc => ({
          name: doc.name,
          path: doc.path,
          uploadedAt: doc.uploadedAt,
          url: doc.url
        }))
      };
      
      // Update Firestore
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

  const [profileSection, setProfileSection] = useState('business')
  const [notificationSection, setNotificationSection] = useState('channels')
  const [billingSection, setBillingSection] = useState('refunds')
  
  // Bank account details for refunds
  const [bsbNumber, setBsbNumber] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState("")
  
  // Tap funded rewards sheet
  const [showTapRewardsSheet, setShowTapRewardsSheet] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Use June 2025 as the current month
    return "2025-06"
  })
  const [tapRewards, setTapRewards] = useState<Array<{
    id: string;
    customerId: string;
    merchantId: string;
    pointsUsed: number;
    redemptionDate: Date;
    redemptionId: string;
    rewardId: string;
    rewardName: string;
    rewardTypeDetails: string;
    status: string;
    type: string;
    refundAmount: number;
  }>>([])
  const [isLoadingRewards, setIsLoadingRewards] = useState(false)
  const [totalRefundAmount, setTotalRefundAmount] = useState(0)
  
  // Generate the last 6 months (current month + 5 previous months)
  const months = (() => {
    const result = [];
    const currentDate = new Date(2025, 5, 1); // June 2025 (months are 0-indexed)
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // Convert to 1-indexed
      const monthValue = `${year}-${month.toString().padStart(2, '0')}`;
      
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      
      result.push({
        value: monthValue,
        label: `${monthNames[date.getMonth()]} ${year}`
      });
    }
    
    return result;
  })()

  // Function to update notification settings
  const updateNotification = (key: string, value: boolean) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Handle document file selection
  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Set the file to state
      setDocumentFile(file);
      
      // Show a toast to indicate the file is ready
      toast({
        title: "File Selected",
        description: `${file.name} is ready to upload`,
      });
      
      // Note: We don't immediately add to documents array anymore
      // The file will be uploaded when the user clicks Save
    }
  };

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [mockDocumentUrl, setMockDocumentUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Array<{name: string, url: string, path: string, uploadedAt: Date}>>([]);

  // Add this state variable
  const [mockLogoUrl, setMockLogoUrl] = useState<string | null>(null);

  // Tap Agent related state variables
  const [agentSection, setAgentSection] = useState('products')
  const [businessInsights, setBusinessInsights] = useState({
    // Products and Services
    productTypes: "",
    topProducts: "",
    productPriceRange: "",
    productSeasonality: "",
    
    // Customer Information
    customerDemographics: "",
    customerPreferences: "",
    frequencyOfVisit: "",
    averagePurchaseValue: "",
    
    // Competition & Market
    mainCompetitors: "",
    uniqueSellingPoints: "",
    industryTrends: "",
    businessChallenges: "",
    
    // Goals & Strategy
    businessGoals: "",
    targetedOutcomes: "",
    preferredRewardTypes: "",
    previousSuccessfulPromotions: ""
  });

  // Function to update business insights
  const updateBusinessInsight = (key: string, value: string) => {
    setBusinessInsights(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  // Function to format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Function to fetch Tap-funded rewards
  const fetchTapFundedRewards = async (month: string) => {
    if (!user?.uid) return;
    
    setIsLoadingRewards(true);
    setTapRewards([]);
    setTotalRefundAmount(0);
    
    try {
      // Parse year and month from selected month (format: YYYY-MM)
      const [year, monthNum] = month.split('-').map(Number);
      
      // Create start and end dates for the selected month
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999); // Last day of month
      
      // Query Firestore for redemptions in the specified month with type "tapfunded"
      const redemptionsRef = collection(db, `merchants/${user.uid}/redemptions`);
      const q = query(
        redemptionsRef,
        where('type', '==', 'tapfunded'),
        where('redemptionDate', '>=', startDate),
        where('redemptionDate', '<=', endDate)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setIsLoadingRewards(false);
        return;
      }
      
      const rewards: Array<{
        id: string;
        customerId: string;
        merchantId: string;
        pointsUsed: number;
        redemptionDate: Date;
        redemptionId: string;
        rewardId: string;
        rewardName: string;
        rewardTypeDetails: string;
        status: string;
        type: string;
        refundAmount: number;
      }> = [];
      
      let total = 0;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Calculate refund amount (this would typically come from the server)
        // For now, we'll use a placeholder value of $5 per reward
        const refundAmount = 5.00;
        
        const reward = {
          id: doc.id,
          customerId: data.customerId || '',
          merchantId: data.merchantId || user.uid,
          pointsUsed: data.pointsUsed || 0,
          redemptionDate: data.redemptionDate?.toDate() || new Date(),
          redemptionId: data.redemptionId || doc.id,
          rewardId: data.rewardId || '',
          rewardName: data.rewardName || 'Unnamed Reward',
          rewardTypeDetails: data.rewardTypeDetails || '',
          status: data.status || 'successful',
          type: data.type || 'tapfunded',
          refundAmount: refundAmount
        };
        
        rewards.push(reward);
        total += refundAmount;
      });
      
      // Sort by date (newest first)
      rewards.sort((a, b) => b.redemptionDate.getTime() - a.redemptionDate.getTime());
      
      setTapRewards(rewards);
      setTotalRefundAmount(total);
    } catch (error) {
      console.error('Error fetching tap-funded rewards:', error);
      toast({
        title: "Error",
        description: "Failed to load rewards. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRewards(false);
    }
  };

  // Effect to load tap funded rewards when the sheet opens or month changes
  useEffect(() => {
    if (showTapRewardsSheet) {
      fetchTapFundedRewards(selectedMonth);
    }
  }, [showTapRewardsSheet, selectedMonth, user?.uid]);

  if (dataLoading) {
    return (
      <PageTransition>
        <div className="p-6">
          {/* Empty state instead of spinner */}
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 py-4 space-y-6">
        <Tabs defaultValue="profile" className="space-y-6">
          {/* Tab Container with Store Status */}
          <div className="flex justify-between items-center">
            {/* Main Tab Container */}
            <TabsList className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit h-auto">
            <TabsTrigger 
              value="profile" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200/70"
                )}
            >
              <User size={15} />
              Profile
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200/70"
                )}
            >
              <Bell size={15} />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="billing" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200/70"
                )}
            >
              <CreditCard size={15} />
              Billing
            </TabsTrigger>
            <TabsTrigger 
              value="team" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200/70"
                )}
            >
              <Users size={15} />
              Team
            </TabsTrigger>
            <TabsTrigger 
              value="store" 
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  "data-[state=active]:text-gray-800 data-[state=active]:bg-white data-[state=active]:shadow-sm",
                  "data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200/70"
                )}
            >
              <Store size={15} />
              Store
            </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Submenu - New Design */}
              <div className="md:col-span-1">
                <Card className="overflow-hidden rounded-md">
                  <div className="p-4 border-b flex flex-col items-center">
                    <div 
                      className="w-24 h-24 rounded-full overflow-hidden border mb-3 relative group cursor-pointer"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {logoUrl ? (
                        <>
                        <img 
                          src={logoUrl} 
                          alt={tradingName || "Business Logo"} 
                          className="w-full h-full object-cover"
                        />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Store className="h-8 w-8 text-gray-400" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      )}
                      <input
                        id="logo-upload"
                        type="file"
                        className="hidden"
                        onChange={handleLogoChange}
                        accept="image/*"
                      />
                    </div>
                    <h3 className="font-medium text-sm">{tradingName || legalBusinessName || "Your Business"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{businessEmail || "No email set"}</p>
                    {logoFile && (
                      <div className="mt-2 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md text-xs">
                        <ImageIcon className="h-3 w-3 text-blue-600" />
                        <span className="text-blue-700 font-medium">{logoFile.name}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-2">
                    {[
                      { id: 'business', label: 'Business Information', icon: <Store className="h-4 w-4" /> },
                      { id: 'address', label: 'Business Location', icon: <MapPin className="h-4 w-4" /> },
                      { id: 'merchant', label: 'Merchant ID', icon: <Key className="h-4 w-4" /> }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setProfileSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                          profileSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-6 h-6 ${
                          profileSection === item.id 
                            ? 'text-blue-700' 
                            : 'text-gray-500'
                        }`}>
                          {item.icon}
                        </div>
                        <span className={`text-sm ${profileSection === item.id ? 'font-medium' : 'font-normal'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
              
              {/* Right Content Area */}
              <div className="md:col-span-3">
                <Card className="rounded-md">
                  <CardHeader>
                    <CardTitle>
                      {profileSection === 'business' && "Business Information"}
                      {profileSection === 'address' && "Business Location"}
                      {profileSection === 'merchant' && "Merchant ID"}
                    </CardTitle>
                    <CardDescription>
                      {profileSection === 'business' && "Update your business details"}
                      {profileSection === 'address' && "Set your business location on the map"}
                      {profileSection === 'merchant' && "Your unique merchant identifier"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Business Information Section */}
                    {profileSection === 'business' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="legalBusinessName">Legal Business Name</Label>
                            <Input
                              id="legalBusinessName"
                              value={legalBusinessName}
                              onChange={(e) => setLegalBusinessName(e.target.value)}
                              placeholder="Legal name as registered"
                            />
                            <p className="text-xs text-muted-foreground">
                              Must match your ABN registration
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="tradingName">Trading Name</Label>
                            <Input
                              id="tradingName"
                              value={tradingName}
                              onChange={(e) => setTradingName(e.target.value)}
                              placeholder="Name customers know you by"
                            />
                            <p className="text-xs text-muted-foreground">
                              This is the name displayed to customers in the Tap app
                            </p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="businessEmail">Primary Email</Label>
                          </div>
                          <Input
                            id="businessEmail"
                            type="email"
                            value={businessEmail}
                            readOnly
                            disabled
                            className="bg-gray-50"
                          />
                          <p className="text-xs text-muted-foreground">
                            This is your primary account email and cannot be changed
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="businessType">Business Type</Label>
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
                    
                        <div className="space-y-2">
                          <Label htmlFor="abn">Australian Business Number (ABN)</Label>
                          <div className="relative">
                          <Input 
                              id="abn"
                              value={abn}
                              readOnly
                              placeholder="e.g. 12 345 678 901"
                              className="bg-gray-50"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="absolute right-1 top-1 h-7"
                              onClick={() => {
                                setNewAbn(abn);
                                setShowAbnVerificationDialog(true);
                              }}
                            >
                              Change
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1">
                            <ShieldCheck className="h-3.5 w-3.5 text-gray-500" />
                            <p className="text-xs text-gray-600">
                              Password verification required to change ABN
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            We use your ABN to match consumer transactions with your merchant account
                          </p>
                        </div>
                        
                        {/* ABN Verification Dialog */}
                        <Dialog open={showAbnVerificationDialog} onOpenChange={setShowAbnVerificationDialog}>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Change ABN</DialogTitle>
                              <DialogDescription>
                                Password verification is required to change your ABN as it's critical for transaction matching.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                        <div className="space-y-2">
                                <Label htmlFor="currentAbn">Current ABN</Label>
                          <Input 
                                  id="currentAbn"
                                  value={abn}
                                  readOnly
                                  className="bg-gray-50"
                          />
                        </div>
                        
                          <div className="space-y-2">
                                <Label htmlFor="newAbn">New ABN</Label>
                                <Input
                                  id="newAbn"
                                  value={newAbn}
                                  onChange={(e) => setNewAbn(e.target.value)}
                                  placeholder="e.g. 12 345 678 901"
                                />
                          </div>
                          
                          <div className="space-y-2">
                                <Label htmlFor="password">
                                  Password
                                </Label>
                            <Input 
                                  id="password"
                                  type="password"
                                  value={verificationPassword}
                                  onChange={(e) => setVerificationPassword(e.target.value)}
                                  placeholder="Enter your password"
                            />
                          </div>
                              
                              {passwordError && (
                                <div className="text-sm text-red-500">
                                  {passwordError}
                        </div>
                              )}
                              
                              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                                <div className="flex items-start gap-2">
                                  <ShieldAlert className="h-4 w-4 text-gray-500 mt-0.5" />
                                  <div className="text-sm text-gray-600">
                                    <p className="text-gray-700">Changing your ABN affects how transactions are matched to your account. Incorrect ABN details may result in missed rewards and payments.</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <DialogFooter className="sm:justify-between">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowAbnVerificationDialog(false);
                                  setVerificationPassword("");
                                  setPasswordError("");
                                  setNewAbn(abn);
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                type="button"
                                onClick={updateAbnWithVerification}
                                disabled={verificationPassword.length < 6 || verifyingPassword || !newAbn.trim()}
                              >
                                {verifyingPassword ? "Verifying..." : "Update ABN"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        
                        <div className="space-y-2">
                          <Label>ABN Verification Document</Label>
                          <div className="border rounded-md p-4 bg-gray-50">
                            {abnVerificationUrl ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-blue-600" />
                                    <div>
                                      <span className="text-sm font-medium">Verification document uploaded</span>
                                      {abnVerificationFile ? (
                                        <p className="text-xs text-muted-foreground mt-0.5">{abnVerificationFile.name}</p>
                                      ) : (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {abnVerificationUrl.split('/').pop()?.split('-').slice(1).join('-') || 'Verification document'}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <a 
                                    href={abnVerificationUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                  >
                                    View
                                  </a>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Upload a new document to replace the existing one
                                </p>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground mb-2">
                                Please upload a document that verifies your business name matches the ABN (e.g. ABN registration, business registration certificate)
                              </p>
                            )}
                            
                            <div className="mt-2">
                              <input
                                id="abn-verification"
                                type="file"
                                className="hidden"
                                onChange={handleAbnFileChange}
                                accept=".pdf,.jpg,.jpeg,.png"
                              />
                              <div className="flex items-center gap-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => document.getElementById('abn-verification')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  {abnVerificationUrl ? 'Replace Document' : 'Upload Document'}
                                </Button>
                                {abnVerificationFile && (
                                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                                    <FileText className="h-3 w-3 text-blue-600" />
                                    <span className="text-xs text-blue-700 font-medium">
                                      {abnVerificationFile.name}
                                    </span>
                                    <span className="text-xs text-blue-500">
                                      ({(abnVerificationFile.size / 1024).toFixed(1)} KB)
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* ABN Verification Status Section */}
                        <div className="space-y-2">
                          <Label>ABN Verification Status</Label>
                          <div className="border rounded-md overflow-hidden">
                            <div className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {abnVerificationStatus === "approved" || abnVerificationStatus === "verified" ? (
                                    <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                      <ShieldCheck className="h-4 w-4 text-green-600" />
                                    </div>
                                  ) : abnVerificationStatus === "rejected" ? (
                                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                      <ShieldAlert className="h-4 w-4 text-red-600" />
                                    </div>
                                  ) : abnVerificationUrl ? (
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <Clock className="h-4 w-4 text-blue-600" />
                                    </div>
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                                      <AlertCircle className="h-4 w-4 text-gray-500" />
                                    </div>
                                  )}
                                  <div>
                                    <h4 className="text-sm font-medium">
                                      {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && "ABN Verified"}
                                      {abnVerificationStatus === "rejected" && "Verification Failed"}
                                      {abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && "In Review"}
                                      {!abnVerificationUrl && "No Document Uploaded"}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && "Your ABN has been verified by Tap Loyalty"}
                                      {abnVerificationStatus === "rejected" && "Your ABN verification was rejected. Please check the reason below."}
                                      {abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && "Your ABN is currently being reviewed by Tap Loyalty"}
                                      {!abnVerificationUrl && "Please upload a verification document to begin the verification process"}
                                    </p>
                                  </div>
                                </div>
                                
                                <Badge 
                                  className={cn(
                                    "capitalize px-2 py-0.5",
                                    (abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && "bg-green-100 text-green-800 hover:bg-green-100",
                                    abnVerificationStatus === "rejected" && "bg-red-100 text-red-800 hover:bg-red-100",
                                    abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && "bg-blue-100 text-blue-800 hover:bg-blue-100",
                                    !abnVerificationUrl && "bg-gray-100 text-gray-800 hover:bg-gray-100"
                                  )}
                                >
                                  {(abnVerificationStatus === "approved" || abnVerificationStatus === "verified") && "Verified"}
                                  {abnVerificationStatus === "rejected" && "Rejected"}
                                  {abnVerificationUrl && !["approved", "verified", "rejected"].includes(abnVerificationStatus) && "In Review"}
                                  {!abnVerificationUrl && "No Document"}
                                </Badge>
                              </div>
                              
                              {abnVerificationStatus === "rejected" && abnRejectionReason && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                                    <div>
                                      <h5 className="text-xs font-medium text-red-800">Reason for Rejection</h5>
                                      <p className="text-xs text-red-700 mt-1">{abnRejectionReason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              
                              {abnVerificationStatus === "approved" && abnVerificationDate && (
                                <div className="mt-3 text-xs text-muted-foreground">
                                  Verified on {formatDate(abnVerificationDate.toDate())}
                                </div>
                              )}
                            </div>
                            
                            {abnVerificationStatus === "rejected" && (
                              <div className="border-t p-3 bg-gray-50 flex justify-end">
                                <Button 
                                  type="button" 
                                  size="sm"
                                  onClick={() => document.getElementById('abn-verification')?.click()}
                                >
                                  Upload New Document
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        

                      </div>
                    )}
                    
                    {/* Business Location Section */}
                    {profileSection === 'address' && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-4">
                            Search for your business address or click on the map to set your exact location
                          </p>
                          
                          {location.address && location.coordinates && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-md">
                              <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Location</h4>
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 mt-0.5 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium">{location.displayAddress}</p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Coordinates: {location.coordinates.latitude?.toFixed(6)}, {location.coordinates.longitude?.toFixed(6)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          <MapLocationPicker
                            initialAddress={formattedAddress || `${street}, ${suburb}, ${state}, ${postcode}, Australia`}
                            initialLatitude={latitude}
                            initialLongitude={longitude}
                            onLocationChange={(locationData) => {
                              // Update individual state variables for backward compatibility
                              setLatitude(locationData.latitude);
                              setLongitude(locationData.longitude);
                              setFormattedAddress(locationData.formattedAddress || locationData.address);
                              
                              // Extract just street and suburb for the address field
                              const addressParts = locationData.address.split(',');
                              const simpleAddress = addressParts.length >= 2 
                                ? `${addressParts[0].trim()}, ${addressParts[1].trim()}`
                                : locationData.address;
                              
                              // Update the location object with the required structure
                              setLocation({
                                address: simpleAddress,
                                coordinates: {
                                  latitude: locationData.latitude,
                                  longitude: locationData.longitude
                                },
                                displayAddress: locationData.formattedAddress || locationData.address
                              });
                              
                              // Try to extract address components for hidden form fields
                              // We still need to update these for backward compatibility
                              const addressComponentParts = locationData.address.split(',');
                              
                              // Extract street (first part)
                              const streetPart = addressComponentParts[0]?.trim() || "";
                              setStreet(streetPart);
                              
                              // Extract suburb (second part)
                              const suburbPart = addressComponentParts[1]?.trim() || "";
                              setSuburb(suburbPart);
                              
                              // Try to extract state and postcode from the full address
                              const fullAddressParts = (locationData.formattedAddress || locationData.address).split(',');
                              if (fullAddressParts.length >= 3) {
                                // Last part might contain state and postcode
                                const lastPart = fullAddressParts[fullAddressParts.length - 1].trim();
                                
                                // Try to extract postcode (usually 4 digits)
                                const postcodeMatch = lastPart.match(/\b\d{4}\b/);
                                if (postcodeMatch) {
                                  setPostcode(postcodeMatch[0]);
                                }
                                
                                // Try to extract state (usually 2-3 letters like VIC, NSW)
                                const stateMatch = lastPart.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/i);
                                if (stateMatch) {
                                  setState(stateMatch[0].toUpperCase());
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Merchant ID Section */}
                    {profileSection === 'merchant' && (
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-3 rounded-md">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <Label htmlFor="merchantId">Your Merchant ID (for API integration)</Label>
                              <div className="flex items-center gap-2">
                                <code className="bg-gray-100 p-2 rounded text-sm font-mono w-full overflow-x-auto">
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
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            This is your unique merchant identifier. You'll need this when integrating with our API.
                          </p>
                        </div>
                        

                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        className="gap-2" 
                        onClick={handleSave}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4" />
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Submenu */}
              <div className="md:col-span-1">
                <Card className="overflow-hidden rounded-md">
                  <div className="p-2">
                    {[
                      { id: 'channels', label: 'Notification Channels', icon: <Bell className="h-4 w-4" /> },
                      { id: 'customers', label: 'Customer Milestones', icon: <User className="h-4 w-4" /> },
                      { id: 'rewards', label: 'Rewards Activity', icon: <Gift className="h-4 w-4" /> },
                      { id: 'business', label: 'Business Performance', icon: <BarChart className="h-4 w-4" /> },
                      { id: 'system', label: 'System Notifications', icon: <ShieldAlert className="h-4 w-4" /> }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setNotificationSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                          notificationSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-6 h-6 ${
                          notificationSection === item.id 
                            ? 'text-blue-700' 
                            : 'text-gray-500'
                        }`}>
                          {item.icon}
                        </div>
                        <span className={`text-sm ${notificationSection === item.id ? 'font-medium' : 'font-normal'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
              
              {/* Right Content Area */}
              <div className="md:col-span-3">
                <Card className="rounded-md">
                  <CardHeader>
                    <CardTitle>
                      {notificationSection === 'channels' && "Notification Channels"}
                      {notificationSection === 'customers' && "Customer Milestones"}
                      {notificationSection === 'rewards' && "Rewards Activity"}
                      {notificationSection === 'business' && "Business Performance"}
                      {notificationSection === 'system' && "System Notifications"}
                    </CardTitle>
                    <CardDescription>
                      {notificationSection === 'channels' && "Choose how you want to receive notifications"}
                      {notificationSection === 'customers' && "Notifications about customer activity and achievements"}
                      {notificationSection === 'rewards' && "Notifications about rewards and points"}
                      {notificationSection === 'business' && "Notifications about your business metrics and performance"}
                      {notificationSection === 'system' && "Important system and account notifications"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Notification Channels Section */}
                    {notificationSection === 'channels' && (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select how you want to receive notifications
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="notifyEmail" 
                              checked={notificationsEmail}
                              onCheckedChange={setNotificationsEmail}
                            />
                            <div className="grid gap-1.5">
                              <Label htmlFor="notifyEmail" className="font-medium">Email</Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications via email
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="notifySMS" 
                              checked={notificationsSMS}
                              onCheckedChange={setNotificationsSMS}
                            />
                            <div className="grid gap-1.5">
                              <Label htmlFor="notifySMS" className="font-medium">SMS</Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications via text message
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="notifyApp" 
                              checked={notificationsApp}
                              onCheckedChange={setNotificationsApp}
                            />
                            <div className="grid gap-1.5">
                              <Label htmlFor="notifyApp" className="font-medium">In-App</Label>
                              <p className="text-sm text-muted-foreground">
                                Receive notifications in the dashboard
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Customer Milestones Section */}
                    {notificationSection === 'customers' && (
                      <div className="space-y-4">
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
                    )}
                    
                    {/* Rewards Activity Section */}
                    {notificationSection === 'rewards' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>New Reward Created</Label>
                            <p className="text-sm text-muted-foreground">
                              When you or your team creates a new reward
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.rewardCreated}
                            onCheckedChange={(checked) => updateNotification('rewardCreated', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Reward Redemptions</Label>
                            <p className="text-sm text-muted-foreground">
                              When a customer redeems a reward
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.rewardRedeemed}
                            onCheckedChange={(checked) => updateNotification('rewardRedeemed', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Rewards Expiring</Label>
                            <p className="text-sm text-muted-foreground">
                              When rewards are about to expire
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.rewardExpiring}
                            onCheckedChange={(checked) => updateNotification('rewardExpiring', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Points Awarded</Label>
                            <p className="text-sm text-muted-foreground">
                              When points are awarded to customers
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.pointsAwarded}
                            onCheckedChange={(checked) => updateNotification('pointsAwarded', checked)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Business Performance Section */}
                    {notificationSection === 'business' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Daily Summary</Label>
                            <p className="text-sm text-muted-foreground">
                              Daily summary of loyalty activity and sales
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.dailySummary}
                            onCheckedChange={(checked) => updateNotification('dailySummary', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Weekly Report</Label>
                            <p className="text-sm text-muted-foreground">
                              Weekly performance report and insights
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.weeklySummary}
                            onCheckedChange={(checked) => updateNotification('weeklySummary', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Monthly Analytics</Label>
                            <p className="text-sm text-muted-foreground">
                              Monthly detailed analytics and trends
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.monthlySummary}
                            onCheckedChange={(checked) => updateNotification('monthlySummary', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Sales Targets</Label>
                            <p className="text-sm text-muted-foreground">
                              When you reach or miss sales targets
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.salesTarget}
                            onCheckedChange={(checked) => updateNotification('salesTarget', checked)}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* System Notifications Section */}
                    {notificationSection === 'system' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>System Updates</Label>
                            <p className="text-sm text-muted-foreground">
                              New features and system improvements
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.systemUpdates}
                            onCheckedChange={(checked) => updateNotification('systemUpdates', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Security Alerts</Label>
                            <p className="text-sm text-muted-foreground">
                              Important security notifications
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.securityAlerts}
                            onCheckedChange={(checked) => updateNotification('securityAlerts', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Payment Issues</Label>
                            <p className="text-sm text-muted-foreground">
                              Problems with billing or payments
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.paymentIssues}
                            onCheckedChange={(checked) => updateNotification('paymentIssues', checked)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Low Reward Inventory</Label>
                            <p className="text-sm text-muted-foreground">
                              When reward inventory is running low
                            </p>
                          </div>
                          <Switch 
                            checked={notifications.lowInventory}
                            onCheckedChange={(checked) => updateNotification('lowInventory', checked)}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Button 
                        className="gap-2" 
                        onClick={handleSave}
                        disabled={loading}
                      >
                        <Save className="h-4 w-4" />
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Submenu */}
              <div className="md:col-span-1">
                <Card className="overflow-hidden rounded-md">
                  <div className="p-2">
                    {[
                      { id: 'payment', label: 'Payment Details', icon: <CreditCard className="h-4 w-4" /> },
                      { id: 'refunds', label: 'Refund Account', icon: <ShoppingBag className="h-4 w-4" /> },
                      { id: 'history', label: 'Billing History', icon: <FileText className="h-4 w-4" /> }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setBillingSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-left transition-colors ${
                          billingSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-6 h-6 ${
                          billingSection === item.id 
                            ? 'text-blue-700' 
                            : 'text-gray-500'
                        }`}>
                          {item.icon}
                        </div>
                        <span className={`text-sm ${billingSection === item.id ? 'font-medium' : 'font-normal'}`}>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
              
              {/* Right Content Area */}
              <div className="md:col-span-3">
                <Card className="rounded-md">
                  <CardHeader>
                    <CardTitle>
                      {billingSection === 'payment' && "Payment Details"}
                      {billingSection === 'refunds' && "Refund Account"}
                      {billingSection === 'history' && "Billing History"}
                    </CardTitle>
                    <CardDescription>
                      {billingSection === 'payment' && "Manage your subscription and payment methods"}
                      {billingSection === 'refunds' && "Bank details for Tap Loyalty funded rewards refunds"}
                      {billingSection === 'history' && "View your past invoices and payments"}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-6">
                    {/* Payment Details Section */}
                    {billingSection === 'payment' && (
                      <div className="space-y-4">
                        <div className="bg-muted/30 p-4 rounded-md">
                          <h3 className="text-sm font-medium mb-2">Current Plan</h3>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Tap Standard</p>
                              <p className="text-xs text-muted-foreground">$49/month</p>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Active
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="text-sm font-medium">Payment Method</h3>
                          <div className="border rounded-md p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-gray-100 p-1.5 rounded">
                                <CreditCard className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">Visa ending in 4242</p>
                                <p className="text-xs text-muted-foreground">Expires 12/25</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">Update</Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Refund Account Section */}
                    {billingSection === 'refunds' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-md p-4 text-sm text-blue-800">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">
                              <ShieldCheck className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p>Enter your bank details below to receive refunds for Tap Loyalty funded rewards.</p>
                              <p className="mt-1">Refunds are processed at the end of each month for all eligible redemptions.</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bsbNumber">BSB Number</Label>
                              <Input
                                id="bsbNumber"
                                value={bsbNumber}
                                onChange={(e) => setBsbNumber(e.target.value)}
                                placeholder="e.g. 123-456"
                                maxLength={7}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="accountNumber">Account Number</Label>
                              <Input
                                id="accountNumber"
                                value={accountNumber}
                                onChange={(e) => setAccountNumber(e.target.value)}
                                placeholder="e.g. 12345678"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="accountName">Account Name</Label>
                            <Input
                              id="accountName"
                              value={accountName}
                              onChange={(e) => setAccountName(e.target.value)}
                              placeholder="e.g. Business Name Pty Ltd"
                            />
                            <p className="text-xs text-muted-foreground">
                              Enter the exact name as it appears on your bank account
                            </p>
                          </div>
                          
                          <div className="flex items-center justify-between pt-4">
                            <Button 
                              variant="outline" 
                              onClick={() => setShowTapRewardsSheet(true)}
                              className="flex items-center gap-2"
                            >
                              <BadgeIcon className="h-4 w-4" />
                              View Tap Funded Rewards
                            </Button>
                            
                            <Button 
                              className="gap-2" 
                              onClick={handleSave}
                              disabled={loading}
                            >
                              <Save className="h-4 w-4" />
                              {loading ? "Saving..." : "Save Details"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Billing History Section */}
                    {billingSection === 'history' && (
                      <div className="space-y-4">
                        <div className="rounded-md border">
                          <div className="grid grid-cols-5 p-3 bg-muted/30 text-sm font-medium">
                            <div className="col-span-2">Invoice</div>
                            <div>Date</div>
                            <div>Amount</div>
                            <div className="text-right">Status</div>
                          </div>
                          
                          <div className="divide-y">
                            {[
                              { id: 'INV-001', date: '01 Jun 2023', amount: '$49.00', status: 'Paid' },
                              { id: 'INV-002', date: '01 Jul 2023', amount: '$49.00', status: 'Paid' },
                              { id: 'INV-003', date: '01 Aug 2023', amount: '$49.00', status: 'Paid' }
                            ].map(invoice => (
                              <div key={invoice.id} className="grid grid-cols-5 p-3 text-sm">
                                <div className="col-span-2 font-medium">{invoice.id}</div>
                                <div>{invoice.date}</div>
                                <div>{invoice.amount}</div>
                                <div className="text-right">
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    {invoice.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Tap Funded Rewards Sheet */}
            <Sheet open={showTapRewardsSheet} onOpenChange={setShowTapRewardsSheet}>
              <SheetContent className="sm:max-w-md w-full">
                <SheetHeader>
                  <SheetTitle>Tap Funded Rewards</SheetTitle>
                  <SheetDescription>
                    Rewards eligible for refund from Tap Loyalty
                  </SheetDescription>
                </SheetHeader>
                
                <div className="py-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="month-select">Select Month</Label>
                    <select
                      id="month-select"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {months.map(month => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {isLoadingRewards ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading rewards...
                    </div>
                  ) : tapRewards.length > 0 ? (
                    <div className="space-y-4">
                      <div className="rounded-md border">
                                                 <div className="grid grid-cols-12 p-3 bg-muted/30 text-xs font-medium">
                           <div className="col-span-4">Reward</div>
                           <div className="col-span-3">Customer ID</div>
                           <div className="col-span-3">Date</div>
                           <div className="col-span-2 text-right">Amount</div>
                         </div>
                         
                         <div className="divide-y max-h-[400px] overflow-y-auto">
                           {tapRewards.map(reward => (
                             <div key={reward.id} className="grid grid-cols-12 p-3 text-xs">
                               <div className="col-span-4 font-medium">{reward.rewardName}</div>
                               <div className="col-span-3 truncate" title={reward.customerId}>
                                 {reward.customerId.substring(0, 8)}...
                               </div>
                               <div className="col-span-3">{formatDate(reward.redemptionDate)}</div>
                               <div className="col-span-2 text-right font-medium">
                                 ${reward.refundAmount.toFixed(2)}
                               </div>
                             </div>
                           ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
                        <div className="text-sm font-medium">Total Refund Amount</div>
                        <div className="text-lg font-bold text-blue-700">
                          ${totalRefundAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Refunds are processed automatically at the end of each month to your registered bank account.
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <BadgeIcon className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No Tap funded rewards found for this month
                      </p>
                    </div>
                  )}
                </div>
                
                <SheetFooter>
                  <Button variant="outline" onClick={() => setShowTapRewardsSheet(false)}>
                    Close
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </TabsContent>
          
          <TabsContent value="team">
            <Card className="rounded-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>
                      Manage people who have access to your account
                    </CardDescription>
                  </div>
                  <Button>Invite Team Member</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Representative Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Primary Representative</h3>
                  <p className="text-sm text-muted-foreground">
                    This person will be the main contact for your business
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="repName">Representative Name</Label>
                      <Input
                        id="repName"
                        placeholder="Full name"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="repPhone">Contact Phone</Label>
                      <Input
                        id="repPhone"
                        placeholder="Phone number"
                        value={repPhone}
                        onChange={(e) => setRepPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="repEmail">Contact Email</Label>
                    <Input
                      id="repEmail"
                      type="email"
                      placeholder="contact@example.com"
                      value={repEmail}
                      onChange={(e) => setRepEmail(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      className="gap-2" 
                      onClick={handleSave}
                      disabled={loading}
                    >
                      <Save className="h-4 w-4" />
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
                
                <Separator />
                
                {/* Team Members Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Additional Team Members</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite colleagues to help manage your business
                  </p>
                  
                  <div className="bg-muted/30 rounded-md p-8 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No team members yet. Invite someone to get started.
                    </p>
                    <Button>
                      Invite Team Member
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="store">
            <Card className="rounded-md">
              <CardHeader>
                <CardTitle>Store Settings</CardTitle>
                <CardDescription>
                  Customize your customer-facing loyalty store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Operating Hours</h3>
                  <p className="text-sm text-muted-foreground">Set your business operating hours</p>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {daysOfWeek.map(day => {
                      const dayLower = day.toLowerCase()
                      return (
                        <div key={day} className="space-y-2 pb-2 border-b">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`open-${dayLower}`}
                              checked={operatingHours[dayLower]?.isOpen}
                              onCheckedChange={(checked) => 
                                updateOperatingHours(dayLower, 'isOpen', checked)
                              }
                            />
                            <Label htmlFor={`open-${dayLower}`} className="font-medium">{day}</Label>
                          </div>
                          
                          {operatingHours[dayLower]?.isOpen && (
                            <div className="grid grid-cols-2 gap-4 ml-6 mt-2">
                              <div className="space-y-1">
                                <Label htmlFor={`open-time-${dayLower}`} className="text-xs">Open</Label>
                                <Input
                                  id={`open-time-${dayLower}`}
                                  type="time"
                                  value={operatingHours[dayLower]?.openTime || "09:00"}
                                  onChange={(e) => updateOperatingHours(dayLower, 'openTime', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label htmlFor={`close-time-${dayLower}`} className="text-xs">Close</Label>
                                <Input
                                  id={`close-time-${dayLower}`}
                                  type="time"
                                  value={operatingHours[dayLower]?.closeTime || "17:00"}
                                  onChange={(e) => updateOperatingHours(dayLower, 'closeTime', e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Store Configuration</h3>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="enableStore">Enable Customer Store</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to view and redeem rewards
                      </p>
                    </div>
                    <Switch id="enableStore" defaultChecked />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    className="gap-2" 
                    onClick={handleSave}
                    disabled={loading}
                  >
                    <Save className="h-4 w-4" />
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  )
}

export default SettingsPage 