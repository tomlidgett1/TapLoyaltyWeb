import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"

export default function LoginPage() {
  return (
    <PageTransition>
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
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
    </PageTransition>
  )
} 