import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
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
        // FleetMaster Premium Dark Palette
        background: {
          DEFAULT: "#09090b", // Zinc-950
          secondary: "#18181b", // Zinc-900
          tertiary: "#27272a", // Zinc-800
        },
        foreground: {
          DEFAULT: "#fafafa", // Zinc-50
          secondary: "#a1a1aa", // Zinc-400
          muted: "#71717a", // Zinc-500
        },
        border: {
          DEFAULT: "rgba(255,255,255,0.1)",
          hover: "rgba(255,255,255,0.2)",
        },
        // Brand Colors - Cyan/Blue/Orange Theme
        brand: {
          cyan: "#06b6d4",
          "cyan-glow": "rgba(6,182,212,0.3)",
          blue: "#3b82f6",
          "blue-glow": "rgba(59,130,246,0.3)",
          orange: "#f97316",
          "orange-glow": "rgba(249,115,22,0.3)",
          emerald: "#10b981",
          "emerald-glow": "rgba(16,185,129,0.15)",
          amber: "#f59e0b",
          red: "#ef4444",
          violet: "#8b5cf6",
        },
        // New Navy Theme Colors
        navy: {
          950: "#0a0f1a",
          900: "#0f172a",
          800: "#1e293b",
          700: "#334155",
        },
        // shadcn compatibility
        card: {
          DEFAULT: "#18181b",
          foreground: "#fafafa",
        },
        popover: {
          DEFAULT: "#18181b",
          foreground: "#fafafa",
        },
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#27272a",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#71717a",
        },
        accent: {
          DEFAULT: "#27272a",
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        ring: "#3b82f6",
        input: "rgba(255,255,255,0.1)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SF Mono", "monospace"],
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.375rem",
        xl: "1rem",
        "2xl": "1.5rem",
      },
      boxShadow: {
        // Glow effects - Cyan/Blue/Orange theme
        "glow-cyan": "0 0 20px rgba(6,182,212,0.3)",
        "glow-cyan-lg": "0 0 40px rgba(6,182,212,0.4)",
        "glow-blue": "0 0 20px rgba(59,130,246,0.3)",
        "glow-blue-lg": "0 0 40px rgba(59,130,246,0.4)",
        "glow-orange": "0 0 20px rgba(249,115,22,0.3)",
        "glow-orange-lg": "0 0 40px rgba(249,115,22,0.4)",
        "glow-emerald": "0 0 20px rgba(16,185,129,0.15)",
        "glow-red": "0 0 20px rgba(239,68,68,0.15)",
        "glow-amber": "0 0 20px rgba(245,158,11,0.15)",
        // Glass shadows
        glass: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(6,182,212,0.05)",
        "glass-lg": "0 16px 48px rgba(0,0,0,0.5), 0 0 30px rgba(6,182,212,0.1)",
        // Card shadows
        card: "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.3)",
        "card-hover": "0 20px 25px -5px rgba(0,0,0,0.4), 0 8px 10px -6px rgba(0,0,0,0.4)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        // Shimmer for skeletons
        shimmer: "shimmer 2s linear infinite",
        // Shimmer slide for buttons
        "shimmer-slide": "shimmer-slide 2s infinite",
        // Pulse glow
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        // Float animation
        float: "float 6s ease-in-out infinite",
        "float-delayed": "float 6s ease-in-out infinite 3s",
        // Slide up
        "slide-up": "slide-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        // Fade in
        "fade-in": "fade-in 0.3s ease-out",
        // Scale in
        "scale-in": "scale-in 0.2s ease-out",
        // Bounce subtle
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        // Spin slow
        "spin-slow": "spin 3s linear infinite",
        // Progress
        progress: "progress 1s ease-out forwards",
        // Gradient shift
        "gradient-shift": "gradient-shift 8s ease infinite",
        // Glow pulse
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "shimmer-slide": {
          "0%": { left: "-100%" },
          "100%": { left: "100%" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6,182,212,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(6,182,212,0.6)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6,182,212,0.3)" },
          "50%": { boxShadow: "0 0 40px rgba(6,182,212,0.6)" },
        },
        progress: {
          "0%": { width: "0%" },
          "100%": { width: "100%" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.22, 1, 0.36, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
