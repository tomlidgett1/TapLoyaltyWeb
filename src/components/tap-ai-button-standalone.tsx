"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { TapAiDialog } from "@/components/tap-ai-dialog"

export function TapAiButtonStandalone({ 
  initialPrompt = "",
  variant = "default",
  size = "default",
  className = ""
}: { 
  initialPrompt?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        TapAI
      </Button>
      <TapAiDialog 
        open={open} 
        onOpenChange={setOpen}
        initialPrompt={initialPrompt}
      />
    </>
  )
} 