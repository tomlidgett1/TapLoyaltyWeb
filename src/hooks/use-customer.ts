import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { useAuth } from '@/contexts/auth-context'

export interface CustomerTransaction {
  id: string
  type: string
  amount: number
  createdAt: any
  status: string
  day: string
}

export interface CustomerProfile {
  fullName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  birthdate?: any
  joinDate: any
  pointsBalance: number
  totalLifetimeSpend: number
  lifetimeTransactionCount: number
  lastTransactionDate: any
  membershipTier?: string
  notes?: string
  profileData?: {
    profilePictureUrl?: string
    shareProfileWithMerchants?: boolean
  }
}

export function useCustomer(customerId: string) {
  const { user } = useAuth()
  const [customer, setCustomer] = useState<CustomerProfile | null>(null)
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!user?.uid || !customerId) return
      
      try {
        setLoading(true)
        
        // Fetch customer profile
        const customerRef = doc(db, 'merchants', user.uid, 'customers', customerId)
        const customerSnap = await getDoc(customerRef)
        
        if (!customerSnap.exists()) {
          setError('Customer not found')
          return
        }
        
        const customerData = customerSnap.data() as CustomerProfile
        setCustomer({
          ...customerData,
          fullName: customerData.fullName || 'Unnamed Customer'
        })
        
        // Fetch customer transactions
        const transactionsRef = collection(db, 'merchants', user.uid, 'transactions')
        const transactionsQuery = query(
          transactionsRef,
          where('customerId', '==', customerId),
          orderBy('createdAt', 'desc'),
          limit(50)
        )
        
        const transactionsSnap = await getDocs(transactionsQuery)
        const transactionsData: CustomerTransaction[] = []
        
        transactionsSnap.forEach((doc) => {
          transactionsData.push({
            id: doc.id,
            ...doc.data() as Omit<CustomerTransaction, 'id'>
          })
        })
        
        setTransactions(transactionsData)
      } catch (err) {
        console.error('Error fetching customer:', err)
        setError('Failed to load customer data')
      } finally {
        setLoading(false)
      }
    }
    
    fetchCustomer()
  }, [user, customerId])

  return { customer, transactions, loading, error }
} 