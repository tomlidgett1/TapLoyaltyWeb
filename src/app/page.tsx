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
      console.log('OAuth parameters:', { 
        codePrefix: code.substring(0, 20) + '...', 
        state,
        userUid: user.uid 
      })
      
      // Function to handle Lightspeed OAuth callback
      const handleLightspeedCallback = async () => {
        try {
          console.log('Lightspeed OAuth callback detected, processing...')
          
          const merchantId = localStorage.getItem('lightspeed_new_merchant_id')
          const codeVerifier = localStorage.getItem('lightspeed_new_code_verifier')
          
          console.log('Retrieved from localStorage:', { 
            merchantId, 
            hasCodeVerifier: !!codeVerifier,
            codeVerifierLength: codeVerifier ? codeVerifier.length : 0,
            storedState: localStorage.getItem('lightspeed_new_state')
          })
          
          if (!merchantId || !codeVerifier) {
            throw new Error(`Missing required data: merchantId=${!!merchantId}, codeVerifier=${!!codeVerifier}`)
          }
          
          // Show a toast to indicate we're processing
          toast({
            title: "Processing",
            description: "Connecting your Lightspeed account...",
          })
          
          console.log('Sending token exchange request...')
          console.log('Request payload:', {
            code: code?.substring(0, 20) + '...',
            merchantId,
            state,
            codeVerifierLength: codeVerifier.length
          })
          
          // Process the Lightspeed callback with await to ensure it completes
          try {
            const response = await fetch('/api/lightspeed/new', {
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
            
            console.log('Token exchange response status:', response.status)
            console.log('Token exchange response headers:', Object.fromEntries([...response.headers.entries()]))
            
            const text = await response.text()
            console.log('Raw response text:', text)
            
            let data
            try {
              data = JSON.parse(text)
              console.log('Token exchange response data:', data)
            } catch (parseError) {
              console.error('Error parsing JSON response:', parseError)
              console.log('Response was not JSON, using text response instead')
              data = { success: false, error: 'Invalid JSON response', rawText: text }
            }
            
            if (data.success) {
              console.log('Lightspeed connection successful!')
              toast({
                title: "Success!",
                description: "Your Lightspeed account has been connected."
              })
              
              // Clear localStorage items
              localStorage.removeItem('lightspeed_new_state')
              localStorage.removeItem('lightspeed_new_merchant_id')
              localStorage.removeItem('lightspeed_new_code_verifier')
              
              // Redirect to integrations page after a longer delay to ensure data is saved
              console.log('Redirecting to integrations page...')
              setTimeout(() => {
                router.push('/integrations')
              }, 3000)
            } else {
              console.error('Lightspeed connection failed:', data.error, data.details)
              throw new Error(data.error || 'Failed to connect Lightspeed account')
            }
          } catch (fetchError) {
            console.error('Fetch operation failed:', fetchError)
            throw fetchError
          }
        } catch (error) {
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
          }, 3000)
        }
      }
      
      // Check if it's a Lightspeed callback by looking at the stored state
      if (state === localStorage.getItem('lightspeed_new_state')) {
        console.log('===== LIGHTSPEED CALLBACK STATE MATCH =====');
        console.log('URL state:', state);
        console.log('localStorage state:', localStorage.getItem('lightspeed_new_state'));
        
        // Checking everything in localStorage
        console.log('All localStorage items:', Object.keys(localStorage).reduce<Record<string, string | null>>((obj, key) => {
          obj[key] = localStorage.getItem(key);
          return obj;
        }, {}));
        
        handleLightspeedCallback();
        return; // Prevent immediate redirect
      } else if (state && localStorage.getItem('lightspeed_new_state')) {
        console.log('===== LIGHTSPEED CALLBACK STATE MISMATCH =====');
        console.log('URL state:', state);
        console.log('localStorage state:', localStorage.getItem('lightspeed_new_state'));
      }
      
      // Function to handle Square OAuth callback
      const handleSquareCallback = async () => {
        try {
          console.log('Square OAuth callback detected, processing...')
          
          const merchantId = localStorage.getItem('merchant_id')
          
          console.log('Retrieved from localStorage:', { 
            merchantId,
            storedState: localStorage.getItem('square_state')
          })
          
          if (!merchantId) {
            throw new Error('Missing merchantId in localStorage')
          }
          
          // Show a toast to indicate we're processing
          toast({
            title: "Processing",
            description: "Connecting your Square account...",
          })
          
          console.log('Sending token exchange request...')
          // Process the Square callback with await to ensure it completes
          const response = await fetch('/api/oauth/square', {
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
          
          console.log('Token exchange response status:', response.status)
          const data = await response.json()
          console.log('Token exchange response data:', data)
          
          if (data.success) {
            console.log('Square connection successful!')
            toast({
              title: "Success!",
              description: "Your Square account has been connected."
            })
            
            // Clear localStorage items
            localStorage.removeItem('square_state')
            localStorage.removeItem('merchant_id')
            
            // Redirect to integrations page after a longer delay to ensure data is saved
            console.log('Redirecting to integrations page...')
            setTimeout(() => {
              router.push('/integrations')
            }, 3000)
          } else {
            console.error('Square connection failed:', data.error, data.details)
            throw new Error(data.error || 'Failed to connect Square account')
          }
        } catch (error) {
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
          }, 3000)
        }
      }
      
      // Check if it's a Square callback
      if (state === localStorage.getItem('square_state')) {
        handleSquareCallback()
        return // Prevent immediate redirect
      }
      
      console.log('OAuth callback detected but no matching state found in localStorage', {
        availableLocalStorageKeys: Object.keys(localStorage),
        squareStateExists: !!localStorage.getItem('square_state'),
        lightspeedNewStateExists: !!localStorage.getItem('lightspeed_new_state'),
        lightspeedNewState: localStorage.getItem('lightspeed_new_state')
      })
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
