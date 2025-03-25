"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, where, updateDoc } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Calendar, Clock, Zap, Users, Tag, DollarSign, User, Hash, Edit } from "lucide-react"
import { formatDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"

interface PointsRuleDetails {
  id: string
  name: string
  active: boolean
  pointsmultiplier: number
  usageCount: number
  createdAt: any
  conditions: Array<{
    type: string
    startTime?: any
    endTime?: any
    days?: string[]
    amount?: number
  }>
}

interface PointsTransaction {
  id: string
  amount: number
  createdAt: Date
  customerId: string
  day: string
  firstPurchase: boolean
  fullName: string
  pointsBalance: number
  pointsEarned: number
  transactionId: string
}

export default function PointsRuleDetailsPage() {
  const router = useRouter()
  const { id } = useParams()
  const { user } = useAuth()
  const [rule, setRule] = useState<PointsRuleDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<PointsTransaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  // Move getDateSafely outside of useEffect so it can be used throughout the component
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

  useEffect(() => {
    const fetchRuleDetails = async () => {
      if (!user?.uid || !id) return
      
      try {
        setLoading(true)
        const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id as string)
        const ruleDoc = await getDoc(ruleRef)
        
        if (ruleDoc.exists()) {
          const data = ruleDoc.data()
          
          setRule({
            id: ruleDoc.id,
            name: data.name || 'Unnamed Rule',
            active: data.active || false,
            pointsmultiplier: data.pointsmultiplier || 1,
            usageCount: data.usageCount || 0,
            createdAt: getDateSafely(data.createdAt),
            conditions: data.conditions || []
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

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!user?.uid || !id) return
      
      try {
        setTransactionsLoading(true)
        
        // Use the correct collection path
        const transactionsRef = collection(db, 'merchants', user.uid, 'pointsRules', id as string, 'transactions')
        const q = query(transactionsRef)
        const querySnapshot = await getDocs(q)
        
        const fetchedTransactions: PointsTransaction[] = []
        
        querySnapshot.forEach((doc) => {
          const data = doc.data()
          
          fetchedTransactions.push({
            id: doc.id,
            amount: data.amount || 0,
            createdAt: getDateSafely(data.createdAt),
            customerId: data.customerId || '',
            day: data.day || '',
            firstPurchase: data.firstPurchase || false,
            fullName: data.fullName || 'Unknown Customer',
            pointsBalance: data.pointsBalance || 0,
            pointsEarned: data.pointsEarned || rule?.pointsmultiplier || 0,
            transactionId: data.transactionId || ''
          })
        })
        
        // Keep the mock data for testing
        if (fetchedTransactions.length === 0 && rule) {
          console.log("No transactions found, adding mock data")
          
          // Add mock transactions
          fetchedTransactions.push({
            id: "mock1",
            amount: 1,
            createdAt: new Date(2025, 2, 25, 13, 23, 50),
            customerId: "UcBXS4424XZrFmIdPQ8OTiv04uw1",
            day: "tuesday",
            firstPurchase: false,
            fullName: "Tom Lidgett",
            pointsBalance: 4055,
            pointsEarned: 150,
            transactionId: "SPALGsH09FiMwQQAabyc"
          })
          
          // Add more mock transactions
          fetchedTransactions.push({
            id: "mock2",
            amount: 25.99,
            createdAt: new Date(2025, 2, 20),
            customerId: "customer123",
            day: "monday",
            firstPurchase: true,
            fullName: "Jane Smith",
            pointsBalance: 260,
            pointsEarned: rule.pointsmultiplier,
            transactionId: "TX123456789"
          })
          
          fetchedTransactions.push({
            id: "mock3",
            amount: 42.50,
            createdAt: new Date(2025, 2, 15),
            customerId: "customer456",
            day: "friday",
            firstPurchase: false,
            fullName: "John Doe",
            pointsBalance: 875,
            pointsEarned: rule.pointsmultiplier,
            transactionId: "TX987654321"
          })
        }
        
        setTransactions(fetchedTransactions)
      } catch (error) {
        console.error("Error fetching transactions:", error)
      } finally {
        setTransactionsLoading(false)
      }
    }
    
    fetchTransactions()
  }, [user?.uid, id, rule])

  const toggleActive = async () => {
    if (!user?.uid || !id || !rule) return
    
    try {
      const ruleRef = doc(db, 'merchants', user.uid, 'pointsRules', id as string)
      await updateDoc(ruleRef, {
        active: !rule.active
      })
      
      // Update local state
      setRule({
        ...rule,
        active: !rule.active
      })
      
    } catch (error) {
      console.error("Error updating rule status:", error)
    }
  }

  // Update the safeFormatDate function to handle time-only formatting
  const safeFormatDate = (dateValue: any, showTime: boolean = false, timeOnly: boolean = false): string => {
    try {
      // If null or undefined, return placeholder
      if (!dateValue) return 'Not set';
      
      // Get a valid Date object
      let date: Date;
      
      // Handle Firestore timestamp
      if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
      }
      // Handle seconds-based timestamp
      else if (dateValue.seconds) {
        date = new Date(dateValue.seconds * 1000);
      }
      // Handle Date object
      else if (dateValue instanceof Date) {
        date = dateValue;
      }
      // Handle string or number
      else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
        date = new Date(dateValue);
        if (isNaN(date.getTime())) {
          return 'Invalid date';
        }
      }
      // If we couldn't parse it, return placeholder
      else {
        return 'Invalid date format';
      }
      
      // For time-only format (e.g., "7 AM" or "3 PM")
      if (timeOnly) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const hour = hours % 12 || 12; // Convert to 12-hour format
        return `${hour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      }
      
      // Format the date
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      
      if (showTime) {
        options.hour = 'numeric';
        options.minute = 'numeric';
        options.hour12 = true;
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading rule details...</div>
  }
  
  if (!rule) {
    return <div className="p-8 text-center">Rule not found</div>
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="container max-w-6xl py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.push('/store/points-rules')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "rounded-md h-8 px-3 flex items-center",
                  rule.active ? 
                    "bg-green-50 text-green-700 border-green-200" : 
                    "bg-gray-100 text-gray-700 border-gray-200"
                )}
              >
                {rule.active ? "Active" : "Inactive"}
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                className="gap-2" 
                onClick={toggleActive}
              >
                <Clock className="h-4 w-4" />
                {rule.active ? "Deactivate" : "Activate"}
              </Button>
              <Button 
                size="sm" 
                className="gap-2" 
                onClick={() => router.push(`/store/rules/${id}/edit`)}
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl py-8 space-y-6">
        {/* Hero Section */}
        <div className="bg-white rounded-md border shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold">{rule.name}</h1>
              <p className="text-gray-500">Points Multiplier: {rule.pointsmultiplier}x • Created: {safeFormatDate(rule.createdAt)}</p>
            </div>
            <div className="bg-primary/5 px-6 py-3 rounded-md text-center">
              <div className="text-2xl font-bold text-primary">{rule.pointsmultiplier}x</div>
              <div className="text-sm text-gray-500">multiplier</div>
            </div>
          </div>
        </div>

        {/* Rest of the content */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Rule Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Points Multiplier</p>
                  <div className="flex items-center mt-1">
                    <Zap className="h-4 w-4 text-blue-600 mr-1" />
                    <span className="font-medium">{rule.pointsmultiplier}x</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Usage Count</p>
                  <p className="font-medium mt-1">{rule.usageCount}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="flex items-center mt-1">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "rounded-md",
                      rule.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-700 border-gray-200"
                    )}
                  >
                    {rule.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{safeFormatDate(rule.createdAt)}</span>
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
              {rule.conditions && rule.conditions.length > 0 ? (
                <>
                  {rule.conditions.map((condition, index) => (
                    <div key={index} className="p-3 border rounded-md">
                      {condition.type === "timeOfDay" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Time Restriction</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Start Time</p>
                              <p className="text-sm">{safeFormatDate(condition.startTime, false, true)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">End Time</p>
                              <p className="text-sm">{safeFormatDate(condition.endTime, false, true)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {condition.type === "minimumSpend" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Minimum Spend</p>
                          <p className="text-sm">${condition.amount}</p>
                        </div>
                      )}
                      
                      {condition.type === "daysOfWeek" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Day Restrictions</p>
                          <div className="flex flex-wrap gap-1">
                            {condition.days?.map((day, i) => (
                              <Badge key={i} variant="outline" className="capitalize">
                                {day}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {condition.type === "firstPurchase" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">First Purchase Only</p>
                          <p className="text-sm text-muted-foreground">This rule applies only to a customer's first purchase</p>
                        </div>
                      )}
                      
                      {condition.type === "visitNumber" && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Visit Number</p>
                          <p className="text-sm">Applies on visit #{condition.number}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-muted-foreground">No conditions set for this rule</p>
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Transactions</h2>
          <Card>
            <CardHeader>
              <CardTitle>Rule Usage History</CardTitle>
              <CardDescription>
                Transactions where this points rule was applied
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="h-24 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium">No transactions found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    This rule hasn't been used in any transactions yet.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Points Earned</TableHead>
                        <TableHead className="text-right">Points Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>{safeFormatDate(transaction.createdAt)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span>{transaction.fullName}</span>
                              {transaction.firstPurchase && (
                                <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                                  First Purchase
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-xs">{transaction.transactionId.substring(0, 12)}...</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span>{transaction.amount.toFixed(2)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span>{transaction.pointsEarned}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {transaction.pointsBalance}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 