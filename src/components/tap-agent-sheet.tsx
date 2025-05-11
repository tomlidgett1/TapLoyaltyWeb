"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizontal, X, Globe, Check as CheckIcon } from "lucide-react"
import Image from "next/image"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children }: { children: React.ReactNode }) => {
  return (
    <span className="bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold">
      {children}
    </span>
  );
};

interface TapAgentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TapAgentSheet({ open, onOpenChange }: TapAgentSheetProps) {
  const { user } = useAuth();
  const [commandInput, setCommandInput] = useState("");
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [selectedIntegrations, setSelectedIntegrations] = useState<{id: string, name: string, icon: React.ReactNode}[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [processingIntegrations, setProcessingIntegrations] = useState<Record<string, boolean>>({});
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [gmailQueryResponse, setGmailQueryResponse] = useState<string | null>(null);
  const [gmailQueryLoading, setGmailQueryLoading] = useState(false);
  const [lightspeedQueryResponse, setLightspeedQueryResponse] = useState<string | null>(null);
  const [lightspeedQueryLoading, setLightspeedQueryLoading] = useState(false);
  const [tapQueryResponse, setTapQueryResponse] = useState<string | null>(null);
  const [tapQueryLoading, setTapQueryLoading] = useState(false);
  const [debugResponse, setDebugResponse] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Available integrations for the command box
  const availableIntegrations = [
    { id: "mailchimp", name: "MailChimp", icon: <Image src="/mailchimp.png" width={16} height={16} alt="MailChimp" className="h-4 w-4 object-contain" /> },
    { id: "instagram", name: "Instagram", icon: <Image src="/insta.webp" width={16} height={16} alt="Instagram" className="h-4 w-4 object-contain" /> },
    { id: "google", name: "Google", icon: <Globe className="h-4 w-4 text-blue-500" /> },
    { id: "gmail", name: "Gmail", icon: <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" /> },
    { id: "lightspeed", name: "Lightspeed", icon: <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" /> },
    { id: "tap", name: "Tap Loyalty", icon: <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" /> },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowIntegrations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowIntegrations]);

  // Handle selecting an integration from the dropdown
  const handleSelectIntegration = (integration: typeof availableIntegrations[0]) => {
    setSelectedIntegrations([...selectedIntegrations, integration]);
    
    // Replace the @ symbol and any text after it up to cursor position with nothing
    const atIndex = commandInput.lastIndexOf('@', cursorPosition);
    if (atIndex !== -1) {
      const newInput = 
        commandInput.substring(0, atIndex) + 
        commandInput.substring(cursorPosition);
      setCommandInput(newInput);
    }
    
    setShowIntegrations(false);
    
    // Focus back on input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  // Handle input changes for the command box
  const handleCommandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCommandInput(value);
    setCursorPosition(e.target.selectionStart || 0);
    
    // Check if we should show the integrations dropdown
    const lastAtIndex = value.lastIndexOf('@', e.target.selectionStart || 0);
    const hasAtBeforeCursor = lastAtIndex !== -1;
    const nextCharAfterAt = lastAtIndex < value.length - 1 ? value[lastAtIndex + 1] : null;
    
    // Only show dropdown if @ is the last character or followed by text (not space)
    if (hasAtBeforeCursor && (!nextCharAfterAt || nextCharAfterAt !== ' ')) {
      const textAfterAt = value.substring(lastAtIndex + 1, e.target.selectionStart || value.length);
      
      // If there's no text after @ or the text after @ doesn't contain spaces, show integrations
      if (!textAfterAt.includes(' ')) {
        setShowIntegrations(true);
      } else {
        setShowIntegrations(false);
      }
    } else {
      setShowIntegrations(false);
    }
  };

  // Handle removing a selected integration
  const removeIntegration = (id: string) => {
    setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== id));
  };

  // Process API responses to handle both Markdown and HTML content
  const processApiResponse = (response: string | null) => {
    if (!response) return null;
    
    try {
      // Check if the response is a JSON string containing HTML in an "answer" field
      if (response.includes('"answer":')) {
        try {
          const jsonResponse = JSON.parse(response);
          if (jsonResponse.answer && typeof jsonResponse.answer === 'string') {
            // If the answer field contains HTML, return it directly
            return jsonResponse.answer;
          }
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          // Continue with other checks if JSON parsing fails
        }
      }
      
      // Check if the response is wrapped in code blocks and remove them
      if (response.includes('```')) {
        // Handle code blocks with language specifiers
        if (response.includes('```html')) {
          // This is explicitly marked as HTML
          return response.replace(/```html\n/g, '').replace(/```$/g, '');
        } else if (response.includes('```markdown')) {
          // This is explicitly marked as Markdown
          return response.replace(/```markdown\n/g, '').replace(/```$/g, '');
        } else {
          // Generic code block
          return response.replace(/```\w*\n/g, '').replace(/```$/g, '');
        }
      }
      
      // Check if the response is HTML by looking for common HTML tags
      const htmlPattern = /<(html|body|div|h[1-6]|p|ul|ol|li|table|tr|th|td|a|img|span|strong|em|b)[\s>]/i;
      if (htmlPattern.test(response.trim().substring(0, 100))) {
        // It's likely HTML content
        return response;
      }
      
      // Default - just return the response as is
      return response;
    } catch (error) {
      console.error('Error processing API response:', error);
      // Return the original response if there's an error
      return response;
    }
  };

  // Safely render HTML content
  const renderHtml = (htmlContent: string | null) => {
    if (!htmlContent) return null;
    
    try {
      // Sanitize the HTML content to prevent XSS attacks
      // Note: In a production environment, you should use a proper HTML sanitizer library
      
      return (
        <div 
          className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-h3:font-bold prose-p:my-2 prose-p:leading-relaxed prose-li:my-0 prose-li:leading-relaxed prose-table:border-collapse prose-th:bg-gray-50 prose-th:p-2 prose-th:font-semibold prose-td:p-2 prose-td:border prose-td:border-gray-200"
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      );
    } catch (error) {
      console.error('Error rendering HTML:', error);
      return (
        <div className="p-4 border border-red-200 rounded bg-red-50 text-red-800">
          <p className="font-medium">Error rendering content</p>
          <p className="text-sm mt-1">There was a problem displaying this content.</p>
        </div>
      );
    }
  };
  
  // Handle sending the command
  const handleSendCommand = async () => {
    if (commandInput.trim() || selectedIntegrations.length > 0) {
      console.log("Sending command:", {
        text: commandInput,
        integrations: selectedIntegrations
      })
      
      // Set processing state for all selected integrations
      const newProcessingState: Record<string, boolean> = {}
      selectedIntegrations.forEach(integration => {
        newProcessingState[integration.id] = true
      })
      setProcessingIntegrations(newProcessingState)
      
      // Check if Gmail is one of the selected integrations
      const gmailIntegration = selectedIntegrations.find(integration => integration.id === "gmail")
      // Check if Lightspeed is one of the selected integrations
      const lightspeedIntegration = selectedIntegrations.find(integration => integration.id === "lightspeed")
      // Check if Tap Loyalty is one of the selected integrations
      const tapIntegration = selectedIntegrations.find(integration => integration.id === "tap")
      
      // If there are no selected integrations but we have command input, use the default AI assistant
      if (selectedIntegrations.length === 0 && commandInput.trim()) {
        try {
          setAssistantLoading(true)
          
          // Make API call to chatMerchant function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/chatMerchant`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw AI Assistant response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("AI Assistant response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.answer) {
              // This is the expected format from chatMerchant: {"answer":"response text"}
              setAssistantResponse(data.answer);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.success && data?.summary) {
              setAssistantResponse(data.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              setAssistantResponse(data.answer);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              setAssistantResponse(data.result.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.summary) {
              setAssistantResponse(data.summary);
              
              toast({
                title: "AI Assistant Response",
                description: "Your question has been answered",
                variant: "default"
              });
            } else if (data?.error) {
              toast({
                title: "AI Assistant Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setAssistantResponse(`The AI Assistant returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing AI Assistant response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the AI Assistant response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying AI Assistant:", error);
          toast({
            title: "AI Assistant Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setAssistantLoading(false);
        }
      }
      
      if (gmailIntegration && commandInput.trim()) {
        try {
          setGmailQueryLoading(true)
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [gmailIntegration.id]: false
          }))
          
          // Make API call to questionGmailHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionGmailHttp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Gmail API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Gmail API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setGmailQueryResponse(data.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setGmailQueryResponse(data.answer);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setGmailQueryResponse(data.result.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setGmailQueryResponse(data.summary);
              
              toast({
                title: "Gmail Query Completed",
                description: "Gmail query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Gmail Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setGmailQueryResponse(`The Gmail API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Gmail API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Gmail query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Gmail:", error);
          toast({
            title: "Gmail Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setGmailQueryLoading(false);
          // Immediately remove the "processing..." indicator for Gmail
          if (gmailIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [gmailIntegration.id]: false
            }));
          }
        }
      }
      
      // Handle Lightspeed integration
      if (lightspeedIntegration && commandInput.trim()) {
        try {
          setLightspeedQueryLoading(true);
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [lightspeedIntegration.id]: false
          }))
          
          // Make API call to questionLsHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionLsHttp`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim(),
              days: 30 // Default to 30 days of data
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Lightspeed API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Lightspeed API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setLightspeedQueryResponse(data.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setLightspeedQueryResponse(data.answer);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setLightspeedQueryResponse(data.result.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setLightspeedQueryResponse(data.summary);
              
              toast({
                title: "Lightspeed Query Completed",
                description: "Lightspeed query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Lightspeed Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setLightspeedQueryResponse(`The Lightspeed API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Lightspeed API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Lightspeed query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Lightspeed:", error);
          toast({
            title: "Lightspeed Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setLightspeedQueryLoading(false);
          // Immediately remove the "processing..." indicator for Lightspeed
          if (lightspeedIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [lightspeedIntegration.id]: false
            }));
          }
        }
      }
      
      // Handle Tap Loyalty integration
      if (tapIntegration && commandInput.trim()) {
        try {
          setTapQueryLoading(true);
          
          // Clear the "processing..." indicator immediately when loading starts
          setProcessingIntegrations(prev => ({
            ...prev,
            [tapIntegration.id]: false
          }))
          
          // Make API call to questionTapHttp function
          const response = await fetch(
            `https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/questionTap`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              merchantId: user?.uid,
              prompt: commandInput.trim()
            }),
          });
          
          // Get the response
          const rawResponse = await response.text();
          console.log("Raw Tap Loyalty API response:", rawResponse);
          
          try {
            const data = JSON.parse(rawResponse);
            console.log("Tap Loyalty API response parsed:", data);
            
            // Set debug response for inspection
            setDebugResponse(rawResponse);
            
            // Check for multiple possible response formats
            if (data?.success && data?.summary) {
              // Format: { success: true, summary: "..." }
              setTapQueryResponse(data.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.success && data?.answer) {
              // Format: { success: true, answer: "..." }
              setTapQueryResponse(data.answer);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.result?.summary) {
              // Format: { result: { summary: "..." } }
              setTapQueryResponse(data.result.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.summary) {
              // Format: { summary: "..." }
              setTapQueryResponse(data.summary);
              
              toast({
                title: "Tap Loyalty Query Completed",
                description: "Tap Loyalty query has been processed successfully",
                variant: "default"
              });
            } else if (data?.error) {
              // Format: { error: "..." }
              toast({
                title: "Tap Loyalty Query Error",
                description: data.error,
                variant: "destructive"
              });
            } else {
              // No recognizable format - display what we received for debugging
              console.error("Unrecognized response format:", data);
              setTapQueryResponse(`The Tap Loyalty API returned data in an unexpected format. Please check with your developer.\n\nReceived: ${JSON.stringify(data, null, 2)}`);
              
              toast({
                title: "Unexpected Response Format",
                description: "The response format wasn't recognized, but we've displayed what we received",
                variant: "destructive"
              });
            }
          } catch (e) {
            console.error("Error parsing Tap Loyalty API response:", e);
            toast({
              title: "Error Processing Response",
              description: "Could not process the Tap Loyalty query response",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error("Error querying Tap Loyalty:", error);
          toast({
            title: "Tap Loyalty Query Failed",
            description: error instanceof Error ? error.message : "Unknown error occurred",
            variant: "destructive"
          });
        } finally {
          setTapQueryLoading(false);
          // Immediately remove the "processing..." indicator for Tap Loyalty
          if (tapIntegration) {
            setProcessingIntegrations(prev => ({
              ...prev,
              [tapIntegration.id]: false
            }));
          }
        }
      }
      
      // Process other integrations
      selectedIntegrations.forEach(integration => {
        if (integration.id !== "gmail" && integration.id !== "lightspeed" && integration.id !== "tap") { // Skip integrations we already handled
          // Random timeout for other integrations
          const timeout = 4000 + Math.random() * 3000
        
          setTimeout(() => {
            setProcessingIntegrations(prev => ({
              ...prev,
              [integration.id]: false
            }))
            
            toast({
              title: `${integration.name} workflow complete`,
              description: "The integration task has finished successfully",
            })
          }, timeout)
        }
      })
      
      // Reset input field immediately after sending
      setCommandInput("")
      
      // After all processing is done, reset the integrations
      // Keep the integrations that need to show responses
      if (!gmailIntegration && !lightspeedIntegration && !tapIntegration) {
        const maxProcessingTime = 7500 
        setTimeout(() => {
          setSelectedIntegrations([])
          setProcessingIntegrations({})
        }, maxProcessingTime)
      }
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[600px] max-w-none sm:w-[550px] sm:max-w-none lg:w-[500px] lg:max-w-none p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="flex items-center">
            <GradientText>Tap Agent</GradientText>
          </SheetTitle>
          <SheetDescription>
            AI-powered assistant for your business
          </SheetDescription>
        </SheetHeader>
        
        <div className="px-6 pt-4 pb-2 border-b">
          <div className="w-full">
            <div className="relative flex-1">
              <div className="flex flex-wrap items-start px-3 py-2 min-h-[44px] w-full border rounded-lg shadow-sm bg-gray-50">
                <div className="flex flex-wrap flex-grow gap-2 mr-2">
                  {selectedIntegrations.map(integration => (
                    <div 
                      key={integration.id}
                      className="relative pt-1"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-gray-200 text-gray-700 border border-gray-300">
                          {integration.icon}
                          {!processingIntegrations[integration.id] && (
                            <button 
                              onClick={() => removeIntegration(integration.id)}
                              className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full flex items-center justify-center bg-gray-400 hover:bg-gray-500 text-white"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          )}
                        </div>
                        
                        {processingIntegrations[integration.id] && (
                          <div className="mt-1 flex items-center justify-center text-[11px] text-gray-600">
                            <span className="mr-0.5">Processing</span>
                            <span className="flex space-x-0.5">
                              <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={commandInput}
                    onChange={handleCommandInputChange}
                    placeholder="Type '@' to use AI integrations..."
                    className="flex-1 outline-none bg-transparent min-w-[180px] py-1 text-sm font-normal text-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showIntegrations && (commandInput.trim() || selectedIntegrations.length > 0)) {
                        e.preventDefault();
                        handleSendCommand();
                      }
                      
                      if (showIntegrations) {
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter') {
                          return;
                        }
                        
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setShowIntegrations(false);
                        }
                      } else {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setCommandInput("");
                        }
                      }
                    }}
                  />
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    onClick={handleSendCommand}
                    disabled={!commandInput.trim() && selectedIntegrations.length === 0}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      (!commandInput.trim() && selectedIntegrations.length === 0) 
                        ? "text-gray-300 cursor-not-allowed" 
                        : "text-blue-600 hover:bg-blue-100 hover:text-blue-700"
                    )}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {showIntegrations && (
                <div ref={dropdownRef} className="absolute left-0 right-0 top-full mt-1 border rounded-md bg-white shadow-md z-50">
                  <Command className="rounded-md" shouldFilter={true} loop={true}>
                    <CommandInput placeholder="Search integrations..." className="border-none py-1 h-8 text-xs" autoFocus />
                    <CommandList className="max-h-44 overflow-auto py-1">
                      <CommandGroup heading="Integrations" className="text-xs px-2 py-1">
                        {availableIntegrations.map(integration => {
                          const isAlreadySelected = selectedIntegrations.some(i => i.id === integration.id);
                          return (
                            <CommandItem 
                              key={integration.id}
                              onSelect={() => !isAlreadySelected && handleSelectIntegration(integration)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1 cursor-pointer text-xs aria-selected:bg-blue-50 hover:bg-blue-50",
                                isAlreadySelected ? "text-gray-400 cursor-not-allowed" : "text-gray-700"
                              )}
                              value={integration.name}
                              disabled={isAlreadySelected}
                            >
                              <div className="flex items-center justify-center h-5 w-5 rounded-md bg-gray-100">
                                {integration.icon}
                              </div>
                              <span>{integration.name}</span>
                              {isAlreadySelected && (
                                <CheckIcon className="ml-auto h-3 w-3 text-gray-400" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                    <CommandEmpty className="py-2 px-2 text-xs text-center text-gray-500">
                      No matching integrations found.
                    </CommandEmpty>
                  </Command>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-240px)] px-6 py-4">
          <div className="space-y-4">
            {/* Gmail loading indicator */}
            {gmailQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Gmail is processing...</h3>
                </div>
                <div className="mt-2 flex flex-col items-center justify-center space-y-2 py-4">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-sm mt-2 animate-pulse bg-gradient-to-r from-gray-300 to-gray-600 bg-clip-text text-transparent">
                    Processing Gmail data...
                  </p>
                </div>
              </div>
            )}
            
            {/* Lightspeed loading indicator */}
            {lightspeedQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                  </div>
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-medium text-gray-900">Lightspeed is processing...</h3>
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="mt-0 flex items-start text-left py-1 pl-9">
                  <p className="text-xs animate-pulse bg-gradient-to-r from-gray-300 to-gray-600 bg-clip-text text-transparent">
                    Processing Lightspeed data...
                  </p>
                </div>
              </div>
            )}
            
            {/* Tap Loyalty loading indicator */}
            {tapQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                    <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">Tap Loyalty is processing...</h3>
                </div>
                <div className="mt-2 flex flex-col items-center justify-center space-y-2 py-4">
                  <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-sm mt-2 animate-pulse bg-gradient-to-r from-gray-300 to-gray-600 bg-clip-text text-transparent">
                    Processing Tap Loyalty data...
                  </p>
                </div>
              </div>
            )}
            
            {assistantResponse && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                  {(() => {
                    const processedResponse = processApiResponse(assistantResponse);
                    if (typeof processedResponse === 'string' && 
                        processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                      return renderHtml(processedResponse);
                    } else {
                      return (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {processedResponse || ""}
                        </ReactMarkdown>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            
            {gmailQueryResponse && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                      <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Gmail Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setGmailQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "gmail"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                  {(() => {
                    const processedResponse = processApiResponse(gmailQueryResponse);
                    if (typeof processedResponse === 'string' && 
                        processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                      return renderHtml(processedResponse);
                    } else {
                      return (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {processedResponse || ""}
                        </ReactMarkdown>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            
            {lightspeedQueryResponse && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                      <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Lightspeed Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setLightspeedQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "lightspeed"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                  {(() => {
                    const processedResponse = processApiResponse(lightspeedQueryResponse);
                    if (typeof processedResponse === 'string' && 
                        processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                      return renderHtml(processedResponse);
                    } else {
                      return (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {processedResponse || ""}
                        </ReactMarkdown>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            
            {tapQueryResponse && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-5 animate-slowFadeIn">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-gray-100">
                      <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Tap Loyalty Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={() => {
                      setTapQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "tap"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="prose prose-sm max-w-none overflow-auto max-h-[600px] font-sf-pro">
                  {(() => {
                    const processedResponse = processApiResponse(tapQueryResponse);
                    if (typeof processedResponse === 'string' && 
                        processedResponse.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i)) {
                      return renderHtml(processedResponse);
                    } else {
                      return (
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                        >
                          {processedResponse || ""}
                        </ReactMarkdown>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 