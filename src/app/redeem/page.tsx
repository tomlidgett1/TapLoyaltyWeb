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

  // Check authentication status and get customerId
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCustomerId(user?.uid || null)
    })
    return () => unsubscribe()
  }, [])

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
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm"
            >
              {/* White Card with special bottom corners */}
              <div 
                className="bg-white p-6 pt-8 pb-8 text-center shadow-xl"
                style={{
                  borderRadius: '24px 24px 50px 50px',
                  boxShadow: '0 -5px 40px rgba(0, 0, 0, 0.3)'
                }}
              >
                {/* Success Icon - Green checkmark in green circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
                  className="mb-5"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <svg className="w-10 h-10 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-[24px] font-bold text-gray-900 mb-3"
                >
                  Congratulations!
                </motion.h1>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-[15px] text-gray-500 mb-6 px-4"
                >
                  Your reward has been successfully claimed at {merchantName}
                </motion.p>

                {/* Visit Merchant Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => router.push('/customer-dashboard')}
                  className="w-full py-4 rounded-xl text-white font-semibold text-[16px] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(to right, #003d80, #007aff)'
                  }}
                >
                  Done
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </motion.button>
              </div>
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

