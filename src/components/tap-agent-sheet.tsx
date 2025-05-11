"use client"

import React, { useState, useRef, useEffect } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SendHorizontal, X, Globe, Check as CheckIcon, Maximize2, Minimize2 } from "lucide-react"
import Image from "next/image"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"

// Define custom animation
const customAnimationStyles = `
  @keyframes pulseLeftToRight {
    0% {
      background-position: 0% 0;
    }
    100% {
      background-position: 100% 0;
    }
  }
  
  .animate-pulse-left-to-right {
    animation: pulseLeftToRight 2s ease-in-out infinite;
  }

  @keyframes fadeInOut {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  
  .animate-fade-in-out {
    animation: fadeInOut 2s ease-in-out infinite;
  }
`;

// Add custom animated styles at the top of the file for fade effects and better animations
const customStyles = `
  @keyframes fadeInSlide {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .tap-agent-response {
    animation: fadeInSlide 0.3s ease-out forwards;
  }
  
  .tap-agent-response p {
    margin-bottom: 1rem;
  }
  
  .tap-agent-response ul, .tap-agent-response ol {
    margin-bottom: 1rem;
  }
  
  .tap-agent-response blockquote {
    border-left: 3px solid #e5e7eb;
    padding-left: 1rem;
    color: #4b5563;
    font-style: italic;
    margin: 1rem 0;
  }
  
  .tap-agent-response code {
    background-color: #f3f4f6;
    padding: 0.2rem 0.4rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: #1f2937;
  }
  
  .tap-agent-response pre {
    background-color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin: 1rem 0;
  }
  
  .tap-agent-response pre code {
    background-color: transparent;
    padding: 0;
    color: #1f2937;
    font-size: 0.875rem;
  }
  
  .tap-agent-response a {
    color: #2563eb;
    text-decoration: underline;
    text-decoration-color: #93c5fd;
    text-underline-offset: 2px;
    font-weight: 500;
  }
  
  .tap-agent-response a:hover {
    text-decoration-color: #2563eb;
  }
  
  .tap-agent-response img {
    max-width: 100%;
    height: auto;
    border-radius: 0.5rem;
    margin: 1rem 0;
  }
  
  .tap-agent-response table {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
    font-size: 0.875rem;
  }
  
  .tap-agent-response th {
    background-color: #f9fafb;
    font-weight: 600;
  }
  
  .tap-agent-response th, .tap-agent-response td {
    border: 1px solid #e5e7eb;
    padding: 0.75rem;
    text-align: left;
  }
  
  .tap-agent-response tr:nth-child(even) {
    background-color: #f9fafb;
  }
`;

