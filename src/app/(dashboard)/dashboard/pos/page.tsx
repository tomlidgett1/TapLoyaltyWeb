"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { PageTransition } from "@/components/page-transition"
import { PageHeader } from "@/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Search, 
  Filter, 
  Settings,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  User,
  Mail,
  Phone,
  Building,
  Clock,
  MapPin,
  Gift,
  ShoppingBag,
  Link,
  Unlink,
  AlertTriangle,
  ExternalLink,
  X,
  Check,
  Package
} from "lucide-react"

interface Customer {
  id: string
  created_at: string
  updated_at: string
  email_address?: string
  phone_number?: string
  given_name?: string
  family_name?: string
  company_name?: string
  preferences?: {
    email_unsubscribed: boolean
  }
  creation_source: string
  version: number
}

interface Sale {
  id: string
  orderId: string
  locationId: string
  createdAt: string
  updatedAt: string
  state: string
  totalAmount: number
  currency: string
  customerName: string
  customerId: string | null
  source: string
  lineItems: Array<{
    name: string
    quantity: string
    unitPrice: number
    totalPrice: number
  }>
}

interface CatalogItem {
  id: string
  name: string
  description: string
  descriptionPlaintext: string
  descriptionHtml: string
  productType: string
  isTaxable: boolean
  isArchived: boolean
  isAlcoholic: boolean
  skipModifierScreen: boolean
  presentAtAllLocations: boolean
  presentAtLocationIds: string[]
  categories: Array<{
    id: string
    ordinal: number
  }>
  itemOptions: Array<{
    itemOptionId: string
  }>
  reportingCategory: {
    id: string
    ordinal: number
  } | null
  variations: Array<{
    id: string
    name: string
    sku: string
    ordinal: number
    pricingType: string
    priceMoney: {
      amount: number
      currency: string
    } | null
    sellable: boolean
    stockable: boolean
    locationOverrides: any[]
    itemOptionValues: any[]
  }>
  taxIds: string[]
  createdAt: string
  updatedAt: string
  version: number
  isDeleted: boolean
}

