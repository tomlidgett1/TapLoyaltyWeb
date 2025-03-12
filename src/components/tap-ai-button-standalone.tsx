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
        <span>
          <span className="font-bold">Tap</span>AI
        </span>
        <kbd className="ml-1 inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-blue-600 px-1.5 font-mono text-[10px] font-medium text-white">
          <span className="text-xs">⌘</span>I
        </kbd>
      </Button>
      <TapAiDialog 
        open={open} 
        onOpenChange={setOpen}
        initialPrompt={initialPrompt}
      />
    </>
  )
} 