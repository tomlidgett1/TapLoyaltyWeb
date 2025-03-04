"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bot, User, X, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { 
  addMessage, 
  createThread, 
  getMessages, 
  checkRunStatus,
  callOpenAI 
} from "@/lib/assistant"
import { useLocalStorage } from "@/hooks/use-local-storage"
import { cn } from "@/lib/utils"
import { useOpenAI } from "@/components/providers/openai-provider"

export function TapAi() {
  const { user } = useAuth()
  const { isOpen, setIsOpen, aiAvailable } = useOpenAI()
  const [threadId, setThreadId] = useLocalStorage<string>("ai-thread-id", "")
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Add this console log to see the current state
  console.log('TapAI component state:', { 
    user: !!user, 
    isOpen, 
    aiAvailable 
  });

  // Scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Initialize thread and load messages
  useEffect(() => {
    if (!user || !aiAvailable) return

    const initializeThread = async () => {
      try {
        // If no thread ID, create a new thread
        if (!threadId) {
          const newThread = await createThread()
          setThreadId(newThread.id)
          return
        }

        // Load existing messages
        const existingMessages = await getMessages(threadId)
        setMessages(existingMessages.reverse())
      } catch (error) {
        console.error("Error initializing thread:", error)
        // If there's an error with the existing thread, create a new one
        try {
          const newThread = await createThread()
          setThreadId(newThread.id)
        } catch (createError) {
          console.error("Error creating new thread:", createError)
          setError("Failed to initialize AI assistant. Please try again later.")
        }
      }
    }

    initializeThread()
  }, [user, threadId, aiAvailable, setThreadId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !threadId || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setIsLoading(true)
    setError(null)

    // Add user message to UI immediately
    setMessages(prev => [
      { 
        role: "user", 
        content: [{ type: 'text', text: { value: userMessage } }] 
      },
      ...prev
    ])

    try {
      // Add message to thread and run assistant
      const { run } = await addMessage(threadId, userMessage)
      
      // Poll for completion
      let runStatus = await checkRunStatus(threadId, run.id)
      
      while (runStatus.status === "queued" || runStatus.status === "in_progress") {
        await new Promise(resolve => setTimeout(resolve, 1000))
        runStatus = await checkRunStatus(threadId, run.id)
      }
      
      if (runStatus.status === "completed") {
        // Get updated messages
        const updatedMessages = await getMessages(threadId)
        setMessages(updatedMessages.reverse())
      } else {
        setError(`Assistant response failed: ${runStatus.status}`)
        console.error("Run failed:", runStatus)
      }
    } catch (error) {
      console.error("Error sending message:", error)
      setError("Failed to send message. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const showAnyway = true; // Set to false to restore normal behavior
  if (!aiAvailable && !showAnyway) return null;

  return (
    <>
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 md:w-96 shadow-lg z-50 flex flex-col h-[500px] max-h-[80vh]">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-md flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              Tap Assistant
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <ScrollArea className="flex-1 p-4 pt-0">
            <div className="space-y-4 flex flex-col-reverse">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {message.content[0].text.value}
                </div>
              ))}
              {isLoading && (
                <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              )}
              {error && (
                <div className="flex w-max max-w-[80%] flex-col gap-2 rounded-lg px-3 py-2 text-sm bg-red-100 text-red-800">
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          <CardFooter className="p-4 pt-2">
            <form onSubmit={handleSubmit} className="flex w-full gap-2">
              <Input
                ref={inputRef}
                placeholder="Ask a question..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </CardFooter>
        </Card>
      )}
      {!isOpen && user && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 shadow-lg z-50 h-12 w-12 rounded-full p-0 bg-blue-600 hover:bg-blue-700"
          style={{ zIndex: 9999 }}
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}
    </>
  )
} 