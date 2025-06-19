"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import Image from "next/image";

interface SetupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetupPopup({ open, onOpenChange }: SetupPopupProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(-1); // Start at welcome screen
  const [howTapWorksTab, setHowTapWorksTab] = useState<"customers" | "merchants">("customers"); // For How Tap Works tabs
  const [showAutoTapInfo, setShowAutoTapInfo] = useState(false); // For AutoTap technology popup
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
    { id: "for-customers-merchants", label: "For Customers & Merchants", description: "Detailed benefits for each" },
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



  const uploadToFirebaseStorage = async () => {
    if (!uploadedLogo || !user?.uid) {
      alert(!uploadedLogo ? 'Please select a logo first' : 'Authentication required');
      return;
    }

    console.log('Starting upload with user:', user.uid);
    setIsUploading(true);
    
    try {
      const logoId = uuidv4();
      const storagePath = `merchants/${user.uid}/files/${logoId}`;
      console.log('Upload path:', storagePath);
      
      // Upload to Firebase Storage using the same path as notes page (temporarily for testing)
      const storageRef = ref(getStorage(), storagePath);
      const uploadTask = uploadBytesResumable(storageRef, uploadedLogo, { 
        contentType: uploadedLogo.type || 'application/octet-stream' 
      });
      
      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Handle progress if needed
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload progress: ${progress}%`);
          },
          (error) => {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
            reject(error);
          },
          async () => {
            try {
              // Get download URL after successful upload
              const downloadURL = await getDownloadURL(storageRef);
              
              // Save logo URL to Firestore in merchants/{merchantId} document
              const merchantDocRef = doc(db, `merchants/${user.uid}`);
              await setDoc(merchantDocRef, {
                logoUrl: downloadURL,
                logoUpdatedAt: serverTimestamp()
              }, { merge: true }); // Use merge to update existing document or create new one
              
              setUploadedUrl(downloadURL);
              alert(`Logo uploaded and saved successfully!`);
              resolve();
            } catch (e) {
              console.error('Error saving logo URL to Firestore:', e);
              alert('Upload completed but failed to save to database');
              reject(e);
            }
          }
        );
      });
      
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
              <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    How Tap Works
                  </h3>
                  <div className="space-y-3">
                    <p className="text-base text-gray-600">
                    Our proprietary AutoTap™ technology makes loyalty effortless for everyone.
                    </p>
                    <p className="text-base">
                      <span className="bg-gradient-to-r from-[#007AFF] to-[#0066CC] text-transparent bg-clip-text font-semibold text-lg">
                        No Cards. No Email Addresses. No Sign Ups.
                      </span>
                    </p>
                  </div>
                </div>

                                 {/* Process Steps - Two Columns */}
                 <div className="bg-white border border-gray-200 rounded-md p-6">
                   <div className="max-w-4xl mx-auto">
                     <div className="grid md:grid-cols-2 gap-8">
                       {/* Left Column - Setup Process */}
                       <div>
                         <h4 className="font-semibold text-gray-900 text-base mb-4 text-center">Setup Process</h4>
                         <div className="space-y-4">
                           {/* Step 1 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">1</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">Download App</h5>
                               <p className="text-gray-600 text-sm">Customer downloads the Tap Loyalty iPhone app</p>
                             </div>
                           </div>

                           {/* Step 2 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">2</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">Connect Bank</h5>
                               <p className="text-gray-600 text-sm">AutoTap™ securely connects using CDR - government accredited, bank-level security</p>
                             </div>
                           </div>
                         </div>
                       </div>

                       {/* Right Column - How It Works */}
                       <div>
                         <h4 className="font-semibold text-gray-900 text-base mb-4 text-center">How It Works</h4>
                         <div className="space-y-4">
                           {/* Step 3 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">3</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">Shop Normally</h5>
                               <p className="text-gray-600 text-sm">Customer pays normally at your store (not using any app)</p>
                             </div>
                           </div>

                           {/* Step 4 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">4</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">AutoTap Matches</h5>
                               <p className="text-gray-600 text-sm">Our matching algorithms determine if they shopped at your store</p>
                             </div>
                           </div>

                           {/* Step 5 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">5</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">Earn Points</h5>
                               <p className="text-gray-600 text-sm">Customer automatically earns loyalty points</p>
                             </div>
                           </div>

                           {/* Step 6 */}
                           <div className="flex items-center gap-4">
                             <div className="w-8 h-8 bg-[#007AFF] rounded-full flex items-center justify-center flex-shrink-0">
                               <span className="text-white font-medium text-sm">6</span>
                             </div>
                             <div>
                               <h5 className="font-medium text-gray-900 text-sm mb-1">Redeem Rewards</h5>
                               <p className="text-gray-600 text-sm">Customer redeems rewards across the entire network</p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
                 </div>

                                 {/* What is AutoTap button */}
                 <div className="text-center">
                   <button
                     onClick={() => setShowAutoTapInfo(true)}
                     className="inline-flex items-center gap-1 px-4 py-2 text-[#007AFF] text-sm font-medium border border-[#007AFF] rounded-md hover:bg-[#007AFF] hover:text-white transition-colors"
                   >
                     What is AutoTap?
                   </button>
                 </div>

                {/* AutoTap Technology Popup */}
                {showAutoTapInfo && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAutoTapInfo(false)}>
                    <div className="bg-white rounded-md p-6 max-w-2xl mx-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-lg font-semibold text-gray-900">AutoTap™ Technology</h4>
                        <button
                          onClick={() => setShowAutoTapInfo(false)}
                          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <p className="text-gray-600 text-center mb-8 leading-relaxed">
                        Our technology uses Australia's Open Banking framework to securely detect your purchases and automatically assign rewards in real-time.
                      </p>
                      
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-md">
                          <h5 className="font-semibold text-gray-900 mb-2">CDR Approved</h5>
                          <p className="text-sm text-gray-600">Government accredited and bank-level security compliance</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-md">
                          <h5 className="font-semibold text-gray-900 mb-2">Privacy-first</h5>
                          <p className="text-sm text-gray-600">We never sell your data or access more than you consent to</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-md">
                          <h5 className="font-semibold text-gray-900 mb-2">Matching Algorithms</h5>
                          <p className="text-sm text-gray-600">Advanced algorithms detect purchases at participating merchants</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    For Customers & Merchants
                  </h3>
                  <p className="text-base text-gray-600">
                    Understanding the benefits for both sides of the Tap Loyalty ecosystem
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
                <div className="bg-gray-50 rounded-md p-8">
                {howTapWorksTab === "customers" && (
                    <div className="space-y-6">
                      <h4 className="text-base font-semibold text-gray-900 text-center">Benefits for Customers</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Effortless Earning</h5>
                              <p className="text-sm text-gray-600">Automatically earn rewards at hundreds of merchants without carrying cards or scanning codes</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Network Benefits</h5>
                              <p className="text-sm text-gray-600">Earn points at one merchant and redeem at any other participating business</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Never Miss Rewards</h5>
                              <p className="text-sm text-gray-600">Even if you forget about the program, you'll still earn points automatically</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Bank-level Security</h5>
                              <p className="text-sm text-gray-600">Your data is protected by government-approved CDR frameworks</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">One-time Setup</h5>
                              <p className="text-sm text-gray-600">Connect once and automatically join every participating merchant's program</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Privacy Protected</h5>
                              <p className="text-sm text-gray-600">We never sell your data or access more than you consent to</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {howTapWorksTab === "merchants" && (
                    <div className="space-y-6">
                      <h4 className="text-base font-semibold text-gray-900 text-center">Benefits for Merchants</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Zero Setup Required</h5>
                              <p className="text-sm text-gray-600">No hardware installation, no staff training, no changes to your checkout process</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Automatic Customer Engagement</h5>
                              <p className="text-sm text-gray-600">Tap customers are automatically enrolled in your loyalty program when they shop</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Network Effect</h5>
                              <p className="text-sm text-gray-600">Benefit from customers who discover you through the Tap network</p>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">AI-Powered Insights</h5>
                              <p className="text-sm text-gray-600">Tap Agent creates personalised rewards for each customer every week</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Powerful Dashboard</h5>
                              <p className="text-sm text-gray-600">Track customer behaviour and send personalised offers to drive repeat business</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                            <div>
                              <h5 className="font-medium text-gray-900">Seamless Operations</h5>
                              <p className="text-sm text-gray-600">Your checkout process remains exactly the same - no disruption to operations</p>
                        </div>
                      </div>
                        </div>
                      </div>
                    </div>
                  )}
                    </div>
                  </div>
                )}

            {currentStep === 3 && (
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
                        <div className="space-y-3">
                          <div className="w-16 h-16 mx-auto rounded-md overflow-hidden">
                            <img 
                              src={logoPreview} 
                              alt="Logo preview" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                      <div className="text-center">
                            <p className="text-xs text-gray-500">
                              Logo should be square for best results
                          </p>
                        </div>
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
                        <p className="text-xs text-gray-500">Square logos work best • PNG, JPG or SVG up to 5MB</p>
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
                        onClick={uploadToFirebaseStorage}
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

            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Choose Your Account Type
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Select the mode that best fits your business goals. You can upgrade anytime.
                  </p>
                </div>
                
                <div className="max-w-lg mx-auto">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Tap Standard */}
                    <button
                      onClick={() => setSelectedAccountType("standard")}
                      className={cn(
                        "p-6 rounded-md border-2 text-center transition-all hover:border-[#007AFF]",
                        selectedAccountType === "standard"
                          ? "border-[#007AFF] bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto overflow-hidden">
                          <Image 
                            src="/taplogo.png" 
                            alt="Tap Standard" 
                            width={96}
                            height={96}
                            className="w-full h-full object-contain"
                            quality={100}
                            unoptimized={true}
                          />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Tap Standard</p>
                          <p className="text-xs text-gray-500 mt-1">Your rules, your points.</p>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAccountDetails("standard");
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
                        <div className="w-12 h-12 bg-gray-100 rounded-md mx-auto overflow-hidden">
                          <Image 
                            src="/tappro.png" 
                            alt="Tap Network" 
                            width={96}
                            height={96}
                            className="w-full h-full object-contain"
                            quality={100}
                            unoptimized={true}
                          />
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
                  <Image 
                    src="/new.png" 
                    alt="Decorative bottom image" 
                    width={400}
                    height={300}
                    className="w-2/3 max-w-md h-auto object-contain"
                    quality={95}
                    priority={false}
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
                          {showAccountDetails === "standard" && "Tap Standard"}
                          {showAccountDetails === "network" && "Tap Network"}
                        </h4>
                        <button
                          onClick={handleClosePopup}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {showAccountDetails === "standard" && (
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

            {currentStep === 5 && (
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
                    Step 6 content will be designed here
                  </p>
                </div>
              </div>
            )}

            {currentStep === 6 && (
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
                    Step 7 content will be designed here
                  </p>
                </div>
              </div>
            )}

            {currentStep === 7 && (
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
                    Step 8 content will be designed here
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