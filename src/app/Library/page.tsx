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
  Pencil,
  Code,
  Package,
  X,
  Repeat,
  DollarSign,
  UserPlus,
  Calendar,
  Percent,
  Layers,
  LayoutGrid
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

// Add a NoResults component to display when there are no rewards to show
const NoResults = ({ message, icon }: { message: string, icon?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 border rounded-lg bg-gray-50 text-center">
    {icon || <Search className="h-12 w-12 text-gray-300 mb-4" />}
    <h3 className="text-lg font-medium text-gray-700 mb-2">No results found</h3>
    <p className="text-gray-500 max-w-md">{message}</p>
  </div>
);

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
  const [rewardCategory, setRewardCategory] = useState("all-categories")
  const [programCategory, setProgramCategory] = useState("all-programs")
  
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
    },
    {
      id: "coffee-lovers-program",
      name: "Coffee Lovers Program",
      description: "A comprehensive loyalty program for coffee enthusiasts with multiple rewards at different milestones.",
      longDescription: "The Coffee Lovers Program is designed to reward your most loyal customers with a series of benefits as they reach different milestones. This program encourages repeat visits and higher spend while creating a sense of progression and achievement.",
      type: "program",
      category: "loyalty",
      industry: ["cafe", "coffee"],
      objective: ["loyalty", "frequency", "spend"],
      status: "active",
      points: 0,
      claimed: 124,
      total: 500,
      createdAt: new Date(2023, 7, 15).toISOString(),
      updatedAt: new Date(2023, 7, 15).toISOString(),
      featured: true,
      popularity: 96,
      benefits: [
        "Creates a comprehensive loyalty journey for customers",
        "Encourages progression through multiple tiers of rewards",
        "Increases visit frequency and average spend",
        "Builds long-term customer relationships"
      ],
      requirements: [
        "Customer must sign up for loyalty program",
        "Purchases must be tracked through customer account",
        "Different rewards have different qualification criteria"
      ],
      howItWorks: [
        "Customer joins your loyalty program",
        "Each purchase earns progress toward different reward tiers",
        "Customers unlock rewards as they reach milestones",
        "Higher tiers offer more valuable rewards",
        "Progress is visible in the customer's account"
      ],
      recommendedFor: [
        "Established cafés with regular customers",
        "Businesses looking to increase customer lifetime value",
        "Cafés in competitive markets",
        "Businesses with multiple product offerings"
      ],
      programRewards: [
        {
          id: "welcome-drink",
          rewardName: "Welcome Drink",
          description: "A free small coffee to welcome new members to the Coffee Lovers Program.",
          isActive: true,
          pointsCost: 0,
          programtype: "coffee",
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
              value: 1000
            },
            {
              type: "activePeriod",
              value: {
                startDate: "2024-01-01",
                endDate: "2024-12-31"
              }
            }
          ]
        },
        {
          id: "fifth-visit-reward",
          rewardName: "Fifth Visit Treat",
          description: "A free pastry of your choice on your fifth visit.",
          isActive: true,
          pointsCost: 0,
          programtype: "coffee",
          conditions: [
            {
              type: "minimumTransactions",
              value: 5
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
        },
        {
          id: "tenth-coffee-free",
          rewardName: "10th Coffee Free",
          description: "Every 10th coffee is on us! Any size, any flavor.",
          isActive: true,
          pointsCost: 0,
          programtype: "coffee",
          conditions: [
            {
              type: "minimumTransactions",
              value: 10
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
            }
          ]
        },
        {
          id: "birthday-special",
          rewardName: "Birthday Special",
          description: "Enjoy a free coffee and pastry on your birthday.",
          isActive: true,
          pointsCost: 0,
          programtype: "coffee",
          conditions: [
            {
              type: "daysSinceJoined",
              value: 30
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
            },
            {
              type: "activePeriod",
              value: {
                startDate: "2024-01-01",
                endDate: "2024-12-31"
              }
            }
          ]
        },
        {
          id: "premium-member-discount",
          rewardName: "Premium Member Discount",
          description: "10% off all purchases after spending $100 in our café.",
          isActive: true,
          pointsCost: 0,
          programtype: "coffee",
          conditions: [
            {
              type: "minimumLifetimeSpend",
              value: 100
            }
          ],
          limitations: [
            {
              type: "customerLimit",
              value: 0
            },
            {
              type: "totalRedemptionLimit",
              value: 0
            }
          ]
        }
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

  // Add the missing functions for filtering and sorting rewards
  const getFilteredRewards = () => {
    let filtered = [...mockRewards];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reward => 
        reward.name.toLowerCase().includes(query) || 
        reward.description.toLowerCase().includes(query)
      );
    }
    
    // Filter by tab
    if (activeTab === "individual") {
      filtered = filtered.filter(reward => reward.type === "individual");
    } else if (activeTab === "program") {
      filtered = filtered.filter(reward => reward.type === "program");
    } else if (activeTab === "saved") {
      filtered = filtered.filter(reward => savedRewards.includes(reward.id));
    }
    
    // Filter by category
    if (rewardCategory !== "all-categories") {
      switch (rewardCategory) {
        case "discount":
          filtered = filtered.filter(reward => 
            reward.name.toLowerCase().includes("discount") || 
            reward.description.toLowerCase().includes("discount") ||
            reward.name.toLowerCase().includes("off") || 
            reward.description.toLowerCase().includes("off") ||
            reward.name.toLowerCase().includes("%") || 
            reward.description.toLowerCase().includes("%")
          );
          break;
        case "freebies":
          filtered = filtered.filter(reward => 
            reward.name.toLowerCase().includes("free") || 
            reward.description.toLowerCase().includes("free") ||
            reward.name.toLowerCase().includes("complimentary") || 
            reward.description.toLowerCase().includes("complimentary")
          );
          break;
        case "points":
          filtered = filtered.filter(reward => 
            reward.name.toLowerCase().includes("point") || 
            reward.description.toLowerCase().includes("point") ||
            reward.points > 0
          );
          break;
        case "tiered":
          filtered = filtered.filter(reward => 
            reward.name.toLowerCase().includes("tier") || 
            reward.description.toLowerCase().includes("tier") ||
            reward.name.toLowerCase().includes("level") || 
            reward.description.toLowerCase().includes("level") ||
            (reward.type === "program" && reward.programRewards && reward.programRewards.length > 2)
          );
          break;
        case "special":
          filtered = filtered.filter(reward => 
            reward.name.toLowerCase().includes("birthday") || 
            reward.description.toLowerCase().includes("birthday") ||
            reward.name.toLowerCase().includes("holiday") || 
            reward.description.toLowerCase().includes("holiday") ||
            reward.name.toLowerCase().includes("anniversary") || 
            reward.description.toLowerCase().includes("anniversary") ||
            reward.name.toLowerCase().includes("special") || 
            reward.description.toLowerCase().includes("special day")
          );
          break;
      }
    }
    
    // Filter by industry
    if (selectedIndustries.length > 0) {
      filtered = filtered.filter(reward => 
        reward.industry.some(i => selectedIndustries.includes(i))
      );
    }
    
    // Filter by objective
    if (selectedObjectives.length > 0) {
      filtered = filtered.filter(reward => 
        reward.objective.some(o => selectedObjectives.includes(o))
      );
    }
    
    // Sort results
    if (sortOption === "popular") {
      filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (sortOption === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === "alphabetical") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return filtered;
  };

  const filteredRewards = getFilteredRewards();

  // Function to get rewards by category
  const getRewardsByCategory = (category: string) => {
    return mockRewards.filter(reward => reward.category === category);
  };

  // Function to handle creating a reward from a template
  const handleCreateReward = (template: RewardType | null = null) => {
    setIsCreatingReward(true);
    
    // In a real app, you would create the reward in your database
    setTimeout(() => {
      setIsCreatingReward(false);
      toast({
        title: "Template Applied",
        description: template 
          ? `"${template.name}" has been created using the template.`
          : "New reward created successfully.",
      });
      
      // Navigate to the edit page
      router.push("/create");
    }, 1500);
  };

  return (
    <div className="container py-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">Reward Templates</h1>
          <Button 
            onClick={() => router.push("/create")}
            className="bg-[#007AFF] hover:bg-[#0066CC] rounded-lg gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Custom Reward
          </Button>
        </div>

        {/* Main content */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Reward Templates</h2>
          
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                placeholder="Search templates..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            
            {/* Filter dropdown */}
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-lg">
                    <Filter className="h-4 w-4" />
                    Filter
                    {(selectedIndustries.length > 0 || selectedObjectives.length > 0) && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1 rounded-full">
                        {selectedIndustries.length + selectedObjectives.length}
                      </Badge>
                    )}
              </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="p-2">
                    <h4 className="font-medium text-sm mb-2">Industry</h4>
                    <div className="space-y-1">
                      {["cafe", "coffee", "restaurant", "retail", "salon"].map((industry) => (
                        <DropdownMenuCheckboxItem
                          key={industry}
                          checked={selectedIndustries.includes(industry)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIndustries([...selectedIndustries, industry])
                            } else {
                              setSelectedIndustries(selectedIndustries.filter(i => i !== industry))
                            }
                          }}
                        >
                          {industry.charAt(0).toUpperCase() + industry.slice(1)}
                        </DropdownMenuCheckboxItem>
                      ))}
            </div>
          </div>
                  <DropdownMenuSeparator />
                  <div className="p-2">
                    <h4 className="font-medium text-sm mb-2">Objective</h4>
                    <div className="space-y-1">
                      {["acquisition", "retention", "frequency", "spend", "loyalty"].map((objective) => (
                        <DropdownMenuCheckboxItem
                          key={objective}
                          checked={selectedObjectives.includes(objective)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedObjectives([...selectedObjectives, objective])
                            } else {
                              setSelectedObjectives(selectedObjectives.filter(o => o !== objective))
                            }
                          }}
                        >
                          {objective.charAt(0).toUpperCase() + objective.slice(1)}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="justify-center text-blue-600"
                    onClick={() => {
                      setSelectedIndustries([])
                      setSelectedObjectives([])
                    }}
                  >
                    Clear Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 rounded-lg">
                    <TrendingUp className="h-4 w-4" />
                    Sort
              </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => setSortOption("popular")}
                    className={sortOption === "popular" ? "bg-blue-50 text-blue-600" : ""}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Most Popular
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOption("newest")}
                    className={sortOption === "newest" ? "bg-blue-50 text-blue-600" : ""}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setSortOption("alphabetical")}
                    className={sortOption === "alphabetical" ? "bg-blue-50 text-blue-600" : ""}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Alphabetical
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center mb-6">
            {/* Main tabs on the left */}
            <Tabs defaultValue="individual" className="w-auto" onValueChange={(value) => {
              setActiveTab(value);
              // Reset the category tabs when switching between main tabs
              if (value === "program") {
                setProgramCategory("all-programs");
              } else {
                setRewardCategory("all-categories");
              }
            }}>
              <TabsList className="w-auto">
                <TabsTrigger value="individual">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Individual</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="program">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    <span>Programs</span>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="saved">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    <span>Saved</span>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Vertical separator */}
            <div className="h-10 w-px bg-gray-200 mx-4"></div>
            
            {/* Category tabs on the right - show different options based on active tab */}
            {activeTab === "program" ? (
              <Tabs defaultValue="all-programs" className="w-auto" onValueChange={setProgramCategory}>
                <TabsList className="w-auto">
                  <TabsTrigger value="all-programs">
                    <span>All Programs</span>
                  </TabsTrigger>
                  <TabsTrigger value="coffee-club">
                    <div className="flex items-center gap-2">
                      <Coffee className="h-4 w-4" />
                      <span>Coffee Club</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="tiered-loyalty">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span>Tiered Loyalty</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="points-based">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      <span>Points Based</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="subscription">
                    <div className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      <span>Subscription</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            ) : (
              <Tabs defaultValue="all-categories" className="w-auto" onValueChange={setRewardCategory}>
                <TabsList className="w-auto">
                  <TabsTrigger value="all-categories">
                    <span>All Categories</span>
                  </TabsTrigger>
                  <TabsTrigger value="discount">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      <span>Discounts</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="freebies">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      <span>Freebies</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="points">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      <span>Points</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="tiered">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      <span>Tiered</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="special">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Special Days</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>

          {/* Tips alert - can be dismissed */}
          {showTips && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-700">Tips for using templates</AlertTitle>
              <AlertDescription className="text-blue-600">
                <p className="mb-2">Browse our curated collection of reward templates designed for cafés and coffee shops. You can:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Filter by industry or objective to find relevant templates</li>
                  <li>Click on any template to see details and implementation tips</li>
                  <li>Use templates as-is or customize them to fit your needs</li>
                  <li>Save your favorite templates for quick access later</li>
                </ul>
              </AlertDescription>
                    <Button 
                      variant="ghost" 
                size="sm" 
                className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full"
                onClick={() => setShowTips(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-3 w-3" />
              </Button>
            </Alert>
          )}
          
          {/* Reward templates with expandable sections */}
          <div className="grid grid-cols-1 gap-4">
            {filteredRewards.length > 0 ? (
              filteredRewards.map(reward => {
                const isExpanded = selectedReward?.id === reward.id;
                const isProgram = reward.type === "program";
                
                return (
              <div 
                key={reward.id}
                    className={cn(
                      "border rounded-lg overflow-hidden",
                      isProgram ? "border-amber-200 bg-amber-50/30" : ""
                    )}
                  >
                    {/* Card Header - Always visible */}
                    <div 
                      className={cn(
                        "p-4 transition-all cursor-pointer",
                        isExpanded ? "border-b" : "",
                        hoveredCard === reward.id ? (isProgram ? "bg-amber-50" : "bg-gray-50") : "",
                        isProgram ? "bg-amber-50/50" : "bg-white"
                      )}
                      onClick={() => setSelectedReward(isExpanded ? null : reward)}
                      onMouseEnter={() => setHoveredCard(reward.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                          isProgram ? "bg-amber-100" : "bg-blue-100"
                        )}>
                          {isProgram ? (
                            <Coffee className="h-5 w-5 text-amber-600" />
                          ) : (
                            <Gift className="h-5 w-5 text-blue-600" />
                          )}
                </div>
                
                        <div className="flex-1">
                  <div className="flex items-center gap-2">
                            <h3 className="text-base font-medium">{reward.name}</h3>
                            <Badge 
                              variant={isProgram ? "secondary" : "default"} 
                              className={cn(
                                "text-[10px] rounded-full px-2 py-0.5",
                                isProgram 
                                  ? "bg-amber-100 text-amber-700" 
                                  : "bg-blue-100 text-blue-700"
                              )}
                            >
                              {isProgram ? "Program" : "Reward"}
                            </Badge>
                            {reward.featured && (
                              <Badge variant="default" className="bg-amber-500 hover:bg-amber-500/90 text-white text-[10px] rounded-full px-1.5 py-0">
                                <Sparkles className="h-3 w-3 mr-0.5" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{reward.description}</p>
                          
                          {isProgram && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-amber-700">
                              <Package className="h-3.5 w-3.5" />
                              <span>{reward.programRewards?.length || 0} rewards included</span>
                            </div>
                          )}
                        </div>
                        
                        <ChevronDown className={cn(
                          "h-5 w-5 transition-transform",
                          isProgram ? "text-amber-500" : "text-gray-400",
                          isExpanded ? "transform rotate-180" : ""
                        )} />
                      </div>
                    </div>
                    
                    {/* Expandable Content - Only visible when selected */}
                    {isExpanded && (
                      <div className={cn(
                        "p-4",
                        isProgram ? "bg-amber-50/50" : "bg-gray-50"
                      )}>
                        <div className="space-y-6">
                          {/* Basic Info */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-xs text-gray-500">Reward Type</p>
                              <p className="text-sm font-medium">{isProgram ? "Program" : "Individual Reward"}</p>
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

                          {/* Program Rewards Section - Only for programs */}
                          {isProgram && reward.programRewards && reward.programRewards.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium flex items-center gap-2">
                                <Gift className="h-4 w-4 text-amber-500" />
                                Rewards in this Program
                              </h4>
                              
                              <div className="space-y-3">
                                {reward.programRewards.map((programReward, index) => (
                                  <div key={`${reward.id}-reward-${index}`} className="border rounded-lg bg-white overflow-hidden">
                                    {/* Program Reward Header */}
                                    <div className="p-3 border-b bg-white">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Gift className="h-4 w-4 text-blue-600" />
                                          </div>
                                          <div>
                                            <h5 className="font-medium text-sm">{programReward.rewardName}</h5>
                                            <p className="text-xs text-gray-600">{programReward.description}</p>
                                          </div>
                                        </div>
                    <Button 
                      variant="ghost" 
                                          size="sm"
                      className="h-8 w-8 p-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const detailsEl = document.getElementById(`program-reward-details-${reward.id}-${index}`);
                                            detailsEl?.classList.toggle('hidden');
                                          }}
                    >
                                          <ChevronDown className="h-4 w-4" />
                    </Button>
                                      </div>
                                    </div>
                                    
                                    {/* Program Reward Details (collapsible) */}
                                    <div id={`program-reward-details-${reward.id}-${index}`} className="p-3 hidden">
                                      <div className="space-y-4">
                                        {/* Conditions */}
                                        {programReward.conditions && programReward.conditions.length > 0 && (
                                          <div className="space-y-2">
                                            <h6 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                              <Filter className="h-3.5 w-3.5 text-blue-500" />
                                              Conditions
                                            </h6>
                                            <div className="pl-5 space-y-2">
                                              {programReward.conditions.map((condition, condIndex) => (
                                                <div key={`condition-${condIndex}`} className="text-xs text-gray-600 flex items-start gap-2">
                                                  <ArrowRight className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                                  <div>
                                                    {condition.type === "maximumTransactions" && condition.value === 0 && 
                                                      "First-time customers only"}
                                                    {condition.type === "minimumTransactions" && 
                                                      `Requires minimum ${condition.value} transactions`}
                                                    {condition.type === "minimumLifetimeSpend" && 
                                                      `Requires minimum lifetime spend of $${condition.value}`}
                                                    {condition.type === "daysSinceJoined" && 
                                                      `Available after being a member for ${condition.value} days`}
                                                    {condition.type === "minimumSpend" && 
                                                      `Requires minimum purchase of $${condition.amount}`}
                                                  </div>
              </div>
            ))}
          </div>
                                          </div>
                                        )}
                                        
                                        {/* Limitations */}
                                        {programReward.limitations && programReward.limitations.length > 0 && (
                                          <div className="space-y-2">
                                            <h6 className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                              <Clock className="h-3.5 w-3.5 text-red-500" />
                                              Limitations
                                            </h6>
                                            <div className="pl-5 space-y-2">
                                              {programReward.limitations.map((limitation, limIndex) => (
                                                <div key={`limitation-${limIndex}`} className="text-xs text-gray-600 flex items-start gap-2">
                                                  <Info className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                                                  <div>
                                                    {limitation.type === "customerLimit" && 
                                                      `${limitation.value === 0 ? 'Unlimited' : limitation.value} per customer`}
                                                    {limitation.type === "totalRedemptionLimit" && 
                                                      `${limitation.value === 0 ? 'Unlimited' : limitation.value} total redemptions available`}
                                                    {limitation.type === "daysOfWeek" && 
                                                      `Valid only on: ${limitation.value.join(', ')}`}
                                                    {limitation.type === "timeOfDay" && 
                                                      `Valid only between ${limitation.value.startTime} - ${limitation.value.endTime}`}
                                                    {limitation.type === "activePeriod" && 
                                                      `Valid from ${limitation.value.startDate} to ${limitation.value.endDate}`}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
              </div>
            ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Regular Conditions and Limitations Sections for individual rewards */}
                          {!isProgram && (
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
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
                                </div>
                                <div id={`conditions-section-${reward.id}`} className="p-3 border-t">
                                  <p className="text-sm text-gray-700 mb-3">This reward requires the following conditions:</p>
                                  <div className="space-y-3">
                                    {reward.id === "free-coffee-new-customers" && (
                                      <div className="flex items-start gap-2 text-sm">
                                        <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                                        <div>
                                          <span className="font-medium">First Visit:</span>
                                          <p className="text-gray-600">Only available to first-time customers</p>
                                        </div>
                                      </div>
                                    )}
                                    {reward.id === "birthday-reward" && (
                                      <div className="flex items-start gap-2 text-sm">
                                        <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                                        <div>
                                          <span className="font-medium">Birthday:</span>
                                          <p className="text-gray-600">Only available during customer's birthday week</p>
                                        </div>
                                      </div>
                                    )}
                                    {reward.id === "coffee-punch-card" && (
                                      <div className="flex items-start gap-2 text-sm">
                                        <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                                        <div>
                                          <span className="font-medium">Purchase Requirement:</span>
                                          <p className="text-gray-600">Must purchase 9 qualifying coffees to earn the free 10th coffee</p>
                                        </div>
                                      </div>
                                    )}
                                    {reward.id === "happy-hour-special" && (
                                      <div className="flex items-start gap-2 text-sm">
                                        <ArrowRight className="h-5 w-5 text-blue-500 mt-0.5" />
                                        <div>
                                          <span className="font-medium">Minimum Purchase:</span>
                                          <p className="text-gray-600">Minimum purchase of $5 required</p>
                                        </div>
                                      </div>
                                    )}
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
                                  <ChevronDown className="h-4 w-4 text-gray-400" />
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
                                        <span className="font-medium">Total Redemptions:</span>
                                        <p className="text-gray-600">Limited to {reward.total} total redemptions</p>
                                      </div>
                                    </div>
                                    {reward.id === "happy-hour-special" && (
                                      <>
                                        <div className="flex items-start gap-2 text-sm">
                                          <Info className="h-5 w-5 text-red-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium">Time Restriction:</span>
                                            <p className="text-gray-600">Valid only between 2:00 PM - 4:00 PM</p>
                                          </div>
                                        </div>
                                        <div className="flex items-start gap-2 text-sm">
                                          <Info className="h-5 w-5 text-red-500 mt-0.5" />
                                          <div>
                                            <span className="font-medium">Day Restriction:</span>
                                            <p className="text-gray-600">Valid only on weekdays (Monday-Friday)</p>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex justify-end gap-3 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="rounded-lg gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                // Generate the JSON for this reward
                                const jsonData = generateRewardJSON(reward);
                                
                                // Show the JSON in a toast for development purposes
                                toast({
                                  title: isProgram ? "Program JSON" : "Reward JSON",
                                  description: (
                                    <div className="mt-2">
                                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-[300px]">
                                        {JSON.stringify(jsonData, null, 2)}
                                      </pre>
                                    </div>
                                  ),
                                  className: "w-[600px]",
                                  duration: 10000, // 10 seconds
                                });
                              }}
                            >
                              <Code className="h-4 w-4" />
                              Show JSON
                            </Button>
                            
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
                              className={cn(
                                "rounded-lg gap-1",
                                isProgram 
                                  ? "bg-amber-600 hover:bg-amber-700" 
                                  : "bg-[#007AFF] hover:bg-[#0066CC]"
                              )}
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
              })
            ) : (
              <NoResults 
                message={
                  activeTab === "program" 
                    ? "There are no program rewards available at the moment. Check back later or try a different filter."
                    : activeTab === "saved"
                      ? "You haven't saved any rewards yet. Click the bookmark icon on rewards to save them for later."
                      : "No rewards match your search criteria. Try adjusting your filters or search terms."
                }
                icon={
                  activeTab === "program" 
                    ? <Coffee className="h-12 w-12 text-amber-300 mb-4" />
                    : activeTab === "saved"
                      ? <Bookmark className="h-12 w-12 text-purple-300 mb-4" />
                      : <Filter className="h-12 w-12 text-gray-300 mb-4" />
                }
              />
            )}
          </div>
        </div>

        {/* Explore by Category */}
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">Explore by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("discount");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <Percent className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-medium">Discounts</h4>
                <p className="text-xs text-gray-500 mt-1">Percentage & amount off</p>
              </CardContent>
        </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("freebies");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                  <Gift className="h-6 w-6 text-blue-600" />
      </div>
                <h4 className="font-medium">Freebies</h4>
                <p className="text-xs text-gray-500 mt-1">Free products & services</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("points");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                  <Star className="h-6 w-6 text-purple-600" />
    </div>
                <h4 className="font-medium">Points</h4>
                <p className="text-xs text-gray-500 mt-1">Point-based rewards</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("tiered");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-3">
                  <Layers className="h-6 w-6 text-amber-600" />
                </div>
                <h4 className="font-medium">Tiered</h4>
                <p className="text-xs text-gray-500 mt-1">Multi-level programs</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("special");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="font-medium">Special Days</h4>
                <p className="text-xs text-gray-500 mt-1">Birthday & holiday rewards</p>
              </CardContent>
            </Card>
            
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => {
                setRewardCategory("all-categories");
              }}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <LayoutGrid className="h-6 w-6 text-gray-600" />
                </div>
                <h4 className="font-medium">All Categories</h4>
                <p className="text-xs text-gray-500 mt-1">View everything</p>
              </CardContent>
        </Card>
          </div>
        </div>

        {/* Add a section for exploring program types */}
        {activeTab === "program" && (
          <div className="mb-8">
            <h3 className="text-lg font-medium mb-4">Explore Program Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setProgramCategory("coffee-club")}
              >
                <div className="h-32 bg-gradient-to-r from-amber-500 to-amber-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Coffee className="h-16 w-16 text-white opacity-20" />
                  </div>
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h4 className="text-lg font-bold text-white">Coffee Club</h4>
                    <p className="text-amber-100 text-sm">Reward frequent coffee purchases</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">
                    Coffee club programs reward customers for frequent purchases with free drinks, 
                    exclusive offers, and special perks.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-amber-600 w-full"
                  >
                    View Programs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setProgramCategory("tiered-loyalty")}
              >
                <div className="h-32 bg-gradient-to-r from-purple-500 to-purple-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Crown className="h-16 w-16 text-white opacity-20" />
                  </div>
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h4 className="text-lg font-bold text-white">Tiered Loyalty</h4>
                    <p className="text-purple-100 text-sm">Multi-level membership programs</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">
                    Tiered programs offer increasing benefits as customers progress through different 
                    membership levels based on spend or visits.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-purple-600 w-full"
                  >
                    View Programs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setProgramCategory("points-based")}
              >
                <div className="h-32 bg-gradient-to-r from-blue-500 to-blue-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Star className="h-16 w-16 text-white opacity-20" />
                  </div>
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h4 className="text-lg font-bold text-white">Points Based</h4>
                    <p className="text-blue-100 text-sm">Earn and redeem points for rewards</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">
                    Points-based programs allow customers to earn points on purchases and redeem 
                    them for various rewards of different values.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-blue-600 w-full"
                  >
                    View Programs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                onClick={() => setProgramCategory("subscription")}
              >
                <div className="h-32 bg-gradient-to-r from-green-500 to-green-700 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Repeat className="h-16 w-16 text-white opacity-20" />
                  </div>
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <h4 className="text-lg font-bold text-white">Subscription</h4>
                    <p className="text-green-100 text-sm">Recurring membership benefits</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600">
                    Subscription programs offer premium benefits for a recurring fee, 
                    creating predictable revenue and enhanced customer experiences.
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 text-green-600 w-full"
                  >
                    View Programs
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 