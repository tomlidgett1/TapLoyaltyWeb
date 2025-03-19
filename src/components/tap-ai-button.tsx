"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"
import { TapAiDialog } from "@/components/tap-ai-dialog"

export function TapAiButton({ 
  initialPrompt = "",
  variant = "default",
  size = "default",
  className = "",
  width = "auto"
}: { 
  initialPrompt?: string
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  width?: string
}) {
  const [open, setOpen] = useState(false)

  // Use the width prop to set a style that will override Tailwind classes
  const buttonStyle = {
    width: width === "auto" ? "131px" : width,
    maxWidth: "100%"
  }

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        className={`inline-flex ${className}`}
        style={buttonStyle}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="mr-2 h-4 w-4" />
        <span><strong>Tap</strong>AI</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/30 bg-blue-600 px-1.5 font-mono text-[10px] font-medium text-white">
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