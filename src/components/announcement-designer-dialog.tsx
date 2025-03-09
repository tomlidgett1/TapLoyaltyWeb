"use client"

import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Image as ImageIcon, Check, X, Edit, Eye } from "lucide-react"

interface AnnouncementDesignerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (announcement: any) => void
  initialAnnouncement?: any
}

// Design styles
const DESIGN_STYLES = [
  { id: 0, name: "Bold Impact" },
  { id: 1, name: "Minimalist" },
  { id: 2, name: "Compact" }
]

export function AnnouncementDesignerDialog({ 
  open, 
  onOpenChange, 
  onSave,
  initialAnnouncement 
}: AnnouncementDesignerDialogProps) {
  // Initialize state with defaults or initialAnnouncement values
  const [title, setTitle] = useState(initialAnnouncement?.title || "Free Coffee Week! ☕️")
  const [subtitle, setSubtitle] = useState(initialAnnouncement?.subtitle || "Exclusive Member Reward")
  const [message1, setMessage1] = useState(initialAnnouncement?.messages?.[0] || "Get a free coffee every day this week when you visit us between 2-4pm.")
  const [message2, setMessage2] = useState(initialAnnouncement?.messages?.[1] || "Choose any size, any style - it's on us!")
  const [message3, setMessage3] = useState(initialAnnouncement?.messages?.[2] || "Limited to one free coffee per day, per member.")
  const [terms, setTerms] = useState(initialAnnouncement?.terms || "Valid Monday-Friday, 2-4pm only. Must present this offer at time of purchase. Cannot be combined with other offers.")
  const [selectedColor, setSelectedColor] = useState(initialAnnouncement?.color || "#007AFF")
  const [selectedImage, setSelectedImage] = useState<string | null>(initialAnnouncement?.image || null)
  const [showingPreview, setShowingPreview] = useState(false)
  const [selectedDesignIndex, setSelectedDesignIndex] = useState(() => {
    // If there's an initial announcement with a design index
    if (initialAnnouncement?.designIndex !== undefined) {
      // Check if the index is valid for our current design styles
      if (initialAnnouncement.designIndex < DESIGN_STYLES.length) {
        return initialAnnouncement.designIndex;
      }
      // If not valid, map old indices to new ones or default to 0
      if (initialAnnouncement.designIndex === 3) return 1; // Map Soft Rounded to Minimalist
      if (initialAnnouncement.designIndex === 4) return 2; // Map Compact to Compact
      return 0; // Default to Bold Impact
    }
    return 0; // Default to first design
  })
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // List of available colors
  const colors = [
    "#007AFF", // iOS blue
    "#34C759", // iOS green
    "#FF9500", // iOS orange
    "#FF2D55", // iOS pink
    "#AF52DE", // iOS purple
    "#5856D6", // iOS indigo
    "#FF3B30", // iOS red
    "#FFCC00"  // iOS yellow
  ]
  
  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }
  
  // Build announcement object
  const createAnnouncement = () => {
    if (!title.trim() || !message1.trim()) return null;
    
    const messages = [message1, message2, message3].filter(msg => msg.trim() !== "");
    
    // Ensure the design index is valid
    const safeDesignIndex = selectedDesignIndex < DESIGN_STYLES.length ? selectedDesignIndex : 0;
    
    return {
      title,
      subtitle,
      messages,
      terms,
      color: selectedColor,
      image: selectedImage,
      designIndex: safeDesignIndex,
      designName: DESIGN_STYLES[safeDesignIndex].name,
      createdAt: new Date().toISOString()
    };
  }
  
  const handleSave = () => {
    const announcement = createAnnouncement()
    if (announcement) {
      onSave(announcement)
      onOpenChange(false)
    }
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <span className="text-[#007AFF]">Design</span> Announcement
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              <span>Edit Content</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span>Preview Designs</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="space-y-6">
            {/* Header Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Header</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter announcement title"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Enter announcement subtitle"
                />
              </div>
            </div>
            
            {/* Messages Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Messages</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="message1">Message 1</Label>
                <Textarea
                  id="message1"
                  value={message1}
                  onChange={(e) => setMessage1(e.target.value)}
                  placeholder="Enter main message"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="message2">Message 2 (Optional)</Label>
                <Textarea
                  id="message2"
                  value={message2}
                  onChange={(e) => setMessage2(e.target.value)}
                  placeholder="Enter additional message"
                  rows={3}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="message3">Message 3 (Optional)</Label>
                <Textarea
                  id="message3"
                  value={message3}
                  onChange={(e) => setMessage3(e.target.value)}
                  placeholder="Enter additional message"
                  rows={3}
                />
              </div>
            </div>
            
            {/* Footer Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Footer</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Enter terms and conditions"
                  rows={3}
                />
              </div>
            </div>
            
            {/* Image Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Image</h3>
              
              <div className="grid gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>{selectedImage ? "Change Image" : "Add Image"}</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  accept="image/*"
                  className="hidden"
                />
                
                {selectedImage && (
                  <div className="relative mt-2">
                    <img 
                      src={selectedImage} 
                      alt="Selected" 
                      className="w-full max-h-48 object-cover rounded-md" 
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full"
                      onClick={() => setSelectedImage(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Color Picker Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Theme Color</h3>
              
              <div className="flex flex-wrap gap-3">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-10 w-10 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
            
            {/* Design Style Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Design Style</h3>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <span>Selected Style: {DESIGN_STYLES[selectedDesignIndex].name}</span>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("preview")}
                  >
                    Change Style
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Select a Design Style</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bold Impact Design */}
                <div 
                  className={`cursor-pointer transition-all rounded-xl overflow-hidden border-2 ${
                    selectedDesignIndex === 0 ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => setSelectedDesignIndex(0)}
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden h-[400px]">
                    <div className="bold-design p-5">
                      <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: selectedColor + '20' }}>
                        <h2 className="text-xl font-bold" style={{ color: selectedColor }}>{title}</h2>
                        <h3 className="text-sm font-medium">{subtitle}</h3>
                      </div>
                      
                      {selectedImage && (
                        <img 
                          src={selectedImage} 
                          alt="" 
                          className="w-full h-24 object-cover rounded-lg mb-4" 
                        />
                      )}
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex items-start">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 flex-shrink-0 text-white" style={{ backgroundColor: selectedColor }}>
                            <Check className="h-3 w-3" />
                          </span>
                          <p className="text-sm">{message1}</p>
                        </div>
                        {message2 && (
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 flex-shrink-0 text-white" style={{ backgroundColor: selectedColor }}>
                              <Check className="h-3 w-3" />
                            </span>
                            <p className="text-sm">{message2}</p>
                          </div>
                        )}
                        {message3 && (
                          <div className="flex items-start">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full mr-2 flex-shrink-0 text-white" style={{ backgroundColor: selectedColor }}>
                              <Check className="h-3 w-3" />
                            </span>
                            <p className="text-sm">{message3}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-500 border-t pt-2">
                        {terms}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <p className="font-medium">{DESIGN_STYLES[0].name}</p>
                    {selectedDesignIndex === 0 && (
                      <span className="text-xs text-primary">Selected</span>
                    )}
                  </div>
                </div>
                
                {/* Minimalist Design */}
                <div 
                  className={`cursor-pointer transition-all rounded-xl overflow-hidden border-2 ${
                    selectedDesignIndex === 1 ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => setSelectedDesignIndex(1)}
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden h-[400px]">
                    <div className="minimalist-design p-5">
                      <h2 className="text-2xl font-light mb-1" style={{ color: selectedColor }}>{title}</h2>
                      <h3 className="text-sm font-medium text-gray-400 mb-6">{subtitle}</h3>
                      
                      {selectedImage && (
                        <img 
                          src={selectedImage} 
                          alt="" 
                          className="w-full h-24 object-cover mb-6" 
                        />
                      )}
                      
                      <div className="space-y-4 mb-6">
                        <p className="text-sm">{message1}</p>
                        {message2 && <p className="text-sm">{message2}</p>}
                        {message3 && <p className="text-sm">{message3}</p>}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {terms}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <p className="font-medium">{DESIGN_STYLES[1].name}</p>
                    {selectedDesignIndex === 1 && (
                      <span className="text-xs text-primary">Selected</span>
                    )}
                  </div>
                </div>
                
                {/* Compact Design */}
                <div 
                  className={`cursor-pointer transition-all rounded-xl overflow-hidden border-2 ${
                    selectedDesignIndex === 2 ? 'border-primary ring-2 ring-primary' : 'border-transparent hover:border-gray-200'
                  }`}
                  onClick={() => setSelectedDesignIndex(2)}
                >
                  <div className="bg-white rounded-xl shadow-md overflow-hidden h-[400px]">
                    <div className="compact-design p-5">
                      <div className="flex mb-4">
                        {selectedImage && (
                          <div className="w-1/3 mr-3">
                            <img 
                              src={selectedImage} 
                              alt="" 
                              className="w-full h-24 object-cover rounded-lg" 
                            />
                          </div>
                        )}
                        
                        <div className={selectedImage ? "w-2/3" : "w-full"}>
                          <h2 className="text-lg font-bold" style={{ color: selectedColor }}>{title}</h2>
                          <h3 className="text-xs font-medium text-gray-500 mb-1">{subtitle}</h3>
                          <p className="text-xs">{message1}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-3">
                        {message2 && <p className="text-xs">{message2}</p>}
                        {message3 && <p className="text-xs">{message3}</p>}
                      </div>
                      
                      <div className="text-[10px] text-gray-500 border-t pt-2">
                        {terms}
                      </div>
                    </div>
                  </div>
                  <div className="text-center py-2">
                    <p className="font-medium">{DESIGN_STYLES[2].name}</p>
                    {selectedDesignIndex === 2 && (
                      <span className="text-xs text-primary">Selected</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-6">
                <Button 
                  onClick={() => setActiveTab("edit")}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Continue with Selected Design</span>
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!title || !message1}
          >
            Save Announcement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 