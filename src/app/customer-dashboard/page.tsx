"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { GiftIcon, DocumentTextIcon, Cog6ToothIcon } from "@heroicons/react/24/solid"
import { PlusIcon, ArrowPathIcon, ShieldCheckIcon, ClockIcon } from "@heroicons/react/24/outline"
import { db, auth, functions } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, getDocs, Timestamp, updateDoc, setDoc } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { httpsCallable } from "firebase/functions"

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
  const [notificationsLoading, setNotificationsLoading] = useState(true)

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

  // Load notification settings from Firestore
  useEffect(() => {
    const loadNotificationSettings = async () => {
      if (!customerId) {
        setNotificationsLoading(false)
        return
      }

      try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId))
        if (customerDoc.exists()) {
          const data = customerDoc.data()
          if (data.textNotificationSettings) {
            setNotifications({
              rewardAvailable: data.textNotificationSettings.rewardAvailable ?? true,
              newMerchant: data.textNotificationSettings.newMerchant ?? false,
              newPoints: data.textNotificationSettings.newPoints ?? true,
            })
          }
        }
      } catch (error) {
        console.error('Error loading notification settings:', error)
      } finally {
        setNotificationsLoading(false)
      }
    }

    loadNotificationSettings()
  }, [customerId])

  const toggleNotification = async (key: keyof typeof notifications) => {
    if (!customerId) return

    const newValue = !notifications[key]
    
    // Update local state immediately for responsive UI
    setNotifications(prev => ({
      ...prev,
      [key]: newValue
    }))

    // Save to Firestore
    try {
      const customerRef = doc(db, 'customers', customerId)
      await setDoc(customerRef, {
        textNotificationSettings: {
          ...notifications,
          [key]: newValue
        }
      }, { merge: true })
    } catch (error) {
      console.error('Error saving notification settings:', error)
      // Revert on error
      setNotifications(prev => ({
        ...prev,
        [key]: !newValue
      }))
    }
  }

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('basiq_session_id')
      localStorage.removeItem('basiq_user_email')
      await auth.signOut()
      router.push('/bank-connect')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const [reconnecting, setReconnecting] = useState(false)
  const [basiqUserId, setBasiqUserId] = useState<string | null>(null)
  const [bankActionLoading, setBankActionLoading] = useState<string | null>(null)

  // Fetch basiqUserId when customerId is set
  useEffect(() => {
    const fetchBasiqUserId = async () => {
      if (!customerId) return
      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', customerId))
        if (merchantDoc.exists()) {
          setBasiqUserId(merchantDoc.data().basiqUserId || null)
        }
      } catch (error) {
        console.error('Error fetching basiqUserId:', error)
      }
    }
    fetchBasiqUserId()
  }, [customerId])

  // Open Basiq consent portal with a specific action
  const openBasiqConsent = async (action: 'connect' | 'manage' | 'extend') => {
    if (!basiqUserId) {
      console.error('No basiqUserId available')
      return
    }

    // Create a loading page HTML
    const loadingHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connecting to your bank...</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              background: #0a0a0a;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .spinner {
              width: 40px;
              height: 40px;
              border: 3px solid rgba(255,255,255,0.1);
              border-top-color: #007AFF;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            .text {
              margin-top: 20px;
              color: rgba(255,255,255,0.7);
              font-size: 15px;
            }
            .subtext {
              margin-top: 8px;
              color: rgba(255,255,255,0.4);
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="spinner"></div>
          <p class="text">Connecting to your bank...</p>
          <p class="subtext">Please wait</p>
        </body>
      </html>
    `

    // Open window with loading page immediately (within user gesture)
    const newWindow = window.open('about:blank', '_blank')
    
    if (newWindow) {
      newWindow.document.write(loadingHTML)
      newWindow.document.close()
    }

    try {
      setBankActionLoading(action)
      
      // Call getBasiqClientToken function
      const getBasiqClientToken = httpsCallable(functions, 'getBasiqClientToken')
      const result = await getBasiqClientToken({ basiqUserId })
      const data = result.data as { success: boolean; token: string }
      
      if (data.success && data.token) {
        // Navigate the already-opened window to the consent portal
        const consentUrl = `https://consent.basiq.io/home?token=${data.token}&action=${action}`
        if (newWindow) {
          newWindow.location.href = consentUrl
        } else {
          // Fallback: navigate current window if popup was blocked
          window.location.href = consentUrl
        }
      } else {
        console.error('Failed to get client token')
        if (newWindow) {
          newWindow.document.body.innerHTML = '<p style="color: #ff6b6b; font-family: sans-serif;">Failed to connect. Please close this window and try again.</p>'
        }
      }
    } catch (error) {
      console.error('Error opening Basiq consent:', error)
      if (newWindow) {
        newWindow.document.body.innerHTML = '<p style="color: #ff6b6b; font-family: sans-serif; text-align: center; padding: 20px;">Something went wrong.<br><br><a href="javascript:window.close()" style="color: #007AFF;">Close this window</a></p>'
      }
    } finally {
      setBankActionLoading(null)
    }
  }

  const handleReconnectBank = async () => {
    if (!customerId || !userData) return

    try {
      setReconnecting(true)

      // Get user's phone from merchants collection
      const merchantDoc = await getDoc(doc(db, 'merchants', customerId))
      if (!merchantDoc.exists()) {
        throw new Error('User data not found')
      }
      
      const merchantData = merchantDoc.data()
      const phone = merchantData.phone || ''
      
      if (!phone) {
        // If no phone, redirect to bank-connect to enter it
        router.push('/bank-connect')
        return
      }

      // Format phone for Basiq (remove leading 0, add 61)
      let formattedPhone = phone.replace(/\D/g, '')
      if (formattedPhone.startsWith('0')) {
        formattedPhone = `61${formattedPhone.substring(1)}`
      } else if (!formattedPhone.startsWith('61')) {
        formattedPhone = `61${formattedPhone}`
      }

      const callbackUrl = `${window.location.origin}/bank-callback`
      
      const response = await fetch('/api/basiqconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            userId: customerId,
            merchantId: customerId,
            mobile: formattedPhone,
            email: userData.email || '',
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            callbackUrl: callbackUrl
          }
        }),
      })

      const responseData = await response.json()
      
      if (!response.ok) {
        throw new Error(responseData.error || 'Connection failed')
      }

      const authLink = responseData.data?.authLink || responseData.authLink

      if (authLink) {
        window.location.href = authLink
      } else {
        throw new Error('No authentication link received')
      }
    } catch (error) {
      console.error('Error reconnecting bank:', error)
      alert('Failed to reconnect bank. Please try again.')
    } finally {
      setReconnecting(false)
    }
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
      <header className="relative z-10 w-full px-4 py-5 flex items-center justify-between">
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
      <div className="relative z-10 px-4 pb-2">
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
      <div className="relative z-10 flex-1 px-4 py-6 max-w-lg mx-auto w-full">
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
              {/* Rewards Summary - Simple inline */}
              {availableRewards.length > 0 && (
                <p className="text-[15px] text-white/50 text-center">
                  You have <span className="text-white font-semibold">{availableRewards.length}</span> {availableRewards.length === 1 ? 'reward' : 'rewards'} to redeem
                </p>
              )}

              {/* Available Rewards */}
              <div>
                <h2 className="text-[17px] font-semibold text-white mb-4">Available Rewards</h2>
                
                {rewardsLoading ? (
                  <div className="py-8 text-center">
                    <p className="text-[15px] text-white/50">Loading rewards...</p>
                  </div>
                ) : availableRewards.length > 0 ? (
                  <div className="space-y-2">
                    {(showAllRewards ? availableRewards : availableRewards.slice(0, 6)).map((reward) => (
                      <button 
                        key={reward.id}
                        onClick={() => router.push(`/redeem?reward=${encodeURIComponent(reward.rewardName)}&merchant=${encodeURIComponent(reward.merchantName || '')}&rewardId=${reward.id}&merchantId=${reward.merchantId || ''}`)}
                        className="w-full py-4 px-4 flex items-center justify-between bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.12] rounded-xl transition-colors"
                      >
                        <div className="text-left">
                          <p className="text-[15px] text-white font-medium">{reward.rewardName}</p>
                          {reward.merchantName && (
                            <p className="text-[13px] text-white/40">{reward.merchantName}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {reward.pointsCost && (
                            <span className="text-[13px] text-[#007AFF] font-medium">{reward.pointsCost} pts</span>
                          )}
                          <svg className="w-5 h-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </button>
                    ))}
                    {availableRewards.length > 6 && !showAllRewards && (
                      <button
                        onClick={() => setShowAllRewards(true)}
                        className="w-full py-3 flex items-center justify-center gap-2 text-[14px] text-white/50 hover:text-white/70 transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-sm">+</span>
                        Show {availableRewards.length - 6} more
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center">
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
                      <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-white font-medium truncate">
                            {item.type === 'transaction' ? item.merchantName : item.rewardName}
                          </p>
                          <p className="text-[13px] text-white/40">
                            {item.type === 'redemption' && item.merchantName ? `${item.merchantName} · ` : ''}
                            {formatDate(item.date)}
                            {item.type === 'transaction' && item.amount ? ` · ${formatAmount(item.amount)}` : ''}
                          </p>
                        </div>
                        {item.type === 'transaction' && item.pointsEarned ? (
                          <span className="text-[15px] text-[#30D158] font-medium shrink-0">
                            +{item.pointsEarned}
                          </span>
                        ) : item.type === 'redemption' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold rounded-md shrink-0 border border-emerald-500/30">
                            <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                              <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Redeemed
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

              {/* Bank Connection */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="text-[17px] font-semibold text-white mb-1">Bank Connection</h2>
                  <p className="text-[13px] text-white/40">
                    Manage your connected bank accounts
                  </p>
                </div>
                
                <div className="divide-y divide-white/[0.06]">
                  {/* Add Another Bank */}
                  <button
                    onClick={() => openBasiqConsent('connect')}
                    disabled={!basiqUserId || bankActionLoading !== null}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#007AFF]/20 flex items-center justify-center shrink-0">
                      <PlusIcon className="w-5 h-5 text-[#007AFF]" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] text-white font-medium">Add Another Bank</p>
                      <p className="text-[13px] text-white/40">Connect an additional bank account</p>
                    </div>
                    {bankActionLoading === 'connect' && (
                      <ArrowPathIcon className="w-5 h-5 text-white/50 animate-spin" />
                    )}
                  </button>

                  {/* Manage Consent */}
                  <button
                    onClick={() => openBasiqConsent('manage')}
                    disabled={!basiqUserId || bankActionLoading !== null}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
                      <ShieldCheckIcon className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] text-white font-medium">Manage Consent</p>
                      <p className="text-[13px] text-white/40">View or revoke bank access</p>
                    </div>
                    {bankActionLoading === 'manage' && (
                      <ArrowPathIcon className="w-5 h-5 text-white/50 animate-spin" />
                    )}
                  </button>

                  {/* Extend Consent */}
                  <button
                    onClick={() => openBasiqConsent('extend')}
                    disabled={!basiqUserId || bankActionLoading !== null}
                    className="w-full px-6 py-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0">
                      <ClockIcon className="w-5 h-5 text-white/70" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[15px] text-white font-medium">Extend Consent</p>
                      <p className="text-[13px] text-white/40">Extend your consent period</p>
                    </div>
                    {bankActionLoading === 'extend' && (
                      <ArrowPathIcon className="w-5 h-5 text-white/50 animate-spin" />
                    )}
                  </button>

                </div>

                {!basiqUserId && (
                  <div className="px-6 py-4 border-t border-white/[0.06]">
                    <p className="text-[13px] text-white/40 text-center">
                      No bank connected yet. Connect a bank to manage your accounts.
                    </p>
                  </div>
                )}
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
