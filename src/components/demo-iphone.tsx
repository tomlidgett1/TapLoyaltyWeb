"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Gift, Home, Search, Store, Settings, Star, MoreHorizontal, Coffee, Info, Navigation, CreditCard } from "lucide-react"
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
  const [rewards, setRewards] = useState<any[]>([])
  const [isClosing, setIsClosing] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)

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
            category: data.category || 'individual'
          }
        })
        
        setRewards(fetchedRewards)
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

    // Welcome/Introductory gifts
    if (reward.isIntroductoryReward || reward.pointsCost === 0) {
      return (
        <div key={reward.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-black text-[13px]">{reward.rewardName}</h3>
              <p className="text-[11px] text-gray-500 mb-2">{reward.description}</p>
              <div className="flex items-center gap-2 text-[10px]">
                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-[7px] text-white font-bold">!</span>
                </div>
                <span className="text-gray-600">
                  {reward.isIntroductoryReward ? 'Welcome gift available' : 'Free reward available'}
                </span>
              </div>
            </div>
            <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-3 py-1.5 text-[11px] font-medium ml-2">
              + {reward.isIntroductoryReward ? 'Welcome Gift' : 'Claim'}
            </Button>
          </div>
        </div>
      )
    }

    // Voucher rewards
    if (reward.programType === 'voucher' || reward.programType === 'voucherprogramnew') {
      return (
        <div key={reward.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-black text-[13px]">{reward.rewardName}</h3>
              <p className="text-[11px] text-gray-500 mb-2">{reward.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-orange-600">
                  ${reward.voucherAmount || '0'} Voucher
                </span>
              </div>
            </div>
            <div className="bg-orange-400 text-white rounded-full px-2.5 py-1 text-[10px] font-medium flex items-center gap-1">
              <CreditCard className="h-3 w-3" />
              {reward.pointsCost} ⚡
            </div>
          </div>
        </div>
      )
    }

    // Regular points-based rewards
    return (
      <div key={reward.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-black text-[13px]">{reward.rewardName}</h3>
            <p className="text-[11px] text-gray-500 mb-2">{reward.description}</p>
          </div>
          <div className="bg-blue-500 text-white rounded-full px-2.5 py-1 text-[10px] font-medium flex items-center gap-1">
            {reward.pointsCost}
            <Star className="h-3 w-3 fill-white" />
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
        className="fixed right-0 top-0 h-full w-full max-w-lg z-50 bg-transparent transition-transform duration-300 ease-out"
        style={{ 
          transform: (!shouldAnimate || isClosing) ? 'translateX(100%)' : 'translateX(0)' 
        }}
      >
        <div className="flex items-center justify-center min-h-screen p-8">
          

          {/* iPhone 16 Pro */}
          <div className="relative">
            {/* Phone Shadow */}
            <div className="absolute inset-0 bg-black/30 blur-xl transform translate-y-8 scale-105 rounded-[3.5rem]"></div>
            
                         {/* Outer Frame - Black */}
             <div 
               className="relative bg-[#2F3336] rounded-[3.5rem] p-[5px] shadow-2xl"
               style={{ width: '340px', height: '736px' }}
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
              <div className="h-full w-full bg-black rounded-[3.4rem] p-[2px]">
                
                {/* Screen */}
                <div className="h-full w-full bg-white rounded-[3.3rem] overflow-hidden relative">
                  
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
                     <div className="bg-white px-4 py-3 rounded-b-2xl border-b border-gray-200">
                       <div className="flex items-center justify-around">
                         <div className="text-center">
                           <div className="text-[16px] font-bold text-blue-500">8,850</div>
                           <div className="text-[10px] text-gray-500">Points</div>
                         </div>
                         <div className="text-center">
                           <div className="text-[16px] font-bold text-amber-600">Bronze</div>
                           <div className="text-[10px] text-gray-500">Status</div>
                         </div>
                         <div className="text-center">
                           <div className="text-[16px] font-bold text-black">10</div>
                           <div className="text-[10px] text-gray-500">Visits</div>
                         </div>
                       </div>
                     </div>

                                         {/* Content */}
                     <div 
                       className="flex-1 px-4 py-3 space-y-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                     >
                       

                                             {/* Coffee Card */}
                       {coffeeProgram && (
                         <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-200">
                           <div className="flex items-center justify-between mb-2">
                             <div className="flex items-center gap-2">
                               <Coffee className="h-4 w-4 text-amber-600" />
                               <span className="font-semibold text-black text-[13px]">Coffee Card</span>
                             </div>
                             <span className="text-[11px] text-gray-700 font-medium bg-amber-50 px-2 py-0.5 rounded-2xl">
                               0/{coffeeProgram.frequency - 1}
                             </span>
                           </div>
                           
                           <div className="flex items-center justify-between mb-2">
                             {Array.from({ length: coffeeProgram.frequency - 1 }, (_, index) => (
                               <div key={index} className="w-5 h-5 bg-gray-200 rounded-full"></div>
                             ))}
                           </div>
                           
                           <div className="flex items-center gap-2 text-[11px] text-gray-600">
                             <Info className="h-3 w-3" />
                             <span>{coffeeProgram.frequency - 1} purchases for a free coffee</span>
                           </div>
                         </div>
                       )}

                       {/* Dynamic Rewards */}
                       {rewards.map(reward => renderRewardCard(reward))}

                       {/* Fallback rewards if no rewards exist */}
                       {rewards.length === 0 && !coffeeProgram && (
                         <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200">
                           <div className="flex items-center justify-between">
                             <div className="flex-1">
                               <h3 className="font-semibold text-black text-[13px]">Welcome Gift</h3>
                               <p className="text-[11px] text-gray-500 mb-2">Special offer for new customers</p>
                               <div className="flex items-center gap-2 text-[10px]">
                                 <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                                   <span className="text-[7px] text-white font-bold">!</span>
                                 </div>
                                 <span className="text-gray-600">You have 1 x welcome gift across all merchants</span>
                               </div>
                             </div>
                             <Button className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-3 py-1.5 text-[11px] font-medium ml-2">
                               + Welcome Gift
                             </Button>
                           </div>
                         </div>
                       )}
                    </div>

                    

                                         {/* Bottom Navigation */}
                     <div className="bg-gray-100 border-t border-gray-200 rounded-b-[3.3rem] overflow-hidden">
                       <div className="flex items-center justify-around py-2 px-3">
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-blue-500">
                           <Home style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px] font-medium">Home</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
                           <Search style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px]">Browse</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
                           <Store style={{ width: '22px', height: '22px' }} />
                           <span className="text-[9px]">My Stores</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
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
    </>
  )
}