"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { CreateRewardSheet } from "@/components/create-reward-sheet"

export default function UseCreateRewardSheetExample() {
  const [open, setOpen] = useState(false)
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create Reward Sheet Example</h1>
      <p className="mb-4">
        This example demonstrates the new CreateRewardSheet component that provides
        the same functionality as the CreateRewardDialog but in a side sheet format.
      </p>
      
      <Button 
        onClick={() => setOpen(true)}
        className="bg-blue-600 hover:bg-blue-700"
      >
        Open Create Reward Sheet
      </Button>
      
      <CreateRewardSheet
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  )
} 