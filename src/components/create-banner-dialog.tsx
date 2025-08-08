"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogPortal } from "@/components/ui/dialog"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, collection, addDoc, updateDoc, getDoc } from "firebase/firestore"
import { Store, Gift, Sparkles, Users, UserPlus, ChevronLeft, ChevronRight, Edit, Copy, PenLine, Library, HelpCircle, X, Check, Plus, Info } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"
import { HexColorPicker } from "react-colorful"
import { cn } from "@/lib/utils"

// Banner enumerations
export const BannerVisibility = {
  ALL: 'All customers',
  NEW: 'New customers',
  SELECTED: 'Selected customers',
}

export const BannerStyle = {
  LIGHT: 'light',
  DARK: 'dark',
  GLASS: 'glass',
}

export const BannerAction = {
  STORE_REDIRECT: 'Take to store page',
  SHOW_ANNOUNCEMENT: 'Show announcement',
}

interface CreateBannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBannerData?: any
  onSave?: (bannerData: any) => void
}

// Pre-made banner templates with shorter text
const bannerTemplates = [
  {
    id: "seasonal-sale",
    title: "Seasonal Sale",
    description: "Limited offers on popular items",
    buttonText: "Shop Now",
    color: "#FF9500", // orange
    style: BannerStyle.DARK,
    category: "promotional"
  },
  {
    id: "welcome-new",
    title: "Welcome to Rewards",
    description: "Earn points with every purchase",
    buttonText: "Learn More",
    color: "#007AFF", // blue
    style: BannerStyle.LIGHT,
    category: "onboarding"
  },
  {
    id: "coffee-promo",
    title: "Coffee Loyalty",
    description: "Buy 9 coffees, get your 10th free",
    buttonText: "Join Now",
    color: "#AF52DE", // purple
    style: BannerStyle.GLASS,
    category: "loyalty"
  },
  {
    id: "holiday-special",
    title: "Holiday Special",
    description: "Limited-time holiday offers",
    buttonText: "Explore",
    color: "#FF3B30", // red
    style: BannerStyle.DARK,
    category: "seasonal"
  },
  {
    id: "points-boost",
    title: "2X Points Weekend",
    description: "Double points on all purchases",
    buttonText: "View Details",
    color: "#34C759", // green
    style: BannerStyle.LIGHT,
    category: "promotional"
  },
  {
    id: "new-product",
    title: "New Arrivals",
    description: "Check out our latest collection",
    buttonText: "Shop New",
    color: "#5856D6", // indigo
    style: BannerStyle.GLASS,
    category: "promotional"
  },
  {
    id: "birthday-reward",
    title: "Birthday Reward",
    description: "Celebrate with a free gift from us",
    buttonText: "Redeem",
    color: "#FF2D55", // pink
    style: BannerStyle.DARK,
    category: "loyalty"
  },
  {
    id: "app-download",
    title: "Download Our App",
    description: "Get exclusive offers & faster checkout",
    buttonText: "Download",
    color: "#5AC8FA", // light blue
    style: BannerStyle.LIGHT,
    category: "promotional"
  },
  {
    id: "referral-program",
    title: "Refer a Friend",
    description: "Earn 500 bonus points per referral",
    buttonText: "Refer Now",
    color: "#4CD964", // light green
    style: BannerStyle.GLASS,
    category: "loyalty"
  },
  {
    id: "flash-sale",
    title: "Flash Sale: 24h Only",
    description: "30% off storewide - today only!",
    buttonText: "Shop Sale",
    color: "#FF6482", // rose
    style: BannerStyle.DARK,
    category: "promotional"
  },
  {
    id: "membership-upgrade",
    title: "Upgrade Membership",
    description: "Unlock premium Gold tier benefits",
    buttonText: "Upgrade",
    color: "#FFCC00", // yellow
    style: BannerStyle.LIGHT,
    category: "loyalty"
  },
  {
    id: "free-shipping",
    title: "Free Shipping Weekend",
    description: "Free shipping on all orders",
    buttonText: "Shop Now",
    color: "#007AFF", // blue
    style: BannerStyle.GLASS,
    category: "promotional"
  },
  {
    id: "loyalty-milestone",
    title: "Milestone Achieved!",
    description: "You've reached 1,000 points!",
    buttonText: "Claim Reward",
    color: "#AF52DE", // purple
    style: BannerStyle.DARK,
    category: "loyalty"
  },
  {
    id: "back-to-school",
    title: "Back to School Sale",
    description: "Discounts on all school essentials",
    buttonText: "Shop Now",
    color: "#5AC8FA", // light blue
    style: BannerStyle.GLASS,
    category: "seasonal"
  },
  {
    id: "new-location",
    title: "New Location Open!",
    description: "Visit & get a special welcome gift",
    buttonText: "Get Directions",
    color: "#34C759", // green
    style: BannerStyle.DARK,
    category: "promotional"
  },
  {
    id: "customer-appreciation",
    title: "Customer Appreciation",
    description: "Special perks all week long",
    buttonText: "See Offers",
    color: "#FF9500", // orange
    style: BannerStyle.LIGHT,
    category: "promotional"
  },
  {
    id: "first-purchase",
    title: "First Purchase Bonus",
    description: "Get 2X points on your first order",
    buttonText: "Shop Now",
    color: "#007AFF", // blue
    style: BannerStyle.DARK,
    category: "new-customers"
  },
  {
    id: "welcome-discount",
    title: "Welcome Discount",
    description: "10% off your first purchase",
    buttonText: "Use Code: NEW10",
    color: "#FF3B30", // red
    style: BannerStyle.LIGHT,
    category: "new-customers"
  },
  {
    id: "vip-exclusive",
    title: "VIP Member Exclusive",
    description: "Special offers for our loyal members",
    buttonText: "View Offers",
    color: "#AF52DE", // purple
    style: BannerStyle.GLASS,
    category: "existing-customers"
  },
  {
    id: "loyalty-tier-upgrade",
    title: "You're Almost Gold!",
    description: "Just 200 more points to upgrade",
    buttonText: "Learn More",
    color: "#FFCC00", // yellow
    style: BannerStyle.DARK,
    category: "existing-customers"
  },
  {
    id: "coffee-happy-hour",
    title: "Coffee Happy Hour",
    description: "Half-price coffee from 2-4pm daily",
    buttonText: "Set Reminder",
    color: "#5856D6", // indigo
    style: BannerStyle.LIGHT,
    category: "cafe"
  },
  {
    id: "new-blend",
    title: "Try Our New Blend",
    description: "Ethically sourced Colombian beans",
    buttonText: "Order Now",
    color: "#4CD964", // light green
    style: BannerStyle.GLASS,
    category: "cafe"
  },
  {
    id: "breakfast-deal",
    title: "Breakfast Deal",
    description: "Coffee & pastry for just $5.99",
    buttonText: "View Menu",
    color: "#FF9500", // orange
    style: BannerStyle.DARK,
    category: "cafe"
  },
  {
    id: "summer-collection",
    title: "Summer Collection",
    description: "Fresh styles for the warm season",
    buttonText: "Shop Collection",
    color: "#5AC8FA", // light blue
    style: BannerStyle.LIGHT,
    category: "retail"
  },
  {
    id: "clearance-sale",
    title: "Clearance Sale",
    description: "Up to 70% off selected items",
    buttonText: "Shop Sale",
    color: "#FF2D55", // pink
    style: BannerStyle.GLASS,
    category: "retail"
  },
  {
    id: "new-arrivals",
    title: "Just Dropped",
    description: "Check out this week's new arrivals",
    buttonText: "Shop New",
    color: "#34C759", // green
    style: BannerStyle.DARK,
    category: "retail"
  },
  {
    id: "dinner-special",
    title: "Tonight's Special",
    description: "Chef's selection: Truffle Pasta",
    buttonText: "Reserve Table",
    color: "#FF6482", // rose
    style: BannerStyle.LIGHT,
    category: "restaurant"
  },
  {
    id: "happy-hour",
    title: "Happy Hour",
    description: "2-for-1 drinks from 5-7pm",
    buttonText: "See Menu",
    color: "#007AFF", // blue
    style: BannerStyle.GLASS,
    category: "restaurant"
  },
  {
    id: "brunch-launch",
    title: "Weekend Brunch",
    description: "New brunch menu every Saturday",
    buttonText: "View Menu",
    color: "#FF9500", // orange
    style: BannerStyle.DARK,
    category: "restaurant"
  },
  {
    id: "fall-promotion",
    title: "Fall Into Savings",
    description: "Autumn specials all month long",
    buttonText: "Explore",
    color: "#FF3B30", // red
    style: BannerStyle.LIGHT,
    category: "seasonal"
  },
  {
    id: "summer-sale",
    title: "Summer Splash Sale",
    description: "Hot deals for the summer season",
    buttonText: "Shop Now",
    color: "#5AC8FA", // light blue
    style: BannerStyle.GLASS,
    category: "seasonal"
  },
  {
    id: "app-tutorial",
    title: "New to Our App?",
    description: "Learn how to earn & redeem points",
    buttonText: "Take Tour",
    color: "#4CD964", // light green
    style: BannerStyle.DARK,
    category: "onboarding"
  },
  {
    id: "complete-profile",
    title: "Complete Your Profile",
    description: "Earn 100 points - update profile",
    buttonText: "Update Now",
    color: "#5856D6", // indigo
    style: BannerStyle.LIGHT,
    category: "onboarding"
  },
  {
    id: "anniversary-reward",
    title: "Happy Anniversary!",
    description: "One year with us - enjoy a reward",
    buttonText: "Claim Gift",
    color: "#AF52DE", // purple
    style: BannerStyle.GLASS,
    category: "loyalty"
  },
  {
    id: "points-expiry",
    title: "Points Expiring Soon",
    description: "Use your points before July 31",
    buttonText: "Redeem Now",
    color: "#FF2D55", // pink
    style: BannerStyle.DARK,
    category: "loyalty"
  },
  {
    id: "weekend-bonus",
    title: "Weekend Bonus",
    description: "50% extra points this weekend",
    buttonText: "Learn More",
    color: "#34C759", // green
    style: BannerStyle.LIGHT,
    category: "promotional"
  }
];

