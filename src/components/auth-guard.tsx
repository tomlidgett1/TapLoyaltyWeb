"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!loading && !user) {
      console.log('AuthGuard: No authenticated user, redirecting to homepage')
      router.push('/')
    }
  }, [user, loading, router])

  // Smooth progress animation
  useEffect(() => {
    if (loading) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          return prev + Math.random() * 15
        })
      }, 100)

      return () => clearInterval(interval)
    } else {
      // Complete the progress when loading finishes
      setProgress(100)
    }
  }, [loading])

  // Show loading state while auth is being determined
  if (loading) {
    return fallback || (
      <div className="flex flex-col items-center justify-center h-screen bg-[#F5F5F5]">
        <div className="w-80 max-w-full">
          {/* Tap Loyalty Branding */}
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-extrabold text-[#007AFF]">
                Tap
              </span>
              <span className="text-3xl text-black">
                Loyalty
              </span>
            </div>
          </div>

          {/* Smooth Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#007AFF] h-1.5 rounded-full transition-all duration-300 ease-out" 
              style={{ 
                width: `${Math.min(progress, 100)}%`,
                transform: `translateX(${progress >= 100 ? '0' : '-2px'})` 
              }}
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