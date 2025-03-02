"use client"

// This file exists only to satisfy Tailwind's content scanning
// The actual onboarding functionality is in src/app/onboarding/page.tsx 

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, updateDoc, writeBatch } from "firebase/firestore"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { ArrowRight, CheckCircle, Coffee, Gift, Store, Users, Upload, Sparkles, Award, BarChart, Image, Utensils, Percent, Cake, Wine, UtensilsCrossed, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import { collection } from "firebase/firestore"

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [businessData, setBusinessData] = useState({
    logoUrl: "",
    hasSetupReward: false,
    selectedRewards: [] as {
      id: string,
      name: string,
      type: string,
      industry: string,
      isNewCustomer: boolean,
      pointsCost: number,
      description: string
    }[],
    hasSetupPointsRule: false,
    pointsRuleDetails: null as { name: string, type: string } | null,
    hasSetupBanner: false,
    bannerDetails: null as { name: string, type: string } | null
  })
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  
  const totalSteps = 4
  
  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1)
    } else {
      handleComplete()
    }
  }
  
  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }
  
  const handleComplete = async () => {
    if (!user?.uid) return
    
    try {
      setLoading(true)
      
      // Create a batch to handle multiple Firestore operations
      const batch = writeBatch(db)
      
      // Save onboarding data to Firestore
      const merchantRef = doc(db, 'merchants', user.uid)
      batch.update(merchantRef, {
        logoUrl: businessData.logoUrl,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      })
      
      // Create the selected rewards
      for (const reward of businessData.selectedRewards) {
        const rewardRef = doc(collection(db, 'merchants', user.uid, 'rewards'))
        
        // Format the reward data according to the required structure
        const rewardData = {
          rewardName: reward.rewardName,
          description: reward.description,
          isActive: true,
          pointsCost: reward.pointsCost,
          rewardVisibility: 'global',
          conditions: reward.conditions || [],
          limitations: reward.limitations || [
            {
              type: 'customerLimit',
              value: 1
            },
            {
              type: 'totalRedemptionLimit',
              value: 100
            }
          ],
          createdAt: new Date().toISOString()
        }
        
        batch.set(rewardRef, rewardData)
      }
      
      // Commit all the changes
      await batch.commit()
      
      toast({
        title: "Onboarding completed!",
        description: `Your account has been set up successfully with ${businessData.selectedRewards.length} rewards.`,
      })
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return
    
    try {
      setLoading(true)
      
      const storage = getStorage()
      const storageRef = ref(storage, `merchants/${user.uid}/logo/${file.name}`)
      
      const snapshot = await uploadBytes(storageRef, file)
      const downloadURL = await getDownloadURL(snapshot.ref)
      
      setBusinessData(prev => ({
        ...prev,
        logoUrl: downloadURL
      }))
      
      const merchantRef = doc(db, 'merchants', user.uid)
      await updateDoc(merchantRef, {
        logoUrl: downloadURL,
        logoUpdatedAt: new Date().toISOString()
      })
      
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded and saved successfully."
      })
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({
        title: "Upload failed",
        description: "There was a problem uploading your logo. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }
  
  const navigateToSetup = (type: 'reward' | 'pointsRule' | 'banner') => {
    let route = ''
    let field = ''
    
    switch (type) {
      case 'reward':
        route = '/store/rewards/new'
        field = 'hasSetupReward'
        break
      case 'pointsRule':
        route = '/store/points/new'
        field = 'hasSetupPointsRule'
        break
      case 'banner':
        route = '/store/marketing/banners/new'
        field = 'hasSetupBanner'
        break
    }
    
    setBusinessData(prev => ({
      ...prev,
      [field]: true
    }))
    
    router.push(route)
  }

  const [selectedIndustry, setSelectedIndustry] = useState('cafe')
  const [rewardType, setRewardType] = useState('individual')
  const [expandedRewards, setExpandedRewards] = useState<Record<string, boolean>>({})

  const toggleRewardDetails = (rewardId: string) => {
    setExpandedRewards(prev => ({
      ...prev,
      [rewardId]: !prev[rewardId]
    }))
  }

  const handleRewardSelection = (rewardId: string, type: 'individual' | 'program') => {
    // Create a unique ID that includes both the reward ID and the type
    const uniqueId = `${rewardId}-${type}`;
    
    // Define the base reward details with the required JSON structure
    const rewardDetails = {
      id: uniqueId,
      name: '',
      type: type,
      industry: selectedIndustry,
      isNewCustomer: false,
      rewardName: '',
      description: '',
      isActive: true,
      pointsCost: 0,
      rewardVisibility: 'global',
      conditions: [] as any[],
      limitations: [
        {
          type: 'customerLimit',
          value: 1
        },
        {
          type: 'totalRedemptionLimit',
          value: 100
        }
      ]
    }
    
    // Set the specific details based on the reward ID and type
    switch (rewardId) {
      case 'cafe-coffee':
        if (type === 'individual') {
          rewardDetails.name = 'Free Coffee';
          rewardDetails.rewardName = 'Free Coffee';
          rewardDetails.pointsCost = 150;
          rewardDetails.description = 'Enjoy a free coffee of your choice after earning enough points.';
          
          // Add conditions for individual reward
          rewardDetails.conditions = [
            {
              type: 'minimumTransactions',
              value: 10
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'Coffee Lovers Program';
          rewardDetails.rewardName = 'Coffee Lovers Program';
          rewardDetails.pointsCost = 500;
          rewardDetails.description = 'A program with coffee-related rewards at different point levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'cafe-pastry':
        if (type === 'individual') {
          rewardDetails.name = 'Free Pastry';
          rewardDetails.rewardName = 'Free Pastry';
          rewardDetails.pointsCost = 200;
          rewardDetails.description = 'Redeem for a free pastry of your choice after spending $50.';
          
          // Add conditions for individual reward
          rewardDetails.conditions = [
            {
              type: 'minimumSpend',
              amount: 50
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'daysOfWeek',
            value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          });
        } else {
          rewardDetails.name = 'Sweet Treats Program';
          rewardDetails.rewardName = 'Sweet Treats Program';
          rewardDetails.pointsCost = 600;
          rewardDetails.description = 'A program with pastry and dessert rewards at different tiers';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'cafe-new':
        if (type === 'individual') {
          rewardDetails.name = 'New Customer Welcome Reward';
          rewardDetails.rewardName = 'New Customer Welcome Reward';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special offer for first-time customers with no purchase required.';
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'New Customer Welcome Program';
          rewardDetails.rewardName = 'New Customer Welcome Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special perks for new customers on their first visit';
          rewardDetails.programtype = 'welcome';
        }
        break;
        
      case 'retail-discount':
        if (type === 'individual') {
          rewardDetails.name = '15% Discount';
          rewardDetails.rewardName = '15% Discount';
          rewardDetails.pointsCost = 300;
          rewardDetails.description = 'Get 15% off your next purchase after earning enough points.';
          rewardDetails.voucherAmount = 15.0; // Percentage discount
          
          rewardDetails.conditions = [
            {
              type: 'minimumPointsBalance',
              value: 300
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'Tiered Discount Program';
          rewardDetails.rewardName = 'Tiered Discount Program';
          rewardDetails.pointsCost = 800;
          rewardDetails.description = 'A program with increasing discounts at different point thresholds';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'retail-first-time':
        if (type === 'individual') {
          rewardDetails.name = 'First-Time Shopper Discount';
          rewardDetails.rewardName = 'First-Time Shopper Discount';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Special 10% discount for new customers on their first visit.';
          rewardDetails.voucherAmount = 10.0; // Percentage discount
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'First-Time Shopper Program';
          rewardDetails.rewardName = 'First-Time Shopper Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'A program with special offers for first-time shoppers';
          rewardDetails.programtype = 'welcome';
        }
        break;
        
      case 'retail-vip':
        if (type === 'individual') {
          rewardDetails.name = 'Free Gift';
          rewardDetails.rewardName = 'Free Gift';
          rewardDetails.pointsCost = 300;
          rewardDetails.description = 'Receive a free gift with your next purchase after earning enough points.';
          
          rewardDetails.conditions = [
            {
              type: 'minimumPointsBalance',
              value: 300
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'VIP Rewards Program';
          rewardDetails.rewardName = 'VIP Rewards Program';
          rewardDetails.pointsCost = 750;
          rewardDetails.description = 'A program with exclusive gifts and perks for loyal customers';
          rewardDetails.programtype = 'vip';
        }
        break;
        
      case 'restaurant-appetizer':
        if (type === 'individual') {
          rewardDetails.name = 'Free Appetizer';
          rewardDetails.rewardName = 'Free Appetizer';
          rewardDetails.pointsCost = 250;
          rewardDetails.description = 'Enjoy a free appetizer after your 5th visit.';
          
          rewardDetails.conditions = [
            {
              type: 'visitNumber',
              number: 5
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'daysOfWeek',
            value: ['Monday', 'Tuesday', 'Wednesday', 'Thursday']
          });
        } else {
          rewardDetails.name = 'Dining Rewards Program';
          rewardDetails.rewardName = 'Dining Rewards Program';
          rewardDetails.pointsCost = 700;
          rewardDetails.description = 'A program with appetizers, desserts, and entrees at different levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'restaurant-drink':
        if (type === 'individual') {
          rewardDetails.name = 'Free Drink';
          rewardDetails.rewardName = 'Free Drink';
          rewardDetails.pointsCost = 200;
          rewardDetails.description = 'Redeem for a free drink after spending $100.';
          
          rewardDetails.conditions = [
            {
              type: 'minimumSpend',
              amount: 100
            }
          ];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'timeOfDay',
            value: {
              startTime: '16:00',
              endTime: '19:00'
            }
          });
        } else {
          rewardDetails.name = 'Beverage Rewards Program';
          rewardDetails.rewardName = 'Beverage Rewards Program';
          rewardDetails.pointsCost = 600;
          rewardDetails.description = 'A program with different drink rewards at various point levels';
          rewardDetails.programtype = 'tiered';
        }
        break;
        
      case 'restaurant-first-time':
        if (type === 'individual') {
          rewardDetails.name = 'First-Time Diner Special';
          rewardDetails.rewardName = 'First-Time Diner Special';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'Complimentary dessert or appetizer for first-time diners.';
          
          // For new customer rewards, set maximumTransactions to 0 and no other conditions
          rewardDetails.conditions = [{
            type: 'maximumTransactions',
            value: 0
          }];
          
          // Add limitations (already has the required ones)
          rewardDetails.limitations.push({
            type: 'activePeriod',
            value: {
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
            }
          });
        } else {
          rewardDetails.name = 'First-Time Diner Program';
          rewardDetails.rewardName = 'First-Time Diner Program';
          rewardDetails.isNewCustomer = true;
          rewardDetails.pointsCost = 0;
          rewardDetails.description = 'A program with special perks for customers on their first visit';
          rewardDetails.programtype = 'welcome';
        }
        break;
    }
    
    // Check if this reward is already selected
    const isAlreadySelected = businessData.selectedRewards.some(reward => reward.id === uniqueId)
    
    if (isAlreadySelected) {
      // Remove it if already selected
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: prev.selectedRewards.filter(reward => reward.id !== uniqueId)
      }))
    } else {
      // Add it if not already selected
      setBusinessData(prev => ({
        ...prev,
        selectedRewards: [...prev.selectedRewards, rewardDetails],
        hasSetupReward: true
      }))
    }
  }

  // First, add a state to track which reward's JSON is being viewed
  const [viewingJsonFor, setViewingJsonFor] = useState<string | null>(null)

  // Add a function to toggle JSON view
  const toggleJsonView = (rewardId: string, type: 'individual' | 'program', e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the collapsible
    setViewingJsonFor(viewingJsonFor === `${rewardId}-${type}` ? null : `${rewardId}-${type}`)
  }

  return (
    <div className="container max-w-5xl py-10">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Welcome to <span className="text-[#007AFF]">Tap Loyalty</span></h1>
        <p className="text-gray-500">Let's set up your loyalty program in just a few steps</p>
      </div>
      
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  i + 1 === step ? "bg-[#007AFF] text-white" : 
                  i + 1 < step ? "bg-green-100 text-green-600" : 
                  "bg-gray-100 text-gray-400"
                }`}>
                  {i + 1 < step ? <CheckCircle className="h-5 w-5" /> : i + 1}
                </div>
                <div className={`h-1 w-16 mt-5 ${
                  i + 1 < step ? "bg-green-500" : "bg-gray-200"
                } ${i === totalSteps - 1 ? "opacity-0" : ""}`} />
              </div>
              {i < totalSteps - 1 && <div className="w-4"></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main content - takes up 2/3 of the space */}
        <div className="md:col-span-2">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle>
                {step === 1 && "Upload your logo"}
                {step === 2 && "Create your first reward"}
                {step === 3 && "Set up points rules"}
                {step === 4 && "Create a homepage banner"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Your logo will appear on your loyalty program"}
                {step === 2 && "Create a reward to attract customers"}
                {step === 3 && "Define how customers earn points"}
                {step === 4 && "Create a banner to promote your loyalty program"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Step 1: Logo Upload */}
              {step === 1 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Upload Your Logo</h3>
                        <p className="text-sm text-gray-500">
                          Your logo will be displayed on your loyalty program interface
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <Label
                        htmlFor="logo-upload"
                        className="cursor-pointer block p-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-[#007AFF] transition-colors"
                      >
                        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG up to 10MB
                        </p>
                      </Label>
                    </div>
                    
                    {businessData.logoUrl && (
                      <div className="mt-4">
                        <img
                          src={businessData.logoUrl}
                          alt="Uploaded logo"
                          className="max-h-32 mx-auto rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Create First Reward */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Gift className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Create Your First Reward</h3>
                        <p className="text-sm text-gray-500">
                          Rewards are what customers can redeem with their points
                        </p>
                      </div>
                    </div>
                    
                    {/* Industry Selection */}
                    <div className="mb-6">
                      <Label className="mb-2 block">Select Your Industry</Label>
                      <Tabs 
                        defaultValue="cafe"
                        className="mt-2"
                        onValueChange={(value) => setSelectedIndustry(value)}
                      >
                        <TabsList className="grid grid-cols-3 w-full">
                          <TabsTrigger value="cafe">Café</TabsTrigger>
                          <TabsTrigger value="retail">Retail</TabsTrigger>
                          <TabsTrigger value="restaurant">Restaurant</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="cafe" className="p-4 bg-blue-50 rounded-md mt-2">
                          <div className="flex items-center gap-3">
                            <Coffee className="h-5 w-5 text-[#007AFF]" />
                            <div>
                              <h3 className="font-medium">Café Rewards</h3>
                              <p className="text-sm text-gray-600">Perfect for coffee shops, bakeries, and quick-service cafés</p>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="retail" className="p-4 bg-blue-50 rounded-md mt-2">
                          <div className="flex items-center gap-3">
                            <Store className="h-5 w-5 text-[#007AFF]" />
                            <div>
                              <h3 className="font-medium">Retail Rewards</h3>
                              <p className="text-sm text-gray-600">Ideal for clothing stores, boutiques, and specialty shops</p>
                            </div>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="restaurant" className="p-4 bg-blue-50 rounded-md mt-2">
                          <div className="flex items-center gap-3">
                            <Utensils className="h-5 w-5 text-[#007AFF]" />
                            <div>
                              <h3 className="font-medium">Restaurant Rewards</h3>
                              <p className="text-sm text-gray-600">Designed for full-service restaurants, bars, and eateries</p>
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                    
                    {/* Reward Type Selection */}
                    <div className="mb-6">
                      <Label className="mb-2 block">Reward Type</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div 
                          className={`p-4 border rounded-md cursor-pointer transition-colors ${
                            rewardType === 'individual' ? 'border-[#007AFF] bg-blue-50' : 'border-gray-200 hover:border-[#007AFF]'
                          }`}
                          onClick={() => setRewardType('individual')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Gift className="h-5 w-5 text-[#007AFF]" />
                            <h4 className="font-medium">Individual Reward</h4>
                          </div>
                          <p className="text-sm text-gray-600">Create a single reward that customers can redeem</p>
                        </div>
                        
                        <div 
                          className={`p-4 border rounded-md cursor-pointer transition-colors ${
                            rewardType === 'program' ? 'border-[#007AFF] bg-blue-50' : 'border-gray-200 hover:border-[#007AFF]'
                          }`}
                          onClick={() => setRewardType('program')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Award className="h-5 w-5 text-[#007AFF]" />
                            <h4 className="font-medium">Reward Program</h4>
                          </div>
                          <p className="text-sm text-gray-600">Create a collection of related rewards as a program</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Industry-specific reward templates */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-700">Recommended Rewards for {selectedIndustry.charAt(0).toUpperCase() + selectedIndustry.slice(1)}</h4>
                      
                      {selectedIndustry === 'cafe' && (
                        <>
                          <Collapsible 
                            className="border rounded-md overflow-hidden mb-3"
                            open={expandedRewards['cafe-coffee']}
                            onOpenChange={() => toggleRewardDetails('cafe-coffee')}
                          >
                            <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200 cursor-pointer">
                              <Coffee className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-medium">{rewardType === 'individual' ? 'Free Coffee' : 'Coffee Lovers Program'}</h4>
                                <p className="text-sm text-gray-500">
                                  {rewardType === 'individual' 
                                    ? 'Enjoy a free coffee of your choice after earning enough points.' 
                                    : 'A program with coffee-related rewards at different point levels'}
                                </p>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                  {expandedRewards['cafe-coffee'] ? 
                                    <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                  }
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            
                            <CollapsibleContent className="bg-gray-50 p-4 border-b border-gray-200">
                              <div className="space-y-3">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700">Conditions</h5>
                                  {rewardType === 'individual' ? (
                                    <ul className="text-sm text-gray-600 mt-1 space-y-1 list-disc pl-5">
                                      <li>Minimum transactions: 10</li>
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-600">
                                      Different rewards unlock at different point levels
                                    </p>
                                  )}
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700">Limitations</h5>
                                  <ul className="text-sm text-gray-600 mt-1 space-y-1 list-disc pl-5">
                                    <li>Customer limit: 1 per customer</li>
                                    <li>Total redemption limit: 100</li>
                                    {rewardType === 'individual' && (
                                      <li>Active period: 1 year from today</li>
                                    )}
                                  </ul>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700">Points Cost</h5>
                                  <p className="text-sm text-gray-600">
                                    {rewardType === 'individual' ? '150 points to redeem' : 'Varies by reward level'}
                                  </p>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700">Customer Type</h5>
                                  <p className="text-sm text-gray-600">
                                    For existing customers (requires purchase history)
                                  </p>
                                </div>
                              </div>
                              
                              <div className="mt-4 flex gap-2">
                                <Button 
                                  variant={businessData.selectedRewards.some(r => r.id === `cafe-coffee-${rewardType}`) ? "default" : "outline"}
                                  className={businessData.selectedRewards.some(r => r.id === `cafe-coffee-${rewardType}`) 
                                    ? "bg-green-600 hover:bg-green-700 text-white flex-1" 
                                    : "text-[#007AFF] border-[#007AFF] flex-1"}
                                  onClick={(e) => {
                                    handleRewardSelection('cafe-coffee', rewardType)
                                    toggleJsonView('cafe-coffee', rewardType, e)
                                  }}
                                >
                                  {businessData.selectedRewards.some(r => r.id === `cafe-coffee-${rewardType}`) ? (
                                    <span className="flex items-center gap-1 justify-center">
                                      <Check className="h-3.5 w-3.5" /> Selected
                                    </span>
                                  ) : "Select This Reward"}
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-gray-600 border-gray-300"
                                  onClick={(e) => toggleJsonView('cafe-coffee', rewardType, e)}
                                >
                                  JSON
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                          
                          {viewingJsonFor === `cafe-coffee-${rewardType}` && (
                            <div className="mt-3 p-3 bg-gray-900 rounded-md overflow-auto max-h-60 text-xs">
                              <pre className="text-gray-100 whitespace-pre-wrap">
                                {JSON.stringify(
                                  {
                                    rewardName: rewardType === 'individual' ? 'Free Coffee' : 'Coffee Lovers Program',
                                    description: rewardType === 'individual' 
                                      ? 'Enjoy a free coffee of your choice after earning enough points.' 
                                      : 'A program with coffee-related rewards at different point levels',
                                    isActive: true,
                                    pointsCost: rewardType === 'individual' ? 150 : 500,
                                    rewardVisibility: 'global',
                                    conditions: rewardType === 'individual' ? [
                                      {
                                        type: 'minimumTransactions',
                                        value: 10
                                      }
                                    ] : [],
                                    limitations: [
                                      {
                                        type: 'customerLimit',
                                        value: 1
                                      },
                                      {
                                        type: 'totalRedemptionLimit',
                                        value: 100
                                      },
                                      ...(rewardType === 'individual' ? [{
                                        type: 'activePeriod',
                                        value: {
                                          startDate: new Date().toISOString().split('T')[0],
                                          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]
                                        }
                                      }] : [])
                                    ],
                                    ...(rewardType === 'program' ? { programtype: 'tiered' } : {})
                                  }, 
                                  null, 
                                  2
                                )}
                              </pre>
                            </div>
                          )}
                          
                          <Collapsible 
                            className="border rounded-md overflow-hidden mb-3"
                            open={expandedRewards['cafe-new']}
                            onOpenChange={() => toggleRewardDetails('cafe-new')}
                          >
                            <div className="flex items-center gap-3 p-3 bg-white border-b border-gray-200 cursor-pointer">
                              <Coffee className="h-5 w-5 text-amber-500 flex-shrink-0" />
                              <div className="flex-1">
                                <h4 className="font-medium">New Customer Welcome {rewardType === 'individual' ? 'Reward' : 'Program'}</h4>
                                <p className="text-sm text-gray-500">
                                  {rewardType === 'individual'
                                    ? 'Special offer for first-time customers with no purchase required'
                                    : 'A program with special perks for new customers on their first visit'}
                                </p>
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                  Perfect for attracting new customers!
                                </p>
                              </div>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-0 h-8 w-8">
                                  {expandedRewards['cafe-new'] ? 
                                    <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                                    <ChevronDown className="h-5 w-5 text-gray-500" />
                                  }
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            
                            <CollapsibleContent className="bg-gray-50 p-4 border-b border-gray-200">
                              <div>
                                <h5 className="text-sm font-medium text-gray-700">Customer Type</h5>
                                <p className="text-sm text-gray-600 font-medium text-blue-600">
                                  For new customers (no purchase history required)
                                </p>
                              </div>
                              <div className="mt-4 flex gap-2">
                                <Button 
                                  variant={businessData.selectedRewards.some(r => r.id === `cafe-new-${rewardType}`) ? "default" : "outline"}
                                  className={businessData.selectedRewards.some(r => r.id === `cafe-new-${rewardType}`) 
                                    ? "bg-green-600 hover:bg-green-700 text-white flex-1" 
                                    : "text-[#007AFF] border-[#007AFF] flex-1"}
                                  onClick={() => handleRewardSelection('cafe-new', rewardType)}
                                >
                                  {businessData.selectedRewards.some(r => r.id === `cafe-new-${rewardType}`) ? (
                                    <span className="flex items-center gap-1 justify-center">
                                      <Check className="h-3.5 w-3.5" /> Selected
                                    </span>
                                  ) : "Select This Reward"}
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-gray-600 border-gray-300"
                                  onClick={(e) => toggleJsonView('cafe-new', rewardType, e)}
                                >
                                  JSON
                                </Button>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </>
                      )}
                      
                      {selectedIndustry === 'retail' && (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                            <Percent className="h-5 w-5 text-green-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">{rewardType === 'individual' ? '15% Discount' : 'Tiered Discount Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Get 15% off your next purchase after earning enough points.'
                                  : 'A program with increasing discounts at different point thresholds'}
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `retail-discount-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `retail-discount-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('retail-discount', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `retail-discount-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200 bg-blue-50">
                            <Sparkles className="h-5 w-5 text-blue-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">First-Time Shopper {rewardType === 'individual' ? 'Discount' : 'Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Special 10% discount for new customers on their first visit'
                                  : 'A program with special offers for first-time shoppers'}
                              </p>
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                Zero transaction requirement!
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `retail-first-time-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `retail-first-time-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('retail-first-time', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `retail-first-time-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                            <Gift className="h-5 w-5 text-purple-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">{rewardType === 'individual' ? 'Free Gift' : 'VIP Rewards Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Receive a free gift with your next purchase after earning enough points.'
                                  : 'A program with exclusive gifts and perks for loyal customers'}
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `retail-vip-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `retail-vip-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('retail-vip', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `retail-vip-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                        </>
                      )}
                      
                      {selectedIndustry === 'restaurant' && (
                        <>
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                            <UtensilsCrossed className="h-5 w-5 text-red-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">{rewardType === 'individual' ? 'Free Appetizer' : 'Dining Rewards Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Enjoy a free appetizer after your 5th visit.'
                                  : 'A program with appetizers, desserts, and entrees at different levels'}
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `restaurant-appetizer-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `restaurant-appetizer-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('restaurant-appetizer', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `restaurant-appetizer-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                            <Wine className="h-5 w-5 text-purple-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">{rewardType === 'individual' ? 'Free Drink' : 'Beverage Rewards Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Redeem for a free drink after spending $100.'
                                  : 'A program with different drink rewards at various point levels'}
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `restaurant-drink-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `restaurant-drink-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('restaurant-drink', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `restaurant-drink-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200 bg-blue-50">
                            <Sparkles className="h-5 w-5 text-blue-500" />
                            <div className="flex-1">
                              <h4 className="font-medium">First-Time Diner {rewardType === 'individual' ? 'Special' : 'Program'}</h4>
                              <p className="text-sm text-gray-500">
                                {rewardType === 'individual'
                                  ? 'Complimentary dessert or appetizer for first-time diners.'
                                  : 'A program with special perks for customers on their first visit'}
                              </p>
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                No previous transactions required!
                              </p>
                            </div>
                            <Button 
                              variant={businessData.selectedRewards.some(r => r.id === `restaurant-first-time-${rewardType}`) ? "default" : "outline"}
                              className={businessData.selectedRewards.some(r => r.id === `restaurant-first-time-${rewardType}`) 
                                ? "bg-green-600 hover:bg-green-700 text-white" 
                                : "text-[#007AFF] border-[#007AFF]"}
                              onClick={() => handleRewardSelection('restaurant-first-time', rewardType)}
                            >
                              {businessData.selectedRewards.some(r => r.id === `restaurant-first-time-${rewardType}`) ? (
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5" /> Selected
                                </span>
                              ) : "Select"}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Set up Points Rules */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Award className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Set Up Points Rules</h3>
                        <p className="text-sm text-gray-500">
                          Define how customers earn points in your loyalty program
                        </p>
                      </div>
                    </div>
                    
                    {/* Default points multiplier info box */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-100">
                      <h4 className="font-medium text-blue-800 mb-1">Default Points Multiplier: $1 = 3 Points</h4>
                      <p className="text-sm text-blue-700">
                        By default, customers earn <span className="font-semibold">3 points</span> for every <span className="font-semibold">$1</span> they spend. This means a $10 purchase would earn 30 points. Points rules allow you to create additional ways for customers to earn extra points on specific days, times, or actions.
                      </p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <BarChart className="h-5 w-5 text-blue-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Purchase-based Points</h4>
                          <p className="text-sm text-gray-500">Award points based on purchase amount</p>
                        </div>
                        <Button 
                          variant={businessData.selectedRewards.some(r => r.id === `purchase-based-${rewardType}`) ? "default" : "outline"}
                          className={businessData.selectedRewards.some(r => r.id === `purchase-based-${rewardType}`) 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "text-[#007AFF] border-[#007AFF]"}
                          onClick={() => handleRewardSelection('purchase-based', rewardType)}
                        >
                          {businessData.selectedRewards.some(r => r.id === `purchase-based-${rewardType}`) ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </span>
                          ) : "Select"}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <BarChart className="h-5 w-5 text-indigo-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Visit-based Points</h4>
                          <p className="text-sm text-gray-500">Award points for each visit</p>
                        </div>
                        <Button 
                          variant={businessData.selectedRewards.some(r => r.id === `visit-based-${rewardType}`) ? "default" : "outline"}
                          className={businessData.selectedRewards.some(r => r.id === `visit-based-${rewardType}`) 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "text-[#007AFF] border-[#007AFF]"}
                          onClick={() => handleRewardSelection('visit-based', rewardType)}
                        >
                          {businessData.selectedRewards.some(r => r.id === `visit-based-${rewardType}`) ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </span>
                          ) : "Select"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Create Homepage Banner */}
              {step === 4 && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <Image className="h-6 w-6 text-[#007AFF]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">Create Homepage Banner</h3>
                        <p className="text-sm text-gray-500">
                          Promote your loyalty program with an eye-catching banner
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <Image className="h-5 w-5 text-rose-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Welcome Banner</h4>
                          <p className="text-sm text-gray-500">Introduce customers to your loyalty program</p>
                        </div>
                        <Button 
                          variant={businessData.selectedRewards.some(r => r.id === `welcome-banner-${rewardType}`) ? "default" : "outline"}
                          className={businessData.selectedRewards.some(r => r.id === `welcome-banner-${rewardType}`) 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "text-[#007AFF] border-[#007AFF]"}
                          onClick={() => handleRewardSelection('welcome-banner', rewardType)}
                        >
                          {businessData.selectedRewards.some(r => r.id === `welcome-banner-${rewardType}`) ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </span>
                          ) : "Select"}
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-3 p-3 bg-white rounded-md border border-gray-200">
                        <Image className="h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <h4 className="font-medium">Promotional Banner</h4>
                          <p className="text-sm text-gray-500">Highlight special offers or limited-time rewards</p>
                        </div>
                        <Button 
                          variant={businessData.selectedRewards.some(r => r.id === `promotional-banner-${rewardType}`) ? "default" : "outline"}
                          className={businessData.selectedRewards.some(r => r.id === `promotional-banner-${rewardType}`) 
                            ? "bg-green-600 hover:bg-green-700 text-white" 
                            : "text-[#007AFF] border-[#007AFF]"}
                          onClick={() => handleRewardSelection('promotional-banner', rewardType)}
                        >
                          {businessData.selectedRewards.some(r => r.id === `promotional-banner-${rewardType}`) ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" /> Selected
                            </span>
                          ) : "Select"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex justify-between border-t p-6">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={step === 1}
              >
                Back
              </Button>
              
              <Button 
                onClick={handleNext}
                disabled={loading}
                className="bg-[#007AFF] hover:bg-[#0066CC]"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : step === totalSteps ? (
                  <>Complete Setup</>
                ) : (
                  <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Checklist sidebar - takes up 1/3 of the space */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h3 className="text-lg font-medium mb-4">Your Setup Progress</h3>
            
            <div className="space-y-3">
              {/* Logo upload status */}
              <div className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  businessData.logoUrl ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {businessData.logoUrl ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${businessData.logoUrl ? "text-gray-900" : "text-gray-500"}`}>
                    Upload Business Logo
                  </p>
                </div>
                {businessData.logoUrl && (
                  <div className="h-8 w-8 rounded-md overflow-hidden">
                    <img 
                      src={businessData.logoUrl} 
                      alt="Logo" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              {/* Reward creation status */}
              <div className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  businessData.selectedRewards.length > 0 ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {businessData.selectedRewards.length > 0 ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${businessData.selectedRewards.length > 0 ? "text-gray-900" : "text-gray-500"}`}>
                    Selected Rewards ({businessData.selectedRewards.length})
                  </p>
                  {businessData.selectedRewards.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {businessData.selectedRewards.map((reward) => (
                        <div key={reward.id} className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0"></span>
                          <p className="text-xs text-gray-600 truncate">{reward.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Points rule status */}
              <div className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  businessData.hasSetupPointsRule ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {businessData.hasSetupPointsRule ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${businessData.hasSetupPointsRule ? "text-gray-900" : "text-gray-500"}`}>
                    Set Up Points Rules
                  </p>
                  {businessData.pointsRuleDetails && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {businessData.pointsRuleDetails.name}
                    </p>
                  )}
                </div>
              </div>
              
              {/* Banner status */}
              <div className="flex items-center gap-3">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                  businessData.hasSetupBanner ? "bg-green-100" : "bg-gray-100"
                }`}>
                  {businessData.hasSetupBanner ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <span className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`text-sm ${businessData.hasSetupBanner ? "text-gray-900" : "text-gray-500"}`}>
                    Create Homepage Banner
                  </p>
                  {businessData.bannerDetails && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {businessData.bannerDetails.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Summary section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium mb-2">Setup Summary</h4>
              <div className="bg-blue-50 rounded-md p-3">
                <p className="text-xs text-blue-700">
                  <span className="font-medium">
                    {[
                      businessData.logoUrl && "Logo",
                      businessData.selectedRewards.length > 0 && "Rewards",
                      businessData.hasSetupPointsRule && "Points Rules",
                      businessData.hasSetupBanner && "Banner"
                    ].filter(Boolean).join(", ") || "No items"} 
                  </span> 
                  {[businessData.logoUrl, businessData.selectedRewards.length > 0, businessData.hasSetupPointsRule, businessData.hasSetupBanner].some(Boolean) 
                    ? " completed"
                    : " completed yet"}
                </p>
                <div className="w-full bg-blue-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-blue-600 h-1.5 rounded-full" 
                    style={{ 
                      width: `${([businessData.logoUrl, businessData.selectedRewards.length > 0, businessData.hasSetupPointsRule, businessData.hasSetupBanner]
                        .filter(Boolean).length / 4) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 