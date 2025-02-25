"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function SignupPage() {
  const router = useRouter()
  
  return (
    <div className="container mx-auto py-8 max-w-md">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Sign Up</h1>
        <p className="text-muted-foreground mb-6">
          Create an account to get started with Tap Loyalty.
        </p>
        {/* Basic signup form placeholder */}
        <div className="space-y-4">
          {/* Form fields would go here */}
          <Button 
            className="w-full" 
            onClick={() => router.push('/dashboard')}
          >
            Sign Up
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <a 
              className="text-primary hover:underline cursor-pointer"
              onClick={() => router.push('/login')}
            >
              Log in
            </a>
          </p>
        </div>
      </Card>
    </div>
  )
} 