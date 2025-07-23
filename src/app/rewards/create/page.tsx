"use client"

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CreateRewardDialog } from '@/components/create-reward-dialog'

// Loading component for the Suspense boundary
function CreateRewardPageLoading() {
  return <div className="flex items-center justify-center h-screen">Loading...</div>;
}

// Component that uses useSearchParams
function CreateRewardPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const customerId = searchParams?.get('customerId')
  const customerName = searchParams?.get('customerName')
  
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

// Main component wrapped in Suspense
export default function CreateRewardPage() {
  return (
    <Suspense fallback={<CreateRewardPageLoading />}>
      <CreateRewardPageContent />
    </Suspense>
  )
} 