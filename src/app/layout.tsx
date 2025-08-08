import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/contexts/auth-context"
import { OpenAIProvider } from '@/components/providers/openai-provider';
import Link from 'next/link';
import { TapAiDialogProvider } from "@/components/tap-ai-dialog-provider";
import { CommandPalette } from "@/components/command-palette"


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
      { url: '/taplogo.png', type: 'image/png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: { url: '/taplogo.png', type: 'image/png' }
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans overflow-x-hidden`}>
        <OpenAIProvider>
          <AuthProvider>
            <TapAiDialogProvider>
              {children}
              <Toaster />
              <CommandPalette />
            </TapAiDialogProvider>
          </AuthProvider>
        </OpenAIProvider>
      </body>
    </html>
  );
}
