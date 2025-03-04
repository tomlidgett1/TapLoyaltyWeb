"use client"

import { Button } from "@/components/ui/button"
import { Bot } from "lucide-react"
import { useTapAiDialog } from "@/components/tap-ai-dialog-provider"
import { useAuth } from "@/contexts/auth-context"
import { useOpenAI } from "@/components/providers/openai-provider"
import { useEffect, useState } from "react"

export function TapAiButton() {
  const { setOpen } = useTapAiDialog()
  const { user } = useAuth()
  const { aiAvailable, checkAvailability } = useOpenAI()
  const [isChecking, setIsChecking] = useState(false)

  console.log('TapAiButton state:', { 
    user: !!user, 
    aiAvailable,
    isChecking
  })

  // Check availability when the component mounts if user is logged in
  useEffect(() => {
    if (user && !aiAvailable && !isChecking) {
      setIsChecking(true)
      checkAvailability().finally(() => {
        setIsChecking(false)
      })
    }
  }, [user, aiAvailable, isChecking, checkAvailability])

  // Always show the button in development mode
  const showAnyway = process.env.NODE_ENV === 'development'
  
  if (!user || (!aiAvailable && !showAnyway)) return null

  return (
    <Button
      onClick={() => setOpen(true)}
      className="fixed bottom-20 right-4 shadow-lg z-50 h-12 w-12 rounded-full p-0 bg-blue-600 hover:bg-blue-700"
      style={{ zIndex: 9999 }}
    >
      <Bot className="h-6 w-6" />
      {isChecking && (
        <span className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-500 rounded-full animate-pulse" />
      )}
    </Button>
  )
} 