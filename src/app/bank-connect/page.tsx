"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, ArrowRight } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function BankConnectPage() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [mobile, setMobile] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState("Creating account...")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const formatPhoneNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length <= 4) {
      return cleanPhone
    } else if (cleanPhone.length <= 7) {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4)}`
    } else {
      return `${cleanPhone.slice(0, 4)} ${cleanPhone.slice(4, 7)} ${cleanPhone.slice(7, 10)}`
    }
  }

  const validateMobile = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    return cleanPhone.match(/^04\d{8}$/)
  }

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  }

  // Convert Australian mobile (04XXXXXXXX) to international format (+614XXXXXXXX)
  const formatMobileForBasiq = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    // Remove leading 0 and add +61
    if (cleanPhone.startsWith('0')) {
      return `+61${cleanPhone.substring(1)}`
    }
    return `+61${cleanPhone}`
  }

  const handleConnectBank = async () => {
    if (!firstName.trim()) {
      setError("Please enter your first name")
      return
    }
    if (!lastName.trim()) {
      setError("Please enter your surname")
      return
    }
    if (!email.trim()) {
      setError("Please enter your email address")
      return
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (!validateMobile(mobile)) {
      setError("Please enter a valid mobile number")
      return
    }

    try {
      setLoading(true)
      setLoadingText("Creating account...")
      setError(null)

      const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Step 1: Create the guest merchant document in Firestore first
      console.log('Creating guest merchant document:', sessionId)
      const merchantDocRef = doc(db, 'merchants', sessionId)
      await setDoc(merchantDocRef, {
        merchantName: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim().toLowerCase(),
        phone: mobile.replace(/\D/g, ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isGuest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('Guest merchant document created successfully')

      // Step 2: Small delay to ensure Firestore propagation
      setLoadingText("Connecting to bank...")
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Step 3: Now call the Basiq connect API
      const internationalMobile = formatMobileForBasiq(mobile)
      console.log('Sending mobile to Basiq in international format:', internationalMobile)
      
      const response = await fetch('/api/basiqconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            userId: sessionId,
            merchantId: sessionId,
            mobile: internationalMobile,
            email: email.trim(),
            firstName: firstName.trim(),
            lastName: lastName.trim()
          }
        }),
      })

      const responseData = await response.json()
      console.log('BASIQ response:', responseData)
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Connection failed')
      }

      const authLink = responseData.data?.authLink || responseData.authLink

      if (authLink) {
        setSuccess(true)
        setTimeout(() => { window.location.href = authLink }, 600)
      } else {
        console.log('No authLink found in response:', responseData)
        throw new Error('No authentication link received')
      }
    } catch (err: unknown) {
      console.error('Bank connect error:', err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Pure blue gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gradient-to-b from-[#007AFF]/35 via-[#007AFF]/15 to-transparent blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] rounded-full bg-[#007AFF]/20 blur-[120px]" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <span className="text-[15px] font-medium text-white/90">
          Tap Loyalty
        </span>
        <button 
          onClick={() => router.push('/customer-dashboard')}
          className="text-[15px] font-medium text-white/70 hover:text-white transition-colors"
        >
          Sign in
        </button>
      </header>
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-md mb-12"
        >
          <h1 className="text-[44px] sm:text-[56px] font-semibold text-white tracking-tight leading-[1.05] mb-4">
            Loyalty, on{" "}
            <span className="bg-gradient-to-r from-[#007AFF] via-[#00A8FF] to-[#5AC8FA] bg-clip-text text-transparent">
              autopilot.
            </span>
          </h1>
          <p className="text-[17px] text-white/50 leading-relaxed">
            Connect once. Earn rewards automatically.
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px]"
        >
          <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
            <AnimatePresence mode="wait">
              {!showForm ? (
                <motion.button
                  key="button"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setShowForm(true)}
                  className="group w-full h-[52px] bg-white text-black text-[15px] font-semibold rounded-xl transition-all duration-200 hover:bg-white/90 flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </motion.button>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* First Name & Last Name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[13px] font-medium text-white/70 mb-2">
                        First name
                      </label>
                      <input
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => {
                          setFirstName(e.target.value)
                          setError(null)
                        }}
                        autoFocus
                        className="w-full h-[52px] px-4 text-[17px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                      />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-white/70 mb-2">
                        Surname
                      </label>
                      <input
                        type="text"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => {
                          setLastName(e.target.value)
                          setError(null)
                        }}
                        className="w-full h-[52px] px-4 text-[17px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-medium text-white/70 mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError(null)
                      }}
                      className="w-full h-[52px] px-4 text-[17px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                    />
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-[13px] font-medium text-white/70 mb-2">
                      Mobile number
                    </label>
                    <input
                      type="tel"
                      placeholder="0412 345 678"
                      value={mobile}
                      onChange={(e) => {
                        const cleanValue = e.target.value.replace(/\D/g, '')
                        if (cleanValue.length <= 10) {
                          setMobile(formatPhoneNumber(cleanValue))
                        }
                        setError(null)
                      }}
                      className="w-full h-[52px] px-4 text-[17px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="text-[13px] text-red-400"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    onClick={handleConnectBank}
                    disabled={loading || !firstName || !lastName || !email || !mobile || success}
                    className="w-full h-[52px] bg-white hover:bg-white/90 disabled:bg-white/50 text-black text-[15px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>{loadingText}</span>
                      </>
                    ) : success ? (
                      "Redirecting..."
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setFirstName("")
                      setLastName("")
                      setEmail("")
                      setMobile("")
                      setError(null)
                    }}
                    className="w-full text-[14px] text-white/50 hover:text-white/70 font-medium transition-colors py-1"
                  >
                    Back
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative z-10 py-6 text-center"
      >
        <p className="text-[12px] text-white/30">
          Secured with bank-level encryption
        </p>
      </motion.div>
    </div>
  )
}


