"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface AnimatedTextProps {
  texts: string[]
  className?: string
  typingSpeed?: number
  deletingSpeed?: number
  pauseDuration?: number
  finalText?: string
}

export function AnimatedText({
  texts,
  className,
  typingSpeed = 100,
  deletingSpeed = 50,
  pauseDuration = 2000,
  finalText
}: AnimatedTextProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0)
  const [currentText, setCurrentText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasCompletedCycle, setHasCompletedCycle] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  // Use finalText or default to the first text
  const finalMessage = finalText || texts[0]

  useEffect(() => {
    // If we've completed the cycle, show final text and hide cursor after a delay
    if (hasCompletedCycle) {
      setCurrentText(finalMessage)
      const cursorTimeout = setTimeout(() => {
        setShowCursor(false)
      }, 2000)
      return () => clearTimeout(cursorTimeout)
    }

    const targetText = texts[currentTextIndex]
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        // Typing
        if (currentText.length < targetText.length) {
          setCurrentText(targetText.slice(0, currentText.length + 1))
        } else {
          // Finished typing, wait then start deleting
          setTimeout(() => setIsDeleting(true), pauseDuration)
          return
        }
      } else {
        // Deleting
        if (currentText.length > 0) {
          setCurrentText(currentText.slice(0, -1))
        } else {
          // Finished deleting, move to next text
          setIsDeleting(false)
          const nextIndex = (currentTextIndex + 1) % texts.length
          
          // Check if we've completed a full cycle
          if (nextIndex === 0 && currentTextIndex === texts.length - 1) {
            setHasCompletedCycle(true)
          } else {
            setCurrentTextIndex(nextIndex)
          }
        }
      }
    }, isDeleting ? deletingSpeed : typingSpeed)

    return () => clearTimeout(timeout)
  }, [currentText, currentTextIndex, isDeleting, texts, typingSpeed, deletingSpeed, pauseDuration, hasCompletedCycle, finalMessage])

  return (
    <span className={cn("relative", className)}>
      {currentText}
      {showCursor && <span className="animate-pulse">|</span>}
    </span>
  )
} 