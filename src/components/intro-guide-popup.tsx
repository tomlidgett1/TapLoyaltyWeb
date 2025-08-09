"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useMerchant } from "@/hooks/use-merchant"
import { DemoIPhone } from "@/components/demo-iphone"
  import {
    Sparkles,
    Gift,
    Star,
    Coffee,
    Mail,
    Image as ImageIcon,
    Crown,
    Layers,
    Repeat,
    Link as LinkIcon,
    CreditCard,
    Coins,
    Wand2,
    Megaphone,
    CheckCircle2,
    Headphones,
    X,
    ArrowRight,
    Users,
    TrendingUp,
    MessageSquare,
    Zap,
    Target,
    BarChart3,
    Smile,
    Shield,
    Award,
    Info,
    Fingerprint
  } from "lucide-react"

type IntroGuidePopupProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function IntroGuidePopup({ open, onOpenChange }: IntroGuidePopupProps) {
  const { merchant } = useMerchant()
  const [showDemoIPhone, setShowDemoIPhone] = useState(false)
  
  const pages: {
    title: string
    subtitle: string
    description?: string
    features?: { icon: any; text: string }[]
    visual?: "welcome" | "rewards" | "programs" | "messages" | "intro-rewards" | "banners" | "tapcash"
    key: string
  }[] = [
    {
      title: "Welcome to Tap",
      subtitle: "Build lasting customer relationships",
      description: "Tap transforms one-time buyers into loyal customers through intelligent rewards and targeted messaging.",
      features: [
        { icon: Users, text: "Grow repeat customers" },
        { icon: TrendingUp, text: "Increase average spend" },
        { icon: Target, text: "Drive engagement" }
      ],
      key: "welcome"
    },
    {
      title: "How Tap Works",
      subtitle: "Simple, powerful, effective",
      description: "Three core components work together to create a complete loyalty experience.",
      features: [
        { icon: Gift, text: "Rewards that customers love" },
        { icon: Layers, text: "Programs that run themselves" },
        { icon: MessageSquare, text: "Messages that drive action" }
      ],
      key: "what"
    },
    {
      title: "Why Tap is Different",
      subtitle: "Australia's first bank-linked loyalty",
      description: "Welcome to the future of loyalty programs – where everything just works.",
      features: [
        { icon: Award, text: "Australia's first: Bank-linked loyalty technology" },
        { icon: Users, text: "One signup: Customers join once, work everywhere" },
        { icon: X, text: "No hassle: No QR codes, cards, or store signups" },
        { icon: Zap, text: "Automatic: Shop → Pay → Points added instantly" },
        { icon: TrendingUp, text: "The future: Leading the loyalty revolution" }
      ],
      key: "different"
    },
    {
      title: "What is Bank-Linked Loyalty?",
      subtitle: "Powered by Open Banking technology",
      description: "When a customer pays with their usual card, Tap quietly gives them points – no extra gadgets or work for you.",
      features: [
        { icon: CreditCard, text: "Customer pays as normal" },
        { icon: X, text: "No loyalty cards or apps" },
        { icon: Zap, text: "Points added automatically" },
        { icon: Smile, text: "Happy, loyal customers" }
      ],
      key: "openbanking"
    },
    {
      title: "Types of Rewards",
      subtitle: "Different treats for different needs",
      description: "Think of rewards like treats in a candy shop – each type makes customers happy in its own way.",
      features: [
        { icon: Sparkles, text: "Intro Rewards: Welcome gifts for new customers" },
        { icon: Gift, text: "Basic Rewards: Everyday treats for loyal customers" },
        { icon: Coffee, text: "Recurring Programs: Buy 9, get 1 free cards" },
        { icon: Wand2, text: "Custom Programs: Your own special offers" }
      ],
      key: "rewardtypes"
    },
    {
      title: "Rewards vs Programs",
      subtitle: "What's the difference?",
      description: "Think of it like this: Rewards are instant treats, Programs are journey rewards.",
      features: [
        { icon: Gift, text: "Rewards: One-time treats customers can grab right away" },
        { icon: Target, text: "Example: 20% off next purchase, free dessert today" },
        { icon: Layers, text: "Programs: Multi-visit journeys with a big prize at the end" },
        { icon: Coffee, text: "Example: Buy 9 coffees, get the 10th free" },
        { icon: Repeat, text: "Programs keep customers coming back to reach their goal!" }
      ],
      key: "rewardsvsprograms"
    },
    {
      title: "Rewards",
      subtitle: "Create offers customers can't resist",
      description: "From welcome gifts to point-based rewards, design offers that match your business.",
      visual: "rewards",
      key: "rewards"
    },
    {
      title: "Programs",
      subtitle: "Automated loyalty that scales",
      description: "Coffee cards, cashback, and custom programs that keep customers coming back.",
      visual: "programs",
      key: "programs"
    },
    {
      title: "Tap Cash",
      subtitle: "Store credit that keeps customers coming back",
      description: "Customers earn cashback on every purchase, building up credit they can use on future visits to your store.",
      features: [
        { icon: CreditCard, text: "Earn cashback on every purchase" },
        { icon: Coins, text: "Builds store credit over time" },
        { icon: TrendingUp, text: "Drives repeat visits" }
      ],
      visual: "tapcash",
      key: "tapcash"
    },
    {
      title: "Messages",
      subtitle: "Right message, right time, right customer",
      description: "Broadcast announcements or target specific segments with personalised offers.",
      visual: "messages",
      key: "messages"
    },
    {
      title: "Intro Rewards",
      subtitle: "Free welcome gifts – funded by Tap Loyalty, not you!",
      description: "Customers get ONE free gift across all Tap stores. You create options, Tap covers the cost.",
      features: [
        { icon: Gift, text: "Zero cost to you" },
        { icon: Users, text: "Attracts new customers" },
        { icon: Sparkles, text: "Builds loyalty from day one" }
      ],
      visual: "intro-rewards",
      key: "introrewards"
    },
    {
      title: "Banners",
      subtitle: "Eye-catching promotions in the customer app",
      description: "Create beautiful banners that appear at the top of the customer app homepage to announce sales, events, or special offers.",
      visual: "banners",
      key: "banners"
    },
    {
      title: "Ready to Get Started?",
      subtitle: "Launch in under 10 minutes",
      features: [
        { icon: CheckCircle2, text: "Upload your logo" },
        { icon: CheckCircle2, text: "Create a welcome gift" },
        { icon: CheckCircle2, text: "Go live" }
      ],
      key: "getstarted"
    }
  ]

  const [index, setIndex] = useState(0)
  const [showOpenBankInfo, setShowOpenBankInfo] = useState(false)

  useEffect(() => {
    if (!open) setIndex(0)
  }, [open])

  if (!open) return null

  const isLast = index === pages.length - 1
  const current = pages[index]

  function FeatureList({ features }: { features: { icon: any; text: string }[] }) {
    return (
      <div className="space-y-3 mt-6">
        {features.map((feature, i) => (
          <div key={i} className="flex items-center gap-2.5 group">
            <feature.icon className="h-4 w-4 text-gray-400" />
            <span className="text-[13.5px] text-gray-700">{feature.text}</span>
          </div>
        ))}
      </div>
    )
  }

  function ModernVisual({ type }: { type: string }) {
    if (type === "welcome") {
      return (
        <div className="relative w-full h-[200px] mt-8">
          <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] via-[#0051D5] to-[#003FA5] rounded-2xl opacity-10"></div>
          <div className="relative h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-white rounded-sm shadow-lg flex items-center justify-center mb-2">
                <img src="/taplogo.png" alt="Tap" className="w-12 h-12 object-contain" />
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    if (type === "intro-rewards") {
      return (
        <div className="relative w-full mt-8 space-y-3">
          {/* Intro Reward Card - styled like demo-iphone.tsx */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 max-w-xs">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Welcome Gift
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Choose your free welcome gift
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[6px] text-white font-bold">!</span>
                  </div>
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    You have 1 x welcome gift across all merchants
                  </span>
                </div>
              </div>
              <div className="bg-blue-500 text-white rounded-md px-2 py-1 ml-3 flex items-center">
                <Sparkles className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium">
                  Welcome Gift
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    if (type === "banners") {
      return (
        <div className="relative w-full mt-8">
          {/* Banner Preview - styled like create-banner-dialog.tsx */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 max-w-sm text-white relative overflow-hidden">
            <div className="flex">
              <div className="flex-1 z-10">
                <div className="flex items-center gap-2 mb-1">
                  {merchant?.logoUrl ? (
                    <img 
                      src={merchant.logoUrl} 
                      alt={merchant.merchantName}
                      className="w-6 h-6 rounded-md object-cover bg-white"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
                      <span className="text-xs font-medium">
                        {merchant?.merchantName?.charAt(0)?.toUpperCase() || 'M'}
                      </span>
                    </div>
                  )}
                  <div className="text-xs font-medium px-2 py-1 rounded-md bg-black/10 inline-block">
                    {merchant?.merchantName || 'Your Store'}
                  </div>
                </div>
                <h3 className="text-lg font-bold mb-1">
                  Summer Sale
                </h3>
                <p className="text-sm text-gray-100">
                  Hot deals all season long
                </p>
                <button className="mt-2 text-sm font-medium text-white">
                  Shop Now →
                </button>
              </div>
              
              <div className="absolute top-0 right-0 opacity-20">
                <Gift className="w-24 h-24 text-white" />
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    if (type === "rewards") {
      return (
        <div className="relative w-full mt-8 space-y-3">
          {/* Free Reward Card - styled like demo-iphone.tsx */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 max-w-xs">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Welcome Gift
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Free coffee on your first visit
                </p>
              </div>
              <div className="bg-green-500 text-white rounded-md px-2 py-1 ml-3">
                <span className="text-xs font-medium">
                  Free
                </span>
              </div>
            </div>
          </div>
          
          {/* Points Reward Card - styled like demo-iphone.tsx */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm px-3 py-2 max-w-xs">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Birthday Reward
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  20% off your entire order
                </p>
              </div>
              <div className="bg-blue-500 text-white rounded-md px-2 py-1 ml-3 flex items-center">
                <span className="text-xs font-medium">
                  500
                </span>
                <Star className="w-3 h-3 ml-1 fill-white" />
              </div>
            </div>
          </div>
        </div>
      )
    }
    
        if (type === "programs") {
      return (
        <div className="relative w-full mt-8">
          {/* Coffee Card - styled exactly like demo-iphone.tsx */}
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-gray-200 max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Coffee className="h-3.5 w-3.5" style={{ color: '#8B4513' }} />
                <span className="font-medium text-gray-800 text-[12px]">Coffee Card</span>
              </div>
              <span className="text-[10px] text-gray-700 font-medium bg-amber-50/50 px-1.5 py-0.5 rounded-xl">
                3/9
              </span>
            </div>
            
            <div className="flex items-center justify-between mb-1 px-3">
              {Array.from({ length: 9 }, (_, index) => (
                <div key={index} className={`w-4 h-4 ${index < 3 ? 'bg-blue-500' : 'bg-gray-200'} rounded-full`}></div>
              ))}
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600">
              <Info className="h-2.5 w-2.5" />
              <span>6 more purchases for a free coffee</span>
            </div>
          </div>
        </div>
      )
    }
    
    if (type === "messages") {
      return (
        <div className="relative w-full mt-8 space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center shadow-sm">
                <Megaphone className="h-4 w-4 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900 mb-1 text-[13.5px]">New rewards available!</div>
                <div className="text-[12.5px] text-gray-600">Check out our latest offers just for you.</div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">Sent to 1,234 customers</span>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">73% open rate</span>
          </div>
        </div>
      )
    }
    
    if (type === "tapcash") {
      return (
        <div className="relative w-full mt-8">
          {/* Tap Cash Card - styled exactly like demo-iphone.tsx */}
          <div className="bg-white rounded-xl px-2.5 py-1.5 shadow-sm border border-green-100 max-w-xs">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  Tap Cash
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tap to select amount and reduce your transaction
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Fingerprint className="w-2.5 h-2.5 text-green-500 flex-shrink-0" />
                  <span className="text-[10px] text-gray-600 whitespace-nowrap">
                    Tap to use at Coffee Corner
                  </span>
                </div>
              </div>
              <div className="bg-green-500 text-white rounded-md px-2 py-0.5 ml-3 leading-none">
                <span className="text-xs font-medium">
                  $2.50
                </span>
              </div>
            </div>
          </div>
        </div>
      )
    }
    
    // removed analytics visual per request
    
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-200"
        style={{ backdropFilter: "blur(8px)" }}
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "bg-white rounded-2xl w-[720px] max-w-[90vw] h-[600px] max-h-[85vh] shadow-2xl overflow-hidden flex flex-col",
            "animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 py-5 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/taplogo.png" alt="Tap" className="w-7 h-7 object-contain rounded-sm" />
                <span className="text-base font-semibold text-gray-900">Tap Loyalty</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  {pages.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-1.5 transition-all duration-300",
                        i === index 
                          ? "w-8 bg-[#007AFF] rounded-full" 
                          : "w-1.5 bg-gray-300 rounded-full hover:bg-gray-400"
                      )} 
                    />
                  ))}
                </div>
                <button 
                  aria-label="Close" 
                  onClick={() => onOpenChange(false)} 
                  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 flex-1 overflow-y-auto text-[13.5px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="min-h-full w-full flex items-center justify-center py-4">
              <div className="max-w-lg w-full">
                <div className="mb-2 text-left">
                  <h2 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-[#007AFF] to-[#0051D5]">{current.title}</h2>
                  <p className="text-[13.5px] text-gray-600 leading-relaxed">{current.subtitle}</p>
                  {current.description && (
                    <p className="text-[13.5px] text-gray-500 mt-2 leading-relaxed">{current.description}</p>
                  )}
                  {current.key === "openbanking" && (
                    <div className="mt-3">
                      <Popover open={showOpenBankInfo} onOpenChange={setShowOpenBankInfo}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-sm text-[#007AFF] border-[#007AFF] hover:bg-[#007AFF]/5">
                            How does this magic work?
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-[12.5px]">
                          <p className="mb-2 font-medium text-gray-900">The Simple Explanation</p>
                          <p className="text-gray-700 leading-relaxed">
                            When customers sign up, they connect their bank card (super secure!). When they buy from you, 
                            their bank tells Tap "they just spent money at your shop" – and boom, we add their points instantly. 
                            No scanning, no fuss!
                          </p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>
                
                {current.features && (
                  <div className="text-left">
                    <FeatureList features={current.features} />
                  </div>
                )}
                {current.visual && (
                  <div className="text-left">
                    <ModernVisual type={current.visual} />
                    {(current.visual === "rewards" || current.visual === "programs" || current.visual === "intro-rewards" || current.visual === "tapcash") && (
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md border-gray-200 hover:bg-gray-50 flex items-center gap-2"
                          onClick={() => setShowDemoIPhone(true)}
                        >
                          <img 
                            src="/apple-logo.png" 
                            alt="Apple" 
                            className="w-4 h-4 object-contain"
                          />
                          <span className="text-[13.5px]">Preview in App</span>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-gradient-to-r from-white to-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-md text-gray-600 hover:text-gray-900"
                    onClick={() => setIndex(index - 1)}
                  >
                    Back
                  </Button>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  className={cn(
                    "rounded-md px-6 font-medium",
                    isLast 
                      ? "bg-gradient-to-r from-[#007AFF] to-[#0051D5] text-white hover:from-[#0051D5] hover:to-[#003FA5]" 
                      : "bg-[#007AFF] text-white hover:bg-[#0051D5]"
                  )}
                  onClick={() => {
                    if (isLast) {
                      onOpenChange(false)
                    } else {
                      setIndex(index + 1)
                    }
                  }}
                >
                  {isLast ? (
                    <>Get Started<ArrowRight className="ml-2 h-4 w-4" /></>
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Demo iPhone Popup */}
      <DemoIPhone 
        open={showDemoIPhone} 
        onOpenChange={setShowDemoIPhone}
        isDemoMode={true}
      />
    </div>
  )
}

export default IntroGuidePopup


