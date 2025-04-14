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
import { auth, functions } from "@/lib/firebase"
import { useRouter } from "next/navigation"
import { httpsCallable } from "firebase/functions"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    console.log('Auth state changed:', { 
      user: auth.currentUser?.uid || 'none',
      isLoading: loading
    });
  }, [auth.currentUser, loading]);

  const signIn = async (email: string, password: string) => {
    try {
      await setPersistence(auth, browserLocalPersistence)
      const result = await signInWithEmailAndPassword(auth, email, password)
      console.log('Sign in successful:', result.user.email)
      
      // Wait for token to be set
      const token = await result.user.getIdToken()
      document.cookie = `session=${token}; path=/`
      
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
      
      // Force a hard navigation
      window.location.href = '/dashboard'
    } catch (error) {
      console.error("Error signing in:", error)
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout }}>
      {!loading && children}
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