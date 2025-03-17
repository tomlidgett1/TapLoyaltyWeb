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
import { Eye, EyeOff, ArrowRight, Loader2, ChevronLeft, ChevronRight, Upload } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { collection, query, where, getDocs } from "firebase/firestore"
import Script from "next/script"

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
  const [businessType, setBusinessType] = useState("cafe")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  
  // Step 3: Address
  const [street, setStreet] = useState("")
  const [suburb, setSuburb] = useState("")
  const [state, setState] = useState("NSW")
  const [postcode, setPostcode] = useState("")
  
  // Step 4: Operating Hours
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
  
  // Step 5: Representative Details
  const [repName, setRepName] = useState("")
  const [repPhone, setRepPhone] = useState("")
  const [repEmail, setRepEmail] = useState("")
  
  // Step 6: Business Verification & Systems
  const [abn, setAbn] = useState("")
  const [pointOfSale, setPointOfSale] = useState("lightspeed")
  const [paymentProvider, setPaymentProvider] = useState("square")
  
  const updateOperatingHours = (day, field, value) => {
    setOperatingHours(prev => ({
      ...prev,
      [day.toLowerCase()]: {
        ...prev[day.toLowerCase()],
        [field]: value
      }
    }))
  }
  
  const handleFileChange = (e) => {
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
        console.log("Sign-in methods found:", signInMethods);
        
        // If there are sign-in methods available, the email is already in use
        if (signInMethods.length > 0) {
          console.log("Email already exists in Auth, showing error");
          setValidationErrors(["This email is already registered. Please use a different email or login."]);
          setLoading(false);
          return;
        }
        
        // Also check in Firestore merchants collection for primaryemail field
        console.log("Checking Firestore for email...");
        const merchantsRef = collection(db, "merchants");
        const q = query(merchantsRef, where("primaryemail", "==", email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          console.log("Email found in Firestore merchants collection");
          setValidationErrors(["This email is already registered. Please use a different email or login."]);
          setLoading(false);
          return;
        }
        
        // Also check for businessEmail field
        const businessEmailQuery = query(merchantsRef, where("businessEmail", "==", email));
        const businessEmailSnapshot = await getDocs(businessEmailQuery);
        
        if (!businessEmailSnapshot.empty) {
          console.log("Email found as business email in Firestore");
          setValidationErrors(["This email is already registered. Please use a different email or login."]);
          setLoading(false);
          return;
        }
        
        console.log("Email is available, proceeding to next step");
        // Email is available, proceed to next step
        setCurrentStep(prev => Math.min(prev + 1, totalSteps));
      } catch (error) {
        console.error("Error checking email:", error);
        setValidationErrors(["An error occurred while checking email availability. Please try again."]);
      } finally {
        setLoading(false);
      }
    } else {
      // For other steps, just proceed normally
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  }
  
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }
  
  const uploadLogo = async (userId) => {
    console.log("Starting logo upload for user:", userId);
    
    if (!logoFile) {
      console.warn("No logo file selected");
      return null;
    }
    
    console.log("Logo file details:", {
      name: logoFile.name,
      type: logoFile.type,
      size: `${(logoFile.size / 1024).toFixed(2)} KB`
    });
    
    const filename = `${userId}/logo/${logoFile.name}`;
    console.log("Target storage path:", filename);
    
    try {
      console.log("Creating storage reference...");
      const storageRef = ref(storage, filename);
      console.log("Storage reference created:", storageRef);
      
      console.log("Starting file upload...");
      const snapshot = await uploadBytes(storageRef, logoFile);
      console.log("Upload completed:", snapshot);
      
      console.log("Getting download URL...");
      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", downloadURL);
      
      return downloadURL;
    } catch (error) {
      console.error("Error uploading logo:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      // Return the path instead of null, so we at least have the reference
      return `${userId}/logo/${logoFile.name}`;
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateCurrentStep()) return
    
    setLoading(true)
    
    try {
      console.log("Starting account creation process...");
      console.log("Form data:", { 
        email, 
        password: "********", // Don't log actual password
        legalBusinessName,
        tradingName,
        businessType
      });
      
      // Create user account
      console.log("Attempting to create user with Firebase Auth...");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      
      console.log("User created successfully:", userCredential.user.uid);
      const user = userCredential.user
      const userId = user.uid
      
      // Update profile with business name
      console.log("Updating user profile...");
      await updateProfile(user, {
        displayName: tradingName
      })
      
      console.log("User created successfully, starting file uploads...");

      // Upload logo if provided
      console.log("Uploading logo...");
      const logoURL = await uploadLogo(userId);
      console.log("Logo upload result:", logoURL);
      
      // Format the display address
      const displayAddress = [street, suburb]
        .filter(part => part)
        .join(", ")
      
      // Format the full address
      const formattedAddress = [street, suburb, postcode, state]
        .filter(part => part)
        .join(", ")
      
      // Create business details
      const businessData = {
        legalName: legalBusinessName,
        tradingName: tradingName,
        merchantName: tradingName,
        abn: abn,
        businessType: businessType,
        address: {
          street: street,
          suburb: suburb,
          state: state,
          postcode: postcode
        },
        location: {
          address: [formattedAddress],
          displayAddress: displayAddress,
          coordinates: {
            latitude: 0,
            longitude: 0
          }
        },
        operatingHours: operatingHours,
        representative: {
          name: repName,
          phone: repPhone,
          email: repEmail
        },
        businessEmail: businessEmail,
        primaryemail: email,
        merchantId: userId,
        pointOfSale: pointOfSale,
        paymentProvider: paymentProvider,
        defaultmultiplier: 3,
        createdAt: new Date(),
        status: "active",
        plan: "free",
        logoUrl: logoURL // Use the actual URL or path
      }
      
      // Save to Firestore
      await setDoc(doc(db, "merchants", userId), businessData)
      
      toast({
        title: "Account created!",
        description: "Welcome to Tap Loyalty. Redirecting to your dashboard...",
      })
      
      setTimeout(() => {
        router.push("/dashboard")
      }, 1500)
      
    } catch (error) {
      console.error("Error creating account:", error);
      // More detailed error logging
      if (error.code) {
        console.error("Error code:", error.code);
      }
      
      // Show error to user
      toast({
        title: "Account creation failed",
        description: error.message || "There was an error creating your account. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false)
    }
  }
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (min 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button 
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
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
                placeholder="Legal registered name"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading Name</Label>
              <Input
                id="tradingName"
                placeholder="Name customers know you by"
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                placeholder="business@example.com"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger>
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
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="suburb">Suburb</Label>
              <Input
                id="suburb"
                placeholder="Suburb"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger>
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
              
              <div className="space-y-2">
                <Label htmlFor="postcode">Postcode</Label>
                <Input
                  id="postcode"
                  placeholder="0000"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required
                />
              </div>
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Set your business operating hours</p>
            
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
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
        )
        
      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repName">Representative Name</Label>
              <Input
                id="repName"
                placeholder="Full name"
                value={repName}
                onChange={(e) => setRepName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repPhone">Contact Phone</Label>
              <Input
                id="repPhone"
                placeholder="Phone number"
                value={repPhone}
                onChange={(e) => {
                  // Only allow numeric input
                  const numericValue = e.target.value.replace(/\D/g, '');
                  setRepPhone(numericValue);
                }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="repEmail">Contact Email</Label>
              <Input
                id="repEmail"
                type="email"
                placeholder="contact@example.com"
                value={repEmail}
                onChange={(e) => setRepEmail(e.target.value)}
                required
              />
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
              />
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pointOfSale">Point of Sale System</Label>
                <Select value={pointOfSale} onValueChange={setPointOfSale}>
                  <SelectTrigger>
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
                  <SelectTrigger>
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="Tap Loyalty" 
              width={48} 
              height={48} 
              className="rounded-lg"
            />
            <h1 className="text-2xl">
              <span className="text-[#007AFF] font-extrabold">Tap</span>{" "}
              <span className="font-semibold">Loyalty</span>
            </h1>
          </div>
          <p className="text-gray-500 max-w-xs">
Let's get started...
          </p>
        </div>
        
        <Card className="border-none shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Step {currentStep} of {totalSteps}</CardTitle>
              <div className="flex items-center space-x-1">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-2 w-2 rounded-full ${i < currentStep ? 'bg-blue-600' : 'bg-gray-200'}`}
                  />
                ))}
              </div>
            </div>
            <CardDescription>
              {currentStep === 1 && "Account information"}
              {currentStep === 2 && "Business details"}
              {currentStep === 3 && "Business address"}
              {currentStep === 4 && "Operating hours"}
              {currentStep === 5 && "Representative details"}
              {currentStep === 6 && "Business verification"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {renderStepContent()}
              
              {validationErrors.length > 0 && (
                <div className="bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-red-800 mb-1">Please fix the following errors:</p>
                  <ul className="text-xs text-red-700 list-disc pl-5">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-between pt-2">
                {currentStep > 1 ? (
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={prevStep}
                    disabled={loading}
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
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="bg-blue-600 hover:bg-blue-700"
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
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Separator />
            <div className="text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:underline font-medium">
                Log in
              </Link>
            </div>
          </CardFooter>
        </Card>
        
        <div className="text-center text-xs text-gray-500">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
} 