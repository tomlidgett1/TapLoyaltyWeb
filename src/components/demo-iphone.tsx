"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Gift, Home, Search, Store, Settings, Star, MoreHorizontal, Coffee, Info, Navigation, CreditCard, Globe, Sparkles, Fingerprint, ChevronDown } from "lucide-react"
import { PiCoffeeFill } from "react-icons/pi"
import { BiSolidCoffeeTogo } from "react-icons/bi"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, orderBy, getDocs, where } from "firebase/firestore"

interface DemoIPhoneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoIPhone({ open, onOpenChange }: DemoIPhoneProps) {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string>("")
  const [merchantName, setMerchantName] = useState<string>("")
  const [displayAddress, setDisplayAddress] = useState<string>("")
  const [coffeeProgram, setCoffeeProgram] = useState<any>(null)
  const [cashbackProgram, setCashbackProgram] = useState<any>(null)
  const [rewards, setRewards] = useState<any[]>([])
  const [customPrograms, setCustomPrograms] = useState<any[]>([])
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const [activeTab, setActiveTab] = useState<'rewards' | 'programs'>('rewards')

  const toggleProgramExpansion = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(programId)) {
        newSet.delete(programId)
      } else {
        newSet.add(programId)
      }
      return newSet
    })
  }

  useEffect(() => {
    const fetchMerchantData = async () => {
      if (!user?.uid) return
      
      try {
        // Fetch merchant info
        const merchantDoc = await getDoc(doc(db, "merchants", user.uid))
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          setLogoUrl(data.logoUrl || "")
          setMerchantName(data.merchantName || "Store")
          setDisplayAddress(data.location?.address || "")
          
          // Get the first active coffee program
          const coffeePrograms = data.coffeePrograms || []
          const activeCoffeeProgram = coffeePrograms.find((program: any) => program.active === true)
          setCoffeeProgram(activeCoffeeProgram || null)
          
          // Get cashback program if active
          const cashbackProgram = data.cashbackProgram || null
          if (cashbackProgram && cashbackProgram.isActive === true) {
            setCashbackProgram(cashbackProgram)
          } else {
            setCashbackProgram(null)
          }
        }

        // Fetch active rewards
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const rewardsQuery = query(
          rewardsRef, 
          where('isActive', '==', true),
          where('status', '==', 'active'),
          orderBy('createdAt', 'desc')
        )
        const rewardsSnapshot = await getDocs(rewardsQuery)
        
        const fetchedRewards = rewardsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            rewardName: data.rewardName || data.name || 'Unnamed Reward',
            description: data.description || '',
            type: data.type || 'gift',
            programType: data.programType || data.programtype || '',
            pointsCost: data.pointsCost || 0,
            voucherAmount: data.voucherAmount || 0,
            isIntroductoryReward: data.isIntroductoryReward || false,
            category: data.category || 'individual',
            // Network reward fields
            isNetworkReward: data.isNetworkReward || false,
            discountType: data.discountType || '',
            discountValue: data.discountValue || 0,
            minimumSpend: data.minimumSpend || 0,
            networkPointsCost: data.networkPointsCost || 0
          }
        })
        
        setRewards(fetchedRewards)

        // Fetch custom programs
        const customProgramsRef = collection(db, 'merchants', user.uid, 'customprograms')
        const customProgramsSnapshot = await getDocs(customProgramsRef)
        
        const fetchedCustomPrograms = customProgramsSnapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            name: data.name || 'Custom Program',
            description: data.description || '',
            status: data.status || 'active',
            totalRewards: data.totalRewards || 0,
            rewards: data.rewards || []
          }
        })
        
        setCustomPrograms(fetchedCustomPrograms)
      } catch (error) {
        console.error("Error fetching merchant data:", error)
      }
    }

    if (open) {
      setIsClosing(false)
      setIsVisible(true)
      setShouldAnimate(false)
      // Small delay to ensure the element is rendered off-screen first, then animate in
      setTimeout(() => {
        setShouldAnimate(true)
        fetchMerchantData()
      }, 10)
    } else {
      setIsVisible(false)
      setShouldAnimate(false)
    }
  }, [user?.uid, open])

  // Handle escape key press
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible && !isClosing) {
        handleClose()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, isClosing])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setShouldAnimate(false)
      onOpenChange(false)
      setIsClosing(false)
    }, 300) // Match the animation duration
  }

  const renderRewardCard = (reward: any) => {
    // Skip coffee program rewards as they're handled separately
    if (reward.programType === 'coffeeprogramnew') return null

    // Check if this is a network reward
    if (reward.isNetworkReward) {
      return (
        <div key={reward.id} className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-full">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {reward.rewardName}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {reward.description}
              </p>
              <div className="flex items-center gap-1 mt-1 flex-nowrap">
                <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  ${reward.discountValue || '10'} Off
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  Min. spend: ${reward.minimumSpend || '50'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-gray-400 text-white rounded-lg px-2 py-1 ml-3">
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {reward.networkPointsCost || reward.pointsCost || '100'}
              </span>
              <Globe className="w-3 h-3 ml-1" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div key={reward.id} className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {reward.rewardName}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {reward.description}
            </p>
            {reward.isIntroductoryReward && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[6px] text-white font-bold">!</span>
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  You have 1 x welcome gift across all merchants
                </span>
              </div>
            )}
          </div>
          <div 
            className={cn(
              "flex items-center justify-center rounded-md px-2 py-1 ml-3",
              reward.isIntroductoryReward
                ? "bg-blue-500 text-white"
                : (reward.programType === 'voucher' || reward.programType === 'voucherprogramnew')
                  ? "bg-orange-400 text-white"
                  : (reward.pointsCost === 0) 
                    ? "bg-green-500 text-white" 
                    : "bg-blue-500 text-white"
            )}
          >
            {reward.isIntroductoryReward ? (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  Welcome Gift
                </span>
              </>
            ) : (reward.programType === 'voucher' || reward.programType === 'voucherprogramnew') ? (
              <>
                <CreditCard className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  ${reward.voucherAmount || '0'} voucher
                </span>
              </>
            ) : (reward.pointsCost === 0) ? (
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Free
              </span>
            ) : (
              <>
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  {reward.pointsCost}
                </span>
                <Star className="w-3 h-3 ml-1 fill-white" />
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isVisible && !isClosing) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-50 transition-opacity duration-300"
        style={{ 
          opacity: (isClosing || !shouldAnimate) ? 0 : 1 
        }}
        onClick={handleClose}
      />
      
      {/* Sliding Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-transparent transition-transform duration-300 ease-out pointer-events-none"
        style={{ 
          transform: (!shouldAnimate || isClosing) ? 'translateX(100%)' : 'translateX(0)' 
        }}
      >
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8 pt-12 sm:pt-16 lg:pt-20">

          {/* iPhone 16 Pro */}
          <div className="relative flex items-center justify-center pointer-events-auto">
            {/* Phone Shadow */}
            <div className="absolute inset-0 bg-black/30 blur-xl transform translate-y-8 scale-105 rounded-[61px]"></div>
            
            {/* Very Outer Frame - Dark Silver Outline */}
             <div 
              className="relative bg-[#8B8B8B] rounded-[61px] p-[1px] shadow-2xl"
               style={{ 
                 height: '87vh',
                 width: 'calc(90vh * 0.462)', // iPhone aspect ratio (340/736 ≈ 0.462)
                 maxHeight: '760px',
                 maxWidth: '350px',
                 minWidth: '320px'
               }}
            >
                         {/* Outer Frame - Black */}
             <div 
               className="relative bg-[#252932] rounded-[60px] p-[9px] h-full w-full"
             >
              
                             {/* Side Buttons */}
               {/* Mute Switch */}
               <div className="absolute -left-[2px] top-[94px] w-[3px] h-[24px] bg-black rounded-r-md"></div>
               
               {/* Volume Buttons */}
               <div className="absolute -left-[2px] top-[136px] w-[3px] h-[28px] bg-black rounded-r-md"></div>
               <div className="absolute -left-[2px] top-[176px] w-[3px] h-[28px] bg-black rounded-r-md"></div>
               
               {/* Power Button */}
               <div className="absolute -right-[2px] top-[154px] w-[3px] h-[42px] bg-black rounded-l-md"></div>
               
               {/* Camera Control */}
               <div className="absolute -right-[2px] top-[222px] w-[3px] h-[20px] bg-black rounded-l-md"></div>

              {/* Inner Frame */}
              <div className="h-full w-full bg-black rounded-[51px] p-[2px]">
                
                {/* Screen */}
                <div className="h-full w-full bg-white rounded-[49px] overflow-hidden relative flex flex-col">
                  
                                     {/* Dynamic Island */}
                   <div className="absolute top-[12px] left-1/2 transform -translate-x-1/2 w-[110px] h-[28px] bg-black rounded-full z-50"></div>
                  
                                     {/* Status Bar */}
                   <div className="flex items-center justify-center px-7 pt-[17px] pb-2 bg-white relative z-40">
                     <div className="flex items-center justify-between w-full max-w-[280px]">
                                                <div className="text-[14px] font-semibold text-black ml-1">4:39</div>
                       <div className="flex items-center gap-[4px]">
                         {/* Battery */}
                         <svg width="24" height="12" viewBox="0 0 24 12" className="fill-black">
                           <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="black" strokeWidth="1" fill="none"/>
                           <rect x="2" y="2" width="18" height="8" rx="1.5" fill="black"/>
                           <rect x="21.5" y="4" width="2" height="4" rx="1" fill="black"/>
                         </svg>
                       </div>
                     </div>
                   </div>

                   

                                     {/* App Content */}
                   <div className="bg-gray-100 overflow-hidden flex flex-col" style={{ height: 'calc(100% - 51px)' }}>
                    
                                         {/* Header */}
                     <div className="bg-white px-4 py-3 flex items-center justify-between">
                       <div className="flex items-center gap-2.5">
                         <div className={`w-9 h-9 ${logoUrl ? 'bg-transparent' : 'bg-gradient-to-br from-blue-500 to-blue-600'} rounded-full flex items-center justify-center shadow-sm overflow-hidden`}>
                           {logoUrl ? (
                             <img 
                               src={logoUrl} 
                               alt="Store Logo" 
                               className="w-full h-full object-cover rounded-full"
                             />
                           ) : (
                             <div className="w-4 h-4 bg-white rounded-sm"></div>
                           )}
                         </div>
                         <div>
                           <h1 className="text-[16px] font-bold text-black">{merchantName}</h1>
                           <p className="text-[11px] text-gray-500 flex items-center gap-1">
                             <Navigation className="h-3 w-3 text-gray-500 pt-0.5" />
                             {displayAddress || "162 High St, Ashburton VIC 3147"}
                           </p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Star className="h-4 w-4 text-gray-400 -mt-3.5" />
                         <button className="text-gray-400 text-lg -mt-3.5">›</button>
                       </div>
                     </div>
                       
                       
                       {/* Divider */}
                       <div className="flex justify-center">
                       <div className="h-[1px] bg-gray-70 w-[100%]"></div>
                     </div>

                                         {/* Metrics Section */}
                     <div className={`bg-white ${cashbackProgram ? 'px-8' : 'px-6'} ${cashbackProgram ? 'py-2' : 'py-3'} rounded-b-2xl border-b border-gray-200`}>
                       <div className={`flex items-center ${cashbackProgram ? 'justify-between' : 'justify-around'}`}>
                         <div className="text-center">
                           <div className={`${cashbackProgram ? 'text-[14px]' : 'text-[16px]'} font-bold text-blue-500`}>750</div>
                           <div className="text-[10px] text-gray-500">Points</div>
                         </div>
                         {cashbackProgram && (
                           <div className="text-center">
                             <div className="text-[14px] font-bold text-green-500">$0.50</div>
                             <div className="text-[10px] text-gray-500">Tap Cash</div>
                           </div>
                         )}
                         <div className="text-center">
                           <div className={`${cashbackProgram ? 'text-[14px]' : 'text-[16px]'} font-bold text-amber-600`}>Bronze</div>
                           <div className="text-[10px] text-gray-500">Status</div>
                         </div>
                         <div className="text-center">
                           <div className={`${cashbackProgram ? 'text-[14px]' : 'text-[16px]'} font-bold text-black`}>2</div>
                           <div className="text-[10px] text-gray-500">Visits</div>
                         </div>
                       </div>
                     </div>

                                         {/* Content */}
                     <div 
                       className="flex-1 px-4 py-3 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                     >
                       





                       {/* Content based on active tab */}
                       {activeTab === 'rewards' ? (
                         <>
                                             {/* Coffee Card */}
                           {coffeeProgram && (
                             <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-gray-200">
                               <div className="flex items-center justify-between mb-1">
                                 <div className="flex items-center gap-1.5">
                                   <PiCoffeeFill className="h-3.5 w-3.5" style={{ color: '#8B4513' }} />
                                   <span className="font-medium text-gray-800 text-[12px]">Coffee Card</span>
                           </div>
                                 <span className="text-[10px] text-gray-700 font-medium bg-amber-50/50 px-1.5 py-0.5 rounded-xl">
                                   0/{coffeeProgram.frequency - 1}
                                 </span>
                         </div>
                         
                               <div className="flex items-center justify-between mb-1 px-3">
                                 {Array.from({ length: coffeeProgram.frequency - 1 }, (_, index) => (
                                   <div key={index} className="w-4 h-4 bg-gray-200 rounded-full"></div>
                                 ))}
                         </div>
                         
                               <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                 <Info className="h-2.5 w-2.5" />
                                 <span>{coffeeProgram.frequency - 1} purchases for a free coffee</span>
                               </div>
                             </div>
                           )}

                           {/* Cashback Card */}
                           {cashbackProgram && (
                             <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-green-100">
                               <div className="flex items-start justify-between">
                                 <div className="flex-1 min-w-0">
                                   <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                     Tap Cash
                                   </h3>
                                   <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                     {cashbackProgram.description || 'Tap to select amount and reduce your transaction'}
                                   </p>
                                   <div className="flex items-center gap-1.5 mt-1">
                                     <Fingerprint className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                                     <span className="text-[10px] text-gray-600 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                       Tap to use at {merchantName}
                                     </span>
                                   </div>
                                 </div>
                                 <div className="bg-green-500 text-white rounded-md px-2 py-0.5 ml-3 leading-none">
                                   <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                                     $0.50
                                   </span>
                                 </div>
                         </div>
                       </div>
                           )}

                           {/* Dynamic Rewards */}
                           {rewards.map(reward => renderRewardCard(reward))}

                           {/* No rewards message if no rewards exist */}
                           {rewards.length === 0 && !coffeeProgram && (
                       <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                               <div className="flex items-center justify-center py-2">
                                 <div className="text-center">
                                   <p className="text-[12px] text-gray-500">No rewards available yet</p>
                                 </div>
                         </div>
                       </div>
                           )}
                         </>
                       ) : (
                         <>
                           {/* Programs Tab Content */}
                           {customPrograms.length > 0 ? (
                             <>
                               {/* Custom Programs Section */}
                               <div className="mb-3">
                                 <h3 className="text-[14px] font-semibold text-black mb-2">Custom Programs</h3>
                                 {customPrograms.map(program => (
                                   <div key={program.id} className="bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-200 mb-2">
                                     <div 
                                       className="flex items-start justify-between mb-1.5 cursor-pointer"
                                       onClick={() => toggleProgramExpansion(program.id)}
                                     >
                                       <div className="flex-1">
                                         <h4 className="text-[13px] font-semibold text-black">{program.name}</h4>
                                         <p className="text-[11px] text-gray-500">{program.description}</p>
                                       </div>
                                       <div className="text-right">
                                         {(() => {
                                           const totalRewards = program.rewards?.length || 0
                                           const completedRewards = 1 // For demo, assume first reward is completed
                                           const progressPercentage = totalRewards > 0 ? Math.round((completedRewards / totalRewards) * 100) : 0
                                           
                                           return (
                                             <>
                                               <div className="text-[12px] font-bold text-blue-500">{completedRewards}/{totalRewards}</div>
                                               <div className="text-[9px] text-gray-500 mb-0.5">Available</div>
                                             </>
                                           )
                                         })()}
                                         <ChevronDown 
                                           className={cn(
                                             "h-3.5 w-3.5 text-gray-400 ml-auto transition-transform duration-200 -mb-1.5",
                                             expandedPrograms.has(program.id) && "rotate-180"
                                           )} 
                                         />
                                       </div>
                                     </div>
                                     
                                     <div className="flex items-center justify-between mb-0.5">
                                       <div className="text-[10px] text-gray-500">Program Progress</div>
                                       {(() => {
                                         const totalRewards = program.rewards?.length || 0
                                         const completedRewards = 1 // For demo, assume first reward is completed
                                         const progressPercentage = totalRewards > 0 ? Math.round((completedRewards / totalRewards) * 100) : 0
                                         
                                         return (
                                           <div className="text-[11px] font-medium text-blue-500">{progressPercentage}% Complete</div>
                                         )
                                       })()}
                                     </div>
                                     
                                     {/* Progress Bar */}
                                     {(() => {
                                       const totalRewards = program.rewards?.length || 0
                                       const completedRewards = 1 // For demo, assume first reward is completed
                                       const progressPercentage = totalRewards > 0 ? Math.round((completedRewards / totalRewards) * 100) : 0
                                       
                                       return (
                                         <div className="w-full bg-gray-200 rounded-full h-1">
                                           <div className="bg-blue-500 h-1 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
                                         </div>
                                       )
                                     })()}

                                     {/* Expandable Rewards Section */}
                                     <AnimatePresence>
                                       {expandedPrograms.has(program.id) && (
                                         <motion.div
                                           initial={{ height: 0, opacity: 0 }}
                                           animate={{ height: "auto", opacity: 1 }}
                                           exit={{ height: 0, opacity: 0 }}
                                           transition={{ 
                                             duration: 0.4,
                                             ease: [0.04, 0.62, 0.23, 0.98]
                                           }}
                                           className="overflow-hidden mt-3"
                                         >
                                           <div className="space-y-2">
                                             {/* Dynamic rewards from program */}
                                             {program.rewards && program.rewards.length > 0 ? (
                                               program.rewards.map((reward: any, rewardIndex: number) => {
                                                 // Determine if this reward is completed (for demo purposes, make first reward completed)
                                                 const isCompleted = rewardIndex === 0
                                                 const isSpendBased = reward.conditions && reward.conditions[0]?.type === 'minimumSpend'
                                                 
                                                 return (
                                                   <div key={rewardIndex} className="p-2 rounded-lg border border-gray-200">
                                                     <div className="flex items-center gap-2 mb-0.5">
                                                       <div className={cn(
                                                         "w-6 h-6 rounded-full border-2 flex items-center justify-center",
                                                         isCompleted 
                                                           ? "border-blue-500 bg-blue-500" 
                                                           : "border-gray-300"
                                                       )}>
                                                         {isCompleted ? (
                                                           <div className="text-white font-bold text-[10px] leading-none">✓</div>
                                                         ) : (
                                                           <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                                                         )}
                                                       </div>
                           <div className="flex-1">
                                                         <div className="text-[12px] font-medium text-black">{reward.name || reward.freeItemName}</div>
                                                         <div className="text-[10px] text-gray-500">{reward.description}</div>
                                                         
                                                         {/* Condition display */}
                                                         {isSpendBased ? (
                                                           <div className="text-[10px] text-blue-500">
                                                             Total spend ${reward.conditions[0]?.amount || 0}
                                                           </div>
                                                         ) : (
                                                           <div className="text-[10px] text-blue-500">
                                                             Visit #{reward.limitations?.[0]?.value || 1}
                                                           </div>
                                                         )}
                                                         
                                                         {/* Progress display */}
                             <div className="flex items-center gap-2">
                                                           {isSpendBased ? (
                                                             <>
                                                               <div className={cn(
                                                                 "text-[9px]",
                                                                 isCompleted ? "text-green-500" : "text-orange-500"
                                                               )}>
                                                                 ${isCompleted ? reward.conditions[0]?.amount : Math.floor((reward.conditions[0]?.amount || 0) * 0.1)}/${reward.conditions[0]?.amount || 0}
                                                               </div>
                                                               <div className="flex-1 bg-gray-200 rounded-full h-1">
                                                                 <div 
                                                                   className={cn(
                                                                     "h-1 rounded-full",
                                                                     isCompleted ? "bg-green-500" : "bg-blue-500"
                                                                   )} 
                                                                   style={{ width: isCompleted ? '100%' : '10%' }}
                                                                 ></div>
                                                               </div>
                                                             </>
                                                           ) : (
                                                             <>
                                                               <div className={cn(
                                                                 "text-[9px]",
                                                                 isCompleted ? "text-green-500" : "text-orange-500"
                                                               )}>
                                                                 {isCompleted ? reward.limitations?.[0]?.value || 1 : 0}/{reward.limitations?.[0]?.value || 1} visits
                                                               </div>
                                                               <div className="flex-1 bg-gray-200 rounded-full h-1">
                                                                 <div 
                                                                   className={cn(
                                                                     "h-1 rounded-full",
                                                                     isCompleted ? "bg-green-500" : "bg-blue-500"
                                                                   )} 
                                                                   style={{ width: isCompleted ? '100%' : '0%' }}
                                                                 ></div>
                                                               </div>
                                                             </>
                                                           )}
                                                         </div>
                                                       </div>
                                                       <span className={cn(
                                                         "text-[10px]",
                                                         isCompleted ? "text-blue-500" : "text-gray-500"
                                                       )}>
                                                         {isCompleted ? "Earned" : "Locked"}
                                                       </span>
                                                     </div>
                                                   </div>
                                                 )
                                               })
                                             ) : (
                                               <div className="text-center text-gray-500 text-[12px] py-4">
                                                 No rewards in this program
                                               </div>
                                             )}
                                           </div>
                                         </motion.div>
                                       )}
                                     </AnimatePresence>
                                   </div>
                                 ))}
                               </div>

                               {/* Recurring Programs Section */}
                               {(coffeeProgram || cashbackProgram) && (
                                 <div>
                                   <h3 className="text-[14px] font-semibold text-black mb-2">Recurring Programs</h3>
                                   
                                   {/* Coffee Program */}
                                   {coffeeProgram && (
                                     <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-gray-200 mb-2">
                                       <div className="flex items-center justify-between mb-1">
                                         <div className="flex items-center gap-1.5">
                                           <PiCoffeeFill className="h-3.5 w-3.5" style={{ color: '#8B4513' }} />
                                           <span className="font-medium text-gray-800 text-[12px]">Coffee Card</span>
                                         </div>
                                         <span className="text-[10px] text-gray-700 font-medium bg-amber-50/50 px-1.5 py-0.5 rounded-xl">
                                           3/{coffeeProgram.frequency - 1 || 4}
                                         </span>
                                       </div>
                                       
                                       <div className="flex items-center justify-between mb-1 px-3">
                                         {Array.from({ length: coffeeProgram.frequency - 1 || 4 }, (_, index) => (
                                           <div key={index} className={`w-4 h-4 rounded-full flex items-center justify-center ${index < 3 ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                             {index < 3 && (
                                               <div className="text-white font-bold text-[8px] leading-none">✓</div>
                                             )}
                                           </div>
                                         ))}
                                       </div>
                                       
                                       <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
                                         <Info className="h-2.5 w-2.5" />
                                         <span>1 more purchase for a free coffee</span>
                                       </div>
                                     </div>
                                   )}
                                 </div>
                               )}
                             </>
                           ) : (
                             <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                               <div className="text-center py-8">
                                 <h3 className="font-semibold text-black text-[13px] mb-2">No Programs Available</h3>
                                 <p className="text-[11px] text-gray-500">Check back later for loyalty programs</p>
                               </div>
                             </div>
                           )}
                         </>
                       )}
                           </div>

                    {/* Floating Filter Pill */}
                                          <div className="absolute bottom-20 left-4 z-10">
                      <div className="flex items-center bg-gray-100 p-0.5 rounded-2xl shadow-lg">
                        <button
                          onClick={() => setActiveTab('rewards')}
                          className={cn(
                            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium rounded-xl transition-colors",
                            activeTab === 'rewards'
                              ? "text-blue-500 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Gift className="h-3.5 w-3.5" />
                          Rewards
                        </button>
                        <button
                          onClick={() => setActiveTab('programs')}
                          className={cn(
                            "flex flex-col items-center gap-0.5 px-3 py-1 text-[10px] font-medium rounded-xl transition-colors",
                            activeTab === 'programs'
                              ? "text-blue-500 bg-white shadow-sm"
                              : "text-gray-600 hover:bg-gray-200/70"
                          )}
                        >
                          <Star className="h-3.5 w-3.5" />
                          Programs
                        </button>
                       </div>
                    </div>

                                         {/* Bottom Navigation */}
                     <div className="bg-gray-100 border-t border-gray-200 rounded-b-[49px] overflow-hidden">
                       <div className="flex items-center justify-around py-1 px-3">
                         <Button variant="ghost" className="flex-col gap-0 h-auto py-1 text-blue-500">
                           <Home style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px] font-medium">Home</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0 h-auto py-1 text-gray-500">
                           <Search style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px]">Browse</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0 h-auto py-1 text-gray-500">
                           <Store style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px]">My Stores</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0 h-auto py-1 text-gray-500">
                           <Settings style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px]">Settings</span>
                         </Button>
                       </div>
                       
                       {/* Home Indicator */}
                       <div className="flex justify-center pb-0">
                         <div className="w-28 h-1 bg-black rounded-full opacity-40"></div>
                       </div>
                       </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}