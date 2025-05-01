"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'

export default function FinancialsRedirectPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // Wait until auth is loaded
    if (loading) return

    if (user?.uid) {
      // Redirect to the merchant-specific financials page
      router.push(`/merchant/financials`)
    } else {
      // If not logged in, redirect to login
      router.push('/login')
    }
  }, [user, loading, router])

  // Show a loading state while redirecting
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
        <p className="mt-4 text-sm text-gray-500">Redirecting to financials...</p>
      </div>
    </div>
  )
} 