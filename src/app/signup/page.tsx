"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile, getAuth, fetchSignInMethodsForEmail } from "firebase/auth"
import { doc, setDoc, GeoPoint } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Eye, EyeOff, ArrowRight, Loader2, ChevronLeft, ChevronRight, ShieldCheck, Users, Zap, Mail } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, where, getDocs, getDoc } from "firebase/firestore"
import Script from "next/script"
import { PageTransition } from "@/components/page-transition"
import { cn } from "@/lib/utils"
import { MapLocationPicker } from "@/components/map-location-picker"

// Business types matching iOS app
const businessTypes = [
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "pub", label: "Pub" }
]

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

// Days of the week
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

// Operating hours type
interface OperatingHours {
  [key: string]: {
    isOpen: boolean
    openTime: string
    closeTime: string
  }
}

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 8
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Step 1: Basic Auth
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Step 2: Template Selection (NEW)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [availableTemplates, setAvailableTemplates] = useState<Array<{value: string, label: string, description: string, address: string, data: any}>>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  
  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      setLoadingTemplates(true)
      try {
        // Fetch templates from Firestore
        const templatesRef = collection(db, 'templatemerchant')
        const templatesSnapshot = await getDocs(templatesRef)
        
        const templates = templatesSnapshot.docs.map(doc => {
          const data = doc.data()
          console.log('Template data:', doc.id, data) // Debug log
          
          // Handle both old structure (name) and new structure (merchantName)
          const displayName = data.merchantName || data.name || `${data.businessType || 'Unknown'} Template`
          const businessType = data.businessType || 'Unknown'
          const address = data.location?.address || `${data.address?.street || ''} ${data.address?.suburb || ''}`.trim() || ''
          
          return {
            value: doc.id,
            label: displayName,
            description: businessType,
            address: address,
            data: data
          }
        })
        
        // Add "Start from Scratch" option
        templates.push({
          value: "custom",
          label: "Start from Scratch",
          description: "Build your own custom setup",
          address: "",
          data: {}
        })
        
        setAvailableTemplates(templates)
      } catch (error) {
        console.error("Error loading templates:", error)
        // Set default templates if Firestore fails
        setAvailableTemplates([
          { value: "custom", label: "Start from Scratch", description: "Build your own custom setup", address: "", data: {} }
        ])
      } finally {
        setLoadingTemplates(false)
      }
    }
    
    loadTemplates()
  }, [])
  
  // Apply template data when template is selected
  const applyTemplate = async (templateId: string) => {
    if (templateId === "custom") return // Skip for custom
    
    try {
      const templateDoc = await getDoc(doc(db, 'templatemerchant', templateId))
      if (templateDoc.exists()) {
        const templateData = templateDoc.data()
        
        // Apply business details
        if (templateData.businessType) setBusinessType(templateData.businessType)
        if (templateData.merchantName) {
          setTradingName(templateData.merchantName)
          setLegalBusinessName(templateData.merchantName) // Use same for legal name
        }
        if (templateData.businessPhone) setBusinessPhone(templateData.businessPhone)
        
        // Apply address information
        if (templateData.address) {
          if (templateData.address.street) setStreet(templateData.address.street)
          if (templateData.address.suburb) setSuburb(templateData.address.suburb)
          if (templateData.address.state) setState(templateData.address.state)
          if (templateData.address.postcode) setPostcode(templateData.address.postcode)
          if (templateData.address.latitude) setLatitude(templateData.address.latitude)
          if (templateData.address.longitude) setLongitude(templateData.address.longitude)
          if (templateData.address.formattedAddress) setFormattedAddress(templateData.address.formattedAddress)
        }
        
        // Apply location coordinates if available
        if (templateData.location?.coordinates) {
          setLatitude(templateData.location.coordinates.latitude)
          setLongitude(templateData.location.coordinates.longitude)
          if (templateData.location.displayAddress) setFormattedAddress(templateData.location.displayAddress)
        }
        
        // Apply operating hours - handle both formats
        if (templateData.operatingHours) {
          const convertedHours: OperatingHours = {}
          Object.keys(templateData.operatingHours).forEach(day => {
            const dayData = templateData.operatingHours[day]
            convertedHours[day] = {
              isOpen: dayData.isOpen,
              openTime: dayData.open || dayData.openTime || "09:00",
              closeTime: dayData.close || dayData.closeTime || "17:00"
            }
          })
          setOperatingHours(convertedHours)
        }
        
        // Apply business systems
        if (templateData.pointOfSale) setPointOfSale(templateData.pointOfSale)
        if (templateData.paymentProvider) setPaymentProvider(templateData.paymentProvider)
        
        // Apply representative details if available
        if (templateData.representative) {
          if (templateData.representative.name) setRepName(templateData.representative.name)
          if (templateData.representative.phone) setRepPhone(templateData.representative.phone)
        }
        
        // Set business email to a template-based email if not provided
        if (templateData.merchantName && !businessEmail) {
          const emailDomain = templateData.website ? 
            templateData.website.replace(/https?:\/\//, '').replace(/^www\./, '') : 
            `${templateData.merchantName.toLowerCase().replace(/\s+/g, '')}.com.au`
          setBusinessEmail(`info@${emailDomain}`)
        }
        
        // Store complete template data for later use
        setTemplateData(templateData)
        
        toast({
          title: "Template Applied!",
          description: `${templateData.merchantName || templateData.name || 'Template'} has been applied to your account.`,
        })
      }
    } catch (error) {
      console.error("Error applying template:", error)
      toast({
        title: "Error",
        description: "Failed to apply template. Please try again.",
        variant: "destructive"
      })
    }
  }
  
  // Step 3: Business Details (was Step 2)
  const [legalBusinessName, setLegalBusinessName] = useState("")
  const [tradingName, setTradingName] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessPhone, setBusinessPhone] = useState("")
  const [businessType, setBusinessType] = useState("cafe")
  
  // Step 4: Address (was Step 3)
  const [street, setStreet] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState("NSW")
  const [postcode, setPostcode] = useState("")
  const [latitude, setLatitude] = useState<number | undefined>()
  const [longitude, setLongitude] = useState<number | undefined>()
  const [formattedAddress, setFormattedAddress] = useState("")
  
  // Step 5: Operating Hours (was Step 4)
  const [operatingHours, setOperatingHours] = useState<OperatingHours>(() => {
    const defaultHours: OperatingHours = {}
    daysOfWeek.forEach(day => {
      defaultHours[day.toLowerCase()] = {
        isOpen: true,
        openTime: "09:00",
        closeTime: "17:00"
      }
    })
    return defaultHours
  })
  
  // Step 6: Representative Details (was Step 5)
  const [repName, setRepName] = useState("")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  
  // Step 7: Business Verification & Systems (was Step 6)
  const [abn, setAbn] = useState("")
  const [pointOfSale, setPointOfSale] = useState("lightspeed")
  const [paymentProvider, setPaymentProvider] = useState("square")
  
  // Template data storage for complete address and location
  const [templateData, setTemplateData] = useState<any>(null)
  
  // Australian phone number validation function
  const validateAustralianPhone = (phone: string) => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Check for Australian mobile numbers (04xx xxx xxx) - 10 digits
    if (cleanPhone.match(/^04\d{8}$/)) {
      return true
    }
    
    // Check for Australian landline numbers (xx xxxx xxxx) - 8 digits for area code + number
    if (cleanPhone.match(/^[23478]\d{7}$/)) {
      return true
    }
    
    // Also allow standard 8-digit format
    if (cleanPhone.match(/^\d{8}$/)) {
      return true
    }
    
    return false
  }
  
  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    
    // Mobile format: 04xx xxx xxx
    if (cleanPhone.match(/^04\d{8}$/)) {
      return cleanPhone.replace(/^(04\d{2})(\d{3})(\d{3})$/, '$1 $2 $3')
    }
    
    // Landline format: (xx) xxxx xxxx
    if (cleanPhone.match(/^[23478]\d{7}$/)) {
      return cleanPhone.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2 $3')
    }
    
    // Standard 8-digit format: xxxx xxxx
    if (cleanPhone.match(/^\d{8}$/)) {
      return cleanPhone.replace(/^(\d{4})(\d{4})$/, '$1 $2')
    }
    
    return phone
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
  
  const validateCurrentStep = () => {
    const errors = []
    
    switch (currentStep) {
      case 1: // Basic Auth
        if (!email) errors.push("Email is required")
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Invalid email format")
        if (!password) errors.push("Password is required")
        if (password && password.length < 8) errors.push("Password must be at least 8 characters")
        if (password !== confirmPassword) errors.push("Passwords do not match")
        break
        
      case 2: // Template Selection
        if (!selectedTemplate) errors.push("Template is required")
        break
        
      case 3: // Business Details
        if (!legalBusinessName) errors.push("Legal business name is required")
        if (!tradingName) errors.push("Trading name is required")
        if (!businessEmail) errors.push("Business email is required")
        if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) errors.push("Invalid business email format")
        if (!businessPhone) errors.push("Business phone is required")
        if (businessPhone && !validateAustralianPhone(businessPhone)) errors.push("Invalid Australian phone number format")
        break
        
      case 4:
        if (!latitude || !longitude) errors.push("Please select your store location on the map")
        if (!street) errors.push("Street address is required")
        if (!suburb) errors.push("Suburb is required")
        if (!state) errors.push("State is required")
        if (!postcode) errors.push("Postcode is required")
        if (postcode && (postcode.length !== 4 || !/^\d+$/.test(postcode))) errors.push("Postcode must be 4 digits")
        break
        
      case 5: // Address Details
        if (!street) errors.push("Street address is required")
        if (!suburb) errors.push("Suburb is required")
        if (!state) errors.push("State is required")
        if (!postcode) errors.push("Postcode is required")
        if (postcode && (postcode.length !== 4 || !/^\d+$/.test(postcode))) errors.push("Postcode must be 4 digits")
        break
        
      case 6: // Operating Hours
        // Basic validation for operating hours
        for (const day of daysOfWeek) {
          const dayLower = day.toLowerCase()
          if (operatingHours[dayLower]?.isOpen) {
            if (!operatingHours[dayLower]?.openTime) errors.push(`Opening time for ${day} is required`)
            if (!operatingHours[dayLower]?.closeTime) errors.push(`Closing time for ${day} is required`)
          }
        }
        break
        
      case 7: // Representative
        if (!repName) errors.push("Representative name is required")
        if (!repPhone) errors.push("Contact phone is required")
        if (repPhone && !validateAustralianPhone(repPhone)) errors.push("Invalid Australian phone number format")
        break
        
      case 8: // ABN & Verification
        if (!abn) errors.push("ABN is required")
        if (abn && (abn.length !== 11 || !/^\d+$/.test(abn))) errors.push("ABN must be 11 digits")
        break
    }
    
    setValidationErrors(errors)
    return errors.length === 0
  }
  
  const nextStep = async () => {
    if (!validateCurrentStep()) return;
    
    // For step 1, check if email already exists
    if (currentStep === 1) {
      setLoading(true);
      try {
        console.log("Checking if email exists:", email);
        
        // First check with Firebase Auth
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods.length > 0) {
          setValidationErrors(["An account with this email already exists. Please use a different email or sign in."]);
          setLoading(false);
          return;
        }
        
        // Also check Firestore for existing merchants
        const merchantsRef = collection(db, 'merchants');
        const q = query(merchantsRef, where('businessEmail', '==', email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setValidationErrors(["A business with this email already exists. Please use a different email."]);
          setLoading(false);
          return;
        }
        
        console.log("Email is available, proceeding to next step");
      } catch (error) {
        console.error("Error checking email:", error);
        setValidationErrors(["Error validating email. Please try again."]);
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  }
  
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (currentStep < totalSteps) {
      nextStep()
      return
    }
    
    if (!validateCurrentStep()) return
    
    setLoading(true)
    
    try {
      console.log("Creating user account...")
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      
      console.log("User created:", user.uid)
      
      // Update user profile
      await updateProfile(user, {
        displayName: tradingName
      })
      
      // Create merchant document
      const merchantData = {
        // Auth info
        userId: user.uid,
        email: email,
        
        // Business details
        legalBusinessName,
        merchantName: tradingName, // Save trading name as merchantName
        businessEmail,
        businessPhone,
        businessType,
        
        // Template reference
        ...(selectedTemplate && selectedTemplate !== "custom" && { merchantId: selectedTemplate }),
        
        // Address - use user-selected location data
        address: {
          street,
          suburb,
          state,
          postcode,
          latitude,
          longitude,
          formattedAddress,
          country: "Australia",
          countryCode: "AU",
          isoCountryCode: "AU"
        },
        
        // Location data from user selection
        location: {
          address: `${street}, ${suburb}`,
          displayAddress: `${street}, ${suburb}, ${state}, ${postcode}`,
          coordinates: {
            latitude: latitude || 0,
            longitude: longitude || 0
          }
        },
        
        // Operating hours
        operatingHours,
        
        // Representative
        representative: {
          name: repName,
          phone: repPhone,
          email: businessEmail // Use business email as fallback
        },
        
        // Business verification
        abn,
        pointOfSale,
        paymentProvider,
        
        // Additional template fields
        ...(templateData?.website && { website: templateData.website }),
        ...(templateData?.posCategory && { posCategory: templateData.posCategory }),
        
        // System fields
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isVerified: false,
        loginCount: 0,
        
        // Loyalty program settings - use template settings if available
        loyaltyProgram: {
          pointsPerDollar: templateData?.loyaltySettings?.pointsPerDollar || 1,
          welcomeBonus: templateData?.loyaltySettings?.welcomeBonus || 100,
          isActive: true
        }
      }
      
      console.log("Creating merchant document...")
      await setDoc(doc(db, 'merchants', user.uid), merchantData)
      
      console.log("Account created successfully!")
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to Tap. You can now start setting up your loyalty program.",
      })
      
      // Redirect to getstarted page for new users
      router.push('/getstarted')
      
    } catch (error: any) {
      console.error("Error creating account:", error)
      
      let errorMessage = "Failed to create account. Please try again."
      
      if (error?.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists."
      } else if (error?.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password."
      } else if (error?.code === 'auth/invalid-email') {
        errorMessage = "Invalid email address."
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }
  
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Create your account"
      case 2: return "Choose a template"
      case 3: return "Tell us about your business"
      case 4: return "Where are you located?"
      case 5: return "Address Details"
      case 6: return "When are you open?"
      case 7: return "Who should we contact?"
      case 8: return "Let's verify your business"
      default: return "Create Account"
    }
  }
  
  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Start by creating your secure account"
      case 2: return "Choose a template to get started quickly"
      case 3: return "Help us understand your business better"
      case 4: return "We need your business address for customer matching"
      case 5: return "Review and edit your store address"
      case 6: return "Set your operating hours for customer visibility"
      case 7: return "Primary contact for your loyalty program"
      case 8: return "Final details to get you started"
      default: return ""
    }
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 px-3 pr-10 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-900">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
            </div>
          </div>
        )
        
      case 2:
         return (
           <div className="space-y-6">
             <div className="space-y-2">
               <Label htmlFor="template" className="text-sm font-medium text-gray-900">Select Template</Label>
               {loadingTemplates ? (
                 <div className="flex items-center justify-center py-4">
                   <Loader2 className="h-4 w-4 animate-spin mr-2" />
                   <span className="text-sm text-gray-500">Loading templates...</span>
                 </div>
               ) : (
                 <Select 
                   value={selectedTemplate} 
                   onValueChange={(value) => {
                     setSelectedTemplate(value)
                     applyTemplate(value)
                   }}
                 >
                   <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                     <SelectValue placeholder="Choose a template to get started" />
                   </SelectTrigger>
                   <SelectContent>
                     {availableTemplates.map(template => (
                       <SelectItem key={template.value} value={template.value}>
                         <div className="flex flex-col items-start">
                           <span className="font-medium">{template.label}</span>
                           <div className="flex gap-2 text-xs text-gray-500">
                             <span>{template.description}</span>
                             {template.address && <span>• {template.address}</span>}
                           </div>
                         </div>
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               )}
             </div>
           </div>
         )
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legalBusinessName" className="text-sm font-medium text-gray-900">Legal Business Name</Label>
              <Input
                id="legalBusinessName"
                placeholder="As registered with ASIC"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradingName" className="text-sm font-medium text-gray-900">Trading Name</Label>
              <Input
                id="tradingName"
                placeholder="What customers know you as"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessEmail" className="text-sm font-medium text-gray-900">Business Email</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  placeholder="business@example.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  required
                  className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessPhone" className="text-sm font-medium text-gray-900">Business Phone</Label>
                <Input
                  id="businessPhone"
                  placeholder="0412 345 678 or 12345678"
                  value={businessPhone}
                  onChange={(e) => {
                    const value = e.target.value
                    // Limit to 8 digits for standard numbers or 10 for mobile
                    const cleanValue = value.replace(/\D/g, '')
                    if (cleanValue.length <= 10) {
                      setBusinessPhone(formatPhoneNumber(value))
                    }
                  }}
                  required
                  className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
                <p className="text-xs text-gray-500">
                  Australian mobile (04xx xxx xxx) or landline (8 digits max)
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-sm font-medium text-gray-900">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Store Location</h3>
              <p className="text-xs text-gray-600">
                Search for your business address or click on the map to set your exact location
              </p>
            </div>
            
            <MapLocationPicker
              initialAddress={formattedAddress || (street && suburb ? `${street}, ${suburb}, ${state}, ${postcode}, Australia` : "")}
              initialLatitude={latitude}
              initialLongitude={longitude}
              onLocationChange={(locationData) => {
                const addressParts = locationData.address.split(',');
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                setFormattedAddress(locationData.formattedAddress || locationData.address);
                setStreet(addressParts[0]?.trim() || "");
                setSuburb(addressParts[1]?.trim() || "");
                
                // Extract state and postcode from the address if possible
                const stateMatch = locationData.formattedAddress?.match(/\b(NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\b/);
                if (stateMatch) {
                  setState(stateMatch[0]);
                }
                
                const postcodeMatch = locationData.formattedAddress?.match(/\b\d{4}\b/);
                if (postcodeMatch) {
                  setPostcode(postcodeMatch[0]);
                }
              }}
            />
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900">Address Details</h3>
              <p className="text-xs text-gray-600">
                Review and edit your address details. The location coordinates are already set from the map.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street" className="text-sm font-medium text-gray-900">Street Address</Label>
                <Input
                  id="street"
                  placeholder="123 Main Street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  required
                  className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="suburb" className="text-sm font-medium text-gray-900">Suburb</Label>
                  <Input
                    id="suburb"
                    placeholder="Sydney"
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    required
                    className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="postcode" className="text-sm font-medium text-gray-900">Postcode</Label>
                  <Input
                    id="postcode"
                    placeholder="2000"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required
                    className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state" className="text-sm font-medium text-gray-900">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {australianStates.map(state => (
                      <SelectItem key={state.value} value={state.value}>
                        {state.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {formattedAddress && (
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <p className="text-xs text-blue-600 font-medium mb-1">Selected Location:</p>
                  <p className="text-sm text-blue-800">{formattedAddress}</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Coordinates: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
        
      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Set your operating hours so customers know when you're open
            </p>
            
            <div className="space-y-2">
              {daysOfWeek.map(day => (
                <div key={day} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id={`${day}-open`}
                        checked={operatingHours[day.toLowerCase()]?.isOpen || false}
                        onCheckedChange={(checked) => updateOperatingHours(day, 'isOpen', checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`${day}-open`} className="text-sm font-medium text-gray-900 min-w-[80px]">
                        {day}
                      </Label>
                    </div>
                    
                    {operatingHours[day.toLowerCase()]?.isOpen ? (
                      <div className="flex items-center gap-2">
                        <Select 
                          value={operatingHours[day.toLowerCase()]?.openTime || "09:00"} 
                          onValueChange={(value) => updateOperatingHours(day, 'openTime', value)}
                        >
                          <SelectTrigger className="h-9 w-24 text-sm border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0')
                              return (
                                <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                                  {`${hour}:00`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                        <span className="text-gray-400 text-sm font-medium">to</span>
                        <Select 
                          value={operatingHours[day.toLowerCase()]?.closeTime || "17:00"} 
                          onValueChange={(value) => updateOperatingHours(day, 'closeTime', value)}
                        >
                          <SelectTrigger className="h-9 w-24 text-sm border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0')
                              return (
                                <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                                  {`${hour}:00`}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm font-medium">Closed</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
        
      case 7:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Who should we contact about your loyalty program?
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="repName" className="text-sm font-medium text-gray-900">Contact Name</Label>
              <Input
                id="repName"
                placeholder="John Smith"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repPhone" className="text-sm font-medium text-gray-900">Contact Phone</Label>
              <Input
                id="repPhone"
                placeholder="0412 345 678 or 12345678"
                value={repPhone}
                onChange={(e) => {
                  const value = e.target.value
                  // Limit to 8 digits for standard numbers or 10 for mobile
                  const cleanValue = value.replace(/\D/g, '')
                  if (cleanValue.length <= 10) {
                    setRepPhone(formatPhoneNumber(value))
                  }
                }}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
              <p className="text-xs text-gray-500">
                Australian mobile (04xx xxx xxx) or landline (8 digits max)
              </p>
            </div>
          </div>
        )
        
      case 8:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="abn" className="text-sm font-medium text-gray-900">ABN (Australian Business Number)</Label>
              <Input
                id="abn"
                placeholder="11 digit ABN"
                value={abn}
                onChange={(e) => setAbn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                required
                className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
              />
              <p className="text-sm text-gray-500">
                Required for payment matching and loyalty point allocation
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointOfSale" className="text-sm font-medium text-gray-900">Point of Sale System</Label>
                <Select value={pointOfSale} onValueChange={setPointOfSale}>
                  <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                    <SelectValue placeholder="Select POS system" />
                  </SelectTrigger>
                  <SelectContent>
                    {pointOfSaleSystems.map(system => (
                      <SelectItem key={system.value} value={system.value}>
                        {system.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentProvider" className="text-sm font-medium text-gray-900">Payment Provider</Label>
                <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                  <SelectTrigger className="h-10 rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]">
                    <SelectValue placeholder="Select payment provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentProviders.map(provider => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center justify-start pt-16 p-4">
      <Card className={cn("w-full max-w-md mx-auto border border-gray-200 shadow-sm rounded-2xl bg-white")}>
        <CardHeader className="space-y-1 pb-6 pt-8">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/taplogo.png" 
                alt="Tap" 
                className="w-8 h-8 rounded-sm"
              />
            </div>
            {/* Header Text */}
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {getStepTitle()}
            </h1>
            <p className="text-sm text-gray-600">{getStepDescription()}</p>
            
            {/* Progress indicator */}
            <div className="mt-6">
              <div className="flex justify-center mb-3">
                <span className="text-xs text-gray-500">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-[#007AFF] h-1 rounded-full transition-all duration-300" 
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {renderStepContent()}
            
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
                <ul className="text-sm text-red-700 list-disc pl-4 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-between pt-4">
              {currentStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={prevStep}
                  disabled={loading}
                  className="h-10 px-4 text-sm rounded-md"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div></div>
              )}
              
              {currentStep < totalSteps ? (
                <Button 
                  type="button" 
                  onClick={nextStep}
                  disabled={loading}
                  className="h-10 px-4 bg-[#007AFF] hover:bg-[#0066CC] text-white text-sm rounded-md"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Continue
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  className="h-10 px-4 bg-[#007AFF] hover:bg-[#0066CC] text-white text-sm rounded-md"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
          
          {/* Sign in link */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/login" className="text-[#007AFF] hover:text-[#0066CC] font-medium transition-colors">
                Sign in
              </Link>
            </div>
          </div>
          
          {/* Contact Support Section */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a 
              href="mailto:support@tap.com.au" 
              className="flex items-center justify-center gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors group"
            >
              <Mail className="h-3 w-3 text-gray-400 group-hover:text-gray-500" />
              <span className="text-xs text-gray-600 group-hover:text-gray-700">Contact Support</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 