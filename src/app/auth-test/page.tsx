"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"

export default function AuthTestPage() {
  const { user, loading } = useAuth()

  useEffect(() => {
    console.log('Auth test page - Auth state:', { 
      user: user?.uid || 'none', 
      loading, 
      email: user?.email 
    })
  }, [user, loading])

  if (loading) {
    return (
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

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Not Authenticated</h1>
          <p className="text-gray-600 mb-4">You should be redirected to login automatically.</p>
          <p className="text-sm text-gray-500">If you're still seeing this page, there's an issue with the auth redirect.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Authenticated Successfully!</h1>
        <p className="text-gray-600 mb-2">User ID: {user.uid}</p>
        <p className="text-gray-600 mb-4">Email: {user.email}</p>
        <p className="text-sm text-green-600">✅ Authentication is working correctly</p>
      </div>
    </div>
  )
} 