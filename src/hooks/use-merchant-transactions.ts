import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'

interface MerchantTransaction {
  transactionId: string
  actualcreatedAt: any
  amount: number
  createdAt: any
  customerId: string
  day: string
  merchantId: string
  merchantName: string
  status: 'completed' | 'pending' | 'cancelled'
  type: 'purchase' | 'refund' | 'adjustment'
  customerProfile?: {
    profilePictureUrl?: string
    shareProfileWithMerchants?: boolean
    fullName?: string
    pointsBalance?: number
  }
}

interface MerchantRedemption {
  redemptionId: string
  actualcreatedAt: any
  customerId: string
  rewardName: string
  pointsUsed: number
  status: 'successful' | 'pending' | 'failed'
  customerProfile?: {
    profilePictureUrl?: string
    shareProfileWithMerchants?: boolean
    fullName?: string
    pointsBalance?: number
  }
}

type ActivityItem = (MerchantTransaction | MerchantRedemption) & {
  activityType: 'transaction' | 'redemption'
}

export function useMerchantTransactions(limitCount: number = 5) {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      if (!user?.uid) return

      try {
        // Fetch transactions
        const transactionsRef = collection(db, `merchants/${user.uid}/transactions`)
        const transactionsQuery = query(
          transactionsRef,
          orderBy('actualcreatedAt', 'desc'),
          limit(limitCount)
        )
        const transactionsSnap = await getDocs(transactionsQuery)
        
        // Fetch redemptions
        const redemptionsRef = collection(db, `merchants/${user.uid}/redemptions`)
        const redemptionsQuery = query(
          redemptionsRef,
          orderBy('actualcreatedAt', 'desc'),
          limit(limitCount)
        )
        const redemptionsSnap = await getDocs(redemptionsQuery)

        // Process transactions
        const transactionPromises = transactionsSnap.docs.map(async (docSnap) => {
          const transaction = {
            transactionId: docSnap.id,
            ...docSnap.data(),
            activityType: 'transaction' as const
          }

          // Fetch customer data
          const customerRef = doc(db, 'customers', transaction.customerId)
          const customerSnap = await getDoc(customerRef)
          
          const merchantCustomerRef = doc(db, `merchants/${user.uid}/customers`, transaction.customerId)
          const merchantCustomerSnap = await getDoc(merchantCustomerRef)
          
          if (customerSnap.exists()) {
            const customerData = customerSnap.data()
            transaction.customerProfile = {
              profilePictureUrl: customerData.profilePictureUrl,
              shareProfileWithMerchants: customerData.shareProfileWithMerchants,
              fullName: customerData.fullName,
              pointsBalance: merchantCustomerSnap.exists() ? merchantCustomerSnap.data().pointsBalance : 0
            }
          }

          return transaction
        })

        // Process redemptions
        const redemptionPromises = redemptionsSnap.docs.map(async (docSnap) => {
          const redemption = {
            redemptionId: docSnap.id,
            ...docSnap.data(),
            activityType: 'redemption' as const
          }

          // Fetch customer data
          const customerRef = doc(db, 'customers', redemption.customerId)
          const customerSnap = await getDoc(customerRef)
          
          const merchantCustomerRef = doc(db, `merchants/${user.uid}/customers`, redemption.customerId)
          const merchantCustomerSnap = await getDoc(merchantCustomerRef)
          
          if (customerSnap.exists()) {
            const customerData = customerSnap.data()
            redemption.customerProfile = {
              profilePictureUrl: customerData.profilePictureUrl,
              shareProfileWithMerchants: customerData.shareProfileWithMerchants,
              fullName: customerData.fullName,
              pointsBalance: merchantCustomerSnap.exists() ? merchantCustomerSnap.data().pointsBalance : 0
            }
          }

          return redemption
        })

        // Combine and sort activities
        const allActivities = [
          ...await Promise.all(transactionPromises),
          ...await Promise.all(redemptionPromises)
        ].sort((a, b) => b.actualcreatedAt - a.actualcreatedAt)
        .slice(0, limitCount)

        setActivities(allActivities)
      } catch (error) {
        console.error('Error fetching activities:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [user?.uid, limitCount])

  return { activities, loading }
} 