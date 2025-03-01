"use client"

import { useState, useEffect, useRef } from "react"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { safelyGetDate } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { AlertCircle, Download, Share2 } from "lucide-react"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { AspectRatio } from "@/components/ui/aspect-ratio"

// Icons - consolidated to avoid duplicates
import { 
  Search, 
  Filter, 
  Plus, 
  Gift, 
  Coffee, 
  ShoppingBag, 
  Utensils, 
  Store, 
  Tag, 
  Users, 
  TrendingUp, 
  Heart, 
  Star, 
  Clock, 
  ChevronDown,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  ThumbsUp,
  Award,
  Zap,
  Copy,
  Bookmark,
  BookmarkCheck,
  BarChart,
  Lightbulb,
  Flame,
  Crown,
  Rocket,
  Target,
  Pencil
} from "lucide-react"

// Conditionally import or define fallbacks for missing components
let CarouselContentFallback, CarouselItemFallback, CarouselPreviousFallback, CarouselNextFallback;
let AspectRatioFallback;

try {
  const carouselModule = require("@/components/ui/carousel");
  CarouselContentFallback = carouselModule.CarouselContent;
  CarouselItemFallback = carouselModule.CarouselItem;
  CarouselPreviousFallback = carouselModule.CarouselPrevious;
  CarouselNextFallback = carouselModule.CarouselNext;
} catch (e) {
  // Fallback components if carousel is not available
  CarouselContentFallback = ({ children, className }) => <div className={`flex gap-4 overflow-x-auto ${className}`}>{children}</div>;
  CarouselItemFallback = ({ children, className }) => <div className={`flex-shrink-0 ${className}`}>{children}</div>;
  CarouselPreviousFallback = () => null;
  CarouselNextFallback = () => null;
}

try {
  const aspectRatioModule = require("@/components/ui/aspect-ratio");
  AspectRatioFallback = aspectRatioModule.AspectRatio;
} catch (e) {
  // Fallback if AspectRatio is not available
  AspectRatioFallback = ({ ratio, children, className }) => <div className={`relative ${className}`} style={{ paddingBottom: `${(1 / ratio) * 100}%` }}>
    <div className="absolute inset-0">{children}</div>
  </div>;
}

// Define types for our rewards and programs
type RewardType = {
  id: string
  name: string
  description: string
  longDescription?: string
  type: "individual" | "program"
  category: string
  industry: string[]
  objective: string[]
  status: "active" | "draft" | "archived"
  points: number
  claimed?: number
  total?: number
  createdAt: string
  updatedAt: string
  featured?: boolean
  popularity?: number
  benefits?: string[]
  requirements?: string[]
  howItWorks?: string[]
  recommendedFor?: string[]
  programRewards?: {
    rewardName: string
    description: string
    isActive: boolean
    pointsCost: number
    programtype: string
    conditions: any[]
  }[]
}

