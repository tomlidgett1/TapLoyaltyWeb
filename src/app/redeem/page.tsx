"use client"

import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Gift } from "lucide-react"

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
  
  const [pin, setPin] = useState(["", "", "", ""])
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  
  const CORRECT_PIN = "0000"

  const triggerSuccess = useCallback(() => {
    setSuccess(true)
    setShowConfetti(true)
    
    // Stop confetti after animation
    setTimeout(() => setShowConfetti(false), 4000)
  }, [])

  const handlePinChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    
    const newPin = [...pin]
    newPin[index] = value.slice(-1)
    setPin(newPin)
    setError(false)
    
    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
    
    // Check if complete
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join("")
      if (fullPin === CORRECT_PIN) {
        triggerSuccess()
      } else if (fullPin.length === 4) {
        setError(true)
        // Shake and clear after delay
        setTimeout(() => {
          setPin(["", "", "", ""])
          inputRefs.current[0]?.focus()
        }, 600)
      }
    }
  }, [pin, triggerSuccess])

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
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="fixed inset-0 pointer-events-none">
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
          <ArrowLeft className="w-5 h-5" />
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
                <Gift className="w-10 h-10 text-white" />
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
                      className={`w-16 h-20 text-center text-[32px] font-semibold rounded-2xl border-2 bg-white/[0.06] backdrop-blur-xl transition-all duration-200 outline-none ${
                        error 
                          ? "border-red-500 text-red-400" 
                          : digit 
                            ? "border-[#007AFF] text-white shadow-lg shadow-[#007AFF]/20" 
                            : "border-white/20 text-white"
                      } focus:border-[#007AFF] focus:shadow-lg focus:shadow-[#007AFF]/20`}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[15px] text-red-400"
                  >
                    Incorrect PIN. Please try again.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", bounce: 0.4 }}
              className="w-full max-w-sm text-center"
            >
              {/* Success Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-[#30D158] to-[#28A745] mx-auto mb-8 flex items-center justify-center shadow-2xl shadow-[#30D158]/40"
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>

              {/* Success Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h1 className="text-[32px] font-bold text-white mb-4">
                  Redeemed!
                </h1>
                
                <p className="text-[17px] text-white/60 mb-2">
                  {rewardName}
                </p>
                <p className="text-[15px] text-white/40 mb-10">
                  at {merchantName}
                </p>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-[15px] text-white/50"
                >
                  Show this screen to the merchant
                </motion.p>
              </motion.div>

              {/* Done Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => router.push('/customer-dashboard')}
                className="mt-10 px-8 py-4 bg-white text-black text-[17px] font-semibold rounded-xl hover:bg-white/90 transition-colors"
              >
                Done
              </motion.button>
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

