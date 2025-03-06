"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAIResponse } from "@/lib/openai"

export default function AiTestPage() {
  const [input, setInput] = useState("")
  const [response, setResponse] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    setLoading(true)
    try {
      const aiResponse = await getAIResponse(input)
      setResponse(aiResponse)
    } catch (error) {
      console.error("Error:", error)
      setResponse("Error: Failed to get AI response")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-2xl py-12">
      <h1 className="text-2xl font-bold mb-6">OpenAI API Test</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Send"}
        </Button>
      </form>
      
      {response && (
        <div className="mt-6 p-4 border rounded-md bg-gray-50">
          <h2 className="font-semibold mb-2">Response:</h2>
          <p className="whitespace-pre-wrap">{response}</p>
        </div>
      )}
    </div>
  )
} 