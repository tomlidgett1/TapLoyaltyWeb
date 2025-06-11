import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck, Zap, Users, Mail, Gift, Network, Banknote } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-white">
        <div className="grid min-h-screen lg:grid-cols-2">
          {/* Left side - Hero section */}
          <div className="relative hidden lg:flex bg-gray-50 flex-col justify-between px-16 py-16">
            <div className="flex-1 flex flex-col justify-center max-w-md">
              {/* Logo */}
              <div className="mb-12">
                <h1 className="text-5xl font-bold">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
                <p className="text-lg text-gray-600 mt-3">
                  Australia's first networked loyalty program
                </p>
              </div>
              
              {/* Product Descriptions */}
              <div className="mb-12 space-y-6">
                <p className="text-base text-gray-700 leading-relaxed">
                  <span className="font-bold text-[#007AFF]">Tap Loyalty</span> delivers personalised rewards through networked programs powered by open banking integration.
                </p>
                
                <p className="text-base text-gray-700 leading-relaxed">
                  <span className="font-bold text-[#007AFF]">Tap Agents</span> provide intelligent customer, email, and retail automation for personalised business experiences.
                </p>
              </div>

              {/* Government accreditation */}
              <div className="mb-12">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Powered by open banking</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Government accredited</span>
                </div>
              </div>
            </div>

            {/* Integration icons */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-500 mb-4 font-medium tracking-wide">INTEGRATES WITH</p>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/xero.png" alt="Xero" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/square.png" alt="Square" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/sheetspro.png" alt="Sheets Pro" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/outlook.png" alt="Outlook" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/mailchimp.png" alt="Mailchimp" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/hubspot.png" alt="HubSpot" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/gmailnew.png" alt="Gmail" width={24} height={24} className="w-full h-full object-contain" />
                </div>
                
                <div className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                  <Image src="/lslogo.png" alt="Lightspeed" width={24} height={24} className="w-full h-full object-contain" />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="relative flex flex-col">
            {/* Mobile header */}
            <div className="lg:hidden p-6 border-b bg-white">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">
                  <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                  <span className="font-semibold text-gray-900">Loyalty</span>
                </h1>
              </div>
            </div>

            {/* Form section */}
            <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
              <div className="w-full max-w-md">
                {/* Welcome message */}
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
                  <p className="text-gray-600">Sign in to your account to continue</p>
                </div>

                <LoginForm />
                
                {/* Trust indicators */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Your data is protected with enterprise-grade security</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile hero content */}
            <div className="lg:hidden bg-gray-50 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Australia's first networked loyalty program
                </h3>
                <p className="text-gray-600 text-sm">
                  <span className="font-semibold text-[#007AFF]">Tap Loyalty</span> and <span className="font-semibold text-[#007AFF]">Tap Agents</span> delivering personalised rewards
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 