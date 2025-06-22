"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { useState } from "react"
import { FirebaseError } from 'firebase/app'
import { useToast } from "@/components/ui/use-toast"
import { sendPasswordResetEmail } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { LoadingPage } from "@/components/loading-page"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Mail } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { signIn } = useAuth()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const redirectPath = searchParams?.get('from') || '/dashboard'
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showLoadingPage, setShowLoadingPage] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting to sign in...')
      setShowLoadingPage(true) // Show loading page immediately after submit
      await signIn(email, password, redirectPath)
      
      // No need for toast as we're showing loading page and redirecting
    } catch (error) {
      setShowLoadingPage(false) // Hide loading page on error
      console.error('Sign in error:', error)
      
      if (error instanceof FirebaseError) {
        let message = "Failed to sign in"
        
        switch (error.code) {
          case 'auth/invalid-email':
            message = "Invalid email address"
            break
          case 'auth/user-disabled':
            message = "This account has been disabled"
            break
          case 'auth/user-not-found':
            message = "No account found with this email"
            break
          case 'auth/wrong-password':
            message = "Incorrect password"
            break
          case 'auth/too-many-requests':
            message = "Too many attempts. Please try again later"
            break
        }
        
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)

    try {
      await sendPasswordResetEmail(auth, resetEmail)
      
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for instructions to reset your password",
      })
      setResetDialogOpen(false)
    } catch (error) {
      console.error('Password reset error:', error)
      
      let message = "Failed to send password reset email"
      
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/invalid-email':
            message = "Invalid email address"
            break
          case 'auth/user-not-found':
            message = "No account found with this email"
            break
          case 'auth/too-many-requests':
            message = "Too many attempts. Please try again later"
            break
        }
      }
      
      toast({
        variant: "destructive",
        title: "Error",
        description: message,
      })
    } finally {
      setResetLoading(false)
    }
  }

    // Show full-screen loading page when logging in
  if (showLoadingPage) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-5">
          <img 
            src="/taplogo.png" 
            alt="Tap Loyalty" 
            className="w-16 h-16 rounded-md" 
          />
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#007AFF] border-t-transparent" />
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("w-full", className)} {...props}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email address
              </Label>
                <Input
                  id="email"
                  type="email"
              placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
              className="h-12 px-4 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
              </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setResetDialogOpen(true)
                    }}
                className="text-sm text-[#007AFF] hover:text-[#0066CC] hover:underline underline-offset-4 transition-colors"
                  >
                Forgot password?
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
              placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
              className="h-12 px-4 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
              </div>
        </div>
        
              <Button 
                type="submit" 
          className="w-full h-12 bg-[#007AFF] hover:bg-[#0066CC] text-white font-medium text-base rounded-md transition-colors"
                disabled={loading}
              >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
              </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">New to Tap Loyalty?</span>
          </div>
            </div>

        <div className="text-center">
              <Link 
                href="/signup" 
            className="text-[#007AFF] hover:text-[#0066CC] font-medium hover:underline underline-offset-4 transition-colors"
              >
            Create an account
              </Link>
            </div>
          </form>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-md flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div>
                <DialogTitle className="text-left">Reset your password</DialogTitle>
                <DialogDescription className="text-left">
                  We'll send you a link to reset your password
            </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail" className="text-sm font-medium text-gray-700">
                  Email address
                </Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  className="h-12 px-4 text-base rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-[#007AFF]"
                />
              </div>
            </div>
            <DialogFooter className="gap-3 sm:gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setResetDialogOpen(false)}
                disabled={resetLoading}
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#007AFF] hover:bg-[#0066CC] rounded-md"
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 