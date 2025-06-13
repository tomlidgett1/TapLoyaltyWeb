"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, updateProfile, getAuth, fetchSignInMethodsForEmail } from "firebase/auth"
import { doc, setDoc, GeoPoint } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { auth, db, storage } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Eye, EyeOff, ArrowRight, Loader2, ChevronLeft, ChevronRight, Upload, ShieldCheck, Users, Zap } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, where, getDocs } from "firebase/firestore"
import Script from "next/script"
import { PageTransition } from "@/components/page-transition"

// Business types matching iOS app
const businessTypes = [
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "retail", label: "Retail" },
  { value: "salon", label: "Salon" },
  { value: "gym", label: "Gym" },
  { value: "other", label: "Other" }
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
  const totalSteps = 6
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  
  // Step 1: Basic Auth
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // Step 2: Business Details
  const [legalBusinessName, setLegalBusinessName] = useState("")
  const [tradingName, setTradingName] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [businessPhone, setBusinessPhone] = useState("")
  const [businessType, setBusinessType] = useState("cafe")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  // Step 3: Address
  const [street, setStreet] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState("NSW")
  const [postcode, setPostcode] = useState("")
  
  // Step 4: Operating Hours
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
  
  // Step 5: Representative Details
  const [repName, setRepName] = useState("")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  
  // Step 6: Business Verification & Systems
  const [abn, setAbn] = useState("")
  const [pointOfSale, setPointOfSale] = useState("lightspeed")
  const [paymentProvider, setPaymentProvider] = useState("square")
  
  const updateOperatingHours = (day: string, field: string, value: any) => {
    setOperatingHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }))
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0])
    }
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
        
      case 2: // Business Details
        if (!legalBusinessName) errors.push("Legal business name is required")
        if (!tradingName) errors.push("Trading name is required")
        if (!businessEmail) errors.push("Business email is required")
        if (businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail)) errors.push("Invalid business email format")
        if (!businessPhone) errors.push("Business phone is required")
        break
        
      case 3:
        if (!street) errors.push("Street address is required")
        if (!suburb) errors.push("Suburb is required")
        if (!state) errors.push("State is required")
        if (!postcode) errors.push("Postcode is required")
        if (postcode && (postcode.length !== 4 || !/^\d+$/.test(postcode))) errors.push("Postcode must be 4 digits")
        break
        
      case 4: // Operating Hours
        // Basic validation for operating hours
        for (const day of daysOfWeek) {
          const dayLower = day.toLowerCase()
          if (operatingHours[dayLower]?.isOpen) {
            if (!operatingHours[dayLower]?.openTime) errors.push(`Opening time for ${day} is required`)
            if (!operatingHours[dayLower]?.closeTime) errors.push(`Closing time for ${day} is required`)
          }
        }
        break
        
      case 5: // Representative
        if (!repName) errors.push("Representative name is required")
        if (!repPhone) errors.push("Contact phone is required")
        if (!repEmail) errors.push("Contact email is required")
        if (repEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(repEmail)) errors.push("Invalid contact email format")
        break
        
      case 6: // ABN & Verification
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
  
  const uploadLogo = async (userId) => {
    if (!logoFile) return null
    
    try {
      const logoRef = ref(storage, `merchants/${userId}/logo.${logoFile.name.split('.').pop()}`)
      await uploadBytes(logoRef, logoFile)
      const logoUrl = await getDownloadURL(logoRef)
      return logoUrl
    } catch (error) {
      console.error("Error uploading logo:", error)
      throw error
    }
  }
  
  const handleSubmit = async (e) => {
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
      
      // Upload logo if provided
      let logoUrl = null
      if (logoFile) {
        console.log("Uploading logo...")
        logoUrl = await uploadLogo(user.uid)
      }
      
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
        tradingName,
        businessEmail,
        businessPhone,
        businessType,
        logoUrl,
        
        // Address
        address: {
          street,
          suburb,
          state,
          postcode,
          coordinates: new GeoPoint(0, 0) // Will be updated with actual coordinates later
        },
        
        // Operating hours
        operatingHours,
        
        // Representative
        representative: {
          name: repName,
          phone: repPhone,
          email: repEmail
        },
        
        // Business verification
        abn,
        pointOfSale,
        paymentProvider,
        
        // System fields
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        isVerified: false,
        
        // Loyalty program settings
        loyaltyProgram: {
          pointsPerDollar: 1,
          welcomeBonus: 100,
          isActive: true
        }
      }
      
      console.log("Creating merchant document...")
      await setDoc(doc(db, 'merchants', user.uid), merchantData)
      
      console.log("Account created successfully!")
      
      toast({
        title: "Account created successfully!",
        description: "Welcome to Tap Loyalty. You can now start setting up your loyalty program.",
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
      
    } catch (error) {
      console.error("Error creating account:", error)
      
      let errorMessage = "Failed to create account. Please try again."
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists."
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "Password is too weak. Please choose a stronger password."
      } else if (error.code === 'auth/invalid-email') {
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
      case 2: return "Tell us about your business"
      case 3: return "Where are you located?"
      case 4: return "When are you open?"
      case 5: return "Who should we contact?"
      case 6: return "Let's verify your business"
      default: return "Create Account"
    }
  }
  
  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Start by creating your secure account"
      case 2: return "Help us understand your business better"
      case 3: return "We need your business address for customer matching"
      case 4: return "Set your operating hours for customer visibility"
      case 5: return "Primary contact for your loyalty program"
      case 6: return "Final details to get you started"
      default: return ""
    }
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 px-4 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 px-4 pr-12 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 px-4 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
              />
            </div>
          </div>
        )
        
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="legalBusinessName">Legal Business Name</Label>
              <Input
                id="legalBusinessName"
                placeholder="As registered with ASIC"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading Name</Label>
              <Input
                id="tradingName"
                placeholder="What customers know you as"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Business Email</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  placeholder="business@example.com"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  required
                  className="rounded-md"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="businessPhone">Business Phone</Label>
                <Input
                  id="businessPhone"
                  placeholder="(02) 1234 5678"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  required
                  className="rounded-md"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger className="rounded-md">
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
            
            <div className="space-y-2">
              <Label htmlFor="logo">Business Logo (Optional)</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="rounded-md"
                />
                {logoFile && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <Upload className="h-4 w-4" />
                    {logoFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                placeholder="123 Main Street"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  placeholder="Sydney"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  required
                  className="rounded-md"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="2000"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                  className="rounded-md"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger className="rounded-md">
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
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Set your operating hours so customers know when you're open
            </p>
            
            <div className="space-y-3">
              {daysOfWeek.map(day => (
                <div key={day} className="flex items-center gap-4 p-3 border rounded-md">
                  <div className="flex items-center space-x-2 min-w-[100px]">
                    <Checkbox
                      id={`${day}-open`}
                      checked={operatingHours[day.toLowerCase()]?.isOpen || false}
                      onCheckedChange={(checked) => updateOperatingHours(day, 'isOpen', checked)}
                    />
                    <Label htmlFor={`${day}-open`} className="text-sm font-medium">
                      {day}
                    </Label>
                  </div>
                  
                  {operatingHours[day.toLowerCase()]?.isOpen && (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={operatingHours[day.toLowerCase()]?.openTime || "09:00"}
                        onChange={(e) => updateOperatingHours(day, 'openTime', e.target.value)}
                        className="w-32 rounded-md"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        value={operatingHours[day.toLowerCase()]?.closeTime || "17:00"}
                        onChange={(e) => updateOperatingHours(day, 'closeTime', e.target.value)}
                        className="w-32 rounded-md"
                      />
                    </div>
                  )}
                  
                  {!operatingHours[day.toLowerCase()]?.isOpen && (
                    <span className="text-gray-500 text-sm flex-1">Closed</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
        
      case 5:
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Who should we contact about your loyalty program?
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="repName">Contact Name</Label>
              <Input
                id="repName"
                placeholder="John Smith"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                required
                className="rounded-md"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="repPhone">Contact Phone</Label>
                <Input
                  id="repPhone"
                  placeholder="0412 345 678"
                  value={repPhone}
                  onChange={(e) => setRepPhone(e.target.value)}
                  required
                  className="rounded-md"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="repEmail">Contact Email</Label>
                <Input
                  id="repEmail"
                  type="email"
                  placeholder="john@business.com"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  required
                  className="rounded-md"
                />
              </div>
            </div>
          </div>
        )
        
      case 6:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="abn">ABN (Australian Business Number)</Label>
              <Input
                id="abn"
                placeholder="11 digit ABN"
                value={abn}
                onChange={(e) => setAbn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                required
                className="rounded-md"
              />
              <p className="text-sm text-gray-500">
                Required for payment matching and loyalty point allocation
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pointOfSale">Point of Sale System</Label>
                <Select value={pointOfSale} onValueChange={setPointOfSale}>
                  <SelectTrigger className="rounded-md">
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
                <Label htmlFor="paymentProvider">Payment Provider</Label>
                <Select value={paymentProvider} onValueChange={setPaymentProvider}>
                  <SelectTrigger className="rounded-md">
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
    <PageTransition>
      <div className="min-h-screen w-full bg-white">
        <div className="grid min-h-screen lg:grid-cols-6">
          {/* Left side - Hero section */}
          <div className="relative hidden lg:flex lg:col-span-2 bg-gray-100 flex-col justify-between px-16 py-16">
            {/* Main content */}
            <div className="flex flex-col justify-center flex-1">
              <div className="max-w-md">
                {/* Tap Loyalty title */}
                <h1 className="text-2xl font-bold mb-6">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
                
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Join thousands of Australian businesses
                </h2>
                <p className="text-gray-600 leading-relaxed mb-8">
                  Start rewarding your customers today with Australia's most advanced loyalty platform.
                </p>
                
                {/* Benefits */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] bg-opacity-10 rounded-md flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#007AFF]" />
                    </div>
                    <span className="text-gray-700">Increase customer retention by 40%</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] bg-opacity-10 rounded-md flex items-center justify-center">
                      <Zap className="h-4 w-4 text-[#007AFF]" />
                    </div>
                    <span className="text-gray-700">Automated reward management</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#007AFF] bg-opacity-10 rounded-md flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-[#007AFF]" />
                    </div>
                    <span className="text-gray-700">Bank-grade security & compliance</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Integration icons */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-500 mb-4 font-medium tracking-wide">
                INTEGRATES WITH
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {["xero.png", "square.png", "sheetspro.png", "outlook.png", "mailchimp.png", "hubspot.png", "gmailnew.png", "lslogo.png"].map((integration, index) => (
                  <div key={index} className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                    <Image src={`/${integration}`} alt={integration.split('.')[0]} width={24} height={24} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Signup form */}
          <div className="relative flex flex-col lg:col-span-4">
            {/* Mobile header */}
            <div className="lg:hidden p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
              </div>
            </div>

            {/* Form section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
              <div className="w-full max-w-lg">
                {/* Progress indicator */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500">Step {currentStep} of {totalSteps}</span>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: totalSteps }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-2 w-8 rounded-full transition-colors ${
                            i < currentStep ? 'bg-[#007AFF]' : i === currentStep - 1 ? 'bg-[#007AFF]' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{getStepTitle()}</h2>
                    <p className="text-gray-600">{getStepDescription()}</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {renderStepContent()}
                  
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <p className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</p>
                      <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
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
                        className="rounded-md"
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
                        className="bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-md"
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
                        className="bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-md"
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
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="text-center text-sm text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-[#007AFF] hover:text-[#0066CC] font-medium hover:underline underline-offset-4 transition-colors">
                      Sign in
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile hero content */}
            <div className="lg:hidden bg-gray-50 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Join thousands of Australian businesses
                </h3>
                <p className="text-gray-600 text-sm">
                  Start rewarding your customers with <span className="font-semibold text-[#007AFF]">Tap Loyalty</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 