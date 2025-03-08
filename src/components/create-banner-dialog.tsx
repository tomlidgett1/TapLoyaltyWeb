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
import { Store, Gift, Sparkles, Users, UserPlus, ChevronLeft, ChevronRight, Edit, Copy, PenLine, Library } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { AnnouncementDesignerDialog } from "@/components/announcement-designer-dialog"

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
  onSave: (bannerData: any) => void
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
      // Build the data object with the fields you need for the preview
      const bannerObj = {
        bannerName: title,
        cssColor: selectedColor,
        description,
        buttonText,
        merchantName,
        visibilityType,
        isActive,
        styleType: selectedStyle
      }
      
      // Instead of just closing, call onSave with these fields:
      onSave(bannerObj)
      
      setLoading(false)
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Banner</DialogTitle>
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
                
                <RadioGroup 
                  value={bannerAction} 
                  onValueChange={(value) => setBannerAction(value)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={BannerAction.STORE_REDIRECT} id="store" />
                    <Label htmlFor="store">Take to store page</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={BannerAction.SHOW_ANNOUNCEMENT} id="announcement" />
                    <Label htmlFor="announcement">Show announcement</Label>
                  </div>
                </RadioGroup>
                
                {bannerAction === BannerAction.SHOW_ANNOUNCEMENT && (
                  <div className="pl-4 border-l-2 border-gray-200">
                    {announcement ? (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-medium">{announcement.title}</h4>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setAnnouncement(null)}
                          >
                            Remove
                          </Button>
                        </div>
                        <p className="text-sm text-gray-600">
                          {announcement.messages?.[0]}
                          {announcement.messages?.length > 1 && "..."}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Design: {announcement.designName}
                        </p>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        onClick={() => setShowAnnouncementDesigner(true)}
                      >
                        Create Announcement
                      </Button>
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
                      <Card key={template.id} className="overflow-hidden">
                        <CardContent className="p-0">
                          <div className="p-4">
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
                          </div>
                          <div className="flex justify-end gap-2 p-2 bg-gray-50 border-t">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => applyTemplate(template)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              <span>Customize</span>
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => {
                                applyTemplate(template)
                                createBanner()
                              }}
                              className="flex items-center gap-1"
                            >
                              <Copy className="h-3 w-3" />
                              <span>Use This</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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