import { useEffect, useState } from 'react'
import { 
  collection, 
  getDocs, 
  query,
  getDoc,
  doc as firestoreDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'

interface Customer {
  customerId: string
  fullName: string
  pointsBalance: number
  lifetimeTransactionCount: number
  totalLifetimeSpend: number
  lastTransactionDate: any
  firstTransactionDate: any
  daysSinceFirstPurchase: number
  daysSinceLastVisit: number
  highestTransactionAmount: number
  membershipTier: string | null
  redemptionCount: number | null
  profileData?: {
    profilePictureUrl?: string
    shareProfileWithMerchants?: boolean
  }
}

export function useCustomers() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCustomers() {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      try {
        const customersRef = collection(db, 'merchants', user.uid, 'customers')
        const customersSnap = await getDocs(query(customersRef))
        
        const customersPromises = customersSnap.docs.map(async (doc) => {
          const data = doc.data()
          
          // Fetch customer profile data
          const profileRef = firestoreDoc(db, 'customers', doc.id)
          const profileSnap = await getDoc(profileRef)
          const profileData = profileSnap.exists() ? profileSnap.data() : undefined

          return {
            customerId: doc.id,
            fullName: data.fullName || 'Unknown Customer',
            pointsBalance: data.pointsBalance || 0,
            lifetimeTransactionCount: data.lifetimeTransactionCount || 0,
            totalLifetimeSpend: data.totalLifetimeSpend || 0,
            lastTransactionDate: data.lastTransactionDate || null,
            firstTransactionDate: data.firstTransactionDate || null,
            daysSinceFirstPurchase: data.daysSinceFirstPurchase || 0,
            daysSinceLastVisit: data.daysSinceLastVisit || 0,
            highestTransactionAmount: data.highestTransactionAmount || 0,
            membershipTier: data.membershipTier || null,
            redemptionCount: data.redemptionCount || 0,
            profileData: profileData ? {
              profilePictureUrl: profileData.profilePictureUrl,
              shareProfileWithMerchants: profileData.shareProfileWithMerchants
            } : undefined
          }
        })

        const customersData = await Promise.all(customersPromises)
        console.log('Fetched customers:', customersData)
        setCustomers(customersData)
      } catch (error) {
        console.error('Error fetching customers:', error)
        setCustomers([])
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [user?.uid])

  return { customers, loading }
} 