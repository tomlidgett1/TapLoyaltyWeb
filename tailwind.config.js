/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/components/merchant-profile.tsx',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/onboarding/page.tsx',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        typing1: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        typing2: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        typing3: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' }
        },
        ping: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' }
        },
        'sound-wave-1': {
          '0%, 100%': { height: '4px' },
          '50%': { height: '10px' }
        },
        'sound-wave-2': {
          '0%, 100%': { height: '8px' },
          '50%': { height: '16px' }
        },
        'sound-wave-3': {
          '0%, 100%': { height: '12px' },
          '50%': { height: '24px' }
        },
        'sound-wave-4': {
          '0%, 100%': { height: '8px' },
          '50%': { height: '16px' }
        },
        'sound-wave-5': {
          '0%, 100%': { height: '10px' },
          '50%': { height: '20px' }
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-3px) translateX(2px)' },
          '50%': { transform: 'translateY(-5px) translateX(-2px)' },
          '75%': { transform: 'translateY(-3px) translateX(-4px)' },
        },
        'float-medium': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-5px) translateX(3px)' },
          '50%': { transform: 'translateY(-8px) translateX(1px)' },
          '75%': { transform: 'translateY(-5px) translateX(-2px)' },
        },
        'float-fast': {
          '0%, 100%': { transform: 'translateY(0) translateX(0)' },
          '25%': { transform: 'translateY(-7px) translateX(-3px)' },
          '50%': { transform: 'translateY(-10px) translateX(2px)' },
          '75%': { transform: 'translateY(-7px) translateX(4px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-out forwards',
        slideIn: 'slideIn 0.3s ease-out forwards',
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        typing1: 'typing1 1s infinite',
        typing2: 'typing2 1s infinite 0.2s',
        typing3: 'typing3 1s infinite 0.4s',
        pulse: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'ping-medium': 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'ping-fast': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'sound-wave-1': 'sound-wave-1 1s ease-in-out infinite',
        'sound-wave-2': 'sound-wave-2 1.2s ease-in-out infinite',
        'sound-wave-3': 'sound-wave-3 1.4s ease-in-out infinite',
        'sound-wave-4': 'sound-wave-4 1.6s ease-in-out infinite',
        'sound-wave-5': 'sound-wave-5 1.8s ease-in-out infinite',
        'gradient-x': 'gradient-x 3s ease infinite',
        'float-slow': 'float-slow 4s ease-in-out infinite',
        'float-medium': 'float-medium 3s ease-in-out infinite',
        'float-fast': 'float-fast 2.5s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['SF Pro', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
  variants: {
    extend: {
      ringColor: ['focus-visible'],
      ringOffsetWidth: ['focus-visible'],
    },
  },
} 