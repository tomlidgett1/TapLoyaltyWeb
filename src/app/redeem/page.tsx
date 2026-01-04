"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, GiftIcon } from "@heroicons/react/24/solid"
import { CheckCircleIcon } from "@heroicons/react/24/outline"
import { httpsCallable } from "firebase/functions"
import { functions, auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"

// Confetti particle component
const Confetti = ({ delay }: { delay: number }) => {
  const colors = ["#007AFF", "#0055CC", "#5AC8FA", "#00A8FF", "#003D99"]
  const color = colors[Math.floor(Math.random() * colors.length)]
  const left = Math.random() * 100
  const animationDuration = 2 + Math.random() * 2
  
  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{ 
        y: typeof window !== 'undefined' ? window.innerHeight + 100 : 800, 
        x: (Math.random() - 0.5) * 200,
        opacity: [1, 1, 0],
        rotate: Math.random() * 720 - 360
      }}
      transition={{ 
        duration: animationDuration, 
        delay: delay,
        ease: "easeIn"
      }}
      className="absolute pointer-events-none"
      style={{ 
        left: `${left}%`,
        width: 8 + Math.random() * 8,
        height: 8 + Math.random() * 8,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      }}
    />
  )
}

// Loading fallback
function RedeemLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-white/50">Loading...</p>
      </div>
    </div>
  )
}

