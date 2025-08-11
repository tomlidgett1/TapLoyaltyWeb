"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  ChevronDown,
  Gift,
  Star,
  RotateCcw,
  Image as ImageIcon,
  Zap,
  Bot,
  ExternalLink,
  MessageSquare,
  FileText,
  Info,
  Plus,
  Settings as SettingsIcon,
  Repeat
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, limit, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { IntroductoryRewardPopup } from "@/components/introductory-reward-popup"
import { CreateRewardPopup } from "@/components/create-reward-popup"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { CreatePointsRulePopup } from "@/components/create-points-rule-popup"
import { WelcomePopup } from "@/components/welcome-popup"
import { CreateManualProgramDialog } from "@/components/create-manual-program-dialog"
import { SettingsDialog } from "@/components/settings-dialog"

// Import Create Agent Modal Component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogPortal,
} from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Clock,
  X,
  Wand2,
  Puzzle,
  CheckCircle,
  Loader2,
  Bug,
  AlignLeft
} from "lucide-react"
import { getFunctions, httpsCallable } from "firebase/functions"
import { addDoc, updateDoc, deleteDoc, orderBy } from "firebase/firestore"

interface ChecklistItem {
  id: string
  title: string
  description: string
  icon: any
  completed: boolean
  category: 'loyalty' | 'merchant'
  actionType: 'popup' | 'url'
  actionUrl?: string
  actionText: string
  popupAction?: () => void
}

interface AgentSchedule {
  frequency: string
  time: string
  days: string[]
  selectedDay: string
}

