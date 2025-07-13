"use client"

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, 
  Store, 
  Users, 
  Eye, 
  MousePointer, 
  Calendar,
  Clock,
  Target,
  TrendingUp,
  User
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore"
import { format } from "date-fns"

interface Message {
  id: string;
  title: string;
  message: string;
  status: string;
  createdAt: any;
  selectedCohorts: string[];
  notificationAction: string;
  merchantId: string;
  clicks?: number;
  reads?: number;
  uniqueClicks?: number;
  uniqueReads?: number;
  clickedCustomers?: string[];
  readCustomers?: string[];
  lastClickAt?: any;
  lastReadAt?: any;
  totalRecipients?: number;
  cohortBreakdown?: Record<string, number>;
}

interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  profilePictureUrl?: string;
  shareProfileWithMerchants?: boolean;
}

interface MessageDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: Message | null;
}

export function MessageDetailsDialog({ open, onOpenChange, message }: MessageDetailsDialogProps) {
  const { user } = useAuth()
  const [clickedCustomers, setClickedCustomers] = useState<Customer[]>([])
  const [readCustomers, setReadCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch customer details when dialog opens
  useEffect(() => {
    if (open && message && user?.uid) {
      fetchCustomerDetails()
    }
  }, [open, message, user?.uid])

  const fetchCustomerDetails = async () => {
    if (!message || !user?.uid) return
    
    setLoading(true)
    try {
      const clickedIds = message.clickedCustomers || []
      const readIds = message.readCustomers || []
      
      // Fetch clicked customers
      const clickedCustomersData: Customer[] = []
      for (const customerId of clickedIds) {
        const customerDoc = await getDoc(doc(db, 'customers', customerId))
        if (customerDoc.exists()) {
          const data = customerDoc.data()
          clickedCustomersData.push({
            id: customerId,
            firstName: data.firstName,
            lastName: data.lastName,
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email,
            profilePictureUrl: data.shareProfileWithMerchants ? data.profilePictureUrl : undefined,
            shareProfileWithMerchants: data.shareProfileWithMerchants
          })
        }
      }
      
      // Fetch read customers
      const readCustomersData: Customer[] = []
      for (const customerId of readIds) {
        const customerDoc = await getDoc(doc(db, 'customers', customerId))
        if (customerDoc.exists()) {
          const data = customerDoc.data()
          readCustomersData.push({
            id: customerId,
            firstName: data.firstName,
            lastName: data.lastName,
            fullName: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email,
            profilePictureUrl: data.shareProfileWithMerchants ? data.profilePictureUrl : undefined,
            shareProfileWithMerchants: data.shareProfileWithMerchants
          })
        }
      }
      
      setClickedCustomers(clickedCustomersData)
      setReadCustomers(readCustomersData)
    } catch (error) {
      console.error("Error fetching customer details:", error)
    } finally {
      setLoading(false)
    }
  }

  const getCohortDisplayName = (cohort: string) => {
    switch(cohort) {
      case 'active': return "Active customers";
      case 'new': return "New customers";
      case 'resurrected': return "Resurrected customers";
      case 'churned': return "Churned customers";
      case 'dormant': return "Dormant customers";
      default: return cohort;
    }
  }

  const getCustomerInitials = (customer: Customer) => {
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase()
    }
    if (customer.fullName) {
      const names = customer.fullName.split(' ')
      return names.length > 1 
        ? `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
        : names[0].charAt(0).toUpperCase()
    }
    return 'U'
  }

  if (!message) return null

  const openRate = message.totalRecipients ? (message.uniqueReads || 0) / message.totalRecipients * 100 : 0
  const clickRate = message.totalRecipients ? (message.uniqueClicks || 0) / message.totalRecipients * 100 : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 ease-out">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Message Details
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[80vh] pr-4">
          <div className="space-y-6">
            {/* Message Overview */}
            <Card className="rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{message.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-700">{message.message}</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{message.totalRecipients || 0}</div>
                    <div className="text-xs text-gray-500">Total Recipients</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{openRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Open Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{clickRate.toFixed(1)}%</div>
                    <div className="text-xs text-gray-500">Click Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {message.createdAt ? format(message.createdAt.toDate(), 'MMM d') : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Sent Date</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Action:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200">
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                        message.notificationAction === 'showAnnouncement' ? 'bg-blue-500' : 'bg-green-500'
                      }`}></div>
                      {message.notificationAction === 'showAnnouncement' ? 'Show Announcement' : 'Go to Store'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200">
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                        message.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                      }`}></div>
                      {message.status === 'active' ? 'Sent' : 'Draft'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cohort Breakdown */}
            <Card className="rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-orange-500" />
                  Target Cohorts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {message.selectedCohorts?.map(cohort => (
                    <div key={cohort} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <span className="text-sm font-medium">{getCohortDisplayName(cohort)}</span>
                      <span className="text-sm text-gray-600">
                        {message.cohortBreakdown?.[cohort] || 0} customers
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Engagement Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customers Who Opened */}
              <Card className="rounded-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5 text-blue-500" />
                    Opened ({message.uniqueReads || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    </div>
                  ) : readCustomers.length > 0 ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {readCustomers.map(customer => (
                          <div key={customer.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                            <Avatar className="h-8 w-8">
                              {customer.profilePictureUrl ? (
                                <AvatarImage src={customer.profilePictureUrl} />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {getCustomerInitials(customer)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {customer.fullName || 'Unknown Customer'}
                              </p>
                              {customer.email && (
                                <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No customers have opened this message yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Customers Who Clicked */}
              <Card className="rounded-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MousePointer className="h-5 w-5 text-green-500" />
                    Clicked ({message.uniqueClicks || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                    </div>
                  ) : clickedCustomers.length > 0 ? (
                    <ScrollArea className="h-48">
                      <div className="space-y-2">
                        {clickedCustomers.map(customer => (
                          <div key={customer.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50">
                            <Avatar className="h-8 w-8">
                              {customer.profilePictureUrl ? (
                                <AvatarImage src={customer.profilePictureUrl} />
                              ) : null}
                              <AvatarFallback className="text-xs">
                                {getCustomerInitials(customer)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {customer.fullName || 'Unknown Customer'}
                              </p>
                              {customer.email && (
                                <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <MousePointer className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No customers have clicked this message yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Timestamps */}
            <Card className="rounded-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">Created</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {message.createdAt ? format(message.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'N/A'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">Last Read</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {message.lastReadAt ? format(message.lastReadAt.toDate(), 'MMM d, yyyy h:mm a') : 'No reads yet'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">Last Click</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {message.lastClickAt ? format(message.lastClickAt.toDate(), 'MMM d, yyyy h:mm a') : 'No clicks yet'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
} 