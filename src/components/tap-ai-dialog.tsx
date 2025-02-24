"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Dialog, 
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sparkles, Send, Plus, Settings, MessageSquare, ChevronDown, ChevronUp, HelpCircle, CheckCircle, Edit, MoreHorizontal, Pencil, Trash2, Gift, Repeat, Sparkles as SparklesIcon, DollarSign, Calendar, Clock, Users, Award, History, Timer, Wallet, BadgeCheck, CalendarRange, UserCheck, Ban, Mic, MicOff } from "lucide-react"
import { getAIResponse } from "@/lib/openai"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { 
  getOrCreateAssistant, 
  createThread, 
  addMessage, 
  runAssistant 
} from "@/lib/assistant"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, deleteDoc, writeBatch } from "firebase/firestore"
import { CreateRewardDialog } from "@/components/create-reward-dialog"
import { useCustomers } from '@/hooks/use-customers'
import { Command, CommandGroup, CommandItem } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"

interface Conversation {
  id: string
  threadId: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface RewardData {
  rewardName: string
  description: string
  programtype: 'voucher' | 'points' | 'discount'
  isActive: boolean
  pointsCost: number
  rewardVisibility: string
  voucherAmount: number
  delayedVisibility?: {
    type: string
    value: number
  }
  conditions: Array<{
    type: string
    amount?: number
    value?: number
  }>
  limitations: Array<{
    type: string
    value: number
  }>
}

function isJsonString(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch (e) {
    return false
  }
}

function RewardCard({ reward }: { reward: RewardData }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isUsed, setIsUsed] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const formatCondition = (condition: { type: string; amount?: number; value?: number | string }) => {
    switch (condition.type) {
      case 'minimumSpend':
        return `Minimum spend of $${condition.amount}`
      case 'minimumLifetimeSpend':
        return `Total lifetime spend of $${condition.value}`
      case 'minimumTransactions':
        return `Minimum ${condition.value} transactions`
      case 'maximumTransactions':
        return `Maximum ${condition.value} transactions`
      case 'minimumPointsBalance':
        return `Minimum ${condition.value} points balance`
      case 'membershipLevel':
        return `${condition.value} membership level required`
      case 'daysSinceJoined':
        return `Account age: ${condition.value} days`
      case 'daysSinceLastVisit':
        return `${condition.value} days since last visit`
      default:
        return condition.type
    }
  }

