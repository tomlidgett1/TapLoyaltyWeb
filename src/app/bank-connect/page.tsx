"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Redirect /bank-connect to / (homepage)
export default function BankConnectRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-2 border-[#007AFF] border-t-transparent animate-spin mx-auto mb-4"></div>
        <p className="text-white/50">Redirecting...</p>
      </div>
    </div>
  )
}
