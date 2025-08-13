"use client"

import React, { useState, useEffect } from "react"
import { X, ChevronDown, Check, Star, Sparkles, ImageIcon, Info, Plus, Coffee, Ticket, Banknote, Gift, DollarSign, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { doc, setDoc, addDoc, collection, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore"
import { toast } from "@/components/ui/use-toast"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage"
import { v4 as uuidv4 } from "uuid"
import { DemoIPhone } from "@/components/demo-iphone"

interface QuickSetupPopupProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickSetupPopup({ open, onOpenChange }: QuickSetupPopupProps) {
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  
  // Step 1: Welcome state
  const [programName, setProgramName] = useState("Points")
  const [customProgramName, setCustomProgramName] = useState("")
  
  // Reward configurations
  const [rewardConfigs, setRewardConfigs] = useState<any[]>([])
  const [expandedConfig, setExpandedConfig] = useState<string | null>(null)
  const [finalizedRewards, setFinalizedRewards] = useState<Set<string>>(new Set())
  
  // Logo state
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null)
  
  const totalSteps = 6
  const [selectedRewards, setSelectedRewards] = useState<string[]>([])
  
  // Tap Cash state
  const [enableTapCash, setEnableTapCash] = useState(false)
  const [tapCashRate, setTapCashRate] = useState(5)
  const [tapCashDescription, setTapCashDescription] = useState('Earn cash back on every purchase')
  
  // Merchant info state
  const [merchantName, setMerchantName] = useState<string>('')
  
  // Existing programs state
  const [existingPrograms, setExistingPrograms] = useState({
    hasCoffeeProgram: false,
    hasVoucherProgram: false,
    hasCashbackProgram: false
  })

  // Introductory rewards state
  const [introRewardType, setIntroRewardType] = useState<"voucher" | "freeItem">("voucher")
  const [introRewardData, setIntroRewardData] = useState({
    rewardName: "",
    description: "",
    itemName: "",
    pin: ""
  })
  const [existingIntroRewards, setExistingIntroRewards] = useState<any[]>([])

  // Fetch existing introductory rewards
  useEffect(() => {
    const fetchIntroRewards = async () => {
      if (!user?.uid) return

      try {
        const rewardsRef = collection(db, 'merchants', user.uid, 'rewards')
        const q = query(rewardsRef, where("isIntroductoryReward", "==", true))
        const querySnapshot = await getDocs(q)
        
        const rewards: any[] = []
        querySnapshot.forEach((doc) => {
          rewards.push({
            id: doc.id,
            ...doc.data()
          })
        })
        
        setExistingIntroRewards(rewards)
      } catch (error) {
        console.error('Error fetching introductory rewards:', error)
      }
    }

    fetchIntroRewards()
  }, [user?.uid])

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive"
        })
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "File size must be less than 5MB",
          variant: "destructive"
        })
        return
      }

      setLogoFile(file)
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
    }
  }

  const uploadLogo = async () => {
    if (!logoFile || !user?.uid) return null

    try {
      const logoId = uuidv4()
      const storagePath = `merchants/${user.uid}/files/${logoId}`
      
      const storageRef = ref(getStorage(), storagePath)
      const uploadTask = uploadBytesResumable(storageRef, logoFile, { 
        contentType: logoFile.type || 'application/octet-stream' 
      })
      
      return new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Handle progress
          },
          (error) => {
            console.error('Upload error:', error)
            reject(error)
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(storageRef)
              resolve(downloadURL)
            } catch (e) {
              reject(e)
            }
          }
        )
      })
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const validateAndSaveReward = (config: any) => {
    if (config.type === 'coffee') {
      if (!config.pin || !/^\d{4}$/.test(config.pin)) {
        toast({
          title: "Invalid Coffee Card",
          description: "Coffee card requires a 4-digit PIN",
          variant: "destructive"
        })
        return false
      }
      if (!config.frequency || config.frequency < 1) {
        toast({
          title: "Invalid Coffee Card",
          description: "Please select total stamps required",
          variant: "destructive"
        })
        return false
      }
      return true
    } else if (config.type === 'voucher') {
      if (!config.pin || !/^\d{4}$/.test(config.pin)) {
        toast({
          title: "Invalid Voucher Program",
          description: "Voucher program requires a 4-digit PIN",
          variant: "destructive"
        })
        return false
      }
      if (!config.rewardName || config.rewardName.trim() === '') {
        toast({
          title: "Invalid Voucher Program",
          description: "Please enter a reward name",
          variant: "destructive"
        })
        return false
      }
      if (!config.spendRequired || config.spendRequired <= 0) {
        toast({
          title: "Invalid Voucher Program",
          description: "Please enter a spending threshold",
          variant: "destructive"
        })
        return false
      }
      if (!config.discountAmount || config.discountAmount <= 0) {
        toast({
          title: "Invalid Voucher Program",
          description: "Please enter a voucher amount",
          variant: "destructive"
        })
        return false
      }
      return true
    } else if (config.type === 'basic') {
      if (!config.pin || !/^\d{4}$/.test(config.pin)) {
        toast({
          title: "Invalid Basic Reward",
          description: "Basic reward requires a 4-digit PIN",
          variant: "destructive"
        })
        return false
      }
      if (!config.name || config.name.trim() === '') {
        toast({
          title: "Invalid Basic Reward",
          description: "Please enter a reward name",
          variant: "destructive"
        })
        return false
      }
      if (config.pointsRequired === undefined || config.pointsRequired === null || Number.isNaN(Number(config.pointsRequired))) {
        toast({
          title: "Invalid Basic Reward",
          description: "Please enter points required",
          variant: "destructive"
        })
        return false
      }
      if (config.rewardType === 'fixedDiscount' && !config.discountValue) {
        toast({
          title: "Invalid Basic Reward",
          description: "Please enter a discount amount",
          variant: "destructive"
        })
        return false
      }
      return true
    }
    return false
  }

  const handleSaveReward = (configId: string) => {
    const config = rewardConfigs.find(c => c.id === configId)
    if (!config) return

    if (validateAndSaveReward(config)) {
      setFinalizedRewards(prev => new Set([...prev, configId]))
      setExpandedConfig(null) // Collapse the card
      toast({
        title: "Reward Saved",
        description: "Your reward configuration has been saved successfully",
        variant: "default"
      })
    }
  }

  const handleDeleteIntroReward = async (reward: any) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get current merchant data
      const merchantRef = doc(db, 'merchants', user.uid);
      const merchantDoc = await getDoc(merchantRef);
      const merchantData = merchantDoc.data();
      
      // Update the introductory rewards array
      const currentIntroRewardIds = merchantData?.introductoryRewardIds || [];
      const updatedIntroRewardIds = currentIntroRewardIds.filter((id: string) => id !== reward.id);
      
      // Update merchant document
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: updatedIntroRewardIds.length > 0,
          introductoryRewardIds: updatedIntroRewardIds,
          introductoryRewardCount: updatedIntroRewardIds.length
        },
        { merge: true }
      );
      
      // Update the reward to no longer be an introductory reward
      const rewardRef = doc(db, 'merchants', user.uid, 'rewards', reward.id);
      await setDoc(
        rewardRef,
        { 
          isIntroductoryReward: false,
          status: reward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      // Also update in the top-level rewards collection
      const globalRewardRef = doc(db, 'rewards', reward.id);
      await setDoc(
        globalRewardRef,
        { 
          isIntroductoryReward: false,
          status: reward.isActive ? 'active' : 'inactive'
        },
        { merge: true }
      );
      
      toast({
        title: "Introductory Reward Removed",
        description: "Your introductory reward has been removed successfully.",
      });
      
      // Update the existing rewards list
      setExistingIntroRewards(prev => prev.filter(r => r.id !== reward.id));
      
    } catch (error) {
      console.error("Error deleting introductory reward:", error);
      toast({
        title: "Error",
        description: "Failed to remove the introductory reward. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateIntroReward = async () => {
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create rewards.",
        variant: "destructive"
      })
      return
    }

    // Validate form data
    if (!introRewardData.rewardName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a reward name",
        variant: "destructive"
      })
      return
    }
    if (!introRewardData.description.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a reward description",
        variant: "destructive"
      })
      return
    }
    if (introRewardType === "freeItem" && !introRewardData.itemName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter the free item name",
        variant: "destructive"
      })
      return
    }
    if (!introRewardData.pin.trim() || introRewardData.pin.length !== 4 || !/^\d+$/.test(introRewardData.pin)) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a 4-digit PIN code",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)

      // Check if merchant already has the maximum number of introductory rewards
      if (existingIntroRewards.length >= 3) {
        toast({
          title: "Maximum Introductory Rewards Reached",
          description: "You can only have up to 3 introductory rewards. Please remove one to create a new one.",
          variant: "destructive"
        })
        setIsLoading(false)
        return
      }

      const timestamp = new Date()
      
      // Create the reward data
      const rewardData = {
        rewardName: introRewardData.rewardName,
        description: introRewardData.description,
        type: introRewardType,
        isIntroductoryReward: true,
        fundedByTapLoyalty: true,
        maxValue: 5.00,
        itemName: introRewardType === "freeItem" ? introRewardData.itemName : "",
        voucherAmount: introRewardType === "voucher" ? 5.00 : 0,
        itemValue: introRewardType === "freeItem" ? 5.00 : 0,
        pin: introRewardData.pin,
        isActive: true,
        status: "active",
        createdAt: timestamp.toISOString(),
        updatedAt: timestamp.toISOString(),
        merchantId: user.uid,
        rewardVisibility: "global",
        pointsCost: 0, // Free for first-time customers
        redemptionCount: 0,
        uniqueCustomersCount: 0,
        limitations: [
          {
            type: "customerLimit",
            value: 1
          }
        ]
      }

      // Create in merchant's rewards subcollection
      const merchantRewardsRef = collection(db, 'merchants', user.uid, 'rewards')
      const newRewardRef = await addDoc(merchantRewardsRef, rewardData)
      
      // Add the ID to the reward data
      const rewardWithId = {
        ...rewardData,
        id: newRewardRef.id
      }
      
      // Update the merchant's reward with the ID
      await setDoc(
        doc(db, 'merchants', user.uid, 'rewards', newRewardRef.id),
        { ...rewardWithId }
      )

      // Also save to top-level rewards collection
      await setDoc(
        doc(db, 'rewards', newRewardRef.id),
        rewardWithId
      )
      
      // Update merchant document with introductory rewards info
      const merchantRef = doc(db, 'merchants', user.uid);
      const merchantDoc = await getDoc(merchantRef);
      const merchantData = merchantDoc.data();
      
      // Update the introductory rewards array
      const currentIntroRewardIds = merchantData?.introductoryRewardIds || [];
      const updatedIntroRewardIds = [...currentIntroRewardIds, newRewardRef.id];
      
      await setDoc(
        merchantRef,
        { 
          hasIntroductoryReward: true,
          introductoryRewardIds: updatedIntroRewardIds,
          introductoryRewardCount: updatedIntroRewardIds.length
        },
        { merge: true }
      )
      
      toast({
        title: "Introductory Reward Created",
        description: "Your introductory reward has been successfully created and is now available to new customers.",
      })
      
      // Reset form
      setIntroRewardData({
        rewardName: "",
        description: "",
        itemName: "",
        pin: ""
      })
      setIntroRewardType("voucher")
      
      // Refresh the existing rewards list
      const updatedRewards = [...existingIntroRewards, rewardWithId];
      setExistingIntroRewards(updatedRewards);
      
    } catch (error) {
      console.error("Error creating introductory reward:", error)
      toast({
        title: "Error",
        description: "Failed to create introductory reward. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!user?.uid) return

    setIsLoading(true)
    try {
      // Upload logo if provided (only if no existing logo or user selected a new one)
      let logoUrl = existingLogoUrl
      if (logoFile) {
        logoUrl = await uploadLogo()
      }

      // Save merchant settings
      const merchantData: any = {
        programName: 'Points',
        updatedAt: serverTimestamp()
      }

      // Only update logoUrl if a new logo was uploaded
      if (logoFile && logoUrl) {
        merchantData.logoUrl = logoUrl
        merchantData.logoUpdatedAt = serverTimestamp()
      }

      await setDoc(doc(db, 'merchants', user.uid), merchantData, { merge: true })



      // Create rewards based on configurations
      const programArrays: any = {
        coffeePrograms: [],
        voucherPrograms: [],
        transactionRewards: []
      }

      for (const config of rewardConfigs) {
        if (config.type === 'coffee') {
          // Validate coffee program
          if (!config.pin || !/^\d{4}$/.test(config.pin)) {
            toast({
              title: "Invalid Coffee Program",
              description: "Coffee program requires a 4-digit PIN",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          
          // Add to coffee programs array - matching create-recurring-reward-dialog structure
          programArrays.coffeePrograms.push({
            pin: config.pin,
            frequency: parseInt(config.frequency) || 10,
            minspend: parseInt(config.minimumSpend) || 0,
            mintime: parseInt(config.minimumTimeBetween) || 0,
            createdAt: new Date(),
            active: true
          })
        } else if (config.type === 'basic') {
          // Validate basic reward
          if (!config.pin || !/^\d{4}$/.test(config.pin)) {
            toast({
              title: "Invalid Basic Reward",
              description: "Basic reward requires a 4-digit PIN",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          if (!config.name || config.name.trim() === '') {
            toast({
              title: "Invalid Basic Reward",
              description: "Please enter a reward name",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          if (config.pointsRequired === undefined || config.pointsRequired === null || Number.isNaN(Number(config.pointsRequired))) {
            toast({
              title: "Invalid Basic Reward",
              description: "Please enter points required",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          if (config.rewardType === 'fixedDiscount' && !config.discountValue) {
            toast({
              title: "Invalid Basic Reward",
              description: "Please enter a discount amount",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          
          // Basic rewards - save to rewards subcollection
          const rewardData: any = {
            rewardName: config.name || (config.rewardType === 'fixedDiscount' ? `$${config.discountValue} off` : `Free ${config.itemName}`),
            description: config.rewardType === 'fixedDiscount' 
              ? `Get $${config.discountValue} off your entire purchase`
              : `Get a free ${config.itemName}`,
            type: 'discount',
            programType: 'points',
            pointsCost: parseInt(config.pointsRequired) || 100,
            isActive: true,
            status: 'active',
            rewardVisibility: 'global',
            pin: config.pin,
            rewardTypeDetails: {
              type: config.rewardType === 'fixedDiscount' ? 'fixedDiscount' : 'freeItem'
            },
            conditions: [],
            limitations: [
              { type: 'totalRedemptionLimit', value: 100 },
              { type: 'customerLimit', value: 1 }
            ],
            merchantId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            // Add fields that are required for rewards
            minSpend: 0,
            reason: '',
            customers: [],
            redemptionCount: 0,
            uniqueCustomersCount: 0,
            lastRedeemedAt: null,
            uniqueCustomerIds: []
          }

          // Add type-specific details
          if (config.rewardType === 'fixedDiscount') {
            rewardData.rewardTypeDetails = {
              type: config.discountType === 'percentage' ? 'percentageDiscount' : 'fixedDiscount',
              discountValue: isNaN(Number(config.discountValue)) ? 5 : Number(config.discountValue),
              discountType: config.discountType === 'percentage' ? 'percentage' : 'fixed',
              appliesTo: 'entire sale',
              minimumPurchase: 0
            }
            // Update description based on discount type
            rewardData.description = config.discountType === 'percentage'
              ? `Get ${config.discountValue}% off your entire purchase`
              : `Get $${config.discountValue} off your entire purchase`
          } else if (config.rewardType === 'freeItem') {
            rewardData.rewardTypeDetails = {
              type: 'freeItem',
              itemName: config.itemName || 'Coffee',
              itemDescription: ''
            }
            // Update the reward name and description if not provided
            if (!config.name) {
              rewardData.rewardName = `Free ${config.itemName || 'Coffee'}`
            }
            if (!config.itemName) {
              rewardData.description = `Get a free ${config.itemName || 'Coffee'}`
            }
          }
          const createdRewardRef = await addDoc(collection(db, `merchants/${user.uid}/rewards`), rewardData)
          await setDoc(doc(db, 'rewards', createdRewardRef.id), {
            ...rewardData,
            merchantId: user.uid
          })
        } else if (config.type === 'voucher') {
          // Validate voucher program
          if (!config.pin || !/^\d{4}$/.test(config.pin)) {
            toast({
              title: "Invalid Voucher Program",
              description: "Voucher program requires a 4-digit PIN",
              variant: "destructive"
            })
            setIsLoading(false)
            return
          }
          
          // Add to voucher programs array - matching create-recurring-reward-dialog structure
          programArrays.voucherPrograms.push({
            rewardName: config.rewardName || 'Loyalty Discount',
            description: config.description || '',
            pin: config.pin,
            spendRequired: isNaN(Number(config.spendRequired)) ? 100 : Number(config.spendRequired),
            discountAmount: isNaN(Number(config.discountAmount)) ? 10 : Number(config.discountAmount),
            isActive: config.isActive !== false,
            createdAt: new Date(),
            type: 'recurring_voucher'
          })
        }
      }

      // Save program arrays to merchant document
      const updateData: any = {}
      if (programArrays.coffeePrograms.length > 0) {
        updateData.coffeePrograms = programArrays.coffeePrograms
        updateData.coffeeprogram = true // Set the flag as per create-recurring-reward-dialog
      }
      if (programArrays.voucherPrograms.length > 0) {
        updateData.voucherPrograms = programArrays.voucherPrograms
      }
      if (programArrays.transactionRewards.length > 0) {
        updateData.transactionRewards = programArrays.transactionRewards
      }
      
      // Add Tap Cash only if it doesn't already exist
      if (enableTapCash && !existingPrograms.hasCashbackProgram) {
        updateData.isCashback = true
        updateData.cashbackRate = tapCashRate
        updateData.cashbackProgram = {
          programName: 'Tap Cash',
          description: tapCashDescription,
          isActive: true,
          createdAt: new Date()
        }
      }
      // Don't allow any modifications if Tap Cash already exists

      if (Object.keys(updateData).length > 0) {
        await setDoc(doc(db, `merchants/${user.uid}`), updateData, { merge: true })
      }

      toast({
        title: "Setup Complete!",
        description: "Your loyalty program has been created successfully."
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Error completing setup:', error)
      toast({
        title: "Setup Failed",
        description: "There was an error creating your program. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addRewardConfig = (type: string) => {
    // Check if coffee already exists (in current config or in account)
    if (type === 'coffee' && (rewardConfigs.some(config => config.type === 'coffee') || existingPrograms.hasCoffeeProgram)) {
      toast({
        title: "Coffee program already exists",
        description: existingPrograms.hasCoffeeProgram 
          ? "You already have a coffee card program in your account"
          : "You can only have one coffee card program",
        variant: "destructive"
      })
      return
    }
    
    // Check if voucher already exists (in current config or in account)
    if (type === 'voucher' && (rewardConfigs.some(config => config.type === 'voucher') || existingPrograms.hasVoucherProgram)) {
      toast({
        title: "Voucher program already exists",
        description: existingPrograms.hasVoucherProgram
          ? "You already have a voucher program in your account"
          : "You can only have one voucher program",
        variant: "destructive"
      })
      return
    }

    const id = `${type}_${Date.now()}`
    let newConfig: any = { id, type, expanded: true }

    switch (type) {
      case 'coffee':
        newConfig = { 
          ...newConfig, 
          pin: '',
          frequency: 10, // Total stamps (buy 9, get 1 free)
          minimumSpend: 0,
          minimumTimeBetween: 0
        }
        break
      case 'voucher':
        newConfig = { 
          ...newConfig, 
          rewardName: 'Loyalty Discount',
          description: '',
          pin: '',
          spendRequired: '100',
          discountAmount: '10',
          isActive: true
        }
        break
      case 'basic':
        newConfig = {
          ...newConfig,
          pin: '',
          rewardType: 'fixedDiscount',
          discountType: 'dollar',
          discountValue: 5,
          discountAppliesTo: 'entire sale',
          pointsRequired: 100,
          name: '$5 off entire sale'
        }
        break
    }

    setRewardConfigs([newConfig, ...rewardConfigs])
    setExpandedConfig(id)
  }

  const updateRewardConfig = (id: string, updates: any) => {
    setRewardConfigs(rewardConfigs.map(config => 
      config.id === id ? { ...config, ...updates } : config
    ))
  }

  const deleteRewardConfig = (id: string) => {
    setRewardConfigs(rewardConfigs.filter(config => config.id !== id))
  }

  const getRewardTitle = (config: any) => {
    switch (config.type) {
      case 'coffee':
        return `Coffee Card - ${config.frequency} stamps`
      case 'voucher':
        return `${config.rewardName} - $${config.discountAmount} for $${config.spendRequired} spent`
      case 'basic':
        if (config.rewardType === 'fixedDiscount') {
          if (config.discountType === 'percentage') {
            return config.name || `${config.discountValue || 10}% off entire sale`
          }
          return config.name || `$${config.discountValue || 5} off entire sale`
        } else if (config.rewardType === 'freeItem') {
          return config.name || `Free ${config.itemName || 'item'}`
        }
        return config.name || 'Basic Reward'
      default:
        return 'Reward'
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (selectedRewards.length > 0) {
        setSelectedRewards([])
      }
    }

    if (selectedRewards.length > 0) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [selectedRewards])

  // Fetch existing merchant data on mount
  useEffect(() => {
    const fetchExistingMerchantData = async () => {
      if (!user?.uid || !open) return

      try {
        const merchantDoc = await getDoc(doc(db, 'merchants', user.uid))
        if (merchantDoc.exists()) {
          const data = merchantDoc.data()
          if (data.logoUrl) {
            setExistingLogoUrl(data.logoUrl)
          }
          if (data.merchantName || data.businessName) {
            setMerchantName(data.merchantName || data.businessName)
          }
          
          // Check for existing programs
          setExistingPrograms({
            hasCoffeeProgram: !!(data.coffeePrograms && data.coffeePrograms.length > 0),
            hasVoucherProgram: !!(data.voucherPrograms && data.voucherPrograms.length > 0),
            hasCashbackProgram: !!(data.cashbackProgram || data.isCashback)
          })
          
          // If tap cash already exists, set its values but don't enable it
          if (data.cashbackProgram || data.isCashback) {
            // Don't enable Tap Cash in quick setup if it already exists
            setEnableTapCash(false)
            if (data.cashbackRate) {
              setTapCashRate(data.cashbackRate)
            }
            if (data.cashbackProgram?.description) {
              setTapCashDescription(data.cashbackProgram.description)
            }
          }
        }
      } catch (error) {
        console.error('Error fetching merchant data:', error)
      }
    }

    if (open) {
      fetchExistingMerchantData()
    } else {
      // Reset states when closing
      setCurrentStep(1)
      setLogoFile(null)
      setLogoPreview(null)
      setRewardConfigs([])
      setExpandedConfig(null)
      setSelectedRewards([])
    }
  }, [user?.uid, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-white animate-in fade-in duration-200">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-8 py-4 border-b border-gray-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
                              <p className="text-xs text-gray-500 mb-1">Step {currentStep} of {totalSteps}</p>
              <h1 className="text-lg font-semibold text-gray-900">Quick Setup</h1>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {/* Step 1: Introduction */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-12">Boost customer loyalty and increase your revenue</h1>
                  
                  {/* Key Benefits */}
                  <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-8">
                    <div className="text-center">
                      <div className="mb-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <circle cx="9" cy="7" r="4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Repeat visits, more sales</h3>
                      <p className="text-sm text-gray-600">Loyalty programs typically increase customer visit frequency by up to 40%.</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="mb-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                          <path d="M3 13h8v8H3zM13 3h8v8h-8zM13 13h8v8h-8z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <rect x="3" y="3" width="8" height="8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Results you can see</h3>
                      <p className="text-sm text-gray-600">Track your programme, customer visits and reward redemption in the loyalty dashboard.</p>
                    </div>
                    
                    <div className="text-center">
                      <div className="mb-3">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                          <rect x="3" y="3" width="18" height="14" rx="2" stroke="#6B7280" strokeWidth="2"/>
                          <path d="M8 21h8" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 17v4" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">No extra devices or hassle</h3>
                      <p className="text-sm text-gray-600">Enrol and reward customers directly from your loyalty system.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Welcome & Logo */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome to your loyalty program</h2>
                  <p className="text-gray-600">Let's get your program set up quickly</p>
                </div>

                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Points Information */}
                  <div className="p-6 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-center gap-3 mb-3">
                     
                      <div>
                        <h3 className="font-medium text-gray-900">Points Program</h3>
                        <p className="text-sm text-gray-600">$1 spent = 3 points</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      With bank-linked loyalty, your customers will earn points effortlessly on every purchase without needing QR codes. They can redeem these points for rewards you create.
                    </p>
                  </div>

                  {/* Logo Upload Section */}
                  <div className="mt-8 p-6 bg-white border border-gray-200 rounded-md">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-medium text-gray-900">
                        {existingLogoUrl ? 'Your Logo' : 'Upload Your Logo'}
                      </h3>
                      {!existingLogoUrl && !logoPreview && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                          <div className="h-1.5 w-1.5 bg-orange-500 rounded-full flex-shrink-0"></div>
                          Required for activation
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {existingLogoUrl 
                        ? 'Your current logo is shown below. You can upload a new one to replace it.'
                        : 'Add your business logo to personalise your loyalty program and improve brand recognition. A logo helps customers identify your business in the app.'}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      {logoPreview || existingLogoUrl ? (
                        <div className="relative">
                          <img 
                            src={logoPreview || existingLogoUrl || ''} 
                            alt="Logo" 
                            className="w-20 h-20 object-contain rounded-md border border-gray-200 bg-white" 
                          />
                          {logoPreview && (
                            <button
                              onClick={() => {
                                setLogoFile(null)
                                setLogoPreview(null)
                              }}
                              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-200"
                            >
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-white border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          id="logo-upload-quick"
                        />
                        <label htmlFor="logo-upload-quick">
                          <Button variant="outline" size="sm" asChild>
                            <span className="cursor-pointer">
                              {existingLogoUrl ? 'Change Logo' : 'Choose File'}
                            </span>
                          </Button>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG or SVG (max 5MB)</p>
                        {existingLogoUrl && !logoPreview && (
                          <p className="text-xs text-green-600 mt-1">✓ Logo already uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>


                </div>
              </div>
            )}

            {/* Step 3: Create Rewards */}
            {currentStep === 3 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Your Rewards</h2>
                  <p className="text-gray-600">Add one or more reward types to your loyalty program</p>
                </div>

                <div className="space-y-4 max-w-3xl mx-auto">
                  {/* Add reward dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedRewards(selectedRewards.length > 0 ? [] : ['show'])
                      }}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Reward Type
                    </button>

                    {selectedRewards.length > 0 && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-2">
                          <button
                            onClick={() => {
                              addRewardConfig('coffee')
                              setSelectedRewards([])
                            }}
                            disabled={rewardConfigs.some(config => config.type === 'coffee') || existingPrograms.hasCoffeeProgram}
                            className={cn(
                              "w-full text-left p-3 rounded-md transition-colors",
                              rewardConfigs.some(config => config.type === 'coffee') || existingPrograms.hasCoffeeProgram
                                ? "opacity-50 cursor-not-allowed bg-gray-50"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Coffee className="h-5 w-5 text-gray-600" />
                              <div className="flex-1">
                                <div className="font-medium">Coffee Card</div>
                                <div className="text-sm text-gray-500">
                                  {rewardConfigs.some(config => config.type === 'coffee')
                                    ? "Already added"
                                    : existingPrograms.hasCoffeeProgram
                                    ? "Already exists in your account"
                                    : "Stamp-based rewards"}
                                </div>
                              </div>
                              {existingPrograms.hasCoffeeProgram && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </button>
                          <button
                            onClick={() => {
                              addRewardConfig('voucher')
                              setSelectedRewards([])
                            }}
                            disabled={rewardConfigs.some(config => config.type === 'voucher') || existingPrograms.hasVoucherProgram}
                            className={cn(
                              "w-full text-left p-3 rounded-md transition-colors",
                              rewardConfigs.some(config => config.type === 'voucher') || existingPrograms.hasVoucherProgram
                                ? "opacity-50 cursor-not-allowed bg-gray-50"
                                : "hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <Ticket className="h-5 w-5 text-gray-600" />
                              <div className="flex-1">
                                <div className="font-medium">Voucher Program</div>
                                <div className="text-sm text-gray-500">
                                  {rewardConfigs.some(config => config.type === 'voucher')
                                    ? "Already added"
                                    : existingPrograms.hasVoucherProgram
                                    ? "Already exists in your account"
                                    : "Threshold-based vouchers"}
                                </div>
                              </div>
                              {existingPrograms.hasVoucherProgram && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              addRewardConfig('basic')
                              setSelectedRewards([])
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Gift className="h-5 w-5 text-gray-600" />
                              <div>
                                <div className="font-medium">Basic Reward</div>
                                <div className="text-sm text-gray-500">Points-based discount</div>
                              </div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Existing reward configurations */}
                  {rewardConfigs.map((config) => (
                    <div key={config.id} className="bg-gray-50 border border-gray-200 rounded-md">
                      <div 
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedConfig(expandedConfig === config.id ? null : config.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                            {config.type === 'coffee' && <Coffee className="h-5 w-5 text-gray-600" />}
                            {config.type === 'voucher' && <Ticket className="h-5 w-5 text-gray-600" />}
                            {(config.type === 'basic' || config.type === 'percentageDiscount' || config.type === 'freeItem') && <Gift className="h-5 w-5 text-gray-600" />}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{getRewardTitle(config)}</h3>
                            <p className="text-sm text-gray-500">
                              {config.type === 'coffee' && 'Stamp-based rewards'}
                              {config.type === 'voucher' && 'Threshold-based vouchers'}
                              {config.type === 'basic' && 'Points-based discount'}
                              {config.type === 'percentageDiscount' && 'Percentage discount'}
                              {config.type === 'freeItem' && 'Free item reward'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {finalizedRewards.has(config.id) && (
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteRewardConfig(config.id)
                            }}
                            className="p-1 hover:bg-gray-200 rounded-md transition-colors"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </button>
                          <ChevronDown className={cn(
                            "h-5 w-5 text-gray-400 transition-transform duration-200",
                            expandedConfig === config.id && "rotate-180"
                          )} />
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedConfig === config.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ 
                              duration: 0.4,
                              ease: [0.04, 0.62, 0.23, 0.98]
                            }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 border-t border-gray-100 bg-white">
                              {config.type === 'coffee' && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm">PIN Code <span className="text-red-500">*</span></Label>
                                    <Input
                                      type="text"
                                      maxLength={4}
                                      value={config.pin}
                                      onChange={(e) => updateRewardConfig(config.id, { pin: e.target.value.replace(/\D/g, '') })}
                                      placeholder="1234"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">4-digit staff PIN for redemptions</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Total stamps required</Label>
                                    <Select
                                      value={config.frequency?.toString()}
                                      onValueChange={(value) => updateRewardConfig(config.id, { frequency: Number(value) })}
                                    >
                                      <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select stamps required" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[5, 6, 8, 10, 12, 15, 20].map(num => (
                                          <SelectItem key={num} value={num.toString()}>
                                            {num} stamps (buy {num-1}, get 1 free)
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Minimum spend ($)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={config.minimumSpend}
                                      onChange={(e) => updateRewardConfig(config.id, { minimumSpend: Number(e.target.value) })}
                                      placeholder="0"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Minimum purchase to earn stamp (0 for no minimum)</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Time between stamps (minutes)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={config.minimumTimeBetween}
                                      onChange={(e) => updateRewardConfig(config.id, { minimumTimeBetween: Number(e.target.value) })}
                                      placeholder="0"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Cooldown between stamps (0 for no limit)</p>
                                  </div>
                                  <div className="pt-4 border-t border-gray-100">
                                    <Button
                                      onClick={() => handleSaveReward(config.id)}
                                      disabled={finalizedRewards.has(config.id)}
                                      className="w-auto px-6"
                                    >
                                      {finalizedRewards.has(config.id) ? (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Saved
                                        </>
                                      ) : (
                                        'Save Coffee Card'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}

                              {config.type === 'voucher' && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm">Reward Name <span className="text-red-500">*</span></Label>
                                    <Input
                                      type="text"
                                      value={config.rewardName}
                                      onChange={(e) => updateRewardConfig(config.id, { rewardName: e.target.value })}
                                      placeholder="Loyalty Discount"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm">PIN Code <span className="text-red-500">*</span></Label>
                                    <Input
                                      type="text"
                                      maxLength={4}
                                      value={config.pin}
                                      onChange={(e) => updateRewardConfig(config.id, { pin: e.target.value.replace(/\D/g, '') })}
                                      placeholder="1234"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">4-digit staff PIN for applying voucher</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Spending threshold ($)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={config.spendRequired || ''}
                                      onChange={(e) => updateRewardConfig(config.id, { spendRequired: e.target.value })}
                                      placeholder="e.g., 100"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Amount customer needs to spend to earn voucher</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Voucher amount ($)</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={config.discountAmount || ''}
                                      onChange={(e) => updateRewardConfig(config.id, { discountAmount: e.target.value })}
                                      placeholder="e.g., 10"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm">Description (optional)</Label>
                                    <Input
                                      type="text"
                                      value={config.description}
                                      onChange={(e) => updateRewardConfig(config.id, { description: e.target.value })}
                                      placeholder="Optional description"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="pt-4 border-t border-gray-100">
                                    <Button
                                      onClick={() => handleSaveReward(config.id)}
                                      disabled={finalizedRewards.has(config.id)}
                                      className="w-auto px-6"
                                    >
                                      {finalizedRewards.has(config.id) ? (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Saved
                                        </>
                                      ) : (
                                        'Save Voucher Program'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}



                              {config.type === 'basic' && (
                                <div className="space-y-4">
                                  <div>
                                    <Label className="text-sm">PIN Code <span className="text-red-500">*</span></Label>
                                    <Input
                                      type="text"
                                      maxLength={4}
                                      value={config.pin || ''}
                                      onChange={(e) => updateRewardConfig(config.id, { pin: e.target.value.replace(/\D/g, '') })}
                                      placeholder="1234"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">4-digit staff PIN for redemptions</p>
                                  </div>
                                  <div>
                                    <Label className="text-sm">Reward type</Label>
                                    <Select
                                      value={config.rewardType || 'fixedDiscount'}
                                      onValueChange={(newType) => {
                                        let updates: any = { rewardType: newType }
                                        
                                        // Set default values based on type
                                        if (newType === 'fixedDiscount') {
                                          updates = {
                                            ...updates,
                                            discountType: 'dollar',
                                            discountValue: config.discountValue || 5,
                                            name: `$${config.discountValue || 5} off entire sale`
                                          }
                                        } else if (newType === 'freeItem') {
                                          updates = {
                                            ...updates,
                                            itemName: config.itemName || 'Coffee',
                                            name: `Free ${config.itemName || 'Coffee'}`
                                          }
                                        }
                                        
                                        updateRewardConfig(config.id, updates)
                                      }}
                                    >
                                      <SelectTrigger className="mt-1 w-full">
                                        <SelectValue placeholder="Select reward type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="fixedDiscount">Fixed discount on entire sale</SelectItem>
                                        <SelectItem value="freeItem">Free item giveaway</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  {config.rewardType === 'fixedDiscount' && (
                                    <>
                                      <div>
                                        <Label className="text-sm">Discount type</Label>
                                        <Select
                                          value={config.discountType || 'dollar'}
                                          onValueChange={(value) => {
                                            updateRewardConfig(config.id, { 
                                              discountType: value,
                                              name: value === 'dollar' 
                                                ? `$${config.discountValue || 5} off entire sale`
                                                : `${config.discountValue || 10}% off entire sale`
                                            })
                                          }}
                                        >
                                          <SelectTrigger className="mt-1 w-full">
                                            <SelectValue placeholder="Select discount type" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="dollar">Dollar amount ($)</SelectItem>
                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Label className="text-sm">
                                          Discount amount {config.discountType === 'percentage' ? '(%)' : '($)'}
                                        </Label>
                                        <Input
                                          type="number"
                                          min="0"
                                          step={config.discountType === 'percentage' ? "1" : "0.01"}
                                          value={config.discountValue || ''}
                                          onChange={(e) => {
                                            const value = e.target.value
                                            const numValue = Number(value) || 0
                                            updateRewardConfig(config.id, { 
                                              discountValue: numValue,
                                              name: config.discountType === 'percentage'
                                                ? `${numValue}% off entire sale`
                                                : `$${numValue} off entire sale`
                                            })
                                          }}
                                          placeholder={config.discountType === 'percentage' ? "e.g., 15" : "e.g., 5.00"}
                                          className="mt-1"
                                        />
                                      </div>
                                    </>
                                  )}
                                  
                                  {config.rewardType === 'freeItem' && (
                                    <div>
                                      <Label className="text-sm">Free item name</Label>
                                      <Input
                                        type="text"
                                        value={config.itemName || ''}
                                        onChange={(e) => updateRewardConfig(config.id, { 
                                          itemName: e.target.value,
                                          name: `Free ${e.target.value}`
                                        })}
                                        placeholder="e.g., Coffee, Muffin"
                                        className="mt-1"
                                      />
                                    </div>
                                  )}
                                  
                                  <div>
                                    <Label className="text-sm">Points required</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={config.pointsRequired || ''}
                                      onChange={(e) => updateRewardConfig(config.id, { pointsRequired: Number(e.target.value) })}
                                      placeholder="e.g., 100"
                                      className="mt-1"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Enter 0 for a free reward
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-sm">Reward name</Label>
                                    <Input
                                      value={config.name || ''}
                                      onChange={(e) => updateRewardConfig(config.id, { name: e.target.value })}
                                      placeholder="e.g., Birthday Reward, Welcome Offer"
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="pt-4 border-t border-gray-100">
                                    <Button
                                      onClick={() => handleSaveReward(config.id)}
                                      disabled={finalizedRewards.has(config.id)}
                                      className="w-auto px-6"
                                    >
                                      {finalizedRewards.has(config.id) ? (
                                        <>
                                          <Check className="h-4 w-4 mr-2" />
                                          Saved
                                        </>
                                      ) : (
                                        'Save Basic Reward'
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Step 4: Introductory Rewards */}
            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Create <span className="font-bold text-[#007aff]">Tap</span> Funded Introductory Rewards
                    </h2>
                  </div>
                  <div className="flex justify-center mt-1 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                      Tap Funded
                    </span>
                  </div>
                  <p className="text-gray-600">
                    Create special rewards funded by Tap Loyalty to attract new customers
                  </p>
                </div>
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Info Box */}
                  <div className="bg-white border border-blue-200 rounded-md p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-1">About Introductory Rewards ({existingIntroRewards.length}/3)</h4>
                        <p className="text-sm text-gray-600 mb-2">
                          You can create up to 3 special introductory rewards:
                        </p>
                        <ul className="text-sm text-gray-600 space-y-1 pl-4 list-disc">
                          <li>Fully funded by Tap Loyalty (up to $5 value each)</li>
                          <li>Each new customer can redeem only one introductory reward across the entire platform</li>
                          <li>Make yours appealing to attract new customers to your business!</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  {/* Existing Introductory Rewards */}
                  {existingIntroRewards.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-gray-900">Your Introductory Rewards</h3>
                      {existingIntroRewards.map((reward) => (
                        <div key={reward.id} className="bg-white border border-gray-200 rounded-md p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/taplogo.png" 
                                alt="Tap Logo" 
                                className="w-8 h-8 rounded-sm object-contain" 
                              />
                              <div>
                                <h4 className="font-medium text-gray-900">{reward.rewardName}</h4>
                                <p className="text-sm text-gray-500">
                                  {reward.type === "voucher" 
                                    ? `$${reward.voucherAmount?.toFixed(2)} voucher` 
                                    : `Free ${reward.itemName}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                                <Check className="h-3.5 w-3.5 text-green-500" />
                                Active
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteIntroReward(reward)}
                                disabled={isLoading}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Create New Introductory Reward */}
                  {existingIntroRewards.length < 3 && (
                    <div className="bg-white border border-gray-200 rounded-md p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Introductory Reward</h3>
                      
                      <div className="space-y-4">
                        {/* Reward Type Selection */}
                        <div>
                          <Label className="text-sm">Reward Type</Label>
                          <div className="grid grid-cols-2 gap-3 mt-1.5">
                            <div
                              className={cn(
                                "border rounded-md p-3 cursor-pointer transition-all",
                                introRewardType === "voucher" 
                                  ? "border-blue-500 bg-blue-50" 
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                              onClick={() => setIntroRewardType("voucher")}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center",
                                  introRewardType === "voucher" ? "bg-blue-500 text-white" : "bg-gray-100"
                                )}>
                                  <DollarSign className="h-3 w-3" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Gift Voucher</p>
                                  <p className="text-xs text-gray-500">$5 credit toward purchase</p>
                                </div>
                              </div>
                            </div>
                            <div
                              className={cn(
                                "border rounded-md p-3 cursor-pointer transition-all",
                                introRewardType === "freeItem" 
                                  ? "border-blue-500 bg-blue-50" 
                                  : "border-gray-200 hover:border-gray-300"
                              )}
                              onClick={() => setIntroRewardType("freeItem")}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-6 w-6 rounded-full flex items-center justify-center",
                                  introRewardType === "freeItem" ? "bg-blue-500 text-white" : "bg-gray-100"
                                )}>
                                  <Gift className="h-3 w-3" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Free Item</p>
                                  <p className="text-xs text-gray-500">Item up to $5 value</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Reward Name */}
                        <div>
                          <Label className="text-sm">Reward Name</Label>
                          <Input
                            placeholder={introRewardType === "voucher" ? "e.g., Welcome $5 Voucher" : "e.g., Free Coffee for New Customers"}
                            value={introRewardData.rewardName}
                            onChange={(e) => setIntroRewardData({...introRewardData, rewardName: e.target.value})}
                            className="mt-1"
                          />
                        </div>

                        {/* Description */}
                        <div>
                          <Label className="text-sm">Description</Label>
                          <Textarea
                            placeholder={introRewardType === "voucher" 
                              ? "e.g., Enjoy $5 off your first purchase as a welcome gift from us!" 
                              : "e.g., Welcome to our store! Enjoy a free coffee on your first visit."}
                            value={introRewardData.description}
                            onChange={(e) => setIntroRewardData({...introRewardData, description: e.target.value})}
                            className="mt-1"
                          />
                        </div>

                        {/* Free Item Name */}
                        {introRewardType === "freeItem" && (
                          <div>
                            <Label className="text-sm">Free Item Name</Label>
                            <Input
                              placeholder="e.g., Regular Coffee, Pastry, etc."
                              value={introRewardData.itemName}
                              onChange={(e) => setIntroRewardData({...introRewardData, itemName: e.target.value})}
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-500 mt-1">Item must be valued at $5 or less</p>
                          </div>
                        )}

                        {/* PIN Code */}
                        <div>
                          <Label className="text-sm">Redemption PIN</Label>
                          <Input
                            type="text"
                            maxLength={4}
                            placeholder="4-digit PIN"
                            value={introRewardData.pin}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              setIntroRewardData({...introRewardData, pin: value});
                            }}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Enter a 4-digit PIN that will be required when redeeming this reward
                          </p>
                        </div>

                        {/* Create Button */}
                        <div className="pt-4">
                          <Button
                            onClick={handleCreateIntroReward}
                            disabled={isLoading}
                            className="w-auto px-6 bg-[#007AFF] hover:bg-[#0071E3] text-white"
                          >
                            {isLoading ? "Creating..." : "Create Introductory Reward"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {existingIntroRewards.length >= 3 && (
                    <div className="bg-white border border-gray-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-gray-500 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Maximum Introductory Rewards Reached</h4>
                          <p className="text-sm text-gray-600">
                            You have reached the maximum of 3 introductory rewards. To create a new one, please remove an existing reward first.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Tap Cash Setup */}
            {currentStep === 5 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-2">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {existingPrograms.hasCashbackProgram ? <><span className="font-bold text-[#007aff]">Tap</span> Cash Program</> : <>Set Up <span className="font-bold text-[#007aff]">Tap</span> Cash</>}
                    </h2>
                  </div>
                  {!existingPrograms.hasCashbackProgram && (
                    <div className="flex justify-center mt-1 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 w-fit">
                        <div className="h-1.5 w-1.5 bg-green-500 rounded-full flex-shrink-0"></div>
                        Recommended
                      </span>
                    </div>
                  )}
                  <p className="text-gray-600">
                    {existingPrograms.hasCashbackProgram 
                      ? 'Review your existing cash back program'
                      : 'Give customers instant cash back rewards they can use on their next purchase'}
                  </p>
                </div>

                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Show message if Tap Cash already exists */}
                  {existingPrograms.hasCashbackProgram && (
                    <div className="bg-white border border-blue-200 rounded-md p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1"><span className="font-bold text-[#007aff]">Tap</span> Cash Already Exists</h4>
                          <p className="text-sm text-gray-600">
                            Your Tap Cash program is already set up and cannot be modified through Quick Setup. 
                            To make changes, please visit your Tap Cash settings in the main dashboard.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Enable Tap Cash Toggle */}
                  <div className="bg-white border border-gray-200 rounded-md p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {existingPrograms.hasCashbackProgram ? <><span className="font-bold text-[#007aff]">Tap</span> Cash Status</> : <>Enable <span className="font-bold text-[#007aff]">Tap</span> Cash</>}
                              {existingPrograms.hasCashbackProgram && enableTapCash && (
                                <span className="ml-2 text-xs font-normal text-green-600">
                                  ✓ Currently active
                                </span>
                              )}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {existingPrograms.hasCashbackProgram 
                                ? `Currently offering ${tapCashRate}% cash back`
                                : 'Customers earn cash back on every purchase'}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                          Tap Cash rewards appear in customers' digital wallets and can be instantly applied to reduce their next transaction.
                        </p>
                      </div>
                      <Switch
                        checked={enableTapCash}
                        onCheckedChange={setEnableTapCash}
                        disabled={existingPrograms.hasCashbackProgram}
                        className="ml-4"
                      />
                    </div>

                    {/* Tap Cash Configuration */}
                    {enableTapCash && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ 
                          duration: 0.4,
                          ease: [0.04, 0.62, 0.23, 0.98]
                        }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-gray-100 pt-6 mt-6 space-y-4">
                          <div>
                            <Label className="text-sm">Cash back percentage</Label>
                            <Select
                              value={tapCashRate.toString()}
                              onValueChange={(value) => setTapCashRate(Number(value))}
                              disabled={existingPrograms.hasCashbackProgram}
                            >
                              <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Select cash back percentage" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1, 2, 3, 4, 5, 7.5, 10].map(rate => (
                                  <SelectItem key={rate} value={rate.toString()}>
                                    {rate}%
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500 mt-1">
                              Customers earn ${tapCashRate} for every $100 spent
                            </p>
                          </div>

                          <div>
                            <Label className="text-sm">Program description</Label>
                            <Textarea
                              value={tapCashDescription}
                              onChange={(e) => setTapCashDescription(e.target.value)}
                              placeholder="Describe your cash back program..."
                              disabled={existingPrograms.hasCashbackProgram}
                              className="mt-1"
                              rows={3}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This description will be shown to customers
                            </p>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-md p-4">
                            <div className="flex items-start gap-2">
                              <Info className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                              <h4 className="text-sm font-medium text-gray-900 mb-2">How Tap Cash Works</h4>
                            </div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              <li>• Customers automatically earn {tapCashRate}% cash back on purchases</li>
                              <li>• Cash back appears instantly in their digital wallet</li>
                              <li>• They can tap to apply cash back at checkout</li>
                              <li>• No minimum spend or restrictions</li>
                            </ul>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Info Box */}
                  {!enableTapCash && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-gray-600 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">Why offer Tap Cash?</h4>
                          <ul className="text-sm text-gray-700 space-y-1">
                            <li>• Provides instant gratification for customers</li>
                            <li>• Customers see immediate value from every purchase</li>
                            <li>• Encourages repeat visits and higher spending</li>
                            <li>• No need to wait for points to accumulate</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Preview */}
            {currentStep === 6 && (
              <div className="space-y-8">
                <div className="text-center mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">Preview Your Loyalty Program</h2>
                  <p className="text-gray-600">Here's how your loyalty program will look to customers</p>
                </div>

                <div className="flex justify-center">
                  <DemoIPhone 
                    open={true} 
                    onOpenChange={() => {}} 
                    isDemoMode={false}
                    initialTab="rewards"
                    previewData={{
                      merchantName: merchantName || 'Your Store',
                      logoUrl: logoPreview || existingLogoUrl || '',
                      coffeePrograms: rewardConfigs.filter(c => c.type === 'coffee'),
                      voucherPrograms: rewardConfigs.filter(c => c.type === 'voucher'),
                      rewards: rewardConfigs.filter(c => c.type === 'basic'),
                      tapCash: enableTapCash ? {
                        enabled: true,
                        rate: tapCashRate,
                        description: tapCashDescription
                      } : undefined
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={isLoading}
              >
                Back
              </Button>
            ) : (
              <div />
            )}
            
            <Button
              onClick={handleNext}
                              disabled={isLoading || (currentStep === 3 && rewardConfigs.length === 0)}
            >
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : currentStep === totalSteps ? (
                'Complete Setup'
              ) : (
                'Next'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
