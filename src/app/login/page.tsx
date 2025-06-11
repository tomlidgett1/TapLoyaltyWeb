"use client"

import { LoginForm } from "@/components/login-form"
import { PageTransition } from "@/components/page-transition"
import { ShieldCheck, Zap, Users, Mail, Gift, Network, Banknote, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useState, useEffect } from "react"

export default function LoginPage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  
  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % 3)
    }, 5000)
    
    return () => clearInterval(timer)
  }, [])

  const slides = [
    {
      tagline: "Australia's first networked loyalty program",
      content: [
        {
          text: "Tap Loyalty delivers personalised rewards through networked programs powered by open banking integration.",
          highlight: "Tap Loyalty"
        },
        {
          text: "Tap Agents provide intelligent customer, email, and retail automation for personalised business experiences.",
          highlight: "Tap Agents"
        }
      ],
      features: [
        { text: "Powered by open banking", icon: true },
        { text: "Government accredited", icon: true }
      ]
    },
    {
      tagline: "Intelligent automation that works for you",
      content: [
        {
          text: "Smart email management that categorises, responds, and escalates customer inquiries automatically.",
          highlight: "Smart email management"
        },
        {
          text: "Retail insights that track customer behaviour and optimise your sales strategy in real-time.",
          highlight: "Retail insights"
        }
      ],
      features: [
        { text: "24/7 automated responses", icon: true },
        { text: "Real-time analytics", icon: true }
      ]
    },
    {
      tagline: "Join Australia's growing loyalty network",
      content: [
        {
          text: "Connect with thousands of businesses to offer your customers rewards across multiple venues.",
          highlight: "thousands of businesses"
        },
        {
          text: "Drive customer retention with intelligent rewards that adapt to spending patterns and preferences.",
          highlight: "intelligent rewards"
        }
      ],
      features: [
        { text: "Cross-business rewards", icon: true },
        { text: "Adaptive algorithms", icon: true }
      ]
    }
  ]

  return (
    <PageTransition>
      <div className="min-h-screen w-full bg-white">
        <div className="grid min-h-screen lg:grid-cols-5">
          {/* Left side - Hero section with carousel */}
          <div className="relative hidden lg:flex lg:col-span-2 bg-gray-50 flex-col justify-between px-16 py-16 overflow-hidden">
            {/* Tap Loyalty title */}
            <div className="absolute top-6 left-16">
              <h1 className="text-2xl font-bold">
                <span className="font-extrabold text-[#007AFF]">Tap</span>{" "}
                <span className="font-semibold text-gray-900">Loyalty</span>
              </h1>
            </div>
            {/* Carousel container */}
            <div className="flex-1 flex flex-col justify-center max-w-md relative mt-16">
              <div className="relative overflow-hidden">
                {/* Slides */}
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                >
                  {slides.map((slide, index) => (
                    <div key={index} className="min-w-full">
                      {/* Tagline */}
                      <div className="mb-12">
                        <p className="text-xl text-gray-700 font-medium">
                          {slide.tagline}
                        </p>
                      </div>
                      
                      {/* Product Descriptions */}
                      <div className="mb-12 space-y-6">
                        {slide.content.map((item, contentIndex) => (
                          <p key={contentIndex} className="text-base text-gray-700 leading-relaxed">
                            <span className="font-bold text-[#007AFF]">{item.highlight}</span> {item.text.replace(item.highlight, '')}
                          </p>
                        ))}
                      </div>

                      {/* Features */}
                      <div className="mb-12">
                        {slide.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="font-medium">{feature.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Carousel navigation dots */}
                <div className="flex items-center gap-2 mt-8">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentSlide ? 'bg-[#007AFF]' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Integration icons */}
            <div className="border-t border-gray-200 pt-6">
              <p className="text-xs text-gray-500 mb-4 font-medium tracking-wide">
                INTEGRATES WITH
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                {["xero.png", "square.png", "sheetspro.png", "outlook.png", "mailchimp.png", "hubspot.png", "gmailnew.png", "lslogo.png"].map((integration, index) => (
                  <div key={index} className="w-9 h-9 bg-white rounded-md shadow-sm border border-gray-200 flex items-center justify-center p-1.5">
                    <Image src={`/${integration}`} alt={integration.split('.')[0]} width={24} height={24} className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right side - Login form */}
          <div className="relative flex flex-col lg:col-span-3">
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