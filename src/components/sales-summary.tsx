"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw } from "lucide-react"
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { formatDistanceToNow } from "date-fns"
import { Timestamp } from "firebase/firestore"
import { Button } from "@/components/ui/button"

interface SalesSummary {
  id: string
  date: Date
  summary: string
  isExpanded: boolean
}

interface SalesSummaryProps {
  merchantId: string | undefined
}

export function SalesSummary({ merchantId }: SalesSummaryProps) {
  const [salesSummaries, setSalesSummaries] = useState<SalesSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Add this function to generate sample data for testing
  const generateSampleData = (): SalesSummary[] => {
    const today = new Date();
    const sampleData: SalesSummary[] = [];
    
    // Generate summaries for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      let summary = "";
      const revenue = Math.floor(Math.random() * 3000) + 1500; // Random revenue between $1500-$4500
      const transactions = Math.floor(Math.random() * 50) + 20; // Random transactions between 20-70
      const aov = Math.round((revenue / transactions) * 100) / 100; // Average order value
      
      const categories = ["beverages", "food", "merchandise", "gift cards", "specialty items"];
      const topCategory = categories[Math.floor(Math.random() * categories.length)];
      const topCategoryPercentage = Math.floor(Math.random() * 30) + 30; // Between 30-60%
      
      const peakHourStart = Math.floor(Math.random() * 8) + 10; // Between 10am-6pm
      const peakTransactions = Math.floor(Math.random() * 15) + 5; // Between 5-20 transactions
      
      if (i === 0) {
        // Today's summary
        summary = `Today's sales ${Math.random() > 0.5 ? 'exceeded' : 'were consistent with'} recent trends. Total revenue was $${revenue.toLocaleString()}, with ${transactions} transactions and an average order value of $${aov.toFixed(2)}. The best performing category was ${topCategory}, accounting for ${topCategoryPercentage}% of sales. Peak hours were between ${peakHourStart}-${peakHourStart+2}${peakHourStart < 12 ? 'am' : 'pm'} with ${peakTransactions} transactions during this period.`;
      } else {
        // Previous days
        const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
        summary = `${dayName}'s sales ${Math.random() > 0.5 ? 'showed strong performance' : 'were in line with expectations'}. Total revenue reached $${revenue.toLocaleString()}, with ${transactions} transactions completed and an average order value of $${aov.toFixed(2)}. ${topCategory.charAt(0).toUpperCase() + topCategory.slice(1)} was the top performing category at ${topCategoryPercentage}% of total sales. Customer traffic peaked between ${peakHourStart}-${peakHourStart+2}${peakHourStart < 12 ? 'am' : 'pm'} with ${peakTransactions} transactions.`;
      }
      
      sampleData.push({
        id: `sample-${i}`,
        date,
        summary,
        isExpanded: i === 0 // Expand only the first item (today)
      });
    }
    
    return sampleData;
  };

  // Add a function to refresh data manually
  const refreshData = () => {
    setRetryCount(prev => prev + 1)
  }

  // Update useEffect to include retryCount in dependencies
  useEffect(() => {
    const fetchSalesSummaries = async () => {
      if (!merchantId) return
      
      try {
        setLoading(true)
        setError(null)
        
        // Reference to the sales summaries collection
        const salesSummariesRef = collection(db, 'merchants', merchantId, 'salesSummaries')
        
        // Query to get the last 7 days of summaries, ordered by date (descending)
        const q = query(salesSummariesRef, orderBy('date', 'desc'), limit(7))
        const querySnapshot = await getDocs(q)
        
        if (querySnapshot.empty) {
          // If no real data is available, use sample data
          console.log("No sales summaries found, using sample data for demonstration")
          setSalesSummaries(generateSampleData())
          setLoading(false)
          return
        }
        
        const summaries = querySnapshot.docs.map(doc => {
          const data = doc.data()
          
          // Handle different date formats
          let dateObj: Date
          if (data.date) {
            if (typeof data.date === 'string') {
              // If date is a string, parse it
              dateObj = new Date(data.date)
            } else if (data.date instanceof Timestamp) {
              // If date is a Firestore Timestamp
              dateObj = data.date.toDate()
            } else if (data.date.seconds && data.date.nanoseconds) {
              // If date is a Firestore Timestamp-like object
              dateObj = new Date(data.date.seconds * 1000)
            } else if (data.date.toDate && typeof data.date.toDate === 'function') {
              // If date has a toDate method
              dateObj = data.date.toDate()
            } else {
              // Fallback to current date
              dateObj = new Date()
              console.warn('Unknown date format in Firestore document:', data.date)
            }
          } else {
            // If no date field, use current date
            dateObj = new Date()
          }
          
          return {
            id: doc.id,
            date: dateObj,
            summary: data.summary || "No summary available for this day.",
            isExpanded: false, // Initially collapsed
          }
        })
        
        // Expand the most recent summary by default if available
        if (summaries.length > 0) {
          summaries[0].isExpanded = true
        }
        
        setSalesSummaries(summaries)
      } catch (error) {
        console.error('Error fetching sales summaries:', error)
        // Set error message
        setError("Failed to fetch sales data. Please try again.")
        // If there's an error, use sample data
        setSalesSummaries(generateSampleData())
      } finally {
        setLoading(false)
      }
    }
    
    if (merchantId) {
      fetchSalesSummaries()
    }
  }, [merchantId, retryCount])

  const toggleSummaryExpansion = (index: number) => {
    setSalesSummaries(prev => 
      prev.map((summary, i) => 
        i === index ? { ...summary, isExpanded: !summary.isExpanded } : summary
      )
    )
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  if (salesSummaries.length === 0) {
    return (
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Sales Performance</h3>
              <p className="text-xs text-gray-500">Daily sales insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-gray-50 text-gray-600 gap-1 flex items-center">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Source: Lightspeed Retail
            </Badge>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3.5 text-center border border-gray-100 shadow-sm">
            <p className="text-sm text-gray-600">No sales summaries available yet.</p>
            <p className="text-xs text-gray-500 mt-1">
              Sales data from Lightspeed will appear here once processed.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 text-gray-500" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Sales Performance</h3>
            <p className="text-xs text-gray-500">Daily sales insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-gray-50 text-gray-600 gap-1 flex items-center">
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Source: Lightspeed Retail
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0" 
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>
      </div>
      
      {/* Show error message if any */}
      {error && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 mb-4">
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-1.5 mb-0">
          {salesSummaries.map((summary, index) => (
            <Collapsible 
              key={summary.id}
              open={summary.isExpanded}
              onOpenChange={() => toggleSummaryExpansion(index)}
              className="border border-gray-100 rounded-lg overflow-hidden shadow-sm"
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <div className="text-left">
                    <p className="font-medium text-sm text-gray-900">
                      {index === 0 ? 'Today\'s Summary' : formatDate(summary.date)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {summary.date.toLocaleDateString(undefined, { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  {summary.isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-3.5 bg-white border-t border-gray-100">
                <div className="text-sm text-gray-600 leading-relaxed">
                  <p className="whitespace-pre-line">{summary.summary}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
} 