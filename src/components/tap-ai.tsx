"use client"

import { Button } from "@/components/ui/button"
import { TapAiDialog } from "@/components/tap-ai-dialog"
import { useState, useEffect } from "react"
import { Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import { initializeOpenAI } from "@/lib/assistant"

export function TapAi() {
  const [open, setOpen] = useState(false)
  const [aiAvailable, setAiAvailable] = useState(false)
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // List of paths where TapAI should not appear
  const hiddenPaths = ['/login', '/signup']

  // Check if OpenAI is available
  useEffect(() => {
    if (user) {
      // For local development, always set aiAvailable to true
      if (process.env.NODE_ENV === 'development') {
        setAiAvailable(true);
        return;
      }
      
      initializeOpenAI()
        .then(() => setAiAvailable(true))
        .catch(error => {
          console.error("Failed to initialize OpenAI:", error);
          setAiAvailable(false);
        });
    }
  }, [user]);

  // Don't render if loading, not authenticated, on login/signup pages, or if OpenAI is not available
  if (loading || !user || hiddenPaths.includes(pathname) || !aiAvailable) return null

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button
        onClick={() => setOpen(true)}
        className="h-12 w-12 rounded-full shadow-xl bg-[#007AFF] hover:bg-[#0066CC] flex items-center justify-center"
      >
        <Sparkles className="h-5 w-5 text-white" />
      </Button>
      <TapAiDialog open={open} onOpenChange={setOpen} />
    </div>
  )
} 