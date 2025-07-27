"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Check,
  ChevronDown,
  Gift,
  Star,
  RotateCcw,
  Image as ImageIcon,
  Zap,
  Users,
  Bot,
  ExternalLink,
  MessageSquare,
  FileText,
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, limit, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"
import { IntroductoryRewardPopup } from "@/components/introductory-reward-popup"
import { CreateRewardPopup } from "@/components/create-reward-popup"
import { CreateRecurringRewardDialog } from "@/components/create-recurring-reward-dialog"
import { NetworkRewardPopup } from "@/components/network-reward-popup"
import { CreateBannerDialog } from "@/components/create-banner-dialog"
import { CreatePointsRulePopup } from "@/components/create-points-rule-popup"

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

export default function GetStartedPage() {
  const { user } = useAuth()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [accountType, setAccountType] = useState<'standard' | 'network'>('standard')
  
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
  const [showNetworkReward, setShowNetworkReward] = useState(false)
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([
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
      title: 'Create Individual Reward',
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
      popupAction: () => setShowCreateProgram(true)
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
    {
      id: 'network-reward',
      title: 'Create Network Reward',
      description: 'Set up rewards that can be shared across your network of partners or locations. This helps create a more comprehensive loyalty experience for your customers.',
      icon: Users,
      completed: false,
      category: 'loyalty',
      actionType: 'popup',
      actionText: 'Setup',
      popupAction: () => setShowNetworkReward(true)
    },
    {
      id: 'create-manual-agent',
      title: 'Create Manual Agent',
      description: 'Set up a manual agent to handle customer inquiries and support requests through your preferred communication channels.',
      icon: Bot,
      completed: false,
      category: 'merchant',
      actionType: 'url',
      actionUrl: '/dashboard/agents',
      actionText: 'Setup'
    },
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
    }
  ])

  useEffect(() => {
    const checkCompletionStatus = async () => {
      if (!user?.uid) return

      try {
        const merchantId = user.uid
        
        // Get merchant document to check for introductory rewards and programs
        const merchantDoc = await getDoc(doc(db, 'merchants', merchantId))
        let hasIntroRewards = false
        let hasActivePrograms = false
        
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          
          // Check for introductory rewards
          if (data.introductoryRewardIds && Array.isArray(data.introductoryRewardIds) && data.introductoryRewardIds.length > 0) {
            hasIntroRewards = true
          }
          
          // Check for active programs
          const hasActiveTransactionRewards = data.transactionRewards && Array.isArray(data.transactionRewards) && 
            data.transactionRewards.some(program => program.active === true)
          const hasActiveVoucherPrograms = data.voucherPrograms && Array.isArray(data.voucherPrograms) && 
            data.voucherPrograms.some(program => program.active === true)
          const hasActiveCoffeePrograms = data.coffeePrograms && Array.isArray(data.coffeePrograms) && 
            data.coffeePrograms.some(program => program.active === true)
          
          if (hasActiveTransactionRewards || hasActiveVoucherPrograms || hasActiveCoffeePrograms) {
            hasActivePrograms = true
          }
        }
        
        setChecklistItems(prev => prev.map(item => {
          switch (item.id) {
            case 'intro-reward':
              return { ...item, completed: hasIntroRewards }
            case 'individual-reward':
            case 'network-reward':
              // Check for rewards in Firestore
              return { ...item, completed: false } // You can add actual Firestore checks here
            case 'create-program':
              return { ...item, completed: hasActivePrograms }
            case 'create-banner':
              // Check for banners
              return { ...item, completed: false } // You can add actual Firestore checks here
            case 'points-rule':
              // Check for points rules
              return { ...item, completed: false } // You can add actual Firestore checks here
            case 'create-agent':
              // Check for agents
              return { ...item, completed: false } // You can add actual Firestore checks here
            default:
              return item
          }
        }))
      } catch (error) {
        console.error('Error checking completion status:', error)
      }
    }

    checkCompletionStatus()
    fetchMerchantLogo()
  }, [user?.uid])

  // Fetch merchant logo from Firestore
  const fetchMerchantLogo = async () => {
    if (!user?.uid) return

    try {
      const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
      if (merchantDoc.exists()) {
        const data = merchantDoc.data()
        if (data.logoUrl) {
          setMerchantLogoUrl(data.logoUrl)
        }
      }
    } catch (error) {
      console.error('Error fetching merchant logo:', error)
    }
  }

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
    }
  }

  const triggerFileUpload = () => {
    const fileInput = document.getElementById('logo-upload-getstarted') as HTMLInputElement
    fileInput?.click()
  }

  const uploadToFirebaseStorage = async () => {
    if (!uploadedLogo || !user?.uid) {
      toast({
        title: "Upload failed",
        description: !uploadedLogo ? 'Please select a logo first' : 'Authentication required',
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    
    try {
      const logoId = uuidv4()
      const storagePath = `merchants/${user.uid}/files/${logoId}`
      
      // Upload to Firebase Storage
      const storageRef = ref(getStorage(), storagePath)
      const uploadTask = uploadBytesResumable(storageRef, uploadedLogo, { 
        contentType: uploadedLogo.type || 'application/octet-stream' 
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

  const loyaltyItems = checklistItems.filter(item => item.category === 'loyalty')
  const merchantItems = checklistItems.filter(item => item.category === 'merchant')
  const completedCount = checklistItems.filter(item => item.completed).length

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          
          {/* Header with Progress */}
          <div className="mb-8">
            <h1 className="text-xl font-medium text-gray-900 mb-1 text-center">Welcome to <span className="font-bold text-[#007aff]">Tap</span></h1>
            <p className="text-base text-gray-600 mb-3 text-center">Let's get started</p>
            <div className="flex items-center gap-3 justify-center mb-4">
              <div className="w-64 bg-gray-100 rounded-full h-1">
                <div
                  className="bg-[#007aff] h-1 rounded-full transition-all duration-300"
                  style={{ width: `${(completedCount / checklistItems.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 min-w-fit">
                {completedCount} of {checklistItems.length}
              </span>
            </div>
          </div>

          {/* Two Column Layout with Separator */}
          <div className="relative">
            {/* Vertical Separator Line - starts at first card level */}
            <div className="absolute left-1/2 w-px bg-gray-200 transform -translate-x-1/2 hidden lg:block" style={{ top: '75px', bottom: '0' }}></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Tap Loyalty Column */}
              <div className="space-y-4">
                {/* Tap Loyalty Badge */}
                <div className="flex justify-center mb-6">
                  <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm relative z-10">
                    <img src="/taplogo.png" alt="Tap" className="w-5 h-5 object-contain rounded-[2px]" />
                    <span className="text-sm font-semibold text-gray-900">Tap Loyalty</span>
                  </div>
                </div>
              
              {/* Logo Upload Section */}
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                {/* Hidden file input */}
                <input
                  id="logo-upload-getstarted"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {merchantLogoUrl || logoPreview ? (
                      <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-md overflow-hidden flex items-center justify-center">
                        <img 
                          src={logoPreview || merchantLogoUrl || ''} 
                          alt="Business logo" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {merchantLogoUrl ? 'Your Logo' : 'Add Your Logo'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {merchantLogoUrl 
                          ? 'Your business logo is uploaded' 
                          : 'Upload your business logo for the loyalty program'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadedLogo && !uploadedUrl && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs"
                        onClick={uploadToFirebaseStorage}
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Upload"}
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-xs"
                      onClick={triggerFileUpload}
                    >
                      {merchantLogoUrl ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </div>
                </div>
                
                {/* Upload status */}
                {uploadedUrl && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-xs text-green-700 font-medium">✓ Logo uploaded successfully!</p>
                  </div>
                )}
              </div>
              
              {/* Account Type Selection */}
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <Collapsible>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-md flex items-center justify-center overflow-hidden">
                        <img 
                          src={accountType === 'standard' ? '/taplogo.png' : '/tappro.png'} 
                          alt={accountType === 'standard' ? 'Tap Standard' : 'Tap Network'} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Select Account Type</h4>
                        <p className="text-xs text-gray-500">Choose between Standard or Network for your business</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-md">
                        <button
                          onClick={() => setAccountType('standard')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            accountType === 'standard'
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          Standard
                        </button>
                        <button
                          onClick={() => setAccountType('network')}
                          className={cn(
                            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                            accountType === 'network'
                              ? "text-gray-800 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          Network
                        </button>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-8 w-8"
                        >
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  <CollapsibleContent 
                    className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1"
                    style={{
                      transition: 'all 350ms linear(0, 0.3566, 0.7963, 1.0045, 1.0459, 1.0287, 1.0088, 0.9996, 1, 0.9987, 0.9996, 1)'
                    }}
                  >
                    <div className="px-3 pb-3 border-t border-gray-100 mt-3">
                      <div className="space-y-3">
                        <div className="p-3 bg-white rounded-md border border-gray-200">
                          <h5 className="text-xs font-medium text-gray-900 mb-2">Tap Standard</h5>
                          <p className="text-xs text-gray-600 mb-2">Perfect for individual businesses and single locations.</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>• Single business management</li>
                            <li>• Basic loyalty features</li>
                            <li>• Customer analytics</li>
                            <li>• Email marketing tools</li>
                          </ul>
                        </div>
                        
                        <div className="p-3 bg-white rounded-md border border-gray-200">
                          <h5 className="text-xs font-medium text-gray-900 mb-2">Tap Network</h5>
                          <p className="text-xs text-gray-600 mb-2">Ideal for multi-location chains, franchises, and business networks.</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            <li>• Multi-location management</li>
                            <li>• Advanced network features</li>
                            <li>• Cross-location rewards</li>
                            <li>• Centralized reporting</li>
                            <li>• Franchise management tools</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              
              {/* Loyalty Tasks */}
              <div className="space-y-3">
                {loyaltyItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-all duration-200 min-h-[80px]">
                    <Collapsible
                      open={openItems.includes(item.id)}
                      onOpenChange={() => toggleItem(item.id)}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-5 flex items-center justify-center">
                          {item.completed ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <item.icon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                       
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                          <p className="text-xs text-gray-500">Click to learn more</p>
                        </div>
                       
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="bg-[#007aff] hover:bg-[#339fff] text-xs px-3 py-1.5 text-white"
                            onClick={item.popupAction}
                          >
                            {item.actionText}
                          </Button>
                          
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8 w-8"
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
                     
                      <CollapsibleContent 
                        className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1"
                        style={{
                          transition: 'all 350ms linear(0, 0.3566, 0.7963, 1.0045, 1.0459, 1.0287, 1.0088, 0.9996, 1, 0.9987, 0.9996, 1)'
                        }}
                      >
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <p className="text-xs text-gray-600 mb-4 mt-3">
                            {item.description}
                          </p>
                          <Button 
                            size="sm" 
                            className="bg-[#007aff] hover:bg-[#339fff] text-white inline-flex items-center gap-2"
                            onClick={item.popupAction}
                          >
                            {item.actionText}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Tap Merchant Column */}
            <div className="space-y-4">
              {/* Tap Merchant Badge */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-full border border-gray-200 shadow-sm relative z-10">
                  <img src="/gmailnew.png" alt="Gmail" className="w-5 h-5 object-contain" />
                  <span className="text-sm font-semibold text-gray-900">Tap Merchant</span>
                </div>
              </div>
              
              {/* Merchant Tasks */}
              <div className="space-y-3">
                {merchantItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-all duration-200 min-h-[80px]">
                    <Collapsible
                      open={openItems.includes(item.id)}
                      onOpenChange={() => toggleItem(item.id)}
                    >
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-5 flex items-center justify-center">
                          {item.completed ? (
                            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          ) : item.icon === 'gmail' ? (
                            <div className="relative w-10 h-5">
                              <div className="absolute left-0 top-0 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center z-10">
                                <img src="/gmailnew.png" alt="Gmail" className="w-4 h-4 object-contain" />
                              </div>
                              <div className="absolute right-0 top-0 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <img src="/outlook.png" alt="Outlook" className="w-4 h-4 object-contain" />
                              </div>
                            </div>
                          ) : item.icon === 'outlook' ? (
                            <div className="relative w-10 h-5">
                              <div className="absolute left-0 top-0 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center z-10">
                                <img src="/gmailnew.png" alt="Gmail" className="w-4 h-4 object-contain" />
                              </div>
                              <div className="absolute right-0 top-0 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center">
                                <img src="/outlook.png" alt="Outlook" className="w-4 h-4 object-contain" />
                              </div>
                            </div>
                          ) : (
                            <item.icon className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                       
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                          <p className="text-xs text-gray-500">Click to learn more</p>
                        </div>
                       
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            asChild
                            className="bg-[#007aff] hover:bg-[#339fff] text-xs px-3 py-1.5 text-white"
                          >
                            <Link href={item.actionUrl!}>
                              {item.actionText}
                            </Link>
                          </Button>
                          
                          <CollapsibleTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="p-1 h-8 w-8"
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
                     
                      <CollapsibleContent 
                        className="overflow-hidden data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top-1 data-[state=open]:animate-in data-[state=open]:slide-in-from-top-1"
                        style={{
                          transition: 'all 350ms linear(0, 0.3566, 0.7963, 1.0045, 1.0459, 1.0287, 1.0088, 0.9996, 1, 0.9987, 0.9996, 1)'
                        }}
                      >
                        <div className="px-4 pb-4 border-t border-gray-100">
                          <p className="text-xs text-gray-600 mb-4 mt-3">
                            {item.description}
                          </p>
                          <Button 
                            size="sm" 
                            asChild
                            className="bg-[#007aff] hover:bg-[#339fff] text-white"
                          >
                            <Link href={item.actionUrl!} className="inline-flex items-center gap-2">
                              {item.actionText}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </div>

          {/* Simple Completion Message */}
          {completedCount === checklistItems.length && (
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
      </div>
      
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
      
      <NetworkRewardPopup 
        open={showNetworkReward} 
        onOpenChange={setShowNetworkReward} 
      />
    </DashboardLayout>
  )
} 