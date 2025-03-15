"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/contexts/auth-context"
import { 
  User, 
  Bell, 
  CreditCard, 
  Users, 
  Store, 
  Layers, 
  ShieldCheck,
  Mail,
  Smartphone,
  Palette,
  Save,
  Upload,
  MapPin,
  Key,
  Gift,
  BarChart,
  ShieldAlert,
  FileText,
  Image,
  Download
} from "lucide-react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { toast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { firebase } from "@/lib/firebase"
import { PageTransition } from "@/components/page-transition"

const SettingsPage: React.FC = () => {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  
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
          setBusinessEmail(data.businessEmail || "")
          setBusinessType(data.businessType || "cafe")
          setLogoUrl(data.logoUrl || "")
          
          // Set address
          if (data.address) {
            setStreet(data.address.street || "")
            setSuburb(data.address.suburb || "")
            setState(data.address.state || "NSW")
            setPostcode(data.address.postcode || "")
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
          
          // Set notifications
          if (data.notifications) {
            setNotifications({
              ...notifications,
              ...data.notifications
            })
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
  
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Set the file to state
      setLogoFile(file);
      
      // Create a mock URL for development
      const mockUrl = URL.createObjectURL(file);
      setMockLogoUrl(mockUrl);
      
      // Show a toast to indicate the file is ready
      toast({
        title: "Logo Selected",
        description: `${file.name} is ready for preview`,
      });
      
      // Update the logo URL for immediate display
      setLogoUrl(mockUrl);
    }
  };
  
  const updateOperatingHours = (day, field, value) => {
    setOperatingHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }))
  }
  
  const handleAbnFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAbnVerificationFile(e.target.files[0])
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
  
  // Modify the upload function to include additional CORS headers
  const uploadWithCorsHeaders = async (file, path) => {
    try {
      // Create a reference with a unique name
      const fileRef = ref(storage, path);
      
      // Set metadata with CORS headers
      const metadata = {
        contentType: file.type,
        customMetadata: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Content-Disposition, Content-Length'
        }
      };
      
      // Upload the file with metadata
      const uploadResult = await uploadBytes(fileRef, file, metadata);
      
      // Get the download URL
      const downloadUrl = await getDownloadURL(uploadResult.ref);
      
      return downloadUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };
  
  // Then use this function in handleSave
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
          const fileName = `merchants/${user.uid}/logo/${Date.now()}-${logoFile.name}`;
          newLogoUrl = await uploadWithCorsHeaders(logoFile, fileName);
          setLogoUrl(newLogoUrl);
          setLogoFile(null);
          
          toast({
            title: "Logo Uploaded",
            description: "Your business logo has been updated.",
          });
        } catch (error) {
          console.error("Error uploading logo:", error);
          toast({
            title: "Upload Failed",
            description: "Failed to upload logo. Please try again.",
            variant: "destructive"
          });
        }
      }
      
      // Handle document upload
      if (documentFile) {
        try {
          console.log("Uploading document to Firebase Storage");
          const timestamp = Date.now();
          const fileName = `merchants/${user.uid}/documents/${timestamp}-${documentFile.name}`;
          const documentUrl = await uploadWithCorsHeaders(documentFile, fileName);
          
          console.log("Document uploaded successfully:", documentUrl);
          
          // Add to documents array
          const newDocument = {
            name: documentFile.name,
            url: documentUrl,
            path: fileName,
            uploadedAt: new Date()
          };
          
          setDocuments(prev => [...prev, newDocument]);
          setDocumentFile(null);
          
          toast({
            title: "Document Uploaded",
            description: "Your document has been uploaded successfully.",
          });
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
        representative: {
          name: repName,
          phone: repPhone,
          email: repEmail
        },
        operatingHours,
        abn,
        abnVerificationUrl,
        pointOfSale,
        paymentProvider,
        status: storeActive ? "active" : "inactive",
        notifications,
        updatedAt: new Date(),
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

  // Function to update notification settings
  const updateNotification = (key, value) => {
    setNotifications(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Modify the document file handler to use a mock upload in development
  const handleDocumentFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Set the file to state
      setDocumentFile(file);
      
      // Create a mock URL for development
      const mockUrl = URL.createObjectURL(file);
      setMockDocumentUrl(mockUrl);
      
      // Show a toast to indicate the file is ready
      toast({
        title: "File Selected",
        description: `${file.name} is ready for preview`,
      });
      
      // Add to documents array for immediate display
      setDocuments(prev => [
        ...prev, 
        {
          name: file.name,
          url: mockUrl,
          path: `merchants/${merchantId}/documents/${Date.now()}-${file.name}`,
          uploadedAt: new Date()
        }
      ]);
    }
  };

  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [mockDocumentUrl, setMockDocumentUrl] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Array<{name: string, url: string, path: string, uploadedAt: Date}>>([]);

  // Add this state variable
  const [mockLogoUrl, setMockLogoUrl] = useState<string | null>(null);

  if (dataLoading) {
    return (
      <PageTransition>
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* Empty state instead of spinner */}
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your account and preferences
            </p>
          </div>
          
          {/* Store Activation Toggle - Updated with better colors */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${storeActive ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="text-right">
              <p className="text-sm font-medium">Store Status</p>
              <p className={`text-xs ${storeActive ? 'text-green-600' : 'text-red-600'} font-medium`}>
                {storeActive ? "Active & Visible" : "Inactive & Hidden"}
              </p>
            </div>
            <Switch 
              checked={storeActive} 
              onCheckedChange={toggleStoreStatus}
              disabled={loading}
              className={storeActive ? "data-[state=checked]:bg-green-600" : "data-[state=unchecked]:bg-red-600"}
            />
          </div>
        </div>
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Billing</span>
            </TabsTrigger>
            <TabsTrigger value="team" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Team</span>
            </TabsTrigger>
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span>Store</span>
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Integrations</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>Files</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Submenu - New Design */}
              <div className="md:col-span-1">
                <Card className="overflow-hidden">
                  <div className="p-4 border-b flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden border mb-3">
                      {logoUrl ? (
                        <img 
                          src={logoUrl} 
                          alt={tradingName || "Business Logo"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <Store className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-medium text-sm">{tradingName || legalBusinessName || "Your Business"}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{businessEmail || "No email set"}</p>
                  </div>
                  
                  <div className="p-2">
                    {[
                      { id: 'business', label: 'Business Information', icon: <Store className="h-4 w-4" /> },
                      { id: 'address', label: 'Business Address', icon: <MapPin className="h-4 w-4" /> },
                      { id: 'merchant', label: 'Merchant ID', icon: <Key className="h-4 w-4" /> }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setProfileSection(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                          profileSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className={`p-1.5 rounded-full ${
                          profileSection === item.id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
              
              {/* Right Content Area */}
              <div className="md:col-span-3">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {profileSection === 'business' && "Business Information"}
                      {profileSection === 'address' && "Business Address"}
                      {profileSection === 'merchant' && "Merchant ID"}
                    </CardTitle>
                    <CardDescription>
                      {profileSection === 'business' && "Update your business details"}
                      {profileSection === 'address' && "Set your business location"}
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
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="tradingName">Trading Name</Label>
                            <Input
                              id="tradingName"
                              value={tradingName}
                              onChange={(e) => setTradingName(e.target.value)}
                              placeholder="Name customers know you by"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="businessEmail">Business Email</Label>
                          <Input
                            id="businessEmail"
                            type="email"
                            value={businessEmail}
                            onChange={(e) => setBusinessEmail(e.target.value)}
                            placeholder="contact@yourbusiness.com"
                          />
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
                      </div>
                    )}
                    
                    {/* Business Address Section */}
                    {profileSection === 'address' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="street">Street Address</Label>
                          <Input 
                            id="street"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            placeholder="123 Main Street"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="suburb">Suburb</Label>
                          <Input 
                            id="suburb"
                            value={suburb}
                            onChange={(e) => setSuburb(e.target.value)}
                            placeholder="Suburb"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="state">State</Label>
                            <select 
                              id="state"
                              value={state}
                              onChange={(e) => setState(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {australianStates.map(state => (
                                <option key={state.value} value={state.value}>
                                  {state.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="postcode">Postcode</Label>
                            <Input 
                              id="postcode"
                              value={postcode}
                              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                              placeholder="0000"
                            />
                          </div>
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
                        
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                          <h4 className="text-sm font-medium text-blue-800 mb-2">API Documentation</h4>
                          <p className="text-xs text-blue-700 mb-3">
                            Learn how to integrate your systems with our API to automate loyalty points and rewards.
                          </p>
                          <Button variant="outline" size="sm" className="text-blue-700 border-blue-300">
                            View API Docs
                          </Button>
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
                <Card className="overflow-hidden">
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
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-md text-left transition-colors ${
                          notificationSection === item.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className={`p-1.5 rounded-full ${
                          notificationSection === item.id 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {item.icon}
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
              
              {/* Right Content Area */}
              <div className="md:col-span-3">
                <Card>
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
            {/* Billing content remains the same */}
          </TabsContent>
          
          <TabsContent value="team">
            <Card>
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
                  
                  <div className="bg-muted/30 rounded-lg p-8 text-center">
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
            <Card>
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
          
          <TabsContent value="integrations">
            {/* Integrations content remains the same */}
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage account security and business verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Business Verification</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abn">ABN (Australian Business Number)</Label>
                    <Input
                      id="abn"
                      placeholder="11 digit ABN"
                      value={abn}
                      onChange={(e) => setAbn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="abnVerification">ABN Verification Document</Label>
                    <div className="border rounded-md p-4 bg-gray-50">
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {abnVerificationFile ? (
                              <div className="text-center">
                                <p className="text-sm text-green-600 mb-2">File selected</p>
                                <p className="text-xs text-gray-500">{abnVerificationFile.name}</p>
                              </div>
                            ) : abnVerificationUrl ? (
                              <div className="text-center">
                                <p className="text-sm text-blue-600 mb-2">Document on file</p>
                                <p className="text-xs text-gray-500">Click to replace</p>
                              </div>
                            ) : (
                              <>
                                <Upload className="w-8 h-8 mb-2 text-gray-500" />
                                <p className="mb-2 text-sm text-gray-500">
                                  <span className="font-semibold">Click to upload</span> or drag and drop
                                </p>
                                <p className="text-xs text-gray-500">PDF, PNG, JPG (MAX. 10MB)</p>
                              </>
                            )}
                          </div>
                          <input 
                            id="abnVerification" 
                            type="file" 
                            className="hidden" 
                            onChange={handleAbnFileChange}
                            accept=".pdf,.png,.jpg,.jpeg"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Business Systems</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pointOfSale">Point of Sale System</Label>
                      <select 
                        id="pointOfSale"
                        value={pointOfSale}
                        onChange={(e) => setPointOfSale(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pointOfSaleSystems.map(system => (
                          <option key={system.value} value={system.value}>
                            {system.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="paymentProvider">Payment Provider</Label>
                      <select 
                        id="paymentProvider"
                        value={paymentProvider}
                        onChange={(e) => setPaymentProvider(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {paymentProviders.map(provider => (
                          <option key={provider.value} value={provider.value}>
                            {provider.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Account Security</h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="2fa">Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Button variant="outline">Enable</Button>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Password</h3>
                    <Button variant="outline">Change Password</Button>
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
          
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle>Files & Documents</CardTitle>
                <CardDescription>
                  Manage your business documents and uploaded files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Uploaded Documents</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {/* Display both real documents and mock documents */}
                    {(documents.length > 0 || abnVerificationUrl || logoUrl) ? (
                      <div className="grid grid-cols-1 gap-4">
                        {/* ABN Verification Document */}
                        {abnVerificationUrl && (
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-md">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">ABN Verification</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded {new Date().toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1"
                                onClick={() => window.open(abnVerificationUrl, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-1">
                                <Upload className="h-4 w-4" />
                                Replace
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Business Logo */}
                        {logoUrl && (
                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-md">
                                <Image className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">Business Logo</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded {new Date().toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1"
                                onClick={() => window.open(logoUrl, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 gap-1">
                                <Upload className="h-4 w-4" />
                                Replace
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {/* Mock/Development Documents */}
                        {documents.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-50 rounded-md">
                                <FileText className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{doc.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  Uploaded {doc.uploadedAt.toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {doc.path} (Development Preview)
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 gap-1"
                                onClick={() => window.open(doc.url, '_blank')}
                              >
                                <Download className="h-4 w-4" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-muted/30 rounded-lg p-8 text-center">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground mb-4">
                          No documents uploaded yet. Upload a file to get started.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-6" />

                {/* Upload New Document Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Upload New Document</h3>
                  <div className="border rounded-md p-4 bg-gray-50">
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-8 h-8 mb-2 text-gray-500" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-gray-500">PDF, PNG, JPG, DOCX (MAX. 10MB)</p>
                          <p className="text-xs text-blue-600 mt-2">
                            Files will be saved to: gs://tap-loyalty-fb6d0/merchants/{merchantId}/documents
                          </p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept=".pdf,.png,.jpg,.jpeg,.docx"
                          onChange={handleDocumentFileChange}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-6">
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