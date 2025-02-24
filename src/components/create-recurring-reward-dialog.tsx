"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Coffee, Percent, ChevronRight, ArrowLeft, Loader2, CheckCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import { useAuth } from '@/contexts/auth-context'
import { toast } from "@/components/ui/use-toast"
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { playSuccessSound } from '@/lib/audio'

interface CreateRecurringRewardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateRecurringRewardDialog({ open, onOpenChange }: CreateRecurringRewardDialogProps) {
  const { user } = useAuth()
  const [screen, setScreen] = useState<'options' | 'coffee'>('options')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    pin: '',
    freeRewardTiming: 'after' as 'before' | 'after',
    frequency: '5',
    levels: '5'
  })

  const options = [
    {
      title: "Coffee Program",
      description: "Create a buy-X-get-1-free coffee loyalty program",
      icon: Coffee,
      action: () => setScreen('coffee')
    },
    {
      title: "Recurring Discount",
      description: "Set up an automatically recurring discount reward",
      icon: Percent,
      action: () => console.log("Create recurring discount")
    }
  ]

  const saveCoffeeProgram = async () => {
    if (!user?.uid) return
    setLoading(true)

    try {
      // Check if coffee program exists
      const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const q = query(rewardsRef, where('programtype', '==', 'coffee'))
      const querySnapshot = await getDocs(q)

      if (!querySnapshot.empty) {
        toast({
          title: "Error",
          description: "Coffee program already exists",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      const coffeeprogram = httpsCallable(functions, 'coffeeprogram')
      
      const data = {
        merchantId: user.uid,
        pin: formData.pin,
        firstCoffeeBeforeTransaction: formData.freeRewardTiming === 'before',
        frequency: parseInt(formData.frequency),
        levels: parseInt(formData.levels)
      }

      console.log("Sending data:", JSON.stringify(data, null, 2))
      
      const result = await coffeeprogram(data)
      playSuccessSound()
      toast({
        title: (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span>Success</span>
          </div>
        ),
        description: "Coffee program created successfully",
      })
      onOpenChange(false)
    } catch (error: any) {
      // No error handling needed here
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {screen === 'options' ? (
              <>
                <span className="text-[#007AFF]">Create</span> Recurring Reward
              </>
            ) : (
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mr-2 -ml-2 h-8 w-8"
                  onClick={() => setScreen('options')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-[#007AFF]">Configure</span>{' '}Coffee Program
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {screen === 'options' ? (
          <div className="py-4 min-h-[300px]">
            <div className="grid gap-3">
              {options.map((option) => (
                <Card 
                  key={option.title}
                  className="group cursor-pointer transition-all hover:shadow-sm hover:border-[#007AFF]/30"
                  onClick={option.action}
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                      <option.icon className="h-4 w-4 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium truncate">
                        {option.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {option.description}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-[#007AFF] transition-colors" />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-4 min-h-[300px] space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>PIN Code</Label>
                <Input
                  type="text"
                  maxLength={4}
                  value={formData.pin}
                  onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                  placeholder="Enter 4-digit PIN"
                />
                <p className="text-sm text-muted-foreground">
                  Staff will enter this PIN when redeeming free coffees
                </p>
              </div>

              <div className="grid gap-2">
                <Label>First Free Coffee Timing</Label>
                <RadioGroup
                  value={formData.freeRewardTiming}
                  onValueChange={(value: 'before' | 'after') => 
                    setFormData({ ...formData, freeRewardTiming: value })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after">After first transaction</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="before" />
                    <Label htmlFor="before">Before first transaction</Label>
                  </div>
                </RadioGroup>
                <p className="text-sm text-muted-foreground">
                  Choose when customers receive their first free coffee
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  placeholder="Enter number of transactions"
                />
                <p className="text-sm text-muted-foreground">
                  Number of transactions required between free coffees
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Number of Rewards</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.levels}
                  onChange={(e) => setFormData({ ...formData, levels: e.target.value })}
                  placeholder="Enter number of rewards"
                />
                <p className="text-sm text-muted-foreground">
                  Total number of free coffees in the program
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border-t pt-4 flex justify-end gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              if (screen === 'options') {
                onOpenChange(false)
              } else {
                setScreen('options')
              }
            }}
          >
            {screen === 'options' ? 'Cancel' : 'Back'}
          </Button>
          {screen === 'coffee' && (
            <Button 
              onClick={saveCoffeeProgram} 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Program'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
} 