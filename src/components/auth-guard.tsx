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
        <div className="w-80 max-w-full">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-[#007AFF] h-1.5 rounded-full transition-all duration-300 ease-out animate-pulse" 
              style={{ width: '75%' }}
            ></div>
          </div>
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