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
          <div className="space-y-2">
            <Label htmlFor="title">Program Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter program title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter program description"
              rows={4}
            />
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
            <p>This is a placeholder component. The full program creation functionality will be implemented soon.</p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Creating..." : "Create Program"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 