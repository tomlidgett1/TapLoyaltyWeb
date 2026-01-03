"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Check, Loader2 } from "lucide-react"

function BankCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Completing bank connection...')

  useEffect(() => {
    // Get any status parameters from Basiq callback
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    const jobId = searchParams.get('jobId')
    
    console.log('Bank callback received:', { success, error, jobId })

    // Handle the callback
    const handleCallback = async () => {
      try {
        // If there's an explicit error, show it
        if (error) {
          setStatus('error')
          setMessage('Bank connection failed. Please try again.')
          setTimeout(() => router.push('/bank-connect'), 3000)
          return
        }

        // Success - either explicit success param or no error
        setStatus('success')
        setMessage('Bank connected successfully!')
        
        // Redirect to customer dashboard after a short delay
        setTimeout(() => {
          router.push('/customer-dashboard')
        }, 2000)
        
      } catch (err) {
        console.error('Error processing bank callback:', err)
        setStatus('error')
        setMessage('Something went wrong. Redirecting...')
        setTimeout(() => router.push('/bank-connect'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-gradient-to-b from-[#007AFF]/35 via-[#007AFF]/15 to-transparent blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center"
      >
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-[#007AFF] animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-white/50">Please wait...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#30D158] to-[#28A745] mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-[#30D158]/40"
            >
              <Check className="w-10 h-10 text-white" strokeWidth={3} />
            </motion.div>
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-white/50">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/20 mx-auto mb-6 flex items-center justify-center">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">{message}</h1>
            <p className="text-white/50">Redirecting...</p>
          </>
        )}
      </motion.div>
    </div>
  )
}

function BankCallbackLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-[#007AFF] animate-spin mx-auto mb-4" />
        <p className="text-white/50">Loading...</p>
      </div>
    </div>
  )
}

export default function BankCallbackPage() {
  return (
    <Suspense fallback={<BankCallbackLoading />}>
      <BankCallbackContent />
    </Suspense>
  )
}

