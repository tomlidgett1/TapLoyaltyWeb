"use client"

import React, { useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import AnimatedEmailResponse from "@/components/animated-email-response"
import { RewardCard } from "@/components/reward-card"
import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from "@/components/ui/kibo-ui/ai/input"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

interface AiChatPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Firebase HTTP function endpoint for SSE streaming
const STREAM_FUNCTION_URL =
  "https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/streamCreateRewardFromPrompt"

export function AiChatPopup({ open, onOpenChange }: AiChatPopupProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState("")
  const containerRef = useRef<HTMLDivElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Auto-scroll when messages update or streaming buffer grows
  useEffect(() => {
    if (!containerRef.current) return
    const el = containerRef.current
    el.scrollTop = el.scrollHeight
  }, [messages, streamBuffer, open])

  // Reset state on open/close
  useEffect(() => {
    if (!open) {
      // cancel any ongoing stream
      if (abortRef.current) {
        abortRef.current.abort()
      }
      setIsStreaming(false)
      setStreamBuffer("")
    }
  }, [open])

  const sendPrompt = async () => {
    const prompt = input.trim()
    if (!prompt || !user?.uid || isStreaming) return

    const merchantId = user.uid

    // Push user message
    const userMsg: ChatMessage = { role: "user", content: prompt }
    setMessages((prev) => [...prev, userMsg])
    setInput("")

    setIsStreaming(true)
    setStreamBuffer("")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch(STREAM_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ merchantId, prompt }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      // Parse SSE events (with explicit event: lines)
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error("No stream reader")

      let sseBuffer = ""

      const processBlock = (block: string) => {
        if (!block.trim()) return
        const lines = block.split("\n")
        let eventName = "message"
        const dataLines: string[] = []

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.slice(6).trim()
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trim())
          }
        }

        const dataStr = dataLines.join("\n")
        let data: any = null
        try {
          data = dataStr ? JSON.parse(dataStr) : null
        } catch {
          // ignore JSON parse errors for malformed pings
        }

        switch (eventName) {
          case "delta": {
            const delta = data?.content ?? ""
            if (delta) setStreamBuffer((prev) => prev + delta)
            break
          }
          case "reward": {
            // Insert a reward card as an assistant message wrapper
            const rewardPayload = data
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: JSON.stringify({ type: "REWARD_CARD", rewardData: rewardPayload, message: undefined }),
              },
            ])
            break
          }
          case "error": {
            const msg = data?.message || "Streaming error"
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: `<p><strong>Error:</strong> ${msg}</p>` },
            ])
            break
          }
          case "done": {
            const finalText = data?.text ?? streamBuffer
            if (finalText) {
              setMessages((prev) => [...prev, { role: "assistant", content: finalText }])
            }
            setStreamBuffer("")
            setIsStreaming(false)
            break
          }
          default:
            // ignore other events like ping
            break
        }
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        sseBuffer += chunk

        // Split SSE events by double newlines
        const blocks = sseBuffer.split("\n\n")
        sseBuffer = blocks.pop() || ""
        for (const block of blocks) processBlock(block)
      }

      // Flush any remaining buffered block
      if (sseBuffer) processBlock(sseBuffer)
    } catch (err: any) {
      const msg = err?.message || "Failed to connect to chat stream"
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `<p>Sorry, I couldn’t complete that request.</p><p><strong>Reason:</strong> ${msg}</p>` },
      ])
      setIsStreaming(false)
      setStreamBuffer("")
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="overlay"
            className="fixed inset-0 bg-black/40 animate-in fade-in duration-200"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Popup */}
          <motion.div
            key="popup"
            className="fixed inset-0 flex items-end sm:items-center justify-center p-2 sm:p-4"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <div className="w-full sm:w-[720px] max-w-[90vw] bg-white rounded-md border border-gray-200 shadow-xl animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out flex flex-col h-[80vh]">
              {/* Header */}
              <div className="h-12 px-3 sm:px-4 border-b border-gray-200 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900">Chat</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-md hover:bg-gray-100"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </Button>
              </div>

              {/* Messages */}
              <div ref={containerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {messages.map((m, i) => {
                  let parsed: any = null
                  try {
                    parsed = JSON.parse(m.content)
                  } catch {}

                  if (parsed && parsed.type === "REWARD_CARD") {
                    return (
                      <div key={`msg-${i}`} className="flex justify-start">
                        <div className="max-w-[90%]">
                          <RewardCard rewardData={parsed.rewardData} message={parsed.message} />
                        </div>
                      </div>
                    )
                  }

                  const isUser = m.role === "user"
                  return (
                    <div key={`msg-${i}`} className={isUser ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={
                          (isUser
                            ? "bg-gray-100 text-gray-800"
                            : "bg-white text-gray-800 border border-gray-200") +
                          " rounded-md px-3 py-2 max-w-[90%]"
                        }
                      >
                        {isUser ? (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</div>
                        ) : (
                          <AnimatedEmailResponse
                            html={m.content}
                            className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-800"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Streaming buffer as assistant */}
                {isStreaming && streamBuffer && (
                  <div className="flex justify-start">
                    <div className="bg-white text-gray-800 border border-gray-200 rounded-md px-3 py-2 max-w-[90%]">
                      <AnimatedEmailResponse
                        html={streamBuffer}
                        className="prose prose-sm max-w-none prose-headings:text-gray-800 prose-p:text-gray-800 prose-li:text-gray-800 prose-strong:text-gray-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 sm:p-4">
                <AIInput
                  onSubmit={(e: React.FormEvent) => {
                    e.preventDefault()
                    if (!isStreaming) sendPrompt()
                  }}
                >
                  <AIInputTextarea
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                    placeholder={isStreaming ? "Processing..." : "Ask anything about rewards or program strategy"}
                    disabled={isStreaming}
                    minHeight={56}
                    maxHeight={164}
                  />
                  <AIInputToolbar>
                    <AIInputTools>
                      <AIInputButton disabled className="text-gray-400">Streaming</AIInputButton>
                    </AIInputTools>
                    <AIInputSubmit disabled={isStreaming || !input.trim()}>
                      <Send className="h-4 w-4" />
                    </AIInputSubmit>
                  </AIInputToolbar>
                </AIInput>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AiChatPopup


