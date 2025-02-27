"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore - SpeechRecognition is not in the TypeScript types yet
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition()
        recognitionInstance.continuous = true
        recognitionInstance.interimResults = true
        
        recognitionInstance.onresult = (event: any) => {
          // Get the transcript
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('')
          
          console.log("Transcript:", transcript)
          setTranscriptText(transcript)
        }
        
        recognitionInstance.onend = () => {
          if (isRecording) {
            // If we're still supposed to be recording, restart
            // This handles the case where the recognition service stops automatically
            recognitionInstance.start()
          }
        }
        
        setRecognition(recognitionInstance)
      }
    }
  }, [isRecording])

  useEffect(() => {
    // Show the tooltip briefly when component mounts
    setShowHelpTooltip(true)
    const timer = setTimeout(() => {
      setShowHelpTooltip(false)
    }, 5000) // Hide after 5 seconds
    
    return () => clearTimeout(timer)
  }, [])

  const toggleRecording = () => {
    if (isRecording) {
      // Make sure we stop the recognition
      if (recognition) {
        try {
          recognition.stop();
          console.log("Recognition stopped");
        } catch (error) {
          console.error("Error stopping recognition:", error);
        }
      }
      
      // Force the isRecording state to false
      setIsRecording(false);
      
      // Process the transcript if it's substantial
      if (transcriptText.length > 10) {
        processVoiceCommand(transcriptText);
      }
      
      // Clear the transcript
      setTranscriptText("");
    } else {
      try {
        if (recognition) {
          recognition.start();
          console.log("Recognition started");
          setIsRecording(true);
        } else {
          console.error("Recognition not initialized");
          // Try to reinitialize
          initializeRecognition();
        }
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        // If there's an error, try recreating the recognition instance
        initializeRecognition();
      }
    }
  };

  // Add a helper function to initialize recognition
  const initializeRecognition = () => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = true;
        newRecognition.interimResults = true;
        
        newRecognition.onresult = (event: any) => {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          
          console.log("Transcript:", transcript);
          setTranscriptText(transcript);
        };
        
        newRecognition.onend = () => {
          console.log("Recognition ended naturally");
          // Only restart if we're still supposed to be recording
          if (isRecording) {
            console.log("Restarting recognition because isRecording is true");
            try {
              newRecognition.start();
            } catch (error) {
              console.error("Error restarting recognition:", error);
              setIsRecording(false);
            }
          } else {
            console.log("Not restarting recognition because isRecording is false");
          }
        };
        
        newRecognition.onerror = (event: any) => {
          console.error("Recognition error:", event.error);
          setIsRecording(false);
        };
        
        setRecognition(newRecognition);
        
        try {
          newRecognition.start();
          setIsRecording(true);
          console.log("New recognition started");
        } catch (error) {
          console.error("Error starting new recognition:", error);
        }
      }
    }
  };

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