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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { signIn } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetEmail, setResetEmail] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('Attempting to sign in...')
      await signIn(email, password)
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      })
    } catch (error) {
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

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setResetDialogOpen(true)
                    }}
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline text-[#007AFF]"
                  >
                    Forgot your password?
                  </button>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#007AFF] hover:bg-[#0066CC]"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Login"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link 
                href="/signup" 
                className="text-[#007AFF] hover:underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="resetEmail">Email</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="m@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setResetDialogOpen(false)}
                disabled={resetLoading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#007AFF] hover:bg-[#0066CC]"
                disabled={resetLoading}
              >
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 