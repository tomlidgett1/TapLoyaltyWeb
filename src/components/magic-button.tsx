"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"

export function MagicButton({ 
  variant = "default",
  size = "default",
  className = ""
}: { 
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <Button 
      variant={variant} 
      size={size}
      className={className}
      onClick={() => console.log("Magic button clicked!")}
    >
      <Wand2 className="mr-2 h-4 w-4" />
      Magic
    </Button>
  )
} 