import React from "react"
import {
  Store,
  Gift,
  Sparkles,
  Users,
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

export function BannerPreview({
  title,
  description,
  buttonText,
  color = "#007AFF",
  styleType,
  merchantName,
  visibilityType,
  isActive,
}: BannerPreviewProps) {
  // Pick an icon based on styleType (or your own logic)
  let Icon = Store;
  if (styleType === "gift") {
    Icon = Gift;
  } else if (styleType === "sparkles") {
    Icon = Sparkles;
  } else if (styleType === "users") {
    Icon = Users;
  }

  // Example background style logic: could differ from your original
  const containerBg = color + "20"; // makes a lighter version of the color
  const darkenedBg = darkenColor(color, -20); // slightly darken for button hover, if wanted

  return (
    <div
      className="relative w-full rounded-md shadow p-4"
      style={{
        backgroundColor: containerBg,
      }}
    >
      {/* Banner header with an icon */}
      <div className="flex items-center mb-2">
        <Icon className="mr-2 h-6 w-6" style={{ color }} />
        <h2 className="font-bold text-lg" style={{ color }}>
          {title}
        </h2>
      </div>

      {/* Description */}
      <p className="text-sm mb-3">{description}</p>

      {/* Optional CTA button */}
      {buttonText && (
        <button
          className="px-3 py-1 text-sm text-white rounded-md transition-colors"
          style={{
            backgroundColor: color,
          }}
          onMouseEnter={(e) => {
            // If you want a darker hover effect:
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              darkenedBg;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = color;
          }}
        >
          {buttonText}
        </button>
      )}

      {/* Merchant info, visibility, etc. */}
      {merchantName && (
        <p className="text-xs text-gray-600 mt-2 italic">By {merchantName}</p>
      )}
      {visibilityType && (
        <p className="text-xs text-gray-500 mt-1">
          Visible to: <strong>{visibilityType}</strong>
        </p>
      )}
      {typeof isActive === "boolean" && (
        <p className="text-[10px] mt-2 font-medium">
          Status:{" "}
          <span style={{ color: isActive ? "#34C759" : "#FF3B30" }}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </p>
      )}
    </div>
  );
} 