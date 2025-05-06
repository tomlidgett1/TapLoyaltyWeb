"use client"

import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"

// Add this function to safely handle Firestore timestamps or ISO strings
const safelyGetDate = (dateField: any): Date => {
  if (!dateField) return new Date();
  
  try {
    // If it's a Firestore timestamp with toDate method
    if (typeof dateField.toDate === 'function') {
      return dateField.toDate();
    }
    // If it's an ISO string
    else if (typeof dateField === 'string') {
      return new Date(dateField);
    }
    // If it's already a Date
    else if (dateField instanceof Date) {
      return dateField;
    }
    // Fallback
    else {
      return new Date();
    }
  } catch (error) {
    console.error("Error parsing date:", error);
    return new Date();
  }
};

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  
  useEffect(() => {
    // Check if this is an OAuth callback
    const code = searchParams?.get('code')
    const state = searchParams?.get('state')
    
    if (code && state && user) {
      console.log('OAuth callback detected on root page:', { hasCode: true, hasState: true, hasUser: true })
      
      // Check if it's a Lightspeed callback by looking at the stored state
      if (state === localStorage.getItem('lightspeed_new_state')) {
        console.log('Lightspeed OAuth callback detected, processing...')
        
        const merchantId = localStorage.getItem('lightspeed_new_merchant_id')
        const codeVerifier = localStorage.getItem('lightspeed_new_code_verifier')
        
        if (merchantId && codeVerifier) {
          // Process the Lightspeed callback
          fetch('/api/lightspeed/new', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              merchantId,
              state,
              codeVerifier
            })
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              toast({
                title: "Success!",
                description: "Your Lightspeed account has been connected."
              })
              
              // Clear localStorage items
              localStorage.removeItem('lightspeed_new_state')
              localStorage.removeItem('lightspeed_new_merchant_id')
              localStorage.removeItem('lightspeed_new_code_verifier')
              
              // Redirect to integrations page
              setTimeout(() => {
                router.push('/integrations')
              }, 1500)
            } else {
              throw new Error(data.error || 'Failed to connect Lightspeed account')
            }
          })
          .catch(error => {
            console.error('Error processing Lightspeed callback:', error)
            toast({
              title: "Connection Failed",
              description: "We couldn't connect your Lightspeed account. Please try again."
            })
            
            // Clear localStorage items even on error
            localStorage.removeItem('lightspeed_new_state')
            localStorage.removeItem('lightspeed_new_merchant_id')
            localStorage.removeItem('lightspeed_new_code_verifier')
            
            // Redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          })
          
          return // Prevent immediate redirect
        }
      }
      
      // Check if it's a Square callback
      if (state === localStorage.getItem('square_state')) {
        console.log('Square OAuth callback detected, processing...')
        
        const merchantId = localStorage.getItem('merchant_id')
        
        if (merchantId) {
          // Process the Square callback
          fetch('/api/oauth/square', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              code,
              state,
              merchantId
            })
          })
          .then(response => response.json())
          .then(data => {
            if (data.success) {
              toast({
                title: "Success!",
                description: "Your Square account has been connected."
              })
              
              // Clear localStorage items
              localStorage.removeItem('square_state')
              localStorage.removeItem('merchant_id')
              
              // Redirect to integrations page
              setTimeout(() => {
                router.push('/integrations')
              }, 1500)
            } else {
              throw new Error(data.error || 'Failed to connect Square account')
            }
          })
          .catch(error => {
            console.error('Error processing Square callback:', error)
            toast({
              title: "Connection Failed",
              description: "We couldn't connect your Square account. Please try again."
            })
            
            // Clear localStorage items even on error
            localStorage.removeItem('square_state')
            localStorage.removeItem('merchant_id')
            
            // Redirect to dashboard
            setTimeout(() => {
              router.push('/dashboard')
            }, 1500)
          })
          
          return // Prevent immediate redirect
        }
      }
    }
    
    // If not an OAuth callback or already processed, redirect to dashboard
    router.push('/dashboard')
  }, [searchParams, router, user])
  
  // Show a loading state
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
        <p>Redirecting...</p>
      </div>
    </div>
  )
}