export default function RewardsLibraryPage() {
  // State
  const [activeTab, setActiveTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [rewards, setRewards] = useState<RewardType[]>([])
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([])
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([])
  const [selectedReward, setSelectedReward] = useState<RewardType | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [savedRewards, setSavedRewards] = useState<string[]>([])
  const [sortOption, setSortOption] = useState<string>("popular")
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [isCreatingReward, setIsCreatingReward] = useState(false)
  const [showTips, setShowTips] = useState(true)
  
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()

  // Mock data for initial design
  const mockRewards: RewardType[] = [
    {
      id: "free-coffee-new-customers",
      name: "Free Coffee for New Customers",
      description: "Welcome new customers with a complimentary coffee on their first visit. A simple but effective way to make a great first impression.",
      longDescription: "This reward is designed to attract new customers and create a positive first experience. By offering a free coffee on their first visit, you remove the barrier to trial and give potential regulars a reason to choose your café over competitors. Research shows that customers who receive a free item on their first visit are 42% more likely to return within 30 days.",
      type: "individual",
      category: "acquisition",
      industry: ["cafe", "coffee"],
      objective: ["acquisition", "trial"],
      status: "active",
      points: 0,
      claimed: 156,
      total: 300,
      createdAt: new Date(2023, 11, 10).toISOString(),
      updatedAt: new Date(2023, 11, 10).toISOString(),
      featured: true,
      popularity: 95,
      benefits: [
        "Attracts new customers with a no-risk trial",
        "Creates positive first impression and goodwill",
        "Introduces customers to your product quality",
        "Encourages sign-ups to your loyalty program"
      ],
      requirements: [
        "Must be customer's first visit",
        "Customer must sign up for loyalty program",
        "Valid for any small or medium coffee"
      ],
      howItWorks: [
        "New customer downloads your café app or signs up in-store",
        "Free coffee reward is automatically added to their account",
        "Customer can redeem the free coffee immediately or on their next visit",
        "Staff verifies this is their first visit through the system",
        "Customer receives their complimentary coffee"
      ],
      recommendedFor: [
        "New cafés looking to build a customer base",
        "Established cafés entering a new market",
        "Businesses in high-competition areas",
        "Cafés looking to grow their loyalty program membership"
      ]
    },
    {
      id: "birthday-reward",
      name: "Birthday Treat",
      description: "Celebrate your customers' birthdays with a special treat on their special day. Makes them feel valued and creates a personal connection.",
      longDescription: "Birthday rewards are among the most effective loyalty tactics, with redemption rates 2-3 times higher than standard promotions. This reward automatically activates on the customer's birthday and remains valid for 7 days, giving them flexibility while creating a sense of urgency.",
      type: "individual",
      category: "retention",
      industry: ["cafe", "coffee"],
      objective: ["retention", "loyalty"],
      status: "active",
      points: 0,
      claimed: 87,
      total: 200,
      createdAt: new Date(2023, 10, 15).toISOString(),
      updatedAt: new Date(2023, 10, 15).toISOString(),
      featured: false,
      popularity: 92,
      benefits: [
        "Creates a personal connection with customers",
        "Drives visits during a time when customers are likely to celebrate",
        "Encourages bringing friends along (additional sales)",
        "High perceived value at relatively low cost"
      ],
      requirements: [
        "Customer must have a registered account with birthday information",
        "Valid only during birthday week (day of birthday plus 6 days after)",
        "Must present ID for verification"
      ],
      howItWorks: [
        "Customer receives notification on their birthday",
        "Reward is automatically added to their account",
        "Customer has 7 days to redeem their special treat",
        "Staff verifies customer identity and birthday",
        "Customer enjoys their complimentary birthday item"
      ],
      recommendedFor: [
        "Cafés with a loyalty program",
        "Businesses looking to create emotional connections",
        "Establishments with repeat customers",
        "Venues where celebrations commonly occur"
      ]
    },
    {
      id: "coffee-punch-card",
      name: "Digital Punch Card",
      description: "Buy 9 coffees, get the 10th free. A digital version of the classic loyalty punch card that rewards your regular customers.",
      longDescription: "The digital punch card modernizes a tried-and-true loyalty mechanic. By tracking purchases automatically, customers never forget or lose their card, and you gain valuable data on purchase frequency and preferences. This simple program is easy for customers to understand and provides a clear path to reward.",
      type: "individual",
      category: "frequency",
      industry: ["cafe", "coffee"],
      objective: ["frequency", "retention"],
      status: "active",
      points: 0,
      claimed: 203,
      total: 500,
      createdAt: new Date(2023, 9, 5).toISOString(),
      updatedAt: new Date(2023, 9, 5).toISOString(),
      featured: true,
      popularity: 98,
      benefits: [
        "Encourages repeat visits and purchase frequency",
        "Simple to understand and track for customers",
        "Creates anticipation as customers get closer to reward",
        "Provides data on customer purchase patterns"
      ],
      requirements: [
        "Purchases must be of qualifying coffee drinks",
        "Minimum purchase amount of $3.50 per coffee",
        "Customer must use registered account for purchase tracking"
      ],
      howItWorks: [
        "Customer signs up for your loyalty program",
        "Each qualifying coffee purchase adds a 'punch' to their digital card",
        "Progress is visible in the customer's account",
        "After 9 purchases, a free coffee reward is automatically added",
        "Customer redeems their free coffee on their next visit"
      ],
      recommendedFor: [
        "Coffee shops with regular customers",
        "Cafés looking for a simple loyalty program",
        "Businesses wanting to increase visit frequency",
        "Establishments transitioning from paper to digital loyalty"
      ]
    },
    {
      id: "happy-hour-special",
      name: "Happy Hour Special",
      description: "Drive traffic during slow periods with special pricing on drinks and snacks during your designated happy hour times.",
      longDescription: "Happy hour promotions are effective for smoothing out demand during traditionally slow periods. By offering special pricing during specific hours, you can attract price-sensitive customers, increase overall traffic, and maximize utilization of your staff and facilities during otherwise quiet times.",
      type: "individual",
      category: "traffic",
      industry: ["cafe", "coffee"],
      objective: ["traffic", "sales"],
      status: "active",
      points: 0,
      claimed: 312,
      total: 1000,
      createdAt: new Date(2023, 8, 20).toISOString(),
      updatedAt: new Date(2023, 8, 20).toISOString(),
      featured: false,
      popularity: 90,
      benefits: [
        "Increases traffic during traditionally slow periods",
        "Attracts price-sensitive customers",
        "Maximizes staff and facility utilization",
        "Creates a regular routine for customers"
      ],
      requirements: [
        "Valid only during specified happy hour times",
        "Applies to select menu items only",
        "Cannot be combined with other discounts"
      ],
      howItWorks: [
        "Determine your slowest periods and set those as happy hour times",
        "Create special pricing for select menu items during those times",
        "Promote your happy hour through signage and digital channels",
        "Customers visit during happy hour times to enjoy special pricing",
        "Staff applies discounts automatically during designated hours"
      ],
      recommendedFor: [
        "Cafés with predictable slow periods",
        "Businesses in areas with time-sensitive traffic patterns",
        "Establishments looking to smooth out demand",
        "Venues wanting to attract new customer segments"
      ]
    }
  ]

  // Industry and objective options
  const industryOptions = [
    { value: "cafe", label: "Café", icon: Coffee },
    { value: "restaurant", label: "Restaurant", icon: Utensils },
    { value: "retail", label: "Retail", icon: ShoppingBag },
    { value: "beauty", label: "Beauty & Wellness", icon: Heart },
    { value: "fitness", label: "Fitness", icon: Users }
  ]

  const objectiveOptions = [
    { value: "retention", label: "Customer Retention", icon: Users },
    { value: "acquisition", label: "New Customers", icon: Users },
    { value: "frequency", label: "Visit Frequency", icon: Clock },
    { value: "sales", label: "Increase Sales", icon: TrendingUp },
    { value: "loyalty", label: "Build Loyalty", icon: Heart },
    { value: "premium", label: "Premium Experience", icon: Star }
  ]

  // Add these category options
  const categoryOptions = [
    { value: "loyalty", label: "Loyalty Programs", icon: Crown, color: "bg-purple-500/10 text-purple-500" },
    { value: "retention", label: "Customer Retention", icon: Target, color: "bg-blue-500/10 text-blue-500" },
    { value: "acquisition", label: "New Customers", icon: Rocket, color: "bg-green-500/10 text-green-500" },
    { value: "seasonal", label: "Seasonal Promotions", icon: Flame, color: "bg-orange-500/10 text-orange-500" },
    { value: "special", label: "Special Occasions", icon: Sparkles, color: "bg-amber-500/10 text-amber-500" }
  ]

  useEffect(() => {
    // For now, use mock data
    setRewards(mockRewards)
    
    // In production, would fetch from Firebase
    // if (user?.uid) {
    //   fetchRewards()
    // }
  }, [user])

  const fetchRewards = async () => {
    if (!user?.uid) return
    
    try {
      setLoading(true)
      const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const q = query(rewardsRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const rewardsData: RewardType[] = []
      
      querySnapshot.forEach(doc => {
        try {
          const data = doc.data()
          
          const createdAt = safelyGetDate(data.createdAt)
          const updatedAt = safelyGetDate(data.updatedAt || data.createdAt)
          
          rewardsData.push({
            ...data,
            id: doc.id,
            createdAt,
            updatedAt
          } as RewardType)
        } catch (err) {
          console.error("Error processing document:", err)
        }
      })
      
      setRewards(rewardsData)
    } catch (error) {
      console.error("Error fetching rewards:", error)
      toast({
        title: "Error",
        description: "Failed to load rewards. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Filter rewards based on search, tab, and selected filters
  const filteredRewards = rewards.filter(reward => {
    // Filter by search query
    const matchesSearch = 
      searchQuery === "" || 
      reward.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reward.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by tab
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "individual" && reward.type === "individual") ||
      (activeTab === "program" && reward.type === "program") ||
      (activeTab === "saved" && savedRewards.includes(reward.id));
    
    // Filter by selected industries
    const matchesIndustry = 
      selectedIndustries.length === 0 || 
      reward.industry.some(ind => selectedIndustries.includes(ind));
    
    // Filter by selected objectives
    const matchesObjective = 
      selectedObjectives.length === 0 || 
      reward.objective.some(obj => selectedObjectives.includes(obj));
    
    return matchesSearch && matchesTab && matchesIndustry && matchesObjective;
  });

  // Toggle industry selection
  const toggleIndustry = (industry: string) => {
    setSelectedIndustries(prev => 
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    )
  }

  // Toggle objective selection
  const toggleObjective = (objective: string) => {
    setSelectedObjectives(prev => 
      prev.includes(objective)
        ? prev.filter(o => o !== objective)
        : [...prev, objective]
    )
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedIndustries([])
    setSelectedObjectives([])
    setSearchQuery("")
  }

  // Toggle saved rewards
  const toggleSaveReward = (e: React.MouseEvent, rewardId: string) => {
    e.stopPropagation() // Prevent card click
    setSavedRewards(prev => 
      prev.includes(rewardId)
        ? prev.filter(id => id !== rewardId)
        : [...prev, rewardId]
    )
  }

  // Sort rewards
  const getSortedRewards = () => {
    return [...filteredRewards].sort((a, b) => {
      switch (sortOption) {
        case "popular":
          return (b.popularity || 0) - (a.popularity || 0)
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "points":
          return (a.points || 0) - (b.points || 0)
        default:
          return 0
      }
    })
  }

  // Add this function to get rewards by category
  const getRewardsByCategory = (category: string) => {
    return rewards.filter(reward => 
      reward.objective.includes(category) || 
      reward.category === category
    ).slice(0, 6)
  }

  // Update the handleCreateReward function to create rewards in the specified JSON format
  const handleCreateReward = (template: RewardType | null = null) => {
    setIsCreatingReward(true);
    
    if (template) {
      // Convert the template to the required JSON format
      let rewardData;
      
      switch(template.id) {
        case "free-coffee-new-customers":
          rewardData = {
            rewardName: template.name,
            description: template.description,
            isActive: true,
            pointsCost: 0,
            rewardVisibility: "global",
            voucherAmount: 0,
            programtype: "acquisition",
            conditions: [
              {
                type: "maximumTransactions",
                value: 0
              }
            ],
            limitations: [
              {
                type: "customerLimit",
                value: 1
              },
              {
                type: "totalRedemptionLimit",
                value: 300
              },
              {
                type: "activePeriod",
                value: {
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
                }
              }
            ]
          };
          break;
          
        case "birthday-reward":
          rewardData = {
            rewardName: "Birthday Treat",
            description: "Enjoy a free treat on your birthday! Valid for 7 days from your birthday.",
            isActive: true,
            pointsCost: 0,
            rewardVisibility: "global",
            voucherAmount: 0,
            conditions: [
              {
                type: "birthday",
                value: true
              }
            ],
            limitations: [
              {
                type: "customerLimit",
                value: 1
              },
              {
                type: "totalRedemptionLimit",
                value: 200
              },
              {
                type: "validDuration",
                value: 7
              }
            ]
          };
          break;
          
        case "coffee-punch-card":
          rewardData = {
            rewardName: "10th Coffee Free",
            description: "Buy 9 coffees, get your 10th one free! Any size, any flavor.",
            isActive: true,
            pointsCost: 0,
            rewardVisibility: "global",
            programtype: "coffee",
            conditions: [
              {
                type: "minimumTransactions",
                value: 9
              }
            ],
            limitations: [
              {
                type: "customerLimit",
                value: 1
              },
              {
                type: "totalRedemptionLimit",
                value: 500
              }
            ]
          };
          break;
          
        case "happy-hour-special":
          rewardData = {
            rewardName: "Happy Hour Special",
            description: "20% off all drinks and snacks during our happy hour: 2-4pm weekdays!",
            isActive: true,
            pointsCost: 0,
            rewardVisibility: "global",
            voucherAmount: 0,
            conditions: [
              {
                type: "minimumSpend",
                amount: 5
              }
            ],
            limitations: [
              {
                type: "customerLimit",
                value: 0
              },
              {
                type: "totalRedemptionLimit",
                value: 1000
              },
              {
                type: "daysOfWeek",
                value: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
              },
              {
                type: "timeOfDay",
                value: {
                  startTime: "14:00",
                  endTime: "16:00"
                }
              }
            ]
          };
          break;
          
        default:
          rewardData = {
            rewardName: template.name.substring(0, 22),
            description: template.description,
            isActive: true,
            pointsCost: template.points,
            rewardVisibility: "global",
            conditions: [
              {
                type: "minimumTransactions",
                value: 1
              }
            ],
            limitations: [
              {
                type: "customerLimit",
                value: 1
              },
              {
                type: "totalRedemptionLimit",
                value: 100
              }
            ]
          };
      }
      
      // Log the created reward data (in a real app, you would send this to your backend)
      console.log("Created reward:", rewardData);
      
      // Show success toast
      setTimeout(() => {
        setIsCreatingReward(false);
        toast({
          title: "Template Applied",
          description: `"${template.name}" has been created using the template.`,
        });
        
        // In a real app, you would navigate to the edit page with the new reward data
        router.push("/create");
      }, 1500);
    } else {
      // Handle case where no template is selected
      setTimeout(() => {
        setIsCreatingReward(false);
        router.push("/create");
      }, 1000);
    }
  };

  // Helper function to generate conditions based on the template
  const generateConditions = (template: RewardType) => {
    const conditions = [];
    
    // Add conditions based on template type and category
    if (template.id === "cafe-reward-1") {
      conditions.push(
        {
          type: "minimumTransactions",
          value: 10
        },
        {
          type: "minimumPointsBalance",
          value: 100
        }
      );
    } else if (template.id === "cafe-reward-2") {
      conditions.push(
        {
          type: "daysOfWeek",
          days: ["Monday", "Tuesday"]
        },
        {
          type: "timeOfDay",
          startTime: "08:00",
          endTime: "20:00"
        }
      );
    } else if (template.id === "cafe-reward-3") {
      conditions.push(
        {
          type: "bringReusableCup",
          value: true
        }
      );
    } else {
      // Default conditions for other templates
      if (template.requirements && template.requirements.length > 0) {
        // Add a minimum spend condition if requirements mention minimum spend
        if (template.requirements.some(req => req.toLowerCase().includes("minimum spend"))) {
          conditions.push({
            type: "minimumSpend",
            amount: 25
          });
        }
        
        // Add a minimum transactions condition if requirements mention purchases
        if (template.requirements.some(req => req.toLowerCase().includes("purchase"))) {
          conditions.push({
            type: "minimumTransactions",
            value: 5
          });
        }
      }
    }
    
    return conditions;
  };

  // Helper function to generate limitations based on the template
  const generateLimitations = (template: RewardType) => {
    const limitations = [];
    
    // Add standard limitations
    limitations.push(
      {
        type: "customerLimit",
        value: 1
      },
      {
        type: "activePeriod",
        value: {
          startDate: "2024-01-01",
          endDate: "2024-12-31"
        }
      }
    );
    
    // Add specific limitations based on template
    if (template.id === "cafe-reward-3") {
      limitations.push({
        type: "totalRedemptionLimit",
        value: 1000
      });
    }
    
    return limitations;
  };

  return (
    <div className="container py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reward Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Browse and use pre-made rewards and programs for your business
            </p>
          </div>

          <Button className="bg-[#007AFF] hover:bg-[#0066CC] h-10 rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Reward
          </Button>
        </div>

        {/* Main content */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Reward Templates</h2>
          
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search rewards and programs..." 
                className="pl-9 rounded-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 rounded-lg">
                    <Store className="h-4 w-4" />
                    <span>Industry</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg">
                  {industryOptions.map(industry => (
                    <DropdownMenuCheckboxItem
                      key={industry.value}
                      checked={selectedIndustries.includes(industry.value)}
                      onCheckedChange={() => toggleIndustry(industry.value)}
                    >
                      <industry.icon className="h-4 w-4 mr-2" />
                      {industry.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 rounded-lg">
                    <Tag className="h-4 w-4" />
                    <span>Objective</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-lg">
                  {objectiveOptions.map(objective => (
                    <DropdownMenuCheckboxItem
                      key={objective.value}
                      checked={selectedObjectives.includes(objective.value)}
                      onCheckedChange={() => toggleObjective(objective.value)}
                    >
                      <objective.icon className="h-4 w-4 mr-2" />
                      {objective.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              
              {(selectedIndustries.length > 0 || selectedObjectives.length > 0) && (
                <Button 
                  variant="ghost" 
                  onClick={clearFilters}
                  className="h-10 px-3 rounded-lg"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs defaultValue="all" className="mb-6" onValueChange={setActiveTab}>
            <TabsList className="bg-muted/50 p-1 rounded-lg">
              <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white">
                All
              </TabsTrigger>
              <TabsTrigger value="individual" className="rounded-md data-[state=active]:bg-white">
                Individual Rewards
              </TabsTrigger>
              <TabsTrigger value="program" className="rounded-md data-[state=active]:bg-white">
                Programs
              </TabsTrigger>
              <TabsTrigger value="featured" className="rounded-md data-[state=active]:bg-white">
                <Sparkles className="h-4 w-4 mr-1.5" />
                Featured
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Tips alert - can be dismissed */}
          {showTips && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <AlertTitle className="text-blue-700">Pro Tips</AlertTitle>
              <AlertDescription className="text-blue-600">
                <p className="text-sm">
                  Browse our curated library of pre-made rewards and programs. Click on any card to see details, 
                  then use it as a template for your own rewards. You can filter by industry, objective, or search for specific rewards.
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowTips(false)}
                  className="mt-2 text-blue-700 hover:text-blue-800 hover:bg-blue-100 p-0 h-auto"
                >
                  Got it
                </Button>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Reward templates with expandable sections */}
          <div className="grid grid-cols-1 gap-4">
            {filteredRewards.map(reward => {
              const isExpanded = selectedReward?.id === reward.id;
              
              return (
                <div key={reward.id} className="border rounded-lg overflow-hidden">
                  {/* Card Header - Always visible */}
                  <div 
                    className={cn(
                      "p-4 bg-white transition-all cursor-pointer",
                      isExpanded ? "border-b" : "",
                      hoveredCard === reward.id ? "bg-gray-50" : ""
                    )}
                    onClick={() => setSelectedReward(isExpanded ? null : reward)}
                    onMouseEnter={() => setHoveredCard(reward.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Gift className="h-5 w-5 text-blue-600" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-base font-medium">{reward.name}</h3>
                        <p className="text-sm text-gray-600">{reward.description}</p>
                      </div>
                      
                      <ChevronDown className={cn(
                        "h-5 w-5 text-gray-400 transition-transform",
                        isExpanded ? "transform rotate-180" : ""
                      )} />
                    </div>
                  </div>
                  
                  {/* Expandable Content - Only visible when selected */}
                  {isExpanded && (
                    <div className="p-4 bg-gray-50">
                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Reward Type</p>
                            <p className="text-sm font-medium">{reward.type === "individual" ? "Individual Reward" : "Program"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Points Cost</p>
                            <p className="text-sm font-medium">{reward.points} points</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-gray-500">Status</p>
                            <Badge variant={reward.status === "active" ? "success" : "secondary"} className="text-xs">
                              {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Collapsible Sections */}
                        <div className="space-y-4">
                          {/* Conditions Section */}
                          <div className="border rounded-lg overflow-hidden bg-white">
                            <div 
                              className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                              onClick={() => {
                                const section = document.getElementById(`conditions-section-${reward.id}`);
                                section?.classList.toggle('hidden');
                              }}
                            >
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Filter className="h-4 w-4 text-blue-500" />
                                Conditions
                              </h4>
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                            <div id={`conditions-section-${reward.id}`} className="p-3 border-t">
                              <p className="text-sm text-gray-700 mb-3">Customers must meet these conditions to be eligible for this reward:</p>
                              <div className="space-y-3">
                                <div className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium">First Visit:</span>
                                    <p className="text-gray-600">Must be customer's first visit to the café</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium">Loyalty Program:</span>
                                    <p className="text-gray-600">Customer must sign up for the loyalty program</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Limitations Section */}
                          <div className="border rounded-lg overflow-hidden bg-white">
                            <div 
                              className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer"
                              onClick={() => {
                                const section = document.getElementById(`limitations-section-${reward.id}`);
                                section?.classList.toggle('hidden');
                              }}
                            >
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Clock className="h-4 w-4 text-red-500" />
                                Limitations
                              </h4>
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </div>
                            <div id={`limitations-section-${reward.id}`} className="p-3 border-t">
                              <p className="text-sm text-gray-700 mb-3">This reward has the following limitations:</p>
                              <div className="space-y-3">
                                <div className="flex items-start gap-2 text-sm">
                                  <Info className="h-5 w-5 text-red-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium">Customer Limit:</span>
                                    <p className="text-gray-600">1 per customer (one-time use only)</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <Info className="h-5 w-5 text-red-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium">Redemption Period:</span>
                                    <p className="text-gray-600">Must be redeemed within 30 days of sign-up</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm">
                                  <Info className="h-5 w-5 text-red-500 mt-0.5" />
                                  <div>
                                    <span className="font-medium">Product Limitation:</span>
                                    <p className="text-gray-600">Valid for small or medium coffee only (excludes specialty drinks)</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-3 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="rounded-lg gap-1"
                            onClick={() => router.push(`/edit/${reward.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit Template
                          </Button>
                          
                          <Button 
                            variant="default" 
                            size="sm" 
                            className="bg-[#007AFF] hover:bg-[#0066CC] rounded-lg gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCreateReward(reward);
                            }}
                            disabled={isCreatingReward}
                          >
                            {isCreatingReward ? (
                              <>
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent" />
                                Creating...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" />
                                Use Template
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Rewards by category */}
        {activeCategory && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(() => {
                  const category = categoryOptions.find(c => c.value === activeCategory)
                  if (category) {
                    const Icon = category.icon
                    return (
                      <>
                        <Icon className={cn("h-5 w-5", category.color.split(' ')[1])} />
                        <h2 className="text-lg font-medium">{category.label}</h2>
                      </>
                    )
                  }
                  return null
                })()}
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setActiveCategory(null)}
                className="h-8 text-xs"
              >
                Clear
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getRewardsByCategory(activeCategory).map((reward) => (
                <Card 
                  className={cn(
                    "overflow-hidden border rounded-lg transition-all h-full cursor-pointer",
                    hoveredCard === reward.id ? "shadow-md border-[#007AFF]" : "hover:shadow-sm"
                  )}
                  onClick={() => setSelectedReward(reward)}
                  onMouseEnter={() => setHoveredCard(reward.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0",
                        reward.type === "individual" 
                          ? "bg-[#007AFF]/10" 
                          : "bg-amber-500/10"
                      )}>
                        {reward.type === "individual" ? (
                          <Gift className="h-6 w-6 text-[#007AFF]" />
                        ) : (
                          <Coffee className="h-6 w-6 text-amber-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-medium">{reward.name}</h3>
                          <Badge variant={reward.type === "individual" ? "default" : "secondary"} 
                            className={cn(
                              "text-[10px] rounded-full px-2 py-0.5",
                              reward.type === "individual" 
                                ? "bg-blue-100 text-blue-700" 
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {reward.type === "individual" ? "Reward" : "Program"}
                          </Badge>
                          {reward.featured && (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-500/90 text-[10px] rounded-full px-1.5 py-0">
                              <Sparkles className="h-3 w-3 mr-0.5" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {reward.description}
                        </p>
                        
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {reward.industry.map(ind => {
                            const industryOption = industryOptions.find(opt => opt.value === ind)
                            return (
                              <Badge 
                                key={ind} 
                                variant="outline" 
                                className="text-[10px] rounded-full px-2 py-0.5 bg-gray-50 text-gray-700 border-gray-200"
                              >
                                {industryOption?.label || ind}
                              </Badge>
                            )
                          })}
                          
                          {reward.objective.slice(0, 1).map(obj => {
                            const objectiveOption = objectiveOptions.find(opt => opt.value === obj)
                            return (
                              <Badge 
                                key={obj} 
                                variant="outline" 
                                className="text-[10px] rounded-full px-2 py-0.5 bg-green-50 text-green-700 border-green-200"
                              >
                                {objectiveOption?.label || obj}
                              </Badge>
                            )
                          })}
                          
                          {reward.type === "program" && reward.programRewards && (
                            <Badge variant="outline" className="text-[10px] rounded-full px-2 py-0.5 bg-purple-50 text-purple-700 border-purple-200">
                              {reward.programRewards.length} rewards
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className={cn(
                          "rounded-lg text-xs h-8",
                          hoveredCard === reward.id && "bg-[#007AFF] text-white hover:bg-[#0066CC] border-[#007AFF]"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateReward(reward);
                        }}
                      >
                        Use Template
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 