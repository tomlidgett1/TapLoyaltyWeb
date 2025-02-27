"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"
import { 
  getOrCreateAssistant, 
  createThread, 
  addMessage, 
  runAssistant 
} from "@/lib/assistant"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export function FloatingMicrophone() {
  const [isRecording, setIsRecording] = useState(false)
  const [recognition, setRecognition] = useState<any>(null)
  const [transcriptText, setTranscriptText] = useState("")
  const [processingVoiceCommand, setProcessingVoiceCommand] = useState(false)
  const [voiceCommandResult, setVoiceCommandResult] = useState<any>(null)
  const { user } = useAuth()
  const router = useRouter()
  const [showHelpTooltip, setShowHelpTooltip] = useState(false)
  const recognitionRef = useRef<any>(null)

  // Initialize speech recognition once on component mount
  useEffect(() => {
    initializeSpeechRecognition()
    
    return () => {
      // Clean up on unmount
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
        } catch (e) {
          console.error("Error stopping recognition on unmount:", e)
        }
      }
    }
  }, [])

  // Show tooltip briefly on mount
  useEffect(() => {
    setShowHelpTooltip(true)
    const timer = setTimeout(() => {
      setShowHelpTooltip(false)
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [])

  const initializeSpeechRecognition = () => {
    if (typeof window === 'undefined') return
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser")
      return
    }
    
    // Create a new recognition instance
    const recognitionInstance = new SpeechRecognition()
    recognitionInstance.continuous = true
    recognitionInstance.interimResults = true
    
    // Set up event handlers
    recognitionInstance.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('')
      
      console.log("Transcript:", transcript)
      setTranscriptText(transcript)
    }
    
    recognitionInstance.onend = () => {
      console.log("Recognition ended naturally")
      // We don't auto-restart here - we'll handle that in the toggle function
    }
    
    recognitionInstance.onerror = (event: any) => {
      console.error("Recognition error:", event.error)
      setIsRecording(false)
    }
    
    // Store the instance in both state and ref
    setRecognition(recognitionInstance)
    recognitionRef.current = recognitionInstance
  }

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording
      console.log("Attempting to stop recording")
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop()
          console.log("Recognition stopped successfully")
        } catch (error) {
          console.error("Error stopping recognition:", error)
        }
      }
      
      setIsRecording(false)
      
      // Process transcript if substantial
      if (transcriptText.length > 10) {
        processVoiceCommand(transcriptText)
      }
      
      // Clear transcript
      setTranscriptText("")
    } else {
      // Start recording
      console.log("Attempting to start recording")
      
      // If we don't have a recognition instance, initialize one
      if (!recognitionRef.current) {
        initializeSpeechRecognition()
      }
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start()
          console.log("Recognition started successfully")
          setIsRecording(true)
        } catch (error) {
          console.error("Error starting recognition:", error)
          
          // Try to recreate the recognition instance
          initializeSpeechRecognition()
          
          // Try again with the new instance
          setTimeout(() => {
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start()
                setIsRecording(true)
                console.log("Recognition started on second attempt")
              } catch (retryError) {
                console.error("Error starting recognition on retry:", retryError)
              }
            }
          }, 100)
        }
      } else {
        console.error("Could not initialize speech recognition")
      }
    }
  }

  const processVoiceCommand = async (transcript: string) => {
    setProcessingVoiceCommand(true)
    
    try {
      // Show a processing toast
      toast({
        title: "Processing voice command",
        description: "Please wait while we process your request...",
      })
      
      // Get or create the assistant
      const assistant = await getOrCreateAssistant()
      
      // Create a new thread
      const thread = await createThread()
      
      // Add the user's message to the thread
      await addMessage(thread.id, transcript)
      
      // Run the assistant on the thread
      const response = await runAssistant(assistant.id, thread.id)
      
      // Log the entire response for debugging
      console.log("Full assistant response:", response)
      
      // Check if the response contains reward data
      if (response && response.includes('```json')) {
        // Extract JSON data from the response
        const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/)
        if (jsonMatch && jsonMatch[1]) {
          try {
            const rewardData = JSON.parse(jsonMatch[1])
            
            // Log the parsed JSON data
            console.log("Parsed reward JSON data:", rewardData)
            
            // Navigate to the rewards page with the data
            router.push(`/store/rewards?data=${encodeURIComponent(jsonMatch[1])}`)
            
            toast({
              title: "Reward created",
              description: "Your voice command has been processed successfully.",
            })
          } catch (error) {
            console.error("Error parsing JSON:", error)
            toast({
              title: "Error",
              description: "Could not create reward from voice command.",
              variant: "destructive",
            })
          }
        } else {
          console.log("No JSON data found in response")
        }
      } else {
        // Handle text response
        setVoiceCommandResult(response)
        
        toast({
          title: "Command processed",
          description: "Your voice command has been processed.",
        })
      }
    } catch (error) {
      console.error("Error processing voice command:", error)
      toast({
        title: "Error",
        description: "Failed to process voice command. Please try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingVoiceCommand(false)
    }
  }

  return (
    <div className="fixed bottom-8 right-24 z-50">
      {/* Help tooltip */}
      {(showHelpTooltip || isRecording) && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-md p-3 mb-2 w-64 text-center animate-fadeIn">
          <p className="text-sm text-gray-700">
            {isRecording 
              ? "I'm listening... Ask me to create a reward!" 
              : "Click the mic and ask me to create rewards"}
          </p>
          <div className="absolute -bottom-2 right-5 w-3 h-3 bg-white transform rotate-45"></div>
        </div>
      )}
      
      {/* Main microphone button */}
      <Button
        onClick={toggleRecording}
        onMouseEnter={() => setShowHelpTooltip(true)}
        onMouseLeave={() => !isRecording && setShowHelpTooltip(false)}
        className={cn(
          "h-12 w-12 rounded-full shadow-xl transition-all duration-300 flex items-center justify-center",
          processingVoiceCommand 
            ? "bg-blue-500" 
            : isRecording 
              ? "bg-red-500" 
              : "bg-blue-500"
        )}
      >
        {processingVoiceCommand ? (
          <div className="relative flex items-center justify-center w-full h-full">
            {/* Subtle pulsing ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white opacity-20 animate-ping-slow"></div>
            
            {/* Sparkle effect */}
            <div className="absolute w-6 h-6">
              <div className="absolute w-6 h-6 rotate-0 opacity-70 animate-pulse">
                <div className="w-1 h-1 bg-white rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute left-0 top-1/2 transform -translate-y-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2"></div>
              </div>
              <div className="absolute w-6 h-6 rotate-45 opacity-70 animate-pulse delay-300">
                <div className="w-1 h-1 bg-white rounded-full absolute top-0 left-1/2 transform -translate-x-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute bottom-0 left-1/2 transform -translate-x-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute left-0 top-1/2 transform -translate-y-1/2"></div>
                <div className="w-1 h-1 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2"></div>
              </div>
            </div>
            
            {/* Center dot */}
            <div className="h-2 w-2 bg-white rounded-full"></div>
          </div>
        ) : isRecording ? (
          <MicOff className="h-5 w-5 text-white" />
        ) : (
          <Mic className="h-5 w-5 text-white" />
        )}
      </Button>
      
      {/* Simple pulse animation when recording */}
      {isRecording && (
        <div className="absolute -inset-3 z-[-1]">
          <div className="absolute inset-0 rounded-full bg-red-400 opacity-30 animate-ping-slow"></div>
        </div>
      )}
      
      {/* Transcript bubble */}
      {isRecording && transcriptText && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex space-x-1">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse delay-100"></div>
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse delay-200"></div>
            </div>
            <p className="text-xs font-medium text-gray-500">Listening...</p>
          </div>
          <p className="text-sm">{transcriptText}</p>
        </div>
      )}
      
      {/* Result bubble */}
      {voiceCommandResult && !isRecording && !processingVoiceCommand && (
        <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-lg p-4 max-w-xs border border-gray-100">
          <p className="text-sm font-medium mb-2 text-blue-600">Command Result</p>
          <p className="text-sm text-gray-700">{voiceCommandResult}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3 h-8 text-xs w-full"
            onClick={() => setVoiceCommandResult(null)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  )
} 