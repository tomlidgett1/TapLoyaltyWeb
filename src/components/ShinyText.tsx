"use client"

import React from "react"

interface ShinyTextProps {
  text: string
  disabled?: boolean
  speed?: number
  className?: string
}

const ShinyText: React.FC<ShinyTextProps> = ({
  text,
  disabled = false,
  speed = 5,
  className = "",
}) => {
  const animationDuration = `${speed}s`

  return (
    <div
      className={`text-transparent bg-clip-text inline-block ${disabled ? "" : "animate-shine"} ${className}`}
      style={{
        backgroundImage: [
          // Moving highlight sweep (narrow bright core with soft edges)
          "linear-gradient(100deg, rgba(255,255,255,0) 46%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.18) 52%, rgba(255,255,255,0) 54%)",
          // Static base text colour
          "linear-gradient(#374151, #374151)",
        ].join(", "),
        backgroundSize: "200% 100%, 100% 100%",
        backgroundRepeat: "no-repeat",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        willChange: "background-position",
        animationDuration,
      }}
    >
      {text}
    </div>
  )
}

export default ShinyText