export default function POSPage() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingSales, setLoadingSales] = useState(false)
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [customersError, setCustomersError] = useState<string | null>(null)
  const [salesError, setSalesError] = useState<string | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<'name' | 'email' | 'created_at' | 'totalAmount' | 'createdAt' | 'customerName' | 'itemName' | 'price' | 'productType'>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'customers' | 'sales' | 'catalog'>('customers')
  
  // Square Settings Dialog State
  const [squareSettingsOpen, setSquareSettingsOpen] = useState(false)
  const [settingsActiveTab, setSettingsActiveTab] = useState<'connection' | 'sync'>('sync')
  const [syncNewCustomers, setSyncNewCustomers] = useState(true)
  const [addTapCash, setAddTapCash] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  
  // Customer Details Dialog State
  const [customerDetailsOpen, setCustomerDetailsOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [customerDetails, setCustomerDetails] = useState<any>(null)
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false)
  
  // Sale Details Panel State
  const [saleDetailsOpen, setSaleDetailsOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [saleDetails, setSaleDetails] = useState<any>(null)
  const [loadingSaleDetails, setLoadingSaleDetails] = useState(false)
  
  // Catalog Item Details Dialog State
  const [catalogItemDetailsOpen, setCatalogItemDetailsOpen] = useState(false)
  const [selectedCatalogItem, setSelectedCatalogItem] = useState<CatalogItem | null>(null)
  
  // Account Details State
  const [accountDetailsOpen, setAccountDetailsOpen] = useState(false)
  const [accountDetails, setAccountDetails] = useState<any>(null)
  const [loadingAccountDetails, setLoadingAccountDetails] = useState(false)
  
  // Business Dropdown State
  const [businessDropdownOpen, setBusinessDropdownOpen] = useState(false)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(false)
  
  // Refs for measuring tab widths
  const customersTabRef = useRef<HTMLButtonElement>(null)
  const salesTabRef = useRef<HTMLButtonElement>(null)
  const catalogTabRef = useRef<HTMLButtonElement>(null)
  const [tabDimensions, setTabDimensions] = useState({ customers: 0, sales: 0, catalog: 0 })
  
  // Refs for settings tab widths
  const connectionTabRef = useRef<HTMLButtonElement>(null)
  const syncTabRef = useRef<HTMLButtonElement>(null)
  const [settingsTabDimensions, setSettingsTabDimensions] = useState({ connection: 0, sync: 0 })

  // Fetch customers from Square API
  const fetchCustomers = async () => {
    if (!user?.uid) return
    
    setLoadingCustomers(true)
    setCustomersError(null)
    
    try {
      const response = await fetch(`/api/square/customers?merchantId=${user.uid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch customers')
      }
      
      if (data.success && data.data?.customers) {
        setCustomers(data.data.customers)
      } else {
        setCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomersError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast({
        title: "Error",
        description: "Failed to fetch customers from Square",
        variant: "destructive"
      })
    } finally {
      setLoadingCustomers(false)
    }
  }

  // Fetch sales from Square API
  const fetchSales = async () => {
    if (!user?.uid) return
    
    setLoadingSales(true)
    setSalesError(null)
    
    try {
      const response = await fetch(`/api/square/sales?merchantId=${user.uid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sales')
      }
      
      if (data.success && Array.isArray(data.sales)) {
        setSales(data.sales)
      } else {
        setSales([])
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
      setSalesError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast({
        title: "Error",
        description: "Failed to fetch sales from Square",
        variant: "destructive"
      })
    } finally {
      setLoadingSales(false)
    }
  }

  // Fetch catalog from Square API
  const fetchCatalog = async () => {
    if (!user?.uid) return
    
    setLoadingCatalog(true)
    setCatalogError(null)
    
    try {
      const response = await fetch(`/api/square/catalog?merchantId=${user.uid}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch catalog')
      }
      
      if (data.success && data.data?.items) {
        setCatalogItems(data.data.items)
      } else {
        setCatalogItems([])
      }
    } catch (error) {
      console.error('Error fetching catalog:', error)
      setCatalogError(error instanceof Error ? error.message : 'An unknown error occurred')
      toast({
        title: "Error",
        description: "Failed to fetch catalog from Square",
        variant: "destructive"
      })
    } finally {
      setLoadingCatalog(false)
    }
  }

  // Filter and sort customers
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase()
    const fullName = `${customer.given_name || ''} ${customer.family_name || ''}`.trim()
    return (
      fullName.toLowerCase().includes(searchLower) ||
      customer.email_address?.toLowerCase().includes(searchLower) ||
      customer.phone_number?.includes(searchTerm) ||
      customer.company_name?.toLowerCase().includes(searchLower)
    )
  }).sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'name':
        const nameA = `${a.given_name || ''} ${a.family_name || ''}`.trim()
        const nameB = `${b.given_name || ''} ${b.family_name || ''}`.trim()
        comparison = nameA.localeCompare(nameB)
        break
      case 'email':
        comparison = (a.email_address || '').localeCompare(b.email_address || '')
        break
      case 'created_at':
        comparison = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        break
    }
    return sortDirection === 'desc' ? comparison : -comparison
  })

  // Filter and sort sales
  const filteredSales = sales.filter(sale => {
    const searchLower = searchTerm.toLowerCase()
    return (
      sale.customerName.toLowerCase().includes(searchLower) ||
      sale.orderId.toLowerCase().includes(searchLower) ||
      sale.source.toLowerCase().includes(searchLower)
    )
  }).sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'totalAmount':
        comparison = b.totalAmount - a.totalAmount
        break
      case 'createdAt':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        break
      case 'customerName':
        comparison = a.customerName.localeCompare(b.customerName)
        break
    }
    return sortDirection === 'desc' ? comparison : -comparison
  })

  // Filter and sort catalog items
  const filteredCatalogItems = catalogItems.filter(item => {
    const searchLower = searchTerm.toLowerCase()
    return (
      item.name.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.productType.toLowerCase().includes(searchLower) ||
      item.variations.some(v => v.sku.toLowerCase().includes(searchLower))
    )
  }).sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'itemName':
        comparison = a.name.localeCompare(b.name)
        break
      case 'price':
        const aPrice = a.variations[0]?.priceMoney?.amount || 0
        const bPrice = b.variations[0]?.priceMoney?.amount || 0
        comparison = bPrice - aPrice
        break
      case 'productType':
        comparison = a.productType.localeCompare(b.productType)
        break
      case 'created_at':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        break
    }
    return sortDirection === 'desc' ? comparison : -comparison
  })

  const handleSort = (field: typeof sortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortButton = ({ field, children }: { field: typeof sortField, children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground"
    >
      {children}
      {sortField === field && (
        sortDirection === 'desc' ? 
          <ChevronDown className="h-4 w-4" /> : 
          <ChevronUp className="h-4 w-4" />
      )}
    </button>
  )

  // Load data on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchCustomers()
      fetchSales()
      fetchCatalog()
      fetchBusinessInfo()
    }
  }, [user?.uid])

  // Handle escape key for modals
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (accountDetailsOpen) {
          handleAccountDetailsClose(false)
        } else if (squareSettingsOpen) {
          handleSquareSettingsClose(false)
        } else if (customerDetailsOpen) {
          handleCustomerDetailsClose(false)
        } else if (catalogItemDetailsOpen) {
          handleCatalogItemDetailsClose(false)
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [accountDetailsOpen, squareSettingsOpen, customerDetailsOpen, catalogItemDetailsOpen])

  // Measure tab dimensions for animation
  useEffect(() => {
    const measureTabs = () => {
      if (customersTabRef.current && salesTabRef.current && catalogTabRef.current) {
        const customersWidth = customersTabRef.current.offsetWidth
        const salesWidth = salesTabRef.current.offsetWidth
        const catalogWidth = catalogTabRef.current.offsetWidth
        setTabDimensions({ customers: customersWidth, sales: salesWidth, catalog: catalogWidth })
      }
    }
    
    // Initial measurement
    const timer = setTimeout(measureTabs, 150)
    
    // Re-measure on window resize
    window.addEventListener('resize', measureTabs)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measureTabs)
    }
  }, [customers.length, sales.length, catalogItems.length, activeTab])

  // Measure settings tab dimensions
  useEffect(() => {
    const measureSettingsTabs = () => {
      if (connectionTabRef.current && syncTabRef.current) {
        const connectionWidth = connectionTabRef.current.offsetWidth
        const syncWidth = syncTabRef.current.offsetWidth
        setSettingsTabDimensions({ connection: connectionWidth, sync: syncWidth })
      }
    }
    const timer = setTimeout(measureSettingsTabs, 150)
    window.addEventListener('resize', measureSettingsTabs)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', measureSettingsTabs)
    }
  }, [settingsActiveTab])

  // Fetch customer details from Square API
  const fetchCustomerDetails = async (customerId: string) => {
    if (!user?.uid) return
    
    setLoadingCustomerDetails(true)
    try {
      const response = await fetch(`/api/square/customers/${customerId}?merchantId=${user.uid}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setCustomerDetails(data.customer)
    } catch (error) {
      console.error('Error fetching customer details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch customer details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingCustomerDetails(false)
    }
  }

  // Open customer details dialog
  const openCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer)
    setCustomerDetailsOpen(true)
    fetchCustomerDetails(customer.id)
  }

  // Handle customer details dialog close
  const handleCustomerDetailsClose = (open: boolean) => {
    setCustomerDetailsOpen(open)
    if (!open) {
      // Clean up state when dialog closes
      setSelectedCustomer(null)
      setCustomerDetails(null)
    }
  }

  // Fetch sale details from Square API
  const fetchSaleDetails = async (orderId: string) => {
    if (!user?.uid) return
    
    setLoadingSaleDetails(true)
    try {
      const response = await fetch(`/api/square/orders/${orderId}?merchantId=${user.uid}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setSaleDetails(data.order)
    } catch (error) {
      console.error('Error fetching sale details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch sale details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingSaleDetails(false)
    }
  }

  // Open sale details panel
  const openSaleDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setSaleDetailsOpen(true)
    fetchSaleDetails(sale.orderId)
  }

  // Open catalog item details dialog
  const openCatalogItemDetails = (item: CatalogItem) => {
    setSelectedCatalogItem(item)
    setCatalogItemDetailsOpen(true)
  }

  // Handle catalog item details dialog close
  const handleCatalogItemDetailsClose = (open: boolean) => {
    setCatalogItemDetailsOpen(open)
    if (!open) {
      setSelectedCatalogItem(null)
    }
  }

  // Fetch business info from Square API
  const fetchBusinessInfo = async () => {
    if (!user?.uid) return
    
    setLoadingBusinessInfo(true)
    try {
      const response = await fetch(`/api/square/merchants?merchantId=${user.uid}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      const business = data.merchant?.[0] || null
      setBusinessInfo(business)
      return business
    } catch (error) {
      console.error('Error fetching business info:', error)
      return null
    } finally {
      setLoadingBusinessInfo(false)
    }
  }

  // Fetch account details from Square API
  const fetchAccountDetails = async () => {
    if (!user?.uid) return
    
    setLoadingAccountDetails(true)
    try {
      const response = await fetch(`/api/square/merchants?merchantId=${user.uid}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAccountDetails(data.merchant?.[0] || null)
    } catch (error) {
      console.error('Error fetching account details:', error)
      toast({
        title: "Error",
        description: "Failed to fetch account details. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingAccountDetails(false)
    }
  }

  // Open account details dialog
  const openAccountDetails = () => {
    setAccountDetailsOpen(true)
    fetchAccountDetails()
  }

  // Handle account details dialog close
  const handleAccountDetailsClose = (open: boolean) => {
    if (!open) {
      // Ensure dropdown is closed first
      setBusinessDropdownOpen(false)
      
      // Clean up state when dialog closes
      setAccountDetails(null)
      setLoadingAccountDetails(false)
    }
    
    setAccountDetailsOpen(open)
  }

  // Handle Square settings dialog close
  const handleSquareSettingsClose = (open: boolean) => {
    setSquareSettingsOpen(open)
    if (!open) {
      // Reset settings state when dialog closes
      setSettingsActiveTab('sync')
    }
  }

  // Save settings
  const saveSettings = async () => {
    if (!user?.uid) return
    
    setSavingSettings(true)
    try {
      // Save sync settings to Firestore
      const { doc, updateDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      
      await updateDoc(doc(db, 'merchants', user.uid, 'integrations', 'square'), {
        syncNewCustomers,
        addTapCash,
        updatedAt: new Date()
      })
      
      toast({
        title: "Settings saved",
        description: "Your sync preferences have been updated successfully.",
      })
      
      setSquareSettingsOpen(false)
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSavingSettings(false)
    }
  }

  // Disconnect from Square
  const disconnectSquare = async () => {
    if (!user?.uid) return
    
    setDisconnecting(true)
    try {
      // Delete Square integration data from Firestore
      const { doc, deleteDoc } = await import('firebase/firestore')
      const { db } = await import('@/lib/firebase')
      
      await deleteDoc(doc(db, 'merchants', user.uid, 'integrations', 'square'))
      await deleteDoc(doc(db, 'merchants', user.uid, 'integrations', 'square-composio'))
      
      toast({
        title: "Disconnected from Square",
        description: "Your Square integration has been removed successfully.",
      })
      
      setSquareSettingsOpen(false)
    } catch (error) {
      console.error('Error disconnecting from Square:', error)
      toast({
        title: "Error",
        description: "Failed to disconnect from Square. Please try again.",
        variant: "destructive",
      })
    } finally {
      setDisconnecting(false)
    }
  }

  // Format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <PageTransition>
      <div className="p-2 sm:p-4 md:p-6 py-3 w-full overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
              <div className="relative flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                {/* Animated white background */}
                <motion.div
                  className="absolute inset-y-0.5 bg-white rounded-md shadow-sm"
                  initial={false}
                  animate={{
                    x: activeTab === 'customers' ? 0 : 
                        activeTab === 'sales' ? tabDimensions.customers : 
                        tabDimensions.customers + tabDimensions.sales,
                    width: activeTab === 'customers' ? tabDimensions.customers : 
                           activeTab === 'sales' ? tabDimensions.sales : 
                           tabDimensions.catalog
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                  }}
                  style={{
                    display: tabDimensions.customers > 0 && tabDimensions.sales > 0 && tabDimensions.catalog > 0 ? 'block' : 'none'
                  }}
                />
                
                {/* Tab buttons */}
                <button
                  ref={customersTabRef}
                  onClick={() => setActiveTab('customers')}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === 'customers' 
                      ? "text-gray-800" 
                      : "text-gray-600 hover:text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Customers
                  </div>
                </button>
                
                <button
                  ref={salesTabRef}
                  onClick={() => setActiveTab('sales')}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === 'sales' 
                      ? "text-gray-800" 
                      : "text-gray-600 hover:text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Sales
                  </div>
                </button>

                <button
                  ref={catalogTabRef}
                  onClick={() => setActiveTab('catalog')}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === 'catalog' 
                      ? "text-gray-800" 
                      : "text-gray-600 hover:text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Catalog
                  </div>
                </button>
              </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="search" 
                placeholder={
                  activeTab === 'customers' ? "Search customers..." : 
                  activeTab === 'sales' ? "Search sales..." : 
                  "Search catalog..."
                }
                className="pl-9 h-9 w-[250px] rounded-md"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={
                activeTab === 'customers' ? fetchCustomers :
                activeTab === 'sales' ? fetchSales :
                fetchCatalog
              }
              disabled={
                activeTab === 'customers' ? loadingCustomers :
                activeTab === 'sales' ? loadingSales :
                loadingCatalog
              }
              className="h-8 w-8 p-0"
              title={`Refresh ${activeTab}`}
            >
              {(
                activeTab === 'customers' ? loadingCustomers :
                activeTab === 'sales' ? loadingSales :
                loadingCatalog
              ) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
            
            {/* Business Dropdown */}
            <DropdownMenu open={businessDropdownOpen} onOpenChange={setBusinessDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Building className="h-4 w-4" />
                  {loadingBusinessInfo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : businessInfo?.business_name ? (
                    businessInfo.business_name
                  ) : (
                    "Loading..."
                  )}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <img src="/squarepro.png" alt="Square" className="h-4 w-4" />
                  Square Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  setBusinessDropdownOpen(false)
                  setTimeout(() => openAccountDetails(), 100)
                }}>
                  <Building className="h-4 w-4 mr-2" />
                  Account Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  setBusinessDropdownOpen(false)
                  setTimeout(() => setSquareSettingsOpen(true), 100)
                }}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    if (businessInfo?.id) {
                      window.open(`https://app.squareup.com/dashboard/account`, '_blank')
                    }
                  }}
                  disabled={!businessInfo?.id}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Square
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

          {activeTab === 'customers' && (
            <div className="space-y-4">

              <Card className="rounded-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead>
                          <SortButton field="name">Customer</SortButton>
                        </TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>
                          <SortButton field="created_at">Created</SortButton>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCustomers ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex justify-center">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : customersError ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <div className="text-red-600">Error: {customersError}</div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCustomers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Users className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <h3 className="mt-4 text-lg font-medium">
                                No customers found
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {searchTerm ? "Try adjusting your search query" : "No customers available"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <TableRow 
                            key={customer.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => openCustomerDetails(customer)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                                  <User className="h-5 w-5 text-[#007AFF]" />
                                  {customer.creation_source === 'DIRECTORY' ? (
                                    <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                                  ) : customer.creation_source === 'THIRD_PARTY' ? (
                                    <img src="/taplogo.png" alt="Tap" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                                  ) : null}
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {customer.given_name} {customer.family_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {customer.id.slice(-8)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {customer.email_address && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span>{customer.email_address}</span>
                                  </div>
                                )}
                                {customer.phone_number && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span>{customer.phone_number}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {customer.company_name ? (
                                <div className="flex items-center gap-2">
                                  <Building className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{customer.company_name}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(customer.created_at)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'sales' && (
            <div className="space-y-4">

              <Card className="rounded-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead>Order</TableHead>
                        <TableHead>
                          <SortButton field="customerName">Customer</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="totalAmount">Amount</SortButton>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          <SortButton field="createdAt">Date</SortButton>
                        </TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSales ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex justify-center">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : salesError ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="text-red-600">Error: {salesError}</div>
                          </TableCell>
                        </TableRow>
                      ) : filteredSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <h3 className="mt-4 text-lg font-medium">
                                No sales found
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {searchTerm ? "Try adjusting your search query" : "No sales found for the selected date range"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSales.map((sale) => (
                          <TableRow 
                            key={sale.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => openSaleDetails(sale)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img src="/squarepro.png" alt="Square" className="h-5 w-5 flex-shrink-0" />
                                <div>
                                  <div className="font-medium">#{sale.orderId.slice(-8)}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {sale.lineItems.length} items
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-[#007AFF]" />
                                </div>
                                <span className="font-medium">{sale.customerName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <DollarSign className="h-4 w-4 text-green-600" />
                                <span className="font-medium">{formatCurrency(sale.totalAmount, sale.currency)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={sale.state === 'COMPLETED' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {sale.state}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(sale.createdAt)}
                            </TableCell>
                            <TableCell>
                              {sale.source === 'DIRECTORY' ? (
                                <div className="flex items-center gap-2">
                                  <img src="/squarepro.png" alt="Square" className="h-4 w-4" />
                                  <span className="text-sm font-medium">Square POS</span>
                                </div>
                              ) : sale.source === 'THIRD_PARTY' ? (
                                <div className="flex items-center gap-2">
                                  <img src="/taplogo.png" alt="Tap" className="h-4 w-4" />
                                  <span className="text-sm font-medium">Tap</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">{sale.source}</span>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <Card className="rounded-md overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead>
                          <SortButton field="itemName">Item</SortButton>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>
                          <SortButton field="price">Price</SortButton>
                        </TableHead>
                        <TableHead>
                          <SortButton field="productType">Type</SortButton>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          <SortButton field="created_at">Created</SortButton>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingCatalog ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex justify-center">
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : catalogError ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="text-red-600">Error: {catalogError}</div>
                          </TableCell>
                        </TableRow>
                      ) : filteredCatalogItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                              <h3 className="mt-4 text-lg font-medium">
                                No catalog items found
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {searchTerm ? "Try adjusting your search query" : "No catalog items available"}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCatalogItems.map((item) => (
                          <TableRow 
                            key={item.id} 
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => openCatalogItemDetails(item)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                                  <Package className="h-5 w-5 text-[#007AFF]" />
                                  <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                                </div>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    ID: {item.id.slice(-8)}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs">
                                <p className="text-sm text-gray-900 truncate">
                                  {item.descriptionPlaintext || item.description || 'No description'}
                                </p>
                                {item.variations.length > 1 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.variations.length} variations
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {item.variations.map((variation, index) => (
                                  <div key={variation.id} className="flex items-center gap-1">
                                    {variation.priceMoney ? (
                                      <>
                                        <DollarSign className="h-3 w-3 text-green-600" />
                                        <span className="text-sm font-medium">
                                          {formatCurrency(variation.priceMoney.amount / 100, variation.priceMoney.currency)}
                                        </span>
                                        {item.variations.length > 1 && (
                                          <span className="text-xs text-muted-foreground">
                                            ({variation.name})
                                          </span>
                                        )}
                                      </>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">No price</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                <div className="h-1.5 w-1.5 bg-purple-500 rounded-full flex-shrink-0"></div>
                                {item.productType.toLowerCase().replace('_', ' ')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {item.isArchived && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                    <div className="h-1.5 w-1.5 bg-gray-500 rounded-full flex-shrink-0"></div>
                                    Archived
                                  </span>
                                )}
                                {item.isDeleted && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                    <div className="h-1.5 w-1.5 bg-red-500 rounded-full flex-shrink-0"></div>
                                    Deleted
                                  </span>
                                )}
                                {!item.isArchived && !item.isDeleted && (
                                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                                    Active
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(item.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Square Settings Dialog */}
        <Dialog open={squareSettingsOpen} onOpenChange={handleSquareSettingsClose}>
          <DialogContent className="max-w-2xl h-[500px] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <img src="/squarepro.png" alt="Square" className="h-6 w-6" />
                Square Settings
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-6 overflow-y-auto">
              {/* Settings Tabs */}
              <div className="relative flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                <motion.div
                  className="absolute inset-y-0.5 bg-white rounded-md shadow-sm"
                  initial={false}
                  animate={{
                    x: settingsActiveTab === 'sync' ? 0 : settingsTabDimensions.sync,
                    width: settingsActiveTab === 'sync' ? settingsTabDimensions.sync : settingsTabDimensions.connection
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 30
                  }}
                  style={{
                    display: settingsTabDimensions.sync > 0 && settingsTabDimensions.connection > 0 ? 'block' : 'none'
                  }}
                />
                <button
                  ref={syncTabRef}
                  onClick={() => setSettingsActiveTab('sync')}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    settingsActiveTab === 'sync'
                      ? "text-gray-800"
                      : "text-gray-600 hover:text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Sync Options
                  </div>
                </button>
                <button
                  ref={connectionTabRef}
                  onClick={() => setSettingsActiveTab('connection')}
                  className={cn(
                    "relative z-10 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    settingsActiveTab === 'connection'
                      ? "text-gray-800"
                      : "text-gray-600 hover:text-gray-700"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4" />
                    Connection
                  </div>
                </button>
              </div>

              {/* Connection Tab */}
              {settingsActiveTab === 'connection' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <Link className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Connected to Square</div>
                        <div className="text-sm text-gray-600">Your account is successfully linked</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">Danger Zone</div>
                        <div className="text-sm text-gray-600">This action cannot be undone</div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={disconnectSquare}
                      disabled={disconnecting}
                      className="gap-2"
                    >
                      {disconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                  </div>
                </div>
              )}

              {/* Sync Options Tab */}
              {settingsActiveTab === 'sync' && (
                <div className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Sync New Tap Customers</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically upload new Tap customers to Square
                        </p>
                      </div>
                      <Switch
                        checked={syncNewCustomers}
                        onCheckedChange={setSyncNewCustomers}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium">Add TapCash to Square Customers</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically add TapCash payment method to Square customers
                        </p>
                      </div>
                      <Switch
                        checked={addTapCash}
                        onCheckedChange={setAddTapCash}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => setSquareSettingsOpen(false)}
                disabled={savingSettings}
              >
                Cancel
              </Button>
              <Button
                onClick={saveSettings}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Settings"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Details Dialog */}
        <Dialog open={customerDetailsOpen} onOpenChange={handleCustomerDetailsClose}>
          <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-[#007AFF]" />
                  {selectedCustomer?.creation_source === 'DIRECTORY' ? (
                    <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                  ) : selectedCustomer?.creation_source === 'THIRD_PARTY' ? (
                    <img src="/taplogo.png" alt="Tap" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                  ) : null}
                </div>
                Customer Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-6 overflow-y-auto">
              {loadingCustomerDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading customer details...</span>
                </div>
              ) : customerDetails ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {customerDetails.given_name} {customerDetails.family_name}
                          </div>
                          <div className="text-sm text-gray-600">Customer ID: {customerDetails.id}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Contact Information */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Contact Information</h3>
                      <div className="space-y-2">
                        {customerDetails.email_address && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">Email</span>
                            </div>
                            <span className="text-sm text-gray-900">{customerDetails.email_address}</span>
                          </div>
                        )}
                        {customerDetails.phone_number && (
                          <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">Phone</span>
                            </div>
                            <span className="text-sm text-gray-900">{customerDetails.phone_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Company Information */}
                    {customerDetails.company_name && (
                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-700">Company Information</h3>
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Company</span>
                          </div>
                          <span className="text-sm text-gray-900">{customerDetails.company_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Preferences */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Preferences</h3>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Email Subscribed</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {customerDetails.preferences?.email_unsubscribed ? (
                            <span className="text-sm text-red-600">Unsubscribed</span>
                          ) : (
                            <span className="text-sm text-green-600">Subscribed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Account Information */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Account Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Created</span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {formatDate(customerDetails.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Last Updated</span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {formatDate(customerDetails.updated_at)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-700">Version</span>
                          </div>
                          <span className="text-sm text-gray-900">{customerDetails.version}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No customer details available</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (customerDetails?.id) {
                    window.open(`https://app.squareup.com/dashboard/customers/directory/customer/${customerDetails.id}`, '_blank')
                  }
                }}
                disabled={!customerDetails?.id}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Square
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCustomerDetailsClose(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Account Details Dialog */}
        <Dialog open={accountDetailsOpen} onOpenChange={handleAccountDetailsClose}>
          <DialogContent className="max-w-2xl h-[500px] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center">
                  <Building className="h-5 w-5 text-[#007AFF]" />
                  <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                </div>
                <div>
                  <div className="text-lg font-semibold">Account Details</div>
                  <div className="text-sm text-gray-500">Connected Square Account</div>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-6 overflow-y-auto">
              {loadingAccountDetails ? (
                <div className="flex items-center justify-center py-12 px-6">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading account details...</span>
                </div>
              ) : accountDetails ? (
                <div className="space-y-6 px-6">
                  {/* Account Summary */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Building className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {accountDetails.business_name}
                          </div>
                          <div className="text-sm text-gray-600">
                            ID: {accountDetails.id}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-800 capitalize">
                          {accountDetails.status?.toLowerCase()}
                        </div>
                        <div className="text-sm text-gray-600">
                          {accountDetails.country}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Account Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Business Name</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.business_name}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Account ID</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.id}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Country</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.country}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Currency</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.currency}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Language</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.language_code}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Status</span>
                        </div>
                        <span className="text-sm text-gray-900 capitalize">{accountDetails.status?.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Location Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Main Location ID</span>
                        </div>
                        <span className="text-sm text-gray-900">{accountDetails.main_location_id}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Timeline */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Account Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Created</span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {formatDate(accountDetails.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 px-6">
                  <p className="text-sm text-gray-500">No account details available</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (accountDetails?.id) {
                    window.open(`https://app.squareup.com/dashboard/account`, '_blank')
                  }
                }}
                disabled={!accountDetails?.id}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Square
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAccountDetailsClose(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Sale Details Panel - Slides in from right */}
        <div 
          className={`fixed top-0 right-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-300 ease-in-out z-40 ${
            saleDetailsOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="h-16 px-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-[#007AFF]" />
                  {selectedSale?.source === 'DIRECTORY' ? (
                    <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                  ) : selectedSale?.source === 'THIRD_PARTY' ? (
                    <img src="/taplogo.png" alt="Tap" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                  ) : null}
                </div>
                <div>
                  <div className="font-medium text-gray-900">Sale Details</div>
                  <div className="text-sm text-gray-500">Order #{selectedSale?.orderId.slice(-8)}</div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSaleDetailsOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingSaleDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading sale details...</span>
                </div>
              ) : saleDetails ? (
                <div className="space-y-6">
                  {/* Order Summary */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <ShoppingCart className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            Order #{saleDetails.id.slice(-8)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {saleDetails.line_items?.length || 0} items
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-800">
                          {formatCurrency(saleDetails.total_money?.amount || 0, saleDetails.total_money?.currency || 'USD')}
                        </div>
                        <div className="text-sm text-gray-600 capitalize">
                          {saleDetails.state?.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Line Items */}
                  {saleDetails.line_items && saleDetails.line_items.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Items</h3>
                      <div className="space-y-2">
                        {saleDetails.line_items.map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">{item.quantity}</span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-800">{item.name}</div>
                                {item.variation_name && (
                                  <div className="text-sm text-gray-600">{item.variation_name}</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-800">
                                {formatCurrency(item.total_money?.amount || 0, item.total_money?.currency || 'USD')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {formatCurrency(item.base_price_money?.amount || 0, item.base_price_money?.currency || 'USD')} each
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Payment Information */}
                  {saleDetails.tenders && saleDetails.tenders.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Payment</h3>
                      <div className="space-y-2">
                        {saleDetails.tenders.map((tender: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700 capitalize">{tender.type?.toLowerCase()}</span>
                            </div>
                            <span className="text-sm text-gray-900">
                              {formatCurrency(tender.amount_money?.amount || 0, tender.amount_money?.currency || 'USD')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Order Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Order Information</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Created</span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {formatDate(saleDetails.created_at)}
                        </span>
                      </div>
                      {saleDetails.closed_at && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-700">Closed</span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {formatDate(saleDetails.closed_at)}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700">Version</span>
                        </div>
                        <span className="text-sm text-gray-900">{saleDetails.version}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Financial Summary */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Financial Summary</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700">Subtotal</span>
                        <span className="text-sm text-gray-900">
                          {formatCurrency(saleDetails.total_money?.amount || 0, saleDetails.total_money?.currency || 'USD')}
                        </span>
                      </div>
                      {saleDetails.total_tax_money?.amount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <span className="text-sm text-gray-700">Tax</span>
                          <span className="text-sm text-gray-900">
                            {formatCurrency(saleDetails.total_tax_money.amount, saleDetails.total_tax_money.currency)}
                          </span>
                        </div>
                      )}
                      {saleDetails.total_discount_money?.amount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <span className="text-sm text-gray-700">Discount</span>
                          <span className="text-sm text-gray-900">
                            -{formatCurrency(saleDetails.total_discount_money.amount, saleDetails.total_discount_money.currency)}
                          </span>
                        </div>
                      )}
                      {saleDetails.total_tip_money?.amount > 0 && (
                        <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <span className="text-sm text-gray-700">Tip</span>
                          <span className="text-sm text-gray-900">
                            {formatCurrency(saleDetails.total_tip_money.amount, saleDetails.total_tip_money.currency)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No sale details available</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex justify-between items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (saleDetails?.id) {
                      window.open(`https://app.squareup.com/dashboard/orders/${saleDetails.id}`, '_blank')
                    }
                  }}
                  disabled={!saleDetails?.id}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open in Square
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSaleDetailsOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Item Details Dialog */}
        <Dialog open={catalogItemDetailsOpen} onOpenChange={handleCatalogItemDetailsClose}>
          <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-[#007AFF]" />
                  <img src="/squarepro.png" alt="Square" className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-sm shadow-sm" />
                </div>
                Item Details
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 space-y-6 overflow-y-auto">
              {selectedCatalogItem ? (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-md border border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">
                            {selectedCatalogItem.name}
                          </div>
                          <div className="text-sm text-gray-600">ID: {selectedCatalogItem.id}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Description */}
                  {selectedCatalogItem.description && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-gray-700">Description</h3>
                      <div className="p-3 bg-white rounded-md border border-gray-200">
                        <p className="text-sm text-gray-900">{selectedCatalogItem.description}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Variations */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Variations</h3>
                    <div className="space-y-2">
                      {selectedCatalogItem.variations.map((variation) => (
                        <div key={variation.id} className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-medium text-gray-600">{variation.ordinal}</span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{variation.name}</div>
                              {variation.sku && (
                                <div className="text-sm text-gray-600">SKU: {variation.sku}</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {variation.priceMoney ? (
                              <div className="font-medium text-gray-800">
                                {formatCurrency(variation.priceMoney.amount / 100, variation.priceMoney.currency)}
                              </div>
                            ) : (
                              <div className="text-sm text-gray-500">No price</div>
                            )}
                            <div className="text-xs text-gray-500 capitalize">
                              {variation.pricingType.toLowerCase().replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Item Properties */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Properties</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700">Product Type</span>
                        <span className="text-sm text-gray-900 capitalize">
                          {selectedCatalogItem.productType.toLowerCase().replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700">Taxable</span>
                        <span className="text-sm text-gray-900">
                          {selectedCatalogItem.isTaxable ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700">Alcoholic</span>
                        <span className="text-sm text-gray-900">
                          {selectedCatalogItem.isAlcoholic ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <span className="text-sm text-gray-700">Skip Modifier Screen</span>
                        <span className="text-sm text-gray-900">
                          {selectedCatalogItem.skipModifierScreen ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Location Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Location Availability</h3>
                    <div className="p-3 bg-white rounded-md border border-gray-200">
                      {selectedCatalogItem.presentAtAllLocations ? (
                        <span className="text-sm text-gray-900">Available at all locations</span>
                      ) : (
                        <div>
                          <span className="text-sm text-gray-900">Available at specific locations:</span>
                          <div className="mt-2 space-y-1">
                            {selectedCatalogItem.presentAtLocationIds.map((locationId) => (
                              <div key={locationId} className="text-sm text-gray-600">
                                {locationId}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Timeline */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-700">Timeline</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Created</span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {formatDate(selectedCatalogItem.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200">
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-700">Last Updated</span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {formatDate(selectedCatalogItem.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-sm text-gray-500">No item details available</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex justify-between items-center gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedCatalogItem?.id) {
                    window.open(`https://app.squareup.com/dashboard/catalog/items/${selectedCatalogItem.id}`, '_blank')
                  }
                }}
                disabled={!selectedCatalogItem?.id}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Square
              </Button>
              <Button
                variant="outline"
                onClick={() => handleCatalogItemDetailsClose(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageTransition>
    )
  }
