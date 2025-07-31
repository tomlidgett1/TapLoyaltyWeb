"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Gift, Home, Search, Store, Settings, Star, MoreHorizontal, Coffee, Info } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"

interface DemoIPhoneProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DemoIPhone({ open, onOpenChange }: DemoIPhoneProps) {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string>("")

  useEffect(() => {
    const fetchMerchantLogo = async () => {
      if (!user?.uid) return
      
      try {
        const merchantDoc = await getDoc(doc(db, "merchants", user.uid))
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          setLogoUrl(data.logoUrl || "")
        }
      } catch (error) {
        console.error("Error fetching merchant logo:", error)
      }
    }

    if (open) {
      fetchMerchantLogo()
    }
  }, [user?.uid, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 bg-transparent border-0 shadow-none">
        <div className="flex items-center justify-center min-h-screen p-8">
          {/* Close Button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute top-8 right-8 z-50 p-3 rounded-full bg-black/80 hover:bg-black transition-colors backdrop-blur-sm"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {/* iPhone 16 Pro */}
          <div className="relative">
            {/* Phone Shadow */}
            <div className="absolute inset-0 bg-black/30 blur-xl transform translate-y-8 scale-105 rounded-[3.5rem]"></div>
            
                         {/* Outer Frame - Black */}
             <div 
               className="relative bg-black rounded-[3.5rem] p-[4px] shadow-2xl"
               style={{ width: '340px', height: '736px' }}
             >
              
              {/* Side Buttons */}
              {/* Mute Switch */}
              <div className="absolute -left-[2px] top-[94px] w-[3px] h-[24px] bg-gradient-to-r from-gray-400 to-gray-300 rounded-r-md"></div>
              
              {/* Volume Buttons */}
              <div className="absolute -left-[2px] top-[136px] w-[3px] h-[28px] bg-gradient-to-r from-gray-400 to-gray-300 rounded-r-md"></div>
              <div className="absolute -left-[2px] top-[176px] w-[3px] h-[28px] bg-gradient-to-r from-gray-400 to-gray-300 rounded-r-md"></div>
              
              {/* Power Button */}
              <div className="absolute -right-[2px] top-[154px] w-[3px] h-[42px] bg-gradient-to-l from-gray-400 to-gray-300 rounded-l-md"></div>
              
              {/* Camera Control */}
              <div className="absolute -right-[2px] top-[222px] w-[3px] h-[20px] bg-gradient-to-l from-gray-400 to-gray-300 rounded-l-md"></div>

              {/* Inner Frame */}
              <div className="h-full w-full bg-black rounded-[3.4rem] p-[2px]">
                
                {/* Screen */}
                <div className="h-full w-full bg-white rounded-[3.3rem] overflow-hidden relative">
                  
                                     {/* Dynamic Island */}
                   <div className="absolute top-[12px] left-1/2 transform -translate-x-1/2 w-[110px] h-[32px] bg-black rounded-full z-50"></div>
                  
                                     {/* Status Bar */}
                   <div className="flex items-center justify-center px-7 pt-[15px] pb-0 bg-white relative z-40">
                     <div className="flex items-center justify-between w-full max-w-[200px]">
                       <div className="text-[14px] font-semibold text-black -ml-2">4:39</div>
                       <div className="flex items-center gap-[4px] ml-2">
                         {/* Cellular */}
                         <svg width="14" height="9" viewBox="0 0 14 9" className="fill-black">
                           <rect x="0" y="6" width="1.5" height="3" rx="0.3"/>
                           <rect x="2.5" y="4.5" width="1.5" height="4.5" rx="0.3"/>
                           <rect x="5" y="3" width="1.5" height="6" rx="0.3"/>
                           <rect x="7.5" y="1.5" width="1.5" height="7.5" rx="0.3"/>
                           <rect x="10" y="0" width="1.5" height="9" rx="0.3"/>
                         </svg>
                         {/* Battery */}
                         <div className="flex items-center gap-[1px]">
                           <div className="w-[20px] h-[9px] border border-black rounded-[1.5px] relative">
                             <div className="absolute inset-[1.5px] bg-black rounded-[0.5px]"></div>
                           </div>
                           <div className="w-[1.5px] h-[4px] bg-black rounded-r-full"></div>
                         </div>
                       </div>
                     </div>
                   </div>

                                     {/* App Content */}
                   <div className="bg-gray-100 overflow-hidden flex flex-col" style={{ height: 'calc(100% - 51px)' }}>
                    
                                         {/* Header */}
                     <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                       <div className="flex items-center gap-2.5">
                         <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm overflow-hidden">
                           {logoUrl ? (
                             <img 
                               src={logoUrl} 
                               alt="Store Logo" 
                               className="w-full h-full object-cover rounded-lg"
                             />
                           ) : (
                             <div className="w-4 h-4 bg-white rounded-sm"></div>
                           )}
                         </div>
                         <div>
                           <h1 className="text-[16px] font-bold text-black">test</h1>
                           <p className="text-[11px] text-gray-500">📍 162 High St, Ashburton VIC 3147</p>
                         </div>
                       </div>
                       <div className="flex items-center gap-2">
                         <Star className="h-4 w-4 text-gray-400" />
                         <button className="text-gray-400 text-lg">›</button>
                       </div>
                     </div>

                                         {/* Metrics Section */}
                     <div className="bg-white px-4 py-3 border-b border-gray-100 rounded-b-2xl">
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
                       <div className="bg-white rounded-xl p-2.5 shadow-sm border border-gray-100/80">
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <Coffee className="h-4 w-4 text-amber-600" />
                             <span className="font-semibold text-black text-[13px]">Coffee Card</span>
                           </div>
                           <span className="text-[11px] text-gray-500 font-medium">0/4</span>
                         </div>
                         
                         <div className="flex items-center justify-between mb-2">
                           <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                           <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                           <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                           <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                         </div>
                         
                         <div className="flex items-center gap-2 text-[11px] text-gray-600">
                           <Info className="h-3 w-3" />
                           <span>4 purchases for a free coffee</span>
                         </div>
                       </div>

                                             {/* Welcome Gift */}
                       <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100/80">
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

                                             {/* $10 Off */}
                       <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100/80">
                         <div className="flex items-center justify-between">
                           <div className="flex-1">
                             <h3 className="font-semibold text-black text-[13px]">$10 Off Purchase</h3>
                             <p className="text-[11px] text-gray-500 mb-2">Save on your next order</p>
                             <div className="flex items-center gap-2">
                               <span className="text-[14px] font-bold text-green-600">$10 Off</span>
                               <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                 <Info className="h-3 w-3" />
                                 <span>Min. spend: $50</span>
                               </div>
                             </div>
                           </div>
                           <div className="bg-gray-200 text-gray-700 rounded-full px-2.5 py-1 text-[10px] font-medium">
                             100 ⚡
                           </div>
                         </div>
                       </div>
                    </div>

                    

                                         {/* Bottom Navigation */}
                     <div className="bg-gray-100 border-t border-gray-200 rounded-b-[3.3rem] overflow-hidden">
                       <div className="flex items-center justify-around py-2 px-3">
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-blue-500">
                           <Home className="h-4 w-4" />
                           <span className="text-[9px] font-medium">Home</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
                           <Search className="h-4 w-4" />
                           <span className="text-[9px]">Browse</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
                           <Store className="h-4 w-4" />
                           <span className="text-[9px]">My Stores</span>
                         </Button>
                         <Button variant="ghost" className="flex-col gap-0.5 h-auto py-1.5 text-gray-500">
                           <Settings className="h-4 w-4" />
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
      </DialogContent>
    </Dialog>
  )
}