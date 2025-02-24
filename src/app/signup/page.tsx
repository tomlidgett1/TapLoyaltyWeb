import { SignUpForm } from "@/components/signup-form"

const steps = [
  {
    id: 1,
    name: "Authentication",
  },
  {
    id: 2,
    name: "Business Details",
  },
  {
    id: 3,
    name: "Location",
  },
  {
    id: 4,
    name: "Additional Info",
  }
]

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Tap Loyalty Logo" 
            className="w-8 h-8 rounded-lg object-cover"
          />
          <h1 className="text-2xl">
            <span className="text-[#007AFF] font-extrabold">Tap</span>{" "}
            <span className="font-semibold">Loyalty</span>
          </h1>
        </div>
      </div>
      
      <div className="flex min-h-[calc(100vh-80px)] w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-xl">
          <SignUpForm />
        </div>
      </div>
    </div>
  )
} 