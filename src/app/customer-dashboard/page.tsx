"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Gift, Receipt, Settings } from "lucide-react"

type Tab = "rewards" | "transactions" | "settings"

export default function CustomerDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("rewards")
  
  // SMS notification preferences
  const [notifications, setNotifications] = useState({
    rewardAvailable: true,
    newMerchant: false,
    newPoints: true,
  })

  // Mock data
  const rewards = {
    points: 2450,
    available: 3,
  }

  const availableRewards = [
    { id: 1, merchant: "Blue Bottle Coffee", reward: "Free Coffee", pointsCost: 500 },
    { id: 2, merchant: "Guzman y Gomez", reward: "Free Burrito", pointsCost: 800 },
    { id: 3, merchant: "The Grounds", reward: "$10 Off", pointsCost: 1000 },
  ]

  const transactions = [
    { id: 1, merchant: "Blue Bottle Coffee", date: "Today", points: 45 },
    { id: 2, merchant: "Guzman y Gomez", date: "Yesterday", points: 120 },
    { id: 3, merchant: "Press* Food & Wine", date: "Dec 12", points: 85 },
    { id: 4, merchant: "The Grounds", date: "Dec 10", points: 65 },
    { id: 5, merchant: "Paramount Coffee", date: "Dec 8", points: 55 },
    { id: 6, merchant: "Messina", date: "Dec 5", points: 90 },
  ]

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const tabs = [
    { id: "rewards" as Tab, label: "Rewards", icon: Gift },
    { id: "transactions" as Tab, label: "Activity", icon: Receipt },
    { id: "settings" as Tab, label: "Settings", icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-gradient-to-b from-[#007AFF]/20 via-[#007AFF]/5 to-transparent blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full px-6 py-5 flex items-center justify-between">
        <span className="text-[15px] font-medium text-white/90">
          Tap Loyalty
        </span>
        <button 
          onClick={() => router.push('/bank-connect')}
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
                    <Gift className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-white">Your Rewards</h2>
                </div>
                
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-[48px] font-semibold text-white tracking-tight">
                    {rewards.points.toLocaleString()}
                  </span>
                  <span className="text-[17px] text-white/50">points</span>
                </div>
                
                <p className="text-[15px] text-white/50">
                  {rewards.available} rewards available to redeem
                </p>
              </div>

              {/* Available Rewards */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="p-6 pb-4">
                  <h2 className="text-[17px] font-semibold text-white">Available Rewards</h2>
                </div>
                
                <div className="divide-y divide-white/[0.06]">
                  {availableRewards.map((reward) => (
                    <div key={reward.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[15px] text-white font-medium">{reward.reward}</p>
                        <p className="text-[13px] text-white/40">{reward.merchant}</p>
                      </div>
                      <button 
                        onClick={() => router.push(`/redeem?reward=${encodeURIComponent(reward.reward)}&merchant=${encodeURIComponent(reward.merchant)}`)}
                        className="px-4 py-2 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[13px] font-semibold rounded-lg transition-colors"
                      >
                        {reward.pointsCost} pts
                      </button>
                    </div>
                  ))}
                </div>
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
                    <Receipt className="w-5 h-5 text-white/70" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-white">Transactions</h2>
                </div>
                
                <div className="divide-y divide-white/[0.06]">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-[15px] text-white font-medium">{tx.merchant}</p>
                        <p className="text-[13px] text-white/40">{tx.date}</p>
                      </div>
                      <span className="text-[15px] text-[#30D158] font-medium">
                        +{tx.points}
                      </span>
                    </div>
                  ))}
                </div>
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
              {/* SMS Notifications */}
              <div className="bg-white/[0.08] backdrop-blur-2xl border border-white/[0.1] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 p-6 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white/70" />
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
