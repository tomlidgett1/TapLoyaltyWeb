import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'

interface Merchant {
  merchantId: string
  merchantName: string
  legalName: string
  email: string
  avatar?: string
  logoUrl?: string
}

export function useMerchant() {
  const { user } = useAuth()
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMerchant() {
      if (!user?.uid) return

      try {
        const merchantRef = doc(db, 'merchants', user.uid)
        const merchantSnap = await getDoc(merchantRef)

        if (merchantSnap.exists()) {
          setMerchant({
            merchantId: merchantSnap.id,
            ...merchantSnap.data(),
          } as Merchant)
        }
      } catch (error) {
        console.error('Error fetching merchant:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMerchant()
  }, [user?.uid])

  return { merchant, loading }
} 