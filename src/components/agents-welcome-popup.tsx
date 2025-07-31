"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Clock, TrendingUp, Bot, Zap } from "lucide-react"

interface AgentsWelcomePopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentsWelcomePopup({ open, onOpenChange }: AgentsWelcomePopupProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 rounded-2xl overflow-hidden border-0 shadow-lg animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out">
        <div className="relative bg-white">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors z-10"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
          
          {/* Header */}
          <div className="p-6 pb-4">
            <div className="text-center">
              <div className="w-14 h-14 mx-auto mb-4 bg-gray-50 rounded-full flex items-center justify-center">
                <Bot className="w-7 h-7 text-gray-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Meet <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-bold">Tap Agents</span>
              </h2>
              
              <p className="text-sm text-gray-600 leading-relaxed">
                Your AI-powered assistants that work 24/7 to boost productivity and save you hours every day
              </p>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Save Hours Daily</h3>
                  <p className="text-xs text-gray-600">Automate customer service, email responses, and routine tasks that typically take hours of manual work.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Boost Productivity</h3>
                  <p className="text-xs text-gray-600">Handle multiple customer enquiries simultaneously while you focus on growing your business.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Always Available</h3>
                  <p className="text-xs text-gray-600">Your agents work around the clock, ensuring customers get instant responses even when you're offline.</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <p className="text-xs text-center text-gray-700 font-medium">
                Save hours per day and enjoy faster customer response times with automated assistance
              </p>
            </div>
            
            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full mt-6 bg-[#007AFF] hover:bg-[#339fff] text-white rounded-md"
            >
              Explore Agents
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 