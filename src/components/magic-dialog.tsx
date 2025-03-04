"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sparkles, Send, Wand2, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

// Using the provided API key
const API_KEY = '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';

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
      
      // Direct API call without using the route handler
      const response = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create thread');
      }
      
      const data = await response.json();
      setThreadId(data.id);
      
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
          content: `Error: ${error.message || 'Failed to connect to the assistant. Please check your API key and try again.'}`,
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
      // Add message to thread
      const messageResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          role: 'user',
          content: input 
        }),
      });
      
      if (!messageResponse.ok) {
        const errorData = await messageResponse.json();
        throw new Error(errorData.error?.message || 'Failed to add message');
      }

      // Run the assistant
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({ 
          assistant_id: ASSISTANT_ID 
        }),
      });
      
      if (!runResponse.ok) {
        const errorData = await runResponse.json();
        throw new Error(errorData.error?.message || 'Failed to run assistant');
      }
      
      const runData = await runResponse.json();
      const runId = runData.id;

      // Poll for run completion
      await pollRunStatus(threadId, runId);

      // Get messages after run completes
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
      });
      
      if (!messagesResponse.ok) {
        const errorData = await messagesResponse.json();
        throw new Error(errorData.error?.message || 'Failed to get messages');
      }
      
      const messagesData = await messagesResponse.json();
      
      // Get the latest assistant message
      const latestAssistantMessage = messagesData.data
        .filter((msg: any) => msg.role === 'assistant')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      if (latestAssistantMessage) {
        const content = latestAssistantMessage.content[0].text.value;
        
        const assistantMessage: Message = {
          id: latestAssistantMessage.id,
          role: 'assistant',
          content: content,
          createdAt: new Date(latestAssistantMessage.created_at * 1000)
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

  const pollRunStatus = async (threadId: string, runId: string) => {
    const maxAttempts = 30;
    const delayMs = 1000;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to get run status');
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        return;
      } else if (data.status === 'failed' || data.status === 'cancelled' || data.status === 'expired') {
        throw new Error(`Run ended with status: ${data.status}`);
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    throw new Error('Run timed out');
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