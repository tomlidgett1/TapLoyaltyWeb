"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { MagicButton } from "@/components/magic-button"

export default function MagicPage() {
  const router = useRouter()
  
  // Automatically open the Magic dialog when the page loads
  useEffect(() => {
    // This is a workaround - we're creating a button and clicking it
    const button = document.createElement('button')
    button.id = 'magic-auto-trigger'
    button.style.display = 'none'
    document.body.appendChild(button)
    
    const magicButton = document.getElementById('magic-auto-trigger')
    if (magicButton) {
      magicButton.click()
    }
    
    return () => {
      if (button && button.parentNode) {
        button.parentNode.removeChild(button)
      }
    }
  }, [])
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Magic Assistant</h1>
      <p className="mb-4">Access your AI assistant with magical capabilities.</p>
      
      <div className="flex justify-center mt-8">
        <MagicButton 
          id="magic-auto-trigger"
          variant="default" 
          size="lg"
          className="px-8"
        />
      </div>
    </div>
  )
} 