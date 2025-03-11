"use client"

import React from "react"
import {
  Store,
  Gift,
  Sparkles,
  Users,
  UserPlus,
  // etc. (any needed icons)
} from "lucide-react"

interface BannerPreviewProps {
  title: string
  description: string
  buttonText?: string
  color?: string
  styleType?: string
  merchantName?: string
  visibilityType?: string
  isActive?: boolean
}

// Helper function to darken a color (same as in create-banner-dialog)
function darkenColor(hex: string, percent: number) {
  // Remove the # if it exists
  let cleanHex = hex.replace("#", "");
  // If shorthand 3-char hex, expand it
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split("").map((c) => c + c).join("");
  }
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Darken each channel
  const newR = Math.max(Math.min(r + (percent / 100) * r, 255), 0);
  const newG = Math.max(Math.min(g + (percent / 100) * g, 255), 0);
  const newB = Math.max(Math.min(b + (percent / 100) * b, 255), 0);

  // Convert back to hex
  const rr = Math.round(newR).toString(16).padStart(2, "0");
  const gg = Math.round(newG).toString(16).padStart(2, "0");
  const bb = Math.round(newB).toString(16).padStart(2, "0");

  return `#${rr}${gg}${bb}`;
}

// Helper function to convert hex to rgba (same as in create-banner-dialog)
function hexToRgba(hex: string, alpha: number) {
  let c: string | string[] = hex.substring(1).split("");
  if (c.length === 3) {
    c = [c[0], c[0], c[1], c[1], c[2], c[2]];
  }
  const r = parseInt(c[0] + c[1], 16);
  const g = parseInt(c[2] + c[3], 16);
  const b = parseInt(c[4] + c[5], 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Example enum for banner styles—same as in create-banner-dialog
 */
export enum BannerStyle {
  LIGHT = "light",
  DARK = "dark",
  GLASS = "glass",
}

/**
 * Example enum for banner visibility—same as in create-banner-dialog
 */
export enum BannerVisibility {
  ALL = "ALL",
  NEW = "NEW",
  // Add more if needed
}

function getIcon(styleType: BannerStyle) {
  switch (styleType) {
    case BannerStyle.DARK:
      return Gift
    case BannerStyle.GLASS:
      return Sparkles
    case BannerStyle.LIGHT:
      return Store
    default:
      return Store
  }
}

// Add a color mapping function to convert color names to hex
function getColorHex(colorName: string | undefined): string {
  if (!colorName) return "#0ea5e9"; // Default blue
  
  const colorMap: Record<string, string> = {
    "red": "#ef4444",
    "green": "#22c55e",
    "blue": "#3b82f6",
    "yellow": "#eab308",
    "purple": "#a855f7",
    "pink": "#ec4899",
    "orange": "#f97316",
    "teal": "#14b8a6",
    "cyan": "#06b6d4",
    "indigo": "#6366f1",
    "gray": "#6b7280",
    "black": "#000000",
    "white": "#ffffff"
  };
  
  return colorMap[colorName.toLowerCase()] || colorName; // Return the hex or the original if not found
}

export function BannerPreview({
  title,
  description,
  buttonText,
  color,
  styleType,
  merchantName,
  visibilityType,
  isActive,
}: {
  title?: string
  description?: string
  buttonText?: string
  color?: string
  styleType: BannerStyle
  merchantName?: string
  visibilityType?: BannerVisibility
  isActive?: boolean
}) {
  const Icon = getIcon(styleType)
  const colorHex = getColorHex(color)

  // Helper function(s) to get styling from style type:
  function getBackground() {
    if (styleType === BannerStyle.DARK && color) {
      console.log("Using dark style with color:", color, "hex:", colorHex);
      return `linear-gradient(
        135deg, 
        ${hexToRgba(colorHex, 0.8)}, 
        ${hexToRgba(darkenColor(colorHex, 20), 0.9)}
      )`
    } else if (styleType === BannerStyle.DARK) {
      console.log("Using dark style without color");
      return "#333" // fallback if no color
    } else if (styleType === BannerStyle.GLASS && color) {
      console.log("Using glass style with color:", color, "hex:", colorHex);
      // Glass effect with user color
      return hexToRgba(colorHex, 0.2)
    } else if (styleType === BannerStyle.GLASS) {
      console.log("Using glass style without color");
      return "rgba(255, 255, 255, 0.4)"
    }
    // LIGHT or default
    console.log("Using light style with color:", color, "hex:", colorHex);
    return colorHex || "#F5F5F5"
  }

  function getTextColor() {
    if (styleType === BannerStyle.DARK) {
      return "text-white"
    } else {
      return "text-black"
    }
  }

  function getButtonColor() {
    if (styleType === BannerStyle.DARK) {
      return "underline decoration-white"
    }
    return "underline decoration-black"
  }

  return (
    <div 
      className={`w-full rounded-md overflow-hidden shadow-sm`}
      style={{
        backgroundColor: styleType === BannerStyle.LIGHT ? 'white' : color,
        color: styleType === BannerStyle.LIGHT ? 'black' : 'white',
      }}
    >
      <div className="p-3">
        <div className="flex">
          <div className="flex-1 z-10">
            <div className="text-xs font-medium px-2 py-1 rounded-md bg-black/10 inline-block mb-1">
              {merchantName || "MerchantName"}
            </div>
            <h3 className="text-lg font-bold mb-1">
              {title || "Banner Title"}
            </h3>
            <p
              className={`text-sm ${
                styleType === BannerStyle.DARK ? "text-gray-100" : "text-gray-600"
              }`}
            >
              {description || "Banner description text will appear here."}
            </p>
            {buttonText && (
              <button
                className={`mt-2 text-sm font-medium ${getButtonColor()}`}
                style={{
                  color: styleType === BannerStyle.DARK ? "white" : color || "black",
                }}
              >
                {buttonText} →
              </button>
            )}
          </div>
          <div className="absolute top-0 right-0 opacity-20">
            <Icon size={100} color={styleType === BannerStyle.DARK ? "white" : color || "#333"} />
          </div>
        </div>
        {visibilityType === BannerVisibility.NEW && (
          <div className="absolute bottom-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center">
            <UserPlus className="h-3 w-3 mr-1" />
            <span>New Customers</span>
          </div>
        )}
      </div>
    </div>
  )
} 