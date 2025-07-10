"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Check, Coffee, DollarSign, Info, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, addDoc, query, where, getDocs } from "firebase/firestore";
import Image from "next/image";

interface SetupPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface RewardFormData {
  rewardName: string;
  description: string;
  itemName: string;
  pin: string;
  type: "voucher" | "freeItem";
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
  
  // Rewards setup state
  const [createdRewards, setCreatedRewards] = useState<RewardFormData[]>([]);
  const [currentRewardForm, setCurrentRewardForm] = useState<RewardFormData>({
    rewardName: "",
    description: "",
    itemName: "",
    pin: "",
    type: "voucher"
  });
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [isCreatingReward, setIsCreatingReward] = useState(false);
  const [isSavingRewards, setIsSavingRewards] = useState(false);

  const steps = [
    { id: "what-is-tap", label: "What is Tap Loyalty?", description: "Understanding the platform" },
    { id: "how-tap-works", label: "How Tap Works", description: "AutoTap™ technology explained" },
    { id: "for-customers-merchants", label: "For Customers & Merchants", description: "Detailed benefits for each" },
    { id: "upload-logo", label: "Upload Company Logo", description: "Add your business branding" },
    { id: "account-type", label: "Account Type", description: "Choose your setup" },
    { id: "rewards-setup", label: "Rewards Setup", description: "Configure your first rewards" },
    { id: "complete", label: "Complete", description: "You're ready to go!" },
  ];

  const canGoNext = currentStep < steps.length - 1;
  const canGoBack = currentStep > 0;

  // Function to save created rewards to Firebase
  const saveRewardsToFirebase = async () => {
    if (!user?.uid || createdRewards.length === 0) return;

    setIsSavingRewards(true);
    try {
      const promises = createdRewards.map(async (reward) => {
        const timestamp = new Date().toISOString();
        
        const rewardData = {
          rewardName: reward.rewardName,
          description: reward.description,
          type: reward.type,
          isIntroductoryReward: true,
          fundedByTapLoyalty: true,
          maxValue: 5.00,
          itemName: reward.type === "freeItem" ? reward.itemName : "",
          voucherAmount: reward.type === "voucher" ? 5.00 : 0,
          itemValue: reward.type === "freeItem" ? 5.00 : 0,
          pin: reward.pin,
          isActive: true,
          status: "active",
          createdAt: timestamp,
          updatedAt: timestamp,
          merchantId: user.uid,
          rewardVisibility: "global",
          pointsCost: 0,
          redemptionCount: 0,
          uniqueCustomersCount: 0,
          limitations: [
            {
              type: "customerLimit",
              value: 1
            }
          ]
        };

        // Create in merchant's rewards subcollection
        const merchantRewardsRef = collection(db, 'merchants', user.uid, 'rewards');
        const newRewardRef = await addDoc(merchantRewardsRef, rewardData);
        
        // Add the ID to the reward data
        const rewardWithId = { ...rewardData, id: newRewardRef.id };
        
        // Update the merchant's reward with the ID
        await setDoc(
          doc(db, 'merchants', user.uid, 'rewards', newRewardRef.id),
          rewardWithId
        );

        // Also save to top-level rewards collection
        await setDoc(
          doc(db, 'rewards', newRewardRef.id),
          rewardWithId
        );

        return newRewardRef.id;
      });

      const rewardIds = await Promise.all(promises);

      // Update merchant document with introductory rewards info
      const merchantRef = doc(db, 'merchants', user.uid);
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: true,
          introductoryRewardIds: rewardIds,
          introductoryRewardCount: rewardIds.length,
          setupCompleted: true,
          setupCompletedAt: serverTimestamp()
        },
        { merge: true }
      );