export function CreateBannerDialog({
  open,
  onOpenChange,
  initialBannerData,
  onSave
}: CreateBannerDialogProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  
  // Debug the incoming initialBannerData
  useEffect(() => {
    console.log("CreateBannerDialog received initialBannerData:", initialBannerData);
  }, [initialBannerData]);
  
  // State for form fields
  const [activeTab, setActiveTab] = useState('create') // Changed default to 'create'
  const [title, setTitle] = useState(initialBannerData?.title || '')
  const [description, setDescription] = useState(initialBannerData?.description || '')
  const [buttonText, setButtonText] = useState(initialBannerData?.buttonText || '')
  const [color, setColor] = useState(initialBannerData?.color || '#007AFF')
  const [style, setStyle] = useState(initialBannerData?.styleType || BannerStyle.DARK)
  const [bannerAction, setBannerAction] = useState(BannerAction.STORE_REDIRECT)
  const [visibilityType, setVisibilityType] = useState(BannerVisibility.ALL)
  const [isActive, setIsActive] = useState(true)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [saving, setSaving] = useState(false)
  const [merchantName, setMerchantName] = useState('')
  
  // Sync selectedColor and selectedStyle with color and style
  const [selectedColor, setSelectedColor] = useState('#007AFF')
  const [selectedStyle, setSelectedStyle] = useState(BannerStyle.DARK)
  
  // Update selectedColor and selectedStyle when color and style change
  useEffect(() => {
    setSelectedColor(color);
  }, [color]);
  
  useEffect(() => {
    setSelectedStyle(style);
  }, [style]);
  
  // Initialize form with initialBannerData if provided
  useEffect(() => {
    if (initialBannerData) {
      console.log("Initializing form with data:", initialBannerData);
      setTitle(initialBannerData.title || '')
      setDescription(initialBannerData.description || '')
      setButtonText(initialBannerData.buttonText || '')
      setColor(initialBannerData.color || '#007AFF')
      const styleToUse = initialBannerData.style === BannerStyle.LIGHT 
        ? BannerStyle.DARK 
        : (initialBannerData.style || BannerStyle.DARK)
      setStyle(styleToUse)
      setBannerAction(initialBannerData.bannerAction || BannerAction.STORE_REDIRECT)
      setVisibilityType(initialBannerData.visibilityType || BannerVisibility.ALL)
      setIsActive(initialBannerData.isActive !== undefined ? initialBannerData.isActive : true)
      setAnnouncement(initialBannerData.announcement || null)
    }
  }, [initialBannerData, open]);
  
  // Fetch merchant name on component mount
  useEffect(() => {
    const fetchMerchantName = async () => {
      if (user?.uid) {
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          if (merchantDoc.exists()) {
            const data = merchantDoc.data()
            const name = data.merchantName || data.businessName || data.storeName || data.name || 'Your Store'
            setMerchantName(name)
          }
        } catch (error) {
          console.error("Error fetching merchant name:", error)
        }
      }
    }
    
    fetchMerchantName()
  }, [user])
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Reset form after dialog closes
      setTimeout(() => {
        if (!initialBannerData) {
          setTitle('')
          setDescription('')
          setButtonText('')
          setColor('#007AFF')
          setStyle(BannerStyle.DARK)
          setBannerAction(BannerAction.STORE_REDIRECT)
          setVisibilityType(BannerVisibility.ALL)
          setIsActive(true)
          setAnnouncement(null)
        }
        setActiveTab('create') // Reset to create tab
        setSaving(false)
        setCurrentPage('main') // Reset to main page
      }, 300)
    } else if (open && initialBannerData) {
      // When opening with initialBannerData, make sure form is populated
      console.log("Dialog opened with initialBannerData:", initialBannerData);
      setTitle(initialBannerData.title || '')
      setDescription(initialBannerData.description || '')
      setButtonText(initialBannerData.buttonText || '')
      setColor(initialBannerData.color || '#007AFF')
      const styleToUse = initialBannerData.style === BannerStyle.LIGHT 
        ? BannerStyle.DARK 
        : (initialBannerData.style || BannerStyle.DARK)
      setStyle(styleToUse)
      setBannerAction(initialBannerData.bannerAction || BannerAction.STORE_REDIRECT)
      setVisibilityType(initialBannerData.visibilityType || BannerVisibility.ALL)
      setIsActive(initialBannerData.isActive !== undefined ? initialBannerData.isActive : true)
      setAnnouncement(initialBannerData.announcement || null)
    }
  }, [open, initialBannerData])
  
  // Form State
  const [loading, setLoading] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState<'main' | 'guide'>('main')
  
  // Options arrays
  const buttonOptions = ['Explore', 'Redeem', 'Learn More', 'View Offer', 'Shop Now']
  const colors = [
    '#007AFF', // iOS blue
    '#34C759', // iOS green
    '#FF9500', // iOS orange
    '#FF2D55', // iOS pink
    '#AF52DE', // iOS purple
    '#5856D6', // iOS indigo
    '#FF3B30', // iOS red
    '#FFCC00', // iOS yellow
    '#5AC8FA', // iOS light blue
    '#4CD964', // iOS light green
    '#FF6482'  // iOS rose (changed from duplicate #FF2D55)
  ]

  // For preview carousel
  const stylesArray = [BannerStyle.DARK, BannerStyle.GLASS]
  const [carouselIndex, setCarouselIndex] = useState(0)

  // Update the preview style when cycling
  const handlePrev = () => {
    const newIndex = carouselIndex === 0 ? stylesArray.length - 1 : carouselIndex - 1
    setCarouselIndex(newIndex)
    setSelectedStyle(stylesArray[newIndex])
  }

  const handleNext = () => {
    const newIndex = carouselIndex === stylesArray.length - 1 ? 0 : carouselIndex + 1
    setCarouselIndex(newIndex)
    setSelectedStyle(stylesArray[newIndex])
  }

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number) => {
    let c
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('')
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]]
      }
      c = '0x' + c.join('')
      return `rgba(${[(parseInt(c) >> 16) & 255, (parseInt(c) >> 8) & 255, parseInt(c) & 255].join(',')},${alpha})`
    }
    return hex
  }

  // Add this new state for filtering templates
  const [templateFilter, setTemplateFilter] = useState<string>("all")

  // Add this function to apply a template
  const applyTemplate = (template: typeof bannerTemplates[0]) => {
    setTitle(template.title)
    setDescription(template.description)
    setButtonText(template.buttonText)
    setSelectedColor(template.color)
    const styleToUse = template.style === BannerStyle.LIGHT 
      ? BannerStyle.DARK 
      : template.style
    setSelectedStyle(styleToUse)
    setCarouselIndex(stylesArray.indexOf(styleToUse))
    
    // Switch to create tab to show the customization options
    setActiveTab("create")
    
    toast({
      title: "Template Applied",
      description: "You can now customize this banner template.",
    })
  }

  // Create banner in Firestore
  const createBanner = async () => {
    if (!user?.uid) {
      toast({
        title: "Error",
        description: "You must be logged in to create a banner.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Get the color name from the hex value
      const colorName = getColorNameFromHex(selectedColor)
      
      // Build the banner object with the correct field names
      const bannerObj = {
        title: title,
        color: selectedColor, // Save the hex color directly in the color field
        description,
        buttonText,
        merchantName,
        visibilityType,
        isActive,
        style: selectedStyle,
        bannerAction: bannerAction,
        merchantId: user.uid,
        // We'll add the announcement reference later if needed
      }
      
      // Check if onSave exists before calling it
      if (typeof onSave === 'function') {
        // For external save function, include the full announcement data
        onSave({
          ...bannerObj,
          announcement: bannerAction === BannerAction.SHOW_ANNOUNCEMENT ? announcement : null
        })
      } else {
        // If no onSave function is provided, save directly to Firestore
        const merchantRef = doc(db, 'merchants', user.uid)
        const bannersCollectionRef = collection(merchantRef, 'banners')
        
        // First create the banner document
        const bannerDocRef = await addDoc(bannersCollectionRef, {
          ...bannerObj,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        
        // If this is an announcement banner, save the announcement in a separate collection
        if (bannerAction === BannerAction.SHOW_ANNOUNCEMENT && announcement) {
          // Create the announcements subcollection for this banner
          const announcementsCollectionRef = collection(
            doc(db, 'merchants', user.uid, 'banners', bannerDocRef.id), 
            'announcements'
          )
          
          // Add the announcement document with the exact field names
          const announcementDocRef = await addDoc(announcementsCollectionRef, {
            // Use the exact field names from the example
            announcementId: announcement.id || crypto.randomUUID(),
            colorHex: announcement.colorHex || selectedColor,
            designIndex: announcement.designIndex || 4,
            designName: announcement.designName || "Compact",
            messages: announcement.messages || [],
            subtitle: announcement.subtitle || "",
            termsAndConditions: announcement.termsAndConditions || "",
            title: announcement.title || title,
            merchantId: user.uid,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          
          // Update the banner with a reference to the announcement
          await updateDoc(bannerDocRef, {
            announcementId: announcementDocRef.id
          })
        }
        
        toast({
          title: "Banner created",
          description: "Your banner has been created successfully.",
        })
      }
      
      setLoading(false)
      onOpenChange(false)
      
      // Navigate to the banners tab
      router.push('/store/overview?tab=banners')
    } catch (error) {
      console.error(error)
      setLoading(false)
      toast({
        title: "Error",
        description: "There was an error creating your banner.",
        variant: "destructive"
      })
    }
  }

  // Helper function to convert hex to color name
  const getColorNameFromHex = (hex: string): string => {
    // Simple mapping of common hex values to color names
    const colorMap: Record<string, string> = {
      "#FF9500": "orange",
      "#007AFF": "blue",
      "#AF52DE": "purple",
      "#FF3B30": "red",
      "#34C759": "green",
      "#5856D6": "indigo",
      "#FF2D55": "pink",
      "#5AC8FA": "lightblue",
      "#4CD964": "lightgreen",
      "#FF6482": "rose",
      "#FFCC00": "yellow"
    }
    
    // Return the mapped color name or a default
    return colorMap[hex] || "blue"
  }

  // Update the color picker handler
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setColor(newColor); // Make sure both state variables are updated
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-5xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg overflow-hidden flex flex-col">
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground z-10">
            <X className="h-4 w-4" strokeWidth={2.75} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          
          <div className="flex flex-1 h-full min-h-0">
            {/* Left Panel */}
            <div className="w-80 border-r bg-gray-50 flex flex-col h-full">
              <div className="p-6 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  <span className="text-[#007AFF]">Create</span> Banner
                </h2>
                <p className="text-sm text-gray-600">
                  Design a banner to promote your loyalty program to customers.
                </p>
                
                <div className="flex items-center space-x-1 mt-4">
                  {[1, 2].map((step) => (
                    <div
                      key={step}
                      className={`h-2 w-10 rounded-md transition-all ${
                        (step === 1 && activeTab === 'create') || (step === 2 && activeTab === 'library')
                          ? "bg-blue-600" 
                          : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              {/* Tab navigation */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0">
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      activeTab === 'create'
                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        activeTab === 'create'
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}>
                        <PenLine className="h-3 w-3" strokeWidth={2.75} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Create Custom</p>
                        <p className="text-xs text-gray-500">Design your own banner</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('library')}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      activeTab === 'library'
                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        activeTab === 'library'
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}>
                        <Library className="h-3 w-3" strokeWidth={2.75} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Banner Library</p>
                        <p className="text-xs text-gray-500">Choose from templates</p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setCurrentPage('guide')}
                    className="w-full text-left p-3 rounded-md transition-colors bg-white text-gray-700 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-gray-200 text-gray-400">
                        <HelpCircle className="h-3 w-3" strokeWidth={2.75} />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Banner Guide</p>
                        <p className="text-xs text-gray-500">Learn best practices</p>
                      </div>
                    </div>
                  </button>
                </nav>
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 flex flex-col h-full">
              {/* Page Container with transition */}
              <div className="relative overflow-hidden flex-1 flex flex-col min-h-0">
                <div 
                  className={`transition-transform duration-300 ease-out flex-1 flex flex-col min-h-0 ${
                    currentPage === 'main' ? 'translate-x-0' : '-translate-x-full'
                  }`}
                >
                  {/* Main Banner Creation Content */}
                  <div className="flex-1 overflow-y-auto p-6 min-h-0 max-h-full" style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "#cbd5e1 #f1f5f9"
                  }}>
                    {activeTab === 'create' && (
                      <div className="space-y-6">
                        {/* Preview Section */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Dark Preview */}
                            <div className="flex flex-col">
                              <div 
                                className={`cursor-pointer transition-all rounded-md overflow-hidden border-2 ${selectedStyle === BannerStyle.DARK ? 'border-gray-300 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                                onClick={() => {
                                  setSelectedStyle(BannerStyle.DARK)
                                  setCarouselIndex(stylesArray.indexOf(BannerStyle.DARK))
                                }}
                              >
                                <BannerPreview
                                  title={title}
                                  description={description}
                                  buttonText={buttonText}
                                  color={selectedColor}
                                  styleType={BannerStyle.DARK}
                                  merchantName={merchantName}
                                  visibilityType={visibilityType}
                                  isActive={isActive}
                                />
                              </div>
                              <p className="text-center text-sm mt-2 font-medium text-gray-700">Dark</p>
                            </div>
                            
                            {/* Glass Preview */}
                            <div className="flex flex-col">
                              <div 
                                className={`cursor-pointer transition-all rounded-md overflow-hidden border-2 ${selectedStyle === BannerStyle.GLASS ? 'border-gray-300 shadow-md' : 'border-gray-200 opacity-70 hover:opacity-100'}`}
                                onClick={() => {
                                  setSelectedStyle(BannerStyle.GLASS)
                                  setCarouselIndex(stylesArray.indexOf(BannerStyle.GLASS))
                                }}
                              >
                                <BannerPreview
                                  title={title}
                                  description={description}
                                  buttonText={buttonText}
                                  color={selectedColor}
                                  styleType={BannerStyle.GLASS}
                                  merchantName={merchantName}
                                  visibilityType={visibilityType}
                                  isActive={isActive}
                                />
                              </div>
                              <p className="text-center text-sm mt-2 font-medium text-gray-700">Glass</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Color Picker */}
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-gray-900">Banner Color</Label>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((c) => (
                              <div
                                key={c}
                                className={`h-8 w-8 rounded-md cursor-pointer transition-all border-2 ${
                                  selectedColor === c ? 'border-blue-500 scale-110 shadow-md' : 'border-gray-200 hover:border-gray-300'
                                }`}
                                style={{ backgroundColor: c }}
                                onClick={() => {
                                  setSelectedColor(c);
                                  setColor(c);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Form Section */}
                        <div className="space-y-6">
                          {/* Content Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Content</h3>
                            
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Title <span className="text-red-500">*</span></Label>
                                  <span className="text-xs text-gray-500">({title.length}/23)</span>
                                </div>
                                <Input
                                  value={title}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue.length <= 23) {
                                      const titleCased = inputValue.replace(/\b\w/g, char => char.toUpperCase());
                                      setTitle(titleCased);
                                    }
                                  }}
                                  maxLength={23}
                                  placeholder="Enter banner title"
                                  className="h-9"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-sm font-medium">Description <span className="text-red-500">*</span></Label>
                                  <span className="text-xs text-gray-500">({description.length}/40)</span>
                                </div>
                                <Input
                                  value={description}
                                  onChange={(e) => {
                                    const inputValue = e.target.value;
                                    if (inputValue.length <= 40) {
                                      if (inputValue.length > 0) {
                                        const firstChar = inputValue.charAt(0).toUpperCase();
                                        const restOfText = inputValue.slice(1);
                                        setDescription(firstChar + restOfText);
                                      } else {
                                        setDescription(inputValue);
                                      }
                                    }
                                  }}
                                  maxLength={40}
                                  placeholder="Enter banner description"
                                  className="h-9"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Button Text <span className="text-red-500">*</span></Label>
                                <Select value={buttonText} onValueChange={setButtonText}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select button text" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {buttonOptions.map((option) => (
                                      <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          {/* Settings Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
                            
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-sm font-medium">Active Status</Label>
                                  <p className="text-xs text-gray-500">Control whether this banner is currently visible</p>
                                </div>
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={setIsActive}
                                  className="data-[state=checked]:bg-blue-600"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Visibility</Label>
                                <Select value={visibilityType} onValueChange={setVisibilityType}>
                                  <SelectTrigger className="h-9">
                                    <SelectValue placeholder="Select visibility" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={BannerVisibility.ALL}>All customers</SelectItem>
                                    <SelectItem value={BannerVisibility.NEW}>New customers</SelectItem>
                                    <SelectItem value={BannerVisibility.SELECTED}>Selected customers</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          {/* Banner Action Section */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-gray-900">Banner Action</h3>
                            <p className="text-sm text-gray-600">What happens when a customer taps on your banner?</p>
                            
                            <div className="grid grid-cols-1 gap-4">
                              <div 
                                className={`relative cursor-pointer rounded-md border-2 p-4 transition-all ${
                                  bannerAction === BannerAction.STORE_REDIRECT 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setBannerAction(BannerAction.STORE_REDIRECT)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                    bannerAction === BannerAction.STORE_REDIRECT ? 'bg-blue-600' : 'bg-gray-100'
                                  }`}>
                                    <Store className={`h-5 w-5 ${
                                      bannerAction === BannerAction.STORE_REDIRECT ? 'text-white' : 'text-gray-500'
                                    }`} strokeWidth={2.75} />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">Take to Store Page</h4>
                                    <p className="text-sm text-gray-500">
                                      Redirect customers to your store page when they tap the banner.
                                    </p>
                                  </div>
                                  {bannerAction === BannerAction.STORE_REDIRECT && (
                                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" strokeWidth={2.75} />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div 
                                className={`relative cursor-pointer rounded-md border-2 p-4 transition-all ${
                                  bannerAction === BannerAction.SHOW_ANNOUNCEMENT 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => setBannerAction(BannerAction.SHOW_ANNOUNCEMENT)}
                              >
                                <div className="flex items-start gap-3">
                                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                                    bannerAction === BannerAction.SHOW_ANNOUNCEMENT ? 'bg-blue-600' : 'bg-gray-100'
                                  }`}>
                                    <Sparkles className={`h-5 w-5 ${
                                      bannerAction === BannerAction.SHOW_ANNOUNCEMENT ? 'text-white' : 'text-gray-500'
                                    }`} strokeWidth={2.75} />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium text-sm">Show Announcement</h4>
                                    <p className="text-sm text-gray-500">
                                      Display a detailed announcement with more information.
                                    </p>
                                  </div>
                                  {bannerAction === BannerAction.SHOW_ANNOUNCEMENT && (
                                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" strokeWidth={2.75} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {bannerAction === BannerAction.SHOW_ANNOUNCEMENT && (
                              <div className="border-l-2 border-blue-100 pl-4 py-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h4 className="font-medium text-sm">Announcement Details</h4>
                                    <p className="text-sm text-gray-500">
                                      {announcement 
                                        ? "Your announcement is ready" 
                                        : "Create an announcement that will show when customers tap the banner"}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    {announcement && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAnnouncement(null)}
                                        className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50 h-8"
                                      >
                                        <X className="h-4 w-4" strokeWidth={2.75} />
                                        <span>Remove</span>
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => setShowAnnouncementDesigner(true)}
                                      variant={announcement ? "outline" : "default"}
                                      className="flex items-center gap-1 h-8"
                                    >
                                      {announcement ? (
                                        <>
                                          <Edit className="h-4 w-4" strokeWidth={2.75} />
                                          <span>Edit</span>
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4" strokeWidth={2.75} />
                                          <span>Create</span>
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                
                                {announcement && (
                                  <div className="mt-3 p-3 bg-white rounded-md border border-gray-100">
                                    <h5 className="font-medium text-sm">{announcement.title}</h5>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {announcement.messages && announcement.messages.length > 0 
                                        ? announcement.messages[0] 
                                        : "No message content"}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {activeTab === 'library' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-semibold text-gray-900">Banner Templates</h3>
                          
                          <Select value={templateFilter} onValueChange={setTemplateFilter}>
                            <SelectTrigger className="w-[180px] h-9">
                              <SelectValue placeholder="Filter by category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Categories</SelectItem>
                              <SelectItem value="promotional">Promotional</SelectItem>
                              <SelectItem value="loyalty">Loyalty</SelectItem>
                              <SelectItem value="seasonal">Seasonal</SelectItem>
                              <SelectItem value="onboarding">Onboarding</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {bannerTemplates
                            .filter(template => templateFilter === "all" || template.category === templateFilter)
                            .map(template => (
                              <div 
                                key={template.id} 
                                className="relative group rounded-md overflow-hidden cursor-pointer border-2 border-gray-200 hover:border-blue-300 transition-all"
                                onClick={() => applyTemplate(template)}
                              >
                                <BannerPreview
                                  title={template.title}
                                  description={template.description}
                                  buttonText={template.buttonText}
                                  color={template.color}
                                  styleType={template.style}
                                  merchantName={merchantName}
                                  visibilityType={BannerVisibility.ALL}
                                  isActive={true}
                                />
                                
                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Button 
                                    variant="default" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      applyTemplate(template);
                                    }}
                                    className="flex items-center gap-1 h-8"
                                  >
                                    <Edit className="h-4 w-4" strokeWidth={2.75} />
                                    <span>Customise</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50 flex-shrink-0">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-gray-500 text-center">All fields are mandatory</p>
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => onOpenChange(false)}
                          className="rounded-md w-full sm:w-auto"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={createBanner}
                          disabled={!title || !description || !buttonText || loading}
                          className="bg-[#007AFF] hover:bg-[#0062CC] text-white rounded-md w-full sm:w-auto"
                        >
                          {loading ? 'Creating...' : 'Create Banner'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Guide Page */}
                <div 
                  className={`absolute top-0 left-0 w-full h-full transition-transform duration-300 ease-out flex flex-col ${
                    currentPage === 'guide' ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentPage('main')}
                          className="flex items-center gap-1 h-8"
                        >
                          <ChevronLeft className="h-4 w-4" strokeWidth={2.75} />
                          Back
                        </Button>
                        <h2 className="text-xl font-semibold text-gray-900">Banner Guide</h2>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <h3 className="font-medium text-[#007AFF] text-lg">What are Banners?</h3>
                          <p className="text-gray-600 leading-relaxed">
                            Banners are promotional elements that appear at the top of your customers' app. 
                            They're perfect for announcing sales, new products, or important information.
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="font-medium text-[#007AFF] text-lg">Creating Effective Banners</h3>
                          <div className="space-y-4">
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">1</div>
                              <div>
                                <h4 className="font-medium">Keep it concise</h4>
                                <p className="text-sm text-gray-600">Use short, compelling text that grabs attention immediately.</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">2</div>
                              <div>
                                <h4 className="font-medium">Clear call-to-action</h4>
                                <p className="text-sm text-gray-600">Make sure your button text clearly indicates what will happen when clicked.</p>
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">3</div>
                              <div>
                                <h4 className="font-medium">Choose the right style</h4>
                                <p className="text-sm text-gray-600">Match the banner style to your message: Dark for impact, Glass for elegance.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <h3 className="font-medium text-[#007AFF] text-lg">Banner Actions</h3>
                          <div className="space-y-3">
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <Store className="h-4 w-4" strokeWidth={2.75} />
                                Store Redirect
                              </h4>
                              <p className="text-xs text-gray-600 mt-1">
                                Takes customers to your store page when they click the banner. Perfect for general promotions.
                              </p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                              <h4 className="font-medium text-sm flex items-center gap-2">
                                <Sparkles className="h-4 w-4" strokeWidth={2.75} />
                                Show Announcement
                              </h4>
                              <p className="text-xs text-gray-600 mt-1">
                                Opens a detailed announcement with more information, perfect for promotions with terms and conditions.
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h3 className="font-medium text-[#007AFF] text-lg">Best Practices</h3>
                          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                            <ul className="text-sm text-gray-700 space-y-2">
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>Test different colours to see what resonates with your customers</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>Update banners regularly to keep content fresh and engaging</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>Use seasonal templates for holidays and special occasions</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <span className="text-blue-600">•</span>
                                <span>Target new customers with onboarding banners</span>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Announcement Designer Dialog */}
          <AnnouncementDesignerDialog
            open={showAnnouncementDesigner}
            onOpenChange={setShowAnnouncementDesigner}
            onSave={(newAnnouncement) => {
              setAnnouncement(newAnnouncement)
              setShowAnnouncementDesigner(false)
            }}
            initialAnnouncement={announcement}
          />

          {/* Custom Scrollbar Styles */}
          <style jsx>{`
            .overflow-y-auto {
              scrollbar-width: thin;
              scrollbar-color: #cbd5e1 #f1f5f9;
            }
            
            .overflow-y-auto::-webkit-scrollbar {
              width: 6px;
            }
            
            .overflow-y-auto::-webkit-scrollbar-track {
              background: #f1f5f9;
              border-radius: 3px;
            }
            
            .overflow-y-auto::-webkit-scrollbar-thumb {
              background: #cbd5e1;
              border-radius: 3px;
            }
            
            .overflow-y-auto::-webkit-scrollbar-thumb:hover {
              background: #94a3b8;
            }
          `}</style>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

// Banner Preview Component with proper TypeScript types
interface BannerPreviewProps {
  title: string
  description: string
  buttonText: string
  color: string
  styleType: string
  merchantName: string
  visibilityType: string
  isActive: boolean
}

const BannerPreview: React.FC<BannerPreviewProps> = ({ 
  title, 
  description, 
  buttonText, 
  color, 
  styleType, 
  merchantName, 
  visibilityType, 
  isActive 
}) => {
  // Get the appropriate icon based on style
  let Icon = Store
  if (styleType === BannerStyle.LIGHT) {
    Icon = Store
  } else if (styleType === BannerStyle.DARK) {
    Icon = Gift
  } else if (styleType === BannerStyle.GLASS) {
    Icon = Sparkles
  }
  
  // Helper function to darken a color
  function darkenColor(hex: string, percent: number): string {
    // Remove the # if it exists
    hex = hex.replace('#', '')
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16)
    let g = parseInt(hex.substring(2, 4), 16)
    let b = parseInt(hex.substring(4, 6), 16)
    
    // Darken
    r = Math.floor(r * (100 - percent) / 100)
    g = Math.floor(g * (100 - percent) / 100)
    b = Math.floor(b * (100 - percent) / 100)
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
  }
  
  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    let c: any
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
      c = hex.substring(1).split('')
      if (c.length === 3) {
        c = [c[0], c[0], c[1], c[1], c[2], c[2]]
      }
      c = '0x' + c.join('')
      return `rgba(${[(parseInt(c) >> 16) & 255, (parseInt(c) >> 8) & 255, parseInt(c) & 255].join(',')},${alpha})`
    }
    return hex
  }
  
  // Get background color based on style
  const getBackground = () => {
    if (styleType === BannerStyle.LIGHT) {
      return hexToRgba(color, 0.1)
    } else if (styleType === BannerStyle.DARK) {
      return `linear-gradient(135deg, ${hexToRgba(color, 0.8)}, ${hexToRgba(darkenColor(color, 20), 0.9)})`
    } else if (styleType === BannerStyle.GLASS) {
      return hexToRgba(color, 0.2)
    }
    return color
  }
  
  // Get text color based on style
  const getTextColor = () => {
    if (styleType === BannerStyle.DARK) {
      return 'text-white'
    }
    return 'text-gray-900'
  }
  
  // Get button color based on style
  const getButtonColor = () => {
    if (styleType === BannerStyle.DARK) {
      return 'text-white'
    }
    return `text-[${color}]`
  }
  
  return (
    <div 
      className={`relative rounded-xl overflow-hidden p-4 ${getTextColor()}`}
      style={{ 
        background: getBackground(),
        opacity: isActive ? 1 : 0.6
      }}
    >
      <div className="flex">
        <div className="flex-1 z-10">
          <div className="text-xs font-medium px-2 py-1 rounded-md bg-black/10 inline-block mb-1">
            {merchantName}
          </div>
          <h3 className="text-lg font-bold mb-1">
            {title || "Banner Title"}
          </h3>
          <p className={`text-sm ${styleType === BannerStyle.DARK ? 'text-gray-100' : 'text-gray-600'}`}>
            {description || "Banner description text will appear here."}
          </p>
          {buttonText && (
            <button 
              className={`mt-2 text-sm font-medium ${getButtonColor()}`}
              style={{ color: styleType === BannerStyle.DARK ? 'white' : color }}
            >
              {buttonText} →
            </button>
          )}
        </div>
        
        <div className="absolute top-0 right-0 opacity-20">
          <Icon size={100} color={styleType === BannerStyle.DARK ? 'white' : color} strokeWidth={2.75} />
        </div>
      </div>
      
      {visibilityType === BannerVisibility.NEW && (
        <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <UserPlus className="h-3 w-3 mr-1" strokeWidth={2.75} />
          <span>New Customers</span>
        </div>
      )}
    </div>
  )
} 