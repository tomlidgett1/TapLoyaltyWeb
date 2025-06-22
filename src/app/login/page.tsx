"use client"

import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-gray-50">
        <div className="min-h-screen">
          {/* Login form */}
          <div className="relative flex flex-col min-h-screen">
            {/* Form section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
              <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                {/* Tap Loyalty Logo */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold mb-6">
                    <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                    <span className="font-semibold text-gray-900">Loyalty</span>
                  </h1>
                </div>

                {/* Welcome message */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                  <p className="text-gray-600">Sign in to your account to continue</p>
                </div>

                <LoginForm />
                
                {/* Trust indicators */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Your data is protected with enterprise-grade security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 