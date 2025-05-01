"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PageTransition } from "@/components/page-transition"

export default function RewardsLibraryPage() {
  const router = useRouter()

  return (
    <PageTransition>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center gap-4">
            <h1 className="text-2xl font-bold">Reward Templates</h1>
            <Button 
              onClick={() => router.push("/create")}
              className="h-9 gap-2 rounded-md"
            >
              <Plus className="h-4 w-4" />
              Create Reward
            </Button>
          </div>
          
          {/* Content placeholder */}
          <div className="p-8 text-center">
            <p>Library content will appear here</p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 