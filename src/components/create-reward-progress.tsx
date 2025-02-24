"use client"

import { cn } from "@/lib/utils"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ProgressStepProps {
  step: number
  currentStep: number
  title: string
  description: string
  isValid: boolean
  onStepClick: (step: number) => void
  isClickable: boolean
}

function ProgressStep({ 
  step, 
  currentStep, 
  title, 
  description, 
  isValid, 
  onStepClick,
  isClickable 
}: ProgressStepProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 relative",
        isClickable && "cursor-pointer hover:opacity-80"
      )}
      onClick={() => isClickable && onStepClick(step)}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-full border-2 flex items-center justify-center",
          currentStep === step
            ? "border-[#007AFF] text-[#007AFF]"
            : currentStep > step
            ? "border-green-500 bg-green-500 text-white"
            : "border-gray-300 text-gray-300"
        )}
      >
        {currentStep > step ? (
          <Check className="h-4 w-4" />
        ) : (
          <span className="text-sm font-medium">{step}</span>
        )}
      </div>

      <span className={cn(
        "text-sm font-medium",
        currentStep === step && "text-[#007AFF]",
        currentStep > step && "text-green-500"
      )}>
        {title}
      </span>

      {step < 3 && step !== 1 && step !== 2 && (
        <div className={cn(
          "h-px w-8 mx-2",
          currentStep > step ? "bg-green-500" : "bg-gray-300"
        )} />
      )}
    </div>
  )
}

export function CreateRewardProgress({ 
  currentStep, 
  validations,
  onStepChange
}: { 
  currentStep: number
  validations: {
    basic: boolean
    conditions: boolean
    limitations: boolean
  }
  onStepChange: (step: number) => void
}) {
  const canNavigateToStep = (step: number) => {
    if (step === 1) return true
    if (step === 2) return validations.basic
    if (step === 3) return validations.basic && validations.conditions
    return false
  }

  return (
    <div className="flex justify-between items-center px-2 py-4">
      <ProgressStep
        step={1}
        currentStep={currentStep}
        title="Basic Details"
        description="Set the core reward information"
        isValid={validations.basic}
        onStepClick={onStepChange}
        isClickable={canNavigateToStep(1)}
      />
      <ProgressStep
        step={2}
        currentStep={currentStep}
        title="Conditions"
        description="Define who can earn this reward"
        isValid={validations.conditions}
        onStepClick={onStepChange}
        isClickable={canNavigateToStep(2)}
      />
      <ProgressStep
        step={3}
        currentStep={currentStep}
        title="Limitations"
        description="Set usage restrictions"
        isValid={validations.limitations}
        onStepClick={onStepChange}
        isClickable={canNavigateToStep(3)}
      />
    </div>
  )
} 