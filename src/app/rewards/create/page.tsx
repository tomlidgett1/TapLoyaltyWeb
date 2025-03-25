"use client"

import { useSearchParams, useRouter } from 'next/navigation'
import { CreateRewardDialog } from '@/components/create-reward-dialog'

export default function CreateRewardPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const customerId = searchParams.get('customerId')
  const customerName = searchParams.get('customerName')
  
  return (
    <CreateRewardDialog 
      open={true}
      onOpenChange={(open) => {
        if (!open) router.push('/rewards')
      }}
      customerId={customerId || undefined}
      customerName={customerName ? decodeURIComponent(customerName) : undefined}
    />
  )
} 