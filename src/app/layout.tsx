import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { OnboardingCheck } from "@/components/onboarding-check"
import { OpenAIProvider } from '@/components/providers/openai-provider';
import Link from 'next/link';
import { TapAiDialogProvider } from "@/components/tap-ai-dialog-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tap Loyalty",
  description: "Customer loyalty platform for businesses",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png' }
    ],
    apple: { url: '/apple-icon.png', type: 'image/png' }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <OpenAIProvider>
          <AuthProvider>
            <TapAiDialogProvider>
              {children}
              <Toaster />
              <OnboardingCheck />
            </TapAiDialogProvider>
          </AuthProvider>
        </OpenAIProvider>
      </body>
    </html>
  );
}
