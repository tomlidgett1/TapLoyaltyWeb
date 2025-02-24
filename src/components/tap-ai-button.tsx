"use client"

import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface TapAiButtonProps {
  onClick: () => void
}

export function TapAiButton({ onClick }: TapAiButtonProps) {
  return (
    <Button 
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-[#007AFF] hover:bg-[#0066CC] shadow-lg"
      size="lg"
    >
      <Sparkles className="h-5 w-5 mr-2" />
      TapAI
    </Button>
  )
} 