"use client"

import { useState, useEffect } from "react"
import { CreateSheet } from "@/components/create-sheet"
import { useRouter } from "next/navigation"
import { PageTransition } from "@/components/page-transition"

export default function CreatePage() {
  const router = useRouter()
  const [createSheetOpen, setCreateSheetOpen] = useState(true)

  // When the sheet is closed, redirect to dashboard
  useEffect(() => {
    if (!createSheetOpen) {
      router.push('/dashboard')
    }
  }, [createSheetOpen, router])
  
  return (
    <PageTransition>
      <div>
        <CreateSheet 
          open={createSheetOpen} 
          onOpenChange={setCreateSheetOpen}
        />
      </div>
    </PageTransition>
  )
} 