"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Search, Filter, Plus, MoreVertical, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { Timestamp } from "firebase/firestore"
import { collection, query, orderBy, getDocs } from "firebase/firestore"
import { useToast } from "@/components/ui/use-toast"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { safelyGetDate } from "@/lib/utils"

// Mock data - replace with real data later
const rewards = [
  {
    id: "1",
    name: "Free Coffee",
    description: "Get a free coffee with any purchase",
    type: "Individual",
    status: "active",
    points: 100,
    claimed: 45,
    total: 100,
    createdAt: "2024-02-15"
  },
  // Add more mock rewards...
]

export default function RewardsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [rewards, setRewards] = useState([])
  const { toast } = useToast()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.uid) {
      fetchRewards()
    }
  }, [user])

  const fetchRewards = async () => {
    if (!user?.uid) return
    
    try {
      setLoading(true)
      const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const q = query(rewardsRef, orderBy('createdAt', 'desc'))
      const querySnapshot = await getDocs(q)
      
      const rewardsData: any[] = []
      
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
          })
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

  return (
    <div className="p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reward Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track all your rewards in one place
            </p>
          </div>

          <Button className="bg-[#007AFF] hover:bg-[#0066CC] h-9">
            <Plus className="h-4 w-4 mr-2" />
            Create Reward
          </Button>
        </div>

        <Card>
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search rewards..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" className="h-9">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          <div className="divide-y">
            {rewards.map((reward) => (
              <div 
                key={reward.id}
                className="p-4 flex items-center gap-4 hover:bg-gray-50/50"
              >
                <div className="h-10 w-10 rounded-lg bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 text-[#007AFF]" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{reward.name}</h3>
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                      reward.status === "active" 
                        ? "text-green-600 bg-green-50"
                        : "text-gray-600 bg-gray-100"
                    )}>
                      {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {reward.description}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {reward.points} points
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {reward.claimed}/{reward.total} claimed
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="h-8 w-8 p-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      Edit Reward
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      Delete Reward
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
} 