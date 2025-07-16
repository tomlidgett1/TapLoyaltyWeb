"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search, 
  Archive, 
  Trash2, 
  Star, 
  Reply, 
  Forward, 
  MoreHorizontal,
  Paperclip,
  ReplyAll,
  ArrowLeft,
  Inbox,
  Edit3,
  Shield,
  Check,
  Plus,
  Send,
  RefreshCw
} from "lucide-react"
import { useState } from "react"
import Image from "next/image"

// Mock email data
const emails = [
  {
    id: 1,
    sender: "John Doe",
    email: "john@example.com",
    subject: "Meeting reminder for tomorrow",
    preview: "Don't forget about our meeting scheduled for 2 PM tomorrow. Please bring the quarterly reports...",
    content: `Hi there,

I hope this email finds you well. I wanted to send you a quick reminder about our meeting scheduled for tomorrow (Tuesday) at 2:00 PM in Conference Room B.

Please make sure to bring:
• Q4 financial reports
• Project timeline updates  
• Budget allocation spreadsheet

Looking forward to our discussion about the upcoming product launch and marketing strategy.

Best regards,
John Doe
Senior Project Manager`,
    time: "2:30 PM",
    read: false,
    starred: true,
    hasAttachment: false,
    folder: "inbox"
  },
  {
    id: 2,
    sender: "Sarah Wilson",
    email: "sarah@company.com", 
    subject: "Project update - Q4 deliverables",
    preview: "Hi team, I wanted to share an update on our Q4 deliverables. We're making good progress...",
    content: `Hi team,

I wanted to share an update on our Q4 deliverables. We're making good progress on all fronts:

✅ Website redesign - 85% complete
✅ Mobile app updates - 70% complete  
🔄 Marketing campaign - In progress
⏳ User testing - Starting next week

The team has been working incredibly hard, and I'm confident we'll meet our December deadline. 

I've attached the detailed project timeline for your review.

Thanks for your continued dedication!

Sarah Wilson
Product Manager`,
    time: "1:15 PM",
    read: true,
    starred: false,
    hasAttachment: true,
    folder: "inbox"
  },
  {
    id: 3,
    sender: "Marketing Team",
    email: "marketing@company.com",
    subject: "New campaign launch next week",
    preview: "Exciting news! We're launching our new customer acquisition campaign next Monday...",
    content: `Team,

Exciting news! We're launching our new customer acquisition campaign next Monday, and I wanted to make sure everyone is aligned on the key details.

Campaign Overview:
• Launch Date: Monday, November 20th
• Duration: 4 weeks
• Target: New customers aged 25-45
• Budget: $50,000
• Expected ROI: 300%

Key deliverables this week:
- Final creative assets (Due: Friday)
- Landing page optimization (Due: Thursday)  
- Email sequences setup (Due: Wednesday)

Let's make this our most successful campaign yet!

Marketing Team`,
    time: "11:45 AM",
    read: false,
    starred: false,
    hasAttachment: false,
    folder: "inbox"
  },
  {
    id: 4,
    sender: "Spam Bot",
    email: "noreply@spamsite.com",
    subject: "Congratulations! You've won $1,000,000!",
    preview: "Click here to claim your prize! Limited time offer...",
    content: "This is obviously spam content...",
    time: "9:00 AM",
    read: false,
    starred: false,
    hasAttachment: false,
    folder: "spam"
  },
  {
    id: 5,
    sender: "Me",
    email: "me@company.com",
    subject: "Draft: Quarterly review notes",
    preview: "Need to finish writing the quarterly review...",
    content: "This is a draft email that hasn't been sent yet...",
    time: "Yesterday",
    read: false,
    starred: false,
    hasAttachment: false,
    folder: "drafts"
  }
]