export default function GetStartedPage() {
  const { user, shouldShowWelcome, clearWelcomeFlag } = useAuth()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [accountType, setAccountType] = useState<'standard' | 'network'>('standard')
  const [pageLoaded, setPageLoaded] = useState(false)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)
  
  // Logo upload states
  const [merchantLogoUrl, setMerchantLogoUrl] = useState<string | null>(null)
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)
  
  // Popup states
  const [showIntroductoryReward, setShowIntroductoryReward] = useState(false)
  const [showCreateReward, setShowCreateReward] = useState(false)
  const [showCreateProgram, setShowCreateProgram] = useState(false)
  const [showCreateBanner, setShowCreateBanner] = useState(false)
  const [showCreatePointsRule, setShowCreatePointsRule] = useState(false)
  // Removed network reward popup state
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsActiveSection, setSettingsActiveSection] = useState("Memberships")
  
  // Program type selector states
  const [programTypeSelectorOpen, setProgramTypeSelectorOpen] = useState(false)
  const [createManualProgramOpen, setCreateManualProgramOpen] = useState(false)
  const [createRecurringOpen, setCreateRecurringOpen] = useState(false)

  // Create Agent Modal States
  const [isCreateAgentModalOpen, setIsCreateAgentModalOpen] = useState(false)
  const [createAgentForm, setCreateAgentForm] = useState({ name: 'New Agent', steps: [''] })
  const [createAgentSchedule, setCreateAgentSchedule] = useState<AgentSchedule>({ frequency: '', time: '12:00', days: [], selectedDay: '' })
  const [selectedTools, setSelectedTools] = useState(new Set())
  const [toolsSearchQuery, setToolsSearchQuery] = useState('')
  const [smartCreatePrompt, setSmartCreatePrompt] = useState('')
  const [showSmartCreateInput, setShowSmartCreateInput] = useState(false)
  const [agentCanvasContent, setAgentCanvasContent] = useState('')
  const [showToolsDropdown, setShowToolsDropdown] = useState(false)
  const [toolsDropdownQuery, setToolsDropdownQuery] = useState('')
  const [selectedToolIndex, setSelectedToolIndex] = useState(0)
  const [filteredTools, setFilteredTools] = useState([])
  const [atMentionPosition, setAtMentionPosition] = useState(0)
  const [createAgentDebugResponse, setCreateAgentDebugResponse] = useState(null)
  const [isInquiriesLoggerMode, setIsInquiriesLoggerMode] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    sendToInbox: true,
    sendViaEmail: false,
    emailAddress: '',
    emailFormat: "professional"
  })
  const [isEditingAgentName, setIsEditingAgentName] = useState(false)
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false)
  const [showToolsInLeftPanel, setShowToolsInLeftPanel] = useState(false)
  const [composioTools, setComposioTools] = useState([])
  const [toolsLoading, setToolsLoading] = useState(false)
  const [isGeneratingSteps, setIsGeneratingSteps] = useState(false)
  const [agentDescription, setAgentDescription] = useState('')
  const [isEditingCanvas, setIsEditingCanvas] = useState(true)
  const [showDebugDialog, setShowDebugDialog] = useState(false)
  const [selectedCustomAgent, setSelectedCustomAgent] = useState(null)
  const [customAgents, setCustomAgents] = useState([])
  const [isCreatingAgent, setIsCreatingAgent] = useState(false)

  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
    {
      id: 'upload-logo',
      title: 'Upload Your Logo',
      description: 'Upload your business logo to personalise your loyalty program and make it recognisable to your customers.',
      icon: ImageIcon,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Upload',
      popupAction: () => triggerFileUpload()
    },
    {
      id: 'intro-reward',
      title: 'Create an Introductory Reward',
      description: 'Welcome new customers with a special reward that gets them excited about your loyalty program. This could be a discount, free item, or bonus points to encourage their first purchase.',
      icon: Star,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setShowIntroductoryReward(true)
    },
    {
      id: 'individual-reward',
      title: 'Create Basic Reward',
      description: 'Set up rewards that customers can redeem with their earned points. These could be discounts, free products, or special perks that keep customers coming back.',
      icon: Gift,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setShowCreateReward(true)
    },
    {
      id: 'create-program',
      title: 'Create Program',
      description: 'Design your complete loyalty program structure. Define how customers earn points, what rewards are available, and set the rules that govern your program.',
      icon: RotateCcw,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setProgramTypeSelectorOpen(true)
    },
    {
      id: 'membership-tiers',
      title: 'Set Membership Tiers',
      description: 'Create different membership levels for your loyalty program. Set tier requirements, benefits, and rewards to encourage customers to reach higher levels.',
      icon: Star,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => {
        setSettingsActiveSection("Memberships")
        setShowSettingsDialog(true)
      }
    },
    {
      id: 'create-banner',
      title: 'Create Banner',
      description: 'Design an eye-catching banner to promote your loyalty program. This will be displayed to customers to encourage them to join and participate.',
      icon: ImageIcon,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setShowCreateBanner(true)
    },
    {
      id: 'points-rule',
      title: 'Create Points Rule',
      description: 'Define how customers earn points in your program. Set rules for purchases, referrals, social media engagement, or other activities that reward customer loyalty.',
      icon: Zap,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setShowCreatePointsRule(true)
    },
    // Removed network reward card per request
    {
      id: 'setup-customer-service',
      title: 'Setup Customer Service Email Agent',
      description: 'Configure an AI agent to automatically respond to customer service emails and provide quick, helpful support.',
      icon: 'gmail',
      completed: false,
      category: 'merchant',
      actionType: 'url',
      actionUrl: '/dashboard/agents',
      actionText: 'Setup'
    },
    {
      id: 'email-summary-agent',
      title: 'Email Summary Agent',
      description: 'Create an agent that provides daily or weekly summaries of customer interactions, sales data, and loyalty program activity.',
      icon: 'outlook',
      completed: false,
      category: 'merchant',
      actionType: 'url',
      actionUrl: '/dashboard/agents',
      actionText: 'Setup'
    },
    {
      id: 'create-manual-agent',
      title: 'Create Manual Agent',
      description: 'Set up a manual agent to handle customer inquiries and support requests through your preferred communication channels.',
      icon: Bot,
      completed: false,
      category: 'merchant',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setIsCreateAgentModalOpen(true)
    }
  ])

  // Helper functions for Create Agent Modal
  const capitaliseFirstLetter = (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  const renderTextWithTools = (text: string) => {
    return text
  }

  const insertToolMention = (tool: any) => {
    // Tool mention insertion logic
  }

  // Real-time completion status checker
  const updateCompletionStatus = useCallback((merchantData: any) => {
    if (!merchantData) return

    // Check all completion statuses
    const hasLogo = !!merchantData.logoUrl
    const hasIntroRewards = merchantData.introductoryRewardIds && Array.isArray(merchantData.introductoryRewardIds) && merchantData.introductoryRewardIds.length > 0
    
    // Check for active programs
    const hasActiveTransactionRewards = merchantData.transactionRewards && Array.isArray(merchantData.transactionRewards) && 
      merchantData.transactionRewards.some((program: any) => program.active === true)
    const hasActiveVoucherPrograms = merchantData.voucherPrograms && Array.isArray(merchantData.voucherPrograms) && 
      merchantData.voucherPrograms.some((program: any) => program.active === true)
    const hasActiveCoffeePrograms = merchantData.coffeePrograms && Array.isArray(merchantData.coffeePrograms) && 
      merchantData.coffeePrograms.some((program: any) => program.active === true)
    const hasActivePrograms = hasActiveTransactionRewards || hasActiveVoucherPrograms || hasActiveCoffeePrograms

    setChecklistItems(prev => {
      const updated = prev.map(item => {
        switch (item.id) {
          case 'upload-logo':
            return { ...item, completed: hasLogo }
          case 'intro-reward':
            return { ...item, completed: hasIntroRewards }
          case 'create-program':
            return { ...item, completed: hasActivePrograms }
          default:
            // Other items are handled by their respective listeners
            return item
        }
      })
      
      return updated
    })

    // Update logo state
    if (hasLogo) {
      setMerchantLogoUrl(merchantData.logoUrl)
    }
  }, [])

  useEffect(() => {
    if (!user?.uid) return

    // Set up real-time listener for merchant document  
    const unsubscribe = onSnapshot(
      doc(db, 'merchants', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          updateCompletionStatus(data)
        }
      },
      (error) => {
        console.error('Error listening to merchant document:', error)
      }
    )

    // Also set up listeners for other collections to check completion status
    const unsubscribeRewards = onSnapshot(
      collection(db, `merchants/${user.uid}/rewards`),
      (snapshot) => {
        const rewards = snapshot.docs.map(doc => doc.data())
        
        // Check for individual rewards (not network rewards)
        const hasIndividualRewards = rewards.some(reward => !reward.isNetworkReward)
        
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'individual-reward') {
            return { ...item, completed: hasIndividualRewards }
          }
          return item
        }))
      },
      (error) => {
        console.error('Error listening to rewards collection:', error)
      }
    )

    const unsubscribeBanners = onSnapshot(
      collection(db, `merchants/${user.uid}/banners`),
      (snapshot) => {
        const hasBanners = !snapshot.empty
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'create-banner') {
            return { ...item, completed: hasBanners }
          }
          return item
        }))
      },
      (error) => {
        console.error('Error listening to banners collection:', error)
      }
    )

    const unsubscribePointsRules = onSnapshot(
      collection(db, `merchants/${user.uid}/pointsRules`),
      (snapshot) => {
        const hasPointsRules = !snapshot.empty
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'points-rule') {
            return { ...item, completed: hasPointsRules }
          }
          return item
        }))
      },
      (error) => {
        console.error('Error listening to points rules collection:', error)
      }
    )

    const unsubscribeMembershipTiers = onSnapshot(
      collection(db, `merchants/${user.uid}/memberships`),
      (snapshot) => {
        // Check if all three required tiers (Bronze, Silver, Gold) exist
        const tiers = snapshot.docs.map(doc => doc.data().name?.toLowerCase())
        const requiredTiers = ['bronze', 'silver', 'gold']
        const hasAllRequiredTiers = requiredTiers.every(tier => tiers.includes(tier))
        
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'membership-tiers') {
            return { ...item, completed: hasAllRequiredTiers }
          }
          return item
        }))
      },
      (error) => {
        console.error('Error listening to membership tiers collection:', error)
      }
    )

    const unsubscribeAgents = onSnapshot(
      collection(db, `merchants/${user.uid}/agents`),
      (snapshot) => {
        const hasAgents = !snapshot.empty
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'create-manual-agent' || item.id === 'setup-customer-service' || item.id === 'email-summary-agent') {
            return { ...item, completed: hasAgents }
          }
          return item
        }))
      },
      (error) => {
        console.error('Error listening to agents collection:', error)
      }
    )

    return () => {
      unsubscribe()
      unsubscribeRewards()
      unsubscribeBanners()
      unsubscribePointsRules()
      unsubscribeMembershipTiers()
      unsubscribeAgents()
    }
  }, [user?.uid, updateCompletionStatus])

  // Handle page load completion and welcome popup
  useEffect(() => {
    // Mark page as loaded after initial render
    const timer = setTimeout(() => {
      setPageLoaded(true)
    }, 100) // Small delay to ensure page is fully rendered

    return () => clearTimeout(timer)
  }, [])

  // Show welcome popup once page is loaded and flag is set
  useEffect(() => {
    if (pageLoaded && shouldShowWelcome) {
      const timer = setTimeout(() => {
        setShowWelcomePopup(true)
        clearWelcomeFlag() // Clear the flag so it doesn't show again
      }, 500) // Additional delay for smooth experience

      return () => clearTimeout(timer)
    }
  }, [pageLoaded, shouldShowWelcome, clearWelcomeFlag])

  // Logo upload functions from setup-popup.tsx
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (PNG, JPG, or SVG)",
          variant: "destructive"
        })
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        })
        return
      }

      setUploadedLogo(file)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
      
      // Auto-upload the file immediately, passing the file directly
      uploadToFirebaseStorage(file)
    }
  }

  const triggerFileUpload = () => {
    const fileInput = document.getElementById('logo-upload-getstarted') as HTMLInputElement
    fileInput?.click()
  }

  const uploadToFirebaseStorage = async (fileToUpload?: File) => {
    const fileToUse = fileToUpload || uploadedLogo
    
    if (!fileToUse || !user?.uid) {
      if (!fileToUse) {
        toast({
          title: "Upload failed",
          description: 'Please select a logo first',
          variant: "destructive"
        })
      } else {
        toast({
          title: "Upload failed", 
          description: 'Authentication required',
          variant: "destructive"
        })
      }
      return
    }

    setIsUploading(true)
    
    try {
      const logoId = uuidv4()
      const storagePath = `merchants/${user.uid}/files/${logoId}`
      
      // Upload to Firebase Storage
      const storageRef = ref(getStorage(), storagePath)
      const uploadTask = uploadBytesResumable(storageRef, fileToUse, { 
        contentType: fileToUse.type || 'application/octet-stream' 
      })
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Handle progress if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            console.log(`Upload progress: ${progress}%`)
          },
          (error) => {
            console.error('Upload error:', error)
            toast({
              title: "Upload failed",
              description: "Please try again",
              variant: "destructive"
            })
            reject(error)
          },
          async () => {
            try {
              // Get download URL after successful upload
              const downloadURL = await getDownloadURL(storageRef)
              
              // Save logo URL to Firestore in merchants/{merchantId} document
              const merchantDocRef = doc(db, `merchants/${user.uid}`)
              await setDoc(merchantDocRef, {
                logoUrl: downloadURL,
                logoUpdatedAt: serverTimestamp()
              }, { merge: true })
              
              setUploadedUrl(downloadURL)
              setMerchantLogoUrl(downloadURL)
              // Clear preview states
              setUploadedLogo(null)
              setLogoPreview(null)
              
              toast({
                title: "Logo uploaded successfully!",
                description: "Your logo has been saved to your account",
              })
              resolve()
            } catch (e) {
              console.error('Error saving logo URL to Firestore:', e)
              toast({
                title: "Upload completed but failed to save",
                description: "Please try again",
                variant: "destructive"
              })
              reject(e)
            }
          }
        )
      })
      
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const toggleItem = (itemId: string) => {
    setOpenItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const loyaltyItems = checklistItems
    .filter(item => item.category === 'loyalty')
    .sort((a, b) => Number(a.completed) - Number(b.completed))
  // Define specific order for merchant items to maintain proper separator placement
  // Remove merchant items section (only Tap Loyalty shown)
  const completedCount = checklistItems.filter(item => item.completed).length

  return (
    <>
      <motion.div 
        className="min-h-screen bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ 
          duration: 0.5,
          ease: "easeOut"
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header Section */}
          <div className="text-center mb-8">
            {/* Tap Logo */}
            <div className="flex justify-center mb-6">
              <img src="/taplogo.png" alt="Tap" className="w-12 h-12 object-contain rounded-[4px]" />
            </div>
            
            {/* Welcome Message */}
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">Let's get started</h1>
            <p className="text-base text-gray-600 max-w-2xl mx-auto mb-2">
              Complete these steps to set up your loyalty program.
            </p>
           
          </div>

          <div className="relative">
            <div className="grid grid-cols-1 gap-4">
              
              {/* Loyalty Tasks Section */}
              <div className="space-y-4">
                {/* Hidden file input for logo upload */}
                <input
                  id="logo-upload-getstarted"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                {/* Task Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loyaltyItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-all duration-200 min-h-[140px] shadow-sm",
                      item.completed && "bg-white"
                    )}
                  >
                    <Collapsible
                      open={openItems.includes(item.id)}
                      onOpenChange={() => toggleItem(item.id)}
                    >
                      <div className="p-4 h-full flex flex-col">
                        {/* Header with icon and status */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 flex items-center justify-center">
                            {item.completed ? (
                              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <item.icon className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          
                          {item.completed && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-green-700 border border-green-200">
                              <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                              Complete
                            </span>
                          )}
                        </div>
                        
                        {/* Title and key points */}
                        <div className="flex-1 mb-4">
                          <h3 className={cn(
                            "text-sm font-medium mb-2",
                            item.completed ? "text-gray-600" : "text-gray-900"
                          )}>{item.title}</h3>
                          <div className="text-xs text-gray-500 space-y-1">
                            {item.id === 'upload-logo' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Personalise your loyalty program</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Make it recognisable to customers</span>
                                </div>
                                {uploadedLogo && !item.completed && (
                                  <div className="flex items-start gap-1 mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                                    <span className="text-blue-600 mt-0.5">📁</span>
                                    <span className="text-blue-700 font-medium">File selected: {uploadedLogo.name}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {item.id === 'intro-reward' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Welcome new customers with special rewards</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Encourage first purchase with incentives</span>
                                </div>
                              </>
                            )}
                            {item.id === 'individual-reward' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Create point-based rewards for customers</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Discounts, free products, or special perks</span>
                                </div>
                              </>
                            )}
                            {item.id === 'create-program' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Design your complete loyalty structure</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Define earning rules and available rewards</span>
                                </div>
                              </>
                            )}
                            {item.id === 'membership-tiers' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Create Bronze, Silver, Gold tiers</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Set tier requirements and benefits</span>
                                </div>
                              </>
                            )}
                            {item.id === 'create-banner' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Design eye-catching promotional banners</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Encourage customers to join your program</span>
                                </div>
                              </>
                            )}
                            {item.id === 'points-rule' && (
                              <>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Set how customers earn points</span>
                                </div>
                                <div className="flex items-start gap-1">
                                  <span className="text-gray-400 mt-0.5">•</span>
                                  <span>Purchases, referrals, social engagement</span>
                                </div>
                              </>
                            )}
                            {/* Network reward card removed */}
                          </div>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-auto">
                          {/* Special handling for logo upload - show status when uploading */}
                          {item.id === 'upload-logo' && isUploading && (
                            <div className="flex items-center gap-2 flex-1 h-8 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
                              <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                              <span className="text-xs text-blue-700 font-medium">Uploading...</span>
                            </div>
                          )}
                          {!item.completed && !isUploading && (
                            <Button 
                              size="sm" 
                              className={cn(
                                "text-xs px-3 py-1.5 text-white flex-1 h-8",
                                "bg-[#007aff] hover:bg-[#339fff]"
                              )}
                              onClick={(e) => {
                                e.stopPropagation()
                                item.popupAction?.()
                              }}
                            >
                              {item.actionText}
                            </Button>
                          )}
                          {item.completed && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs flex-1 h-8"
                              onClick={(e) => {
                                e.stopPropagation()
                                item.popupAction?.()
                              }}
                            >
                              {item.id === 'upload-logo' ? "Change Logo" : "Modify"}
                            </Button>
                          )}
                          
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8 w-8 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ChevronDown 
                                className={cn(
                                  "h-4 w-4 text-gray-400 transition-transform duration-200",
                                  openItems.includes(item.id) && "rotate-180"
                                )} 
                              />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                     
                      <AnimatePresence>
                        {openItems.includes(item.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ 
                              duration: 0.4,
                              ease: [0.04, 0.62, 0.23, 0.98]
                            }}
                            className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <div className="text-xs text-gray-600 mt-3">
                            <p className="font-medium mb-2">What this does:</p>
                            <p>{item.description}</p>
                          </div>
                        </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Collapsible>
                  </div>
                ))}
                </div>
              </div>
            </div>
          </div>

                      {/* Simple Completion Message */}
           {completedCount === loyaltyItems.length && (
             <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-md">
               <div className="flex items-center gap-3">
                 <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                   <Check className="h-4 w-4 text-white" />
                 </div>
                 <div>
                   <h3 className="font-medium text-green-800">All done!</h3>
                   <p className="text-sm text-green-700">Your loyalty program is ready to go.</p>
                 </div>
               </div>
             </div>
           )}
        </div>
      </motion.div>
      
      {/* Popup Components */}
      <IntroductoryRewardPopup 
        open={showIntroductoryReward} 
        onOpenChange={setShowIntroductoryReward} 
      />
      
      <CreateRewardPopup 
        open={showCreateReward} 
        onOpenChange={setShowCreateReward} 
      />
      
      <CreateRecurringRewardDialog 
        open={showCreateProgram} 
        onOpenChange={setShowCreateProgram} 
      />
      
      <CreateBannerDialog 
        open={showCreateBanner} 
        onOpenChange={setShowCreateBanner} 
      />
      
      <CreatePointsRulePopup 
        open={showCreatePointsRule} 
        onOpenChange={setShowCreatePointsRule} 
      />
      
      {/* NetworkRewardPopup removed */}
      
      <WelcomePopup 
        open={showWelcomePopup} 
        onOpenChange={setShowWelcomePopup} 
      />
      
      <SettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={setShowSettingsDialog}
        initialActiveSection={settingsActiveSection}
      />

      {/* Program Type Selector Popup */}
      {programTypeSelectorOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] animate-in fade-in duration-200" 
          style={{ backdropFilter: 'blur(2px)' }}
          onClick={() => setProgramTypeSelectorOpen(false)}
        >
          <div 
            className="bg-white rounded-lg max-w-md mx-4 shadow-lg border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                <span style={{ color: '#007AFF' }}>Create</span> Program
              </h3>
            </div>
            
            {/* Body */}
            <div className="p-6">
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setCreateManualProgramOpen(true);
                    requestAnimationFrame(() => {
                      setProgramTypeSelectorOpen(false);
                    });
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <SettingsIcon className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-gray-900">Custom Program</h4>
                      <p className="text-sm text-gray-600">Create a manual program with custom rewards and conditions</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setCreateRecurringOpen(true);
                    requestAnimationFrame(() => {
                      setProgramTypeSelectorOpen(false);
                    });
                  }}
                  className="w-full p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Repeat className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <h4 className="font-medium text-gray-900">Recurring Program</h4>
                      <p className="text-sm text-gray-600">Set up coffee programs, vouchers, or cashback rewards</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={() => setProgramTypeSelectorOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Program Creation Dialogs */}
      <CreateManualProgramDialog 
        open={createManualProgramOpen} 
        onOpenChange={setCreateManualProgramOpen} 
      />
      
      <CreateRecurringRewardDialog 
        open={createRecurringOpen} 
        onOpenChange={setCreateRecurringOpen} 
      />

      {/* Create Agent Modal */}
      <Dialog 
        open={isCreateAgentModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            // Reset selected custom agent when closing
            setSelectedCustomAgent(null)
            // Reset form when closing
            setCreateAgentForm({ name: 'New Agent', steps: [''] })
            setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
            setSelectedTools(new Set())
            setToolsSearchQuery('')
            setSmartCreatePrompt('')
            setShowSmartCreateInput(false)
            setAgentCanvasContent('')
            setShowToolsDropdown(false)
            setToolsDropdownQuery('')
            setSelectedToolIndex(0)
            setFilteredTools([])
            setAtMentionPosition(0)
            setCreateAgentDebugResponse(null)
            setIsInquiriesLoggerMode(false) // Reset simplified UI mode
            setNotificationSettings({
              sendToInbox: true,
              sendViaEmail: false,
              emailAddress: notificationSettings.emailAddress, // Keep the merchant's email
              emailFormat: "professional"
            })
          }
          setIsCreateAgentModalOpen(open)
        }}
      >
        <DialogPortal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden p-0">
            <DialogPrimitive.Title className="sr-only">Create Custom Agent</DialogPrimitive.Title>
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
            <div className="flex h-full focus:outline-none">
              {/* Main Content - Left Section */}
              <div className="flex-1 flex flex-col h-full p-6 pr-4 overflow-y-auto focus:outline-none">
                <DialogHeader className="mb-6 focus:outline-none">
                  <div className="flex items-center justify-between focus:outline-none">
                    <div className="flex items-center gap-3">
                      {isEditingAgentName ? (
                        <Input
                          value={createAgentForm.name}
                          onChange={(e) => setCreateAgentForm(prev => ({ ...prev, name: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              setIsEditingAgentName(false)
                            }
                          }}
                          onBlur={() => setIsEditingAgentName(false)}
                          className="text-xl font-semibold border-0 p-0 h-auto focus:ring-0 bg-transparent outline-none focus:outline-none shadow-none"
                          autoFocus
                        />
                      ) : (
                        <DialogTitle 
                          className="text-xl font-semibold cursor-text px-0 py-0"
                          onDoubleClick={() => setIsEditingAgentName(true)}
                        >
                          {createAgentForm.name}
                        </DialogTitle>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Schedule Information Display */}
                      {createAgentSchedule.frequency && (
                        <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-1.5">
                          <div className="flex items-center gap-2 text-xs">
                            <Clock className="h-3 w-3 text-gray-600" />
                            <span className="font-medium text-gray-700 capitalize">{createAgentSchedule.frequency}</span>
                            <span className="text-gray-500">at {createAgentSchedule.time}</span>
                            {createAgentSchedule.frequency === 'weekly' && createAgentSchedule.selectedDay && (
                              <span className="text-gray-500">on {capitaliseFirstLetter(createAgentSchedule.selectedDay)}</span>
                            )}
                            {createAgentSchedule.frequency === 'monthly' && createAgentSchedule.days[0] && (
                              <span className="text-gray-500">on day {createAgentSchedule.days[0]}</span>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <TooltipProvider>
                        <div className="flex items-center gap-2">
                          {!isInquiriesLoggerMode && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setShowSmartCreateInput(!showSmartCreateInput)
                                    }}
                                    className="rounded-md h-8 w-8 p-0"
                                  >
                                    <Wand2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Smart Create - Generate agent with AI</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
                                  className="rounded-md h-8 w-8 p-0"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                
                                {/* Schedule Dropdown */}
                                {showScheduleDropdown && (
                                  <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20 p-4">
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-sm font-medium">Frequency</Label>
                                        <Select
                                          value={createAgentSchedule.frequency}
                                          onValueChange={(value) => 
                                            setCreateAgentSchedule(prev => ({ 
                                              ...prev, 
                                              frequency: value,
                                              days: value === 'daily' ? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] : prev.days,
                                              selectedDay: value === 'weekly' ? 'monday' : prev.selectedDay
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-full rounded-md mt-1">
                                            <SelectValue placeholder="Select frequency" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      
                                      <div>
                                        <Label className="text-sm font-medium">Time</Label>
                                        <Input
                                          type="time"
                                          value={createAgentSchedule.time}
                                          onChange={(e) => 
                                            setCreateAgentSchedule(prev => ({ ...prev, time: e.target.value }))
                                          }
                                          className="w-full rounded-md mt-1"
                                        />
                                      </div>
                                      
                                      {createAgentSchedule.frequency === 'weekly' && (
                                        <div>
                                          <Label className="text-sm font-medium">Day of Week</Label>
                                          <Select
                                            value={createAgentSchedule.selectedDay}
                                            onValueChange={(value) => 
                                              setCreateAgentSchedule(prev => ({ ...prev, selectedDay: value, days: [value] }))
                                            }
                                          >
                                            <SelectTrigger className="w-full rounded-md mt-1">
                                              <SelectValue placeholder="Select day" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="monday">Monday</SelectItem>
                                              <SelectItem value="tuesday">Tuesday</SelectItem>
                                              <SelectItem value="wednesday">Wednesday</SelectItem>
                                              <SelectItem value="thursday">Thursday</SelectItem>
                                              <SelectItem value="friday">Friday</SelectItem>
                                              <SelectItem value="saturday">Saturday</SelectItem>
                                              <SelectItem value="sunday">Sunday</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      )}
                                      
                                      {createAgentSchedule.frequency === 'monthly' && (
                                        <div>
                                          <Label className="text-sm font-medium">Day of Month</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max="28"
                                            placeholder="e.g., 1, 15"
                                            value={createAgentSchedule.days[0] || ''}
                                            onChange={(e) => 
                                              setCreateAgentSchedule(prev => ({ ...prev, days: [e.target.value] }))
                                            }
                                            className="w-full rounded-md mt-1"
                                          />
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-end gap-2 pt-2 border-t">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowScheduleDropdown(false)}
                                          className="rounded-md"
                                        >
                                          Cancel
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => setShowScheduleDropdown(false)}
                                          className="rounded-md"
                                        >
                                          Apply
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Schedule - Set when agent runs</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          {!isInquiriesLoggerMode && (
                            <>
                              {/* Vertical Separator */}
                              <div className="h-6 w-px bg-gray-200 mx-2"></div>
                              
                              {/* Tools Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowToolsInLeftPanel(!showToolsInLeftPanel)}
                                    className={cn(
                                      "rounded-md h-8 w-8 p-0",
                                      showToolsInLeftPanel && "bg-gray-100"
                                    )}
                                  >
                                    <Puzzle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Tools - View available integrations</p>
                                </TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TooltipProvider>
                    </div>
                  </div>
                </DialogHeader>

                {/* Main Content */}
                <div className="space-y-6">
                  {/* Agent Canvas */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold">Instructions</h3>
                      {agentCanvasContent && typeof agentCanvasContent === 'string' && agentCanvasContent.trim() && isEditingCanvas && !showSmartCreateInput && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditingCanvas(false)}
                          className="rounded-md opacity-70 hover:opacity-100"
                        >
                          Done
                        </Button>
                      )}
                    </div>

                    {/* Smart Create Input */}
                    {showSmartCreateInput && (
                      <div className="mb-4">
                        <div className={cn(
                          "overflow-hidden transition-all duration-700 ease-in-out",
                          isGeneratingSteps ? "max-h-0 opacity-0" : "max-h-[200px] opacity-100"
                        )}>
                          <Textarea
                            placeholder="What are you trying to achieve..."
                            value={smartCreatePrompt}
                            onChange={(e) => setSmartCreatePrompt(e.target.value)}
                            className="min-h-[120px] rounded-md focus:ring-0 focus:ring-offset-0"
                            style={{ whiteSpace: 'pre-wrap' }}
                          />
                        </div>

                        <div className={cn(
                          "transition-all duration-700 ease-in-out",
                          isGeneratingSteps ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 absolute"
                        )}>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                            <span 
                              className="font-medium relative"
                              style={{
                                background: 'linear-gradient(90deg, #007AFF, #5E6D7A, #8E8E93, #007AFF)',
                                backgroundSize: '200% 100%',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                                animation: 'gradient-shift 2s ease-in-out infinite'
                              }}
                            >
                              Generating...
                            </span>
                          </div>
                        </div>
                        
                        {!isGeneratingSteps && (
                          <div className="mt-4 text-sm text-gray-900">
                            <h4 className="font-medium mb-2">How to prompt effectively:</h4>
                            <ul className="space-y-2 pl-4 list-disc">
                              <li>Be specific about what you want the agent to achieve</li>
                              <li>Include any specific tools you want to use (e.g., Gmail, Calendar)</li>
                              <li>Mention the frequency of execution if relevant (daily, weekly)</li>
                              <li>Include any specific data formats or outputs you need</li>
                              <li>Describe the problem you're solving rather than implementation details</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Agent Canvas */}
                    {!showSmartCreateInput && (
                      <div className="relative flex-1" style={{ height: "auto", minHeight: "500px" }}>
                        <div className="relative h-full">
                          <Textarea
                            placeholder={`## Objective
Describe the main purpose and goal of your agent...

## Steps
1. First step the agent should take...
2. Second step the agent should take...
3. Continue adding steps...

## Tools Used
@gmail - For email operations
@calendar - For scheduling
@sheets - For data management
(Type @ to see available tools)`}
                            value={agentCanvasContent}
                            onChange={(e) => setAgentCanvasContent(e.target.value)}
                            className="rounded-md h-[500px] text-sm leading-relaxed resize-none"
                            style={{ whiteSpace: 'pre-wrap' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="w-px bg-gray-200"></div>
              
              {/* Right Sidebar */}
              <div className="w-80 p-6 pl-4 bg-gray-50 flex flex-col h-full">
                {/* Right Panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto">
                    {/* Notification Options */}
                    <div className="mb-6">
                      <h3 className="text-sm font-medium mb-3 text-gray-600">Notification Options</h3>
                      
                      <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Agent Inbox</p>
                              <p className="text-xs text-gray-500">Receive notifications in your agent inbox</p>
                            </div>
                            <Switch 
                              id="inbox-notification" 
                              checked={notificationSettings.sendToInbox}
                              onCheckedChange={(checked) => {
                                // If turning off inbox and email is also off, force email on
                                if (!checked && !notificationSettings.sendViaEmail) {
                                  setNotificationSettings(prev => ({ 
                                    ...prev, 
                                    sendToInbox: false,
                                    sendViaEmail: true 
                                  }))
                                } else {
                                  setNotificationSettings(prev => ({ ...prev, sendToInbox: checked }))
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Email Notifications</p>
                              <p className="text-xs text-gray-500">Receive email updates when the agent runs</p>
                            </div>
                            <Switch 
                              id="email-notification" 
                              checked={notificationSettings.sendViaEmail}
                              onCheckedChange={(checked) => {
                                // If turning off email and inbox is also off, force inbox on
                                if (!checked && !notificationSettings.sendToInbox) {
                                  setNotificationSettings(prev => ({ 
                                    ...prev, 
                                    sendViaEmail: false,
                                    sendToInbox: true 
                                  }))
                                } else {
                                  setNotificationSettings(prev => ({ ...prev, sendViaEmail: checked }))
                                }
                              }}
                            />
                          </div>
                          
                          {/* Email Settings - conditionally shown */}
                          {notificationSettings.sendViaEmail && (
                            <div className="space-y-3 border-t border-gray-100 pt-3 mt-2">
                              <Label htmlFor="email-address" className="text-sm font-medium">Email Address</Label>
                              <Input 
                                id="email-address" 
                                placeholder="you@example.com" 
                                value={notificationSettings.emailAddress}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailAddress: e.target.value }))}
                                className="text-xs h-8 rounded-md bg-gray-50"
                              />
                              <p className="text-xs text-gray-500">We'll send notifications to this email address</p>
                              
                              <div className="pt-2">
                                <Label htmlFor="email-format" className="text-sm font-medium">Email Format</Label>
                                {/* Sub-Tab Container */}
                                <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mt-1">
                                  <button
                                    type="button"
                                    onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "professional" }))}
                                    className={cn(
                                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                      notificationSettings.emailFormat === "professional"
                                        ? "text-gray-800 bg-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200/70"
                                    )}
                                  >
                                    <FileText className="h-3 w-3" />
                                    Professional
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setNotificationSettings(prev => ({ ...prev, emailFormat: "simple" }))}
                                    className={cn(
                                      "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors",
                                      notificationSettings.emailFormat === "simple"
                                        ? "text-gray-800 bg-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-200/70"
                                    )}
                                  >
                                    <AlignLeft className="h-3 w-3" />
                                    Simple
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Create Button Section - Fixed at bottom */}
                  <div className="border-t border-gray-200 pt-4 mt-auto sticky bottom-0 bg-gray-50">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        type="button"
                        onClick={async () => {
                          try {
                            setIsCreatingAgent(true)
                            
                            // Validate that schedule is set
                            if (!createAgentSchedule.frequency) {
                              toast({
                                title: "Schedule Required",
                                description: "Please select a schedule frequency before creating the agent.",
                                variant: "destructive"
                              })
                              setIsCreatingAgent(false)
                              return
                            }
                            
                            // Validate agentCanvasContent
                            if (!agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim()) {
                              toast({
                                title: "Agent Definition Required",
                                description: "Please define your agent in the canvas above.",
                                variant: "destructive"
                              })
                              setIsCreatingAgent(false)
                              return
                            }
                            
                            // Generate a unique schedule ID for this custom agent
                            const scheduleId = `${user?.uid}_custom_${Date.now()}`
                            
                            const agentData = {
                              agentName: createAgentForm.name,
                              type: 'custom',
                              status: 'active',
                              prompt: agentCanvasContent,
                              agentDescription: agentDescription || 'AI agent that executes multi-step tasks',
                              scheduleId: scheduleId,
                              appsUsed: Array.from(selectedTools),
                              agentinbox: true,
                              settings: {
                                schedule: {
                                  frequency: createAgentSchedule.frequency,
                                  time: createAgentSchedule.time,
                                  days: createAgentSchedule.days,
                                  selectedDay: createAgentSchedule.selectedDay
                                },
                                selectedTools: Array.from(selectedTools),
                                notifications: {
                                  sendToInbox: notificationSettings.sendToInbox,
                                  sendViaEmail: notificationSettings.sendViaEmail,
                                  emailAddress: notificationSettings.emailAddress,
                                  emailFormat: notificationSettings.emailFormat
                                }
                              },
                              enrolledAt: new Date(),
                              lastUpdated: new Date()
                            }
                            
                            // Create new agent
                            const agentDocRef = await addDoc(collection(db, 'merchants', user?.uid || '', 'agentsenrolled'), agentData)
                            
                            // Update the agent document with its own ID as agentId
                            const agentId = agentDocRef.id
                            await updateDoc(agentDocRef, { agentId })
                            
                            // Also save schedule data to top-level agentschedule collection
                            const scheduleRef = doc(db, 'agentschedule', scheduleId)
                            const scheduleData = {
                              merchantId: user?.uid,
                              agentname: createAgentForm.name,
                              agentId: agentId,
                              agentName: createAgentForm.name,
                              schedule: agentData.settings.schedule,
                              enabled: true,
                              createdAt: new Date(),
                              lastUpdated: new Date()
                            }
                            await setDoc(scheduleRef, scheduleData)
                            
                            toast({
                              title: "Agent Created!",
                              description: `${createAgentForm.name} has been created successfully.`
                            })
                          
                            // Reset form and close modal
                            setSelectedCustomAgent(null)
                            setCreateAgentForm({ name: 'New Agent', steps: [''] })
                            setCreateAgentSchedule({ frequency: '', time: '12:00', days: [], selectedDay: '' })
                            setSelectedTools(new Set())
                            setToolsSearchQuery('')
                            setSmartCreatePrompt('')
                            setShowSmartCreateInput(false)
                            setAgentCanvasContent('')
                            setAgentDescription('')
                            setShowToolsDropdown(false)
                            setToolsDropdownQuery('')
                            setSelectedToolIndex(0)
                            setFilteredTools([])
                            setAtMentionPosition(0)
                            setCreateAgentDebugResponse(null)
                            setIsCreateAgentModalOpen(false)
                          } catch (error) {
                            console.error('Error saving agent:', error)
                            toast({
                              title: "Error",
                              description: "Failed to save agent. Please try again.",
                              variant: "destructive"
                            })
                          } finally {
                            setIsCreatingAgent(false)
                          }
                        }}
                        disabled={isCreatingAgent || !agentCanvasContent || typeof agentCanvasContent !== 'string' || !agentCanvasContent.trim() || !createAgentForm.name.trim() || !createAgentSchedule.frequency}
                        className="rounded-md px-4 py-1.5 h-auto text-sm"
                        size="sm"
                      >
                        {isCreatingAgent ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Agent'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  )
} 