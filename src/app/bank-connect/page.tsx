"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRightIcon } from "@heroicons/react/24/solid"
import { ArrowPathIcon } from "@heroicons/react/24/outline"
import { doc, setDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { OAuthProvider, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"

type Step = "home" | "email-signup" | "mobile"

export default function BankConnectPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("home")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [mobile, setMobile] = useState("")
  const [loading, setLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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
    // Must be exactly 10 digits starting with 04
    if (!cleanPhone.match(/^04\d{8}$/)) {
      return false
    }
    // Additional check: second digit after 04 should be 0-9 (carrier code)
    return true
  }

  const validateEmail = (email: string) => {
    return email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  }

  // Convert Australian mobile (04XXXXXXXX) to international format (614XXXXXXXX)
  // Basiq expects format WITHOUT the + sign
  const formatMobileForBasiq = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      return `61${cleanPhone.substring(1)}`
    }
    return `61${cleanPhone}`
  }

  const handleAppleSignIn = async () => {
    try {
      setAppleLoading(true)
      setError(null)

      const provider = new OAuthProvider('apple.com')
      provider.addScope('email')
      provider.addScope('name')

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Get name from Apple (only available on first sign in)
      const displayName = user.displayName || ''
      const nameParts = displayName.split(' ')
      
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setEmail(user.email || '')

      // Move to mobile number step
      setStep("mobile")
    } catch (err: unknown) {
      console.error('Apple Sign In error:', err)
      const errorCode = (err as { code?: string })?.code
      if (errorCode === 'auth/popup-closed-by-user') {
        return
      }
      setError('Sign in failed. Please try again.')
    } finally {
      setAppleLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true)
      setError(null)

      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Get name from Google
      const displayName = user.displayName || ''
      const nameParts = displayName.split(' ')
      
      setFirstName(nameParts[0] || '')
      setLastName(nameParts.slice(1).join(' ') || '')
      setEmail(user.email || '')

      // Move to mobile number step
      setStep("mobile")
    } catch (err: unknown) {
      console.error('Google Sign In error:', err)
      const errorCode = (err as { code?: string })?.code
      if (errorCode === 'auth/popup-closed-by-user') {
        return
      }
      setError('Sign in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleEmailSignUp = async () => {
    if (!firstName.trim()) {
      setError("Please enter your first name")
      return
    }
    if (!lastName.trim()) {
      setError("Please enter your surname")
      return
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address")
      return
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await createUserWithEmailAndPassword(auth, email.trim(), password)
      
      // Update profile with name
      await updateProfile(result.user, {
        displayName: `${firstName.trim()} ${lastName.trim()}`
      })

      // Move to mobile number step
      setStep("mobile")
    } catch (err: unknown) {
      console.error('Email Sign Up error:', err)
      const errorCode = (err as { code?: string })?.code
      if (errorCode === 'auth/email-already-in-use') {
        setError('An account with this email already exists')
      } else if (errorCode === 'auth/weak-password') {
        setError('Password is too weak')
      } else {
        setError('Sign up failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConnectBank = async () => {
    if (!validateMobile(mobile)) {
      setError("Please enter a valid mobile number")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const user = auth.currentUser
      const sessionId = user?.uid || `guest_${Date.now()}_${Math.random().toString(36).substring(7)}`

      // Create the merchant document in Firestore
      console.log('Creating merchant document:', sessionId)
      const merchantDocRef = doc(db, 'merchants', sessionId)
      await setDoc(merchantDocRef, {
        merchantName: `${firstName.trim()} ${lastName.trim()}`.trim() || 'User',
        email: email.trim().toLowerCase() || user?.email || '',
        phone: mobile.replace(/\D/g, ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        isGuest: !user,
        appleId: user?.uid || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      console.log('Merchant document created successfully')

      // Small delay to ensure Firestore propagation
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Call the Basiq connect API
      const internationalMobile = formatMobileForBasiq(mobile)
      const callbackUrl = `${window.location.origin}/bank-callback`
      
      const response = await fetch('/api/basiqconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            userId: sessionId,
            merchantId: sessionId,
            mobile: internationalMobile,
            email: email.trim() || user?.email || '',
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            callbackUrl: callbackUrl
          }
        }),
      })

      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Connection failed')
      }

      const authLink = responseData.data?.authLink || responseData.authLink

      if (authLink) {
        localStorage.setItem('basiq_session_id', sessionId)
        localStorage.setItem('basiq_user_email', email.trim() || user?.email || '')
        
        setSuccess(true)
        setTimeout(() => { window.location.href = authLink }, 600)
      } else {
        throw new Error('No authentication link received')
      }
    } catch (err: unknown) {
      console.error('Bank connect error:', err)
      const message = err instanceof Error ? err.message : 'Something went wrong'
      
      // Show user-friendly error messages
      if (message.includes('mobile') || message.includes('format')) {
        setError('Please enter a valid Australian mobile number (04XX XXX XXX)')
      } else if (message.includes('Connection failed')) {
        setError('Unable to connect to banking service. Please try again.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFirstName("")
    setLastName("")
    setEmail("")
    setPassword("")
    setMobile("")
    setError(null)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-x-hidden overflow-y-auto">
      {/* Pure blue gradient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] max-w-[200vw] h-[500px] rounded-full bg-gradient-to-b from-[#007AFF]/35 via-[#007AFF]/15 to-transparent blur-[100px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] max-w-[150vw] h-[300px] rounded-full bg-[#007AFF]/20 blur-[120px]" />
      </div>
      
      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <div className="text-[15px] font-semibold flex items-center">
          <span className="bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] bg-clip-text text-transparent">Tap</span>
          <span className="text-white/80 ml-1">Loyalty</span>
        </div>
        <button 
          onClick={() => router.push('/customer-dashboard')}
          className="text-[15px] font-medium text-white/70 hover:text-white transition-colors"
        >
          Sign in
        </button>
      </header>
      
      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {step === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center w-full max-w-[360px]"
            >
              {/* Hero */}
              <div className="text-center mb-10">
                <h1 className="text-[40px] sm:text-[52px] font-semibold text-white tracking-tight leading-[1.05] mb-3">
                  Loyalty, on{" "}
                  <span className="bg-gradient-to-r from-[#007AFF] via-[#00A8FF] to-[#5AC8FA] bg-clip-text text-transparent">
                    autopilot.
                  </span>
                </h1>
                <p className="text-[16px] text-white/50 leading-relaxed">
                  Connect once. Earn rewards automatically.
                </p>
              </div>

              {/* Sign in buttons */}
              <div className="w-full space-y-3">
                <button
                  onClick={handleAppleSignIn}
                  disabled={appleLoading || googleLoading}
                  className="w-full h-[52px] bg-white text-black text-[15px] font-semibold rounded-xl transition-all duration-200 hover:bg-white/90 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {appleLoading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </button>

                <button
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || appleLoading}
                  className="w-full h-[52px] bg-white/[0.08] border border-white/[0.1] text-white text-[15px] font-semibold rounded-xl transition-all duration-200 hover:bg-white/[0.12] active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {googleLoading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </button>
              </div>

              {/* Email option as text link */}
              <button
                onClick={() => setStep("email-signup")}
                className="mt-5 text-[14px] text-white/40 hover:text-white/60 transition-colors"
              >
                or sign up with email
              </button>

              {error && (
                <p className="text-[13px] text-red-400 mt-3 text-center">{error}</p>
              )}

              {/* Footer */}
              <p className="mt-auto pt-16 text-[11px] text-white/20">
                Secured with bank-level encryption
              </p>
            </motion.div>
          )}

          {step === "email-signup" && (
            <motion.div
              key="email-signup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center w-full max-w-[360px]"
            >
              {/* Title */}
              <div className="text-center mb-6">
                <h1 className="text-[28px] font-semibold text-white tracking-tight">
                  Create account
                </h1>
              </div>

              {/* Card */}
              <div className="w-full bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                <div className="space-y-4">
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
                        className="w-full h-[48px] px-4 text-[16px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
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
                        className="w-full h-[48px] px-4 text-[16px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[13px] font-medium text-white/70 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="john@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value)
                        setError(null)
                      }}
                      className="w-full h-[48px] px-4 text-[16px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[13px] font-medium text-white/70 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        setError(null)
                      }}
                      className="w-full h-[48px] px-4 text-[16px] text-white bg-white/[0.06] border border-white/[0.1] rounded-xl focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all duration-200 placeholder:text-white/30"
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
                    onClick={handleEmailSignUp}
                    disabled={loading || !firstName || !lastName || !email || !password}
                    className="w-full h-[52px] bg-white hover:bg-white/90 disabled:bg-white/50 text-black text-[15px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        <span>Creating account...</span>
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("home")
                      resetForm()
                    }}
                    className="w-full text-[14px] text-white/50 hover:text-white/70 font-medium transition-colors py-1"
                  >
                    Back
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === "mobile" && (
            <motion.div
              key="mobile"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center w-full max-w-[360px]"
            >
              {/* Title */}
              <div className="text-center mb-8">
                <h1 className="text-[28px] font-semibold text-white tracking-tight mb-2">
                  Connect your bank
                </h1>
                <p className="text-[15px] text-white/50">
                  We need your mobile to verify your identity
                </p>
              </div>

              {/* Card */}
              <div className="w-full bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                <div className="space-y-4">
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
                      autoFocus
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
                    disabled={loading || !mobile || success}
                    className="w-full h-[52px] bg-white hover:bg-white/90 disabled:bg-white/50 text-black text-[15px] font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <ArrowPathIcon className="h-5 w-5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : success ? (
                      "Redirecting..."
                    ) : (
                      <>
                        Connect Bank
                        <ArrowRightIcon className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("home")
                      resetForm()
                    }}
                    className="w-full text-[14px] text-white/50 hover:text-white/70 font-medium transition-colors py-1"
                  >
                    Back
                  </button>
                </div>
              </div>

              {/* Signed in as */}
              {email && (
                <p className="text-[12px] text-white/30 mt-6">
                  Signed in as {email}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
