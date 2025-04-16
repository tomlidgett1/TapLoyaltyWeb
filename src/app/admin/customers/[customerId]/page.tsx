"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, collection, getDocs, query, where, orderBy, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Edit, Save, X, Store, MoreHorizontal } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDistanceToNow, format } from "date-fns"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function CustomerDetailsPage({ params }: { params: { customerId: string } }) {
  const router = useRouter()
  const [customerData, setCustomerData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [merchantConnections, setMerchantConnections] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<any>(null)
  const [isEditMerchantDialogOpen, setIsEditMerchantDialogOpen] = useState(false)
  const [selectedMerchantConnection, setSelectedMerchantConnection] = useState<any>(null)
  const [editingMerchantCustomer, setEditingMerchantCustomer] = useState<any>(null)

  useEffect(() => {
    fetchCustomerData()
  }, [params.customerId])

  const fetchCustomerData = async () => {
    try {
      setLoading(true)
      
      // Fetch customer profile data
      const customerRef = doc(db, "customers", params.customerId)
      const customerSnap = await getDoc(customerRef)
      
      if (!customerSnap.exists()) {
        console.error("Customer not found")
        setLoading(false)
        return
      }
      
      const customerInfo = {
        id: customerSnap.id,
        ...customerSnap.data()
      }
      
      setCustomerData(customerInfo)
      setEditingCustomer(customerInfo)
      
      // Additional data will be fetched here
      await fetchMerchantConnections(params.customerId)
      
      setLoading(false)
    } catch (error) {
      console.error("Error fetching customer data:", error)
      setLoading(false)
    }
  }
  
  const fetchMerchantConnections = async (customerId: string) => {
    try {
      // Fetch merchant connections
      const merchantsRef = collection(db, "merchants")
      const merchantsSnap = await getDocs(merchantsRef)
      
      const connections: any[] = []
      
      for (const merchantDoc of merchantsSnap.docs) {
        const merchantId = merchantDoc.id
        const merchantData = merchantDoc.data()
        
        // Check if this customer exists in the merchant's customers collection
        const customerMerchantRef = doc(db, `merchants/${merchantId}/customers`, customerId)
        const customerMerchantSnap = await getDoc(customerMerchantRef)
        
        if (customerMerchantSnap.exists()) {
          connections.push({
            merchantId,
            merchantName: merchantData.tradingName || merchantData.merchantName || merchantId,
            logoUrl: merchantData.logoUrl,
            customerData: customerMerchantSnap.data()
          })
          
          // Fetch transactions for this merchant-customer pair
          await fetchTransactions(merchantId, customerId)
          await fetchRedemptions(merchantId, customerId)
        }
      }
      
      setMerchantConnections(connections)
    } catch (error) {
      console.error("Error fetching merchant connections:", error)
    }
  }
  
  const fetchTransactions = async (merchantId: string, customerId: string) => {
    try {
      const transactionsRef = collection(db, "merchants", merchantId, "transactions")
      const transactionsQuery = query(
        transactionsRef,
        where("customerId", "==", customerId),
        orderBy("createdAt", "desc")
      )
      
      const transactionsSnap = await getDocs(transactionsQuery)
      
      const newTransactions = transactionsSnap.docs.map(doc => ({
        id: doc.id,
        merchantId,
        ...doc.data()
      }))
      
      setTransactions(prev => [...prev, ...newTransactions])
    } catch (error) {
      console.error("Error fetching transactions:", error)
    }
  }
  
  const fetchRedemptions = async (merchantId: string, customerId: string) => {
    try {
      const redemptionsRef = collection(db, `customers/${customerId}/redemptions`)
      const redemptionsQuery = query(
        redemptionsRef,
        where("merchantId", "==", merchantId),
        orderBy("redemptionDate", "desc")
      )
      
      const redemptionsSnap = await getDocs(redemptionsQuery)
      
      const newRedemptions = redemptionsSnap.docs.map(doc => ({
        id: doc.id,
        merchantId,
        ...doc.data()
      }))
      
      setRedemptions(prev => [...prev, ...newRedemptions])
    } catch (error) {
      console.error("Error fetching redemptions:", error)
    }
  }
  
  const handleUpdateCustomer = async () => {
    try {
      if (!editingCustomer) return
      
      const customerRef = doc(db, "customers", params.customerId)
      await updateDoc(customerRef, editingCustomer)
      
      setCustomerData(editingCustomer)
      setIsEditDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Customer information updated successfully",
      })
    } catch (error) {
      console.error("Error updating customer:", error)
      toast({
        title: "Error",
        description: "Failed to update customer information",
        variant: "destructive"
      })
    }
  }
  
  const handleFieldChange = (field: string, value: any) => {
    setEditingCustomer((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return format(date, 'MMM d, yyyy h:mm a')
    } catch (error) {
      return 'Invalid date'
    }
  }

  const handleEditMerchantCustomer = (connection: any) => {
    setSelectedMerchantConnection(connection)
    setEditingMerchantCustomer({ ...connection.customerData })
    setIsEditMerchantDialogOpen(true)
  }
  
  const handleMerchantCustomerFieldChange = (field: string, value: any) => {
    setEditingMerchantCustomer((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }
  
  const handleMerchantCustomerCohortChange = (cohort: string, value: boolean) => {
    setEditingMerchantCustomer((prev: any) => {
      const cohorts = { ...(prev.cohorts || {}) }
      if (value) {
        cohorts[cohort] = true
      } else {
        delete cohorts[cohort]
      }
      return { ...prev, cohorts }
    })
  }

  const handleUpdateMerchantCustomer = async () => {
    try {
      if (!editingMerchantCustomer || !selectedMerchantConnection) return
      
      const customerMerchantRef = doc(
        db, 
        `merchants/${selectedMerchantConnection.merchantId}/customers`, 
        params.customerId
      )
      
      await updateDoc(customerMerchantRef, editingMerchantCustomer)
      
      // Update the merchant connection in state
      setMerchantConnections(prev => 
        prev.map(connection => 
          connection.merchantId === selectedMerchantConnection.merchantId 
            ? { ...connection, customerData: editingMerchantCustomer } 
            : connection
        )
      )
      
      setIsEditMerchantDialogOpen(false)
      
      toast({
        title: "Success",
        description: "Customer merchant data updated successfully",
      })
    } catch (error) {
      console.error("Error updating merchant customer data:", error)
      toast({
        title: "Error",
        description: "Failed to update merchant customer data",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Skeleton className="h-10 w-32 mr-4" />
            <Skeleton className="h-8 w-80" />
          </div>
          <Skeleton className="h-[600px] w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (!customerData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-4">Customer Not Found</h1>
          <p className="mb-6">The customer with ID {params.customerId} could not be found.</p>
          <Button onClick={() => router.push("/admin")}>
            Return to Admin
          </Button>
        </div>
      </div>
    )
  }

  // Will implement the UI later
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push("/admin")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          
          <div className="flex items-center">
            <div className="h-16 w-16 rounded-full bg-[#007AFF]/10 flex items-center justify-center overflow-hidden mr-4">
              {customerData.profilePictureUrl ? (
                <img 
                  src={customerData.profilePictureUrl} 
                  alt={customerData.fullName || `${customerData.firstName} ${customerData.lastName}`}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                />
              ) : (
                <User className="h-8 w-8 text-[#007AFF]" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">
                {customerData.fullName || `${customerData.firstName || ''} ${customerData.lastName || ''}`}
              </h1>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500">
                  {customerData.email || 'No email provided'}
                </span>
                <Button 
                  variant="outline"
                  size="sm"
                  className="ml-4"
                  onClick={() => setIsEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Customer
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="merchants">Merchant Connections</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Full Name</div>
                      <div>{customerData.fullName || `${customerData.firstName || ''} ${customerData.lastName || ''}`}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Email</div>
                      <div>{customerData.email || '—'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Phone</div>
                      <div>{customerData.mobileNumber || customerData.phone || '—'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Gender</div>
                      <div>{customerData.gender || '—'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Age Group</div>
                      <div>{customerData.ageGroup || '—'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-500">Occupation</div>
                      <div>{customerData.occupation || '—'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Loyalty Program Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-blue-50 rounded-md">
                      <div className="text-2xl font-bold text-blue-600">{customerData.tapPoints || 0}</div>
                      <div className="text-xs text-gray-500">Points Balance</div>
                    </div>
                    
                    <div className="text-center p-4 bg-green-50 rounded-md">
                      <div className="text-2xl font-bold text-green-600">
                        {merchantConnections.reduce((sum, connection) => 
                          sum + (connection.customerData.totalLifetimeSpend || 0), 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">Lifetime Spend ($)</div>
                    </div>
                    
                    <div className="text-center p-4 bg-purple-50 rounded-md">
                      <div className="text-2xl font-bold text-purple-600">
                        {merchantConnections.reduce((sum, connection) => 
                          sum + (connection.customerData.lifetimeTransactionCount || 0), 0)}
                      </div>
                      <div className="text-xs text-gray-500">Total Transactions</div>
                    </div>
                    
                    <div className="text-center p-4 bg-amber-50 rounded-md">
                      <div className="text-2xl font-bold text-amber-600">{customerData.totalRedemptions || 0}</div>
                      <div className="text-xs text-gray-500">Rewards Redeemed</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2">Customer Created</div>
                    <p>{formatDate(customerData.createdAt)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="merchants" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Connections</CardTitle>
                <CardDescription>Merchants this customer has engaged with</CardDescription>
              </CardHeader>
              <CardContent>
                {merchantConnections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No merchant connections found for this customer
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {merchantConnections.map((connection) => (
                      <Card key={connection.merchantId} className="overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex items-center">
                          <div className="w-10 h-10 rounded overflow-hidden bg-white flex items-center justify-center mr-3">
                            {connection.logoUrl ? (
                              <img 
                                src={connection.logoUrl} 
                                alt={connection.merchantName} 
                                className="w-full h-full object-cover"
                                onError={(e) => (e.target as HTMLImageElement).src = "/hand1.png"}
                              />
                            ) : (
                              <Store className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{connection.merchantName}</h3>
                            <div className="text-xs text-gray-500 truncate">{connection.merchantId}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleEditMerchantCustomer(connection)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Customer
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/admin/${connection.merchantId}`)}>
                                <Store className="h-4 w-4 mr-2" />
                                View Merchant
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                            <div>
                              <div className="text-xs text-gray-500">Points Balance</div>
                              <div>{connection.customerData.pointsBalance || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Lifetime Spend</div>
                              <div>${connection.customerData.totalLifetimeSpend?.toFixed(2) || '0.00'}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Transactions</div>
                              <div>{connection.customerData.lifetimeTransactionCount || 0}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500">Last Visit</div>
                              <div>{formatDate(connection.customerData.lastTransactionDate) || 'Never'}</div>
                            </div>
                          </div>

                          {/* Customer Cohorts */}
                          {connection.customerData.cohorts && Object.keys(connection.customerData.cohorts).length > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">Cohorts</div>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(connection.customerData.cohorts).map(cohort => (
                                  <Badge key={cohort} variant="secondary" className="text-xs">
                                    {cohort}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* First Purchase */}
                          {connection.customerData.firstTransactionDate && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500">First Purchase</div>
                              <div className="text-xs">
                                {formatDate(connection.customerData.firstTransactionDate)}
                                {connection.customerData.daysSinceFirstPurchase && (
                                  <span className="text-gray-500 ml-1">
                                    ({connection.customerData.daysSinceFirstPurchase} days ago)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="transactions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All transactions across all merchants</CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No transactions found for this customer
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => {
                        const merchant = merchantConnections.find(m => m.merchantId === transaction.merchantId);
                        return (
                          <TableRow key={transaction.id}>
                            <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                            <TableCell>{merchant?.merchantName || transaction.merchantId}</TableCell>
                            <TableCell>{transaction.type || 'purchase'}</TableCell>
                            <TableCell>${transaction.amount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>{transaction.pointsEarned || 0}</TableCell>
                            <TableCell>
                              <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                                {transaction.status || 'completed'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="redemptions" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Redemption History</CardTitle>
                <CardDescription>All rewards redeemed by this customer</CardDescription>
              </CardHeader>
              <CardContent>
                {redemptions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No redemptions found for this customer
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Reward</TableHead>
                        <TableHead>Points Used</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {redemptions.map((redemption) => {
                        const merchant = merchantConnections.find(m => m.merchantId === redemption.merchantId);
                        return (
                          <TableRow key={redemption.id}>
                            <TableCell>{formatDate(redemption.redemptionDate)}</TableCell>
                            <TableCell>{merchant?.merchantName || redemption.merchantId}</TableCell>
                            <TableCell>{redemption.rewardName || 'Unknown Reward'}</TableCell>
                            <TableCell>{redemption.pointsUsed || 0}</TableCell>
                            <TableCell>
                              <Badge variant={redemption.status === 'successful' ? 'default' : 'secondary'}>
                                {redemption.status || 'successful'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>Other customer details and settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Account Details</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Customer ID</div>
                        <div className="font-mono text-sm">{customerData.id}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">Sign-in Method</div>
                        <div>{customerData.signInMethod || 'Unknown'}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">FCM Token</div>
                        <div className="truncate max-w-xs font-mono text-xs">
                          {customerData.fcmToken ? customerData.fcmToken.substring(0, 20) + '...' : 'None'}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">Created At</div>
                        <div>{formatDate(customerData.createdAt)}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">Updated At</div>
                        <div>{formatDate(customerData.updatedAt)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-4">Preferences & Interests</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Interests</div>
                        {customerData.interests && customerData.interests.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {customerData.interests.map((interest: string) => (
                              <Badge key={interest} variant="outline">{interest}</Badge>
                            ))}
                          </div>
                        ) : (
                          <div>No interests specified</div>
                        )}
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">Business Preferences</div>
                        {customerData.businessPreferences && customerData.businessPreferences.length > 0 ? (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {customerData.businessPreferences.map((preference: string) => (
                              <Badge key={preference} variant="outline">{preference}</Badge>
                            ))}
                          </div>
                        ) : (
                          <div>No business preferences specified</div>
                        )}
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-500">Last Known Location</div>
                        {customerData.lastKnownLocation ? (
                          <div>
                            {customerData.lastKnownLocation.suburb || 'Unknown location'}
                            {customerData.lastKnownLocation.updatedAt && 
                              ` (${formatDate(customerData.lastKnownLocation.updatedAt)})`}
                          </div>
                        ) : (
                          <div>No location data</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>
              Make changes to the customer information here.
            </DialogDescription>
          </DialogHeader>
          
          {editingCustomer && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={editingCustomer.fullName || ''}
                  onChange={(e) => handleFieldChange("fullName", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => handleFieldChange("email", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="mobileNumber">Phone Number</Label>
                <Input
                  id="mobileNumber"
                  value={editingCustomer.mobileNumber || editingCustomer.phone || ''}
                  onChange={(e) => handleFieldChange("mobileNumber", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Input
                  id="gender"
                  value={editingCustomer.gender || ''}
                  onChange={(e) => handleFieldChange("gender", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="ageGroup">Age Group</Label>
                <Input
                  id="ageGroup"
                  value={editingCustomer.ageGroup || ''}
                  onChange={(e) => handleFieldChange("ageGroup", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={editingCustomer.occupation || ''}
                  onChange={(e) => handleFieldChange("occupation", e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="tapPoints">Points Balance</Label>
                <Input
                  id="tapPoints"
                  type="number"
                  value={editingCustomer.tapPoints || 0}
                  onChange={(e) => handleFieldChange("tapPoints", parseInt(e.target.value) || 0)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
                <Input
                  id="profilePictureUrl"
                  value={editingCustomer.profilePictureUrl || ''}
                  onChange={(e) => handleFieldChange("profilePictureUrl", e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Merchant Customer Dialog */}
      <Dialog open={isEditMerchantDialogOpen} onOpenChange={setIsEditMerchantDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Customer Data for {selectedMerchantConnection?.merchantName || 'Merchant'}
            </DialogTitle>
            <DialogDescription>
              Make changes to the customer's merchant-specific information.
            </DialogDescription>
          </DialogHeader>
          
          {editingMerchantCustomer && selectedMerchantConnection && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Customer Cohorts</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {['newCustomer', 'highValue', 'active', 'atRisk', 'dormant', 'loyal'].map(cohort => (
                    <div key={cohort} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`cohort-${cohort}`}
                        checked={editingMerchantCustomer.cohorts && editingMerchantCustomer.cohorts[cohort] || false}
                        onChange={(e) => handleMerchantCustomerCohortChange(cohort, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor={`cohort-${cohort}`} className="text-sm">{cohort}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pointsBalance">Points Balance</Label>
                  <Input
                    id="pointsBalance"
                    type="number"
                    value={editingMerchantCustomer.pointsBalance || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("pointsBalance", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="membershipTier">Membership Tier</Label>
                  <Input
                    id="membershipTier"
                    value={editingMerchantCustomer.membershipTier || ''}
                    onChange={(e) => handleMerchantCustomerFieldChange("membershipTier", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="totalLifetimeSpend">Lifetime Spend</Label>
                  <Input
                    id="totalLifetimeSpend"
                    type="number"
                    step="0.01"
                    value={editingMerchantCustomer.totalLifetimeSpend || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("totalLifetimeSpend", parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="lifetimeTransactionCount">Transaction Count</Label>
                  <Input
                    id="lifetimeTransactionCount"
                    type="number"
                    value={editingMerchantCustomer.lifetimeTransactionCount || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("lifetimeTransactionCount", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="daysSinceFirstPurchase">Days Since First Purchase</Label>
                  <Input
                    id="daysSinceFirstPurchase"
                    type="number"
                    value={editingMerchantCustomer.daysSinceFirstPurchase || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("daysSinceFirstPurchase", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="daysSinceLastVisit">Days Since Last Visit</Label>
                  <Input
                    id="daysSinceLastVisit"
                    type="number"
                    value={editingMerchantCustomer.daysSinceLastVisit || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("daysSinceLastVisit", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="highestTransactionAmount">Highest Transaction Amount</Label>
                  <Input
                    id="highestTransactionAmount"
                    type="number"
                    step="0.01"
                    value={editingMerchantCustomer.highestTransactionAmount || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("highestTransactionAmount", parseFloat(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="redemptionCount">Redemption Count</Label>
                  <Input
                    id="redemptionCount"
                    type="number"
                    value={editingMerchantCustomer.redemptionCount || 0}
                    onChange={(e) => handleMerchantCustomerFieldChange("redemptionCount", parseInt(e.target.value) || 0)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              {/* Transaction IDs (read-only) */}
              <div>
                <h3 className="text-sm font-medium mb-2">Transaction IDs (Read Only)</h3>
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label htmlFor="firstTransactionId" className="text-xs text-gray-500">First Transaction ID</Label>
                    <Input
                      id="firstTransactionId"
                      value={editingMerchantCustomer.firstTransactionId || ''}
                      readOnly
                      className="mt-1 bg-gray-50 text-gray-500 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastTransactionId" className="text-xs text-gray-500">Last Transaction ID</Label>
                    <Input
                      id="lastTransactionId"
                      value={editingMerchantCustomer.lastTransactionId || ''}
                      readOnly
                      className="mt-1 bg-gray-50 text-gray-500 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
              
              {/* Additional custom fields */}
              <div>
                <h3 className="text-sm font-medium mb-2">Additional Fields</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(editingMerchantCustomer)
                    .filter(([key]) => 
                      !['pointsBalance', 'membershipTier', 'totalLifetimeSpend', 'lifetimeTransactionCount', 
                        'daysSinceFirstPurchase', 'daysSinceLastVisit', 'highestTransactionAmount', 'redemptionCount',
                        'firstTransactionId', 'lastTransactionId', 'firstTransactionDate', 'lastTransactionDate',
                        'merchantId', 'customerId', 'id', 'cohorts'].includes(key) && 
                      typeof editingMerchantCustomer[key] !== 'object')
                    .map(([key, value]) => (
                      <div key={key}>
                        <Label htmlFor={`custom-${key}`} className="text-xs text-gray-500 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <Input
                          id={`custom-${key}`}
                          value={value !== null && value !== undefined ? String(value) : ''}
                          onChange={(e) => handleMerchantCustomerFieldChange(key, e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditMerchantDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateMerchantCustomer}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 