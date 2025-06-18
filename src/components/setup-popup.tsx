"use client";

import { useState } from "react";
import { X, HelpCircle, User, Gift, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupPopup({ open, onOpenChange }: SetupPopupProps) {
  const [activeTab, setActiveTab] = useState("what-is-tap");
  const [activeAccountSubTab, setActiveAccountSubTab] = useState("universe");

  const tabs = [
    { id: "what-is-tap", label: "What is Tap Loyalty?", icon: HelpCircle },
    { id: "account-type", label: "Account Type", icon: User },
    { id: "rewards-programs", label: "Rewards and Programs", icon: Gift },
    { id: "tap-merchant", label: "Tap Merchant", icon: Store },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-md w-full max-w-6xl mx-4 shadow-lg max-h-[90vh] min-h-[600px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Setup</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="border-b border-gray-200"></div>
        
        <div className="flex h-full">
          {/* Left Content Area */}
          <div className="flex-1 p-6">
            {/* Tab Navigation */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                    activeTab === tab.id
                      ? "text-gray-800 bg-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-200/70"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon size={15} />
                  {tab.label}
                </button>
              ))}
            </div>
          
          {/* Tab Content */}
          <div className="text-gray-600 text-sm">
            {activeTab === "what-is-tap" && (
              <div>What is Tap Loyalty? content will be added here.</div>
            )}
            {activeTab === "account-type" && (
              <div className="space-y-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">How are you planning to use Tap?</h3>
                  <p className="text-gray-600 text-sm">We'll fit the experience to your needs. Don't worry, you can change it later.</p>
                </div>
                
                {/* Account Type Selection Boxes */}
                <div className="grid grid-cols-3 gap-4">
                  <button 
                    className={cn(
                      "border-2 rounded-md p-6 text-center transition-all hover:border-blue-300",
                      activeAccountSubTab === "universe" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                    onClick={() => setActiveAccountSubTab("universe")}
                  >
                    <Store className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                    <h4 className="font-semibold text-gray-900 mb-1">Tap Universe</h4>
                    <p className="text-xs text-gray-600">Network effects & cross-merchant benefits</p>
                  </button>
                  
                  <button 
                    className={cn(
                      "border-2 rounded-md p-6 text-center transition-all hover:border-blue-300",
                      activeAccountSubTab === "solo" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                    onClick={() => setActiveAccountSubTab("solo")}
                  >
                    <User className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                    <h4 className="font-semibold text-gray-900 mb-1">Tap Solo</h4>
                    <p className="text-xs text-gray-600">Private loyalty, your rules only</p>
                  </button>
                  
                  <button 
                    className={cn(
                      "border-2 rounded-md p-6 text-center transition-all hover:border-blue-300",
                      activeAccountSubTab === "spotlight" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                    )}
                    onClick={() => setActiveAccountSubTab("spotlight")}
                  >
                    <HelpCircle className="h-8 w-8 mx-auto mb-3 text-gray-600" />
                    <h4 className="font-semibold text-gray-900 mb-1">Tap Spotlight</h4>
                    <p className="text-xs text-gray-600">Focus on traffic & brand exposure</p>
                  </button>
                </div>
                
                <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors">
                  Create Account
                </button>
              </div>
            )}
            {activeTab === "rewards-programs" && (
              <div>Rewards and Programs content will be added here.</div>
            )}
            {activeTab === "tap-merchant" && (
              <div>Tap Merchant content will be added here.</div>
            )}
          </div>
        </div>
          
        {/* Right Information Panel */}
          <div className="w-80 bg-gray-900 text-white p-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Connect with customers</h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Build loyalty programs that keep customers coming back. Tap helps you create 
                  meaningful connections through rewards, points, and personalised experiences.
                </p>
              </div>
              
              {activeAccountSubTab === "universe" && (
                <div className="bg-gray-800 rounded-md p-4">
                  <img src="/rec1.png" alt="Universe Preview" className="w-full h-32 object-cover rounded mb-3" />
                  <h4 className="font-medium mb-2">Network Benefits</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Cross-merchant point redemption</li>
                    <li>• Featured in app discovery</li>
                    <li>• Shared customer base</li>
                  </ul>
                </div>
              )}
              
              {activeAccountSubTab === "solo" && (
                <div className="bg-gray-800 rounded-md p-4">
                  <img src="/rec1.png" alt="Solo Preview" className="w-full h-32 object-cover rounded mb-3" />
                  <h4 className="font-medium mb-2">Private Control</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Your points, your rules</li>
                    <li>• Complete program control</li>
                    <li>• No external redemptions</li>
                  </ul>
                </div>
              )}
              
              {activeAccountSubTab === "spotlight" && (
                <div className="bg-gray-800 rounded-md p-4">
                  <img src="/rec1.png" alt="Spotlight Preview" className="w-full h-32 object-cover rounded mb-3" />
                  <h4 className="font-medium mb-2">Growth Focus</h4>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• Minimal setup required</li>
                    <li>• Advertising opportunities</li>
                    <li>• Increased foot traffic</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 