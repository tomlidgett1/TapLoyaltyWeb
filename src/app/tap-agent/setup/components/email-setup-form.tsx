"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { X, Plus, Loader2, Mail, Check, AlertTriangle, Bot, BarChart } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { GmailIcon } from "@/components/icons/gmail-icon"
import { useAuth } from "@/contexts/auth-context"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet"

interface EmailSettings {
  isConnected: boolean;
  connectedEmail: string;
  automaticResponses: boolean;
  analyzeEmailTone: boolean;
  emailTone: string;
  customTone: string[];
  excludedEmails: string[];
  notifyBeforeSend: boolean;
}

interface EmailSetupFormProps {
  data: EmailSettings;
  onChange: (data: EmailSettings) => void;
}

export function EmailSetupForm({ data, onChange }: EmailSetupFormProps) {
  const { user } = useAuth()
  const [connectingGmail, setConnectingGmail] = useState(false)
  const [analyzingEmails, setAnalyzingEmails] = useState(false)
  const [newExcludedEmail, setNewExcludedEmail] = useState("")
  const [newCustomTone, setNewCustomTone] = useState("")
  const [customerServiceSheetOpen, setCustomerServiceSheetOpen] = useState(false)
  const [analyzingInquiries, setAnalyzingInquiries] = useState(false)
  
  // Mock function to simulate connecting to Gmail
  const handleConnectGmail = async () => {
    setConnectingGmail(true)
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful connection
      onChange({
        ...data,
        isConnected: true,
        connectedEmail: "user@gmail.com" // This would come from the OAuth flow
      })
      
      toast({
        title: "Connected to Gmail",
        description: "Your Gmail account has been successfully connected.",
      })
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Gmail. Please try again.",
        variant: "destructive"
      })
    } finally {
      setConnectingGmail(false)
    }
  }
  
  // Mock function to simulate analyzing emails
  const handleAnalyzeEmails = async () => {
    setAnalyzingEmails(true)
    
    // Simulate API call
    try {
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simulate successful analysis
      onChange({
        ...data,
        analyzeEmailTone: true,
        customTone: ["Professional", "Friendly", "Concise"]
      })
      
      toast({
        title: "Email Analysis Complete",
        description: "We've analyzed your sent emails and updated your tone settings.",
      })
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: "Failed to analyze your emails. Please try again.",
        variant: "destructive"
      })
    } finally {
      setAnalyzingEmails(false)
    }
  }
  
  const handleDisconnectGmail = () => {
    onChange({
      ...data,
      isConnected: false,
      connectedEmail: "",
      automaticResponses: false
    })
    
    toast({
      title: "Disconnected from Gmail",
      description: "Your Gmail account has been disconnected.",
    })
  }
  
  const handleAddExcludedEmail = () => {
    if (newExcludedEmail && !data.excludedEmails.includes(newExcludedEmail)) {
      onChange({
        ...data,
        excludedEmails: [...data.excludedEmails, newExcludedEmail]
      })
      setNewExcludedEmail("")
    }
  }
  
  const handleRemoveExcludedEmail = (email: string) => {
    onChange({
      ...data,
      excludedEmails: data.excludedEmails.filter(e => e !== email)
    })
  }
  
  const handleAddCustomTone = () => {
    if (newCustomTone && !data.customTone.includes(newCustomTone)) {
      onChange({
        ...data,
        customTone: [...data.customTone, newCustomTone]
      })
      setNewCustomTone("")
    }
  }
  
  const handleRemoveCustomTone = (tone: string) => {
    onChange({
      ...data,
      customTone: data.customTone.filter(t => t !== tone)
    })
  }

  const handleAnalyzeInquiries = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again later.",
        variant: "destructive"
      })
      return
    }

    setAnalyzingInquiries(true)
    
    try {
      // This would be an actual API call to the analyzeInquiryPatterns function
      const response = await fetch(`/api/analyzeInquiryPatterns?merchantId=${user.uid}`, {
        method: 'GET',
      })
      
      if (!response.ok) {
        throw new Error('Failed to analyze inquiry patterns')
      }
      
      toast({
        title: "Analysis Complete",
        description: "Customer inquiry patterns have been analyzed successfully.",
      })
    } catch (error) {
      console.error("Error analyzing inquiry patterns:", error)
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze customer inquiry patterns. Please try again.",
        variant: "destructive"
      })
    } finally {
      setAnalyzingInquiries(false)
    }
  }
  
  return (
    <Card className="border-none shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="text-xl bg-gradient-to-r from-blue-500 to-orange-500 bg-clip-text text-transparent">Email Setup</CardTitle>
        <CardDescription>
          Connect your Gmail account and configure automatic responses for customer inquiries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 p-0 mt-6">
        {/* Gmail Connection */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Gmail Connection</h3>
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account to enable automatic email responses.
            </p>
          </div>
          
          <div className="p-4 border rounded-md">
            {data.isConnected ? (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <GmailIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{data.connectedEmail}</p>
                      <p className="text-xs text-green-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" /> Connected
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDisconnectGmail}
                  >
                    Disconnect
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="automaticResponses"
                    checked={data.automaticResponses}
                    onCheckedChange={(checked) => 
                      onChange({...data, automaticResponses: checked})
                    }
                  />
                  <Label htmlFor="automaticResponses">Enable automatic responses</Label>
                </div>
                
                {data.automaticResponses && (
                  <div className="flex items-center space-x-2 pl-7">
                    <Switch 
                      id="notifyBeforeSend"
                      checked={data.notifyBeforeSend}
                      onCheckedChange={(checked) => 
                        onChange({...data, notifyBeforeSend: checked})
                      }
                    />
                    <Label htmlFor="notifyBeforeSend">Notify me before sending responses</Label>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center py-6 space-y-4">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Mail className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <h4 className="font-medium">Connect to Gmail</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect your account to enable email automation
                  </p>
                </div>
                <Button 
                  onClick={handleConnectGmail} 
                  disabled={connectingGmail}
                  className="gap-2"
                >
                  {connectingGmail && <Loader2 className="h-4 w-4 animate-spin" />}
                  Connect Gmail Account
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Response Settings */}
        {data.isConnected && data.automaticResponses && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Response Settings</h3>
              <p className="text-sm text-muted-foreground">
                Configure how automatic responses are handled.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="emailTone" className="mb-2 block">Default Response Tone</Label>
                <Select 
                  value={data.emailTone} 
                  onValueChange={(value) => onChange({...data, emailTone: value})}
                >
                  <SelectTrigger id="emailTone">
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    <SelectItem value="empathetic">Empathetic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="mb-2 block">Never Respond Automatically To</Label>
                <div className="p-4 bg-gray-50 rounded-md border mb-2">
                  {data.excludedEmails.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.excludedEmails.map(email => (
                        <Badge 
                          key={email} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {email}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0 ml-1"
                            onClick={() => handleRemoveExcludedEmail(email)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No excluded emails added yet.</p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email address or name..."
                    value={newExcludedEmail}
                    onChange={(e) => setNewExcludedEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddExcludedEmail();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddExcludedEmail}
                    disabled={!newExcludedEmail}
                    size="sm"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="bg-muted p-4 rounded-md text-sm space-y-2">
                <p className="font-medium">About automatic responses</p>
                <p className="text-muted-foreground">
                  Automatic responses are generated based on the content of the incoming email and your 
                  communication style. The system will never respond to emails from excluded contacts. 
                  When "Notify before send" is enabled, you'll have a chance to review responses before they're sent.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Customer Service Agent Setup */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h3 className="text-lg font-medium">Customer Service Agent</h3>
            <p className="text-sm text-muted-foreground">
              Set up an AI-powered customer service agent to handle common inquiries.
            </p>
          </div>
          
          <div className="p-4 border rounded-md">
            <div className="flex flex-col items-center py-6 space-y-4">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Bot className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-center">
                <h4 className="font-medium">Customer Service Agent</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Set up an AI agent to handle common customer inquiries
                </p>
              </div>
              <Button 
                onClick={() => setCustomerServiceSheetOpen(true)}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                Set up customer service agent
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Customer Service Agent Sheet */}
      <Sheet open={customerServiceSheetOpen} onOpenChange={setCustomerServiceSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl">Customer Service Agent Setup</SheetTitle>
            <SheetDescription>
              Configure your AI-powered customer service agent to handle common inquiries.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-medium">Inquiry Analysis</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Analyze customer inquiries to identify common patterns and improve automated responses.
              </p>
              <Button 
                onClick={handleAnalyzeInquiries}
                disabled={analyzingInquiries}
                className="w-full gap-2"
              >
                {analyzingInquiries ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart className="h-4 w-4" />
                    Analyze customer inquiries
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Agent Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure how your customer service agent responds to inquiries.
              </p>
              
              <div className="space-y-4 border p-4 rounded-md">
                <div className="flex items-center space-x-2">
                  <Switch id="enableAgent" />
                  <Label htmlFor="enableAgent">Enable customer service agent</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch id="humanReview" />
                  <Label htmlFor="humanReview">Require human review for complex inquiries</Label>
                </div>
                
                <div>
                  <Label htmlFor="agentTone" className="mb-2 block">Agent Communication Style</Label>
                  <Select defaultValue="professional">
                    <SelectTrigger id="agentTone">
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                      <SelectItem value="empathetic">Empathetic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
} 