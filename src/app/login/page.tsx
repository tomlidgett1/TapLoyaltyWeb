"use client"

import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck } from "lucide-react"
import { Suspense } from "react"

function LoginFormFallback() {
  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm mx-auto">
        <div className="animate-pulse">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 bg-gray-200 rounded-sm mx-auto"></div>
                <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-12"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <PageTransition>
      <Suspense fallback={<LoginFormFallback />}>
        <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
          <LoginForm />
        </div>
      </Suspense>
    </PageTransition>
  )
} 