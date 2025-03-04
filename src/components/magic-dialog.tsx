"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Wand2, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Assistant ID from your requirements
const ASSISTANT_ID = 'asst_Aymz6DWL61Twlz2XubPu49ur'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: Date
}

export function MagicDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [threadId, setThreadId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Create a new thread when the dialog opens
  useEffect(() => {
    if (open && !threadId) {
      createThread()
    }
  }, [open, threadId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current
      scrollContainer.scrollTop = scrollContainer.scrollHeight
    }
  }, [messages])

  const createThread = async () => {
    try {
      setIsLoading(true)
      
      // Call our Firebase function via the API route
      const response = await fetch('/api/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createThread',
          payload: {}
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to create thread');
      }
      
      const data = await response.json();
      setThreadId(data.threadId);
      
      // Add welcome message
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hello! I\'m your Magic Assistant. How can I help you today?',
          createdAt: new Date()
        }
      ]);
    } catch (error: any) {
      console.error('Error creating thread:', error);
      setMessages([
        {
          id: 'error',
          role: 'assistant',
          content: `Error: ${error.message || 'Failed to connect to the assistant. Please try again.'}`,
          createdAt: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !threadId || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call our Firebase function via the API route
      const response = await fetch('/api/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sendMessage',
          payload: {
            threadId,
            assistantId: ASSISTANT_ID,
            message: input
          }
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Failed to process message');
      }
      
      const data = await response.json();
      
      if (data.assistantResponse) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.assistantResponse,
          createdAt: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to process your request. Please try again.'}`,
        createdAt: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center">
            <Wand2 className="h-5 w-5 mr-2 text-blue-500" />
            <span>Magic Assistant</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !threadId}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim() || !threadId}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 