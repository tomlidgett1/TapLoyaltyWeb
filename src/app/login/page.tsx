"use client"

import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck } from "lucide-react"

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
        <LoginForm />
      </div>
    </PageTransition>
  )
} 