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
  const [selectedAccountType, setSelectedAccountType] = useState<string | null>(null); // For account type selection
  const [showAccountDetails, setShowAccountDetails] = useState<string | null>(null); // For account type details popup
  const [isPopupClosing, setIsPopupClosing] = useState(false); // For smooth exit animation
  const [uploadedLogo, setUploadedLogo] = useState<File | null>(null); // For uploaded logo file
  const [logoPreview, setLogoPreview] = useState<string | null>(null); // For logo preview URL
  const [isUploading, setIsUploading] = useState(false); // For upload loading state
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null); // For uploaded file URL

  const steps = [
    { id: "what-is-tap", label: "What is Tap Loyalty?", description: "Understanding the platform" },
    { id: "how-tap-works", label: "How Tap Works", description: "AutoTap™ technology explained" },
    { id: "upload-logo", label: "Upload Company Logo", description: "Add your business branding" },
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

  const handleClosePopup = () => {
    setIsPopupClosing(true);
    setTimeout(() => {
      setShowAccountDetails(null);
      setIsPopupClosing(false);
    }, 200); // Match animation duration
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file (PNG, JPG, or SVG)');
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      setUploadedLogo(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
    }
  };

  const triggerFileUpload = () => {
    const fileInput = document.getElementById('logo-upload') as HTMLInputElement;
    fileInput?.click();
  };

  const generateMerchantId = () => {
    // Generate a temporary merchant ID - in production, this would come from your auth/user system
    return `merchant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const uploadToGCS = async () => {
    if (!uploadedLogo) {
      alert('Please select a logo first');
      return;
    }

    setIsUploading(true);
    
    try {
      const merchantId = generateMerchantId();
      const fileName = `logo.${uploadedLogo.name.split('.').pop()}`;
      const filePath = `merchants/${merchantId}/${fileName}`;

      // Create FormData for the upload
      const formData = new FormData();
      formData.append('file', uploadedLogo);
      formData.append('bucket', 'tap-loyalty-fb6d0');
      formData.append('path', filePath);

      // Upload to your server endpoint that handles GCS upload
      const response = await fetch('/api/upload-to-gcs', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadedUrl(result.url);
      alert(`Logo uploaded successfully! Merchant ID: ${merchantId}`);
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-md w-full max-w-5xl shadow-lg h-[95vh] min-h-[750px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <img 
              src="/taplogo.png" 
              alt="Tap Logo" 
              className="h-8 w-auto rounded-sm"
            />
          </div>
          <div className="flex-1 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Get Started</h2>
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
          <div className={currentStep === -1 ? "px-6" : "px-6 py-8"}>
            {currentStep === -1 && (
              <div className="text-center space-y-6 max-w-2xl mx-auto">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">
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
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    What is Tap Loyalty?
                  </h3>
                  <p className="text-base text-gray-600 mb-6">
                    Automatic rewards for your favourite places - loyalty made effortlessly simple.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* For Customers */}
                  <div className="bg-blue-50 rounded-md p-6">
                    <h4 className="text-base font-semibold text-gray-900 mb-4">For Customers</h4>
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
                    <h4 className="text-base font-semibold text-gray-900 mb-4">For Merchants</h4>
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
              <div className="space-y-3">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    How Tap Works
                  </h3>
                  <p className="text-base text-gray-600 mb-3">
                    Our proprietary AutoTap™ technology makes loyalty effortless for everyone.
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-center">
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
                </div>

                {/* Tab Content */}
                {howTapWorksTab === "customers" && (
                  <div className="space-y-8">
                    {/* Three-step process for customers */}
                    <div className="grid md:grid-cols-3 gap-8">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-[#007AFF] rounded-full flex items-center justify-center text-white font-bold text-xl mb-4 mx-auto">1</div>
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Download & Connect</h4>
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
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Shop Normally</h4>
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
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Earn & Redeem</h4>
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
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Quick Setup</h4>
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
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Customers Shop</h4>
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
                        <h4 className="text-base font-semibold text-gray-900 mb-3">Engage & Grow</h4>
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
                  <h4 className="text-base font-semibold text-gray-900 mb-4">AutoTap™ Technology</h4>
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
              <div className="space-y-6 text-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Upload Company Logo
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Add your business logo to personalise your loyalty program.
                  </p>
                </div>
                
                <div className="max-w-lg mx-auto">
                  {/* Hidden file input */}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  
                  {/* Upload area */}
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-md p-6 hover:border-gray-400 transition-colors cursor-pointer"
                    onClick={triggerFileUpload}
                  >
                    <div className="space-y-4">
                      {logoPreview ? (
                        <div className="w-16 h-16 mx-auto rounded-md overflow-hidden">
                          <img 
                            src={logoPreview} 
                            alt="Logo preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center mx-auto">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {uploadedLogo ? uploadedLogo.name : "Upload your logo"}
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG or SVG up to 5MB</p>
                      </div>
                      <button 
                        type="button"
                        className="bg-[#007AFF] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#0066CC] transition-colors"
                      >
                        {uploadedLogo ? "Change File" : "Choose File"}
                      </button>
                    </div>
                  </div>
                  
                  {/* Upload and Skip options */}
                  <div className="mt-6 space-y-3">
                    {uploadedLogo && !uploadedUrl && (
                      <button
                        onClick={uploadToGCS}
                        disabled={isUploading}
                        className={cn(
                          "w-full px-4 py-2 rounded-md text-sm font-medium transition-colors",
                          isUploading
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 text-white hover:bg-green-700"
                        )}
                      >
                        {isUploading ? "Uploading..." : "Upload Logo"}
                      </button>
                    )}
                    
                    {uploadedUrl && (
                      <div className="text-center">
                        <p className="text-sm text-green-600 font-medium">✓ Logo uploaded successfully!</p>
                        <p className="text-xs text-gray-500 mt-1">Stored in GCS bucket</p>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <button className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                        Skip for now
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Choose Your Account Type
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Select the mode that best fits your business goals. You can upgrade anytime.
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Tap Lite */}
                    <button
                      onClick={() => setSelectedAccountType("lite")}
                      className={cn(
                        "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF]",
                        selectedAccountType === "lite"
                          ? "border-[#007AFF] bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Tap Lite</p>
                          <p className="text-xs text-gray-500 mt-1">Get seen. Get spend.</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAccountDetails("lite");
                            }}
                            className="text-xs text-[#007AFF] hover:text-[#0066CC] mt-2 transition-colors"
                          >
                            Learn more
                          </button>
                        </div>
                      </div>
                    </button>

                    {/* Tap Pro */}
                    <button
                      onClick={() => setSelectedAccountType("pro")}
                      className={cn(
                        "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF]",
                        selectedAccountType === "pro"
                          ? "border-[#007AFF] bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Tap Pro</p>
                          <p className="text-xs text-gray-500 mt-1">Your rules, your points.</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAccountDetails("pro");
                            }}
                            className="text-xs text-[#007AFF] hover:text-[#0066CC] mt-2 transition-colors"
                          >
                            Learn more
                          </button>
                        </div>
                      </div>
                    </button>

                    {/* Tap Network */}
                    <button
                      onClick={() => setSelectedAccountType("network")}
                      className={cn(
                        "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF]",
                        selectedAccountType === "network"
                          ? "border-[#007AFF] bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Tap Network</p>
                          <p className="text-xs text-gray-500 mt-1">Earn here, spend everywhere.</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAccountDetails("network");
                            }}
                            className="text-xs text-[#007AFF] hover:text-[#0066CC] mt-2 transition-colors"
                          >
                            Learn more
                          </button>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Image */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center pointer-events-none">
                  <img 
                    src="/new.png" 
                    alt="Decorative bottom image" 
                    className="w-2/3 max-w-md h-auto object-contain"
                  />
                </div>

                {/* Account Details Mini Popup */}
                {showAccountDetails && (
                  <div 
                    className={cn(
                      "fixed inset-0 bg-black/20 flex items-center justify-center z-50 duration-200",
                      isPopupClosing 
                        ? "animate-out fade-out" 
                        : "animate-in fade-in"
                    )} 
                    onClick={handleClosePopup}
                  >
                    <div 
                      className={cn(
                        "bg-white rounded-md p-6 max-w-md mx-4 shadow-lg duration-200",
                        isPopupClosing 
                          ? "animate-out zoom-out-95 fade-out" 
                          : "animate-in zoom-in-95 fade-in"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {showAccountDetails === "lite" && "Tap Lite"}
                          {showAccountDetails === "pro" && "Tap Pro"}
                          {showAccountDetails === "network" && "Tap Network"}
                        </h4>
                        <button
                          onClick={handleClosePopup}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {showAccountDetails === "lite" && (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            <strong>Perfect for:</strong> Merchants who want immediate exposure without program complexity.
                          </p>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">What you get:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Accept Universal TapPoints from any merchant</li>
                              <li>• Purchase ad slots and boosted placement</li>
                              <li>• AI-generated smart offers for your business</li>
                              <li>• No loyalty program setup required</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Pricing:</h5>
                            <p className="text-sm text-gray-600">Pay-per-conversion or CPC advertising fees</p>
                          </div>
                        </div>
                      )}

                      {showAccountDetails === "pro" && (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            <strong>Perfect for:</strong> Established brands who want full control over their loyalty ecosystem.
                          </p>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">What you get:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Create custom rewards and loyalty programs</li>
                              <li>• Points stay within your business only</li>
                              <li>• Full control over point-to-dollar ratios</li>
                              <li>• Advanced analytics and customer insights</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Pricing:</h5>
                            <p className="text-sm text-gray-600">Monthly subscription (no interchange fees)</p>
                          </div>
                        </div>
                      )}

                      {showAccountDetails === "network" && (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600">
                            <strong>Perfect for:</strong> Forward-thinking merchants who want to maximise network benefits.
                          </p>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">What you get:</h5>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Create custom rewards and loyalty programs</li>
                              <li>• Accept Universal TapPoints from any merchant</li>
                              <li>• Cross-merchant promotions and bundles</li>
                              <li>• Featured placement in app discovery</li>
                            </ul>
                          </div>
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-2">Pricing:</h5>
                            <p className="text-sm text-gray-600">Monthly subscription + small interchange on redemptions</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Business Information
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Tell us about your business so we can personalise your experience.
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
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Rewards Setup
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Configure your first rewards to start engaging customers.
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

            {currentStep === 6 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Setup Complete!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your Tap Loyalty account is ready. Let's start building customer relationships!
                  </p>
                </div>
                
                {/* Placeholder for content */}
                <div className="bg-gray-50 rounded-md p-6 border-2 border-dashed border-gray-200">
                  <p className="text-gray-500 text-center">
                    Step 7 content will be designed here
                  </p>
                </div>
              </div>
            )}
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