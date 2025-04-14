"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    // Basic Authentication
    email: "",
    password: "",
    confirmPassword: "",

    // Business Details
    legalBusinessName: "",
    tradingName: "",
    businessType: "",
    businessPhone: "",

    // Address
    street: "",
    suburb: "",
    state: "",
    postcode: "",

    // Operating Hours
    operatingHours: "",

    // Representative Details
    repName: "",
    repPhone: "",
    repEmail: "",

    // ABN & Verification
    abn: "",
    abnVerificationDoc: null,

    // Additional Fields
    businessEmail: "",
    pointOfSale: "",
    paymentProvider: "",
  })

  const steps = [
    {
      title: "Authentication"
    },
    {
      title: "Business Details"
    },
    {
      title: "Location"
    },
    {
      title: "Additional Info"
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (step < steps.length) {
      setStep(step + 1)
      return
    }

    try {
      setLoading(true)
      setError("")

      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      await setDoc(doc(db, "merchants", user.uid), {
        createdAt: new Date(),
        email: formData.email,
        legalBusinessName: formData.legalBusinessName,
        tradingName: formData.tradingName,
        businessType: formData.businessType,
        businessPhone: formData.businessPhone,
        address: {
          street: formData.street,
          suburb: formData.suburb,
          state: formData.state,
          postcode: formData.postcode,
        },
        representative: {
          name: formData.repName,
          email: formData.businessEmail || formData.email,
        },
        abn: formData.abn,
        status: 'active',
      })

      router.push('/dashboard')
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(
        err.code === 'auth/email-already-in-use' 
          ? 'An account with this email already exists'
          : 'Something went wrong. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create your merchant account in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                {steps.map((s, i) => (
                  <div 
                    key={s.title}
                    className={cn(
                      "flex items-center",
                      i < steps.length - 1 && "flex-1"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <div className={cn(
                        "h-8 w-8 rounded-full border-2 flex items-center justify-center",
                        step > i + 1 ? "border-green-500 bg-green-500 text-white" :
                        step === i + 1 ? "border-[#007AFF] text-[#007AFF]" :
                        "border-gray-300 text-gray-300"
                      )}>
                        {step > i + 1 ? "✓" : i + 1}
                      </div>
                      <div className="text-xs mt-1 text-center">
                        <div className="font-medium min-w-[100px]">{s.title}</div>
                      </div>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={cn(
                        "h-px w-full mx-4",
                        step > i + 1 ? "bg-green-500" : "bg-gray-300"
                      )} />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8">
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="m@example.com"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="legalBusinessName">Legal Business Name</Label>
                      <Input
                        id="legalBusinessName"
                        value={formData.legalBusinessName}
                        onChange={(e) => setFormData({...formData, legalBusinessName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="tradingName">Trading Name</Label>
                      <Input
                        id="tradingName"
                        value={formData.tradingName}
                        onChange={(e) => setFormData({...formData, tradingName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        type="tel"
                        value={formData.businessPhone}
                        onChange={(e) => setFormData({...formData, businessPhone: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select 
                        value={formData.businessType}
                        onValueChange={(value) => setFormData({...formData, businessType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="retail">Retail</SelectItem>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="cafe">Café</SelectItem>
                          <SelectItem value="service">Service</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="street">Street Address</Label>
                      <Input
                        id="street"
                        value={formData.street}
                        onChange={(e) => setFormData({...formData, street: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="suburb">Suburb</Label>
                        <Input
                          id="suburb"
                          value={formData.suburb}
                          onChange={(e) => setFormData({...formData, suburb: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="state">State</Label>
                        <Select 
                          value={formData.state}
                          onValueChange={(value) => setFormData({...formData, state: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nsw">NSW</SelectItem>
                            <SelectItem value="vic">VIC</SelectItem>
                            <SelectItem value="qld">QLD</SelectItem>
                            <SelectItem value="wa">WA</SelectItem>
                            <SelectItem value="sa">SA</SelectItem>
                            <SelectItem value="tas">TAS</SelectItem>
                            <SelectItem value="act">ACT</SelectItem>
                            <SelectItem value="nt">NT</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="postcode">Postcode</Label>
                      <Input
                        id="postcode"
                        value={formData.postcode}
                        onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="repName">Representative Name</Label>
                      <Input
                        id="repName"
                        value={formData.repName}
                        onChange={(e) => setFormData({...formData, repName: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="abn">ABN</Label>
                      <Input
                        id="abn"
                        value={formData.abn}
                        onChange={(e) => setFormData({...formData, abn: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="businessEmail">Business Email (Optional)</Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={formData.businessEmail}
                        onChange={(e) => setFormData({...formData, businessEmail: e.target.value})}
                      />
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 mt-4">
                  {error}
                </div>
              )}

              <div className="flex justify-between mt-8">
                {step > 1 && (
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={loading}
                  >
                    Back
                  </Button>
                )}
                <Button 
                  type="submit"
                  className="bg-[#007AFF] hover:bg-[#0066CC] ml-auto"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {step === steps.length ? 'Creating Account...' : 'Next'}
                    </div>
                  ) : (
                    step === steps.length ? 'Create Account' : 'Next'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link 
          href="/login" 
          className="text-[#007AFF] hover:underline underline-offset-4"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
} 