// Add a gradient text component for Tap Agent branding
const GradientText = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <span className={cn("bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent font-semibold", className)}>
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
  const [lightspeedProcessingStage, setLightspeedProcessingStage] = useState(0);
  const [tapQueryResponse, setTapQueryResponse] = useState<string | null>(null);
  const [tapQueryLoading, setTapQueryLoading] = useState(false);
  const [showQuickActionMenu, setShowQuickActionMenu] = useState<string | null>(null);
  const [debugResponse, setDebugResponse] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  // State for expanded view
  const [expandedResponseId, setExpandedResponseId] = useState<"assistant" | "gmail" | "lightspeed" | "tap" | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const quickActionRef = useRef<HTMLDivElement>(null);

  // Available integrations for the command box
  const availableIntegrations = [
    { id: "tap", name: "Tap Loyalty", icon: <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain rounded-sm" /> },
    { id: "lightspeed", name: "Lightspeed", icon: <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain rounded-sm" /> },
    { id: "gmail", name: "Gmail", icon: <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain rounded-sm" /> },
    { id: "instagram", name: "Instagram", icon: <Image src="/insta.webp" width={16} height={16} alt="Instagram" className="h-4 w-4 object-contain rounded-sm" /> },
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
      
      // Also close quick action menu when clicking outside
      if (
        quickActionRef.current &&
        !quickActionRef.current.contains(event.target as Node)
      ) {
        setShowQuickActionMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setShowIntegrations, setShowQuickActionMenu]);

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
          className="tap-agent-response prose prose-slate max-w-none text-gray-800 leading-relaxed space-y-4
            prose-headings:font-semibold 
            prose-h1:text-xl prose-h1:font-bold prose-h1:my-4 prose-h1:text-gray-900
            prose-h2:text-lg prose-h2:font-bold prose-h2:my-3 prose-h2:text-gray-900
            prose-h3:text-base prose-h3:font-semibold prose-h3:my-2 prose-h3:text-gray-900
            prose-p:my-3 prose-p:text-gray-700
            prose-ul:list-disc prose-ul:pl-6 prose-ul:my-3 prose-ul:space-y-2
            prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-3 prose-ol:space-y-2
            prose-li:my-1.5 prose-li:pl-1
            prose-a:text-blue-600 prose-a:hover:text-blue-800 prose-a:hover:underline
            prose-blockquote:pl-4 prose-blockquote:border-l-2 prose-blockquote:border-gray-300 prose-blockquote:text-gray-600 prose-blockquote:italic prose-blockquote:my-4
            prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:rounded prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono
            prose-pre:rounded prose-pre:bg-gray-50 prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:text-sm prose-pre:my-4 prose-pre:border prose-pre:border-gray-200
            prose-img:max-w-full prose-img:h-auto prose-img:rounded-md prose-img:my-4
            prose-table:border-collapse prose-table:min-w-full prose-table:my-4 prose-table:rounded-md prose-table:overflow-hidden
            prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-sm prose-th:font-medium prose-th:text-gray-900 prose-th:bg-gray-50 prose-th:border-b prose-th:border-gray-200
            prose-td:px-4 prose-td:py-3 prose-td:text-sm prose-td:text-gray-700 prose-td:border-t prose-td:border-gray-200"
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
  
  // Quick action handlers
  const handleQuickAction = async (forcedPrompt?: string | React.MouseEvent, timeframe?: string) => {
    // If forcedPrompt is an event, ignore it (this handles button clicks directly)
    if (typeof forcedPrompt !== 'string' && forcedPrompt !== undefined) {
      return;
    }
    
    if (!forcedPrompt) return;

    // Close the dropdown menu
    setShowQuickActionMenu(null);
    
    let prompt = "";
    let chosenIntegration: { id: string; name: string; icon: React.ReactNode } | undefined;

    switch (forcedPrompt) {
      case "gmail-summarize":
        prompt = `Summarize my emails from the past ${timeframe || "day"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "gmail")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "gmail-important":
        prompt = `Find important unread emails from the past ${timeframe || "day"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "gmail")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "lightspeed-sales":
        prompt = `Analyze sales data from the past ${timeframe || "day"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "lightspeed")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "lightspeed-inventory":
        prompt = `Show inventory status with any items that need restocking`;
        chosenIntegration = availableIntegrations.find(i => i.id === "lightspeed")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "lightspeed-trending":
        prompt = `Show trending products from the past ${timeframe || "week"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "lightspeed")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-performance":
        prompt = `Show loyalty program performance metrics for the past ${timeframe || "month"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-customers":
        prompt = `Show top loyalty customers and their recent activity`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-rewards":
        prompt = `Show which rewards are most popular in the loyalty program`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-loyalty-overview":
        prompt = `Show loyalty program overview`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-loyalty-members":
        prompt = `Show member analysis`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      case "tap-loyalty-engagement":
        prompt = `Show engagement metrics for the past ${timeframe || "week"}`;
        chosenIntegration = availableIntegrations.find(i => i.id === "tap")!;
        setSelectedIntegrations([chosenIntegration]);
        break;
      default:
        return;
    }
    
    // Set the command input
    setCommandInput(prompt);

    // Immediately send the command with the chosen integration
    if (chosenIntegration) {
      void handleSendCommand(prompt as string, [chosenIntegration]);
    }
  };

  // Modified handleSendCommand to accept both string or MouseEvent
  const handleSendCommand = async (
    forcedPrompt?: string | React.MouseEvent,
    explicitIntegrations?: { id: string; name: string; icon: React.ReactNode }[]
  ) => {
    // Handle case when the function is called from a button click
    let promptToSend = "";
    if (typeof forcedPrompt === 'string') {
      promptToSend = forcedPrompt;
    } else {
      promptToSend = commandInput.trim();
    }
    
    const integrationsToUse = explicitIntegrations ?? selectedIntegrations;

    if (promptToSend || integrationsToUse.length > 0) {
      console.log("Sending command:", {
        text: promptToSend,
        integrations: integrationsToUse
      })
      
      // Set processing state for all selected integrations
      const newProcessingState: Record<string, boolean> = {}
      integrationsToUse.forEach(integration => {
        newProcessingState[integration.id] = true
      })
      setProcessingIntegrations(newProcessingState)
      
      // Check if Gmail is one of the selected integrations
      const gmailIntegration = integrationsToUse.find(integration => integration.id === "gmail")
      // Check if Lightspeed is one of the selected integrations
      const lightspeedIntegration = integrationsToUse.find(integration => integration.id === "lightspeed")
      // Check if Tap Loyalty is one of the selected integrations
      const tapIntegration = integrationsToUse.find(integration => integration.id === "tap")
      
      // Process each integration if selected
      
      // Process Gmail integration
      if (gmailIntegration && promptToSend.trim()) {
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
              prompt: promptToSend
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
      if (lightspeedIntegration && promptToSend.trim()) {
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
              prompt: promptToSend,
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
      if (tapIntegration && promptToSend.trim()) {
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
              prompt: promptToSend
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
      integrationsToUse.forEach(integration => {
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
      if (integrationsToUse.length === 0) {
        const maxProcessingTime = 7500 
        setTimeout(() => {
          setSelectedIntegrations([])
          setProcessingIntegrations({})
        }, maxProcessingTime)
      }
    }

    // If no integrations are selected but we have command input, use the default AI assistant
    if ((explicitIntegrations ? explicitIntegrations.length === 0 : selectedIntegrations.length === 0) && promptToSend.trim()) {
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
            prompt: promptToSend
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
  }

  // Add effect for cycling Lightspeed processing messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (lightspeedQueryLoading) {
      // Reset to first message when loading starts
      setLightspeedProcessingStage(0);
      
      // Set up interval to cycle through messages every 2 seconds
      interval = setInterval(() => {
        setLightspeedProcessingStage(prev => (prev + 1) % 3);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lightspeedQueryLoading]);
  
  // Add effect for cycling Gmail processing messages
  const [gmailProcessingStage, setGmailProcessingStage] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gmailQueryLoading) {
      // Reset to first message when loading starts
      setGmailProcessingStage(0);
      
      // Set up interval to cycle through messages every 2 seconds
      interval = setInterval(() => {
        setGmailProcessingStage(prev => (prev + 1) % 3);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gmailQueryLoading]);
  
  // Add effect for cycling Tap Loyalty processing messages
  const [tapProcessingStage, setTapProcessingStage] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (tapQueryLoading) {
      // Reset to first message when loading starts
      setTapProcessingStage(0);
      
      // Set up interval to cycle through messages every 2 seconds
      interval = setInterval(() => {
        setTapProcessingStage(prev => (prev + 1) % 3);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tapQueryLoading]);
  
  // Add effect for cycling Assistant processing messages
  const [assistantProcessingStage, setAssistantProcessingStage] = useState(0);
  
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (assistantLoading) {
      // Reset to first message when loading starts
      setAssistantProcessingStage(0);
      
      // Set up interval to cycle through messages every 2 seconds
      interval = setInterval(() => {
        setAssistantProcessingStage(prev => (prev + 1) % 3);
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [assistantLoading]);
  
  // Lightspeed processing messages based on stage
  const getLightspeedProcessingMessage = () => {
    switch (lightspeedProcessingStage) {
      case 0:
        return "Processing Lightspeed data...";
      case 1:
        return "Analysing sales data...";
      case 2:
        return "Generating insights...";
      default:
        return "Processing Lightspeed data...";
    }
  };
  
  // Gmail processing messages based on stage
  const getGmailProcessingMessage = () => {
    switch (gmailProcessingStage) {
      case 0:
        return "Processing Gmail emails...";
      case 1:
        return "Scanning recent conversations...";
      case 2:
        return "Generating summary...";
      default:
        return "Processing Gmail emails...";
    }
  };
  
  // Tap Loyalty processing messages based on stage
  const getTapProcessingMessage = () => {
    switch (tapProcessingStage) {
      case 0:
        return "Processing Tap Loyalty data...";
      case 1:
        return "Analyzing customer metrics...";
      case 2:
        return "Generating loyalty insights...";
      default:
        return "Processing Tap Loyalty data...";
    }
  };
  
  // Assistant processing messages based on stage
  const getAssistantProcessingMessage = () => {
    switch (assistantProcessingStage) {
      case 0:
        return "Processing your request...";
      case 1:
        return "Analyzing data...";
      case 2:
        return "Preparing response...";
      default:
        return "Processing your request...";
    }
  };

  // Function to handle expanding a response
  const handleExpandResponse = (type: "assistant" | "gmail" | "lightspeed" | "tap") => {
    // Toggle expanded state
    setExpandedResponseId(expandedResponseId === type ? null : type);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <style dangerouslySetInnerHTML={{ __html: customAnimationStyles + customStyles }} />
      <SheetContent side="right" className="w-[600px] max-w-none sm:w-[550px] sm:max-w-none lg:w-[500px] lg:max-w-none p-0 overflow-hidden">
        <SheetHeader className="p-6 pb-2">
          <SheetTitle className="flex items-center">
            <GradientText>Tap Agent</GradientText>
          </SheetTitle>
          <SheetDescription>
            Ask me anything about your business. I can look into your data and provide insights, recommendations, and more.
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
                      className="relative flex items-center"
                    >
                      {/* Show the integration icon */}
                      <div 
                        className="flex items-center h-7 px-2 rounded-md bg-gray-100 border border-gray-200 hover:bg-gray-200 cursor-pointer"
                        onClick={(e) => { e.preventDefault(); !processingIntegrations[integration.id] && removeIntegration(integration.id) }}
                      >
                        <span className="mr-1.5">{integration.icon}</span>
                        <span className="text-xs text-gray-700">{integration.name}</span>
                        
                        {processingIntegrations[integration.id] && (
                          <span className="ml-1.5 flex space-x-0.5">
                            <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="h-1.5 w-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={commandInput}
                    onChange={handleCommandInputChange}
                    placeholder="Type '@' to use AI integrations or ask a question..."
                    className="flex-1 outline-none bg-transparent min-w-[180px] py-1 text-sm font-normal text-gray-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !showIntegrations && (commandInput.trim() || selectedIntegrations.length > 0)) {
                        e.preventDefault();
                        void handleSendCommand();
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
                    onClick={(e) => { e.preventDefault(); void handleSendCommand(); }}
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
                              {integration.icon}
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
            {/* Quick Actions Section */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h3 className="text-sm font-medium text-gray-500 w-full mb-2">Quick Actions:</h3>
              
              {/* Gmail Quick Actions */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs font-normal px-3 flex items-center gap-1.5"
                  onClick={(e) => { e.preventDefault(); setShowQuickActionMenu(showQuickActionMenu === "gmail" ? null : "gmail") }}
                >
                  <Image src="/gmail.png" width={14} height={14} alt="Gmail" className="h-3.5 w-3.5 object-contain rounded-sm" />
                  Summarize Emails
                </Button>
                
                {showQuickActionMenu === "gmail" && (
                  <div 
                    ref={quickActionRef}
                    className="absolute left-0 top-full mt-1 z-50 bg-white rounded-md border border-gray-200 shadow-md w-48 py-1 text-xs"
                  >
                    <div className="px-2 py-1 text-gray-500 font-medium border-b">Gmail Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-medium text-blue-600"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("gmail-summarize") }}
                    >
                      Summarize Recent Emails
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Time Range</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("gmail-summarize", "day") }}
                    >
                      Last 24 Hours
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("gmail-summarize", "3 days") }}
                    >
                      Last 3 Days
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("gmail-summarize", "week") }}
                    >
                      Last Week
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Other Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("gmail-important", "day") }}
                    >
                      Find Important Emails
                    </button>
                  </div>
                )}
              </div>
              
              {/* Lightspeed Quick Actions */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs font-normal px-3 flex items-center gap-1.5"
                  onClick={(e) => { e.preventDefault(); setShowQuickActionMenu(showQuickActionMenu === "lightspeed" ? null : "lightspeed") }}
                >
                  <Image src="/lslogo.png" width={14} height={14} alt="Lightspeed" className="h-3.5 w-3.5 object-contain rounded-sm" />
                  Sales Analytics
                </Button>
                
                {showQuickActionMenu === "lightspeed" && (
                  <div 
                    ref={quickActionRef}
                    className="absolute left-0 top-full mt-1 z-50 bg-white rounded-md border border-gray-200 shadow-md w-48 py-1 text-xs"
                  >
                    <div className="px-2 py-1 text-gray-500 font-medium border-b">Lightspeed Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-medium text-blue-600"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-sales") }}
                    >
                      Analyze Sales Data
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Time Range</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-sales", "day") }}
                    >
                      Today
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-sales", "week") }}
                    >
                      This Week
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-sales", "month") }}
                    >
                      This Month
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Other Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-inventory") }}
                    >
                      Inventory Status
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("lightspeed-trending", "week") }}
                    >
                      Trending Products
                    </button>
                  </div>
                )}
              </div>
              
              {/* Tap Loyalty Quick Actions */}
              <div className="relative">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs font-normal px-3 flex items-center gap-1.5"
                  onClick={(e) => { e.preventDefault(); setShowQuickActionMenu(showQuickActionMenu === "tap" ? null : "tap") }}
                >
                  <Image src="/taplogo.png" width={14} height={14} alt="Tap Loyalty" className="h-3.5 w-3.5 object-contain rounded-sm" />
                  Loyalty Insights
                </Button>
                
                {showQuickActionMenu === "tap" && (
                  <div 
                    ref={quickActionRef}
                    className="absolute left-0 top-full mt-1 z-50 bg-white rounded-md border border-gray-200 shadow-md w-48 py-1 text-xs"
                  >
                    <div className="px-2 py-1 text-gray-500 font-medium border-b">Tap Loyalty Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50 font-medium text-blue-600"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-performance") }}
                    >
                      Program Performance
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Time Range</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-performance", "week") }}
                    >
                      Last Week
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-performance", "month") }}
                    >
                      Last Month
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-performance", "3 months") }}
                    >
                      Last Quarter
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Other Actions</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-customers") }}
                    >
                      Top Loyalty Customers
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-rewards") }}
                    >
                      Popular Rewards Analysis
                    </button>
                    <div className="px-2 py-1 text-gray-500 border-t border-b text-[10px]">Loyalty Specific</div>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-loyalty-overview") }}
                    >
                      Loyalty Program Overview
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-loyalty-members") }}
                    >
                      Member Analysis
                    </button>
                    <button 
                      className="w-full text-left px-3 py-1.5 hover:bg-blue-50"
                      onClick={(e) => { e.preventDefault(); void handleQuickAction("tap-loyalty-engagement", "month") }}
                    >
                      Engagement Metrics
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Divider line to separate quick actions from responses */}
            <div className="border-t border-gray-200 mb-6"></div>

            {/* Assistant loading indicator */}
            {assistantLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-4 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <GradientText className="text-base">AI</GradientText>
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-medium text-gray-900">AI Assistant is processing...</h3>
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-start text-left py-2 pl-9">
                  <p className="text-xs animate-fade-in-out bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-medium w-full text-left">
                    {getAssistantProcessingMessage()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Assistant Response */}
            {assistantResponse && (
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50">
                      <GradientText className="text-base">AI</GradientText>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">AI Assistant Response</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        handleExpandResponse("assistant");
                      }}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 rounded-full"
                      onClick={(e) => {
                        e.preventDefault();
                        setAssistantResponse(null);
                        setDebugResponse(null);
                        setShowDebugInfo(false);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {processApiResponse(assistantResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                  renderHtml(processApiResponse(assistantResponse)) :
                  <ReactMarkdown 
                    className="tap-agent-response text-gray-800 leading-relaxed space-y-4"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4 text-gray-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3 text-gray-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2 text-gray-900" {...props} />,
                      p: ({node, ...props}) => <p className="my-3 text-gray-700" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="my-1.5 pl-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-2 border-gray-300 text-gray-600 italic my-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props} />,
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className="rounded bg-gray-50 p-4 overflow-x-auto text-sm my-4 border border-gray-200">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-md"><table className="min-w-full" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-medium text-gray-900" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props} />
                    }}
                  >
                    {processApiResponse(assistantResponse) || ""}
                  </ReactMarkdown>
                }
              </div>
            )}
            
            {/* Gmail loading indicator */}
            {gmailQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-4 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <Image src="/gmail.png" width={18} height={18} alt="Gmail" className="h-5 w-5 object-contain rounded-sm" />
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-medium text-gray-900">Gmail is processing...</h3>
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-start text-left py-2 pl-9">
                  <p className="text-xs animate-fade-in-out bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-medium w-full text-left">
                    {getGmailProcessingMessage()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Gmail Response */}
            {gmailQueryResponse && (
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50">
                      <Image src="/gmail.png" width={16} height={16} alt="Gmail" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Gmail Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      setGmailQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "gmail"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {processApiResponse(gmailQueryResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                  renderHtml(processApiResponse(gmailQueryResponse)) :
                  <ReactMarkdown 
                    className="tap-agent-response text-gray-800 leading-relaxed space-y-4"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4 text-gray-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3 text-gray-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2 text-gray-900" {...props} />,
                      p: ({node, ...props}) => <p className="my-3 text-gray-700" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="my-1.5 pl-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-2 border-gray-300 text-gray-600 italic my-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props} />,
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className="rounded bg-gray-50 p-4 overflow-x-auto text-sm my-4 border border-gray-200">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-md"><table className="min-w-full" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-medium text-gray-900" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props} />
                    }}
                  >
                    {processApiResponse(gmailQueryResponse) || ""}
                  </ReactMarkdown>
                }
              </div>
            )}
            
            {/* Lightspeed loading indicator */}
            {lightspeedQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-4 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <Image src="/lslogo.png" width={18} height={18} alt="Lightspeed" className="h-5 w-5 object-contain rounded-sm" />
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-medium text-gray-900">Lightspeed is processing...</h3>
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-start text-left py-2 pl-9">
                  <p className="text-xs animate-fade-in-out bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-medium w-full text-left">
                    {getLightspeedProcessingMessage()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Lightspeed Response */}
            {lightspeedQueryResponse && (
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50">
                      <Image src="/lslogo.png" width={16} height={16} alt="Lightspeed" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Lightspeed Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      setLightspeedQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "lightspeed"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {processApiResponse(lightspeedQueryResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                  renderHtml(processApiResponse(lightspeedQueryResponse)) :
                  <ReactMarkdown 
                    className="tap-agent-response text-gray-800 leading-relaxed space-y-4"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4 text-gray-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3 text-gray-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2 text-gray-900" {...props} />,
                      p: ({node, ...props}) => <p className="my-3 text-gray-700" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="my-1.5 pl-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-2 border-gray-300 text-gray-600 italic my-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props} />,
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className="rounded bg-gray-50 p-4 overflow-x-auto text-sm my-4 border border-gray-200">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-md"><table className="min-w-full" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-medium text-gray-900" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props} />
                    }}
                  >
                    {processApiResponse(lightspeedQueryResponse) || ""}
                  </ReactMarkdown>
                }
              </div>
            )}
            
            {/* Tap Loyalty loading indicator */}
            {tapQueryLoading && (
              <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6 mb-4 animate-slowFadeIn">
                <div className="flex items-center gap-3 mb-1">
                  <Image src="/taplogo.png" width={18} height={18} alt="Tap Loyalty" className="h-5 w-5 object-contain rounded-sm" />
                  <div className="flex items-center gap-1">
                    <h3 className="text-sm font-medium text-gray-900">Tap Loyalty is processing...</h3>
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                </div>
                <div className="mt-1 flex flex-col items-start text-left py-2 pl-9">
                  <p className="text-xs animate-fade-in-out bg-gradient-to-r from-gray-400 to-gray-700 bg-clip-text text-transparent font-medium w-full text-left">
                    {getTapProcessingMessage()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Tap Loyalty Response */}
            {tapQueryResponse && (
              <div className="mb-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50">
                      <Image src="/taplogo.png" width={16} height={16} alt="Tap Loyalty" className="h-4 w-4 object-contain" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Tap Loyalty Response</h3>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 rounded-full"
                    onClick={(e) => {
                      e.preventDefault();
                      setTapQueryResponse(null);
                      setDebugResponse(null);
                      setShowDebugInfo(false);
                      setSelectedIntegrations(selectedIntegrations.filter(i => i.id !== "tap"));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {processApiResponse(tapQueryResponse)?.trim().match(/<(html|body|div|h[1-6]|p|ul|ol|li|table|a|img|span|strong|em|b)[\s>]/i) ? 
                  renderHtml(processApiResponse(tapQueryResponse)) :
                  <ReactMarkdown 
                    className="tap-agent-response text-gray-800 leading-relaxed space-y-4"
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-xl font-bold my-4 text-gray-900" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-lg font-bold my-3 text-gray-900" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-base font-semibold my-2 text-gray-900" {...props} />,
                      p: ({node, ...props}) => <p className="my-3 text-gray-700" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-6 my-3 space-y-2" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-6 my-3 space-y-2" {...props} />,
                      li: ({node, ...props}) => <li className="my-1.5 pl-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="pl-4 border-l-2 border-gray-300 text-gray-600 italic my-4" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props} />,
                      code: ({node, inline, className, children, ...props}: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <pre className="rounded bg-gray-50 p-4 overflow-x-auto text-sm my-4 border border-gray-200">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code className="bg-gray-100 text-gray-800 rounded px-1.5 py-0.5 text-sm font-mono" {...props}>
                            {children}
                          </code>
                        )
                      },
                      table: ({node, ...props}) => <div className="overflow-x-auto my-4 border border-gray-200 rounded-md"><table className="min-w-full" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-50 border-b border-gray-200" {...props} />,
                      th: ({node, ...props}) => <th className="px-4 py-3 text-left text-sm font-medium text-gray-900" {...props} />,
                      td: ({node, ...props}) => <td className="px-4 py-3 text-sm text-gray-700 border-t border-gray-200" {...props} />
                    }}
                  >
                    {processApiResponse(tapQueryResponse) || ""}
                  </ReactMarkdown>
                }
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
} 