// Main content component
function RedeemContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rewardName = searchParams.get("reward") || "Free Coffee"
  const merchantName = searchParams.get("merchant") || "Blue Bottle Coffee"
  const rewardId = searchParams.get("rewardId")
  const merchantIdParam = searchParams.get("merchantId")
  
  const [pin, setPin] = useState(["", "", "", ""])
  const [error, setError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [success, setSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [merchantId, setMerchantId] = useState<string | null>(merchantIdParam)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  // Success screen state
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isCardFlipped, setIsCardFlipped] = useState(false)
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number; opacity: number }[]>([])
  const [contentOpacity, setContentOpacity] = useState(1)
  const [merchantLogoUrl, setMerchantLogoUrl] = useState<string | null>(null)

  // Check authentication status and get customerId
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCustomerId(user?.uid || null)
    })
    return () => unsubscribe()
  }, [])

  // Fetch merchant logo when merchantId is available
  useEffect(() => {
    const fetchMerchantLogo = async () => {
      if (!merchantId) return
      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', merchantId))
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          if (data.logoUrl) {
            setMerchantLogoUrl(data.logoUrl)
          }
        }
      } catch (error) {
        console.error('Error fetching merchant logo:', error)
      }
    }
    fetchMerchantLogo()
  }, [merchantId])

  // Play success sound using Web Audio API
  const playSuccessSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Create a pleasant success chime with multiple notes
      const playNote = (frequency: number, startTime: number, duration: number, volume: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = 'sine'
        
        // Envelope for smooth sound
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime)
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startTime + duration)
        
        oscillator.start(audioContext.currentTime + startTime)
        oscillator.stop(audioContext.currentTime + startTime + duration)
      }
      
      // Play a nice ascending chime (C5 - E5 - G5)
      playNote(523.25, 0, 0.15, 0.3)      // C5
      playNote(659.25, 0.1, 0.15, 0.3)    // E5
      playNote(783.99, 0.2, 0.3, 0.4)     // G5
    } catch (error) {
      console.log('Could not play sound:', error)
    }
  }, [])

  const triggerSuccess = useCallback(() => {
    setSuccess(true)
    setShowConfetti(true)
    
    // Play success sound
    playSuccessSound()
    
    // Stop confetti after animation
    setTimeout(() => setShowConfetti(false), 4000)
  }, [playSuccessSound])

  const handleRedemption = useCallback(async (fullPin: string) => {
    if (!rewardId) {
      setError(true)
      setErrorMessage("Invalid reward. Please try again.")
      return
    }

    if (!customerId) {
      setError(true)
      setErrorMessage("Please log in to redeem rewards.")
      return
    }

    setIsLoading(true)
    setError(false)
    setErrorMessage("")

    try {
      // First, fetch the reward to validate PIN and get merchantId if not provided
      let actualMerchantId = merchantId
      let rewardPin: string | undefined

      // Try to get reward from rewards collection first
      const rewardDoc = await getDoc(doc(db, 'rewards', rewardId))
      
      if (rewardDoc.exists()) {
        const rewardData = rewardDoc.data()
        rewardPin = rewardData.pin
        if (!actualMerchantId) {
          actualMerchantId = rewardData.merchantId
        }
      } else if (actualMerchantId) {
        // Try merchant's rewards subcollection
        const merchantRewardDoc = await getDoc(doc(db, 'merchants', actualMerchantId, 'rewards', rewardId))
        if (merchantRewardDoc.exists()) {
          rewardPin = merchantRewardDoc.data().pin
        }
      }

      // Validate PIN
      if (rewardPin !== fullPin) {
        setError(true)
        setErrorMessage("Incorrect PIN. Please try again.")
        setTimeout(() => {
          setPin(["", "", "", ""])
          inputRefs.current[0]?.focus()
        }, 600)
        setIsLoading(false)
        return
      }

      if (!actualMerchantId) {
        setError(true)
        setErrorMessage("Unable to find merchant. Please try again.")
        setIsLoading(false)
        return
      }

      // Update merchantId state if we found it
      if (!merchantId && actualMerchantId) {
        setMerchantId(actualMerchantId)
      }

      // Call the redeemReward function with correct payload
      const redeemRewardFn = httpsCallable(functions, 'redeemReward')
      const result = await redeemRewardFn({
        rewardId,
        merchantId: actualMerchantId,
        customerId
      })

      const data = result.data as { success?: boolean; error?: string }
      
      if (data.error) {
        setError(true)
        setErrorMessage(data.error)
        setTimeout(() => {
          setPin(["", "", "", ""])
          inputRefs.current[0]?.focus()
        }, 600)
      } else {
        triggerSuccess()
      }
    } catch (err: any) {
      console.error("Redemption error:", err)
      setError(true)
      
      // Handle specific error messages
      const errorMsg = err.message || "An error occurred. Please try again."
      if (errorMsg.includes("Insufficient points")) {
        setErrorMessage("You don't have enough points to redeem this reward.")
      } else if (errorMsg.includes("already been redeemed")) {
        setErrorMessage("This reward has already been redeemed.")
      } else {
        setErrorMessage(errorMsg)
      }
      
      setTimeout(() => {
        setPin(["", "", "", ""])
        inputRefs.current[0]?.focus()
      }, 600)
    } finally {
      setIsLoading(false)
    }
  }, [rewardId, customerId, merchantId, triggerSuccess])

  const handlePinChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    if (isLoading) return
    
    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError(false)
    setErrorMessage("")
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Check if complete
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join("")
      if (fullPin.length === 4) {
        handleRedemption(fullPin)
      }
    }
  }, [pin, isLoading, handleRedemption])

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Update time every second when success
  useEffect(() => {
    if (!success) return
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [success])

  // Format time with seconds
  const formatTimeWithSeconds = (date: Date) => {
    return date.toLocaleTimeString('en-AU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    })
  }

  // Format date
  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-AU', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  // Handle card flip with haptic and sparkles
  const handleCardFlip = () => {
    // Vibrate if supported
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50])
    }
    
    setIsCardFlipped(true)
    
    // Generate sparkles
    const newSparkles = Array.from({ length: 25 }, (_, i) => ({
      id: `sparkle-${Date.now()}-${i}`,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
      y: -30,
      opacity: 1
    }))
    setSparkles(newSparkles)
    
    // Clear sparkles after animation
    setTimeout(() => setSparkles([]), 3000)
    
    // Flip back after 2.5 seconds
    setTimeout(() => {
      setIsCardFlipped(false)
    }, 2500)
  }

  // Handle done button with fade
  const handleDone = () => {
    setContentOpacity(0)
    setTimeout(() => {
      router.push('/customer-dashboard')
    }, 300)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-x-hidden overflow-y-auto relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          animate={{ 
            scale: success ? [1, 1.5, 1.2] : 1,
            opacity: success ? [0.2, 0.4, 0.3] : 0.2
          }}
          transition={{ duration: 1 }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-[#007AFF]/30 via-[#007AFF]/10 to-transparent blur-[100px]" 
        />
      </div>

      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {Array.from({ length: 100 }).map((_, i) => (
              <Confetti key={i} delay={i * 0.02} />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[15px] font-medium text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back
        </button>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <AnimatePresence mode="wait">
          {!success ? (
            <motion.div
              key="pin-entry"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-sm text-center"
            >
              {/* Reward Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] mx-auto mb-6 flex items-center justify-center shadow-lg shadow-[#007AFF]/30"
              >
                <GiftIcon className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-[28px] font-semibold text-white mb-2"
              >
                {rewardName}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[15px] text-white/50 mb-10"
              >
                {merchantName}
              </motion.p>

              {/* Instructions */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-[17px] text-white/70 mb-8"
              >
                Enter the merchant&apos;s PIN to redeem
              </motion.p>

              {/* PIN Input */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-4 mb-6"
              >
                {pin.map((digit, index) => (
                  <motion.div
                    key={index}
                    animate={error ? { x: [-8, 8, -8, 8, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <input
                      ref={el => { inputRefs.current[index] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      disabled={isLoading}
                      className={`w-16 h-20 text-center text-[32px] font-semibold rounded-2xl border-2 bg-white/[0.06] backdrop-blur-xl transition-all duration-200 outline-none ${
                        error 
                          ? "border-red-500 text-red-400" 
                          : digit 
                            ? "border-[#007AFF] text-white shadow-lg shadow-[#007AFF]/20" 
                            : "border-white/20 text-white"
                      } focus:border-[#007AFF] focus:shadow-lg focus:shadow-[#007AFF]/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Loading indicator */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <div className="h-4 w-4 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin"></div>
                    <p className="text-[15px] text-white/70">Verifying PIN...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error message */}
              <AnimatePresence>
                {error && !isLoading && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[15px] text-red-400"
                  >
                    {errorMessage || "Incorrect PIN. Please try again."}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: contentOpacity }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-[#FAFAFA] flex flex-col z-50"
            >
              {/* Falling Sparkles */}
              <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
                {sparkles.map((sparkle) => (
                  <motion.div
                    key={sparkle.id}
                    initial={{ y: -30, x: sparkle.x, opacity: 1, scale: 1, rotate: 0 }}
                    animate={{ 
                      y: typeof window !== 'undefined' ? window.innerHeight + 50 : 800,
                      opacity: 0,
                      scale: 0.3,
                      rotate: 360
                    }}
                    transition={{ duration: 2.5 + Math.random(), ease: "easeIn" }}
                    className="absolute text-2xl"
                    style={{ left: 0 }}
                  >
                    ✨
                  </motion.div>
                ))}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Hero Header - Full Width Gradient */}
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="w-full px-6 pt-12 pb-8"
                  style={{
                    background: 'linear-gradient(135deg, #003d80 0%, #007aff 50%, #5AC8FA 100%)'
                  }}
                >
                  {/* Success Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
                    className="flex justify-center mb-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  </motion.div>

                  <h1 className="text-2xl font-bold text-white text-center mb-2">
                    Redemption Successful
                  </h1>
                  <p className="text-white/70 text-center text-sm">
                    Show this screen to the merchant
                  </p>
                </motion.div>

                {/* Main Content Area */}
                <div className="px-4 -mt-4">
                  {/* The Ticket/Receipt Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  >
                    {/* Merchant Section */}
                    <div className="px-6 py-5 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        {merchantLogoUrl ? (
                          <img 
                            src={merchantLogoUrl} 
                            alt={merchantName}
                            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl font-bold text-gray-400">
                              {merchantName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-0.5">
                            Merchant
                          </p>
                          <p className="text-lg font-semibold text-gray-900 truncate">
                            {merchantName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reward Section */}
                    <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                        Reward Redeemed
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {rewardName}
                      </p>
                    </div>

                    {/* Perforated Divider */}
                    <div className="relative h-6 flex items-center">
                      <div className="absolute left-0 w-3 h-6 bg-[#FAFAFA] rounded-r-full"></div>
                      <div className="flex-1 border-t-2 border-dashed border-gray-200 mx-4"></div>
                      <div className="absolute right-0 w-3 h-6 bg-[#FAFAFA] rounded-l-full"></div>
                    </div>

                    {/* Time Section - The Hero */}
                    <div className="px-6 py-6 text-center">
                      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
                        Verified At
                      </p>
                      <motion.p 
                        className="text-5xl font-bold text-[#007AFF] tabular-nums tracking-tight"
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
                      >
                        {formatTimeWithSeconds(currentTime)}
                      </motion.p>
                      <p className="text-sm font-medium text-gray-500 mt-2">
                        {formatFullDate(currentTime)}
                      </p>
                    </div>

                    {/* Interactive Verification Strip */}
                    <button
                      onClick={handleCardFlip}
                      className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors border-t border-gray-100"
                    >
                      <AnimatePresence mode="wait">
                        {!isCardFlipped ? (
                          <motion.div
                            key="verify-prompt"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-2"
                          >
                            <div className="w-5 h-5 rounded-full bg-[#007AFF]/10 flex items-center justify-center">
                              <svg className="w-3 h-3 text-[#007AFF]" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <span className="text-sm font-medium text-gray-500">
                              Tap to verify authenticity
                            </span>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="verified"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="flex items-center justify-center gap-3"
                          >
                            <span className="text-4xl">😉</span>
                            <span className="text-lg font-bold text-[#007AFF] tracking-widest">
                              VERIFIED
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </button>
                  </motion.div>

                  {/* Security Note */}
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-center text-xs text-gray-400 mt-4 mb-6"
                  >
                    🔒 This redemption is verified and cannot be reused
                  </motion.p>
                </div>
              </div>

              {/* Fixed Bottom Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="px-4 pb-8 pt-4 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA] to-transparent"
              >
                <button
                  onClick={handleDone}
                  className="w-full py-4 text-white text-lg font-semibold rounded-xl active:scale-[0.98] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #003d80 0%, #007aff 100%)',
                    boxShadow: '0 4px 14px rgba(0, 122, 255, 0.35)'
                  }}
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<RedeemLoading />}>
      <RedeemContent />
    </Suspense>
  )
}

