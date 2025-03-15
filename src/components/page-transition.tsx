"use client"

import { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  return (
    <div className="animate-fadeIn">
      {children}
    </div>
  )
} 