      console.log(`Successfully created ${rewardIds.length} introductory rewards`);
    } catch (error) {
      console.error("Error saving rewards to Firebase:", error);
      alert("There was an error saving your rewards. Please try again.");
    } finally {
      setIsSavingRewards(false);
    }
  };

  const handleNext = async () => {
    if (canGoNext) {
      // If we're on the rewards setup step and moving to completion, save the rewards
      if (currentStep === 6 && currentStep + 1 === 7) {
        await saveRewardsToFirebase();
      }
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
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent animate-pulse" style={{ animationDuration: '3s' }}>Get Started</h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {/* Main Content */}
          <div className="px-6 py-8">
            {currentStep === -1 && (
              <div className="text-center space-y-6 max-w-2xl mx-auto animate-in fade-in duration-500">
                <div className="space-y-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Welcome to Tap Loyalty
                  </h3>
                  <p className="text-base text-gray-600">
                    Setup only takes a few minutes.
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
              <div className="space-y-8 animate-in fade-in duration-500">
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
                  <div className="bg-gray-50 rounded-md p-6 border border-transparent transition-all duration-300 hover:border-gray-300 cursor-pointer">
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
                  <div className="bg-gray-50 rounded-md p-6 border border-transparent transition-all duration-300 hover:border-gray-300 cursor-pointer">
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
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Customer App
                  </h3>
                  <p className="text-base text-gray-600 mb-2">
                    Customers download the Tap Loyalty app to automatically earn rewards.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Available on iPhone (Android coming soon)
                  </p>
                  
                  <div className="flex justify-center mb-8">
                    <img 
                      src="/appstore.svg" 
                      alt="Available on App Store" 
                      className="h-12 w-auto"
                    />
                  </div>
                </div>
                
                <div className="flex justify-center gap-8 px-16">
                  <div className="flex-shrink-0">
                    <img 
                      src="/vp1.png" 
                      alt="Tap Loyalty App Screenshot 1" 
                      className="w-80 h-auto rounded-md"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <img 
                      src="/vp2.png" 
                      alt="Tap Loyalty App Screenshot 2" 
                      className="w-80 h-auto rounded-md"
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <img 
                      src="/vp3.png" 
                      alt="Tap Loyalty App Screenshot 3" 
                      className="w-80 h-auto rounded-md"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Merchant Portal
                  </h3>
                  <p className="text-base text-gray-600 mb-6">
                    Your powerful dashboard to manage loyalty programs and track customer engagement.
                  </p>
                </div>
                
                {/* Placeholder for merchant portal image */}
                <div className="flex justify-center">
                  <div className="bg-gray-100 rounded-md p-12 border-2 border-dashed border-gray-300">
                    <p className="text-gray-500 text-center">
                      Merchant portal image will be added here
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6 text-center animate-in fade-in duration-500">
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
              <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
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

            {currentStep === 5 && (
              <div className="space-y-8 animate-in fade-in duration-500">
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

            {currentStep === 6 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Create Introductory Rewards
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Create up to 3 special rewards funded by Tap Loyalty to welcome new customers.
                  </p>
                </div>
                
                <div className="max-w-2xl mx-auto">
                  {/* Info Banner */}
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">About Introductory Rewards ({createdRewards.length}/3)</p>
                        <p>Each reward is worth up to $5 and is funded by Tap Loyalty. These rewards help attract new customers and each customer can only redeem one introductory reward across the entire platform.</p>
                      </div>
                    </div>
                  </div>

                  {/* Created Rewards List */}
                  {createdRewards.length > 0 && (
                    <div className="space-y-3 mb-6">
                      <h4 className="font-medium text-gray-900">Your Introductory Rewards</h4>
                                             {createdRewards.map((reward, index) => (
                         <div key={index} className="border border-gray-200 rounded-md p-4 bg-gray-50">
                           <div className="flex items-start justify-between">
                             <div>
                               <div className="flex items-center gap-2 mb-2">
                                 <h5 className="font-medium text-gray-900">{reward.rewardName}</h5>
                                 <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-md">
                                   <img src="/taplogo.png" alt="Tap" className="h-3 w-auto" />
                                   Funded by Tap Loyalty
                                 </span>
                               </div>
                               <p className="text-sm text-gray-600">{reward.description}</p>
                               <p className="text-xs text-gray-500 mt-1">
                                 {reward.type === "voucher" 
                                   ? "$5.00 voucher" 
                                   : `Free ${reward.itemName}`} • PIN: {reward.pin}
                               </p>
                             </div>
                            <button
                              onClick={() => {
                                const newRewards = createdRewards.filter((_, i) => i !== index);
                                setCreatedRewards(newRewards);
                              }}
                              className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add New Reward Button */}
                  {!showRewardForm && createdRewards.length < 3 && (
                    <div className="text-center mb-6">
                      <button
                        onClick={() => {
                          setShowRewardForm(true);
                          setCurrentRewardForm({
                            rewardName: "",
                            description: "",
                            itemName: "",
                            pin: "",
                            type: "voucher"
                          });
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#007AFF] text-white rounded-md text-sm font-medium hover:bg-[#0066CC] transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                        Create Introductory Reward
                      </button>
                    </div>
                  )}

                  {/* Reward Creation Form */}
                  {showRewardForm && (
                    <div className="border border-gray-200 rounded-md p-6 space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-900">Create New Reward</h4>
                        <button
                          onClick={() => setShowRewardForm(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Reward Type Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reward Type</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div
                            className={cn(
                              "border rounded-md p-3 cursor-pointer transition-all",
                              currentRewardForm.type === "voucher" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => setCurrentRewardForm({...currentRewardForm, type: "voucher"})}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center",
                                currentRewardForm.type === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                              )}>
                                <DollarSign className="h-3 w-3" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">Gift Voucher</p>
                                <p className="text-xs text-gray-500">$5 credit</p>
                              </div>
                            </div>
                          </div>
                          <div
                            className={cn(
                              "border rounded-md p-3 cursor-pointer transition-all",
                              currentRewardForm.type === "freeItem" 
                                ? "border-blue-500 bg-blue-50" 
                                : "border-gray-200 hover:border-gray-300"
                            )}
                            onClick={() => setCurrentRewardForm({...currentRewardForm, type: "freeItem"})}
                          >
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "h-6 w-6 rounded-full flex items-center justify-center",
                                currentRewardForm.type === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                              )}>
                                <Coffee className="h-3 w-3" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">Free Item</p>
                                <p className="text-xs text-gray-500">Up to $5 value</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Reward Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reward Name</label>
                        <input
                          type="text"
                          value={currentRewardForm.rewardName}
                          onChange={(e) => setCurrentRewardForm({...currentRewardForm, rewardName: e.target.value})}
                          placeholder={currentRewardForm.type === "voucher" ? "e.g., Welcome $5 Voucher" : "e.g., Free Coffee for New Customers"}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                          value={currentRewardForm.description}
                          onChange={(e) => setCurrentRewardForm({...currentRewardForm, description: e.target.value})}
                          placeholder={currentRewardForm.type === "voucher" 
                            ? "e.g., Enjoy $5 off your first purchase as a welcome gift!" 
                            : "e.g., Welcome! Enjoy a free coffee on your first visit."}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                      </div>

                      {/* Free Item Name (conditional) */}
                      {currentRewardForm.type === "freeItem" && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Free Item Name</label>
                          <input
                            type="text"
                            value={currentRewardForm.itemName}
                            onChange={(e) => setCurrentRewardForm({...currentRewardForm, itemName: e.target.value})}
                            placeholder="e.g., Regular Coffee, Pastry, etc."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                          />
                          <p className="text-xs text-gray-500 mt-1">Item must be valued at $5 or less</p>
                        </div>
                      )}

                      {/* PIN */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Redemption PIN</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={currentRewardForm.pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setCurrentRewardForm({...currentRewardForm, pin: value});
                          }}
                          placeholder="4-digit PIN"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
                        />
                        <p className="text-xs text-gray-500 mt-1">Enter a 4-digit PIN required for redemption</p>
                      </div>

                      {/* Form Actions */}
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                          onClick={() => setShowRewardForm(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            // Validate form
                            if (!currentRewardForm.rewardName.trim()) {
                              alert("Please enter a reward name");
                              return;
                            }
                            if (!currentRewardForm.description.trim()) {
                              alert("Please enter a description");
                              return;
                            }
                            if (currentRewardForm.type === "freeItem" && !currentRewardForm.itemName.trim()) {
                              alert("Please enter the free item name");
                              return;
                            }
                            if (!currentRewardForm.pin.trim() || currentRewardForm.pin.length !== 4) {
                              alert("Please enter a 4-digit PIN");
                              return;
                            }

                            // Add to created rewards
                            setCreatedRewards([...createdRewards, currentRewardForm]);
                            setShowRewardForm(false);
                          }}
                          disabled={isCreatingReward}
                          className="px-4 py-2 bg-[#007AFF] text-white rounded-md hover:bg-[#0066CC] transition-colors disabled:opacity-50"
                        >
                          Add Reward
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Skip Option */}
                  <div className="text-center text-sm text-gray-500">
                    You can create rewards later from your dashboard if you prefer to skip this step.
                  </div>
                </div>
              </div>
            )}

            {currentStep === 7 && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Setup Complete!
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Your Tap Loyalty account is ready. Let's start building customer relationships!
                  </p>
                </div>
                
                <div className="max-w-lg mx-auto space-y-4">
                  <div className="p-6 bg-green-50 rounded-md border border-green-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                      <h4 className="font-semibold text-gray-900">You're All Set!</h4>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>✓ Account created and configured</li>
                      <li>✓ Rewards program activated</li>
                      <li>✓ AutoTap matching enabled</li>
                      {createdRewards.length > 0 && (
                        <li>✓ {createdRewards.length} introductory reward{createdRewards.length > 1 ? 's' : ''} created</li>
                      )}
                    </ul>
                  </div>

                  {createdRewards.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
                      <h5 className="font-medium text-gray-900 mb-2">Your Introductory Rewards</h5>
                                             <div className="space-y-1">
                         {createdRewards.map((reward, index) => (
                           <div key={index} className="text-sm text-gray-700">
                             <span>• {reward.rewardName}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                  )}
                  
                  <div className="text-center">
                    <button
                      onClick={() => onOpenChange(false)}
                      className="bg-[#007AFF] text-white px-6 py-2 rounded-md font-medium text-sm hover:bg-[#0066CC] transition-colors"
                    >
                      Go to Dashboard
                    </button>
                  </div>
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
                  disabled={!canGoNext || isSavingRewards}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md transition-colors",
                    canGoNext && !isSavingRewards
                      ? "bg-[#007AFF] text-white hover:bg-[#0066CC]"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {isSavingRewards && currentStep === 6 ? "Saving Rewards..." : "Next"}
                  {!isSavingRewards && <ChevronRight size={16} />}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 