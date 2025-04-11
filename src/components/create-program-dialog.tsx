"use client"

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface CreateProgramDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: (programData: any) => void
}

export function CreateProgramDialog({ 
  open, 
  onOpenChange, 
  onSave 
}: CreateProgramDialogProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState("Loyalty Program")
  const [description, setDescription] = useState("Earn rewards for your loyalty")
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    setLoading(true)
    
    try {
      // This is a placeholder - in a real implementation, we would save the program data
      if (onSave) {
        onSave({
          title,
          description,
          createdAt: new Date().toISOString()
        })
      }
      
      toast({
        title: "Program created",
        description: "Your loyalty program has been created successfully.",
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast({
        title: "Error",
        description: "There was an error creating your program.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <span className="text-[#007AFF]">Create</span> Loyalty Program
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-1">Setup Your Loyalty Program</h3>
            <p className="text-xs text-blue-700">
              Define the basic details of your loyalty program. This information will be visible to your customers when they join.
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="title">Program Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a memorable name for your program"
            />
            <p className="text-xs text-gray-500">
              Choose a name that reflects your brand and the value of your program
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-red-500">*</span></Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Explain how customers benefit from your program"
              rows={4}
            />
            <p className="text-xs text-gray-500">
              A clear description helps customers understand how your loyalty program works
            </p>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 space-y-3">
            <p className="text-sm text-amber-800">
              <span className="font-medium">Note:</span> This is a placeholder component. The full program creation functionality will be implemented soon.
            </p>
            <p className="text-xs text-amber-700">
              In the future, you'll be able to customize:
            </p>
            <ul className="text-xs text-amber-700 list-disc pl-5 space-y-1">
              <li>Points earning rules</li>
              <li>Tier levels and requirements</li>
              <li>Special promotions and bonuses</li>
              <li>Redemption options</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !title || !description}
            className="bg-[#007AFF] hover:bg-[#0071E3] text-white"
          >
            {loading ? "Creating..." : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 