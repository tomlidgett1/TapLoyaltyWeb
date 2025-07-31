"use client"

import { useState, useEffect, useCallback } from "react"
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
import { collection, getDocs, query, where, limit, doc, getDoc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore"
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
import { WelcomePopup } from "@/components/welcome-popup"

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
  const { user, shouldShowWelcome, clearWelcomeFlag } = useAuth()
  const [openItems, setOpenItems] = useState<string[]>([])
  const [accountType, setAccountType] = useState<'standard' | 'network'>('standard')
  const [pageLoaded, setPageLoaded] = useState(false)
  const [showWelcomePopup, setShowWelcomePopup] = useState(false)

  console.log('GetStartedPage render:', { 
    user: user?.uid, 
    shouldShowWelcome, 
    pageLoaded, 
    showWelcomePopup 
  })
  
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
        const hasRewards = !snapshot.empty
        setChecklistItems(prev => prev.map(item => {
          if (item.id === 'individual-reward') {
            return { ...item, completed: hasRewards }
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
    console.log('Welcome popup check:', { pageLoaded, shouldShowWelcome })
    if (pageLoaded && shouldShowWelcome) {
      console.log('Showing welcome popup in 500ms')
      const timer = setTimeout(() => {
        console.log('Timer fired - setting showWelcomePopup to true')
        setShowWelcomePopup(true)
        clearWelcomeFlag() // Clear the flag so it doesn't show again
        console.log('Welcome popup shown')
      }, 500) // Additional delay for smooth experience

      return () => clearTimeout(timer)
    }
  }, [pageLoaded, shouldShowWelcome, clearWelcomeFlag])

  // Force show welcome popup for testing - remove this after testing
  useEffect(() => {
    console.log('Force show test - user:', user?.uid)
    if (user?.uid) {
      const timer = setTimeout(() => {
        console.log('Force showing welcome popup for testing')
        setShowWelcomePopup(true)
      }, 2000) // Show after 2 seconds for testing

      return () => clearTimeout(timer)
    }
  }, [user?.uid])



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
  const merchantItems = checklistItems
    .filter(item => item.category === 'merchant')
    .sort((a, b) => Number(a.completed) - Number(b.completed))
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
                     
                     {/* Hidden file input for logo upload */}
                     <input
                       id="logo-upload-getstarted"
                       type="file"
                       accept="image/*"
                       onChange={handleLogoUpload}
                       className="hidden"
                     />
                     
                     {/* Account Type Selection */}
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                       <Collapsible
                         open={openItems.includes('account-type')}
                         onOpenChange={() => toggleItem('account-type')}
                       >
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
                                 <ChevronDown 
                                   className={cn(
                                     "h-4 w-4 text-gray-400 transition-transform duration-200",
                                     openItems.includes('account-type') && "rotate-180"
                                   )} 
                                 />
                               </Button>
                             </CollapsibleTrigger>
                           </div>
                         </div>
                         
                         <AnimatePresence>
                           {openItems.includes('account-type') && (
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
                             </motion.div>
                           )}
                         </AnimatePresence>
                       </Collapsible>
                     </div>
              
              {/* Loyalty Tasks */}
              <div className="space-y-3">
                {loyaltyItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-all duration-200 min-h-[80px]",
                      item.completed && "opacity-60 bg-gray-100"
                    )}
                  >
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
                          <h3 className={cn(
                            "text-sm font-medium",
                            item.completed ? "text-gray-600" : "text-gray-900"
                          )}>{item.title}</h3>
                          <p className="text-xs text-gray-500">Click to learn more</p>
                        </div>
                       
                        <div className="flex items-center gap-2">
                          {/* Special handling for logo upload with upload button */}
                          {item.id === 'upload-logo' && uploadedLogo && !uploadedUrl && (
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
                            className={cn(
                              "text-xs px-3 py-1.5 text-white",
                              item.completed 
                                ? "bg-gray-500 hover:bg-gray-600" 
                                : "bg-[#007aff] hover:bg-[#339fff]"
                            )}
                            onClick={item.popupAction}
                          >
                            {item.completed && item.id === 'upload-logo' 
                              ? "Change Logo" 
                              : item.completed 
                                ? "Modify" 
                                : item.actionText}
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
                          <p className="text-xs text-gray-600 mb-4 mt-3">
                            {item.description}
                          </p>
                          <Button 
                            size="sm" 
                                className={cn(
                                  "text-white inline-flex items-center gap-2",
                                  item.completed 
                                    ? "bg-gray-500 hover:bg-gray-600" 
                                    : "bg-[#007aff] hover:bg-[#339fff]"
                                )}
                            onClick={item.popupAction}
                          >
                                {item.completed && item.id === 'upload-logo' 
                                  ? "Change Logo" 
                                  : item.completed 
                                    ? "Modify" 
                                    : item.actionText}
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                {merchantItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={cn(
                      "border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-all duration-200 min-h-[80px]",
                      item.completed && "opacity-60 bg-gray-100"
                    )}
                  >
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
                           <h3 className={cn(
                             "text-sm font-medium",
                             item.completed ? "text-gray-600" : "text-gray-900"
                           )}>{item.title}</h3>
                           <p className="text-xs text-gray-500">Click to learn more</p>
                         </div>
                        
                        <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              asChild
                              className={cn(
                                "text-xs px-3 py-1.5 text-white",
                                item.completed 
                                  ? "bg-gray-500 hover:bg-gray-600" 
                                  : "bg-[#007aff] hover:bg-[#339fff]"
                              )}
                            >
                              <Link href={item.actionUrl!}>
                                {item.completed ? "Modify" : item.actionText}
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
                         <p className="text-xs text-gray-600 mb-4 mt-3">
                           {item.description}
                         </p>
                           <Button 
                             size="sm" 
                             asChild
                                 className={cn(
                                   "text-white",
                                   item.completed 
                                     ? "bg-gray-500 hover:bg-gray-600" 
                                     : "bg-[#007aff] hover:bg-[#339fff]"
                                 )}
                           >
                             <Link href={item.actionUrl!} className="inline-flex items-center gap-2">
                                   {item.completed ? "Modify" : item.actionText}
                               <ExternalLink className="h-3 w-3" />
                             </Link>
                           </Button>
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
      
      <NetworkRewardPopup 
        open={showNetworkReward} 
        onOpenChange={setShowNetworkReward} 
      />
      
      <WelcomePopup 
        open={showWelcomePopup} 
        onOpenChange={setShowWelcomePopup} 
      />
    </>
  )
} 