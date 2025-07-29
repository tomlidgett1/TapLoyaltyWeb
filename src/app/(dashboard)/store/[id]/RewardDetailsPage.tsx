"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { RewardDetailSheet } from "@/components/reward-detail-sheet"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export function RewardDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(true)

  // Handle sheet close
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      // Navigate back to rewards list when sheet is closed
      router.push('/store')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navigation */}
      <div className="border-b bg-white sticky top-0 z-10">
        <div className="px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between py-4">
            <Button 
              variant="ghost" 
              className="gap-2" 
              onClick={() => router.push('/store')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Rewards
            </Button>
          </div>
        </div>
      </div>

      <div className="py-8 space-y-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <p className="text-center text-gray-500">
          Loading reward details...
        </p>
      </div>

      {/* Render the sheet */}
      <RewardDetailSheet 
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
        rewardId={id}
      />
    </div>
  )
} 