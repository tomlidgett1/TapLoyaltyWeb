"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, Zap, Users, Tag } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface PointsRuleDetails {
  id: string
  name: string
  description: string
  type: string
  points: number
  usageCount: number
  status: string
  createdAt: any
  updatedAt: any
  conditions?: {
    minPurchase?: number
    maxPoints?: number
    frequency?: string
  }
}

export default function PointsRuleDetailsPage() {
  const router = useRouter()
  const { id } = useParams()
  const { user } = useAuth()
  const [rule, setRule] = useState<PointsRuleDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRuleDetails = async () => {
      if (!user?.uid || !id) return
      
      try {
        setLoading(true)
        const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id as string)
        const ruleDoc = await getDoc(ruleRef)
        
        if (ruleDoc.exists()) {
          const data = ruleDoc.data()
          
          // Handle different date formats safely
          const getDateSafely = (dateField: any): Date => {
            if (!dateField) return new Date();
            
            // If it's a Firestore timestamp with toDate method
            if (dateField && typeof dateField.toDate === 'function') {
              return dateField.toDate();
            }
            
            // If it's a string or number timestamp
            if (typeof dateField === 'string' || typeof dateField === 'number') {
              const date = new Date(dateField);
              return isNaN(date.getTime()) ? new Date() : date;
            }
            
            // If it's a seconds-based Firestore timestamp
            if (dateField.seconds) {
              return new Date(dateField.seconds * 1000);
            }
            
            return new Date();
          };
          
          setRule({
            id: ruleDoc.id,
            name: data.name || 'Unnamed Rule',
            description: data.description || '',
            type: data.type || 'purchase',
            points: data.points || 0,
            usageCount: data.usageCount || 0,
            status: data.status || 'active',
            createdAt: getDateSafely(data.createdAt),
            updatedAt: getDateSafely(data.updatedAt),
            conditions: data.conditions || {}
          })
        } else {
          console.error("Rule not found")
        }
      } catch (error) {
        console.error("Error fetching rule details:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchRuleDetails()
  }, [user?.uid, id])

  if (loading) {
    return <div className="p-8 text-center">Loading rule details...</div>
  }
  
  if (!rule) {
    return <div className="p-8 text-center">Rule not found</div>
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          className="pl-0 mb-4"
          onClick={() => router.push('/store/points-rules')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Points Rules
        </Button>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{rule.name}</h1>
            <p className="text-muted-foreground mt-1">{rule.description}</p>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "rounded-md px-3 py-1",
              rule.status === "active" && "bg-green-50 text-green-700 border-green-200",
              rule.status === "inactive" && "bg-gray-50 text-gray-700 border-gray-200",
              rule.status === "draft" && "bg-amber-50 text-amber-700 border-amber-200"
            )}
          >
            {rule.status}
          </Badge>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rule Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Points Awarded</p>
                <div className="flex items-center mt-1">
                  <Zap className="h-4 w-4 text-blue-600 mr-1" />
                  <span className="font-medium">{rule.points}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Usage Count</p>
                <p className="font-medium mt-1">{rule.usageCount}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground">Rule Type</p>
              <div className="flex items-center mt-1">
                <Tag className="h-4 w-4 mr-1" />
                <span className="capitalize">{rule.type}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDate(rule.createdAt)}</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <div className="flex items-center mt-1">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{formatDate(rule.updatedAt)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Conditions</CardTitle>
            <CardDescription>Requirements for this points rule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rule.conditions && Object.keys(rule.conditions).length > 0 ? (
              <>
                {rule.conditions.minPurchase && (
                  <div>
                    <p className="text-sm text-muted-foreground">Minimum Purchase</p>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">${rule.conditions.minPurchase}</span>
                    </div>
                  </div>
                )}
                
                {rule.conditions.maxPoints && (
                  <div>
                    <p className="text-sm text-muted-foreground">Maximum Points</p>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">{rule.conditions.maxPoints} points</span>
                    </div>
                  </div>
                )}
                
                {rule.conditions.frequency && (
                  <div>
                    <p className="text-sm text-muted-foreground">Frequency</p>
                    <div className="flex items-center mt-1">
                      <span className="font-medium">{rule.conditions.frequency}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No conditions set for this rule</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6 flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push(`/store/rules/${id}/edit`)}
        >
          Edit Rule
        </Button>
        <Button
          variant="default"
          onClick={() => router.push('/store/points-rules')}
        >
          Back to Rules
        </Button>
      </div>
    </div>
  )
} 