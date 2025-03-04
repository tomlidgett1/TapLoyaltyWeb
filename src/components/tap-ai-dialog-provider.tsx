"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import { TapAiDialog } from "@/components/tap-ai-dialog"

interface TapAiDialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
  openWithPrompt: (prompt: string) => void
}

const TapAiDialogContext = createContext<TapAiDialogContextType>({
  open: false,
  setOpen: () => {},
  openWithPrompt: () => {}
})

export function TapAiDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [initialPrompt, setInitialPrompt] = useState("")

  const openWithPrompt = (prompt: string) => {
    setInitialPrompt(prompt)
    setOpen(true)
  }

  return (
    <TapAiDialogContext.Provider value={{ open, setOpen, openWithPrompt }}>
      {children}
      <TapAiDialog 
        open={open} 
        onOpenChange={setOpen} 
        initialPrompt={initialPrompt} 
      />
    </TapAiDialogContext.Provider>
  )
}

export const useTapAiDialog = () => useContext(TapAiDialogContext) 