  const formatLimitation = (limitation: { 
    type: string; 
    value: number | string[] | { startTime?: string; endTime?: string; startDate?: string; endDate?: string } 
  }) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'totalRedemptionLimit':
        return `${limitation.value} total available`
      case 'daysOfWeek':
        return `Available on ${(limitation.value as string[]).join(', ')}`
      case 'timeOfDay':
        const timeValue = limitation.value as { startTime: string; endTime: string }
        return `Available ${timeValue.startTime} - ${timeValue.endTime}`
      case 'activePeriod':
        const dateValue = limitation.value as { startDate: string; endDate: string }
        return `Valid ${new Date(dateValue.startDate).toLocaleDateString()} - ${new Date(dateValue.endDate).toLocaleDateString()}`
      default:
        return `${limitation.type}: ${limitation.value}`
    }
  }

  const formatDelayedVisibility = (visibility: { type: string; value: number }) => {
    switch (visibility.type) {
      case 'totalLifetimeSpend':
        return `Visible after $${visibility.value} total spend`
      default:
        return `Visible after ${visibility.type}: ${visibility.value}`
    }
  }

  const createRewardData = {
    rewardName: reward.rewardName,
    description: reward.description,
    type: reward.programtype,
    rewardVisibility: reward.rewardVisibility,
    pin: "",
    pointsCost: reward.pointsCost,
    isActive: reward.isActive,
    delayedVisibility: !!reward.delayedVisibility,
    isTargeted: false,
    discountAmount: 0,
    itemName: "",
    voucherAmount: reward.voucherAmount,
    conditions: {
      newCustomer: false,
      minimumTransactions: 0,
      maximumTransactions: 0,
      daysSinceJoined: 0,
      daysSinceLastVisit: 0,
      minimumLifetimeSpend: reward.conditions.find(c => c.type === 'minimumSpend')?.amount || 0,
      minimumPointsBalance: 0,
      membershipLevel: ""
    },
    limitations: {
      totalRedemptionLimit: reward.limitations.find(l => l.type === 'totalRedemptionLimit')?.value || 0,
      perCustomerLimit: reward.limitations.find(l => l.type === 'customerLimit')?.value || 0,
      dayRestrictions: [],
      startTime: "",
      endTime: "",
      startDate: null,
      endDate: null
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditDialogOpen(true)
  }

  const handleUseTemplate = async (e: React.MouseEvent, reward: any) => {
    e.stopPropagation()
    
    if (!user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save rewards",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setSavingReward(reward)
    setPinDialogOpen(true)
  }

  const handleSaveWithPin = async (status: 'draft' | 'live') => {
    if (!pin.trim() || !savingReward || !user?.uid) return

    try {
      setSaving(true)
      const rewardId = Date.now().toString()
      
      const rewardData = {
        ...savingReward,
        pin: pin.trim(),
        createdAt: new Date().toISOString(),
        status: status,
        isActive: status === 'live',
        id: rewardId,
        merchantId: user.uid,
        updatedAt: new Date().toISOString()
      }

      // Save in all three locations
      const batch = writeBatch(db)

      // 1. merchants/merchantId/rewards
      const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId)
      batch.set(merchantRewardRef, rewardData)

      // 2. rewards/rewardId
      const globalRewardRef = doc(db, 'rewards', rewardId)
      batch.set(globalRewardRef, rewardData)

      // 3. merchants/merchantId/tapaiRewards
      const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId)
      batch.set(tapAiRewardRef, rewardData)

      // Commit all writes
      await batch.commit()

      toast({
        title: "Success",
        description: `Reward ${status === 'draft' ? 'saved as draft' : 'published live'}`,
      })
      setPinDialogOpen(false)
      setPin('')
      setSavingReward(null)
    } catch (error) {
      console.error('Error saving reward:', error)
      toast({
        title: "Error",
        description: `Failed to save reward: ${(error as Error).message}`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={cn(
        "border rounded-lg overflow-hidden bg-white shadow-sm transition-shadow w-full",
        isUsed ? "opacity-75" : "hover:shadow-md"
      )}>
        <div 
          className={cn(
            "p-4 flex items-start justify-between cursor-pointer hover:bg-gray-50"
          )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">{reward.rewardName}</h3>
            <div className="flex items-center gap-3">
                {isUsed ? (
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    Used
                  </span>
                ) : (
                  <>
              <span className="text-sm font-medium text-[#007AFF]">
                      {reward.pointsCost > 0 ? `${reward.pointsCost.toLocaleString()} points` : 'Free'}
              </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={handleEdit}
                    >
                      <Edit className="h-4 w-4 text-gray-500" />
                    </Button>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </>
              )}
            </div>
          </div>
            <p className="text-sm text-gray-600">{reward.description}</p>
        </div>
      </div>

      {isExpanded && (
          <div className="p-4 border-t bg-gray-50 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
                <p className="text-sm font-medium text-gray-500">Program Type</p>
                <p className="text-sm text-gray-900 capitalize">{reward.programtype}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Points Cost</p>
              <p className="text-sm font-semibold text-[#007AFF]">
                  {reward.pointsCost > 0 ? reward.pointsCost.toLocaleString() : 'Free'}
              </p>
            </div>
            </div>

            {reward.delayedVisibility && (
            <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Visibility Rule</p>
                <p className="text-sm text-gray-600">
                  {formatDelayedVisibility(reward.delayedVisibility)}
              </p>
            </div>
            )}

            {reward.conditions?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  Conditions
                  <div className="h-px flex-1 bg-gray-100"></div>
          </div>
                <div className="grid grid-cols-1 gap-2">
                  {reward.conditions.map((condition, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-blue-50/50 rounded-lg border border-blue-100/50"
                    >
                      {condition.type === 'minimumSpend' && <DollarSign className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumLifetimeSpend' && <History className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumTransactions' && <Repeat className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'maximumTransactions' && <Ban className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'minimumPointsBalance' && <Award className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'membershipLevel' && <BadgeCheck className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'daysSinceJoined' && <UserCheck className="h-4 w-4 text-[#007AFF]" />}
                      {condition.type === 'daysSinceLastVisit' && <Timer className="h-4 w-4 text-[#007AFF]" />}
                      <span className="text-sm text-gray-700">{formatCondition(condition)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reward.limitations?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                  <div className="h-px flex-1 bg-gray-100"></div>
                  Limitations
                  <div className="h-px flex-1 bg-gray-100"></div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {reward.limitations.map((limitation, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 bg-orange-50/50 rounded-lg border border-orange-100/50"
                    >
                      {limitation.type === 'customerLimit' && <Users className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'totalRedemptionLimit' && <Award className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'daysOfWeek' && <Calendar className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'timeOfDay' && <Clock className="h-4 w-4 text-orange-500" />}
                      {limitation.type === 'activePeriod' && <CalendarRange className="h-4 w-4 text-orange-500" />}
                      <span className="text-sm text-gray-700">{formatLimitation(limitation)}</span>
                    </div>
                  ))}
                </div>
            </div>
          )}

            {!isUsed && (
          <div className="flex gap-2">
          <Button
              onClick={(e) => handleUseTemplate(e, reward)}
              disabled={saving || isUsed}
              className="flex-1 bg-[#007AFF] hover:bg-[#0066CC] text-white"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </div>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                  Use Template
              </>
            )}
          </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1 border-gray-200 hover:bg-gray-50"
            >
              <Edit className="h-4 w-4 mr-2" />
              Customize
          </Button>
        </div>
      )}
    </div>
      )}
    </div>

      <CreateRewardDialog 
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        defaultValues={createRewardData}
      />
    </>
  )
}

function MessageContent({ 
  content, 
  user,
  setSavingReward,
  setPinDialogOpen,
  className
}: { 
  content: string
  user: any
  setSavingReward: (reward: any) => void
  setPinDialogOpen: (open: boolean) => void
  className?: string
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [expandedCards, setExpandedCards] = useState<number[]>([])
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null)
  
  const toggleCard = (index: number) => {
    setExpandedCards(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Add edit functionality if needed
  }

  const handleUseTemplate = async (e: React.MouseEvent, reward: any) => {
    e.stopPropagation()
    
    if (!user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to save rewards",
        variant: "destructive"
      })
      router.push('/login')
      return
    }

    setSavingReward(reward)
    setPinDialogOpen(true)
  }

  const formatCondition = (condition: { type: string; amount?: number; value?: number | string }) => {
    switch (condition.type) {
      case 'minimumSpend':
        return `Min spend $${condition.amount}`
      case 'minimumLifetimeSpend':
        return `Total spend $${condition.value}`
      case 'minimumTransactions':
        return `Min ${condition.value} transactions`
      case 'maximumTransactions':
        return `Max ${condition.value} transactions`
      case 'minimumPointsBalance':
        return `Min ${condition.value} points`
      case 'membershipLevel':
        return `${condition.value} level required`
      case 'daysSinceJoined':
        return `${condition.value} days since joining`
      case 'daysSinceLastVisit':
        return `${condition.value} days since visit`
      default:
        return condition.type
    }
  }

  const formatLimitation = (limitation: { 
    type: string; 
    value: number | string[] | { startTime?: string; endTime?: string; startDate?: string; endDate?: string } 
  }) => {
    switch (limitation.type) {
      case 'customerLimit':
        return `${limitation.value} per customer`
      case 'totalRedemptionLimit':
        return `${limitation.value} total available`
      case 'daysOfWeek':
        return `Valid on ${(limitation.value as string[]).join(', ')}`
      case 'timeOfDay':
        const timeValue = limitation.value as { startTime: string; endTime: string }
        return `${timeValue.startTime} - ${timeValue.endTime}`
      case 'activePeriod':
        const dateValue = limitation.value as { startDate: string; endDate: string }
        return `Valid ${new Date(dateValue.startDate).toLocaleDateString()} - ${new Date(dateValue.endDate).toLocaleDateString()}`
      default:
        return `${limitation.type}: ${limitation.value}`
    }
  }
  
  const findJSON = (text: string) => {
    try {
      const jsonRegex = /```json\s*(\{[\s\S]*?\}|\[[\s\S]*?\])\s*```|(\{[\s\S]*?\}|\[[\s\S]*?\])/g
      const matches = text.matchAll(jsonRegex)
      let allRewards = []

      for (const match of matches) {
        const jsonStr = (match[1] || match[2])
          .replace(/\/\/[^\n]*\n/g, '')
          .replace(/[\u0000-\u001F]+/g, '')
          .trim()

        try {
          const parsed = JSON.parse(jsonStr)
          if (Array.isArray(parsed)) {
            allRewards.push(...parsed.filter(item => item.rewardName))
          } else if (parsed && parsed.rewardName) {
            allRewards.push(parsed)
          }
        } catch (e) {
          continue
        }
      }
      
      return allRewards.length > 0 ? allRewards : null
    } catch (e) {
      console.log('JSON parsing failed:', e)
      return null
    }
  }

  const rewards = findJSON(content)
  
  if (rewards && rewards.length > 0) {
    const textContent = content
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '')
      .replace(/\{\s*"rewardName[\s\S]*?\}/g, '')
      .replace(/\s*\n{2,}/g, '\n')
      .replace(/^\s+|\s+$/g, '')
      .trim()
    
    return (
      <div className="space-y-6 animate-fadeIn">
        {textContent && (
          <div className="flex justify-start">
            <div className="rounded-lg px-3 py-2 max-w-[80%] bg-gray-50 shadow-sm">
              <p className="whitespace-pre-wrap leading-relaxed text-gray-700">{textContent}</p>
            </div>
          </div>
        )}
        <div className={cn(
          "grid gap-6",
          rewards.length === 1 ? "grid-cols-1 max-w-[75%]" : "grid-cols-2"
        )}>
          {rewards.map((reward, index) => (
            <div 
              key={index} 
              className={cn(
                "animate-slideIn bg-white rounded-xl border-2 border-[#007AFF]/10 overflow-hidden shadow-[0_2px_8px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_12px_-1px_rgba(0,0,0,0.1)] hover:border-[#007AFF]/20 transition-all duration-300",
                rewards.length === 1 ? "w-[500px]" : "w-[400px]"
              )}
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50/50 transition-colors duration-200"
                onClick={() => toggleCard(index)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {reward.rewardName}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-[#007AFF]">
                        Individual
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600">{reward.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-base font-semibold text-[#007AFF]">
                        {reward.pointsCost > 0 ? `${reward.pointsCost.toLocaleString()}pts` : 'Free'}
                      </div>
                    </div>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 text-gray-400 transition-transform duration-200",
                        expandedCards.includes(index) && "transform rotate-180"
                      )} 
                    />
                  </div>
                </div>
              </div>

              {expandedCards.includes(index) && (
                <>
                  <div className="px-6 pb-6 space-y-3 border-t border-gray-100">
                    {reward.conditions?.length > 0 && (
                      <div className="space-y-2 pt-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="h-px flex-1 bg-gray-100"></div>
                          Conditions
                          <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {reward.conditions.map((condition, i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-3 py-2 rounded-lg shadow-sm"
                            >
                              {condition.type === 'minimumSpend' && <DollarSign className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'minimumLifetimeSpend' && <Wallet className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'minimumTransactions' && <History className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'maximumTransactions' && <Ban className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'minimumPointsBalance' && <Award className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'membershipLevel' && <BadgeCheck className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'daysSinceJoined' && <UserCheck className="h-4 w-4 text-[#007AFF]" />}
                              {condition.type === 'daysSinceLastVisit' && <Timer className="h-4 w-4 text-[#007AFF]" />}
                              {formatCondition(condition)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reward.limitations?.length > 0 && (
                      <div className="space-y-2 pt-4">
                        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="h-px flex-1 bg-gray-100"></div>
                          Limitations
                          <div className="h-px flex-1 bg-gray-100"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {reward.limitations.map((limitation, i) => (
                            <div 
                              key={i}
                              className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-gray-100 px-3 py-2 rounded-lg shadow-sm"
                            >
                              {limitation.type === 'customerLimit' && <Users className="h-4 w-4 text-[#007AFF]" />}
                              {limitation.type === 'totalRedemptionLimit' && <Award className="h-4 w-4 text-[#007AFF]" />}
                              {limitation.type === 'daysOfWeek' && <Calendar className="h-4 w-4 text-[#007AFF]" />}
                              {limitation.type === 'timeOfDay' && <Clock className="h-4 w-4 text-[#007AFF]" />}
                              {limitation.type === 'activePeriod' && <CalendarRange className="h-4 w-4 text-[#007AFF]" />}
                              {formatLimitation(limitation)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-gray-50/75 border-t border-gray-200/75">
                    <div className="flex items-center justify-between gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-4 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 hover:text-[#007AFF] transition-colors duration-200 rounded-xl flex-1"
                        onClick={(e) => handleEdit(e)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Customize
                      </Button>
                      <Button
                        onClick={(e) => handleUseTemplate(e, reward)}
                        disabled={saving}
                        className="h-9 bg-[#007AFF] hover:bg-[#0066CC] text-white rounded-xl px-4 flex-1"
                      >
                        {saving ? (
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </div>
                        ) : (
                          <>Use Template</>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {isJsonString(content) ? (
        <div className="space-y-4">
          {JSON.parse(content).map((reward: any, index: number) => (
            <div 
              key={index} 
              className={cn(
                "border rounded-lg overflow-hidden bg-white shadow-sm transition-shadow hover:shadow-md",
                JSON.parse(content).length === 1 ? "w-[500px]" : "w-[400px]"
              )}
            >
              {/* ... rest of reward card content ... */}
      </div>
          ))}
        </div>
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed">{content}</p>
      )}
    </div>
  )
}

export function TapAiDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [assistant, setAssistant] = useState<any>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [merchantName, setMerchantName] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [mentionOpen, setMentionOpen] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const { customers, loading: customersLoading } = useCustomers()
  const inputRef = useRef<HTMLInputElement>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [mentionQuery, setMentionQuery] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(null)
  const [pinDialogOpen, setPinDialogOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [savingReward, setSavingReward] = useState<any>(null)

  const currentMessages = conversations.find(c => c.id === currentConversation)?.messages || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentMessages, loading])

  useEffect(() => {
    if (open && !assistant) {
      const initializeAssistant = async () => {
        try {
          const assistantData = await getOrCreateAssistant()
          setAssistant(assistantData)
        } catch (error) {
          console.error('Error initializing assistant:', error)
          toast({
            title: "Error",
            description: "Failed to initialize AI assistant. Please try again.",
            variant: "destructive"
          })
        }
      }

      initializeAssistant()
    }
  }, [open, assistant, toast])

  useEffect(() => {
    const loadSavedConversations = async () => {
      if (!user?.uid || !assistant) return

      try {
        const chatsRef = collection(db, 'merchants', user.uid, 'chats')
        const chatsSnap = await getDocs(query(chatsRef, orderBy('updatedAt', 'desc')))
        
        const savedConversations = chatsSnap.docs.map(doc => ({
          id: doc.id,
          threadId: doc.data().threadId,
          title: doc.data().title,
          messages: doc.data().messages || [],
          createdAt: doc.data().createdAt,
          updatedAt: doc.data().updatedAt
        })) as Conversation[]

        if (savedConversations.length > 0) {
          setConversations(savedConversations)
          setCurrentConversation(savedConversations[0].id)
        } else {
          // Create initial chat with welcome message
          const thread = await createThread()
          const newId = Date.now().toString()
          
          const welcomeMessage = merchantName 
            ? `Hi ${merchantName}! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?`
            : "Hi! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?"
          
          const newConversation: Conversation = {
            id: newId,
            threadId: thread.id,
            title: 'New chat',
            messages: [{
              role: 'assistant',
              content: welcomeMessage
            }],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          await setDoc(
            doc(db, 'merchants', user.uid, 'chats', newId),
            newConversation
          )
          
          setConversations([newConversation])
          setCurrentConversation(newId)
        }
        } catch (error) {
        console.error('Error loading conversations:', error)
          toast({
            title: "Error",
          description: "Failed to load conversations",
            variant: "destructive"
          })
        }
      }

    if (open && user?.uid && assistant) {
      loadSavedConversations()
    }
  }, [open, user?.uid, assistant, merchantName])

  useEffect(() => {
    const fetchMerchantName = async () => {
      if (user?.uid) {
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          if (merchantDoc.exists()) {
            const data = merchantDoc.data()
            const name = data.businessName || data.storeName || data.name || ''
            console.log('Fetched merchant name:', name)
            setMerchantName(name)
          }
        } catch (error) {
          console.error('Error fetching merchant name:', error)
        }
      }
    }
    
    fetchMerchantName()
  }, [user?.uid])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInput(value)
    
    const cursorPos = e.target.selectionStart || 0
    setCursorPosition(cursorPos)

    // Check for @ symbol and get the query text after it
    const lastAtSymbol = value.lastIndexOf('@', cursorPos)
    if (lastAtSymbol !== -1 && lastAtSymbol < cursorPos) {
      const query = value.slice(lastAtSymbol + 1, cursorPos)
      setMentionQuery(query)
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
    }
  }

  const handleCustomerSelect = (customer: { id: string; fullName: string }) => {
    if (!inputRef.current) return

    const beforeMention = input.slice(0, cursorPosition)
    const afterMention = input.slice(cursorPosition)
    
    const newValue = beforeMention.slice(0, -1) + `@${customer.fullName} ` + afterMention
    setInput(newValue)
    setMentionOpen(false)

    inputRef.current.focus()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !assistant || !currentConversation || !user?.uid) return

    const userMessage = input.trim()
    setInput('')
    setSelectedQuickAction(null)
    
    const conversation = conversations.find(c => c.id === currentConversation)
    if (!conversation) return

    const updatedMessages = [
      ...conversation.messages,
      { role: 'user', content: userMessage }
    ]

    // Update messages immediately to show user's message
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversation 
        ? {
            ...conv,
            messages: updatedMessages,
            updatedAt: new Date().toISOString()
          }
        : conv
    ))
    
    try {
    setLoading(true)
      const { response, threadId } = await addMessage(conversation.threadId, userMessage)
      
      if (threadId !== conversation.threadId) {
        conversation.threadId = threadId
      }

      const aiResponse = await runAssistant(assistant.id, threadId)
      
      const finalMessages = [
        ...updatedMessages,
        { role: 'assistant', content: aiResponse }
      ]

      const updatedConversation = {
        ...conversation,
        messages: finalMessages,
        updatedAt: new Date().toISOString()
      }

      await setDoc(
        doc(db, 'merchants', user.uid, 'chats', currentConversation),
        updatedConversation,
        { merge: true }
      )
      
      setConversations(prev => prev.map(conv =>
        conv.id === currentConversation
          ? updatedConversation
          : conv
      ))
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive"
      })
      console.error('AI chat error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenameConversation = async (convId: string, newTitle: string) => {
    if (!user?.uid) return

    try {
      const updatedConversation = conversations.find(c => c.id === convId)
      if (!updatedConversation) return

      const conversationRef = doc(db, 'merchants', user.uid, 'chats', convId)
      await setDoc(conversationRef, {
        ...updatedConversation,
        title: newTitle,
        updatedAt: new Date().toISOString()
      }, { merge: true })

      setConversations(prev => prev.map(conv =>
        conv.id === convId
          ? { ...conv, title: newTitle }
          : conv
      ))

      toast({
        title: "Success",
        description: "Conversation renamed successfully"
      })
    } catch (error) {
      console.error('Error renaming conversation:', error)
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive"
      })
    }
  }

  const handleDeleteConversation = async (convId: string) => {
    if (!user?.uid) return

    try {
      await deleteDoc(doc(db, 'merchants', user.uid, 'chats', convId))
      
      setConversations(prev => prev.filter(conv => conv.id !== convId))
      if (currentConversation === convId) {
        const remaining = conversations.filter(conv => conv.id !== convId)
        setCurrentConversation(remaining.length > 0 ? remaining[0].id : null)
        if (remaining.length === 0) {
          handleNewChat()
        }
      }

      toast({
        title: "Success",
        description: "Conversation deleted successfully"
      })
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive"
      })
    }
  }

  const handleNewChat = async () => {
    if (!user?.uid || !assistant) return

    try {
      const thread = await createThread()
      const newId = Date.now().toString()
      
      const welcomeMessage = merchantName 
        ? `Hi ${merchantName}! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?`
        : "Hi! I'm TapAI, your loyalty program assistant. I can help you create rewards, design campaigns, and optimize your loyalty strategy. What would you like help with?"
      
      const newConversation: Conversation = {
        id: newId,
        threadId: thread.id,
        title: 'New chat',
        messages: [{
          role: 'assistant',
          content: welcomeMessage
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(
        doc(db, 'merchants', user.uid, 'chats', newId),
        newConversation
      )
      
      setConversations(prev => [...prev, newConversation])
      setCurrentConversation(newId)
    } catch (error) {
      console.error('Error creating new chat:', error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      })
    }
  }

  const handleSpeechToText = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Speech recognition is not supported in your browser. Please use Chrome.",
        variant: "destructive"
      })
      return
    }

    try {
      const SpeechRecognition = window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      
      recognition.onstart = () => {
        setIsRecording(true)
      }
      
      recognition.onresult = (event) => {
        const lastResult = Array.from(event.results).pop()
        if (lastResult) {
          const transcript = lastResult[0].transcript
          if (lastResult.isFinal) {
            const cleanTranscript = transcript.trim()
            setInput(prev => {
              const prevClean = prev.trim()
              return prevClean ? `${prevClean} ${cleanTranscript}` : cleanTranscript
            })
          }
        }
      }
      
      recognition.onend = () => {
        if (isRecording) {
          recognition.start()
        }
      }

      if (isRecording) {
        setIsRecording(false)
        recognition.stop()
      } else {
        recognition.start()
      }

    } catch (error) {
      console.error('Speech recognition setup error:', error)
      toast({
        title: "Error",
        description: "Failed to initialize speech recognition.",
        variant: "destructive"
      })
      setIsRecording(false)
    }
  }

  const handleSaveWithPin = async (status: 'draft' | 'live') => {
    if (!pin.trim() || !savingReward || !user?.uid) return

    try {
      setSaving(true)
      const rewardId = Date.now().toString()
      
      const rewardData = {
        ...savingReward,
        pin: pin.trim(),
        createdAt: new Date().toISOString(),
        status: status,
        isActive: status === 'live',
        id: rewardId,
        merchantId: user.uid,
        updatedAt: new Date().toISOString()
      }

      // Save in all three locations
      const batch = writeBatch(db)

      // 1. merchants/merchantId/rewards
      const merchantRewardRef = doc(db, 'merchants', user.uid, 'rewards', rewardId)
      batch.set(merchantRewardRef, rewardData)

      // 2. rewards/rewardId
      const globalRewardRef = doc(db, 'rewards', rewardId)
      batch.set(globalRewardRef, rewardData)

      // 3. merchants/merchantId/tapaiRewards
      const tapAiRewardRef = doc(db, 'merchants', user.uid, 'tapaiRewards', rewardId)
      batch.set(tapAiRewardRef, rewardData)

      // Commit all writes
      await batch.commit()

      toast({
        title: "Success",
        description: `Reward ${status === 'draft' ? 'saved as draft' : 'published live'}`,
      })
      setPinDialogOpen(false)
      setPin('')
      setSavingReward(null)
    } catch (error) {
      console.error('Error saving reward:', error)
      toast({
        title: "Error",
        description: `Failed to save reward: ${(error as Error).message}`,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 border-2 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1400px] h-[90vh] flex flex-col p-0 border-0 rounded-xl overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar - Updated colors */}
          <div className="w-72 bg-gray-100 text-gray-900 p-4 flex flex-col gap-4 border-r border-gray-200">
            <Button 
              onClick={handleNewChat}
              variant="outline" 
              className="w-full justify-start gap-2 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              New chat
            </Button>
            
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={cn(
                      "group flex items-center gap-2 pr-2",
                      currentConversation === conv.id ? "bg-white" : "hover:bg-gray-50"
                    )}
                  >
                    <Button
                      variant="ghost"
                      className={cn(
                        "flex-1 justify-start gap-2 text-sm h-9",
                        currentConversation === conv.id ? "bg-white" : "hover:bg-transparent"
                    )}
                    onClick={() => setCurrentConversation(conv.id)}
                  >
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{conv.title}</span>
                  </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedConversation(conv.id)
                            setNewTitle(conv.title)
                            setRenameDialogOpen(true)
                          }}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedConversation(conv.id)
                            setDeleteDialogOpen(true)
                          }}
                          className="cursor-pointer text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col bg-white">
            <DialogHeader className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-base flex items-center">
                  <Sparkles className="h-4 w-4 mr-2 text-[#007AFF]" />
                  <span className="font-extrabold text-[#007AFF]">Tap</span>
                  <span>AI</span>
                  <span className="ml-1 font-normal">Assistant</span>
                </DialogTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mr-8 h-7 text-xs"
                  onClick={() => window.open('https://docs.taployalty.dev/ai-assistant', '_blank')}
                >
                  <HelpCircle className="h-3 w-3" />
                  Help Guide
                </Button>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 px-4 py-6">
              <div className="space-y-3 max-w-4xl mx-auto">
                {currentMessages.map((message, i) => (
                  <div key={i} className={cn(
                    "py-2 px-4 flex flex-col",
                    message.role === 'assistant' 
                      ? "items-start"
                      : "items-end"
                  )}>
                    <MessageContent 
                      content={message.content} 
                      user={user} 
                      setSavingReward={setSavingReward}
                      setPinDialogOpen={setPinDialogOpen}
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl",
                        message.role === 'user' 
                          ? "bg-[#007AFF] text-white"
                          : "bg-gray-50 text-gray-700"
                      )}
                    />
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="relative h-6 w-12">
                      <div className="absolute left-0 h-2 w-2 bg-[#007AFF] rounded-full animate-typing1" />
                      <div className="absolute left-4 h-2 w-2 bg-[#007AFF] rounded-full animate-typing2" />
                      <div className="absolute left-8 h-2 w-2 bg-[#007AFF] rounded-full animate-typing3" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="px-4 py-6 border-t border-gray-100 max-w-4xl mx-auto w-full">
              <form onSubmit={handleSubmit}>
                <div className="flex-1 relative">
                  <div className="relative h-32 bg-[#F3F3F3] rounded-2xl">
                    <textarea
                      ref={inputRef as any}
                  placeholder="Message TapAI..."
                  value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e as any)
                        }
                      }}
                      className="w-full h-full pl-4 pr-24 pt-4 pb-16 bg-transparent border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-1 focus:ring-gray-200 focus:border-gray-200 text-gray-900 placeholder:text-gray-500 transition-all"
                    />
                    
                    {isRecording && (
                      <div className="absolute top-4 right-4 flex items-center gap-2 text-sm text-[#007AFF]">
                        <div className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse" />
                        <span className="text-xs font-medium">Listening...</span>
                      </div>
                    )}

                    {mentionOpen && (
                      <div className="absolute bottom-20 left-4 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2">
                        {customers.length === 0 ? (
                          <div className="px-4 py-2 text-sm text-gray-500">
                            No customers found
                          </div>
                        ) : (
                          customers
                            .filter(customer => 
                              customer.fullName.toLowerCase().includes(mentionQuery.toLowerCase())
                            )
                            .map(customer => (
                              <div
                                key={customer.id}
                                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
                                onClick={() => handleCustomerSelect(customer)}
                              >
                                <div className="w-6 h-6 rounded-full bg-[#007AFF]/10 flex items-center justify-center text-[#007AFF] text-xs font-medium">
                                  {customer.fullName.charAt(0)}
                                </div>
                                <span>{customer.fullName}</span>
                              </div>
                            ))
                        )}
                      </div>
                    )}

                    <div className="absolute left-4 bottom-4 flex items-center gap-2">
                <Button 
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'individual' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create an individual reward")
                          setSelectedQuickAction('individual')
                        }}
                      >
                        <Gift className="h-4 w-4" />
                        <span className="text-sm">Individual</span>
                </Button>
                  <Button
                        type="button"
                        variant="ghost"
                    size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'recurring' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create a recurring reward")
                          setSelectedQuickAction('recurring')
                        }}
                      >
                        <Repeat className="h-4 w-4" />
                        <span className="text-sm">Recurring</span>
                  </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 transition-colors duration-200 rounded-xl flex items-center gap-2 shadow-sm",
                          selectedQuickAction === 'any' 
                            ? "text-[#007AFF] border-[#007AFF] bg-blue-50" 
                            : "text-gray-600 hover:text-[#007AFF]"
                        )}
                        onClick={() => {
                          setInput("Create any type of reward")
                          setSelectedQuickAction('any')
                        }}
                      >
                        <SparklesIcon className="h-4 w-4" />
                        <span className="text-sm">Any</span>
                      </Button>
              </div>

                    <div className="absolute right-2 bottom-4 flex items-center gap-2">
                      <Button 
                        type="button"
                        onClick={handleSpeechToText}
                        className={cn(
                          "rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all duration-200",
                          isRecording 
                            ? "bg-[#007AFF] hover:bg-[#0066CC] text-white"
                            : "bg-[#F3F3F3] hover:bg-gray-200 text-gray-700"
                        )}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                        className="bg-[#F3F3F3] hover:bg-gray-200 rounded-xl h-8 w-8 p-0 flex items-center justify-center transition-all duration-200 disabled:opacity-50"
                >
                        <Send className="h-4 w-4 text-gray-700" />
                </Button>
            </div>
          </div>
        </div>
              </form>
            </div>
          </div>
        </div>

        {/* Rename Dialog */}
        <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Rename conversation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new name"
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
                  <Button
                    variant="outline"
                onClick={() => setRenameDialogOpen(false)}
                  >
                Cancel
                  </Button>
              <Button
                onClick={() => {
                  if (selectedConversation && newTitle.trim()) {
                    handleRenameConversation(selectedConversation, newTitle.trim())
                    setRenameDialogOpen(false)
                    setNewTitle("")
                    setSelectedConversation(null)
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this conversation. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (selectedConversation) {
                    handleDeleteConversation(selectedConversation)
                    setDeleteDialogOpen(false)
                    setSelectedConversation(null)
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* PIN Dialog */}
        <Dialog open={pinDialogOpen} onOpenChange={setPinDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Enter PIN Code</DialogTitle>
              <DialogDescription>
                This PIN will be required when customers redeem the reward.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="pin">PIN Code</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN"
                type="number"
                maxLength={4}
                className="mt-2"
                autoFocus
              />
              </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  setPinDialogOpen(false)
                  setPin('')
                  setSavingReward(null)
                }}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSaveWithPin('draft')}
                  disabled={!pin.trim() || saving}
                  className="flex-1"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                      Saving...
            </div>
                  ) : (
                    'Save as Draft'
                  )}
                </Button>
                <Button
                  onClick={() => handleSaveWithPin('live')}
                  disabled={!pin.trim() || saving}
                  className="flex-1 bg-[#007AFF] hover:bg-[#0066CC]"
                >
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publishing...
          </div>
                  ) : (
                    'Go Live Now'
                  )}
                </Button>
        </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
} 