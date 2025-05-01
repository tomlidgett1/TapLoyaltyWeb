"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, RefreshCcw, Settings, Link, Wallet, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup, 
  SelectItem,
  SelectLabel, 
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { toast } from '@/components/ui/use-toast'

// Import our new components
import OpenBankingConnectCard from '@/components/financials/OpenBankingConnectCard'
import CashFlowOverview from '@/components/financials/CashFlowOverview'
import ExpenseBreakdown from '@/components/financials/ExpenseBreakdown'
import TopVendorsCustomers from '@/components/financials/TopVendorsCustomers'
import BenchmarkComparison from '@/components/financials/BenchmarkComparison'
import SmartRecommendations from '@/components/financials/SmartRecommendations'
import TransactionList from '@/components/financials/TransactionList'

// Define interfaces for our data types
interface BasicMetrics {
  currentBalance: number
  runway: number
  netMonth: number
  totalIncome: number
  totalExpenses: number
  previousPeriodIncomeChange: number
  previousPeriodExpenseChange: number
  netToday: number
  netWeek: number
  burnRate: number
}

interface CashFlowData {
  date: string
  income: number
  expenses: number
  balance: number | null
}

interface WeeklyCashFlowData {
  week: string
  income: number
  expenses: number
  balance: number | null
}

interface MonthlyCashFlowData {
  month: string
  income: number
  expenses: number
  balance: number | null
}

interface CashFlow {
  daily: CashFlowData[]
  weekly: WeeklyCashFlowData[]
  monthly: MonthlyCashFlowData[]
}

interface ExpenseCategory {
  name: string
  value: number
  color?: string
  category?: string
  amount?: number
  percentage?: number
  change?: number
}

interface DetailedExpense {
  category: string
  subcategories?: {
    name: string
    amount: number
    percentage: number
  }[]
  subcategory?: string
  amount?: number
}

interface Expenses {
  categories: ExpenseCategory[]
  detailed: DetailedExpense[]
}

interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: string
  category: string
  status: string
  timestamp?: string
  accountId?: string
}

interface Vendor {
  name: string
  amount: number
  transactions: number
  percentage: number
  count?: number
  trend?: number
  type?: string
}

interface Customer {
  name: string
  amount: number
  transactions: number
  percentage: number
  count?: number
  trend?: number
  type?: string
}

interface BenchmarkMetric {
  name: string
  description: string
  yourValue: number
  industryAverage: number
  difference: number
  status: string
  businessValue?: number
  industryBenchmarkRange?: string
  percentile?: number
  isHigherBetter?: boolean
}

interface Benchmark {
  industryName: string
  businessSizeRange: string
  dataSource: string
  lastUpdated: string
  metrics: BenchmarkMetric[]
}

interface Recommendation {
  id: string
  title: string
  description: string
  impact: number
  difficulty: string
  category: string
  actionLink: string
  type?: 'alert' | 'opportunity' | 'success'
  detail?: string
  severity?: 'low' | 'medium' | 'high'
  action?: {
    label: string
    url?: string
  }
  dismissed?: boolean
}

interface FinancialData {
  basicMetrics: BasicMetrics
  cashFlow: CashFlow
  expenses: Expenses
  transactions: Transaction[]
  vendors: {
    top: Vendor[]
  }
  customers: {
    top: Customer[]
  }
  benchmarks: Benchmark
  recommendations: Recommendation[]
  metadata: {
    lastUpdated: string
    currency: string
  }
}

// Import sample data as fallback
import {
  sampleDailyCashFlow,
  sampleWeeklyCashFlow,
  sampleMonthlyCashFlow,
  sampleExpenseCategories,
  sampleDetailedExpenses,
  sampleTransactions,
  sampleTopVendors,
  sampleTopCustomers,
  sampleBenchmarkMetrics,
  sampleRecommendations,
  sampleFinancialMetrics
} from '@/components/financials/utils/data'

// Add this import for type assertions
import type { ComponentProps } from 'react'

