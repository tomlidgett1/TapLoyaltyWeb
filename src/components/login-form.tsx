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
  const [progress, setProgress] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting to sign in...')
      setShowLoadingPage(true) // Show loading page immediately after submit
      setProgress(0) // Reset progress
      
      // Start progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval)
            return 85
          }
          return prev + Math.random() * 10 + 10 // Random increment between 10-20
        })
      }, 100)
      
      await signIn(email, password, redirectPath)
      
      // No need for toast as we're showing loading page and redirecting
    } catch (error) {
      setShowLoadingPage(false) // Hide loading page on error
      setProgress(0) // Reset progress
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
      <div className="fixed inset-0 bg-[#F5F5F5] flex flex-col items-center justify-center z-50">
        <div className="flex flex-col items-center gap-6 p-8">
          {/* Tap Loyalty Text */}
          <div className="text-center">
            <h1 className="text-4xl mb-2">
              <span className="font-extrabold text-[#007AFF]">Tap</span>
              <span className="font-normal text-black"> Loyalty</span>
            </h1>
          </div>

          {/* Progress Bar Container */}
          <div className="w-64 max-w-full">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-[#007AFF] h-1 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${Math.min(progress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <Card className={cn("w-full max-w-sm mx-auto border border-gray-200 shadow-sm rounded-2xl bg-white", className)} {...props}>
        <CardHeader className="space-y-1 pb-6 pt-8">
          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img 
                src="/taplogo.png" 
                alt="Tap Loyalty" 
                className="w-8 h-8 rounded-sm"
              />
            </div>
            {/* Header Text */}
            <h1 className="text-xl font-semibold text-gray-900">
              Sign in to Tap Loyalty
            </h1>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
              </div>
            
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="h-10 px-3 text-sm rounded-md border-gray-300 focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF] transition-colors"
                />
              </div>
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-10 bg-[#007AFF] hover:bg-[#0066CC] text-white font-medium text-sm rounded-md transition-colors"
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email)
                  setResetDialogOpen(true)
                }}
                className="text-sm text-[#007AFF] hover:text-[#0066CC] font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-500">Don't have an account?</span>
              </div>
            </div>

            <div className="text-center">
              <Link 
                href="/signup" 
                className="text-[#007AFF] hover:text-[#0066CC] font-medium text-sm transition-colors"
              >
                Create account
              </Link>
            </div>
          </form>
        </CardContent>
        
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
      </Card>
    </>
  )
} 