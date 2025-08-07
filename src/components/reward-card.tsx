import React, { useState, useEffect } from 'react'
import { Star, Globe, Sparkles, CreditCard, Loader2, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { db } from '@/lib/firebase'
import { doc, setDoc, collection, deleteDoc } from 'firebase/firestore'
import { CreateRewardPopup } from '@/components/create-reward-popup'

interface RewardData {
  rewardName?: string
  description?: string
  type?: string
  pin?: string
  pointsCost?: number
  isActive?: boolean
  rewardVisibility?: string
  voucherAmount?: number
  isIntroductoryReward?: boolean
  isNetworkReward?: boolean
  discountType?: string
  discountValue?: number
  minimumSpend?: number
  networkPointsCost?: number
  limitations?: Array<{
    type: string
    value: any
  }>
  conditions?: Array<{
    type: string
    value: any
  }>
  // Additional fields for editing
  rewardTypeDetails?: {
    type?: string
    discountValue?: number
    discountType?: string
    appliesTo?: string
    minimumPurchase?: number
    itemName?: string
    itemDescription?: string
    requiredPurchase?: string
    bonusItem?: string
    bundleDiscountType?: string
    bundleDiscountValue?: number
  }
  selectedCohorts?: string[]
  delayedVisibility?: any
  hasActivePeriod?: boolean
  activePeriod?: any
  rewardSummary?: string
  newcx?: boolean
  firstPurchaseRequired?: boolean
}

interface RewardCardProps {
  rewardData: RewardData
  message?: string
}

export function RewardCard({ rewardData, message }: RewardCardProps) {
  const { user } = useAuth()
  const [isCreating, setIsCreating] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createdRewardId, setCreatedRewardId] = useState<string | null>(null)
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false)

  const getRewardTypeDisplay = () => {
    if (rewardData.type === 'percentageDiscount') return 'Percentage Discount'
    if (rewardData.type === 'fixedDiscount') return 'Fixed Discount'
    if (rewardData.type === 'freeItem') return 'Free Item'
    if (rewardData.type === 'voucher') return 'Voucher'
    return rewardData.type || 'Gift'
  }

  // Show delete button 2 seconds after creation
  useEffect(() => {
    if (isCreated) {
      const timer = setTimeout(() => {
        setShowDelete(true)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isCreated])

  const createReward = async () => {
    if (!user?.uid || isCreating || isCreated) return

    setIsCreating(true)
    try {
      // Generate a unique reward ID
      const rewardId = `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Prepare the reward document data
      const rewardDocData = {
        ...rewardData,
        id: rewardId,
        merchantId: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        isActive: true,
        createdBy: 'ai_assistant',
        // Ensure required fields have defaults
        pointsCost: rewardData.pointsCost || 0,
        description: rewardData.description || '',
        type: rewardData.type || 'gift',
        rewardVisibility: rewardData.rewardVisibility || 'global'
      }

      // Create reward in both locations
      // 1. Top-level rewards collection
      await setDoc(doc(db, 'rewards', rewardId), rewardDocData)
      
      // 2. Merchant's rewards subcollection
      await setDoc(doc(db, 'merchants', user.uid, 'rewards', rewardId), rewardDocData)

      setIsCreated(true)
      setCreatedRewardId(rewardId)
      console.log('✅ Reward created successfully:', rewardId)
    } catch (error) {
      console.error('❌ Error creating reward:', error)
      // Could add toast notification here
    } finally {
      setIsCreating(false)
    }
  }

  const deleteReward = async () => {
    if (!user?.uid || !createdRewardId || isDeleting) return

    setIsDeleting(true)
    try {
      // Delete from both locations
      // 1. Top-level rewards collection
      await deleteDoc(doc(db, 'rewards', createdRewardId))
      
      // 2. Merchant's rewards subcollection
      await deleteDoc(doc(db, 'merchants', user.uid, 'rewards', createdRewardId))

      // Reset states
      setIsCreated(false)
      setShowDelete(false)
      setCreatedRewardId(null)
      console.log('✅ Reward deleted successfully:', createdRewardId)
    } catch (error) {
      console.error('❌ Error deleting reward:', error)
      // Could add toast notification here
    } finally {
      setIsDeleting(false)
    }
  }

  // Map reward data to the format expected by CreateRewardPopup
  const mapRewardDataForEdit = () => {
    return {
      rewardName: rewardData.rewardName || '',
      description: rewardData.description || '',
      pin: rewardData.pin || '',
      pointsCost: rewardData.pointsCost || 0,
      isActive: rewardData.isActive ?? true,
      rewardVisibility: rewardData.rewardVisibility === 'global' ? 'all' : rewardData.rewardVisibility || 'all',
      
      // Map reward type details
      rewardTypeDetails: {
        type: rewardData.type || rewardData.rewardTypeDetails?.type || '',
        discountValue: rewardData.discountValue || rewardData.rewardTypeDetails?.discountValue || 0,
        discountType: rewardData.discountType || rewardData.rewardTypeDetails?.discountType || '',
        appliesTo: rewardData.rewardTypeDetails?.appliesTo || '',
        minimumPurchase: rewardData.rewardTypeDetails?.minimumPurchase || 0,
        itemName: rewardData.rewardTypeDetails?.itemName || '',
        itemDescription: rewardData.rewardTypeDetails?.itemDescription || '',
        requiredPurchase: rewardData.rewardTypeDetails?.requiredPurchase || '',
        bonusItem: rewardData.rewardTypeDetails?.bonusItem || '',
        bundleDiscountType: rewardData.rewardTypeDetails?.bundleDiscountType || 'free',
        bundleDiscountValue: rewardData.rewardTypeDetails?.bundleDiscountValue || 0
      },
      
      // Map conditions array to the expected format
      conditions: rewardData.conditions || [],
      
      // Map limitations array to the expected format  
      limitations: rewardData.limitations || [],
      
      // Other fields
      newcx: rewardData.isIntroductoryReward || false,
      firstPurchaseRequired: rewardData.isIntroductoryReward || false,
      selectedCohorts: rewardData.selectedCohorts || [],
      delayedVisibility: rewardData.delayedVisibility || null,
      hasActivePeriod: rewardData.hasActivePeriod || false,
      activePeriod: rewardData.activePeriod || null,
      rewardSummary: rewardData.rewardSummary || ''
    }
  }

  return (
    <div className="my-4">
      {/* Match the exact style from demo-iphone.tsx */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 w-80">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {rewardData.rewardName || 'New Reward'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
              {rewardData.description || 'No description provided'}
            </p>
            
            {/* Additional details */}
            <div className="flex items-center gap-1 mt-1 flex-nowrap">
              <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                {getRewardTypeDisplay()}
              </span>
              {rewardData.pin && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap font-mono" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                    PIN: {rewardData.pin}
                  </span>
                </>
              )}
            </div>

            {/* Introductory reward indicator */}
            {rewardData.isIntroductoryReward && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-[6px] text-white font-bold">!</span>
                </div>
                <span className="text-[10px] text-gray-600 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  Welcome gift for new customers
                </span>
              </div>
            )}

            {/* Network reward indicator */}
            {rewardData.isNetworkReward && rewardData.minimumSpend && (
              <div className="flex items-center gap-1 mt-1 flex-nowrap">
                <span className="text-xs text-gray-700 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  ${rewardData.discountValue || '10'} Off
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500 whitespace-nowrap" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  Min. spend: ${rewardData.minimumSpend}
                </span>
  </div>
)} 
          </div>
          
          {/* Right side badge - matching demo-iphone.tsx logic */}
          <div 
            className={cn(
              "flex items-center justify-center rounded-md px-2 py-1 ml-3",
              rewardData.isNetworkReward
                ? "bg-gray-400 text-white"
                : rewardData.isIntroductoryReward
                  ? "bg-blue-500 text-white"
                  : (rewardData.type === 'voucher' || rewardData.voucherAmount)
                    ? "bg-orange-400 text-white"
                    : (rewardData.pointsCost === 0) 
                      ? "bg-green-500 text-white" 
                      : "bg-blue-500 text-white"
            )}
          >
            {rewardData.isNetworkReward ? (
              <>
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  {rewardData.networkPointsCost || rewardData.pointsCost || '100'}
                </span>
                <Globe className="w-3 h-3 ml-1" />
              </>
            ) : rewardData.isIntroductoryReward ? (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  Welcome Gift
                </span>
              </>
            ) : (rewardData.type === 'voucher' || rewardData.voucherAmount) ? (
              <>
                <CreditCard className="w-3 h-3 mr-1" />
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  ${rewardData.voucherAmount || '0'} voucher
                </span>
              </>
            ) : (rewardData.pointsCost === 0) ? (
              <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                Free
              </span>
            ) : (
              <>
                <span className="text-xs font-medium" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif' }}>
                  {rewardData.pointsCost || 0}
                </span>
                <Star className="w-3 h-3 ml-1 fill-white" />
              </>
            )}
                     </div>
         </div>
         
         {/* Action Buttons */}
         <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
           <div className="grid grid-cols-2 gap-2">
             <Button
               onClick={() => setIsEditPopupOpen(true)}
               variant="outline"
               className="h-8 text-xs font-medium rounded-md"
             >
               <Edit className="h-3 w-3 mr-1" />
               Edit
             </Button>
             
             <Button
               onClick={showDelete ? deleteReward : createReward}
               disabled={isCreating || (isCreated && !showDelete) || isDeleting}
               className={cn(
                 "h-8 text-xs font-medium rounded-md transition-all duration-200",
                 showDelete
                   ? "bg-red-500 hover:bg-red-600 text-white"
                   : isCreated 
                     ? "bg-green-500 hover:bg-green-500 text-white cursor-default"
                     : "bg-blue-500 hover:bg-blue-600 text-white"
               )}
             >
               {isDeleting ? (
                 <div className="flex items-center gap-1.5">
                   <Loader2 className="h-3 w-3 animate-spin" />
                   <span>Deleting...</span>
                 </div>
               ) : isCreating ? (
                 <div className="flex items-center gap-1.5">
                   <Loader2 className="h-3 w-3 animate-spin" />
                   <span>Creating...</span>
                 </div>
               ) : showDelete ? (
                 <div className="flex items-center gap-1.5">
                   <Trash2 className="h-3 w-3" />
                   <span>Delete</span>
                 </div>
               ) : isCreated ? (
                 <div className="flex items-center gap-1.5">
                   <span className="text-sm">✓</span>
                   <span>Created</span>
                 </div>
               ) : (
                 'Create'
               )}
             </Button>
           </div>
         </div>
       </div>
       
       {/* Edit Popup */}
       <CreateRewardPopup
         open={isEditPopupOpen}
         onOpenChange={setIsEditPopupOpen}
         defaultValues={mapRewardDataForEdit()}
         isEditing={true}
         rewardId={rewardData.rewardName} // Using rewardName as temp ID since we don't have the actual ID
       />
     </div>
   )
 } 