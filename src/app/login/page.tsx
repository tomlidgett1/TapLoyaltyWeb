"use client"

import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-white">
        <div className="grid min-h-screen lg:grid-cols-6">
          {/* Left side - Simplified hero section */}
          <div className="relative hidden lg:flex lg:col-span-2 bg-gray-100 flex-col justify-between px-16 py-16">
            {/* Main content */}
            <div className="flex flex-col justify-center flex-1">
              <div className="max-w-md">
                {/* Tap Loyalty title */}
                <h1 className="text-2xl font-bold mb-6">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
                
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Australia's first networked loyalty program
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Tap Loyalty delivers personalised rewards through networked programs powered by open banking integration and intelligent automation.
                </p>
              </div>
            </div>

            {/* Integration icons */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-500 mb-4 font-medium tracking-wide">
                INTEGRATES WITH
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {["xero.png", "square.png", "sheetspro.png", "outlook.png", "mailchimp.png", "hubspot.png", "gmailnew.png", "lslogo.png"].map((integration, index) => (
                  <div key={index} className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                    <Image src={`/${integration}`} alt={integration.split('.')[0]} width={24} height={24} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="relative flex flex-col lg:col-span-4">
            {/* Mobile header */}
            <div className="lg:hidden p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
              </div>
            </div>

            {/* Form section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
              <div className="w-full max-w-md">
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

            {/* Mobile hero content */}
            <div className="lg:hidden bg-gray-50 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Australia's first networked loyalty program
                </h3>
                <p className="text-gray-600 text-sm">
                  <span className="font-semibold text-[#007AFF]">Tap Loyalty</span> delivering personalised rewards through intelligent automation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 