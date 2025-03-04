"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Wand2 } from "lucide-react"
import { MagicDialog } from "@/components/magic-dialog"

export function MagicButton({ 
  variant = "default",
  size = "default",
  className = "",
  id = ""
}: { 
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  id?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button 
        id={id}
        variant={variant} 
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Wand2 className="mr-2 h-4 w-4" />
        Magic
      </Button>
      <MagicDialog open={open} onOpenChange={setOpen} />
    </>
  )
} 