"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sparkles } from "lucide-react"

export function OnboardingCheck() {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user?.uid) return
      
      try {
        setLoading(true)
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
        
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          // If onboardingCompleted is not set or is false, show the modal
          if (!data.onboardingCompleted) {
            setShowModal(true)
          }
        } else {
          // If merchant doc doesn't exist, they definitely need onboarding
          setShowModal(true)
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkOnboardingStatus()
  }, [user?.uid])
  
  if (loading || !user) return null
  
  return (
    <AlertDialog open={showModal} onOpenChange={setShowModal}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#007AFF]" />
            Welcome to Tap Loyalty!
          </AlertDialogTitle>
          <AlertDialogDescription>
            It looks like you haven't completed the onboarding process yet. 
            Would you like to set up your loyalty program now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              setShowModal(false)
              router.push('/onboarding')
            }}
            className="bg-[#007AFF] hover:bg-[#0066CC]"
          >
            Start Onboarding
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 