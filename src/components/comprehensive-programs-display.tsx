"use client"

import { useState, useEffect } from "react"
import { Settings, Award, ShoppingBag as ShoppingBagHeroIcon, Ticket as TicketIcon } from "lucide-react"
import { BiSolidCoffeeTogo } from "react-icons/bi"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface ProgramDisplayProps {
  activePrograms: any[]
  programRewardCounts: Record<string, number>
  onEditProgram: (programType: 'coffee' | 'voucher' | 'transaction' | 'cashback') => void
  onToggleProgramActive: (programIndex: number, programType: 'coffee' | 'voucher' | 'transaction' | 'cashback') => void
}

const programTypes = [
  {
    type: 'coffee',
    name: 'Coffee Program',
    icon: <BiSolidCoffeeTogo className="h-4 w-4 text-gray-600" />,
    description: 'Reward customers with stamps for each coffee purchase',
    defaultName: 'Stamp-based coffee loyalty program'
  },
  {
    type: 'voucher',
    name: 'Recurring Voucher',
    icon: <TicketIcon className="h-4 w-4 text-gray-600" />,
    description: 'Automatically give customers discount vouchers based on their activity',
    defaultName: 'Recurring discount voucher program'
  },
  {
    type: 'transaction',
    name: 'Transaction Program',
    icon: <ShoppingBagHeroIcon className="h-4 w-4 text-gray-600" />,
    description: 'Reward customers based on their purchase amounts and frequency',
    defaultName: 'Transaction-based reward program'
  },
  {
    type: 'cashback',
    name: 'Tap Cash',
    icon: <img src="/taplogo.png" alt="Tap Cash" className="h-4 w-4 rounded-sm" />,
    description: 'Give customers instant cashback on every purchase - no points, no delays',
    defaultName: 'Instant cashback program',
    specialClass: 'border-blue-400 hover:border-blue-500 ring-1 ring-blue-200',
    nameComponent: (
      <span>
        <span className="font-bold text-[#007aff]">Tap</span> Cash
      </span>
    )
  }
]

export function ComprehensiveProgramsDisplay({ 
  activePrograms, 
  programRewardCounts, 
  onEditProgram, 
  onToggleProgramActive 
}: ProgramDisplayProps) {
  const { user } = useAuth()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium">Available Programs</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {programTypes
          .map((programType) => ({
            ...programType,
            isConfigured: !!activePrograms.find(p => p.type === programType.type)
          }))
          .sort((a, b) => {
            // Sort configured programs first, unconfigured at the end
            if (a.isConfigured && !b.isConfigured) return -1
            if (!a.isConfigured && b.isConfigured) return 1
            return 0
          })
          .map((programType) => {
          const program = activePrograms.find(p => p.type === programType.type)
          const rewardCount = programRewardCounts[programType.type] || 0
          const isConfigured = !!program
          
          return (
            <div 
              key={programType.type} 
              className={`group relative bg-gray-50 border rounded-xl p-4 transition-all hover:shadow-sm ${
                programType.specialClass || (program?.active 
                  ? 'border-blue-200 hover:border-blue-300' 
                  : 'border-gray-200 hover:border-gray-300')
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {programType.icon}
                  <h4 className="text-sm font-medium text-gray-900">
                    {programType.nameComponent || programType.name}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  {isConfigured && (
                    <button
                      onClick={() => onEditProgram(programType.type as any)}
                      className="opacity-40 hover:opacity-70 transition-opacity"
                    >
                      <Settings className="h-3 w-3 text-gray-600" />
                    </button>
                  )}
                  <div className={`h-2 w-2 rounded-full ${
                    program?.active 
                      ? 'bg-blue-500' 
                      : 'bg-gray-300 opacity-60'
                  }`}></div>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mb-4 line-clamp-2">
                {isConfigured ? (
                  programType.type === 'cashback' 
                    ? `${program.description || 'Earn cashback on every purchase'} • ${program.cashbackRate || 2}% cashback rate`
                    : program.name || programType.defaultName
                ) : (
                  programType.description
                )}
              </p>
              
              <div className="flex items-center justify-between mb-4">
                <div className={`text-xs font-medium ${program?.active ? 'text-green-600' : 'text-gray-500'}`}>
                  {isConfigured ? (program.active ? 'Active' : 'Inactive') : 'Not Set Up'}
                </div>
                {isConfigured && rewardCount > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 text-gray-500 cursor-help">
                          <Award className="h-3 w-3" />
                          <span className="text-xs font-medium">{rewardCount}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Unredeemed rewards available for customers</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <Switch
                      checked={program.active}
                      onCheckedChange={() => onToggleProgramActive(program.originalIndex, programType.type as any)}
                      className="flex-shrink-0"
                    />
                    <span className="text-xs text-gray-600 flex-1">
                      {program.active ? 'Program is active' : 'Program is inactive'}
                    </span>
                  </>
                ) : (
                                      <Button 
                      onClick={() => onEditProgram(programType.type as any)}
                      className="w-full h-8 text-xs"
                      style={{ backgroundColor: '#007AFF' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0056CC'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007AFF'}
                    >
                      Set up program now
                    </Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
} 