"use client"

import { useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { 
  Mail, 
  Smartphone, 
  QrCode, 
  Link as LinkIcon, 
  Copy, 
  Share2, 
  ArrowLeft,
  CheckCircle2,
  Send,
  Download,
  Printer,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  X
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import Image from "next/image"

export default function InviteCustomersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()
  const [inviteMethod, setInviteMethod] = useState<string>("qr")
  const [email, setEmail] = useState<string>("")
  const [phone, setPhone] = useState<string>("")
  const [emails, setEmails] = useState<string[]>([])
  const [phones, setPhones] = useState<string[]>([])
  const [isCopied, setIsCopied] = useState<boolean>(false)
  
  // Generate a unique invite link for this merchant
  const inviteLink = `https://tap.app/join/${user?.uid || 'demo'}`
  
  // For demo purposes, we'll use a placeholder QR code image
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setIsCopied(true)
    toast({
      title: "Link copied!",
      description: "The invite link has been copied to your clipboard.",
    })
    setTimeout(() => setIsCopied(false), 2000)
  }
  
  const handleAddEmail = () => {
    if (email && !emails.includes(email)) {
      setEmails([...emails, email])
      setEmail("")
    }
  }
  
  const handleAddPhone = () => {
    if (phone && !phones.includes(phone)) {
      setPhones([...phones, phone])
      setPhone("")
    }
  }
  
  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove))
  }
  
  const handleRemovePhone = (phoneToRemove: string) => {
    setPhones(phones.filter(p => p !== phoneToRemove))
  }
  
  const handleSendInvites = () => {
    // In a real app, this would send the invites via email/SMS
    toast({
      title: "Invites sent!",
      description: `Sent ${emails.length} email invites and ${phones.length} SMS invites.`,
    })
    setEmails([])
    setPhones([])
  }
  
  const handleDownloadQR = () => {
    // Create a temporary link to download the QR code
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = 'loyalty-qr-code.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast({
      title: "QR Code downloaded!",
      description: "You can now print or share this QR code with your customers.",
    })
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Invite Customers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Grow your loyalty program by inviting customers to join
            </p>
          </div>
          
          <Button 
            variant="ghost" 
            className="h-9 gap-2 rounded-md"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="rounded-lg overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle>Invite Methods</CardTitle>
              <CardDescription>
                Choose how you want to invite customers to your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="qr" onValueChange={setInviteMethod}>
                <TabsList className="grid grid-cols-4 h-auto p-1 mb-6">
                  <TabsTrigger value="qr" className="flex flex-col items-center gap-1 py-3 px-4">
                    <QrCode className="h-5 w-5" />
                    <span className="text-xs">QR Code</span>
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex flex-col items-center gap-1 py-3 px-4">
                    <LinkIcon className="h-5 w-5" />
                    <span className="text-xs">Share Link</span>
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex flex-col items-center gap-1 py-3 px-4">
                    <Mail className="h-5 w-5" />
                    <span className="text-xs">Email</span>
                  </TabsTrigger>
                  <TabsTrigger value="sms" className="flex flex-col items-center gap-1 py-3 px-4">
                    <Smartphone className="h-5 w-5" />
                    <span className="text-xs">SMS</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="qr" className="mt-0">
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                      <img 
                        src={qrCodeUrl}
                        alt="QR Code for loyalty program"
                        width={200}
                        height={200}
                      />
                    </div>
                    <p className="text-sm text-center mt-4 mb-6 text-muted-foreground max-w-md">
                      Display this QR code in your store. Customers can scan it with their phone camera to join your loyalty program.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        variant="outline" 
                        className="h-9 gap-2 rounded-md"
                        onClick={handleDownloadQR}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        variant="outline" 
                        className="h-9 gap-2 rounded-md"
                        onClick={() => window.print()}
                      >
                        <Printer className="h-4 w-4" />
                        Print
                      </Button>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="link" className="mt-0">
                  <div className="flex flex-col">
                    <p className="text-sm mb-4 text-muted-foreground">
                      Share this link with your customers via social media, your website, or in person.
                    </p>
                    <div className="flex items-center gap-2 mb-6">
                      <Input 
                        value={inviteLink}
                        readOnly
                        className="h-10 font-mono text-sm"
                      />
                      <Button 
                        variant="outline" 
                        className="h-10 gap-2 rounded-md flex-shrink-0"
                        onClick={handleCopyLink}
                      >
                        {isCopied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-3">Share on social media</h3>
                      <div className="flex gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 border-[#1877F2]/20">
                          <Facebook className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 border-[#1DA1F2]/20">
                          <Twitter className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F]/20 border-[#E4405F]/20">
                          <Instagram className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 border-[#0A66C2]/20">
                          <Linkedin className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="email" className="mt-0">
                  <div className="flex flex-col">
                    <p className="text-sm mb-4 text-muted-foreground">
                      Send email invitations to your customers to join your loyalty program.
                    </p>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <Input 
                        type="email"
                        placeholder="customer@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-10"
                      />
                      <Button 
                        variant="outline" 
                        className="h-10 gap-2 rounded-md flex-shrink-0"
                        onClick={handleAddEmail}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {emails.length > 0 && (
                      <div className="border rounded-md p-3 mb-4">
                        <h3 className="text-sm font-medium mb-2">Recipients ({emails.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {emails.map((e) => (
                            <div key={e} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                              <span>{e}</span>
                              <button 
                                onClick={() => handleRemoveEmail(e)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="h-9 gap-2 rounded-md mt-2 self-end"
                      disabled={emails.length === 0}
                      onClick={handleSendInvites}
                    >
                      <Send className="h-4 w-4" />
                      Send Invites
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="sms" className="mt-0">
                  <div className="flex flex-col">
                    <p className="text-sm mb-4 text-muted-foreground">
                      Send SMS invitations to your customers to join your loyalty program.
                    </p>
                    
                    <div className="flex items-center gap-2 mb-4">
                      <Input 
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-10"
                      />
                      <Button 
                        variant="outline" 
                        className="h-10 gap-2 rounded-md flex-shrink-0"
                        onClick={handleAddPhone}
                      >
                        Add
                      </Button>
                    </div>
                    
                    {phones.length > 0 && (
                      <div className="border rounded-md p-3 mb-4">
                        <h3 className="text-sm font-medium mb-2">Recipients ({phones.length})</h3>
                        <div className="flex flex-wrap gap-2">
                          {phones.map((p) => (
                            <div key={p} className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-xs">
                              <span>{p}</span>
                              <button 
                                onClick={() => handleRemovePhone(p)}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      className="h-9 gap-2 rounded-md mt-2 self-end"
                      disabled={phones.length === 0}
                      onClick={handleSendInvites}
                    >
                      <Send className="h-4 w-4" />
                      Send Invites
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card className="rounded-lg overflow-hidden">
            <CardHeader className="py-4">
              <CardTitle>Tips for Success</CardTitle>
              <CardDescription>
                Best practices for growing your loyalty program
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Place QR codes at checkout</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Make it easy for customers to join while they're making a purchase.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Offer a welcome bonus</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Give new members points or a discount on their first purchase.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Train your staff</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ensure your team can explain the benefits of joining your loyalty program.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Promote on social media</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share your loyalty program on your social channels to reach more customers.
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 