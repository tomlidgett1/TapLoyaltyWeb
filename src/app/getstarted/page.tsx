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
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, getDocs, query, where, limit } from "firebase/firestore"
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
        // Check for existing rewards, programs, etc.
        const merchantId = user.uid
        
        setChecklistItems(prev => prev.map(item => {
          switch (item.id) {
            case 'intro-reward':
            case 'individual-reward':
            case 'network-reward':
              // Check for rewards in Firestore
              return { ...item, completed: false } // You can add actual Firestore checks here
            case 'create-program':
              // Check for loyalty programs
              return { ...item, completed: false } // You can add actual Firestore checks here
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
  }, [user?.uid])



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
        <div className="max-w-2xl mx-auto px-6 py-8">
          
                    {/* Header with Progress */}
                      <div className="mb-6">
              <h1 className="text-lg font-medium text-gray-900 mb-1 text-center">Welcome to <span className="font-bold text-[#007aff]">Tap</span></h1>
              <p className="text-sm text-gray-600 mb-3 text-center">Let's get started</p>
              <div className="flex items-center gap-3 justify-center">
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

          {/* Simple Task List */}
           <div className="space-y-1">
             {checklistItems.map((item, index) => (
               <div key={item.id}>
                                  {/* Simple Separator for Tap Loyalty */}
                 {item.category === 'loyalty' && index === 0 && (
                   <>
                     <div className="flex items-center gap-4 py-4 mb-2">
                       <div className="flex-1 h-px bg-gray-200"></div>
                       <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-gray-200">
                         <img src="/taplogo.png" alt="Tap" className="w-4 h-4 object-contain rounded-[2px]" />
                         <span className="text-sm font-medium text-gray-700">Tap Loyalty</span>
                       </div>
                       <div className="flex-1 h-px bg-gray-200"></div>
                     </div>
                     
                     {/* Logo Upload Section */}
                     <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                             <ImageIcon className="h-5 w-5 text-gray-400" />
                           </div>
                           <div>
                             <h4 className="text-sm font-medium text-gray-900">Add Your Logo</h4>
                             <p className="text-xs text-gray-500">Upload your business logo for the loyalty program</p>
                           </div>
                         </div>
                         <Button 
                           size="sm" 
                           variant="outline"
                           className="text-xs"
                         >
                           Upload Logo
                         </Button>
                       </div>
                     </div>
                     
                     {/* Account Type Selection */}
                     <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                       <Collapsible>
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="w-12 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                               <Users className="h-5 w-5 text-gray-400" />
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
                                   "px-3 py-1.5 text-xs font-medium rounded transition-colors",
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
                                   "px-3 py-1.5 text-xs font-medium rounded transition-colors",
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
                   </>
                 )}
                 
                 {/* Simple Separator for Tap Merchant */}
                 {item.category === 'merchant' && index === loyaltyItems.length && (
                   <div className="flex items-center gap-4 py-4 mt-6 mb-2">
                     <div className="flex-1 h-px bg-gray-200"></div>
                     <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-gray-200">
                       <img src="/gmailnew.png" alt="Gmail" className="w-4 h-4 object-contain" />
                       <span className="text-sm font-medium text-gray-700">Tap Merchant</span>
                     </div>
                     <div className="flex-1 h-px bg-gray-200"></div>
                   </div>
                 )}
                 
                                   <div className="border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100 transition-all duration-200">
                    <Collapsible
                      open={openItems.includes(item.id)}
                      onOpenChange={() => toggleItem(item.id)}
                    >
                                           <div className="flex items-center gap-3 p-3">
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
                          {item.actionType === 'popup' ? (
                            <Button 
                              size="sm" 
                              className="bg-[#007aff] hover:bg-[#339fff] text-xs px-3 py-1.5 text-white"
                              onClick={item.popupAction}
                            >
                              {item.actionText}
                            </Button>
                          ) : (
                            <Button 
                              size="sm" 
                              asChild
                              className="bg-[#007aff] hover:bg-[#339fff] text-xs px-3 py-1.5 text-white"
                            >
                              <Link href={item.actionUrl!}>
                                {item.actionText}
                              </Link>
                            </Button>
                          )}
                          
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
                        <div className="px-3 pb-3 border-t border-gray-100">
                         <p className="text-xs text-gray-600 mb-4 mt-3">
                           {item.description}
                         </p>
                         {item.actionType === 'popup' ? (
                           <Button 
                             size="sm" 
                             className="bg-[#007aff] hover:bg-[#339fff] text-white inline-flex items-center gap-2"
                             onClick={item.popupAction}
                           >
                             {item.actionText}
                             <ExternalLink className="h-3 w-3" />
                           </Button>
                         ) : (
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
                         )}
                       </div>
                     </CollapsibleContent>
                   </Collapsible>
                 </div>
               </div>
             ))}
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