"use client"
import { useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface WelcomePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WelcomePopup({ open, onOpenChange }: WelcomePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-2xl overflow-hidden border-0 shadow-lg animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out">
        <div className="relative bg-white p-6">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
          
          {/* Content */}
          <div className="text-center pt-2">
            <div className="mx-auto mb-4">
              <img src="/taplogo.png" alt="Tap" className="h-8 mx-auto object-contain rounded-md" />
            </div>
            
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to <span className="font-bold text-[#007AFF]">Tap</span>
            </h2>
            
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Let's get started. It will take no longer than 10 minutes to set up your loyalty program.
            </p>
            
            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full bg-[#007AFF] hover:bg-[#339fff] text-white rounded-md"
            >
              Let's Begin
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 