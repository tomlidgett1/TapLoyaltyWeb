import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Clock, Users, AlertCircle } from "lucide-react"
import Image from "next/image"

interface RewardTemplate {
  id: string
  name: string
  description: string
  category: string
  pointsCost: string
  icon: any
  tags: string[]
  type: string
  voucherAmount: string
  rewardVisibility: string
  isActive: boolean
  conditions: {
    useTransactionRequirements: boolean
    minimumTransactions: string
    maximumTransactions: string
    useSpendingRequirements: boolean
    minimumLifetimeSpend: string
    minimumPointsBalance: string
    useTimeRequirements: boolean
    daysSinceJoined: string
    daysSinceLastVisit: string
    membershipLevel: string
    newCustomer: boolean
  }
  limitations: {
    totalRedemptionLimit: string
    perCustomerLimit: string
    useTimeRestrictions: boolean
    startTime: string
    endTime: string
    dayRestrictions: string[]
  }
}

interface RewardDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  reward: RewardTemplate
  onEdit: () => void
  onCreate: () => void
}

const formatConditionKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
}

export function RewardDetailsDialog({
  isOpen,
  onClose,
  reward,
  onEdit,
  onCreate
}: RewardDetailsDialogProps) {
  // Filter active conditions
  const activeConditions = Object.entries(reward.conditions).filter(([key, value]) => {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') return value.length > 0
    return false
  })

  // Filter active limitations
  const activeLimitations = Object.entries(reward.limitations).filter(([key, value]) => {
    if (typeof value === 'boolean') return value
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.length > 0
    return false
  })

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Gift className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <DialogTitle>{reward.name}</DialogTitle>
              <DialogDescription>{reward.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {reward.tags.map((tag: string) => (
              <Badge 
                key={tag}
                variant="secondary" 
                className="bg-gray-100 text-gray-600"
              >
                {tag}
              </Badge>
            ))}
          </div>

          {/* Points Cost */}
          <div className="flex items-center gap-2 text-sm">
            <Gift className="h-4 w-4 text-blue-500" />
            <span>
              {reward.pointsCost === "0" ? (
                <span className="text-green-600 font-medium">Free Reward</span>
              ) : (
                <span>{reward.pointsCost} points required</span>
              )}
            </span>
          </div>

          {/* Only show Conditions section if there are active conditions */}
          {activeConditions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Conditions
              </h3>
              <div className="grid gap-2 text-sm">
                {activeConditions.map(([key, value]) => (
                  <div 
                    key={key}
                    className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-md"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>{formatConditionKey(key)}: {
                      typeof value === 'boolean' ? 'Yes' : value
                    }</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Only show Limitations section if there are active limitations */}
          {activeLimitations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Limitations
              </h3>
              <div className="grid gap-2 text-sm">
                {activeLimitations.map(([key, value]) => (
                  <div 
                    key={key}
                    className="flex items-center gap-2 bg-red-50/50 p-2 rounded-md"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span>{formatConditionKey(key)}: {
                      Array.isArray(value) ? value.join(', ') :
                      typeof value === 'boolean' ? 'Yes' : 
                      value
                    }</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4">
            {/* Tap Loyalty branding */}
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#007AFF]">Tap</span>
              <span className="text-black">Loyalty</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onEdit}>
                Edit Template
              </Button>
              <Button 
                className="bg-[#007AFF] hover:bg-[#0063CC] text-white"
                onClick={onCreate}
              >
                Use Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 