// Add these imports to get component prop types
import type SmartRecommendationsType from '@/components/financials/SmartRecommendations'
import type ExpenseBreakdownType from '@/components/financials/ExpenseBreakdown'
import type TopVendorsCustomersType from '@/components/financials/TopVendorsCustomers'
import type BenchmarkComparisonType from '@/components/financials/BenchmarkComparison'
import type TransactionListType from '@/components/financials/TransactionList'

// Define component prop types by inferring from the components
type SmartRecommendationsProps = ComponentProps<typeof SmartRecommendationsType>
type ExpenseBreakdownProps = ComponentProps<typeof ExpenseBreakdownType>
type TopVendorsCustomersProps = ComponentProps<typeof TopVendorsCustomersType>
type BenchmarkComparisonProps = ComponentProps<typeof BenchmarkComparisonType>
type TransactionListProps = ComponentProps<typeof TransactionListType>

export default function FinancialsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD')
  const [activeSection, setActiveSection] = useState('overview')
  const [connectBankLoading, setConnectBankLoading] = useState(false)
  const [connectDialogOpen, setConnectDialogOpen] = useState(false)
  const [bankConnectForm, setBankConnectForm] = useState({
    mobile: '',
    email: '',
    firstName: ''
  })
  const [lastUpdated, setLastUpdated] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const router = useRouter()
  const { user } = useAuth()
  
  // Get the merchantId from the authenticated user
  const merchantId = user?.uid || ''
  
  // Determine the appropriate currency formatter based on selected currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }
  
  // Handle dismissing a recommendation
  const handleDismissRecommendation = (id: string) => {
    // In a real app, this would make an API call to dismiss the recommendation
    console.log(`Dismissing recommendation ${id}`)
  }
  
  // Handle form input changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBankConnectForm(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  // Function to refresh the financial data
  const refreshFinancialData = async () => {
    if (isRefreshing) return // Prevent multiple refresh calls

    try {
      setIsRefreshing(true)
      await fetchFinancialData()
      
      // Show toast notification on successful refresh
      toast({
        title: "Data Refreshed",
        description: "Financial insights have been updated with the latest data.",
        variant: "default"
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      toast({
        title: "Refresh Failed",
        description: `Could not refresh financial data: ${errorMessage}`,
        variant: "destructive"
      })
    } finally {
      setIsRefreshing(false)
    }
  }
  
  // Handle connecting bank account
  const handleConnectBank = async () => {
    if (!user) {
      console.error("User not authenticated")
      return
    }
    
    try {
      setConnectBankLoading(true)
      
      // Call the Firebase function 'basiqconnect' with form data wrapped in a data object
      const response = await fetch('/api/basiqconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            userId: user.uid, // Use the authenticated user's ID
            merchantId: user.uid, // Use the user's ID as the merchantId as well
            mobile: bankConnectForm.mobile,
            email: bankConnectForm.email,
            firstName: bankConnectForm.firstName
          }
        }),
      })
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }
      
      const responseData = await response.json()
      
      // Log the full response for debugging
      console.log('Full response from basiqconnect:', responseData)
      
      // Close the dialog
      setConnectDialogOpen(false)
      
      // Check for authLink in the nested data object
      const authLink = responseData.data?.authLink
      
      if (authLink) {
        window.open(authLink, '_blank')
      } else {
        // If no authLink is found, show the full response in an alert for debugging
        alert(`No auth link found. Full response: ${JSON.stringify(responseData, null, 2)}`)
        throw new Error('No authentication link received')
      }
    } catch (error: unknown) {
      console.error('Failed to connect bank account:', error)
      // Show error details to the user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error connecting bank account: ${errorMessage}`)
    } finally {
      setConnectBankLoading(false)
    }
  }
  
  // Fetch the real financial data from Firestore
  const fetchFinancialData = async () => {
    if (!merchantId) {
      console.error("No merchant ID available")
      setError("Authentication required to view financial data")
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      console.log(`Fetching financial data for merchant: ${merchantId}`)
      
      // Get the financial data from Firestore
      const financialsRef = doc(db, `merchants/${merchantId}/financials/latest`)
      const financialsDoc = await getDoc(financialsRef)
      
      if (financialsDoc.exists()) {
        console.log('Financial data found:', financialsDoc.data())
        const data = financialsDoc.data() as FinancialData
        setFinancialData(data)
        
        // Set the currency from the data if available
        if (data.metadata?.currency) {
          setSelectedCurrency(data.metadata.currency)
        }
        
        // Set the last updated timestamp
        if (data.metadata?.lastUpdated) {
          const lastUpdatedDate = new Date(data.metadata.lastUpdated)
          setLastUpdated(lastUpdatedDate.toLocaleString())
        } else {
          setLastUpdated(new Date().toLocaleString())
        }
        
        setError(null)
      } else {
        console.log('No financial data found')
        // Use sample data as fallback
        setFinancialData(null)
        setError("No financial data available")
        
        // Show a toast notification
        toast({
          title: "No Financial Data",
          description: "Using sample data for demonstration purposes.",
          variant: "default"
        })
      }
    } catch (error: unknown) {
      console.error('Error fetching financial data:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Error loading financial data: ${errorMessage}`)
      
      // Show a toast notification
      toast({
        title: "Error",
        description: "Failed to load financial data. Using sample data.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch financial data on component mount
  useEffect(() => {
    fetchFinancialData()
  }, [merchantId])

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-6">
          {/* Header with Last Updated and Settings */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Insights</h1>
              <p className="text-gray-500 text-sm mt-1">
                Loading financial data...
              </p>
            </div>

            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <Button variant="outline" className="border-0 ring-1 ring-gray-200 bg-white text-gray-400 shadow-sm rounded-xl" disabled>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button variant="ghost" size="icon" className="text-gray-400" disabled>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-gray-100 mb-8">
            <nav className="flex space-x-8 -mb-px">
              <button
                disabled
                className="py-4 px-1 border-b-2 text-sm font-medium border-blue-600 text-blue-600"
              >
                Overview
              </button>
              <button
                disabled
                className="py-4 px-1 border-b-2 text-sm font-medium border-transparent text-gray-400"
              >
                Expenses
              </button>
              <button
                disabled
                className="py-4 px-1 border-b-2 text-sm font-medium border-transparent text-gray-400"
              >
                Benchmarks
              </button>
              <button
                disabled
                className="py-4 px-1 border-b-2 text-sm font-medium border-transparent text-gray-400"
              >
                Transactions
              </button>
            </nav>
          </div>
          
          {/* Skeleton loaders */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-gray-200 w-full animate-pulse"></div>
                <CardContent className="p-6">
                  <div className="h-4 w-28 bg-gray-200 rounded animate-pulse mb-3"></div>
                  <div className="h-7 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-3"></div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
            <div className="xl:col-span-2">
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-gray-200 w-full animate-pulse"></div>
                <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="h-5 w-40 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="xl:col-span-1">
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-full">
                <div className="h-1 bg-gray-200 w-full animate-pulse"></div>
                <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                  <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-col h-full justify-center space-y-4">
                    <div className="h-16 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8">
            <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div className="h-1 bg-gray-200 w-full animate-pulse"></div>
              <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-5 w-64 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-24 bg-gray-100 rounded animate-pulse"></div>
                  <div className="h-24 bg-gray-100 rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Update mapDataForComponents to handle null data properly
  const mapDataForComponents = (data: FinancialData | null) => {
    console.log("mapDataForComponents called with data:", data ? "data exists" : "null data");
    
    if (!data) {
      console.log("Using sample data as fallback");
      // Return default structure with empty arrays to prevent mapping errors
      return {
        basicMetrics: sampleFinancialMetrics,
        cashFlow: {
          daily: sampleDailyCashFlow,
          weekly: sampleWeeklyCashFlow,
          monthly: sampleMonthlyCashFlow
        },
        expenses: {
          categories: sampleExpenseCategories
        },
        mappedDetailedExpenses: sampleDetailedExpenses,
        vendors: {
          top: sampleTopVendors
        },
        customers: {
          top: sampleTopCustomers
        },
        recommendations: sampleRecommendations,
        benchmarks: {
          industryName: "Café & Restaurant",
          businessSizeRange: "$200K-$500K",
          dataSource: "Australian Tax Office industry benchmarks",
          lastUpdated: "July 2023",
          metrics: sampleBenchmarkMetrics
        },
        transactions: sampleTransactions
      };
    }
    
    // Log cash flow data structure received from Firestore
    console.log("CashFlow data from Firestore:", {
      hasCashFlow: !!data.cashFlow,
      dailyLength: data.cashFlow?.daily?.length || 0,
      weeklyLength: data.cashFlow?.weekly?.length || 0,
      monthlyLength: data.cashFlow?.monthly?.length || 0,
      sampleDaily: data.cashFlow?.daily?.[0] || "No data",
    });
    
    // Map the cash flow data from income/expenses to cashIn/cashOut which is what the component expects
    const mappedDailyCashFlow = data.cashFlow?.daily?.map(day => ({
      time: day.date,  // Assuming the date field contains time info for dailyData
      cashIn: day.income,
      cashOut: day.expenses,
      net: day.income - day.expenses
    })) || sampleDailyCashFlow;

    const mappedWeeklyCashFlow = data.cashFlow?.weekly?.map(week => ({
      date: week.week,  // Use 'week' field as the date label
      cashIn: week.income,
      cashOut: week.expenses,
      net: week.income - week.expenses
    })) || sampleWeeklyCashFlow;

    const mappedMonthlyCashFlow = data.cashFlow?.monthly?.map(month => ({
      month: month.month,
      cashIn: month.income,
      cashOut: month.expenses,
      net: month.income - month.expenses
    })) || sampleMonthlyCashFlow;
    
    // Log the mapped cash flow data
    console.log("Mapped cashFlow data:", {
      dailyLength: mappedDailyCashFlow.length,
      weeklyLength: mappedWeeklyCashFlow.length,
      monthlyLength: mappedMonthlyCashFlow.length,
      sampleDaily: mappedDailyCashFlow[0] || "No data",
    });
    
    // Map expense categories to the format expected by the component
    const mappedExpenseCategories = data.expenses?.categories?.map(cat => ({
      name: cat.category || '',
      value: cat.amount || 0,
      color: undefined,
      category: cat.category,
      amount: cat.amount,
      percentage: cat.percentage,
      change: cat.change
    })) || sampleExpenseCategories;
    
    // Map detailed expenses to the format expected by the component
    const mappedDetailedExpenses = data.expenses?.detailed?.flatMap(detail => {
      return (detail.subcategories || []).map(sub => ({
        category: detail.category,
        subcategory: sub.name,
        amount: sub.amount
      }));
    }) || sampleDetailedExpenses;
    
    // Map vendors to the format expected by the component
    const mappedVendors = data.vendors?.top?.map(vendor => ({
      name: vendor.name,
      amount: vendor.amount,
      count: vendor.transactions || 0,
      trend: 0, // Default value if not available
      transactions: vendor.transactions,
      percentage: vendor.percentage
    })) || sampleTopVendors;
    
    // Map customers to the format expected by the component
    const mappedCustomers = data.customers?.top?.map(customer => ({
      name: customer.name,
      amount: customer.amount,
      count: customer.transactions || 0,
      trend: 0, // Default value if not available
      type: '', // Default value if not available
      transactions: customer.transactions,
      percentage: customer.percentage
    })) || sampleTopCustomers;
    
    // Map recommendations to the format expected by the component
    const mappedRecommendations = data.recommendations?.map(rec => ({
      id: rec.id,
      type: (rec.category === 'Cost Reduction' ? 'alert' : 
             rec.category === 'Revenue Opportunity' ? 'opportunity' : 'success') as 'alert' | 'opportunity' | 'success',
      title: rec.title,
      description: rec.description,
      detail: `Impact: ${formatCurrency(rec.impact)}`,
      severity: (rec.difficulty.toLowerCase() as 'low' | 'medium' | 'high') || 'medium',
      action: {
        label: 'View Details',
        url: rec.actionLink
      },
      impact: rec.impact,
      difficulty: rec.difficulty,
      category: rec.category,
      actionLink: rec.actionLink
    })) || sampleRecommendations;
    
    // Map benchmark metrics to the format expected by the component
    const mappedBenchmarkMetrics = data.benchmarks?.metrics?.map(metric => ({
      ...metric,
      businessValue: metric.yourValue,
      industryBenchmarkRange: [metric.industryAverage - 5, metric.industryAverage + 5] as [number, number],
      percentile: metric.status === 'above' ? 75 : metric.status === 'below' ? 25 : 50,
      isHigherBetter: true // Default assumption
    })) || sampleBenchmarkMetrics;
    
    return {
      ...data,
      cashFlow: {
        daily: mappedDailyCashFlow,
        weekly: mappedWeeklyCashFlow,
        monthly: mappedMonthlyCashFlow
      },
      expenses: {
        categories: mappedExpenseCategories as ExpenseBreakdownProps['expenses'],
        detailed: data.expenses?.detailed || [],
      },
      mappedDetailedExpenses: mappedDetailedExpenses as ExpenseBreakdownProps['detailedExpenses'],
      vendors: {
        top: mappedVendors as TopVendorsCustomersProps['topVendors']
      },
      customers: {
        top: mappedCustomers as TopVendorsCustomersProps['topCustomers']
      },
      recommendations: mappedRecommendations as SmartRecommendationsProps['recommendations'],
      benchmarks: {
        ...data.benchmarks,
        industryName: data.benchmarks?.industryName || "Café & Restaurant",
        businessSizeRange: data.benchmarks?.businessSizeRange || "$200K-$500K",
        dataSource: data.benchmarks?.dataSource || "Australian Tax Office industry benchmarks",
        lastUpdated: data.benchmarks?.lastUpdated || "July 2023",
        metrics: mappedBenchmarkMetrics as unknown as BenchmarkComparisonProps['metrics']
      },
      transactions: data.transactions as TransactionListProps['transactions'] || sampleTransactions
    };
  };

  // Update renderActiveSection to use the mapped data
  const renderActiveSection = () => {
    // Map the data for components
    const mappedData = mapDataForComponents(financialData);
    
    // Log information about what's being rendered
    console.log(`Rendering ${activeSection} section with data:`, {
      hasCashFlow: !!mappedData?.cashFlow,
      hasDailyData: !!(mappedData?.cashFlow?.daily?.length),
      hasWeeklyData: !!(mappedData?.cashFlow?.weekly?.length),
      hasMonthlyData: !!(mappedData?.cashFlow?.monthly?.length)
    });
    
    switch (activeSection) {
      case 'overview':
        return (
          <>
            {/* Main Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-blue-500 w-full"></div>
                <CardContent className="p-6">
                  <h3 className="text-sm font-normal text-gray-500 mb-1">Current Balance</h3>
                  <div className="text-2xl font-medium text-gray-900">
                    {formatCurrency(mappedData?.basicMetrics?.currentBalance || sampleFinancialMetrics.currentBalance)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {mappedData?.basicMetrics?.runway?.toFixed(1) || sampleFinancialMetrics.runway} months runway
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-blue-500 w-full"></div>
                <CardContent className="p-6">
                  <h3 className="text-sm font-normal text-gray-500 mb-1">Net Income (Monthly)</h3>
                  <div className="text-2xl font-medium text-gray-900">
                    {formatCurrency(mappedData?.basicMetrics?.netMonth || sampleFinancialMetrics.netMonth)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(mappedData?.basicMetrics?.totalIncome || 0) > (mappedData?.basicMetrics?.totalExpenses || 0) 
                      ? 'Profitable' 
                      : 'Loss-making'} this month
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-blue-500 w-full"></div>
                <CardContent className="p-6">
                  <h3 className="text-sm font-normal text-gray-500 mb-1">Total Income</h3>
                  <div className="text-2xl font-medium text-gray-900">
                    {formatCurrency(mappedData?.basicMetrics?.totalIncome || sampleFinancialMetrics.totalIncome)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-gray-700">
                      {(mappedData?.basicMetrics?.previousPeriodIncomeChange || 0) >= 0 ? '+' : ''}
                      {(mappedData?.basicMetrics?.previousPeriodIncomeChange || sampleFinancialMetrics.previousPeriodIncomeChange).toFixed(1)}%
                    </span> from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-blue-500 w-full"></div>
                <CardContent className="p-6">
                  <h3 className="text-sm font-normal text-gray-500 mb-1">Total Expenses</h3>
                  <div className="text-2xl font-medium text-gray-900">
                    {formatCurrency(mappedData?.basicMetrics?.totalExpenses || sampleFinancialMetrics.totalExpenses)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className="text-gray-700">
                      {(mappedData?.basicMetrics?.previousPeriodExpenseChange || 0) >= 0 ? '+' : ''}
                      {(mappedData?.basicMetrics?.previousPeriodExpenseChange || sampleFinancialMetrics.previousPeriodExpenseChange).toFixed(1)}%
                    </span> from last month
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Cash Flow Overview and Connect Bank */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-8">
              <div className="xl:col-span-2">
                <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                  <div className="h-1 bg-blue-500 w-full"></div>
                  <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                    <CardTitle className="text-base font-medium text-gray-800">Cash Flow</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="overflow-hidden">
                      <CashFlowOverview
                        dailyData={mappedData?.cashFlow?.daily?.length ? mappedData.cashFlow.daily : sampleDailyCashFlow}
                        weeklyData={mappedData?.cashFlow?.weekly?.length ? mappedData.cashFlow.weekly : sampleWeeklyCashFlow}
                        monthlyData={mappedData?.cashFlow?.monthly?.length ? mappedData.cashFlow.monthly : sampleMonthlyCashFlow}
                        currentBalance={mappedData?.basicMetrics?.currentBalance || sampleFinancialMetrics.currentBalance}
                        netToday={mappedData?.basicMetrics?.netToday || sampleFinancialMetrics.netToday}
                        netWeek={mappedData?.basicMetrics?.netWeek || sampleFinancialMetrics.netWeek}
                        netMonth={mappedData?.basicMetrics?.netMonth || sampleFinancialMetrics.netMonth}
                        burnRate={mappedData?.basicMetrics?.burnRate || sampleFinancialMetrics.burnRate}
                        runway={mappedData?.basicMetrics?.runway || sampleFinancialMetrics.runway}
                        formatCurrency={formatCurrency}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="xl:col-span-1">
                <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] h-full">
                  <div className="h-1 bg-blue-500 w-full"></div>
                  <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                    <CardTitle className="text-base font-medium text-gray-800">Connect Bank</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="flex flex-col h-full justify-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Sync your financial data automatically by securely connecting your business bank accounts.
                      </p>
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => setConnectDialogOpen(true)}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        Connect Bank Account
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Smart Recommendations */}
            <div className="mt-8">
              <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
                <div className="h-1 bg-blue-500 w-full"></div>
                <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                  <CardTitle className="text-base font-medium text-gray-800">Financial Recommendations</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <SmartRecommendations
                    recommendations={mappedData?.recommendations || sampleRecommendations as SmartRecommendationsProps['recommendations']}
                    onDismissRecommendation={handleDismissRecommendation}
                    formatCurrency={formatCurrency}
                  />
                </CardContent>
              </Card>
            </div>
          </>
        );
      
      case 'expenses':
        return (
          <>
            <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
              <div className="h-1 bg-blue-500 w-full"></div>
              <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                <CardTitle className="text-base font-medium text-gray-800">Expense Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <ExpenseBreakdown
                  expenses={mappedData?.expenses?.categories || sampleExpenseCategories as ExpenseBreakdownProps['expenses']}
                  detailedExpenses={mappedData?.mappedDetailedExpenses || sampleDetailedExpenses as ExpenseBreakdownProps['detailedExpenses']}
                  totalIncome={mappedData?.basicMetrics?.totalIncome || sampleFinancialMetrics.totalIncome}
                  totalExpenses={mappedData?.basicMetrics?.totalExpenses || sampleFinancialMetrics.totalExpenses}
                  previousPeriodIncomeChange={mappedData?.basicMetrics?.previousPeriodIncomeChange || sampleFinancialMetrics.previousPeriodIncomeChange}
                  previousPeriodExpenseChange={mappedData?.basicMetrics?.previousPeriodExpenseChange || sampleFinancialMetrics.previousPeriodExpenseChange}
                  formatCurrency={formatCurrency}
                />
              </CardContent>
            </Card>

            <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)] mt-6">
              <div className="h-1 bg-blue-500 w-full"></div>
              <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
                <CardTitle className="text-base font-medium text-gray-800">Top Vendors & Customers</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <TopVendorsCustomers
                  topVendors={mappedData?.vendors?.top || sampleTopVendors as TopVendorsCustomersProps['topVendors']}
                  topCustomers={mappedData?.customers?.top || sampleTopCustomers as TopVendorsCustomersProps['topCustomers']}
                  formatCurrency={formatCurrency}
                />
              </CardContent>
            </Card>
          </>
        );
        
      case 'benchmarks':
        return (
          <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <div className="h-1 bg-blue-500 w-full"></div>
            <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
              <CardTitle className="text-base font-medium text-gray-800">Industry Benchmarks</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <BenchmarkComparison 
                metrics={mappedData?.benchmarks?.metrics || sampleBenchmarkMetrics as BenchmarkComparisonProps['metrics']}
                industryName={mappedData?.benchmarks?.industryName || "Café & Restaurant"}
                businessSizeRange={mappedData?.benchmarks?.businessSizeRange || "$200K-$500K"}
                dataSource={mappedData?.benchmarks?.dataSource || "Australian Tax Office industry benchmarks"}
                lastUpdated={mappedData?.benchmarks?.lastUpdated || "July 2023"}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>
        );
        
      case 'transactions':
        return (
          <Card className="bg-white border-0 rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-[0_4px_12px_rgba(0,0,0,0.05)]">
            <div className="h-1 bg-blue-500 w-full"></div>
            <CardHeader className="border-b border-gray-100 py-5 px-6 bg-gray-50">
              <CardTitle className="text-base font-medium text-gray-800">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <TransactionList
                transactions={mappedData?.transactions || sampleTransactions as TransactionListProps['transactions']}
                formatCurrency={formatCurrency}
              />
            </CardContent>
          </Card>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      <div className="p-6">
        {/* Header with Last Updated and Settings */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Insights</h1>
            <p className="text-gray-500 text-sm mt-1">
              {error ? 
                <span className="text-red-500">Error: {error}</span> : 
                `Last updated: ${lastUpdated || new Date().toLocaleString()}`
              }
            </p>
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            <Select 
              defaultValue={selectedCurrency}
              onValueChange={(value) => setSelectedCurrency(value)}
            >
              <SelectTrigger className="w-[120px] border-0 ring-1 ring-gray-200 bg-white shadow-sm rounded-xl">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Currencies</SelectLabel>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                  <SelectItem value="AUD">AUD ($)</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              className="border-0 ring-1 ring-gray-200 bg-white text-gray-700 shadow-sm rounded-xl"
              onClick={refreshFinancialData}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
            
            <Button variant="ghost" size="icon" className="text-gray-500">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-100 mb-8">
          <nav className="flex space-x-8 -mb-px">
            <button
              onClick={() => setActiveSection('overview')}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeSection === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveSection('expenses')}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeSection === 'expenses'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveSection('benchmarks')}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeSection === 'benchmarks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Benchmarks
            </button>
            <button
              onClick={() => setActiveSection('transactions')}
              className={`py-4 px-1 border-b-2 text-sm font-medium ${
                activeSection === 'transactions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Transactions
            </button>
          </nav>
        </div>
        
        {/* Render the active section */}
        {renderActiveSection()}
      </div>
      
      {/* Bank Connection Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Connect Bank Account</DialogTitle>
            <DialogDescription>
              Enter your details to securely connect your bank account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">
                First Name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                value={bankConnectForm.firstName}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={bankConnectForm.email}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobile" className="text-right">
                Mobile
              </Label>
              <Input
                id="mobile"
                name="mobile"
                value={bankConnectForm.mobile}
                onChange={handleFormChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnectBank}
              disabled={connectBankLoading}
            >
              {connectBankLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 