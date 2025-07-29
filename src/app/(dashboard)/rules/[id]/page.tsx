"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Clock, DollarSign, Calendar, Users } from "lucide-react"
import { formatDate } from '@/lib/date-utils'

interface PointsRule {
  id: string
  name: string
  pointsmultiplier: number
  conditions?: Array<{
    type: string
    startTime?: any
    endTime?: any
    amount?: number
    days?: string[]
  }>
  createdAt: any
  merchantId: string
}

interface Transaction {
  id: string
  amount: number
  pointsEarned: number
  customerId: string
  customerName?: string
  createdAt: any
  ruleId: string
}

export default function RuleDetailsPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [rule, setRule] = useState<PointsRule | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRuleAndTransactions() {
      if (!user?.uid || !id) return

      try {
        setLoading(true)
        // Fetch rule details
        const ruleDoc = await getDoc(doc(db, 'merchants', user.uid, 'pointsRules', id as string))
        
        if (!ruleDoc.exists()) {
          setError('Rule not found')
          return
        }

        const ruleData = { id: ruleDoc.id, ...ruleDoc.data() } as PointsRule
        setRule(ruleData)

        // Fetch transactions that used this rule
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const q = query(transactionsRef, where('ruleId', '==', id))
        const transactionsSnapshot = await getDocs(q)
        
        const transactionsData = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[]
        
        setTransactions(transactionsData)
      } catch (error) {
        console.error('Error fetching rule details:', error)
        setError('Failed to load rule details')
      } finally {
        setLoading(false)
      }
    }

    fetchRuleAndTransactions()
  }, [id, user?.uid])

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (error || !rule) {
    return <div className="p-8 text-center text-red-500">{error}</div>
  }

  return (
    <div className="p-4">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-semibold">{rule.name}</h1>
            <Badge className="bg-green-50 text-green-700">
              Active
            </Badge>
          </div>
        </div>

        {/* Rule Details */}
        <Card className="p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-medium mb-4">Rule Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Points Multiplier</p>
                  <p className="text-lg font-medium">{rule.pointsmultiplier}x</p>
                </div>
                {rule.conditions?.find(c => c.type === 'minimumSpend') && (
                  <div>
                    <p className="text-sm text-gray-500">Minimum Spend</p>
                    <p className="text-lg font-medium">
                      ${rule.conditions.find(c => c.type === 'minimumSpend')?.amount}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Conditions */}
            {rule.conditions && rule.conditions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Conditions</h3>
                <div className="space-y-3">
                  {rule.conditions.map((condition, index) => (
                    <div key={index} className="flex items-center gap-2">
                      {condition.type === 'timeOfDay' && (
                        <>
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            Available from {formatDate(condition.startTime)} to {formatDate(condition.endTime)}
                          </span>
                        </>
                      )}
                      {condition.type === 'daysOfWeek' && (
                        <>
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            Available on {condition.days?.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Transactions Table */}
        <div>
          <h2 className="text-lg font-medium mb-4">Transactions</h2>
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-500">Customer</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">Amount</th>
                    <th className="text-right p-4 text-sm font-medium text-gray-500">Points Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(transaction => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="p-4 text-sm">{formatDate(transaction.createdAt)}</td>
                      <td className="p-4 text-sm">{transaction.customerName || 'Unknown Customer'}</td>
                      <td className="p-4 text-sm text-right">${transaction.amount.toFixed(2)}</td>
                      <td className="p-4 text-sm text-right">{transaction.pointsEarned}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-sm text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
} 