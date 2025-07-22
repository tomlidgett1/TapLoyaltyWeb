"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      console.log('AuthGuard: No authenticated user, redirecting to login')
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state while auth is being determined
  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
          <p className="mt-4 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  // If no user after loading, don't render children (will redirect)
  if (!user) {
    return null
  }

  // User is authenticated, render children
  return <>{children}</>
} 