"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { doc, getDoc, collection, getDocs, query, orderBy, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/contexts/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  User, 
  Gift, 
  Receipt, 
  Clock, 
  CreditCard, 
  ArrowLeft, 
  Calendar, 
  ShoppingCart, 
  DollarSign, 
  Award,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow, format } from "date-fns"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"

interface Transaction {
  actualcreatedAt: any
  amount: number
  appliedRule: string
  createdAt: any
  customerId: string
  day: string
  firstPurchase: boolean
  merchantId: string
  merchantName: string
  pointsBalance: number
  pointsEarned: number
  pointsmultiplier: number
  status: 'completed' | 'pending' | 'cancelled'
  type: 'purchase' | 'refund' | 'adjustment'
}

interface Redemption {
  customerId: string
  merchantId: string
  pointsUsed: number
  redemptionDate: any
  redemptionId: string
  rewardId: string
  rewardName: string
  status: 'successful' | 'pending' | 'failed'
}

const formatFirestoreDate = (timestamp: any) => {
  if (!timestamp) return 'N/A'
  
  try {
    // Handle Firestore Timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

const formatDateTime = (timestamp: any) => {
  if (!timestamp) return 'N/A'
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return format(date, 'MMM d, yyyy h:mm a')
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

export default function CustomerDetailPage() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')
  const { user } = useAuth()
  const [customer, setCustomer] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchCustomerData() {
      if (!user?.uid || !customerId) return

      try {
        // Fetch customer data
        const customerRef = doc(db, `merchants/${user.uid}/customers/${customerId}`)
        const customerSnap = await getDoc(customerRef)
        
        if (customerSnap.exists()) {
          // Fetch profile data
          const profileRef = doc(db, 'customers', customerId as string)
          const profileSnap = await getDoc(profileRef)
          
          setCustomer({
            ...customerSnap.data(),
            customerId: customerSnap.id,
            profileData: profileSnap.exists() ? profileSnap.data() : undefined
          })

          // Fetch transactions from customer's collection and filter by merchantId
          const transactionsRef = collection(db, `customers/${customerId}/transactions`)
          const transactionsQuery = query(
            transactionsRef, 
            where('merchantId', '==', user.uid),
            orderBy('actualcreatedAt', 'desc')
          )
          const transactionsSnap = await getDocs(transactionsQuery)
          
          setTransactions(transactionsSnap.docs.map(doc => ({
            transactionId: doc.id,
            ...doc.data()
          })) as Transaction[])

          // Fetch redemptions from customer's collection and filter by merchantId
          const redemptionsRef = collection(db, `customers/${customerId}/redemptions`)
          const redemptionsQuery = query(
            redemptionsRef,
            where('merchantId', '==', user.uid),
            orderBy('redemptionDate', 'desc')
          )
          const redemptionsSnap = await getDocs(redemptionsQuery)
          
          setRedemptions(redemptionsSnap.docs.map(doc => ({
            redemptionId: doc.id,
            ...doc.data()
          })) as Redemption[])
        }
      } catch (error) {
        console.error('Error fetching customer data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCustomerData()
  }, [user?.uid, customerId])

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading customer details...</p>
        </div>
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-8">
        <Card className="rounded-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="text-lg font-medium">Customer not found</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The customer you're looking for doesn't exist or you don't have permission to view it.
              </p>
              <Button asChild className="mt-4 rounded-md">
                <Link href="/customers">Back to Customers</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-md">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Details</h1>
          <div className="ml-auto">
            <Button 
              className="rounded-md flex items-center gap-2 bg-[#007AFF] hover:bg-[#0062CC]"
              onClick={() => router.push(`/rewards/create?customerId=${customerId}&customerName=${encodeURIComponent(customer.fullName)}`)}
            >
              <Gift className="h-4 w-4" />
              Create Reward for {customer.fullName.split(' ')[0]}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 rounded-lg">
            <CardHeader className="pb-2">
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 rounded-full bg-[#007AFF]/10 flex items-center justify-center overflow-hidden mb-4">
                  {customer.profileData?.shareProfileWithMerchants && customer.profileData?.profilePictureUrl ? (
                    <img 
                      src={customer.profileData.profilePictureUrl} 
                      alt={customer.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-[#007AFF]" />
                  )}
                </div>
                
                <h2 className="text-xl font-semibold">{customer.fullName}</h2>
                
                {customer.membershipTier && (
                  <Badge className="mt-1 rounded-md bg-[#007AFF]/10 text-[#007AFF] border-0">
                    {customer.membershipTier}
                  </Badge>
                )}
              </div>
              
              <div className="mt-6 pt-6 border-t space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">First Purchase</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(customer.firstTransactionDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Last Visit</p>
                    <p className="text-sm text-muted-foreground">{formatDateTime(customer.lastTransactionDate)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Customer Age</p>
                    <p className="text-sm text-muted-foreground">{customer.daysSinceFirstPurchase} days</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="rounded-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                      <Award className="h-6 w-6 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold">{customer.pointsBalance.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Points Balance</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="rounded-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold">${customer.totalLifetimeSpend}</p>
                    <p className="text-sm text-muted-foreground">Lifetime Spend</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="rounded-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">
                      <ShoppingCart className="h-6 w-6 text-purple-600" />
                    </div>
                    <p className="text-2xl font-bold">{customer.lifetimeTransactionCount}</p>
                    <p className="text-sm text-muted-foreground">Total Visits</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="rounded-lg">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">
                      <Gift className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="text-2xl font-bold">{customer.redemptionCount || 0}</p>
                    <p className="text-sm text-muted-foreground">Rewards Redeemed</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="rounded-lg">
              <CardHeader className="pb-2">
                <CardTitle>Customer Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Days Since Last Visit</p>
                    <p className="text-lg font-medium">{customer.daysSinceLastVisit}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {customer.daysSinceLastVisit <= 30 
                        ? "Active customer" 
                        : customer.daysSinceLastVisit <= 90 
                          ? "Engaged customer" 
                          : "At risk of churning"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Highest Transaction</p>
                    <p className="text-lg font-medium">${customer.highestTransactionAmount}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(customer.lastTransactionDate)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Average Order Value</p>
                    <p className="text-lg font-medium">
                      ${(customer.totalLifetimeSpend / Math.max(1, customer.lifetimeTransactionCount)).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Based on {customer.lifetimeTransactionCount} transactions
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-lg">
          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-12 p-0 px-6">
              <TabsTrigger 
                value="transactions" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#007AFF] rounded-none h-12 flex items-center gap-2"
              >
                <ShoppingCart className="h-4 w-4" />
                Transactions
              </TabsTrigger>
              <TabsTrigger 
                value="redemptions"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-[#007AFF] rounded-none h-12 flex items-center gap-2"
              >
                <Gift className="h-4 w-4" />
                Redemptions
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Points Earned</TableHead>
                    <TableHead>Points Balance</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((transaction) => (
                      <TableRow key={transaction.transactionId}>
                        <TableCell>
                          {formatDateTime(transaction.actualcreatedAt)}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                            transaction.type === 'purchase' && "bg-green-100 text-green-700",
                            transaction.type === 'refund' && "bg-red-100 text-red-700",
                            transaction.type === 'adjustment' && "bg-yellow-100 text-yellow-700"
                          )}>
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>${transaction.amount}</TableCell>
                        <TableCell>
                          <span className="text-green-600">+{transaction.pointsEarned}</span>
                        </TableCell>
                        <TableCell>{transaction.pointsBalance}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {transaction.appliedRule}
                            {transaction.pointsmultiplier > 1 && ` (${transaction.pointsmultiplier}x)`}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                            transaction.status === 'completed' && "bg-green-100 text-green-700",
                            transaction.status === 'pending' && "bg-yellow-100 text-yellow-700",
                            transaction.status === 'cancelled' && "bg-red-100 text-red-700"
                          )}>
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="redemptions" className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Points Used</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reward ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No redemptions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    redemptions.map((redemption) => (
                      <TableRow key={redemption.redemptionId}>
                        <TableCell>
                          {formatDateTime(redemption.redemptionDate)}
                        </TableCell>
                        <TableCell>{redemption.rewardName}</TableCell>
                        <TableCell>
                          <span className="text-red-600">-{redemption.pointsUsed}</span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                            redemption.status === 'successful' && "bg-green-100 text-green-700",
                            redemption.status === 'pending' && "bg-yellow-100 text-yellow-700",
                            redemption.status === 'failed' && "bg-red-100 text-red-700"
                          )}>
                            {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">
                            {redemption.rewardId}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
} 