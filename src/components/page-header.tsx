import React from "react"

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-0">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
        </div>
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div style={{
          width: "100vw",
          position: "relative",
          left: "50%",
          right: "50%",
          marginLeft: "-50vw",
          marginRight: "-50vw",
          height: "1px",
          backgroundColor: "rgb(229, 231, 235)"
        }}></div>
      </div>
    </div>
  )
} 