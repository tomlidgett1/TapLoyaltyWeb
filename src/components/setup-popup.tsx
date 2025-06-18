"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupPopup({ open, onOpenChange }: SetupPopupProps) {
  const [currentStep, setCurrentStep] = useState(-1); // Start at welcome screen
  const [howTapWorksTab, setHowTapWorksTab] = useState("customers"); // For How Tap Works tabs

  const steps = [
    { id: "what-is-tap", label: "What is Tap Loyalty?", description: "Understanding the platform" },
    { id: "how-tap-works", label: "How Tap Works", description: "AutoTap™ technology explained" },
    { id: "account-type", label: "Account Type", description: "Choose your setup" },
    { id: "business-info", label: "Business Information", description: "Tell us about your business" },
    { id: "rewards-setup", label: "Rewards Setup", description: "Configure your first rewards" },
    { id: "complete", label: "Complete", description: "You're ready to go!" },
  ];

  const canGoNext = currentStep < steps.length - 1;
  const canGoBack = currentStep > 0;

  const handleNext = () => {
    if (canGoNext) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Only allow going to previous steps or current step
    if (stepIndex <= currentStep) {
      setCurrentStep(stepIndex);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md w-full max-w-5xl shadow-lg h-[95vh] min-h-[750px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome to Tap Loyalty</h2>
            <p className="text-sm text-gray-500 mt-1">Let's get you set up in just a few steps</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>



        {/* Content Area */}
        <div className={currentStep === -1 ? "flex-1 flex items-center justify-center" : "flex-1 overflow-y-auto"}>
          {/* Main Content */}
          <div className={currentStep === -1 ? "px-6" : "px-3 py-8"}>
            <div className={currentStep === -1 ? "" : "max-w-4xl mx-auto"}>
              {currentStep === -1 && (
                <div className="text-center space-y-6 max-w-2xl mx-auto">
                  <div className="space-y-3">
                    <h3 className="text-2xl font-semibold text-gray-900">
                      Welcome to Tap Loyalty
                    </h3>
                    <p className="text-base text-gray-600">
                      This will take no more than 5 minutes to get you set up with a powerful loyalty program for your business.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-md p-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-900">What you'll accomplish:</h4>
                      <ul className="text-left space-y-2 text-sm text-gray-600">
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                          Understand how Tap Loyalty works
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                          Choose the right account type for your business
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                          Set up your business information
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                          Configure your first rewards
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full flex-shrink-0"></div>
                          Launch your loyalty program
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleNext}
                    className="bg-[#007AFF] text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-[#0066CC] transition-colors"
                  >
                    Get Started
                  </button>
                </div>
              )}

              {currentStep === 0 && (
                <div className="space-y-8 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      What is Tap Loyalty?
                    </h3>
                    <p className="text-lg text-gray-600 mb-6">
                      Automatic rewards for your favourite places - loyalty made effortlessly simple.
                    </p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* For Customers */}
                    <div className="bg-blue-50 rounded-md p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">For Customers</h4>
                      <ul className="space-y-3 text-sm text-gray-700">
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>Automatic Rewards:</strong> Earn points automatically at cafés, restaurants, and retail stores with no extra steps at checkout</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>One App, Hundreds of Programs:</strong> Access loyalty programs from hundreds of merchants all in one place</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>No More Cards:</strong> Forget physical loyalty cards and scanning QR codes</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>Bank-Level Security:</strong> Protected by Australia's Consumer Data Right (CDR) framework</span>
                        </li>
                      </ul>
                    </div>

                    {/* For Merchants */}
                    <div className="bg-gray-50 rounded-md p-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">For Merchants</h4>
                      <ul className="space-y-3 text-sm text-gray-700">
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>No New Hardware:</strong> 100% cloud-based solution with no hardware installation or staff training required</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>Powerful Dashboard:</strong> Create custom loyalty programs with real-time analytics and rich transaction data</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>Customer Engagement:</strong> Send targeted promotions and personalised offers to build stronger relationships</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full mt-2 flex-shrink-0"></div>
                          <span><strong>AI-Powered:</strong> Tap Agent creates personalised rewards for each customer every week</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      How Tap Works
                    </h3>
                    <p className="text-lg text-gray-600 mb-6">
                      Our proprietary AutoTap™ technology makes loyalty effortless for everyone.
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-md w-fit">
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        howTapWorksTab === "customers"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setHowTapWorksTab("customers")}
                    >
                      For Customers
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                        howTapWorksTab === "merchants"
                          ? "text-gray-800 bg-white shadow-sm"
                          : "text-gray-600 hover:bg-gray-200/70"
                      )}
                      onClick={() => setHowTapWorksTab("merchants")}
                    >
                      For Merchants
                    </button>
                  </div>

                  {/* Tab Content */}
                  {howTapWorksTab === "customers" && (
                    <div className="space-y-8">
                      {/* Three-step process for customers */}
                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">1</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Download & Connect</h4>
                          <p className="text-gray-600 mb-4">
                            Download the Tap Loyalty app and securely connect your bank account using Australia's Open Banking framework for bank-level security.
                          </p>
                          <div className="bg-blue-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>One-time setup:</strong> Connect once and automatically join every participating merchant's program.
                            </p>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">2</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Shop Normally</h4>
                          <p className="text-gray-600 mb-4">
                            Pay as usual at any participating merchant using your preferred payment method. No cards to remember, no QR codes to scan.
                          </p>
                          <div className="bg-gray-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>Zero friction:</strong> AutoTap™ automatically detects your purchases and assigns rewards in real-time.
                            </p>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">3</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Earn & Redeem</h4>
                          <p className="text-gray-600 mb-4">
                            Watch your rewards grow automatically across hundreds of merchants. Redeem points anywhere in the network and climb loyalty tiers for VIP perks.
                          </p>
                          <div className="bg-green-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>Never miss rewards:</strong> Even if you forget about the program, you'll still earn points automatically.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {howTapWorksTab === "merchants" && (
                    <div className="space-y-8">
                      {/* Three-step process for merchants */}
                      <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">1</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Quick Setup</h4>
                          <p className="text-gray-600 mb-4">
                            Join Tap Loyalty with a simple online registration. No hardware installation, no staff training, no changes to your checkout process.
                          </p>
                          <div className="bg-blue-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>100% cloud-based:</strong> Start engaging customers immediately with our plug-and-play solution.
                            </p>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">2</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Customers Shop</h4>
                          <p className="text-gray-600 mb-4">
                            When Tap Loyalty customers shop at your store, AutoTap™ technology automatically detects their transactions and assigns rewards without any action needed.
                          </p>
                          <div className="bg-gray-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>Seamless experience:</strong> Your checkout process remains exactly the same - no disruption to operations.
                            </p>
                          </div>
                        </div>

                        <div className="text-center">
                          <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">3</div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-3">Engage & Grow</h4>
                          <p className="text-gray-600 mb-4">
                            Use your powerful merchant dashboard to send personalised offers, track customer behaviour, and build stronger relationships that drive repeat business.
                          </p>
                          <div className="bg-green-50 rounded-md p-4">
                            <p className="text-sm text-gray-700">
                              <strong>AI-powered insights:</strong> Tap Agent creates personalised rewards for each customer every week.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Technology explanation */}
                  <div className="bg-white border-2 border-[#007AFF] rounded-md p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">AutoTap™ Technology</h4>
                    <p className="text-gray-600 mb-4">
                      Our proprietary AutoTap technology uses Australia's Open Banking framework to securely access consented transaction data, 
                      matching purchases at participating merchants in real-time to automatically assign rewards - no scanning required.
                    </p>
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div className="text-center p-4 bg-gray-50 rounded-md">
                        <h5 className="font-medium text-gray-900 mb-2">Bank-level Security</h5>
                        <p className="text-sm text-gray-600">Protected by CDR compliance and enterprise-grade encryption</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-md">
                        <h5 className="font-medium text-gray-900 mb-2">Privacy-first</h5>
                        <p className="text-sm text-gray-600">We never sell your data or access more than you consent to</p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-md">
                        <h5 className="font-medium text-gray-900 mb-2">Real-time Processing</h5>
                        <p className="text-sm text-gray-600">Instant reward assignment as soon as you make a purchase</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Choose Your Account Type
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Select the type of loyalty program that best fits your business needs.
                    </p>
                  </div>
                  
                  {/* Placeholder for content */}
                  <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-center">
                      Step 2 content will be designed here
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Choose Your Account Type
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Select the type of loyalty program that best fits your business needs.
                    </p>
                  </div>
                  
                  {/* Placeholder for content */}
                  <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-center">
                      Step 3 content will be designed here
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Business Information
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Tell us about your business so we can personalise your experience.
                    </p>
                  </div>
                  
                  {/* Placeholder for content */}
                  <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-center">
                      Step 4 content will be designed here
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Rewards Setup
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Configure your first rewards to start engaging customers.
                    </p>
                  </div>
                  
                  {/* Placeholder for content */}
                  <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-center">
                      Step 5 content will be designed here
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      Setup Complete!
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Your Tap Loyalty account is ready. Let's start building customer relationships!
                    </p>
                  </div>
                  
                  {/* Placeholder for content */}
                  <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                    <p className="text-gray-500 text-center">
                      Step 6 content will be designed here
                    </p>
                  </div>
                </div>
              )}
                         </div>
           </div>
         </div>

                {/* Footer Navigation */}
        {currentStep >= 0 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                disabled={!canGoBack}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  canGoBack
                    ? "text-gray-700 hover:bg-gray-100"
                    : "text-gray-400 cursor-not-allowed"
                )}
              >
                <ChevronLeft size={16} />
                Back
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
              Step {currentStep + 1} of {steps.length}
            </div>

            <div className="flex items-center gap-4">
              {currentStep === steps.length - 1 ? (
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 px-6 py-2 bg-[#007AFF] text-white text-sm font-medium rounded-md hover:bg-[#0066CC] transition-colors"
                >
                  Get Started
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md transition-colors",
                    canGoNext
                      ? "bg-[#007AFF] text-white hover:bg-[#0066CC]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 