export default function EmailPage() {
  const [selectedFolder, setSelectedFolder] = useState("inbox")
  const [selectedEmail, setSelectedEmail] = useState<typeof emails[0] | null>(null)
  const [selectedAccount, setSelectedAccount] = useState("gmail")
  const [composeMode, setComposeMode] = useState<"none" | "reply" | "replyAll" | "forward">("none")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeContent, setComposeContent] = useState("")
  const [composeTo, setComposeTo] = useState("")

  const filteredEmails = emails.filter(email => {
    if (selectedFolder === "inbox") return email.folder === "inbox"
    if (selectedFolder === "spam") return email.folder === "spam"
    if (selectedFolder === "trash") return email.folder === "trash"
    if (selectedFolder === "drafts") return email.folder === "drafts"
    return true
  })

  const handleReply = (email: typeof emails[0]) => {
    setComposeMode("reply")
    setComposeTo(email.email)
    setComposeSubject(`Re: ${email.subject}`)
    setComposeContent(`\n\n---\nOn ${email.time}, ${email.sender} <${email.email}> wrote:\n\n${email.content}`)
  }

  const handleReplyAll = (email: typeof emails[0]) => {
    setComposeMode("replyAll")
    setComposeTo(email.email)
    setComposeSubject(`Re: ${email.subject}`)
    setComposeContent(`\n\n---\nOn ${email.time}, ${email.sender} <${email.email}> wrote:\n\n${email.content}`)
  }

  const handleForward = (email: typeof emails[0]) => {
    setComposeMode("forward")
    setComposeTo("")
    setComposeSubject(`Fwd: ${email.subject}`)
    setComposeContent(`\n\n---\nForwarded message from ${email.sender} <${email.email}>:\n\nSubject: ${email.subject}\nDate: ${email.time}\n\n${email.content}`)
  }

  const handleSend = () => {
    // Here you would typically send the email to your backend
    console.log("Sending email:", { to: composeTo, subject: composeSubject, content: composeContent })
    
    // Reset compose mode
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
  }

  const handleCancelCompose = () => {
    setComposeMode("none")
    setComposeSubject("")
    setComposeContent("")
    setComposeTo("")
  }

  const handleArchive = () => {
    if (selectedEmail) {
      console.log("Archiving email:", selectedEmail.id)
      // Here you would typically update the email status in your backend
    }
  }

  const handleDelete = () => {
    if (selectedEmail) {
      console.log("Deleting email:", selectedEmail.id)
      // Here you would typically move the email to trash or delete it
      setSelectedEmail(null)
    }
  }

  const handleMarkAsSpam = () => {
    if (selectedEmail) {
      console.log("Marking as spam:", selectedEmail.id)
      // Here you would typically move the email to spam folder
      setSelectedEmail(null)
    }
  }

  const handleSync = () => {
    console.log("Syncing emails...")
    // Here you would typically sync with the email server
  }

  const handleComposeNew = () => {
    setComposeMode("reply") // Use reply mode for new compose
    setComposeTo("")
    setComposeSubject("")
    setComposeContent("")
  }

  const handleEmailSelect = (email: typeof emails[0]) => {
    setSelectedEmail(email)
    // Mark email as read when selected
    email.read = true
  }

  const toggleStar = (emailId: number, event: React.MouseEvent) => {
    event.stopPropagation()
    const email = emails.find(e => e.id === emailId)
    if (email) {
      email.starred = !email.starred
      console.log(`${email.starred ? 'Starred' : 'Unstarred'} email:`, email.subject)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Combined Header with folder dropdown, toolbar, and connected account */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-300">
        <div className="flex items-center gap-4">
          {/* Folder Dropdown */}
          <Select value={selectedFolder} onValueChange={setSelectedFolder}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inbox">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4" />
                  <span>Inbox</span>
                </div>
              </SelectItem>
              <SelectItem value="spam">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Spam</span>
                </div>
              </SelectItem>
              <SelectItem value="trash">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Trash</span>
                </div>
              </SelectItem>
              <SelectItem value="drafts">
                <div className="flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  <span>Drafts</span>
        </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Toolbar Actions */}
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleComposeNew} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Email</p>
                </TooltipContent>
              </Tooltip>
              
              <div className="h-6 w-px bg-gray-300 mx-1"></div>
              
              {selectedEmail && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleReply(selectedEmail)} className="text-gray-700 hover:bg-gray-200">
                        <Reply className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reply</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleReplyAll(selectedEmail)} className="text-gray-700 hover:bg-gray-200">
                        <ReplyAll className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reply All</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleForward(selectedEmail)} className="text-gray-700 hover:bg-gray-200">
                        <Forward className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Forward</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <div className="h-6 w-px bg-gray-300 mx-1"></div>
                </>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleDelete} className="text-gray-700 hover:bg-gray-200">
                    <Trash2 className="h-4 w-4" />
        </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleArchive} className="text-gray-700 hover:bg-gray-200">
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Archive</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={handleSync} className="text-gray-700 hover:bg-gray-200">
                    <RefreshCw className="h-4 w-4" />
                </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sync</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
              </div>

        <div className="flex items-center gap-2">
          {/* Connected Account Selector */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-64 h-8 text-sm">
              <SelectValue>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex-shrink-0">
                    <Image 
                      src={selectedAccount === "gmail" ? "/gmailnew.png" : "/outlook.png"}
                      alt={selectedAccount === "gmail" ? "Gmail" : "Outlook"}
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-sm text-gray-700">
                    {selectedAccount === "gmail" ? "john.doe@gmail.com" : "john.doe@outlook.com"}
                  </span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gmail">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex-shrink-0">
                    <Image 
                      src="/gmailnew.png"
                      alt="Gmail"
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                        </div>
                  <span>john.doe@gmail.com</span>
                  {selectedAccount === "gmail" && <Check className="h-4 w-4 text-blue-500 ml-2" />}
                      </div>
              </SelectItem>
              <SelectItem value="outlook">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex-shrink-0">
                    <Image 
                      src="/outlook.png"
                      alt="Outlook"
                      width={24}
                      height={24}
                      className="w-full h-full object-contain"
                    />
                        </div>
                  <span>john.doe@outlook.com</span>
                  {selectedAccount === "outlook" && <Check className="h-4 w-4 text-blue-500 ml-2" />}
                </div>
              </SelectItem>
              <Separator className="my-1" />
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add New Account</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button variant="ghost" size="sm" className="h-9 px-2 text-gray-600 hover:bg-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

        {/* Main Content */}
        <div className="flex flex-1">
          {/* Left Panel - Email List */}
          <div className="w-2/5 border-r border-gray-200 flex flex-col">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search emails..."
                  className="pl-10"
                />
              </div>
            </div>

          {/* Email list */}
          <div className="flex-1 overflow-auto">
            <div className="divide-y divide-gray-200">
              {filteredEmails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                    !email.read ? 'bg-blue-50/30' : ''
                  } ${selectedEmail?.id === email.id ? 'bg-blue-100 border-r-2 border-blue-500' : ''}`}
                  onClick={() => handleEmailSelect(email)}
                >
                  {/* Star */}
                  <button 
                    className="text-gray-400 hover:text-yellow-500 transition-colors duration-200"
                    onClick={(e) => toggleStar(email.id, e)}
                  >
                    <Star className={`h-4 w-4 ${email.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </button>

                  {/* Email content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm truncate ${!email.read ? 'font-semibold' : 'font-medium'}`}>
                        {email.sender}
                      </span>
                      {email.hasAttachment && (
                        <Paperclip className="h-3 w-3 text-gray-400 flex-shrink-0" />
                      )}
                      <span className="text-xs text-gray-500 ml-auto">{email.time}</span>
                    </div>
                    <div className={`text-sm truncate ${!email.read ? 'font-semibold' : 'font-medium'} mb-1`}>
                      {email.subject}
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {email.preview}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!email.read && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  )}
                </div>
              ))}
                </div>
              </div>

          {/* Email stats footer */}
          <div className="p-4 border-t bg-gray-50 text-center">
            <div className="text-sm text-gray-600">
              Showing {filteredEmails.length} emails • {filteredEmails.filter(e => !e.read).length} unread
            </div>
          </div>
              </div>

        {/* Right Panel - Email Content */}
        <div className="flex-1 flex flex-col">
          {composeMode !== "none" ? (
            /* Compose Interface */
            <div key="compose" className="p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  {composeMode === "reply" && "Reply"}
                  {composeMode === "replyAll" && "Reply All"}
                  {composeMode === "forward" && "Forward"}
                </h2>
                <div className="flex gap-2">
                  <Button onClick={handleSend} size="sm" className="transition-all duration-200 hover:scale-105">
                    <Send className="h-4 w-4 mr-1" />
                    Send
                  </Button>
                  <Button variant="outline" onClick={handleCancelCompose} size="sm" className="transition-all duration-200 hover:scale-105">
                    Cancel
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">To</label>
                  <Input 
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      placeholder="Enter recipient email"
                      className="rounded-md"
                  />
                </div>
                
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                  <Input 
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      placeholder="Email subject"
                      className="rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Message</label>
                    <Textarea
                      value={composeContent}
                      onChange={(e) => setComposeContent(e.target.value)}
                      placeholder="Type your message here..."
                      className="min-h-[300px] rounded-md"
                    />
                  </div>
                </div>
            </div>
                    ) : selectedEmail ? (
            /* Email Viewer */
            <div key={`email-${selectedEmail.id}`} className="p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedEmail.sender}`} />
                    <AvatarFallback className="rounded-md">{selectedEmail.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{selectedEmail.sender}</div>
                    <div className="text-sm text-gray-500">{selectedEmail.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleReply(selectedEmail)} 
                    className="rounded-md transition-all duration-200 hover:scale-105"
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleReplyAll(selectedEmail)} 
                    className="rounded-md transition-all duration-200 hover:scale-105"
                  >
                    <ReplyAll className="h-4 w-4 mr-2" />
                    Reply All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleForward(selectedEmail)} 
                    className="rounded-md transition-all duration-200 hover:scale-105"
                  >
                    <Forward className="h-4 w-4 mr-2" />
                    Forward
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-md">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="border-b pb-4 mb-6">
                <h1 className="text-xl font-semibold mb-2">{selectedEmail.subject}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{selectedEmail.time}</span>
                  {selectedEmail.hasAttachment && (
                    <div className="flex items-center gap-1">
                      <Paperclip className="h-4 w-4" />
                      <span>Has attachment</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                  {selectedEmail.content}
                </pre>
              </div>
            </div>
          ) : (
            /* No Email Selected */
            <div key="no-email" className="flex-1 flex items-center justify-center animate-fade-in">
              <div className="text-center text-gray-500">
                <div className="text-lg font-medium mb-2">No email selected</div>
                <div className="text-sm">Choose an email from the list to view its content</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 