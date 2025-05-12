"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, FileText, Tag, MessageSquare, Copy } from "lucide-react"
import { format, isValid } from "date-fns"
import { useState } from "react"
import { toast } from "@/components/ui/use-toast"

interface Note {
  id: string;
  title: string;
  summary: string;
  rawText: string;
  tags: string[];
  areaId: string;
  areaTitle: string;
  categoryId: string;
  categoryTitle: string;
  createdAt: Date;
  reminderTime: Date | null;
  reminderSent: boolean;
}

interface NoteDetailDialogProps {
  note: Note | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NoteDetailDialog({ note, open, onOpenChange }: NoteDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "raw">("summary");
  
  if (!note) return null;
  
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${type} has been copied to your clipboard.`,
      duration: 3000,
    });
  };

  // Safe date formatting function
  const safeFormatDate = (date: Date | null, formatString: string): string => {
    if (!date || !isValid(date)) {
      return "Invalid date";
    }
    try {
      return format(date, formatString);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <DialogTitle className="text-xl">{note.title}</DialogTitle>
            {note.reminderTime && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {safeFormatDate(note.reminderTime, "MMM d, h:mm a")}
              </Badge>
            )}
          </div>
          <DialogDescription className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {safeFormatDate(note.createdAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <FileText className="h-4 w-4" />
          <span>{note.areaTitle} / {note.categoryTitle}</span>
        </div>
        
        <div className="flex space-x-2 mb-4">
          <Button 
            variant={activeTab === "summary" ? "default" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </Button>
          <Button 
            variant={activeTab === "raw" ? "default" : "outline"} 
            size="sm"
            onClick={() => setActiveTab("raw")}
          >
            Raw Text
          </Button>
        </div>
        
        <div className="bg-muted/50 rounded-md p-4 relative mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => copyToClipboard(
              activeTab === "summary" ? note.summary : note.rawText, 
              activeTab === "summary" ? "Summary" : "Raw text"
            )}
          >
            <Copy className="h-3 w-3" />
          </Button>
          
          {activeTab === "summary" ? (
            <div className="prose prose-sm max-w-none">
              <p>{note.summary}</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{note.rawText}</p>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {note.tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send to Tap Agent
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 