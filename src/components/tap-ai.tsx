"use client"

import { Button } from "@/components/ui/button"
import { TapAiDialog } from "@/components/tap-ai-dialog"
import { useState } from "react"
import { Sparkles } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"

export function TapAi() {
  const [open, setOpen] = useState(false)
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // List of paths where TapAI should not appear
  const hiddenPaths = ['/login', '/signup']

  // Don't render if loading, not authenticated, or on login/signup pages
  if (loading || !user || hiddenPaths.includes(pathname)) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        size="lg"
        className="bg-[#007AFF] hover:bg-[#0066CC] shadow-lg gap-2"
        onClick={() => setOpen(true)}
      >
        <Sparkles className="h-5 w-5" />
        TapAI
      </Button>
      <TapAiDialog open={open} onOpenChange={setOpen} />
    </div>
  )
} 