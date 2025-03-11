"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Send, Save, Eye, Users, Clock, FileText, Loader2, Upload, X, Mail } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useMerchant } from "@/hooks/use-merchant"
import { Checkbox } from "@/components/ui/checkbox"
import { EmailTemplatePreview } from "@/components/email-template-preview"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  CustomDialog as Dialog,
  CustomDialogContent as DialogContent,
  CustomDialogDescription as DialogDescription,
  CustomDialogHeader as DialogHeader,
  CustomDialogTitle as DialogTitle
} from "@/components/custom-dialog"
import React from "react"

export default function CreateEmailCampaign() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { user } = useAuth()
  const { merchant } = useMerchant()
  const [isLoading, setIsLoading] = useState(false)
  const [isFetchingTemplates, setIsFetchingTemplates] = useState(true)
  const [templates, setTemplates] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  
  // Form state
  const [campaignName, setCampaignName] = useState("")
  const [subject, setSubject] = useState("")
  const [fromName, setFromName] = useState(merchant?.merchantName || "")
  const [fromEmail] = useState("tom@lidgett.net") // Use a valid email address
  const [template, setTemplate] = useState("")
  const [audience, setAudience] = useState("all")
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [emailContent, setEmailContent] = useState("")
  
  // Template-specific customization fields
  const [templateCustomization, setTemplateCustomization] = useState({
    // Newsletter template fields
    newsletterDate: "June 2023",
    eventTitle: "Summer Kickoff Party",
    eventDate: "June 15th",
    eventRsvpDate: "June 10th",
    offerTitle: "Summer Sale",
    offerDescription: "25% off all seasonal items",
    offerSecondary: "Buy one, get one 50% off on selected products",
    storeUpdate1: "We've extended our weekend hours for the summer season!",
    storeUpdate2: "New location opening next month - stay tuned for details.",
    
    // Special offer template fields
    promoTitle: "FLASH SALE",
    promoDiscount: "30% off",
    promoCode: "FLASH30",
    promoExpiry: "June 30, 2023",
    
    // Product announcement template fields
    productName: "The Ultimate Widget Pro",
    productTagline: "Redesigned. Reimagined. Revolutionary.",
    productFeature1: "2x faster performance",
    productFeature2: "Enhanced user interface",
    productFeature3: "Longer battery life",
    productFeature4: "Advanced security features",
    productLaunchDate: "July 1st",
    
    // Welcome template fields
    welcomeDiscount: "10% off",
    welcomeCode: "WELCOME10"
  })
  
  // Update a specific field in the template customization
  const updateTemplateField = (field, value) => {
    setTemplateCustomization(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
  // Get template ID from URL if present
  useEffect(() => {
    const templateId = searchParams.get('template')
    if (templateId) {
      setTemplate(templateId)
    }
  }, [searchParams])
  
  // Fetch templates on load
  useEffect(() => {
    const loadTemplates = async () => {
      if (!user?.uid) return
      
      try {
        setIsFetchingTemplates(true)
        
        // For demo purposes, we'll use sample templates
        setTimeout(() => {
          const sampleTemplates = [
            {
              id: "template-1",
              name: "Welcome Email",
              category: "Onboarding"
            },
            {
              id: "template-2",
              name: "Monthly Newsletter",
              category: "Newsletters"
            },
            {
              id: "template-3",
              name: "Special Offer",
              category: "Promotions"
            },
            {
              id: "template-4",
              name: "Product Announcement",
              category: "Marketing"
            }
          ];
          
          setTemplates(sampleTemplates);
          setIsFetchingTemplates(false);
        }, 1000);
        
      } catch (error) {
        console.error("Error loading templates:", error)
        setIsFetchingTemplates(false)
        toast({
          title: "Error",
          description: "Failed to load email templates. Please try again.",
          variant: "destructive",
        })
      }
    }
    
    loadTemplates()
  }, [user, toast])
  
  // Update selected template when template ID changes
  useEffect(() => {
    if (template && templates.length > 0) {
      const selected = templates.find(t => t.id === template);
      console.log("Selected template:", selected);
      setSelectedTemplate(selected)
    } else {
      setSelectedTemplate(null)
    }
  }, [template, templates])
  
  // Update the renderTemplateCustomizationFields function to include all template types
  const renderTemplateCustomizationFields = () => {
    if (!selectedTemplate) return null;
    
    switch(selectedTemplate.id) {
      case "template-1": // Welcome Email
        return (
          <div className="mt-4 border rounded p-4">
            <h3 className="font-medium mb-3">Welcome Email Customization</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="welcome-discount">Welcome Discount</Label>
                <Input 
                  id="welcome-discount" 
                  value={templateCustomization.welcomeDiscount}
                  onChange={(e) => updateTemplateField('welcomeDiscount', e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="welcome-code">Discount Code</Label>
                <Input 
                  id="welcome-code" 
                  value={templateCustomization.welcomeCode}
                  onChange={(e) => updateTemplateField('welcomeCode', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
        
      case "template-2": // Monthly Newsletter
        return (
          <div className="mt-4 border rounded p-4">
            <h3 className="font-medium mb-3">Newsletter Customization</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="newsletter-date">Newsletter Date</Label>
                <Input 
                  id="newsletter-date" 
                  value={templateCustomization.newsletterDate}
                  onChange={(e) => updateTemplateField('newsletterDate', e.target.value)}
                />
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-2">Events Section</h4>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="event-title">Event Title</Label>
                    <Input 
                      id="event-title" 
                      value={templateCustomization.eventTitle}
                      onChange={(e) => updateTemplateField('eventTitle', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="event-date">Event Date</Label>
                    <Input 
                      id="event-date" 
                      value={templateCustomization.eventDate}
                      onChange={(e) => updateTemplateField('eventDate', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="event-rsvp">RSVP By</Label>
                    <Input 
                      id="event-rsvp" 
                      value={templateCustomization.eventRsvpDate}
                      onChange={(e) => updateTemplateField('eventRsvpDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-2">Offers Section</h4>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="offer-title">Offer Title</Label>
                    <Input 
                      id="offer-title" 
                      value={templateCustomization.offerTitle}
                      onChange={(e) => updateTemplateField('offerTitle', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="offer-desc">Offer Description</Label>
                    <Input 
                      id="offer-desc" 
                      value={templateCustomization.offerDescription}
                      onChange={(e) => updateTemplateField('offerDescription', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="offer-secondary">Secondary Offer</Label>
                    <Input 
                      id="offer-secondary" 
                      value={templateCustomization.offerSecondary}
                      onChange={(e) => updateTemplateField('offerSecondary', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-2">Store Updates</h4>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="update1">Update 1</Label>
                    <Input 
                      id="update1" 
                      value={templateCustomization.storeUpdate1}
                      onChange={(e) => updateTemplateField('storeUpdate1', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="update2">Update 2</Label>
                    <Input 
                      id="update2" 
                      value={templateCustomization.storeUpdate2}
                      onChange={(e) => updateTemplateField('storeUpdate2', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case "template-3": // Special Offer
        return (
          <div className="mt-4 border rounded p-4">
            <h3 className="font-medium mb-3">Special Offer Customization</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="promo-title">Promotion Title</Label>
                <Input 
                  id="promo-title" 
                  value={templateCustomization.promoTitle}
                  onChange={(e) => updateTemplateField('promoTitle', e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="promo-discount">Discount Amount</Label>
                <Input 
                  id="promo-discount" 
                  value={templateCustomization.promoDiscount}
                  onChange={(e) => updateTemplateField('promoDiscount', e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="promo-code">Promo Code</Label>
                <Input 
                  id="promo-code" 
                  value={templateCustomization.promoCode}
                  onChange={(e) => updateTemplateField('promoCode', e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="promo-expiry">Expiration Date</Label>
                <Input 
                  id="promo-expiry" 
                  value={templateCustomization.promoExpiry}
                  onChange={(e) => updateTemplateField('promoExpiry', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
        
      case "template-4": // Product Announcement
        return (
          <div className="mt-4 border rounded p-4">
            <h3 className="font-medium mb-3">Product Announcement Customization</h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="product-name">Product Name</Label>
                <Input 
                  id="product-name" 
                  value={templateCustomization.productName}
                  onChange={(e) => updateTemplateField('productName', e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="product-tagline">Product Tagline</Label>
                <Input 
                  id="product-tagline" 
                  value={templateCustomization.productTagline}
                  onChange={(e) => updateTemplateField('productTagline', e.target.value)}
                />
              </div>
              
              <div className="border-t pt-4 mt-2">
                <h4 className="font-medium mb-2">Product Features</h4>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="product-feature1">Feature 1</Label>
                    <Input 
                      id="product-feature1" 
                      value={templateCustomization.productFeature1}
                      onChange={(e) => updateTemplateField('productFeature1', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="product-feature2">Feature 2</Label>
                    <Input 
                      id="product-feature2" 
                      value={templateCustomization.productFeature2}
                      onChange={(e) => updateTemplateField('productFeature2', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="product-feature3">Feature 3</Label>
                    <Input 
                      id="product-feature3" 
                      value={templateCustomization.productFeature3}
                      onChange={(e) => updateTemplateField('productFeature3', e.target.value)}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="product-feature4">Feature 4</Label>
                    <Input 
                      id="product-feature4" 
                      value={templateCustomization.productFeature4}
                      onChange={(e) => updateTemplateField('productFeature4', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="product-launch">Launch Date</Label>
                <Input 
                  id="product-launch" 
                  value={templateCustomization.productLaunchDate}
                  onChange={(e) => updateTemplateField('productLaunchDate', e.target.value)}
                />
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // Handle save draft
  const handleSaveDraft = () => {
    toast({
      title: "Campaign Saved",
      description: "Your campaign has been saved as a draft.",
    })
  }
  
  // Add to the component state
  const [audienceTab, setAudienceTab] = useState("segments")
  const [customEmails, setCustomEmails] = useState("")
  const [importedFile, setImportedFile] = useState(null)
  const [quickAddEmail, setQuickAddEmail] = useState("")
  const [emailInputMethod, setEmailInputMethod] = useState("manual")
  
  // Add a function to handle file import
  const handleFileImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Only accept CSV or TXT files
    if (file.type !== "text/csv" && file.type !== "text/plain") {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or TXT file",
        variant: "destructive",
      })
      return
    }
    
    setImportedFile(file)
    
    // Read the file
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        // Simple parsing - assuming one email per line
        const emails = content.toString().split(/[\r\n,]+/).filter(email => 
          email.trim() && email.includes('@')
        )
        
        if (emails.length === 0) {
          toast({
            title: "No valid emails found",
            description: "The file doesn't contain any valid email addresses",
            variant: "destructive",
          })
          setImportedFile(null)
          return
        }
        
        setCustomEmails(emails.join('\n'))
        toast({
          title: "File imported successfully",
          description: `${emails.length} email addresses imported`,
        })
      } catch (error) {
        console.error("Error parsing file:", error)
        toast({
          title: "Error importing file",
          description: "There was a problem reading the file",
          variant: "destructive",
        })
        setImportedFile(null)
      }
    }
    
    reader.readAsText(file)
  }
  
  // Function to clear imported file
  const clearImportedFile = () => {
    setImportedFile(null)
    setCustomEmails("")
  }
  
  // Add this function to handle quick adding of emails
  const handleQuickAddEmail = () => {
    if (!quickAddEmail || !quickAddEmail.includes('@')) return;
    
    // Add the email to the list
    const newEmails = customEmails 
      ? customEmails + '\n' + quickAddEmail 
      : quickAddEmail;
    
    setCustomEmails(newEmails);
    setQuickAddEmail(""); // Clear the input
    
    toast({
      title: "Email added",
      description: `${quickAddEmail} has been added to your recipient list`,
    });
  }
  
  // Add these state variables
  const [showSendConfirmation, setShowSendConfirmation] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const [debugLogs, setDebugLogs] = useState([])
  const [sendingStatus, setSendingStatus] = useState({ success: 0, failed: 0, total: 0 })
  const [campaignResult, setCampaignResult] = useState(null);
  
  // Add a ref to track the element that had focus before opening the dialog
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  
  // Add this function to add debug logs
  const addDebugLog = (message, type = "info") => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    setDebugLogs(prev => [...prev, { timestamp, message, type }])
  }
  
  // Update the handleSendCampaign function
  const handleSendCampaign = async () => {
    // Reset debug logs
    setDebugLogs([])
    setShowDebugInfo(true)
    addDebugLog("Starting campaign send process...", "info")
    
    if (!campaignName || !subject || !fromName || !selectedTemplate) {
      addDebugLog("Missing required fields", "error")
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }
    
    // Check if we have recipients
    if (audienceTab === "custom" && !customEmails.trim()) {
      addDebugLog("No recipients specified", "error")
      toast({
        title: "No recipients",
        description: "Please add at least one email address",
        variant: "destructive",
      })
      return
    }
    
    // Show confirmation dialog
    setShowSendConfirmation(true)
  }
  
  // Update the fetch with timeout function to handle network errors better
  const fetchWithTimeout = async (url, options, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {
      // Log the request
      console.log(`Fetching ${url} with timeout ${timeout}ms`);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      
      // Check if the response is empty
      const text = await response.text();
      console.log(`Received response from ${url}: ${text.substring(0, 100)}...`);
      
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      // Try to parse as JSON
      try {
        return { 
          response, 
          data: JSON.parse(text),
          ok: response.ok
        };
      } catch (e) {
        return { 
          response, 
          text, 
          ok: response.ok,
          parseError: e
        };
      }
    } catch (error) {
      clearTimeout(id);
      console.error(`Fetch error for ${url}:`, error);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request to ${url} timed out after ${timeout}ms`);
      }
      
      // Add more context to the error
      error.message = `Network error when fetching ${url}: ${error.message}`;
      throw error;
    }
  };
  
  // Add this function to check campaign status
  const checkCampaignStatus = async (campaignId) => {
    try {
      addDebugLog(`Checking status of campaign ${campaignId}...`, "info");
      
      const response = await fetch(`/api/email/check-campaign-status?id=${campaignId}`);
      const result = await response.json();
      
      if (result.success) {
        const status = result.campaign.status;
        addDebugLog(`Campaign status: ${status}`, "info");
        
        if (status === 'sent' || status === 'sending') {
          addDebugLog("✓ Campaign is being sent!", "success");
          return true;
        } else {
          addDebugLog(`⚠️ Campaign is not being sent (status: ${status})`, "warning");
          
          // Provide guidance based on status
          if (status === 'save') {
            addDebugLog("The campaign was created but not sent. This could be due to:", "info");
            addDebugLog("1. The audience has no subscribers", "info");
            addDebugLog("2. The campaign failed compliance checks", "info");
            addDebugLog("3. The Mailchimp API call to send the campaign failed", "info");
          } else if (status === 'schedule') {
            addDebugLog("The campaign is scheduled to be sent later", "info");
          } else if (status === 'paused') {
            addDebugLog("The campaign is paused", "info");
          }
          
          return false;
        }
      } else {
        addDebugLog(`Error checking campaign status: ${result.error}`, "error");
        return false;
      }
    } catch (error) {
      addDebugLog(`Error checking campaign status: ${error.message}`, "error");
      return false;
    }
  };
  
  // Add this function to make a direct API call to Mailchimp
  const sendDirectToMailchimp = async (payload) => {
    try {
      addDebugLog("Attempting direct Mailchimp API call...", "info");
      
      // Get the API key and server prefix from environment variables
      const apiKey = process.env.NEXT_PUBLIC_MAILCHIMP_API_KEY;
      const serverPrefix = process.env.NEXT_PUBLIC_MAILCHIMP_SERVER_PREFIX;
      
      if (!apiKey || !serverPrefix) {
        addDebugLog("Missing Mailchimp credentials in client environment", "error");
        return false;
      }
      
      // Create a campaign directly
      const createResponse = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`anystring:${apiKey}`)}`
        },
        body: JSON.stringify({
          type: "regular",
          recipients: {
            list_id: process.env.NEXT_PUBLIC_MAILCHIMP_AUDIENCE_ID
          },
          settings: {
            subject_line: payload.subject,
            title: payload.campaignName,
            from_name: payload.fromName,
            reply_to: payload.fromEmail
          }
        })
      });
      
      const createResult = await createResponse.json();
      
      if (!createResponse.ok) {
        addDebugLog(`Error creating campaign directly: ${createResult.detail || 'Unknown error'}`, "error");
        return false;
      }
      
      const campaignId = createResult.id;
      addDebugLog(`Campaign created directly with ID: ${campaignId}`, "success");
      
      // Set the campaign content
      const contentResponse = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`anystring:${apiKey}`)}`
        },
        body: JSON.stringify({
          html: payload.emailContent
        })
      });
      
      const contentResult = await contentResponse.json();
      
      if (!contentResponse.ok) {
        addDebugLog(`Error setting campaign content: ${contentResult.detail || 'Unknown error'}`, "error");
        return false;
      }
      
      addDebugLog("Campaign content set successfully", "success");
      
      // Send the campaign
      const sendResponse = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`anystring:${apiKey}`)}`
        }
      });
      
      if (!sendResponse.ok) {
        const sendError = await sendResponse.json();
        addDebugLog(`Error sending campaign: ${sendError.detail || 'Unknown error'}`, "error");
        return false;
      }
      
      addDebugLog("Campaign sent successfully via direct API call", "success");
      return true;
    } catch (error) {
      addDebugLog(`Error in direct Mailchimp API call: ${error.message}`, "error");
      return false;
    }
  };
  
  // Add this function to check audience size before sending
  const checkAudienceBeforeSending = async () => {
    try {
      addDebugLog("Checking audience size before sending...", "info");
      
      const response = await fetch('/api/email/check-audience-size');
      const result = await response.json();
      
      if (result.success) {
        addDebugLog(`✓ Audience has ${result.audience.memberCount} subscribers`, "success");
        return true;
      } else {
        addDebugLog(`✗ ${result.error}`, "error");
        
        if (result.details) {
          addDebugLog(`Details: ${result.details}`, "error");
        }
        
        if (result.solution) {
          addDebugLog(`Solution: ${result.solution}`, "info");
        }
        
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        });
        
        return false;
      }
    } catch (error) {
      addDebugLog(`✗ Error checking audience: ${error.message}`, "error");
      return false;
    }
  };
  
  // Update the confirmSendCampaign function to check audience size first
  const confirmSendCampaign = async () => {
    try {
      setIsLoading(true);
      addDebugLog("Sending campaign...", "info");
      setShowDebugInfo(true);
      
      // Check audience size first
      const audienceOk = await checkAudienceBeforeSending();
      if (!audienceOk) {
        addDebugLog("Cannot send campaign: audience check failed", "error");
        setIsLoading(false);
        return;
      }
      
      // Prepare the request payload
      const payload = {
        campaignName,
        subject,
        fromName,
        fromEmail,
        templateId: template,
        emailContent,
        customization: templateCustomization,
        audienceType: audienceTab,
        customEmails: audienceTab === "custom" ? customEmails.split('\n').filter(email => email.trim()) : []
      };
      
      addDebugLog(`Sending request to API...`, "info");
      addDebugLog(`Payload: ${JSON.stringify(payload, null, 2)}`, "data");
      
      try {
        const result = await fetchWithTimeout('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }, 60000); // 60 second timeout
        
        if (result.parseError) {
          addDebugLog(`Error parsing JSON response: ${result.parseError.message}`, "error");
          addDebugLog(`Raw API response: ${result.text}`, "data");
          throw new Error(`Invalid JSON response from server: ${result.text.substring(0, 100)}...`);
        }
        
        if (!result.ok) {
          // Handle error response
          addDebugLog(`API Error: ${result.data.error}`, "error");
          
          // Store the result
          setCampaignResult(result.data);
          
          // Add more detailed debugging information
          if (result.data.details) {
            addDebugLog(`Details: ${result.data.details}`, "error");
          }
          
          // Show solution if available
          if (result.data.solution) {
            addDebugLog(`Suggested solution: ${result.data.solution}`, "info");
          }
          
          // If we have a campaign ID, it means the campaign was created but not sent
          if (result.data.campaignId) {
            addDebugLog(`Campaign ID: ${result.data.campaignId} (created but not sent)`, "info");
            
            if (result.data.campaignStatus) {
              addDebugLog(`Campaign status: ${result.data.campaignStatus}`, "info");
            }
            
            addDebugLog("You can check this campaign in your Mailchimp dashboard", "info");
            
            // Add a link to view the campaign in Mailchimp
            const serverPrefix = result.data.serverPrefix || process.env.MAILCHIMP_SERVER_PREFIX;
            if (serverPrefix) {
              const mailchimpUrl = `https://${serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${result.data.campaignId.replace('campaign_', '')}`;
              addDebugLog(`Mailchimp URL: ${mailchimpUrl}`, "info");
            }
          }
          
          // If we have checklist items, show them
          if (result.data.checklistItems) {
            addDebugLog("Campaign checklist issues:", "error");
            result.data.checklistItems.forEach(item => {
              addDebugLog(`- ${item.type}: ${item.details}`, item.type === "error" ? "error" : "info");
            });
          }
          
          // Add common reasons for this error
          addDebugLog("\nCommon reasons for 'Campaign was created but could not be sent':", "info");
          addDebugLog("1. No subscribers in your audience", "info");
          addDebugLog("2. Missing physical address (required by anti-spam laws)", "info");
          addDebugLog("3. Missing unsubscribe link (required by anti-spam laws)", "info");
          addDebugLog("4. Campaign content doesn't meet Mailchimp requirements", "info");
          addDebugLog("5. Your Mailchimp account may have billing or compliance issues", "info");
          
          throw new Error(result.data.error || "Failed to send campaign");
        }
        
        // Handle success response
        addDebugLog(`Campaign created successfully! ID: ${result.data.campaignId}`, "success");
        
        // Store the result
        setCampaignResult(result.data);
        
        if (result.data.simulated) {
          addDebugLog("Note: This was a simulated send (not a real email)", "info");
        } else {
          // Check if the campaign was actually sent
          setTimeout(async () => {
            const wasSent = await checkCampaignStatus(result.data.campaignId);
            
            if (!wasSent) {
              addDebugLog("Attempting to view campaign in Mailchimp...", "info");
              const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
              if (serverPrefix) {
                const mailchimpUrl = `https://${serverPrefix}.admin.mailchimp.com/campaigns/edit?id=${result.data.campaignId.replace('campaign_', '')}`;
                addDebugLog(`Mailchimp URL: ${mailchimpUrl}`, "info");
                addDebugLog("You may need to manually send the campaign from the Mailchimp dashboard", "info");
              }
            }
          }, 3000); // Wait 3 seconds before checking status
        }
        
        setSendingStatus(prev => ({
          ...prev,
          success: prev.success + 1,
          total: prev.total + 1
        }));
        
        toast({
          title: "Success",
          description: "Campaign sent successfully!",
          variant: "default",
        });
        
      } catch (fetchError) {
        addDebugLog(`Network error: ${fetchError.message}`, "error");
        addDebugLog("Attempting fallback method...", "info");
        
        // Try the direct API call as a fallback
        const fallbackSuccess = await sendDirectToMailchimp(payload);
        
        if (fallbackSuccess) {
          addDebugLog("Fallback method succeeded!", "success");
          toast({
            title: "Success",
            description: "Campaign sent successfully via fallback method",
            variant: "default",
          });
        } else {
          addDebugLog("Fallback method failed", "error");
          toast({
            title: "Error",
            description: "Failed to send campaign via all methods",
            variant: "destructive",
          });
        }
      }
      
    } catch (error) {
      console.error("Error sending campaign:", error);
    } finally {
      setIsLoading(false);
      setShowSendConfirmation(false);
    }
  };
  
  // Add this function to your component
  const checkMailchimpConnection = async () => {
    addDebugLog("Testing Mailchimp connection...", "info");
    setShowDebugInfo(true);
    
    try {
      // First check environment variables
      const envResponse = await fetch('/api/email/debug-env');
      const envData = await envResponse.json();
      
      addDebugLog("Environment check:", "info");
      addDebugLog(JSON.stringify(envData.environment, null, 2), "data");
      
      // Then test the actual Mailchimp connection
      const response = await fetch('/api/email/test-mailchimp');
      const result = await response.json();
      
      if (result.success) {
        addDebugLog("✓ Mailchimp connection successful!", "success");
        addDebugLog(`Account: ${result.account.name} (${result.account.email})`, "info");
        addDebugLog(`Campaigns: ${result.campaignCount}`, "info");
        addDebugLog(`Audiences: ${result.audienceCount}`, "info");
        
        if (result.audiences && result.audiences.length > 0) {
          addDebugLog("Available audiences:", "info");
          result.audiences.forEach(audience => {
            addDebugLog(`- ${audience.name} (ID: ${audience.id}) - ${audience.memberCount} members`, "info");
          });
        }
      } else {
        addDebugLog("✗ Mailchimp connection failed", "error");
        addDebugLog(`Error: ${result.error}`, "error");
        if (result.details) {
          addDebugLog(`Details: ${result.details}`, "error");
        }
      }
    } catch (error) {
      addDebugLog("✗ Error testing Mailchimp connection", "error");
      addDebugLog(`Error: ${error.message}`, "error");
    }
  };
  
  // Add this function to show common solutions
  const showCommonSolutions = () => {
    addDebugLog("Common Mailchimp Connection Issues:", "info");
    addDebugLog("1. Server prefix format: Should be just the prefix (e.g., 'us19'), not the full domain", "info");
    addDebugLog("2. API key: Make sure it's a valid API key with proper permissions", "info");
    addDebugLog("3. Audience ID: Verify this matches an actual audience in your Mailchimp account", "info");
    addDebugLog("4. Environment variables: Restart your Next.js server after changing .env.local", "info");
    addDebugLog("5. Simulation mode: Set SIMULATE_MAILCHIMP=false to use real Mailchimp API", "info");
    
    addDebugLog("\nTo find your server prefix:", "info");
    addDebugLog("- Look at your Mailchimp URL, e.g., https://us19.admin.mailchimp.com", "info");
    addDebugLog("- The prefix is the part between 'https://' and '.admin.mailchimp.com' (in this example, 'us19')", "info");
    
    addDebugLog("\nTo find your Audience ID:", "info");
    addDebugLog("- Go to Audience → Settings → Audience name and defaults", "info");
    addDebugLog("- Look for 'Audience ID' near the top of the page", "info");
  };
  
  // Add this function to check for common Mailchimp issues
  const checkCommonMailchimpIssues = async () => {
    addDebugLog("Checking for common Mailchimp issues...", "info");
    setShowDebugInfo(true);
    
    try {
      // First check environment variables
      const envResponse = await fetch('/api/email/debug-env');
      const envData = await envResponse.json();
      
      if (!envData.environment.HAS_MAILCHIMP_API_KEY || !envData.environment.MAILCHIMP_SERVER_PREFIX) {
        addDebugLog("✗ Missing Mailchimp credentials", "error");
        return;
      }
      
      // Then test the Mailchimp connection
      const response = await fetch('/api/email/test-mailchimp');
      const result = await response.json();
      
      if (!result.success) {
        addDebugLog("✗ Mailchimp connection failed", "error");
        return;
      }
      
      // Check if there are any audiences
      if (result.audienceCount === 0) {
        addDebugLog("✗ No audiences found in your Mailchimp account", "error");
        addDebugLog("Solution: Create an audience in Mailchimp first", "info");
        return;
      }
      
      // Check if the configured audience exists and has subscribers
      const configuredAudienceId = envData.environment.MAILCHIMP_AUDIENCE_ID;
      const audience = result.audiences.find(a => a.id === configuredAudienceId);
      
      if (!audience) {
        addDebugLog(`✗ Configured audience ID (${configuredAudienceId}) not found`, "error");
        addDebugLog("Solution: Update your MAILCHIMP_AUDIENCE_ID in .env.local", "info");
        return;
      }
      
      if (audience.memberCount === 0) {
        addDebugLog("✗ Your audience has no subscribers", "error");
        addDebugLog("Solution: Add at least one subscriber to your audience", "info");
        return;
      }
      
      // All checks passed
      addDebugLog("✓ All basic Mailchimp checks passed!", "success");
      addDebugLog("If you're still having issues sending campaigns, check the Mailchimp dashboard for more details", "info");
      
    } catch (error) {
      addDebugLog("✗ Error checking Mailchimp issues", "error");
      addDebugLog(`Error: ${error.message}`, "error");
    }
  };
  
  // Add this function to check the Mailchimp audience
  const checkMailchimpAudience = async () => {
    addDebugLog("Checking Mailchimp audience...", "info");
    setShowDebugInfo(true);
    
    try {
      const response = await fetch('/api/email/check-audience');
      const result = await response.json();
      
      if (result.success) {
        addDebugLog(`Audience: ${result.audience.name} (ID: ${result.audience.id})`, "info");
        addDebugLog(`Member count: ${result.audience.memberCount}`, "info");
        
        if (result.audience.memberCount === 0) {
          addDebugLog("⚠️ Your audience has no subscribers!", "error");
          addDebugLog("This is likely why your campaign cannot be sent.", "error");
          addDebugLog("Solution: Add at least one subscriber to your audience in Mailchimp", "info");
        } else {
          addDebugLog("✓ Your audience has subscribers", "success");
          
          if (result.sampleMembers && result.sampleMembers.length > 0) {
            addDebugLog("Sample subscribers:", "info");
            result.sampleMembers.forEach(member => {
              addDebugLog(`- ${member.email} (${member.status})`, "info");
            });
          }
        }
      } else {
        addDebugLog("✗ Failed to check audience", "error");
        addDebugLog(`Error: ${result.error}`, "error");
        if (result.details) {
          addDebugLog(`Details: ${result.details}`, "error");
        }
      }
    } catch (error) {
      addDebugLog("✗ Error checking audience", "error");
      addDebugLog(`Error: ${error.message}`, "error");
    }
  };
  
  // Add this function to add a test subscriber
  const addTestSubscriber = async () => {
    addDebugLog("Adding test subscriber to Mailchimp audience...", "info");
    setShowDebugInfo(true);
    
    try {
      const response = await fetch('/api/email/ensure-test-subscriber');
      const result = await response.json();
      
      if (result.success) {
        addDebugLog("✓ Test subscriber added successfully!", "success");
        addDebugLog(`Email: ${result.subscriber.email}`, "info");
        addDebugLog(`Status: ${result.subscriber.status}`, "info");
        addDebugLog("You should now be able to send campaigns to this audience", "info");
      } else {
        addDebugLog("✗ Failed to add test subscriber", "error");
        addDebugLog(`Error: ${result.error}`, "error");
        if (result.details) {
          addDebugLog(`Details: ${result.details}`, "error");
        }
      }
    } catch (error) {
      addDebugLog("✗ Error adding test subscriber", "error");
      addDebugLog(`Error: ${error.message}`, "error");
    }
  };
  
  // Update this function to try sending via direct API call
  const trySendDirectly = async (campaignId) => {
    try {
      addDebugLog(`Attempting to send campaign ${campaignId} directly...`, "info");
      
      // Show a loading indicator
      setIsLoading(true);
      
      try {
        // Use the new endpoint
        const response = await fetch('/api/email/direct-send-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ campaignId }),
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          addDebugLog(`API error (${response.status}): ${errorText}`, "error");
          throw new Error(`API returned status ${response.status}`);
        }
        
        const responseText = await response.text();
        addDebugLog(`Raw API response: ${responseText}`, "data");
        
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          addDebugLog(`Error parsing JSON response: ${parseError.message}`, "error");
          throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
        }
        
        if (result.success) {
          addDebugLog("✓ Direct send request successful!", "success");
          addDebugLog(`Campaign status: ${result.status}`, "info");
          
          if (result.status === 'sending' || result.status === 'sent') {
            addDebugLog("✓ Campaign is being sent!", "success");
            
            toast({
              title: "Success",
              description: "Campaign is being sent!",
              variant: "default",
            });
          } else {
            addDebugLog(`⚠️ Campaign status is ${result.status}, which may indicate it's not being sent yet`, "warning");
            addDebugLog("Check campaign status in a few moments...", "info");
            
            // Check status after a delay
            setTimeout(() => checkCampaignStatus(campaignId), 5000);
          }
        } else {
          addDebugLog(`✗ Direct send failed: ${result.error}`, "error");
          
          if (result.details) {
            addDebugLog(`Details: ${result.details}`, "error");
          }
          
          if (result.checklistItems) {
            addDebugLog("Campaign checklist issues:", "error");
            result.checklistItems.forEach(item => {
              addDebugLog(`- ${item.type}: ${item.details}`, item.type === "error" ? "error" : "info");
            });
          }
          
          toast({
            title: "Error",
            description: result.error || "Failed to send campaign",
            variant: "destructive",
          });
        }
      } catch (fetchError) {
        addDebugLog(`✗ Fetch error: ${fetchError.message}`, "error");
        
        // Try using the Mailchimp API directly
        addDebugLog("Attempting to use Mailchimp API directly...", "info");
        
        // This would require exposing your API key to the client, which is not recommended
        // Instead, suggest using the manual send method
        addDebugLog("⚠️ Direct API access not available in the browser", "warning");
        addDebugLog("Please try the 'Manual Send' button instead", "info");
        
        toast({
          title: "Error",
          description: "API call failed. Try using Manual Send instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      addDebugLog(`✗ Error in direct send: ${error.message}`, "error");
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add this function to test a simple API call
  const testSimpleApi = async () => {
    try {
      addDebugLog("Testing simple API...", "info");
      setShowDebugInfo(true);
      
      const payload = {
        campaignName: "Test Campaign",
        subject: "Test Subject",
        fromEmail: "test@example.com"
      };
      
      const response = await fetch('/api/email/simple-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const text = await response.text();
      addDebugLog(`Raw API response: ${text}`, "data");
      
      try {
        const result = JSON.parse(text);
        addDebugLog(`Simple API test ${result.success ? 'succeeded' : 'failed'}`, result.success ? "success" : "error");
        
        if (result.message) {
          addDebugLog(`Message: ${result.message}`, "info");
        }
        
        if (!result.success && result.error) {
          addDebugLog(`Error: ${result.error}`, "error");
        }
      } catch (parseError) {
        addDebugLog(`Error parsing response: ${parseError.message}`, "error");
      }
    } catch (error) {
      addDebugLog(`Error testing simple API: ${error.message}`, "error");
    }
  };
  
  // Add this function to manually create and send a campaign
  const manualSendCampaign = async () => {
    try {
      addDebugLog("Manually creating and sending campaign...", "info");
      setShowDebugInfo(true);
      setIsLoading(true);
      
      // Prepare the request payload
      const payload = {
        campaignName,
        subject,
        fromName,
        fromEmail,
        emailContent: `
          <h1>${subject}</h1>
          <div>${emailContent}</div>
        `
      };
      
      addDebugLog(`Sending request to manual-send API...`, "info");
      
      const response = await fetch('/api/email/manual-send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      addDebugLog(`Raw API response: ${responseText}`, "data");
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        addDebugLog(`Error parsing JSON response: ${parseError.message}`, "error");
        throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 100)}...`);
      }
      
      if (result.success) {
        addDebugLog(`✓ Campaign created and sent with ID: ${result.campaignId}`, "success");
        addDebugLog(`Campaign status: ${result.status}`, "info");
        
        setCampaignResult(result);
        
        toast({
          title: "Success",
          description: "Campaign created and sent successfully!",
          variant: "default",
        });
        
        // Check status after a delay
        setTimeout(() => checkCampaignStatus(result.campaignId), 5000);
      } else {
        addDebugLog(`✗ Manual send failed: ${result.error}`, "error");
        
        if (result.details) {
          addDebugLog(`Details: ${result.details}`, "error");
        }
        
        if (result.checklistItems) {
          addDebugLog("Campaign checklist issues:", "error");
          result.checklistItems.forEach(item => {
            addDebugLog(`- ${item.type}: ${item.details}`, item.type === "error" ? "error" : "info");
          });
        }
        
        toast({
          title: "Error",
          description: result.error || "Failed to send campaign",
          variant: "destructive",
        });
      }
    } catch (error) {
      addDebugLog(`✗ Error in manual send: ${error.message}`, "error");
      
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="gap-1"
          onClick={() => router.push('/email')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Email
        </Button>
        <h1 className="text-2xl font-bold ml-4">Create Email Campaign</h1>
      </div>
      <p className="text-gray-500 mb-8">Design and send an email campaign to your customers</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Basic information about your email campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input 
                  id="campaign-name" 
                  placeholder="Summer Sale Announcement"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  For your reference only, recipients won't see this
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="Don't Miss Our Summer Sale!"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="from-name">From Name</Label>
                <Input 
                  id="from-name" 
                  placeholder="Your Business Name"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="from-email">From Email</Label>
                <Input 
                  id="from-email" 
                  type="email"
                  value={fromEmail}
                  disabled
                />
                <p className="text-xs text-gray-500">
                  All emails are sent through the TapLoyalty email system
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Email Content</CardTitle>
              <CardDescription>
                Choose a template and customize your email content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isFetchingTemplates ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <p className="text-gray-500 ml-3">Loading templates...</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 mb-4">
                    <Label htmlFor="email-template">Email Template</Label>
                    <Select value={template} onValueChange={setTemplate}>
                      <SelectTrigger id="email-template">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTemplate ? (
                    <>
                      <div className="border rounded-md overflow-hidden mb-4">
                        <div className="bg-gray-50 p-3 border-b flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-sm">{selectedTemplate.name}</h3>
                            <p className="text-xs text-gray-500">{selectedTemplate.category}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowPreview(true)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                          </Button>
                        </div>
                        <div className="p-4 bg-white">
                          <div className="aspect-video bg-gray-100 rounded-md flex flex-col items-center justify-center p-8">
                            <FileText className="h-16 w-16 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 text-center">
                              {selectedTemplate.name} template
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Simple template customization fields */}
                      {renderTemplateCustomizationFields()}
                      
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="email-content">Customize Email Content</Label>
                        <Textarea 
                          id="email-content"
                          placeholder="Add your custom message here..."
                          className="min-h-[200px]"
                          value={emailContent}
                          onChange={(e) => setEmailContent(e.target.value)}
                        />
                        <p className="text-xs text-gray-500">
                          This content will be added to your selected template
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <p className="text-gray-500 mb-4">
                        Select a template to customize your email content
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audience</CardTitle>
              <CardDescription>
                Choose who will receive this campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="segments" value={audienceTab} onValueChange={setAudienceTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="segments">Customer Segments</TabsTrigger>
                  <TabsTrigger value="custom">Custom Email List</TabsTrigger>
                </TabsList>
                
                <TabsContent value="segments" className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="audience">Select Audience</Label>
                    <Select value={audience} onValueChange={setAudience}>
                      <SelectTrigger id="audience">
                        <SelectValue placeholder="Select an audience" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Customers</SelectItem>
                        <SelectItem value="active">Active Customers</SelectItem>
                        <SelectItem value="new">New Customers (Last 30 Days)</SelectItem>
                        <SelectItem value="inactive">Inactive Customers (90+ Days)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Estimated Recipients</p>
                      <p className="text-sm text-gray-500">
                        {audience === 'all' ? '25' : 
                         audience === 'active' ? '18' : 
                         audience === 'new' ? '7' : '5'} customers
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="custom-emails">Custom Email Recipients</Label>
                    
                    {/* Input method tabs */}
                    <Tabs defaultValue="manual" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="manual">Enter Manually</TabsTrigger>
                        <TabsTrigger value="import">Import File</TabsTrigger>
                      </TabsList>
                      
                      {/* Manual entry tab */}
                      <TabsContent value="manual" className="space-y-4">
                        <div className="grid gap-2">
                          <Label htmlFor="manual-emails">Enter Email Addresses</Label>
                          <Textarea
                            id="manual-emails"
                            placeholder="Enter email addresses, one per line"
                            className="min-h-[150px]"
                            value={customEmails}
                            onChange={(e) => setCustomEmails(e.target.value)}
                          />
                          <p className="text-xs text-gray-500">
                            {customEmails.split('\n').filter(email => email.trim()).length} email addresses
                          </p>
                          <div className="text-xs text-gray-500">
                            <p>Format examples:</p>
                            <p>john@example.com</p>
                            <p>jane@example.com</p>
                          </div>
                        </div>
                      </TabsContent>
                      
                      {/* File import tab */}
                      <TabsContent value="import" className="space-y-4">
                        <div className="flex flex-col gap-4">
                          {!importedFile ? (
                            <div className="border-2 border-dashed rounded-md p-6 text-center">
                              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                              <p className="text-sm text-gray-500 mb-2">
                                Upload a CSV or TXT file with email addresses
                              </p>
                              <p className="text-xs text-gray-400 mb-4">
                                One email per line or comma-separated
                              </p>
                              <div>
                                <label htmlFor="file-upload" className="cursor-pointer">
                                  <div className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium">
                                    Choose File
                                  </div>
                                  <input
                                    id="file-upload"
                                    type="file"
                                    accept=".csv,.txt"
                                    className="sr-only"
                                    onChange={handleFileImport}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="border rounded-md p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <FileText className="h-5 w-5 text-blue-500 mr-2" />
                                  <span className="text-sm font-medium">{importedFile.name}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={clearImportedFile}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <Textarea
                                id="imported-emails"
                                placeholder="Email addresses from imported file"
                                className="min-h-[150px]"
                                value={customEmails}
                                onChange={(e) => setCustomEmails(e.target.value)}
                              />
                              <p className="text-xs text-gray-500 mt-2">
                                {customEmails.split('\n').filter(email => email.trim()).length} email addresses
                              </p>
                            </div>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                  
                  {/* Email count indicator */}
                  <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <Mail className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Custom Recipients</p>
                      <p className="text-sm text-gray-500">
                        {customEmails ? 
                          `${customEmails.split('\n').filter(email => email.trim()).length} custom email addresses` : 
                          'No custom emails added yet'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Quick add single email */}
                  <div className="border-t pt-4">
                    <Label htmlFor="quick-add-email" className="mb-2 block">Quick Add Email</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="quick-add-email" 
                        type="email" 
                        placeholder="email@example.com" 
                        className="flex-1"
                        value={quickAddEmail}
                        onChange={(e) => setQuickAddEmail(e.target.value)}
                      />
                      <Button 
                        type="button" 
                        onClick={handleQuickAddEmail}
                        disabled={!quickAddEmail || !quickAddEmail.includes('@')}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
              <CardDescription>
                Choose when to send your campaign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="send-now" checked={true} />
                <Label htmlFor="send-now" className="text-sm font-medium">
                  Send immediately
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="send-later" checked={false} />
                <Label htmlFor="send-later" className="text-sm font-medium">
                  Schedule for later
                </Label>
              </div>
              
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <Clock className="h-5 w-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Send immediately</p>
                  <p className="text-sm text-gray-500">Your campaign will be sent as soon as you click "Send"</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Campaign Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2"
                onClick={handleSaveDraft}
              >
                <Save className="h-4 w-4" />
                Save as Draft
              </Button>
              
              <Button 
                id="send-campaign-btn"
                className="w-full justify-start gap-2"
                onClick={handleSendCampaign}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Campaign
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Template Preview Modal */}
      <EmailTemplatePreview 
        isOpen={showPreview} 
        onClose={() => setShowPreview(false)} 
        template={selectedTemplate}
        campaignData={{
          subject,
          fromName,
          fromEmail,
          content: emailContent,
          customization: templateCustomization
        }}
      />
      
      {/* Send Confirmation Dialog */}
      <AlertDialog open={showSendConfirmation} onOpenChange={setShowSendConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Campaign</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to send this campaign? This action cannot be undone.
                
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="font-medium">Campaign Details:</div>
                  <ul className="text-sm mt-2 space-y-1">
                    <li><span className="font-medium">Name:</span> {campaignName}</li>
                    <li><span className="font-medium">Subject:</span> {subject}</li>
                    <li><span className="font-medium">From:</span> {fromName} &lt;{fromEmail}&gt;</li>
                    <li><span className="font-medium">Template:</span> {selectedTemplate?.name}</li>
                    <li>
                      <span className="font-medium">Recipients:</span> {audienceTab === "segments" 
                        ? `${audience === 'all' ? '25' : audience === 'active' ? '18' : audience === 'new' ? '7' : '5'} customers` 
                        : `${customEmails.split('\n').filter(email => email.trim()).length} custom email addresses`}
                    </li>
                  </ul>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSendCampaign}>
              Send Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Debug Panel */}
      <Dialog 
        open={showDebugInfo} 
        onOpenChange={(open) => {
          if (open) {
            // Store the currently focused element before opening the dialog
            previousFocusRef.current = document.activeElement as HTMLElement;
          } else {
            // Restore focus to the previously focused element when closing
            setTimeout(() => {
              if (previousFocusRef.current) {
                previousFocusRef.current.focus();
              } else {
                document.getElementById('send-campaign-btn')?.focus();
              }
            }, 100);
          }
          setShowDebugInfo(open);
        }}
      >
        <DialogContent 
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          aria-hidden={undefined}
          inert={undefined}
        >
          <DialogHeader>
            <DialogTitle>Email Campaign Debug Information</DialogTitle>
            <DialogDescription>
              Detailed information about the email sending process
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-blue-50">
                Total: {sendingStatus.total}
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                Success: {sendingStatus.success}
              </Badge>
              <Badge variant="outline" className="bg-red-50 text-red-700">
                Failed: {sendingStatus.failed}
              </Badge>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setDebugLogs([])}
              disabled={debugLogs.length === 0}
            >
              Clear Logs
            </Button>
          </div>
          
          <ScrollArea className="h-[400px] border rounded-md p-4 bg-black text-white font-mono text-sm">
            {debugLogs.length === 0 ? (
              <div className="text-gray-400 text-center py-8">No logs yet</div>
            ) : (
              <div className="space-y-1">
                {debugLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`
                      ${log.type === 'error' ? 'text-red-400' : ''}
                      ${log.type === 'success' ? 'text-green-400' : ''}
                      ${log.type === 'info' ? 'text-blue-400' : ''}
                      ${log.type === 'data' ? 'text-yellow-400 whitespace-pre-wrap' : ''}
                    `}
                  >
                    <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowDebugInfo(false)}>
              Close
            </Button>
            {!isLoading && sendingStatus.total > 0 && (
              <Button 
                variant="default" 
                className="ml-2"
                onClick={() => router.push('/email')}
              >
                Go to Campaigns
              </Button>
            )}
          </div>
          
          {/* Add this button to your UI, perhaps in the debug panel or near the send button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkMailchimpConnection}
            className="ml-2"
          >
            Test Mailchimp Connection
          </Button>
          
          {/* Add a button to show common solutions */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={showCommonSolutions}
            className="ml-2"
          >
            Show Common Solutions
          </Button>
          
          {/* Add a button for this function */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkCommonMailchimpIssues}
            className="ml-2"
          >
            Check Common Issues
          </Button>
          
          {/* Add a button for this function */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkMailchimpAudience}
            className="ml-2"
          >
            Check Audience
          </Button>
          
          {/* Add a button for this function */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addTestSubscriber}
            className="ml-2"
          >
            Add Test Subscriber
          </Button>
          
          {/* Add a button for this function */}
          {campaignResult && campaignResult.campaignId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => trySendDirectly(campaignResult.campaignId)}
              className="ml-2"
            >
              Try Direct Send
            </Button>
          )}
          
          {/* Add this button when a campaign ID is available */}
          {campaignResult && campaignResult.campaignId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => checkCampaignStatus(campaignResult.campaignId)}
              className="ml-2"
            >
              Check Status
            </Button>
          )}
          
          {/* Add a button for this function */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={testSimpleApi}
            className="ml-2"
          >
            Test Simple API
          </Button>
          
          {/* Add a button for this function */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={manualSendCampaign}
            className="ml-2"
          >
            Manual Send
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
} 