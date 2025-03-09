"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Store, Gift, Sparkles, Users, UserPlus, ChevronLeft, ChevronRight, Edit, Copy, PenLine, Library, HelpCircle, X, Check, Plus } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useRouter } from "next/navigation"

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

export function CreateBannerDialog({ open, onOpenChange, onSave }: CreateBannerDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  // Form State
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [buttonText, setButtonText] = useState('Explore')
  const [selectedColor, setSelectedColor] = useState('#007AFF') // default blue
  const [selectedStyle, setSelectedStyle] = useState(BannerStyle.LIGHT)
  const [visibilityType, setVisibilityType] = useState(BannerVisibility.ALL)
  const [isActive, setIsActive] = useState(true)
  const [bannerAction, setBannerAction] = useState(BannerAction.STORE_REDIRECT)
  const [loading, setLoading] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)
  const [showAnnouncementDesigner, setShowAnnouncementDesigner] = useState(false)
  const [announcement, setAnnouncement] = useState<any>(null)
  const [merchantName, setMerchantName] = useState("Your Business")
  
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
  const stylesArray = [BannerStyle.LIGHT, BannerStyle.DARK, BannerStyle.GLASS]
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

  // Add this new state for the active tab
  const [activeTab, setActiveTab] = useState<"create" | "library">("create")
  
  // Add this new state for filtering templates
  const [templateFilter, setTemplateFilter] = useState<string>("all")

  // First, add a new state to track if the guide is open
  const [guideOpen, setGuideOpen] = useState(false);

  // Add this effect to fetch the merchant name when the dialog opens
  useEffect(() => {
    const fetchMerchantName = async () => {
      if (!user?.uid) return
      
      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
        if (merchantDoc.exists()) {
          const merchantData = merchantDoc.data()
          if (merchantData.merchantName) {
            setMerchantName(merchantData.merchantName)
          }
        }
      } catch (error) {
        console.error("Error fetching merchant name:", error)
      }
    }
    
    if (open) {
      fetchMerchantName()
    }
  }, [open, user?.uid])

  // Add this function to apply a template
  const applyTemplate = (template: typeof bannerTemplates[0]) => {
    setTitle(template.title)
    setDescription(template.description)
    setButtonText(template.buttonText)
    setSelectedColor(template.color)
    setSelectedStyle(template.style)
    setCarouselIndex(stylesArray.indexOf(template.style))
    
    // Switch to create tab to show the customization options
    setActiveTab("create")
    
    toast({
      title: "Template Applied",
      description: "You can now customize this banner template.",
    })
  }

  // Create banner in Firestore
  const createBanner = async () => {
    setLoading(true)
    try {
      // Get the color name from the hex value
      const colorName = getColorNameFromHex(selectedColor)
      
      // Build the banner object with the correct field names
      const bannerObj = {
        title: title,
        cssColor: selectedColor, // Keep the original hex for CSS
        color: colorName, // Add the color name field
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>
            <span className="text-[#007AFF]">Create</span> Banner
          </DialogTitle>
          
          <div className="flex items-center gap-2 mr-8">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-1 h-8 text-gray-600"
              onClick={() => router.push("/store/banner")}
            >
              <Store className="h-4 w-4" />
              <span>My Banners</span>
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1 h-8 text-gray-600"
                    onClick={() => setGuideOpen(!guideOpen)}
                  >
                    <HelpCircle className="h-4 w-4" />
                    <span>Guide</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-sm">
                  <div className="space-y-2 p-2">
                    <h4 className="font-medium">Banner Creation Guide</h4>
                    <p className="text-sm text-gray-500">
                      Banners appear at the top of your customer's app and can be used to promote offers, 
                      announce news, or highlight important information.
                    </p>
                    <ul className="text-xs text-gray-500 list-disc pl-4 space-y-1">
                      <li>Choose from pre-made templates or create your own</li>
                      <li>Select a style that matches your brand</li>
                      <li>Add an action - link to your store or show an announcement</li>
                      <li>Target specific customer groups</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "create" | "library")}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PenLine className="h-4 w-4" />
              <span>Create Custom</span>
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <Library className="h-4 w-4" />
              <span>Banner Library</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="create">
            {/* Preview Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-2">Preview</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <div 
                    className={`cursor-pointer transition-all rounded-xl overflow-hidden ${selectedStyle === BannerStyle.LIGHT ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                    onClick={() => {
                      setSelectedStyle(BannerStyle.LIGHT)
                      setCarouselIndex(stylesArray.indexOf(BannerStyle.LIGHT))
                    }}
                  >
                    <BannerPreview
                      title={title}
                      description={description}
                      buttonText={buttonText}
                      color={selectedColor}
                      styleType={BannerStyle.LIGHT}
                      merchantName={merchantName}
                      visibilityType={visibilityType}
                      isActive={isActive}
                    />
                  </div>
                  <p className="text-center text-sm mt-2 font-medium">Light</p>
                </div>
                
                <div className="flex flex-col">
                  <div 
                    className={`cursor-pointer transition-all rounded-xl overflow-hidden ${selectedStyle === BannerStyle.DARK ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
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
                  <p className="text-center text-sm mt-2 font-medium">Dark</p>
                </div>
                
                <div className="flex flex-col">
                  <div 
                    className={`cursor-pointer transition-all rounded-xl overflow-hidden ${selectedStyle === BannerStyle.GLASS ? 'ring-2 ring-primary' : 'opacity-70 hover:opacity-100'}`}
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
                  <p className="text-center text-sm mt-2 font-medium">Glass</p>
                </div>
              </div>
            </div>
            
            {/* Form Section */}
            <div className="space-y-6">
              {/* Content Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Content</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="title">Title <span className="text-xs text-muted-foreground">({title.length}/23)</span></Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      // Capitalize the first letter of each word
                      const inputValue = e.target.value;
                      if (inputValue.length <= 23) {
                        // Title case function: capitalize first letter of each word
                        const titleCased = inputValue.replace(/\b\w/g, char => char.toUpperCase());
                        setTitle(titleCased);
                      }
                    }}
                    maxLength={23}
                    placeholder="Enter banner title"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description <span className="text-xs text-muted-foreground">({description.length}/40)</span></Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => {
                      // Limit to 40 characters
                      const inputValue = e.target.value;
                      if (inputValue.length <= 40) {
                        // Capitalize only the first letter of the first word
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
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="buttonText">Button Text</Label>
                  <Select value={buttonText} onValueChange={setButtonText}>
                    <SelectTrigger>
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
              
              {/* Appearance Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Appearance</h3>
                
                <div className="grid gap-2">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`h-8 w-8 rounded-full transition-all ${selectedColor === color ? 'ring-2 ring-offset-2 ring-black' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                </div>
              </div>
              
              {/* Visibility Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Visibility</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="visibility">Who can see this banner?</Label>
                  <Select value={visibilityType} onValueChange={setVisibilityType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={BannerVisibility.ALL}>All customers</SelectItem>
                      <SelectItem value={BannerVisibility.NEW}>New customers</SelectItem>
                      <SelectItem value={BannerVisibility.SELECTED}>Selected customers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {visibilityType === BannerVisibility.SELECTED && (
                  <div className="pl-4 border-l-2 border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCustomerPicker(true)}
                      className="mb-2"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Select Customers
                    </Button>
                    
                    {selectedCustomers.length > 0 && (
                      <div className="text-sm text-gray-500">
                        {selectedCustomers.length} customers selected
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Action Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Banner Action</h3>
                <p className="text-sm text-gray-500">What happens when a customer taps on your banner?</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      bannerAction === BannerAction.STORE_REDIRECT 
                        ? 'border-[#007AFF] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBannerAction(BannerAction.STORE_REDIRECT)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        bannerAction === BannerAction.STORE_REDIRECT ? 'bg-[#007AFF]' : 'bg-gray-100'
                      }`}>
                        <Store className={`h-5 w-5 ${
                          bannerAction === BannerAction.STORE_REDIRECT ? 'text-white' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">Take to Store Page</h4>
                        <p className="text-sm text-gray-500">
                          Redirect customers to your store page when they tap the banner.
                        </p>
                      </div>
                    </div>
                    {bannerAction === BannerAction.STORE_REDIRECT && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#007AFF] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      bannerAction === BannerAction.SHOW_ANNOUNCEMENT 
                        ? 'border-[#007AFF] bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setBannerAction(BannerAction.SHOW_ANNOUNCEMENT)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        bannerAction === BannerAction.SHOW_ANNOUNCEMENT ? 'bg-[#007AFF]' : 'bg-gray-100'
                      }`}>
                        <Sparkles className={`h-5 w-5 ${
                          bannerAction === BannerAction.SHOW_ANNOUNCEMENT ? 'text-white' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-medium">Show Announcement</h4>
                        <p className="text-sm text-gray-500">
                          Display a detailed announcement with more information.
                        </p>
                      </div>
                    </div>
                    {bannerAction === BannerAction.SHOW_ANNOUNCEMENT && (
                      <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#007AFF] flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                </div>
                
                {bannerAction === BannerAction.SHOW_ANNOUNCEMENT && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Announcement Details</h4>
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
                            className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                            <span>Remove</span>
                          </Button>
                        )}
                        <Button
                          onClick={() => setShowAnnouncementDesigner(true)}
                          variant={announcement ? "outline" : "default"}
                          className="flex items-center gap-1"
                        >
                          {announcement ? (
                            <>
                              <Edit className="h-4 w-4" />
                              <span>Edit Announcement</span>
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4" />
                              <span>Create Announcement</span>
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
              
              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  onClick={createBanner}
                  disabled={!title || !description || loading}
                >
                  Select Banner
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="library">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Banner Templates</h3>
                
                <Select value={templateFilter} onValueChange={setTemplateFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="loyalty">Loyalty</SelectItem>
                    <SelectItem value="seasonal">Seasonal</SelectItem>
                    <SelectItem value="onboarding">Onboarding</SelectItem>
                    <SelectItem value="new-customers">New Customers</SelectItem>
                    <SelectItem value="existing-customers">Existing Customers</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <ScrollArea className="h-[500px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bannerTemplates
                    .filter(template => templateFilter === "all" || template.category === templateFilter)
                    .map(template => (
                      <div 
                        key={template.id} 
                        className="relative group rounded-lg overflow-hidden cursor-pointer"
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
                        
                        {/* Lighter overlay that appears on hover */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button 
                            variant="default" 
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent double-triggering the parent onClick
                              console.log("Customizing template:", template.id);
                              applyTemplate(template);
                            }}
                            className="flex items-center gap-1"
                          >
                            <Edit className="h-4 w-4" />
                            <span>Customize</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Customer Picker Modal would go here */}
        
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
        
        {/* Guide Panel */}
        <div 
          className={`fixed top-0 right-0 h-full w-[320px] bg-white shadow-lg z-[100] transition-transform duration-300 transform ${
            guideOpen ? "translate-x-0" : "translate-x-full"
          } overflow-y-auto border-l border-gray-200`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Banner Guide</h3>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setGuideOpen(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <h4 className="font-medium text-[#007AFF]">What are Banners?</h4>
                <p className="text-sm text-gray-600">
                  Banners are promotional elements that appear at the top of your customers' app. 
                  They're perfect for announcing sales, new products, or important information.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-[#007AFF]">Creating Effective Banners</h4>
                <ul className="text-sm text-gray-600 space-y-3">
                  <li className="flex gap-2">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">1</div>
                    <div>
                      <strong>Keep it concise</strong> - Use short, compelling text that grabs attention.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">2</div>
                    <div>
                      <strong>Clear call-to-action</strong> - Make sure your button text clearly indicates what will happen when clicked.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">3</div>
                    <div>
                      <strong>Choose the right style</strong> - Match the banner style to your message: Dark for impact, Light for subtlety, Glass for elegance.
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">4</div>
                    <div>
                      <strong>Target appropriately</strong> - Use customer targeting to show relevant banners to specific groups.
                    </div>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-[#007AFF]">Banner Actions</h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="font-medium text-sm">Store Redirect</h5>
                    <p className="text-xs text-gray-600">
                      Takes customers to your store page when they click the banner.
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h5 className="font-medium text-sm">Show Announcement</h5>
                    <p className="text-xs text-gray-600">
                      Opens a detailed announcement with more information, perfect for promotions with terms and conditions.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-[#007AFF]">Need More Help?</h4>
                <p className="text-sm text-gray-600">
                  Visit our <a href="/help" className="text-blue-600 underline">help center</a> for more detailed guides and best practices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Banner Preview Component
const BannerPreview = ({ 
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
  
  // Helper function to darken a color
  function darkenColor(hex, percent) {
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
  const hexToRgba = (hex, alpha) => {
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
          <Icon size={100} color={styleType === BannerStyle.DARK ? 'white' : color} />
        </div>
      </div>
      
      {visibilityType === BannerVisibility.NEW && (
        <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
          <UserPlus className="h-3 w-3 mr-1" />
          <span>New Customers</span>
        </div>
      )}
    </div>
  )
} 