"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { 
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth"
import { auth, functions, db } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"
import { httpsCallable } from "firebase/functions"
import { doc, getDoc, updateDoc, increment, setDoc } from "firebase/firestore"


interface AuthContextType {
  user: User | null
  loading: boolean
  shouldShowWelcome: boolean
  signIn: (email: string, password: string, redirectPath?: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  clearWelcomeFlag: () => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

// Define public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login', 
  '/signup', 
  '/bank-connect',
  '/customer-dashboard',
  '/_next', 
  '/api/auth',
  '/api/ai-status',
  '/api/basiqconnect',
  '/favicon.ico'
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authInitialized, setAuthInitialized] = useState(false)
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false)
  const [isActualLogin, setIsActualLogin] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email)
      
      if (user) {
        const token = await user.getIdToken()
        document.cookie = `session=${token}; path=/`
        setUser(user)
        

      } else {
        document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        setUser(null)
      }
      
      setLoading(false)
      setAuthInitialized(true)
    })

    return () => unsubscribe()
  }, [])

  // Handle redirects when auth state changes
  useEffect(() => {
    if (!authInitialized) return // Don't redirect until auth is initialized

    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname?.startsWith(route))
    const isPublicAsset = pathname?.includes('.') // Files with extensions

    // If we're on a public route/asset, don't redirect
    if (isPublicRoute || isPublicAsset) {
      return
    }

    // If no user and not on a public route, redirect to login
    if (!user && pathname !== '/login') {
      console.log('No authenticated user, redirecting to login')
      router.push('/login')
      return
    }

    // If user is authenticated and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      console.log('User authenticated, redirecting to dashboard')
      router.push('/dashboard')
      return
    }
  }, [user, authInitialized, pathname, router])

  useEffect(() => {
    console.log('Auth state changed:', { 
      user: auth.currentUser?.uid || 'none',
      isLoading: loading,
      authInitialized,
      pathname
    });
  }, [auth.currentUser, loading, authInitialized, pathname]);

  const signIn = async (email: string, password: string, redirectPath: string = '/dashboard') => {
    try {
      setIsActualLogin(true) // Flag this as an actual login event
      await setPersistence(auth, browserLocalPersistence)
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('Sign in successful:', result.user.email)
      
      // Wait for token to be set
      const token = await result.user.getIdToken()
      document.cookie = `session=${token}; path=/`
      
      // Update login count in merchant document
      let finalRedirectPath = redirectPath
      try {
        const merchantDocRef = doc(db, 'merchants', result.user.uid)
        const merchantDoc = await getDoc(merchantDocRef)
        
        if (merchantDoc.exists()) {
          const currentData = merchantDoc.data()
          const currentLoginCount = currentData?.loginCount || 0
          
          console.log('Current login count before increment:', currentLoginCount)
          
          // Increment existing login count
          await updateDoc(merchantDocRef, {
            loginCount: increment(1),
            lastLoginAt: new Date()
          })
          
          // Calculate new login count
          const newLoginCount = currentLoginCount + 1
          
          console.log('New login count after increment:', newLoginCount)
          
          // Set welcome flag for loginCount < 2 and only on actual login events
          if (newLoginCount < 2 && isActualLogin) {
            setShouldShowWelcome(true)
            console.log('Setting welcome flag (loginCount < 2):', newLoginCount)
          }
          
          // If login count is less than 5, redirect to getstarted page
          if (newLoginCount < 5) {
            finalRedirectPath = '/getstarted'
            console.log('Redirecting to getstarted page - login count:', newLoginCount)
          }
        } else {
          // Create new merchant document with login count
          await setDoc(merchantDocRef, {
            loginCount: 1,
            lastLoginAt: new Date()
          }, { merge: true })
          
          // Set welcome flag for new user (only on actual login) - new users always get welcome
          if (isActualLogin) {
            setShouldShowWelcome(true)
            console.log('New merchant - setting welcome flag')
          }
          
          // First login, redirect to getstarted
          finalRedirectPath = '/getstarted'
          console.log('New merchant - redirecting to getstarted page')
        }
      } catch (error) {
        console.error('Error updating login count:', error)
        // Continue with normal flow if login count update fails
      }
      
      // Call the manualUpdateCustomerCohorts Firebase function
      try {
        console.log('Calling manualUpdateCustomerCohorts function')
        const updateCohorts = httpsCallable(functions, 'manualUpdateCustomerCohorts')
        await updateCohorts({
          "merchantId": String(result.user.uid)
        })
        console.log('Successfully called manualUpdateCustomerCohorts function')
      } catch (error) {
        console.error('Error calling manualUpdateCustomerCohorts function:', error)
        // Continue with login flow even if the function call fails
      }
      
      // Force a hard navigation to the final redirect path
      window.location.href = finalRedirectPath
      
      // Reset the actual login flag
      setIsActualLogin(false)
    } catch (error) {
      console.error("Error signing in:", error)
      // Reset flag on error too
      setIsActualLogin(false)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)
      const token = await result.user.getIdToken()
      document.cookie = `session=${token}; path=/`
      window.location.href = '/dashboard'
    } catch (error) {
      console.error("Error signing up:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      await signOut(auth)
      document.cookie = `session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      window.location.href = '/login'
    } catch (error) {
      console.error("Error signing out:", error)
      throw error
    }
  }

  const clearWelcomeFlag = () => {
    setShouldShowWelcome(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, shouldShowWelcome, signIn, signUp, logout, clearWelcomeFlag }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 