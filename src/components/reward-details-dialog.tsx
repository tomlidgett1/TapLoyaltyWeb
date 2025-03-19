import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gift, Clock, Users, AlertCircle, DollarSign, Eye, ToggleLeft, KeyRound } from "lucide-react"
import Image from "next/image"
import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import { db, auth } from "@/lib/firebase"
import { collection, addDoc, doc, setDoc } from "firebase/firestore"
import { v4 as uuidv4 } from "uuid"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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

// Add a PIN dialog component
function PinDialog({ 
  isOpen, 
  onClose, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (pin: string) => void 
}) {
  const [pin, setPin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)
    onConfirm(pin)
    setIsSubmitting(false)
    setPin("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set Reward PIN</DialogTitle>
          <DialogDescription>
            Enter a 4-digit PIN for customers to use when redeeming this reward.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pin">Redemption PIN</Label>
            <Input
              id="pin"
              placeholder="Enter 4-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={4}
              pattern="[0-9]*"
              inputMode="numeric"
              className="text-center text-lg tracking-widest"
            />
            <p className="text-xs text-muted-foreground">
              Customers will need to provide this PIN when redeeming the reward.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={pin.length < 4 || isSubmitting}
            className="bg-[#007AFF] hover:bg-[#0063CC] text-white"
          >
            {isSubmitting ? "Creating..." : "Create Reward"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Update the createRewardFromTemplate function to include PIN
const createRewardFromTemplate = async (reward: RewardTemplate, userId: string, pin: string) => {
  try {
    const rewardId = uuidv4()
    const merchantId = userId
    const timestamp = new Date().toISOString()
    
    // Create a serializable reward object by removing non-serializable properties
    const { icon, ...serializableReward } = reward
    
    // Add additional fields including PIN
    const newReward = {
      ...serializableReward,
      id: rewardId,
      merchantId,
      pin,
      createdAt: timestamp,
      updatedAt: timestamp
    }
    
    // Add to rewards collection
    await setDoc(doc(db, "rewards", rewardId), newReward)
    
    // Add to merchants/rewards subcollection
    await setDoc(doc(db, `merchants/${merchantId}/rewards`, rewardId), newReward)
    
    return rewardId
  } catch (error) {
    console.error("Error creating reward:", error)
    throw error
  }
}

export function RewardDetailsDialog({
  isOpen,
  onClose,
  reward,
  onEdit,
  onCreate
}: RewardDetailsDialogProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const { toast } = useToast()
  
  // Handle opening PIN dialog
  const handleUseTemplate = () => {
    setIsPinDialogOpen(true)
  }
  
  // Handle create reward with PIN
  const handleCreateReward = async (pin: string) => {
    try {
      setIsCreating(true)
      
      const userId = auth.currentUser?.uid
      if (!userId) {
        toast({
          title: "Authentication error",
          description: "You must be logged in to create rewards",
          variant: "destructive"
        })
        return
      }
      
      const rewardId = await createRewardFromTemplate(reward, userId, pin)
      
      toast({
        title: "Reward created",
        description: "The reward has been added to your store",
        variant: "default"
      })
      
      // Close both dialogs
      setIsPinDialogOpen(false)
      onClose()
    } catch (error) {
      console.error("Error creating reward:", error)
      toast({
        title: "Error creating reward",
        description: "There was a problem creating your reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-md bg-blue-50 flex items-center justify-center">
                <Gift className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900">{reward.name}</DialogTitle>
                <DialogDescription className="text-sm mt-1 text-gray-600">{reward.description}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Basic Details Section */}
            <div className="bg-gray-50 rounded-md p-4 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Basic Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Points Cost:</span>
                  <span className="text-sm text-gray-600">
                    {reward.pointsCost === "0" ? (
                      <span className="text-green-600 font-medium">Free</span>
                    ) : (
                      <span>{reward.pointsCost} points</span>
                    )}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Voucher Amount:</span>
                  <span className="text-sm text-gray-600">${reward.voucherAmount}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <ToggleLeft className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className="text-sm">
                    {reward.isActive ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        Inactive
                      </Badge>
                    )}
                  </span>
                </div>
                
                {reward.conditions.membershipLevel && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">Membership:</span>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                      {reward.conditions.membershipLevel}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            
            {/* Tags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {reward.tags.map((tag: string) => (
                  <Badge 
                    key={tag}
                    variant="secondary" 
                    className="bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Conditions Section */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-800">Conditions</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Spending Requirements */}
                {reward.conditions.useSpendingRequirements && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500">Spending Requirements</h4>
                    {reward.conditions.minimumLifetimeSpend && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        <span>Minimum Lifetime Spend: ${reward.conditions.minimumLifetimeSpend}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Transaction Requirements */}
                {reward.conditions.useTransactionRequirements && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500">Transaction Requirements</h4>
                    {reward.conditions.minimumTransactions && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        <span>Minimum Transactions: {reward.conditions.minimumTransactions}</span>
                      </div>
                    )}
                    {reward.conditions.maximumTransactions && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        <span>Maximum Transactions: {reward.conditions.maximumTransactions}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Time Requirements */}
                {reward.conditions.useTimeRequirements && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500">Time Requirements</h4>
                    {reward.conditions.daysSinceJoined && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        <span>Days Since Joined: {reward.conditions.daysSinceJoined}</span>
                      </div>
                    )}
                    {reward.conditions.daysSinceLastVisit && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        <span>Days Since Last Visit: {reward.conditions.daysSinceLastVisit}</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Other Conditions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500">Other Conditions</h4>
                  {reward.conditions.minimumPointsBalance && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      <span>Minimum Points Balance: {reward.conditions.minimumPointsBalance}</span>
                    </div>
                  )}
                  {reward.conditions.newCustomer && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      <span>New Customers Only</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Limitations Section */}
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-gray-800">Limitations</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Redemption Limits */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500">Redemption Limits</h4>
                  {reward.limitations.totalRedemptionLimit && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                      <span>Total Redemption Limit: {reward.limitations.totalRedemptionLimit}</span>
                    </div>
                  )}
                  {reward.limitations.perCustomerLimit && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                      <span>Per Customer Limit: {reward.limitations.perCustomerLimit}</span>
                    </div>
                  )}
                </div>
                
                {/* Time Restrictions */}
                {reward.limitations.useTimeRestrictions && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-500">Time Restrictions</h4>
                    {reward.limitations.startTime && reward.limitations.endTime && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                        <span>Time of Day: {reward.limitations.startTime} - {reward.limitations.endTime}</span>
                      </div>
                    )}
                    {reward.limitations.dayRestrictions && reward.limitations.dayRestrictions.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-400"></div>
                        <span>Days of Week: {reward.limitations.dayRestrictions.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200">
              {/* Tap Loyalty branding */}
              <div className="flex items-center gap-1">
                <span className="font-bold text-[#007AFF]">Tap</span>
                <span className="text-black">Loyalty</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={onEdit} className="border-gray-200 text-gray-700 hover:bg-gray-50">
                  Edit Template
                </Button>
                <Button 
                  className="bg-[#007AFF] hover:bg-[#0063CC] text-white"
                  onClick={handleUseTemplate}
                  disabled={isCreating}
                >
                  Use Template
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* PIN Dialog */}
      <PinDialog 
        isOpen={isPinDialogOpen}
        onClose={() => setIsPinDialogOpen(false)}
        onConfirm={handleCreateReward}
      />
    </>
  )
} 