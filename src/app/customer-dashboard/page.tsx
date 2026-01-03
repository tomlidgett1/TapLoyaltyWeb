"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { GiftIcon, DocumentTextIcon, Cog6ToothIcon } from "@heroicons/react/24/solid"
import { db, auth } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"

type Tab = "rewards" | "transactions" | "settings"

interface UserData {
  firstName: string
  lastName: string
  email: string
  merchantName?: string
}

interface AvailableReward {
  id: string
  rewardName: string
  merchantName?: string
  merchantId?: string
  pointsCost?: number
}

interface ActivityItem {
  id: string
  type: 'transaction' | 'redemption'
  date: Date
  merchantName: string
  amount?: number
  pointsEarned?: number
  rewardName?: string
}

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("rewards")
  const [userData, setUserData] = useState<UserData | null>(null)
  const [availableRewards, setAvailableRewards] = useState<AvailableReward[]>([])
  const [rewardsLoading, setRewardsLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [showAllRewards, setShowAllRewards] = useState(false)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  
  // SMS notification preferences
  const [notifications, setNotifications] = useState({
    rewardAvailable: true,
    newMerchant: false,
    newPoints: true,
  })

  // Listen for auth state and fetch user data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCustomerId(user.uid)
        
        // Fetch user data from merchants collection
        try {
          const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
          
          if (merchantDoc.exists()) {
            const data = merchantDoc.data()
            setUserData({
              firstName: data.firstName || '',
              lastName: data.lastName || '',
              email: data.email || user.email || '',
              merchantName: data.merchantName || ''
            })
          } else {
            // Use auth data if no merchant doc
            const displayName = user.displayName || ''
            const nameParts = displayName.split(' ')
            setUserData({
              firstName: nameParts[0] || '',
              lastName: nameParts.slice(1).join(' ') || '',
              email: user.email || '',
            })
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      } else {
        // Check localStorage fallback
        const sessionId = localStorage.getItem('basiq_session_id')
        const userEmail = localStorage.getItem('basiq_user_email')
        
        if (sessionId) {
          setCustomerId(sessionId)
          try {
            const merchantDoc = await getDoc(doc(db, 'merchants', sessionId))
            if (merchantDoc.exists()) {
              const data = merchantDoc.data()
              setUserData({
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || userEmail || '',
                merchantName: data.merchantName || ''
              })
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
          }
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Fetch available rewards when customerId is set
  useEffect(() => {
    const fetchRewards = async () => {
      if (!customerId) {
        setRewardsLoading(false)
        return
      }

      try {
        setRewardsLoading(true)
        
        // Query customers/{customerId}/rewards where redeemable = true and visible = true
        const customerRewardsRef = collection(db, 'customers', customerId, 'rewards')
        const rewardsQuery = query(
          customerRewardsRef,
          where('redeemable', '==', true),
          where('visible', '==', true)
        )
        
        const customerRewardsSnapshot = await getDocs(rewardsQuery)
        
        const rewardPromises = customerRewardsSnapshot.docs.map(async (customerRewardDoc) => {
          const rewardId = customerRewardDoc.id
          
          // Look up the reward details from rewards/{rewardId}
          const rewardDoc = await getDoc(doc(db, 'rewards', rewardId))
          
          if (rewardDoc.exists()) {
            const rewardData = rewardDoc.data()
            const merchantId = rewardData.merchantId
            
            // Look up merchant name from merchants/{merchantId}
            let merchantName = ''
            if (merchantId) {
              const merchantDoc = await getDoc(doc(db, 'merchants', merchantId))
              if (merchantDoc.exists()) {
                merchantName = merchantDoc.data().merchantName || ''
              }
            }
            
            return {
              id: rewardId,
              rewardName: rewardData.rewardName || 'Reward',
              merchantName: merchantName,
              merchantId: merchantId || '',
              pointsCost: rewardData.pointsCost || undefined,
            }
          }
          return null
        })
        
        const rewards = await Promise.all(rewardPromises)
        setAvailableRewards(rewards.filter((r): r is AvailableReward => r !== null))
      } catch (error) {
        console.error('Error fetching rewards:', error)
      } finally {
        setRewardsLoading(false)
      }
    }

    fetchRewards()
  }, [customerId])

  // Fetch activity (transactions and redemptions) when customerId is set
  useEffect(() => {
    const fetchActivity = async () => {
      if (!customerId) {
        setActivityLoading(false)
        return
      }

      try {
        setActivityLoading(true)
        const activities: ActivityItem[] = []

        // Fetch transactions from customers/{customerId}/transactions
        const transactionsRef = collection(db, 'customers', customerId, 'transactions')
        const transactionsSnapshot = await getDocs(transactionsRef)
        
        transactionsSnapshot.docs.forEach((transactionDoc) => {
          const data = transactionDoc.data()
          const createdAt = data.createdAt as Timestamp
          
          activities.push({
            id: transactionDoc.id,
            type: 'transaction',
            date: createdAt?.toDate() || new Date(),
            merchantName: data.merchantName || 'Unknown',
            amount: data.amount || 0,
            pointsEarned: data.pointsEarned || 0,
          })
        })

        // Fetch redemptions from customers/{customerId}/redemptions
        const redemptionsRef = collection(db, 'customers', customerId, 'redemptions')
        const redemptionsSnapshot = await getDocs(redemptionsRef)
        
        const redemptionPromises = redemptionsSnapshot.docs.map(async (redemptionDoc) => {
          const data = redemptionDoc.data()
          const redemptionDate = data.redemptionDate as Timestamp
          const merchantId = data.merchantId
          
          // Look up merchant name
          let merchantName = data.merchantName || ''
          if (merchantId && !merchantName) {
            const merchantDoc = await getDoc(doc(db, 'merchants', merchantId))
            if (merchantDoc.exists()) {
              merchantName = merchantDoc.data().merchantName || ''
            }
          }
          
          return {
            id: redemptionDoc.id,
            type: 'redemption' as const,
            date: redemptionDate?.toDate() || new Date(),
            merchantName: merchantName || 'Unknown',
            rewardName: data.rewardName || 'Reward',
          }
        })
        
        const redemptions = await Promise.all(redemptionPromises)
        activities.push(...redemptions)

        // Sort by date descending (newest first)
        activities.sort((a, b) => b.date.getTime() - a.date.getTime())
        
        setActivityItems(activities)
      } catch (error) {
        console.error('Error fetching activity:', error)
      } finally {
        setActivityLoading(false)
      }
    }

    fetchActivity()
  }, [customerId])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(amount)
  }

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleSignOut = () => {
    localStorage.removeItem('basiq_session_id')
    localStorage.removeItem('basiq_user_email')
    auth.signOut()
    router.push('/bank-connect')
  }

  const tabs = [
    { id: "rewards" as Tab, label: "Rewards", icon: GiftIcon },
    { id: "transactions" as Tab, label: "Activity", icon: DocumentTextIcon },
    { id: "settings" as Tab, label: "Settings", icon: Cog6ToothIcon },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col overflow-x-hidden">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] max-w-[200vw] h-[400px] rounded-full bg-gradient-to-b from-[#007AFF]/20 via-[#007AFF]/5 to-transparent blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <div className="text-[15px] font-semibold flex items-center">
          <span className="bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] bg-clip-text text-transparent">Tap</span>
          <span className="text-white/80 ml-1">Loyalty</span>
        </div>
        <button 
          onClick={handleSignOut}
          className="text-[15px] font-medium text-white/50 hover:text-white/70 transition-colors"
        >
          Sign out
        </button>
      </header>

      {/* Tabs */}
      <div className="relative z-10 px-6 pb-2">
        <div className="flex items-center gap-1 p-1 bg-white/[0.06] rounded-xl w-fit mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-white/[0.12] text-white" 
                    : "text-white/50 hover:text-white/70"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-6 py-6 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === "rewards" && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Points Card */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-[#007AFF]/20 flex items-center justify-center">
                    <GiftIcon className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-white">Your Rewards</h2>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[48px] font-semibold text-white tracking-tight">
                    {availableRewards.length}
                  </span>
                  <span className="text-[17px] text-white/50">available</span>
                </div>
                
                <p className="text-[15px] text-white/50">
                  {availableRewards.length > 0 
                    ? "Tap a reward to redeem"
                    : "No rewards available yet"
                  }
                </p>
              </div>

              {/* Available Rewards */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="text-[17px] font-semibold text-white">Available Rewards</h2>
                </div>
                
                {rewardsLoading ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-[15px] text-white/50">Loading rewards...</p>
                  </div>
                ) : availableRewards.length > 0 ? (
                  <>
                    <div className="divide-y divide-white/[0.06]">
                      {(showAllRewards ? availableRewards : availableRewards.slice(0, 6)).map((reward) => (
                        <div key={reward.id} className="px-6 py-4 flex items-center justify-between">
                          <div>
                            <p className="text-[15px] text-white font-medium">{reward.rewardName}</p>
                            {reward.merchantName && (
                              <p className="text-[13px] text-white/40">{reward.merchantName}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => router.push(`/redeem?reward=${encodeURIComponent(reward.rewardName)}&merchant=${encodeURIComponent(reward.merchantName || '')}&rewardId=${reward.id}`)}
                            className="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[13px] font-semibold rounded-lg transition-colors"
                          >
                            {reward.pointsCost ? `${reward.pointsCost} pts` : 'Redeem'}
                          </button>
                        </div>
                      ))}
                    </div>
                    {availableRewards.length > 6 && !showAllRewards && (
                      <button
                        onClick={() => setShowAllRewards(true)}
                        className="w-full py-4 flex items-center justify-center gap-2 text-[14px] text-white/50 hover:text-white/70 transition-colors border-t border-white/[0.06]"
                      >
                        <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[16px]">+</span>
                        Show {availableRewards.length - 6} more
                      </button>
                    )}
                  </>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-[15px] text-white/50">No rewards available</p>
                    <p className="text-[13px] text-white/30 mt-1">Keep earning to unlock rewards</p>
                  </div>
                )}
              </div>

              {/* Download App */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                <p className="text-[15px] text-white/70 mb-4">
                  Get the full experience with our app
                </p>
                <a 
                  href="https://apps.apple.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block transition-opacity hover:opacity-80"
                >
                  <Image
                    src="/appstore.svg"
                    alt="Download on the App Store"
                    width={140}
                    height={47}
                    className="h-[47px] w-auto"
                  />
                </a>
              </div>
            </motion.div>
          )}

          {activeTab === "transactions" && (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-6 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <DocumentTextIcon className="w-5 h-5 text-white/70" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-white">Activity</h2>
                </div>
                
                {activityLoading ? (
                  <div className="px-6 py-8 text-center">
                    <p className="text-[15px] text-white/50">Loading activity...</p>
                  </div>
                ) : activityItems.length > 0 ? (
                  <div className="divide-y divide-white/[0.06]">
                    {activityItems.map((item) => (
                      <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] text-white font-medium truncate">
                              {item.type === 'transaction' ? item.merchantName : item.rewardName}
                            </p>
                            {item.type === 'redemption' && (
                              <span className="px-2 py-0.5 bg-[#007AFF]/20 text-[#007AFF] text-[10px] font-medium rounded-md shrink-0">
                                Redeemed
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-white/40">
                            {item.type === 'redemption' && item.merchantName ? `${item.merchantName} · ` : ''}
                            {formatDate(item.date)}
                            {item.type === 'transaction' && item.amount ? ` · ${formatAmount(item.amount)}` : ''}
                          </p>
                        </div>
                        {item.type === 'transaction' && item.pointsEarned ? (
                          <span className="text-[15px] text-[#30D158] font-medium shrink-0 ml-3">
                            +{item.pointsEarned}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <p className="text-[15px] text-white/50">No activity yet</p>
                    <p className="text-[13px] text-white/30 mt-1">Your transactions and redemptions will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Account Info */}
              {userData && (
                <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                  <h2 className="text-[17px] font-semibold text-white mb-4">Account</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[13px] text-white/40">Name</p>
                      <p className="text-[15px] text-white">{userData.firstName} {userData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-[13px] text-white/40">Email</p>
                      <p className="text-[15px] text-white">{userData.email}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SMS Notifications */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-6 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <Cog6ToothIcon className="w-5 h-5 text-white/70" />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-semibold text-white">Text Updates</h2>
                    <p className="text-[13px] text-white/40">SMS notifications</p>
                  </div>
                </div>
                
                <div className="divide-y divide-white/[0.06]">
                  {/* Reward Available */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] text-white font-medium">Reward available</p>
                      <p className="text-[13px] text-white/40">When you can redeem a reward</p>
                    </div>
                    <button
                      onClick={() => toggleNotification('rewardAvailable')}
                      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                        notifications.rewardAvailable ? 'bg-[#30D158]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          notifications.rewardAvailable ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* New Merchant */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] text-white font-medium">New merchant</p>
                      <p className="text-[13px] text-white/40">When a new store joins near you</p>
                    </div>
                    <button
                      onClick={() => toggleNotification('newMerchant')}
                      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                        notifications.newMerchant ? 'bg-[#30D158]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          notifications.newMerchant ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* New Points */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="text-[15px] text-white font-medium">New points</p>
                      <p className="text-[13px] text-white/40">When you earn points</p>
                    </div>
                    <button
                      onClick={() => toggleNotification('newPoints')}
                      className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ${
                        notifications.newPoints ? 'bg-[#30D158]' : 'bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] bg-white rounded-full shadow-sm transition-transform duration-200 ${
                          notifications.newPoints ? 'translate-x-[20px]' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* App Download */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl p-6">
                <p className="text-[15px] text-white/70 mb-4">
                  Get the full experience with our app
                </p>
                <a 
                  href="https://apps.apple.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block transition-opacity hover:opacity-80"
                >
                  <Image
                    src="/appstore.svg"
                    alt="Download on the App Store"
                    width={140}
                    height={47}
                    className="h-[47px] w-auto"
                  />
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center">
        <p className="text-[12px] text-white/30">
          Powered by Tap Loyalty
        </p>
      </footer>
    </div>
  )
}
